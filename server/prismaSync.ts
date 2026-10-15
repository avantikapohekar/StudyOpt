import { prisma } from './prisma.js';
import { StudyOSDatabaseSchema } from './db.js';

let isMySQLConnected = false;

export function getMySQLConnectionStatus(): boolean {
  return isMySQLConnected;
}

export function setMySQLConnectionStatus(status: boolean) {
  isMySQLConnected = status;
}

/**
 * Initializes MySQL connection and synchronizes data.
 * If MySQL is reachable, loads existing rows from MySQL.
 * If MySQL tables are empty, seeds data into MySQL using Prisma.
 */
export async function initializePrismaSync(dbSchema: StudyOSDatabaseSchema): Promise<boolean> {
  try {
    // 1. Check MySQL connection
    await prisma.$queryRaw`SELECT 1 AS ping`;
    isMySQLConnected = true;
    console.log('✅ Real MySQL 8.x database connection established via Prisma.');

    // 2. Check if users table already has records in MySQL
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`📦 Found ${userCount} existing users in MySQL studyos_db. Loading data from MySQL into runtime...`);
      await loadFromMySQL(dbSchema);
    } else {
      console.log('🌱 MySQL database studyos_db is empty. Seeding initial records into MySQL via Prisma...');
      await seedMySQLFromSchema(dbSchema);
    }

    return true;
  } catch (err: any) {
    isMySQLConnected = false;
    console.warn('⚠️ MySQL database currently unreachable (' + (err.code || err.message?.split('\n')[0]) + '). Operating in resilient fallback mode.');
    return false;
  }
}

/**
 * Loads all data from MySQL into the database schema
 */
