import { useContacts } from '../features/contacts';
import { useUI } from '../features/ui';

class NotificationService {
  private hasPrompted = false;

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
   * Dispatches an anonymous on-device notification.
   * Completely anonymous — never reveals sender ID, name, or message contents.
   */
  public notifyActivity(senderKnotId: string) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    // 1. Check if contact is muted
    const contacts = useContacts.getState().contacts;
    const contact = contacts.find((c) => (c.knot_id || '').toLowerCase() === (senderKnotId || '').toLowerCase());
    if (contact?.muted) {
      return;
    }

    // 2. Check if user is already actively reading this thread
    const activeThread = useUI.getState().activeThread;
    if (
      document.visibilityState === 'visible' &&
      activeThread &&
      activeThread.toLowerCase() === senderKnotId.toLowerCase()
    ) {
      return;
    }

    try {
      const n = new Notification('Knots.', {
        body: 'New activity. Open Knots to take a look.',
        icon: '/favicon.svg',
        tag: 'knots-activity',
        silent: false
      });

      n.onclick = () => {
        try {
          window.focus();
        } catch {}
        useUI.getState().openThread(senderKnotId);
        useUI.getState().setSection('chats');
        n.close();
      };
    } catch (e) {
      console.warn('Failed to display anonymous notification', e);
    }
  }
}

export const notifications = new NotificationService();
