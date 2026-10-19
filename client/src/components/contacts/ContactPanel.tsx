import { useMemo } from 'react';
import { Plus, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { EmptyState } from '../ui/EmptyState';
import { RowSkeleton } from '../ui/Skeleton';
import { ContactRow } from './ContactRow';
import { RequestCard } from './RequestCard';
import { useContacts } from '../../features/contacts';
import { useChat } from '../../features/chat';
import { usePresence } from '../../features/presence';
import { useIdentity } from '../../features/identity';
import { useUI } from '../../features/ui';
import { shortKnotId } from '../../lib/format';
import type { Contact } from '../../lib/api/types';
import type { StoredMessage } from '../../lib/storage/db';

export function ContactPanel() {
  const { contacts, incoming, outgoing, loading, hydrated, respond } = useContacts();
  const threads = useChat((s) => s.threads);
  const peers = usePresence((s) => s.peers);
  const identity = useIdentity((s) => s.identity);
  const relayOk = useIdentity((s) => s.relayOk);
  const { contactFilter, setContactFilter, activeThread, openThread, openOverlay, setSection } = useUI();

  const me = identity?.knotId ?? '';

  const rows = useMemo(() => {
    const peersMap = new Map<string, { contact: Contact; thread: StoredMessage[] }>();

    // 1. Add all contacts that are accepted
    for (const contact of contacts.filter((c) => c.status === 'accepted')) {
      const cLower = contact.knot_id.toLowerCase();
      const threadMatchKey = Object.keys(threads).find((k) => k.toLowerCase() === cLower);
      const thread: StoredMessage[] = (threadMatchKey ? threads[threadMatchKey] : threads[contact.knot_id]) ?? [];
      peersMap.set(cLower, { contact, thread });
    }

    // 2. Add any active conversations from threads (so conversations are never lost)
    for (const [threadId, msgs] of Object.entries(threads)) {
      if (!msgs || msgs.length === 0) continue;
      const tLower = threadId.toLowerCase();
      if (!peersMap.has(tLower)) {
        const contactMatch = contacts.find((c) => (c.knot_id || '').toLowerCase() === tLower);
        const contact: Contact = contactMatch || {
          knot_id: threadId,
          alias: shortKnotId(threadId),
          status: 'accepted',
          created_at: new Date(msgs[0]?.createdAt || Date.now()).toISOString()
        };
        peersMap.set(tLower, { contact, thread: msgs });
      }
    }

    return Array.from(peersMap.values())
      .map(({ contact, thread }) => {
        const cLower = contact.knot_id.toLowerCase();
        const last = thread[thread.length - 1];
        const unread = thread.filter((m) => m.recipientId === me && m.status !== 'read' && m.status !== 'deleted').length;
        const peerMatchKey = Object.keys(peers).find((k) => k.toLowerCase() === cLower);
        const peerState = peerMatchKey ? peers[peerMatchKey] : peers[contact.knot_id];
        return {
          contact,
          last,
          unread,
          online: peerState?.isOnline ?? false,
          typing: peerState?.isTyping ?? false,
          time: last?.createdAt ?? (contact.created_at ? new Date(contact.created_at).getTime() : 0)
        };
      })
      .sort((a, b) => b.time - a.time);
  }, [contacts, threads, me, peers]);

  const openConvo = (contact: Contact) => {
    openThread(contact.knot_id);
    setSection('chats');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 px-4 pb-2 pt-3">

        {!relayOk && (
          <div className="flex items-center gap-2 rounded-sm border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] px-3 py-2">
            <WifiOff size={13} className="shrink-0 text-[var(--warning)]" />
            <p className="text-[11.5px] text-[var(--text-2)]">Offline — showing your saved chats.</p>
          </div>
        )}

        <Segmented
          size="sm"
          value={contactFilter}
          onChange={setContactFilter}
          className="w-full flex"
          options={[
            { value: 'all', label: 'All' },
            { value: 'requests', label: 'Requests', count: incoming.length }
          ]}
        />
      </div>

      <div className="scroll-area flex-1 overflow-y-auto px-3 pb-6">
        {contactFilter === 'requests' ? (
          <div className="space-y-3">
            {incoming.length === 0 && outgoing.length === 0 ? (
              <EmptyState
                title="No pending requests"
                description="When someone asks to connect, it shows up here. You can accept, decline, or block it."
              />
            ) : (
              <>
                {incoming.map((req) => (
                  <RequestCard key={req._id} request={req} onRespond={respond} />
                ))}
                {outgoing.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Sent
                    </p>
                    {outgoing.map((req) => (
                      <div key={req._id} className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#000000] px-3.5 py-3 shadow-sm">
                        <span className="mono truncate text-[13px] text-zinc-800 dark:text-zinc-300 font-medium">{req.to_knot_id}</span>
                        <span className="text-[11.5px] text-amber-600 dark:text-amber-400 font-medium">pending</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : loading && !hydrated ? (
          <div className="space-y-1">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No chats yet"
            description="Ask someone for their Knots ID, then send them a request to start chatting."
            action={
              <Button variant="glass" size="sm" onClick={() => openOverlay('newChat')}>
                <Plus size={15} /> New connection
              </Button>
            }
          />
        ) : (
          <div className="space-y-0.5">
            {rows.map(({ contact, last, unread, online, typing }) => (
              <ContactRow
                key={contact.knot_id}
                contact={contact}
                active={activeThread === contact.knot_id}
                preview={last?.status === 'deleted' ? 'Message deleted' : last?.plaintext || undefined}
                previewTime={last ? last.createdAt : undefined}
                unread={unread}
                online={online}
                typing={typing}
                onClick={() => openConvo(contact)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop bottom action */}
      <div className="hidden border-t border-[var(--hairline)] p-3 lg:block">
        <Button variant="glass" className="w-full justify-center gap-2" onClick={() => openOverlay('newChat')}>
          <Plus size={16} /> New connection
        </Button>
      </div>

      {/* Mobile & Tablet Bottom Action Button */}
      <button
        type="button"
        onClick={() => openOverlay('newChat')}
        aria-label="New connection"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-black shadow-2xl transition-transform active:scale-90 hover:scale-105 lg:hidden"
        style={{
          boxShadow: '0 8px 32px rgba(255, 255, 255, 0.35), 0 4px 14px rgba(0, 0, 0, 0.8)'
        }}
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>
    </div>
  );
}
