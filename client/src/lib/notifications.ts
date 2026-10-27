import { api } from './api/client';
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
      if (result === 'granted') {
        // Register this device for Web Push so the relay can reach it while closed.
        void this.enablePush();
      }
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

  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
    } catch {
      return null;
    }
  }

  private static urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      bytes[i] = raw.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Registers this device for Web Push so the relay can wake the app when it is
   * fully closed. Silently no-ops when push is unsupported or unconfigured.
   */
  public async enablePush(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    if (!this.isSupported() || Notification.permission !== 'granted') return false;

    try {
      const { useIdentity } = await import('../features/identity');
      const knotId = useIdentity.getState().identity?.knotId;
      if (!knotId) return false;

      const registration = await this.getServiceWorkerRegistration();
      if (!registration) return false;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const { publicKey } = await api.pushPublicKey();
        if (!publicKey) return false;
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: NotificationService.urlBase64ToUint8Array(publicKey)
        });
      }

      await api.subscribePush(knotId, subscription.toJSON());
      return true;
    } catch (err) {
      console.warn('Knots: Web Push subscription failed:', err);
      return false;
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
