import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; college?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  completeOnboarding: (data: {
    college?: string;
    semesterName?: string;
    subjects?: Array<{ name: string; code: string; color?: string; credits?: number }>;
    targetDailyMinutes?: number;
    theme?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await api.auth.me();
      setUser(res.user);
    } catch (err) {
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('studyos_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('studyos_unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setStoredToken(res.token);
    setUser(res.user);
  };

  const register = async (data: { name: string; email: string; password: string; college?: string }) => {
    const res = await api.auth.register(data);
    setStoredToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    removeStoredToken();
    setUser(null);
  };

  const updateProfile = async (profile: Partial<User>) => {
    const res = await api.auth.updateProfile(profile);
    setUser(res.user);
  };

  const completeOnboarding = async (data: {
    college?: string;
    semesterName?: string;
    subjects?: Array<{ name: string; code: string; color?: string; credits?: number }>;
    targetDailyMinutes?: number;
    theme?: string;
  }) => {
    const res = await api.auth.submitOnboarding(data);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        completeOnboarding,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
