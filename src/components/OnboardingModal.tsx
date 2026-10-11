import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinished: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onFinished }) => {
  const { user, completeOnboarding } = useAuth();
  const [college, setCollege] = useState(user?.college || '');
  const [semesterName, setSemesterName] = useState('Fall Semester 2026');
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(120);
  const [subjects, setSubjects] = useState<Array<{ name: string; code: string; credits: number; color: string }>>([
    { name: 'Computer Architecture & Systems', code: 'CS 107', credits: 4, color: '#10b981' },
    { name: 'Linear Algebra & Optimization', code: 'MATH 51', credits: 4, color: '#3b82f6' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddSubject = () => {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    setSubjects(prev => [
      ...prev,
      {
        name: '',
        code: '',
        credits: 3,
        color: colors[prev.length % colors.length],
      },
    ]);
  };

  const handleRemoveSubject = (idx: number) => {
    setSubjects(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubjectChange = (idx: number, field: string, value: string | number) => {
    setSubjects(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await completeOnboarding({
        college,
        semesterName,
        targetDailyMinutes,
        subjects: subjects.filter(s => s.name.trim().length > 0),
      });
      onFinished();
    } catch (err) {
      console.error('Failed to submit onboarding:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-bold tracking-wider uppercase">Welcome to StudyOS</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">
          Configure Your Academic Workspace
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          Set up your current term and enrolled courses. You can customize these at any time in Settings.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                College / University
              </label>
              <input
                type="text"
                value={college}
                onChange={e => setCollege(e.target.value)}
                placeholder="e.g. Stanford University"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Active Semester Name
              </label>
              <input
                type="text"
                required
                value={semesterName}
                onChange={e => setSemesterName(e.target.value)}
                placeholder="e.g. Fall 2026"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Daily Study Target (Minutes)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="30"
                max="480"
                step="30"
                value={targetDailyMinutes}
                onChange={e => setTargetDailyMinutes(Number(e.target.value))}
                className="flex-1 accent-emerald-600"
              />
              <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100 w-16 text-right tabular-nums">
                {targetDailyMinutes} min
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Initial Enrolled Subjects
              </label>
              <button
                type="button"
                onClick={handleAddSubject}
                className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {subjects.map((sub, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Subject Title (e.g. Data Structures)"
                    value={sub.name}
                    onChange={e => handleSubjectChange(idx, 'name', e.target.value)}
                    className="flex-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Code (e.g. CS106B)"
                    value={sub.code}
                    onChange={e => handleSubjectChange(idx, 'code', e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(idx)}
                    className="h-7 w-7 flex items-center justify-center rounded text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs mt-4"
          >
            <span>Launch StudyOS Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
