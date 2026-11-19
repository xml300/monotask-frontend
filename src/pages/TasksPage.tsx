import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, Plus, Trash2, Users } from 'lucide-react';
import { useTodos, type TodoViewMode } from '../hooks/useTodos';
import type { BulkActionType, CreateTodoInput, List, TodoFilters } from '../lib/types';
import { BulkActionBar } from '../components/BulkActionBar';
import { FilterBar } from '../components/FilterBar';
import { TodoInspector } from '../components/TodoInspector';
import { TodoRow } from '../components/TodoRow';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface TasksPageProps {
  viewMode: TodoViewMode;
  activeList?: List;
  lists: List[];
  onOpenNewTodo: () => void;
  onManageListMembers?: (list: List) => void;
  onTodosMutated: () => void;
}

const VIEW_TITLES: Record<TodoViewMode, { title: string; subtitle: string }> = {
  all: { title: 'All Tasks', subtitle: 'Every active task across your personal inbox and shared lists.' },
  inbox: { title: 'Inbox', subtitle: 'Unassigned personal tasks waiting to be organized.' },
  today: { title: 'Today', subtitle: 'Tasks due before the end of today.' },
  overdue: { title: 'Overdue', subtitle: 'Open tasks past their due date.' },
  archived: { title: 'Archived', subtitle: 'Completed or shelved tasks kept for reference.' },
  trash: { title: 'Trash', subtitle: 'Soft-deleted tasks you can restore or permanently remove.' },
  list: { title: 'List', subtitle: 'Tasks inside this list.' },
};

export function TasksPage({
  viewMode,
  activeList,
  lists,
  onOpenNewTodo,
  onManageListMembers,
  onTodosMutated,
}: TasksPageProps) {
  const [filters, setFilters] = useState<TodoFilters>({ sortBy: 'createdAt', order: 'desc' });
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  const {
    todos,
    total,
    loading,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    restoreTodo,
    permanentDeleteTodo,
    emptyTrash,
    archiveTodo,
    unarchiveTodo,
    snoozeTodo,
    bulkAction,
    exportTodos,
    importTodos,
  } = useTodos(viewMode, filters, activeList?.id);

  const listMap = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);

  const heading =
    viewMode === 'list' && activeList
      ? { title: activeList.name, subtitle: `${activeList.memberCount ?? 1} member(s)` }
      : VIEW_TITLES[viewMode];

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const payload: CreateTodoInput = {
      title: quickTitle.trim(),
      listId: viewMode === 'list' && activeList ? activeList.id : null,
    };
    await createTodo(payload);
    setQuickTitle('');
    onTodosMutated();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulk = async (action: BulkActionType) => {
    await bulkAction({ ids: selectedIds, action });
    setSelectedIds([]);
    onTodosMutated();
  };

  const isTrash = viewMode === 'trash';
  const isArchived = viewMode === 'archived';

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{heading.title}</h1>
            <span className="rounded-full border border-line bg-surface-subtle px-2 py-0.5 font-mono text-xs text-ink-secondary">
              {total}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{heading.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'list' && activeList && onManageListMembers && (
            <Button variant="outline" size="md" onClick={() => onManageListMembers(activeList)}>
              <Users className="h-3.5 w-3.5" />
              Members
            </Button>
          )}
          {isTrash && todos.length > 0 && (
            <Button
              variant="danger"
              size="md"
              onClick={async () => {
                await emptyTrash();
                onTodosMutated();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Empty Trash
            </Button>
          )}
          {!isTrash && !isArchived && (
            <Button size="md" onClick={onOpenNewTodo}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Quick inline add */}
      {!isTrash && !isArchived && (
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <Input
            id="input-quick-add"
            placeholder={`Quick add to ${viewMode === 'list' && activeList ? activeList.name : 'Inbox'} and press Enter...`}
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="h-10 bg-surface-subtle/50"
          />
          <Button type="submit" variant="secondary" className="h-10 px-4" disabled={!quickTitle.trim()}>
            Add
          </Button>
        </form>
      )}

      {/* Filters & Export/Import */}
      {!isTrash && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onExport={exportTodos}
          onImport={async (items) => {
            await importTodos(items);
            onTodosMutated();
          }}
        />
      )}

      {/* Task List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-line bg-surface-subtle/60"
              />
            ))}
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink">Nothing here right now</p>
            <p className="mt-1 text-xs text-ink-muted">
              {isTrash
                ? 'Deleted tasks will show up here for recovery.'
                : 'Create a task above or adjust your filters.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {todos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                list={todo.listId ? listMap.get(todo.listId) : undefined}
                isTrash={isTrash}
                isArchived={isArchived}
                selected={selectedIds.includes(todo.id)}
                selectionActive={selectedIds.length > 0}
                onSelectToggle={toggleSelect}
                onToggleComplete={async (id) => {
                  await toggleTodo(id);
                  onTodosMutated();
                }}
                onInspect={(id) => setInspectedId(id)}
                onSnooze={snoozeTodo}
                onArchive={async (id) => {
                  await archiveTodo(id);
                  onTodosMutated();
                }}
                onUnarchive={async (id) => {
                  await unarchiveTodo(id);
                  onTodosMutated();
                }}
                onDelete={async (id) => {
                  await deleteTodo(id);
                  onTodosMutated();
                }}
                onRestore={async (id) => {
                  await restoreTodo(id);
                  onTodosMutated();
                }}
                onPermanentDelete={permanentDeleteTodo}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <BulkActionBar
        count={selectedIds.length}
        onAction={handleBulk}
        onClear={() => setSelectedIds([])}
      />

      <TodoInspector
        todoId={inspectedId}
        allTodos={todos}
        lists={lists}
        onClose={() => setInspectedId(null)}
        onUpdateTodo={async (id, input) => {
          await updateTodo(id, input);
          onTodosMutated();
        }}
        onToggleTodo={async (id) => {
          await toggleTodo(id);
          onTodosMutated();
        }}
      />
    </div>
  );
}
