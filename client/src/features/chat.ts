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
  db,
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
  pushIncoming: (raw: RawMessage) => Promise<void>;
  send: (peer: string, input: SendInput, me: string) => Promise<void>;
  edit: (peer: string, id: string, text: string, me: string) => Promise<void>;
  remove: (peer: string, id: string, me: string) => Promise<void>;
  toggleReaction: (peer: string, id: string, emoji: string, me: string) => Promise<void>;
  markRead: (peer: string, me: string) => Promise<void>;
  markThreadReadByPeer: (peerKnotId?: string, messageId?: string) => Promise<void>;
  retry: (peer: string, id: string, me: string) => Promise<void>;
  purgeThread: (peer: string, me: string) => Promise<void>;
  cleanLocalExpired: () => void;
  clear: () => void;
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
  const myKnotId = (me || '').trim().toLowerCase();
  const rawSender = (raw.sender_knot_id || '').trim();
  const rawRecipient = (raw.recipient_knot_id || '').trim();
  const isMine = !rawSender || rawSender.toLowerCase() === myKnotId;
  const rawPeer = isMine ? (rawRecipient || rawSender) : rawSender;

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

  const rawCreated = raw.created_at ? new Date(raw.created_at).getTime() : Date.now();
  const createdAt = Number.isNaN(rawCreated) ? Date.now() : rawCreated;

  let expiresAt: number | null = null;
  if (raw.ttlSeconds === 0) {
    expiresAt = null;
  } else if (raw.expires_at) {
    const parsedExp = new Date(raw.expires_at).getTime();
    expiresAt = Number.isNaN(parsedExp) ? null : parsedExp;
  } else if (raw.ttlSeconds && raw.ttlSeconds > 0) {
    expiresAt = createdAt + raw.ttlSeconds * 1000;
  }

  const resolvedId = String(raw._id || (raw as any).id || (raw as any).messageId || '').trim();
  return {
    id: resolvedId || crypto.randomUUID(),
    thread: peer,
    senderId: raw.sender_knot_id || (isMine ? me : ''),
    recipientId: raw.recipient_knot_id || (isMine ? peer : me),
    plaintext,
    ciphertext: raw.ciphertext,
    nonce: raw.nonce ?? undefined,
    tag: raw.tag ?? undefined,
    type: (raw.type as MessageType) || 'text',
    sticker: raw.sticker || (raw.type === 'sticker' ? plaintext : null) || null,
    replyTo: (raw.reply_to as ReplyRef) ?? null,
    reactions: raw.reactions ?? [],
    edited: raw.edited,
    status,
    createdAt,
    expiresAt,
    ttlSeconds: raw.ttlSeconds
  };
}

let isRefreshing = false;

