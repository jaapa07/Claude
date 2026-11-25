import type { BattleGameId } from '@/data/battle';
import type { Difficulty } from '@/data/ids';
import type { ArenaData, ArenaPlatform } from '@/game/battle/arenaTypes';
import type { Battler, CrownState, Crystal } from '@/game/battle/battleSim';
import type { Rng } from '@/game/core/rng';
import { WIND_RADIUS, type Hazard, type ItemBox, type Projectile } from '@/game/items/itemSystem';
import type { KartState } from '@/game/vehicles/kartState';

/**
 * IA de batalha: sem linha de corrida. Escolhe um alvo (rival, cristal, coroa, caixa de item ou um ponto de fuga),
 * sobe em plataformas pelas rampas, desvia de muros e névoas com raios, foge quando está fraca, usa itens pela
 * situação e se solta quando trava. Produz os mesmos comandos que o jogador (mesma física).
 */
export interface BattleWorld {
  readonly karts: KartState[];
  readonly battlers: Battler[];
  readonly crystals: Crystal[];
  readonly crown: CrownState;
  readonly items: { readonly boxes: ItemBox[]; readonly hazards: Hazard[]; readonly projectiles: Projectile[] };
  readonly arena: ArenaData;
  readonly game: BattleGameId;
  readonly matchTime: number;
  readonly timeLeft: number;
  probe(x: number, y: number, z: number, angle: number, len: number): number;
  scoreOf(i: number): number;
}

export interface BattleProfile {
  /** Atraso na largada (s). */
  reaction: number;
  /** Acelerador máximo. */
  throttle: number;
  /** Erro de mira (rad). */
  aim: number;
  /** Chance de derrapar numa curva longa. */
  drift: number;
  /** Atraso típico para usar itens (s). */
  itemDelay: number;
  /** 0..1: vontade de atacar. */
  aggression: number;
  /** 0..1: cuidado (foge quando está fraco, protege o que tem). */
  caution: number;
  /** Intervalo entre decisões de alvo (s). */
  think: number;
}

export const BATTLE_AI_PROFILES: Record<Difficulty, BattleProfile> = {
  easy: { reaction: 0.6, throttle: 0.86, aim: 0.22, drift: 0.1, itemDelay: 2.6, aggression: 0.35, caution: 0.3, think: 0.9 },
  normal: { reaction: 0.3, throttle: 0.95, aim: 0.1, drift: 0.45, itemDelay: 1.2, aggression: 0.62, caution: 0.6, think: 0.55 },
  hard: { reaction: 0.12, throttle: 1, aim: 0.03, drift: 0.8, itemDelay: 0.5, aggression: 0.85, caution: 0.85, think: 0.35 },
};

type GoalKind = 'hunt' | 'box' | 'crystal' | 'crown' | 'flee' | 'roam';
interface Goal { kind: GoalKind; x: number; y: number; z: number; kart: number }

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const wrap = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const OFFSETS = [0.35, 0.7, 1.05, 1.45, 1.9, 2.4];
const OFFENSIVE = new Set(['faisca-rastreadora', 'onda-vento', 'nevoa-prisma']);

function inPlatform(p: ArenaPlatform, x: number, z: number, margin = 0): boolean {
  const dx = x - p.x, dz = z - p.z;
  const s = Math.sin(p.rotY), c = Math.cos(p.rotY);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) <= p.hx + margin && Math.abs(lz) <= p.hz + margin;
}

export class BattleAi {
  readonly profile: BattleProfile;
  private goal: Goal = { kind: 'roam', x: 0, y: 0, z: 0, kart: -1 };
  private thinkTimer = 0;
  private huntTarget = -1;
  private huntTimer = 0;
  private fleeTimer = 0;
  private avoidOffset = 0;
  private avoidSide = 1;
  private probeTimer = 0;
  private stuckTime = 0;
  private reverseTime = 0;
  private reverseSteer = 0;
  private itemTimer = 0;
  private driftTurn = false;
  /** Tempo colado no alvo da caça (empurrando contra o muro) e rival a evitar por um instante. */
  private contact = 0;
  private avoidKart = -1;
  private avoidKartTimer = 0;
  private stuckCount = 0;
  private stuckWindow = 0;
  /** Distância livre logo à frente do kart (atualizada junto com os raios de desvio). */
  private front = Infinity;
  private driftDecided = false;
  /** Subida de plataforma: -1 = nenhuma; senão índice da plataforma, entrada e etapa (0 = preparar, 1 = subir). */
  private climb = { plat: -1, entry: 0, stage: 0, time: 0 };
  private readonly phase: number;

