import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface ModalContentProps extends DialogPrimitive.DialogContentProps {
  title?: string;
  description?: string;
}

export function DialogContent({
  className,
  children,
  title,
  description,
  ...rest
}: ModalContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface-elevated p-6 shadow-elevated focus:outline-none',
          className
        )}
        {...rest}
      >
        {(title || description) && (
          <header className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-ink">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-xs text-ink-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-lg p-1 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
