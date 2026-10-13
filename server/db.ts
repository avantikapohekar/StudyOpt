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

export type ResourceType =
  | 'DOCUMENT'
  | 'IMAGE'
  | 'MARKDOWN'
  | 'SPREADSHEET'
  | 'VIDEO'
  | 'PLAYLIST'
  | 'COURSE'
  | 'WEB_LINK'
  | 'DRIVE_FILE'
  | 'ANKI_DECK';

export type ResourceSource =
  | 'LOCAL_UPLOAD'
  | 'WEB'
  | 'YOUTUBE'
  | 'UDEMY'
  | 'GOOGLE_DRIVE'
  | 'OBSIDIAN'
  | 'ANKI';

export interface ResourceRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  topicId?: string | null;
  collectionId?: string | null;
  type: ResourceType;
  source: ResourceSource;
  title: string;
  description?: string;
  url?: string | null;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  thumbnailUrl?: string | null;
  tags: string; // JSON array string
  metadata?: string; // JSON object string
  isPinned: boolean;
  isFavorite: boolean;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRecord {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  subjectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FlashcardFormat = 'BASIC' | 'REVERSED' | 'CLOZE';
export type FlashcardState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

export interface FlashcardDeckRecord {
  id: string;
  userId: string;
  subjectId?: string | null;
  topicId?: string | null;
  name: string;
  description?: string;
  tags: string; // JSON array string
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardRecord {
  id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  format: FlashcardFormat;
  interval: number; // in days
  repetitions: number;
  easeFactor: number; // default 2.5
  dueDate: string; // ISO date YYYY-MM-DD
  lastReviewedAt?: string | null;
  state: FlashcardState;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardReviewLogRecord {
  id: string;
  cardId: string;
  userId: string;
  rating: number; // 1: Again, 2: Hard, 3: Good, 4: Easy
  previousInterval: number;
  newInterval: number;
  easeFactor: number;
  reviewedAt: string;
}

export interface GoogleDriveConnectionRecord {
  id: string;
  userId: string;
  googleAccountId: string;
  googleEmail?: string | null;
  encryptedRefreshToken?: string | null;
  grantedScopes?: string | null;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED';
  createdAt: string;
  updatedAt: string;
}

export interface ResourceLinkRecord {
  id: string;
  userId: string;
  provider: 'GOOGLE_DRIVE';
  externalFileId: string;
  title: string;
  mimeType?: string | null;
  webUrl?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  collectionId?: string | null;
  tags?: string; // JSON array string
  description?: string;
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
  resources: ResourceRecord[];
  collections: CollectionRecord[];
  flashcardDecks: FlashcardDeckRecord[];
  flashcards: FlashcardRecord[];
  flashcardReviewLogs: FlashcardReviewLogRecord[];
  googleDriveConnections: GoogleDriveConnectionRecord[];
  resourceLinks: ResourceLinkRecord[];
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'studyos_data.json');
export const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
        if (!parsed.subtasks) parsed.subtasks = [];
        if (!parsed.resources) parsed.resources = [];
        if (!parsed.collections) parsed.collections = [];
        if (!parsed.flashcardDecks) parsed.flashcardDecks = [];
        if (!parsed.flashcards) parsed.flashcards = [];
        if (!parsed.flashcardReviewLogs) parsed.flashcardReviewLogs = [];
        if (!parsed.googleDriveConnections) parsed.googleDriveConnections = [];
        if (!parsed.resourceLinks) parsed.resourceLinks = [];
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
      resources: [],
      collections: [],
      flashcardDecks: [],
      flashcards: [],
      flashcardReviewLogs: [],
      googleDriveConnections: [],
      resourceLinks: [],
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

    // Resources & Collections
    const userResources = this.data.resources.filter(r => r.userId === userId);
    userResources.forEach(r => {
      if (r.storageKey) {
        try {
          const filePath = path.join(UPLOADS_DIR, r.storageKey);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Failed to unlink file on user delete:', e);
        }
      }
    });
    this.data.resources = this.data.resources.filter(r => r.userId !== userId);
    this.data.collections = this.data.collections.filter(c => c.userId !== userId);

    // Flashcards
    this.data.flashcards = this.data.flashcards.filter(fc => fc.userId !== userId);
    this.data.flashcardReviewLogs = this.data.flashcardReviewLogs.filter(rl => rl.userId !== userId);
    this.data.flashcardDecks = this.data.flashcardDecks.filter(fd => fd.userId !== userId);

    // Google Drive & Resource Links
    this.data.googleDriveConnections = this.data.googleDriveConnections.filter(c => c.userId !== userId);
    this.data.resourceLinks = this.data.resourceLinks.filter(rl => rl.userId !== userId);

    this.save();
  }

  // --- Cascade helper for deleting a subject ---
  public deleteSubjectCascade(subjectId: string) {
    const units = this.data.units.filter(u => u.subjectId === subjectId).map(u => u.id);
    this.data.topics = this.data.topics.filter(t => !units.includes(t.unitId));
    this.data.units = this.data.units.filter(u => u.subjectId !== subjectId);
    this.data.subjects = this.data.subjects.filter(s => s.id !== subjectId);

    // Set null on tasks, timetable, studySessions, exams, notes, resources, decks
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
    this.data.resources.forEach(r => {
      if (r.subjectId === subjectId) {
        r.subjectId = null;
        r.topicId = null;
      }
    });
    this.data.flashcardDecks.forEach(d => {
      if (d.subjectId === subjectId) {
        d.subjectId = null;
        d.topicId = null;
      }
    });
    this.data.exams = this.data.exams.filter(e => e.subjectId !== subjectId);

    this.save();
  }
}

export const dbInstance = new DatabaseEngine();
