import { useRef } from 'react';
import { Download, Search, Upload } from 'lucide-react';
import type { CreateTodoInput, Priority, TodoFilters } from '../lib/types';
import { Button } from './ui/Button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from './ui/Dropdown';
import { Input, Select } from './ui/Input';

interface FilterBarProps {
  filters: TodoFilters;
  onChange: (next: TodoFilters) => void;
  onExport: (format: 'json' | 'csv' | 'ics') => void;
  onImport: (items: CreateTodoInput[]) => void;
}

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
        aria-label="Filter by priority"
        value={filters.priority || ''}
        onChange={(e) =>
          onChange({
            ...filters,
            priority: (e.target.value || undefined) as Priority | undefined,
          })
        }
      >
        <option value="">All priorities</option>
        <option value="high">High priority</option>
        <option value="medium">Medium priority</option>
        <option value="low">Low priority</option>
      </Select>

      <Select
        aria-label="Filter by status"
        value={
          filters.completed === undefined ? '' : filters.completed ? 'completed' : 'active'
        }
        onChange={(e) =>
          onChange({
            ...filters,
            completed:
              e.target.value === '' ? undefined : e.target.value === 'completed',
          })
        }
      >
        <option value="">All status</option>
        <option value="active">Open</option>
        <option value="completed">Completed</option>
      </Select>

      <Select
        aria-label="Sort tasks"
        value={`${filters.sortBy || 'createdAt'}:${filters.order || 'desc'}`}
        onChange={(e) => {
          const [sortBy, order] = e.target.value.split(':') as [
            TodoFilters['sortBy'],
            TodoFilters['order'],
          ];
          onChange({ ...filters, sortBy, order });
        }}
      >
        <option value="createdAt:desc">Newest first</option>
        <option value="dueDate:asc">Due soonest</option>
        <option value="priority:desc">Highest priority</option>
        <option value="title:asc">Title A–Z</option>
      </Select>

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
