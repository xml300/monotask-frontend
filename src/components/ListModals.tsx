import React, { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { useListMembers } from '../hooks/useLists';
import type { List } from '../lib/types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Dialog, DialogContent } from './ui/Dialog';
import { Input } from './ui/Input';
import { Select, type SelectOption } from './ui/Select';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string }) => Promise<unknown>;
}

export function CreateListModal({ open, onOpenChange, onCreate }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await onCreate({ name: name.trim() });
      setName('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New List" description="Group related tasks and invite collaborators.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="list-name" className="mb-1 block text-xs font-medium text-ink-secondary">
              List Name
            </label>
            <Input
              id="list-name"
              autoFocus
              required
              placeholder="e.g. Sprint 4, Personal, Q1 Release"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ManageMembersModalProps {
  list: List | null;
  onClose: () => void;
  onDeleteList: (listId: string) => Promise<void>;
}

export function ManageMembersModal({ list, onClose, onDeleteList }: ManageMembersModalProps) {
  const { members, addMember, updateMemberRole, removeMember } = useListMembers(list?.id ?? null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    try {
      await addMember(email.trim(), role);
      setEmail('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open={Boolean(list)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={list ? `Manage "${list.name}"` : 'Manage List'}
        description="Invite teammates by email or update their access level."
      >
        <div className="space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              type="email"
              placeholder="teammate@monotask.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select
              ariaLabel="Member role"
              className="w-[104px]"
              value={role}
              options={ROLE_OPTIONS}
              onValueChange={(v) => setRole(v as 'editor' | 'viewer')}
            />
            <Button type="submit" size="md">
              <UserPlus className="h-3.5 w-3.5" />
              Add
            </Button>
          </form>

          {error && <p className="text-xs text-status-danger">{error}</p>}

          <div className="divide-y divide-line rounded-xl border border-line">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{m.user?.name || m.userId}</p>
                  <p className="truncate text-xs text-ink-muted">{m.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.role === 'owner' ? (
                    <Badge variant="solid">Owner</Badge>
                  ) : (
                    <>
                      <Select
                        ariaLabel="Change role"
                        className="h-7 w-[96px]"
                        value={m.role}
                        options={ROLE_OPTIONS}
                        onValueChange={(v) => updateMemberRole(m.userId, v as 'editor' | 'viewer')}
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(m.userId)}
                        aria-label="Remove member"
                        className="rounded-md p-1 text-ink-muted transition-colors hover:text-status-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {list && list.role === 'owner' && (
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-ink-muted">Deleting keeps tasks in Inbox.</span>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await onDeleteList(list.id);
                  onClose();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete List
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
