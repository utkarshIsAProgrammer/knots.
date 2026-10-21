import { memo } from 'react';
import { cn } from '../../lib/cn';
import { isMediaReaction } from '../../lib/mediaUrl';
import type { Reaction } from '../../lib/api/types';

export const ReactionPill = memo(function ReactionPill({
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
    <div className={cn('absolute -bottom-2.5 flex items-center gap-1 z-10 select-none flex-wrap', className)}>
      {reactions.map((r, idx) => {
        const isMedia = isMediaReaction(r.emoji);
        const isMine = (r.knotId || '').toLowerCase() === (mine || '').toLowerCase();

        return (
          <button
            key={`${r.knotId || idx}-${r.emoji.slice(0, 32)}`}
            type="button"
            onClick={() => onToggle(r.emoji)}
            title={isMine ? 'Your reaction (click to remove)' : (r.knotId || '')}
            className={cn(
              'flex h-6 min-w-[24px] items-center justify-center rounded-md bg-white dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800 px-1.5 text-[11px] leading-none shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer',
              isMine && 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10 ring-1 ring-black/20 dark:ring-white/20'
            )}
          >
            {isMedia ? (
              <img
                src={r.emoji}
                alt="Reaction"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="h-4 w-4 object-contain pointer-events-none rounded-[2px]"
              />
            ) : (
              <span>{r.emoji}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});
