import type RAPIER from '@dimforge/rapier3d-compat';
import { CHARACTER_BY_ID } from '@/data/characters';
import { POINTS_BY_POSITION } from '@/data/tracks';
import { AI_PROFILES, AiDriver, type AiWorld } from '@/game/ai/aiDriver';
import { createRng, type Rng } from '@/game/core/rng';
import { NEUTRAL_INPUT, type HudAlert, type HudSnapshot, type InputState, type RaceConfig, type RacePhase, type RaceResult, type RacerResult } from '@/game/core/types';
import { ItemSystem } from '@/game/items/itemSystem';
import { GROUP_KART, GROUP_OBSTACLE, GROUP_STATIC, createTrackColliders, groups, type Rapier } from '@/game/physics/trackColliders';
import type { TrackData } from '@/game/tracks/trackTypes';
import { TrackRuntime } from '@/game/tracks/trackRuntime';
import { applyBoost, placeKart, spinOut, stepKart, syncKart, type PhysicsContext } from '@/game/vehicles/kartPhysics';
import { createKartState, type KartState } from '@/game/vehicles/kartState';
import { PHYS, tuningFor } from '@/game/vehicles/kartTuning';
import type { SimEvent } from './events';
import { createObstacles, stepObstacles, type ObstacleState } from './obstacles';
import { rankKarts, updateProgress } from './progress';

/** Conversão de m/s para o velocímetro do HUD. */
export const KMH = 4.2;
const COUNTDOWN = 3;

export interface RaceSimOptions {
  /** Leitura dos comandos do jogador (chamada a cada passo fixo). */
  playerInput?: () => InputState;
}

/**
 * Simulação determinística de uma corrida. Não depende de renderização: é a mesma classe
 * usada no jogo (passo fixo de 1/60 s) e nos testes automatizados sem navegador.
 */
export class RaceSim {
  readonly track: TrackRuntime;
  readonly karts: KartState[] = [];
  readonly obstacles: ObstacleState[];
  readonly items: ItemSystem;
  readonly events: SimEvent[] = [];
  readonly player: KartState | null;
  phase: RacePhase = 'intro';
  /** Tempo total de simulação (s) e tempo de corrida desde o "VAI!" (s). */
  time = 0;
  raceTime = 0;
  countdown = COUNTDOWN;
  private lastCount = COUNTDOWN + 1;
  private readonly drivers: (AiDriver | null)[] = [];
  private readonly autopilot: AiDriver;
  private readonly ctx: PhysicsContext;
  private readonly rng: Rng;
  private readonly alerts: (HudAlert & { ttl: number })[] = [];
  private alertId = 1;
  private finishedCount = 0;
  private resetCooldown = 0;
  private readonly aiWorld: AiWorld;
  private readonly watch: { progress: number; time: number; outside: number }[] = [];

  constructor(
    R: Rapier,
    readonly world: RAPIER.World,
    data: TrackData,
    readonly config: RaceConfig,
    private readonly opts: RaceSimOptions = {},
  ) {
    this.rng = createRng(config.seed);
    this.track = new TrackRuntime(data);
    world.gravity = { x: 0, y: 0, z: 0 };
    world.timestep = PHYS.dt;
    createTrackColliders(R, world, this.track);
    this.obstacles = createObstacles(R, world, data.obstacles);
    const emit = (e: SimEvent): void => {
      this.events.push(e);
      // avisos de item para o jogador
      if (!('kart' in e) || e.kart !== this.player?.index) return;
      if (e.type === 'item_use' && e.item === 'cometa-guia') this.alert('COMETA GUIA!', 'good', 1.6);
      else if (e.type === 'zapped') this.alert('RAIO! MOTOR ENGASGADO', 'warn', 1.4);
    };
    this.ctx = { R, world, ray: new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), emit, controlsEnabled: false };
    this.items = new ItemSystem(this.track, this.rng, emit, config.mode !== 'timetrial');

