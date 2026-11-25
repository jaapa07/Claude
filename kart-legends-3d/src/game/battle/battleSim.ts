import type RAPIER from '@dimforge/rapier3d-compat';
import { BATTLE_GAME_BY_ID, BATTLE_RULES, type ArenaId, type BattleGameId } from '@/data/battle';
import { CHARACTER_BY_ID } from '@/data/characters';
import type { CharacterId, Difficulty, KartId } from '@/data/ids';
import { RACERS_PER_RACE } from '@/data/tracks';
import { BattleAi, type BattleWorld } from '@/game/ai/battleAi';
import { createRng, type Rng } from '@/game/core/rng';
import { NEUTRAL_INPUT, playerSlotOf, type HudAlert, type InputState, type RacePhase, type RacerSetup } from '@/game/core/types';
import { ItemSystem, WIND_RADIUS, type Projectile } from '@/game/items/itemSystem';
import { GROUP_KART, GROUP_OBSTACLE, GROUP_STATIC, RAY_GROUPS, groups, type Rapier } from '@/game/physics/trackColliders';
import type { SimEvent } from '@/game/racing/events';
import { TrackRuntime } from '@/game/tracks/trackRuntime';
import type { TrackData } from '@/game/tracks/trackTypes';
import { applyBoost, placeKart, spinOut, stepKart, syncKart, type PhysicsContext } from '@/game/vehicles/kartPhysics';
import { createKartState, type KartState } from '@/game/vehicles/kartState';
import { PHYS, tuningFor, type KartTuning } from '@/game/vehicles/kartTuning';
import { createArenaColliders } from './arenaColliders';
import { type ArenaData, type V3 } from './arenaTypes';

const COUNTDOWN = 3;
/** Batida forte: velocidade de aproximação mínima (m/s) e vantagem de quem bate sobre quem apanha. */
const RAM_CLOSING = 12;
const RAM_ADVANTAGE = 6;
const RAM_BOOST_CLOSING = 7;
const CRYSTAL_RADIUS = 2.4;
const CROWN_RADIUS = 2.6;
const MAX_FIELD_CRYSTALS = 60;
const PROJECTILE_SPEED = 40;

export interface BattleConfig {
  arenaId: ArenaId;
  game: BattleGameId;
  difficulty: Difficulty;
  /** Até 8 participantes (RACERS_PER_RACE). */
  racers: RacerSetup[];
  seed: number;
}

/** Eventos próprios da batalha, somados aos eventos de corrida (física e itens). */
export type BattleEvent =
  | SimEvent
  | { type: 'balloon_pop'; kart: number; by: number; left: number; x: number; y: number; z: number }
  | { type: 'balloon_steal'; kart: number; from: number }
  | { type: 'eliminated'; kart: number; by: number; x: number; y: number; z: number }
  | { type: 'crystal_pickup'; kart: number; total: number; x: number; y: number; z: number }
  | { type: 'crystal_drop'; kart: number; count: number; x: number; y: number; z: number }
  | { type: 'crown_take'; kart: number; from: number }
  | { type: 'crown_drop'; x: number; y: number; z: number }
  | { type: 'frenzy' }
  | { type: 'match_end' };

/** Placar de um participante. */
export interface Battler {
  balloons: number;
  crystals: number;
  /** Rei da Coroa: segundos com a coroa (pontos = parte inteira). */
  crownTime: number;
  out: boolean;
  /** Tempo de partida (s) em que foi eliminado. */
  outAt: number;
  hitsLanded: number;
  hitsTaken: number;
  /** Balões estourados de outros (Estoura-Balão). */
  pops: number;
}

export interface Crystal {
  id: number;
  x: number; y: number; z: number;
  /** Origem do voo (cristal derrubado), duração restante e total do voo. */
  fx: number; fy: number; fz: number; fly: number; flyTotal: number;
  /** Ninguém pega antes de `lock`; quem derrubou espera `ownerLock`. */
  lock: number; owner: number; ownerLock: number;
}

export interface CrownState {
  holder: number;
  x: number; y: number; z: number;
  /** Ninguém pega antes de `lock` (s); `lockFor` espera `lockForTime`. */
  lock: number; lockFor: number; lockForTime: number;
  active: boolean;
}

export interface BattleStanding {
  racerIndex: number;
  characterId: CharacterId;
  kartId: KartId;
  isPlayer: boolean;
  /** Vaga do jogador humano (0/1); ausente = IA. */
  slot?: number;
  position: number;
  score: number;
  eliminated: boolean;
  hitsLanded: number;
  hitsTaken: number;
}

export interface BattleResult {
  game: BattleGameId;
  arenaId: ArenaId;
  difficulty: Difficulty;
  standings: BattleStanding[];
  playerPosition: number;
  /** Duração real da partida (ms). */
  durationMs: number;
  stats: { itemsUsed: number; hitsLanded: number; hitsTaken: number; turbos: [number, number, number] };
  /** Um item por jogador humano (ordem das vagas); os campos acima são os do Jogador 1. */
  players?: PlayerBattleOutcome[];
}

export interface PlayerBattleOutcome {
  slot: number;
  racerIndex: number;
  characterId: CharacterId;
  position: number;
  stats: { itemsUsed: number; hitsLanded: number; hitsTaken: number; turbos: [number, number, number] };
}

export interface BattleHudRow {
  index: number; characterId: CharacterId; isPlayer: boolean; score: number; out: boolean; crown: boolean; position: number;
  /** Vaga do humano (0/1) ou -1; `me` = a linha de quem lê este HUD. */
  slot?: number; me?: boolean;
}

