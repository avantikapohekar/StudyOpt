import React from 'react';
import { Menu, Plus, Sun, Moon } from 'lucide-react';
import { NavSection } from './Sidebar';

interface TopNavProps {
  currentSection: NavSection;
  onOpenMobileMenu: () => void;
  onOpenQuickAdd: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  activeSemesterName?: string | null;
}

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Academic Dashboard',
  learning: 'Learning Hub & Resources',
  planner: 'Planner & Timetable',
  academics: 'Academics & Syllabus Tracker',
  tasks: 'Tasks & Assignment Tracker',
  exams: 'Exam Center',
  habits: 'Goals & Habit Tracker',
  focus: 'Focus Study Timer',
  notes: 'Notes & Knowledge Base',
  analytics: 'Academic Study Analytics',
  settings: 'Workspace Settings',
};

export const TopNav: React.FC<TopNavProps> = ({
  currentSection,
  onOpenMobileMenu,
  onOpenQuickAdd,
  isDark,
  onToggleTheme,
  activeSemesterName,
}) => {
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md px-4 md:px-6">
      {/* Zone 1: Section Title & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>StudyOS</span>
            <span aria-hidden="true">/</span>
            <span className="truncate">{activeSemesterName || 'Current Semester'}</span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
            {SECTION_TITLES[currentSection]}
          </h1>
        </div>
      </div>

      {/* Zone 2: Date & Contextual Status */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1.5 font-medium tabular-nums">
          <span>{todayFormatted}</span>
        </div>
      </div>

      {/* Zone 3: Actions (Theme Toggle & Primary Quick Add CTA) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-98 transition-all shadow-xs whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </button>
      </div>
    </header>
  );
};
