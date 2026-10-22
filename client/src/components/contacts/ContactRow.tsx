import { Ban, BellOff, Check, Clock } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';
import { relativeTime, shortKnotId } from '../../lib/format';
import type { Contact } from '../../lib/api/types';

interface ContactRowProps {
  contact: Contact;
  active?: boolean;
  preview?: string;
  previewTime?: number;
  isDeleted?: boolean;
  unread?: number;
  online?: boolean;
  typing?: boolean;
  onClick?: () => void;
}

export function ContactRow({
  contact,
  active,
  preview,
  previewTime,
  isDeleted,
  unread = 0,
  online,
  typing,
  onClick
}: ContactRowProps) {
  const name = contact.alias || shortKnotId(contact.knot_id);
  const pending = contact.status === 'pending';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 select-none',
        active
          ? 'bg-zinc-200/90 dark:bg-white/10 text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/20 shadow-sm'
          : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-900 dark:text-white'
      )}
    >
      {active && (
        <span
          className="filament-bg absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full"
          aria-hidden="true"
        />
      )}
      <Avatar knotId={contact.knot_id} online={online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14.5px] font-medium tracking-[-0.01em] text-zinc-900 dark:text-white">
            {name}
          </p>
          {contact.muted && <BellOff size={12} className="shrink-0 text-amber-500" />}
          {pending && <Clock size={12} className="shrink-0 text-amber-500" />}
        </div>
        <p className={cn('truncate text-[12.5px]', typing ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 dark:text-zinc-400')}>
          {typing ? (
            'typing…'
          ) : isDeleted ? (
            <span className="inline-flex items-center gap-1 italic text-zinc-400 dark:text-zinc-500">
              <Ban size={12} className="shrink-0" />
              <span>{preview}</span>
            </span>
          ) : (
            preview || (pending ? 'Request pending' : 'No messages yet')
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex flex-col items-end gap-1">
          {previewTime ? <span className="mono text-[10.5px] text-[var(--text-3)]">{relativeTime(previewTime)}</span> : null}
          {unread > 0 ? (
            <Badge tone="filament" className="border-[color-mix(in_srgb,var(--accent)_50%,transparent)]">
              {unread > 9 ? '9+' : unread}
            </Badge>
          ) : preview && !pending && !isDeleted ? (
            <Check size={13} className="text-[var(--text-3)] opacity-60" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
