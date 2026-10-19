import { create } from 'zustand';
import { api } from '../lib/api/client';
import type { Presence } from '../lib/api/types';

interface PresenceState {
  peers: Record<string, Presence>;
  typingTo: string | null;
  running: boolean;
  start: (me: string, peers: () => string[]) => void;
  stop: () => void;
  setTyping: (peer: string | null) => void;
  receiveTyping: (peerId: string, isTyping: boolean) => void;
  beat: () => void;
}

let heartbeat: ReturnType<typeof setInterval> | null = null;
let poller: ReturnType<typeof setInterval> | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
const peerTypingTimers = new Map<string, ReturnType<typeof setTimeout>>();
let currentMe: string | null = null;

export const usePresence = create<PresenceState>((set, get) => ({
  peers: {},
  typingTo: null,
  running: false,

  start: (me, peers) => {
    currentMe = me;
    if (get().running) return;
    set({ running: true });

    const send = () => {
      if (!currentMe) return;
      void api.presenceHeartbeat(currentMe, get().typingTo).catch(() => undefined);
    };
    send();
    // 4s heartbeat to keep online status active (server timeout is 15s)
    heartbeat = setInterval(send, 4000);

    // 1.2s poller for peer presence and typing indicators (blazing fast presence)
    poller = setInterval(async () => {
      if (!currentMe) return;
      const ids = peers();
      if (!ids.length) return;
      const next: Record<string, Presence> = { ...get().peers };
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await api.getPresence(id, currentMe!);
            next[id] = {
              isOnline: res.isOnline,
              lastSeen: res.lastSeen,
              isTyping: res.isTyping
            };
          } catch {
            next[id] = { isOnline: false, lastSeen: get().peers[id]?.lastSeen ?? null, isTyping: false };
          }
        })
      );
      set({ peers: next });
    }, 1200);
  },

  stop: () => {
    if (heartbeat) clearInterval(heartbeat);
    if (poller) clearInterval(poller);
    if (typingTimer) clearTimeout(typingTimer);
    heartbeat = poller = typingTimer = null;
    for (const t of peerTypingTimers.values()) clearTimeout(t);
    peerTypingTimers.clear();
    currentMe = null;
    set({ running: false, typingTo: null });
  },

  receiveTyping: (peerId, isTyping) => {
    if (!peerId) return;
    const existing = get().peers;
    // Find canonical key
    const canonicalKey = Object.keys(existing).find((k) => k.toLowerCase() === peerId.toLowerCase()) || peerId;
    
    // Clear any previous reset timer
    const prevTimer = peerTypingTimers.get(canonicalKey.toLowerCase());
    if (prevTimer) {
      clearTimeout(prevTimer);
      peerTypingTimers.delete(canonicalKey.toLowerCase());
    }

    set((s) => ({
      peers: {
        ...s.peers,
        [canonicalKey]: {
          ...(s.peers[canonicalKey] ?? { isOnline: true, lastSeen: Date.now() }),
          isTyping,
          isOnline: true
        }
      }
    }));

    if (isTyping) {
      const resetTimer = setTimeout(() => {
        set((s) => ({
          peers: {
            ...s.peers,
            [canonicalKey]: {
              ...(s.peers[canonicalKey] ?? { isOnline: true, lastSeen: Date.now() }),
              isTyping: false
            }
          }
        }));
        peerTypingTimers.delete(canonicalKey.toLowerCase());
      }, 3000);
      peerTypingTimers.set(canonicalKey.toLowerCase(), resetTimer);
    }
  },

  setTyping: (peer) => {
    if (typingTimer) clearTimeout(typingTimer);
    set({ typingTo: peer });
    if (currentMe) {
      void api.presenceHeartbeat(currentMe, peer).catch(() => undefined);
    }
    if (peer) {
      typingTimer = setTimeout(() => {
        set({ typingTo: null });
        if (currentMe) {
          void api.presenceHeartbeat(currentMe, null).catch(() => undefined);
        }
      }, 2500);
    }
  },

  beat: () => {
    const me = get().running;
    if (me) get().setTyping(get().typingTo);
  }
}));
