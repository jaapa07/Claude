import * as THREE from 'three';
import type { Player } from './Player';
import type { Ball } from './Ball';

type Snap = { ps: Float32Array; clips: string[]; ball: Float32Array; fire: boolean };

/** Grava os últimos segundos (30 Hz) e reproduz em câmera lenta com outro ângulo. */
export class Replay {
  buf: Snap[] = [];
  max = 30 * 7;
  acc = 0;
  playing = false;
  t = 0;
  speed = 0.55;
  frames: Snap[] = [];
  private lastClip = new Map<Player, string>();

  record(dt: number, players: Player[], ball: Ball) {
    this.acc += dt;
    if (this.acc < 1 / 30) return;
    this.acc = 0;
    const ps = new Float32Array(players.length * 5);
    const clips: string[] = [];
    players.forEach((p, i) => {
      ps.set([p.pos.x, p.pos.y, p.pos.z, p.yaw, p.ath.currentAction?.time ?? 0], i * 5);
      clips.push(p.ath.current);
    });
    const q = ball.mesh.quaternion;
    this.buf.push({ ps, clips, ball: new Float32Array([ball.pos.x, ball.pos.y, ball.pos.z, q.x, q.y, q.z, q.w]), fire: ball.fire });
    if (this.buf.length > this.max) this.buf.shift();
  }

  start(seconds = 5) {
    this.frames = this.buf.slice(-Math.round(seconds * 30));
    this.playing = this.frames.length > 10;
    this.t = 0;
    this.lastClip.clear();
    return this.playing;
  }

  /** Aplica o quadro atual; devolve false quando termina. */
  apply(dt: number, players: Player[], ball: Ball) {
    this.t += dt * this.speed;
    const fi = this.t * 30;
    const i = Math.floor(fi);
    if (i >= this.frames.length - 1) { this.playing = false; return false; }
    const a = this.frames[i], b = this.frames[i + 1];
    const f = fi - i;
    players.forEach((p, k) => {
      const o = k * 5;
      p.pos.set(a.ps[o] + (b.ps[o] - a.ps[o]) * f, a.ps[o + 1], a.ps[o + 2] + (b.ps[o + 2] - a.ps[o + 2]) * f);
      let dy = b.ps[o + 3] - a.ps[o + 3];
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      p.yaw = a.ps[o + 3] + dy * f;
      const clip = a.clips[k];
      if (this.lastClip.get(p) !== clip) { p.ath.play(clip, 0, 1, true); this.lastClip.set(p, clip); }
      const act = p.ath.currentAction;
      if (act) { act.time = a.ps[o + 4] + (b.clips[k] === clip ? (b.ps[o + 4] - a.ps[o + 4]) * f : 0); act.paused = false; }
      p.ath.mixer.update(0);
      p.sync();
    });
    ball.pos.set(a.ball[0] + (b.ball[0] - a.ball[0]) * f, a.ball[1] + (b.ball[1] - a.ball[1]) * f, a.ball[2] + (b.ball[2] - a.ball[2]) * f);
    ball.mesh.position.copy(ball.pos);
    ball.mesh.quaternion.set(a.ball[3], a.ball[4], a.ball[5], a.ball[6]);
    ball.fire = a.fire;
    ball.shadow.position.set(ball.pos.x, 0.013, ball.pos.z);
    return true;
  }

  focusPoint(out = new THREE.Vector3()) {
    const f = this.frames[Math.min(this.frames.length - 1, Math.floor(this.t * 30))];
    return f ? out.set(f.ball[0], f.ball[1], f.ball[2]) : out;
  }
  clear() { this.buf = []; }
}
