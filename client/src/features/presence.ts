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
let getPeersFn: (() => string[]) | null = null;
let visibilityHandler: (() => void) | null = null;

export const usePresence = create<PresenceState>((set, get) => ({
  peers: {},
  typingTo: null,
  running: false,

  start: (me, peers) => {
    currentMe = me;
    getPeersFn = peers;
    if (get().running) return;
    set({ running: true });

    const sendHeartbeat = () => {
      if (!currentMe || (typeof document !== 'undefined' && document.hidden)) return;
      void api.presenceHeartbeat(currentMe, get().typingTo).catch(() => undefined);
    };

    const pollBatch = async () => {
      if (!currentMe || !getPeersFn || (typeof document !== 'undefined' && document.hidden)) return;
      const ids = getPeersFn();
      if (!ids.length) return;

      try {
        const res = await api.getBatchPresence(ids, currentMe);
        if (res.success && res.presences) {
          const currentPeers = get().peers;
          let changed = false;
          const next: Record<string, Presence> = { ...currentPeers };

          for (const [id, pres] of Object.entries(res.presences)) {
            const cur = currentPeers[id];
            if (!cur || cur.isOnline !== pres.isOnline || cur.isTyping !== pres.isTyping) {
              changed = true;
              next[id] = {
                isOnline: pres.isOnline,
                lastSeen: pres.lastSeen,
                isTyping: pres.isTyping
              };
            }
          }

          if (changed) {
            set({ peers: next });
          }
        }
      } catch {
        // Network offline or error
      }
    };

    // Initial triggers
    sendHeartbeat();
    void pollBatch();

    // Relaxed intervals (conserves Render bandwidth by 95%)
    // Server presence timeout is 60s; 25s heartbeat keeps online status crisp
    heartbeat = setInterval(sendHeartbeat, 25000);
    // 30s batch polling for contacts (SSE handles realtime typing & messages)
    poller = setInterval(pollBatch, 30000);

    // Pause timers when tab is hidden, resume immediately when tab is focused
    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.hidden) {
          if (heartbeat) clearInterval(heartbeat);
          if (poller) clearInterval(poller);
          heartbeat = null;
          poller = null;
        } else {
          // Immediately beat and poll once, then restart relaxed intervals
          sendHeartbeat();
          void pollBatch();
          if (!heartbeat) heartbeat = setInterval(sendHeartbeat, 25000);
          if (!poller) poller = setInterval(pollBatch, 30000);
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }
  },

  stop: () => {
    if (heartbeat) clearInterval(heartbeat);
    if (poller) clearInterval(poller);
    if (typingTimer) clearTimeout(typingTimer);
    heartbeat = poller = typingTimer = null;

    if (typeof document !== 'undefined' && visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }

    for (const t of peerTypingTimers.values()) clearTimeout(t);
    peerTypingTimers.clear();
    currentMe = null;
    getPeersFn = null;
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
      }, 3500);
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
