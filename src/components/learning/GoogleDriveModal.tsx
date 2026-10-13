import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Cloud,
  Check,
  Search,
  FileText,
  Table,
  Presentation,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  FolderOpen,
  Folder,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  ChevronLeft,
  ShieldCheck,
  Info,
  Link as LinkIcon,
  Filter,
  ImageIcon,
  File,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { GoogleDriveFile, Subject, ResourceCollection, LearningResource, Topic } from '../../types';
import { api } from '../../lib/api';
import { signInWithGoogleDrive, signOutGoogle } from '../../lib/googleAuth';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceImported: (resource: LearningResource) => void;
  subjects: Subject[];
  collections: ResourceCollection[];
}

type MimeFilterType = 'all' | 'folder' | 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'image';

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onResourceImported,
  subjects,
  collections,
}) => {
  const [status, setStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
  const [accountEmail, setAccountEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'link'>('browse');

  // Drive browser state
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [search, setSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState<MimeFilterType>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'My Drive' }]);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [tokenHistory, setTokenHistory] = useState<(string | undefined)[]>([]);

  // Selected file for linking
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkTags, setLinkTags] = useState('Google Drive, Coursework');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load available topics when selected subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setAvailableTopics([]);
      setSelectedTopicId('');
      return;
    }
    api.academics.getSyllabus(selectedSubjectId)
      .then(res => {
        const allTopics: Topic[] = [];
        res.units?.forEach(u => {
          if (u.topics) allTopics.push(...u.topics);
        });
        setAvailableTopics(allTopics);
      })
      .catch(() => setAvailableTopics([]));
  }, [selectedSubjectId]);

  // Check URL query parameters for OAuth redirect feedback
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const driveResult = urlParams.get('drive_result');
    if (driveResult === 'success') {
      const email = urlParams.get('email');
      if (email) setAccountEmail(email);
      setSuccessMsg('Successfully connected your Google Drive account!');
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (driveResult === 'error') {
      const msg = urlParams.get('message') || 'Google authentication failed';
      setError(msg);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isOpen]);

  // Load connection status
  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.integrations.getDriveStatus();
      setStatus(res.status);
      if (res.connection?.email) {
        setAccountEmail(res.connection.email);
      }
      return res.status;
    } catch (err: any) {
      console.error('Failed to get Drive status:', err);
      setStatus('DISCONNECTED');
      return 'DISCONNECTED';
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch files from Google Drive API
  const loadFiles = useCallback(async (
    folderId = currentFolderId,
    searchTerm = search,
    filter = mimeFilter,
    page?: string
  ) => {
    if (status !== 'CONNECTED') return;

    setFilesLoading(true);
    setError(null);
    try {
      const res = await api.integrations.getDriveFiles({
        folderId: searchTerm ? undefined : folderId,
        search: searchTerm || undefined,
        mimeFilter: filter,
        pageToken: page,
        pageSize: 20,
      });

      setFiles(res.files || []);
      setNextPageToken(res.nextPageToken);
    } catch (err: any) {
      console.error('Failed to load Drive files:', err);
      if (err.message?.includes('expired') || err.message?.includes('reconnect')) {
        setStatus('DISCONNECTED');
        setError('Your Google Drive authorization has expired. Please reconnect.');
      } else {
        setError(err.message || 'Could not fetch files from Google Drive.');
      }
    } finally {
      setFilesLoading(false);
    }
  }, [status, currentFolderId, search, mimeFilter]);

  // Initial load on modal open
  useEffect(() => {
    if (!isOpen) return;

    checkStatus().then(currentStatus => {
      if (currentStatus === 'CONNECTED') {
        loadFiles('root', '', 'all');
      }
    });
  }, [isOpen, checkStatus]);

  if (!isOpen) return null;

  // Handle Google OAuth Connection
  const handleConnect = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Try real Google Sign-In popup with Firebase Auth
      const { user, accessToken, idToken } = await signInWithGoogleDrive();

      // 2. Synchronize token with backend to verify and store connection in database
      const connectRes = await api.integrations.connectWithToken({
        accessToken,
        idToken,
      });

      setStatus('CONNECTED');
      setAccountEmail(connectRes.connection?.email || user.email || '');
      setSuccessMsg(`Connected successfully as ${connectRes.connection?.email || user.email}`);

      // 3. Load files
      await loadFiles('root', '', 'all');
    } catch (err: any) {
      console.warn('Popup sign in encountered issue, checking redirect fallback:', err);
      // If popup fails (e.g. blocked or cancelled), fall back to backend redirect authorization URL
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          const authRes = await api.integrations.getConnectAuthUrl();
          if (authRes?.authUrl) {
            window.location.href = authRes.authUrl;
            return;
          }
        } catch (redirectErr) {
          // ignore
        }
      }
      setError(err.message || 'Failed to authenticate with Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      await api.integrations.disconnectDrive();
      await signOutGoogle().catch(() => {});
      setStatus('DISCONNECTED');
      setAccountEmail('');
      setFiles([]);
      setSelectedFile(null);
      setSuccessMsg('Google Drive account disconnected.');
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect account.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Navigate into folder
  const handleOpenFolder = (folder: GoogleDriveFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearch('');
    setPageToken(undefined);
    setTokenHistory([]);
    loadFiles(folder.id, '', mimeFilter);
  };

  // Navigate breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const newCrumbs = breadcrumbs.slice(0, index + 1);
    setCurrentFolderId(target.id);
    setBreadcrumbs(newCrumbs);
    setSearch('');
    setPageToken(undefined);
    setTokenHistory([]);
    loadFiles(target.id, '', mimeFilter);
  };

  // Handle Search Form Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPageToken(undefined);
    setTokenHistory([]);
    loadFiles(currentFolderId, search.trim(), mimeFilter);
  };

  // Handle Filter Change
  const handleFilterChange = (filter: MimeFilterType) => {
    setMimeFilter(filter);
    setPageToken(undefined);
    setTokenHistory([]);
    loadFiles(currentFolderId, search, filter);
  };

  // Next Page
  const handleNextPage = () => {
    if (!nextPageToken) return;
    setTokenHistory(prev => [...prev, pageToken]);
    setPageToken(nextPageToken);
    loadFiles(currentFolderId, search, mimeFilter, nextPageToken);
  };

  // Previous Page
  const handlePrevPage = () => {
    if (tokenHistory.length === 0) return;
    const prevToken = tokenHistory[tokenHistory.length - 1];
    setTokenHistory(prev => prev.slice(0, -1));
    setPageToken(prevToken);
    loadFiles(currentFolderId, search, mimeFilter, prevToken);
  };

  // Select file for linking
  const handleSelectFileToLink = (file: GoogleDriveFile) => {
    setSelectedFile(file);
    setLinkTitle(file.name);
    setLinkDescription(`Google Drive document: ${file.name}`);
    setActiveTab('link');
    setError(null);
  };

  // Submit Link Resource to StudyOS
  const handleLinkResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLinkingLoading(true);
    setError(null);

    const tagsArray = linkTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      const res = await api.integrations.importDriveFile({
        driveFileId: selectedFile.id,
        title: linkTitle.trim() || selectedFile.name,
        subjectId: selectedSubjectId || null,
        topicId: selectedTopicId || null,
        collectionId: selectedCollectionId || null,
        tags: tagsArray.length > 0 ? tagsArray : ['Google Drive'],
        description: linkDescription.trim(),
      });

      onResourceImported(res.resource);
      setSuccessMsg(`"${linkTitle || selectedFile.name}" has been linked to your StudyOS library!`);
      setActiveTab('browse');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to link resource to StudyOS.');
    } finally {
      setLinkingLoading(false);
    }
  };

  // File icon generator
  const getFileIcon = (file: GoogleDriveFile) => {
    if (file.isFolder || file.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
    }
    if (file.mimeType.includes('spreadsheet') || file.mimeType === 'text/csv') {
      return <Table className="w-5 h-5 text-emerald-500" />;
    }
    if (file.mimeType.includes('presentation')) {
      return <Presentation className="w-5 h-5 text-amber-500" />;
    }
    if (file.mimeType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (file.mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-violet-500" />;
    }
    return <File className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Google Drive Integration
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  Real API
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Browse Google Drive and link course slide decks, notes, and datasets to syllabus topics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
              }`}
            />
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {status === 'CONNECTED'
                ? `Connected: ${accountEmail || 'Authorized Account'}`
                : 'Not Connected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status === 'CONNECTED' ? (
              <>
                {activeTab === 'link' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Drive Browser
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => loadFiles(currentFolderId, search, mimeFilter)}
                    disabled={filesLoading}
                    className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Refresh files"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${filesLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                Connect Google Account
              </button>
            )}
          </div>
        </div>

        {/* Alerts / Feedback */}
        {error && (
          <div className="mx-6 mt-3 flex items-start gap-2.5 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-3 flex items-start gap-2.5 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1">
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {status !== 'CONNECTED' ? (
            /* Disconnected / Welcome State */
            <div className="text-center py-12 px-4 space-y-5 max-w-lg mx-auto">
              <div className="p-4 w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
                <FolderOpen className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Connect Your Google Drive
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Seamlessly browse your real Google Drive documents, slide decks, and spreadsheets. Link syllabus readings directly to StudyOS without copying duplicate files.
                </p>
              </div>

              {/* Privacy Notice Box */}
              <div className="text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Privacy & Least-Privilege Access</span>
                </div>
                <ul className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1 list-disc list-inside">
                  <li>Tokens are encrypted with AES-256-GCM authenticated encryption at rest.</li>
                  <li>Original Drive files remain in your personal cloud; StudyOS creates links only.</li>
                  <li>You can revoke or disconnect anytime with a single click.</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={loading}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-xs font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing with Google...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Connect Google Drive Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeTab === 'link' && selectedFile ? (
            /* Tab: Configure and Link Resource */
            <form onSubmit={handleLinkResource} className="space-y-4 max-w-xl mx-auto">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                {getFileIcon(selectedFile)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {selectedFile.mimeType} • Modified {new Date(selectedFile.modifiedTime).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={selectedFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  title="Preview in Google Drive"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Resource Title in StudyOS
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  required
                  placeholder="e.g. CS301 Lecture 4 - Binary Trees"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Link to Subject
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">No Subject (General)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Link to Syllabus Topic
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={e => setSelectedTopicId(e.target.value)}
                    disabled={!selectedSubjectId || availableTopics.length === 0}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedSubjectId
                        ? 'Select subject first'
                        : availableTopics.length === 0
                        ? 'No topics defined'
                        : 'No Specific Topic'}
                    </option>
                    {availableTopics.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Collection / Folder
                  </label>
                  <select
                    value={selectedCollectionId}
                    onChange={e => setSelectedCollectionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">Root Library</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>
                        📁 {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={linkTags}
                    onChange={e => setLinkTags(e.target.value)}
                    placeholder="e.g. Drive, Notes, Proofs"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Personal Study Notes / Description
                </label>
                <textarea
                  rows={2}
                  value={linkDescription}
                  onChange={e => setLinkDescription(e.target.value)}
                  placeholder="Notes about exam relevance, formula sheets, etc."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors disabled:opacity-60"
                >
                  {linkingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                  <span>Save Link to Hub</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab: Real Drive File Browser */
            <div className="space-y-3.5">
              {/* Controls bar: Search & Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search all files in Google Drive..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        loadFiles(currentFolderId, '', mimeFilter);
                      }}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>

                {/* Filters */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'folder', label: 'Folders' },
                      { id: 'document', label: 'Docs' },
                      { id: 'spreadsheet', label: 'Sheets' },
                      { id: 'presentation', label: 'Slides' },
                      { id: 'pdf', label: 'PDFs' },
                    ] as const
                  ).map(filterItem => (
                    <button
                      key={filterItem.id}
                      type="button"
                      onClick={() => handleFilterChange(filterItem.id)}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg shrink-0 transition-colors ${
                        mimeFilter === filterItem.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {filterItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breadcrumb Navigation */}
              {!search && (
                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 overflow-x-auto py-1">
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" />}
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`hover:underline truncate max-w-[120px] ${
                          idx === breadcrumbs.length - 1
                            ? 'font-bold text-neutral-900 dark:text-neutral-100'
                            : ''
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Files Table / List */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900">
                {filesLoading ? (
                  <div className="py-16 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs text-neutral-500">Fetching files from Google Drive API...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <FolderOpen className="w-8 h-8 text-neutral-400 mx-auto" />
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      No files found in this folder.
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Try searching for a specific file name or clearing filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {files.map(file => {
                      const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group"
                        >
                          <div
                            className={`flex items-center gap-3 min-w-0 flex-1 ${
                              isFolder ? 'cursor-pointer' : ''
                            }`}
                            onClick={() => {
                              if (isFolder) handleOpenFolder(file);
                            }}
                          >
                            <div className="shrink-0">{getFileIcon(file)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                                <span>
                                  {isFolder
                                    ? 'Folder'
                                    : file.size > 0
                                    ? `${(file.size / 1024).toFixed(0)} KB`
                                    : 'Google Doc'}
                                </span>
                                <span>•</span>
                                <span>Modified {new Date(file.modifiedTime).toLocaleDateString()}</span>
                                {file.shared && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-600 dark:text-blue-400">Shared</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {isFolder ? (
                              <button
                                type="button"
                                onClick={() => handleOpenFolder(file)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                              >
                                Open Folder
                              </button>
                            ) : (
                              <>
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                  title="Open in Google Drive"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleSelectFileToLink(file)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Link to Hub</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                <span>
                  Showing {files.length} {files.length === 1 ? 'item' : 'items'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={tokenHistory.length === 0 || filesLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={!nextPageToken || filesLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
