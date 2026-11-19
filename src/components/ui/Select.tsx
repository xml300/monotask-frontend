import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const EMPTY_SENTINEL = '__empty__';

export const SelectRoot = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'inline-flex h-9 items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:border-line-strong focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-ink-muted',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-150" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 6,
  ...props
}: SelectPrimitive.SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-surface-elevated p-1 text-ink shadow-elevated',
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-60 overflow-y-auto">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  dotClassName,
  ...props
}: SelectPrimitive.SelectItemProps & { dotClassName?: string }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-secondary outline-none transition-colors focus:bg-surface-subtle focus:text-ink data-[state=checked]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2">
        {dotClassName && <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />}
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </span>
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 shrink-0 text-ink" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  dotClassName?: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  ariaLabel,
  className,
  disabled,
}: SelectProps) {
  const internalValue = value === '' ? EMPTY_SENTINEL : value;
  const activeOption = options.find((o) => o.value === value);

  return (
    <SelectRoot
      value={internalValue}
      onValueChange={(v) => onValueChange(v === EMPTY_SENTINEL ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <span className="flex min-w-0 items-center gap-2 truncate">
          {activeOption?.dotClassName && (
            <span className={cn('h-2 w-2 shrink-0 rounded-full', activeOption.dotClassName)} />
          )}
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem
            key={opt.value === '' ? EMPTY_SENTINEL : opt.value}
            value={opt.value === '' ? EMPTY_SENTINEL : opt.value}
            dotClassName={opt.dotClassName}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}
