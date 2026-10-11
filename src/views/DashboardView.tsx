import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  Award,
  ArrowRight,
  BookOpen,
  Plus,
  Play,
  FileText,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { DashboardSummary } from '../types';
import { NavSection } from '../components/Sidebar';

interface DashboardViewProps {
  onNavigate: (section: NavSection) => void;
  onOpenQuickAdd: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenQuickAdd }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await api.dashboard.getSummary();
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleToggleHabit = async (habitId: string) => {
    try {
      await api.habits.toggleHabit(habitId);
      // Refresh summary
      fetchSummary();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await api.tasks.toggleComplete(taskId);
      fetchSummary();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-72 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-72 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-500 mb-4">{error || 'Could not load dashboard'}</p>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const studyProgressPct = Math.min(
    100,
    Math.round((summary.todayStudyMinutes / (summary.targetDailyMinutes || 120)) * 100)
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Greeting & Quick Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
            <span>{summary.user.activeSemesterName || 'Fall Term'}</span>
            <span aria-hidden="true">·</span>
            <span>{summary.user.college || 'College Workspace'}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Welcome back, {summary.user.name}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            You have <span className="font-semibold text-neutral-900 dark:text-neutral-200">{summary.tasksDueTodayCount} tasks</span> due today and{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-200">{summary.todayEvents.length} scheduled classes</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('focus')}
            className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Play className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />
            <span>Start Focus Session</span>
          </button>
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (Tabular Numbers, 0-Pill Metadata) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Today Focus Time */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Today's Focus</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {summary.todayStudyMinutes}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">/ {summary.targetDailyMinutes} min</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${studyProgressPct}%` }}
            />
          </div>
        </div>

        {/* Due Today & Overdue */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Tasks Due Today</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {summary.tasksDueTodayCount}
            </span>
            {summary.overdueTasksCount > 0 && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {summary.overdueTasksCount} overdue
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            {summary.overdueTasksCount > 0 ? 'Requires attention today' : 'All prior deadlines cleared'}
          </p>
        </div>

        {/* Upcoming Exams */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Upcoming Exams</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {summary.upcomingExams.length}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">within 30d</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
            {summary.upcomingExams[0]
              ? `${summary.upcomingExams[0].subjectCode}: ${summary.upcomingExams[0].title}`
              : 'No exams scheduled'}
          </p>
        </div>

        {/* Habits Today */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium">Habits Checked</span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {summary.habitSummary.filter(h => h.isCompleted).length}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">/ {summary.habitSummary.length}</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            {summary.thisWeekStudyMinutes} mins logged this week
          </p>
        </div>
      </div>

      {/* 3. Main 3-Column Content Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Timetable & Schedule */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Today's Schedule
              </h3>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Planner</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {summary.todayEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No classes or study blocks scheduled for today.
              </div>
            ) : (
              summary.todayEvents.map(evt => {
                const startTime = new Date(evt.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(evt.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={evt.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-200 transition-colors"
                  >
                    <div
                      className="w-1.5 h-10 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: evt.color || '#10b981' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {evt.title}
                        </span>
                        {evt.subjectCode && (
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            · {evt.subjectCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums">
                        <span>{startTime} – {endTime}</span>
                        {evt.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{evt.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Column: Tasks Due Today & Overdue Items */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neutral-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Action Items
              </h3>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>All Tasks</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1">
            {summary.overdueTasks.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Overdue Tasks</span>
                </div>
                {summary.overdueTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-red-200 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/20 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-red-900 dark:text-red-200 truncate">{task.title}</p>
                      <p className="text-[10px] text-red-600 dark:text-red-400">{task.subjectCode || 'General'}</p>
                    </div>
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="px-2 py-1 text-[10px] font-medium rounded bg-white dark:bg-neutral-900 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100"
                    >
                      Done
                    </button>
                  </div>
                ))}
              </div>
            )}

            {summary.tasksDueToday.length === 0 && summary.overdueTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No tasks due today. Everything on schedule!
              </div>
            ) : (
              summary.tasksDueToday.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 bg-white dark:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="h-4 w-4 rounded border border-neutral-300 dark:border-neutral-600 flex items-center justify-center hover:border-emerald-500 shrink-0"
                    >
                      {task.status === 'COMPLETED' && <Check className="h-3 w-3 text-emerald-600" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {task.subjectCode || 'Course'} · {task.priority} Priority
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Syllabus Progress & Habits Checklist */}
        <div className="space-y-6">
          {/* Syllabus Progress */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-neutral-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Syllabus Progress
                </h3>
              </div>
              <button
                onClick={() => onNavigate('academics')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Tracker
              </button>
            </div>

            <div className="space-y-3">
              {summary.subjectProgress.map(sub => (
                <div key={sub.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {sub.code} - {sub.name}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {sub.progressPercentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${sub.progressPercentage}%`,
                        backgroundColor: sub.color || '#10b981',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Habit Checklist */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Today's Habits
                </h3>
              </div>
              <button
                onClick={() => onNavigate('habits')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Habits
              </button>
            </div>

            <div className="space-y-2">
              {summary.habitSummary.map(habit => (
                <button
                  key={habit.id}
                  onClick={() => handleToggleHabit(habit.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border transition-colors ${
                    habit.isCompleted
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                  }`}
                >
                  <span className="truncate">{habit.name}</span>
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                      habit.isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {habit.isCompleted && <Check className="h-3 w-3" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Upcoming Exam Countdown & Recent Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exams */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Upcoming Examinations</span>
            </h3>
            <button
              onClick={() => onNavigate('exams')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Exam Center
            </button>
          </div>

          <div className="space-y-2.5">
            {summary.upcomingExams.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 py-4 text-center">
                No examinations registered.
              </p>
            ) : (
              summary.upcomingExams.slice(0, 3).map(exam => {
                const daysRemaining = Math.max(
                  0,
                  Math.ceil((new Date(exam.startsAt).getTime() - new Date().getTime()) / 86400000)
                );
                return (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30"
                  >
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{exam.title}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {exam.subjectCode} · {new Date(exam.startsAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {daysRemaining}d
                      </span>
                      <p className="text-[10px] text-neutral-400">countdown</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Notes */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <span>Recent Study Notes</span>
            </h3>
            <button
              onClick={() => onNavigate('notes')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              All Notes
            </button>
          </div>

          <div className="space-y-2.5">
            {summary.recentNotes.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 py-4 text-center">
                No notes created yet.
              </p>
            ) : (
              summary.recentNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => onNavigate('notes')}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 bg-neutral-50/50 dark:bg-neutral-800/30 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{n.title}</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {n.subjectCode || 'General Note'} · Updated {new Date(n.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
