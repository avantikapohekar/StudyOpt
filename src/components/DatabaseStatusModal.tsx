import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Server,
  Layers,
  Activity,
  Terminal,
} from 'lucide-react';
import { api } from '../lib/api';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    engine: string;
    database: string;
    host: string;
    version?: string;
    latencyMs?: number;
    tableCounts?: Record<string, number>;
    message: string;
    error?: string;
  } | null>(null);

  const checkDb = async () => {
    setLoading(true);
    try {
      const res = await api.system.getDatabaseHealth();
      setStatus(res);
    } catch (err: any) {
      setStatus({
        connected: false,
        engine: 'MySQL 8.x (Prisma ORM)',
        database: 'studyos_db',
        host: 'localhost:3306',
        message: 'Database check failed or server unreachable',
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkDb();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sampleWorkbenchSql = `-- Check all table row counts in studyos_db:
USE studyos_db;

SELECT 'users' AS \`table\`, COUNT(*) AS \`rows\` FROM users
UNION ALL SELECT 'semesters', COUNT(*) FROM semesters
UNION ALL SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'assignments', COUNT(*) FROM assignments
UNION ALL SELECT 'notes', COUNT(*) FROM notes
UNION ALL SELECT 'exams', COUNT(*) FROM exams
UNION ALL SELECT 'habits', COUNT(*) FROM habits
UNION ALL SELECT 'resources', COUNT(*) FROM resources
UNION ALL SELECT 'flashcards', COUNT(*) FROM flashcards;`;

  const copySql = () => {
    navigator.clipboard.writeText(sampleWorkbenchSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>MySQL 8.x Database Engine</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Prisma ORM
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Live verification for Professor Demonstration in MySQL Workbench
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Status banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              status?.connected
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 text-amber-900 dark:text-amber-200'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1 text-xs space-y-1">
              <p className="font-bold">
                {status?.connected ? 'MySQL 8.x Database Connected' : 'MySQL Database Status'}
              </p>
              <p className="opacity-90 leading-relaxed">{status?.message}</p>
              {status?.error && (
                <p className="font-mono text-[11px] opacity-80 pt-1">Details: {status.error}</p>
              )}
            </div>
            <button
              onClick={checkDb}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-current shrink-0"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Connection Details Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1">
                <Server className="w-3.5 h-3.5" /> Database Target
              </span>
              <p className="font-bold text-neutral-900 dark:text-neutral-100">
                {status?.database || 'studyos_db'}
              </p>
              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                {status?.host || 'localhost:3306'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5" /> ORM & Latency
              </span>
              <p className="font-bold text-neutral-900 dark:text-neutral-100">
                Prisma Client v5.22.0
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {status?.latencyMs ? `${status.latencyMs} ms response` : 'Real-time sync'}
              </p>
            </div>
          </div>

          {/* Table Counts if available */}
          {status?.tableCounts && Object.keys(status.tableCounts).length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Live MySQL Table Row Counts
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(status.tableCounts).map(([tableName, count]) => (
                  <div
                    key={tableName}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between"
                  >
                    <span className="text-neutral-600 dark:text-neutral-400 capitalize text-[11px]">
                      {tableName}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MySQL Workbench Test Helper */}
          <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                MySQL Workbench Demonstration Query
              </span>
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Query'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-200 text-[11px] font-mono overflow-x-auto leading-relaxed border border-neutral-800">
              {sampleWorkbenchSql}
            </pre>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Paste into MySQL Workbench to verify that newly created tasks, syllabus topics, notes, and exams appear immediately as persisted rows.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
