import { Router, Request, Response } from 'express';
import { dbInstance } from '../db.js';
import { hashPassword, comparePassword, signToken, authenticateUser } from '../auth.js';

export const authRouter = Router();

// Register new user
authRouter.post('/register', (req: Request, res: Response) => {
  const { name, email, password, college, timezone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Validation Error', message: 'Name, email, and password are required' });
  }

  const existing = dbInstance.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists' });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser = {
    id: userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    passwordHash: hashPassword(password),
    college: college ? college.trim() : '',
    targetDailyMinutes: 120,
    theme: 'dark',
    timezone: timezone || 'UTC',
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbInstance.db.users.push(newUser);
  dbInstance.save();

  const token = signToken(newUser);
  const { passwordHash: _, ...safeUser } = newUser;

  return res.status(201).json({
    user: safeUser,
    token,
  });
});

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
  }

  const user = dbInstance.db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user || !comparePassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
  }

  const token = signToken(user);
  const { passwordHash: _, ...safeUser } = user;

  return res.json({
    user: safeUser,
    token,
  });
});

// Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user profile
authRouter.get('/me', authenticateUser, (req: Request, res: Response) => {
  const user = dbInstance.db.users.find(u => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
  }

  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// Update profile / settings
authRouter.patch('/profile', authenticateUser, (req: Request, res: Response) => {
  const user = dbInstance.db.users.find(u => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
  }

  const { name, college, targetDailyMinutes, theme, timezone, onboardingCompleted } = req.body;

  if (name !== undefined) user.name = name.trim();
  if (college !== undefined) user.college = college.trim();
  if (targetDailyMinutes !== undefined) user.targetDailyMinutes = Number(targetDailyMinutes) || 120;
  if (theme !== undefined) user.theme = theme;
  if (timezone !== undefined) user.timezone = timezone;
  if (onboardingCompleted !== undefined) user.onboardingCompleted = Boolean(onboardingCompleted);

  user.updatedAt = new Date().toISOString();
  dbInstance.save();

  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// Onboarding submission
authRouter.post('/onboarding', authenticateUser, (req: Request, res: Response) => {
  const user = dbInstance.db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not Found' });

  const { college, semesterName, subjects, targetDailyMinutes, theme } = req.body;

  if (college) user.college = college;
  if (targetDailyMinutes) user.targetDailyMinutes = Number(targetDailyMinutes) || 120;
  if (theme) user.theme = theme;
  user.onboardingCompleted = true;
  user.updatedAt = new Date().toISOString();

  // Create initial semester if provided
  if (semesterName) {
    const semesterId = `sem_${Date.now()}`;
    const now = new Date();
    const fourMonthsLater = new Date(Date.now() + 120 * 86400000);

    dbInstance.db.semesters.push({
      id: semesterId,
      userId: user.id,
      name: semesterName,
      startDate: now.toISOString(),
      endDate: fourMonthsLater.toISOString(),
      isActive: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // Create subjects if provided
    if (Array.isArray(subjects) && subjects.length > 0) {
      subjects.forEach((sub: { name: string; code: string; color?: string; credits?: number }, idx: number) => {
        if (!sub.name) return;
        const subId = `sub_${Date.now()}_${idx}`;
        const colorPalette = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
        dbInstance.db.subjects.push({
          id: subId,
          semesterId,
          name: sub.name,
          code: sub.code || `SUB${idx + 1}`,
          color: sub.color || colorPalette[idx % colorPalette.length],
          credits: Number(sub.credits) || 3,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      });
    }
  }

  dbInstance.save();
  const { passwordHash: _, ...safeUser } = user;
  return res.json({ user: safeUser, success: true });
});
