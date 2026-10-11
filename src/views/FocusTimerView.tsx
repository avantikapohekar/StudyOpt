import React, { useState, useEffect, useRef } from 'react';
import {
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Trash2,
  Flame,
} from 'lucide-react';
import { api } from '../lib/api';
import { StudySession, Subject, Topic, SessionType } from '../types';

export const FocusTimerView: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer settings
  const [mode, setMode] = useState<SessionType>('POMODORO');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [distractions, setDistractions] = useState(0);

  // Timer running state (persisted in localStorage using timestamps so refresh never corrupts)
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Pomodoro config (in seconds)
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 mins
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 mins
  const [isBreak, setIsBreak] = useState(false);

  const timerIntervalRef = useRef<number | null>(null);

  // Load initial subjects & session history
  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, subsRes] = await Promise.all([
        api.focus.getSessions(15),
        api.academics.getSubjects(),
      ]);
      setSessions(sessionsRes.sessions);
      setSubjects(subsRes.subjects);
      if (subsRes.subjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subsRes.subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load focus sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check localStorage for active timer restoration across refresh
    const savedTimer = localStorage.getItem('studyos_focus_timer');
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        const now = Date.now();
        const startTimestamp = parsed.startTimestamp;
        const accumulated = parsed.accumulated || 0;
        const active = parsed.isRunning;

        setActiveSessionId(parsed.sessionId || null);
        setSelectedSubjectId(parsed.subjectId || '');
        setSelectedTopicId(parsed.topicId || '');
        setDistractions(parsed.distractions || 0);
        setMode(parsed.mode || 'POMODORO');

        if (active && startTimestamp) {
          const delta = Math.floor((now - startTimestamp) / 1000);
          setElapsedSeconds(accumulated + delta);
          setIsRunning(true);
        } else {
          setElapsedSeconds(accumulated);
          setIsRunning(false);
        }
      } catch (e) {
        localStorage.removeItem('studyos_focus_timer');
      }
    }
  }, []);

  // When subject changes, fetch topics
  useEffect(() => {
    if (selectedSubjectId) {
      api.academics.getSyllabus(selectedSubjectId).then(res => {
        const allTopics = res.units.flatMap(u => u.topics);
        setTopics(allTopics);
        if (allTopics.length > 0) {
          setSelectedTopicId(allTopics[0].id);
        }
      });
    }
  }, [selectedSubjectId]);

  // Main tick effect
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  // Save active timer status to localStorage whenever state changes
  useEffect(() => {
    if (isRunning || elapsedSeconds > 0) {
      localStorage.setItem(
        'studyos_focus_timer',
        JSON.stringify({
          sessionId: activeSessionId,
          subjectId: selectedSubjectId,
          topicId: selectedTopicId,
          mode,
          isRunning,
          distractions,
          accumulated: elapsedSeconds,
          startTimestamp: isRunning ? Date.now() : null,
        })
      );
    } else {
      localStorage.removeItem('studyos_focus_timer');
    }
  }, [isRunning, elapsedSeconds, activeSessionId, selectedSubjectId, selectedTopicId, mode, distractions]);

  const handleStart = async () => {
    if (!activeSessionId) {
      try {
        const res = await api.focus.startSession({
          subjectId: selectedSubjectId || null,
          topicId: selectedTopicId || null,
          sessionType: mode,
          startedAt: new Date().toISOString(),
        });
        setActiveSessionId(res.session.id);
      } catch (err) {
        console.error('Failed to create server session record:', err);
      }
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    if (window.confirm('Reset the current timer without saving?')) {
      setIsRunning(false);
      setElapsedSeconds(0);
      setActiveSessionId(null);
      setDistractions(0);
      localStorage.removeItem('studyos_focus_timer');
    }
  };

  const handleFinish = async () => {
    if (elapsedSeconds < 10) {
      alert('Session duration is under 10 seconds. Focus for longer before logging.');
      return;
    }

    try {
      if (activeSessionId) {
        await api.focus.finishSession(activeSessionId, {
          durationSeconds: elapsedSeconds,
          endedAt: new Date().toISOString(),
          notes: notes.trim() || undefined,
          distractionsCount: distractions,
        });
      } else {
        const res = await api.focus.startSession({
          subjectId: selectedSubjectId || null,
          topicId: selectedTopicId || null,
          sessionType: mode,
          startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
          durationSeconds: elapsedSeconds,
          endedAt: new Date().toISOString(),
          notes: notes.trim() || null,
          distractionsCount: distractions,
        });
      }

      setIsRunning(false);
      setElapsedSeconds(0);
      setActiveSessionId(null);
      setNotes('');
      setDistractions(0);
      localStorage.removeItem('studyos_focus_timer');
      loadData();
    } catch (err) {
      console.error('Failed to finish study session:', err);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm('Delete this past focus session?')) return;
    try {
      await api.focus.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Remaining for Pomodoro
  const pomodoroRemaining = Math.max(0, (isBreak ? breakDuration : workDuration) - elapsedSeconds);
  const displayTimer = mode === 'POMODORO' ? formatTime(pomodoroRemaining) : formatTime(elapsedSeconds);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TimerIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Focus Study Timer
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Deep work Pomodoro and stopwatch tracker with distraction counting and session persistence.
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-xs">
          <button
            onClick={() => {
              if (elapsedSeconds > 0 && !window.confirm('Switch mode and reset current timer?')) return;
              setMode('POMODORO');
              setElapsedSeconds(0);
              setIsRunning(false);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === 'POMODORO'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Pomodoro (25/5)
          </button>
          <button
            onClick={() => {
              if (elapsedSeconds > 0 && !window.confirm('Switch mode and reset current timer?')) return;
              setMode('STOPWATCH');
              setElapsedSeconds(0);
              setIsRunning(false);
            }}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              mode === 'STOPWATCH'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Stopwatch
          </button>
        </div>
      </div>

      {/* 2. Main Focus Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Timer Display Card */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-xs flex flex-col items-center justify-center text-center">
          {/* Active Course & Topic tag */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {subjects.find(s => s.id === selectedSubjectId)?.code || 'General Study'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-xs">
              {topics.find(t => t.id === selectedTopicId)?.title || 'Unlinked Topic'}
            </span>
          </div>

          {/* Large Digital Display */}
          <div className="my-4">
            <span className="font-mono text-7xl md:text-8xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {displayTimer}
            </span>
            {mode === 'POMODORO' && (
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                {isBreak ? 'Rest Break' : 'Focus Work Interval'}
              </p>
            )}
          </div>

          {/* Primary Controls */}
          <div className="flex items-center gap-3 my-6">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:scale-98 transition-all shadow-md"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{elapsedSeconds > 0 ? 'Resume Focus' : 'Start Focus'}</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white hover:bg-amber-700 active:scale-98 transition-all shadow-md"
              >
                <Pause className="h-4 w-4 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleFinish}
              disabled={elapsedSeconds < 5}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Complete & Log</span>
            </button>

            <button
              onClick={handleReset}
              disabled={elapsedSeconds === 0}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-40"
              title="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Distraction Counter Button (+1) */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 w-full max-w-sm flex items-center justify-between text-xs">
            <span className="text-neutral-500">Distractions Logged:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                {distractions}
              </span>
              <button
                onClick={() => setDistractions(d => d + 1)}
                className="px-2 py-0.5 text-[11px] font-semibold rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
              >
                +1 Distraction
              </button>
            </div>
          </div>
        </div>

        {/* Right 1-Col: Session Context Configuration */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Session Configuration
          </h3>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Course / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={isRunning}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 disabled:opacity-60"
            >
              <option value="">General Study (No Course)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Syllabus Topic Association
            </label>
            <select
              value={selectedTopicId}
              onChange={e => setSelectedTopicId(e.target.value)}
              disabled={isRunning || topics.length === 0}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 disabled:opacity-60"
            >
              <option value="">General / None</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Session Takeaways & Notes
            </label>
            <textarea
              rows={3}
              placeholder="What problems were solved? Invariants clarified?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="pt-2 text-[11px] text-neutral-400 space-y-1">
            <p>✓ Refresh resilient: Elapsed seconds are saved with timestamps.</p>
            <p>✓ Prevents duplicate completion records automatically.</p>
          </div>
        </div>
      </div>

      {/* 3. Historical Study Sessions Table */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Recorded Study Sessions History
          </h3>
          <span className="text-xs text-neutral-400">
            {sessions.length} total sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Topic / Task</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Distractions</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {sessions.map(s => {
                const durationMins = Math.round(s.durationSeconds / 60);
                return (
                  <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td className="py-3 px-4 tabular-nums text-neutral-500">
                      {new Date(s.startedAt).toLocaleDateString()} ·{' '}
                      {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.subjectCode || 'General'}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 truncate max-w-xs">
                      {s.topicTitle || s.taskTitle || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {durationMins} mins
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {s.sessionType}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {s.distractionsCount}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 truncate max-w-xs">
                      {s.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteHistory(s.id)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