  constructor(difficulty: Difficulty, private readonly rng: Rng) {
    this.profile = BATTLE_AI_PROFILES[difficulty];
    this.phase = rng() * 100;
  }

  resetStuck(): void {
    this.stuckTime = 0; this.reverseTime = 0; this.climb.plat = -1; this.thinkTimer = 0;
  }

  update(k: KartState, w: BattleWorld, dt: number): void {
    const inp = k.input;
    const p = this.profile;
    inp.reset = false;
    if (w.matchTime < p.reaction) { inp.throttle = 0; inp.brake = 0; inp.steer = 0; inp.drift = false; inp.item = false; return; }

    this.thinkTimer -= dt;
    this.huntTimer -= dt;
    this.fleeTimer -= dt;
    this.avoidKartTimer -= dt;
    this.stuckWindow -= dt;
    if (this.stuckWindow <= 0) this.stuckCount = 0;
    // colado no rival há um tempo (prensando no muro): solta e vai fazer outra coisa
    if (this.goal.kart >= 0 && Math.hypot(w.karts[this.goal.kart]!.x - k.x, w.karts[this.goal.kart]!.z - k.z) < 4.5) this.contact += dt;
    else this.contact = 0;
    if (this.contact > 1.3) {
      this.avoidKart = this.goal.kart; this.avoidKartTimer = 2.5; this.contact = 0; this.huntTimer = 0;
      this.thinkTimer = 0;
    }
    if (this.thinkTimer <= 0 || this.goalGone(w)) {
      this.thinkTimer = p.think * (0.8 + this.rng() * 0.4);
      this.choose(k, w);
    }
    // alvos móveis: acompanha a posição (com antecipação) a cada passo
    if (this.goal.kart >= 0) {
      const t = w.karts[this.goal.kart]!;
      const d = Math.hypot(t.x - k.x, t.z - k.z);
      const lead = clamp(d / Math.max(16, Math.abs(k.speed)), 0, 1.1);
      this.goal.x = t.x + t.vx * lead; this.goal.y = t.y; this.goal.z = t.z + t.vz * lead;
    } else if (this.goal.kind === 'crown' && w.crown.holder < 0) {
      this.goal.x = w.crown.x; this.goal.y = w.crown.y; this.goal.z = w.crown.z;
    }

    // rota (rampas das plataformas) e direção desejada
    const aim = this.route(k, w, dt);
    let desired = Math.atan2(aim.x - k.x, aim.z - k.z);
    const dist = Math.hypot(aim.x - k.x, aim.z - k.z);
    desired += Math.sin(w.matchTime * 0.7 + this.phase) * p.aim;
    desired = this.avoidHazards(k, w, desired);
    desired = this.keepInside(k, w, desired);
    if (!aim.noAvoid) desired = this.avoidWalls(k, w, desired, dist);
    else { this.avoidOffset = 0; this.front = Infinity; }

    const err = wrap(desired - k.heading);
    let steer = clamp(-err * 2.4, -1, 1);
    let throttle = p.throttle;
    let brake = 0;
    // curva fechada perto do alvo: alivia para virar no lugar
    if (Math.abs(err) > 1.5 && dist < 18 && k.speed > 12) { throttle = 0.2; brake = 0.25; }
    else if (Math.abs(err) > 1.1) throttle = Math.min(throttle, 0.75);

    // de cara para um muro e precisando virar muito: manobra de ré (sem velocidade o kart não esterça)
    if (this.reverseTime <= 0 && this.front < 3.2 && Math.abs(err) > 0.9 && Math.abs(k.speed) < 9 && k.grounded) {
      this.reverseTime = 1.1; this.reverseSteer = err > 0 ? 1 : -1; this.front = Infinity;
    }
    // travado contra algo: dá ré virando para o outro lado
    if (this.reverseTime > 0) {
      this.reverseTime -= dt;
      throttle = 0; brake = 1; steer = this.reverseSteer;
    } else if (w.matchTime > p.reaction + 1 && Math.abs(k.speed) < 1.6 && k.freeze <= 0 && k.spinTime <= 0 && k.stun <= 0) {
      this.stuckTime += dt;
      if (this.stuckTime > 0.7) {
        // travou de novo logo em seguida: ré mais longa e outro objetivo
        this.stuckCount++; this.stuckWindow = 6;
        const again = this.stuckCount >= 2;
        this.reverseTime = again ? 1.6 : 0.9; this.reverseSteer = (err > 0 ? 1 : -1) * (again && this.stuckCount % 2 ? -1 : 1);
        this.stuckTime = 0; this.climb.plat = -1;
        if (again) { this.set('roam', k.x * 0.3, 0, k.z * 0.3); this.thinkTimer = 2; }
      }
    } else this.stuckTime = Math.max(0, this.stuckTime - dt * 2);

    // drift nas curvas longas (miniturbo ao sair)
    let drift = false;
    if (Math.abs(err) > 0.6 && Math.abs(err) < 2.2 && k.speed > k.tuning.topSpeed * 0.55 && dist > 16 && !aim.noAvoid) {
      if (!this.driftDecided) { this.driftDecided = true; this.driftTurn = this.rng() < p.drift; }
      drift = this.driftTurn || k.drifting;
    } else if (k.drifting && Math.abs(err) > 0.22 && Math.sign(steer) === k.driftDir) drift = true;
    else { this.driftDecided = false; this.driftTurn = false; }

    inp.steer = steer;
    inp.throttle = throttle;
    inp.brake = brake;
    inp.drift = drift;
    const want = this.decideItem(k, w, dt);
    inp.item = want && !k.itemHeld;
  }

