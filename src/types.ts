export type TopicStatus = 'NOT_STARTED' | 'LEARNING' | 'PRACTICED' | 'REVISED' | 'MASTERED';
export type TopicDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type TaskStatus = 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';
export type EventType = 'CLASS' | 'LAB' | 'STUDY_BLOCK' | 'TUTORIAL' | 'EXAM' | 'OTHER';
export type SessionType = 'POMODORO' | 'STOPWATCH' | 'CUSTOM';
export type GoalPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER';

export interface User {
  id: string;
  email: string;
  name: string;
  college?: string;
  targetDailyMinutes: number;
  theme: string;
  timezone: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  semesterId: string;
  name: string;
  code: string;
  color: string;
  credits: number;
  semesterName?: string;
  unitsCount?: number;
  topicsCount?: number;
  progressPercentage?: number;
  masteredCount?: number;
  revisedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
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

export interface Unit {
  id: string;
  subjectId: string;
  name: string;
  position: number;
  progressPercentage?: number;
  topics: Topic[];
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
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

export type SubtaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  status: SubtaskStatus;
  position: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
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
  subjectName?: string | null;
  subjectCode?: string | null;
  subjectColor?: string | null;
  assignment?: Assignment | null;
  subtasks?: Subtask[];
  subtasksCount?: number;
  completedSubtasksCount?: number;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  startsAt: string;
  location?: string | null;
  examType: string;
  targetScore?: number | null;
  achievedScore?: number | null;
  confidenceLevel: number;
  pastPapersUrl?: string | null;
  reflectionNotes?: string | null;
  subjectName?: string;
  subjectCode?: string;
  subjectColor?: string;
  syllabusProgress?: number;
  totalTopics?: number;
  masteredTopics?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEvent {
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
  subjectName?: string | null;
  subjectCode?: string | null;
  hasOverlapConflict?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
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
  subjectName?: string | null;
  subjectCode?: string | null;
  subjectColor?: string | null;
  topicTitle?: string | null;
  taskTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
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

export interface HabitHistoryDay {
  date: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequencyConfig: string;
  frequencyList?: string[];
  isArchived: boolean;
  targetPerDay: number;
  isCompletedToday?: boolean;
  streak?: number;
  totalCompleted?: number;
  history30Days?: HabitHistoryDay[];
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  subjectId?: string | null;
  topicId?: string | null;
  title: string;
  content: string;
  tags: string;
  tagList?: string[];
  subjectName?: string | null;
  subjectCode?: string | null;
  subjectColor?: string | null;
  topicTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  user: {
    name: string;
    college?: string;
    targetDailyMinutes: number;
    activeSemesterName?: string | null;
  };
  todayDate: string;
  todayEvents: TimetableEvent[];
  tasksDueTodayCount: number;
  tasksDueToday: Task[];
  overdueTasksCount: number;
  overdueTasks: Task[];
  upcomingExams: Exam[];
  upcomingAssignments: Array<Assignment & { title: string; dueAt: string | null; subjectName: string | null; subjectCode: string | null; subjectColor: string | null }>;
  subjectProgress: Array<{
    id: string;
    name: string;
    code: string;
    color: string;
    totalTopics: number;
    progressPercentage: number;
    masteredCount: number;
  }>;
  todayStudyMinutes: number;
  thisWeekStudyMinutes: number;
  targetDailyMinutes: number;
  habitSummary: Array<{
    id: string;
    name: string;
    isCompleted: boolean;
  }>;
  recentNotes: Array<{
    id: string;
    title: string;
    updatedAt: string;
    subjectName?: string | null;
    subjectCode?: string | null;
  }>;
}

export interface AnalyticsOverview {
  dailyStudyTime: Array<{ date: string; dayName: string; minutes: number }>;
  studyTimeBySubject: Array<{ minutes: number; name: string; color: string }>;
  syllabusProgress: Array<{ name: string; subjectName: string; color: string; progress: number; totalTopics: number; masteredTopics: number }>;
  taskStats: {
    total: number;
    completed: number;
    overdue: number;
    rate: number;
  };
  habitConsistency: number;
  plannedVsActual: {
    plannedMinutes: number;
    actualMinutes: number;
  };
  totalRecordedSessions: number;
  averageSessionMinutes: number;
}
