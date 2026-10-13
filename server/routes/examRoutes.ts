import { Router, Request, Response } from 'express';
import { dbInstance } from '../db.js';
import { authenticateUser } from '../auth.js';
import { calculateTopicProgressWeight } from './academicRoutes.js';

export const examRouter = Router();
examRouter.use(authenticateUser);

// Get user exams
examRouter.get('/exams', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const exams = dbInstance.db.exams.filter(e => e.userId === userId);

  const enhancedExams = exams.map(exam => {
    const subject = dbInstance.db.subjects.find(s => s.id === exam.subjectId);
    
    // Calculate subject syllabus coverage
    let syllabusProgress = 0;
    let totalTopics = 0;
    let masteredTopics = 0;

    if (subject) {
      const units = dbInstance.db.units.filter(u => u.subjectId === subject.id);
      const unitIds = units.map(u => u.id);
      const topics = dbInstance.db.topics.filter(t => unitIds.includes(t.unitId));
      totalTopics = topics.length;

      if (totalTopics > 0) {
        const sumWeight = topics.reduce((acc, t) => acc + calculateTopicProgressWeight(t.status), 0);
        syllabusProgress = Math.round((sumWeight / totalTopics) * 100);
        masteredTopics = topics.filter(t => t.status === 'MASTERED').length;
      }
    }

    return {
      ...exam,
      subjectName: subject ? subject.name : 'Unknown Subject',
      subjectCode: subject ? subject.code : 'SUB',
      subjectColor: subject ? subject.color : '#10b981',
      syllabusProgress,
      totalTopics,
      masteredTopics,
    };
  });

  // Sort upcoming exams first
  enhancedExams.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return res.json({ exams: enhancedExams });
});

// Create exam
examRouter.post('/exams', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { subjectId, title, startsAt, location, examType, targetScore, confidenceLevel, pastPapersUrl, reflectionNotes } = req.body;

  if (!title || !subjectId || !startsAt) {
    return res.status(400).json({ error: 'Validation Error', message: 'Subject, title, and start time are required' });
  }

  let subject = dbInstance.db.subjects.find(s => s.id === subjectId);
  if (!subject) {
    const userSemesters = dbInstance.db.semesters.filter(s => s.userId === userId).map(s => s.id);
    const userSubjects = dbInstance.db.subjects.filter(s => userSemesters.includes(s.semesterId));
    if (userSubjects.length > 0) {
      subject = userSubjects[0];
    } else {
      return res.status(404).json({ error: 'Subject not found', message: 'Please create a course/subject first.' });
    }
  }

  const finalSubjectId = subject.id;

  const newExam = {
    id: `exam_${Date.now()}`,
    userId,
    subjectId: finalSubjectId,
    title: title.trim(),
    startsAt: new Date(startsAt).toISOString(),
    location: location ? location.trim() : null,
    examType: examType || 'Final',
    targetScore: targetScore !== undefined ? Number(targetScore) : null,
    achievedScore: null,
    confidenceLevel: confidenceLevel ? Number(confidenceLevel) : 3,
    pastPapersUrl: pastPapersUrl || null,
    reflectionNotes: reflectionNotes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.exams.push(newExam);
  dbInstance.save();

  return res.status(201).json({
    exam: {
      ...newExam,
      subjectName: subject.name,
      subjectCode: subject.code,
      subjectColor: subject.color,
      syllabusProgress: 0,
      totalTopics: 0,
      masteredTopics: 0,
    },
  });
});

// Update exam
examRouter.patch('/exams/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const exam = dbInstance.db.exams.find(e => e.id === id && e.userId === userId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const { title, startsAt, location, examType, targetScore, achievedScore, confidenceLevel, pastPapersUrl, reflectionNotes } = req.body;

  if (title !== undefined) exam.title = title.trim();
  if (startsAt !== undefined) exam.startsAt = new Date(startsAt).toISOString();
  if (location !== undefined) exam.location = location ? location.trim() : null;
  if (examType !== undefined) exam.examType = examType;
  if (targetScore !== undefined) exam.targetScore = targetScore !== null ? Number(targetScore) : null;
  if (achievedScore !== undefined) exam.achievedScore = achievedScore !== null ? Number(achievedScore) : null;
  if (confidenceLevel !== undefined) exam.confidenceLevel = Number(confidenceLevel);
  if (pastPapersUrl !== undefined) exam.pastPapersUrl = pastPapersUrl;
  if (reflectionNotes !== undefined) exam.reflectionNotes = reflectionNotes;

  exam.updatedAt = new Date().toISOString();
  dbInstance.save();

  const subject = dbInstance.db.subjects.find(s => s.id === exam.subjectId);

  return res.json({
    exam: {
      ...exam,
      subjectName: subject ? subject.name : 'Unknown Subject',
      subjectCode: subject ? subject.code : 'SUB',
      subjectColor: subject ? subject.color : '#10b981',
    },
  });
});

// Delete exam
examRouter.delete('/exams/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const exam = dbInstance.db.exams.find(e => e.id === id && e.userId === userId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  dbInstance.db.exams = dbInstance.db.exams.filter(e => e.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Exam deleted' });
});
