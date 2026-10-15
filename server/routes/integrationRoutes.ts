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
import {
  getGoogleOAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getValidAccessTokenForUser,
  listGoogleDriveFiles,
  getGoogleDriveFile,
  encryptToken,
  decryptToken,
  validateAndConsumeOAuthState,
  setCachedToken,
  clearCachedToken,
  revokeGoogleToken,
} from '../googleDriveService.js';

const router = Router();

// Map Google Drive MIME types to StudyOS ResourceType
function mapMimeTypeToResourceType(mimeType?: string): ResourceType {
  if (!mimeType) return 'OTHER';
  if (mimeType.includes('pdf')) return 'PDF';
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType === 'application/vnd.google-apps.document'
  ) return 'DOCUMENT';
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType === 'application/vnd.google-apps.presentation'
  ) return 'SLIDES';
  if (
    mimeType.includes('sheet') ||
    mimeType.includes('excel') ||
    mimeType === 'application/vnd.google-apps.spreadsheet'
  ) return 'SPREADSHEET';
  if (mimeType.includes('image')) return 'IMAGE';
  if (mimeType.includes('video')) return 'VIDEO';
  if (mimeType.includes('audio')) return 'AUDIO';
  return 'OTHER';
}

/**
 * GET /api/v1/integrations/google-drive/status
 * Returns connection status and details for the authenticated StudyOS user
 */
router.get(['/integrations/google-drive/status', '/google-drive/status'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const connection = dbInstance.data.googleDriveConnections.find(
      (c) => c.userId === user.userId && c.connectionStatus === 'CONNECTED'
    );

    if (!connection) {
      return res.json({
        connected: false,
        status: 'DISCONNECTED',
        connection: null,
        accountEmail: null,
      });
    }

    const scopes = connection.grantedScopes ? connection.grantedScopes.split(' ') : [];

    return res.json({
      connected: true,
      status: 'CONNECTED',
      connection: {
        id: connection.id,
        email: connection.googleEmail || '',
        googleAccountId: connection.googleAccountId,
        connectedAt: connection.createdAt,
        scopes,
      },
      accountEmail: connection.googleEmail || null,
    });
  } catch (error: any) {
    console.error('Error fetching Google Drive status:', error);
    return res.status(500).json({ error: 'Failed to retrieve connection status' });
  }
});

/**
 * GET /api/v1/integrations/google-drive/connect
 * Generates CSRF state and returns OAuth URL (for JSON callers) or redirects to Google's consent screen
 */
router.get(['/integrations/google-drive/connect', '/google-drive/connect'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const oauthUrl = getGoogleOAuthUrl(user.userId);

    // If caller requests JSON or includes format=json query parameter
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.json({
        url: oauthUrl,
        authUrl: oauthUrl,
      });
    }

    return res.redirect(oauthUrl);
  } catch (error: any) {
    console.error('Error initiating Google Drive connect:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize Google Drive connection' });
  }
});

/**
 * POST /api/v1/integrations/google-drive/connect
 * Synchronizes verified Google tokens from client-side Google Auth popup / credentials
 */
