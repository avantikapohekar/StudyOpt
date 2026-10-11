import { Router, Request, Response } from 'express';
import { dbInstance, TaskStatus, TaskPriority, AssignmentStatus, SubtaskStatus } from '../db.js';
import { authenticateUser } from '../auth.js';

export const taskRouter = Router();
taskRouter.use(authenticateUser);

// Helper to join subjects, assignments, and nested subtasks
export function enhanceTaskRecord(task: any) {
  const subject = task.subjectId ? dbInstance.db.subjects.find(s => s.id === task.subjectId) : null;
  const assignment = dbInstance.db.assignments.find(a => a.taskId === task.id);
  const subtasks = (dbInstance.db.subtasks || [])
    .filter(st => st.taskId === task.id)
    .sort((a, b) => a.position - b.position);

  const now = new Date();
  const isOverdue = task.dueAt && new Date(task.dueAt) < now && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  return {
    ...task,
    subjectName: subject ? subject.name : null,
    subjectCode: subject ? subject.code : null,
    subjectColor: subject ? subject.color : null,
    assignment: assignment || null,
    subtasks,
    subtasksCount: subtasks.length,
    completedSubtasksCount: subtasks.filter(st => st.status === 'COMPLETED').length,
    isOverdue: Boolean(isOverdue),
  };
}

// ---------------- TASKS & ASSIGNMENTS ----------------

// Get user tasks & assignments with filters
taskRouter.get('/tasks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status, priority, subjectId, isAssignment, search } = req.query;

  let tasks = dbInstance.db.tasks.filter(t => t.userId === userId);

  if (subjectId) {
    tasks = tasks.filter(t => t.subjectId === subjectId);
  }
  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }
  if (search && typeof search === 'string') {
    const s = search.trim().toLowerCase();
    if (s.length > 0) {
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(s) ||
        (Boolean(t.description) && t.description!.toLowerCase().includes(s))
      );
    }
  }

  const enhancedTasks = tasks.map(enhanceTaskRecord);

  if (isAssignment === 'true') {
    return res.json({ tasks: enhancedTasks.filter(t => t.assignment !== null) });
  }

  return res.json({ tasks: enhancedTasks });
});

// Create task (and optional assignment)
taskRouter.post('/tasks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    title,
    description,
    subjectId,
    status,
    priority,
    dueAt,
    estimatedMinutes,
    referenceUrl,
    isAssignment,
    submissionMethod,
    submissionUrl,
    instructions,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Validation Error', message: 'Task title is required' });
  }

  const taskId = `task_${Date.now()}`;
  const now = new Date().toISOString();

  const newTask = {
    id: taskId,
    userId,
    subjectId: subjectId || null,
    title: title.trim(),
    description: description ? description.trim() : '',
    status: (status as TaskStatus) || 'TODO',
    priority: (priority as TaskPriority) || 'MEDIUM',
    dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    estimatedMinutes: Number(estimatedMinutes) || 30,
    completedAt: status === 'COMPLETED' ? now : null,
    referenceUrl: referenceUrl || null,
    createdAt: now,
    updatedAt: now,
  };

  dbInstance.db.tasks.push(newTask);

  let assignment = null;
  if (isAssignment) {
    assignment = {
      id: `asg_${Date.now()}`,
      taskId,
      submissionStatus: 'NOT_STARTED' as AssignmentStatus,
      submissionMethod: submissionMethod || 'Online Portal',
      submissionUrl: submissionUrl || null,
      submittedAt: null,
      grade: null,
      feedback: null,
      instructions: instructions || null,
      createdAt: now,
      updatedAt: now,
    };
    dbInstance.db.assignments.push(assignment);
  }

  dbInstance.save();

  return res.status(201).json({
    task: enhanceTaskRecord(newTask),
  });
});

// Get single task with details and subtasks
taskRouter.get('/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const task = dbInstance.db.tasks.find(t => t.id === id && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  return res.json({ task: enhanceTaskRecord(task) });
});

// Update task
taskRouter.patch('/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const task = dbInstance.db.tasks.find(t => t.id === id && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, subjectId, status, priority, dueAt, estimatedMinutes, referenceUrl } = req.body;

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (subjectId !== undefined) task.subjectId = subjectId || null;
  if (priority !== undefined) task.priority = priority as TaskPriority;
  if (dueAt !== undefined) task.dueAt = dueAt ? new Date(dueAt).toISOString() : null;
  if (estimatedMinutes !== undefined) task.estimatedMinutes = Number(estimatedMinutes);
  if (referenceUrl !== undefined) task.referenceUrl = referenceUrl || null;

  if (status !== undefined) {
    task.status = status as TaskStatus;
    if (status === 'COMPLETED' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    } else if (status !== 'COMPLETED') {
      task.completedAt = null;
    }
  }

  task.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({
    task: enhanceTaskRecord(task),
  });
});

// Quick toggle complete
taskRouter.post('/tasks/:id/complete', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const task = dbInstance.db.tasks.find(t => t.id === id && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (task.status === 'COMPLETED') {
    task.status = 'TODO';
    task.completedAt = null;
  } else {
    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();
  }

  task.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ task: enhanceTaskRecord(task) });
});

