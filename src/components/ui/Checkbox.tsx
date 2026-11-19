import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  variant?: 'task' | 'select';
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  disabled,
  ariaLabel = 'Toggle checkbox',
  variant = 'task',
  className,
}: CheckboxProps) {
  const isTask = variant === 'task';
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      whileTap={{ scale: 0.86 }}
      className={cn(
        'relative flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 disabled:cursor-not-allowed disabled:opacity-40',
        isTask ? 'rounded-full' : 'rounded-[5px]',
        checked
          ? isTask
            ? 'border-status-success bg-status-success text-white'
            : 'border-ink bg-ink text-surface'
          : 'border-line-strong bg-surface hover:border-ink',
        className
      )}
    >
      <svg viewBox="0 0 12 10" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth={2.2}>
        <motion.path
          d="M1.5 5.2L4.5 8.2L10.5 1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </svg>
    </motion.button>
  );
}
