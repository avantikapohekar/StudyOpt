import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { dbInstance, ResourceRecord, CollectionRecord, ResourceType, ResourceSource, UPLOADS_DIR } from '../db.js';
import { authenticateUser } from '../auth.js';
import { normalizeTags, serializeTags } from '../tagUtils.js';

export const resourceRouter = Router();
resourceRouter.use(authenticateUser);

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueKey = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueKey);
  },
});

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.md', '.txt', '.csv', '.json',
  '.docx', '.pptx', '.xlsx',
  '.png', '.jpg', '.jpeg', '.webp', '.svg'
]);

function getResourceType(ext: string, mimetype: string): ResourceType {
  const e = ext.toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(e) || mimetype.startsWith('image/')) return 'IMAGE';
  if (e === '.md') return 'MARKDOWN';
  if (['.csv', '.xlsx'].includes(e)) return 'SPREADSHEET';
  return 'DOCUMENT';
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type ${ext} is not supported. Supported: PDF, Markdown, Word, Excel, CSV, Text, Images.`));
    }
    cb(null, true);
  },
});

// 1. GET /resources
resourceRouter.get('/resources', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { type, source, subjectId, collectionId, search, tag, favorite, pinned } = req.query;

  let list = dbInstance.db.resources.filter(r => r.userId === userId);

  if (type && typeof type === 'string') {
    list = list.filter(r => r.type === type);
  }
  if (source && typeof source === 'string') {
    list = list.filter(r => r.source === source);
  }
  if (subjectId && typeof subjectId === 'string') {
    list = list.filter(r => r.subjectId === subjectId);
  }
  if (collectionId && typeof collectionId === 'string') {
    list = list.filter(r => r.collectionId === collectionId);
  }
  if (favorite === 'true') {
    list = list.filter(r => r.isFavorite);
  }
  if (pinned === 'true') {
    list = list.filter(r => r.isPinned);
  }
  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    list = list.filter(r =>
      r.title.toLowerCase().includes(s) ||
      (r.description && r.description.toLowerCase().includes(s)) ||
      (r.originalFilename && r.originalFilename.toLowerCase().includes(s))
    );
  }
  if (tag && typeof tag === 'string') {
    list = list.filter(r => normalizeTags(r.tags).includes(tag));
  }

  // Sort: pinned first, then updatedAt descending
  list.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const enhanced = list.map(r => {
    const subject = r.subjectId ? dbInstance.db.subjects.find(s => s.id === r.subjectId) : null;
    const topic = r.topicId ? dbInstance.db.topics.find(t => t.id === r.topicId) : null;
    const collection = r.collectionId ? dbInstance.db.collections.find(c => c.id === r.collectionId) : null;
    const tagList = normalizeTags(r.tags);
    let metadataObj: Record<string, any> = {};
    try {
      metadataObj = r.metadata ? JSON.parse(r.metadata) : {};
    } catch {
      metadataObj = {};
    }

    return {
      ...r,
      tagList,
      metadataObj,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
      collectionName: collection ? collection.name : null,
      collectionColor: collection ? collection.color : null,
    };
  });

  return res.json({ resources: enhanced });
});

// 2. POST /resources/upload (Multipart upload)
resourceRouter.post('/resources/upload', upload.single('file'), (req: Request, res: Response) => {
  const userId = req.user!.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file provided for upload.' });
  }

  const { title, description, subjectId, topicId, collectionId, tags } = req.body;
  const ext = path.extname(file.originalname).toLowerCase();
  const resourceType = getResourceType(ext, file.mimetype);

  const newResource: ResourceRecord = {
    id: crypto.randomUUID(),
    userId,
    subjectId: subjectId || null,
    topicId: topicId || null,
    collectionId: collectionId || null,
    type: resourceType,
    source: 'LOCAL_UPLOAD',
    title: title && title.trim() ? title.trim() : file.originalname,
    description: description || '',
    url: null,
    storageKey: file.filename,
    originalFilename: file.originalname,
    mimeType: file.mimetype || 'application/octet-stream',
    fileSize: file.size,
    thumbnailUrl: null,
    tags: serializeTags(tags),
    metadata: JSON.stringify({
      extension: ext,
      originalName: file.originalname,
      uploadDate: new Date().toISOString(),
    }),
    isPinned: false,
    isFavorite: false,
    lastAccessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.resources.unshift(newResource);
  dbInstance.save();

  return res.status(201).json({ resource: newResource });
});

// 3. POST /resources/link (External URL / Course / YouTube / Drive link)
resourceRouter.post('/resources/link', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, url, description, type, source, subjectId, topicId, collectionId, tags, metadata } = req.body;

  if (!url || !title) {
    return res.status(400).json({ error: 'Title and URL are required.' });
  }

  // Derive source if not specified
  let detectedSource: ResourceSource = source || 'WEB';
  let detectedType: ResourceType = type || 'WEB_LINK';

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    detectedSource = 'YOUTUBE';
    detectedType = 'VIDEO';
  } else if (lowerUrl.includes('udemy.com')) {
    detectedSource = 'UDEMY';
    detectedType = 'COURSE';
  } else if (lowerUrl.includes('drive.google.com')) {
    detectedSource = 'GOOGLE_DRIVE';
    detectedType = 'DRIVE_FILE';
  }

  const newResource: ResourceRecord = {
    id: crypto.randomUUID(),
    userId,
    subjectId: subjectId || null,
    topicId: topicId || null,
    collectionId: collectionId || null,
    type: detectedType,
    source: detectedSource,
    title: title.trim(),
    description: description || '',
    url: url.trim(),
    storageKey: null,
    originalFilename: null,
    mimeType: null,
    fileSize: 0,
    thumbnailUrl: null,
    tags: serializeTags(tags),
    metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : '{}',
    isPinned: false,
    isFavorite: false,
    lastAccessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.resources.unshift(newResource);
  dbInstance.save();

  return res.status(201).json({ resource: newResource });
});

// 4. GET /resources/:id/file (Stream file content with range / inline viewing)
resourceRouter.get('/resources/:id/file', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const resource = dbInstance.db.resources.find(r => r.id === req.params.id && r.userId === userId);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  if (!resource.storageKey) {
    if (resource.url) {
      return res.redirect(resource.url);
    }
    return res.status(400).json({ error: 'This resource has no attached file' });
  }

  const filePath = path.join(UPLOADS_DIR, resource.storageKey);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Stored file not found on disk' });
  }

  resource.lastAccessedAt = new Date().toISOString();
  dbInstance.save();

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = resource.mimeType || 'application/octet-stream';

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    });
    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(resource.originalFilename || resource.title)}"`
    );
    fs.createReadStream(filePath).pipe(res);
  }
});

