import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read firebase-applet-config.json if available for default client ID
let fallbackClientId = '';
try {
  const firebaseConfigPath = path.resolve(__dirname, '../firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const raw = fs.readFileSync(firebaseConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.oAuthClientId) {
      fallbackClientId = parsed.oAuthClientId;
    }
  }
} catch {
  // Ignore
}

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const DEFAULT_KEY_SECRET = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || 'studyos-secure-google-drive-encryption-key-2026';
const DERIVED_KEY = crypto.scryptSync(DEFAULT_KEY_SECRET, 'studyos-drive-salt-unique', 32);

/**
 * Encrypt sensitive refresh tokens using AES-256-GCM authenticated encryption.
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, DERIVED_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt sensitive refresh tokens using AES-256-GCM.
 */
export function decryptToken(encryptedData: string): string | null {
  if (!encryptedData) return null;
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, DERIVED_KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return null;
  }
}

// In-memory token cache for active sessions (accessToken is transient, refresh token is encrypted at rest)
interface CachedTokenSession {
  accessToken: string;
  expiresAt: number; // timestamp ms
  refreshToken?: string;
  email: string;
  googleAccountId: string;
}

const tokenCache = new Map<string, CachedTokenSession>();

// OAuth state store for CSRF validation
interface OAuthStateRecord {
  userId: string;
  createdAt: number;
}
const stateStore = new Map<string, OAuthStateRecord>();

// Clean up stale states (> 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, record] of stateStore.entries()) {
    if (now - record.createdAt > 15 * 60 * 1000) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

export function createOAuthState(userId: string): string {
  const state = crypto.randomBytes(32).toString('hex');
  stateStore.set(state, { userId, createdAt: Date.now() });
  return state;
}

export function validateAndConsumeOAuthState(state: string, userId: string): boolean {
  if (!state) return false;
  const record = stateStore.get(state);
  if (!record) return false;
  stateStore.delete(state);
  if (record.userId !== userId) return false;
  if (Date.now() - record.createdAt > 15 * 60 * 1000) return false;
  return true;
}

export function getGoogleOAuthClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || fallbackClientId;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/integrations/google-drive/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function getCachedToken(userId: string): CachedTokenSession | undefined {
  return tokenCache.get(userId);
}

export function setCachedToken(userId: string, data: CachedTokenSession) {
  tokenCache.set(userId, data);
}

export function clearCachedToken(userId: string) {
  tokenCache.delete(userId);
}

/**
 * Exchange authorization code for Google tokens.
 */
export async function exchangeCodeForTokens(code: string, redirectUriOverride?: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthClientConfig();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured on backend.');
  }

  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUriOverride || redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) || undefined,
    expiresIn: (data.expires_in as number) || 3600,
    scope: (data.scope as string) || '',
    idToken: (data.id_token as string) || undefined,
  };
}

/**
 * Refresh access token using stored encrypted refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthClientConfig();
  if (!clientId) {
    throw new Error('Google OAuth client ID not configured');
  }

  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const params: Record<string, string> = {
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };
  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
  }

  return {
    accessToken: data.access_token as string,
    expiresIn: (data.expires_in as number) || 3600,
  };
}

/**
 * Verify access token and get Google user identity (email, sub ID, name, avatar).
 */
export async function fetchGoogleUserInfo(accessToken: string) {
  const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v3/userinfo';
  const response = await fetch(userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch Google user profile: ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  return {
    sub: data.sub as string,
    email: data.email as string,
    emailVerified: Boolean(data.email_verified),
    name: (data.name as string) || '',
    picture: (data.picture as string) || '',
  };
}

/**
 * List files from Google Drive using Drive v3 REST API.
 */
export interface DriveFileListOptions {
  search?: string;
  folderId?: string;
  mimeFilter?: string; // 'all' | 'folder' | 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'image'
  pageSize?: number;
  pageToken?: string;
}

export interface DriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
  shared?: boolean;
  capabilities?: { canDownload?: boolean; canEdit?: boolean };
}

export async function listGoogleDriveFiles(accessToken: string, options: DriveFileListOptions = {}) {
  const {
    search,
    folderId = 'root',
    mimeFilter = 'all',
    pageSize = 20,
    pageToken,
  } = options;

  const queryParts: string[] = ['trashed = false'];

  // Folder navigation vs search
  if (search && search.trim()) {
    // When searching by name, search across Drive
    const cleanSearch = search.replace(/'/g, "\\'");
    queryParts.push(`name contains '${cleanSearch}'`);
  } else if (folderId) {
    // When browsing without search, stay within folder
    queryParts.push(`'${folderId}' in parents`);
  }

  // Mime filter
  if (mimeFilter === 'folder') {
    queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
  } else if (mimeFilter === 'document') {
    queryParts.push("(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType contains 'wordprocessingml' or mimeType = 'text/plain' or mimeType = 'text/markdown')");
  } else if (mimeFilter === 'spreadsheet') {
    queryParts.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType contains 'spreadsheetml' or mimeType = 'text/csv')");
  } else if (mimeFilter === 'presentation') {
    queryParts.push("(mimeType = 'application/vnd.google-apps.presentation' or mimeType contains 'presentationml')");
  } else if (mimeFilter === 'pdf') {
    queryParts.push("mimeType = 'application/pdf'");
  } else if (mimeFilter === 'image') {
    queryParts.push("mimeType contains 'image/'");
  }

  const q = queryParts.join(' and ');

  const fields = 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink, iconLink, thumbnailLink, modifiedTime, createdTime, owners, shared, capabilities)';
  const params = new URLSearchParams({
    q,
    fields,
    pageSize: String(Math.min(pageSize, 50)),
    orderBy: 'folder,modifiedTime desc,name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || response.statusText;
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED_TOKEN');
    }
    throw new Error(`Google Drive API error: ${message}`);
  }

  const data = await response.json();
  return {
    files: (data.files || []) as DriveApiFile[],
    nextPageToken: (data.nextPageToken as string) || null,
  };
}

/**
 * Get individual file metadata from Google Drive.
 */
export async function getGoogleDriveFile(accessToken: string, fileId: string): Promise<DriveApiFile> {
  const fields = 'id, name, mimeType, size, webViewLink, webContentLink, iconLink, thumbnailLink, modifiedTime, createdTime, owners, shared, capabilities';
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || response.statusText;
    if (response.status === 404) {
      throw new Error('FILE_NOT_FOUND');
    }
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED_TOKEN');
    }
    throw new Error(`Google Drive API error: ${message}`);
  }

  return (await response.json()) as DriveApiFile;
}

/**
 * Revoke token access from Google.
 */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to revoke Google token:', err);
    return false;
  }
}
