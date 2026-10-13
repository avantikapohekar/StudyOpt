import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Video,
  GraduationCap,
  FolderPlus,
  FileText,
  Check,
  AlertCircle,
  FileCheck,
  Loader2,
  Cloud,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Subject, ResourceCollection, LearningResource } from '../../types';
import { normalizeTags } from '../../lib/tagUtils';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceCreated: (resource: LearningResource) => void;
  subjects: Subject[];
  collections: ResourceCollection[];
}

type ModalTab = 'upload' | 'link' | 'youtube' | 'course';

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  isOpen,
  onClose,
  onResourceCreated,
  subjects,
  collections,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [collectionId, setCollectionId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');

  // Upload fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link / Video / Course fields
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubjectId('');
    setCollectionId('');
    setTagsInput('');
    setSelectedFile(null);
    setUrl('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!title) {
      // Auto-populate title without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsedTags = normalizeTags(tagsInput);

      if (activeTab === 'upload') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload.');
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        if (title.trim()) formData.append('title', title.trim());
        if (description.trim()) formData.append('description', description.trim());
        if (subjectId) formData.append('subjectId', subjectId);
        if (collectionId) formData.append('collectionId', collectionId);
        if (parsedTags.length > 0) formData.append('tags', JSON.stringify(parsedTags));

        const res = await api.resources.upload(formData);
        onResourceCreated(res.resource);
        handleClose();
      } else {
        // Link, YouTube, or Course
        if (!url.trim()) {
          throw new Error('Please provide a valid URL.');
        }
        if (!title.trim()) {
          throw new Error('Please provide a title for the resource.');
        }

        let type = 'WEB_LINK';
        let source = 'WEB';

        if (activeTab === 'youtube') {
          type = 'VIDEO';
          source = 'YOUTUBE';
        } else if (activeTab === 'course') {
          type = 'COURSE';
          source = 'UDEMY';
        }

        const res = await api.resources.createLink({
          title: title.trim(),
          url: url.trim(),
          description: description.trim(),
          type,
          source,
          subjectId: subjectId || null,
          collectionId: collectionId || null,
          tags: parsedTags,
        });

        onResourceCreated(res.resource);
        handleClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save resource. Please verify your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Add Academic Resource
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Upload local documents, attach video lectures, or save research bookmarks.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('link'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
              activeTab === 'link'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-emerald-500" />
            Web Bookmark
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('youtube'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
              activeTab === 'youtube'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Video className="w-4 h-4 text-rose-500" />
            YouTube
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('course'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${
              activeTab === 'course'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-500" />
            Course Link
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                File Attachment (PDF, Markdown, Office, CSV, Images up to 50MB)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : selectedFile
                    ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/60 dark:bg-neutral-850/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  accept=".pdf,.md,.txt,.csv,.json,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp"
                />

                {selectedFile ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatFileSize(selectedFile.size)} • Ready to upload
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Click to choose or drag & drop files here
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      PDF, Markdown (.md), Word (.docx), Excel (.xlsx), CSV, Images
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4: URL */}
          {activeTab !== 'upload' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {activeTab === 'youtube'
                  ? 'YouTube Video or Playlist URL *'
                  : activeTab === 'course'
                  ? 'Course / Module Web URL *'
                  : 'Web Bookmark / Article URL *'}
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (!title && e.target.value) {
                      try {
                        const parsed = new URL(e.target.value);
                        if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
                          setTitle('YouTube Lecture');
                        }
                      } catch {
                        // ignore parsing error while typing
                      }
                    }
                  }}
                  placeholder={
                    activeTab === 'youtube'
                      ? 'https://www.youtube.com/watch?v=...'
                      : activeTab === 'course'
                      ? 'https://www.udemy.com/course/... or coursera.org'
                      : 'https://arxiv.org/abs/... or wikipedia.org'
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Resource Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Dynamic Programming & Bellman-Ford"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Description & Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Key concepts covered, relevant exam questions, or reading bookmarks..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Subject & Collection mapping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Link to Course / Subject
              </label>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="">No subject (General reference)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Organize in Collection
              </label>
              <select
                value={collectionId}
                onChange={e => setCollectionId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="">Unfiled (Root Library)</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>
                    📁 {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. algorithms, midterm, proofs, lab-1"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Resource...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save to Learning Hub
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
