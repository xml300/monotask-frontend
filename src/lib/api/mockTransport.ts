import type {
  ActivityAction,
  Attachment,
  BulkActionInput,
  Comment,
  CompletionSeriesPoint,
  CreateTodoInput,
  List,
  ListMember,
  PaginatedResponse,
  Priority,
  RecurrenceRule,
  Reminder,
  ReminderChannel,
  StatsSummary,
  Subtask,
  TimeEntry,
  TimeStatsBreakdown,
  Todo,
  TodoDependency,
  TodoFilters,
  UpdateTodoInput,
  User,
} from '../types';
import { createSeedDb, type MockDb } from './seedData';
import {
  ApiError,
  getStoredToken,
  type ApiTransport,
  type HttpMethod,
  type RequestOptions,
} from './transport';

const DB_STORAGE_KEY = 'monotask_mock_db_v1';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function delay(ms = 65): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    // ignore corrupted storage
  }
  const seeded = createSeedDb();
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveDb(db: MockDb): void {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

export function resetMockDb(): void {
  saveDb(createSeedDb());
}

function toPublicUser(u: User & { password?: string }): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function nextDueDate(currentDue: string | null, rule: RecurrenceRule): string {
  const base = currentDue ? new Date(currentDue) : new Date();
  const next = new Date(base);
  const interval = Math.max(1, rule.interval || 1);
  if (rule.frequency === 'daily') next.setDate(next.getDate() + interval);
  if (rule.frequency === 'weekly') next.setDate(next.getDate() + interval * 7);
  if (rule.frequency === 'monthly') next.setMonth(next.getMonth() + interval);
  if (rule.frequency === 'yearly') next.setFullYear(next.getFullYear() + interval);
  return next.toISOString();
}

interface RouteContext {
  db: MockDb;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

interface RouteDef {
  method: HttpMethod;
  pattern: string;
  segments: string[];
  handler: (ctx: RouteContext) => unknown;
}

function matchPath(
  routeSegments: string[],
  pathSegments: string[]
): Record<string, string> | null {
  if (routeSegments.length !== pathSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeSegments.length; i++) {
    const expected = routeSegments[i];
    const actual = pathSegments[i];
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}

function parseQuery(path: string, optParams?: Record<string, unknown>): {
  cleanPath: string;
  query: Record<string, string>;
} {
  const [cleanPath, qs] = path.split('?');
  const query: Record<string, string> = {};
  if (qs) {
    new URLSearchParams(qs).forEach((v, k) => {
      query[k] = v;
    });
  }
  if (optParams) {
    Object.entries(optParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query[k] = String(v);
      }
    });
  }
  return { cleanPath, query };
}

function queryToTodoFilters(q: Record<string, string>): TodoFilters {
  return {
    completed: q.completed === undefined ? undefined : q.completed === 'true',
    priority: (q.priority as Priority) || undefined,
    tag: q.tag || undefined,
    listId: q.listId || undefined,
    assigneeId: q.assigneeId || undefined,
    archived: q.archived === undefined ? undefined : q.archived === 'true',
    search: q.search || undefined,
    dueBefore: q.dueBefore || undefined,
    dueAfter: q.dueAfter || undefined,
    overdue: q.overdue === 'true' ? true : undefined,
    sortBy: (q.sortBy as TodoFilters['sortBy']) || undefined,
    order: (q.order as TodoFilters['order']) || undefined,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
  };
}

export function createMockTransport(): ApiTransport {
  function requireUser(db: MockDb): User {
    const token = getStoredToken();
    if (!token) throw new ApiError('Unauthorized', 401);
    const userId = token.replace(/^mock-token-/, '');
    const found = db.users.find((u) => u.id === userId);
    if (!found) throw new ApiError('Session expired', 401);
    return toPublicUser(found);
  }

  function accessibleListIds(db: MockDb, userId: string): Set<string> {
    return new Set(db.listMembers.filter((m) => m.userId === userId).map((m) => m.listId));
  }

  function canAccessTodo(db: MockDb, todo: Todo, userId: string): boolean {
    if (todo.userId === userId || todo.assigneeId === userId) return true;
    if (todo.listId && accessibleListIds(db, userId).has(todo.listId)) return true;
    return false;
  }

  function logActivity(
    db: MockDb,
    todoId: string,
    userId: string,
    action: ActivityAction,
    metadata: Record<string, unknown> = {}
  ): void {
    db.activityLogs.unshift({
      id: uid('act'),
      todoId,
      userId,
      action,
      metadata,
      createdAt: new Date().toISOString(),
    });
  }

  function hasCycle(db: MockDb, todoId: string, candidatePrereqId: string): boolean {
    if (todoId === candidatePrereqId) return true;
    const visited = new Set<string>();
    const stack = [candidatePrereqId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === todoId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const nextDeps = db.dependencies
        .filter((d) => d.todoId === current)
        .map((d) => d.dependsOnTodoId);
      stack.push(...nextDeps);
    }
    return false;
  }

  function filterAndSortTodos(todos: Todo[], filters: TodoFilters = {}): PaginatedResponse<Todo> {
    let result = [...todos];

    if (filters.archived !== undefined) {
      result = result.filter((t) => (filters.archived ? t.archivedAt !== null : t.archivedAt === null));
    } else {
      result = result.filter((t) => t.archivedAt === null);
    }
    if (filters.completed !== undefined) {
      result = result.filter((t) => t.completed === filters.completed);
    }
    if (filters.priority) {
      result = result.filter((t) => t.priority === filters.priority);
    }
    if (filters.tag) {
      const tag = filters.tag.toLowerCase();
      result = result.filter((t) => t.tags.includes(tag));
    }
    if (filters.listId !== undefined) {
      result = result.filter((t) =>
        filters.listId === 'inbox' ? t.listId === null : t.listId === filters.listId
      );
    }
    if (filters.assigneeId) {
      result = result.filter((t) => t.assigneeId === filters.assigneeId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      );
    }
    if (filters.overdue) {
      const now = Date.now();
      result = result.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < now);
    }
    if (filters.dueBefore) {
      const ts = new Date(filters.dueBefore).getTime();
      result = result.filter((t) => t.dueDate && new Date(t.dueDate).getTime() <= ts);
    }
    if (filters.dueAfter) {
      const ts = new Date(filters.dueAfter).getTime();
      result = result.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= ts);
    }

    const sortBy = filters.sortBy || 'createdAt';
    const dir = filters.order === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      if (sortBy === 'priority') return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * dir;
      if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy === 'dueDate') {
        const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return (at - bt) * dir;
      }
      return (new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()) * dir;
    });

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      data: result.slice(start, start + limit),
      meta: { page, limit, total, totalPages },
    };
  }

  function createTodoRecord(db: MockDb, user: User, input: CreateTodoInput): Todo {
    const now = new Date().toISOString();
    const tags = Array.from(
      new Set((input.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))
    );
    const todo: Todo = {
      id: uid('todo'),
      userId: user.id,
      listId: input.listId ?? null,
      assigneeId: input.assigneeId ?? user.id,
      title: input.title.trim(),
      description: (input.description || '').trim(),
      completed: false,
      completedAt: null,
      priority: input.priority || 'medium',
      tags,
      dueDate: input.dueDate ?? null,
      recurrence: input.recurrence ?? null,
      archivedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    db.todos.unshift(todo);
    logActivity(db, todo.id, user.id, 'created', { title: todo.title });
    return todo;
  }

  const routes: RouteDef[] = [];
  const register = (method: HttpMethod, pattern: string, handler: RouteDef['handler']) => {
    routes.push({
      method,
      pattern,
      segments: pattern.split('/').filter(Boolean),
      handler,
    });
  };

  // --- Health & Auth ---
  register('GET', '/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  register('POST', '/auth/register', ({ db, body }) => {
    const { email, name, password } = body as { email: string; name: string; password: string };
    const normalized = email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new ApiError('An account with that email already exists', 409);
    }
    const now = new Date().toISOString();
    const user = { id: uid('user'), email: normalized, name: name.trim(), password, createdAt: now, updatedAt: now };
    db.users.push(user);
    saveDb(db);
    return { user: toPublicUser(user), token: `mock-token-${user.id}` };
  });

  register('POST', '/auth/login', ({ db, body }) => {
    const { email, password } = body as { email: string; password: string };
    const found = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) throw new ApiError('Invalid email or password', 401);
    return { user: toPublicUser(found), token: `mock-token-${found.id}` };
  });

  register('GET', '/auth/me', ({ db }) => ({ user: requireUser(db) }));

  // --- Lists & Members ---
  register('GET', '/lists', ({ db }) => {
    const user = requireUser(db);
    const data = db.listMembers
      .filter((m) => m.userId === user.id)
      .map((m) => {
        const list = db.lists.find((l) => l.id === m.listId);
        if (!list) return null;
        const todoCount = db.todos.filter(
          (t) => t.listId === list.id && !t.deletedAt && !t.archivedAt && !t.completed
        ).length;
        const memberCount = db.listMembers.filter((lm) => lm.listId === list.id).length;
        return { ...list, role: m.role, todoCount, memberCount } as List;
      })
      .filter((l): l is List => l !== null);
    return { data };
  });

  register('POST', '/lists', ({ db, body }) => {
    const user = requireUser(db);
    const { name, color = '#111111', icon = 'folder' } = body as {
      name: string;
      color?: string | null;
      icon?: string | null;
    };
    const now = new Date().toISOString();
    const list: List = {
      id: uid('list'),
      ownerId: user.id,
      name: name.trim(),
      color,
      icon,
      createdAt: now,
      updatedAt: now,
    };
    db.lists.push(list);
    db.listMembers.push({
      id: uid('lm'),
      listId: list.id,
      userId: user.id,
      role: 'owner',
      addedBy: user.id,
      joinedAt: now,
    });
    saveDb(db);
    return { list: { ...list, role: 'owner', todoCount: 0, memberCount: 1 } };
  });

  register('GET', '/lists/:listId', ({ db, params }) => {
    const user = requireUser(db);
    const member = db.listMembers.find((m) => m.listId === params.listId && m.userId === user.id);
    const list = db.lists.find((l) => l.id === params.listId);
    if (!member || !list) throw new ApiError('List not found', 404);
    return {
      list: {
        ...list,
        role: member.role,
        memberCount: db.listMembers.filter((m) => m.listId === params.listId).length,
        todoCount: db.todos.filter((t) => t.listId === params.listId && !t.deletedAt && !t.archivedAt).length,
      },
    };
  });

  register('PATCH', '/lists/:listId', ({ db, params, body }) => {
    const user = requireUser(db);
    const list = db.lists.find((l) => l.id === params.listId);
    if (!list) throw new ApiError('List not found', 404);
    if (list.ownerId !== user.id) throw new ApiError('Only the list owner can edit this list', 403);
    Object.assign(list, body, { updatedAt: new Date().toISOString() });
    saveDb(db);
    return { list };
  });

  register('DELETE', '/lists/:listId', ({ db, params, query }) => {
    const user = requireUser(db);
    const list = db.lists.find((l) => l.id === params.listId);
    if (!list) throw new ApiError('List not found', 404);
    if (list.ownerId !== user.id) throw new ApiError('Only the list owner can delete this list', 403);
    const deleteTodos = query.deleteTodos === 'true';
    db.lists = db.lists.filter((l) => l.id !== params.listId);
    db.listMembers = db.listMembers.filter((m) => m.listId !== params.listId);
    const now = new Date().toISOString();
    db.todos.forEach((t) => {
      if (t.listId === params.listId) {
        if (deleteTodos) t.deletedAt = now;
        else t.listId = null;
      }
    });
    saveDb(db);
    return undefined;
  });

  register('GET', '/lists/:listId/todos', ({ db, params, query }) => {
    const user = requireUser(db);
    if (!accessibleListIds(db, user.id).has(params.listId)) throw new ApiError('List not found', 404);
    const active = db.todos.filter((t) => t.listId === params.listId && !t.deletedAt);
    return filterAndSortTodos(active, queryToTodoFilters(query));
  });

  register('GET', '/lists/:listId/members', ({ db, params }) => {
    const user = requireUser(db);
    if (!accessibleListIds(db, user.id).has(params.listId)) throw new ApiError('List not found', 404);
    const members = db.listMembers
      .filter((m) => m.listId === params.listId)
      .map((m) => {
        const u = db.users.find((x) => x.id === m.userId);
        return { ...m, user: u ? toPublicUser(u) : undefined };
      });
    return { members };
  });

  register('POST', '/lists/:listId/members', ({ db, params, body }) => {
    const user = requireUser(db);
    const { email, role } = body as { email: string; role: 'editor' | 'viewer' };
    const list = db.lists.find((l) => l.id === params.listId);
    if (!list) throw new ApiError('List not found', 404);
    if (list.ownerId !== user.id) throw new ApiError('Only the list owner can add members', 403);
    const target = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!target) {
      throw new ApiError('No user found with that email (try sam@monotask.dev or maya@monotask.dev)', 404);
    }
    if (db.listMembers.some((m) => m.listId === params.listId && m.userId === target.id)) {
      throw new ApiError('User is already a member of this list', 409);
    }
    const member: ListMember = {
      id: uid('lm'),
      listId: params.listId,
      userId: target.id,
      role,
      addedBy: user.id,
      joinedAt: new Date().toISOString(),
      user: toPublicUser(target),
    };
    db.listMembers.push(member);
    saveDb(db);
    return { member };
  });

  register('PATCH', '/lists/:listId/members/:userId', ({ db, params, body }) => {
    const user = requireUser(db);
    const { role } = body as { role: 'editor' | 'viewer' };
    const list = db.lists.find((l) => l.id === params.listId);
    if (!list) throw new ApiError('List not found', 404);
    if (list.ownerId !== user.id) throw new ApiError('Only the list owner can change roles', 403);
    const member = db.listMembers.find(
      (m) => m.listId === params.listId && m.userId === params.userId
    );
    if (!member) throw new ApiError('Member not found', 404);
    if (member.role === 'owner') throw new ApiError('Cannot change owner role', 400);
    member.role = role;
    saveDb(db);
    return { member };
  });

  register('DELETE', '/lists/:listId/members/:userId', ({ db, params }) => {
    const user = requireUser(db);
    const list = db.lists.find((l) => l.id === params.listId);
    if (!list) throw new ApiError('List not found', 404);
    if (list.ownerId !== user.id && user.id !== params.userId) {
      throw new ApiError('Not permitted to remove this member', 403);
    }
    if (list.ownerId === params.userId) throw new ApiError('Owner cannot leave their own list', 400);
    db.listMembers = db.listMembers.filter(
      (m) => !(m.listId === params.listId && m.userId === params.userId)
    );
    db.todos.forEach((t) => {
      if (t.listId === params.listId && t.assigneeId === params.userId) t.assigneeId = null;
    });
    saveDb(db);
    return undefined;
  });

  // --- Static Todo Routes (registered BEFORE /todos/:id) ---
  register('GET', '/todos/trash', ({ db }) => {
    const user = requireUser(db);
    const trashed = db.todos
      .filter((t) => t.deletedAt !== null && canAccessTodo(db, t, user.id))
      .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    return { data: trashed, meta: { page: 1, limit: 100, total: trashed.length, totalPages: 1 } };
  });

  register('DELETE', '/todos/trash', ({ db }) => {
    const user = requireUser(db);
    const toRemove = new Set(
      db.todos.filter((t) => t.deletedAt !== null && t.userId === user.id).map((t) => t.id)
    );
    db.todos = db.todos.filter((t) => !toRemove.has(t.id));
    db.subtasks = db.subtasks.filter((s) => !toRemove.has(s.todoId));
    db.dependencies = db.dependencies.filter((d) => !toRemove.has(d.todoId) && !toRemove.has(d.dependsOnTodoId));
    saveDb(db);
    return { deletedCount: toRemove.size };
  });

  register('POST', '/todos/bulk', ({ db, body }) => {
    const user = requireUser(db);
    const input = body as BulkActionInput;
    const succeeded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    const now = new Date().toISOString();

    for (const id of input.ids) {
      const todo = db.todos.find((t) => t.id === id && canAccessTodo(db, t, user.id));
      if (!todo) {
        failed.push({ id, reason: 'Not found' });
        continue;
      }
      if (input.action === 'complete') {
        const blocker = db.dependencies
          .filter((d) => d.todoId === id)
          .map((d) => db.todos.find((t) => t.id === d.dependsOnTodoId))
          .find((t) => t && !t.deletedAt && !t.completed);
        if (blocker) {
          failed.push({ id, reason: `Blocked by "${blocker.title}"` });
          continue;
        }
        todo.completed = true;
        todo.completedAt = now;
      } else if (input.action === 'uncomplete') {
        todo.completed = false;
        todo.completedAt = null;
      } else if (input.action === 'delete') {
        todo.deletedAt = now;
      } else if (input.action === 'archive') {
        todo.archivedAt = now;
      } else if (input.action === 'move') {
        todo.listId = input.payload?.listId ?? null;
      } else if (input.action === 'addTags' && input.payload?.tags) {
        const added = input.payload.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
        todo.tags = Array.from(new Set([...todo.tags, ...added]));
      } else if (input.action === 'removeTags' && input.payload?.tags) {
        const rm = new Set(input.payload.tags.map((t) => t.trim().toLowerCase()));
        todo.tags = todo.tags.filter((t) => !rm.has(t));
      }
      todo.updatedAt = now;
      succeeded.push(id);
    }

    saveDb(db);
    return { succeeded, failed };
  });

  register('GET', '/todos/export', ({ db, query }) => {
    const user = requireUser(db);
    const format = (query.format as 'json' | 'csv' | 'ics') || 'json';
    const visible = db.todos.filter((t) => !t.deletedAt && canAccessTodo(db, t, user.id));
    const { data } = filterAndSortTodos(visible, { ...queryToTodoFilters(query), limit: 100 });
    if (format === 'json') return JSON.stringify(data, null, 2);
    if (format === 'csv') {
      const header = 'id,title,completed,priority,tags,dueDate';
      const rows = data.map((t) =>
        [
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          t.completed,
          t.priority,
          `"${t.tags.join(';')}"`,
          t.dueDate || '',
        ].join(',')
      );
      return [header, ...rows].join('\n');
    }
    const events = data
      .map(
        (t) =>
          `BEGIN:VTODO\nUID:${t.id}\nSUMMARY:${t.title}\nSTATUS:${t.completed ? 'COMPLETED' : 'NEEDS-ACTION'}\nEND:VTODO`
      )
      .join('\n');
    return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MonoTask//EN\n${events}\nEND:VCALENDAR`;
  });

  register('POST', '/todos/import', ({ db, body }) => {
    const user = requireUser(db);
    const { todos } = body as { todos: CreateTodoInput[] };
    const errors: Array<{ row: number; message: string }> = [];
    let importedCount = 0;
    for (let i = 0; i < todos.length; i++) {
      const item = todos[i];
      if (!item?.title?.trim()) {
        errors.push({ row: i + 1, message: 'Missing title' });
        continue;
      }
      createTodoRecord(db, user, item);
      importedCount++;
    }
    saveDb(db);
    return { importedCount, errors };
  });

  // --- Core Todo CRUD ---
  register('GET', '/todos', ({ db, query }) => {
    const user = requireUser(db);
    const visible = db.todos.filter((t) => !t.deletedAt && canAccessTodo(db, t, user.id));
    return filterAndSortTodos(visible, queryToTodoFilters(query));
  });

  register('POST', '/todos', ({ db, body }) => {
    const user = requireUser(db);
    const todo = createTodoRecord(db, user, body as CreateTodoInput);
    saveDb(db);
    return { todo };
  });

  register('GET', '/todos/:id', ({ db, params }) => {
    const user = requireUser(db);
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);
    const subtasks = db.subtasks.filter((s) => s.todoId === params.id);
    const blockedByIds = db.dependencies.filter((d) => d.todoId === params.id).map((d) => d.dependsOnTodoId);
    const blockingIds = db.dependencies.filter((d) => d.dependsOnTodoId === params.id).map((d) => d.todoId);
    const blockedBy = db.todos.filter((t) => blockedByIds.includes(t.id) && !t.deletedAt);
    const blocking = db.todos.filter((t) => blockingIds.includes(t.id) && !t.deletedAt);
    const entries = db.timeEntries.filter((e) => e.todoId === params.id);
    const totalTrackedSeconds = entries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    const activeTimer = entries.find((e) => e.userId === user.id && e.endedAt === null) || null;
    return { todo, subtasks, blockedBy, blocking, totalTrackedSeconds, activeTimer };
  });

  register('PATCH', '/todos/:id', ({ db, params, body }) => {
    const user = requireUser(db);
    const input = { ...(body as UpdateTodoInput) };
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);

    if (input.completed === true && !todo.completed) {
      const unfinishedBlocker = db.dependencies
        .filter((d) => d.todoId === params.id)
        .map((d) => db.todos.find((t) => t.id === d.dependsOnTodoId))
        .find((t) => t && !t.deletedAt && !t.completed);
      if (unfinishedBlocker) throw new ApiError(`Blocked by "${unfinishedBlocker.title}"`, 409);
    }

    if (input.tags) {
      input.tags = Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));
    }
    Object.assign(todo, input, {
      updatedAt: new Date().toISOString(),
      completedAt:
        input.completed !== undefined
          ? input.completed
            ? new Date().toISOString()
            : null
          : todo.completedAt,
    });
    logActivity(db, todo.id, user.id, 'updated', { fields: Object.keys(input) });
    saveDb(db);
    return { todo };
  });

  register('PATCH', '/todos/:id/toggle', ({ db, params }) => {
    const user = requireUser(db);
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);

    const nextCompleted = !todo.completed;
    if (nextCompleted) {
      const unfinishedBlocker = db.dependencies
        .filter((d) => d.todoId === params.id)
        .map((d) => db.todos.find((t) => t.id === d.dependsOnTodoId))
        .find((t) => t && !t.deletedAt && !t.completed);
      if (unfinishedBlocker) {
        throw new ApiError(`Cannot complete — blocked by "${unfinishedBlocker.title}"`, 409);
      }
    }

    const now = new Date().toISOString();
    todo.completed = nextCompleted;
    todo.completedAt = nextCompleted ? now : null;
    todo.updatedAt = now;
    logActivity(db, todo.id, user.id, nextCompleted ? 'completed' : 'uncompleted');

    let nextOccurrence: Todo | undefined;
    if (nextCompleted && todo.recurrence) {
      const shiftedDue = nextDueDate(todo.dueDate, todo.recurrence);
      const withinEnd = !todo.recurrence.endsAt || new Date(shiftedDue) <= new Date(todo.recurrence.endsAt);
      if (withinEnd) {
        nextOccurrence = {
          ...todo,
          id: uid('todo'),
          completed: false,
          completedAt: null,
          dueDate: shiftedDue,
          createdAt: now,
          updatedAt: now,
        };
        db.todos.unshift(nextOccurrence);
        logActivity(db, nextOccurrence.id, user.id, 'created', { spawnedFrom: todo.id });
      }
    }

    saveDb(db);
    return { todo, nextOccurrence };
  });

  register('DELETE', '/todos/:id', ({ db, params }) => {
    const user = requireUser(db);
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);
    todo.deletedAt = new Date().toISOString();
    todo.updatedAt = todo.deletedAt;
    logActivity(db, todo.id, user.id, 'trashed');
    saveDb(db);
    return { todo };
  });

  register('POST', '/todos/:id/restore', ({ db, params }) => {
    const user = requireUser(db);
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);
    todo.deletedAt = null;
    todo.updatedAt = new Date().toISOString();
    logActivity(db, todo.id, user.id, 'restored');
    saveDb(db);
    return { todo };
  });

  register('DELETE', '/todos/:id/permanent', ({ db, params }) => {
    requireUser(db);
    db.todos = db.todos.filter((t) => t.id !== params.id);
    db.subtasks = db.subtasks.filter((s) => s.todoId !== params.id);
    db.dependencies = db.dependencies.filter((d) => d.todoId !== params.id && d.dependsOnTodoId !== params.id);
    db.reminders = db.reminders.filter((r) => r.todoId !== params.id);
    db.timeEntries = db.timeEntries.filter((e) => e.todoId !== params.id);
    db.comments = db.comments.filter((c) => c.todoId !== params.id);
    db.activityLogs = db.activityLogs.filter((a) => a.todoId !== params.id);
    db.attachments = db.attachments.filter((a) => a.todoId !== params.id);
    saveDb(db);
    return undefined;
  });

  register('POST', '/todos/:id/archive', ({ db, params }) => {
    const user = requireUser(db);
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);
    todo.archivedAt = new Date().toISOString();
    todo.updatedAt = todo.archivedAt;
    logActivity(db, todo.id, user.id, 'archived');
    saveDb(db);
    return { todo };
  });

  register('POST', '/todos/:id/unarchive', ({ db, params }) => {
    const user = requireUser(db);
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);
    todo.archivedAt = null;
    todo.updatedAt = new Date().toISOString();
    logActivity(db, todo.id, user.id, 'unarchived');
    saveDb(db);
    return { todo };
  });

  register('POST', '/todos/:id/snooze', ({ db, params, body }) => {
    const user = requireUser(db);
    const input = body as { duration?: '1h' | '1d' | '3d' | '1w'; until?: string };
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);

    let next: Date;
    if (input.until) {
      next = new Date(input.until);
    } else {
      const base =
        todo.dueDate && new Date(todo.dueDate).getTime() > Date.now()
          ? new Date(todo.dueDate)
          : new Date();
      next = new Date(base);
      if (input.duration === '1h') next.setHours(next.getHours() + 1);
      else if (input.duration === '3d') next.setDate(next.getDate() + 3);
      else if (input.duration === '1w') next.setDate(next.getDate() + 7);
      else next.setDate(next.getDate() + 1);
    }

    todo.dueDate = next.toISOString();
    todo.updatedAt = new Date().toISOString();
    logActivity(db, todo.id, user.id, 'snoozed', { dueDate: todo.dueDate });
    saveDb(db);
    return { todo };
  });

  register('PATCH', '/todos/:id/assign', ({ db, params, body }) => {
    const user = requireUser(db);
    const { assigneeId } = body as { assigneeId: string | null };
    const todo = db.todos.find((t) => t.id === params.id && canAccessTodo(db, t, user.id));
    if (!todo) throw new ApiError('Todo not found', 404);
    todo.assigneeId = assigneeId;
    todo.updatedAt = new Date().toISOString();
    logActivity(db, todo.id, user.id, assigneeId ? 'assigned' : 'unassigned', { assigneeId });
    saveDb(db);
    return { todo };
  });

  // --- Subtasks ---
  register('GET', '/todos/:id/subtasks', ({ db, params }) => {
    requireUser(db);
    const subtasks = db.subtasks.filter((s) => s.todoId === params.id);
    const completed = subtasks.filter((s) => s.completed).length;
    return { subtasks, progress: { completed, total: subtasks.length } };
  });

  register('POST', '/todos/:id/subtasks', ({ db, params, body }) => {
    requireUser(db);
    const { title } = body as { title: string };
    const now = new Date().toISOString();
    const subtask: Subtask = {
      id: uid('sub'),
      todoId: params.id,
      title: title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    db.subtasks.push(subtask);
    saveDb(db);
    return { subtask };
  });

  register('PATCH', '/todos/:id/subtasks/:subtaskId', ({ db, params, body }) => {
    requireUser(db);
    const sub = db.subtasks.find((s) => s.id === params.subtaskId && s.todoId === params.id);
    if (!sub) throw new ApiError('Subtask not found', 404);
    Object.assign(sub, body, { updatedAt: new Date().toISOString() });
    saveDb(db);
    return { subtask: sub };
  });

  register('DELETE', '/todos/:id/subtasks/:subtaskId', ({ db, params }) => {
    requireUser(db);
    db.subtasks = db.subtasks.filter((s) => !(s.id === params.subtaskId && s.todoId === params.id));
    saveDb(db);
    return undefined;
  });

  // --- Dependencies ---
  register('GET', '/todos/:id/dependencies', ({ db, params }) => {
    requireUser(db);
    const blockedByIds = db.dependencies.filter((d) => d.todoId === params.id).map((d) => d.dependsOnTodoId);
    const blockingIds = db.dependencies.filter((d) => d.dependsOnTodoId === params.id).map((d) => d.todoId);
    return {
      blockedBy: db.todos.filter((t) => blockedByIds.includes(t.id) && !t.deletedAt),
      blocking: db.todos.filter((t) => blockingIds.includes(t.id) && !t.deletedAt),
    };
  });

  register('POST', '/todos/:id/dependencies', ({ db, params, body }) => {
    requireUser(db);
    const { dependsOnTodoId } = body as { dependsOnTodoId: string };
    if (hasCycle(db, params.id, dependsOnTodoId)) {
      throw new ApiError('Circular or self dependency detected', 409);
    }
    if (db.dependencies.some((d) => d.todoId === params.id && d.dependsOnTodoId === dependsOnTodoId)) {
      throw new ApiError('Dependency already exists', 409);
    }
    const dependency: TodoDependency = {
      id: uid('dep'),
      todoId: params.id,
      dependsOnTodoId,
      createdAt: new Date().toISOString(),
    };
    db.dependencies.push(dependency);
    saveDb(db);
    return { dependency };
  });

  register('DELETE', '/todos/:id/dependencies/:dependsOnId', ({ db, params }) => {
    requireUser(db);
    db.dependencies = db.dependencies.filter(
      (d) => !(d.todoId === params.id && d.dependsOnTodoId === params.dependsOnId)
    );
    saveDb(db);
    return undefined;
  });

  // --- Reminders ---
  register('GET', '/todos/:id/reminders', ({ db, params }) => {
    const user = requireUser(db);
    return { reminders: db.reminders.filter((r) => r.todoId === params.id && r.userId === user.id) };
  });

  register('POST', '/todos/:id/reminders', ({ db, params, body }) => {
    const user = requireUser(db);
    const { remindAt, channel } = body as { remindAt: string; channel: ReminderChannel };
    const now = new Date().toISOString();
    const reminder: Reminder = {
      id: uid('rem'),
      todoId: params.id,
      userId: user.id,
      remindAt,
      channel,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    db.reminders.push(reminder);
    saveDb(db);
    return { reminder };
  });

  register('PATCH', '/todos/:id/reminders/:reminderId', ({ db, params, body }) => {
    requireUser(db);
    const rem = db.reminders.find((r) => r.id === params.reminderId && r.todoId === params.id);
    if (!rem) throw new ApiError('Reminder not found', 404);
    Object.assign(rem, body, { updatedAt: new Date().toISOString() });
    saveDb(db);
    return { reminder: rem };
  });

  register('DELETE', '/todos/:id/reminders/:reminderId', ({ db, params }) => {
    requireUser(db);
    db.reminders = db.reminders.filter((r) => !(r.id === params.reminderId && r.todoId === params.id));
    saveDb(db);
    return undefined;
  });

  // --- Time Tracking ---
  register('POST', '/todos/:id/timer/start', ({ db, params, body }) => {
    const user = requireUser(db);
    const { note = '' } = (body as { note?: string } | undefined) || {};
    const running = db.timeEntries.find((e) => e.userId === user.id && e.endedAt === null);
    if (running) {
      throw new ApiError('You already have a running timer. Stop it before starting another.', 409);
    }
    const now = new Date().toISOString();
    const timeEntry: TimeEntry = {
      id: uid('te'),
      todoId: params.id,
      userId: user.id,
      startedAt: now,
      endedAt: null,
      durationSeconds: null,
      note,
      createdAt: now,
    };
    db.timeEntries.unshift(timeEntry);
    saveDb(db);
    return { timeEntry };
  });

  register('POST', '/todos/:id/timer/stop', ({ db, params, body }) => {
    const user = requireUser(db);
    const { note } = (body as { note?: string } | undefined) || {};
    const running = db.timeEntries.find(
      (e) => e.todoId === params.id && e.userId === user.id && e.endedAt === null
    );
    if (!running) throw new ApiError('No active timer on this todo', 404);
    const now = new Date();
    running.endedAt = now.toISOString();
    running.durationSeconds = Math.max(
      1,
      Math.floor((now.getTime() - new Date(running.startedAt).getTime()) / 1000)
    );
    if (note !== undefined) running.note = note;
    saveDb(db);
    return { timeEntry: running };
  });

  register('GET', '/todos/:id/time-entries', ({ db, params }) => {
    requireUser(db);
    const entries = db.timeEntries.filter((e) => e.todoId === params.id);
    const totalDurationSeconds = entries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    return { entries, totalDurationSeconds };
  });

  register('POST', '/todos/:id/time-entries', ({ db, params, body }) => {
    const user = requireUser(db);
    const { startedAt, endedAt, note = '' } = body as {
      startedAt: string;
      endedAt: string;
      note?: string;
    };
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    );
    if (durationSeconds <= 0) throw new ApiError('End time must be after start time', 400);
    const timeEntry: TimeEntry = {
      id: uid('te'),
      todoId: params.id,
      userId: user.id,
      startedAt,
      endedAt,
      durationSeconds,
      note,
      createdAt: new Date().toISOString(),
    };
    db.timeEntries.unshift(timeEntry);
    saveDb(db);
    return { timeEntry };
  });

  register('DELETE', '/todos/:id/time-entries/:entryId', ({ db, params }) => {
    requireUser(db);
    db.timeEntries = db.timeEntries.filter((e) => !(e.id === params.entryId && e.todoId === params.id));
    saveDb(db);
    return undefined;
  });

  // --- Comments & Activity ---
  register('GET', '/todos/:id/comments', ({ db, params }) => {
    requireUser(db);
    const data = db.comments
      .filter((c) => c.todoId === params.id)
      .map((c) => {
        const author = db.users.find((u) => u.id === c.userId);
        return { ...c, author: author ? toPublicUser(author) : undefined };
      });
    return { data };
  });

  register('POST', '/todos/:id/comments', ({ db, params, body }) => {
    const user = requireUser(db);
    const { body: commentText } = body as { body: string };
    const now = new Date().toISOString();
    const comment: Comment = {
      id: uid('com'),
      todoId: params.id,
      userId: user.id,
      body: commentText.trim(),
      createdAt: now,
      updatedAt: now,
      author: user,
    };
    db.comments.push(comment);
    logActivity(db, params.id, user.id, 'commented');
    saveDb(db);
    return { comment };
  });

  register('PATCH', '/todos/:id/comments/:commentId', ({ db, params, body }) => {
    const user = requireUser(db);
    const { body: commentText } = body as { body: string };
    const comment = db.comments.find((c) => c.id === params.commentId && c.todoId === params.id);
    if (!comment) throw new ApiError('Comment not found', 404);
    if (comment.userId !== user.id) throw new ApiError('You can only edit your own comments', 403);
    comment.body = commentText.trim();
    comment.updatedAt = new Date().toISOString();
    saveDb(db);
    return { comment: { ...comment, author: user } };
  });

  register('DELETE', '/todos/:id/comments/:commentId', ({ db, params }) => {
    requireUser(db);
    db.comments = db.comments.filter((c) => !(c.id === params.commentId && c.todoId === params.id));
    saveDb(db);
    return undefined;
  });

  register('GET', '/todos/:id/activity', ({ db, params }) => {
    requireUser(db);
    const data = db.activityLogs
      .filter((a) => a.todoId === params.id)
      .map((a) => {
        const actor = db.users.find((u) => u.id === a.userId);
        return { ...a, actor: actor ? toPublicUser(actor) : undefined };
      });
    return { data };
  });

  // --- Attachments ---
  register('GET', '/todos/:id/attachments', ({ db, params }) => {
    requireUser(db);
    return { attachments: db.attachments.filter((a) => a.todoId === params.id) };
  });

  register('POST', '/todos/:id/attachments', ({ db, params, body }) => {
    const user = requireUser(db);
    const file = body instanceof FormData ? (body.get('file') as File | null) : null;
    const attachment: Attachment = {
      id: uid('att'),
      todoId: params.id,
      userId: user.id,
      fileName: file?.name || 'attachment.bin',
      mimeType: file?.type || 'application/octet-stream',
      sizeBytes: file?.size || 0,
      storageKey: `uploads/${file?.name || 'attachment.bin'}`,
      createdAt: new Date().toISOString(),
    };
    db.attachments.unshift(attachment);
    logActivity(db, params.id, user.id, 'attachment_added', { fileName: attachment.fileName });
    saveDb(db);
    return { attachment };
  });

  register('DELETE', '/todos/:id/attachments/:attachmentId', ({ db, params }) => {
    const user = requireUser(db);
    db.attachments = db.attachments.filter(
      (a) => !(a.id === params.attachmentId && a.todoId === params.id)
    );
    logActivity(db, params.id, user.id, 'attachment_removed');
    saveDb(db);
    return undefined;
  });

  // --- Stats ---
  register('GET', '/stats/summary', ({ db, query }): StatsSummary => {
    const user = requireUser(db);
    const visible = db.todos.filter(
      (t) =>
        !t.deletedAt &&
        canAccessTodo(db, t, user.id) &&
        (!query.listId || t.listId === query.listId)
    );
    const total = visible.length;
    const completed = visible.filter((t) => t.completed).length;
    const active = total - completed;
    const now = new Date();
    const overdue = visible.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < now.getTime()
    ).length;
    const dueToday = visible.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      const d = new Date(t.dueDate);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
    return {
      total,
      completed,
      active,
      overdue,
      dueToday,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      currentStreakDays: completed > 0 ? 4 : 0,
      longestStreakDays: completed > 0 ? 9 : 0,
    };
  });

  register('GET', '/stats/completions', ({ db, query }) => {
    const user = requireUser(db);
    const range = query.range || '7d';
    const days = range === '90d' ? 14 : range === '30d' ? 10 : 7;
    const completedTodos = db.todos.filter(
      (t) => !t.deletedAt && t.completed && t.completedAt && canAccessTodo(db, t, user.id)
    );
    const series: CompletionSeriesPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const period = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const actual = completedTodos.filter((t) => {
        const cd = new Date(t.completedAt!);
        return (
          cd.getFullYear() === d.getFullYear() &&
          cd.getMonth() === d.getMonth() &&
          cd.getDate() === d.getDate()
        );
      }).length;
      const baseline = i === 0 ? 0 : (i * 7) % 3;
      series.push({ period, count: actual + baseline });
    }
    return { series };
  });

  register('GET', '/stats/time', ({ db, query }): TimeStatsBreakdown => {
    const user = requireUser(db);
    const groupBy = query.groupBy || 'list';
    const entries = db.timeEntries.filter((e) => e.userId === user.id && e.durationSeconds);
    const buckets = new Map<string, { label: string; seconds: number }>();

    for (const e of entries) {
      const todo = db.todos.find((t) => t.id === e.todoId);
      if (!todo) continue;
      if (groupBy === 'tag') {
        const tags = todo.tags.length > 0 ? todo.tags : ['untagged'];
        for (const tag of tags) {
          const cur = buckets.get(tag) || { label: `#${tag}`, seconds: 0 };
          cur.seconds += e.durationSeconds || 0;
          buckets.set(tag, cur);
        }
      } else if (groupBy === 'day') {
        const day = new Date(e.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const cur = buckets.get(day) || { label: day, seconds: 0 };
        cur.seconds += e.durationSeconds || 0;
        buckets.set(day, cur);
      } else {
        const list = db.lists.find((l) => l.id === todo.listId);
        const key = list ? list.id : 'inbox';
        const label = list ? list.name : 'Inbox';
        const cur = buckets.get(key) || { label, seconds: 0 };
        cur.seconds += e.durationSeconds || 0;
        buckets.set(key, cur);
      }
    }

    return {
      totalSeconds: entries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0),
      breakdown: Array.from(buckets.entries())
        .map(([key, v]) => ({ key, label: v.label, seconds: v.seconds }))
        .sort((a, b) => b.seconds - a.seconds),
    };
  });

  // --- Transport Dispatch ---
  async function dispatch<T>(
    method: HttpMethod,
    rawPath: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    await delay();
    const { cleanPath, query } = parseQuery(rawPath, options?.params);
    const pathSegments = cleanPath.split('/').filter(Boolean);

    for (const route of routes) {
      if (route.method !== method) continue;
      const params = matchPath(route.segments, pathSegments);
      if (!params) continue;
      const db = loadDb();
      return route.handler({ db, params, query, body }) as T;
    }

    throw new ApiError(`Mock route not found: ${method} ${cleanPath}`, 404);
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => dispatch<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      dispatch<T>('POST', path, body, options),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      dispatch<T>('PATCH', path, body, options),
    delete: <T>(path: string, options?: RequestOptions) =>
      dispatch<T>('DELETE', path, undefined, options),
  };
}
