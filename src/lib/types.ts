export type Priority = 'low' | 'medium' | 'high';
export type ListRole = 'owner' | 'editor' | 'viewer';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderChannel = 'email' | 'webhook' | 'push';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'uncompleted'
  | 'assigned'
  | 'unassigned'
  | 'archived'
  | 'unarchived'
  | 'trashed'
  | 'restored'
  | 'snoozed'
  | 'commented'
  | 'attachment_added'
  | 'attachment_removed';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  ownerId: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  role?: ListRole;
  todoCount?: number;
  memberCount?: number;
}

export interface ListMember {
  id: string;
  listId: string;
  userId: string;
  role: ListRole;
  addedBy: string;
  joinedAt: string;
  user?: User;
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endsAt: string | null;
}

export interface Todo {
  id: string;
  userId: string;
  listId: string | null;
  assigneeId: string | null;
  title: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  priority: Priority;
  tags: string[];
  dueDate: string | null;
  recurrence: RecurrenceRule | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  todoId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodoDependency {
  id: string;
  todoId: string;
  dependsOnTodoId: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  todoId: string;
  userId: string;
  remindAt: string;
  channel: ReminderChannel;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  todoId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  todoId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export interface ActivityLogEntry {
  id: string;
  todoId: string;
  userId: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: User;
}

export interface Attachment {
  id: string;
  todoId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
}

export interface TodoDetailResponse {
  todo: Todo;
  subtasks: Subtask[];
  blockedBy: Todo[];
  blocking: Todo[];
  totalTrackedSeconds: number;
  activeTimer: TimeEntry | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TodoFilters {
  completed?: boolean;
  priority?: Priority;
  tag?: string;
  listId?: string;
  assigneeId?: string;
  archived?: boolean;
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
  overdue?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  listId?: string | null;
  priority?: Priority;
  tags?: string[];
  dueDate?: string | null;
  recurrence?: RecurrenceRule | null;
  assigneeId?: string | null;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  listId?: string | null;
  completed?: boolean;
  priority?: Priority;
  tags?: string[];
  dueDate?: string | null;
  recurrence?: RecurrenceRule | null;
}

export type BulkActionType =
  | 'complete'
  | 'uncomplete'
  | 'delete'
  | 'archive'
  | 'move'
  | 'addTags'
  | 'removeTags';

export interface BulkActionInput {
  ids: string[];
  action: BulkActionType;
  payload?: {
    listId?: string | null;
    tags?: string[];
  };
}

export interface BulkActionResult {
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
}

export interface StatsSummary {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
  currentStreakDays: number;
  longestStreakDays: number;
}

export interface CompletionSeriesPoint {
  period: string;
  count: number;
}

export interface TimeStatsBreakdown {
  totalSeconds: number;
  breakdown: Array<{ key: string; label: string; seconds: number }>;
}

export interface TodoApiClient {
  // Health & Auth
  health(): Promise<{ status: string; timestamp: string }>;
  register(input: { email: string; name: string; password: string }): Promise<{ user: User; token: string }>;
  login(input: { email: string; password: string }): Promise<{ user: User; token: string }>;
  me(): Promise<{ user: User }>;

  // Lists & Members
  getLists(): Promise<List[]>;
  createList(input: { name: string; color?: string | null; icon?: string | null }): Promise<List>;
  getList(listId: string): Promise<List>;
  updateList(listId: string, input: { name?: string; color?: string | null; icon?: string | null }): Promise<List>;
  deleteList(listId: string, deleteTodos?: boolean): Promise<void>;
  getListTodos(listId: string, filters?: TodoFilters): Promise<PaginatedResponse<Todo>>;
  getListMembers(listId: string): Promise<ListMember[]>;
  addListMember(listId: string, input: { email: string; role: 'editor' | 'viewer' }): Promise<ListMember>;
  updateListMember(listId: string, userId: string, role: 'editor' | 'viewer'): Promise<ListMember>;
  removeListMember(listId: string, userId: string): Promise<void>;

  // Todos
  getTodos(filters?: TodoFilters): Promise<PaginatedResponse<Todo>>;
  createTodo(input: CreateTodoInput): Promise<Todo>;
  getTodo(id: string): Promise<TodoDetailResponse>;
  updateTodo(id: string, input: UpdateTodoInput): Promise<Todo>;
  toggleTodo(id: string): Promise<{ todo: Todo; nextOccurrence?: Todo }>;
  deleteTodo(id: string): Promise<Todo>;
  getTrash(): Promise<PaginatedResponse<Todo>>;
  restoreTodo(id: string): Promise<Todo>;
  permanentDeleteTodo(id: string): Promise<void>;
  emptyTrash(): Promise<{ deletedCount: number }>;
  archiveTodo(id: string): Promise<Todo>;
  unarchiveTodo(id: string): Promise<Todo>;
  snoozeTodo(id: string, input: { duration?: '1h' | '1d' | '3d' | '1w'; until?: string }): Promise<Todo>;
  assignTodo(id: string, assigneeId: string | null): Promise<Todo>;

  // Bulk & Import/Export
  bulkAction(input: BulkActionInput): Promise<BulkActionResult>;
  exportTodos(format: 'json' | 'csv' | 'ics', filters?: TodoFilters): Promise<{ content: string; mimeType: string; fileName: string }>;
  importTodos(todos: CreateTodoInput[]): Promise<{ importedCount: number; errors: Array<{ row: number; message: string }> }>;

  // Subtasks
  getSubtasks(todoId: string): Promise<{ subtasks: Subtask[]; progress: { completed: number; total: number } }>;
  createSubtask(todoId: string, title: string): Promise<Subtask>;
  updateSubtask(todoId: string, subtaskId: string, input: { title?: string; completed?: boolean }): Promise<Subtask>;
  deleteSubtask(todoId: string, subtaskId: string): Promise<void>;

  // Dependencies
  getDependencies(todoId: string): Promise<{ blockedBy: Todo[]; blocking: Todo[] }>;
  addDependency(todoId: string, dependsOnTodoId: string): Promise<TodoDependency>;
  removeDependency(todoId: string, dependsOnId: string): Promise<void>;

  // Reminders
  getReminders(todoId: string): Promise<Reminder[]>;
  createReminder(todoId: string, input: { remindAt: string; channel: ReminderChannel }): Promise<Reminder>;
  updateReminder(todoId: string, reminderId: string, input: { remindAt?: string; channel?: ReminderChannel }): Promise<Reminder>;
  deleteReminder(todoId: string, reminderId: string): Promise<void>;

  // Time Tracking
  startTimer(todoId: string, note?: string): Promise<TimeEntry>;
  stopTimer(todoId: string, note?: string): Promise<TimeEntry>;
  getTimeEntries(todoId: string): Promise<{ entries: TimeEntry[]; totalDurationSeconds: number }>;
  createTimeEntry(todoId: string, input: { startedAt: string; endedAt: string; note?: string }): Promise<TimeEntry>;
  deleteTimeEntry(todoId: string, entryId: string): Promise<void>;

  // Comments & Activity
  getComments(todoId: string): Promise<Comment[]>;
  createComment(todoId: string, body: string): Promise<Comment>;
  updateComment(todoId: string, commentId: string, body: string): Promise<Comment>;
  deleteComment(todoId: string, commentId: string): Promise<void>;
  getActivity(todoId: string): Promise<ActivityLogEntry[]>;

  // Attachments
  getAttachments(todoId: string): Promise<Attachment[]>;
  uploadAttachment(todoId: string, file: File): Promise<Attachment>;
  deleteAttachment(todoId: string, attachmentId: string): Promise<void>;

  // Stats
  getStatsSummary(listId?: string): Promise<StatsSummary>;
  getStatsCompletions(range?: '7d' | '30d' | '90d', groupBy?: 'day' | 'week'): Promise<CompletionSeriesPoint[]>;
  getStatsTime(groupBy?: 'list' | 'tag' | 'day'): Promise<TimeStatsBreakdown>;
}
