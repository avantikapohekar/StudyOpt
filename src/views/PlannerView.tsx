import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import { TimetableEvent, Subject, EventType, Exam, Task } from '../types';

export const PlannerView: React.FC = () => {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [eventType, setEventType] = useState<EventType>('CLASS');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [conflictWarning, setConflictWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsRes, examsRes, tasksRes, subsRes] = await Promise.all([
        api.planner.getEvents(),
        api.exams.getExams(),
        api.tasks.getTasks(),
        api.academics.getSubjects(),
      ]);
      setEvents(eventsRes.events);
      setExams(examsRes.exams);
      setTasks(tasksRes.tasks.filter(t => t.dueAt));
      setSubjects(subsRes.subjects);
      if (subsRes.subjects.length > 0 && !subjectId) {
        setSubjectId(subsRes.subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = (presetDate?: Date) => {
    const base = presetDate || new Date();
    const start = new Date(base);
    start.setHours(10, 0, 0, 0);
    const end = new Date(base);
    end.setHours(11, 30, 0, 0);

    setTitle('');
    setStartsAt(start.toISOString().slice(0, 16));
    setEndsAt(end.toISOString().slice(0, 16));
    setLocation('');
    setRecurrenceRule('');
    setConflictWarning(false);
    setIsModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !endsAt) return;

    setSubmitting(true);
    try {
      const res = await api.planner.createEvent({
        title,
        subjectId: subjectId || null,
        eventType,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        location: location ? location.trim() : null,
        recurrenceRule: recurrenceRule || null,
      });

      if (res.event.hasOverlapConflict) {
        setConflictWarning(true);
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Delete this timetable event?')) return;
    try {
      await api.planner.deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filterSubjectId !== 'all' && e.subjectId !== filterSubjectId) return false;
    if (filterType !== 'all' && e.eventType !== filterType) return false;
    return true;
  });

  // Calculate week days
  const getWeekDates = (date: Date): Date[] => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(current.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);

  const prevPeriod = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setSelectedDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const resetToToday = () => setSelectedDate(new Date());

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Timetable & Academic Calendar
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Manage lectures, labs, and focused study blocks with overlap detection.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Month
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevPeriod}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={resetToToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              Today
            </button>
            <button
              onClick={nextPeriod}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-neutral-400" />
          <select
            value={filterSubjectId}
            onChange={e => setFilterSubjectId(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Courses</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Event Types</option>
            <option value="CLASS">Classes & Lectures</option>
            <option value="LAB">Labs</option>
            <option value="STUDY_BLOCK">Study Blocks</option>
            <option value="TUTORIAL">Tutorials</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Class</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Study Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Lab</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Exam</span>
          </div>
        </div>
      </div>

      {/* 3. Week Calendar View */}
      {viewMode === 'week' && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 text-center">
            {weekDates.map(date => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={date.toISOString()}
                  className={`py-3 px-2 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 ${
                    isToday ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <p className="text-[11px] font-medium text-neutral-500 uppercase">
                    {date.toLocaleDateString([], { weekday: 'short' })}
                  </p>
                  <p
                    className={`text-sm font-bold mt-0.5 tabular-nums ${
                      isToday
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Week Grid Content */}
          <div className="grid grid-cols-7 min-h-[480px] divide-x divide-neutral-200 dark:divide-neutral-800">
            {weekDates.map(date => {
              const dateStr = date.toISOString().split('T')[0];

              // Filter events for this day
              const dayEvents = filteredEvents.filter(e => e.startsAt.split('T')[0] === dateStr);
              // Filter exams on this day
              const dayExams = exams.filter(e => e.startsAt.split('T')[0] === dateStr);
              // Filter tasks due on this day
              const dayTasks = tasks.filter(t => t.dueAt && t.dueAt.split('T')[0] === dateStr);

              return (
                <div
                  key={date.toISOString()}
                  className="p-2 space-y-2 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                >
                  {/* Exams banner */}
                  {dayExams.map(ex => (
                    <div
                      key={ex.id}
                      className="p-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs shadow-xs"
                    >
                      <span className="font-bold block truncate">⚡ {ex.title}</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 tabular-nums">
                        {new Date(ex.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}

                  {/* Tasks due banner */}
                  {dayTasks.map(tsk => (
                    <div
                      key={tsk.id}
                      className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-800 dark:text-neutral-300 truncate"
                    >
                      Due: {tsk.title}
                    </div>
                  ))}

                  {/* Events */}
                  {dayEvents.map(evt => {
                    const startTime = new Date(evt.startsAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const endTime = new Date(evt.endsAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={evt.id}
                        className="group relative p-2 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-300 transition-all text-xs"
                      >
                        <div
                          className="w-1 absolute left-0 top-1 bottom-1 rounded-r"
                          style={{ backgroundColor: evt.color || '#10b981' }}
                        />
                        <div className="pl-1">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {evt.title}
                          </p>
                          <p className="text-[10px] text-neutral-500 tabular-nums mt-0.5">
                            {startTime} - {endTime}
                          </p>
                          {evt.location && (
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              <span>{evt.location}</span>
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Day / Month View Fallback Card */}
      {viewMode !== 'week' && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {selectedDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <span className="text-xs text-neutral-500">
              {filteredEvents.length} total events matching filter
            </span>
          </div>

          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <p className="py-8 text-center text-xs text-neutral-500">No scheduled events found.</p>
            ) : (
              filteredEvents.map(evt => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-10 rounded-full"
                      style={{ backgroundColor: evt.color || '#10b981' }}
                    />
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{evt.title}</p>
                      <p className="text-[11px] text-neutral-500 tabular-nums">
                        {new Date(evt.startsAt).toLocaleDateString()} ·{' '}
                        {new Date(evt.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(evt.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {evt.location ? ` · ${evt.location}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Schedule Timetable Event
            </h3>

            {conflictWarning && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Notice: This event overlaps with an existing scheduled event.</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS106B Lecture: Graph Traversal"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
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
                    <option value="">General</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={e => setEventType(e.target.value as EventType)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="CLASS">Class / Lecture</option>
                    <option value="LAB">Lab Session</option>
                    <option value="STUDY_BLOCK">Focus Study Block</option>
                    <option value="TUTORIAL">Discussion Section</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Start Time
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
                    End Time
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
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Location (Auditorium, Lab, or Room)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hewlett Hall 200"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
