import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import { Semester, Subject, Unit, Topic, TopicStatus, TopicDifficulty } from '../types';

export const AcademicsView: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [syllabusData, setSyllabusData] = useState<{
    subject: Subject;
    overallProgress: number;
    totalTopics: number;
    masteredTopics: number;
    units: Unit[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddSubjectModal, setIsAddSubjectModal] = useState(false);
  const [isAddUnitModal, setIsAddUnitModal] = useState(false);
  const [isAddTopicModal, setIsAddTopicModal] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState<string | null>(null);

  // Form states
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubColor, setNewSubColor] = useState('#10b981');
  const [newSubCredits, setNewSubCredits] = useState(4);
  const [newUnitName, setNewUnitName] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicDiff, setNewTopicDiff] = useState<TopicDifficulty>('MEDIUM');
  const [newTopicEst, setNewTopicEst] = useState(60);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [semsRes, subsRes] = await Promise.all([
        api.academics.getSemesters(),
        api.academics.getSubjects(),
      ]);
      setSemesters(semsRes.semesters);
      setSubjects(subsRes.subjects);

      if (subsRes.subjects.length > 0) {
        setSelectedSubjectId(subsRes.subjects[0].id);
        await loadSyllabus(subsRes.subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load academics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSyllabus = async (subId: string) => {
    if (!subId) {
      setSyllabusData(null);
      return;
    }
    try {
      setSyllabusLoading(true);
      const data = await api.academics.getSyllabus(subId);
      setSyllabusData(data);
    } catch (err) {
      console.error('Failed to load syllabus:', err);
      setSyllabusData(null);
    } finally {
      setSyllabusLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const handleSelectSubject = (id: string) => {
    if (!id) return;
    setSelectedSubjectId(id);
    loadSyllabus(id);
  };

  const handleUpdateTopicStatus = async (topicId: string, status: TopicStatus) => {
    try {
      await api.academics.updateTopic(topicId, { status });
      if (selectedSubjectId) {
        await loadSyllabus(selectedSubjectId);
        // Refresh subjects list to update progress bars
        const res = await api.academics.getSubjects();
        setSubjects(res.subjects);
      }
    } catch (err) {
      console.error('Failed to update topic status:', err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) return;

    let activeSem = semesters.find(s => s.isActive) || semesters[0];
    if (!activeSem) {
      try {
        const now = new Date();
        const fourMonthsLater = new Date(Date.now() + 120 * 86400000);
        const newSem = await api.academics.createSemester({
          name: 'Current Term',
          startDate: now.toISOString(),
          endDate: fourMonthsLater.toISOString(),
          isActive: true,
        });
        activeSem = newSem.semester;
        setSemesters([newSem.semester]);
      } catch (err) {
        console.error('Failed to auto-create semester:', err);
      }
    }
    if (!activeSem) return;

    try {
      const res = await api.academics.createSubject({
        semesterId: activeSem.id,
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase(),
        color: newSubColor,
        credits: newSubCredits,
      });
      setIsAddSubjectModal(false);
      setNewSubName('');
      setNewSubCode('');
      const updated = await api.academics.getSubjects();
      setSubjects(updated.subjects);
      setSelectedSubjectId(res.subject.id);
      loadSyllabus(res.subject.id);
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !newUnitName.trim()) return;

    try {
      await api.academics.createUnit(selectedSubjectId, { name: newUnitName.trim() });
      setIsAddUnitModal(false);
      setNewUnitName('');
      loadSyllabus(selectedSubjectId);
    } catch (err) {
      console.error('Failed to create unit:', err);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUnitId || !newTopicTitle.trim()) return;

    try {
      await api.academics.createTopic(targetUnitId, {
        title: newTopicTitle.trim(),
        description: newTopicDesc.trim(),
        difficulty: newTopicDiff,
        estimatedMinutes: newTopicEst,
      });
      setIsAddTopicModal(false);
      setNewTopicTitle('');
      setNewTopicDesc('');
      if (selectedSubjectId) {
        loadSyllabus(selectedSubjectId);
      }
    } catch (err) {
      console.error('Failed to create topic:', err);
    }
  };

  const toggleUnitCollapse = (unitId: string) => {
    setCollapsedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Academics & Syllabus Hierarchy
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Semester → Subject → Unit → Topic curriculum breakdown with weighted mastery progress.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddSubjectModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Course Subject</span>
        </button>
      </div>

      {/* 2. Course Subjects Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {subjects.map(sub => {
          const isSelected = sub.id === selectedSubjectId;
          return (
            <button
              key={sub.id}
              onClick={() => handleSelectSubject(sub.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
                isSelected
                  ? 'border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 ring-1 ring-neutral-900/10 dark:ring-neutral-100/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: sub.color || '#10b981' }}
              />
              <span>{sub.code}</span>
              <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                ({sub.credits} cr)
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {sub.progressPercentage ?? 0}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Syllabus Workspace */}
      {selectedSubjectId && syllabusData && (
        <div className="space-y-6">
          {/* Subject Overview Card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  <span>{syllabusData.subject.code}</span>
                  <span aria-hidden="true">·</span>
                  <span>{syllabusData.subject.credits} Credits</span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {syllabusData.subject.name}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAddUnitModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Unit</span>
                </button>
              </div>
            </div>

            {/* Progress Calculation Rules Explanation (Transparent Rules requirement) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-2 text-xs">
              <div>
                <span className="text-neutral-500 block mb-1">Overall Curriculum Mastery</span>
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {syllabusData.overallProgress}%
                </span>
                <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${syllabusData.overallProgress}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block mb-1">Topics Breakdown</span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {syllabusData.masteredTopics} / {syllabusData.totalTopics} Mastered
                </span>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {syllabusData.units.length} total units configured
                </p>
              </div>

              <div className="md:col-span-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3 text-[11px] text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-neutral-200 block mb-1">
                  Transparent Progress Rules:
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>Not Started: 0%</span>
                  <span>·</span>
                  <span>Learning: 25%</span>
                  <span>·</span>
                  <span>Practiced: 50%</span>
                  <span>·</span>
                  <span>Revised: 75%</span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Mastered: 100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Units & Topics List */}
          <div className="space-y-4">
            {syllabusData.units.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
                <p className="text-xs text-neutral-500 mb-3">No syllabus units created for this course yet.</p>
                <button
                  onClick={() => setIsAddUnitModal(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
                >
                  Create Unit 1
                </button>
              </div>
            ) : (
              syllabusData.units.map((unit, uIdx) => {
                const isCollapsed = Boolean(collapsedUnits[unit.id]);
                return (
                  <div
                    key={unit.id}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs"
                  >
                    {/* Unit Header */}
                    <div className="flex items-center justify-between p-4 bg-neutral-50/60 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800">
                      <div
                        className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1"
                        onClick={() => toggleUnitCollapse(unit.id)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                        )}
                        <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {unit.name}
                        </span>
                        <span className="text-xs text-neutral-400 tabular-nums font-mono">
                          ({unit.topics.length} topics)
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                          <span>{unit.progressPercentage ?? 0}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${unit.progressPercentage ?? 0}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setTargetUnitId(unit.id);
                            setIsAddTopicModal(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Topic</span>
                        </button>
                      </div>
                    </div>

                    {/* Unit Topics Checklist */}
                    {!isCollapsed && (
                      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                        {unit.topics.length === 0 ? (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            No topics added to this unit yet.
                          </div>
                        ) : (
                          unit.topics.map(topic => (
                            <div
                              key={topic.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                    {topic.title}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium ${
                                      topic.difficulty === 'HARD'
                                        ? 'text-red-500'
                                        : topic.difficulty === 'MEDIUM'
                                        ? 'text-amber-500'
                                        : 'text-emerald-500'
                                    }`}
                                  >
                                    · {topic.difficulty}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 tabular-nums">
                                    · ~{topic.estimatedMinutes}m
                                  </span>
                                </div>
                                {topic.description && (
                                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                                    {topic.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  value={topic.status}
                                  onChange={e =>
                                    handleUpdateTopicStatus(topic.id, e.target.value as TopicStatus)
                                  }
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                                    topic.status === 'MASTERED'
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : topic.status === 'REVISED'
                                      ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                      : topic.status === 'PRACTICED'
                                      ? 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                      : topic.status === 'LEARNING'
                                      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                                  }`}
                                >
                                  <option value="NOT_STARTED">Not Started (0%)</option>
                                  <option value="LEARNING">Learning (25%)</option>
                                  <option value="PRACTICED">Practiced (50%)</option>
                                  <option value="REVISED">Revised (75%)</option>
                                  <option value="MASTERED">Mastered (100%)</option>
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {isAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Add Academic Course Subject
            </h3>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems Principles"
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS140"
                    value={newSubCode}
                    onChange={e => setNewSubCode(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSubCredits}
                    onChange={e => setNewSubCredits(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSubColor(c)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        newSubColor === c ? 'border-neutral-900 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {isAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Add Curriculum Unit
            </h3>
            <form onSubmit={handleCreateUnit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Unit Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3: Virtual Memory & Paging"
                  value={newUnitName}
                  onChange={e => setNewUnitName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Create Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {isAddTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Add Syllabus Topic
            </h3>
            <form onSubmit={handleCreateTopic} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TLB Invalidation & Page Fault Handlers"
                  value={newTopicTitle}
                  onChange={e => setNewTopicTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description / Invariants
                </label>
                <textarea
                  rows={2}
                  placeholder="Key concepts to master..."
                  value={newTopicDesc}
                  onChange={e => setNewTopicDesc(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={newTopicDiff}
                    onChange={e => setNewTopicDiff(e.target.value as TopicDifficulty)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Estimated Study (mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="360"
                    step="15"
                    value={newTopicEst}
                    onChange={e => setNewTopicEst(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTopicModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
