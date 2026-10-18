import { Ban, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { GlassPanel } from '../ui/GlassPanel';
import type { ContactRequest } from '../../lib/api/types';
import { shortKnotId } from '../../lib/format';

interface RequestCardProps {
  request: ContactRequest;
  onRespond: (requestId: string, action: 'accept' | 'reject' | 'block') => void;
}

export function RequestCard({ request, onRespond }: RequestCardProps) {
  return (
    <GlassPanel elevation="raised" radius="lg" className="space-y-3.5">
      <div className="flex items-center gap-3">
        <Avatar knotId={request.from_knot_id} />
        <div className="min-w-0 flex-1">
          <p className="mono truncate text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">{shortKnotId(request.from_knot_id)}</p>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">wants to connect</p>
        </div>
      </div>
      {request.memo && (
        <p className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-300">
          {request.memo}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" className="flex-1" onClick={() => onRespond(request._id, 'accept')}>
          <Check size={14} /> Accept
        </Button>
        <Button variant="glass" size="sm" onClick={() => onRespond(request._id, 'reject')} aria-label="Decline">
          <X size={15} />
        </Button>
        <Button variant="danger" size="sm" onClick={() => onRespond(request._id, 'block')} aria-label="Block">
          <Ban size={15} />
        </Button>
      </div>
    </GlassPanel>
  );
}
