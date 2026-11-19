import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type {
  ActivityLogEntry,
  Attachment,
  Comment,
  Reminder,
  ReminderChannel,
  TimeEntry,
  TodoDetailResponse,
} from '../lib/types';
import { useToast } from './useToast';

export function useTodoDetail(todoId: string | null) {
  const [detail, setDetail] = useState<TodoDetailResponse | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!todoId) {
      setDetail(null);
      return;
    }
    try {
      setLoading(true);
      const [d, rems, te, coms, act, atts] = await Promise.all([
        api.getTodo(todoId),
        api.getReminders(todoId),
        api.getTimeEntries(todoId),
        api.getComments(todoId),
        api.getActivity(todoId),
        api.getAttachments(todoId),
      ]);
      setDetail(d);
      setReminders(rems);
      setTimeEntries(te.entries);
      setComments(coms);
      setActivity(act);
      setAttachments(atts);
    } catch (err) {
      toast('Failed to load task details', { description: (err as Error).message, variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [todoId, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSubtask = useCallback(
    async (title: string) => {
      if (!todoId || !title.trim()) return;
      await api.createSubtask(todoId, title);
      await refresh();
    },
    [todoId, refresh]
  );

  const toggleSubtask = useCallback(
    async (subtaskId: string, completed: boolean) => {
      if (!todoId) return;
      await api.updateSubtask(todoId, subtaskId, { completed });
      await refresh();
    },
    [todoId, refresh]
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      if (!todoId) return;
      await api.deleteSubtask(todoId, subtaskId);
      await refresh();
    },
    [todoId, refresh]
  );

  const addDependency = useCallback(
    async (dependsOnTodoId: string) => {
      if (!todoId) return;
      try {
        await api.addDependency(todoId, dependsOnTodoId);
        await refresh();
        toast('Dependency added', { variant: 'success' });
      } catch (err) {
        toast('Cannot add dependency', { description: (err as Error).message, variant: 'warning' });
      }
    },
    [todoId, refresh, toast]
  );

  const removeDependency = useCallback(
    async (dependsOnId: string) => {
      if (!todoId) return;
      await api.removeDependency(todoId, dependsOnId);
      await refresh();
      toast('Dependency removed');
    },
    [todoId, refresh, toast]
  );

  const addReminder = useCallback(
    async (remindAt: string, channel: ReminderChannel) => {
      if (!todoId) return;
      await api.createReminder(todoId, { remindAt, channel });
      await refresh();
      toast('Reminder scheduled', { variant: 'success' });
    },
    [todoId, refresh, toast]
  );

  const deleteReminder = useCallback(
    async (reminderId: string) => {
      if (!todoId) return;
      await api.deleteReminder(todoId, reminderId);
      await refresh();
      toast('Reminder removed');
    },
    [todoId, refresh, toast]
  );

  const startTimer = useCallback(
    async (note?: string) => {
      if (!todoId) return;
      try {
        await api.startTimer(todoId, note);
        await refresh();
        toast('Timer started', { variant: 'success' });
      } catch (err) {
        toast('Timer conflict', { description: (err as Error).message, variant: 'warning' });
      }
    },
    [todoId, refresh, toast]
  );

  const stopTimer = useCallback(
    async (note?: string) => {
      if (!todoId) return;
      await api.stopTimer(todoId, note);
      await refresh();
      toast('Timer stopped & logged', { variant: 'success' });
    },
    [todoId, refresh, toast]
  );

  const logTimeEntry = useCallback(
    async (startedAt: string, endedAt: string, note?: string) => {
      if (!todoId) return;
      try {
        await api.createTimeEntry(todoId, { startedAt, endedAt, note });
        await refresh();
        toast('Time entry logged', { variant: 'success' });
      } catch (err) {
        toast('Invalid time entry', { description: (err as Error).message, variant: 'danger' });
      }
    },
    [todoId, refresh, toast]
  );

  const deleteTimeEntry = useCallback(
    async (entryId: string) => {
      if (!todoId) return;
      await api.deleteTimeEntry(todoId, entryId);
      await refresh();
    },
    [todoId, refresh]
  );

  const addComment = useCallback(
    async (body: string) => {
      if (!todoId || !body.trim()) return;
      await api.createComment(todoId, body);
      await refresh();
    },
    [todoId, refresh]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!todoId) return;
      await api.deleteComment(todoId, commentId);
      await refresh();
    },
    [todoId, refresh]
  );

  const uploadAttachment = useCallback(
    async (file: File) => {
      if (!todoId) return;
      await api.uploadAttachment(todoId, file);
      await refresh();
      toast('Attachment uploaded', { description: file.name, variant: 'success' });
    },
    [todoId, refresh, toast]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      if (!todoId) return;
      await api.deleteAttachment(todoId, attachmentId);
      await refresh();
      toast('Attachment deleted');
    },
    [todoId, refresh, toast]
  );

  return {
    detail,
    reminders,
    timeEntries,
    comments,
    activity,
    attachments,
    loading,
    refresh,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addDependency,
    removeDependency,
    addReminder,
    deleteReminder,
    startTimer,
    stopTimer,
    logTimeEntry,
    deleteTimeEntry,
    addComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
  };
}