    config.racers.forEach((r, i) => {
      const slot = data.grid[Math.min(i, data.grid.length - 1)]!;
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
      const k = createKartState({ index: i, characterId: r.characterId, kartId: r.kartId, isPlayer: r.isPlayer, ai: !r.isPlayer, tuning, body, collider });
      placeKart(k, slot.pos[0], slot.pos[1] + PHYS.rideHeight, slot.pos[2], slot.heading);
      k.pathIndex = k.mainIndex = this.track.main.nearest(0, 40, 4, k.x, k.y, k.z);
      k.lastSafeIndex = k.mainIndex;
      this.karts.push(k);
      this.watch.push({ progress: 0, time: 0, outside: 0 });
      this.drivers.push(r.isPlayer ? null : new AiDriver(AI_PROFILES[config.difficulty], createRng(config.seed + 31 * (i + 1))));
    });
    this.autopilot = new AiDriver(AI_PROFILES.normal, createRng(config.seed + 999));
    this.player = this.karts.find((k) => k.isPlayer) ?? null;
    this.aiWorld = { track: this.track, karts: this.karts, obstacles: this.obstacles, hazards: this.items.hazards, projectiles: this.items.projectiles, time: 0, raceTime: 0 };
    for (const k of this.karts) updateProgress(k, this.track, 0, { onLap: () => undefined });
    rankKarts(this.karts);
  }

  /** Encerra a apresentação da pista e inicia a contagem regressiva. */
  startCountdown(): void {
    if (this.phase === 'intro') { this.phase = 'countdown'; this.countdown = COUNTDOWN; this.lastCount = COUNTDOWN + 1; }
  }

  get totalLaps(): number { return this.config.laps; }

  /** Avança um passo fixo (PHYS.dt). */
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
        for (const k of this.karts) k.lapStart = 0;
      }
    }
    const racing = this.phase === 'racing' || this.phase === 'finished';
    if (racing) this.raceTime += dt;
    this.ctx.controlsEnabled = racing;
    this.aiWorld.time = this.time;
    this.aiWorld.raceTime = this.raceTime;
    this.resetCooldown = Math.max(0, this.resetCooldown - dt);

    stepObstacles(this.obstacles, this.time);

    for (const k of this.karts) {
      // comandos
      if (!racing) Object.assign(k.input, NEUTRAL_INPUT);
      else if (k.ai) (this.drivers[k.index] ?? this.autopilot).update(k, this.aiWorld, dt);
      else if (k.isPlayer && this.opts.playerInput) Object.assign(k.input, this.opts.playerInput());
      if (k.finished) k.input.item = false;
      if (racing && k.comet > 0) this.items.steerComet(k);
      stepKart(k, this.ctx, dt);
    }

    this.world.step();

    const timeMs = this.raceTime * 1000;
    for (const k of this.karts) {
      syncKart(k, this.ctx.emit);
      updateProgress(k, this.track, timeMs, { onLap: (kart, lapMs) => this.onLap(kart, lapMs) });
      if (racing) {
        this.checkBoostPads(k);
        this.checkObstacles(k);
        this.checkBounds(k, dt);
      }
    }
    if (racing) this.items.step(this.karts, dt);
    rankKarts(this.karts);

    for (let i = this.alerts.length - 1; i >= 0; i--) {
      this.alerts[i]!.ttl -= dt;
      if (this.alerts[i]!.ttl <= 0) this.alerts.splice(i, 1);
    }
  }

  private alert(text: string, kind: HudAlert['kind'], ttl = 2.4): void {
    this.alerts.push({ id: this.alertId++, text, kind, ttl });
    if (this.alerts.length > 3) this.alerts.shift();
  }

  private onLap(k: KartState, lapMs: number): void {
    const final = k.lap === this.config.laps - 1;
    this.events.push({ type: 'lap', kart: k.index, lap: k.lap, timeMs: lapMs, final });
    if (k.lap >= this.config.laps && !k.finished) {
      k.finished = true;
      k.finishTime = this.raceTime * 1000;
      k.ai = true;
      this.finishedCount++;
      this.events.push({ type: 'finish', kart: k.index, position: this.finishedCount });
      if (k.isPlayer) { this.phase = 'finished'; this.alert('CHEGADA!', 'good', 4); }
    } else if (k.isPlayer) {
      if (final) this.alert('ÚLTIMA VOLTA!', 'warn', 3);
      else this.alert(`VOLTA ${k.lap + 1}`, 'info', 2);
    }
  }

  private checkBoostPads(k: KartState): void {
    if (!k.grounded || k.padCooldown > 0) return;
    for (const pad of this.track.data.boostPads) {
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

  private checkObstacles(k: KartState): void {
    for (const o of this.obstacles) {
      const cy = o.y + (o.data.kind === 'slider' ? o.data.radius : 0);
      const dx = k.x - o.x, dy = k.y - cy, dz = k.z - o.z;
      const r = o.data.radius + PHYS.ballRadius + 0.15;
      if (dx * dx + dy * dy + dz * dz > r * r) continue;
      if (spinOut(k, this.ctx.emit, 'obstaculo')) {
        const d = Math.hypot(dx, dz) || 1;
        k.vx += (dx / d) * 7; k.vz += (dz / d) * 7;
        k.body.setLinvel({ x: k.vx, y: k.vy, z: k.vz }, true);
      }
    }
  }

  /** Quedas, água, saída de pista prolongada, contramão e recuperação manual. */
  private checkBounds(k: KartState, dt: number): void {
    const data = this.track.data;
    const main = this.track.main;
    const roadY = main.pos[k.mainIndex * 3 + 1]!;
    const far = k.pathId < 0 && Math.abs(k.lateral) > main.halfWidth[k.mainIndex]! + 34;
    k.offTrackTime = far ? k.offTrackTime + dt : 0;
    if (k.y < data.killY || (!k.grounded && k.y < roadY - 16)) return this.respawn(k, 'fall');
    // Caiu de um viaduto/ponte: apoiado no chão bem abaixo do trecho de pista em que está (Cidade Neon).
    if (k.grounded && k.pathId < 0 && k.y < roadY - 5 && Math.abs(k.lateral) < main.halfWidth[k.mainIndex]! + 4) return this.respawn(k, 'fall');
    if (data.waterY !== null && k.y - PHYS.rideHeight < data.waterY - 0.8) return this.respawn(k, 'water');
    if (k.offTrackTime > 2.5) return this.respawn(k, 'offtrack');
    if (k.ai && !k.finished) {
      // cão de guarda da IA: sem avanço real por 6 s = preso
      const w = this.watch[k.index]!;
      if (k.progress > w.progress + 8) { w.progress = k.progress; w.time = 0; } else w.time += dt;
      // Do lado de fora do muro e quase parado (entrou numa fresta, ex.: boca de atalho): recupera em 2 s, não em 6.
      const outside = k.pathId < 0 && Math.abs(k.lateral) > main.halfWidth[k.mainIndex]! + 1 && Math.abs(k.speed) < 4;
      w.outside = outside ? w.outside + dt : 0;
      if (w.time > 6 || w.outside > 2) { w.time = 0; w.outside = 0; w.progress = k.progress - 20; (this.drivers[k.index] ?? this.autopilot).resetStuck(); return this.respawn(k, 'stuck'); }
    }
    if (k.isPlayer && !k.ai) {
      if (k.input.reset && !k.resetHeld && this.resetCooldown <= 0) { this.resetCooldown = 3; this.respawn(k, 'manual'); }
      k.resetHeld = k.input.reset;
      const hd = Math.sin(k.heading) * main.tan[k.mainIndex * 3]! + Math.cos(k.heading) * main.tan[k.mainIndex * 3 + 2]!;
      if (hd < -0.35 && k.speed > 4 && k.pathId < 0) {
        k.wrongWayTime += dt;
        if (k.wrongWayTime > 1.2 && k.wrongWayTime - dt <= 1.2) this.events.push({ type: 'wrong_way', kart: k.index });
      } else k.wrongWayTime = 0;
    }
  }

  /** Recoloca o kart no último ponto seguro, parado e por um instante sem controle (sem vantagem). */
  respawn(k: KartState, reason: 'fall' | 'water' | 'offtrack' | 'manual' | 'stuck'): void {
    const main = this.track.main;
    const idx = this.track.safeIndex(k.lastSafeIndex - 3);
    const p = { x: 0, y: 0, z: 0 };
    main.point(idx, 0, p);
    placeKart(k, p.x, p.y + PHYS.rideHeight + 0.1, p.z, main.heading[idx]!);
    k.pathId = -1; k.pathIndex = k.mainIndex = idx; k.lastSafeIndex = idx;
    const w = this.watch[k.index]!;
    w.time = 0; w.progress = idx + k.lap * this.track.n - this.track.n;
    k.freeze = 0.8; k.invuln = 2.2; k.stun = 0; k.comet = 0; k.slowTime = 0; k.offTrackTime = 0; k.wrongWayTime = 0; k.jumpGrace = 0;
    this.events.push({ type: 'respawn', kart: k.index, reason });
  }

  /** Estado para o HUD do jogador. */
  hud(): HudSnapshot {
    const k = this.player ?? this.karts[0]!;
    const lapTime = this.phase === 'racing' ? this.raceTime * 1000 - k.lapStart : 0;
    const best = k.lapTimes.length ? Math.min(...k.lapTimes) : null;
    const next = k.driftLevel >= 3 ? 1 : (() => {
      const lo = k.driftLevel === 0 ? 0 : PHYS.driftLevels[k.driftLevel - 1]!;
      const hi = PHYS.driftLevels[Math.min(2, k.driftLevel)]!;
      return Math.max(0, Math.min(1, (k.driftCharge - lo) / (hi - lo)));
    })();
    return {
      phase: this.phase,
      countdown: this.phase === 'countdown' ? Math.ceil(this.countdown) : this.phase === 'racing' && this.raceTime < 1 ? 0 : -1,
      position: k.position,
      totalRacers: this.karts.length,
      lap: Math.min(this.config.laps, k.lap + 1),
      totalLaps: this.config.laps,
      timeMs: k.finished ? k.finishTime : this.raceTime * 1000,
      lapTimeMs: lapTime,
      bestLapMs: best,
      speedKmh: Math.abs(k.speed) * KMH,
      item: k.item,
      itemRolling: k.itemRoll > 0,
      driftLevel: k.drifting ? k.driftLevel : 0,
      driftCharge: k.drifting ? next : 0,
      boost: k.boostTime > 0 ? Math.min(1, k.boostTime / k.boostTotal) : 0,
      shield: k.shield > 0,
      wrongWay: k.wrongWayTime > 1.2,
      alerts: this.alerts.map(({ id, text, kind }) => ({ id, text, kind })),
      minimap: this.karts.map((o) => ({ x: o.x, z: o.z, characterId: o.characterId, isPlayer: o.isPlayer, position: o.position })),
    };
  }

  /** Classificação final. Quem não cruzou a chegada é ordenado pelo progresso (tempo nulo). */
  result(): RaceResult {
    rankKarts(this.karts);
    const total = this.config.laps * this.track.n;
    const nowMs = this.raceTime * 1000;
    let lastMs = 0;
    const results: RacerResult[] = [...this.karts].sort((a, b) => a.position - b.position).map((k) => {
      // Quem ainda não chegou: tempo estimado pelo ritmo médio até agora, sempre depois de quem está à frente.
      let time: number | null = k.finished ? Math.round(k.finishTime) : null;
      let estimated = false;
      if (time === null && k.progress > 0 && nowMs > 0) {
        const rate = k.progress / nowMs;
        time = Math.round(Math.max(nowMs + Math.max(0, total - k.progress) / rate, lastMs + 100));
        estimated = true;
      }
      if (time !== null) lastMs = time;
      return {
      racerIndex: k.index,
      characterId: k.characterId,
      kartId: k.kartId,
      isPlayer: k.isPlayer,
      position: k.position,
      totalTimeMs: time,
      estimated,
      bestLapMs: k.lapTimes.length ? Math.round(Math.min(...k.lapTimes)) : null,
      lapTimesMs: k.lapTimes.map((t) => Math.round(t)),
      points: POINTS_BY_POSITION[k.position - 1] ?? 0,
      };
    });
    const p = this.player ?? this.karts[0]!;
    const pr = results.find((r) => r.racerIndex === p.index)!;
    return {
      trackId: this.config.trackId,
      mode: this.config.mode,
      difficulty: this.config.difficulty,
      results,
      playerPosition: pr.position,
      // Recordes e melhores tempos só com tempo real de chegada.
      playerTimeMs: pr.estimated ? null : pr.totalTimeMs,
      playerBestLapMs: pr.bestLapMs,
      stats: { turbos: [...p.turbos], itemsUsed: p.itemsUsed, hitsTaken: p.hitsTaken, topSpeedKmh: Math.round(p.topSpeed * KMH) },
    };
  }

  /** Nome de exibição de um competidor (para alertas e depuração). */
  nameOf(index: number): string {
    return CHARACTER_BY_ID[this.karts[index]!.characterId].name;
  }

  /** Remove e devolve os eventos acumulados desde a última chamada. */
  drainEvents(): SimEvent[] {
    return this.events.splice(0, this.events.length);
  }
}
