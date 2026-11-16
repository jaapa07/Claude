import type { Difficulty } from '@/data/ids';
import type { Rng } from '@/game/core/rng';
import type { Hazard, Projectile } from '@/game/items/itemSystem';
import { obstaclePhase, type ObstacleState } from '@/game/racing/obstacles';
import { angleDiff, type TrackRuntime } from '@/game/tracks/trackRuntime';
import type { KartState } from '@/game/vehicles/kartState';

export interface AiProfile {
  /** Fração da velocidade ideal que o piloto tenta manter. */
  speed: number;
  /** 0..1: quanto segue a linha de corrida ideal. */
  line: number;
  /** Probabilidade de derrapar em uma curva que permite drift. */
  drift: number;
  /** Atraso de reação na largada (s). */
  reaction: number;
  /** Probabilidade de pegar um atalho. */
  shortcut: number;
  /** Amplitude do desvio aleatório da trajetória (m). */
  wander: number;
  /** Atraso típico para usar itens (s). */
  itemDelay: number;
}

/** Perfis de dificuldade. A IA usa a mesma física e os mesmos karts que o jogador: muda só a pilotagem. */
export const AI_PROFILES: Record<Difficulty, AiProfile> = {
  easy: { speed: 0.84, line: 0.45, drift: 0.12, reaction: 0.55, shortcut: 0.08, wander: 1.7, itemDelay: 4 },
  normal: { speed: 0.93, line: 0.8, drift: 0.6, reaction: 0.3, shortcut: 0.45, wander: 1.0, itemDelay: 2 },
  hard: { speed: 1, line: 1, drift: 0.95, reaction: 0.12, shortcut: 0.85, wander: 0.45, itemDelay: 0.9 },
};

export interface AiWorld {
  track: TrackRuntime;
  karts: KartState[];
  obstacles: ObstacleState[];
  hazards: Hazard[];
  projectiles: Projectile[];
  time: number;
  raceTime: number;
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const V_REF = 31;

export class AiDriver {
  private readonly profile: AiProfile;
  private readonly personalSpeed: number;
  private readonly wanderPhase: number;
  private avoid = 0;
  private driftCorner = false;
  private cornerDecided = false;
  private wantDrift = false;
  private plannedShortcut = -1;
  private shortcutDecided = -1;
  private itemTimer = 0;
  private stuckTime = 0;
  private reverseTime = 0;
  private readonly tmp = { x: 0, y: 0, z: 0 };
  /** Segundos parado: a simulação reposiciona o kart quando passa do limite. */
  get stuck(): number { return this.stuckTime; }

  constructor(base: AiProfile, private readonly rng: Rng) {
    this.profile = base;
    this.personalSpeed = base.speed * (0.975 + rng() * 0.05);
    this.wanderPhase = rng() * 100;
  }

  resetStuck(): void { this.stuckTime = 0; this.reverseTime = 0; }

