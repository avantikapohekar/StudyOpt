import { Router, Request, Response } from 'express';
import { dbInstance, TopicStatus, TopicDifficulty } from '../db.js';
import { authenticateUser } from '../auth.js';

export const academicRouter = Router();
academicRouter.use(authenticateUser);

// ---------------- SEMESTERS ----------------

// Get user semesters
academicRouter.get('/semesters', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const semesters = dbInstance.db.semesters.filter(s => s.userId === userId);
  return res.json({ semesters });
});

// Create semester
academicRouter.post('/semesters', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, startDate, endDate, isActive } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Validation Error', message: 'Name, start date, and end date are required' });
  }

  // If this new semester is active, deactivate others
  if (isActive) {
    dbInstance.db.semesters.forEach(s => {
      if (s.userId === userId) s.isActive = false;
    });
  }

  const newSemester = {
    id: `sem_${Date.now()}`,
    userId,
    name: name.trim(),
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    isActive: isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.semesters.push(newSemester);
  dbInstance.save();

  return res.status(201).json({ semester: newSemester });
});

// Update semester
academicRouter.patch('/semesters/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const semester = dbInstance.db.semesters.find(s => s.id === id && s.userId === userId);

  if (!semester) {
    return res.status(404).json({ error: 'Not Found', message: 'Semester not found' });
  }

  const { name, startDate, endDate, isActive } = req.body;
  if (name !== undefined) semester.name = name.trim();
  if (startDate !== undefined) semester.startDate = new Date(startDate).toISOString();
  if (endDate !== undefined) semester.endDate = new Date(endDate).toISOString();
  if (isActive !== undefined && isActive === true) {
    dbInstance.db.semesters.forEach(s => {
      if (s.userId === userId) s.isActive = false;
    });
    semester.isActive = true;
  }

  semester.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ semester });
});

// Delete semester
academicRouter.delete('/semesters/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const semester = dbInstance.db.semesters.find(s => s.id === id && s.userId === userId);

  if (!semester) {
    return res.status(404).json({ error: 'Not Found', message: 'Semester not found' });
  }

  // Delete subjects in this semester
  const subjectIds = dbInstance.db.subjects.filter(s => s.semesterId === id).map(s => s.id);
  subjectIds.forEach(subId => dbInstance.deleteSubjectCascade(subId));

  dbInstance.db.semesters = dbInstance.db.semesters.filter(s => s.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Semester deleted successfully' });
});

// ---------------- SUBJECTS ----------------

// Progress calculator helper:
// Status weights: NOT_STARTED = 0, LEARNING = 0.25, PRACTICED = 0.50, REVISED = 0.75, MASTERED = 1.0
export function calculateTopicProgressWeight(status: TopicStatus): number {
  switch (status) {
    case 'MASTERED': return 1.0;
    case 'REVISED': return 0.75;
    case 'PRACTICED': return 0.50;
    case 'LEARNING': return 0.25;
    case 'NOT_STARTED': default: return 0.0;
  }
}

// Get subjects with syllabus completion stats
academicRouter.get('/subjects', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { semesterId } = req.query;

  // Find user's semesters
  const userSemesters = dbInstance.db.semesters.filter(s => s.userId === userId);
  const userSemesterIds = userSemesters.map(s => s.id);

  let subjects = dbInstance.db.subjects.filter(s => userSemesterIds.includes(s.semesterId));
  if (semesterId) {
    subjects = subjects.filter(s => s.semesterId === semesterId);
  }

  // Enhance subjects with unit count, topic count, and calculated completion rate
  const enhancedSubjects = subjects.map(sub => {
    const units = dbInstance.db.units.filter(u => u.subjectId === sub.id);
    const unitIds = units.map(u => u.id);
    const topics = dbInstance.db.topics.filter(t => unitIds.includes(t.unitId));

    const totalTopics = topics.length;
    let progressPercentage = 0;
    let masteredCount = 0;
    let revisedCount = 0;

    if (totalTopics > 0) {
      const sumWeight = topics.reduce((acc, t) => acc + calculateTopicProgressWeight(t.status), 0);
      progressPercentage = Math.round((sumWeight / totalTopics) * 100);
      masteredCount = topics.filter(t => t.status === 'MASTERED').length;
      revisedCount = topics.filter(t => t.status === 'REVISED' || t.status === 'MASTERED').length;
    }

    const semester = userSemesters.find(s => s.id === sub.semesterId);

    return {
      ...sub,
      semesterName: semester ? semester.name : 'Unknown Semester',
      unitsCount: units.length,
      topicsCount: totalTopics,
      progressPercentage,
      masteredCount,
      revisedCount,
    };
  });

  return res.json({ subjects: enhancedSubjects });
});

