import {
  User,
  Semester,
  Subject,
  Unit,
  Topic,
  Task,
  Subtask,
  SubtaskStatus,
  Assignment,
  Exam,
  TimetableEvent,
  StudySession,
  Goal,
  Habit,
  Note,
  DashboardSummary,
  AnalyticsOverview,
} from '../types';

const BASE_URL = '/api/v1';

export function getStoredToken(): string | null {
  return localStorage.getItem('studyos_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('studyos_token', token);
}

export function removeStoredToken() {
  localStorage.removeItem('studyos_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeStoredToken();
    window.dispatchEvent(new Event('studyos_unauthorized'));
    throw new Error('Session expired or unauthorized. Please log in.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Network request failed');
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    register: (userData: { name: string; email: string; password: string; college?: string; timezone?: string }) =>
      request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    me: () => request<{ user: User }>('/auth/me'),

    logout: () =>
      request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),

    updateProfile: (profile: Partial<User>) =>
      request<{ user: User }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      }),

    submitOnboarding: (data: {
      college?: string;
      semesterName?: string;
      subjects?: Array<{ name: string; code: string; color?: string; credits?: number }>;
      targetDailyMinutes?: number;
      theme?: string;
    }) =>
      request<{ user: User; success: boolean }>('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Academics & Semesters
  academics: {
    getSemesters: () => request<{ semesters: Semester[] }>('/semesters'),

    createSemester: (data: { name: string; startDate: string; endDate: string; isActive?: boolean }) =>
      request<{ semester: Semester }>('/semesters', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSemester: (id: string, data: Partial<Semester>) =>
      request<{ semester: Semester }>(`/semesters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteSemester: (id: string) =>
      request<{ success: boolean }>(`/semesters/${id}`, {
        method: 'DELETE',
      }),

    getSubjects: (semesterId?: string) =>
      request<{ subjects: Subject[] }>(`/subjects${semesterId ? `?semesterId=${semesterId}` : ''}`),

    createSubject: (data: { semesterId: string; name: string; code: string; color?: string; credits?: number }) =>
      request<{ subject: Subject }>('/subjects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSubject: (id: string, data: Partial<Subject>) =>
      request<{ subject: Subject }>(`/subjects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteSubject: (id: string) =>
      request<{ success: boolean }>(`/subjects/${id}`, {
        method: 'DELETE',
      }),

    getSyllabus: (subjectId: string) =>
      request<{
        subject: Subject;
        overallProgress: number;
        totalTopics: number;
        masteredTopics: number;
        units: Unit[];
      }>(`/subjects/${subjectId}/syllabus`),

    createUnit: (subjectId: string, data: { name: string; position?: number }) =>
      request<{ unit: Unit }>(`/subjects/${subjectId}/units`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateUnit: (unitId: string, data: { name?: string; position?: number }) =>
      request<{ unit: Unit }>(`/units/${unitId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteUnit: (unitId: string) =>
      request<{ success: boolean }>(`/units/${unitId}`, {
        method: 'DELETE',
      }),

    createTopic: (unitId: string, data: Partial<Topic>) =>
      request<{ topic: Topic }>(`/units/${unitId}/topics`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateTopic: (topicId: string, data: Partial<Topic>) =>
      request<{ topic: Topic }>(`/topics/${topicId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteTopic: (topicId: string) =>
      request<{ success: boolean }>(`/topics/${topicId}`, {
        method: 'DELETE',
      }),
  },

  // Tasks & Assignments
  tasks: {
    getTasks: (params: { subjectId?: string; status?: string; priority?: string; isAssignment?: boolean; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.subjectId) q.set('subjectId', params.subjectId);
      if (params.status) q.set('status', params.status);
      if (params.priority) q.set('priority', params.priority);
      if (params.isAssignment !== undefined) q.set('isAssignment', String(params.isAssignment));
      if (params.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ tasks: Task[] }>(`/tasks${query}`);
    },

    createTask: (data: Partial<Task> & { isAssignment?: boolean; submissionMethod?: string; submissionUrl?: string; instructions?: string }) =>
      request<{ task: Task }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateTask: (id: string, data: Partial<Task>) =>
      request<{ task: Task }>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    toggleComplete: (id: string) =>
      request<{ task: Task }>(`/tasks/${id}/complete`, {
        method: 'POST',
      }),

    deleteTask: (id: string) =>
      request<{ success: boolean }>(`/tasks/${id}`, {
        method: 'DELETE',
      }),

    submitAssignment: (assignmentId: string, submissionUrl?: string) =>
      request<{ assignment: Assignment }>(`/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ submissionUrl }),
      }),

    gradeAssignment: (assignmentId: string, data: { grade: string; feedback?: string }) =>
      request<{ assignment: Assignment }>(`/assignments/${assignmentId}/grade`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getTask: (taskId: string) =>
      request<{ task: Task }>(`/tasks/${taskId}`),

    createSubtask: (taskId: string, data: { title: string; status?: SubtaskStatus }) =>
      request<{ subtask: Subtask; task: Task }>(`/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSubtask: (taskId: string, subtaskId: string, data: { title?: string; status?: SubtaskStatus; position?: number }) =>
      request<{ subtask: Subtask; task: Task }>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    toggleSubtask: (taskId: string, subtaskId: string) =>
      request<{ subtask: Subtask; task: Task }>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
        method: 'POST',
      }),

    deleteSubtask: (taskId: string, subtaskId: string) =>
      request<{ success: boolean; task: Task }>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      }),
  },

  // Exams
  exams: {
    getExams: () => request<{ exams: Exam[] }>('/exams'),

    createExam: (data: Partial<Exam>) =>
      request<{ exam: Exam }>('/exams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateExam: (id: string, data: Partial<Exam>) =>
      request<{ exam: Exam }>(`/exams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteExam: (id: string) =>
      request<{ success: boolean }>(`/exams/${id}`, {
        method: 'DELETE',
      }),
  },

  // Timetable & Planner
  planner: {
    getEvents: (params: { eventType?: string; subjectId?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.eventType) q.set('eventType', params.eventType);
      if (params.subjectId) q.set('subjectId', params.subjectId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ events: TimetableEvent[] }>(`/timetable-events${query}`);
    },

    createEvent: (data: Partial<TimetableEvent>) =>
      request<{ event: TimetableEvent }>('/timetable-events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateEvent: (id: string, data: Partial<TimetableEvent>) =>
      request<{ event: TimetableEvent }>(`/timetable-events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteEvent: (id: string) =>
      request<{ success: boolean }>(`/timetable-events/${id}`, {
        method: 'DELETE',
      }),
  },

  // Focus Timer & Study Sessions
  focus: {
    getSessions: (limit?: number) =>
      request<{ sessions: StudySession[] }>(`/study-sessions${limit ? `?limit=${limit}` : ''}`),

    startSession: (data: Partial<StudySession>) =>
      request<{ session: StudySession }>('/study-sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    finishSession: (id: string, data: { durationSeconds: number; endedAt?: string; notes?: string; distractionsCount?: number }) =>
      request<{ session: StudySession; message?: string }>(`/study-sessions/${id}/finish`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteSession: (id: string) =>
      request<{ success: boolean }>(`/study-sessions/${id}`, {
        method: 'DELETE',
      }),
  },

  // Habits & Goals
  habits: {
    getHabits: () => request<{ habits: Habit[] }>('/habits'),

    createHabit: (data: { name: string; description?: string; frequencyConfig?: string[]; targetPerDay?: number }) =>
      request<{ habit: Habit }>('/habits', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateHabit: (id: string, data: Partial<Habit>) =>
      request<{ habit: Habit }>(`/habits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    toggleHabit: (id: string, date?: string) =>
      request<{ habitId: string; date: string; completed: boolean; streak: number; totalCompleted: number }>(
        `/habits/${id}/toggle`,
        {
          method: 'POST',
          body: JSON.stringify({ date }),
        }
      ),

    deleteHabit: (id: string) =>
      request<{ success: boolean }>(`/habits/${id}`, {
        method: 'DELETE',
      }),

    getGoals: () => request<{ goals: Goal[] }>('/goals'),

    createGoal: (data: Partial<Goal>) =>
      request<{ goal: Goal }>('/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateGoal: (id: string, data: Partial<Goal>) =>
      request<{ goal: Goal }>(`/goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteGoal: (id: string) =>
      request<{ success: boolean }>(`/goals/${id}`, {
        method: 'DELETE',
      }),
  },

  // Notes
  notes: {
    getNotes: (params: { subjectId?: string; topicId?: string; search?: string; tag?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.subjectId) q.set('subjectId', params.subjectId);
      if (params.topicId) q.set('topicId', params.topicId);
      if (params.search) q.set('search', params.search);
      if (params.tag) q.set('tag', params.tag);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ notes: Note[] }>(`/notes${query}`);
    },

    getNote: (id: string) => request<{ note: Note }>(`/notes/${id}`),

    createNote: (data: Omit<Partial<Note>, 'tags'> & { tags?: string[] | string }) =>
      request<{ note: Note }>('/notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateNote: (id: string, data: Omit<Partial<Note>, 'tags'> & { tags?: string[] | string }) =>
      request<{ note: Note; savedAt: string }>(`/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteNote: (id: string) =>
      request<{ success: boolean }>(`/notes/${id}`, {
        method: 'DELETE',
      }),
  },

  // Dashboard & Analytics
  dashboard: {
    getSummary: () => request<DashboardSummary>('/dashboard/summary'),
    getAnalytics: (days: number = 14) => request<AnalyticsOverview>(`/analytics/overview?days=${days}`),
    exportData: async (params: { type?: 'all' | 'tasks' | 'notes' | 'study_sessions'; format?: 'json' | 'csv' } = {}) => {
      const token = getStoredToken();
      const format = params.format || 'json';
      const type = params.type || 'all';
      const response = await fetch(`/api/v1/analytics/export?type=${type}&format=${format}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `studyos_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1].trim();
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  },
};
