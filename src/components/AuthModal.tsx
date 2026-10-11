import React, { useState } from 'react';
import { BookOpen, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        if (!name || !email || !password) {
          throw new Error('Please fill in all required fields');
        }
        await register({ name, email, password, college });
      } else {
        if (!email || !password) {
          throw new Error('Please enter your email and password');
        }
        await login(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login('alex.chen@university.edu', 'Password123!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log in with demo account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              StudyOS
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isRegistering ? 'Create your personal academic workspace' : 'Log in to your student workspace'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex.chen@university.edu"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                College / University (Optional)
              </label>
              <input
                type="text"
                value={college}
                onChange={e => setCollege(e.target.value)}
                placeholder="Stanford University"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            <span>{isRegistering ? 'Create Workspace' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-xs text-neutral-500 dark:text-neutral-400">
            <span className="bg-white dark:bg-neutral-900 px-2">Quick Evaluation</span>
          </div>
        </div>

        {/* Demo Account Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={submitting}
          className="w-full flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Load Demo Student (Alex Chen, CS)</span>
          </div>
          <span className="font-mono text-[11px] opacity-75">1-Click</span>
        </button>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 underline"
          >
            {isRegistering
              ? 'Already have an account? Sign in'
              : "Don't have an account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
};
