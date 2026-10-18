import { create } from 'zustand';
import { api, type RawMessage } from '../lib/api/client';
import type { MessageType, ReplyRef } from '../lib/api/types';
import {
  DEFAULT_SHARED_SECRET,
  conversationSecret,
  decryptPayload,
  encryptPayload
} from '../lib/crypto/webcrypto';
import {
  clearThread as dbClearThread,
  deleteMessageLocal,
  loadAllMessages,
  patchMessage,
  putMessage,
  sweepExpired,
  type StoredMessage
} from '../lib/storage/db';
import { playPing } from '../lib/sound';
import { notifications } from '../lib/notifications';
import { toast } from './toast';

export interface SendInput {
  text: string;
  type?: MessageType;
  sticker?: string | null;
  replyTo?: ReplyRef | null;
  ttlSeconds?: number;
}

interface ChatState {
  threads: Record<string, StoredMessage[]>;
  loading: boolean;

  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  send: (peer: string, input: SendInput, me: string) => Promise<void>;
  edit: (peer: string, id: string, text: string, me: string) => Promise<void>;
  remove: (peer: string, id: string, me: string) => Promise<void>;
  toggleReaction: (peer: string, id: string, emoji: string, me: string) => Promise<void>;
  markRead: (peer: string, me: string) => Promise<void>;
  purgeThread: (peer: string, me: string) => Promise<void>;
}

function group(messages: StoredMessage[]): Record<string, StoredMessage[]> {
  const out: Record<string, StoredMessage[]> = {};
  for (const m of messages) {
    (out[m.thread] ||= []).push(m);
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => a.createdAt - b.createdAt);
  }
  return out;
}

async function decode(raw: RawMessage, me: string): Promise<StoredMessage> {
  const isMine = (raw.sender_knot_id || '').trim().toLowerCase() === (me || '').trim().toLowerCase();
  const rawPeer = isMine ? raw.recipient_knot_id : raw.sender_knot_id;

  // Resolve to canonical contact knotId if known
  let peer = rawPeer;
  try {
    const { useContacts } = await import('./contacts');
    const contacts = useContacts.getState().contacts;
    const match = contacts.find((c) => c.knot_id.trim().toLowerCase() === (rawPeer || '').trim().toLowerCase());
    if (match) peer = match.knot_id;
  } catch {}

  const deleted = raw.status === 'deleted';
  let plaintext = '';
  if (!deleted && raw.ciphertext) {
    // 1. Decrypt with DEFAULT_SHARED_SECRET (default in Knots E2EE)
    plaintext = (await decryptPayload(raw.ciphertext, raw.nonce || '', DEFAULT_SHARED_SECRET)) ?? '';
    // 2. Fallback to conversationSecret if encrypted pairwise
    if (!plaintext) {
      const secret = await conversationSecret(me, peer);
      plaintext = (await decryptPayload(raw.ciphertext, raw.nonce || '', secret)) ?? '';
    }
    // 3. Fallback to plain base64 decode if plain readable text
    if (!plaintext && raw.ciphertext) {
      try {
        const decoded = atob(raw.ciphertext);
        if (/^[\x20-\x7E\s]+$/.test(decoded)) {
          plaintext = decoded;
        }
      } catch {}
    }
  }

  const status =
    deleted ? 'deleted' : raw.status === 'read' ? 'read' : raw.status === 'delivered' ? 'delivered' : 'delivered';

  return {
    id: raw._id,
    thread: peer,
    senderId: raw.sender_knot_id,
    recipientId: raw.recipient_knot_id,
    plaintext,
    ciphertext: raw.ciphertext,
    nonce: raw.nonce ?? undefined,
    tag: raw.tag ?? undefined,
    type: (raw.type as MessageType) || 'text',
    sticker: raw.sticker ?? null,
    replyTo: (raw.reply_to as ReplyRef) ?? null,
    reactions: raw.reactions ?? [],
    edited: raw.edited,
    status,
    createdAt: new Date(raw.created_at).getTime(),
    expiresAt: raw.expires_at ? new Date(raw.expires_at).getTime() : null,
    ttlSeconds: raw.ttlSeconds
  };
}

