import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Eraser, MoreVertical, Search, UserCheck, UserMinus, AlertCircle, RotateCcw } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog } from '../ui/Dialog';
import { Popover, MenuItem } from '../ui/Popover';
import { EmptyState } from '../ui/EmptyState';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ForwardModal } from './ForwardModal';
import { useChat } from '../../features/chat';
import { useContacts } from '../../features/contacts';
import { usePresence } from '../../features/presence';
import { useIdentity } from '../../features/identity';
import { useUI } from '../../features/ui';
import { toast } from '../../features/toast';
import { shortKnotId } from '../../lib/format';
import { useVisualViewport, useIsDesktop } from '../../lib/hooks';
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

  const { send, edit, remove, toggleReaction, markRead, retry, purgeThread } = useChat();

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
  const [forwardMessage, setForwardMessage] = useState<StoredMessage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const hasUnread = useMemo(() => {
    const meLower = (myKnotId || '').trim().toLowerCase();
    return messages.some(
      (m) =>
        m.status !== 'read' &&
        m.status !== 'deleted' &&
        ((m.recipientId || '').trim().toLowerCase() === meLower ||
          ((m.senderId || '').trim().toLowerCase() !== meLower && (m.senderId || '').trim().length > 0))
    );
  }, [messages, myKnotId]);

  useEffect(() => {
    if (peer && myKnotId && hasUnread) {
      void markRead(peer, myKnotId);
    }
  }, [peer, myKnotId, markRead, hasUnread]);

  const viewport = useVisualViewport();
  const isDesktop = useIsDesktop();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const visible = query
    ? messages.filter((m) => m.plaintext.toLowerCase().includes(query.toLowerCase()))
    : messages;

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
    return () => {
      setTyping(null);
    };
  }, [peer, setTyping, scrollToBottom]);

  useEffect(() => {
    // If user is actively typing in the textarea, scroll instantly without animation
    // to avoid mobile browser scroll interrupts that drop focus or dismiss the keyboard
    const isUserTyping =
      typeof document !== 'undefined' &&
      document.activeElement &&
      document.activeElement.tagName === 'TEXTAREA';

    scrollToBottom(!isUserTyping);
  }, [visible.length, presence?.isTyping, scrollToBottom]);

  const handleSend = useCallback((
    text: string,
    options: { replyTo?: ReplyRef | null; ttlSeconds?: number; sticker?: string | null }
  ) => {
    if (!peer || !myKnotId) return;
    void send(peer, { text, replyTo: options.replyTo, ttlSeconds: options.ttlSeconds, sticker: options.sticker, type: options.sticker ? 'sticker' : 'text' }, myKnotId);
    setReplyTo(null);
    setTyping(null);
  }, [peer, myKnotId, send, setTyping]);

  const handleReply = useCallback((m: StoredMessage) => {
    setEditing(null);
    setReplyTo({ id: m.id, text: m.plaintext.slice(0, 90), sender: m.senderId });
  }, []);

  const handleForward = useCallback((m: StoredMessage) => {
    setForwardMessage(m);
  }, []);

  const handleForwardSubmit = useCallback(async (targetPeer: string, m: StoredMessage) => {
    if (!myKnotId) return;
    await send(targetPeer, {
      text: m.plaintext,
      sticker: m.sticker,
      type: m.type,
      ttlSeconds: 86400
    }, myKnotId);
    toast.success('Message forwarded');
  }, [myKnotId, send]);

  const handleEdit = useCallback((m: StoredMessage) => {
    setReplyTo(null);
    setEditing(m);
  }, []);

  const handleDelete = useCallback((m: StoredMessage) => {
    setConfirmDelete(m);
  }, []);

  const handleReact = useCallback((m: StoredMessage, emoji: string) => {
    if (myKnotId && peer) void toggleReaction(peer, m.id, emoji, myKnotId);
  }, [myKnotId, peer, toggleReaction]);

  const handleRetry = useCallback((m: StoredMessage) => {
    if (myKnotId && peer) void retry(peer, m.id, myKnotId);
  }, [myKnotId, peer, retry]);

  if (!peer) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No conversation selected" description="Choose a chat from the list to start messaging." />
      </div>
    );
  }

  const name = contact?.alias || shortKnotId(peer);
  const subtitle = presence?.isOnline ? 'Active now' : 'Offline';

  return (
    <div
      className="fixed inset-x-0 z-30 flex flex-col bg-white dark:bg-[#000000] lg:static lg:h-full lg:z-auto overscroll-none"
      style={
        !isDesktop && viewport
          ? {
              top: `${viewport.offsetTop}px`,
              height: `${viewport.height}px`,
              maxHeight: `${viewport.height}px`
            }
          : { top: 0, height: '100%' }
      }
    >
      <header className="relative z-20 flex items-center gap-2 sm:gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#000000] px-3 py-2.5 sm:px-4 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={closeThread} aria-label="Back">
          <ArrowLeft size={19} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3 select-none">
          <Avatar knotId={peer} online={presence?.isOnline} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white">{name}</p>
            <p className={`truncate text-[12px] ${presence?.isOnline ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
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

      <div ref={scrollContainerRef} className="scroll-area relative flex-1 overflow-y-auto bg-zinc-50/40 dark:bg-[#000000]">
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
            peer={peer}
            isTyping={Boolean(presence?.isTyping)}
            onReply={handleReply}
            onForward={handleForward}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
            onRetry={handleRetry}
          />
        )}
      </div>

      {(() => {
        const failedMsgs = messages.filter((m) => m.failed);
        if (failedMsgs.length === 0) return null;
        return (
          <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-500 dark:bg-red-950/30 dark:border-red-500/30">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle size={14} />
              <span>{failedMsgs.length === 1 ? 'Failed to send message' : `${failedMsgs.length} messages failed to send`}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!myKnotId) return;
                failedMsgs.forEach((msg) => void retry(peer, msg.id, myKnotId));
              }}
              className="flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-600 transition-colors"
            >
              <RotateCcw size={11} /> {failedMsgs.length === 1 ? 'Retry' : 'Retry all'}
            </button>
          </div>
        );
      })()}

      <Composer
        onSend={handleSend}
        onTyping={() => setTyping(peer)}
        onStopTyping={() => setTyping(null)}
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

      {/* Forward Message Modal */}
      <ForwardModal
        open={Boolean(forwardMessage)}
        message={forwardMessage}
        me={myKnotId}
        onClose={() => setForwardMessage(null)}
        onForward={handleForwardSubmit}
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
