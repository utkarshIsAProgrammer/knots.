import type { ReactNode } from 'react';
import { KnotMark } from './Logo';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-14 text-center', className)}>
      <div className="grid h-20 w-20 place-items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#000000] shadow-sm">
        {icon ?? <KnotMark className="h-9 w-9 opacity-80" />}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-white">{title}</h3>
        {description && <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
