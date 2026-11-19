import { useRef } from 'react';
import { Download, Search, Upload } from 'lucide-react';
import type { CreateTodoInput, Priority, TodoFilters } from '../lib/types';
import { Button } from './ui/Button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from './ui/Dropdown';
import { Input } from './ui/Input';
import { Select, type SelectOption } from './ui/Select';

interface FilterBarProps {
  filters: TodoFilters;
  onChange: (next: TodoFilters) => void;
  onExport: (format: 'json' | 'csv' | 'ics') => void;
  onImport: (items: CreateTodoInput[]) => void;
}

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All priorities' },
  { value: 'high', label: 'High priority', dotClassName: 'bg-status-danger' },
  { value: 'medium', label: 'Medium priority', dotClassName: 'bg-status-warning' },
  { value: 'low', label: 'Low priority', dotClassName: 'bg-ink-muted/60' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All status' },
  { value: 'active', label: 'Open', dotClassName: 'bg-status-info' },
  { value: 'completed', label: 'Completed', dotClassName: 'bg-status-success' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'dueDate:asc', label: 'Due soonest' },
  { value: 'priority:desc', label: 'Highest priority' },
  { value: 'title:asc', label: 'Title A–Z' },
];

export function FilterBar({ filters, onChange, onExport, onImport }: FilterBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.todos;
      if (Array.isArray(list)) {
        onImport(list);
      }
    } catch {
      // ignore invalid file
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
        <Input
          id="input-search-todos"
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Search tasks, notes, or #tags..."
          className="pl-8"
        />
      </div>

      <Select
        ariaLabel="Filter by priority"
        className="w-[148px]"
        value={filters.priority || ''}
        options={PRIORITY_OPTIONS}
        onValueChange={(v) =>
          onChange({
            ...filters,
            priority: (v || undefined) as Priority | undefined,
          })
        }
      />

      <Select
        ariaLabel="Filter by status"
        className="w-[132px]"
        value={
          filters.completed === undefined ? '' : filters.completed ? 'completed' : 'active'
        }
        options={STATUS_OPTIONS}
        onValueChange={(v) =>
          onChange({
            ...filters,
            completed: v === '' ? undefined : v === 'completed',
          })
        }
      />

      <Select
        ariaLabel="Sort tasks"
        className="w-[148px]"
        value={`${filters.sortBy || 'createdAt'}:${filters.order || 'desc'}`}
        options={SORT_OPTIONS}
        onValueChange={(v) => {
          const [sortBy, order] = v.split(':') as [
            TodoFilters['sortBy'],
            TodoFilters['order'],
          ];
          onChange({ ...filters, sortBy, order });
        }}
      />

      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="outline" size="md">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </DropdownTrigger>
        <DropdownContent align="end">
          <DropdownItem onClick={() => onExport('json')}>Export JSON</DropdownItem>
          <DropdownItem onClick={() => onExport('csv')}>Export CSV</DropdownItem>
          <DropdownItem onClick={() => onExport('ics')}>Export Calendar (.ics)</DropdownItem>
        </DropdownContent>
      </Dropdown>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileImport}
      />
      <Button variant="outline" size="md" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        Import
      </Button>
    </div>
  );
}
