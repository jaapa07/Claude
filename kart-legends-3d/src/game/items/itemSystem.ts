import { ITEM_BY_ID } from '@/data/items';
import { ITEM_IDS, type ItemId } from '@/data/ids';
import type { Rng } from '@/game/core/rng';
import type { SimEvent } from '@/game/racing/events';
import type { TrackRuntime } from '@/game/tracks/trackRuntime';
import { applyBoost, jump, spinOut } from '@/game/vehicles/kartPhysics';
import type { KartState } from '@/game/vehicles/kartState';

export interface ItemBox { x: number; y: number; z: number; active: boolean; respawn: number }

export interface Hazard { id: number; owner: number; x: number; y: number; z: number; radius: number; life: number; arm: number }

export interface Projectile {
  id: number;
  owner: number;
  target: number;
  /** Posição ao longo da pista principal (índice fracionário) e deslocamento lateral. */
  s: number;
  lateral: number;
  x: number; y: number; z: number;
  px: number; py: number; pz: number;
  life: number;
}

export interface WindWave { id: number; owner: number; x: number; y: number; z: number; age: number }

const ROLL_TIME = 1.4;
const BOX_RESPAWN = 3.5;
const BOX_RADIUS = 2.1;
export const WIND_RADIUS = 14;
export const HAZARD_RADIUS = 3.2;
const PROJECTILE_SPEED = 48;

/**
 * Peso de cada item conforme a posição (r = 0 líder … 1 último). Quem está atrás recebe mais
 * itens ofensivos e de velocidade; quem lidera, mais defesa. Não há item que garanta vitória.
 */
export function itemWeights(rankFraction: number): Record<ItemId, number> {
  const r = Math.max(0, Math.min(1, rankFraction));
  return {
    'pulso-solar': 1 + 2.2 * r,
    'bolha-guardia': 1.7 - 0.8 * r,
    'nevoa-prisma': 1.7 - 1.1 * r,
    'faisca-rastreadora': 0.35 + 2.1 * r,
    'onda-vento': 1,
    'cristal-salto': 0.8,
  };
}

export function rollItem(rng: Rng, rankFraction: number): ItemId {
  const w = itemWeights(rankFraction);
  const total = ITEM_IDS.reduce((s, id) => s + w[id], 0);
  let x = rng() * total;
  for (const id of ITEM_IDS) {
    x -= w[id];
    if (x <= 0) return id;
  }
  return 'pulso-solar';
}

export class ItemSystem {
  readonly boxes: ItemBox[] = [];
  readonly hazards: Hazard[] = [];
  readonly projectiles: Projectile[] = [];
  readonly waves: WindWave[] = [];
  private nextId = 1;
  private readonly tmp = { x: 0, y: 0, z: 0 };
  /**
   * Movimento alternativo dos projéteis, para lugares sem traçado (arenas de batalha). Recebe o projétil
   * com `px/py/pz` já atualizados e escreve `x/y/z` (ou zera `life` para destruí-lo). null = segue a pista.
   */
  projectileMotion: ((p: Projectile, karts: KartState[], dt: number) => void) | null = null;

  constructor(
    private readonly track: TrackRuntime,
    private readonly rng: Rng,
    private readonly emit: (e: SimEvent) => void,
    readonly enabled: boolean,
  ) {
    if (!enabled) return;
    for (const row of track.data.itemRows) {
      for (const off of row.offsets) {
        track.main.point(row.index, off, this.tmp);
        this.boxes.push({ x: this.tmp.x, y: this.tmp.y + 1.1, z: this.tmp.z, active: true, respawn: 0 });
      }
    }
  }

  step(karts: KartState[], dt: number): void {
    if (!this.enabled) return;
    const racers = karts.length;
    for (const b of this.boxes) {
      if (!b.active) { b.respawn -= dt; if (b.respawn <= 0) b.active = true; continue; }
      for (const k of karts) {
        if (k.finished || k.item || k.itemRoll > 0 || k.itemCooldown > 0) continue;
        const dx = k.x - b.x, dy = k.y - b.y, dz = k.z - b.z;
        if (dx * dx + dy * dy + dz * dz < BOX_RADIUS * BOX_RADIUS) {
          b.active = false; b.respawn = BOX_RESPAWN;
          k.itemRoll = ROLL_TIME;
          this.emit({ type: 'item_pickup', kart: k.index });
          break;
        }
      }
    }
    for (const k of karts) {
      k.itemCooldown = Math.max(0, k.itemCooldown - dt);
      if (k.itemRoll > 0) {
        k.itemRoll -= dt;
        if (k.itemRoll <= 0) {
          k.itemRoll = 0;
          k.item = rollItem(this.rng, racers > 1 ? (k.position - 1) / (racers - 1) : 0.5);
          this.emit({ type: 'item_ready', kart: k.index, item: k.item });
        }
      }
      const pressed = k.input.item && k.spinTime <= 0;
      if (pressed && !k.itemHeld && k.item) this.use(k, karts);
      k.itemHeld = k.input.item;
    }
    this.stepHazards(karts, dt);
    this.stepProjectiles(karts, dt);
    for (let i = this.waves.length - 1; i >= 0; i--) {
      this.waves[i]!.age += dt;
      if (this.waves[i]!.age > ITEM_BY_ID['onda-vento'].duration) this.waves.splice(i, 1);
    }
  }

