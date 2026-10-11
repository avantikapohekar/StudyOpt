import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TopicStatus = 'NOT_STARTED' | 'LEARNING' | 'PRACTICED' | 'REVISED' | 'MASTERED';
export type TopicDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type TaskStatus = 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';
export type EventType = 'CLASS' | 'LAB' | 'STUDY_BLOCK' | 'TUTORIAL' | 'EXAM' | 'OTHER';
export type SessionType = 'POMODORO' | 'STOPWATCH' | 'CUSTOM';
export type GoalPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  college?: string;
  targetDailyMinutes: number;
  theme: string;
  timezone: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SemesterRecord {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRecord {
  id: string;
  semesterId: string;
  name: string;
  code: string;
  color: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnitRecord {
  id: string;
  subjectId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicRecord {
  id: string;
  unitId: string;
  parentTopicId?: string | null;
  title: string;
  description?: string;
  status: TopicStatus;
  difficulty: TopicDifficulty;
  estimatedMinutes: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  estimatedMinutes: number;
  completedAt?: string | null;
  referenceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubtaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export interface SubtaskRecord {
  id: string;
  taskId: string;
  title: string;
  status: SubtaskStatus;
  position: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentRecord {
  id: string;
  taskId: string;
  submissionStatus: AssignmentStatus;
  submissionMethod?: string;
  submissionUrl?: string | null;
  submittedAt?: string | null;
  grade?: string | null;
  feedback?: string | null;
  instructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamRecord {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  startsAt: string;
  location?: string;
  examType: string;
  targetScore?: number | null;
  achievedScore?: number | null;
  confidenceLevel: number;
  pastPapersUrl?: string | null;
  reflectionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEventRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  title: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string | null;
  location?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudySessionRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  topicId?: string | null;
  taskId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  sessionType: SessionType;
  notes?: string | null;
  distractionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalRecord {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  period: GoalPeriod;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitRecord {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequencyConfig: string; // JSON array of day strings ["Mon", "Tue", ...]
  isArchived: boolean;
  targetPerDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLogRecord {
  id: string;
  habitId: string;
  logDate: string; // YYYY-MM-DD
  completedAt: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  topicId?: string | null;
  title: string;
  content: string;
  tags: string; // JSON array string
  createdAt: string;
  updatedAt: string;
}

export interface StudyOSDatabaseSchema {
  users: UserRecord[];
  semesters: SemesterRecord[];
  subjects: SubjectRecord[];
  units: UnitRecord[];
  topics: TopicRecord[];
  tasks: TaskRecord[];
  subtasks: SubtaskRecord[];
  assignments: AssignmentRecord[];
  exams: ExamRecord[];
  timetableEvents: TimetableEventRecord[];
  studySessions: StudySessionRecord[];
  goals: GoalRecord[];
  habits: HabitRecord[];
  habitLogs: HabitLogRecord[];
  notes: NoteRecord[];
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'studyos_data.json');

class DatabaseEngine {
  private data: StudyOSDatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StudyOSDatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.subtasks) {
          parsed.subtasks = [];
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading StudyOS database file, initializing empty:', err);
    }

    return {
      users: [],
      semesters: [],
      subjects: [],
      units: [],
      topics: [],
      tasks: [],
      subtasks: [],
      assignments: [],
      exams: [],
      timetableEvents: [],
      studySessions: [],
      goals: [],
      habits: [],
      habitLogs: [],
      notes: [],
    };
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write StudyOS database:', err);
    }
  }

  public get db() {
    return this.data;
  }

  // --- Cascade helper for deleting a user ---
  public deleteUserCascade(userId: string) {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    
    // Find all semesters for this user
    const userSemesters = this.data.semesters.filter(s => s.userId === userId).map(s => s.id);
    const userSubjects = this.data.subjects.filter(sub => userSemesters.includes(sub.semesterId)).map(s => s.id);
    const userUnits = this.data.units.filter(u => userSubjects.includes(u.subjectId)).map(u => u.id);
    
    this.data.topics = this.data.topics.filter(t => !userUnits.includes(t.unitId));
    this.data.units = this.data.units.filter(u => !userSubjects.includes(u.subjectId));
    this.data.subjects = this.data.subjects.filter(s => !userSemesters.includes(s.semesterId));
    this.data.semesters = this.data.semesters.filter(s => s.userId !== userId);

    const userTasks = this.data.tasks.filter(t => t.userId === userId).map(t => t.id);
    this.data.assignments = this.data.assignments.filter(a => !userTasks.includes(a.taskId));
    this.data.tasks = this.data.tasks.filter(t => t.userId !== userId);

    this.data.exams = this.data.exams.filter(e => e.userId !== userId);
    this.data.timetableEvents = this.data.timetableEvents.filter(te => te.userId !== userId);
    this.data.studySessions = this.data.studySessions.filter(ss => ss.userId !== userId);
    this.data.goals = this.data.goals.filter(g => g.userId !== userId);

    const userHabits = this.data.habits.filter(h => h.userId === userId).map(h => h.id);
    this.data.habitLogs = this.data.habitLogs.filter(hl => !userHabits.includes(hl.habitId));
    this.data.habits = this.data.habits.filter(h => h.userId !== userId);
    this.data.notes = this.data.notes.filter(n => n.userId !== userId);

    this.save();
  }

  // --- Cascade helper for deleting a subject ---
  public deleteSubjectCascade(subjectId: string) {
    const units = this.data.units.filter(u => u.subjectId === subjectId).map(u => u.id);
    this.data.topics = this.data.topics.filter(t => !units.includes(t.unitId));
    this.data.units = this.data.units.filter(u => u.subjectId !== subjectId);
    this.data.subjects = this.data.subjects.filter(s => s.id !== subjectId);

    // Set null on tasks, timetable, studySessions, exams, notes
    this.data.tasks.forEach(t => {
      if (t.subjectId === subjectId) t.subjectId = null;
    });
    this.data.timetableEvents.forEach(te => {
      if (te.subjectId === subjectId) te.subjectId = null;
    });
    this.data.studySessions.forEach(ss => {
      if (ss.subjectId === subjectId) ss.subjectId = null;
    });
    this.data.notes.forEach(n => {
      if (n.subjectId === subjectId) n.subjectId = null;
    });
    this.data.exams = this.data.exams.filter(e => e.subjectId !== subjectId);

    this.save();
  }
}

export const dbInstance = new DatabaseEngine();