// Create subject
academicRouter.post('/subjects', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { semesterId, name, code, color, credits } = req.body;

  if (!semesterId || !name || !code) {
    return res.status(400).json({ error: 'Validation Error', message: 'Semester, name, and code are required' });
  }

  const semester = dbInstance.db.semesters.find(s => s.id === semesterId && s.userId === userId);
  if (!semester) {
    return res.status(404).json({ error: 'Not Found', message: 'Semester not found' });
  }

  const newSubject = {
    id: `sub_${Date.now()}`,
    semesterId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    color: color || '#10b981',
    credits: Number(credits) || 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.subjects.push(newSubject);
  dbInstance.save();

  return res.status(201).json({ subject: newSubject });
});

// Update subject
academicRouter.patch('/subjects/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const subject = dbInstance.db.subjects.find(s => s.id === id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const semester = dbInstance.db.semesters.find(s => s.id === subject.semesterId && s.userId === userId);
  if (!semester) return res.status(403).json({ error: 'Forbidden' });

  const { name, code, color, credits, semesterId } = req.body;
  if (name !== undefined) subject.name = name.trim();
  if (code !== undefined) subject.code = code.trim().toUpperCase();
  if (color !== undefined) subject.color = color;
  if (credits !== undefined) subject.credits = Number(credits) || 3;
  if (semesterId !== undefined) subject.semesterId = semesterId;

  subject.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ subject });
});

// Delete subject
academicRouter.delete('/subjects/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const subject = dbInstance.db.subjects.find(s => s.id === id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const semester = dbInstance.db.semesters.find(s => s.id === subject.semesterId && s.userId === userId);
  if (!semester) return res.status(403).json({ error: 'Forbidden' });

  dbInstance.deleteSubjectCascade(id);
  return res.json({ success: true, message: 'Subject and related syllabus units deleted' });
});

// ---------------- SYLLABUS & UNITS & TOPICS ----------------

// Get full syllabus tree for a subject
academicRouter.get('/subjects/:id/syllabus', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const subject = dbInstance.db.subjects.find(s => s.id === id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const semester = dbInstance.db.semesters.find(s => s.id === subject.semesterId && s.userId === userId);
  if (!semester) return res.status(403).json({ error: 'Forbidden' });

  const units = dbInstance.db.units
    .filter(u => u.subjectId === id)
    .sort((a, b) => a.position - b.position);

  const unitsWithTopics = units.map(unit => {
    const topics = dbInstance.db.topics
      .filter(t => t.unitId === unit.id)
      .sort((a, b) => a.position - b.position);

    const totalTopics = topics.length;
    let unitProgress = 0;
    if (totalTopics > 0) {
      const sumWeight = topics.reduce((acc, t) => acc + calculateTopicProgressWeight(t.status), 0);
      unitProgress = Math.round((sumWeight / totalTopics) * 100);
    }

    return {
      ...unit,
      progressPercentage: unitProgress,
      topics,
    };
  });

  // Calculate subject overall progress
  const allTopics = unitsWithTopics.flatMap(u => u.topics);
  const totalTopics = allTopics.length;
  let overallProgress = 0;
  if (totalTopics > 0) {
    const sumWeight = allTopics.reduce((acc, t) => acc + calculateTopicProgressWeight(t.status), 0);
    overallProgress = Math.round((sumWeight / totalTopics) * 100);
  }

  return res.json({
    subject,
    overallProgress,
    totalTopics,
    masteredTopics: allTopics.filter(t => t.status === 'MASTERED').length,
    units: unitsWithTopics,
  });
});

