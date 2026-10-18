import { cn } from '../../lib/cn';
import type { Reaction } from '../../lib/api/types';

export function ReactionPill({
  reactions,
  mine,
  onToggle,
  className
}: {
  reactions: Reaction[];
  mine: string;
  onToggle: (emoji: string) => void;
  className?: string;
}) {
  if (!reactions.length) return null;
  return (
    <div className={cn('absolute -bottom-2 flex items-center gap-0.5 z-10 select-none', className)}>
      {reactions.map((r, idx) => (
        <button
          key={`${r.knotId || idx}-${r.emoji}`}
          onClick={() => onToggle(r.emoji)}
          title={(r.knotId || '') === mine ? 'Your reaction' : (r.knotId || '')}
          className={cn(
            'flex h-5 items-center justify-center rounded-md bg-white dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 px-1.5 text-[11px] leading-none shadow-sm transition-transform hover:scale-110 active:scale-95',
            r.knotId === mine && 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10 ring-1 ring-black/20 dark:ring-white/20'
          )}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  );
}
