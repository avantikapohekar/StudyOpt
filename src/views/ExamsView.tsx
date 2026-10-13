import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Star,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { Exam, Subject } from '../types';

export const ExamsView: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [targetScore, setTargetScore] = useState<number>(90);
  const [achievedScore, setAchievedScore] = useState<number | undefined>(undefined);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [pastPapersUrl, setPastPapersUrl] = useState('');
  const [reflectionNotes, setReflectionNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsRes, subsRes] = await Promise.all([
        api.exams.getExams(),
        api.academics.getSubjects(),
      ]);
      setExams(examsRes.exams);
      setSubjects(subsRes.subjects);
      if (subsRes.subjects.length > 0 && !subjectId) {
        setSubjectId(subsRes.subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setTitle('');
    setLocation('');
    setExamType('Midterm');
    setTargetScore(90);
    setConfidenceLevel(3);
    setPastPapersUrl('');
    setReflectionNotes('');
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(14, 0, 0, 0);
    setStartsAt(d.toISOString().slice(0, 16));
    if (subjects.length > 0) {
      setSubjectId(subjects[0].id);
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setSelectedExam(exam);
    setTitle(exam.title);
    setSubjectId(exam.subjectId);
    setStartsAt(new Date(exam.startsAt).toISOString().slice(0, 16));
    setLocation(exam.location || '');
    setExamType(exam.examType);
    setTargetScore(exam.targetScore || 90);
    setAchievedScore(exam.achievedScore ?? undefined);
    setConfidenceLevel(exam.confidenceLevel || 3);
    setPastPapersUrl(exam.pastPapersUrl || '');
    setReflectionNotes(exam.reflectionNotes || '');
    setIsEditModalOpen(true);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId || !startsAt) return;

    try {
      await api.exams.createExam({
        title: title.trim(),
        subjectId,
        startsAt: new Date(startsAt).toISOString(),
        location: location ? location.trim() : null,
        examType,
        targetScore,
        confidenceLevel,
        pastPapersUrl: pastPapersUrl || null,
        reflectionNotes: reflectionNotes || null,
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to create exam:', err);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    try {
      await api.exams.updateExam(selectedExam.id, {
        title: title.trim(),
        subjectId,
        startsAt: new Date(startsAt).toISOString(),
        location: location ? location.trim() : null,
        examType,
        targetScore,
        achievedScore: achievedScore !== undefined ? Number(achievedScore) : null,
        confidenceLevel,
        pastPapersUrl: pastPapersUrl || null,
        reflectionNotes: reflectionNotes || null,
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to update exam:', err);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm('Delete this examination entry?')) return;
    try {
      await api.exams.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete exam:', err);
    }
  };

  // Dynamic countdown calculation helper
  const getCountdownParts = (startsAtStr: string) => {
    const diff = new Date(startsAtStr).getTime() - new Date().getTime();
    if (diff <= 0) return { days: 0, hours: 0, isPast: true };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return { days, hours, isPast: false };
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Exam Center & Readiness Tracker
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Dynamic timezone countdowns, subject syllabus coverage, target scores, and practice test tracking.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Register Exam</span>
        </button>
      </div>

      {/* 2. Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.length === 0 ? (
          <div className="md:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-12 text-center">
            <p className="text-xs text-neutral-500 mb-3">No examinations registered yet.</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
            >
              Add Your First Exam
            </button>
          </div>
        ) : (
          exams.map(exam => {
            const { days, hours, isPast } = getCountdownParts(exam.startsAt);

            return (
              <div
                key={exam.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Subject, Type, and Actions */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: exam.subjectColor || '#10b981' }}
                      />
                      <span className="font-bold text-xs uppercase" style={{ color: exam.subjectColor }}>
                        {exam.subjectCode}
                      </span>
                      <span className="text-xs text-neutral-400">·</span>
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {exam.examType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(exam)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        className="p-1 rounded text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Countdown Highlight */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {exam.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{new Date(exam.startsAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>·</span>
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{new Date(exam.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {exam.location && (
                        <p className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{exam.location}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {isPast ? (
                        <span className="text-xs font-semibold text-neutral-400">Concluded</span>
                      ) : (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2.5 text-center">
                          <span className="font-mono text-xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums block">
                            {days}d {hours}h
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wider font-semibold">
                            Time Left
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics & Readiness Details */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/40 text-xs mb-4">
                    <div>
                      <span className="text-neutral-500 block mb-1">Curriculum Coverage</span>
                      <div className="flex items-baseline gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        <span>{exam.syllabusProgress ?? 0}%</span>
                        <span className="text-[10px] font-normal text-neutral-400">
                          ({exam.masteredTopics ?? 0}/{exam.totalTopics ?? 0} mastered)
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-neutral-500 block mb-1">Target Score</span>
                      <div className="flex items-baseline gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        <span>{exam.targetScore ?? 90}%</span>
                        {exam.achievedScore !== null && exam.achievedScore !== undefined && (
                          <span className="text-emerald-600 font-bold text-[11px]">
                            (Result: {exam.achievedScore}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
                      <span className="text-neutral-500">Student Confidence:</span>
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= exam.confidenceLevel ? 'fill-current' : 'text-neutral-300 dark:text-neutral-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reflection Notes / Past Papers */}
                  {exam.pastPapersUrl && (
                    <div className="mb-3">
                      <a
                        href={exam.pastPapersUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Past Exam Archive & Solution Keys</span>
                      </a>
                    </div>
                  )}

                  {exam.reflectionNotes && (
                    <p className="text-[11px] text-neutral-500 italic p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                      "{exam.reflectionNotes}"
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Note: Countdown updates in real-time</span>
                  <button
                    onClick={() => handleOpenEdit(exam)}
                    className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Edit Exam Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Exam Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Register Examination
            </h3>

            <form onSubmit={handleCreateExam} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm 2: Graph Theory & Trees"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Course / Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    {subjects.length === 0 ? (
                      <option value="">No subjects created</option>
                    ) : (
                      subjects.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={e => setExamType(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="Midterm">Midterm</option>
                    <option value="Final">Final</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Oral Defense">Oral Defense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={e => setStartsAt(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={targetScore}
                    onChange={e => setTargetScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Exam Hall / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hewlett 200 Auditorium"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Confidence Rating (1 - 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setConfidenceLevel(star)}
                      className="p-1 text-amber-400"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= confidenceLevel ? 'fill-current' : 'text-neutral-300 dark:text-neutral-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Past Papers or Review Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={pastPapersUrl}
                  onChange={e => setPastPapersUrl(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Preparation & Focus Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Formulas to memorize, key proofs..."
                  value={reflectionNotes}
                  onChange={e => setReflectionNotes(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Results Modal */}
      {isEditModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Edit Exam & Record Results
            </h3>

            <form onSubmit={handleUpdateExam} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Achieved Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 94.5"
                  value={achievedScore ?? ''}
                  onChange={e => setAchievedScore(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Exam Reflection Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Post-exam reflections, what went well, unexpected questions..."
                  value={reflectionNotes}
                  onChange={e => setReflectionNotes(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Reflection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