/** Estado publicado para o HUD da batalha (aprox. 15 vezes por segundo). */
export interface BattleHudSnapshot {
  game: BattleGameId;
  phase: RacePhase;
  countdown: number;
  timeLeftMs: number;
  frenzy: boolean;
  position: number;
  total: number;
  score: number;
  balloons: number;
  crystals: number;
  crownPoints: number;
  holdingCrown: boolean;
  out: boolean;
  /** Personagem acompanhado pela câmera quando o jogador está fora. */
  spectating: CharacterId | null;
  /** Vaga do jogador deste HUD e quantos humanos há na partida. */
  slot?: number;
  humans?: number;
  /** Todos os humanos já estão fora (só então dá para acelerar a partida). */
  allHumansOut?: boolean;
  board: BattleHudRow[];
  alerts: HudAlert[];
  dots: { x: number; z: number; characterId: CharacterId; isPlayer: boolean; out: boolean; crown: boolean; me?: boolean }[];
  crystalDots: number[];
  crown: { x: number; z: number; free: boolean } | null;
}

/** Pista mínima (anel no centro) só para o sistema de itens, que espera um traçado. */
function stubTrack(arena: ArenaData): TrackData {
  const n = 32, r = 8;
  const [cx, cz] = arena.center;
  const main = { pos: [] as number[], side: [] as number[], up: [] as number[], halfWidth: [] as number[], surface: [] as number[], gap: [] as number[] };
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    main.pos.push(cx + Math.cos(a) * r, 0, cz - Math.sin(a) * r);
    main.side.push(-Math.cos(a), 0, Math.sin(a));
    main.up.push(0, 1, 0);
    main.halfWidth.push(4); main.surface.push(0); main.gap.push(0);
  }
  return {
    id: 'porto-lanternas', length: n * 2, spacing: 2, count: n, main, offroad: 0, wall: new Array<number>(n).fill(0), wallHeight: 1,
    killY: arena.killY, checkpoints: [0], grid: [], racingLine: new Array<number>(n).fill(0), speedHint: new Array<number>(n).fill(1),
    shortcuts: [], itemRows: [], boostPads: [], ramps: [], obstacles: [], terrain: null, propColliders: [], animatedProps: [], waterY: null,
    introCamera: [], minimap: { points: [], minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
  };
}

const angleTo = (fromX: number, fromZ: number, toX: number, toZ: number): number => Math.atan2(toX - fromX, toZ - fromZ);
const wrapAngle = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export interface BattleSimOptions {
  /** Comandos de um jogador humano (`slot` 0 = Jogador 1, 1 = Jogador 2). */
  playerInput?: (slot: number) => InputState;
}

type TimedAlert = HudAlert & { ttl: number };

/**
 * Simulação determinística de uma partida de batalha (passo fixo de 1/60 s, independente da renderização).
 * Reaproveita a física do kart, os colisores do Rapier e o sistema de itens das corridas.
 */
export class BattleSim implements BattleWorld {
  readonly track: TrackRuntime;
  readonly karts: KartState[] = [];
  readonly battlers: Battler[] = [];
  readonly items: ItemSystem;
  readonly events: BattleEvent[] = [];
  /** Jogador 1 (ou null numa partida só de IA). */
  readonly player: KartState | null;
  /** Jogadores humanos na ordem das vagas. */
  readonly players: KartState[];
  readonly crystals: Crystal[] = [];
  readonly crown: CrownState = { holder: -1, x: 0, y: 0, z: 0, lock: 0, lockFor: -1, lockForTime: 0, active: false };
  readonly game: BattleGameId;
  readonly duration: number;
  phase: RacePhase = 'intro';
  /** Tempo total de simulação e tempo de partida desde o "VAI!" (s). */
  time = 0;
  matchTime = 0;
  countdown = COUNTDOWN;
  frenzy = false;
  private lastCount = COUNTDOWN + 1;
  private readonly drivers: BattleAi[] = [];
  private readonly ctx: PhysicsContext;
  private readonly rng: Rng;
  /** Alertas por jogador (sempre ao menos uma lista). */
  private readonly alerts: TimedAlert[][] = [[]];
  private alertId = 1;
  private crystalId = 1;
  private spawnTimer = 0;
  private readonly resetCooldown: number[] = [];
  private readonly ray: RAPIER.Ray;
  private readonly baseTuning: KartTuning[] = [];
  private readonly preVel: { vx: number; vz: number; boost: number }[] = [];
  private readonly ramCooldown = new Map<number, number>();
  private readonly watch: { x: number; z: number; time: number }[] = [];
  /** Direção atual de cada projétil (arena: voo livre com perseguição). */
  private readonly projDir = new Map<number, { dx: number; dz: number }>();
  private warned30 = false;
  private ended = false;

  constructor(
    readonly R: Rapier,
    readonly world: RAPIER.World,
    readonly arena: ArenaData,
    readonly config: BattleConfig,
    private readonly opts: BattleSimOptions = {},
  ) {
    this.rng = createRng(config.seed);
    this.game = config.game;
    this.duration = BATTLE_GAME_BY_ID[config.game].duration;
    this.track = new TrackRuntime(stubTrack(arena));
    world.gravity = { x: 0, y: 0, z: 0 };
    world.timestep = PHYS.dt;
    createArenaColliders(R, world, arena);
    const emit = (e: SimEvent): void => { this.events.push(e); };
    this.ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    this.ctx = { R, world, ray: new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), emit, controlsEnabled: false };
    this.items = new ItemSystem(this.track, this.rng, emit, true);
    for (const b of arena.itemBoxes) this.items.boxes.push({ x: b[0], y: b[1] + 1.1, z: b[2], active: true, respawn: 0 });
    this.items.projectileMotion = (p, karts, dt) => this.moveProjectile(p, karts, dt);

