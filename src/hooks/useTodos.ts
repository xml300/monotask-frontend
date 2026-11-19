import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type {
  BulkActionInput,
  CreateTodoInput,
  Todo,
  TodoFilters,
  UpdateTodoInput,
} from '../lib/types';
import { downloadTextFile } from '../lib/utils';
import { useToast } from './useToast';

export type TodoViewMode = 'all' | 'inbox' | 'today' | 'overdue' | 'archived' | 'trash' | 'list';

export function useTodos(viewMode: TodoViewMode, filters: TodoFilters, listId?: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const serializedFilters = useMemo(() => JSON.stringify(filters), [filters]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const parsed: TodoFilters = JSON.parse(serializedFilters);
      if (viewMode === 'trash') {
        const res = await api.getTrash();
        setTodos(res.data);
        setTotal(res.meta.total);
        return;
      }

      if (viewMode === 'list' && listId) {
        const res = await api.getListTodos(listId, parsed);
        setTodos(res.data);
        setTotal(res.meta.total);
        return;
      }

      const query: TodoFilters = { ...parsed };
      if (viewMode === 'inbox') query.listId = 'inbox';
      if (viewMode === 'archived') query.archived = true;
      if (viewMode === 'overdue') query.overdue = true;
      if (viewMode === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.dueAfter = start.toISOString();
        query.dueBefore = end.toISOString();
      }

      const res = await api.getTodos(query);
      setTodos(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      toast('Failed to load tasks', { description: (err as Error).message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [viewMode, listId, serializedFilters, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTodo = useCallback(
    async (input: CreateTodoInput) => {
      const created = await api.createTodo(input);
      await refresh();
      toast('Task created', { description: created.title, variant: 'success' });
      return created;
    },
    [refresh, toast]
  );

  const updateTodo = useCallback(
    async (id: string, input: UpdateTodoInput) => {
      const updated = await api.updateTodo(id, input);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    },
    []
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      try {
        const res = await api.toggleTodo(id);
        setTodos((prev) => {
          const updated = prev.map((t) => (t.id === id ? res.todo : t));
          return res.nextOccurrence ? [res.nextOccurrence, ...updated] : updated;
        });
        if (res.nextOccurrence) {
          toast('Recurring task spawned', {
            description: `Next occurrence scheduled for ${new Date(res.nextOccurrence.dueDate!).toLocaleDateString()}`,
            variant: 'success',
          });
        }
        return res;
      } catch (err) {
        toast('Unable to toggle task', { description: (err as Error).message, variant: 'warning' });
        throw err;
      }
    },
    [toast]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast('Moved to trash');
    },
    [toast]
  );

  const restoreTodo = useCallback(
    async (id: string) => {
      await api.restoreTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast('Task restored', { variant: 'success' });
    },
    [toast]
  );

  const permanentDeleteTodo = useCallback(
    async (id: string) => {
      await api.permanentDeleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast('Permanently deleted');
    },
    [toast]
  );

  const emptyTrash = useCallback(async () => {
    const res = await api.emptyTrash();
    setTodos([]);
    toast('Trash emptied', { description: `${res.deletedCount} tasks removed` });
  }, [toast]);

  const archiveTodo = useCallback(
    async (id: string) => {
      await api.archiveTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast('Task archived');
    },
    [toast]
  );

  const unarchiveTodo = useCallback(
    async (id: string) => {
      await api.unarchiveTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast('Task unarchived', { variant: 'success' });
    },
    [toast]
  );

  const snoozeTodo = useCallback(
    async (id: string, duration: '1h' | '1d' | '3d' | '1w') => {
      const updated = await api.snoozeTodo(id, { duration });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast('Task snoozed', { description: `Deferred by ${duration}` });
      return updated;
    },
    [toast]
  );

  const assignTodo = useCallback(
    async (id: string, assigneeId: string | null) => {
      const updated = await api.assignTodo(id, assigneeId);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast(assigneeId ? 'Task assigned' : 'Task unassigned');
      return updated;
    },
    [toast]
  );

  const bulkAction = useCallback(
    async (input: BulkActionInput) => {
      const res = await api.bulkAction(input);
      await refresh();
      if (res.failed.length > 0) {
        toast(`${res.succeeded.length} updated, ${res.failed.length} failed`, {
          description: res.failed[0]?.reason,
          variant: 'warning',
        });
      } else {
        toast(`${res.succeeded.length} tasks updated`, { variant: 'success' });
      }
      return res;
    },
    [refresh, toast]
  );

  const exportTodos = useCallback(
    async (format: 'json' | 'csv' | 'ics') => {
      const file = await api.exportTodos(format, filters);
      downloadTextFile(file.content, file.fileName, file.mimeType);
      toast('Export downloaded', { description: file.fileName, variant: 'success' });
    },
    [filters, toast]
  );

  const importTodos = useCallback(
    async (items: CreateTodoInput[]) => {
      const res = await api.importTodos(items);
      await refresh();
      toast(`Imported ${res.importedCount} tasks`, {
        description: res.errors.length ? `${res.errors.length} rows skipped` : undefined,
        variant: 'success',
      });
      return res;
    },
    [refresh, toast]
  );

  return {
    todos,
    total,
    loading,
    refresh,
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
    assignTodo,
    bulkAction,
    exportTodos,
    importTodos,
  };
}
