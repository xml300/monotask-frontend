import type {
  ActivityLogEntry,
  Attachment,
  BulkActionInput,
  BulkActionResult,
  Comment,
  CompletionSeriesPoint,
  CreateTodoInput,
  List,
  ListMember,
  PaginatedResponse,
  Reminder,
  ReminderChannel,
  StatsSummary,
  Subtask,
  TimeEntry,
  TimeStatsBreakdown,
  Todo,
  TodoApiClient,
  TodoDependency,
  TodoDetailResponse,
  TodoFilters,
  UpdateTodoInput,
  User,
} from '../types';
import { createHttpTransport } from './httpTransport';
import { createMockTransport, resetMockDb } from './mockTransport';
import {
  ApiError,
  getStoredToken,
  setStoredToken,
  type ApiTransport,
} from './transport';

export type ApiMode = 'mock' | 'http';

export const API_MODE: ApiMode =
  (import.meta.env.VITE_API_MODE as ApiMode | undefined) === 'http' ? 'http' : 'mock';

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Swappable HTTP/Mock transport implementing .get(), .post(), .patch(), .delete().
 * Switching to the real backend only swaps this single transport.
 */
export const transport: ApiTransport =
  API_MODE === 'http' ? createHttpTransport(API_BASE_URL) : createMockTransport();