// Delete task
taskRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const task = dbInstance.db.tasks.find(t => t.id === id && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  dbInstance.db.assignments = dbInstance.db.assignments.filter(a => a.taskId !== id);
  dbInstance.db.tasks = dbInstance.db.tasks.filter(t => t.id !== id);
  if (dbInstance.db.subtasks) {
    dbInstance.db.subtasks = dbInstance.db.subtasks.filter(st => st.taskId !== id);
  }
  dbInstance.save();

  return res.json({ success: true, message: 'Task deleted' });
});

// ---------------- SUBTASKS ----------------

// Create subtask under a task
taskRouter.post('/tasks/:taskId/subtasks', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { taskId } = req.params;
  const { title, status } = req.body;

  const task = dbInstance.db.tasks.find(t => t.id === taskId && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'Subtask title is required' });
  }

  if (!dbInstance.db.subtasks) {
    dbInstance.db.subtasks = [];
  }

  const existingSubtasks = dbInstance.db.subtasks.filter(st => st.taskId === taskId);
  const now = new Date().toISOString();
  const subtaskStatus: SubtaskStatus = (status as SubtaskStatus) || 'TODO';

  const newSubtask = {
    id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    taskId,
    title: title.trim(),
    status: subtaskStatus,
    position: existingSubtasks.length + 1,
    completedAt: subtaskStatus === 'COMPLETED' ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  dbInstance.db.subtasks.push(newSubtask);
  task.updatedAt = now;
  dbInstance.save();

  return res.status(201).json({
    subtask: newSubtask,
    task: enhanceTaskRecord(task),
  });
});

// Update subtask
taskRouter.patch('/tasks/:taskId/subtasks/:subtaskId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { taskId, subtaskId } = req.params;
  const { title, status, position } = req.body;

  const task = dbInstance.db.tasks.find(t => t.id === taskId && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!dbInstance.db.subtasks) dbInstance.db.subtasks = [];
  const subtask = dbInstance.db.subtasks.find(st => st.id === subtaskId && st.taskId === taskId);
  if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

  const now = new Date().toISOString();
  if (title !== undefined && typeof title === 'string') {
    subtask.title = title.trim();
  }
  if (position !== undefined) {
    subtask.position = Number(position);
  }

  if (status !== undefined) {
    subtask.status = status as SubtaskStatus;
    if (status === 'COMPLETED') {
      subtask.completedAt = now;
    } else {
      subtask.completedAt = null;
    }
  }

  subtask.updatedAt = now;
  task.updatedAt = now;
  dbInstance.save();

  return res.json({
    subtask,
    task: enhanceTaskRecord(task),
  });
});

// Toggle subtask status (TODO <-> COMPLETED)
taskRouter.post('/tasks/:taskId/subtasks/:subtaskId/toggle', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { taskId, subtaskId } = req.params;

  const task = dbInstance.db.tasks.find(t => t.id === taskId && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!dbInstance.db.subtasks) dbInstance.db.subtasks = [];
  const subtask = dbInstance.db.subtasks.find(st => st.id === subtaskId && st.taskId === taskId);
  if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

  const now = new Date().toISOString();
  if (subtask.status === 'COMPLETED') {
    subtask.status = 'TODO';
    subtask.completedAt = null;
  } else {
    subtask.status = 'COMPLETED';
    subtask.completedAt = now;
  }

  subtask.updatedAt = now;
  task.updatedAt = now;
  dbInstance.save();

  return res.json({
    subtask,
    task: enhanceTaskRecord(task),
  });
});

// Delete subtask
taskRouter.delete('/tasks/:taskId/subtasks/:subtaskId', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { taskId, subtaskId } = req.params;

  const task = dbInstance.db.tasks.find(t => t.id === taskId && t.userId === userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!dbInstance.db.subtasks) dbInstance.db.subtasks = [];
  dbInstance.db.subtasks = dbInstance.db.subtasks.filter(st => !(st.id === subtaskId && st.taskId === taskId));

  task.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({
    success: true,
    task: enhanceTaskRecord(task),
  });
});

// Submit assignment
taskRouter.post('/assignments/:id/submit', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { submissionUrl } = req.body;

  const assignment = dbInstance.db.assignments.find(a => a.id === id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const task = dbInstance.db.tasks.find(t => t.id === assignment.taskId && t.userId === userId);
  if (!task) return res.status(403).json({ error: 'Forbidden' });

  assignment.submissionStatus = 'SUBMITTED';
  assignment.submittedAt = new Date().toISOString();
  if (submissionUrl) assignment.submissionUrl = submissionUrl;
  assignment.updatedAt = new Date().toISOString();

  dbInstance.save();
  return res.json({ assignment });
});

// Grade assignment
taskRouter.patch('/assignments/:id/grade', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { grade, feedback } = req.body;

  const assignment = dbInstance.db.assignments.find(a => a.id === id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const task = dbInstance.db.tasks.find(t => t.id === assignment.taskId && t.userId === userId);
  if (!task) return res.status(403).json({ error: 'Forbidden' });

  if (grade !== undefined) assignment.grade = grade;
  if (feedback !== undefined) assignment.feedback = feedback;
  assignment.submissionStatus = 'GRADED';
  assignment.updatedAt = new Date().toISOString();

  dbInstance.save();
  return res.json({ assignment });
});
