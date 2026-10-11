import { Router, Request, Response } from 'express';
import { dbInstance } from '../db.js';
import { authenticateUser } from '../auth.js';

export const noteRouter = Router();
noteRouter.use(authenticateUser);

// Get user notes
noteRouter.get('/notes', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { subjectId, topicId, search, tag } = req.query;

  let notes = dbInstance.db.notes.filter(n => n.userId === userId);

  if (subjectId) {
    notes = notes.filter(n => n.subjectId === subjectId);
  }
  if (topicId) {
    notes = notes.filter(n => n.topicId === topicId);
  }
  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    notes = notes.filter(n => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));
  }
  if (tag && typeof tag === 'string') {
    notes = notes.filter(n => {
      try {
        const tagList: string[] = JSON.parse(n.tags || '[]');
        return tagList.includes(tag);
      } catch {
        return false;
      }
    });
  }

  // Sort by updatedAt descending
  notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const enhancedNotes = notes.map(n => {
    const subject = n.subjectId ? dbInstance.db.subjects.find(s => s.id === n.subjectId) : null;
    const topic = n.topicId ? dbInstance.db.topics.find(t => t.id === n.topicId) : null;
    let tagList: string[] = [];
    try {
      tagList = JSON.parse(n.tags || '[]');
    } catch {
      tagList = [];
    }

    return {
      ...n,
      tagList,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
    };
  });

  return res.json({ notes: enhancedNotes });
});

// Get single note
noteRouter.get('/notes/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const note = dbInstance.db.notes.find(n => n.id === id && n.userId === userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const subject = note.subjectId ? dbInstance.db.subjects.find(s => s.id === note.subjectId) : null;
  const topic = note.topicId ? dbInstance.db.topics.find(t => t.id === note.topicId) : null;

  return res.json({
    note: {
      ...note,
      tagList: JSON.parse(note.tags || '[]'),
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
    },
  });
});

// Create note
noteRouter.post('/notes', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, content, subjectId, topicId, tags } = req.body;

  const now = new Date().toISOString();
  const newNote = {
    id: `note_${Date.now()}`,
    userId,
    subjectId: subjectId || null,
    topicId: topicId || null,
    title: title ? title.trim() : 'Untitled Note',
    content: content || '',
    tags: Array.isArray(tags) ? JSON.stringify(tags) : '[]',
    createdAt: now,
    updatedAt: now,
  };

  dbInstance.db.notes.push(newNote);
  dbInstance.save();

  const subject = newNote.subjectId ? dbInstance.db.subjects.find(s => s.id === newNote.subjectId) : null;
  const topic = newNote.topicId ? dbInstance.db.topics.find(t => t.id === newNote.topicId) : null;

  return res.status(201).json({
    note: {
      ...newNote,
      tagList: JSON.parse(newNote.tags),
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
    },
  });
});

// Update note (autosave endpoint)
noteRouter.patch('/notes/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const note = dbInstance.db.notes.find(n => n.id === id && n.userId === userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const { title, content, subjectId, topicId, tags } = req.body;

  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (subjectId !== undefined) note.subjectId = subjectId || null;
  if (topicId !== undefined) note.topicId = topicId || null;
  if (tags !== undefined) note.tags = Array.isArray(tags) ? JSON.stringify(tags) : note.tags;

  note.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ note, savedAt: note.updatedAt });
});

// Delete note
noteRouter.delete('/notes/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const note = dbInstance.db.notes.find(n => n.id === id && n.userId === userId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  dbInstance.db.notes = dbInstance.db.notes.filter(n => n.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Note deleted' });
});
