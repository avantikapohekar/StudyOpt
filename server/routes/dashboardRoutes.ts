import { Router, Request, Response } from 'express';
import { dbInstance } from '../db.js';
import { authenticateUser } from '../auth.js';
import { calculateTopicProgressWeight } from './academicRoutes.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticateUser);

// Single-query consolidated dashboard summary
dashboardRouter.get('/dashboard/summary', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = dbInstance.db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  // 1. Timetable events for today
  const todayEvents = dbInstance.db.timetableEvents
    .filter(e => {
      if (e.userId !== userId) return false;
      const eventDate = e.startsAt.split('T')[0];
      return eventDate === todayDateStr;
    })
    .map(evt => {
      const subject = evt.subjectId ? dbInstance.db.subjects.find(s => s.id === evt.subjectId) : null;
      return {
        ...evt,
        subjectName: subject ? subject.name : null,
        subjectCode: subject ? subject.code : null,
        color: evt.color || (subject ? subject.color : '#10b981'),
      };
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // 2. Tasks
  const userTasks = dbInstance.db.tasks.filter(t => t.userId === userId);
  const tasksDueToday = userTasks.filter(t => {
    if (!t.dueAt) return false;
    return t.dueAt.split('T')[0] === todayDateStr && t.status !== 'COMPLETED';
  });

  const overdueTasks = userTasks.filter(t => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
  });

  // 3. Upcoming exams (next 30 days)
  const thirtyDaysLater = new Date(Date.now() + 30 * 86400000);
  const upcomingExams = dbInstance.db.exams
    .filter(e => e.userId === userId && new Date(e.startsAt) >= now && new Date(e.startsAt) <= thirtyDaysLater)
    .map(exam => {
      const subject = dbInstance.db.subjects.find(s => s.id === exam.subjectId);
      return {
        ...exam,
        subjectName: subject ? subject.name : 'Unknown Subject',
        subjectCode: subject ? subject.code : 'SUB',
        subjectColor: subject ? subject.color : '#10b981',
      };
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // 4. Upcoming assignments
  const userAssignments = dbInstance.db.assignments
    .map(asg => {
      const task = userTasks.find(t => t.id === asg.taskId);
      if (!task || task.status === 'COMPLETED') return null;
      const subject = task.subjectId ? dbInstance.db.subjects.find(s => s.id === task.subjectId) : null;
      return {
        ...asg,
        title: task.title,
        dueAt: task.dueAt,
        subjectName: subject ? subject.name : null,
        subjectCode: subject ? subject.code : null,
        subjectColor: subject ? subject.color : null,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null && a.dueAt !== null && new Date(a.dueAt!) >= now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 5);

  // 5. Syllabus progress by active subjects
  const userSemesters = dbInstance.db.semesters.filter(s => s.userId === userId);
  const activeSemester = userSemesters.find(s => s.isActive) || userSemesters[0];
  let activeSubjects = activeSemester
    ? dbInstance.db.subjects.filter(s => s.semesterId === activeSemester.id)
    : [];

  const subjectProgress = activeSubjects.map(sub => {
    const units = dbInstance.db.units.filter(u => u.subjectId === sub.id);
    const unitIds = units.map(u => u.id);
    const topics = dbInstance.db.topics.filter(t => unitIds.includes(t.unitId));
    const totalTopics = topics.length;

    let progressPercentage = 0;
    if (totalTopics > 0) {
      const sum = topics.reduce((acc, t) => acc + calculateTopicProgressWeight(t.status), 0);
      progressPercentage = Math.round((sum / totalTopics) * 100);
    }

    return {
      id: sub.id,
      name: sub.name,
      code: sub.code,
      color: sub.color,
      totalTopics,
      progressPercentage,
      masteredCount: topics.filter(t => t.status === 'MASTERED').length,
    };
  });

  // 6. Study time metrics (Today & This Week)
  const userSessions = dbInstance.db.studySessions.filter(s => s.userId === userId);
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
  startOfWeek.setHours(0, 0, 0, 0);

  const todaySessions = userSessions.filter(s => s.startedAt.split('T')[0] === todayDateStr);
  const todayStudyMinutes = Math.round(todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

  const thisWeekSessions = userSessions.filter(s => new Date(s.startedAt) >= startOfWeek);
  const thisWeekStudyMinutes = Math.round(thisWeekSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

  // 7. Habits checklist today
  const userHabits = dbInstance.db.habits.filter(h => h.userId === userId && !h.isArchived);
  const habitSummary = userHabits.map(h => {
    const isCompleted = dbInstance.db.habitLogs.some(l => l.habitId === h.id && l.logDate === todayDateStr);
    return {
      id: h.id,
      name: h.name,
      isCompleted,
    };
  });

  // 8. Recent notes
  const recentNotes = dbInstance.db.notes
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
    .map(n => {
      const subject = n.subjectId ? dbInstance.db.subjects.find(s => s.id === n.subjectId) : null;
      return {
        id: n.id,
        title: n.title,
        updatedAt: n.updatedAt,
        subjectName: subject ? subject.name : null,
        subjectCode: subject ? subject.code : null,
      };
    });

  return res.json({
    user: {
      name: user.name,
      college: user.college,
      targetDailyMinutes: user.targetDailyMinutes,
      activeSemesterName: activeSemester ? activeSemester.name : null,
    },
    todayDate: todayDateStr,
    todayEvents,
    tasksDueTodayCount: tasksDueToday.length,
    tasksDueToday,
    overdueTasksCount: overdueTasks.length,
    overdueTasks,
    upcomingExams,
    upcomingAssignments: userAssignments,
    subjectProgress,
    todayStudyMinutes,
    thisWeekStudyMinutes,
    targetDailyMinutes: user.targetDailyMinutes,
    habitSummary,
    recentNotes,
  });
});

// Analytics overview with date range
dashboardRouter.get('/analytics/overview', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const days = Number(req.query.days) || 14;

  const userSessions = dbInstance.db.studySessions.filter(s => s.userId === userId);
  const userTasks = dbInstance.db.tasks.filter(t => t.userId === userId);
  const userHabits = dbInstance.db.habits.filter(h => h.userId === userId && !h.isArchived);
  const userSemesters = dbInstance.db.semesters.filter(s => s.userId === userId);
  const activeSemester = userSemesters.find(s => s.isActive) || userSemesters[0];
  const userSubjects = activeSemester ? dbInstance.db.subjects.filter(s => s.semesterId === activeSemester.id) : [];

  // 1. Daily study minutes over the requested window
  const dailyStudyTime: { date: string; dayName: string; minutes: number }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const daySessions = userSessions.filter(s => s.startedAt.split('T')[0] === dateStr);
    const minutes = Math.round(daySessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

    dailyStudyTime.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      minutes,
    });
  }

  // 2. Study time by subject
  const subjectStudyMap: Record<string, { minutes: number; name: string; color: string }> = {};
  userSubjects.forEach(sub => {
    subjectStudyMap[sub.id] = { minutes: 0, name: sub.code, color: sub.color };
  });

  userSessions.forEach(s => {
    if (s.subjectId && subjectStudyMap[s.subjectId]) {
      subjectStudyMap[s.subjectId].minutes += Math.round(s.durationSeconds / 60);
    }
  });

  const studyTimeBySubject = Object.values(subjectStudyMap).filter(s => s.minutes > 0);

  // 3. Syllabus progress
  const syllabusProgress = userSubjects.map(sub => {
    const units = dbInstance.db.units.filter(u => u.subjectId === sub.id);
    const unitIds = units.map(u => u.id);
    const topics = dbInstance.db.topics.filter(t => unitIds.includes(t.unitId));
    const total = topics.length;
    let progress = 0;
    if (total > 0) {
      const sum = topics.reduce((acc, t) => acc + calculateTopicProgressWeight(t.status), 0);
      progress = Math.round((sum / total) * 100);
    }
    return {
      name: sub.code,
      subjectName: sub.name,
      color: sub.color,
      progress,
      totalTopics: total,
      masteredTopics: topics.filter(t => t.status === 'MASTERED').length,
    };
  });

  // 4. Task completion rate
  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
  const overdueTasksCount = userTasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'COMPLETED').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 5. Habit consistency rate
  const totalHabitOpportunities = userHabits.length * days;
  let totalHabitCompletions = 0;
  if (userHabits.length > 0) {
    const habitIds = userHabits.map(h => h.id);
    totalHabitCompletions = dbInstance.db.habitLogs.filter(l => habitIds.includes(l.habitId)).length;
  }
  const habitConsistency = totalHabitOpportunities > 0 ? Math.round((totalHabitCompletions / totalHabitOpportunities) * 100) : 0;

  // 6. Planned vs Actual study time (comparing estimatedMinutes of completed tasks vs recorded session duration)
  const totalEstimatedMinutes = userTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const totalActualMinutes = Math.round(userSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

  return res.json({
    dailyStudyTime,
    studyTimeBySubject,
    syllabusProgress,
    taskStats: {
      total: totalTasks,
      completed: completedTasks,
      overdue: overdueTasksCount,
      rate: taskCompletionRate,
    },
    habitConsistency,
    plannedVsActual: {
      plannedMinutes: totalEstimatedMinutes,
      actualMinutes: totalActualMinutes,
    },
    totalRecordedSessions: userSessions.length,
    averageSessionMinutes: userSessions.length > 0 ? Math.round(totalActualMinutes / userSessions.length) : 0,
  });
});

// CSV Helpers
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => escapeCsvCell(c.label)).join(',');
  const lines = rows.map(row => {
    return columns.map(c => escapeCsvCell(row[c.key])).join(',');
  });
  return '\uFEFF' + [header, ...lines].join('\r\n');
}

// User data export (JSON or CSV for notes, tasks, study sessions, and full backup)
dashboardRouter.get('/analytics/export', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = dbInstance.db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const format = ((req.query.format as string) || 'json').toLowerCase();
  const type = ((req.query.type as string) || 'all').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];
  const userSlug = user.name.replace(/\s+/g, '_').toLowerCase();

  // Load user data
  const userSemesters = dbInstance.db.semesters.filter(s => s.userId === userId);
  const semesterIds = userSemesters.map(s => s.id);
  const subjects = dbInstance.db.subjects.filter(s => semesterIds.includes(s.semesterId));
  const subjectIds = subjects.map(s => s.id);
  const units = dbInstance.db.units.filter(u => subjectIds.includes(u.subjectId));
  const unitIds = units.map(u => u.id);
  const topics = dbInstance.db.topics.filter(t => unitIds.includes(t.unitId));

  const tasks = dbInstance.db.tasks.filter(t => t.userId === userId);
  const taskIds = tasks.map(t => t.id);
  const allSubtasks = (dbInstance.db.subtasks || []).filter(st => taskIds.includes(st.taskId));
  const assignments = dbInstance.db.assignments.filter(a => taskIds.includes(a.taskId));

  const exams = dbInstance.db.exams.filter(e => e.userId === userId);
  const timetableEvents = dbInstance.db.timetableEvents.filter(te => te.userId === userId);
  const studySessions = dbInstance.db.studySessions.filter(ss => ss.userId === userId);
  const goals = dbInstance.db.goals.filter(g => g.userId === userId);
  const habits = dbInstance.db.habits.filter(h => h.userId === userId);
  const habitIds = habits.map(h => h.id);
  const habitLogs = dbInstance.db.habitLogs.filter(hl => habitIds.includes(hl.habitId));
  const notes = dbInstance.db.notes.filter(n => n.userId === userId);

  // 1. Export Tasks
  if (type === 'tasks') {
    const taskRows = tasks.map(t => {
      const sub = t.subjectId ? subjects.find(s => s.id === t.subjectId) : null;
      const subtasks = allSubtasks.filter(st => st.taskId === t.id);
      const asg = assignments.find(a => a.taskId === t.id);
      const completedSubtasks = subtasks.filter(st => st.status === 'COMPLETED').length;
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        subjectName: sub ? sub.name : '',
        subjectCode: sub ? sub.code : '',
        dueAt: t.dueAt || '',
        estimatedMinutes: t.estimatedMinutes,
        completedAt: t.completedAt || '',
        subtasksCount: subtasks.length,
        subtasksCompleted: completedSubtasks,
        subtasksSummary: subtasks.map(st => `[${st.status}] ${st.title}`).join('; '),
        isAssignment: asg ? 'Yes' : 'No',
        assignmentStatus: asg ? asg.submissionStatus : '',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    if (format === 'csv') {
      const csv = toCsv(taskRows, [
        { key: 'id', label: 'Task ID' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'subjectName', label: 'Subject Name' },
        { key: 'subjectCode', label: 'Subject Code' },
        { key: 'dueAt', label: 'Due Date' },
        { key: 'estimatedMinutes', label: 'Estimated Minutes' },
        { key: 'completedAt', label: 'Completed At' },
        { key: 'subtasksCount', label: 'Subtasks Count' },
        { key: 'subtasksCompleted', label: 'Subtasks Completed' },
        { key: 'subtasksSummary', label: 'Subtasks Details' },
        { key: 'isAssignment', label: 'Is Assignment' },
        { key: 'assignmentStatus', label: 'Assignment Status' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', label: 'Updated At' },
      ]);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=studyos_tasks_${userSlug}_${dateStr}.csv`);
      return res.send(csv);
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      dataset: 'tasks',
      count: taskRows.length,
      tasks: taskRows,
    });
  }

  // 2. Export Notes
  if (type === 'notes') {
    const noteRows = notes.map(n => {
      const sub = n.subjectId ? subjects.find(s => s.id === n.subjectId) : null;
      const topic = n.topicId ? topics.find(t => t.id === n.topicId) : null;
      let tagStr = '';
      try {
        const parsed = JSON.parse(n.tags);
        tagStr = Array.isArray(parsed) ? parsed.join(', ') : String(n.tags);
      } catch {
        tagStr = String(n.tags || '');
      }

      return {
        id: n.id,
        title: n.title,
        subjectName: sub ? sub.name : '',
        subjectCode: sub ? sub.code : '',
        topicTitle: topic ? topic.title : '',
        tags: tagStr,
        content: n.content || '',
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      };
    });

    if (format === 'csv') {
      const csv = toCsv(noteRows, [
        { key: 'id', label: 'Note ID' },
        { key: 'title', label: 'Title' },
        { key: 'subjectName', label: 'Subject Name' },
        { key: 'subjectCode', label: 'Subject Code' },
        { key: 'topicTitle', label: 'Topic Title' },
        { key: 'tags', label: 'Tags' },
        { key: 'content', label: 'Content' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'updatedAt', label: 'Updated At' },
      ]);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=studyos_notes_${userSlug}_${dateStr}.csv`);
      return res.send(csv);
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      dataset: 'notes',
      count: noteRows.length,
      notes: noteRows,
    });
  }

  // 3. Export Study Sessions
  if (type === 'sessions' || type === 'study_sessions') {
    const sessionRows = studySessions.map(s => {
      const sub = s.subjectId ? subjects.find(sb => sb.id === s.subjectId) : null;
      const topic = s.topicId ? topics.find(t => t.id === s.topicId) : null;
      const task = s.taskId ? tasks.find(t => t.id === s.taskId) : null;
      return {
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt || '',
        durationMinutes: Math.round(s.durationSeconds / 60),
        durationSeconds: s.durationSeconds,
        sessionType: s.sessionType || 'POMODORO',
        distractionsCount: s.distractionsCount ?? 0,
        subjectName: sub ? sub.name : '',
        subjectCode: sub ? sub.code : '',
        topicTitle: topic ? topic.title : '',
        taskTitle: task ? task.title : '',
        notes: s.notes || '',
        createdAt: s.createdAt,
      };
    });

    if (format === 'csv') {
      const csv = toCsv(sessionRows, [
        { key: 'id', label: 'Session ID' },
        { key: 'startedAt', label: 'Started At' },
        { key: 'endedAt', label: 'Ended At' },
        { key: 'durationMinutes', label: 'Duration (Minutes)' },
        { key: 'durationSeconds', label: 'Duration (Seconds)' },
        { key: 'sessionType', label: 'Session Type' },
        { key: 'distractionsCount', label: 'Distractions Count' },
        { key: 'subjectName', label: 'Subject Name' },
        { key: 'subjectCode', label: 'Subject Code' },
        { key: 'topicTitle', label: 'Topic Title' },
        { key: 'taskTitle', label: 'Task Title' },
        { key: 'notes', label: 'Notes' },
        { key: 'createdAt', label: 'Created At' },
      ]);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=studyos_study_sessions_${userSlug}_${dateStr}.csv`);
      return res.send(csv);
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      dataset: 'study_sessions',
      count: sessionRows.length,
      studySessions: sessionRows,
    });
  }

  // 4. Default: All Academic Data
  const { passwordHash: _, ...safeUser } = user;

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    user: safeUser,
    semesters: userSemesters,
    subjects,
    units,
    topics,
    tasks,
    subtasks: allSubtasks,
    assignments,
    exams,
    timetableEvents,
    studySessions,
    goals,
    habits,
    habitLogs,
    notes,
  };

  if (format === 'csv') {
    // Generate consolidated multi-entity academic summary CSV
    const consolidatedRows: Record<string, any>[] = [
      ...tasks.map(t => {
        const sub = t.subjectId ? subjects.find(s => s.id === t.subjectId) : null;
        return {
          recordType: 'TASK',
          id: t.id,
          title: t.title,
          subject: sub ? `${sub.code} - ${sub.name}` : '',
          statusOrType: t.status,
          dateOrDue: t.dueAt || '',
          metricOrNotes: `${t.estimatedMinutes} mins`,
          details: t.description || '',
          createdAt: t.createdAt,
        };
      }),
      ...notes.map(n => {
        const sub = n.subjectId ? subjects.find(s => s.id === n.subjectId) : null;
        let tagStr = '';
        try {
          const parsed = JSON.parse(n.tags);
          tagStr = Array.isArray(parsed) ? parsed.join(', ') : String(n.tags);
        } catch {
          tagStr = String(n.tags || '');
        }
        return {
          recordType: 'NOTE',
          id: n.id,
          title: n.title,
          subject: sub ? `${sub.code} - ${sub.name}` : '',
          statusOrType: 'MARKDOWN',
          dateOrDue: n.updatedAt,
          metricOrNotes: tagStr,
          details: n.content ? (n.content.length > 100 ? n.content.substring(0, 100) + '...' : n.content) : '',
          createdAt: n.createdAt,
        };
      }),
      ...studySessions.map(s => {
        const sub = s.subjectId ? subjects.find(sb => sb.id === s.subjectId) : null;
        return {
          recordType: 'STUDY_SESSION',
          id: s.id,
          title: `Study Session (${s.sessionType || 'POMODORO'})`,
          subject: sub ? `${sub.code} - ${sub.name}` : '',
          statusOrType: s.sessionType || 'POMODORO',
          dateOrDue: s.startedAt,
          metricOrNotes: `${Math.round(s.durationSeconds / 60)} mins (Distractions: ${s.distractionsCount ?? 0})`,
          details: s.notes || '',
          createdAt: s.createdAt,
        };
      }),
    ];

    const csv = toCsv(consolidatedRows, [
      { key: 'recordType', label: 'Record Type' },
      { key: 'id', label: 'Record ID' },
      { key: 'title', label: 'Title / Activity' },
      { key: 'subject', label: 'Subject' },
      { key: 'statusOrType', label: 'Status / Type' },
      { key: 'dateOrDue', label: 'Date / Due Date' },
      { key: 'metricOrNotes', label: 'Metric / Duration / Tags' },
      { key: 'details', label: 'Details / Preview' },
      { key: 'createdAt', label: 'Created At' },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=studyos_academic_data_${userSlug}_${dateStr}.csv`);
    return res.send(csv);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=studyos_export_${userSlug}_${dateStr}.json`);
  return res.json(exportPayload);
});
