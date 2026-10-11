import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  Flame,
  Award,
  TrendingUp,
  Download,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import { AnalyticsOverview } from '../types';

export const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<number>(14);

  const fetchAnalytics = async (days: number) => {
    try {
      setLoading(true);
      const data = await api.dashboard.getAnalytics(days);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(rangeDays);
  }, [rangeDays]);

  if (loading || !analytics) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
        <div className="h-72 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
      </div>
    );
  }

  // Calculate highest day for chart scale
  const maxDailyMinutes = Math.max(60, ...analytics.dailyStudyTime.map(d => d.minutes));
  const totalStudyMinutesInRange = analytics.dailyStudyTime.reduce((acc, d) => acc + d.minutes, 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Study Analytics & Productivity Metrics
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Derived directly from recorded focus sessions, habit logs, and curriculum progress.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range filter buttons */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-xs">
            <button
              onClick={() => setRangeDays(7)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                rangeDays === 7
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setRangeDays(14)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                rangeDays === 14
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setRangeDays(30)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                rangeDays === 30
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={() => api.dashboard.exportData()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Data</span>
          </button>
        </div>
      </div>

      {/* 2. Key Productivity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Focus Hours */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Recorded Study Time</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {(totalStudyMinutesInRange / 60).toFixed(1)}
            </span>
            <span className="text-xs text-neutral-500">hours</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Across {analytics.totalRecordedSessions} recorded sessions
          </p>
        </div>

        {/* Task Completion Velocity */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Task Completion Rate</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {analytics.taskStats.rate}%
            </span>
            <span className="text-xs text-neutral-500">
              ({analytics.taskStats.completed}/{analytics.taskStats.total})
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            {analytics.taskStats.overdue} overdue items remaining
          </p>
        </div>

        {/* Habit Consistency Rate */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Habit Consistency</span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {analytics.habitConsistency}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Measured against scheduled days
          </p>
        </div>

        {/* Average Focus Block */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Avg Session Length</span>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {analytics.averageSessionMinutes}
            </span>
            <span className="text-xs text-neutral-500">mins / session</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Uninterrupted focus duration
          </p>
        </div>
      </div>

      {/* 3. Daily Study Time Bar Chart */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Daily Study Minutes
            </h3>
            <p className="text-xs text-neutral-500">
              Focus time logged across the past {rangeDays} calendar days.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-neutral-500 tabular-nums">
            Peak: {maxDailyMinutes} mins
          </span>
        </div>

        {/* Responsive Bar Grid */}
        <div className="flex items-end gap-2 md:gap-3 h-48 pt-6 pb-2 px-2">
          {analytics.dailyStudyTime.map((d, idx) => {
            const heightPct = Math.max(6, Math.round((d.minutes / maxDailyMinutes) * 100));

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {d.minutes}m
                </div>
                <div
                  className="w-full max-w-[28px] rounded-t-md bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer shadow-xs"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] font-medium text-neutral-400 tabular-nums truncate max-w-full">
                  {d.date.split('-')[2]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Subject Distribution & Planned vs Actual Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <span>Study Time Allocation by Subject</span>
          </h3>

          <div className="space-y-3">
            {analytics.studyTimeBySubject.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No course focus sessions logged in this timeframe.
              </p>
            ) : (
              analytics.studyTimeBySubject.map(sub => {
                const pct = totalStudyMinutesInRange > 0
                  ? Math.round((sub.minutes / totalStudyMinutesInRange) * 100)
                  : 0;

                return (
                  <div key={sub.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {sub.name}
                      </span>
                      <span className="text-neutral-500 tabular-nums">
                        {sub.minutes} min ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: sub.color || '#10b981',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Planned vs Actual Focus */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span>Planned vs Actual Study Time</span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Planned (Task Estimates):</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {analytics.plannedVsActual.plannedMinutes} mins
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Actual (Recorded Focus Sessions):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {analytics.plannedVsActual.actualMinutes} mins
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              * Note: Planned study time sums the estimated completion minutes across your academic tasks, while actual study time reflects the verified timer seconds recorded during your focus sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