export const useChat = create<ChatState>((set, get) => ({
  threads: {},
  loading: false,

  clear: () => set({ threads: {}, loading: false }),

  cleanLocalExpired: () => {
    const now = Date.now();
    set((s) => {
      let changed = false;
      const next: Record<string, StoredMessage[]> = {};
      for (const [k, msgs] of Object.entries(s.threads)) {
        const filtered = msgs.filter((m) => !m.expiresAt || m.expiresAt > now);
        if (filtered.length !== msgs.length) changed = true;
        next[k] = filtered;
      }
      return changed ? { threads: next } : s;
    });
  },

  bootstrap: async () => {
    await sweepExpired();
    set({ threads: group(await loadAllMessages()) });
    await get().refresh();
  },

  refresh: async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    const { useIdentity } = await import('./identity');
    const { useContacts } = await import('./contacts');
    const me = useIdentity.getState().identity;
    if (!me) {
      isRefreshing = false;
      return;
    }
    const isInitial = Object.keys(get().threads).length === 0;
    if (isInitial) set({ loading: true });
    try {
      const inMemory = Object.values(get().threads).flat();
      const existingAll = inMemory.length > 0 ? inMemory : await loadAllMessages();
      const existingById = new Map<string, StoredMessage>();
      for (const m of existingAll) {
        if (m.id) existingById.set(String(m.id), m);
        if ((m as any)._id) existingById.set(String((m as any)._id), m);
      }
      const contactsList = useContacts.getState().contacts;
      const contactsMap = new Map(contactsList.map((c) => [(c.knot_id || '').toLowerCase(), c]));

      let playSound = false;
      let mutated = false;

      // 1. Process Inbox (fetch only in parallel)
      const inbox = await api.getMessages(me.knotId);
      for (const raw of inbox.messages) {
        const rawId = String(raw._id || (raw as any).id || (raw as any).messageId || '').trim();
        if (!rawId) continue;

        if (raw.status === 'deleted') {
          if (existingById.has(rawId)) {
            await deleteMessageLocal(rawId);
            existingById.delete(rawId);
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
          if (existingById.has(rawId)) {
            await deleteMessageLocal(rawId);
            existingById.delete(rawId);
            mutated = true;
          }
          continue;
        }

        const existing = existingById.get(rawId);
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
          existingById.set(rawId, decoded);
          existingById.set(decoded.id, decoded);
          mutated = true;
        } else {
          // Check local Dexie first to avoid duplicate notifications across sync cycles
          const inDb = await db.messages.get(rawId).catch(() => undefined);
          if (inDb) {
            existingById.set(rawId, inDb);
            existingById.set(inDb.id, inDb);
            continue;
          }

          // Brand new incoming message
          const decoded = await decode(raw, me.knotId);
          const senderKnot = (raw.sender_knot_id || decoded.senderId || '').trim();
          if (senderKnot) {
            const { usePresence } = await import('./presence');
            usePresence.getState().receiveTyping(senderKnot, false);
          }
          const contact = senderKnot ? contactsMap.get(senderKnot.toLowerCase()) : undefined;
          if (!contact?.muted) {
            playSound = true;
            notifications.notifyActivity(senderKnot, decoded.id);
          }
          await putMessage(decoded);
          existingById.set(rawId, decoded);
          existingById.set(decoded.id, decoded);
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
        const rawId = String(raw._id || (raw as any).id || (raw as any).messageId || '').trim();
        if (!rawId) continue;
        if (raw.status === 'deleted') {
          if (existingById.has(rawId)) {
            await deleteMessageLocal(rawId);
            existingById.delete(rawId);
            mutated = true;
          }
          continue;
        }
        const existing = existingById.get(rawId);
        if (existing) {
          const nextStatus =
            raw.status === 'read' ? 'read' : raw.status === 'delivered' ? 'delivered' : existing.status;
          const reactionsMatch =
            (raw.reactions?.length ?? 0) === (existing.reactions?.length ?? 0) &&
            JSON.stringify(raw.reactions || []) === JSON.stringify(existing.reactions || []);
          const statusMatch = nextStatus === existing.status;
          const editMatch = Boolean(raw.edited) === Boolean(existing.edited);

          if (!reactionsMatch || !statusMatch || !editMatch || existing.pending) {
            await patchMessage(existing.id, {
              status: nextStatus,
              reactions: raw.reactions ?? existing.reactions,
              edited: raw.edited ?? existing.edited,
              pending: false
            });
            existing.status = nextStatus;
            existing.pending = false;
            if (raw.reactions) existing.reactions = raw.reactions;
            if (raw.edited) existing.edited = raw.edited;
            mutated = true;
          }
        } else {
          if (!raw.sender_knot_id) raw.sender_knot_id = me.knotId;
          const decoded = await decode(raw, me.knotId);
          await putMessage(decoded);
          existingById.set(rawId, decoded);
          existingById.set(decoded.id, decoded);
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
      isRefreshing = false;
      if (isInitial) set({ loading: false });
    }
  },

  pushIncoming: async (raw: RawMessage) => {
    const { useIdentity } = await import('./identity');
    const { useContacts } = await import('./contacts');
    const me = useIdentity.getState().identity;
    if (!me) return;

    const rawId = String(raw._id || (raw as any).id || (raw as any).messageId || '').trim();
    if (!rawId) return;

    // Fast deduplication: if already in memory, skip
    const currentThreads = get().threads;
    for (const msgs of Object.values(currentThreads)) {
      if (msgs.some((m) => m.id === rawId || (m as any)._id === rawId)) {
        return;
      }
    }

    const inDb = await db.messages.get(rawId).catch(() => undefined);
    if (inDb) return;

    const decoded = await decode(raw, me.knotId);
    await putMessage(decoded);

    const contactsList = useContacts.getState().contacts;
    const senderKnot = (raw.sender_knot_id || decoded.senderId || '').trim();
    if (senderKnot) {
      const { usePresence } = await import('./presence');
      usePresence.getState().receiveTyping(senderKnot, false);
    }
    const contact = senderKnot
      ? contactsList.find((c) => (c.knot_id || '').toLowerCase() === senderKnot.toLowerCase())
      : undefined;
    if (!contact?.muted) {
      playPing();
      notifications.notifyActivity(senderKnot, decoded.id);
    }

    set((s) => {
      const threadKey = decoded.thread;
      const pLower = threadKey.trim().toLowerCase();
      const existingKey = Object.keys(s.threads).find((k) => k.toLowerCase() === pLower) || threadKey;
      const current = s.threads[existingKey] ?? [];
      if (current.some((m) => m.id === decoded.id || m.id === rawId)) return s;
      return {
        threads: {
          ...s.threads,
          [existingKey]: [...current, decoded].sort((a, b) => a.createdAt - b.createdAt)
        }
      };
    });
  },

  send: async (peer, input, me) => {
    const text = input.text.trim();
    if (!text && !input.sticker) return;
    const createdAt = Date.now();
    const msgId = crypto.randomUUID();

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
      id: msgId,
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
      expiresAt: null, // Timer only starts after the message is sent successfully
      pending: true
    };

    await putMessage(local);
    set((s) => {
      const pLower = targetPeer.trim().toLowerCase();
      const targetKey = Object.keys(s.threads).find((k) => k.toLowerCase() === pLower) || targetPeer;
      const current = s.threads[targetKey] ?? [];
      return {
        threads: {
          ...s.threads,
          [targetKey]: [...current, local]
        }
      };
    });
    playPing();

    try {
      const res = await api.sendMessage({
        id: msgId,
        messageId: msgId,
        recipientKnotId: targetPeer,
        senderKnotId: me,
        ciphertext: enc.ciphertext,
        nonce: enc.iv,
        tag: enc.tag,
        ttlSeconds,
        replyTo: input.replyTo ?? undefined,
        type: input.type ?? 'text',
        sticker: input.sticker?.startsWith('data:') ? null : (input.sticker ?? null)
      });

      const serverId = res.messageId || msgId;
      if (serverId !== msgId) {
        await deleteMessageLocal(msgId);
      }
      const sentAt = Date.now();
      const serverExpiresAt = res.expires_at
        ? new Date(res.expires_at).getTime()
        : (ttlSeconds > 0 ? sentAt + ttlSeconds * 1000 : null);

      const delivered: StoredMessage = {
        ...local,
        id: serverId,
        pending: false,
        failed: false,
        status: 'delivered' as const,
        createdAt: sentAt,
        expiresAt: serverExpiresAt
      };
      await putMessage(delivered);
      set((s) => {
        const pLower = targetPeer.trim().toLowerCase();
        const targetKey = Object.keys(s.threads).find((k) => k.toLowerCase() === pLower) || targetPeer;
        return {
          threads: {
            ...s.threads,
            [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === msgId ? delivered : m))
          }
        };
      });
    } catch (err) {
      const failed = { ...local, pending: false, failed: true, expiresAt: null };
      await putMessage(failed);
      set((s) => {
        const pLower = targetPeer.trim().toLowerCase();
        const targetKey = Object.keys(s.threads).find((k) => k.toLowerCase() === pLower) || targetPeer;
        return {
          threads: {
            ...s.threads,
            [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === msgId ? failed : m))
          }
        };
      });
      toast.error('Send failed', (err as Error).message);
    }
  },

  retry: async (peer, id, me) => {
    const pLower = peer.trim().toLowerCase();
    const targetKey = Object.keys(get().threads).find((k) => k.toLowerCase() === pLower) || peer;
    const thread = get().threads[targetKey] ?? [];
    const msg = thread.find((m) => m.id === id);
    if (!msg) return;

    let targetPeer = peer;
    try {
      const { useContacts } = await import('./contacts');
      const contacts = useContacts.getState().contacts;
      const match = contacts.find((c) => c.knot_id.trim().toLowerCase() === (peer || '').trim().toLowerCase());
      if (match) targetPeer = match.knot_id;
    } catch {}

    // Optimistically set pending = true, failed = false, expiresAt = null (timer paused until sent)
    const retrying: StoredMessage = { ...msg, pending: true, failed: false, expiresAt: null };
    await patchMessage(id, { pending: true, failed: false, expiresAt: null });
    set((s) => ({
      threads: {
        ...s.threads,
        [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === id ? retrying : m))
      }
    }));

    try {
      let ciphertext = msg.ciphertext;
      let nonce = msg.nonce;
      let tag = msg.tag;
      if (!ciphertext) {
        const payloadText = msg.sticker ?? msg.plaintext;
        const enc = await encryptPayload(payloadText, DEFAULT_SHARED_SECRET);
        ciphertext = enc.ciphertext;
        nonce = enc.iv;
        tag = enc.tag;
      }

      const res = await api.sendMessage({
        id: msg.id,
        messageId: msg.id,
        recipientKnotId: msg.recipientId || targetPeer,
        senderKnotId: me,
        ciphertext,
        nonce,
        tag,
        ttlSeconds: msg.ttlSeconds ?? 86400,
        replyTo: msg.replyTo ?? undefined,
        type: msg.type ?? 'text',
        sticker: msg.sticker?.startsWith('data:') ? null : (msg.sticker ?? null)
      });

      const serverId = res.messageId || msg.id;
      if (serverId !== msg.id) {
        await deleteMessageLocal(msg.id);
      }
      const sentAt = Date.now();
      const ttl = typeof msg.ttlSeconds === 'number' ? msg.ttlSeconds : 86400;
      const serverExpiresAt = res.expires_at
        ? new Date(res.expires_at).getTime()
        : (ttl > 0 ? sentAt + ttl * 1000 : null);

      const delivered: StoredMessage = {
        ...msg,
        id: serverId,
        pending: false,
        failed: false,
        status: 'delivered' as const,
        createdAt: sentAt,
        expiresAt: serverExpiresAt
      };
      await putMessage(delivered);
      set((s) => ({
        threads: {
          ...s.threads,
          [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === id ? delivered : m))
        }
      }));
      playPing();
      toast.success('Message sent');
    } catch (err) {
      const failed = { ...msg, pending: false, failed: true, expiresAt: null };
      await putMessage(failed);
      set((s) => ({
        threads: {
          ...s.threads,
          [targetKey]: (s.threads[targetKey] ?? []).map((m) => (m.id === id ? failed : m))
        }
      }));
      toast.error('Retry failed', (err as Error).message);
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
    const pLower = (peer || '').trim().toLowerCase();
    const meLower = (me || '').trim().toLowerCase();
    if (!pLower || !meLower) return;

    const currentThreads = get().threads;
    const matchingKeys = Object.keys(currentThreads).filter((k) => k.trim().toLowerCase() === pLower);
    if (!matchingKeys.length) matchingKeys.push(peer);

    const allMatchingMsgs = matchingKeys.flatMap((k) => currentThreads[k] ?? []);
    const unread = allMatchingMsgs.filter((m) => {
      if (m.status === 'read' || m.status === 'deleted') return false;
      const rec = (m.recipientId || '').trim().toLowerCase();
      const snd = (m.senderId || '').trim().toLowerCase();
      return rec === meLower || (snd !== meLower && snd.length > 0);
    });

    if (!unread.length) return;

    try {
      await api.markAllRead(me, peer);
      for (const m of unread) {
        await patchMessage(m.id, { status: 'read' });
      }
      set((s) => {
        const nextThreads = { ...s.threads };
        for (const k of matchingKeys) {
          nextThreads[k] = (nextThreads[k] ?? []).map((m) => {
            const rec = (m.recipientId || '').trim().toLowerCase();
            const snd = (m.senderId || '').trim().toLowerCase();
            const isIncoming = rec === meLower || (snd !== meLower && snd.length > 0);
            return isIncoming && m.status !== 'deleted' ? { ...m, status: 'read' as const } : m;
          });
        }
        return { threads: nextThreads };
      });
    } catch {
      /* offline — retry on next refresh */
    }
  },

  markThreadReadByPeer: async (peerKnotId?: string, messageId?: string) => {
    const pLower = (peerKnotId || '').trim().toLowerCase();
    const targetId = messageId ? String(messageId) : null;
    if (!pLower && !targetId) return;

    const currentThreads = get().threads;
    let mutated = false;
    const updatedThreads: Record<string, StoredMessage[]> = {};

    for (const [threadKey, msgs] of Object.entries(currentThreads)) {
      const threadMatches = pLower && threadKey.trim().toLowerCase() === pLower;
      let threadMutated = false;

      const nextMsgs = msgs.map((m) => {
        const isTargetMsg = Boolean(targetId && String(m.id) === targetId);
        const isPeerMsg = Boolean(
          (threadMatches || (pLower && (m.recipientId || '').trim().toLowerCase() === pLower)) &&
          m.status !== 'read' &&
          m.status !== 'deleted'
        );
        if ((isTargetMsg || isPeerMsg) && m.status !== 'read') {
          threadMutated = true;
          mutated = true;
          void patchMessage(m.id, { status: 'read', pending: false });
          return { ...m, status: 'read' as const, pending: false };
        }
        return m;
      });

      updatedThreads[threadKey] = threadMutated ? nextMsgs : msgs;
    }

    if (mutated) {
      set({ threads: updatedThreads });
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