  /* ---------------- escolha do alvo ---------------- */

  private goalGone(w: BattleWorld): boolean {
    const g = this.goal;
    if (g.kart >= 0 && w.battlers[g.kart]!.out) return true;
    if (g.kind === 'crystal') return !w.crystals.some((c) => Math.abs(c.x - g.x) < 0.01 && Math.abs(c.z - g.z) < 0.01);
    if (g.kind === 'crown') return w.crown.holder >= 0;
    if (g.kind === 'box') return !w.items.boxes.some((b) => b.active && Math.abs(b.x - g.x) < 0.01 && Math.abs(b.z - g.z) < 0.01);
    return false;
  }

  private set(kind: GoalKind, x: number, y: number, z: number, kart = -1): void {
    this.goal.kind = kind; this.goal.x = x; this.goal.y = y; this.goal.z = z; this.goal.kart = kart;
  }

  private rivals(k: KartState, w: BattleWorld): KartState[] {
    return w.karts.filter((o) => o !== k && !w.battlers[o.index]!.out);
  }

  private nearestThreat(k: KartState, w: BattleWorld): { kart: KartState | null; dist: number } {
    let best: KartState | null = null, bd = Infinity;
    for (const o of this.rivals(k, w)) {
      const d = Math.hypot(o.x - k.x, o.z - k.z);
      if (d < bd) { bd = d; best = o; }
    }
    return { kart: best, dist: bd };
  }

