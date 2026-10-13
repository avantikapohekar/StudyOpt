import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Upload,
  Link as LinkIcon,
  Video,
  FileText,
  Table as TableIcon,
  Search,
  Filter,
  Plus,
  Star,
  Pin,
  ExternalLink,
  Eye,
  Trash2,
  Brain,
  Cloud,
  CheckCircle2,
  FolderPlus,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  Folder,
  Layers,
  GraduationCap,
  Play,
  RotateCw,
  Award,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  LearningResource,
  ResourceCollection,
  FlashcardDeck,
  Flashcard,
  Subject,
} from '../types';
import { AddResourceModal } from '../components/learning/AddResourceModal';
import { DocumentViewerModal } from '../components/learning/DocumentViewerModal';
import { FlashcardStudyModal } from '../components/learning/FlashcardStudyModal';
import { GoogleDriveModal } from '../components/learning/GoogleDriveModal';
import { DeckManagerModal } from '../components/learning/DeckManagerModal';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';

interface LearningHubViewProps {
  onNavigate?: (section: any) => void;
}

type HubTab =
  | 'all'
  | 'documents'
  | 'videos'
  | 'bookmarks'
  | 'drive'
  | 'flashcards'
  | 'revision_queue';

export const LearningHubView: React.FC<LearningHubViewProps> = ({ onNavigate }) => {
  // Data state
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [collections, setCollections] = useState<ResourceCollection[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sub-navigation
  const [activeTab, setActiveTab] = useState<HubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isDeckManagerOpen, setIsDeckManagerOpen] = useState(false);
  const [selectedDeckForManage, setSelectedDeckForManage] = useState<FlashcardDeck | null>(null);
  const [selectedDeckForStudy, setSelectedDeckForStudy] = useState<FlashcardDeck | null>(null);
  const [selectedResourceForView, setSelectedResourceForView] = useState<LearningResource | null>(null);

  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, colData, deckData, dueData, subData] = await Promise.all([
        api.resources.list(),
        api.resources.getCollections(),
        api.flashcards.getDecks(),
        api.flashcards.getDueCards(),
        api.academics.getSubjects(),
      ]);

      setResources(resData.resources || []);
      setCollections(colData.collections || []);
      setDecks(deckData.decks || []);
      setDueCards(dueData.dueCards || []);
      setSubjects(subData.subjects || []);
    } catch (err) {
      console.error('Failed to load Learning Hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // Tab filter
      if (activeTab === 'documents') {
        if (!['DOCUMENT', 'MARKDOWN', 'SPREADSHEET', 'IMAGE'].includes(res.type)) return false;
      } else if (activeTab === 'videos') {
        if (!['VIDEO', 'PLAYLIST', 'COURSE'].includes(res.type) && res.source !== 'YOUTUBE' && res.source !== 'UDEMY') return false;
      } else if (activeTab === 'bookmarks') {
        if (res.type !== 'WEB_LINK' && res.source !== 'WEB') return false;
      } else if (activeTab === 'drive') {
        if (res.source !== 'GOOGLE_DRIVE' && res.type !== 'DRIVE_FILE') return false;
      }

      // Subject filter
      if (selectedSubjectId !== 'all' && res.subjectId !== selectedSubjectId) return false;

      // Collection filter
      if (selectedCollectionId !== 'all' && res.collectionId !== selectedCollectionId) return false;

      // Favorite filter
      if (onlyFavorites && !res.isFavorite) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesDesc = res.description?.toLowerCase().includes(q);
        const matchesTag = res.tagList?.some(t => t.toLowerCase().includes(q));
        const matchesSubject = res.subjectName?.toLowerCase().includes(q) || res.subjectCode?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesSubject) return false;
      }

      return true;
    });
  }, [resources, activeTab, selectedSubjectId, selectedCollectionId, onlyFavorites, searchQuery]);

  // Aggregate stats
  const totalUploadedBytes = useMemo(() => {
    return resources.reduce((acc, r) => acc + (r.fileSize || 0), 0);
  }, [resources]);

  const totalDueCardsCount = useMemo(() => {
    return decks.reduce((acc, d) => acc + (d.dueCount || 0), 0);
  }, [decks]);

  const toggleFavorite = async (resource: LearningResource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.resources.update(resource.id, {
        isFavorite: !resource.isFavorite,
      });
      setResources(prev => prev.map(r => (r.id === resource.id ? updated.resource : r)));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const togglePin = async (resource: LearningResource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.resources.update(resource.id, {
        isPinned: !resource.isPinned,
      });
      setResources(prev => prev.map(r => (r.id === resource.id ? updated.resource : r)));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await api.resources.delete(id);
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  const formatStorageMB = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'YOUTUBE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">YouTube</span>;
      case 'GOOGLE_DRIVE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">Google Drive</span>;
      case 'LOCAL_UPLOAD':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">File Upload</span>;
      case 'UDEMY':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">Course</span>;
      case 'OBSIDIAN':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">Markdown</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">Web</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Knowledge & Resources
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
              Learning Hub
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl mt-1">
              Unified repository for course slides, local document uploads, video lectures, external bookmarks, and Anki-compatible SM-2 spaced repetition decks.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsDriveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors shadow-xs"
            >
              <Cloud className="w-4 h-4 text-blue-500" />
              <span>Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedDeckForManage(null);
                setIsDeckManagerOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors shadow-xs"
            >
              <Brain className="w-4 h-4 text-amber-500" />
              <span>New Deck</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Total Materials
            </span>
            <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mt-1">
              {resources.length}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Across {collections.length} collections
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Disk Storage
            </span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {formatStorageMB(totalUploadedBytes)}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Secure uploads folder
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              SM-2 Flashcards
            </span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {decks.reduce((acc, d) => acc + (d.cardCount || 0), 0)}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {decks.length} active decks
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Due For Review
            </span>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {totalDueCardsCount}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {totalDueCardsCount > 0 ? 'Cards scheduled today' : 'All caught up!'}
            </p>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/60 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            All Materials ({resources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'documents'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            Documents & Uploads
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'videos'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-500" />
            Videos & Courses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'bookmarks'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />
            Web Bookmarks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'drive'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            Google Drive
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-amber-500" />
            Flashcard Decks ({decks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('revision_queue')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'revision_queue'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-rose-500" />
            Daily Due Queue ({totalDueCardsCount})
          </button>
        </div>

        {/* Tab-Specific Content */}
        {activeTab === 'flashcards' ? (
          /* FLASHCARDS DECKS TAB */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  SM-2 Spaced Repetition Decks
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  SuperMemo SM-2 interval scheduling with ease factors, repetition streaks, and lapse recovery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDeckForManage(null);
                  setIsDeckManagerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Deck</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map(deck => (
                <div
                  key={deck.id}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <Brain className="w-5 h-5" />
                      </span>
                      {deck.dueCount && deck.dueCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 animate-pulse">
                          {deck.dueCount} Due Now
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          Up to date
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {deck.name}
                      </h4>
                      {deck.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                          {deck.description}
                        </p>
                      )}
                    </div>

                    {deck.subjectName && (
                      <span className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        📚 {deck.subjectCode || deck.subjectName}
                      </span>
                    )}
                  </div>

                  <div className="pt-5 mt-5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {deck.cardCount} Cards Total
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeckForManage(deck);
                          setIsDeckManagerOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDeckForStudy(deck)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Study</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'revision_queue' ? (
          /* DAILY REVISION QUEUE TAB */
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-linear-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Today's Spaced Repetition Queue
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {dueCards.length} cards scheduled for recall practice today to prevent memory decay.
                </p>
              </div>

              {dueCards.length > 0 && decks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDeckForStudy(decks[0])}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Daily Review Session</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {dueCards.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                  <div className="p-3 w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    All Caught Up on Flashcard Reviews!
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                    No cards are due right now. You can add new cards to decks or explore uploaded materials.
                  </p>
                </div>
              ) : (
                dueCards.map(card => (
                  <div
                    key={card.id}
                    className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          {card.deckName}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Interval: {card.interval}d
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 max-h-12 overflow-hidden">
                        <MarkdownRenderer content={card.front} dense />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const targetDeck = decks.find(d => d.id === card.deckId);
                        if (targetDeck) setSelectedDeckForStudy(targetDeck);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* RESOURCES LIST / GRID (All, Documents, Videos, Bookmarks, Drive) */
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search resources, topics, tags..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCollectionId}
                  onChange={e => setSelectedCollectionId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="all">All Collections</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>
                      📁 {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setOnlyFavorites(prev => !prev)}
                  className={`p-2 rounded-xl border transition-colors ${
                    onlyFavorites
                      ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                  title="Filter favorites"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>

                {/* View switcher */}
                <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden p-0.5 bg-neutral-50 dark:bg-neutral-800/50">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                        : 'text-neutral-400'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                        : 'text-neutral-400'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Resources Render */}
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                <p className="text-xs text-neutral-400">Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <div className="p-3 w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  No materials found
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Try adjusting your filters or upload a new lecture slide deck, note, or bookmark.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Add First Resource
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map(res => (
                  <div
                    key={res.id}
                    onClick={() => setSelectedResourceForView(res)}
                    className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Badge and Pin / Favorite icons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {getSourceBadge(res.source)}
                          {res.isPinned && (
                            <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-500">
                              <Pin className="w-3 h-3 fill-current" />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={e => toggleFavorite(res, e)}
                            className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-lg"
                          >
                            <Star className={`w-3.5 h-3.5 ${res.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={e => togglePin(res, e)}
                            className="p-1.5 text-neutral-400 hover:text-indigo-500 rounded-lg"
                          >
                            <Pin className={`w-3.5 h-3.5 ${res.isPinned ? 'fill-indigo-500 text-indigo-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                          {res.title}
                        </h4>
                        {res.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                            {res.description}
                          </p>
                        )}
                      </div>

                      {/* Course / Collection Tag */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {res.subjectCode && (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            📚 {res.subjectCode}
                          </span>
                        )}
                        {res.collectionName && (
                          <span className="text-neutral-500 dark:text-neutral-400">
                            📁 {res.collectionName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Metadata & Launch Action */}
                    <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-neutral-400 text-[11px]">
                        {res.fileSize ? `${(res.fileSize / 1024).toFixed(0)} KB` : res.source.replace('_', ' ')}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold">
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Type & Source</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Collection</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {filteredResources.map(res => (
                      <tr
                        key={res.id}
                        onClick={() => setSelectedResourceForView(res)}
                        className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100 max-w-xs truncate">
                          {res.title}
                        </td>
                        <td className="py-3 px-4">
                          {getSourceBadge(res.source)}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {res.subjectCode || '—'}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {res.collectionName ? `📁 ${res.collectionName}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 text-[11px]">
                          {res.fileSize ? `${(res.fileSize / 1024).toFixed(0)} KB` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedResourceForView(res);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Modals */}
      <AddResourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onResourceCreated={newRes => {
          setResources(prev => [newRes, ...prev]);
        }}
        subjects={subjects}
        collections={collections}
      />

      <DocumentViewerModal
        resource={selectedResourceForView}
        isOpen={Boolean(selectedResourceForView)}
        onClose={() => setSelectedResourceForView(null)}
        onDelete={handleDeleteResource}
      />

      <FlashcardStudyModal
        deck={selectedDeckForStudy}
        isOpen={Boolean(selectedDeckForStudy)}
        onClose={() => {
          setSelectedDeckForStudy(null);
          loadData();
        }}
        onDeckCompleted={loadData}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onResourceImported={imported => {
          setResources(prev => [imported, ...prev]);
        }}
        subjects={subjects}
        collections={collections}
      />

      <DeckManagerModal
        deck={selectedDeckForManage}
        isOpen={isDeckManagerOpen}
        onClose={() => setIsDeckManagerOpen(false)}
        onDeckUpdated={loadData}
        subjects={subjects}
      />
    </div>
  );
};
