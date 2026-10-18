import { Reply, X } from 'lucide-react';
import type { ReplyRef } from '../../lib/api/types';

export function ReplyStrip({ reply, me, onClear }: { reply: ReplyRef; me?: string; onClear?: () => void }) {
  const isSelf = Boolean(me && reply?.sender && reply.sender.trim().toLowerCase() === me.trim().toLowerCase());
  const senderPreview = reply?.sender ? (reply.sender.length > 12 ? `${reply.sender.slice(0, 12)}…` : reply.sender) : 'message';
  return (
    <div className="flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 select-none">
      <span className="h-6 w-[3px] shrink-0 rounded-full bg-zinc-900 dark:bg-white" />
      <Reply size={14} className="shrink-0 text-zinc-600 dark:text-zinc-400" />
      <div className="min-w-0 flex-1">
        <p className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-400">
          {isSelf ? 'Replying to yourself' : `Replying to ${senderPreview}`}
        </p>
        <p className="truncate text-[12.5px] text-zinc-900 dark:text-zinc-200 font-medium">{reply?.text}</p>
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Cancel reply"
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
