import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'default' | 'filament' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  default: 'text-[var(--text-2)]',
  filament: 'text-[var(--accent-2)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  danger: 'text-[var(--danger)]'
};

export function Badge({
  children,
  tone = 'default',
  className
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'glass inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1.5 text-[10.5px] font-semibold border border-zinc-800',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'default', pulsing }: { tone?: Tone; pulsing?: boolean }) {
  return (
    <span className={cn('inline-block h-2 w-2 rounded-full', pulsing && 'breathe', tones[tone])} style={{ background: 'currentColor' }} />
  );
}
