import { Router, Request, Response } from 'express';
import { dbInstance, SessionType } from '../db.js';
import { authenticateUser } from '../auth.js';

export const focusRouter = Router();
focusRouter.use(authenticateUser);

// Get user study sessions
focusRouter.get('/study-sessions', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { subjectId, limit } = req.query;

  let sessions = dbInstance.db.studySessions.filter(s => s.userId === userId);

  if (subjectId) {
    sessions = sessions.filter(s => s.subjectId === subjectId);
  }

  // Sort descending by startedAt
  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (limit) {
    sessions = sessions.slice(0, Number(limit));
  }

  const enhancedSessions = sessions.map(s => {
    const subject = s.subjectId ? dbInstance.db.subjects.find(sub => sub.id === s.subjectId) : null;
    const topic = s.topicId ? dbInstance.db.topics.find(top => top.id === s.topicId) : null;
    const task = s.taskId ? dbInstance.db.tasks.find(tsk => tsk.id === s.taskId) : null;

    return {
      ...s,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
      taskTitle: task ? task.title : null,
    };
  });

  return res.json({ sessions: enhancedSessions });
});

// Start or record a study session
focusRouter.post('/study-sessions', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { subjectId, topicId, taskId, sessionType, startedAt, durationSeconds, endedAt, notes, distractionsCount } = req.body;

  const now = new Date();
  const sessionId = `ss_${Date.now()}`;

  const newSession = {
    id: sessionId,
    userId,
    subjectId: subjectId || null,
    topicId: topicId || null,
    taskId: taskId || null,
    startedAt: startedAt ? new Date(startedAt).toISOString() : now.toISOString(),
    endedAt: endedAt ? new Date(endedAt).toISOString() : null,
    durationSeconds: Number(durationSeconds) || 0,
    sessionType: (sessionType as SessionType) || 'POMODORO',
    notes: notes ? notes.trim() : null,
    distractionsCount: Number(distractionsCount) || 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  dbInstance.db.studySessions.push(newSession);
  dbInstance.save();

  const subject = newSession.subjectId ? dbInstance.db.subjects.find(s => s.id === newSession.subjectId) : null;
  const topic = newSession.topicId ? dbInstance.db.topics.find(t => t.id === newSession.topicId) : null;

  return res.status(201).json({
    session: {
      ...newSession,
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      subjectColor: subject ? subject.color : null,
      topicTitle: topic ? topic.title : null,
    },
  });
});

// Finish session
focusRouter.post('/study-sessions/:id/finish', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { durationSeconds, endedAt, notes, distractionsCount } = req.body;

  const session = dbInstance.db.studySessions.find(s => s.id === id && s.userId === userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Prevent duplicate completion if already finished with duration
  if (session.endedAt && session.durationSeconds > 0 && durationSeconds === undefined) {
    return res.json({ session, message: 'Session was already recorded' });
  }

  session.endedAt = endedAt ? new Date(endedAt).toISOString() : new Date().toISOString();
  if (durationSeconds !== undefined) session.durationSeconds = Number(durationSeconds);
  if (notes !== undefined) session.notes = notes ? notes.trim() : null;
  if (distractionsCount !== undefined) session.distractionsCount = Number(distractionsCount);

  session.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ session });
});

// Delete session
focusRouter.delete('/study-sessions/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const session = dbInstance.db.studySessions.find(s => s.id === id && s.userId === userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  dbInstance.db.studySessions = dbInstance.db.studySessions.filter(s => s.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Session deleted' });
});
