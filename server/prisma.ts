import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Create Prisma Client singleton
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseHealthStatus {
  connected: boolean;
  engine: string;
  database: string;
  host: string;
  version?: string;
  latencyMs?: number;
  tableCounts?: Record<string, number>;
  message: string;
  error?: string;
}

/**
 * Validates actual database connectivity using Prisma $queryRaw.
 * Credentials and passwords are never exposed.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const start = Date.now();
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Extract host and db name safely without exposing user/pass
  let safeHost = 'localhost:3306';
  let safeDb = 'studyos_db';
  try {
    if (dbUrl) {
      const parsed = new URL(dbUrl);
      safeHost = `${parsed.hostname}:${parsed.port || '3306'}`;
      safeDb = parsed.pathname.replace(/^\//, '') || 'studyos_db';
    }
  } catch {
    // fallback
  }

  try {
    // Execute real connectivity verification query on MySQL
    const result = await prisma.$queryRaw<
      Array<{ healthy: number; version?: string; db?: string }>
    >`SELECT 1 AS healthy, VERSION() AS version, DATABASE() AS db`;

    const latency = Date.now() - start;
    const row = result && result[0];

    // Count rows across primary tables to confirm data visibility in MySQL Workbench
    const counts: Record<string, number> = {};
    try {
      const [
        usersCount,
        semestersCount,
        subjectsCount,
        tasksCount,
        notesCount,
        examsCount,
        habitsCount,
        resourcesCount,
        decksCount,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.semester.count(),
        prisma.subject.count(),
        prisma.task.count(),
        prisma.note.count(),
        prisma.exam.count(),
        prisma.habit.count(),
        prisma.resource.count(),
        prisma.flashcardDeck.count(),
      ]);

      counts.users = usersCount;
      counts.semesters = semestersCount;
      counts.subjects = subjectsCount;
      counts.tasks = tasksCount;
      counts.notes = notesCount;
      counts.exams = examsCount;
      counts.habits = habitsCount;
      counts.resources = resourcesCount;
      counts.flashcardDecks = decksCount;
    } catch {
      // Table count is optional
    }

    return {
      connected: true,
      engine: 'MySQL 8.x (Prisma ORM)',
      database: row?.db || safeDb,
      host: safeHost,
      version: row?.version || '8.x',
      latencyMs: latency,
      tableCounts: counts,
      message: 'Successfully connected to MySQL database studyos_db',
    };
  } catch (err: any) {
    return {
      connected: false,
      engine: 'MySQL 8.x (Prisma ORM)',
      database: safeDb,
      host: safeHost,
      message: 'Database connection offline or unreachable. Verify MySQL service is running on localhost:3306 and DATABASE_URL is configured in .env',
      error: err.code || err.message?.split('\n')[0] || 'Connection refused',
    };
  }
}