  update(k: KartState, w: AiWorld, dt: number): void {
    const inp = k.input;
    const track = w.track;
    const main = track.main;
    const n = track.n;
    const p = this.profile;
    inp.reset = false;
    if (w.raceTime < p.reaction) { inp.throttle = 0; inp.brake = 0; inp.steer = 0; inp.drift = false; inp.item = false; return; }

    const v = Math.max(k.speed, 4);
    const lookSamples = Math.max(3, Math.round((5 + v * 0.42) / track.data.spacing));
    let targetHint = 1;
    let tx: number, tz: number;
    let curvature = 0;
    let lateralTarget = 0;

    // decisão de atalho (uma vez por aproximação)
    if (k.pathId < 0) {
      for (let s = 0; s < track.shortcuts.length; s++) {
        const sc = track.shortcuts[s]!;
        const rel = (sc.data.from - k.mainIndex + n) % n;
        if (rel > 20 && rel < 34 && this.shortcutDecided !== s) {
          this.shortcutDecided = s;
          const ok = !sc.data.risky || p.shortcut > 0.4 || k.boostTime > 0.5;
          this.plannedShortcut = ok && this.rng() < p.shortcut ? s : -1;
        }
        if (rel > n - 12 && rel < n - 4 && this.shortcutDecided === s) { this.shortcutDecided = -1; if (this.plannedShortcut === s) this.plannedShortcut = -1; }
      }
    }

    if (k.pathId >= 0) {
      const sc = track.shortcuts[k.pathId]!;
      const ti = k.pathIndex + lookSamples;
      if (ti < sc.path.n) sc.path.point(ti, 0, this.tmp);
      else main.point(sc.data.to + (ti - sc.path.n), track.racingLine[main.wrap(sc.data.to + ti - sc.path.n)]! * p.line, this.tmp);
      tx = this.tmp.x; tz = this.tmp.z;
      targetHint = sc.data.risky ? 0.72 : 0.82;
      curvature = sc.path.curvature[Math.min(sc.path.n - 1, k.pathIndex + 3)]!;
    } else {
      const ti = main.wrap(k.mainIndex + lookSamples);
      const sc = this.plannedShortcut >= 0 ? track.shortcuts[this.plannedShortcut]! : null;
      const toEntry = sc ? (sc.data.from - k.mainIndex + n) % n : Infinity;
      if (sc && toEntry < lookSamples + 2) {
        sc.path.point(Math.min(sc.path.n - 1, lookSamples - toEntry + 1), 0, this.tmp);
        tx = this.tmp.x; tz = this.tmp.z;
        targetHint = 0.8;
      } else {
        const hw = main.halfWidth[ti]!;
        const wander = Math.sin(w.time * 0.35 + this.wanderPhase) * p.wander;
        lateralTarget = track.jumpZone[ti] ? 0 : track.racingLine[ti]! * p.line + wander + this.avoidance(k, w, dt);
        lateralTarget = this.dodgeObstacles(k, w, lateralTarget, v);
        lateralTarget = clamp(lateralTarget, -(hw - 1.6), hw - 1.6);
        main.point(ti, lateralTarget, this.tmp);
        tx = this.tmp.x; tz = this.tmp.z;
        const brakeLook = main.wrap(k.mainIndex + Math.round((v * 0.3) / track.data.spacing));
        targetHint = Math.min(track.speedHint[k.mainIndex]!, track.speedHint[brakeLook]!);
      }
      curvature = main.curvature[main.wrap(k.mainIndex + 5)]!;
    }

    // direção
    const desired = Math.atan2(tx - k.x, tz - k.z);
    const diff = angleDiff(desired, k.heading);
    let steer = clamp(-diff * 2.6, -1, 1);

    // velocidade
    const target = targetHint * V_REF * this.personalSpeed;
    let throttle = k.speed < target ? 1 : 0;
    let brake = k.speed > target + 3.5 ? 1 : 0;
    if (Math.abs(diff) > 1.1 && k.speed > 12) { throttle = 0; brake = 1; }
    const jumpZone = k.pathId < 0 && track.jumpZone[k.mainIndex] === 1;
    if (jumpZone) { throttle = 1; brake = 0; }

    // drift nas curvas que comportam
    const ice = k.surface === 4;
    const sharp = Math.abs(curvature) > 0.017;
    if (!sharp) { this.cornerDecided = false; this.driftCorner = false; }
    else if (!this.cornerDecided) { this.cornerDecided = true; this.driftCorner = this.rng() < p.drift; }
    if (this.wantDrift) {
      const done = Math.abs(curvature) < 0.009 || k.driftLevel >= 3 || Math.sign(-curvature) !== k.driftDir || !k.drifting && k.driftHeld;
      if (done) this.wantDrift = false;
    } else if (this.driftCorner && sharp && !ice && k.grounded && k.pathId < 0 && k.speed > k.tuning.topSpeed * 0.6 && Math.abs(diff) < 0.5) {
      this.wantDrift = true;
      steer = -Math.sign(curvature);
    }
    if (this.wantDrift && !k.drifting && k.driftHeld) this.wantDrift = false;

    // recuperação quando preso
    if (k.speed < 1.6 && throttle > 0) this.stuckTime += dt; else if (k.speed > 4) this.stuckTime = 0;
    if (this.stuckTime > 1.2 && this.reverseTime <= 0 && this.stuckTime < 1.25 + dt) this.reverseTime = 0.9;
    if (this.reverseTime > 0) {
      this.reverseTime -= dt;
      throttle = 0; brake = 1; steer = -steer;
      this.wantDrift = false;
    }

    inp.steer = steer;
    inp.throttle = throttle;
    inp.brake = brake;
    inp.drift = this.wantDrift;
    inp.item = this.decideItem(k, w, dt);
  }