router.post(['/integrations/google-drive/connect', '/google-drive/connect'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { accessToken, refreshToken, idToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required to establish Google Drive connection' });
    }

    // Verify token with Google identity endpoint
    const googleProfile = await fetchGoogleUserInfo(accessToken);

    const now = new Date().toISOString();
    const existingIndex = dbInstance.data.googleDriveConnections.findIndex((c) => c.userId === user.userId);

    let encryptedRefreshToken: string | null = null;
    if (refreshToken) {
      encryptedRefreshToken = encryptToken(refreshToken);
    } else if (existingIndex >= 0 && dbInstance.data.googleDriveConnections[existingIndex].encryptedRefreshToken) {
      encryptedRefreshToken = dbInstance.data.googleDriveConnections[existingIndex].encryptedRefreshToken;
    }

    const connectionRecord: GoogleDriveConnectionRecord = {
      id: existingIndex >= 0 ? dbInstance.data.googleDriveConnections[existingIndex].id : crypto.randomUUID(),
      userId: user.userId,
      googleAccountId: googleProfile.sub || googleProfile.id || googleProfile.email,
      googleEmail: googleProfile.email,
      encryptedRefreshToken,
      grantedScopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      connectionStatus: 'CONNECTED',
      createdAt: existingIndex >= 0 ? dbInstance.data.googleDriveConnections[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      dbInstance.data.googleDriveConnections[existingIndex] = connectionRecord;
    } else {
      dbInstance.data.googleDriveConnections.push(connectionRecord);
    }
    dbInstance.saveData();

    // Cache active session token in memory for instant API queries
    setCachedToken(user.userId, {
      accessToken,
      expiresAt: Date.now() + 3500 * 1000,
      refreshToken: refreshToken || undefined,
      email: googleProfile.email,
      googleAccountId: connectionRecord.googleAccountId,
    });

    const scopes = connectionRecord.grantedScopes.split(' ');

    return res.json({
      status: 'CONNECTED',
      connected: true,
      message: 'Google Drive connected successfully',
      connection: {
        id: connectionRecord.id,
        email: connectionRecord.googleEmail || '',
        googleAccountId: connectionRecord.googleAccountId,
        connectedAt: connectionRecord.createdAt,
        scopes,
      },
    });
  } catch (error: any) {
    console.error('Error in connectWithToken:', error);
    return res.status(500).json({ error: error.message || 'Failed to authenticate Google Drive connection' });
  }
});

/**
 * GET /api/v1/integrations/google-drive/callback
 * Handles Google OAuth redirect callback
 */
