import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { API_MODE } from '../lib/api';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-surface px-4 py-8 text-ink">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-xs font-bold tracking-tighter text-surface">
            M
          </span>
          <span className="text-sm font-semibold tracking-tight">MonoTask</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {API_MODE} api
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="rounded-lg border border-line p-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <main className="mx-auto my-auto w-full max-w-md py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-line bg-surface-elevated p-7 shadow-elevated"
        >
          {children}
        </motion.div>
      </main>

      <footer className="mx-auto w-full max-w-md text-center text-xs text-ink-muted">
        Minimalist monochrome workspace — built for the Todo API spec
      </footer>
    </div>
  );
}
