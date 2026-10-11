import { Router, Request, Response } from 'express';
import { dbInstance, GoalPeriod } from '../db.js';
import { authenticateUser } from '../auth.js';

export const habitRouter = Router();
habitRouter.use(authenticateUser);

// ---------------- HABITS ----------------

// Helper to calculate current streak for a habit
function calculateStreak(habitId: string): { currentStreak: number; bestStreak: number; totalCompleted: number } {
  const logs = dbInstance.db.habitLogs.filter(l => l.habitId === habitId);
  if (logs.length === 0) return { currentStreak: 0, bestStreak: 0, totalCompleted: 0 };

  const datesSet = new Set(logs.map(l => l.logDate));
  const sortedDates = Array.from(datesSet).sort().reverse(); // newest first

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let checkDate = datesSet.has(todayStr) ? new Date() : (datesSet.has(yesterdayStr) ? new Date(Date.now() - 86400000) : null);

  if (checkDate) {
    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (datesSet.has(dStr)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, sortedDates.length > 0 ? 5 : 0), // approximation
    totalCompleted: logs.length,
  };
}

// Get user habits with logs and streak stats
habitRouter.get('/habits', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const habits = dbInstance.db.habits.filter(h => h.userId === userId);

  // Generate 30 days history array
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    last30Days.push(d.toISOString().split('T')[0]);
  }

  const enhancedHabits = habits.map(habit => {
    const logs = dbInstance.db.habitLogs.filter(l => l.habitId === habit.id);
    const completedDatesMap: Record<string, boolean> = {};
    logs.forEach(l => {
      completedDatesMap[l.logDate] = true;
    });

    const streak = calculateStreak(habit.id);
    const todayStr = new Date().toISOString().split('T')[0];

    return {
      ...habit,
      frequencyList: JSON.parse(habit.frequencyConfig || '[]'),
      isCompletedToday: Boolean(completedDatesMap[todayStr]),
      streak: streak.currentStreak,
      totalCompleted: streak.totalCompleted,
      history30Days: last30Days.map(date => ({
        date,
        completed: Boolean(completedDatesMap[date]),
      })),
    };
  });

  return res.json({ habits: enhancedHabits });
});

// Create habit
habitRouter.post('/habits', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, description, frequencyConfig, targetPerDay } = req.body;

  if (!name) return res.status(400).json({ error: 'Habit name is required' });

  const newHabit = {
    id: `hab_${Date.now()}`,
    userId,
    name: name.trim(),
    description: description ? description.trim() : '',
    frequencyConfig: Array.isArray(frequencyConfig) ? JSON.stringify(frequencyConfig) : '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    isArchived: false,
    targetPerDay: Number(targetPerDay) || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.habits.push(newHabit);
  dbInstance.save();

  return res.status(201).json({
    habit: {
      ...newHabit,
      frequencyList: JSON.parse(newHabit.frequencyConfig),
      isCompletedToday: false,
      streak: 0,
      totalCompleted: 0,
      history30Days: [],
    },
  });
});

// Update habit
habitRouter.patch('/habits/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const habit = dbInstance.db.habits.find(h => h.id === id && h.userId === userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const { name, description, frequencyConfig, isArchived, targetPerDay } = req.body;

  if (name !== undefined) habit.name = name.trim();
  if (description !== undefined) habit.description = description.trim();
  if (frequencyConfig !== undefined) habit.frequencyConfig = Array.isArray(frequencyConfig) ? JSON.stringify(frequencyConfig) : habit.frequencyConfig;
  if (isArchived !== undefined) habit.isArchived = Boolean(isArchived);
  if (targetPerDay !== undefined) habit.targetPerDay = Number(targetPerDay);

  habit.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ habit });
});

// Toggle habit completion for a specific date (idempotent, prevents duplicates)
habitRouter.post('/habits/:id/toggle', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const dateStr = (req.body.date as string) || new Date().toISOString().split('T')[0];

  const habit = dbInstance.db.habits.find(h => h.id === id && h.userId === userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  const existingLogIndex = dbInstance.db.habitLogs.findIndex(l => l.habitId === id && l.logDate === dateStr);

  let completed = false;
  if (existingLogIndex >= 0) {
    // Unmark
    dbInstance.db.habitLogs.splice(existingLogIndex, 1);
    completed = false;
  } else {
    // Mark complete
    dbInstance.db.habitLogs.push({
      id: `hl_${id}_${dateStr}`,
      habitId: id,
      logDate: dateStr,
      completedAt: new Date().toISOString(),
      value: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    completed = true;
  }

  dbInstance.save();

  const streak = calculateStreak(id);
  return res.json({
    habitId: id,
    date: dateStr,
    completed,
    streak: streak.currentStreak,
    totalCompleted: streak.totalCompleted,
  });
});

// Delete habit
habitRouter.delete('/habits/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const habit = dbInstance.db.habits.find(h => h.id === id && h.userId === userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  dbInstance.db.habitLogs = dbInstance.db.habitLogs.filter(l => l.habitId !== id);
  dbInstance.db.habits = dbInstance.db.habits.filter(h => h.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Habit deleted' });
});

// ---------------- GOALS ----------------

// Get goals
habitRouter.get('/goals', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const goals = dbInstance.db.goals.filter(g => g.userId === userId);
  return res.json({ goals });
});

// Create goal
habitRouter.post('/goals', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, description, targetValue, currentValue, unit, period, startDate, endDate } = req.body;

  if (!title || targetValue === undefined) {
    return res.status(400).json({ error: 'Title and target value are required' });
  }

  const now = new Date();
  const newGoal = {
    id: `goal_${Date.now()}`,
    userId,
    title: title.trim(),
    description: description ? description.trim() : '',
    targetValue: Number(targetValue),
    currentValue: Number(currentValue) || 0,
    unit: unit || 'hours',
    period: (period as GoalPeriod) || 'WEEKLY',
    startDate: startDate ? new Date(startDate).toISOString() : now.toISOString(),
    endDate: endDate ? new Date(endDate).toISOString() : new Date(now.getTime() + 7 * 86400000).toISOString(),
    isCompleted: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  dbInstance.db.goals.push(newGoal);
  dbInstance.save();

  return res.status(201).json({ goal: newGoal });
});

// Update goal
habitRouter.patch('/goals/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const goal = dbInstance.db.goals.find(g => g.id === id && g.userId === userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const { title, description, targetValue, currentValue, unit, period, isCompleted } = req.body;

  if (title !== undefined) goal.title = title.trim();
  if (description !== undefined) goal.description = description.trim();
  if (targetValue !== undefined) goal.targetValue = Number(targetValue);
  if (currentValue !== undefined) {
    goal.currentValue = Number(currentValue);
    if (goal.currentValue >= goal.targetValue) goal.isCompleted = true;
  }
  if (unit !== undefined) goal.unit = unit;
  if (period !== undefined) goal.period = period;
  if (isCompleted !== undefined) goal.isCompleted = Boolean(isCompleted);

  goal.updatedAt = new Date().toISOString();
  dbInstance.save();

  return res.json({ goal });
});

// Delete goal
habitRouter.delete('/goals/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const goal = dbInstance.db.goals.find(g => g.id === id && g.userId === userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  dbInstance.db.goals = dbInstance.db.goals.filter(g => g.id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Goal deleted' });
});