  /** Desvia de karts mais lentos logo à frente (ultrapassagem pelo lado livre). */
  private avoidance(k: KartState, w: AiWorld, dt: number): number {
    const n = w.track.n;
    let want = 0;
    for (const o of w.karts) {
      if (o === k || o.pathId !== k.pathId) continue;
      const ahead = (o.mainIndex - k.mainIndex + n) % n;
      if (ahead === 0 || ahead > 6) continue;
      const dl = k.lateral - o.lateral;
      if (Math.abs(dl) > 2.6 || o.speed > k.speed + 1.5) continue;
      const hw = w.track.main.halfWidth[k.mainIndex]!;
      const side = dl !== 0 ? Math.sign(dl) : o.lateral > 0 ? -1 : 1;
      want = Math.abs(o.lateral + side * 3) < hw - 1.4 ? side * 3 : -side * 3;
      break;
    }
    this.avoid += (want - this.avoid) * Math.min(1, dt * 4);
    return this.avoid;
  }

  /** Antecipa obstáculos móveis e névoas: escolhe o lado livre no instante da chegada. */
  private dodgeObstacles(k: KartState, w: AiWorld, lateral: number, v: number): number {
    const main = w.track.main;
    const n = w.track.n;
    const spacing = w.track.data.spacing;
    let out = lateral;
    for (const o of w.obstacles) {
      const ahead = (o.data.index - k.mainIndex + n) % n;
      const dist = ahead * spacing;
      if (ahead === 0 || dist > v * 1.5 + 12) continue;
      const t = obstaclePhase(o.data, w.time + dist / v);
      const ox = o.data.a[0] + (o.data.b[0] - o.data.a[0]) * t, oz = o.data.a[2] + (o.data.b[2] - o.data.a[2]) * t;
      const ol = main.lateral(o.data.index, ox, o.data.a[1], oz);
      const clear = o.data.radius + 2.4;
      if (Math.abs(out - ol) < clear) out = ol + (ol > 0 ? -clear : clear);
    }
    for (const h of w.hazards) {
      if (h.owner === k.index && h.life > 8) continue;
      const hi = main.nearest(k.mainIndex, 0, 14, h.x, h.y, h.z);
      const ahead = (hi - k.mainIndex + n) % n;
      if (ahead === 0 || ahead > 12) continue;
      const hl = main.lateral(hi, h.x, h.y, h.z);
      const clear = h.radius + 1.8;
      if (Math.abs(out - hl) < clear) out = hl + (hl > 0 ? -clear : clear);
    }
    return out;
  }

  private decideItem(k: KartState, w: AiWorld, dt: number): boolean {
    if (!k.item) { this.itemTimer = 0; return false; }
    this.itemTimer += dt;
    if (this.itemTimer < this.profile.itemDelay * 0.5) return false;
    const n = w.track.n;
    const late = this.itemTimer > this.profile.itemDelay + 6;
    switch (k.item) {
      case 'pulso-solar':
        return (w.track.speedHint[k.mainIndex]! > 0.92 && k.grounded && k.boostTime <= 0 && Math.abs(k.steer) < 0.35) || late;
      case 'bolha-guardia':
        return this.itemTimer > this.profile.itemDelay || w.projectiles.some((p) => p.target === k.index);
      case 'nevoa-prisma':
        return late || w.karts.some((o) => o !== k && (() => { const b = (k.mainIndex - o.mainIndex + n) % n; return b > 2 && b < 10; })());
      case 'faisca-rastreadora':
        return late || w.karts.some((o) => o !== k && (() => { const a = o.progress - k.progress; return a > 4 && a < 45; })());
      case 'onda-vento':
        return late || w.karts.some((o) => o !== k && Math.hypot(o.x - k.x, o.z - k.z) < 9) || w.projectiles.some((p) => p.target === k.index && Math.hypot(p.x - k.x, p.z - k.z) < 14);
      case 'cristal-salto':
        return this.itemTimer > this.profile.itemDelay + 1.5 && k.grounded && w.track.speedHint[k.mainIndex]! > 0.9 && !w.track.main.gap[w.track.main.wrap(k.mainIndex + 14)];
    }
  }
}