    const racers = config.racers.slice(0, RACERS_PER_RACE);
    racers.forEach((r, i) => {
      const slot = arena.spawns[i % arena.spawns.length]!;
      const tuning = tuningFor(r.kartId);
      const body = world.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(slot.pos[0], slot.pos[1] + PHYS.rideHeight, slot.pos[2])
          .lockRotations().setGravityScale(0).setLinearDamping(0).setCcdEnabled(true).setCanSleep(false),
      );
      const collider = world.createCollider(
        R.ColliderDesc.ball(PHYS.ballRadius).setFriction(0).setRestitution(0.25).setMass(tuning.mass * 100)
          .setCollisionGroups(groups(GROUP_KART, GROUP_STATIC | GROUP_KART | GROUP_OBSTACLE)),
        body,
      );
      const k = createKartState({ index: i, characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer, slot: playerSlotOf(r), ai: !r.isPlayer, tuning, body, collider });
      placeKart(k, slot.pos[0], slot.pos[1] + PHYS.rideHeight, slot.pos[2], slot.heading);
      k.position = i + 1;
      this.karts.push(k);
      this.baseTuning.push(tuning);
      this.preVel.push({ vx: 0, vz: 0, boost: 0 });
      this.watch.push({ x: k.x, z: k.z, time: 0 });
      this.resetCooldown.push(0);
      this.battlers.push({ balloons: config.game === 'estoura-balao' ? BATTLE_RULES.balloons.start : 0, crystals: 0, crownTime: 0, out: false, outAt: 0, hitsLanded: 0, hitsTaken: 0, pops: 0 });
      this.drivers.push(new BattleAi(r.isPlayer ? 'normal' : config.difficulty, createRng(config.seed + 31 * (i + 1))));
    });
    this.players = this.karts.filter((k) => k.isPlayer).sort((a, b) => a.slot - b.slot || a.index - b.index);
    this.players.forEach((k, slot) => { k.slot = slot; });
    this.player = this.players[0] ?? null;
    for (let i = 1; i < this.players.length; i++) this.alerts.push([]);
    if (config.game === 'caca-cristais') for (let i = 0; i < 8; i++) this.spawnCrystal();
    this.rank();
  }

  /* ---------------- consultas usadas pela IA ---------------- */

  /** Distância livre (m) de um raio horizontal a partir do centro do kart, ignorando rampas e encostas. */
  probe(x: number, y: number, z: number, angle: number, len: number): number {
    const r = this.ray;
    r.origin.x = x; r.origin.y = y; r.origin.z = z;
    r.dir.x = Math.sin(angle); r.dir.y = 0; r.dir.z = Math.cos(angle);
    const hit = this.world.castRayAndGetNormal(r, len, true, undefined, RAY_GROUPS);
    if (!hit) return Infinity;
    if (hit.normal.y > 0.5) return Infinity;
    const t = hit.timeOfImpact;
    const hx = x + r.dir.x * t, hz = z + r.dir.z * t;
    // rampa vista de frente (subindo por ela) não é obstáculo; a lateral e o fundo da rampa são
    for (const rp of this.arena.ramps) {
      const s = Math.sin(rp.heading), c = Math.cos(rp.heading);
      const dx = hx - rp.pos[0], dz = hz - rp.pos[2];
      if (Math.abs(dx * s + dz * c) < rp.length / 2 + 0.5 && Math.abs(dx * c - dz * s) < rp.width / 2 - 0.4 && r.dir.x * s + r.dir.z * c > 0.75) return Infinity;
    }
    return t;
  }

  /** Altura do apoio (chão ou plataforma) abaixo de um ponto, ou null sobre o vazio. */
  supportY(x: number, y: number, z: number): number | null {
    const r = this.ray;
    r.origin.x = x; r.origin.y = y; r.origin.z = z;
    r.dir.x = 0; r.dir.y = -1; r.dir.z = 0;
    const hit = this.world.castRay(r, 60, true, undefined, RAY_GROUPS);
    return hit ? y - hit.timeOfImpact : null;
  }

  isOut(i: number): boolean { return this.battlers[i]!.out; }

  scoreOf(i: number): number {
    const b = this.battlers[i]!;
    return this.game === 'estoura-balao' ? b.balloons : this.game === 'caca-cristais' ? b.crystals : Math.floor(b.crownTime);
  }

  get timeLeft(): number { return Math.max(0, this.duration - this.matchTime); }

  /* ---------------- ciclo ---------------- */

  startCountdown(): void {
    if (this.phase === 'intro') { this.phase = 'countdown'; this.countdown = COUNTDOWN; this.lastCount = COUNTDOWN + 1; }
  }

  step(): void {
    const dt = PHYS.dt;
    this.time += dt;
    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this.lastCount && c > 0) { this.lastCount = c; this.events.push({ type: 'countdown', value: c }); }
      if (this.countdown <= 0) {
        this.phase = 'racing';
        this.events.push({ type: 'go' });
        if (this.game === 'rei-da-coroa') this.placeCrown(null);
        this.alert(BATTLE_GAME_BY_ID[this.game].name.toUpperCase(), 'info', 2.6);
      }
    }
    const playing = this.phase === 'racing';
    if (playing) this.matchTime += dt;
    // depois do apito os karts ainda deslizam até parar (controles ligados, comandos neutros)
    this.ctx.controlsEnabled = playing || this.phase === 'finished';
    for (let i = 0; i < this.resetCooldown.length; i++) this.resetCooldown[i] = Math.max(0, this.resetCooldown[i]! - dt);

    for (const k of this.karts) {
      if (this.battlers[k.index]!.out) continue;
      if (!playing) { Object.assign(k.input, NEUTRAL_INPUT); if (this.phase === 'finished') k.input.brake = 1; }
      else if (k.ai) this.drivers[k.index]!.update(k, this, dt);
      else if (k.isPlayer && this.opts.playerInput) Object.assign(k.input, this.opts.playerInput(k.slot));
      stepKart(k, this.ctx, dt);
      const pv = this.preVel[k.index]!;
      pv.vx = k.vx; pv.vz = k.vz; pv.boost = k.boostTime;
    }

    this.world.step();

    for (const k of this.karts) {
      if (this.battlers[k.index]!.out) continue;
      syncKart(k, this.ctx.emit);
      if (playing) {
        this.checkBoostPads(k);
        this.checkBounds(k, dt);
      }
    }

    if (playing) {
      this.stepItems(dt);
      this.checkRams();
      if (this.game === 'caca-cristais') this.stepCrystals(dt);
      if (this.game === 'rei-da-coroa') this.stepCrown(dt);
      this.checkEnd();
    }
    this.rank();

    for (const list of this.alerts) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i]!.ttl -= dt;
        if (list[i]!.ttl <= 0) list.splice(i, 1);
      }
    }
  }

  /* ---------------- itens e golpes ---------------- */

  private stepItems(dt: number): void {
    // retrato dos objetos de ataque antes do passo (para saber quem acertou quem)
    const projs = this.items.projectiles.map((p) => ({ owner: p.owner, x: p.x, z: p.z }));
    const hazards = this.items.hazards.map((h) => ({ owner: h.owner, x: h.x, z: h.z, r: h.radius }));
    const start = this.events.length;
    this.items.step(this.karts, dt);
    // usado neste mesmo passo (o golpe pode acontecer no passo em que o item sai): candidatos a autor
    const used: { kart: number; x: number; z: number }[] = [];
    for (let i = start; i < this.events.length; i++) { const e = this.events[i]!; if (e.type === 'item_use') used.push({ kart: e.kart, x: e.x, z: e.z }); }
    if (this.projDir.size > this.items.projectiles.length) {
      for (const id of [...this.projDir.keys()]) if (!this.items.projectiles.some((p) => p.id === id)) this.projDir.delete(id);
    }
    const waves = this.items.waves.filter((w) => w.age <= dt + 1e-6);
    for (let i = start; i < this.events.length; i++) {
      const e = this.events[i]!;
      if (e.type === 'hit') {
        const k = this.karts[e.kart]!;
        let by = -1, best = 7;
        for (const p of projs) { const d = Math.hypot(p.x - k.x, p.z - k.z); if (d < best) { best = d; by = p.owner; } }
        for (const h of hazards) { const d = Math.hypot(h.x - k.x, h.z - k.z) - h.r; if (d < best) { best = d; by = h.owner; } }
        if (by < 0) for (const u of used) { const d = Math.hypot(u.x - k.x, u.z - k.z) - 10; if (u.kart !== e.kart && d < best) { best = d; by = u.kart; } }
        this.damage(e.kart, by === e.kart ? -1 : by);
      } else if (e.type === 'pushed') {
        const k = this.karts[e.kart]!;
        const w = waves.find((q) => Math.hypot(q.x - k.x, q.z - k.z) <= WIND_RADIUS + 1);
        k.invuln = Math.max(k.invuln, 1.5);
        this.damage(e.kart, w ? w.owner : -1);
      } else if (e.type === 'item_pickup' && this.game === 'caca-cristais' && this.rng() < BATTLE_RULES.crystals.boxChance) {
        const k = this.karts[e.kart]!;
        this.addCrystals(e.kart, 1, k.x, k.y, k.z);
      }
    }
  }

  /** Faíscas na arena: voo livre que persegue o rival mais à frente da mira; morre ao bater no cenário. */
  private moveProjectile(p: Projectile, karts: KartState[], dt: number): void {
    let dir = this.projDir.get(p.id);
    const owner = karts[p.owner]!;
    if (!dir) {
      dir = { dx: Math.sin(owner.heading), dz: Math.cos(owner.heading) };
      this.projDir.set(p.id, dir);
      p.x = owner.x + dir.dx * 2.4; p.z = owner.z + dir.dz * 2.4; p.y = owner.y + 0.2;
      p.px = p.x; p.py = p.y; p.pz = p.z;
    }
    const valid = (t: number): boolean => t >= 0 && t !== p.owner && !this.battlers[t]!.out;
    if (!valid(p.target)) {
      let best = -1, bestScore = Infinity;
      for (const o of karts) {
        if (!valid(o.index)) continue;
        const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
        const off = Math.abs(wrapAngle(Math.atan2(dx, dz) - Math.atan2(dir.dx, dir.dz)));
        if (off > 1.35 || d > 90) continue;
        const s = d * (1 + off * 1.5);
        if (s < bestScore) { bestScore = s; best = o.index; }
      }
      p.target = best;
    }
    const tgt = p.target >= 0 ? karts[p.target] : undefined;
    let heading = Math.atan2(dir.dx, dir.dz);
    if (tgt) {
      const want = angleTo(p.x, p.z, tgt.x, tgt.z);
      const turn = 3.2 * dt;
      heading += Math.max(-turn, Math.min(turn, wrapAngle(want - heading)));
    }
    dir.dx = Math.sin(heading); dir.dz = Math.cos(heading);
    const step = PROJECTILE_SPEED * dt;
    const free = this.probe(p.x, p.y, p.z, heading, step + 0.4);
    if (free < step + 0.4) { p.life = 0; this.projDir.delete(p.id); return; }
    p.x += dir.dx * step; p.z += dir.dz * step;
    const sup = this.supportY(p.x, p.y + 2.5, p.z);
    const wantY = (sup ?? p.y - 1) + 1;
    p.y += (wantY - p.y) * Math.min(1, dt * 10);
  }

  /** Batidas fortes entre karts: quem chega mais rápido (ou com turbo) acerta quem apanha. */
  private checkRams(): void {
    for (const [key, t] of this.ramCooldown) {
      if (t <= PHYS.dt) this.ramCooldown.delete(key); else this.ramCooldown.set(key, t - PHYS.dt);
    }
    const n = this.karts.length;
    const reach = PHYS.ballRadius * 2 + 0.45;
    for (let i = 0; i < n; i++) {
      const a = this.karts[i]!;
      if (this.battlers[i]!.out) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.karts[j]!;
        if (this.battlers[j]!.out) continue;
        const dx = b.x - a.x, dz = b.z - a.z, dy = b.y - a.y;
        if (Math.abs(dy) > 1.5) continue;
        const d = Math.hypot(dx, dz);
        if (d > reach || d < 1e-3) continue;
        const key = i * 16 + j;
        if (this.ramCooldown.has(key)) continue;
        const nx = dx / d, nz = dz / d;
        const va = this.preVel[i]!, vb = this.preVel[j]!;
        const aToward = va.vx * nx + va.vz * nz;
        const bToward = -(vb.vx * nx + vb.vz * nz);
        const closing = aToward + bToward;
        let attacker = -1;
        if (closing > RAM_CLOSING && aToward - bToward > RAM_ADVANTAGE) attacker = i;
        else if (closing > RAM_CLOSING && bToward - aToward > RAM_ADVANTAGE) attacker = j;
        else if (closing > RAM_BOOST_CLOSING && va.boost > 0 && vb.boost <= 0 && aToward > 10) attacker = i;
        else if (closing > RAM_BOOST_CLOSING && vb.boost > 0 && va.boost <= 0 && bToward > 10) attacker = j;
        if (attacker < 0) continue;
        this.ramCooldown.set(key, 1);
        const victim = attacker === i ? j : i;
        const v = this.karts[victim]!;
        if (spinOut(v, this.ctx.emit, 'obstaculo')) this.damage(victim, attacker);
      }
    }
  }

  /** Aplica um golpe sofrido segundo o minijogo. `by` = quem acertou (-1 = ninguém/queda). */
  damage(victim: number, by: number): void {
    const b = this.battlers[victim]!;
    if (b.out || this.phase !== 'racing') return;
    const v = this.karts[victim]!;
    const att = by >= 0 && !this.battlers[by]!.out ? by : -1;
    b.hitsTaken++;
    if (att >= 0) this.battlers[att]!.hitsLanded++;
    const vName = this.nameOf(victim), aName = att >= 0 ? this.nameOf(att) : '';
    // Vaga do humano envolvido (-1 = IA): cada jogador recebe o alerta do próprio ponto de vista.
    const attSlot = att >= 0 ? this.slotOf(att) : -1, vicSlot = this.slotOf(victim);
    if (this.game === 'estoura-balao') {
      b.balloons = Math.max(0, b.balloons - 1);
      v.invuln = Math.max(v.invuln, 3);
      this.events.push({ type: 'balloon_pop', kart: victim, by: att, left: b.balloons, x: v.x, y: v.y, z: v.z });
      if (att >= 0) {
        const a = this.battlers[att]!;
        a.pops++;
        if (a.balloons < BATTLE_RULES.balloons.max) { a.balloons++; this.events.push({ type: 'balloon_steal', kart: att, from: victim }); }
      }
      if (attSlot >= 0) this.alert(`Você estourou o balão de ${vName}!`, 'good', 2.4, attSlot);
      if (vicSlot >= 0) this.alert(att >= 0 ? `${aName} estourou seu balão!` : 'Você perdeu um balão!', 'warn', 2.4, vicSlot);
      if (b.balloons <= 0) this.eliminate(victim, att);
    } else if (this.game === 'caca-cristais') {
      const lose = b.crystals > 0 ? Math.ceil(b.crystals * BATTLE_RULES.crystals.dropFraction) : 0;
      if (lose > 0) {
        b.crystals -= lose;
        this.scatterCrystals(victim, lose, v.x, v.y, v.z);
        if (vicSlot >= 0) this.alert(`Você perdeu ${lose} cristal${lose > 1 ? 'is' : ''}!`, 'warn', 2.4, vicSlot);
        if (attSlot >= 0) this.alert(`${vName} derrubou ${lose} cristal${lose > 1 ? 'is' : ''}!`, 'good', 2.4, attSlot);
      }
    } else if (this.game === 'rei-da-coroa' && this.crown.holder === victim) {
      if (att >= 0) {
        this.setHolder(att, victim);
        if (attSlot >= 0) this.alert(`Você roubou a coroa de ${vName}!`, 'good', 2.4, attSlot);
        if (vicSlot >= 0) this.alert(`${aName} roubou sua coroa!`, 'warn', 2.4, vicSlot);
        this.alertOthers([attSlot, vicSlot], `${aName} roubou a coroa!`, 'info', 1.8);
      } else {
        this.dropCrown(v.x, v.y, v.z, victim);
        if (vicSlot >= 0) this.alert('Você perdeu a coroa!', 'warn', 2.4, vicSlot);
      }
    }
  }

  private eliminate(i: number, by: number): void {
    const b = this.battlers[i]!;
    const k = this.karts[i]!;
    b.out = true;
    b.outAt = this.matchTime;
    k.finished = true;
    k.item = null; k.itemRoll = 0;
    this.events.push({ type: 'eliminated', kart: i, by, x: k.x, y: k.y, z: k.z });
    if (k.isPlayer) this.alert('Você está fora!', 'warn', 3.5, k.slot);
    this.alertOthers([k.isPlayer ? k.slot : -1], `${this.nameOf(i)} está fora!`, 'info', 2);
    // tira o kart do mundo físico (continua no placar)
    k.body.setTranslation({ x: k.x, y: -500, z: k.z }, true);
    k.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    k.body.setEnabled(false);
    k.px = k.x; k.pz = k.z; k.py = k.y;
    k.y = -500;
  }

  /* ---------------- cristais ---------------- */

  private spawnCrystal(): void {
    const spots = this.arena.crystalSpawns;
    // tenta um ponto livre (sem cristal a menos de 4 m)
    for (let tries = 0; tries < 6; tries++) {
      const s = spots[Math.floor(this.rng() * spots.length)]!;
      const jx = (this.rng() - 0.5) * 3, jz = (this.rng() - 0.5) * 3;
      const x = s[0] + jx, z = s[2] + jz;
      if (this.crystals.some((c) => Math.hypot(c.x - x, c.z - z) < 4)) continue;
      this.crystals.push({ id: this.crystalId++, x, y: s[1] + 0.9, z, fx: x, fy: s[1] + 0.9, fz: z, fly: 0, flyTotal: 0, lock: 0, owner: -1, ownerLock: 0 });
      return;
    }
  }

  private addCrystals(i: number, n: number, x: number, y: number, z: number): void {
    const b = this.battlers[i]!;
    b.crystals += n;
    this.events.push({ type: 'crystal_pickup', kart: i, total: b.crystals, x, y, z });
  }

  private scatterCrystals(owner: number, count: number, x: number, y: number, z: number): void {
    this.events.push({ type: 'crystal_drop', kart: owner, count, x, y, z });
    for (let n = 0; n < count; n++) {
      if (this.crystals.length >= MAX_FIELD_CRYSTALS) break;
      const a = this.rng() * Math.PI * 2, r = 3 + this.rng() * 4.5;
      let tx = x + Math.sin(a) * r, tz = z + Math.cos(a) * r;
      const [cx, cz] = this.arena.center;
      const dc = Math.hypot(tx - cx, tz - cz), lim = this.arena.radius - 3;
      if (dc > lim) { tx = cx + ((tx - cx) / dc) * lim; tz = cz + ((tz - cz) / dc) * lim; }
      const sup = this.supportY(tx, y + 4, tz);
      if (sup === null) { this.spawnCrystal(); continue; }
      this.crystals.push({ id: this.crystalId++, x: tx, y: sup + 0.9, z: tz, fx: x, fy: y, fz: z, fly: 0.6, flyTotal: 0.6, lock: 0.6, owner, ownerLock: 1.4 });
    }
  }

  private stepCrystals(dt: number): void {
    const R = BATTLE_RULES.crystals;
    const frenzy = this.timeLeft <= R.frenzy;
    if (frenzy && !this.frenzy) { this.frenzy = true; this.events.push({ type: 'frenzy' }); this.alert('FRENESI DE CRISTAIS!', 'good', 3); }
    this.spawnTimer -= dt;
    const free = this.crystals.filter((c) => c.owner < 0).length;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = frenzy ? R.frenzySpawnEvery : R.spawnEvery;
      if (free < (frenzy ? R.frenzyCap : R.cap)) this.spawnCrystal();
    }
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i]!;
      c.fly = Math.max(0, c.fly - dt); c.lock = Math.max(0, c.lock - dt); c.ownerLock = Math.max(0, c.ownerLock - dt);
      if (c.lock > 0) continue;
      for (const k of this.karts) {
        if (this.battlers[k.index]!.out || (k.index === c.owner && c.ownerLock > 0)) continue;
        const dx = k.x - c.x, dz = k.z - c.z;
        if (dx * dx + dz * dz > CRYSTAL_RADIUS * CRYSTAL_RADIUS || Math.abs(k.y - c.y) > 2.6) continue;
        this.crystals.splice(i, 1);
        this.addCrystals(k.index, 1, c.x, c.y, c.z);
        break;
      }
    }
  }

  /* ---------------- coroa ---------------- */

  private placeCrown(near: V3 | null): void {
    const spots = this.arena.crownSpawns;
    let s = spots[0]!;
    if (near) {
      // o ponto de coroa mais longe de onde ela se perdeu (sem vantagem para quem estava perto)
      let best = -1;
      for (const p of spots) { const d = Math.hypot(p[0] - near[0], p[2] - near[2]); if (d > best) { best = d; s = p; } }
    }
    Object.assign(this.crown, { holder: -1, x: s[0], y: s[1] + 1.2, z: s[2], lock: near ? 1.2 : 0, lockFor: -1, lockForTime: 0, active: true });
  }

  private dropCrown(x: number, y: number, z: number, from: number): void {
    this.releaseHolder();
    const sup = this.supportY(x, y + 3, z);
    if (sup === null) { this.placeCrown([x, y, z]); return; }
    Object.assign(this.crown, { holder: -1, x, y: sup + 1.2, z, lock: 0.8, lockFor: from, lockForTime: 1.8, active: true });
    this.events.push({ type: 'crown_drop', x, y: sup, z });
  }

  private releaseHolder(): void {
    const h = this.crown.holder;
    if (h >= 0) this.karts[h]!.tuning = this.baseTuning[h]!;
    this.crown.holder = -1;
  }

  private setHolder(i: number, from: number): void {
    this.releaseHolder();
    this.crown.holder = i;
    const k = this.karts[i]!;
    // com a coroa o kart fica um pouco mais lento (mesma física, velocidade máxima reduzida)
    k.tuning = { ...this.baseTuning[i]!, topSpeed: this.baseTuning[i]!.topSpeed * BATTLE_RULES.crown.holderSpeed };
    k.invuln = Math.max(k.invuln, 1.5);
    this.events.push({ type: 'crown_take', kart: i, from });
  }

  private stepCrown(dt: number): void {
    const c = this.crown;
    if (!c.active) return;
    if (c.holder >= 0) {
      const k = this.karts[c.holder]!;
      this.battlers[c.holder]!.crownTime += dt;
      c.x = k.x; c.y = k.y + 1.6; c.z = k.z;
      return;
    }
    c.lock = Math.max(0, c.lock - dt);
    c.lockForTime = Math.max(0, c.lockForTime - dt);
    if (c.lock > 0) return;
    let best = -1, bd = CROWN_RADIUS;
    for (const k of this.karts) {
      if (this.battlers[k.index]!.out || (k.index === c.lockFor && c.lockForTime > 0)) continue;
      const d = Math.hypot(k.x - c.x, k.z - c.z);
      if (d < bd && Math.abs(k.y - c.y) < 3) { bd = d; best = k.index; }
    }
    if (best >= 0) {
      this.setHolder(best, -1);
      const slot = this.slotOf(best);
      if (slot >= 0) this.alert('Você pegou a coroa!', 'good', 2.4, slot);
      this.alertOthers([slot], `${this.nameOf(best)} pegou a coroa!`, 'info', 1.8);
    }
  }

  /* ---------------- arena ---------------- */

  private checkBoostPads(k: KartState): void {
    if (!k.grounded || k.padCooldown > 0) return;
    for (const pad of this.arena.boostPads) {
      const dx = k.x - pad.pos[0], dz = k.z - pad.pos[2];
      if (Math.abs(k.y - PHYS.rideHeight - pad.pos[1]) > 1.6) continue;
      const sin = Math.sin(pad.heading), cos = Math.cos(pad.heading);
      const along = dx * sin + dz * cos, across = dx * cos - dz * sin;
      if (Math.abs(along) < 3.4 && Math.abs(across) < 2.6) {
        applyBoost(k, 1.15, 4);
        k.padCooldown = 1;
        this.events.push({ type: 'boost_pad', kart: k.index });
        return;
      }
    }
  }

  private checkBounds(k: KartState, dt: number): void {
    const [cx, cz] = this.arena.center;
    const far = Math.hypot(k.x - cx, k.z - cz) > this.arena.radius + 25;
    if (k.y < this.arena.killY || far) { this.fall(k); return; }
    if (k.ai) {
      // cão de guarda: sem sair do lugar (4 m) em 5 s = preso → recoloca
      const w = this.watch[k.index]!;
      if (Math.hypot(k.x - w.x, k.z - w.z) > 4) { w.x = k.x; w.z = k.z; w.time = 0; } else w.time += dt;
      if (w.time > 5) { this.drivers[k.index]!.resetStuck(); this.respawn(k, 'stuck'); }
    } else if (k.isPlayer) {
      if (k.input.reset && !k.resetHeld && this.resetCooldown[k.index]! <= 0) { this.resetCooldown[k.index] = 3; this.respawn(k, 'manual'); }
      k.resetHeld = k.input.reset;
    }
  }

  /** Caiu da arena: volta, mas paga como um golpe sem autor. */
  private fall(k: KartState): void {
    const i = k.index;
    const b = this.battlers[i]!;
    if (this.game === 'caca-cristais' && b.crystals > 0) {
      const lose = Math.ceil(b.crystals * BATTLE_RULES.crystals.dropFraction);
      b.crystals -= lose;
      for (let n = 0; n < lose; n++) this.spawnCrystal();
    }
    if (this.game === 'rei-da-coroa' && this.crown.holder === i) { this.releaseHolder(); this.placeCrown([k.x, k.y, k.z]); }
    this.respawn(k, 'fall');
    if (this.game === 'estoura-balao') { b.hitsTaken++; b.balloons = Math.max(0, b.balloons - 1); this.events.push({ type: 'balloon_pop', kart: i, by: -1, left: b.balloons, x: k.x, y: k.y, z: k.z }); if (b.balloons <= 0) this.eliminate(i, -1); }
  }

  /** Volta num ponto de largada longe dos outros, parado e protegido por um instante. */
  respawn(k: KartState, reason: 'fall' | 'manual' | 'stuck'): void {
    let best = this.arena.spawns[0]!, bestD = -1;
    for (const s of this.arena.spawns) {
      let d = Infinity;
      for (const o of this.karts) if (o !== k && !this.battlers[o.index]!.out) d = Math.min(d, Math.hypot(o.x - s.pos[0], o.z - s.pos[2]));
      if (d > bestD) { bestD = d; best = s; }
    }
    placeKart(k, best.pos[0], best.pos[1] + PHYS.rideHeight + 0.1, best.pos[2], best.heading);
    k.freeze = 0.8; k.invuln = 2.2; k.stun = 0; k.jumpGrace = 0;
    const w = this.watch[k.index]!;
    w.x = k.x; w.z = k.z; w.time = 0;
    this.events.push({ type: 'respawn', kart: k.index, reason: reason === 'fall' ? 'fall' : reason });
  }

  /* ---------------- placar ---------------- */

  /** Ordem atual (índices) do primeiro ao último. */
  order(): number[] {
    const idx = this.karts.map((k) => k.index);
    const bs = this.battlers;
    return idx.sort((a, b) => {
      const A = bs[a]!, B = bs[b]!;
      if (this.game === 'estoura-balao') {
        if (A.out !== B.out) return A.out ? 1 : -1;
        if (A.out && B.out) return B.outAt - A.outAt || a - b;
        return B.balloons - A.balloons || B.pops - A.pops || A.hitsTaken - B.hitsTaken || a - b;
      }
      if (this.game === 'caca-cristais') return B.crystals - A.crystals || A.hitsTaken - B.hitsTaken || a - b;
      return Math.floor(B.crownTime) - Math.floor(A.crownTime) || B.crownTime - A.crownTime || a - b;
    });
  }

  private rank(): void {
    this.order().forEach((i, p) => { this.karts[i]!.position = p + 1; });
  }

  private checkEnd(): void {
    if (this.ended) return;
    let end = this.matchTime >= this.duration;
    if (!this.warned30 && this.duration - this.matchTime <= 30 && this.game !== 'caca-cristais') { this.warned30 = true; this.alert('30 SEGUNDOS!', 'warn', 2.4); }
    if (this.game === 'estoura-balao' && this.karts.length > 1 && this.battlers.filter((b) => !b.out).length <= 1) end = true;
    if (this.game === 'rei-da-coroa' && this.battlers.some((b) => b.crownTime >= BATTLE_RULES.crown.target)) end = true;
    if (!end) return;
    this.ended = true;
    this.phase = 'finished';
    this.events.push({ type: 'match_end' });
    const winner = this.order()[0]!;
    const ws = this.slotOf(winner);
    if (ws >= 0) this.alert('VOCÊ VENCEU!', 'good', 5, ws);
    this.alertOthers([ws], `${this.nameOf(winner).toUpperCase()} VENCEU!`, 'info', 5);
    for (const k of this.karts) { k.item = null; k.itemRoll = 0; }
  }

  /** Alerta no HUD de um jogador (`slot`) ou de todos (`slot` omitido). */
  private alert(text: string, kind: HudAlert['kind'], ttl = 2.4, slot = -1): void {
    this.alerts.forEach((list, i) => {
      if (slot >= 0 && slot !== i) return;
      list.push({ id: this.alertId++, text, kind, ttl });
      if (list.length > 3) list.shift();
    });
  }

  /** Alerta para todos os jogadores, menos as vagas listadas (que já receberam a versão pessoal). */
  private alertOthers(except: number[], text: string, kind: HudAlert['kind'], ttl = 2.4): void {
    this.alerts.forEach((_, i) => { if (!except.includes(i)) this.alert(text, kind, ttl, i); });
  }

  /** Vaga do humano que pilota o kart `i`, ou -1 (IA). */
  slotOf(i: number): number {
    const k = this.karts[i];
    return k && k.isPlayer ? k.slot : -1;
  }

  nameOf(index: number): string {
    return CHARACTER_BY_ID[this.karts[index]!.characterId].name;
  }

  /**
   * Kart acompanhado pela câmera do jogador `slot`: ele mesmo ou, se estiver fora, o outro jogador ainda na arena
   * (tela dividida) ou o líder.
   */
  focusIndex(slot = 0): number {
    const p = this.players[slot] ?? this.player;
    if (p && !this.battlers[p.index]!.out) return p.index;
    const mate = this.players.find((o) => o !== p && !this.battlers[o.index]!.out);
    if (mate) return mate.index;
    return this.order().find((i) => !this.battlers[i]!.out) ?? (p?.index ?? 0);
  }

  /** Todos os humanos foram eliminados (sem humanos: true). */
  allHumansOut(): boolean {
    return this.players.every((k) => this.battlers[k.index]!.out);
  }

  hud(slot = 0): BattleHudSnapshot {
    const p = this.players[slot] ?? this.player ?? this.karts[0]!;
    const b = this.battlers[p.index]!;
    const mySlot = Math.max(0, p.slot);
    const focus = this.focusIndex(mySlot);
    return {
      game: this.game,
      phase: this.phase,
      countdown: this.phase === 'countdown' ? Math.ceil(this.countdown) : this.phase === 'racing' && this.matchTime < 1 ? 0 : -1,
      timeLeftMs: this.timeLeft * 1000,
      frenzy: this.frenzy,
      position: p.position,
      total: this.karts.length,
      score: this.scoreOf(p.index),
      balloons: b.balloons,
      crystals: b.crystals,
      crownPoints: Math.floor(b.crownTime),
      holdingCrown: this.crown.holder === p.index,
      out: b.out,
      spectating: b.out ? this.karts[focus]!.characterId : null,
      slot: mySlot,
      humans: this.players.length,
      allHumansOut: this.allHumansOut(),
      board: this.order().map((i, pos) => ({
        index: i, characterId: this.karts[i]!.characterId, isPlayer: this.karts[i]!.isPlayer, score: this.scoreOf(i),
        out: this.battlers[i]!.out, crown: this.crown.holder === i, position: pos + 1, slot: this.slotOf(i), me: i === p.index,
      })),
      alerts: (this.alerts[mySlot] ?? this.alerts[0]!).map(({ id, text, kind }) => ({ id, text, kind })),
      dots: this.karts.map((k) => ({ x: k.x, z: k.z, characterId: k.characterId, isPlayer: k.isPlayer, out: this.battlers[k.index]!.out, crown: this.crown.holder === k.index, me: k === p })),
      crystalDots: this.game === 'caca-cristais' ? this.crystals.flatMap((c) => [Math.round(c.x), Math.round(c.z)]) : [],
      crown: this.game === 'rei-da-coroa' && this.crown.active ? { x: this.crown.x, z: this.crown.z, free: this.crown.holder < 0 } : null,
    };
  }

  result(): BattleResult {
    const order = this.order();
    const standings: BattleStanding[] = order.map((i, pos) => {
      const k = this.karts[i]!, b = this.battlers[i]!;
      return {
        racerIndex: i, characterId: k.characterId, kartId: k.kartId, isPlayer: k.isPlayer, ...(k.isPlayer ? { slot: k.slot } : {}), position: pos + 1,
        score: this.scoreOf(i), eliminated: b.out, hitsLanded: b.hitsLanded, hitsTaken: b.hitsTaken,
      };
    });
    const p = this.player ?? this.karts[0]!;
    const pb = this.battlers[p.index]!;
    return {
      game: this.game, arenaId: this.config.arenaId, difficulty: this.config.difficulty, standings,
      playerPosition: standings.find((s) => s.racerIndex === p.index)!.position,
      durationMs: Math.round(this.matchTime * 1000),
      stats: { itemsUsed: p.itemsUsed, hitsLanded: pb.hitsLanded, hitsTaken: pb.hitsTaken, turbos: [...p.turbos] },
      players: this.players.map((k) => {
        const kb = this.battlers[k.index]!;
        return {
          slot: k.slot, racerIndex: k.index, characterId: k.characterId,
          position: standings.find((s) => s.racerIndex === k.index)!.position,
          stats: { itemsUsed: k.itemsUsed, hitsLanded: kb.hitsLanded, hitsTaken: kb.hitsTaken, turbos: [...k.turbos] },
        };
      }),
    };
  }

  drainEvents(): BattleEvent[] {
    return this.events.splice(0, this.events.length);
  }

  /** Para os testes: um item pronto para uso (passa pela API genérica de itens). */
  giveItem(i: number, item: KartState['item']): void {
    const k = this.karts[i]!;
    k.item = item; k.itemRoll = 0;
  }
}
