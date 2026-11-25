import { ITEM_BY_ID } from '@/data/items';
import { ITEM_IDS, type ItemId } from '@/data/ids';
import type { Rng } from '@/game/core/rng';
import { GROUP_KART, GROUP_OBSTACLE, GROUP_STATIC, groups } from '@/game/physics/trackColliders';
import type { SimEvent } from '@/game/racing/events';
import { angleDiff, type TrackRuntime } from '@/game/tracks/trackRuntime';
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

/** Um elo do Raio Corrente (só visual): de `from` até `to`, `link` = 0 o mais forte. */
export interface ChainArc { id: number; from: number; to: number; link: number; age: number }

const ROLL_TIME = 1.4;
const BOX_RESPAWN = 3.5;
const BOX_RADIUS = 2.1;
export const WIND_RADIUS = 14;
export const HAZARD_RADIUS = 3.2;
const PROJECTILE_SPEED = 48;

/**
 * Raio Corrente: cada elo atinge o próximo piloto à frente do anterior, mais fraco.
 * `factor` = fração da velocidade máxima durante `time` s; `cut` = velocidade mantida no choque.
 */
export const CHAIN_LINKS = [
  { factor: 0.6, time: 1.6, cut: 0.8 },
  { factor: 0.74, time: 1.05, cut: 0.88 },
  { factor: 0.86, time: 0.65, cut: 0.94 },
] as const;
/** Alcance (m, medido ao longo da pista) do primeiro elo e dos saltos seguintes. */
export const CHAIN_FIRST_RANGE = 90;
export const CHAIN_HOP_RANGE = 42;
export const ARC_LIFE = 0.45;
/** Cometa Guia: raio do "para-choque" que tira rivais do caminho e força do empurrão lateral. */
export const RAM_RADIUS = 3.4;
const RAM_PUSH = 10;
/** O Cometa Guia só sai para quem está na metade de trás do grid (fração de posição ≥ isto). */
export const COMET_MIN_RANK = 0.5;
/** Velocidade (m/s) que o piloto automático aceita numa curva com dica de velocidade 1 (a IA usa ≈31). */
const COMET_CORNER_SPEED = 38;

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
    // ataque em cadeia: inútil para o líder (não há ninguém à frente), melhor no meio/fundo do grid
    'raio-corrente': 0.15 + 1.4 * r,
    // recuperação: só para a metade de trás, cada vez mais comum quanto mais atrás
    'cometa-guia': r < COMET_MIN_RANK ? 0 : 0.4 + 2 * ((r - COMET_MIN_RANK) / (1 - COMET_MIN_RANK)),
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
  readonly arcs: ChainArc[] = [];
  private nextId = 1;
  /** Por piloto: tempo até poder ser empurrado de novo por um cometa; e se estava em modo cometa. */
  private ramCooldown: number[] = [];
  private cometOn: boolean[] = [];
  private readonly tmp = { x: 0, y: 0, z: 0 };

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
    this.stepComets(karts, dt);
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i]!.age += dt;
      if (this.arcs[i]!.age > ARC_LIFE) this.arcs.splice(i, 1);
    }
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
          // o cometa é pesado demais para o vento
          if (d > WIND_RADIUS || Math.abs(dy) > 5 || o.comet > 0) continue;
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
      case 'raio-corrente':
        this.chainLightning(k, karts);
        break;
      case 'cometa-guia': {
        const dur = ITEM_BY_ID[item].duration;
        k.comet = dur;
        k.stun = 0;
        k.drifting = false; k.driftCharge = 0; k.driftLevel = 0;
        applyBoost(k, dur, 4);
        this.cometOn[k.index] = true;
        // atravessa os obstáculos móveis (sem colidir com eles) enquanto dura
        k.collider.setCollisionGroups(groups(GROUP_KART, GROUP_STATIC | GROUP_KART));
        break;
      }
    }
  }

  /**
   * Raio Corrente: atinge o piloto mais próximo à frente (até CHAIN_FIRST_RANGE m) e salta para o
   * próximo à frente dele (até CHAIN_HOP_RANGE m), no máximo 3 elos, cada um mais fraco.
   * A Bolha Guardiã estoura e aterra o raio; um Cometa Guia o aterra sem sofrer nada; quem está
   * invulnerável (acabou de rodar ou reaparecer) não sente, mas passa o raio adiante.
   */
  private chainLightning(k: KartState, karts: KartState[]): void {
    const spacing = this.track.data.spacing;
    const hit = new Set<number>([k.index]);
    let from = k;
    for (let link = 0; link < CHAIN_LINKS.length; link++) {
      const range = link === 0 ? CHAIN_FIRST_RANGE : CHAIN_HOP_RANGE;
      let next: KartState | null = null, best = Infinity;
      for (const o of karts) {
        if (hit.has(o.index) || o.finished) continue;
        const ahead = (o.progress - from.progress) * spacing;
        if (ahead <= 0 || ahead > range || ahead >= best) continue;
        // sem atravessar morros/viadutos: também precisa estar perto em linha reta
        if (Math.hypot(o.x - from.x, o.y - from.y, o.z - from.z) > range * 1.1) continue;
        best = ahead; next = o;
      }
      if (!next) break;
      hit.add(next.index);
      this.arcs.push({ id: this.nextId++, from: from.index, to: next.index, link, age: 0 });
      if (next.comet > 0) break;
      if (next.shield > 0) {
        next.shield = 0;
        next.invuln = Math.max(next.invuln, 0.8);
        this.emit({ type: 'shield_break', kart: next.index });
        break;
      }
      if (next.invuln <= 0 && next.spinTime <= 0) {
        const L = CHAIN_LINKS[link]!;
        next.slowFactor = next.slowTime > 0 ? Math.min(next.slowFactor, L.factor) : L.factor;
        next.slowTime = Math.max(next.slowTime, L.time);
        next.vx *= L.cut; next.vz *= L.cut;
        next.body.setLinvel({ x: next.vx, y: next.vy, z: next.vz }, true);
        next.drifting = false; next.driftCharge = 0; next.driftLevel = 0;
        if (link === 0) next.boostTime = 0;
        this.emit({ type: 'zapped', kart: next.index, from: from.index, link });
      }
      from = next;
    }
  }

  /**
   * Piloto automático do Cometa Guia: segue a linha de corrida (ou o atalho em que já está) com
   * acelerador cheio, sobrescrevendo os comandos do piloto. Chamado antes da física do kart.
   */
  steerComet(k: KartState): void {
    const track = this.track, main = track.main, inp = k.input;
    const v = Math.max(k.speed, 8);
    const look = Math.max(3, Math.round((6 + v * 0.45) / track.data.spacing));
    if (k.pathId >= 0) {
      const sc = track.shortcuts[k.pathId]!;
      const ti = k.pathIndex + look;
      if (ti < sc.path.n) sc.path.point(ti, 0, this.tmp);
      else main.point(sc.data.to + ti - sc.path.n, track.racingLine[main.wrap(sc.data.to + ti - sc.path.n)]! * 0.7, this.tmp);
    } else {
      const ti = main.wrap(k.mainIndex + look);
      main.point(ti, track.jumpZone[ti] ? 0 : track.racingLine[ti]! * 0.7, this.tmp);
    }
    const diff = angleDiff(Math.atan2(this.tmp.x - k.x, this.tmp.z - k.z), k.heading);
    inp.steer = Math.max(-1, Math.min(1, -diff * 2.6));
    // curva fechada logo à frente: segura um pouco (ainda bem acima do ritmo normal dela)
    const brakeLook = main.wrap(k.mainIndex + Math.round((v * 0.35) / track.data.spacing));
    const hint = k.pathId >= 0 ? 1 : Math.min(track.speedHint[k.mainIndex]!, track.speedHint[brakeLook]!);
    const tight = hint < 0.85 && k.speed > hint * COMET_CORNER_SPEED;
    inp.throttle = tight ? 0 : 1; inp.brake = tight ? 1 : 0; inp.drift = false; inp.reset = false;
  }

  /** Cometas ativos tiram do caminho quem encostar neles; avisa quando um cometa termina. */
  private stepComets(karts: KartState[], dt: number): void {
    for (const o of karts) this.ramCooldown[o.index] = Math.max(0, (this.ramCooldown[o.index] ?? 0) - dt);
    for (const k of karts) {
      if (k.comet <= 0) {
        if (this.cometOn[k.index]) {
          this.cometOn[k.index] = false;
          k.collider.setCollisionGroups(groups(GROUP_KART, GROUP_STATIC | GROUP_KART | GROUP_OBSTACLE));
          this.emit({ type: 'comet_end', kart: k.index });
        }
        continue;
      }
      const fx = Math.sin(k.heading), fz = Math.cos(k.heading);
      for (const o of karts) {
        if (o === k || o.comet > 0 || o.finished || this.ramCooldown[o.index]! > 0) continue;
        const dx = o.x - k.x, dz = o.z - k.z;
        if (dx * dx + dz * dz > RAM_RADIUS * RAM_RADIUS || Math.abs(o.y - k.y) > 2.5) continue;
        this.ramCooldown[o.index] = 0.8;
        if (o.shield > 0) { o.shield = 0; o.invuln = Math.max(o.invuln, 0.8); this.emit({ type: 'shield_break', kart: o.index }); continue; }
        if (o.invuln > 0) continue;
        // empurrão para o lado em que o rival já está (perpendicular ao cometa), sem tirar a velocidade dele
        const side = dx * fz - dz * fx >= 0 ? 1 : -1;
        o.vx += side * fz * RAM_PUSH; o.vz -= side * fx * RAM_PUSH; o.vy += 2.5;
        const cap = o.tuning.topSpeed * 1.25, hv = Math.hypot(o.vx, o.vz);
        if (hv > cap) { o.vx *= cap / hv; o.vz *= cap / hv; }
        o.body.setLinvel({ x: o.vx, y: o.vy, z: o.vz }, true);
        o.stun = 0.35 / o.tuning.recovery;
        o.drifting = false; o.driftCharge = 0; o.driftLevel = 0;
        o.jumpGrace = 0.15; o.grounded = false;
        this.emit({ type: 'rammed', kart: o.index, by: k.index });
      }
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
        // o cometa atravessa a névoa e a dissipa
        if (k.comet > 0) { h.life = Math.min(h.life, 0.3); continue; }
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
