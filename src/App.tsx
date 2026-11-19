import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useLists } from './hooks/useLists';
import { ToastProvider } from './hooks/useToast';
import { AppLayout, type NavSection } from './layouts/AppLayout';
import { api } from './lib/api';
import type { CreateTodoInput, List } from './lib/types';
import { CreateTodoModal } from './components/CreateTodoModal';
import { CreateListModal, ManageMembersModal } from './components/ListModals';
import { AuthPage } from './pages/AuthPage';
import { StatsPage } from './pages/StatsPage';
import { TasksPage } from './pages/TasksPage';

function WorkspaceShell() {
  const { user, loading } = useAuth();
  const { lists, refresh: refreshLists, createList, deleteList } = useLists(Boolean(user));
  const [activeNav, setActiveNav] = useState<NavSection>({ type: 'view', view: 'all' });
  const [newTodoOpen, setNewTodoOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [managingList, setManagingList] = useState<List | null>(null);
  const [tasksKey, setTasksKey] = useState(0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-xs font-mono text-ink-muted">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const activeList =
    activeNav.type === 'list' ? lists.find((l) => l.id === activeNav.listId) : undefined;

  const handleCreateTodo = async (input: CreateTodoInput) => {
    await api.createTodo(input);
    setTasksKey((k) => k + 1);
    refreshLists();
  };

  return (
    <AppLayout
      activeNav={activeNav}
      onSelectNav={setActiveNav}
      lists={lists}
      onOpenNewTodo={() => setNewTodoOpen(true)}
      onOpenNewList={() => setNewListOpen(true)}
      onManageListMembers={(l) => setManagingList(l)}
    >
      {activeNav.type === 'stats' ? (
        <StatsPage />
      ) : (
        <TasksPage
          key={`${JSON.stringify(activeNav)}-${tasksKey}`}
          viewMode={activeNav.type === 'list' ? 'list' : activeNav.view}
          activeList={activeList}
          lists={lists}
          onOpenNewTodo={() => setNewTodoOpen(true)}
          onManageListMembers={(l) => setManagingList(l)}
          onTodosMutated={refreshLists}
        />
      )}

      <CreateTodoModal
        open={newTodoOpen}
        onOpenChange={setNewTodoOpen}
        lists={lists}
        defaultListId={activeList?.id ?? null}
        onSubmit={handleCreateTodo}
      />

      <CreateListModal
        open={newListOpen}
        onOpenChange={setNewListOpen}
        onCreate={createList}
      />

      <ManageMembersModal
        list={managingList}
        onClose={() => setManagingList(null)}
        onDeleteList={async (listId) => {
          await deleteList(listId, false);
          if (activeNav.type === 'list' && activeNav.listId === listId) {
            setActiveNav({ type: 'view', view: 'all' });
          }
        }}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WorkspaceShell />
      </AuthProvider>
    </ToastProvider>
  );
}
