import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { List, ListMember } from '../lib/types';
import { useToast } from './useToast';

export function useLists(enabled = true) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await api.getLists();
      setLists(data);
    } catch (err) {
      toast('Failed to load lists', { description: (err as Error).message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [enabled, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createList = useCallback(
    async (input: { name: string; color?: string | null; icon?: string | null }) => {
      const created = await api.createList(input);
      setLists((prev) => [...prev, created]);
      toast('List created', { description: created.name, variant: 'success' });
      return created;
    },
    [toast]
  );

  const updateList = useCallback(
    async (listId: string, input: { name?: string; color?: string | null; icon?: string | null }) => {
      const updated = await api.updateList(listId, input);
      setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...updated } : l)));
      toast('List updated', { variant: 'success' });
      return updated;
    },
    [toast]
  );

  const deleteList = useCallback(
    async (listId: string, deleteTodos = false) => {
      await api.deleteList(listId, deleteTodos);
      setLists((prev) => prev.filter((l) => l.id !== listId));
      toast('List deleted');
    },
    [toast]
  );

  return { lists, loading, refresh, createList, updateList, deleteList };
}

export function useListMembers(listId: string | null) {
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!listId) {
      setMembers([]);
      return;
    }
    try {
      setLoading(true);
      const data = await api.getListMembers(listId);
      setMembers(data);
    } catch (err) {
      toast('Failed to load members', { description: (err as Error).message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [listId, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMember = useCallback(
    async (email: string, role: 'editor' | 'viewer') => {
      if (!listId) return;
      const added = await api.addListMember(listId, { email, role });
      setMembers((prev) => [...prev, added]);
      toast('Member added', { description: `${email} (${role})`, variant: 'success' });
      return added;
    },
    [listId, toast]
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: 'editor' | 'viewer') => {
      if (!listId) return;
      const updated = await api.updateListMember(listId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: updated.role } : m)));
      toast('Role updated', { variant: 'success' });
    },
    [listId, toast]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!listId) return;
      await api.removeListMember(listId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast('Member removed');
    },
    [listId, toast]
  );

  return { members, loading, refresh, addMember, updateMemberRole, removeMember };
}