async function loadFromMySQL(db: StudyOSDatabaseSchema) {
  try {
    const [
      users,
      semesters,
      subjects,
      units,
      topics,
      tasks,
      assignments,
      subtasks,
      exams,
      timetableEvents,
      studySessions,
      goals,
      habits,
      habitLogs,
      notes,
      collections,
      resources,
      flashcardDecks,
      flashcards,
      flashcardReviewLogs,
      googleDriveConnections,
      resourceLinks,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.semester.findMany(),
      prisma.subject.findMany(),
      prisma.unit.findMany(),
      prisma.topic.findMany(),
      prisma.task.findMany(),
      prisma.assignment.findMany(),
      prisma.subtask.findMany(),
      prisma.exam.findMany(),
      prisma.timetableEvent.findMany(),
      prisma.studySession.findMany(),
      prisma.goal.findMany(),
      prisma.habit.findMany(),
      prisma.habitLog.findMany(),
      prisma.note.findMany(),
      prisma.collection.findMany(),
      prisma.resource.findMany(),
      prisma.flashcardDeck.findMany(),
      prisma.flashcard.findMany(),
      prisma.flashcardReviewLog.findMany(),
      prisma.googleDriveConnection.findMany(),
      prisma.resourceLink.findMany(),
    ]);

    db.users = users.map(u => ({
      ...u,
      college: u.college || '',
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    db.semesters = semesters.map(s => ({
      ...s,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    db.subjects = subjects.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    db.units = units.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    db.topics = topics.map(t => ({
      ...t,
      description: t.description || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    db.tasks = tasks.map(t => ({
      ...t,
      description: t.description || undefined,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      referenceUrl: t.referenceUrl || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    db.assignments = assignments.map(a => ({
      ...a,
      submissionMethod: a.submissionMethod || undefined,
      submissionUrl: a.submissionUrl || undefined,
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : undefined,
      grade: a.grade || undefined,
      feedback: a.feedback || undefined,
      instructions: a.instructions || undefined,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    db.subtasks = subtasks.map(s => ({
      ...s,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    db.exams = exams.map(e => ({
      ...e,
      location: e.location || undefined,
      targetScore: e.targetScore || undefined,
      achievedScore: e.achievedScore || undefined,
      pastPapersUrl: e.pastPapersUrl || undefined,
      reflectionNotes: e.reflectionNotes || undefined,
      startsAt: e.startsAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    db.timetableEvents = timetableEvents.map(te => ({
      ...te,
      recurrenceRule: te.recurrenceRule || undefined,
      location: te.location || undefined,
      color: te.color || undefined,
      startsAt: te.startsAt.toISOString(),
      endsAt: te.endsAt.toISOString(),
      createdAt: te.createdAt.toISOString(),
      updatedAt: te.updatedAt.toISOString(),
    }));

    db.studySessions = studySessions.map(ss => ({
      ...ss,
      notes: ss.notes || undefined,
      startedAt: ss.startedAt.toISOString(),
      endedAt: ss.endedAt ? ss.endedAt.toISOString() : undefined,
      createdAt: ss.createdAt.toISOString(),
      updatedAt: ss.updatedAt.toISOString(),
    }));

    db.goals = goals.map(g => ({
      ...g,
      description: g.description || undefined,
      startDate: g.startDate.toISOString(),
      endDate: g.endDate.toISOString(),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    db.habits = habits.map(h => ({
      ...h,
      description: h.description || undefined,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }));

    db.habitLogs = habitLogs.map(hl => ({
      ...hl,
      completedAt: hl.completedAt.toISOString(),
      createdAt: hl.createdAt.toISOString(),
      updatedAt: hl.updatedAt.toISOString(),
    }));

    db.notes = notes.map(n => ({
      ...n,
      tags: n.tags || '[]',
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    db.collections = collections.map(c => ({
      ...c,
      description: c.description || undefined,
      color: c.color || undefined,
      icon: c.icon || undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    db.resources = resources.map(r => ({
      ...r,
      description: r.description || undefined,
      url: r.url || null,
      storageKey: r.storageKey || null,
      originalFilename: r.originalFilename || null,
      mimeType: r.mimeType || null,
      fileSize: r.fileSize || 0,
      thumbnailUrl: r.thumbnailUrl || null,
      tags: r.tags || '[]',
      metadata: r.metadata || undefined,
      lastAccessedAt: r.lastAccessedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    db.flashcardDecks = flashcardDecks.map(fd => ({
      ...fd,
      description: fd.description || undefined,
      tags: fd.tags || '[]',
      createdAt: fd.createdAt.toISOString(),
      updatedAt: fd.updatedAt.toISOString(),
    }));

    db.flashcards = flashcards.map(fc => ({
      ...fc,
      dueDate: fc.dueDate.toISOString().split('T')[0],
      lastReviewedAt: fc.lastReviewedAt ? fc.lastReviewedAt.toISOString() : null,
      createdAt: fc.createdAt.toISOString(),
      updatedAt: fc.updatedAt.toISOString(),
    }));

    db.flashcardReviewLogs = flashcardReviewLogs.map(rl => ({
      ...rl,
      reviewedAt: rl.reviewedAt.toISOString(),
    }));

    db.googleDriveConnections = googleDriveConnections.map(c => ({
      ...c,
      connectionStatus: (c.connectionStatus as 'CONNECTED' | 'DISCONNECTED') || 'CONNECTED',
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    db.resourceLinks = resourceLinks.map(rl => ({
      ...rl,
      provider: 'GOOGLE_DRIVE',
      tags: rl.tags || '[]',
      description: rl.description || undefined,
      createdAt: rl.createdAt.toISOString(),
      updatedAt: rl.updatedAt.toISOString(),
    }));

    console.log('✅ StudyOS runtime successfully populated from MySQL 8.x.');
  } catch (err) {
    console.error('Error reading from MySQL tables:', err);
  }
}

/**
 * Seeds initial schema into MySQL using Prisma
 */
async function seedMySQLFromSchema(db: StudyOSDatabaseSchema) {
  try {
    for (const u of db.users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash: u.passwordHash,
          college: u.college || null,
          targetDailyMinutes: u.targetDailyMinutes,
          theme: u.theme,
          timezone: u.timezone,
          onboardingCompleted: u.onboardingCompleted,
        },
      });
    }

    for (const s of db.semesters) {
      await prisma.semester.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          userId: s.userId,
          name: s.name,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          isActive: s.isActive,
        },
      });
    }

    for (const sub of db.subjects) {
      await prisma.subject.upsert({
        where: { id: sub.id },
        update: {},
        create: {
          id: sub.id,
          semesterId: sub.semesterId,
          name: sub.name,
          code: sub.code,
          color: sub.color,
          credits: sub.credits,
        },
      });
    }

    for (const unit of db.units) {
      await prisma.unit.upsert({
        where: { id: unit.id },
        update: {},
        create: {
          id: unit.id,
          subjectId: unit.subjectId,
          name: unit.name,
          position: unit.position,
        },
      });
    }

    for (const t of db.topics) {
      await prisma.topic.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          unitId: t.unitId,
          parentTopicId: t.parentTopicId || null,
          title: t.title,
          description: t.description || null,
          status: t.status,
          difficulty: t.difficulty,
          estimatedMinutes: t.estimatedMinutes,
          position: t.position,
        },
      });
    }

    for (const task of db.tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: {},
        create: {
          id: task.id,
          userId: task.userId,
          subjectId: task.subjectId || null,
          title: task.title,
          description: task.description || null,
          status: task.status,
          priority: task.priority,
          dueAt: task.dueAt ? new Date(task.dueAt) : null,
          estimatedMinutes: task.estimatedMinutes,
          completedAt: task.completedAt ? new Date(task.completedAt) : null,
          referenceUrl: task.referenceUrl || null,
        },
      });
    }

    for (const n of db.notes) {
      await prisma.note.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          userId: n.userId,
          subjectId: n.subjectId || null,
          topicId: n.topicId || null,
          title: n.title,
          content: n.content,
          tags: n.tags || '[]',
        },
      });
    }

    for (const e of db.exams) {
      await prisma.exam.upsert({
        where: { id: e.id },
        update: {},
        create: {
          id: e.id,
          userId: e.userId,
          subjectId: e.subjectId,
          title: e.title,
          startsAt: new Date(e.startsAt),
          location: e.location || null,
          examType: e.examType,
          targetScore: e.targetScore || null,
          achievedScore: e.achievedScore || null,
          confidenceLevel: e.confidenceLevel,
          pastPapersUrl: e.pastPapersUrl || null,
          reflectionNotes: e.reflectionNotes || null,
        },
      });
    }

    for (const h of db.habits) {
      await prisma.habit.upsert({
        where: { id: h.id },
        update: {},
        create: {
          id: h.id,
          userId: h.userId,
          name: h.name,
          description: h.description || null,
          frequencyConfig: h.frequencyConfig,
          isArchived: h.isArchived,
          targetPerDay: h.targetPerDay,
        },
      });
    }

    for (const c of db.collections) {
      await prisma.collection.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          userId: c.userId,
          name: c.name,
          description: c.description || null,
          color: c.color || null,
          icon: c.icon || null,
          subjectId: c.subjectId || null,
        },
      });
    }

    for (const r of db.resources) {
      await prisma.resource.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          userId: r.userId,
          subjectId: r.subjectId || null,
          topicId: r.topicId || null,
          collectionId: r.collectionId || null,
          type: r.type,
          source: r.source,
          title: r.title,
          description: r.description || null,
          url: r.url || null,
          storageKey: r.storageKey || null,
          originalFilename: r.originalFilename || null,
          mimeType: r.mimeType || null,
          fileSize: r.fileSize || 0,
          thumbnailUrl: r.thumbnailUrl || null,
          tags: r.tags || '[]',
          metadata: r.metadata || null,
          isPinned: r.isPinned,
          isFavorite: r.isFavorite,
        },
      });
    }

    for (const fd of db.flashcardDecks) {
      await prisma.flashcardDeck.upsert({
        where: { id: fd.id },
        update: {},
        create: {
          id: fd.id,
          userId: fd.userId,
          subjectId: fd.subjectId || null,
          topicId: fd.topicId || null,
          name: fd.name,
          description: fd.description || null,
          tags: fd.tags || '[]',
          cardCount: fd.cardCount,
        },
      });
    }

    for (const fc of db.flashcards) {
      await prisma.flashcard.upsert({
        where: { id: fc.id },
        update: {},
        create: {
          id: fc.id,
          deckId: fc.deckId,
          userId: fc.userId,
          front: fc.front,
          back: fc.back,
          format: fc.format,
          interval: fc.interval,
          repetitions: fc.repetitions,
          easeFactor: fc.easeFactor,
          dueDate: new Date(fc.dueDate),
          lastReviewedAt: fc.lastReviewedAt ? new Date(fc.lastReviewedAt) : null,
          state: fc.state,
        },
      });
    }

    console.log('✅ Initial StudyOS dataset successfully seeded into MySQL 8.x.');
  } catch (err) {
    console.error('Error seeding data into MySQL tables via Prisma:', err);
  }
}

/**
 * Persists an entity mutation to MySQL using Prisma in the background
 */
export async function persistToMySQL(action: 'upsert' | 'delete', modelName: string, data: any) {
  if (!isMySQLConnected) return;

  try {
    const delegate = (prisma as any)[modelName];
    if (!delegate) return;

    if (action === 'delete') {
      await delegate.delete({ where: { id: data.id } }).catch(() => {});
    } else {
      // Upsert entity
      const id = data.id;
      if (!id) return;

      const formatted = formatDataForPrisma(modelName, data);
      await delegate.upsert({
        where: { id },
        update: formatted,
        create: formatted,
      });
    }
  } catch (err: any) {
    console.warn(`Prisma background sync warning for ${modelName} (${action}):`, err.message);
  }
}

function formatDataForPrisma(modelName: string, data: any) {
  const clone = { ...data };

  // Convert ISO string dates to Date objects for Prisma
  if (clone.startDate) clone.startDate = new Date(clone.startDate);
  if (clone.endDate) clone.endDate = new Date(clone.endDate);
  if (clone.dueAt) clone.dueAt = new Date(clone.dueAt);
  if (clone.completedAt) clone.completedAt = new Date(clone.completedAt);
  if (clone.startsAt) clone.startsAt = new Date(clone.startsAt);
  if (clone.endsAt) clone.endsAt = new Date(clone.endsAt);
  if (clone.startedAt) clone.startedAt = new Date(clone.startedAt);
  if (clone.endedAt) clone.endedAt = new Date(clone.endedAt);
  if (clone.submittedAt) clone.submittedAt = new Date(clone.submittedAt);
  if (clone.dueDate) clone.dueDate = new Date(clone.dueDate);
  if (clone.lastReviewedAt) clone.lastReviewedAt = new Date(clone.lastReviewedAt);
  if (clone.reviewedAt) clone.reviewedAt = new Date(clone.reviewedAt);
  if (clone.lastAccessedAt) clone.lastAccessedAt = new Date(clone.lastAccessedAt);
  if (clone.createdAt) clone.createdAt = new Date(clone.createdAt);
  if (clone.updatedAt) clone.updatedAt = new Date(clone.updatedAt);

  // Remove virtual fields not in Prisma schema
  delete clone.tagList;
  delete clone.metadataObj;
  delete clone.units;
  delete clone.topics;
  delete clone.subtasks;
  delete clone.assignment;
  delete clone.dueCount;
  delete clone.newCount;
  delete clone.learningCount;
  delete clone.reviewCount;
  delete clone.subjectName;
  delete clone.subjectCode;
  delete clone.subjectColor;
  delete clone.topicTitle;
  delete clone.collectionName;
  delete clone.collectionColor;
  delete clone.isFolder;

  return clone;
}
