import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarClock,
  Folder,
  Inbox,
  Layers,
  LogOut,
  Menu,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { API_MODE, resetMockDb } from '../lib/api';
import type { List } from '../lib/types';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

export type NavSection =
  | { type: 'view'; view: 'all' | 'inbox' | 'today' | 'overdue' | 'archived' | 'trash' }
  | { type: 'list'; listId: string }
  | { type: 'stats' };

interface AppLayoutProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  lists: List[];
  onOpenNewTodo: () => void;
  onOpenNewList: () => void;
  onManageListMembers: (list: List) => void;
  children: React.ReactNode;
}

export function AppLayout({
  activeNav,
  onSelectNav,
  lists,
  onOpenNewTodo,
  onOpenNewList,
  onManageListMembers,
  children,
}: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryItems: Array<{
    key: 'all' | 'inbox' | 'today' | 'overdue';
    label: string;
    icon: React.ElementType;
    accent?: string;
  }> = [
    { key: 'all', label: 'All Tasks', icon: Layers },
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'today', label: 'Today', icon: CalendarClock },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle, accent: 'text-status-danger' },
  ];

  const isSelected = (nav: NavSection) => JSON.stringify(activeNav) === JSON.stringify(nav);

  const handleSelect = (nav: NavSection) => {
    onSelectNav(nav);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-surface-subtle/60 px-3 py-4">
      <div className="space-y-6 overflow-y-auto pr-0.5">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-xs font-bold tracking-tighter text-surface">
              M
            </span>
            <div>
              <p className="text-sm font-semibold leading-none tracking-tight text-ink">MonoTask</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                {API_MODE} mode
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-ink-muted hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-1">
          <Button id="btn-new-task-sidebar" onClick={onOpenNewTodo} className="w-full justify-center">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        <nav className="space-y-0.5" aria-label="Primary views">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isSelected({ type: 'view', view: item.key });
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect({ type: 'view', view: item.key })}
                className={cn(
                  'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-ink text-surface'
                    : 'text-ink-secondary hover:bg-surface hover:text-ink'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    !active && item.accent ? item.accent : ''
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleSelect({ type: 'stats' })}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              isSelected({ type: 'stats' })
                ? 'bg-ink text-surface'
                : 'text-ink-secondary hover:bg-surface hover:text-ink'
            )}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>Analytics</span>
          </button>
        </nav>

        <div>
          <div className="mb-1.5 flex items-center justify-between px-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Lists
            </span>
            <button
              type="button"
              id="btn-new-list"
              onClick={onOpenNewList}
              aria-label="Create list"
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {lists.map((list) => {
              const active = isSelected({ type: 'list', listId: list.id });
              return (
                <div
                  key={list.id}
                  className={cn(
                    'group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-ink text-surface'
                      : 'text-ink-secondary hover:bg-surface hover:text-ink'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect({ type: 'list', listId: list.id })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium"
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 opacity-75" />
                    <span className="truncate">{list.name}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {typeof list.todoCount === 'number' && list.todoCount > 0 && (
                      <span
                        className={cn(
                          'font-mono text-[11px]',
                          active ? 'text-surface/75' : 'text-ink-muted'
                        )}
                      >
                        {list.todoCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageListMembers(list);
                      }}
                      title="Manage members"
                      aria-label={`Manage members of ${list.name}`}
                      className={cn(
                        'rounded p-1 opacity-0 transition-opacity group-hover:opacity-100',
                        active ? 'hover:bg-surface/15' : 'hover:bg-surface-subtle'
                      )}
                    >
                      <Users className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => handleSelect({ type: 'view', view: 'archived' })}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
              isSelected({ type: 'view', view: 'archived' })
                ? 'bg-ink text-surface'
                : 'text-ink-secondary hover:bg-surface hover:text-ink'
            )}
          >
            <Archive className="h-4 w-4" />
            <span>Archived</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect({ type: 'view', view: 'trash' })}
            className={cn(
              'mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
              isSelected({ type: 'view', view: 'trash' })
                ? 'bg-ink text-surface'
                : 'text-ink-secondary hover:bg-surface hover:text-ink'
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-line pt-3">
        {API_MODE === 'mock' && (
          <button
            type="button"
            onClick={() => {
              resetMockDb();
              window.location.reload();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset mock data
          </button>
        )}
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-[11px] text-ink-muted">{user?.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-md p-1.5 text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-status-danger"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface text-ink">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-surface lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/85 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg border border-line p-1.5 text-ink"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold tracking-tight">MonoTask</span>
          <Button size="sm" onClick={onOpenNewTodo}>
            <Plus className="h-3.5 w-3.5" />
            Task
          </Button>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
