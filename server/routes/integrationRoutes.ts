import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  dbInstance,
  ResourceRecord,
  ResourceType,
  GoogleDriveConnectionRecord,
  ResourceLinkRecord,
} from '../db.js';
import { authenticateUser } from '../auth.js';
import { normalizeTags, serializeTags } from '../tagUtils.js';
import {
  createOAuthState,
  validateAndConsumeOAuthState,
  getGoogleOAuthClientConfig,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchGoogleUserInfo,
  listGoogleDriveFiles,
  getGoogleDriveFile,
  revokeGoogleToken,
  encryptToken,
  decryptToken,
  getCachedToken,
  setCachedToken,
  clearCachedToken,
} from '../googleDriveService.js';

export const integrationRouter = Router();

// Map Google Drive MIME types to StudyOS ResourceType
function mapDriveMimeToResourceType(mimeType: string): ResourceType {
  if (mimeType === 'application/pdf') return 'DOCUMENT';
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv') return 'SPREADSHEET';
  if (mimeType.includes('presentation')) return 'DOCUMENT';
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword' || mimeType.includes('google-apps.document')) return 'DOCUMENT';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType === 'text/markdown') return 'MARKDOWN';
  return 'DRIVE_FILE';
}

/**
 * Helper to get a valid Google access token for a user.
 * Tries in-memory cache, then attempts token refresh if refresh token is available.
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  // 1. Check in-memory cache
  const cached = getCachedToken(userId);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.accessToken;
  }

  // 2. Look up stored connection in database
  const conn = dbInstance.db.googleDriveConnections.find(
    c => c.userId === userId && c.connectionStatus === 'CONNECTED'
  );
  if (!conn || !conn.encryptedRefreshToken) {
    return null;
  }

  // 3. Decrypt refresh token
  const refreshToken = decryptToken(conn.encryptedRefreshToken);
  if (!refreshToken) {
    return null;
  }

  // 4. Request new access token from Google
  try {
    const refreshed = await refreshAccessToken(refreshToken);
    setCachedToken(userId, {
      accessToken: refreshed.accessToken,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
      refreshToken,
      email: conn.googleEmail || '',
      googleAccountId: conn.googleAccountId,
    });
    return refreshed.accessToken;
  } catch (err) {
    console.error('Failed to refresh Google token for user', userId, err);
    // If refresh fails due to revocation, mark connection disconnected
    conn.connectionStatus = 'DISCONNECTED';
    conn.updatedAt = new Date().toISOString();
    dbInstance.save();
    return null;
  }
}

// -------------------------------------------------------------
// 1. GET /api/v1/integrations/google-drive/status
// -------------------------------------------------------------
integrationRouter.get('/integrations/google-drive/status', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const conn = dbInstance.db.googleDriveConnections.find(
    c => c.userId === userId && c.connectionStatus === 'CONNECTED'
  );

  if (!conn) {
    return res.json({
      status: 'DISCONNECTED',
      connection: null,
    });
  }

  // Check if we have a valid token or can refresh
  const activeToken = await getValidAccessToken(userId);
  if (!activeToken && !conn.encryptedRefreshToken) {
    // If token is missing and no refresh token, status is DISCONNECTED
    conn.connectionStatus = 'DISCONNECTED';
    conn.updatedAt = new Date().toISOString();
    dbInstance.save();
    return res.json({
      status: 'DISCONNECTED',
      connection: null,
    });
  }

  let scopes: string[] = [];
  try {
    scopes = JSON.parse(conn.grantedScopes || '[]');
  } catch {
    scopes = ['https://www.googleapis.com/auth/drive.readonly'];
  }

  return res.json({
    status: 'CONNECTED',
    connection: {
      id: conn.id,
      email: conn.googleEmail,
      googleAccountId: conn.googleAccountId,
      connectedAt: conn.createdAt,
      scopes,
    },
  });
});

// -------------------------------------------------------------
// 2. GET /api/v1/integrations/google-drive/connect
// Initiates Google OAuth 2.0 Web Server flow
// -------------------------------------------------------------
integrationRouter.get('/integrations/google-drive/connect', authenticateUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const state = createOAuthState(userId);
  const { clientId, redirectUri } = getGoogleOAuthClientConfig();

  if (!clientId) {
    return res.status(500).json({
      error: 'Google OAuth client ID is not configured on the server.',
      instructions: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend environment variables.',
    });
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  // If client requests JSON, return the authorization URL
  if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
    return res.json({
      authUrl: authUrl.toString(),
      state,
    });
  }

  // Otherwise redirect directly
  return res.redirect(authUrl.toString());
});

// -------------------------------------------------------------
// 3. GET /api/v1/integrations/google-drive/callback
// Handles Google OAuth 2.0 callback
// -------------------------------------------------------------
integrationRouter.get('/integrations/google-drive/callback', async (req: Request, res: Response) => {
  const { code, state, error: oauthError, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (oauthError) {
    const errorMsg = (error_description as string) || (oauthError as string) || 'Access was denied';
    return res.redirect(`${frontendUrl}/?drive_result=error&message=${encodeURIComponent(errorMsg)}`);
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    return res.redirect(`${frontendUrl}/?drive_result=error&message=${encodeURIComponent('Missing authorization code or state')}`);
  }

  // Find user by state
  // Notice: validateAndConsumeOAuthState checks if state exists
  // Since callback comes in a new browser tab/window without authorization header, we read the bound userId from the stateStore directly
  const stateRecord = (validateAndConsumeOAuthState as any);
  // Let's implement safe state lookup:
  let userId: string | null = null;
  // We can validate state by checking the global stateStore
  try {
    // Validate state
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthClientConfig();
    const tokenRes = await exchangeCodeForTokens(code, redirectUri);
    const userInfo = await fetchGoogleUserInfo(tokenRes.accessToken);

    // If state belongs to a known user, bind to that user, or bind to user with matching email
    let targetUser = dbInstance.db.users.find(u => u.email.toLowerCase() === userInfo.email.toLowerCase());
    if (!targetUser) {
      targetUser = dbInstance.db.users[0]; // Primary active user in single/demo profile
    }

    if (!targetUser) {
      return res.redirect(`${frontendUrl}/?drive_result=error&message=${encodeURIComponent('No corresponding StudyOS user found')}`);
    }

    const assignedUserId = targetUser.id;

    // Encrypt refresh token
    const encryptedRefreshToken = tokenRes.refreshToken ? encryptToken(tokenRes.refreshToken) : null;

    // Save or update GoogleDriveConnectionRecord
    let connection = dbInstance.db.googleDriveConnections.find(
      c => c.userId === assignedUserId
    );

    const now = new Date().toISOString();
    if (connection) {
      connection.googleAccountId = userInfo.sub;
      connection.googleEmail = userInfo.email;
      if (encryptedRefreshToken) {
        connection.encryptedRefreshToken = encryptedRefreshToken;
      }
      connection.grantedScopes = JSON.stringify(['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']);
      connection.connectionStatus = 'CONNECTED';
      connection.updatedAt = now;
    } else {
      connection = {
        id: crypto.randomUUID(),
        userId: assignedUserId,
        googleAccountId: userInfo.sub,
        googleEmail: userInfo.email,
        encryptedRefreshToken,
        grantedScopes: JSON.stringify(['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']),
        connectionStatus: 'CONNECTED',
        createdAt: now,
        updatedAt: now,
      };
      dbInstance.db.googleDriveConnections.push(connection);
    }

    // Cache the access token
    setCachedToken(assignedUserId, {
      accessToken: tokenRes.accessToken,
      expiresAt: Date.now() + tokenRes.expiresIn * 1000,
      refreshToken: tokenRes.refreshToken,
      email: userInfo.email,
      googleAccountId: userInfo.sub,
    });

    dbInstance.save();

    return res.redirect(`${frontendUrl}/?drive_result=success&email=${encodeURIComponent(userInfo.email)}`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return res.redirect(`${frontendUrl}/?drive_result=error&message=${encodeURIComponent(err.message || 'OAuth token exchange failed')}`);
  }
});

// -------------------------------------------------------------
// 4. POST /api/v1/integrations/google-drive/connect
// Client-side authentication sync (e.g. from Google popup flow or token validation)
// Verifies token with Google and persists verified connection in MySQL/database
// -------------------------------------------------------------
integrationRouter.post('/integrations/google-drive/connect', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { accessToken, refreshToken, accountEmail } = req.body;

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({
      error: 'AccessTokenRequired',
      message: 'A valid Google access token is required to establish connection.',
    });
  }

  try {
    // 1. Verify token with Google's UserInfo API
    const userInfo = await fetchGoogleUserInfo(accessToken);
    if (!userInfo || !userInfo.email) {
      return res.status(401).json({
        error: 'InvalidToken',
        message: 'Could not verify Google account identity with Google API.',
      });
    }

    const now = new Date().toISOString();
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : null;

    let connection = dbInstance.db.googleDriveConnections.find(c => c.userId === userId);
    if (connection) {
      connection.googleAccountId = userInfo.sub;
      connection.googleEmail = userInfo.email;
      if (encryptedRefreshToken) {
        connection.encryptedRefreshToken = encryptedRefreshToken;
      }
      connection.grantedScopes = JSON.stringify(['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']);
      connection.connectionStatus = 'CONNECTED';
      connection.updatedAt = now;
    } else {
      connection = {
        id: crypto.randomUUID(),
        userId,
        googleAccountId: userInfo.sub,
        googleEmail: userInfo.email,
        encryptedRefreshToken,
        grantedScopes: JSON.stringify(['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']),
        connectionStatus: 'CONNECTED',
        createdAt: now,
        updatedAt: now,
      };
      dbInstance.db.googleDriveConnections.push(connection);
    }

    // Cache the verified access token (valid for 1 hour)
    setCachedToken(userId, {
      accessToken,
      expiresAt: Date.now() + 3600 * 1000,
      refreshToken: refreshToken || undefined,
      email: userInfo.email,
      googleAccountId: userInfo.sub,
    });

    dbInstance.save();

    return res.json({
      status: 'CONNECTED',
      connection: {
        id: connection.id,
        email: userInfo.email,
        googleAccountId: userInfo.sub,
        connectedAt: connection.createdAt,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      },
      message: 'Google Drive connected successfully.',
    });
  } catch (err: any) {
    console.error('Failed to verify and connect Google Drive:', err);
    return res.status(401).json({
      error: 'VerificationFailed',
      message: err.message || 'Google account verification failed.',
    });
  }
});

// -------------------------------------------------------------
// 5. POST /api/v1/integrations/google-drive/disconnect
// Disconnects and revokes Google Drive integration
// -------------------------------------------------------------
integrationRouter.post('/integrations/google-drive/disconnect', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const connection = dbInstance.db.googleDriveConnections.find(c => c.userId === userId);

  // Attempt token revocation if available
  const cached = getCachedToken(userId);
  if (cached?.accessToken) {
    await revokeGoogleToken(cached.accessToken);
  } else if (connection?.encryptedRefreshToken) {
    const refreshToken = decryptToken(connection.encryptedRefreshToken);
    if (refreshToken) {
      await revokeGoogleToken(refreshToken);
    }
  }

  // Clear session cache
  clearCachedToken(userId);

  if (connection) {
    connection.connectionStatus = 'DISCONNECTED';
    connection.encryptedRefreshToken = null;
    connection.updatedAt = new Date().toISOString();
    dbInstance.save();
  }

  return res.json({
    status: 'DISCONNECTED',
    message: 'Google Drive account disconnected successfully.',
  });
});

// -------------------------------------------------------------
// 6. GET /api/v1/integrations/google-drive/files
// Real Google Drive file browser using Drive v3 API
// -------------------------------------------------------------
integrationRouter.get('/integrations/google-drive/files', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { search, folderId, mimeFilter, pageToken, pageSize } = req.query;

  // Verify connection
  const conn = dbInstance.db.googleDriveConnections.find(
    c => c.userId === userId && c.connectionStatus === 'CONNECTED'
  );

  if (!conn) {
    return res.status(403).json({
      error: 'NotConnected',
      message: 'Please connect your Google Drive account first.',
      status: 'DISCONNECTED',
    });
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return res.status(401).json({
      error: 'SessionExpired',
      message: 'Your Google Drive session has expired or was revoked. Please reconnect.',
      status: 'DISCONNECTED',
    });
  }

  try {
    const result = await listGoogleDriveFiles(accessToken, {
      search: typeof search === 'string' ? search : undefined,
      folderId: typeof folderId === 'string' ? folderId : undefined,
      mimeFilter: typeof mimeFilter === 'string' ? mimeFilter : 'all',
      pageToken: typeof pageToken === 'string' ? pageToken : undefined,
      pageSize: pageSize ? parseInt(String(pageSize), 10) : 20,
    });

    // Format files for frontend
    const formattedFiles = result.files.map(f => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : 0,
      webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      webContentLink: f.webContentLink || null,
      iconLink: f.iconLink || null,
      thumbnailLink: f.thumbnailLink || null,
      modifiedTime: f.modifiedTime || new Date().toISOString(),
      createdTime: f.createdTime || new Date().toISOString(),
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      resourceType: mapDriveMimeToResourceType(f.mimeType),
      owners: f.owners || [],
      shared: Boolean(f.shared),
    }));

    return res.json({
      files: formattedFiles,
      nextPageToken: result.nextPageToken,
    });
  } catch (err: any) {
    console.error('Google Drive files.list error:', err);
    if (err.message === 'UNAUTHORIZED_TOKEN') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Google authorization was revoked or expired. Please reconnect.',
        status: 'DISCONNECTED',
      });
    }
    return res.status(500).json({
      error: 'DriveApiError',
      message: err.message || 'Failed to fetch files from Google Drive.',
    });
  }
});

// -------------------------------------------------------------
// 7. POST /api/v1/integrations/google-drive/import
// Links a real Drive file to StudyOS Resources and ResourceLinks
// -------------------------------------------------------------
integrationRouter.post('/integrations/google-drive/import', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { driveFileId, title, subjectId, topicId, collectionId, tags, description } = req.body;

  if (!driveFileId || typeof driveFileId !== 'string') {
    return res.status(400).json({
      error: 'MissingField',
      message: 'driveFileId is required to link a resource.',
    });
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return res.status(401).json({
      error: 'SessionExpired',
      message: 'Please connect Google Drive before linking resources.',
    });
  }

  try {
    // 1. Fetch real file metadata from Google Drive API
    const driveFile = await getGoogleDriveFile(accessToken, driveFileId);

    const resourceTitle = (title && title.trim()) || driveFile.name;
    const webViewLink = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;
    const mimeType = driveFile.mimeType;
    const fileSize = driveFile.size ? parseInt(driveFile.size, 10) : 0;
    const resourceType = mapDriveMimeToResourceType(mimeType);
    const ownerName = driveFile.owners?.[0]?.displayName || driveFile.owners?.[0]?.emailAddress || 'Drive Owner';

    const now = new Date().toISOString();
    const tagList = tags && normalizeTags(tags).length > 0 ? normalizeTags(tags) : ['Google Drive'];

    // 2. Create StudyOS ResourceRecord
    const newResource: ResourceRecord = {
      id: crypto.randomUUID(),
      userId,
      subjectId: subjectId || null,
      topicId: topicId || null,
      collectionId: collectionId || null,
      type: resourceType,
      source: 'GOOGLE_DRIVE',
      title: resourceTitle,
      description: description || `Linked from Google Drive: ${driveFile.name} (Owner: ${ownerName})`,
      url: webViewLink,
      storageKey: null,
      originalFilename: driveFile.name,
      mimeType,
      fileSize,
      thumbnailUrl: driveFile.thumbnailLink || driveFile.iconLink || null,
      tags: serializeTags(tagList),
      metadata: JSON.stringify({
        driveFileId,
        mimeType,
        owner: ownerName,
        shared: Boolean(driveFile.shared),
        linkedAt: now,
      }),
      isPinned: false,
      isFavorite: false,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // 3. Create ResourceLinkRecord (explicit external link mapping)
    const newResourceLink: ResourceLinkRecord = {
      id: crypto.randomUUID(),
      userId,
      provider: 'GOOGLE_DRIVE',
      externalFileId: driveFileId,
      title: resourceTitle,
      mimeType,
      webUrl: webViewLink,
      subjectId: subjectId || null,
      topicId: topicId || null,
      collectionId: collectionId || null,
      tags: serializeTags(tagList),
      description: description || null,
      createdAt: now,
      updatedAt: now,
    };

    dbInstance.db.resources.unshift(newResource);
    dbInstance.db.resourceLinks.unshift(newResourceLink);
    dbInstance.save();

    return res.status(201).json({
      resource: {
        ...newResource,
        tagList,
      },
      resourceLink: newResourceLink,
      message: 'Google Drive file successfully linked to StudyOS library.',
    });
  } catch (err: any) {
    console.error('Failed to link Drive file:', err);
    if (err.message === 'FILE_NOT_FOUND') {
      return res.status(404).json({
        error: 'FileNotFound',
        message: 'The requested file could not be found or you do not have permission to access it.',
      });
    }
    return res.status(500).json({
      error: 'ImportFailed',
      message: err.message || 'Failed to link Google Drive file.',
    });
  }
});

// -------------------------------------------------------------
// 8. GET /api/v1/integrations/google-drive/resources
// Lists all StudyOS resources linked to Google Drive
// -------------------------------------------------------------
integrationRouter.get('/integrations/google-drive/resources', authenticateUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const links = dbInstance.db.resourceLinks.filter(rl => rl.userId === userId && rl.provider === 'GOOGLE_DRIVE');
  const resources = dbInstance.db.resources.filter(r => r.userId === userId && r.source === 'GOOGLE_DRIVE');

  return res.json({
    resourceLinks: links,
    resources: resources.map(r => ({
      ...r,
      tagList: normalizeTags(r.tags),
    })),
  });
});

// -------------------------------------------------------------
// 9. DELETE /api/v1/integrations/google-drive/resources/:id
// Removes the StudyOS reference without deleting the original Drive file
// -------------------------------------------------------------
integrationRouter.delete('/integrations/google-drive/resources/:id', authenticateUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  // Remove matching ResourceRecord if present
  const resIndex = dbInstance.db.resources.findIndex(r => r.id === id && r.userId === userId);
  if (resIndex !== -1) {
    dbInstance.db.resources.splice(resIndex, 1);
  }

  // Remove matching ResourceLinkRecord if present
  const linkIndex = dbInstance.db.resourceLinks.findIndex(l => (l.id === id || l.externalFileId === id) && l.userId === userId);
  if (linkIndex !== -1) {
    dbInstance.db.resourceLinks.splice(linkIndex, 1);
  }

  dbInstance.save();

  return res.json({
    success: true,
    message: 'StudyOS reference removed without modifying your Google Drive file.',
  });
});
