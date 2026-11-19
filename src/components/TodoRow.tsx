import { motion } from 'framer-motion';
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Clock,
  MoreHorizontal,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { List, Todo } from '../lib/types';
import { cn, formatShortDate, isDueToday, isOverdue } from '../lib/utils';
import { Badge } from './ui/Badge';
import { Checkbox } from './ui/Checkbox';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from './ui/Dropdown';

interface TodoRowProps {
  todo: Todo;
  list?: List;
  isTrash?: boolean;
  isArchived?: boolean;
  selected: boolean;
  selectionActive: boolean;
  onSelectToggle: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onInspect: (id: string) => void;
  onSnooze: (id: string, duration: '1h' | '1d' | '3d' | '1w') => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

const PRIORITY_STYLES = {
  high: { dot: 'bg-status-danger', label: 'High', badge: 'danger' as const },
  medium: { dot: 'bg-status-warning', label: 'Med', badge: 'warning' as const },
  low: { dot: 'bg-ink-muted/60', label: 'Low', badge: 'default' as const },
};

export function TodoRow({
  todo,
  list,
  isTrash,
  isArchived,
  selected,
  selectionActive,
  onSelectToggle,
  onToggleComplete,
  onInspect,
  onSnooze,
  onArchive,
  onUnarchive,
  onDelete,
  onRestore,
  onPermanentDelete,
}: TodoRowProps) {
  const overdue = isOverdue(todo.dueDate, todo.completed);
  const dueToday = !overdue && isDueToday(todo.dueDate) && !todo.completed;
  const pStyle = PRIORITY_STYLES[todo.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={() => !isTrash && onInspect(todo.id)}
      className={cn(
        'group flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-all',
        selected
          ? 'border-ink bg-surface-subtle'
          : 'border-line bg-surface hover:border-line-strong hover:bg-surface-subtle/50',
        !isTrash && 'cursor-pointer'
      )}
    >
      {/* Bulk select checkbox */}
      {!isTrash && (
        <div
          className={cn(
            'mt-0.5 transition-opacity',
            selectionActive || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Checkbox
            variant="select"
            checked={selected}
            onChange={() => onSelectToggle(todo.id)}
            ariaLabel={`Select ${todo.title}`}
          />
        </div>
      )}

      {/* Task completion checkbox */}
      {!isTrash && (
        <div className="mt-0.5">
          <Checkbox
            variant="task"
            checked={todo.completed}
            onChange={() => onToggleComplete(todo.id)}
            ariaLabel={`Mark ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}
          />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              todo.completed ? 'bg-status-success' : pStyle.dot
            )}
            title={`Priority: ${todo.priority}`}
          />
          <p
            className={cn(
              'truncate text-sm font-medium tracking-tight transition-colors',
              todo.completed ? 'text-ink-muted line-through' : 'text-ink'
            )}
          >
            {todo.title}
          </p>
          {todo.recurrence && (
            <Repeat className="h-3 w-3 shrink-0 text-ink-muted" aria-label="Recurring task" />
          )}
        </div>

        {todo.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-secondary">{todo.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {list && <Badge variant="default">{list.name}</Badge>}

          {todo.dueDate && (
            <Badge variant={overdue ? 'danger' : dueToday ? 'info' : 'default'}>
              <Calendar className="h-2.5 w-2.5" />
              {overdue ? `Overdue · ${formatShortDate(todo.dueDate)}` : formatShortDate(todo.dueDate)}
            </Badge>
          )}

          {todo.priority === 'high' && !todo.completed && (
            <Badge variant="danger">High</Badge>
          )}

          {todo.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {isTrash ? (
          <>
            <button
              type="button"
              onClick={() => onRestore(todo.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink transition-colors hover:border-ink"
            >
              <RotateCcw className="h-3 w-3" />
              Restore
            </button>
            <button
              type="button"
              onClick={() => onPermanentDelete(todo.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-status-danger/30 px-2 py-1 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger/10"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </>
        ) : (
          <Dropdown>
            <DropdownTrigger asChild>
              <button
                type="button"
                aria-label="Task actions"
                className="rounded-lg p-1.5 text-ink-muted opacity-0 transition-all hover:bg-surface hover:text-ink group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownTrigger>
            <DropdownContent align="end">
              <DropdownItem onClick={() => onSnooze(todo.id, '1d')}>
                <Clock className="h-3.5 w-3.5" />
                Snooze +1 day
              </DropdownItem>
              <DropdownItem onClick={() => onSnooze(todo.id, '1w')}>
                <Clock className="h-3.5 w-3.5" />
                Snooze +1 week
              </DropdownItem>
              <DropdownSeparator />
              {isArchived ? (
                <DropdownItem onClick={() => onUnarchive(todo.id)}>
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Unarchive
                </DropdownItem>
              ) : (
                <DropdownItem onClick={() => onArchive(todo.id)}>
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </DropdownItem>
              )}
              <DropdownItem danger onClick={() => onDelete(todo.id)}>
                <Trash2 className="h-3.5 w-3.5" />
                Move to Trash
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      </div>
    </motion.div>
  );
}