  private nearestBox(k: KartState, w: BattleWorld, max: number): ItemBox | null {
    if (k.item || k.itemRoll > 0) return null;
    let best: ItemBox | null = null, bd = max;
    for (const b of w.items.boxes) {
      if (!b.active) continue;
      const d = Math.hypot(b.x - k.x, b.z - k.z) + Math.abs(b.y - k.y) * 4;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  /** Rival para caçar: perto, valioso (mais balões/cristais/coroa) e sem proteção. Fica preso a ele por um tempo. */
  private pickPrey(k: KartState, w: BattleWorld): number {
    if (this.huntTarget >= 0 && this.huntTimer > 0 && !w.battlers[this.huntTarget]!.out) return this.huntTarget;
    let best = -1, bc = Infinity;
    for (const o of this.rivals(k, w)) {
      if (o.index === this.avoidKart && this.avoidKartTimer > 0) continue;
      const d = Math.hypot(o.x - k.x, o.z - k.z) + Math.abs(o.y - k.y) * 5;
      let c = d - w.scoreOf(o.index) * 5 + (o.invuln > 0 ? 25 : 0) + (o.shield > 0 ? 15 : 0);
      if (o.isPlayer) c -= 6 * this.profile.aggression;
      c += this.rng() * 10;
      if (c < bc) { bc = c; best = o.index; }
    }
    this.huntTarget = best;
    this.huntTimer = 2.5 + this.rng() * 2;
    return best;
  }

  private flee(k: KartState, w: BattleWorld): void {
    if (this.goal.kind === 'flee' && this.fleeTimer > 0 && Math.hypot(this.goal.x - k.x, this.goal.z - k.z) > 8) return;
    const a = w.arena;
    const cands = [...a.spawns.map((s) => s.pos), ...a.itemBoxes, ...a.crystalSpawns];
    const rivals = this.rivals(k, w);
    let best = cands[0]!, bs = -Infinity;
    for (const c of cands) {
      let near = Infinity;
      for (const o of rivals) near = Math.min(near, Math.hypot(o.x - c[0], o.z - c[2]));
      const s = Math.min(near, 70) - Math.hypot(c[0] - k.x, c[2] - k.z) * 0.35 + this.rng() * 4;
      if (s > bs) { bs = s; best = c; }
    }
    this.set('flee', best[0], best[1], best[2]);
    this.fleeTimer = 1.4;
  }

  private hunt(k: KartState, w: BattleWorld): void {
    const t = this.pickPrey(k, w);
    if (t < 0) { this.roam(k, w); return; }
    const o = w.karts[t]!;
    this.set('hunt', o.x, o.y, o.z, t);
  }

  private roam(k: KartState, w: BattleWorld): void {
    if (this.goal.kind === 'roam' && Math.hypot(this.goal.x - k.x, this.goal.z - k.z) > 10) return;
    const s = w.arena.crystalSpawns[Math.floor(this.rng() * w.arena.crystalSpawns.length)]!;
    this.set('roam', s[0], s[1], s[2]);
  }

  private choose(k: KartState, w: BattleWorld): void {
    const p = this.profile;
    const me = w.battlers[k.index]!;
    const threat = this.nearestThreat(k, w);
    const offensive = !!k.item && (OFFENSIVE.has(k.item) || !['pulso-solar', 'bolha-guardia', 'cristal-salto'].includes(k.item));
    const box = this.nearestBox(k, w, 55);

    if (w.game === 'estoura-balao') {
      const weak = me.balloons <= 1 && threat.dist < 20 && this.rng() < p.caution && k.shield <= 0;
      if (weak) return this.flee(k, w);
      if (offensive || k.boostTime > 0 || k.item === 'pulso-solar') return this.hunt(k, w);
      if (box && (this.rng() > p.aggression * 0.5 || threat.dist > 30)) return this.set('box', box.x, box.y, box.z);
      return this.hunt(k, w);
    }

    if (w.game === 'caca-cristais') {
      if (offensive) {
        // ataca quem carrega muitos cristais por perto
        let best = -1, bs = 0;
        for (const o of this.rivals(k, w)) {
          const d = Math.hypot(o.x - k.x, o.z - k.z);
          const s = w.battlers[o.index]!.crystals * 3 - d * 0.4;
          if (d < 45 && s > bs) { bs = s; best = o.index; }
        }
        if (best >= 0 && this.rng() < p.aggression) { const o = w.karts[best]!; return this.set('hunt', o.x, o.y, o.z, best); }
      }
      if (me.crystals >= 5 && threat.dist < 12 && this.rng() < p.caution * 0.7 && k.shield <= 0) return this.flee(k, w);
      let best: Crystal | null = null, bc = Infinity;
      for (const c of w.crystals) {
        if (c.lock > 0.3 || (c.owner === k.index && c.ownerLock > 0)) continue;
        const d = Math.hypot(c.x - k.x, c.z - k.z) + Math.abs(c.y - k.y) * 6;
        const ang = Math.abs(wrap(Math.atan2(c.x - k.x, c.z - k.z) - k.heading));
        let cluster = 0;
        for (const o of w.crystals) if (o !== c && Math.hypot(o.x - c.x, o.z - c.z) < 9) cluster++;
        let rivalNear = 0;
        for (const o of this.rivals(k, w)) if (Math.hypot(o.x - c.x, o.z - c.z) < Math.min(d, 14) * 0.6) rivalNear++;
        const cost = d + ang * 6 - cluster * 4 + rivalNear * 10 + this.rng() * 3;
        if (cost < bc) { bc = cost; best = c; }
      }
      if (best && (!box || bc < 30 || this.rng() < 0.7)) return this.set('crystal', best.x, best.y, best.z);
      if (box) return this.set('box', box.x, box.y, box.z);
      return this.roam(k, w);
    }

    // Rei da Coroa
    const c = w.crown;
    if (c.holder === k.index) {
      if (threat.dist < 30 || this.rng() < p.caution) return this.flee(k, w);
      if (box) return this.set('box', box.x, box.y, box.z);
      return this.flee(k, w);
    }
    if (c.active && c.holder < 0) return this.set('crown', c.x, c.y, c.z);
    if (c.holder >= 0) {
      const h = w.karts[c.holder]!;
      const d = Math.hypot(h.x - k.x, h.z - k.z);
      if (c.holder === this.avoidKart && this.avoidKartTimer > 0) return box ? this.set('box', box.x, box.y, box.z) : this.roam(k, w);
      if (!k.item && box && d > 35 && Math.hypot(box.x - k.x, box.z - k.z) < 20) return this.set('box', box.x, box.y, box.z);
      return this.set('hunt', h.x, h.y, h.z, c.holder);
    }
    if (box) return this.set('box', box.x, box.y, box.z);
    this.roam(k, w);
  }

  /* ---------------- rota, desvio e limites ---------------- */

  /** Ponto para mirar agora: o alvo ou, se ele estiver numa plataforma, a rampa que leva até ela. */
  private route(k: KartState, w: BattleWorld, dt: number): { x: number; z: number; noAvoid: boolean } {
    const g = this.goal;
    const plats = w.arena.platforms;
    let target = -1;
    if (g.y > k.y - 0.95 + 1.2) target = plats.findIndex((p) => inPlatform(p, g.x, g.z, 0.5) && g.y > p.y - 1.2);
    const onIt = target >= 0 && inPlatform(plats[target]!, k.x, k.z, 0.3) && k.y - 0.95 > plats[target]!.y - 0.7;
    if (target < 0 || onIt || plats[target]!.entries.length === 0) { this.climb.plat = -1; return { x: g.x, z: g.z, noAvoid: false }; }
    const p = plats[target]!;
    if (this.climb.plat !== target) {
      let best = 0, bd = Infinity;
      p.entries.forEach((e, i) => {
        const d = Math.hypot(e.foot[0] - k.x, e.foot[2] - k.z) + Math.hypot(e.top[0] - g.x, e.top[2] - g.z) * 0.5;
        if (d < bd) { bd = d; best = i; }
      });
      this.climb = { plat: target, entry: best, stage: 0, time: 0 };
    }
    const e = p.entries[this.climb.entry]!;
    const dx = e.top[0] - e.foot[0], dz = e.top[2] - e.foot[2];
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    this.climb.time += dt;
    if (this.climb.stage === 0) {
      // ponto alguns metros antes do pé da rampa, alinhado com ela; só sobe quando está no eixo e de frente
      const px = e.foot[0] - ux * 6, pz = e.foot[2] - uz * 6;
      const rx = k.x - e.foot[0], rz = k.z - e.foot[2];
      const along = rx * ux + rz * uz, across = Math.abs(rx * uz - rz * ux);
      const facing = Math.abs(wrap(Math.atan2(ux, uz) - k.heading)) < 0.45;
      const width = w.arena.ramps.reduce((m, r) => Math.min(m, r.width), 99);
      if (along > -9 && along < 1.5 && across < width / 2 - 0.8 && facing) { this.climb.stage = 1; this.climb.time = 0; }
      else return { x: along > -2 && across < width / 2 + 1.5 ? px - ux * 4 : px, z: along > -2 && across < width / 2 + 1.5 ? pz - uz * 4 : pz, noAvoid: false };
    }
    if (this.climb.time > 5) { this.climb.plat = -1; this.climb.stage = 0; }
    return { x: e.top[0] + ux * 3, z: e.top[2] + uz * 3, noAvoid: true };
  }

  private avoidWalls(k: KartState, w: BattleWorld, desired: number, dist: number): number {
    this.probeTimer -= 1;
    if (this.probeTimer > 0) return desired + this.avoidOffset;
    this.probeTimer = 3;
    this.front = w.probe(k.x, k.y, k.z, k.heading, 6);
    const look = Math.min(7 + Math.abs(k.speed) * 0.55, 24, dist + 2);
    if (w.probe(k.x, k.y, k.z, desired, look) >= look) { this.avoidOffset = 0; return desired; }
    let bestOff = 0, bestClear = -1;
    for (const off of OFFSETS) {
      for (const sgn of [this.avoidSide, -this.avoidSide]) {
        const c = w.probe(k.x, k.y, k.z, desired + sgn * off, look);
        if (c >= look) { this.avoidOffset = sgn * off; this.avoidSide = sgn; return desired + this.avoidOffset; }
        if (c > bestClear) { bestClear = c; bestOff = sgn * off; }
      }
    }
    this.avoidOffset = bestOff;
    this.avoidSide = Math.sign(bestOff) || 1;
    return desired + bestOff;
  }

  private avoidHazards(k: KartState, w: BattleWorld, desired: number): number {
    for (const h of w.items.hazards) {
      const dx = h.x - k.x, dz = h.z - k.z, d = Math.hypot(dx, dz);
      if (d > 28 || d < 0.1 || Math.abs(h.y - k.y) > 3) continue;
      const ang = wrap(Math.atan2(dx, dz) - desired);
      const half = Math.atan2(h.radius + 2.2, d);
      if (Math.abs(ang) < half) desired -= Math.sign(ang || 1) * (half - Math.abs(ang) + 0.1);
    }
    return desired;
  }

  private keepInside(k: KartState, w: BattleWorld, desired: number): number {
    const [cx, cz] = w.arena.center;
    const dx = k.x - cx, dz = k.z - cz, d = Math.hypot(dx, dz);
    const edge = w.arena.radius - 6;
    if (d < edge) return desired;
    const out = Math.atan2(dx, dz);
    const inward = out + Math.PI;
    if (Math.abs(wrap(desired - out)) < Math.PI / 2) {
      const t = clamp((d - edge) / 6, 0, 1);
      return desired + wrap(inward - desired) * t * 0.8;
    }
    return desired;
  }

  /* ---------------- itens ---------------- */

  private decideItem(k: KartState, w: BattleWorld, dt: number): boolean {
    if (!k.item) { this.itemTimer = 0; return false; }
    this.itemTimer += dt;
    const p = this.profile;
    if (this.itemTimer < p.itemDelay * 0.4) return false;
    const late = this.itemTimer > p.itemDelay + 8;
    const rivals = this.rivals(k, w);
    const ahead = (maxD: number, cone: number): boolean => rivals.some((o) => {
      const d = Math.hypot(o.x - k.x, o.z - k.z);
      return d < maxD && o.invuln <= 0 && Math.abs(wrap(Math.atan2(o.x - k.x, o.z - k.z) - k.heading)) < cone && Math.abs(o.y - k.y) < 3;
    });
    const behind = (maxD: number): boolean => rivals.some((o) => {
      const d = Math.hypot(o.x - k.x, o.z - k.z);
      return d < maxD && Math.abs(wrap(Math.atan2(o.x - k.x, o.z - k.z) - k.heading)) > 2.2;
    });
    const near = (maxD: number): number => rivals.filter((o) => o.invuln <= 0 && o.shield <= 0 && Math.hypot(o.x - k.x, o.z - k.z) < maxD && Math.abs(o.y - k.y) < 4).length;
    const incoming = w.items.projectiles.some((q) => q.target === k.index && Math.hypot(q.x - k.x, q.z - k.z) < 26);
    const precious = (w.game === 'rei-da-coroa' && w.crown.holder === k.index) || (w.game === 'caca-cristais' && w.battlers[k.index]!.crystals >= 4)
      || (w.game === 'estoura-balao' && w.battlers[k.index]!.balloons <= 1);
    switch (k.item) {
      case 'pulso-solar':
        if (this.goal.kind === 'hunt') return ahead(24, 0.3) || late;
        if (this.goal.kind === 'flee') return behind(16) || late;
        return Math.abs(wrap(Math.atan2(this.goal.x - k.x, this.goal.z - k.z) - k.heading)) < 0.25 && Math.hypot(this.goal.x - k.x, this.goal.z - k.z) > 25 || late;
      case 'bolha-guardia':
        return k.shield <= 0 && (incoming || near(10) > 0 || (precious && near(20) > 0) || this.itemTimer > p.itemDelay + 12);
      case 'nevoa-prisma':
        return behind(15) || late;
      case 'faisca-rastreadora':
        return ahead(55, 0.8) || this.itemTimer > p.itemDelay + 14;
      case 'onda-vento':
        return near(WIND_RADIUS - 2) > 0 || (incoming && w.items.projectiles.some((q) => q.target === k.index && Math.hypot(q.x - k.x, q.z - k.z) < 12));
      case 'cristal-salto':
        return (incoming && w.items.projectiles.some((q) => q.target === k.index && Math.hypot(q.x - k.x, q.z - k.z) < 9)) || this.reverseTime > 0 || late;
      default:
        // itens novos (API genérica): usa quando há um rival por perto à frente ou depois de segurar um tempo
        return ahead(22, 0.9) || near(8) > 0 || this.itemTimer > p.itemDelay + 5;
    }
  }
}
