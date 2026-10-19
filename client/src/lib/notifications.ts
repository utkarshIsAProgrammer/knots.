import { useContacts } from '../features/contacts';
import { useUI } from '../features/ui';

class NotificationService {
  private hasPrompted = false;
  private notifiedMessageIds = new Set<string>();
  private lastNotificationTimeBySender = new Map<string, number>();

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  public init() {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Knots: Service worker registration error:', err);
      });
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OPEN_CHAT' && event.data.peer) {
          useUI.getState().openThread(event.data.peer);
          useUI.getState().setSection('chats');
        }
      });
    }

    if (!this.isSupported()) return;
    if (Notification.permission === 'default' && !this.hasPrompted) {
      this.hasPrompted = true;
      const handler = () => {
        void this.requestPermission();
        window.removeEventListener('click', handler);
        window.removeEventListener('touchstart', handler);
      };
      window.addEventListener('click', handler, { once: true });
      window.addEventListener('touchstart', handler, { once: true });
    }
  }

  /**
   * Dispatches an on-device notification for a message.
   * Completely avoids duplicate alerts for the same message and throttles repeated notifications per sender.
   */
  public async notifyActivity(senderKnotId: string, messageId?: string) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    const cleanSender = (senderKnotId || '').trim();
    if (!cleanSender) return;

    // 1. Deduplicate by message ID if provided
    if (messageId) {
      const cleanId = String(messageId).trim();
      if (cleanId) {
        if (this.notifiedMessageIds.has(cleanId)) {
          return;
        }
        this.notifiedMessageIds.add(cleanId);
        if (this.notifiedMessageIds.size > 2000) {
          const firstKey = this.notifiedMessageIds.values().next().value;
          if (firstKey) this.notifiedMessageIds.delete(firstKey);
        }
      }
    }

    // 2. Throttle alerts per sender (prevent notification storms / loops)
    const senderKey = cleanSender.toLowerCase();
    const now = Date.now();
    const lastNotified = this.lastNotificationTimeBySender.get(senderKey) ?? 0;
    if (now - lastNotified < 3000) {
      return;
    }
    this.lastNotificationTimeBySender.set(senderKey, now);

    // 3. Check if contact is muted
    const contacts = useContacts.getState().contacts;
    const contact = contacts.find((c) => (c.knot_id || '').toLowerCase() === senderKey);
    if (contact?.muted) {
      return;
    }

    // 4. Check if user is already actively reading this thread
    const activeThread = (useUI.getState().activeThread || '').trim().toLowerCase();
    if (
      document.visibilityState === 'visible' &&
      activeThread &&
      activeThread === senderKey
    ) {
      return;
    }

    try {
      const title = contact?.alias || 'Knots';
      const body = contact?.alias
        ? 'New message received.'
        : 'You have a new message. Open Knots to take a look.';

      const options: NotificationOptions = {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `knots-msg-${senderKey}`,
        data: { peer: cleanSender },
        silent: false
      };

      // Desktop PC/Mac browsers: Native Notification is instantaneous (<1ms)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const n = new Notification(title, options);
          n.onclick = () => {
            try {
              window.focus();
            } catch {}
            useUI.getState().openThread(cleanSender);
            useUI.getState().setSection('chats');
            n.close();
          };
          return;
        } catch {
          // Fall through to service worker registration if direct constructor isn't allowed
        }
      }

      // Mobile & Tablet: Android Chrome and iOS Safari require ServiceWorkerRegistration.showNotification
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to display notification', e);
    }
  }

  public notify = this.notifyActivity.bind(this);
}

export const notifications = new NotificationService();
