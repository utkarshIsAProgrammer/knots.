import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Eraser, MoreVertical, Search, UserCheck, UserMinus } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog } from '../ui/Dialog';
import { Popover, MenuItem } from '../ui/Popover';
import { EmptyState } from '../ui/EmptyState';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { useChat } from '../../features/chat';
import { useContacts } from '../../features/contacts';
import { usePresence } from '../../features/presence';
import { useIdentity } from '../../features/identity';
import { useUI } from '../../features/ui';
import { toast } from '../../features/toast';
import { shortKnotId } from '../../lib/format';
import type { ReplyRef } from '../../lib/api/types';
import type { StoredMessage } from '../../lib/storage/db';

export function ChatView() {
  const peer = useUI((s) => s.activeThread);
  const closeThread = useUI((s) => s.closeThread);
  const openOverlay = useUI((s) => s.openOverlay);

  const identity = useIdentity((s) => s.identity);
  const myKnotId = identity?.knotId ?? '';
  const { toggleMute, remove: removeContact } = useContacts();

  const contacts = useContacts((s) => s.contacts);
  const contact = useMemo(() => {
    if (!peer) return undefined;
    const direct = contacts.find((c) => c.knot_id === peer);
    if (direct) return direct;
    const pLower = peer.trim().toLowerCase();
    return contacts.find((c) => (c.knot_id || '').trim().toLowerCase() === pLower);
  }, [contacts, peer]);

  const threads = useChat((s) => s.threads);
  const messages = useMemo(() => {
    if (!peer) return [];
    if (threads[peer]) return threads[peer];
    const pLower = (peer || '').trim().toLowerCase();
    const matchKey = Object.keys(threads).find((k) => k.trim().toLowerCase() === pLower);
    return matchKey ? threads[matchKey] : [];
  }, [threads, peer]);

  const { send, edit, remove, toggleReaction, markRead, purgeThread } = useChat();

  const peers = usePresence((s) => s.peers);
  const presence = useMemo(() => {
    if (!peer) return undefined;
    if (peers[peer]) return peers[peer];
    const pLower = (peer || '').trim().toLowerCase();
    const matchKey = Object.keys(peers).find((k) => k.trim().toLowerCase() === pLower);
    return matchKey ? peers[matchKey] : undefined;
  }, [peers, peer]);

  const setTyping = usePresence((s) => s.setTyping);

  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [editing, setEditing] = useState<StoredMessage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StoredMessage | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteContact, setConfirmDeleteContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (peer && myKnotId) {
      void markRead(peer, myKnotId);
    }
  }, [peer, myKnotId, markRead, messages.length]);

  if (!peer) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No conversation selected" description="Choose a chat from the list to start messaging." />
      </div>
    );
  }

  const name = contact?.alias || shortKnotId(peer);
  const subtitle = presence?.isTyping
    ? 'typing…'
    : presence?.isOnline
      ? 'online'
      : 'offline';

  const visible = query
    ? messages.filter((m) => m.plaintext.toLowerCase().includes(query.toLowerCase()))
    : messages;

  const handleSend = (
    text: string,
    options: { replyTo?: ReplyRef | null; ttlSeconds?: number; sticker?: string | null }
  ) => {
    if (!peer || !myKnotId) return;
    void send(peer, { text, replyTo: options.replyTo, ttlSeconds: options.ttlSeconds, sticker: options.sticker, type: options.sticker ? 'sticker' : 'text' }, myKnotId);
    setReplyTo(null);
    setTyping(null);
  };

  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-[#000000]">
      <header className="relative z-20 flex items-center gap-2 sm:gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#000000] px-3 py-2.5 sm:px-4 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={closeThread} aria-label="Back">
          <ArrowLeft size={19} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3 select-none">
          <Avatar knotId={peer} online={presence?.isOnline} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white">{name}</p>
            <p className={`truncate text-[12px] ${presence?.isTyping ? 'text-emerald-600 dark:text-emerald-400 font-medium' : presence?.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Search button */}
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen((v) => !v)} aria-label="Search in conversation">
          <Search size={18} />
        </Button>

        {/* Chat box three-dot menu with all options */}
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          align="end"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Conversation options"
              title="More options"
            >
              <MoreVertical size={18} />
            </Button>
          }
        >
          <div className="flex w-52 flex-col gap-0.5 p-1" onClick={() => setMenuOpen(false)}>
            <MenuItem
              icon={<UserCheck size={15} />}
              onClick={() => openOverlay('peer', peer)}
            >
              Contact details
            </MenuItem>
            <MenuItem
              icon={contact?.muted ? <Bell size={15} /> : <BellOff size={15} />}
              onClick={() => {
                if (peer) void toggleMute(peer);
              }}
            >
              {contact?.muted ? 'Unmute notifications' : 'Mute notifications'}
            </MenuItem>
            <MenuItem
              icon={<Search size={15} />}
              onClick={() => setSearchOpen((v) => !v)}
            >
              Search conversation
            </MenuItem>
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
            <MenuItem
              icon={<Eraser size={15} />}
              tone="danger"
              onClick={() => setConfirmClear(true)}
            >
              Clear chat
            </MenuItem>
            <MenuItem
              icon={<UserMinus size={15} />}
              tone="danger"
              onClick={() => setConfirmDeleteContact(true)}
            >
              Remove contact
            </MenuItem>
          </div>
        </Popover>
      </header>

      {searchOpen && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this conversation…"
            className="h-10 text-[14px]"
            icon={<Search size={15} />}
          />
        </div>
      )}

      <div className="scroll-area relative flex-1 overflow-y-auto bg-zinc-50/40 dark:bg-[#000000]">
        {messages.length === 0 ? (
          <EmptyState
            title="Chat is empty"
            description="All messages in this conversation have been deleted. Send a message to start chatting."
            className="pt-24"
          />
        ) : visible.length === 0 ? (
          <EmptyState title="No matches" description="Nothing in this thread matches your search." className="pt-24" />
        ) : (
          <MessageList
            messages={visible}
            me={myKnotId}
            onReply={(m) => {
              setEditing(null);
              setReplyTo({ id: m.id, text: m.plaintext.slice(0, 90), sender: m.senderId });
            }}
            onEdit={(m) => {
              setReplyTo(null);
              setEditing(m);
            }}
            onDelete={(m) => setConfirmDelete(m)}
            onReact={(m, emoji) => {
              if (myKnotId) void toggleReaction(peer, m.id, emoji, myKnotId);
            }}
          />
        )}
      </div>

      <Composer
        onSend={handleSend}
        onTyping={() => setTyping(peer)}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        editing={editing ? editing.plaintext : null}
        onCancelEdit={() => setEditing(null)}
        onEditSubmit={(text) => {
          if (editing && myKnotId) void edit(peer, editing.id, text, myKnotId);
          setEditing(null);
        }}
        me={myKnotId}
      />

      {/* Delete Single Message Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        tone="danger"
        title="Delete for everyone?"
        description="This deletes the message for both of you. It can't be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirmDelete && myKnotId) void remove(peer, confirmDelete.id, myKnotId);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />

      {/* Clear Chat Dialog */}
      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        tone="danger"
        title="Clear this chat?"
        description="This removes all messages in this conversation from your device. Encrypted copies on the server are discarded."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (peer && myKnotId) void purgeThread(peer, myKnotId);
                toast.success('Chat cleared', 'Your local history and saved copies were removed.');
                setConfirmClear(false);
              }}
            >
              Clear chat
            </Button>
          </>
        }
      />

      {/* Remove Contact Dialog */}
      <Dialog
        open={confirmDeleteContact}
        onClose={() => setConfirmDeleteContact(false)}
        tone="danger"
        title="Remove contact?"
        description="This removes the contact from your device. You can reconnect anytime if they share their Knots ID again."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteContact(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (peer) void removeContact(peer);
                toast.info('Contact removed', 'You can connect again any time.');
                setConfirmDeleteContact(false);
                closeThread();
              }}
            >
              Remove
            </Button>
          </>
        }
      />
    </div>
  );
}
