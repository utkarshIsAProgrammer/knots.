import { create } from 'zustand';
import { api } from '../lib/api/client';
import type { Presence } from '../lib/api/types';

interface PresenceState {
  peers: Record<string, Presence>;
  typingTo: string | null;
  typingAction: 'typing' | 'recording';
  running: boolean;
  start: (me: string, peers: () => string[]) => void;
  stop: () => void;
  setTyping: (peer: string | null) => void;
  setRecording: (peer: string | null) => void;
  receiveTyping: (peerId: string, isTyping: boolean, action?: 'typing' | 'recording') => void;
  beat: () => void;
}

let heartbeat: ReturnType<typeof setInterval> | null = null;
let poller: ReturnType<typeof setInterval> | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let recordingInterval: ReturnType<typeof setInterval> | null = null;
const peerTypingTimers = new Map<string, ReturnType<typeof setTimeout>>();
let currentMe: string | null = null;
let getPeersFn: (() => string[]) | null = null;
let visibilityHandler: (() => void) | null = null;

export const usePresence = create<PresenceState>((set, get) => ({
  peers: {},
  typingTo: null,
  typingAction: 'typing',
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
            if (
              !cur ||
              cur.isOnline !== pres.isOnline ||
              cur.isTyping !== pres.isTyping ||
              cur.isRecording !== pres.isRecording
            ) {
              changed = true;
              next[id] = {
                isOnline: pres.isOnline,
                lastSeen: pres.lastSeen,
                isTyping: pres.isTyping,
                isRecording: Boolean(pres.isRecording)
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
    if (recordingInterval) clearInterval(recordingInterval);
    heartbeat = poller = typingTimer = recordingInterval = null;

    if (typeof document !== 'undefined' && visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }

    for (const t of peerTypingTimers.values()) clearTimeout(t);
    peerTypingTimers.clear();
    currentMe = null;
    getPeersFn = null;
    set({ running: false, typingTo: null, typingAction: 'typing' });
  },

  receiveTyping: (peerId, isTyping, action = 'typing') => {
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

    const isRecording = Boolean(isTyping && action === 'recording');

    set((s) => ({
      peers: {
        ...s.peers,
        [canonicalKey]: {
          ...(s.peers[canonicalKey] ?? { isOnline: true, lastSeen: Date.now() }),
          isTyping,
          isRecording,
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
              isTyping: false,
              isRecording: false
            }
          }
        }));
        peerTypingTimers.delete(canonicalKey.toLowerCase());
      }, isRecording ? 5000 : 3500);
      peerTypingTimers.set(canonicalKey.toLowerCase(), resetTimer);
    }
  },

  setTyping: (peer) => {
    if (typingTimer) clearTimeout(typingTimer);
    if (recordingInterval) clearInterval(recordingInterval);
    recordingInterval = null;

    set({ typingTo: peer, typingAction: 'typing' });
    if (currentMe) {
      void api.presenceHeartbeat(currentMe, peer, 'typing').catch(() => undefined);
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

  setRecording: (peer) => {
    if (typingTimer) clearTimeout(typingTimer);
    if (recordingInterval) clearInterval(recordingInterval);
    recordingInterval = null;

    if (peer) {
      set({ typingTo: peer, typingAction: 'recording' });
      if (currentMe) {
        void api.presenceHeartbeat(currentMe, peer, 'recording').catch(() => undefined);
      }
      // Periodically heartbeat every 2.5s while recording voice notes
      recordingInterval = setInterval(() => {
        if (currentMe && get().typingTo === peer && get().typingAction === 'recording') {
          void api.presenceHeartbeat(currentMe, peer, 'recording').catch(() => undefined);
        } else {
          if (recordingInterval) clearInterval(recordingInterval);
          recordingInterval = null;
        }
      }, 2500);
    } else {
      set({ typingTo: null, typingAction: 'typing' });
      if (currentMe) {
        void api.presenceHeartbeat(currentMe, null).catch(() => undefined);
      }
    }
  },

  beat: () => {
    const me = get().running;
    if (me) get().setTyping(get().typingTo);
  }
}));
