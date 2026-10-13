import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavSection } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { QuickAddModal } from './components/QuickAddModal';

// Views
import { DashboardView } from './views/DashboardView';
import { PlannerView } from './views/PlannerView';
import { AcademicsView } from './views/AcademicsView';
import { TasksView } from './views/TasksView';
import { ExamsView } from './views/ExamsView';
import { HabitsView } from './views/HabitsView';
import { FocusTimerView } from './views/FocusTimerView';
import { NotesView } from './views/NotesView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { LearningHubView } from './views/LearningHubView';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('studyos_theme');
      if (stored === 'light') return false;
      if (stored === 'dark') return true;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return false;
      }
    } catch {
      // ignore localStorage errors
    }
    return false; // Default to clean light mode when explicitly requested or system prefers light
  });

  // Sync theme with html root class and style
  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
        localStorage.setItem('studyos_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        localStorage.setItem('studyos_theme', 'light');
      }
    } catch {
      // ignore
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-medium text-neutral-400">Loading StudyOS Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* 1. Main Navigation Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Viewport Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <TopNav
          currentSection={currentSection}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          activeSemesterName="Fall Semester 2026"
        />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {currentSection === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentSection}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}
          {currentSection === 'learning' && (
            <LearningHubView onNavigate={setCurrentSection} />
          )}
          {currentSection === 'planner' && <PlannerView />}
          {currentSection === 'academics' && <AcademicsView />}
          {currentSection === 'tasks' && <TasksView />}
          {currentSection === 'exams' && <ExamsView />}
          {currentSection === 'habits' && <HabitsView />}
          {currentSection === 'focus' && <FocusTimerView />}
          {currentSection === 'notes' && <NotesView />}
          {currentSection === 'analytics' && <AnalyticsView />}
          {currentSection === 'settings' && (
            <SettingsView isDark={isDark} onToggleTheme={toggleTheme} />
          )}
        </main>
      </div>

      {/* 3. Global Modals */}
      <AuthModal isOpen={!user && !loading} />
      <OnboardingModal
        isOpen={Boolean(user && !user.onboardingCompleted)}
        onFinished={() => {}}
      />
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
