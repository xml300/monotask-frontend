import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors',
  {
    variants: {
      variant: {
        default: 'border-line bg-surface-subtle text-ink-secondary',
        solid: 'border-ink bg-ink text-surface',
        success: 'border-status-success/25 bg-status-success/10 text-status-success',
        warning: 'border-status-warning/25 bg-status-warning/10 text-status-warning',
        danger: 'border-status-danger/25 bg-status-danger/10 text-status-danger',
        info: 'border-status-info/25 bg-status-info/10 text-status-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
