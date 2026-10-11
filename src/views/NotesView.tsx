import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Tag,
  Download,
  Trash2,
  Check,
  Eye,
  Edit3,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import { Note, Subject, Topic } from '../types';

export const NotesView: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Active Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSubjectId, setEditorSubjectId] = useState<string>('');
  const [editorTopicId, setEditorTopicId] = useState<string>('');
  const [editorTags, setEditorTags] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const autosaveTimeoutRef = useRef<number | null>(null);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [notesRes, subsRes] = await Promise.all([
        api.notes.getNotes(),
        api.academics.getSubjects(),
      ]);
      setNotes(notesRes.notes);
      setSubjects(subsRes.subjects);

      if (notesRes.notes.length > 0 && !selectedNoteId) {
        selectNote(notesRes.notes[0]);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const selectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorSubjectId(note.subjectId || '');
    setEditorTopicId(note.topicId || '');
    setEditorTags(note.tagList ? note.tagList.join(', ') : '');
    setSaveStatus('saved');

    // Fetch topics for this subject
    if (note.subjectId) {
      api.academics.getSyllabus(note.subjectId).then(res => {
        setTopics(res.units.flatMap(u => u.topics));
      });
    } else {
      setTopics([]);
    }
  };

  // Trigger autosave on change
  const triggerAutosave = (newTitle: string, newContent: string, newSubId: string, newTopId: string, newTagsStr: string) => {
    if (!selectedNoteId) return;

    setSaveStatus('unsaved');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const tagList = newTagsStr.split(',').map(t => t.trim()).filter(Boolean);
        await api.notes.updateNote(selectedNoteId, {
          title: newTitle,
          content: newContent,
          subjectId: newSubId || null,
          topicId: newTopId || null,
          tags: tagList,
        });
        setSaveStatus('saved');

        // Update list copy
        setNotes(prev =>
          prev.map(n =>
            n.id === selectedNoteId
              ? {
                  ...n,
                  title: newTitle,
                  content: newContent,
                  subjectId: newSubId || null,
                  topicId: newTopId || null,
                  tagList,
                  updatedAt: new Date().toISOString(),
                }
              : n
          )
        );
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('unsaved');
      }
    }, 800);
  };

  const handleTitleChange = (val: string) => {
    setEditorTitle(val);
    triggerAutosave(val, editorContent, editorSubjectId, editorTopicId, editorTags);
  };

  const handleContentChange = (val: string) => {
    setEditorContent(val);
    triggerAutosave(editorTitle, val, editorSubjectId, editorTopicId, editorTags);
  };

  const handleSubjectChange = (val: string) => {
    setEditorSubjectId(val);
    setEditorTopicId('');
    if (val) {
      api.academics.getSyllabus(val).then(res => {
        setTopics(res.units.flatMap(u => u.topics));
      });
    } else {
      setTopics([]);
    }
    triggerAutosave(editorTitle, editorContent, val, '', editorTags);
  };

  const handleCreateNewNote = async () => {
    try {
      const res = await api.notes.createNote({
        title: 'Untitled Note',
        content: '# New Study Note\n\nWrite your concepts, definitions, and code blocks here.',
        subjectId: subjects.length > 0 ? subjects[0].id : null,
        tags: ['notes'],
      });
      setNotes(prev => [res.note, ...prev]);
      selectNote(res.note);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.notes.deleteNote(id);
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      if (remaining.length > 0) {
        selectNote(remaining[0]);
      } else {
        setSelectedNoteId(null);
        setEditorTitle('');
        setEditorContent('');
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleExportMarkdown = () => {
    if (!selectedNoteId) return;
    const blob = new Blob([editorContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editorTitle.replace(/\s+/g, '_') || 'note'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tagList || [])));

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (search) {
      const q = search.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false;
    }
    if (selectedSubjectFilter !== 'all' && n.subjectId !== selectedSubjectFilter) return false;
    if (selectedTag !== 'all' && !(n.tagList || []).includes(selectedTag)) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Notes & Knowledge Base
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Markdown editor with real-time autosave, syllabus linking, tag filters, and raw file export.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateNewNote}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* 2. Split Workspace: Note Navigator (Left) + Markdown Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left Column: Note Browser (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs flex flex-col space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search notes & content..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Subject & Tag filter dropdowns */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300"
            >
              <option value="all">All Courses</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>

            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300"
            >
              <option value="all">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>

          {/* Notes List */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-8">No notes match your filter.</p>
            ) : (
              filteredNotes.map(n => {
                const isSelected = n.id === selectedNoteId;
                return (
                  <div
                    key={n.id}
                    onClick={() => selectNote(n)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/40 dark:bg-neutral-800/20 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                        {n.title || 'Untitled Note'}
                      </span>
                      {n.subjectCode && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {n.subjectCode}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {n.content.replace(/^[#*`\- >]+/gm, '')}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-2 tabular-nums">
                      <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                      {n.tagList && n.tagList.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">#{n.tagList.slice(0, 2).join(' #')}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Markdown Editor & Preview (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs flex flex-col justify-between">
          {selectedNoteId ? (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Note Meta & Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <select
                    value={editorSubjectId}
                    onChange={e => handleSubjectChange(e.target.value)}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    <option value="">General (No Course)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editorTopicId}
                    onChange={e => {
                      setEditorTopicId(e.target.value);
                      triggerAutosave(editorTitle, editorContent, editorSubjectId, e.target.value, editorTags);
                    }}
                    disabled={topics.length === 0}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 disabled:opacity-50"
                  >
                    <option value="">Link Syllabus Topic</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* Autosave status indicator */}
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    {saveStatus === 'saving' && 'Saving...'}
                    {saveStatus === 'saved' && (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span>Saved</span>
                      </>
                    )}
                    {saveStatus === 'unsaved' && 'Unsaved changes'}
                  </span>

                  {/* Preview Toggle Button */}
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      isPreviewMode
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {isPreviewMode ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    title="Export as .md"
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteNote(selectedNoteId)}
                    title="Delete note"
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Title input */}
              <input
                type="text"
                placeholder="Note Title"
                value={editorTitle}
                onChange={e => handleTitleChange(e.target.value)}
                className="w-full text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 bg-transparent border-0 focus:outline-hidden px-1"
              />

              {/* Tags input */}
              <div className="flex items-center gap-2 px-1">
                <Tag className="h-3 w-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Tags (comma-separated, e.g. recursion, proofs, midterm)"
                  value={editorTags}
                  onChange={e => {
                    setEditorTags(e.target.value);
                    triggerAutosave(editorTitle, editorContent, editorSubjectId, editorTopicId, e.target.value);
                  }}
                  className="w-full text-xs text-neutral-500 dark:text-neutral-400 bg-transparent border-0 focus:outline-hidden"
                />
              </div>

              {/* Editor or Preview body */}
              <div className="flex-1 flex flex-col min-h-[380px]">
                {isPreviewMode ? (
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-800 dark:text-neutral-200 text-sm prose dark:prose-invert max-w-none flex-1 overflow-y-auto whitespace-pre-wrap font-sans">
                    {editorContent}
                  </div>
                ) : (
                  <textarea
                    value={editorContent}
                    onChange={e => handleContentChange(e.target.value)}
                    placeholder="Write markdown notes, code blocks (```cpp), formulas, and bullet points..."
                    className="w-full flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 p-4 font-mono text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500 resize-none leading-relaxed"
                  />
                )}
              </div>

              {/* Bottom statistics */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 tabular-nums">
                <span>
                  {editorContent.split(/\s+/).filter(Boolean).length} words · {editorContent.length} characters
                </span>
                <span>Markdown Syntax Supported</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FileText className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-3" />
              <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                No Note Selected
              </h3>
              <p className="text-xs text-neutral-400 mt-1 mb-4">
                Choose a note from the sidebar or create a new one.
              </p>
              <button
                onClick={handleCreateNewNote}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
              >
                Create Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
