import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastVariant = 'default' | 'success' | 'danger' | 'warning';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (title: string, options?: { description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, options?: { description?: string; variant?: ToastVariant }) => {
      const id = crypto.randomUUID();
      const variant = options?.variant ?? 'default';
      setItems((prev) => [...prev.slice(-3), { id, title, description: options?.description, variant }]);
      setTimeout(() => dismiss(id), 3600);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface-elevated px-4 py-3 text-sm shadow-elevated',
                item.variant === 'danger' && 'border-status-danger/40',
                item.variant === 'success' && 'border-status-success/40',
                item.variant === 'warning' && 'border-status-warning/40',
                item.variant === 'default' && 'border-line-strong'
              )}
            >
              {item.variant === 'success' && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
              )}
              {item.variant === 'danger' && (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" />
              )}
              {item.variant === 'warning' && (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
              )}
              {item.variant === 'default' && (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-secondary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-ink-secondary">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="rounded-md p-0.5 text-ink-muted transition-colors hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