export const useChat = create<ChatState>((set, get) => ({
  threads: {},
  loading: false,

  bootstrap: async () => {
    await sweepExpired();
    set({ threads: group(await loadAllMessages()) });
    await get().refresh();
  },

  refresh: async () => {
    const { useIdentity } = await import('./identity');
    const { useContacts } = await import('./contacts');
    const me = useIdentity.getState().identity;
    if (!me) return;
    set({ loading: true });
    try {
      const existingAll = await loadAllMessages();
      const existingById = new Map(existingAll.map((m) => [m.id, m]));
      const contactsList = useContacts.getState().contacts;
      const contactsMap = new Map(contactsList.map((c) => [c.knot_id.toLowerCase(), c]));

      let playSound = false;
      let mutated = false;

      // 1. Process Inbox (fetch only in parallel)
      const inbox = await api.getMessages(me.knotId);
      for (const raw of inbox.messages) {
        if (raw.status === 'deleted') {
          if (existingById.has(raw._id)) {
            await deleteMessageLocal(raw._id);
            existingById.delete(raw._id);
            mutated = true;
          }
          continue;
        }
        let expiresAt: number | null = null;
        if (raw.ttlSeconds === 0) {
          expiresAt = null;
        } else if (raw.expires_at) {
          expiresAt = new Date(raw.expires_at).getTime();
        } else if (raw.ttlSeconds && raw.ttlSeconds > 0) {
          expiresAt = new Date(raw.created_at).getTime() + raw.ttlSeconds * 1000;
        }
        if (expiresAt && expiresAt <= Date.now()) {
          if (existingById.has(raw._id)) {
            await deleteMessageLocal(raw._id);
            existingById.delete(raw._id);
            mutated = true;
          }
          continue;
        }

        const existing = existingById.get(raw._id);
        if (existing) {
          // Check if modified
          const reactionsMatch =
            (raw.reactions?.length ?? 0) === (existing.reactions?.length ?? 0) &&
            JSON.stringify(raw.reactions || []) === JSON.stringify(existing.reactions || []);
          const statusMatch = (raw.status === 'read' ? 'read' : 'delivered') === existing.status;
          const cipherMatch = raw.ciphertext === existing.ciphertext;
          const editMatch = Boolean(raw.edited) === Boolean(existing.edited);

          if (reactionsMatch && statusMatch && cipherMatch && editMatch) {
            // Identical - zero work needed
            continue;
          }

          const decoded = await decode(raw, me.knotId);
          await putMessage(decoded);
          existingById.set(raw._id, decoded);
          mutated = true;
        } else {
          // Brand new incoming message
          const decoded = await decode(raw, me.knotId);
          const contact = contactsMap.get(raw.sender_knot_id.toLowerCase());
          if (!contact?.muted) {
            playSound = true;
            notifications.notifyActivity(raw.sender_knot_id);
          }
          await putMessage(decoded);
          existingById.set(raw._id, decoded);
          mutated = true;
        }
      }

      // 2. Process Sent Statuses (read receipts, reactions, deletions)
      let sent: RawMessage[] = [];
      try {
        sent = (await api.sentStatuses(me.knotId)).statuses;
      } catch {
        sent = [];
      }
      for (const raw of sent) {
        if (raw.status === 'deleted') {
          if (existingById.has(raw._id)) {
            await deleteMessageLocal(raw._id);
            existingById.delete(raw._id);
            mutated = true;
          }
          continue;
        }
        const existing = existingById.get(raw._id);
        if (existing) {
          const nextStatus =
            raw.status === 'read' ? 'read' : raw.status === 'delivered' ? 'delivered' : existing.status;
          const reactionsMatch =
            (raw.reactions?.length ?? 0) === (existing.reactions?.length ?? 0) &&
            JSON.stringify(raw.reactions || []) === JSON.stringify(existing.reactions || []);
          const statusMatch = nextStatus === existing.status;
          const editMatch = Boolean(raw.edited) === Boolean(existing.edited);

          if (!reactionsMatch || !statusMatch || !editMatch) {
            await patchMessage(raw._id, {
              status: nextStatus,
              reactions: raw.reactions ?? existing.reactions,
              edited: raw.edited ?? existing.edited
            });
            existing.status = nextStatus;
            if (raw.reactions) existing.reactions = raw.reactions;
            if (raw.edited) existing.edited = raw.edited;
            mutated = true;
          }
        } else {
          const decoded = await decode(raw, me.knotId);
          await putMessage(decoded);
          existingById.set(raw._id, decoded);
          mutated = true;
        }
      }

      if (playSound) {
        playPing();
      }

      const swept = await sweepExpired();
      if (swept > 0) mutated = true;

      if (mutated) {
        set({ threads: group(await loadAllMessages()) });
      }
    } catch {
      // Offline: keep showing the local vault.
    } finally {
      set({ loading: false });
    }
  },

  send: async (peer, input, me) => {
    const text = input.text.trim();
    if (!text && !input.sticker) return;
    const createdAt = Date.now();
    const tempId = crypto.randomUUID();

    let targetPeer = peer;
    try {
      const { useContacts } = await import('./contacts');
      const contacts = useContacts.getState().contacts;
      const match = contacts.find((c) => c.knot_id.trim().toLowerCase() === (peer || '').trim().toLowerCase());
      if (match) targetPeer = match.knot_id;
    } catch {}

    // Encrypt with DEFAULT_SHARED_SECRET for universal E2EE compatibility
    const enc = await encryptPayload(input.sticker ?? text, DEFAULT_SHARED_SECRET);
    const ttlSeconds = typeof input.ttlSeconds === 'number' ? input.ttlSeconds : 86400;

    const local: StoredMessage = {
      id: tempId,
      thread: targetPeer,
      senderId: me,
      recipientId: targetPeer,
      plaintext: text,
      ciphertext: enc.ciphertext,
      nonce: enc.iv,
      tag: enc.tag,
      type: input.type ?? 'text',
      sticker: input.sticker ?? null,
      replyTo: input.replyTo ?? null,
      reactions: [],
      status: 'queued',
      createdAt,
      ttlSeconds,
      expiresAt: ttlSeconds > 0 ? createdAt + ttlSeconds * 1000 : null,
      pending: true
    };

    await putMessage(local);
    set((s) => ({
      threads: {
        ...s.threads,
        [targetPeer]: [...(s.threads[targetPeer] ?? []), local]
      }
    }));
    playPing();

    try {
      const res = await api.sendMessage({
        recipientKnotId: targetPeer,
        senderKnotId: me,
        ciphertext: enc.ciphertext,
        nonce: enc.iv,
        tag: enc.tag,
        ttlSeconds,
        replyTo: input.replyTo ?? undefined,
        type: input.type ?? 'text',
        sticker: input.sticker ?? null
      });

      const realId = res.messageId || tempId;
      if (realId !== tempId) {
        await deleteMessageLocal(tempId);
      }
      const delivered: StoredMessage = {
        ...local,
        id: realId,
        pending: false,
        status: 'delivered' as const
      };
      await putMessage(delivered);
      set((s) => ({
        threads: {
          ...s.threads,
          [targetPeer]: (s.threads[targetPeer] ?? []).map((m) => (m.id === tempId ? delivered : m))
        }
      }));
    } catch (err) {
      const failed = { ...local, pending: false, failed: true };
      await putMessage(failed);
      set((s) => ({
        threads: {
          ...s.threads,
          [targetPeer]: (s.threads[targetPeer] ?? []).map((m) => (m.id === tempId ? failed : m))
        }
      }));
      toast.error('Send failed', (err as Error).message);
    }
  },

  edit: async (peer, id, text, me) => {
    const enc = await encryptPayload(text, DEFAULT_SHARED_SECRET);
    await patchMessage(id, { plaintext: text, ciphertext: enc.ciphertext, nonce: enc.iv, tag: enc.tag, edited: true });
    set((s) => {
      const pLower = peer.trim().toLowerCase();
      const targetKey = Object.keys(s.threads).find((k) => k.toLowerCase() === pLower) || peer;
      return {
        threads: {
          ...s.threads,
          [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === id ? { ...m, plaintext: text, edited: true } : m))
        }
      };
    });
    try {
      await api.editMessage(id, { senderKnotId: me, ciphertext: enc.ciphertext, nonce: enc.iv, tag: enc.tag });
    } catch (err) {
      toast.error('Edit failed', (err as Error).message);
    }
  },

  remove: async (peer, id, me) => {
    await patchMessage(id, { plaintext: '', ciphertext: '', status: 'deleted' });
    set((s) => {
      const pLower = peer.trim().toLowerCase();
      const targetKey = Object.keys(s.threads).find((k) => k.toLowerCase() === pLower) || peer;
      return {
        threads: {
          ...s.threads,
          [targetKey]: (s.threads[targetKey] ?? []).map((m) =>
            m.id === id ? { ...m, plaintext: '', ciphertext: '', status: 'deleted' as const } : m
          )
        }
      };
    });
    try {
      await api.deleteMessage(id, me);
    } catch (err) {
      toast.error('Delete failed', (err as Error).message);
    }
  },

  toggleReaction: async (peer, id, emoji, me) => {
    // Immediate optimistic update
    const pLower = peer.trim().toLowerCase();
    const targetKey = Object.keys(get().threads).find((k) => k.toLowerCase() === pLower) || peer;
    const thread = get().threads[targetKey] ?? [];
    const msg = thread.find((m) => m.id === id);

    if (msg) {
      let reactions = [...(msg.reactions ?? [])];
      const existingIdx = reactions.findIndex((r) => (r.knotId || '').toLowerCase() === me.toLowerCase());
      if (existingIdx >= 0) {
        if (reactions[existingIdx].emoji === emoji) {
          reactions.splice(existingIdx, 1);
        } else {
          reactions[existingIdx] = { emoji, knotId: me };
        }
      } else {
        reactions.push({ emoji, knotId: me });
      }
      await patchMessage(id, { reactions });
      set((s) => ({
        threads: {
          ...s.threads,
          [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === id ? { ...m, reactions } : m))
        }
      }));
    }

    try {
      await api.react(id, emoji, me);
      await get().refresh();
    } catch (err) {
      toast.error('Reaction failed', (err as Error).message);
    }
  },

  markRead: async (peer, me) => {
    const pLower = peer.trim().toLowerCase();
    const targetKey = Object.keys(get().threads).find((k) => k.toLowerCase() === pLower) || peer;
    const thread = get().threads[targetKey] ?? [];
    const unread = thread.filter((m) => m.recipientId === me && m.status !== 'read' && m.status !== 'deleted');
    if (!unread.length) return;
    try {
      await api.markAllRead(me, peer);
      for (const m of unread) await patchMessage(m.id, { status: 'read' });
      set((s) => ({
        threads: {
          ...s.threads,
          [targetKey]: (s.threads[targetKey] ?? []).map((m) =>
            m.recipientId === me && m.status !== 'deleted' ? { ...m, status: 'read' as const } : m
          )
        }
      }));
    } catch {
      /* offline — retry on next refresh */
    }
  },

  purgeThread: async (peer, me) => {
    const pLower = peer.trim().toLowerCase();
    const targetKey = Object.keys(get().threads).find((k) => k.toLowerCase() === pLower) || peer;
    await dbClearThread(targetKey);
    if (targetKey !== peer) await dbClearThread(peer);
    set((s) => ({ threads: { ...s.threads, [targetKey]: [], [peer]: [] } }));
    try {
      await api.clearChat(me, peer);
    } catch {
      /* local purge already succeeded */
    }
  }
}));
