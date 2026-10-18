import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  const id = useId();
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto', className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative shrink-0 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
              active
                ? 'text-zinc-900 dark:text-white font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                className="absolute inset-0 rounded-md border border-zinc-300 dark:border-white/20 bg-zinc-200/80 dark:bg-white/10 shadow-sm"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
