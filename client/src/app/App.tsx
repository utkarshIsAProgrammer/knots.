import { useEffect, useState } from 'react';
import { Backdrop } from '../components/layout/Backdrop';
import { AppShell } from '../components/layout/AppShell';
import { Landing } from '../components/landing/Landing';
import { IdentityCeremony } from '../components/identity/IdentityCeremony';
import { ToastViewport } from '../components/ui/Toast';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { KnotMark, Wordmark } from '../components/ui/Logo';
import { useIdentity } from '../features/identity';
import { useTheme } from '../features/theme';
import { useContacts } from '../features/contacts';
import { useChat } from '../features/chat';
import { usePresence } from '../features/presence';
import { notifications } from '../lib/notifications';
import { sweepExpired } from '../lib/storage/db';
import { usePolling } from '../lib/hooks';
import { getRawBase, rotateRawBase } from '../lib/api/client';

function Boot() {
  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5">
      <KnotMark className="h-16 w-16" />
      <Wordmark />
      <div className="h-1 w-28 overflow-hidden rounded-pill bg-[var(--glass-tint)]">
        <div className="shimmer h-full w-full" />
      </div>
    </div>
  );
}

export default function App() {
  const ready = useIdentity((s) => s.ready);
  const identity = useIdentity((s) => s.identity);
  const [phase, setPhase] = useState<'landing' | 'recover'>('landing');

  useEffect(() => {
    void useTheme.getState().init();
    void useIdentity.getState().bootstrap();
    notifications.init();
  }, []);

  const knotId = identity?.knotId ?? null;

  useEffect(() => {
    if (!knotId) return;
    void useContacts.getState().load();
    void useChat.getState().bootstrap();
    usePresence.getState().start(knotId, () => useContacts.getState().contacts.map((c) => c.knot_id));
    return () => usePresence.getState().stop();
  }, [knotId]);

  // 1-second auto-burn timer sweep (cleans local storage & state without network calls)
  useEffect(() => {
    if (!knotId) return;
    const burnInterval = setInterval(() => {
      void sweepExpired().then((swept) => {
        if (swept > 0) {
          useChat.getState().cleanLocalExpired();
        }
      });
    }, 1000);
    return () => clearInterval(burnInterval);
  }, [knotId]);

  // Zero-latency Server-Sent Events stream for instant realtime push (<10ms)
  useEffect(() => {
    if (!knotId) return;
    const activeKnotId = knotId;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;
      try {
        const rawBase = getRawBase();
        eventSource = new EventSource(`${rawBase}/api/v1/events/${encodeURIComponent(activeKnotId)}`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ping' || data.type === 'connected') return;

            if (data.type === 'typing') {
              usePresence.getState().receiveTyping(data.fromKnotId, data.isTyping);
              return;
            }

            if (data.type === 'contact_request' || data.type === 'contact_response') {
              void useContacts.getState().load();
              return;
            }

            if (data.type === 'read_receipt') {
              if (data.peer || data.messageId) {
                void useChat.getState().markThreadReadByPeer(data.peer, data.messageId);
              }
              void useChat.getState().refresh();
              return;
            }

            if (data.type === 'new_message') {
              if (data.message) {
                void useChat.getState().pushIncoming(data.message);
              } else {
                void useChat.getState().refresh();
              }
              return;
            }

            // Other message events: message_edit, message_delete, message_reaction, clear_chat
            void useChat.getState().refresh();
          } catch (e) {
            console.error('SSE event error:', e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          rotateRawBase();
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };
      } catch (err) {
        console.warn('SSE connect failed:', err);
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [knotId]);

  // Bandwidth-optimized fallback poller (SSE provides <10ms instant push; poller is just a safety net)
  const [isTabVisible, setIsTabVisible] = useState(() => (typeof document !== 'undefined' ? !document.hidden : true));

  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
      if (visible && knotId) {
        void useChat.getState().refresh();
        void useContacts.getState().load();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [knotId]);

  usePolling(
    () => {
      if (!useIdentity.getState().identity || !isTabVisible) return;
      void useChat.getState().refresh();
      void useContacts.getState().load();
    },
    60000,
    !!knotId && isTabVisible
  );

  return (
    <div className="grain relative h-full">
      <Backdrop />

      {!ready ? (
        <Boot />
      ) : !identity ? (
        phase === 'landing' ? (
          <Landing onRestore={() => setPhase('recover')} />
        ) : (
          <IdentityCeremony initialStep="recover" onDone={() => setPhase('landing')} />
        )
      ) : (
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      )}

      <ToastViewport />
    </div>
  );
}
