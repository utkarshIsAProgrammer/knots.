import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md'
}: SegmentedProps<T>) {
  const groupId = useId();
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg p-1 bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-inner',
        className
      )}
      role="tablist"
      aria-label="Segmented control"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-200',
              size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-4 text-[13px]',
              active
                ? 'text-zinc-900 dark:text-white font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                className="absolute inset-0 rounded-md border border-zinc-300/80 dark:border-white/20 bg-white dark:bg-[#000000] shadow-sm"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
              {opt.count !== undefined && opt.count > 0 && (
                <span className="mono text-[10.5px] rounded-full bg-zinc-300/80 dark:bg-white/20 px-1.5 py-0.2 text-zinc-900 dark:text-white font-semibold">
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
