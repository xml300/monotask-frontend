import React, { useState } from 'react';
import type { CreateTodoInput, List, Priority, RecurrenceFrequency } from '../lib/types';
import { Button } from './ui/Button';
import { Dialog, DialogContent } from './ui/Dialog';
import { Input, Textarea } from './ui/Input';
import { Select, type SelectOption } from './ui/Select';

interface CreateTodoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: List[];
  defaultListId?: string | null;
  onSubmit: (input: CreateTodoInput) => Promise<unknown>;
}

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low', dotClassName: 'bg-ink-muted/60' },
  { value: 'medium', label: 'Medium', dotClassName: 'bg-status-warning' },
  { value: 'high', label: 'High', dotClassName: 'bg-status-danger' },
];

const RECURRENCE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function CreateTodoModal({
  open,
  onOpenChange,
  lists,
  defaultListId = null,
  onSubmit,
}: CreateTodoModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState<string>(defaultListId || '');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const listOptions: SelectOption[] = [
    { value: '', label: 'Inbox (Personal)' },
    ...lists.map((l) => ({ value: l.id, label: l.name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        listId: listId || null,
        priority,
        dueDate: dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null,
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        recurrence: recurrenceFreq
          ? { frequency: recurrenceFreq, interval: 1, endsAt: null }
          : null,
      });
      setTitle('');
      setDescription('');
      setTagsRaw('');
      setDueDate('');
      setRecurrenceFreq('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New Task" description="Add a task with priority, tags, due date, or recurrence.">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-title">
              Title
            </label>
            <Input
              id="todo-title"
              autoFocus
              required
              placeholder="e.g. Implement reminder worker"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-desc">
              Description
            </label>
            <Textarea
              id="todo-desc"
              placeholder="Optional context or acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-list">
                List
              </label>
              <Select
                id="todo-list"
                className="w-full"
                value={listId}
                options={listOptions}
                onValueChange={setListId}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-priority">
                Priority
              </label>
              <Select
                id="todo-priority"
                className="w-full"
                value={priority}
                options={PRIORITY_OPTIONS}
                onValueChange={(v) => setPriority(v as Priority)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-due">
                Due Date
              </label>
              <Input
                id="todo-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-recurrence">
                Recurrence
              </label>
              <Select
                id="todo-recurrence"
                className="w-full"
                value={recurrenceFreq}
                options={RECURRENCE_OPTIONS}
                onValueChange={(v) => setRecurrenceFreq(v as RecurrenceFrequency | '')}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary" htmlFor="todo-tags">
              Tags (comma separated)
            </label>
            <Input
              id="todo-tags"
              placeholder="backend, api, urgent"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