// Create Unit
academicRouter.post('/subjects/:id/units', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, position } = req.body;

  if (!name) return res.status(400).json({ error: 'Unit name is required' });

  const subject = dbInstance.db.subjects.find(s => s.id === id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  const semester = dbInstance.db.semesters.find(s => s.id === subject.semesterId && s.userId === userId);
  if (!semester) return res.status(403).json({ error: 'Forbidden' });

  const existingUnits = dbInstance.db.units.filter(u => u.subjectId === id);
  const newUnit = {
    id: `unit_${Date.now()}`,
    subjectId: id,
    name: name.trim(),
    position: position !== undefined ? Number(position) : existingUnits.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.units.push(newUnit);
  dbInstance.save();

  return res.status(201).json({ unit: newUnit });
});

// Update Unit
academicRouter.patch('/units/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const unit = dbInstance.db.units.find(u => u.id === id);
  if (!unit) return res.status(404).json({ error: 'Unit not found' });

  const { name, position } = req.body;
  if (name !== undefined) unit.name = name.trim();
  if (position !== undefined) unit.position = Number(position);
  unit.updatedAt = new Date().toISOString();

  dbInstance.save();
  return res.json({ unit });
});

// Delete Unit
academicRouter.delete('/units/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const unit = dbInstance.db.units.find(u => u.id === id);
  if (!unit) return res.status(404).json({ error: 'Unit not found' });

  dbInstance.db.topics = dbInstance.db.topics.filter(t => t.unitId !== id);
  dbInstance.db.units = dbInstance.db.units.filter(u => u.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Unit and associated topics deleted' });
});

// Create Topic
academicRouter.post('/units/:id/topics', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, status, difficulty, estimatedMinutes, parentTopicId, position } = req.body;

  if (!title) return res.status(400).json({ error: 'Topic title is required' });

  const unit = dbInstance.db.units.find(u => u.id === id);
  if (!unit) return res.status(404).json({ error: 'Unit not found' });

  const existingTopics = dbInstance.db.topics.filter(t => t.unitId === id);
  const newTopic = {
    id: `top_${Date.now()}`,
    unitId: id,
    parentTopicId: parentTopicId || null,
    title: title.trim(),
    description: description ? description.trim() : '',
    status: (status as TopicStatus) || 'NOT_STARTED',
    difficulty: (difficulty as TopicDifficulty) || 'MEDIUM',
    estimatedMinutes: Number(estimatedMinutes) || 60,
    position: position !== undefined ? Number(position) : existingTopics.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.topics.push(newTopic);
  dbInstance.save();

  return res.status(201).json({ topic: newTopic });
});

// Update Topic
academicRouter.patch('/topics/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const topic = dbInstance.db.topics.find(t => t.id === id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  const { title, description, status, difficulty, estimatedMinutes, position } = req.body;

  if (title !== undefined) topic.title = title.trim();
  if (description !== undefined) topic.description = description.trim();
  if (status !== undefined) topic.status = status as TopicStatus;
  if (difficulty !== undefined) topic.difficulty = difficulty as TopicDifficulty;
  if (estimatedMinutes !== undefined) topic.estimatedMinutes = Number(estimatedMinutes);
  if (position !== undefined) topic.position = Number(position);

  topic.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ topic });
});

// Delete Topic
academicRouter.delete('/topics/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const topic = dbInstance.db.topics.find(t => t.id === id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  // Disassociate subtopics
  dbInstance.db.topics.forEach(t => {
    if (t.parentTopicId === id) t.parentTopicId = null;
  });

  dbInstance.db.topics = dbInstance.db.topics.filter(t => t.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Topic deleted' });
});
