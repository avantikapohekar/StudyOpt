import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Moon,
  Sun,
  Clock,
  Download,
  Database,
  Check,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  Timer,
  Code,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface SettingsViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ isDark, onToggleTheme }) => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [college, setCollege] = useState(user?.college || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'America/Los_Angeles');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(user?.targetDailyMinutes || 120);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Export State
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customDataset, setCustomDataset] = useState<'notes' | 'tasks' | 'study_sessions' | 'all'>('all');
  const [customFormat, setCustomFormat] = useState<'json' | 'csv'>('json');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateProfile({
        name: name.trim(),
        college: college.trim(),
        timezone,
        targetDailyMinutes,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const TIMEZONE_OPTIONS = [
    'America/Los_Angeles',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Kolkata',
    'UTC',
  ];

  const handleExportDownload = async (
    type: 'all' | 'tasks' | 'notes' | 'study_sessions',
    format: 'json' | 'csv'
  ) => {
    const key = `${type}-${format}`;
    setExportingKey(key);
    setExportFeedback(null);

    try {
      await api.dashboard.exportData({ type, format });
      const datasetNames: Record<string, string> = {
        all: 'Complete Academic Archive',
        notes: 'Notes & Summaries',
        tasks: 'Tasks & Subtasks',
        study_sessions: 'Study Sessions & Logs',
      };
      setExportFeedback({
        type: 'success',
        message: `Successfully downloaded ${datasetNames[type]} (${format.toUpperCase()})!`,
      });
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err) {
      console.error('Failed to export academic data:', err);
      setExportFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to export data. Please try again.',
      });
    } finally {
      setExportingKey(null);
    }
  };

  const EXPORT_DATASETS = [
    {
      id: 'notes' as const,
      title: 'Notes & Summaries',
      description: 'Markdown study notes, subject associations, syllabus topics, tags, and pinned status.',
      icon: FileText,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    },
    {
      id: 'tasks' as const,
      title: 'Tasks & Subtasks',
      description: 'Task titles, descriptions, due dates, statuses, priorities, nested subtasks, and assignments.',
      icon: CheckSquare,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
    {
      id: 'study_sessions' as const,
      title: 'Study Sessions & Logs',
      description: 'Focus durations, session modes (Pomodoro, Stopwatch), quality ratings, tasks, and reflections.',
      icon: Timer,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    },
    {
      id: 'all' as const,
      title: 'Complete Academic Archive',
      description: 'Full workspace snapshot including semesters, subjects, syllabus units, tasks, notes, and habits.',
      icon: Database,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Workspace Settings & Preferences
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure your student identity, study targets, timezone, and data backups.
          </p>
        </div>
      </div>

      {/* 2. Profile Details Form */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-500" />
          <span>Student Profile Details</span>
        </h3>

        {savedSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Profile and settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/50 px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                University / Institution
              </label>
              <input
                type="text"
                placeholder="e.g. Stanford University"
                value={college}
                onChange={e => setCollege(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Timezone (Used for Countdown & Calendars)
              </label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              >
                {TIMEZONE_OPTIONS.map(tz => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Target Daily Focus Goal (Minutes)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="480"
                step="30"
                value={targetDailyMinutes}
                onChange={e => setTargetDailyMinutes(Number(e.target.value))}
                className="flex-1 accent-emerald-600"
              />
              <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100 w-20 text-right tabular-nums">
                {targetDailyMinutes} mins
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Appearance & Theme */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-600'}`}>
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Interface Appearance & Theme
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose between Crisp Light for daytime reading and Dark Studio for night study sessions.
              </p>
            </div>
          </div>

          <button
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-purple-500" />}
            <span>Quick Toggle</span>
          </button>
        </div>

        {/* Theme Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Light Mode Card */}
          <div
            onClick={() => {
              if (isDark) onToggleTheme();
            }}
            className={`group relative flex flex-col justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
              !isDark
                ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500'
                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                    <Sun className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Crisp Light
                  </span>
                </div>
                {!isDark && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3" />
                    <span>Active</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Bright, high-contrast daylight theme. Clean paper-like backgrounds for reading notes and syllabus tracking.
              </p>
            </div>

            {/* Light Mockup Preview */}
            <div className="mt-3.5 rounded-lg border border-neutral-200 bg-white p-2.5 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-12 rounded-full bg-neutral-300" />
                <div className="h-2 w-6 rounded-full bg-emerald-400" />
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100" />
              <div className="flex gap-1.5">
                <div className="h-4 flex-1 rounded-sm bg-neutral-100" />
                <div className="h-4 flex-1 rounded-sm bg-neutral-100" />
              </div>
            </div>
          </div>

          {/* Dark Mode Card */}
          <div
            onClick={() => {
              if (!isDark) onToggleTheme();
            }}
            className={`group relative flex flex-col justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
              isDark
                ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500'
                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400">
                    <Moon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Dark Studio
                  </span>
                </div>
                {isDark && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3" />
                    <span>Active</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Sleek midnight theme. Minimizes eye fatigue during deep focus sessions and late-night study marathons.
              </p>
            </div>

            {/* Dark Mockup Preview */}
            <div className="mt-3.5 rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-12 rounded-full bg-neutral-700" />
                <div className="h-2 w-6 rounded-full bg-emerald-600" />
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-800" />
              <div className="flex gap-1.5">
                <div className="h-4 flex-1 rounded-sm bg-neutral-800" />
                <div className="h-4 flex-1 rounded-sm bg-neutral-800" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Academic Data Export (Notes, Tasks, Study Sessions as JSON or CSV) */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-500" />
              <span>Academic Data Export & Portability</span>
            </h3>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              JSON &middot; CSV Supported
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Export your academic records including notes, tasks, subtasks, and study session logs for backups, spreadsheet analysis, or external tools.
          </p>
        </div>

        {/* Export Feedback Alert */}
        {exportFeedback && (
          <div
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs ${
              exportFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
            }`}
          >
            {exportFeedback.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{exportFeedback.message}</span>
          </div>
        )}

        {/* Quick Dataset Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPORT_DATASETS.map(dataset => {
            const Icon = dataset.icon;
            const isJsonLoading = exportingKey === `${dataset.id}-json`;
            const isCsvLoading = exportingKey === `${dataset.id}-csv`;

            return (
              <div
                key={dataset.id}
                className="flex flex-col justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${dataset.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {dataset.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {dataset.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <button
                    onClick={() => handleExportDownload(dataset.id, 'json')}
                    disabled={exportingKey !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-750 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    {isJsonLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Code className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span>{isJsonLoading ? 'Exporting...' : 'JSON'}</span>
                  </button>

                  <button
                    onClick={() => handleExportDownload(dataset.id, 'csv')}
                    disabled={exportingKey !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-750 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    {isCsvLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span>{isCsvLoading ? 'Exporting...' : 'CSV'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Export Selector */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Custom Data Exporter
            </span>
            <span className="text-[11px] text-neutral-500">
              Select specific dataset & output format
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Target Dataset
              </label>
              <select
                value={customDataset}
                onChange={e => setCustomDataset(e.target.value as any)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="all">Complete Academic Archive (All)</option>
                <option value="notes">Notes & Summaries Only</option>
                <option value="tasks">Tasks & Subtasks Only</option>
                <option value="study_sessions">Study Sessions & Logs Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                File Format
              </label>
              <select
                value={customFormat}
                onChange={e => setCustomFormat(e.target.value as any)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="json">JSON (.json) - Hierarchical Object</option>
                <option value="csv">CSV (.csv) - Spreadsheet Comma-Separated</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleExportDownload(customDataset, customFormat)}
                disabled={exportingKey !== null}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {exportingKey === `${customDataset}-${customFormat}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>
                  {exportingKey === `${customDataset}-${customFormat}`
                    ? 'Preparing Export...'
                    : `Download ${customFormat.toUpperCase()}`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Architecture note */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
          <p className="font-semibold text-neutral-900 dark:text-neutral-200 flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-blue-500" />
            <span>Relational Database Integrity & Compatibility</span>
          </p>
          <p className="text-[11px] text-neutral-500">
            StudyOS maintains relational schema foreign keys connecting semesters &rarr; subjects &rarr; units &rarr; topics &rarr; tasks & subtasks. Exported JSON files preserve the foreign key IDs, and CSV files include joined subject codes, titles, and timestamps.
          </p>
        </div>
      </div>
    </div>
  );
};
