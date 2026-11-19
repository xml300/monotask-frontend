import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Clock,
  Link2,
  Paperclip,
  Play,
  Plus,
  Send,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTodoDetail } from '../hooks/useTodoDetail';
import type { List, Priority, ReminderChannel, Todo, UpdateTodoInput } from '../lib/types';
import { formatBytes, formatDateTime, formatDuration, formatTimerClock } from '../lib/utils';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { Input, Textarea } from './ui/Input';
import { Select, type SelectOption } from './ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low', dotClassName: 'bg-ink-muted/60' },
  { value: 'medium', label: 'Medium', dotClassName: 'bg-status-warning' },
  { value: 'high', label: 'High', dotClassName: 'bg-status-danger' },
];

const CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'webhook', label: 'Webhook' },
];

interface TodoInspectorProps {
  todoId: string | null;
  allTodos: Todo[];
  lists: List[];
  onClose: () => void;
  onUpdateTodo: (id: string, input: UpdateTodoInput) => Promise<unknown>;
  onToggleTodo: (id: string) => Promise<unknown>;
}

export function TodoInspector({
  todoId,
  allTodos,
  lists,
  onClose,
  onUpdateTodo,
  onToggleTodo,
}: TodoInspectorProps) {
  const {
    detail,
    reminders,
    timeEntries,
    comments,
    activity,
    attachments,
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
    deleteTimeEntry,
    addComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
  } = useTodoDetail(todoId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [depCandidate, setDepCandidate] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [remindChannel, setRemindChannel] = useState<ReminderChannel>('email');
  const [commentBody, setCommentBody] = useState('');
  const [liveElapsed, setLiveElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (detail?.todo) {
      setTitle(detail.todo.title);
      setDescription(detail.todo.description);
    }
  }, [detail?.todo]);

  useEffect(() => {
    if (!detail?.activeTimer) {
      setLiveElapsed(0);
      return;
    }
    const update = () => {
      const diff = Math.floor(
        (Date.now() - new Date(detail.activeTimer!.startedAt).getTime()) / 1000
      );
      setLiveElapsed(Math.max(0, diff));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [detail?.activeTimer]);

  const todo = detail?.todo;
  const subtasks = detail?.subtasks ?? [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskPct = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const availableDeps = allTodos.filter(
    (t) =>
      t.id !== todoId &&
      !t.deletedAt &&
      !(detail?.blockedBy ?? []).some((b) => b.id === t.id)
  );

  const handleBlurSave = async () => {
    if (!todo) return;
    if (title.trim() && (title !== todo.title || description !== todo.description)) {
      await onUpdateTodo(todo.id, { title: title.trim(), description });
      await refresh();
    }
  };

  return (
    <AnimatePresence>
      {todoId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-surface shadow-elevated"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                {todo && (
                  <Checkbox
                    checked={todo.completed}
                    onChange={async () => {
                      await onToggleTodo(todo.id);
                      await refresh();
                    }}
                  />
                )}
                <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Task Inspector
                </span>
                {todo?.completed && <Badge variant="success">Completed</Badge>}
                {(detail?.blockedBy.some((b) => !b.completed) ?? false) && (
                  <Badge variant="warning">Blocked</Badge>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close inspector"
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            {!todo ? (
              <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
                Loading task...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-3">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleBlurSave}
                    className="border-transparent bg-transparent px-0 text-lg font-semibold tracking-tight focus:border-line focus:px-2.5"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleBlurSave}
                    placeholder="Add details or notes..."
                    className="min-h-[68px]"
                  />

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-ink-muted">Priority</label>
                      <Select
                        ariaLabel="Task priority"
                        className="w-full"
                        value={todo.priority}
                        options={PRIORITY_OPTIONS}
                        onValueChange={async (v) => {
                          await onUpdateTodo(todo.id, { priority: v as Priority });
                          await refresh();
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-ink-muted">List</label>
                      <Select
                        ariaLabel="Task list"
                        className="w-full"
                        value={todo.listId || ''}
                        options={[
                          { value: '', label: 'Inbox' },
                          ...lists.map((l) => ({ value: l.id, label: l.name })),
                        ]}
                        onValueChange={async (v) => {
                          await onUpdateTodo(todo.id, { listId: v || null });
                          await refresh();
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-ink-muted">Due Date</label>
                      <Input
                        type="date"
                        className="text-xs"
                        value={todo.dueDate ? todo.dueDate.slice(0, 10) : ''}
                        onChange={async (e) => {
                          await onUpdateTodo(todo.id, {
                            dueDate: e.target.value
                              ? new Date(`${e.target.value}T17:00:00`).toISOString()
                              : null,
                          });
                          await refresh();
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="subtasks" className="mt-6">
                  <TabsList className="w-full justify-between">
                    <TabsTrigger value="subtasks" className="flex-1">
                      Subtasks ({subtasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="workflow" className="flex-1">
                      Time & Deps
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1">
                      Activity & Files
                    </TabsTrigger>
                  </TabsList>

                  {/* Subtasks Tab */}
                  <TabsContent value="subtasks" className="space-y-4">
                    {subtasks.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-ink-secondary">
                          <span>Checklist progress</span>
                          <span className="font-mono">
                            {completedSubtasks}/{subtasks.length} ({subtaskPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                          <motion.div
                            className="h-full bg-status-success"
                            initial={false}
                            animate={{ width: `${subtaskPct}%` }}
                            transition={{ duration: 0.25 }}
                          />
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newSubtask.trim()) return;
                        await addSubtask(newSubtask);
                        setNewSubtask('');
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Add a subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                      />
                      <Button type="submit" size="md">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </form>

                    <div className="space-y-1.5">
                      {subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="group flex items-center justify-between rounded-lg border border-line px-3 py-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={sub.completed}
                              onChange={() => toggleSubtask(sub.id, !sub.completed)}
                            />
                            <span
                              className={
                                sub.completed
                                  ? 'text-sm text-ink-muted line-through'
                                  : 'text-sm text-ink'
                              }
                            >
                              {sub.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteSubtask(sub.id)}
                            className="text-ink-muted opacity-0 transition-opacity hover:text-status-danger group-hover:opacity-100"
                            aria-label="Delete subtask"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Workflow, Time & Reminders Tab */}
                  <TabsContent value="workflow" className="space-y-6">
                    {/* Live Timer */}
                    <section className="rounded-xl border border-line bg-surface-subtle/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-ink-secondary" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                            Time Tracking
                          </h3>
                        </div>
                        <span className="font-mono text-xs text-ink-muted">
                          Total: {formatDuration((detail?.totalTrackedSeconds ?? 0) + liveElapsed)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {detail?.activeTimer && (
                            <span className="h-2 w-2 animate-pulse rounded-full bg-status-info" />
                          )}
                          <span className="font-mono text-2xl font-semibold tracking-tight">
                            {formatTimerClock(liveElapsed)}
                          </span>
                        </div>
                        {detail?.activeTimer ? (
                          <Button variant="danger" size="sm" onClick={() => stopTimer()}>
                            <Square className="h-3 w-3 fill-current" />
                            Stop Timer
                          </Button>
                        ) : (
                          <Button variant="primary" size="sm" onClick={() => startTimer()}>
                            <Play className="h-3 w-3 fill-current" />
                            Start Timer
                          </Button>
                        )}
                      </div>

                      {timeEntries.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                          {timeEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between text-xs text-ink-secondary"
                            >
                              <span>
                                {formatDateTime(entry.startedAt)}
                                {entry.note ? ` · ${entry.note}` : ''}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-ink">
                                  {entry.durationSeconds
                                    ? formatDuration(entry.durationSeconds)
                                    : 'Running'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteTimeEntry(entry.id)}
                                  className="text-ink-muted hover:text-status-danger"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Dependencies */}
                    <section className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-ink-secondary" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                          Dependencies (Blocked By)
                        </h3>
                      </div>

                      <div className="flex gap-2">
                        <Select
                          ariaLabel="Select prerequisite task"
                          className="flex-1"
                          value={depCandidate}
                          options={[
                            { value: '', label: 'Select prerequisite task...' },
                            ...availableDeps.map((t) => ({ value: t.id, label: t.title })),
                          ]}
                          onValueChange={setDepCandidate}
                        />
                        <Button
                          size="sm"
                          disabled={!depCandidate}
                          onClick={async () => {
                            if (!depCandidate) return;
                            await addDependency(depCandidate);
                            setDepCandidate('');
                          }}
                        >
                          Add
                        </Button>
                      </div>

                      {(detail?.blockedBy ?? []).map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={b.completed ? 'success' : 'warning'}>
                              {b.completed ? 'Done' : 'Blocking'}
                            </Badge>
                            <span className="font-medium text-ink">{b.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDependency(b.id)}
                            className="text-ink-muted hover:text-status-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </section>

                    {/* Reminders */}
                    <section className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-ink-secondary" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                          Reminders
                        </h3>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          className="flex-1 text-xs"
                          value={remindAt}
                          onChange={(e) => setRemindAt(e.target.value)}
                        />
                        <Select
                          ariaLabel="Reminder channel"
                          className="w-[106px]"
                          value={remindChannel}
                          options={CHANNEL_OPTIONS}
                          onValueChange={(v) => setRemindChannel(v as ReminderChannel)}
                        />
                        <Button
                          size="sm"
                          disabled={!remindAt}
                          onClick={async () => {
                            if (!remindAt) return;
                            await addReminder(new Date(remindAt).toISOString(), remindChannel);
                            setRemindAt('');
                          }}
                        >
                          Set
                        </Button>
                      </div>

                      {reminders.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs"
                        >
                          <span>
                            {formatDateTime(r.remindAt)}{' '}
                            <Badge variant="default" className="ml-1 uppercase">
                              {r.channel}
                            </Badge>
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteReminder(r.id)}
                            className="text-ink-muted hover:text-status-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </section>
                  </TabsContent>

                  {/* Comments, Activity & Attachments Tab */}
                  <TabsContent value="activity" className="space-y-6">
                    {/* Attachments */}
                    <section className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-ink-secondary" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                            Attachments ({attachments.length})
                          </h3>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadAttachment(f);
                            e.target.value = '';
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3" />
                          Upload
                        </Button>
                      </div>

                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{att.fileName}</p>
                            <p className="font-mono text-[10px] text-ink-muted">
                              {formatBytes(att.sizeBytes)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteAttachment(att.id)}
                            className="text-ink-muted hover:text-status-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </section>

                    {/* Comments */}
                    <section className="space-y-2.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                        Comments ({comments.length})
                      </h3>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!commentBody.trim()) return;
                          await addComment(commentBody);
                          setCommentBody('');
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          placeholder="Write a comment..."
                          value={commentBody}
                          onChange={(e) => setCommentBody(e.target.value)}
                        />
                        <Button type="submit" size="md">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>

                      <div className="space-y-2">
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg border border-line bg-surface-subtle/50 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-ink">
                                {c.author?.name || 'User'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-ink-muted">
                                  {formatDateTime(c.createdAt)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => deleteComment(c.id)}
                                  className="text-ink-muted hover:text-status-danger"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-1.5 text-ink-secondary">{c.body}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Activity Log */}
                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                        Activity Log
                      </h3>
                      <div className="space-y-1.5 border-l border-line pl-3">
                        {activity.map((a) => (
                          <div key={a.id} className="text-xs text-ink-secondary">
                            <span className="font-medium text-ink">{a.actor?.name || 'User'}</span>{' '}
                            <span className="font-mono text-[11px]">{a.action}</span> ·{' '}
                            <span className="text-[11px] text-ink-muted">
                              {formatDateTime(a.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
