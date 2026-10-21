import { useMemo, useState } from 'react';
import { ArrowRight, Check, Forward, Search, Users } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { useContacts } from '../../features/contacts';
import { useChat } from '../../features/chat';
import { shortKnotId } from '../../lib/format';
import { formatMessageSnippet } from '../../lib/stealth';
import type { StoredMessage } from '../../lib/storage/db';

interface ForwardModalProps {
  open: boolean;
  message: StoredMessage | null;
  me: string;
  onClose: () => void;
  onForward: (recipientKnotId: string, message: StoredMessage) => Promise<void> | void;
}

export function ForwardModal({ open, message, me, onClose, onForward }: ForwardModalProps) {
  const [query, setQuery] = useState('');
  const [forwardedTo, setForwardedTo] = useState<Set<string>>(new Set());
  const [forwarding, setForwarding] = useState<string | null>(null);

  const contacts = useContacts((s) => s.contacts);
  const threads = useChat((s) => s.threads);

  // Combine contacts and active threads into a unique recipient list
  const recipients = useMemo(() => {
    const map = new Map<string, { knotId: string; name: string }>();
    const meLower = (me || '').trim().toLowerCase();

    // 1. Contacts
    for (const c of contacts) {
      const k = (c.knot_id || '').trim();
      if (!k || k.toLowerCase() === meLower) continue;
      map.set(k.toLowerCase(), { knotId: k, name: c.alias || shortKnotId(k) });
    }

    // 2. Active threads
    for (const threadKey of Object.keys(threads)) {
      const k = threadKey.trim();
      if (!k || k.toLowerCase() === meLower) continue;
      if (!map.has(k.toLowerCase())) {
        map.set(k.toLowerCase(), { knotId: k, name: shortKnotId(k) });
      }
    }

    return Array.from(map.values());
  }, [contacts, threads, me]);

  const filtered = useMemo(() => {
    if (!query.trim()) return recipients;
    const q = query.trim().toLowerCase();
    return recipients.filter(
      (r) => r.name.toLowerCase().includes(q) || r.knotId.toLowerCase().includes(q)
    );
  }, [recipients, query]);

  const handleForward = async (recipientKnotId: string) => {
    if (!message || forwarding) return;
    setForwarding(recipientKnotId);
    try {
      await onForward(recipientKnotId, message);
      setForwardedTo((prev) => new Set([...prev, recipientKnotId.toLowerCase()]));
    } finally {
      setForwarding(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setForwardedTo(new Set());
    setForwarding(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Forward message" className="max-w-md">
      <div className="flex flex-col gap-3">
        {/* Message preview snippet */}
        {message && (
          <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2.5">
            <Forward size={16} className="text-zinc-500 shrink-0" />
            <p className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
              {formatMessageSnippet(message) || 'Empty message'}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts or chats…"
            icon={<Search size={14} />}
            className="h-9 text-xs"
            autoFocus
          />
        </div>

        {/* Recipient list */}
        <div className="no-scrollbar flex max-h-60 flex-col gap-1 overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-zinc-500">
              <Users size={24} className="mb-1.5 opacity-40" />
              <span>No matching conversations found</span>
            </div>
          ) : (
            filtered.map((r) => {
              const alreadySent = forwardedTo.has(r.knotId.toLowerCase());
              const isSending = forwarding === r.knotId;

              return (
                <div
                  key={r.knotId}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900/80"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar knotId={r.knotId} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">{r.name}</p>
                      <p className="truncate font-mono text-[10px] text-zinc-500">{shortKnotId(r.knotId)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleForward(r.knotId)}
                    disabled={alreadySent || isSending}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      alreadySent
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : isSending
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                          : 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95'
                    }`}
                  >
                    {alreadySent ? (
                      <>
                        <Check size={12} strokeWidth={2.5} />
                        <span>Sent</span>
                      </>
                    ) : isSending ? (
                      <span>Sending…</span>
                    ) : (
                      <>
                        <span>Send</span>
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
