import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  CheckSquare,
  Award,
  Flame,
  Timer,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LogOut,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DatabaseStatusModal } from './DatabaseStatusModal';

export type NavSection =
  | 'dashboard'
  | 'learning'
  | 'planner'
  | 'academics'
  | 'tasks'
  | 'exams'
  | 'habits'
  | 'focus'
  | 'notes'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ElementType; badge?: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learning', label: 'Learning Hub', icon: BookOpen, badge: 'Hub' },
  { id: 'planner', label: 'Planner & Timetable', icon: Calendar },
  { id: 'academics', label: 'Academics & Syllabus', icon: GraduationCap },
  { id: 'tasks', label: 'Tasks & Assignments', icon: CheckSquare },
  { id: 'exams', label: 'Exam Center', icon: Award },
  { id: 'habits', label: 'Goals & Habits', icon: Flame },
  { id: 'focus', label: 'Focus Timer', icon: Timer },
  { id: 'notes', label: 'Notes & Wiki', icon: FileText },
  { id: 'analytics', label: 'Study Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-all duration-200 ease-in-out md:static ${
          collapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block font-bold text-base tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                  StudyOS
                </span>
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  Academic Workspace
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-200'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate whitespace-nowrap text-left flex-1">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Workspace Info Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {user?.name || 'Student'}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {user?.college || 'College Workspace'}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsDbModalOpen(true)}
                  title="MySQL Database Status"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <Database className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={logout}
                  title="Log out"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <DatabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />
    </>
  );
};
