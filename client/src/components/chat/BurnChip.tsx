import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { burnCountdown } from '../../lib/format';
import { cn } from '../../lib/cn';

export function BurnChip({ expiresAt }: { expiresAt?: number | string | null }) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const label = burnCountdown(expiresAt);
  if (!label) return null;

  const num = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt!).getTime();
  const remaining = isNaN(num) ? 0 : num - Date.now();
  const urgent = remaining < 60_000;
  const soon = remaining < 300_000;

  return (
    <span
      className={cn(
        'mono inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold leading-none transition-opacity duration-700 border',
        urgent
          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 dark:border-red-500/40'
          : 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/40',
        soon ? 'opacity-100' : 'opacity-85'
      )}
      title={`Disappears in ${label}`}
    >
      <Flame size={10} className={urgent ? 'text-red-500 animate-pulse' : 'text-amber-600 dark:text-amber-400'} />
      <span>{label}</span>
    </span>
  );
}