router.get(['/integrations/google-drive/callback', '/google-drive/callback'], async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || '';

  if (error) {
    const errorMsg = String(error_description || error);
    return res.redirect(`${frontendUrl}/learning?drive_result=error&message=${encodeURIComponent(errorMsg)}&drive_error=${encodeURIComponent(errorMsg)}`);
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${frontendUrl}/learning?drive_result=error&message=${encodeURIComponent('Missing authorization code or state parameter')}&drive_error=missing_params`);
  }

  try {
    // Validate CSRF state
    const stateCheck = validateAndConsumeOAuthState(state);
    if (!stateCheck.valid || !stateCheck.userId) {
      return res.redirect(`${frontendUrl}/learning?drive_result=error&message=${encodeURIComponent('Invalid or expired OAuth state')}&drive_error=invalid_state`);
    }

    const userId = stateCheck.userId;

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Verify identity via Google
    const googleProfile = await fetchGoogleUserInfo(tokens.accessToken);

    // Encrypt refresh token
    const encryptedRefreshToken = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

    const existingIndex = dbInstance.data.googleDriveConnections.findIndex((c) => c.userId === userId);
    const now = new Date().toISOString();

    const connectionRecord: GoogleDriveConnectionRecord = {
      id: existingIndex >= 0 ? dbInstance.data.googleDriveConnections[existingIndex].id : crypto.randomUUID(),
      userId,
      googleAccountId: googleProfile.sub || googleProfile.id || googleProfile.email,
      googleEmail: googleProfile.email,
      encryptedRefreshToken: encryptedRefreshToken || (existingIndex >= 0 ? dbInstance.data.googleDriveConnections[existingIndex].encryptedRefreshToken : null),
      grantedScopes: tokens.scope || 'https://www.googleapis.com/auth/drive.readonly',
      connectionStatus: 'CONNECTED',
      createdAt: existingIndex >= 0 ? dbInstance.data.googleDriveConnections[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      dbInstance.data.googleDriveConnections[existingIndex] = connectionRecord;
    } else {
      dbInstance.data.googleDriveConnections.push(connectionRecord);
    }
    dbInstance.saveData();

    // Cache active access token
    setCachedToken(userId, {
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      refreshToken: tokens.refreshToken,
      email: googleProfile.email,
      googleAccountId: connectionRecord.googleAccountId,
    });

    return res.redirect(
      `${frontendUrl}/learning?drive_result=success&email=${encodeURIComponent(googleProfile.email)}&drive_connected=true`
    );
  } catch (err: any) {
    console.error('Error during Google OAuth callback:', err);
    return res.redirect(
      `${frontendUrl}/learning?drive_result=error&message=${encodeURIComponent(err.message || 'Authentication failed')}&drive_error=${encodeURIComponent(err.message || 'Authentication failed')}`
    );
  }
});

/**
 * POST /api/v1/integrations/google-drive/disconnect
 * Disconnects the user's Google Drive account and cleans up stored tokens
 */
router.post(['/integrations/google-drive/disconnect', '/google-drive/disconnect'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const connectionIndex = dbInstance.data.googleDriveConnections.findIndex((c) => c.userId === user.userId);

    if (connectionIndex >= 0) {
      const conn = dbInstance.data.googleDriveConnections[connectionIndex];
      if (conn.encryptedRefreshToken) {
        const rawToken = decryptToken(conn.encryptedRefreshToken);
        if (rawToken) {
          revokeGoogleToken(rawToken).catch(() => {});
        }
      }

      conn.connectionStatus = 'DISCONNECTED';
      conn.encryptedRefreshToken = null;
      conn.updatedAt = new Date().toISOString();
      dbInstance.saveData();
    }

    clearCachedToken(user.userId);

    return res.json({
      status: 'DISCONNECTED',
      connected: false,
      success: true,
      message: 'Google Drive disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting Google Drive:', error);
    return res.status(500).json({ error: 'Failed to disconnect Google Drive' });
  }
});

/**
 * GET /api/v1/integrations/google-drive/files
 * Lists files from Google Drive API with folder navigation, query search, pagination, and mimeType filtering
 */
router.get(['/integrations/google-drive/files', '/google-drive/files'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const accessToken = await getValidAccessTokenForUser(user.userId);

    const {
      folderId,
      search,
      q,
      mimeFilter,
      filter,
      pageToken,
      pageSize,
    } = req.query;

    const searchTerm = (search as string) || (q as string) || undefined;
    const filterTerm = (mimeFilter as string) || (filter as string) || 'all';
    const folder = (folderId as string) || 'root';

    const result = await listGoogleDriveFiles(accessToken, {
      folderId: folder,
      search: searchTerm,
      mimeFilter: filterTerm,
      pageToken: pageToken ? String(pageToken) : undefined,
      pageSize: pageSize ? parseInt(String(pageSize), 10) : 25,
    });

    // Tag each file with isLinked status if already linked by the user
    const linkedDriveFileIds = new Set(
      dbInstance.data.resourceLinks
        .filter((rl) => rl.userId === user.userId && rl.provider === 'GOOGLE_DRIVE')
        .map((rl) => rl.externalFileId)
    );

    const files = result.files.map((file) => ({
      ...file,
      isLinked: linkedDriveFileIds.has(file.id),
    }));

    return res.json({
      files,
      nextPageToken: result.nextPageToken,
    });
  } catch (error: any) {
    console.error('Error listing Google Drive files:', error);
    if (
      error.message === 'UNAUTHORIZED_TOKEN' ||
      error.message?.includes('expired') ||
      error.message?.includes('revoked')
    ) {
      // Mark connection disconnected
      const conn = dbInstance.data.googleDriveConnections.find((c) => c.userId === req.user!.userId);
      if (conn) {
        conn.connectionStatus = 'DISCONNECTED';
        dbInstance.saveData();
      }
      return res.status(401).json({
        error: 'Google Drive authorization expired or revoked. Please reconnect.',
        code: 'AUTH_EXPIRED',
      });
    }
    return res.status(500).json({ error: error.message || 'Failed to list Google Drive files' });
  }
});

/**
 * POST /api/v1/integrations/google-drive/import
 * Links a Drive file to StudyOS (creates a Resource & ResourceLink)
 */
router.post(['/integrations/google-drive/import', '/google-drive/import'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const fileId = req.body.fileId || req.body.driveFileId;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId or driveFileId is required' });
    }

    const accessToken = await getValidAccessTokenForUser(user.userId);
    const fileMetadata = await getGoogleDriveFile(accessToken, fileId);

    const {
      subjectId,
      topicId,
      collectionId,
      tags,
      description,
      title,
    } = req.body;

    const resourceType = mapMimeTypeToResourceType(fileMetadata.mimeType);
    const now = new Date().toISOString();

    const resourceTitle = title?.trim() || fileMetadata.name || 'Untitled Google Drive File';

    // Check if resource already linked
    let existingLink = dbInstance.data.resourceLinks.find(
      (rl) => rl.userId === user.userId && rl.externalFileId === fileId && rl.provider === 'GOOGLE_DRIVE'
    );

    const resourceId = crypto.randomUUID();
    const linkId = existingLink ? existingLink.id : crypto.randomUUID();

    const resourceRecord: ResourceRecord = {
      id: resourceId,
      userId: user.userId,
      subjectId: subjectId || null,
      topicId: topicId || null,
      collectionId: collectionId || null,
      type: resourceType,
      source: 'GOOGLE_DRIVE',
      title: resourceTitle,
      description: description || null,
      url: fileMetadata.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      storageKey: null,
      originalFilename: fileMetadata.name || null,
      fileSize: fileMetadata.size ? parseInt(fileMetadata.size, 10) : null,
      mimeType: fileMetadata.mimeType || 'application/octet-stream',
      thumbnailUrl: fileMetadata.thumbnailLink || null,
      tags: tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : '["Google Drive"]',
      isPinned: false,
      isFavorite: false,
      lastAccessedAt: now,
      metadata: JSON.stringify({
        driveFileId: fileId,
        driveOwners: fileMetadata.owners,
        iconLink: fileMetadata.iconLink,
        thumbnailLink: fileMetadata.thumbnailLink,
        collectionId: collectionId || null,
        provider: 'GOOGLE_DRIVE',
        source: 'GOOGLE_DRIVE',
        linkedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    };

    dbInstance.data.resources.push(resourceRecord);

    const resourceLinkRecord: ResourceLinkRecord = {
      id: linkId,
      userId: user.userId,
      provider: 'GOOGLE_DRIVE',
      externalFileId: fileId,
      title: resourceTitle,
      mimeType: fileMetadata.mimeType || null,
      webUrl: fileMetadata.webViewLink || null,
      subjectId: subjectId || null,
      topicId: topicId || null,
      collectionId: collectionId || null,
      tags: tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : '[]',
      description: description || null,
      createdAt: existingLink ? existingLink.createdAt : now,
      updatedAt: now,
    };

    if (existingLink) {
      const idx = dbInstance.data.resourceLinks.findIndex((rl) => rl.id === existingLink!.id);
      dbInstance.data.resourceLinks[idx] = resourceLinkRecord;
    } else {
      dbInstance.data.resourceLinks.push(resourceLinkRecord);
    }

    dbInstance.saveData();

    return res.status(201).json({
      message: 'Google Drive file linked successfully',
      resource: resourceRecord,
      resourceLink: resourceLinkRecord,
    });
  } catch (error: any) {
    console.error('Error importing/linking Google Drive file:', error);
    return res.status(500).json({ error: error.message || 'Failed to link Google Drive file' });
  }
});

/**
 * DELETE /api/v1/integrations/google-drive/resources/:id
 * Removes the StudyOS reference to a Drive file without deleting the file from Google Drive
 */
router.delete(['/integrations/google-drive/resources/:id', '/google-drive/resources/:id'], authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const resourceIdx = dbInstance.data.resources.findIndex((r) => r.id === id && r.userId === user.userId);
    const resourceLinkIdx = dbInstance.data.resourceLinks.findIndex((rl) => rl.id === id && rl.userId === user.userId);

    let driveFileId: string | null = null;

    if (resourceIdx >= 0) {
      const resource = dbInstance.data.resources[resourceIdx];
      if (resource.metadata) {
        try {
          const parsed = JSON.parse(resource.metadata);
          driveFileId = parsed.driveFileId;
        } catch {
          // ignore
        }
      }
      dbInstance.data.resources.splice(resourceIdx, 1);
    }

    if (resourceLinkIdx >= 0) {
      driveFileId = dbInstance.data.resourceLinks[resourceLinkIdx].externalFileId;
      dbInstance.data.resourceLinks.splice(resourceLinkIdx, 1);
    }

    if (driveFileId) {
      dbInstance.data.resourceLinks = dbInstance.data.resourceLinks.filter(
        (rl) => !(rl.userId === user.userId && rl.externalFileId === driveFileId)
      );
    }

    dbInstance.saveData();

    return res.json({
      success: true,
      message: 'Google Drive resource link removed from StudyOS (file preserved in Google Drive)',
    });
  } catch (error: any) {
    console.error('Error removing Google Drive resource link:', error);
    return res.status(500).json({ error: 'Failed to remove resource link' });
  }
});

export { router as integrationRouter };
export default router;
