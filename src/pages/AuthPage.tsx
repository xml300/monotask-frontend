import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';
import { API_MODE } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function AuthPage() {
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex@monotask.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            {mode === 'login' ? 'Sign in to MonoTask' : 'Create your account'}
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            {mode === 'login'
              ? 'Focused task management backed by the Todo API.'
              : 'Start organizing projects, subtasks, and time tracking.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="mb-1 block text-xs font-medium text-ink-secondary">
                Name
              </label>
              <Input
                id="auth-name"
                required
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1 block text-xs font-medium text-ink-secondary">
              Email
            </label>
            <Input
              id="auth-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-xs font-medium text-ink-secondary">
              Password
            </label>
            <Input
              id="auth-password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
              {error}
            </p>
          )}

          <Button id="btn-auth-submit" type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Continue' : 'Create Account'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {API_MODE === 'mock' && (
          <div className="border-t border-line pt-4">
            <Button
              id="btn-demo-signin"
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={demoLogin}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Enter Demo Workspace (Alex Rivera)
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-ink-secondary">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
