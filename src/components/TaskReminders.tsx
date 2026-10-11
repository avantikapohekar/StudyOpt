import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Flame,
  Check,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Task, TaskPriority } from '../types';

export interface ReminderPreferences {
  enabled: boolean;
  leadTimeHours: number; // 1, 3, 6, 12, 24, 48, 72
  priorityFilter: 'ALL' | 'MEDIUM_PLUS' | 'HIGH_ONLY';
  includeOverdue: boolean;
  soundEnabled: boolean;
  browserNotifications: boolean;
  snoozedUntil: Record<string, string>; // taskId -> ISO timestamp
  dismissedTaskIds: string[]; // taskId[]
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: true,
  leadTimeHours: 24, // Notify 24 hours in advance
  priorityFilter: 'ALL',
  includeOverdue: true,
  soundEnabled: true,
  browserNotifications: false,
  snoozedUntil: {},
  dismissedTaskIds: [],
};

const STORAGE_KEY = 'studyos_task_reminder_prefs';

export function loadReminderPreferences(): ReminderPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_REMINDER_PREFERENCES,
      ...parsed,
      snoozedUntil: parsed.snoozedUntil || {},
      dismissedTaskIds: parsed.dismissedTaskIds || [],
    };
  } catch {
    return DEFAULT_REMINDER_PREFERENCES;
  }
}

export function saveReminderPreferences(prefs: ReminderPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save reminder preferences:', err);
  }
}

export function playReminderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  } catch {
    // Autoplay restrictions or unsupported audio
  }
}

export function triggerBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (err) {
      console.warn('Browser notification failed:', err);
    }
  }
}

export function formatDuration(ms: number): string {
  const totalMins = Math.floor(ms / (1000 * 60));
  if (totalMins < 60) {
    return `${Math.max(1, totalMins)}m`;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export type ReminderUrgency = 'OVERDUE' | 'CRITICAL' | 'URGENT' | 'SOON' | 'UPCOMING';

export interface ActiveTaskReminder {
  task: Task;
  urgency: ReminderUrgency;
  hoursRemaining: number;
  timeLabel: string;
  isOverdue: boolean;
}

export function getActiveTaskReminders(
  tasks: Task[],
  prefs: ReminderPreferences,
  now: Date = new Date()
): ActiveTaskReminder[] {
  if (!prefs.enabled) return [];

  const reminders: ActiveTaskReminder[] = [];

  for (const task of tasks) {
    // Skip finished tasks
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') continue;
    if (!task.dueAt) continue;

    // Check dismissed
    if (prefs.dismissedTaskIds.includes(task.id)) continue;

    // Check snoozed
    if (prefs.snoozedUntil[task.id]) {
      const snoozedTime = new Date(prefs.snoozedUntil[task.id]).getTime();
      if (snoozedTime > now.getTime()) continue;
    }

    // Check priority filter
    if (prefs.priorityFilter === 'HIGH_ONLY' && task.priority !== 'HIGH' && (task.priority as any) !== 'URGENT') {
      continue;
    }
    if (prefs.priorityFilter === 'MEDIUM_PLUS' && task.priority === 'LOW') {
      continue;
    }

    const dueDate = new Date(task.dueAt);
    const diffMs = dueDate.getTime() - now.getTime();
    const hoursRemaining = diffMs / (1000 * 60 * 60);

    // Overdue handling
    if (diffMs < 0) {
      if (prefs.includeOverdue) {
        reminders.push({
          task,
          urgency: 'OVERDUE',
          hoursRemaining,
          timeLabel: `Overdue by ${formatDuration(Math.abs(diffMs))}`,
          isOverdue: true,
        });
      }
      continue;
    }

    // Within lead time window
    if (hoursRemaining <= prefs.leadTimeHours) {
      let urgency: ReminderUrgency = 'UPCOMING';
      if (hoursRemaining <= 3) urgency = 'CRITICAL';
      else if (hoursRemaining <= 12) urgency = 'URGENT';
      else if (hoursRemaining <= 24) urgency = 'SOON';

      reminders.push({
        task,
        urgency,
        hoursRemaining,
        timeLabel: `Due in ${formatDuration(diffMs)}`,
        isOverdue: false,
      });
    }
  }

  // Sort: Overdue first, then by earliest due date
  return reminders.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.hoursRemaining - b.hoursRemaining;
  });
}