export const api: TodoApiClient & ApiTransport = {
  // Raw REST verb methods (available directly on api.get / post / patch / delete)
  get: transport.get,
  post: transport.post,
  patch: transport.patch,
  delete: transport.delete,

  // Health & Auth
  health: () => transport.get('/health'),
  register: (input) => transport.post('/auth/register', input),
  login: (input) => transport.post('/auth/login', input),
  me: () => transport.get<{ user: User }>('/auth/me'),

  // Lists & Members
  getLists: async () => {
    const res = await transport.get<{ data?: List[]; lists?: List[] } | List[]>('/lists');
    return Array.isArray(res) ? res : res.data ?? res.lists ?? [];
  },
  createList: async (input) => {
    const res = await transport.post<{ list: List }>('/lists', input);
    return res.list;
  },
  getList: async (listId) => {
    const res = await transport.get<{ list: List }>(`/lists/${listId}`);
    return res.list;
  },
  updateList: async (listId, input) => {
    const res = await transport.patch<{ list: List }>(`/lists/${listId}`, input);
    return res.list;
  },
  deleteList: (listId, deleteTodos = false) =>
    transport.delete(`/lists/${listId}`, { params: { deleteTodos } }),
  getListTodos: (listId, filters) =>
    transport.get<PaginatedResponse<Todo>>(`/lists/${listId}/todos`, {
      params: filters as Record<string, unknown>,
    }),
  getListMembers: async (listId) => {
    const res = await transport.get<{ members: ListMember[] }>(`/lists/${listId}/members`);
    return res.members;
  },
  addListMember: async (listId, input) => {
    const res = await transport.post<{ member: ListMember }>(`/lists/${listId}/members`, input);
    return res.member;
  },
  updateListMember: async (listId, userId, role) => {
    const res = await transport.patch<{ member: ListMember }>(
      `/lists/${listId}/members/${userId}`,
      { role }
    );
    return res.member;
  },
  removeListMember: (listId, userId) =>
    transport.delete(`/lists/${listId}/members/${userId}`),

  // Todos
  getTodos: (filters?: TodoFilters) =>
    transport.get<PaginatedResponse<Todo>>('/todos', {
      params: filters as Record<string, unknown>,
    }),
  createTodo: async (input: CreateTodoInput) => {
    const res = await transport.post<{ todo: Todo }>('/todos', input);
    return res.todo;
  },
  getTodo: (id) => transport.get<TodoDetailResponse>(`/todos/${id}`),
  updateTodo: async (id, input: UpdateTodoInput) => {
    const res = await transport.patch<{ todo: Todo }>(`/todos/${id}`, input);
    return res.todo;
  },
  toggleTodo: (id) =>
    transport.patch<{ todo: Todo; nextOccurrence?: Todo }>(`/todos/${id}/toggle`),
  deleteTodo: async (id) => {
    const res = await transport.delete<{ todo: Todo }>(`/todos/${id}`);
    return res.todo;
  },
  getTrash: () => transport.get<PaginatedResponse<Todo>>('/todos/trash'),
  restoreTodo: async (id) => {
    const res = await transport.post<{ todo: Todo }>(`/todos/${id}/restore`);
    return res.todo;
  },
  permanentDeleteTodo: (id) => transport.delete(`/todos/${id}/permanent`),
  emptyTrash: () => transport.delete<{ deletedCount: number }>('/todos/trash'),
  archiveTodo: async (id) => {
    const res = await transport.post<{ todo: Todo }>(`/todos/${id}/archive`);
    return res.todo;
  },
  unarchiveTodo: async (id) => {
    const res = await transport.post<{ todo: Todo }>(`/todos/${id}/unarchive`);
    return res.todo;
  },
  snoozeTodo: async (id, input) => {
    const res = await transport.post<{ todo: Todo }>(`/todos/${id}/snooze`, input);
    return res.todo;
  },
  assignTodo: async (id, assigneeId) => {
    const res = await transport.patch<{ todo: Todo }>(`/todos/${id}/assign`, { assigneeId });
    return res.todo;
  },

  // Bulk & Import/Export
  bulkAction: (input: BulkActionInput) =>
    transport.post<BulkActionResult>('/todos/bulk', input),
  exportTodos: async (format, filters) => {
    const content = await transport.get<string>('/todos/export', {
      params: { ...(filters as Record<string, unknown>), format },
      responseType: 'text',
    });
    const mimeMap = { json: 'application/json', csv: 'text/csv', ics: 'text/calendar' };
    return { content, mimeType: mimeMap[format], fileName: `monotask-export.${format}` };
  },
  importTodos: (todos) => transport.post('/todos/import', { todos }),

  // Subtasks
  getSubtasks: (todoId) => transport.get(`/todos/${todoId}/subtasks`),
  createSubtask: async (todoId, title) => {
    const res = await transport.post<{ subtask: Subtask }>(`/todos/${todoId}/subtasks`, { title });
    return res.subtask;
  },
  updateSubtask: async (todoId, subtaskId, input) => {
    const res = await transport.patch<{ subtask: Subtask }>(
      `/todos/${todoId}/subtasks/${subtaskId}`,
      input
    );
    return res.subtask;
  },
  deleteSubtask: (todoId, subtaskId) =>
    transport.delete(`/todos/${todoId}/subtasks/${subtaskId}`),

  // Dependencies
  getDependencies: (todoId) => transport.get(`/todos/${todoId}/dependencies`),
  addDependency: async (todoId, dependsOnTodoId) => {
    const res = await transport.post<{ dependency: TodoDependency }>(
      `/todos/${todoId}/dependencies`,
      { dependsOnTodoId }
    );
    return res.dependency;
  },
  removeDependency: (todoId, dependsOnId) =>
    transport.delete(`/todos/${todoId}/dependencies/${dependsOnId}`),

  // Reminders
  getReminders: async (todoId) => {
    const res = await transport.get<{ reminders: Reminder[] }>(`/todos/${todoId}/reminders`);
    return res.reminders;
  },
  createReminder: async (todoId, input: { remindAt: string; channel: ReminderChannel }) => {
    const res = await transport.post<{ reminder: Reminder }>(`/todos/${todoId}/reminders`, input);
    return res.reminder;
  },
  updateReminder: async (todoId, reminderId, input) => {
    const res = await transport.patch<{ reminder: Reminder }>(
      `/todos/${todoId}/reminders/${reminderId}`,
      input
    );
    return res.reminder;
  },
  deleteReminder: (todoId, reminderId) =>
    transport.delete(`/todos/${todoId}/reminders/${reminderId}`),

  // Time Tracking
  startTimer: async (todoId, note) => {
    const res = await transport.post<{ timeEntry: TimeEntry }>(`/todos/${todoId}/timer/start`, {
      note,
    });
    return res.timeEntry;
  },
  stopTimer: async (todoId, note) => {
    const res = await transport.post<{ timeEntry: TimeEntry }>(`/todos/${todoId}/timer/stop`, {
      note,
    });
    return res.timeEntry;
  },
  getTimeEntries: (todoId) => transport.get(`/todos/${todoId}/time-entries`),
  createTimeEntry: async (todoId, input) => {
    const res = await transport.post<{ timeEntry: TimeEntry }>(
      `/todos/${todoId}/time-entries`,
      input
    );
    return res.timeEntry;
  },
  deleteTimeEntry: (todoId, entryId) =>
    transport.delete(`/todos/${todoId}/time-entries/${entryId}`),

  // Comments & Activity
  getComments: async (todoId) => {
    const res = await transport.get<{ data?: Comment[]; comments?: Comment[] }>(
      `/todos/${todoId}/comments`
    );
    return res.data ?? res.comments ?? [];
  },
  createComment: async (todoId, body) => {
    const res = await transport.post<{ comment: Comment }>(`/todos/${todoId}/comments`, { body });
    return res.comment;
  },
  updateComment: async (todoId, commentId, body) => {
    const res = await transport.patch<{ comment: Comment }>(
      `/todos/${todoId}/comments/${commentId}`,
      { body }
    );
    return res.comment;
  },
  deleteComment: (todoId, commentId) =>
    transport.delete(`/todos/${todoId}/comments/${commentId}`),
  getActivity: async (todoId) => {
    const res = await transport.get<{ data?: ActivityLogEntry[]; activity?: ActivityLogEntry[] }>(
      `/todos/${todoId}/activity`
    );
    return res.data ?? res.activity ?? [];
  },

  // Attachments
  getAttachments: async (todoId) => {
    const res = await transport.get<{ attachments: Attachment[] }>(`/todos/${todoId}/attachments`);
    return res.attachments;
  },
  uploadAttachment: async (todoId, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await transport.post<{ attachment: Attachment }>(
      `/todos/${todoId}/attachments`,
      form
    );
    return res.attachment;
  },
  deleteAttachment: (todoId, attachmentId) =>
    transport.delete(`/todos/${todoId}/attachments/${attachmentId}`),

  // Stats
  getStatsSummary: (listId) =>
    transport.get<StatsSummary>('/stats/summary', { params: { listId } }),
  getStatsCompletions: async (range = '30d', groupBy = 'day') => {
    const res = await transport.get<{ series: CompletionSeriesPoint[] }>('/stats/completions', {
      params: { range, groupBy },
    });
    return res.series;
  },
  getStatsTime: (groupBy = 'list') =>
    transport.get<TimeStatsBreakdown>('/stats/time', { params: { groupBy } }),
};

export { ApiError, getStoredToken, setStoredToken, resetMockDb };
export type { ApiTransport };
