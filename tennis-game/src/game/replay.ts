import type { Athlete } from './athlete';

type Snap = ReturnType<Athlete['snapshot']>;
interface Frame { t: number; ball: { x: number; y: number; z: number; vis: boolean; vx: number; vy: number; vz: number }; a: Snap[] }

/** Records the last seconds of play and plays them back (slow motion, any camera). */
export class ReplayRecorder {
  private frames: Frame[] = [];
  private maxSeconds = 9;

  record(t: number, ball: Frame['ball'], athletes: Athlete[]) {
    this.frames.push({ t, ball: { ...ball }, a: athletes.map((a) => a.snapshot()) });
    while (this.frames.length && t - this.frames[0].t > this.maxSeconds) this.frames.shift();
  }

  clear() { this.frames = []; }

  /** Extract a clip ending `tail` seconds after the last recorded frame, starting `len` seconds before it. */
  clip(len: number): Frame[] {
    if (!this.frames.length) return [];
    const end = this.frames[this.frames.length - 1].t;
    return this.frames.filter((f) => f.t >= end - len);
  }
}

export class ReplayPlayer {
  private i = 0;
  private time = 0;
  done = false;
  constructor(private frames: Frame[], public speed = 0.4) {
    this.time = frames.length ? frames[0].t : 0;
  }

  get duration() { return this.frames.length ? (this.frames[this.frames.length - 1].t - this.frames[0].t) / this.speed : 0; }

  /** Advance and apply to the scene. Returns the current ball position. */
  update(dt: number, athletes: Athlete[], setBall: (b: Frame['ball']) => void) {
    if (!this.frames.length) { this.done = true; return; }
    this.time += dt * this.speed;
    while (this.i < this.frames.length - 1 && this.frames[this.i + 1].t <= this.time) this.i++;
    if (this.i >= this.frames.length - 1) this.done = true;
    const f = this.frames[this.i];
    const g = this.frames[Math.min(this.i + 1, this.frames.length - 1)];
    const k = g.t > f.t ? (this.time - f.t) / (g.t - f.t) : 0;
    const lerp = (a: number, b: number) => a + (b - a) * Math.max(0, Math.min(1, k));
    setBall({ x: lerp(f.ball.x, g.ball.x), y: lerp(f.ball.y, g.ball.y), z: lerp(f.ball.z, g.ball.z), vis: f.ball.vis, vx: f.ball.vx, vy: f.ball.vy, vz: f.ball.vz });
    athletes.forEach((a, idx) => {
      const s = f.a[idx], s2 = g.a[idx];
      // interpolate pose clip times for actions present in both frames (smooth slow motion)
      const t2 = new Map(s2.acts.map(([n, t]) => [n, t]));
      const acts = s.acts.map(([n, t, w]) => [n, t2.has(n) && t2.get(n)! >= t ? lerp(t, t2.get(n)!) : t, w] as [string, number, number]);
      a.applySnapshot({ ...s, acts, x: lerp(s.x, s2.x), y: lerp(s.y, s2.y), z: lerp(s.z, s2.z), twist: lerp(s.twist, s2.twist), hy: lerp(s.hy, s2.hy), hp: lerp(s.hp, s2.hp) });
    });
  }
}