// -------------------------------------------------------------
// UI Component: Reminder Preferences Modal
// -------------------------------------------------------------
interface TaskReminderPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReminderPreferences;
  onSavePreferences: (updated: ReminderPreferences) => void;
}

export const TaskReminderPreferencesModal: React.FC<TaskReminderPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
}) => {
  const [formPrefs, setFormPrefs] = useState<ReminderPreferences>(preferences);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    setFormPrefs(preferences);
  }, [preferences]);

  if (!isOpen) return null;

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setFormPrefs(prev => ({ ...prev, browserNotifications: true }));
        triggerBrowserNotification('StudyOS Reminders', 'Browser notifications enabled for upcoming deadlines!');
      } else {
        setFormPrefs(prev => ({ ...prev, browserNotifications: false }));
      }
    } catch (err) {
      console.warn('Permission request error:', err);
    }
  };

  const handleTestSound = () => {
    playReminderChime();
  };

  const handleResetDismissed = () => {
    setFormPrefs(prev => ({
      ...prev,
      dismissedTaskIds: [],
      snoozedUntil: {},
    }));
  };

  const handleSave = () => {
    onSavePreferences(formPrefs);
    onClose();
  };

  const LEAD_TIME_OPTIONS = [
    { value: 1, label: '1 hour in advance' },
    { value: 3, label: '3 hours in advance' },
    { value: 6, label: '6 hours in advance' },
    { value: 12, label: '12 hours in advance' },
    { value: 24, label: '24 hours (1 day) in advance' },
    { value: 48, label: '48 hours (2 days) in advance' },
    { value: 72, label: '72 hours (3 days) in advance' },
  ];

  const dismissedCount = formPrefs.dismissedTaskIds.length + Object.keys(formPrefs.snoozedUntil).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Deadline Reminder Preferences
              </h3>
              <p className="text-[11px] text-neutral-500">
                Configure notifications and alerts for upcoming task due dates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                Enable Task Deadline Reminders
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Show warning banners, badges, and alerts for impending deadlines
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formPrefs.enabled}
                onChange={e => setFormPrefs(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:bg-neutral-700 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Lead Time Threshold */}
          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-neutral-500" />
              <span>Reminder Window (Advance Notice)</span>
            </label>
            <p className="text-[11px] text-neutral-500">
              Notify me when a deadline falls within this window:
            </p>
            <select
              value={formPrefs.leadTimeHours}
              onChange={e => setFormPrefs(prev => ({ ...prev, leadTimeHours: Number(e.target.value) }))}
              disabled={!formPrefs.enabled}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 disabled:opacity-50 focus:outline-hidden focus:border-emerald-500"
            >
              {LEAD_TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-neutral-500" />
              <span>Priority Threshold</span>
            </label>
            <p className="text-[11px] text-neutral-500">
              Select which task priorities trigger reminder alerts:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ALL', label: 'All Tasks' },
                { id: 'MEDIUM_PLUS', label: 'Med & High' },
                { id: 'HIGH_ONLY', label: 'High Only' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!formPrefs.enabled}
                  onClick={() => setFormPrefs(prev => ({ ...prev, priorityFilter: item.id as any }))}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    formPrefs.priorityFilter === item.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Include Overdue */}
          <div className="flex items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                Include Overdue Tasks
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Keep alerting for missed deadlines until marked complete
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!formPrefs.enabled}
                checked={formPrefs.includeOverdue}
                onChange={e => setFormPrefs(prev => ({ ...prev, includeOverdue: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:bg-neutral-700 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Sound Notification Chime */}
          <div className="flex items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                Audio Chime Alert
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Play subtle two-tone chime when urgent deadlines exist
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSound}
                title="Preview Chime"
                className="px-2 py-1 rounded-md text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="h-3 w-3" />
                <span>Test</span>
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!formPrefs.enabled}
                  checked={formPrefs.soundEnabled}
                  onChange={e => setFormPrefs(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:bg-neutral-700 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Browser Desktop Notifications */}
          <div className="flex items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                Browser Desktop Alerts
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Send system push notifications for urgent deadlines
              </span>
            </div>
            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                disabled={!formPrefs.enabled}
                onClick={handleRequestBrowserPermission}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer disabled:opacity-50"
              >
                Enable
              </button>
            ) : (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!formPrefs.enabled}
                  checked={formPrefs.browserNotifications}
                  onChange={e => setFormPrefs(prev => ({ ...prev, browserNotifications: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:bg-neutral-700 peer-checked:bg-emerald-600"></div>
              </label>
            )}
          </div>

          {/* Reset Dismissed Reminders */}
          {dismissedCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
                  {dismissedCount} Snoozed or Dismissed
                </span>
                <span className="text-[11px] text-neutral-500">
                  Restore hidden reminders back into active notifications
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetDismissed}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// UI Component: Deadline Reminder Banner & Notification Center
// -------------------------------------------------------------
interface TaskReminderBannerProps {
  reminders: ActiveTaskReminder[];
  preferences: ReminderPreferences;
  onOpenPreferences: () => void;
  onCompleteTask: (taskId: string) => void;
  onSnoozeTask: (taskId: string, hours: number) => void;
  onDismissTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
}

export const TaskReminderBanner: React.FC<TaskReminderBannerProps> = ({
  reminders,
  preferences,
  onOpenPreferences,
  onCompleteTask,
  onSnoozeTask,
  onDismissTask,
  onSelectTask,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSnoozeMenuId, setActiveSnoozeMenuId] = useState<string | null>(null);

  if (!preferences.enabled || reminders.length === 0) {
    return null;
  }

  const overdueCount = reminders.filter(r => r.isOverdue).length;
  const criticalCount = reminders.filter(r => r.urgency === 'CRITICAL').length;
  const hasCriticalOrOverdue = overdueCount > 0 || criticalCount > 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
        hasCriticalOrOverdue
          ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
          : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
      }`}
    >
      {/* Banner Header Bar */}
      <div className="flex items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
              hasCriticalOrOverdue
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
            }`}
          >
            {hasCriticalOrOverdue ? <Flame className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {overdueCount > 0
                  ? `${overdueCount} Overdue Task${overdueCount === 1 ? '' : 's'} & ${reminders.length - overdueCount} Upcoming Deadline${reminders.length - overdueCount === 1 ? '' : 's'}`
                  : `${reminders.length} Impending Deadline${reminders.length === 1 ? '' : 's'} Notice`}
              </h4>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  hasCriticalOrOverdue
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                Within {preferences.leadTimeHours}h window
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Based on your notification preferences. Review deadlines, snooze, or mark complete directly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenPreferences}
            title="Notification Preferences"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 hover:bg-white text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 hover:bg-white text-neutral-700 dark:text-neutral-200 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <span>{isExpanded ? 'Collapse' : `Show (${reminders.length})`}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Reminder Cards */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {reminders.map(item => {
              const { task, urgency, timeLabel, isOverdue } = item;
              const isSnoozeOpen = activeSnoozeMenuId === task.id;

              return (
                <div
                  key={task.id}
                  className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-900/90 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isOverdue
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                            : urgency === 'CRITICAL'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : urgency === 'URGENT'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        <span>{timeLabel}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {task.subjectCode && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono"
                            style={{
                              backgroundColor: `${task.subjectColor || '#10b981'}18`,
                              color: task.subjectColor || '#10b981',
                            }}
                          >
                            {task.subjectCode}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            task.priority === 'HIGH'
                              ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                              : task.priority === 'MEDIUM'
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {/* Task Title & Details */}
                    <h5
                      onClick={() => onSelectTask(task)}
                      className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer line-clamp-1"
                    >
                      {task.title}
                    </h5>

                    {task.description && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}

                    {/* Subtasks pill if present */}
                    {task.subtasksCount !== undefined && task.subtasksCount > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">
                        <Layers className="h-3 w-3 text-neutral-400" />
                        <span>
                          {task.completedSubtasksCount || 0}/{task.subtasksCount} subtasks done
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <button
                      onClick={() => onCompleteTask(task.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Done</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Snooze Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveSnoozeMenuId(isSnoozeOpen ? null : task.id)}
                          className="px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Snooze
                        </button>

                        {isSnoozeOpen && (
                          <div className="absolute right-0 bottom-full mb-1 z-20 w-32 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-1 text-[11px]">
                            <button
                              onClick={() => {
                                onSnoozeTask(task.id, 1);
                                setActiveSnoozeMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                            >
                              Snooze 1 hour
                            </button>
                            <button
                              onClick={() => {
                                onSnoozeTask(task.id, 4);
                                setActiveSnoozeMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                            >
                              Snooze 4 hours
                            </button>
                            <button
                              onClick={() => {
                                onSnoozeTask(task.id, 24);
                                setActiveSnoozeMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                            >
                              Snooze 1 day
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => onDismissTask(task.id)}
                        title="Dismiss reminder"
                        className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
