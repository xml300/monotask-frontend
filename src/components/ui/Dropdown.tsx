import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

export const Dropdown = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;
export const DropdownSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-line" />;

export function DropdownContent({
  className,
  sideOffset = 6,
  ...props
}: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[170px] overflow-hidden rounded-xl border border-line bg-surface-elevated p-1 text-ink shadow-elevated',
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function DropdownItem({
  className,
  danger,
  ...props
}: DropdownMenu.DropdownMenuItemProps & { danger?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        danger
          ? 'text-status-danger focus:bg-status-danger/10'
          : 'text-ink-secondary focus:bg-surface-subtle focus:text-ink',
        className
      )}
      {...props}
    />
  );
}
