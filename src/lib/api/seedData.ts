import type {
  ActivityLogEntry,
  Attachment,
  Comment,
  List,
  ListMember,
  Reminder,
  Subtask,
  TimeEntry,
  Todo,
  TodoDependency,
  User,
} from '../types';

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();
const daysFromNow = (d: number) => new Date(now + d * 86400_000).toISOString();

export interface MockDb {
  users: Array<User & { password: string }>;
  lists: List[];
  listMembers: ListMember[];
  todos: Todo[];
  subtasks: Subtask[];
  dependencies: TodoDependency[];
  reminders: Reminder[];
  timeEntries: TimeEntry[];
  comments: Comment[];
  activityLogs: ActivityLogEntry[];
  attachments: Attachment[];
}

export function createSeedDb(): MockDb {
  const users: Array<User & { password: string }> = [
    {
      id: 'user-1',
      email: 'alex@monotask.dev',
      name: 'Alex Rivera',
      password: 'password123',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    },
    {
      id: 'user-2',
      email: 'sam@monotask.dev',
      name: 'Sam Chen',
      password: 'password123',
      createdAt: daysAgo(25),
      updatedAt: daysAgo(25),
    },
    {
      id: 'user-3',
      email: 'maya@monotask.dev',
      name: 'Maya Patel',
      password: 'password123',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
  ];

  const lists: List[] = [
    {
      id: 'list-1',
      ownerId: 'user-1',
      name: 'Backend API Sprint',
      color: '#111111',
      icon: 'terminal',
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
    },
    {
      id: 'list-2',
      ownerId: 'user-1',
      name: 'Design System',
      color: '#525252',
      icon: 'layers',
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1),
    },
    {
      id: 'list-3',
      ownerId: 'user-2',
      name: 'Launch Checklist',
      color: '#171717',
      icon: 'rocket',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
    },
  ];

  const listMembers: ListMember[] = [
    { id: 'lm-1', listId: 'list-1', userId: 'user-1', role: 'owner', addedBy: 'user-1', joinedAt: daysAgo(14) },
    { id: 'lm-2', listId: 'list-1', userId: 'user-2', role: 'editor', addedBy: 'user-1', joinedAt: daysAgo(13) },
    { id: 'lm-3', listId: 'list-1', userId: 'user-3', role: 'viewer', addedBy: 'user-1', joinedAt: daysAgo(12) },
    { id: 'lm-4', listId: 'list-2', userId: 'user-1', role: 'owner', addedBy: 'user-1', joinedAt: daysAgo(12) },
    { id: 'lm-5', listId: 'list-3', userId: 'user-2', role: 'owner', addedBy: 'user-2', joinedAt: daysAgo(10) },
    { id: 'lm-6', listId: 'list-3', userId: 'user-1', role: 'editor', addedBy: 'user-2', joinedAt: daysAgo(9) },
  ];

  const todos: Todo[] = [
    {
      id: 'todo-1',
      userId: 'user-1',
      listId: 'list-1',
      assigneeId: 'user-1',
      title: 'Implement JWT authentication middleware',
      description: 'Verify Bearer tokens, attach user context to Express requests, and return consistent 401 errors.',
      completed: true,
      completedAt: daysAgo(2),
      priority: 'high',
      tags: ['auth', 'security'],
      dueDate: daysAgo(2),
      recurrence: null,
      archivedAt: null,
      deletedAt: null,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(2),
    },
    {
      id: 'todo-2',
      userId: 'user-1',
      listId: 'list-1',
      assigneeId: 'user-2',
      title: 'Build cycle detection for task dependencies',
      description: 'Run graph traversal before inserting a dependency so circular chains are rejected cleanly.',
      completed: false,
      completedAt: null,
      priority: 'high',
      tags: ['backend', 'algorithms'],
      dueDate: daysFromNow(0),
      recurrence: null,
      archivedAt: null,
      deletedAt: null,
      createdAt: daysAgo(5),
      updatedAt: hoursAgo(4),
    },
    {
      id: 'todo-3',
      userId: 'user-1',
      listId: 'list-1',
      assigneeId: 'user-1',
      title: 'Wire recurring task spawning on toggle',
      description: 'When a recurring todo is completed, generate the next occurrence shifted by its interval.',
      completed: false,
      completedAt: null,
      priority: 'medium',
      tags: ['backend', 'workflow'],
      dueDate: daysFromNow(2),
      recurrence: { frequency: 'weekly', interval: 1, endsAt: null },
      archivedAt: null,
      deletedAt: null,
      createdAt: daysAgo(4),
      updatedAt: hoursAgo(6),
    },
    {
      id: 'todo-4',
      userId: 'user-1',
      listId: 'list-2',
      assigneeId: 'user-1',
      title: 'Audit monochrome contrast & status tokens',
      description: 'Confirm WCAG AA contrast for black/white surfaces and semantic priority indicators in both light and dark modes.',
      completed: false,
      completedAt: null,
      priority: 'high',
      tags: ['ui', 'accessibility'],
      dueDate: daysAgo(1), // Overdue!
      recurrence: null,
      archivedAt: null,
      deletedAt: null,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(1),
    },
    {
      id: 'todo-5',
      userId: 'user-2',
      listId: 'list-3',
      assigneeId: 'user-1',
      title: 'Prepare Postman collection & API demo script',
      description: 'Cover auth flow, shared lists, dependency blocking, and CSV export for the group presentation.',
      completed: false,
      completedAt: null,
      priority: 'medium',
      tags: ['docs', 'demo'],
      dueDate: daysFromNow(4),
      recurrence: null,
      archivedAt: null,
      deletedAt: null,
      createdAt: daysAgo(3),
      updatedAt: hoursAgo(8),
    },
    {
      id: 'todo-6',
      userId: 'user-1',
      listId: null,
      assigneeId: 'user-1',
      title: 'Review pull requests from Track B & Track C',
      description: 'Check shared-list role guards and time-entry duration math.',
      completed: false,
      completedAt: null,
      priority: 'low',
      tags: ['review'],
      dueDate: daysFromNow(1),
      recurrence: { frequency: 'daily', interval: 1, endsAt: null },
      archivedAt: null,
      deletedAt: null,
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(2),
    },
    {
      id: 'todo-7',
      userId: 'user-1',
      listId: 'list-2',
      assigneeId: 'user-1',
      title: 'Draft initial typography scale',
      description: 'Inter for UI, JetBrains Mono for timestamps and timers.',
      completed: true,
      completedAt: daysAgo(1),
      priority: 'low',
      tags: ['ui'],
      dueDate: daysAgo(3),
      recurrence: null,
      archivedAt: daysAgo(1),
      deletedAt: null,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(1),
    },
    {
      id: 'todo-8',
      userId: 'user-1',
      listId: null,
      assigneeId: null,
      title: 'Old spike: drag-and-drop ordering prototype',
      description: 'Removed from scope per project brief.',
      completed: false,
      completedAt: null,
      priority: 'low',
      tags: ['spike'],
      dueDate: null,
      recurrence: null,
      archivedAt: null,
      deletedAt: hoursAgo(5),
      createdAt: daysAgo(10),
      updatedAt: hoursAgo(5),
    },
  ];

  const subtasks: Subtask[] = [
    { id: 'sub-1', todoId: 'todo-2', title: 'Reject self-dependency (A -> A)', completed: true, createdAt: daysAgo(4), updatedAt: daysAgo(3) },
    { id: 'sub-2', todoId: 'todo-2', title: 'Implement DFS cycle check', completed: true, createdAt: daysAgo(4), updatedAt: daysAgo(2) },
    { id: 'sub-3', todoId: 'todo-2', title: 'Add unit tests for 3-node cycles', completed: false, createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    { id: 'sub-4', todoId: 'todo-4', title: 'Check light mode borders & muted text', completed: true, createdAt: daysAgo(5), updatedAt: daysAgo(2) },
    { id: 'sub-5', todoId: 'todo-4', title: 'Verify dark mode semantic badges', completed: false, createdAt: daysAgo(5), updatedAt: daysAgo(5) },
  ];

  // todo-3 is blocked by todo-2
  const dependencies: TodoDependency[] = [
    { id: 'dep-1', todoId: 'todo-3', dependsOnTodoId: 'todo-2', createdAt: daysAgo(3) },
  ];

  const reminders: Reminder[] = [
    {
      id: 'rem-1',
      todoId: 'todo-2',
      userId: 'user-1',
      remindAt: daysFromNow(1),
      channel: 'email',
      sentAt: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const timeEntries: TimeEntry[] = [
    {
      id: 'te-1',
      todoId: 'todo-1',
      userId: 'user-1',
      startedAt: daysAgo(2),
      endedAt: new Date(new Date(daysAgo(2)).getTime() + 5400_000).toISOString(),
      durationSeconds: 5400,
      note: 'JWT signing & middleware tests',
      createdAt: daysAgo(2),
    },
    {
      id: 'te-2',
      todoId: 'todo-2',
      userId: 'user-1',
      startedAt: hoursAgo(5),
      endedAt: hoursAgo(4),
      durationSeconds: 3600,
      note: 'Adjacency traversal prototype',
      createdAt: hoursAgo(5),
    },
  ];

  const comments: Comment[] = [
    {
      id: 'com-1',
      todoId: 'todo-2',
      userId: 'user-2',
      body: 'Let us make sure deleting a prerequisite also cleans up the dependency record.',
      createdAt: hoursAgo(10),
      updatedAt: hoursAgo(10),
    },
    {
      id: 'com-2',
      todoId: 'todo-2',
      userId: 'user-1',
      body: 'Agreed — cascade delete handles it in permanent delete.',
      createdAt: hoursAgo(8),
      updatedAt: hoursAgo(8),
    },
  ];

  const activityLogs: ActivityLogEntry[] = [
    { id: 'act-1', todoId: 'todo-2', userId: 'user-1', action: 'created', metadata: { title: 'Build cycle detection for task dependencies' }, createdAt: daysAgo(5) },
    { id: 'act-2', todoId: 'todo-2', userId: 'user-1', action: 'assigned', metadata: { assigneeId: 'user-2' }, createdAt: daysAgo(4) },
    { id: 'act-3', todoId: 'todo-2', userId: 'user-2', action: 'commented', metadata: {}, createdAt: hoursAgo(10) },
    { id: 'act-4', todoId: 'todo-3', userId: 'user-1', action: 'created', metadata: {}, createdAt: daysAgo(4) },
  ];

  const attachments: Attachment[] = [
    {
      id: 'att-1',
      todoId: 'todo-2',
      userId: 'user-1',
      fileName: 'dependency-graph-spec.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 245_800,
      storageKey: 'uploads/dependency-graph-spec.pdf',
      createdAt: daysAgo(3),
    },
  ];

  return {
    users,
    lists,
    listMembers,
    todos,
    subtasks,
    dependencies,
    reminders,
    timeEntries,
    comments,
    activityLogs,
    attachments,
  };
}
