/**
 * Screen WakeLock Helper
 * Prevents mobile and PC screens from sleeping so the app remains connected
 * in the active background state.
 */

class WakeLockManager {
  private sentinel: any = null;

  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
        });
        return true;
      } catch (err) {
        console.warn('Wake Lock request error:', err);
        return false;
      }
    }
    return false;
  }

  public releaseWakeLock() {
    if (this.sentinel) {
      try {
        this.sentinel.release();
      } catch (e) {}
      this.sentinel = null;
    }
  }

  public isLocked(): boolean {
    return this.sentinel !== null;
  }
}

export const wakeLockManager = new WakeLockManager();
