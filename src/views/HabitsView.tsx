import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Target,
  Check,
  Calendar,
  Sparkles,
  Archive,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api';
import { Habit, Goal, GoalPeriod } from '../types';

export const HabitsView: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Habit form
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  // Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [targetValue, setTargetValue] = useState<number>(20);
  const [goalUnit, setGoalUnit] = useState('hours');
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>('WEEKLY');

  const loadData = async () => {
    try {
      setLoading(true);
      const [habitsRes, goalsRes] = await Promise.all([
        api.habits.getHabits(),
        api.habits.getGoals(),
      ]);
      setHabits(habitsRes.habits);
      setGoals(goalsRes.goals);
    } catch (err) {
      console.error('Failed to load habits & goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleHabitDay = async (habitId: string, dateStr: string) => {
    try {
      await api.habits.toggleHabit(habitId, dateStr);
      loadData();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    try {
      await api.habits.createHabit({
        name: habitName.trim(),
        description: habitDesc.trim(),
        frequencyConfig: frequencyDays,
      });
      setIsHabitModalOpen(false);
      setHabitName('');
      setHabitDesc('');
      loadData();
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    try {
      await api.habits.createGoal({
        title: goalTitle.trim(),
        description: goalDesc.trim(),
        targetValue,
        unit: goalUnit,
        period: goalPeriod,
      });
      setIsGoalModalOpen(false);
      setGoalTitle('');
      setGoalDesc('');
      loadData();
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  const handleArchiveHabit = async (id: string, isArchived: boolean) => {
    try {
      await api.habits.updateHabit(id, { isArchived: !isArchived });
      loadData();
    } catch (err) {
      console.error('Failed to archive habit:', err);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await api.habits.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const DAYS_LIST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDaySelection = (day: string) => {
    setFrequencyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Goals & Academic Habits
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Consistency tracking, scheduled day occurrence heatmaps, and streak accountability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 shadow-xs"
          >
            <Target className="h-4 w-4 text-blue-500" />
            <span>New Goal</span>
          </button>
          <button
            onClick={() => setIsHabitModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* 2. Academic Goals Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          <span>Active Academic Goals</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {goal.period} GOAL
                    </span>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                      {goal.title}
                    </h4>
                  </div>
                  <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {pct}%
                  </span>
                </div>

                {goal.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                    {goal.description}
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-500 tabular-nums">
                    <span>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                    <span>{goal.isCompleted ? 'Target Achieved' : 'In Progress'}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Daily Habits Section with 30-Day Heatmap Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <span>Daily Habit Streaks & 30-Day History</span>
        </h3>

        <div className="space-y-4">
          {habits.map(habit => {
            const history = habit.history30Days || [];

            return (
              <div
                key={habit.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs"
              >
                {/* Habit Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                        {habit.name}
                      </h4>
                      {habit.isArchived && (
                        <span className="text-[10px] text-neutral-400">· Archived</span>
                      )}
                    </div>
                    {habit.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {habit.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                      <span>Scheduled: {habit.frequencyList?.join(', ') || 'Daily'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Streak Badge */}
                    <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 px-3 py-1.5 text-orange-800 dark:text-orange-300 text-xs font-semibold tabular-nums">
                      <Flame className="h-4 w-4 text-orange-500 fill-current" />
                      <span>{habit.streak ?? 0} Day Streak</span>
                    </div>

                    {/* Today Toggle Button */}
                    <button
                      onClick={() => handleToggleHabitDay(habit.id, todayStr)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        habit.isCompletedToday
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{habit.isCompletedToday ? 'Done Today' : 'Mark Today'}</span>
                    </button>

                    <button
                      onClick={() => handleArchiveHabit(habit.id, habit.isArchived)}
                      title={habit.isArchived ? 'Unarchive' : 'Archive'}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      <Archive className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 30-Day Completion Heatmap (GitHub-style blocks) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
                    <span>30-Day Activity Heatmap (Click any box to toggle)</span>
                    <span className="tabular-nums font-mono">
                      {habit.totalCompleted ?? 0} completions recorded
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {history.map((day, idx) => {
                      const isToday = day.date === todayStr;
                      return (
                        <button
                          key={day.date}
                          onClick={() => handleToggleHabitDay(habit.id, day.date)}
                          title={`${day.date}: ${day.completed ? 'Completed' : 'Missed'}`}
                          className={`w-6 h-6 rounded-md text-[9px] font-mono flex items-center justify-center transition-all ${
                            day.completed
                              ? 'bg-emerald-500 text-white font-bold shadow-xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          } ${isToday ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-neutral-900' : ''}`}
                        >
                          {day.date.split('-')[2]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Habit Modal */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Add New Academic Habit
            </h3>

            <form onSubmit={handleCreateHabit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Anki Spaced Repetition"
                  value={habitName}
                  onChange={e => setHabitName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description / Routine Cue
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 20 minutes review right after morning coffee"
                  value={habitDesc}
                  onChange={e => setHabitDesc(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Scheduled Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_LIST.map(day => {
                    const isSelected = frequencyDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDaySelection(day)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsHabitModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Add Academic Goal
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Deep Study Target"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Criteria for success..."
                  value={goalDesc}
                  onChange={e => setGoalDesc(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={e => setTargetValue(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={goalUnit}
                    onChange={e => setGoalUnit(e.target.value)}
                    placeholder="hours, chapters, %"
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Period Cadence
                </label>
                <select
                  value={goalPeriod}
                  onChange={e => setGoalPeriod(e.target.value as GoalPeriod)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="SEMESTER">Semester</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
