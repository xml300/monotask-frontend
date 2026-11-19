import { AnimatePresence, motion } from 'framer-motion';
import { Archive, CheckCheck, Trash2, X } from 'lucide-react';
import type { BulkActionType } from '../lib/types';

interface BulkActionBarProps {
  count: number;
  onAction: (action: BulkActionType) => void;
  onClear: () => void;
}

export function BulkActionBar({ count, onAction, onClear }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-ink px-4 py-2 text-xs font-medium text-surface shadow-pill"
        >
          <span className="font-mono font-semibold">{count} selected</span>
          <span className="h-3.5 w-px bg-surface/20" />
          <button
            type="button"
            onClick={() => onAction('complete')}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors hover:bg-surface/15"
          >
            <CheckCheck className="h-3.5 w-3.5 text-status-success" />
            Complete
          </button>
          <button
            type="button"
            onClick={() => onAction('archive')}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors hover:bg-surface/15"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <button
            type="button"
            onClick={() => onAction('delete')}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-status-danger transition-colors hover:bg-surface/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Trash
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="ml-1 rounded-full p-1 text-surface/70 transition-colors hover:bg-surface/15 hover:text-surface"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
