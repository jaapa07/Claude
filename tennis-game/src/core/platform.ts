// Device detection and mobile helpers (fullscreen, orientation lock, service worker).
export const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
export const isPhone = isTouch && Math.min(screen.width, screen.height) < 820;
export const isMobile = isTouch && (isPhone || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent));

if (isTouch) document.documentElement.classList.add('is-touch');
if (isMobile) document.documentElement.classList.add('mobile');

export async function enterFullscreen() {
  if (!isMobile) return;
  try {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement) await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
  } catch { /* not allowed (iOS Safari, iframes) */ }
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch { /* unsupported */ }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const ok = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!ok || import.meta.env.DEV) return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* sandboxed hosts may refuse */ });
}

/** Adaptive resolution: lowers the render scale when the frame rate stays low. */
export class FpsGovernor {
  private acc = 0;
  private frames = 0;
  scale = 1;
  constructor(private apply: (scale: number) => void, private min = 0.6) {}
  tick(dt: number) {
    this.acc += dt;
    this.frames++;
    if (this.acc < 2.5) return;
    const fps = this.frames / this.acc;
    this.acc = 0;
    this.frames = 0;
    if (fps < 42 && this.scale > this.min) { this.scale = Math.max(this.min, this.scale - 0.15); this.apply(this.scale); }
    else if (fps > 57 && this.scale < 1) { this.scale = Math.min(1, this.scale + 0.1); this.apply(this.scale); }
  }
}
