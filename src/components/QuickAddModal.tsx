import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, FileText, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Subject } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ItemType = 'task' | 'event' | 'note';

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [itemType, setItemType] = useState<ItemType>('task');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  // Common fields
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  
  // Task specific
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isAssignment, setIsAssignment] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);

  // Event specific
  const [eventType, setEventType] = useState('STUDY_BLOCK');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');

  // Note specific
  const [noteContent, setNoteContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.academics.getSubjects().then(res => {
        setSubjects(res.subjects);
        if (res.subjects.length > 0 && !subjectId) {
          setSubjectId(res.subjects[0].id);
        }
      });
      // Set sensible default times
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60000);
      setStartsAt(now.toISOString().slice(0, 16));
      setEndsAt(oneHourLater.toISOString().slice(0, 16));
      setDueAt(new Date(now.getTime() + 86400000).toISOString().slice(0, 16));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      if (itemType === 'task') {
        await api.tasks.createTask({
          title,
          subjectId: subjectId || null,
          priority: priority as any,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          estimatedMinutes: Number(estimatedMinutes) || 30,
          isAssignment,
        });
      } else if (itemType === 'event') {
        await api.planner.createEvent({
          title,
          subjectId: subjectId || null,
          eventType: eventType as any,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          location: location || null,
        });
      } else if (itemType === 'note') {
        const tagList = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        await api.notes.createNote({
          title,
          content: noteContent,
          subjectId: subjectId || null,
          tags: tagList,
        });
      }

      onSuccess();
      onClose();
      // Reset title
      setTitle('');
      setNoteContent('');
    } catch (err) {
      console.error('Quick Add failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Quick Add
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented type toggle */}
        <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 mb-4">
          <button
            type="button"
            onClick={() => setItemType('task')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              itemType === 'task'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
            <span>Task</span>
          </button>
          <button
            type="button"
            onClick={() => setItemType('event')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              itemType === 'event'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span>Event</span>
          </button>
          <button
            type="button"
            onClick={() => setItemType('note')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              itemType === 'note'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-purple-500" />
            <span>Note</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              placeholder={
                itemType === 'task'
                  ? 'e.g. Complete Problem Set 3'
                  : itemType === 'event'
                  ? 'e.g. Study Session in Library'
                  : 'e.g. Lecture Key Takeaways'
              }
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Course / Subject
            </label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">General / None</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {itemType === 'task' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={e => setDueAt(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAssignmentCheck"
                  checked={isAssignment}
                  onChange={e => setIsAssignment(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isAssignmentCheck" className="text-xs text-neutral-700 dark:text-neutral-300">
                  Track as graded assignment with submission deadline
                </label>
              </div>
            </>
          )}

          {itemType === 'event' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Start
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
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science Library Room 304"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </>
          )}

          {itemType === 'note' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Note Content (Markdown supported)
                </label>
                <textarea
                  rows={3}
                  placeholder="Write initial thoughts, formulas, or bullet points..."
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="lecture, formulas, midterm"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create {itemType === 'task' ? 'Task' : itemType === 'event' ? 'Event' : 'Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
