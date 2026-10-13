import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Download,
  FileText,
  Video,
  Image as ImageIcon,
  Table as TableIcon,
  Tag,
  Calendar,
  Layers,
  GraduationCap,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { LearningResource } from '../../types';
import { api } from '../../lib/api';
import { normalizeTags } from '../../lib/tagUtils';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface DocumentViewerModalProps {
  resource: LearningResource | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  resource,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [csvContent, setCsvContent] = useState<string[][] | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (!isOpen || !resource) {
      setCsvContent(null);
      setTextContent(null);
      return;
    }

    // If it's a local upload with csv or text or markdown, fetch content to render in viewer
    if (resource.storageKey && (resource.type === 'SPREADSHEET' || resource.type === 'MARKDOWN' || resource.mimeType?.includes('text') || resource.originalFilename?.endsWith('.csv') || resource.originalFilename?.endsWith('.md') || resource.originalFilename?.endsWith('.txt'))) {
      setLoadingText(true);
      fetch(api.resources.getFileUrl(resource.id))
        .then(res => res.text())
        .then(text => {
          if (resource.originalFilename?.endsWith('.csv') || resource.mimeType === 'text/csv') {
            const rows = text
              .split('\n')
              .map(r => r.trim())
              .filter(Boolean)
              .map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
            setCsvContent(rows);
          } else {
            setTextContent(text);
          }
        })
        .catch(err => {
          console.error('Failed to load text preview:', err);
        })
        .finally(() => setLoadingText(false));
    }
  }, [isOpen, resource]);

  if (!isOpen || !resource) return null;

  const fileUrl = resource.storageKey ? api.resources.getFileUrl(resource.id) : resource.url;

  const copyUrl = () => {
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to extract YouTube video ID
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      let videoId = parsed.searchParams.get('v');
      if (!videoId && (parsed.hostname.includes('youtu.be'))) {
        videoId = parsed.pathname.slice(1);
      }
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0` : null;
    } catch {
      return null;
    }
  };

  const isYouTube = resource.source === 'YOUTUBE' || (resource.url && (resource.url.includes('youtube.com') || resource.url.includes('youtu.be')));
  const isPdf = resource.mimeType === 'application/pdf' || resource.originalFilename?.toLowerCase().endsWith('.pdf');
  const isImage = resource.type === 'IMAGE' || resource.mimeType?.startsWith('image/');
  const youtubeEmbed = isYouTube && resource.url ? getYouTubeEmbedUrl(resource.url) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              {resource.type === 'VIDEO' ? (
                <Video className="w-5 h-5" />
              ) : resource.type === 'SPREADSHEET' ? (
                <TableIcon className="w-5 h-5" />
              ) : resource.type === 'IMAGE' ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {resource.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                {resource.subjectCode && (
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {resource.subjectCode}
                  </span>
                )}
                {resource.collectionName && (
                  <>
                    <span>•</span>
                    <span>📁 {resource.collectionName}</span>
                  </>
                )}
                {resource.fileSize ? (
                  <>
                    <span>•</span>
                    <span>{(resource.fileSize / 1024).toFixed(0)} KB</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileUrl && (
              <>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity"
                >
                  {resource.storageKey ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{resource.storageKey ? 'Download' : 'Open'}</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Viewer Body */}
          <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 overflow-auto flex items-center justify-center p-4 relative">
            {/* 1. YouTube Video Embed */}
            {youtubeEmbed ? (
              <div className="w-full h-full max-h-[75vh] aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
                <iframe
                  src={youtubeEmbed}
                  title={resource.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : isPdf && fileUrl ? (
              /* 2. Embedded PDF */
              <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-sm border border-neutral-200 dark:border-neutral-800">
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  title={resource.title}
                  className="w-full h-full border-0"
                />
              </div>
            ) : isImage && fileUrl ? (
              /* 3. Image Lightbox */
              <div className="max-w-full max-h-full p-2 flex items-center justify-center">
                <img
                  src={fileUrl}
                  alt={resource.title}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-md"
                />
              </div>
            ) : csvContent ? (
              /* 4. CSV Table Preview */
              <div className="w-full h-full overflow-auto bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      {csvContent[0]?.map((col, idx) => (
                        <th key={idx} className="p-2.5 font-bold text-neutral-800 dark:text-neutral-200">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {csvContent.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 text-neutral-600 dark:text-neutral-400">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : textContent !== null ? (
              /* 5. Plain Text / Markdown Preview */
              <div className="w-full h-full overflow-auto bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 text-left">
                <MarkdownRenderer content={textContent} />
              </div>
            ) : resource.url ? (
              /* 6. External Link Launch Box */
              <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center space-y-4 shadow-md">
                <div className="p-4 mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ExternalLink className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    External Resource
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 break-all">
                    {resource.url}
                  </p>
                </div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            ) : (
              /* Fallback file presentation */
              <div className="text-center space-y-2 p-8">
                <FileText className="w-12 h-12 mx-auto text-neutral-400" />
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Document ready for download
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {resource.originalFilename || resource.title}
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar Details */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 overflow-y-auto space-y-5 text-left text-xs">
            {/* Description */}
            {resource.description && (
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
                  Description & Context
                </span>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {resource.description}
                </p>
              </div>
            )}

            {/* Academic Linkage */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <span className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
                Academic Association
              </span>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium">
                    {resource.subjectName ? `${resource.subjectCode} - ${resource.subjectName}` : 'No subject assigned'}
                  </span>
                </div>
                {resource.collectionName && (
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">{resource.collectionName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-4 h-4" />
                  <span>Added {new Date(resource.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {normalizeTags(resource.tagList || resource.tags).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {normalizeTags(resource.tagList || resource.tags).map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                    >
                      <Tag className="w-3 h-3 text-neutral-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source info */}
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <span className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
                Source Details
              </span>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {resource.source === 'GOOGLE_DRIVE' ? 'Linked Google Drive' : resource.source.replace('_', ' ')}
                </p>
                <p className="text-neutral-500 dark:text-neutral-400 break-all text-[11px]">
                  Format: {resource.type}
                </p>
                {resource.source === 'GOOGLE_DRIVE' ? (
                  <p className="text-blue-600 dark:text-blue-400 text-[11px]">
                    ☁️ Cloud reference (original preserved in your Drive)
                  </p>
                ) : resource.storageKey ? (
                  <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                    Storage: Local Disk ({resource.storageKey.slice(0, 18)}...)
                  </p>
                ) : null}
              </div>
            </div>

            {/* Delete Resource Button */}
            {onDelete && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    const confirmPrompt = resource.source === 'GOOGLE_DRIVE'
                      ? 'Remove this Google Drive reference from StudyOS? Your original file in Google Drive will NOT be deleted.'
                      : 'Are you sure you want to delete this resource from your library?';
                    if (window.confirm(confirmPrompt)) {
                      onDelete(resource.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900"
                >
                  {resource.source === 'GOOGLE_DRIVE' ? 'Remove Drive Link' : 'Delete Resource'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
