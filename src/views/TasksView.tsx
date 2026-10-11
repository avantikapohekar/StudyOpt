import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  ExternalLink,
  Award,
  AlertTriangle,
  Check,
  Trash2,
  Send,
  X,
  Loader2,
  GripVertical,
  ListTodo,
  ChevronRight,
  Circle,
  CheckCircle2,
  Edit2,
  CornerDownLeft,
  Bell,
  BellRing,
} from 'lucide-react';
import { api } from '../lib/api';
import { Task, Subject, TaskStatus, TaskPriority, AssignmentStatus, Subtask, SubtaskStatus } from '../types';
import {
  ReminderPreferences,
  loadReminderPreferences,
  saveReminderPreferences,
  getActiveTaskReminders,
  playReminderChime,
  triggerBrowserNotification,
  TaskReminderBanner,
  TaskReminderPreferencesModal,
  ActiveTaskReminder,
} from '../components/TaskReminders';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TaskStatus | null>(null);

  // Layout mode: 'kanban' or 'list'
  const [layoutMode, setLayoutMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'assignments' | 'tasks'>('all');

  // Modals & Expanded Task Detail State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Deadline Reminders State
  const [reminderPrefs, setReminderPrefs] = useState<ReminderPreferences>(() => loadReminderPreferences());
  const [isReminderPrefsModalOpen, setIsReminderPrefsModalOpen] = useState(false);
  const [chimedReminderIds, setChimedReminderIds] = useState<string[]>([]);

  // Expanded task detail view
  const [expandedTask, setExpandedTask] = useState<Task | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] = useState<SubtaskStatus>('TODO');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [subtaskFilter, setSubtaskFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueAt, setDueAt] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [isAssignment, setIsAssignment] = useState(false);
  const [submissionMethod, setSubmissionMethod] = useState('Canvas');
  const [instructions, setInstructions] = useState('');

  // Submit / Grade form state
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  // Debounce search query by 300ms to minimize server API calls
  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Load subjects once on mount
  useEffect(() => {
    api.academics.getSubjects().then(subsRes => {
      setSubjects(subsRes.subjects);
      if (subsRes.subjects.length > 0 && !subjectId) {
        setSubjectId(subsRes.subjects[0].id);
      }
    }).catch(err => {
      console.error('Failed to load subjects:', err);
    });
  }, []);

  // Server-side task fetching with debounced search and active filters
  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: {
        search?: string;
        subjectId?: string;
        priority?: string;
        isAssignment?: boolean;
      } = {};

      const trimmed = debouncedSearch.trim();
      if (trimmed) {
        params.search = trimmed;
      }
      if (filterSubjectId !== 'all') {
        params.subjectId = filterSubjectId;
      }
      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }
      if (filterType === 'assignments') {
        params.isAssignment = true;
      } else if (filterType === 'tasks') {
        params.isAssignment = false;
      }

      const tasksRes = await api.tasks.getTasks(params);
      setTasks(tasksRes.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [debouncedSearch, filterSubjectId, filterPriority, filterType]);

  const handleToggleComplete = async (taskId: string) => {
    try {
      const res = await api.tasks.toggleComplete(taskId);
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: res.task.status, completedAt: res.task.completedAt } : t)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await api.tasks.updateTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => (t.id === taskId ? res.task : t)));
      if (expandedTask && expandedTask.id === taskId) {
        setExpandedTask(res.task);
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Active reminders matching user notification preferences
  const activeReminders = React.useMemo(() => {
    return getActiveTaskReminders(tasks, reminderPrefs);
  }, [tasks, reminderPrefs]);

  const activeRemindersMap = React.useMemo(() => {
    const map = new Map<string, ActiveTaskReminder>();
    activeReminders.forEach(r => map.set(r.task.id, r));
    return map;
  }, [activeReminders]);

  // Audio chime and browser push alert trigger for newly surfaced urgent deadlines
  useEffect(() => {
    if (!reminderPrefs.enabled || activeReminders.length === 0) return;

    const urgentReminders = activeReminders.filter(
      r => r.isOverdue || r.urgency === 'CRITICAL' || r.urgency === 'URGENT'
    );
    const newUrgentIds = urgentReminders
      .map(r => r.task.id)
      .filter(id => !chimedReminderIds.includes(id));

    if (newUrgentIds.length > 0) {
      if (reminderPrefs.soundEnabled) {
        playReminderChime();
      }
      if (
        reminderPrefs.browserNotifications &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const top = urgentReminders[0];
        triggerBrowserNotification(
          `StudyOS Deadline Alert: ${top.task.title}`,
          `${top.timeLabel} • ${top.task.subjectCode || 'Task'}`
        );
      }
      setChimedReminderIds(prev => [...prev, ...newUrgentIds]);
    }
  }, [activeReminders, reminderPrefs, chimedReminderIds]);

  const handleSaveReminderPreferences = (updated: ReminderPreferences) => {
    setReminderPrefs(updated);
    saveReminderPreferences(updated);
  };

  const handleCompleteTaskFromReminder = async (taskId: string) => {
    await handleToggleComplete(taskId);
  };

  const handleSnoozeReminder = (taskId: string, hours: number) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    const updated: ReminderPreferences = {
      ...reminderPrefs,
      snoozedUntil: {
        ...reminderPrefs.snoozedUntil,
        [taskId]: until,
      },
    };
    handleSaveReminderPreferences(updated);
  };

  const handleDismissReminder = (taskId: string) => {
    const updated: ReminderPreferences = {
      ...reminderPrefs,
      dismissedTaskIds: Array.from(new Set([...reminderPrefs.dismissedTaskIds, taskId])),
    };
    handleSaveReminderPreferences(updated);
  };

  // Open and close task detail modal
  const openTaskDetail = async (task: Task) => {
    setExpandedTask(task);
    setIsLoadingDetail(true);
    try {
      const res = await api.tasks.getTask(task.id);
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === task.id ? res.task : t)));
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeTaskDetail = () => {
    setExpandedTask(null);
    setNewSubtaskTitle('');
    setEditingSubtaskId(null);
  };

  // Subtask management handlers
  const handleAddSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!expandedTask || !newSubtaskTitle.trim() || isAddingSubtask) return;

    try {
      setIsAddingSubtask(true);
      const res = await api.tasks.createSubtask(expandedTask.id, {
        title: newSubtaskTitle.trim(),
        status: newSubtaskStatus,
      });
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? res.task : t)));
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('Failed to add subtask:', err);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!expandedTask) return;
    try {
      // Optimistic state update
      const subtask = (expandedTask.subtasks || []).find(s => s.id === subtaskId);
      if (!subtask) return;

      const nextStatus: SubtaskStatus = subtask.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      const nowIso = new Date().toISOString();
      const updatedSubtasks = (expandedTask.subtasks || []).map(s =>
        s.id === subtaskId
          ? { ...s, status: nextStatus, completedAt: nextStatus === 'COMPLETED' ? nowIso : null }
          : s
      );
      const updatedTask: Task = {
        ...expandedTask,
        subtasks: updatedSubtasks,
        completedSubtasksCount: updatedSubtasks.filter(s => s.status === 'COMPLETED').length,
      };

      setExpandedTask(updatedTask);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? updatedTask : t)));

      const res = await api.tasks.toggleSubtask(expandedTask.id, subtaskId);
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? res.task : t)));
    } catch (err) {
      console.error('Failed to toggle subtask status:', err);
      loadTasks();
    }
  };

  const handleUpdateSubtaskStatus = async (subtaskId: string, newStatus: SubtaskStatus) => {
    if (!expandedTask) return;
    try {
      const res = await api.tasks.updateSubtask(expandedTask.id, subtaskId, { status: newStatus });
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? res.task : t)));
    } catch (err) {
      console.error('Failed to update subtask status:', err);
    }
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    if (!expandedTask || !editingSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    try {
      const res = await api.tasks.updateSubtask(expandedTask.id, subtaskId, {
        title: editingSubtaskTitle.trim(),
      });
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? res.task : t)));
      setEditingSubtaskId(null);
    } catch (err) {
      console.error('Failed to rename subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!expandedTask) return;
    try {
      const res = await api.tasks.deleteSubtask(expandedTask.id, subtaskId);
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? res.task : t)));
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  const handleUpdateExpandedTaskField = async (fields: Partial<Task>) => {
    if (!expandedTask) return;
    try {
      const res = await api.tasks.updateTask(expandedTask.id, fields);
      setExpandedTask(res.task);
      setTasks(prev => prev.map(t => (t.id === expandedTask.id ? res.task : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent, colId: TaskStatus) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      if (dragOverColumnId === colId) {
        setDragOverColumnId(null);
      }
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumnId(null);

    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) return;

    // Optimistic UI state update
    const nowIso = new Date().toISOString();
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: targetStatus,
              completedAt: targetStatus === 'COMPLETED' ? nowIso : null,
            }
          : t
      )
    );

    try {
      const res = await api.tasks.updateTask(taskId, { status: targetStatus });
      setTasks(prev => prev.map(t => (t.id === taskId ? res.task : t)));
    } catch (err) {
      console.error('Failed to update task status on drop:', err);
      // Revert if API call fails
      loadTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.tasks.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.tasks.createTask({
        title: title.trim(),
        description: description.trim(),
        subjectId: subjectId || null,
        status,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        estimatedMinutes,
        isAssignment,
        submissionMethod,
        instructions,
      });
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      loadTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedTask.assignment) return;

    try {
      await api.tasks.submitAssignment(selectedTask.assignment.id, submissionUrl);
      setIsSubmitModalOpen(false);
      setSubmissionUrl('');
      loadTasks();
    } catch (err) {
      console.error('Failed to submit assignment:', err);
    }
  };

  const handleGradeAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedTask.assignment || !gradeInput.trim()) return;

    try {
      await api.tasks.gradeAssignment(selectedTask.assignment.id, {
        grade: gradeInput.trim(),
        feedback: feedbackInput.trim(),
      });
      setIsGradeModalOpen(false);
      setGradeInput('');
      setFeedbackInput('');
      loadTasks();
    } catch (err) {
      console.error('Failed to grade assignment:', err);
    }
  };

  // Tasks are filtered on the server via debounced search and query parameters
  const filteredTasks = tasks;

  const KANBAN_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
    { id: 'INBOX', label: 'Inbox' },
    { id: 'TODO', label: 'To Do' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Tasks & Assignment Tracker
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Kanban and list views with assignment submission deadlines, grades, and feedback.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Toggle */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-xs">
            <button
              onClick={() => setLayoutMode('kanban')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                layoutMode === 'kanban'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              List / Table
            </button>
          </div>

          {/* Deadline Reminders Button */}
          <button
            onClick={() => setIsReminderPrefsModalOpen(true)}
            title="Task Deadline Reminders & Notification Preferences"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              activeReminders.length > 0
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            {activeReminders.length > 0 ? (
              <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-bounce" />
            ) : (
              <Bell className="h-4 w-4 text-neutral-500" />
            )}
            <span>Reminders</span>
            {activeReminders.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1">
                {activeReminders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Task or Assignment</span>
          </button>
        </div>
      </div>

      {/* Deadline Reminders Notification Banner */}
      <TaskReminderBanner
        reminders={activeReminders}
        preferences={reminderPrefs}
        onOpenPreferences={() => setIsReminderPrefsModalOpen(true)}
        onCompleteTask={handleCompleteTaskFromReminder}
        onSnoozeTask={handleSnoozeReminder}
        onDismissTask={handleDismissReminder}
        onSelectTask={openTaskDetail}
      />

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-8 pr-8 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            />
            {isSearching || loading ? (
              <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400 animate-spin" />
            ) : search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Clear search"
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterSubjectId}
            onChange={e => setFilterSubjectId(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Courses</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Types</option>
            <option value="assignments">Graded Assignments Only</option>
            <option value="tasks">Standard Tasks Only</option>
          </select>
        </div>
      </div>

      {/* Active Server Search Banner */}
      {debouncedSearch.trim() && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <Search className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              Server search results for: <strong>"{debouncedSearch.trim()}"</strong>{' '}
              <span className="text-neutral-500 font-mono">
                ({filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'} found)
              </span>
            </span>
          </div>
          <button
            onClick={() => setSearch('')}
            className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 font-medium"
          >
            <X className="h-3 w-3" />
            <span>Clear search</span>
          </button>
        </div>
      )}

      {/* Empty State when search or filter returns no tasks in list mode, or search returns 0 */}
      {filteredTasks.length === 0 && (layoutMode === 'list' || Boolean(debouncedSearch.trim())) && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center shadow-xs">
          <Search className="h-8 w-8 text-neutral-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            No tasks found
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
            {debouncedSearch.trim()
              ? `No tasks or assignments found matching "${debouncedSearch.trim()}". The search matches across task titles and descriptions on the server.`
              : 'No tasks match the currently selected course or priority filters.'}
          </p>
          {debouncedSearch.trim() && (
            <button
              onClick={() => setSearch('')}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      )}

      {/* 3. Kanban View */}
      {layoutMode === 'kanban' && (filteredTasks.length > 0 || !debouncedSearch.trim()) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            const isColumnTarget = dragOverColumnId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={e => handleDragOverColumn(e, col.id)}
                onDragEnter={() => setDragOverColumnId(col.id)}
                onDragLeave={e => handleDragLeaveColumn(e, col.id)}
                onDrop={e => handleDropOnColumn(e, col.id)}
                className={`flex flex-col rounded-2xl border transition-all duration-150 p-3 min-h-[520px] ${
                  isColumnTarget
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30 shadow-md'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1 mb-2 border-b border-neutral-200 dark:border-neutral-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      {col.label}
                    </span>
                    {isColumnTarget && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        (Drop target)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-neutral-500 tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.map(task => {
                    const isBeingDragged = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={e => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-xl border bg-white dark:bg-neutral-900 p-3.5 shadow-xs transition-all text-xs cursor-grab active:cursor-grabbing select-none ${
                          isBeingDragged
                            ? 'opacity-30 border-dashed border-emerald-500 scale-[0.98]'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Priority and Course line */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 shrink-0 cursor-grab" />
                            {task.subjectCode && (
                              <span
                                className="font-bold text-[10px] uppercase"
                                style={{ color: task.subjectColor || '#10b981' }}
                              >
                                {task.subjectCode}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold ${
                                task.priority === 'URGENT'
                                  ? 'text-red-500'
                                  : task.priority === 'HIGH'
                                  ? 'text-amber-500'
                                  : 'text-neutral-400'
                              }`}
                            >
                              · {task.priority}
                            </span>
                          </div>

                          {task.assignment && (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                              Assignment
                            </span>
                          )}
                        </div>

                        {/* Title with open detail action */}
                        <button
                          type="button"
                          onClick={() => openTaskDetail(task)}
                          className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs mb-1 hover:text-emerald-600 dark:hover:text-emerald-400 text-left transition-colors flex items-center justify-between w-full group/title cursor-pointer"
                        >
                          <span className="line-clamp-2">{task.title}</span>
                          <ChevronRight className="h-3 w-3 text-neutral-400 opacity-60 group-hover/title:opacity-100 group-hover/title:translate-x-0.5 shrink-0 ml-1 transition-all" />
                        </button>

                        {task.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}

                        {/* Subtasks Progress Indicator Pill */}
                        {((task.subtasksCount !== undefined && task.subtasksCount > 0) || (task.subtasks && task.subtasks.length > 0)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDetail(task);
                            }}
                            className="w-full flex flex-col gap-1 p-2 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/60 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-300 font-medium transition-colors mb-2 text-left cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ListTodo className="h-3 w-3 text-emerald-500 shrink-0" />
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                  {task.completedSubtasksCount ?? (task.subtasks?.filter(s => s.status === 'COMPLETED').length || 0)} of {task.subtasksCount ?? (task.subtasks?.length || 0)} subtasks
                                </span>
                              </div>
                              <span className="font-mono text-[9px] text-neutral-500 font-bold">
                                {Math.round(((task.completedSubtasksCount ?? (task.subtasks?.filter(s => s.status === 'COMPLETED').length || 0)) / Math.max(1, (task.subtasksCount ?? (task.subtasks?.length || 1)))) * 100)}%
                              </span>
                            </div>
                            <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                                style={{
                                  width: `${Math.round(((task.completedSubtasksCount ?? (task.subtasks?.filter(s => s.status === 'COMPLETED').length || 0)) / Math.max(1, (task.subtasksCount ?? (task.subtasks?.length || 1)))) * 100)}%`,
                                }}
                              />
                            </div>
                          </button>
                        )}

                        {/* Active Reminder Pill */}
                        {activeRemindersMap.has(task.id) && (
                          <div
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 ${
                              activeRemindersMap.get(task.id)?.isOverdue
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-pulse'
                                : activeRemindersMap.get(task.id)?.urgency === 'CRITICAL'
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                            }`}
                          >
                            <BellRing className="h-2.5 w-2.5 shrink-0" />
                            <span>Reminder: {activeRemindersMap.get(task.id)?.timeLabel}</span>
                          </div>
                        )}

                        {/* Due date & Overdue indicator */}
                        {task.dueAt && (
                          <div
                            className={`flex items-center gap-1 text-[11px] tabular-nums mb-2 ${
                              task.isOverdue
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400'
                            }`}
                          >
                            {task.isOverdue ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Calendar className="h-3 w-3 text-neutral-400" />
                            )}
                            <span>Due {new Date(task.dueAt).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* Assignment Submission Details if attached */}
                        {task.assignment && (
                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-500">Submission:</span>
                              <span
                                className={`font-semibold ${
                                  task.assignment.submissionStatus === 'GRADED'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : task.assignment.submissionStatus === 'SUBMITTED'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {task.assignment.submissionStatus}
                              </span>
                            </div>

                            {task.assignment.grade && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-500">Grade:</span>
                                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                  {task.assignment.grade}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              {task.assignment.submissionStatus === 'NOT_STARTED' && (
                                <button
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsSubmitModalOpen(true);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium text-[10px] hover:bg-purple-100"
                                >
                                  <Send className="h-2.5 w-2.5" />
                                  <span>Submit</span>
                                </button>
                              )}

                              {task.assignment.submissionStatus === 'SUBMITTED' && (
                                <button
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsGradeModalOpen(true);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-[10px] hover:bg-neutral-200"
                                >
                                  <Award className="h-2.5 w-2.5" />
                                  <span>Record Grade</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Card Footer: Status Shift Buttons & Details Button */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 dark:border-neutral-800/60 mt-2 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={task.status}
                              onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1.5 py-0.5 text-neutral-700 dark:text-neutral-300"
                            >
                              <option value="INBOX">Inbox</option>
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => openTaskDetail(task)}
                              className="px-1.5 py-0.5 rounded text-[10px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-colors cursor-pointer"
                            >
                              Subtasks ({task.subtasksCount ?? (task.subtasks?.length || 0)})
                            </button>
                          </div>

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && !isColumnTarget && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-center text-neutral-400 text-[11px]">
                      <span>No tasks in {col.label}</span>
                      <span className="text-[10px] text-neutral-400 mt-1">Drag and drop tasks here</span>
                    </div>
                  )}

                  {isColumnTarget && draggedTaskId && !colTasks.some(t => t.id === draggedTaskId) && (
                    <div className="rounded-xl border-2 border-dashed border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/30 p-3 text-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Drop to move to {col.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. List / Table View */}
      {layoutMode === 'list' && filteredTasks.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
                <tr>
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Subtasks</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Assignment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleComplete(task.id)}
                        className="h-4 w-4 rounded border border-neutral-300 dark:border-neutral-600 flex items-center justify-center hover:border-emerald-500 cursor-pointer"
                      >
                        {task.status === 'COMPLETED' && <Check className="h-3 w-3 text-emerald-600" />}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      <button
                        type="button"
                        onClick={() => openTaskDetail(task)}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 text-left font-semibold cursor-pointer"
                      >
                        {task.title}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {task.subjectCode ? (
                        <span style={{ color: task.subjectColor || '#10b981' }} className="font-bold">
                          {task.subjectCode}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          task.priority === 'URGENT'
                            ? 'text-red-500'
                            : task.priority === 'HIGH'
                            ? 'text-amber-500'
                            : 'text-neutral-400'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openTaskDetail(task)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer text-[11px]"
                      >
                        <ListTodo className="h-3 w-3 text-emerald-500" />
                        <span>
                          {task.completedSubtasksCount ?? (task.subtasks?.filter(s => s.status === 'COMPLETED').length || 0)}/
                          {task.subtasksCount ?? (task.subtasks?.length || 0)}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {task.dueAt ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={task.isOverdue ? 'text-red-500 font-bold' : 'text-neutral-500'}>
                            {new Date(task.dueAt).toLocaleDateString()}
                          </span>
                          {activeRemindersMap.has(task.id) && (
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                activeRemindersMap.get(task.id)?.isOverdue
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              <Bell className="h-2.5 w-2.5" />
                              <span>{activeRemindersMap.get(task.id)?.timeLabel}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {task.assignment ? (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {task.assignment.submissionStatus} {task.assignment.grade ? `(${task.assignment.grade})` : ''}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openTaskDetail(task)}
                          className="px-2 py-1 text-[11px] font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Create New Task or Graded Assignment
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Problem Set 5: Balanced BST Trees"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details, rubric requirements, notes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Course / Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">General</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={e => setDueAt(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Estimated Time (mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="600"
                    step="15"
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Assignment checkbox */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="modalIsAssignment"
                    checked={isAssignment}
                    onChange={e => setIsAssignment(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="modalIsAssignment" className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Track as Graded Assignment
                  </label>
                </div>

                {isAssignment && (
                  <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-xs">
                    <div>
                      <label className="block text-neutral-500 mb-1">Submission Method</label>
                      <input
                        type="text"
                        placeholder="e.g. Canvas, Gradescope, Portal"
                        value={submissionMethod}
                        onChange={e => setSubmissionMethod(e.target.value)}
                        className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 mb-1">Submission Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Upload PDF with student ID"
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Assignment Modal */}
      {isSubmitModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Mark Assignment Submitted
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              {selectedTask.title}
            </p>
            <form onSubmit={handleSubmitAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Submission Portal URL / Confirmation Link
                </label>
                <input
                  type="url"
                  placeholder="https://gradescope.com/submissions/..."
                  value={submissionUrl}
                  onChange={e => setSubmissionUrl(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                >
                  Confirm Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Assignment Modal */}
      {isGradeModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Record Grade & Feedback
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              {selectedTask.title}
            </p>
            <form onSubmit={handleGradeAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Grade / Score
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 98/100 or A+"
                  value={gradeInput}
                  onChange={e => setGradeInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Instructor Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="Comments, strengths, areas for improvement..."
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expanded Task Detail View & Subtask Manager Modal */}
      {expandedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 md:p-6 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 bg-neutral-50/70 dark:bg-neutral-950/40">
              <div className="flex items-center gap-2 flex-wrap">
                {expandedTask.subjectCode && (
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow-2xs"
                    style={{ backgroundColor: expandedTask.subjectColor || '#10b981' }}
                  >
                    {expandedTask.subjectCode}
                  </span>
                )}
                {/* Status Dropdown */}
                <select
                  value={expandedTask.status}
                  onChange={e => handleUpdateExpandedTaskField({ status: e.target.value as TaskStatus })}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  <option value="INBOX">Inbox</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                {/* Priority Dropdown */}
                <select
                  value={expandedTask.priority}
                  onChange={e => handleUpdateExpandedTaskField({ priority: e.target.value as TaskPriority })}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                </select>

                {expandedTask.assignment && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    Graded Assignment
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={closeTaskDetail}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {isLoadingDetail && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  <span>Syncing task details...</span>
                </div>
              )}

              {/* Task Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                  {expandedTask.title}
                </h3>
                {expandedTask.description ? (
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed bg-neutral-50 dark:bg-neutral-950/50 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80">
                    {expandedTask.description}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No description provided.</p>
                )}
              </div>

              {/* Due Date & Meta Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Due Date</span>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{expandedTask.dueAt ? new Date(expandedTask.dueAt).toLocaleDateString() : 'No deadline'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Estimated Time</span>
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                    <Clock className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{expandedTask.estimatedMinutes} minutes</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{expandedTask.status}</span>
                </div>
              </div>

              {/* Assignment Banner if applicable */}
              {expandedTask.assignment && (
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-purple-500" />
                      Assignment Submission Details
                    </span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {expandedTask.assignment.submissionStatus}
                    </span>
                  </div>
                  {expandedTask.assignment.instructions && (
                    <p className="text-purple-800 dark:text-purple-300 text-[11px]">
                      {expandedTask.assignment.instructions}
                    </p>
                  )}
                  {expandedTask.assignment.grade && (
                    <div className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">
                      Grade: {expandedTask.assignment.grade}
                      {expandedTask.assignment.feedback && ` — Feedback: ${expandedTask.assignment.feedback}`}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTASKS SECTION */}
              <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ListTodo className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <span>Nested Subtasks</span>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {expandedTask.subtasks?.length || 0}
                        </span>
                      </h4>
                    </div>
                  </div>

                  {/* Subtask Completion Stats */}
                  {expandedTask.subtasks && expandedTask.subtasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {expandedTask.subtasks.filter(s => s.status === 'COMPLETED').length} of {expandedTask.subtasks.length} completed
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ({Math.round((expandedTask.subtasks.filter(s => s.status === 'COMPLETED').length / expandedTask.subtasks.length) * 100)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Subtask Progress Bar */}
                {expandedTask.subtasks && expandedTask.subtasks.length > 0 && (
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.round(
                          (expandedTask.subtasks.filter(s => s.status === 'COMPLETED').length /
                            expandedTask.subtasks.length) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                )}

                {/* Quick Add Subtask Form */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Add a subtask and press Enter..."
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      disabled={isAddingSubtask}
                      className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-8 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                      title="Add subtask (Enter)"
                      className="absolute right-2 top-2 p-0.5 text-neutral-400 hover:text-emerald-500 disabled:opacity-40 cursor-pointer"
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <select
                    value={newSubtaskStatus}
                    onChange={e => setNewSubtaskStatus(e.target.value as SubtaskStatus)}
                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-2 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    {isAddingSubtask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Add</span>
                  </button>
                </form>

                {/* Subtasks Filter Tabs */}
                {expandedTask.subtasks && expandedTask.subtasks.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSubtaskFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        subtaskFilter === 'all'
                          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      All ({expandedTask.subtasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtaskFilter('active')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        subtaskFilter === 'active'
                          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      Active ({expandedTask.subtasks.filter(s => s.status !== 'COMPLETED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtaskFilter('completed')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        subtaskFilter === 'completed'
                          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      Completed ({expandedTask.subtasks.filter(s => s.status === 'COMPLETED').length})
                    </button>
                  </div>
                )}

                {/* Subtask Items List */}
                <div className="space-y-2 pt-1">
                  {(!expandedTask.subtasks || expandedTask.subtasks.length === 0) && (
                    <div className="p-8 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 space-y-1">
                      <ListTodo className="h-6 w-6 mx-auto opacity-50 mb-2" />
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        No subtasks created yet
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Break this assignment or task into smaller, manageable milestones above.
                      </p>
                    </div>
                  )}

                  {expandedTask.subtasks
                    ?.filter(st => {
                      if (subtaskFilter === 'active') return st.status !== 'COMPLETED';
                      if (subtaskFilter === 'completed') return st.status === 'COMPLETED';
                      return true;
                    })
                    .map(st => {
                      const isCompleted = st.status === 'COMPLETED';
                      const isInProgress = st.status === 'IN_PROGRESS';
                      const isEditing = editingSubtaskId === st.id;

                      return (
                        <div
                          key={st.id}
                          className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all text-xs ${
                            isCompleted
                              ? 'bg-neutral-50/70 dark:bg-neutral-950/30 border-neutral-200 dark:border-neutral-850 opacity-80'
                              : isInProgress
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                              : 'bg-white dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs'
                          }`}
                        >
                          {/* Toggle Checkbox & Title */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(st.id)}
                              className="shrink-0 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>

                            {isEditing ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingSubtaskTitle}
                                  onChange={e => setEditingSubtaskTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveSubtaskTitle(st.id);
                                    if (e.key === 'Escape') setEditingSubtaskId(null);
                                  }}
                                  className="w-full rounded-md border border-emerald-500 bg-white dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveSubtaskTitle(st.id)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubtaskId(null)}
                                  className="px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span
                                onDoubleClick={() => {
                                  setEditingSubtaskId(st.id);
                                  setEditingSubtaskTitle(st.title);
                                }}
                                className={`truncate font-medium ${
                                  isCompleted
                                    ? 'line-through text-neutral-400 dark:text-neutral-500'
                                    : 'text-neutral-900 dark:text-neutral-100'
                                }`}
                              >
                                {st.title}
                              </span>
                            )}
                          </div>

                          {/* Subtask Status Selector & Actions */}
                          {!isEditing && (
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={st.status}
                                onChange={e => handleUpdateSubtaskStatus(st.id, e.target.value as SubtaskStatus)}
                                className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold border ${
                                  isCompleted
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : isInProgress
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                                }`}
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubtaskId(st.id);
                                  setEditingSubtaskTitle(st.title);
                                }}
                                title="Edit subtask title"
                                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-opacity p-0.5 cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSubtask(st.id)}
                                title="Delete subtask"
                                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-0.5 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/70 dark:bg-neutral-950/40">
              <button
                type="button"
                onClick={() => {
                  handleDeleteTask(expandedTask.id);
                  closeTaskDetail();
                }}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Task</span>
              </button>

              <button
                type="button"
                onClick={closeTaskDetail}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Reminder Preferences Modal */}
      <TaskReminderPreferencesModal
        isOpen={isReminderPrefsModalOpen}
        onClose={() => setIsReminderPrefsModalOpen(false)}
        preferences={reminderPrefs}
        onSavePreferences={handleSaveReminderPreferences}
      />
    </div>
  );
};
