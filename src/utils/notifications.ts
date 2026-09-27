/**
 * Desktop & Mobile Notification Controller
 * Triggers system notifications with vibration and sound.
 * Clicking the notification focuses/starts up the window to show the red sonar.
 */

class NotificationController {
  private isGranted: boolean = false;
  private flashInterval: number | null = null;
  private originalTitle: string = 'Red Sonar - Friend Signal';

  constructor() {
    if (typeof window !== 'undefined') {
      this.originalTitle = document.title;
      this.checkPermission();
    }
  }

  public checkPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    this.isGranted = Notification.permission === 'granted';
    return this.isGranted;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      this.isGranted = res === 'granted';
      return this.isGranted;
    } catch {
      return false;
    }
  }

  public showSignalNotification(params: {
    fromEmail: string;
    fromNickname?: string;
    deviceType?: string;
    message?: string;
    onFocus?: () => void;
  }) {
    const { fromEmail, fromNickname, message, onFocus } = params;
    const senderName = fromNickname ? `${fromNickname} (${fromEmail})` : fromEmail;

    // 1. Service Worker Notification or Native Window Notification
    if (this.isGranted && 'Notification' in window) {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: `🔴 RED SONAR: ${senderName}`,
              body: message || `${senderName} is pinging you! Screen flashing red!`,
            }
          });
        } else {
          const notif = new Notification(`🔴 RED SONAR: ${senderName}`, {
            body: message || `${senderName} sent you a red sonar signal! Tap to open.`,
            icon: '/icon-192.svg',
            badge: '/icon-192.svg',
            tag: 'red-sonar-signal',
            requireInteraction: true,
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
            if (onFocus) onFocus();
          };
        }
      } catch (err) {
        console.warn('Notification failed:', err);
      }
    }

    // 2. Alert Browser Tab Title
    this.flashTitle(`🔴 [SONAR SIGNAL] ${senderName}`);
  }

  public flashTitle(alertText: string) {
    if (this.flashInterval) clearInterval(this.flashInterval);
    let toggle = false;
    this.flashInterval = window.setInterval(() => {
      document.title = toggle ? alertText : '⚠️ 🔴 RED SONAR ALERT';
      toggle = !toggle;
    }, 800);

    const stopOnFocus = () => {
      this.stopFlashing();
      window.removeEventListener('focus', stopOnFocus);
    };
    window.addEventListener('focus', stopOnFocus);
  }

  public stopFlashing() {
    if (this.flashInterval) {
      clearInterval(this.flashInterval);
      this.flashInterval = null;
    }
    document.title = this.originalTitle;
  }
}

export const notificationController = new NotificationController();