  private use(k: KartState, karts: KartState[]): void {
    const item = k.item!;
    k.item = null;
    k.itemCooldown = ITEM_BY_ID[item].cooldown;
    k.itemsUsed++;
    this.emit({ type: 'item_use', kart: k.index, item, x: k.x, y: k.y, z: k.z });
    switch (item) {
      case 'pulso-solar':
        applyBoost(k, ITEM_BY_ID[item].duration, 4);
        break;
      case 'bolha-guardia':
        k.shield = ITEM_BY_ID[item].duration;
        break;
      case 'nevoa-prisma': {
        const bx = k.x - Math.sin(k.heading) * 4.5, bz = k.z - Math.cos(k.heading) * 4.5;
        this.hazards.push({ id: this.nextId++, owner: k.index, x: bx, y: k.y - 0.4, z: bz, radius: HAZARD_RADIUS, life: ITEM_BY_ID[item].duration, arm: 0.5 });
        break;
      }
      case 'faisca-rastreadora': {
        let target = -1, best = Infinity;
        for (const o of karts) {
          if (o === k || o.finished) continue;
          const ahead = o.progress - k.progress;
          if (ahead > 0 && ahead < best) { best = ahead; target = o.index; }
        }
        this.projectiles.push({
          id: this.nextId++, owner: k.index, target, s: k.mainIndex + 2, lateral: k.pathId < 0 ? k.lateral : 0,
          x: k.x, y: k.y, z: k.z, px: k.x, py: k.y, pz: k.z, life: ITEM_BY_ID[item].duration,
        });
        break;
      }
      case 'onda-vento': {
        this.waves.push({ id: this.nextId++, owner: k.index, x: k.x, y: k.y, z: k.z, age: 0 });
        for (const o of karts) {
          if (o === k) continue;
          const dx = o.x - k.x, dz = o.z - k.z, dy = o.y - k.y;
          const d = Math.hypot(dx, dz);
          if (d > WIND_RADIUS || Math.abs(dy) > 5) continue;
          if (o.shield > 0) { o.shield = 0; this.emit({ type: 'shield_break', kart: o.index }); continue; }
          if (o.invuln > 0) continue;
          const f = (1 - d / WIND_RADIUS) * 13 + 8;
          const inv = 1 / (d || 1);
          o.vx += dx * inv * f / o.tuning.mass; o.vz += dz * inv * f / o.tuning.mass; o.vy += 3;
          // o empurrão desvia o kart, mas não pode lançá-lo acima da velocidade de turbo
          const cap = o.tuning.topSpeed * 1.25, hv = Math.hypot(o.vx, o.vz);
          if (hv > cap) { o.vx *= cap / hv; o.vz *= cap / hv; }
          o.body.setLinvel({ x: o.vx, y: o.vy, z: o.vz }, true);
          o.stun = 0.45 / o.tuning.recovery;
          o.drifting = false; o.driftCharge = 0; o.driftLevel = 0;
          o.jumpGrace = 0.15; o.grounded = false;
          this.emit({ type: 'pushed', kart: o.index });
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i]!;
          if (Math.hypot(p.x - k.x, p.z - k.z) < WIND_RADIUS + 2) this.projectiles.splice(i, 1);
        }
        break;
      }
      case 'cristal-salto':
        if (k.grounded) jump(k, this.emit);
        else { k.vy = Math.max(k.vy, 6); k.body.setLinvel({ x: k.vx, y: k.vy, z: k.vz }, true); }
        break;
    }
  }

  private stepHazards(karts: KartState[], dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]!;
      h.life -= dt; h.arm -= dt;
      if (h.life <= 0) { this.hazards.splice(i, 1); continue; }
      if (h.arm > 0) continue;
      for (const k of karts) {
        const dx = k.x - h.x, dz = k.z - h.z;
        if (dx * dx + dz * dz > h.radius * h.radius || Math.abs(k.y - h.y) > 3) continue;
        if (k.invuln > 0 || k.spinTime > 0) continue;
        const shielded = k.shield > 0;
        spinOut(k, this.emit, 'nevoa');
        if (!shielded) k.invuln = Math.max(k.invuln, 2.2);
        h.life = Math.min(h.life, shielded ? 0 : 1.2);
      }
    }
  }

  private stepProjectiles(karts: KartState[], dt: number): void {
    const main = this.track.main;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.life -= dt;
      p.px = p.x; p.py = p.y; p.pz = p.z;
      if (this.projectileMotion) this.projectileMotion(p, karts, dt);
      else {
      p.s += (PROJECTILE_SPEED * dt) / this.track.data.spacing;
      const target = p.target >= 0 ? karts[p.target] : undefined;
      let wanted = this.track.racingLine[main.wrap(Math.floor(p.s))]!;
      let rate = 10;
      if (target && !target.finished && target.pathId < 0) {
        const gapSamples = (target.mainIndex - main.wrap(Math.floor(p.s)) + main.n) % main.n;
        if (gapSamples < 16) { wanted = target.lateral; rate = 26; }
      }
      p.lateral += Math.max(-rate * dt, Math.min(rate * dt, wanted - p.lateral));
      main.point(Math.floor(p.s), p.lateral, this.tmp);
      p.x = this.tmp.x; p.y = this.tmp.y + 1; p.z = this.tmp.z;
      }
      let dead = p.life <= 0;
      for (const h of this.hazards) {
        if (Math.hypot(p.x - h.x, p.z - h.z) < h.radius) { dead = true; h.life = Math.min(h.life, 0.6); }
      }
      if (!dead) {
        for (const k of karts) {
          if (k.index === p.owner && p.life > ITEM_BY_ID['faisca-rastreadora'].duration - 0.6) continue;
          const dx = k.x - p.x, dy = k.y - p.y, dz = k.z - p.z;
          if (dx * dx + dy * dy * 0.3 + dz * dz < 2.4 * 2.4) {
            spinOut(k, this.emit, 'faisca');
            dead = true;
            break;
          }
        }
      }
      if (dead) this.projectiles.splice(i, 1);
    }
  }
}