// 5. GET /resources/:id
resourceRouter.get('/resources/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const resource = dbInstance.db.resources.find(r => r.id === req.params.id && r.userId === userId);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  resource.lastAccessedAt = new Date().toISOString();
  dbInstance.save();

  const enhanced = {
    ...resource,
    tagList: normalizeTags(resource.tags),
  };

  return res.json({ resource: enhanced });
});

// 6. PATCH /resources/:id
resourceRouter.patch('/resources/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const resource = dbInstance.db.resources.find(r => r.id === req.params.id && r.userId === userId);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const { title, description, subjectId, topicId, collectionId, tags, isPinned, isFavorite } = req.body;

  if (title !== undefined) resource.title = title.trim();
  if (description !== undefined) resource.description = description;
  if (subjectId !== undefined) resource.subjectId = subjectId || null;
  if (topicId !== undefined) resource.topicId = topicId || null;
  if (collectionId !== undefined) resource.collectionId = collectionId || null;
  if (tags !== undefined) {
    resource.tags = serializeTags(tags);
  }
  if (isPinned !== undefined) resource.isPinned = Boolean(isPinned);
  if (isFavorite !== undefined) resource.isFavorite = Boolean(isFavorite);

  resource.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ resource });
});

// 7. DELETE /resources/:id
resourceRouter.delete('/resources/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const index = dbInstance.db.resources.findIndex(r => r.id === req.params.id && r.userId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const resource = dbInstance.db.resources[index];
  if (resource.storageKey) {
    try {
      const filePath = path.join(UPLOADS_DIR, resource.storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Failed to unlink file on disk:', err);
    }
  }

  dbInstance.db.resources.splice(index, 1);
  dbInstance.save();

  return res.json({ success: true, message: 'Resource deleted' });
});

// --- Collections endpoints ---
// GET /collections
resourceRouter.get('/collections', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const collections = dbInstance.db.collections.filter(c => c.userId === userId);

  const enhanced = collections.map(c => {
    const resourceCount = dbInstance.db.resources.filter(r => r.collectionId === c.id).length;
    return {
      ...c,
      resourceCount,
    };
  });

  return res.json({ collections: enhanced });
});

// POST /collections
resourceRouter.post('/collections', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, color, icon, subjectId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  const newCol: CollectionRecord = {
    id: crypto.randomUUID(),
    userId,
    name: name.trim(),
    description: description || '',
    color: color || '#3b82f6',
    icon: icon || 'folder',
    subjectId: subjectId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.collections.push(newCol);
  dbInstance.save();

  return res.status(201).json({ collection: newCol });
});

// PATCH /collections/:id
resourceRouter.patch('/collections/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const col = dbInstance.db.collections.find(c => c.id === req.params.id && c.userId === userId);

  if (!col) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const { name, description, color, icon, subjectId } = req.body;
  if (name !== undefined) col.name = name.trim();
  if (description !== undefined) col.description = description;
  if (color !== undefined) col.color = color;
  if (icon !== undefined) col.icon = icon;
  if (subjectId !== undefined) col.subjectId = subjectId || null;

  col.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ collection: col });
});

// DELETE /collections/:id
resourceRouter.delete('/collections/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const index = dbInstance.db.collections.findIndex(c => c.id === req.params.id && c.userId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const colId = dbInstance.db.collections[index].id;
  // Detach resources from this collection
  dbInstance.db.resources.forEach(r => {
    if (r.collectionId === colId) {
      r.collectionId = null;
    }
  });

  dbInstance.db.collections.splice(index, 1);
  dbInstance.save();

  return res.json({ success: true, message: 'Collection deleted' });
});
