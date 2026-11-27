import * as THREE from 'three';
import { Athlete, type AnimName } from './athlete';
import { Ball } from './ball';
import { COURT, isInside, predictPath, solveShot, type Vec3 } from './physics';
import { awardPoint, newScore, serviceCourt, gamePointFor, breakPoint, setPointFor, matchPointFor, isDeuce, pointLabels, type MatchConfig, type ScoreState, type Side } from './rules';
import { DIFFICULTY, type DifficultyId, type PlayerDef, type VenueDef } from '../data/content';
import { Input, type PadState } from '../core/input';

export type ShotKind = 'drive' | 'slice' | 'lob' | 'drop' | 'smash' | 'volley' | 'serve';

export type MatchEvent =
  | { type: 'hit'; side: Side; kind: ShotKind; power: number; perfect: boolean; pos: Vec3; speedKmh: number }
  | { type: 'bounce'; pos: Vec3; speed: number; inCourt: boolean }
  | { type: 'net'; pos: Vec3; cord: boolean }
  | { type: 'call'; text: 'OUT' | 'FAULT' | 'DOUBLE FAULT' | 'LET' | 'NET' | 'ACE' | 'WINNER' }
  | { type: 'point'; winner: Side; reason: string; rally: number; highlight: boolean }
  | { type: 'score'; call: string; gameWon: Side | null; setWon: Side | null; matchWon: Side | null; tag: string | null }
  | { type: 'changeEnds' }
  | { type: 'serveReady'; side: Side; second: boolean }
  | { type: 'swing'; side: Side; anim: AnimName }
  | { type: 'meter'; side: Side; value: number | null };

interface Intercept { t: number; p: Vec3; bounces: number; kind: 'ground' | 'volley' | 'smash'; }

export interface MatchStats { aces: number; doubleFaults: number; winners: number; errors: number; netPoints: number; smashes: number; maxServe: number; pointsWon: number }

const SERVE_IMPACT = 0.47; // seconds into the serve clip where the racket meets the ball
const SWING_IMPACT: Record<string, number> = { forehand: 0.2, backhand: 0.27, volley: 0.2, smash: 0.42, dive: 0.18 };

export class PlayerCtl {
  athlete: Athlete;
  end: 1 | -1 = 1; // +1 = near half (z>0), -1 = far half
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  facing = 0;
  charging = false;
  chargeT = 0;
  chargeKind: ShotKind = 'drive';
  swingT = -1; // >=0 while a swing is scheduled/playing; counts time to impact
  swingAnim: AnimName | null = null;
  intercept: Intercept | null = null;
  aiTarget = new THREE.Vector3();
  aiDecision: { kind: ShotKind; aim: THREE.Vector2; at: number } | null = null;
  aiReact = 0;
  lockT = 0; // can't move (recovering from dive, serving)
  stats: MatchStats = { aces: 0, doubleFaults: 0, winners: 0, errors: 0, netPoints: 0, smashes: 0, maxServe: 0, pointsWon: 0 };
  prevInput: PadState = { x: 0, y: 0, shot: false, slice: false, lob: false };
  constructor(public side: Side, public def: PlayerDef, public human: boolean, public pad: 0 | 1, public diff: DifficultyId) {
    this.athlete = new Athlete(def);
  }
  get maxSpeed() { return 5.2 + (this.def.stats.speed / 100) * 2.4 * (this.human ? 1 : DIFFICULTY[this.diff].speed); }
}

type Phase = 'idle' | 'preServe' | 'toss' | 'rally' | 'pointOver' | 'between' | 'matchOver';

export class Match {
  players: [PlayerCtl, PlayerCtl];
  ball: Ball;
  score: ScoreState;
  phase: Phase = 'idle';
  phaseT = 0;
  events: MatchEvent[] = [];
  server: Side = 0;
  secondServe = false;
  lastHitter: Side | null = null;
  bouncesSinceHit = 0;
  firstBounceInPlay = false;
  isServeInFlight = false;
  serveMeter = 0;
  serveMeterDir = 1;
  serveAim = new THREE.Vector2();
  rally = 0;
  pointLog: { winner: Side; reason: string }[] = [];
  time = 0;
  servePeak = 0;
  lastShotKind: ShotKind = 'drive';
  paused = false;
  rng = Math.random;
  private tossHeld = false;
  private reactionDone = false;
  training = false;
  feedT = -1;
  onTrainingLand: ((p: Vec3, inCourt: boolean) => void) | null = null;

  constructor(p1: PlayerDef, p2: PlayerDef, public venue: VenueDef, public cfg: MatchConfig, opts: { p2Human: boolean; difficulty: DifficultyId; p1Difficulty?: DifficultyId; demo?: boolean }, scene: THREE.Object3D) {
    this.players = [
      new PlayerCtl(0, p1, !opts.demo, 0, opts.p1Difficulty ?? 'normal'),
      new PlayerCtl(1, p2, opts.p2Human, 1, opts.difficulty),
    ];
    this.players[0].end = 1;
    this.players[1].end = -1;
    for (const p of this.players) scene.add(p.athlete.root);
    this.ball = new Ball(scene);
    this.score = newScore(0);
    this.server = 0;
  }

  emit(e: MatchEvent) { this.events.push(e); }
  drain(): MatchEvent[] { const e = this.events; this.events = []; return e; }

  surf() { return this.venue.surface; }
  opp(s: Side): PlayerCtl { return this.players[1 - s]; }

  // ------------------------------------------------------------------ point setup
  start() {
    this.setupPoint();
  }

  setupPoint() {
    if (this.training) { this.setupTraining(); return; }
    const s = this.score;
    this.server = s.server;
    const court = serviceCourt(s);
    for (const p of this.players) {
      const isServer = p.side === this.server;
      // deuce court = server's right. Near end faces -z so right is +x; far end right is -x.
      const right = p.end === 1 ? 1 : -1;
      const sx = court === 'deuce' ? right : -right;
      if (isServer) p.pos.set(sx * 0.7, 0, p.end * (COURT.halfLength + 0.25));
      else p.pos.set(-sx * 2.9 * -1 * -1, 0, p.end * (COURT.halfLength + 0.6));
      if (!isServer) {
        // receiver stands diagonally opposite the server
        const rRight = p.end === 1 ? 1 : -1;
        const rx = court === 'deuce' ? rRight : -rRight;
        p.pos.x = rx * 2.6;
      }
      p.vel.set(0, 0, 0);
      p.charging = false; p.chargeT = 0; p.swingT = -1; p.swingAnim = null; p.intercept = null; p.aiDecision = null; p.lockT = 0;
      p.facing = p.end === 1 ? Math.PI : 0;
      p.athlete.root.position.copy(p.pos);
      p.athlete.root.rotation.y = p.facing;
      p.athlete.releaseOneShot(0.1);
      p.athlete.play(isServer ? 'idle' : 'ready', { fade: 0.2 });
    }
    this.ball.active = false;
    this.ball.visible = true;
    this.ball.held = this.players[this.server].athlete.bones.get('hand_l') ?? null;
    this.lastHitter = null;
    this.bouncesSinceHit = 0;
    this.rally = 0;
    this.isServeInFlight = false;
    this.phase = 'preServe';
    this.phaseT = 0;
    this.tossHeld = false;
    this.reactionDone = false;
    this.emit({ type: 'serveReady', side: this.server, second: this.secondServe });
  }

  // ------------------------------------------------------------------ training (ball machine)
  private setupTraining() {
    const me = this.players[0], coach = this.players[1];
    me.pos.set(0, 0, COURT.halfLength + 0.4);
    coach.pos.set(-3.5, 0, -(COURT.halfLength + 1.5));
    for (const p of this.players) { p.vel.set(0, 0, 0); p.facing = p.end === 1 ? Math.PI : 0; p.athlete.root.rotation.y = p.facing; }
    coach.athlete.play('arms_folded', { fade: 0 });
    this.phase = 'rally';
    this.phaseT = 0;
    this.feedT = 1.2;
    this.ball.active = false;
    this.ball.visible = false;
    this.lastHitter = 1;
  }

  private feed() {
    const machine = { x: (this.rng() - 0.5) * 2, y: 1.0, z: -(COURT.halfLength + 0.5) };
    const target = { x: (this.rng() - 0.5) * 6.4, y: 0, z: COURT.halfLength - 2.5 - this.rng() * 4 };
    const spin = 0.3 + this.rng() * 0.5;
    const sol = solveShot({ from: machine, target, speed: 19 + this.rng() * 7, spin, minNetClear: 0.6 });
    this.ball.set(machine, sol.v, spin);
    this.lastHitter = 1;
    this.bouncesSinceHit = 0;
    this.isServeInFlight = false;
    this.feedT = -1;
    this.onBallHit(1);
    this.emit({ type: 'hit', side: 1, kind: 'drive', power: 0.3, perfect: false, pos: machine, speedKmh: this.ball.speedKmh() });
  }

  // ------------------------------------------------------------------ main update (fixed step)
  update(dt: number) {
    if (this.paused) return;
    this.time += dt;
    this.phaseT += dt;
    const inputs = this.players.map((p) => (p.human ? Input.read(p.pad) : null));

    switch (this.phase) {
      case 'preServe': this.updatePreServe(dt, inputs); break;
      case 'toss': this.updateToss(dt, inputs); break;
      case 'rally': this.updateRally(dt, inputs); break;
      case 'pointOver': this.updatePointOver(dt); break;
      default: break;
    }
    for (const p of this.players) {
      p.athlete.root.position.copy(p.pos);
      p.athlete.update(dt);
      if (p.human) p.prevInput = inputs[p.side] ?? p.prevInput;
    }
    this.ball.sync(dt);
  }

  private pressed(p: PlayerCtl, i: PadState | null, key: 'shot' | 'slice' | 'lob') {
    return !!i && i[key] && !p.prevInput[key];
  }

  // ------------------------------------------------------------------ serve
  private updatePreServe(dt: number, inputs: (PadState | null)[]) {
    const sv = this.players[this.server];
    const i = inputs[this.server];
    // server may shuffle along the baseline
    const court = serviceCourt(this.score);
    const right = sv.end === 1 ? 1 : -1;
    const sx = court === 'deuce' ? right : -right;
    if (i) {
      sv.pos.x = THREE.MathUtils.clamp(sv.pos.x + i.x * dt * 2.2, sx > 0 ? 0.25 : -3.6, sx > 0 ? 3.6 : -0.25);
      if (this.phaseT > 0.4 && (this.pressed(sv, i, 'shot') || this.pressed(sv, i, 'slice') || this.pressed(sv, i, 'lob'))) this.beginToss();
    } else if (this.phaseT > 1.4 + this.rng() * 0.6) {
      sv.pos.x = sx * (0.5 + this.rng() * 0.8);
      this.beginToss();
    }
    // receiver AI/human can adjust
    const rc = this.opp(this.server);
    const ri = inputs[rc.side];
    if (ri) this.movePlayer(rc, ri, dt, 1);
    rc.athlete.play('ready');
    this.faceNet(sv, dt);
  }

  private beginToss() {
    const sv = this.players[this.server];
    this.phase = 'toss';
    this.phaseT = 0;
    this.serveMeter = 0;
    this.serveMeterDir = 1;
    this.tossHeld = true;
    sv.athlete.play('serve', { fade: 0.1 });
    sv.athlete.oneShot!.setEffectiveTimeScale(1);
    // toss: ball leaves the left hand going up
    const hand = new THREE.Vector3();
    (sv.athlete.bones.get('hand_l') ?? sv.athlete.root).getWorldPosition(hand);
    const fwd = -sv.end;
    this.ball.set({ x: sv.pos.x + 0.25 * (sv.end === 1 ? 1 : -1) * 0, y: 1.7, z: sv.pos.z + fwd * 0.35 }, { x: 0, y: 5.6, z: 0 }, 0);
    void hand;
    this.serveAim.set(0, 0);
    this.emit({ type: 'meter', side: this.server, value: 0 });
  }

  private updateToss(dt: number, inputs: (PadState | null)[]) {
    const sv = this.players[this.server];
    const i = inputs[this.server];
    // ball physics during toss (no ground)
    const st = this.ball.state;
    st.v.y -= 9.81 * dt;
    st.p.y += st.v.y * dt;
    // serve animation holds the trophy pose until the hit
    const act = sv.athlete.oneShot;
    if (act && this.tossHeld && act.time >= 0.26) act.setEffectiveTimeScale(0.08);
    // power meter
    this.serveMeter += this.serveMeterDir * dt * 1.6;
    if (this.serveMeter >= 1) { this.serveMeter = 1; this.serveMeterDir = -1; }
    this.emit({ type: 'meter', side: this.server, value: this.serveMeter });
    if (i) {
      this.serveAim.x = THREE.MathUtils.clamp(this.serveAim.x + i.x * dt * 3, -1, 1);
      this.serveAim.y = THREE.MathUtils.clamp(this.serveAim.y + i.y * dt * 3, -1, 1);
    }
    let hit = false;
    let meterValue = this.serveMeter;
    if (i) {
      if (this.phaseT > 0.12 && (this.pressed(sv, i, 'shot') || this.pressed(sv, i, 'slice') || this.pressed(sv, i, 'lob'))) hit = true;
    } else {
      const d = DIFFICULTY[sv.diff];
      const want = 0.97 - d.error * 0.12 - this.rng() * 0.08;
      if (this.serveMeterDir === 1 && this.serveMeter >= want) { hit = true; meterValue = this.serveMeter; }
      this.serveAim.set((this.rng() - 0.5) * 1.8, this.rng() * 0.6);
    }
    if (hit && this.tossHeld) {
      this.tossHeld = false;
      act?.setEffectiveTimeScale(1.4);
      (sv as PlayerCtl & { meterAtHit?: number }).meterAtHit = meterValue;
    }
    // impact
    if (!this.tossHeld && act && act.time >= SERVE_IMPACT) {
      this.hitServe(sv, (sv as PlayerCtl & { meterAtHit?: number }).meterAtHit ?? 0.5);
      return;
    }
    if (st.p.y < 1.2 && st.v.y < 0) {
      // ball dropped: catch it and re-toss (no penalty)
      this.phase = 'preServe';
      this.phaseT = 0;
      this.ball.active = false;
      this.ball.held = sv.athlete.bones.get('hand_l') ?? null;
      sv.athlete.releaseOneShot();
      this.emit({ type: 'meter', side: this.server, value: null });
    }
  }

  private hitServe(sv: PlayerCtl, meter: number) {
    this.emit({ type: 'meter', side: this.server, value: null });
    const court = serviceCourt(this.score);
    const rc = this.opp(this.server);
    // target inside the diagonal service box
    const rRight = rc.end === 1 ? 1 : -1;
    const boxSign = court === 'deuce' ? rRight : -rRight;
    const aimX = this.serveAim.x * this.camEnd();
    const tx = boxSign * (2.05 + aimX * boxSign * 1.75);
    const depth = COURT.serviceLine - 0.55 - Math.max(0, -this.serveAim.y) * 1.6;
    const perfect = meter > 0.94;
    const stat = sv.def.stats.serve / 100;
    const second = this.secondServe;
    const speedKmh = (second ? 125 : 150) + stat * (second ? 35 : 70) * meter;
    const err = (1 - meter) * (second ? 0.6 : 1.4) + (perfect ? 0 : 0.12) + (sv.human ? 0 : DIFFICULTY[sv.diff].error * 0.12);
    const target = { x: tx + (this.rng() - 0.5) * err * 1.6, y: 0, z: rc.end * (depth + (this.rng() - 0.35) * err * 1.8) };
    const from = { x: this.ball.pos.x, y: 2.75 + stat * 0.15, z: this.ball.pos.z };
    const spin = second ? 0.9 : 0.25;
    const sol = solveShot({ from, target, speed: speedKmh / 3.6, spin, minNetClear: second ? 0.35 : 0.08 });
    this.ball.set(from, sol.v, spin);
    this.lastHitter = sv.side;
    this.bouncesSinceHit = 0;
    this.isServeInFlight = true;
    this.phase = 'rally';
    this.phaseT = 0;
    this.lastShotKind = 'serve';
    this.servePeak = this.ball.speedKmh();
    sv.stats.maxServe = Math.max(sv.stats.maxServe, Math.round(this.servePeak));
    this.emit({ type: 'hit', side: sv.side, kind: 'serve', power: meter, perfect, pos: { ...from }, speedKmh: this.servePeak });
    this.onBallHit(sv.side);
  }

  // ------------------------------------------------------------------ rally
  private onBallHit(side: Side) {
    // receiver plans an intercept
    const r = this.opp(side);
    r.intercept = null;
    r.aiDecision = null;
    r.aiReact = r.human ? 0 : DIFFICULTY[r.diff].reaction * (0.7 + this.rng() * 0.6);
    const h = this.players[side];
    h.intercept = null;
    h.charging = false;
  }

  private updateRally(dt: number, inputs: (PadState | null)[]) {
    // ball physics with sub-steps
    const sub = 2;
    for (let k = 0; k < sub; k++) {
      const e = this.ball.step(dt / sub, this.surf());
      if (e) this.onBallEvent(e);
      if (this.phase !== 'rally') return;
    }
    if (this.training) {
      if (this.feedT >= 0 && (this.feedT -= dt) <= 0) this.feed();
      if (this.ball.active && (Math.abs(this.ball.pos.z) > COURT.halfLength + 8 || Math.abs(this.ball.pos.x) > 11) && this.feedT < 0) this.feedT = 0.4;
      const pl = this.players[0];
      this.updateHuman(pl, inputs[0]!, dt);
      this.updateSwing(pl, dt);
      return;
    }
    // ball left the stadium area
    const p = this.ball.pos;
    if (Math.abs(p.z) > COURT.halfLength + 8 || Math.abs(p.x) > 11) this.ballDead('out_of_area');
    if (this.phase !== 'rally') return;

    for (const pl of this.players) {
      const i = inputs[pl.side];
      if (pl.human) this.updateHuman(pl, i!, dt);
      else this.updateAI(pl, dt);
      this.updateSwing(pl, dt);
    }
  }

  private onBallEvent(e: NonNullable<ReturnType<Ball['step']>>) {
    if (this.training) {
      if (e.type === 'bounce') {
        this.bouncesSinceHit++;
        this.emit({ type: 'bounce', pos: e.p, speed: e.speed, inCourt: true });
        if (this.lastHitter === 0 && this.bouncesSinceHit === 1) { this.onTrainingLand?.(e.p, isInside(e.p, 'far', 'singles')); if (this.feedT < 0) this.feedT = 0.9; }
        if (this.lastHitter === 1 && this.bouncesSinceHit === 2 && this.feedT < 0) this.feedT = 0.5;
      } else { this.emit({ type: 'net', pos: e.p, cord: e.cord }); if (this.feedT < 0) this.feedT = 0.8; }
      return;
    }
    if (e.type === 'net') {
      this.emit({ type: 'net', pos: e.p, cord: e.cord });
      if (!e.cord) {
        // into the net: the hitter loses the point (or fault on serve)
        if (this.isServeInFlight) this.fault('NET');
        else this.endPoint((1 - this.lastHitter!) as Side, 'net');
      } else if (this.isServeInFlight) {
        (this as Match & { letPending?: boolean }).letPending = true;
      }
      return;
    }
    // bounce
    const hitter = this.lastHitter!;
    const targetHalf = this.players[1 - hitter].end === 1 ? 'near' : 'far';
    this.bouncesSinceHit++;
    if (this.bouncesSinceHit === 1) {
      let inCourt: boolean;
      if (this.isServeInFlight) {
        const court = serviceCourt(this.score);
        inCourt = isInside(e.p, targetHalf, court === 'deuce' ? 'serviceDeuce' : 'serviceAd');
      } else {
        inCourt = isInside(e.p, targetHalf, 'singles');
      }
      this.emit({ type: 'bounce', pos: e.p, speed: e.speed, inCourt });
      if (!inCourt) {
        if (this.isServeInFlight) {
          if ((this as Match & { letPending?: boolean }).letPending) { this.letServe(); return; }
          this.fault('FAULT');
        } else {
          this.emit({ type: 'call', text: 'OUT' });
          this.players[hitter].stats.errors++;
          this.endPoint((1 - hitter) as Side, 'out');
        }
        return;
      }
      if (this.isServeInFlight && (this as Match & { letPending?: boolean }).letPending) { this.letServe(); return; }
    } else {
      this.emit({ type: 'bounce', pos: e.p, speed: e.speed, inCourt: true });
      if (this.bouncesSinceHit === 2) {
        // receiver failed to return
        if (this.isServeInFlight) {
          this.emit({ type: 'call', text: 'ACE' });
          this.players[hitter].stats.aces++;
        } else {
          this.players[hitter].stats.winners++;
        }
        this.endPoint(hitter, this.isServeInFlight ? 'ace' : 'winner');
      }
    }
  }

  private ballDead(reason: string) {
    const hitter = this.lastHitter!;
    if (this.bouncesSinceHit === 0) {
      if (this.isServeInFlight) { this.fault('FAULT'); return; }
      this.emit({ type: 'call', text: 'OUT' });
      this.players[hitter].stats.errors++;
      this.endPoint((1 - hitter) as Side, 'out');
    } else {
      if (this.isServeInFlight) { this.players[hitter].stats.aces++; this.emit({ type: 'call', text: 'ACE' }); }
      else this.players[hitter].stats.winners++;
      this.endPoint(hitter, reason);
    }
  }

  private letServe() {
    this.emit({ type: 'call', text: 'LET' });
    (this as Match & { letPending?: boolean }).letPending = false;
    this.phase = 'pointOver';
    this.phaseT = 0;
    (this as Match & { afterPoint?: () => void }).afterPoint = () => this.setupPoint();
  }

  private fault(text: 'FAULT' | 'NET') {
    (this as Match & { letPending?: boolean }).letPending = false;
    if (this.secondServe) {
      this.emit({ type: 'call', text: 'DOUBLE FAULT' });
      this.players[this.server].stats.doubleFaults++;
      this.secondServe = false;
      this.endPoint((1 - this.server) as Side, 'double_fault');
      return;
    }
    this.emit({ type: 'call', text: text === 'NET' ? 'NET' : 'FAULT' });
    this.secondServe = true;
    this.phase = 'pointOver';
    this.phaseT = 0;
    (this as Match & { afterPoint?: () => void }).afterPoint = () => this.setupPoint();
  }

  // ------------------------------------------------------------------ point end
  private pendingOutcome: ReturnType<typeof awardPoint> | null = null;
  private endPoint(winner: Side, reason: string) {
    if (this.phase === 'pointOver') return;
    this.secondServe = false;
    (this as Match & { letPending?: boolean }).letPending = false;
    const highlight = reason === 'ace' || (reason === 'winner' && (this.rally >= 6 || this.lastShotKind === 'smash' || this.lastShotKind === 'lob')) || this.rally >= 10;
    // net approach stat
    const w = this.players[winner];
    if (Math.abs(w.pos.z) < COURT.serviceLine + 1) w.stats.netPoints++;
    w.stats.pointsWon++;
    const tagBefore = matchPointFor(this.score, this.cfg) !== null;
    this.emit({ type: 'point', winner, reason, rally: this.rally, highlight: highlight || tagBefore });
    const out = awardPoint(this.score, winner, this.cfg);
    this.pendingOutcome = out;
    this.pointLog.push({ winner, reason });
    let tag: string | null = null;
    if (out.matchWon === null) {
      if (matchPointFor(this.score, this.cfg) !== null) tag = 'MATCH POINT';
      else if (setPointFor(this.score, this.cfg) !== null) tag = 'SET POINT';
      else if (breakPoint(this.score, this.cfg)) tag = 'BREAK POINT';
      else if (isDeuce(this.score)) tag = 'DEUCE';
      else if (this.score.tiebreak && out.gameWon === null && this.score.points[0] + this.score.points[1] === 0) tag = 'TIE-BREAK';
      else if (gamePointFor(this.score, this.cfg) !== null) tag = null;
    }
    this.emit({ type: 'score', call: out.call, gameWon: out.gameWon, setWon: out.setWon, matchWon: out.matchWon, tag });
    this.phase = 'pointOver';
    this.phaseT = 0;
    this.reactionDone = false;
    (this as Match & { afterPoint?: () => void }).afterPoint = () => {
      if (out.matchWon !== null) { this.phase = 'matchOver'; return; }
      if (out.changeEnds) {
        for (const p of this.players) p.end = (p.end * -1) as 1 | -1;
        this.emit({ type: 'changeEnds' });
      }
      this.setupPoint();
    };
  }

  private updatePointOver(dt: number) {
    // keep the ball alive (rolling) for a moment
    if (this.ball.active) {
      const e = this.ball.step(dt, this.surf());
      if (e?.type === 'bounce') this.emit({ type: 'bounce', pos: e.p, speed: e.speed, inCourt: true });
      if (Math.abs(this.ball.pos.z) > COURT.halfLength + 6) { this.ball.active = false; }
    }
    if (!this.reactionDone && this.phaseT > 0.35 && this.pendingOutcome) {
      this.reactionDone = true;
      const out = this.pendingOutcome;
      const lastWinner = this.pointLog[this.pointLog.length - 1]?.winner;
      for (const p of this.players) {
        p.charging = false; p.swingT = -1;
        if (p.side === lastWinner) p.athlete.play(out.matchWon !== null ? 'cheer' : out.gameWon !== null ? 'fist_pump' : 'fist_pump', { fade: 0.2 });
        else p.athlete.play(out.matchWon !== null ? 'frustrated' : 'frustrated', { fade: 0.2 });
      }
    }
    for (const p of this.players) {
      // decelerate
      p.vel.multiplyScalar(Math.max(0, 1 - dt * 6));
      p.pos.addScaledVector(p.vel, dt);
      if (p.athlete.oneShot && p.athlete.oneShotDone()) { p.athlete.releaseOneShot(0.3); p.athlete.play('idle'); }
    }
  }

  /** Called by the game loop when it is time to continue after a point (after banners/replay). */
  continueAfterPoint() {
    this.pendingOutcome = null;
    this.ball.active = false;
    const f = (this as Match & { afterPoint?: () => void }).afterPoint;
    (this as Match & { afterPoint?: () => void }).afterPoint = undefined;
    f?.();
  }

  // ------------------------------------------------------------------ movement
  private movePlayer(p: PlayerCtl, i: PadState, dt: number, scale: number) {
    // screen-relative: camera looks down -z from the human's end
    const camEnd = this.camEnd();
    const dirX = i.x * camEnd;
    const dirZ = -i.y * camEnd;
    const want = new THREE.Vector3(dirX, 0, dirZ).multiplyScalar(p.maxSpeed * scale);
    const acc = 22;
    p.vel.x += THREE.MathUtils.clamp(want.x - p.vel.x, -acc * dt, acc * dt);
    p.vel.z += THREE.MathUtils.clamp(want.z - p.vel.z, -acc * dt, acc * dt);
    this.integrate(p, dt);
  }

  private integrate(p: PlayerCtl, dt: number) {
    if (p.lockT > 0) { p.lockT -= dt; p.vel.multiplyScalar(0.8); }
    p.pos.addScaledVector(p.vel, dt);
    // stay on own half, behind the net
    const minZ = 0.9;
    if (p.end === 1) p.pos.z = THREE.MathUtils.clamp(p.pos.z, minZ, COURT.halfLength + 5.5);
    else p.pos.z = THREE.MathUtils.clamp(p.pos.z, -COURT.halfLength - 5.5, -minZ);
    p.pos.x = THREE.MathUtils.clamp(p.pos.x, -8.2, 8.2);
    this.animateLocomotion(p, dt);
  }

  private animateLocomotion(p: PlayerCtl, dt: number) {
    const sp = Math.hypot(p.vel.x, p.vel.z);
    const a = p.athlete;
    if (a.oneShot && !a.oneShotDone()) { this.faceNet(p, dt); return; }
    if (a.oneShot) a.releaseOneShot(0.15);
    if (sp > 4.6) { a.play('sprint', { fade: 0.15 }); a.setLocoSpeed(sp / 6.5); }
    else if (sp > 1.4) { a.play('run', { fade: 0.15 }); a.setLocoSpeed(Math.max(0.7, sp / 4.2)); }
    else if (sp > 0.3) { a.play('walk', { fade: 0.2 }); a.setLocoSpeed(sp / 1.3 + 0.4); }
    else a.play(this.phase === 'rally' ? 'ready' : 'idle', { fade: 0.25 });
    // face movement direction when running, otherwise face the net
    const netFacing = p.end === 1 ? Math.PI : 0;
    let target = netFacing;
    if (sp > 1.4 && !p.charging) target = Math.atan2(p.vel.x, p.vel.z);
    // don't turn fully backwards when back-pedalling
    let d = angleDiff(target, netFacing);
    if (Math.abs(d) > 1.9) target = netFacing + Math.sign(d) * 1.0 - (d > 0 ? Math.PI : -Math.PI) * 0;
    d = angleDiff(target, p.facing);
    p.facing += d * Math.min(1, dt * 12);
    p.athlete.root.rotation.y = p.facing;
  }

  private faceNet(p: PlayerCtl, dt: number) {
    const netFacing = p.end === 1 ? Math.PI : 0;
    p.facing += angleDiff(netFacing, p.facing) * Math.min(1, dt * 10);
    p.athlete.root.rotation.y = p.facing;
  }

  // ------------------------------------------------------------------ intercept prediction
  private computeIntercept(p: PlayerCtl): Intercept | null {
    if (this.lastHitter === p.side || !this.ball.active) return null;
    const path = predictPath(this.ball.state, this.surf(), 3.2, 1 / 90);
    const isReturnOfServe = this.isServeInFlight;
    let best: Intercept | null = null;
    let bestScore = Infinity;
    for (const s of path) {
      if (Math.sign(s.p.z) !== p.end) continue; // must be on my half
      if (s.bounces >= 2) break;
      const b0 = this.bouncesSinceHit + s.bounces;
      let kind: Intercept['kind'] | null = null;
      if (b0 === 1 && s.p.y > 0.25 && s.p.y < 1.75) kind = 'ground';
      else if (b0 === 0 && !isReturnOfServe && s.p.y >= 0.35 && s.p.y < 2.0 && Math.abs(s.p.z) < COURT.halfLength - 1) kind = 'volley';
      else if (b0 === 0 && !isReturnOfServe && s.p.y >= 2.0 && s.p.y < 3.4) kind = 'smash';
      if (!kind) continue;
      const contact = this.contactSpot(p, s.p, kind);
      const dist = Math.hypot(contact.x - p.pos.x, contact.z - p.pos.z);
      const need = Math.max(0, dist - 0.25) / (p.maxSpeed * 0.92) + 0.08 + (p.human ? 0 : p.aiReact);
      const feasible = need <= s.t;
      // prefer: feasible, comfortable height (~1m), not too early
      const comfort = Math.abs(s.p.y - (kind === 'smash' ? 2.6 : 1.0));
      const score = (feasible ? 0 : 100 + (need - s.t) * 10) + comfort * 1.5 + dist * 0.15 + (kind === 'volley' ? (p.human ? 0.4 : 0.8) : 0) + (kind === 'smash' ? -0.4 : 0);
      if (score < bestScore) { bestScore = score; best = { t: s.t, p: { ...s.p }, bounces: s.bounces, kind }; }
    }
    return best;
  }

  /** Where the player's feet should be to strike a ball at `bp`. */
  private contactSpot(p: PlayerCtl, bp: Vec3, kind: Intercept['kind']): THREE.Vector3 {
    const right = p.end === 1 ? 1 : -1; // world x of the player's right side
    const side = kind === 'smash' ? 0.35 : ((bp.x - p.pos.x) * right >= -0.1 ? 1 : -1);
    const reach = kind === 'smash' ? 0.35 : 0.95;
    return new THREE.Vector3(bp.x - side * reach * right, 0, bp.z + p.end * 0.25);
  }

  // ------------------------------------------------------------------ human control
  private updateHuman(p: PlayerCtl, i: PadState, dt: number) {
    if (this.lastHitter !== p.side && this.ball.active && !p.intercept && this.phaseT > 0.02) p.intercept = this.computeIntercept(p);
    if (p.intercept) p.intercept.t -= dt;
    const anyPress = this.pressed(p, i, 'shot') || this.pressed(p, i, 'slice') || this.pressed(p, i, 'lob');
    if (anyPress && this.lastHitter !== p.side && p.swingT < 0) {
      p.charging = true;
      p.chargeT = 0;
      p.chargeKind = i.lob ? 'lob' : i.slice ? (i.y < -0.5 ? 'drop' : 'slice') : 'drive';
      // refresh intercept with the latest ball state
      p.intercept = this.computeIntercept(p);
    }
    let scale = 1;
    if (p.charging) {
      p.chargeT += dt;
      scale = 0.55;
      // assist: pull toward the ideal contact spot
      if (p.intercept) {
        const spot = this.contactSpot(p, p.intercept.p, p.intercept.kind);
        const dx = spot.x - p.pos.x, dz = spot.z - p.pos.z;
        const d = Math.hypot(dx, dz);
        const assist = Math.min(d, 4.2 * dt);
        if (d > 0.02) { p.pos.x += (dx / d) * assist; p.pos.z += (dz / d) * assist * 0.8; }
        // trigger swing when the ball is about to arrive
        const anim = this.swingAnimFor(p, p.intercept);
        const lead = SWING_IMPACT[anim] ?? 0.2;
        if (p.intercept.t <= lead && p.swingT < 0) this.startSwing(p, anim, lead);
      }
    }
    this.movePlayer(p, i, dt, scale);
  }

  private swingAnimFor(p: PlayerCtl, ic: Intercept): AnimName {
    if (ic.kind === 'smash') return 'smash';
    if (ic.kind === 'volley') return 'volley';
    const right = p.end === 1 ? 1 : -1;
    return (ic.p.x - p.pos.x) * right >= -0.1 ? 'forehand' : 'backhand';
  }

  private startSwing(p: PlayerCtl, anim: AnimName, lead: number) {
    p.swingT = lead;
    p.swingAnim = anim;
    p.athlete.play(anim, { fade: 0.06 });
    this.emit({ type: 'swing', side: p.side, anim });
  }

  private updateSwing(p: PlayerCtl, dt: number) {
    if (p.swingT < 0) return;
    p.swingT -= dt;
    if (p.swingT > 0) return;
    // impact moment
    p.swingT = -1;
    const bp = this.ball.pos;
    const ic = p.intercept;
    p.charging = false;
    if (this.lastHitter === p.side) return;
    // where should the ball be relative to the player?
    const ideal = ic ? this.contactSpot(p, bp, ic.kind) : new THREE.Vector3(bp.x, 0, bp.z);
    const errLat = Math.hypot(ideal.x - p.pos.x, ideal.z - p.pos.z);
    const tooHigh = bp.y > (ic?.kind === 'smash' ? 3.6 : 2.2);
    const tooLow = bp.y < 0.12;
    const dz = (bp.z - p.pos.z) * p.end; // + means ball is behind the player
    if (errLat > 1.05 || tooHigh || tooLow || dz > 1.2 || Math.abs(bp.z - p.pos.z) > 2.0) {
      // whiff
      p.intercept = null;
      if (p.human) this.emit({ type: 'swing', side: p.side, anim: 'roll' });
      return;
    }
    this.strike(p, ic?.kind ?? 'ground', errLat);
  }

  private strike(p: PlayerCtl, kind: Intercept['kind'], posErr: number) {
    const o = this.opp(p.side);
    const ai = !p.human;
    const stats = p.def.stats;
    // aim: human from stick, AI from decision
    let aimX = 0, aimY = 0, shot: ShotKind = p.chargeKind;
    if (p.human) {
      const i = Input.read(p.pad);
      aimX = i.x * this.camEnd(); // screen-right aims screen-right
      aimY = i.y;
    } else if (p.aiDecision) {
      aimX = p.aiDecision.aim.x; aimY = p.aiDecision.aim.y; shot = p.aiDecision.kind;
    }
    if (kind === 'smash') shot = 'smash';
    else if (kind === 'volley' && shot === 'drive') shot = 'volley';

    // timing quality: longer charge = better (human). AI quality from difficulty.
    const charge = p.human ? THREE.MathUtils.clamp(p.chargeT / 0.75, 0, 1) : 0.55 + this.rng() * 0.4 - DIFFICULTY[p.diff].error * 0.15;
    const perfect = p.human ? p.chargeT > 0.6 && posErr < 0.35 : this.rng() < 0.12;
    const tech = stats.technique / 100, pow = stats.power / 100;
    const running = Math.hypot(p.vel.x, p.vel.z) / p.maxSpeed;
    const pressure = this.isBigPoint() ? 1 : 0;
    let err = (1 - charge) * 0.9 + posErr * 0.7 + running * 0.35 + (1 - tech) * 0.5 + pressure * 0.15;
    if (ai) err *= DIFFICULTY[p.diff].error;
    if (perfect) err *= 0.25;

    const from = { x: this.ball.pos.x, y: Math.max(0.35, this.ball.pos.y), z: this.ball.pos.z };
    const halfW = COURT.halfWidthSingles - 0.35;
    // default depth: deep; up = deeper, down = shorter angle
    let tz = o.end * (COURT.halfLength - 1.9 + aimY * 1.1);
    let tx = aimX * halfW * 0.92;
    // natural angle: mid-court contacts can go wider
    let speed = 0, spin = 0, minClear = 0.3, lob = false;
    switch (shot) {
      case 'drive': speed = 23 + charge * 11 + pow * 9; spin = 0.55 + tech * 0.5; minClear = 0.35 + (1 - charge) * 0.4; break;
      case 'slice': speed = 19 + charge * 6 + pow * 4; spin = -0.6; minClear = 0.2; break;
      case 'drop': speed = 10 + charge * 2; spin = -0.9; minClear = 0.3; tz = o.end * (2.2 + this.rng() * 1.2); break;
      case 'lob': speed = 15.5 + charge * 3; spin = 0.35; minClear = 2.2; lob = true; tz = o.end * (COURT.halfLength - 1.6 + aimY * 0.6); break;
      case 'volley': speed = 18 + charge * 8 + pow * 5; spin = -0.25; minClear = 0.15; tz = o.end * (COURT.halfLength - 3 + aimY * 2); tx = aimX * halfW; break;
      case 'smash': speed = 36 + pow * 10 + charge * 4; spin = 0.15; minClear = 0.05; tz = o.end * (COURT.halfLength - 3.5 + aimY * 2); break;
    }
    if (kind === 'volley' && shot === 'lob') { lob = true; }
    // error scatter
    const g = () => (this.rng() + this.rng() + this.rng() - 1.5) / 1.5;
    tx += g() * err * 1.6;
    tz += o.end * g() * err * 2.0 + o.end * Math.max(0, err - 0.9) * 1.2;
    // unforced errors: grows with difficulty, running, pressure and how close to the lines the shot was aimed
    const lineRisk = Math.max(0, Math.abs(aimX) - 0.6) * 0.12 + Math.max(0, aimY) * 0.05;
    const missChance = (ai ? DIFFICULTY[p.diff].miss : 0.02 + (1 - charge) * 0.06) + running * 0.05 + pressure * 0.03 + lineRisk + (shot === 'drive' ? charge * 0.02 : 0);
    let netMiss = false;
    if (this.rng() < missChance) {
      const r = this.rng();
      if (r < 0.4) tz = o.end * (COURT.halfLength + 0.3 + this.rng() * 1.4); // long
      else if (r < 0.75) tx = Math.sign(tx || (this.rng() - 0.5)) * (COURT.halfWidthSingles + 0.2 + this.rng() * 1.0); // wide
      else netMiss = true;
    }
    const sol = solveShot({ from, target: { x: tx, y: 0, z: tz }, speed, spin, minNetClear: minClear, lob });
    // extra mistakes: a poor contact can clip the tape (solver trajectories are clean otherwise)
    if (netMiss || (err > 0.8 && this.rng() < (err - 0.8) * 0.5)) sol.v.y = sol.v.y * 0.8 - 0.6;
    this.ball.set(from, sol.v, spin);
    this.lastHitter = p.side;
    this.bouncesSinceHit = 0;
    this.isServeInFlight = false;
    this.rally++;
    this.lastShotKind = shot;
    if (shot === 'smash') p.stats.smashes++;
    this.emit({ type: 'hit', side: p.side, kind: shot, power: charge, perfect, pos: from, speedKmh: this.ball.speedKmh() });
    this.onBallHit(p.side);
  }

  isBigPoint() {
    return gamePointFor(this.score, this.cfg) !== null && (breakPoint(this.score, this.cfg) || setPointFor(this.score, this.cfg) !== null);
  }

  // ------------------------------------------------------------------ AI
  private updateAI(p: PlayerCtl, dt: number) {
    const d = DIFFICULTY[p.diff];
    const incoming = this.lastHitter !== p.side && this.ball.active;
    if (incoming) {
      if (p.aiReact > 0) { p.aiReact -= dt; this.aiMoveTo(p, p.pos, dt); return; }
      if (!p.intercept || this.phaseT % 0.25 < dt) p.intercept = this.computeIntercept(p) ?? p.intercept;
      if (p.intercept) p.intercept.t -= dt;
      const ic = p.intercept;
      if (ic) {
        const spot = this.contactSpot(p, ic.p, ic.kind);
        this.aiMoveTo(p, spot, dt);
        if (!p.aiDecision) p.aiDecision = this.aiChooseShot(p, ic);
        const anim = this.swingAnimFor(p, ic);
        const lead = SWING_IMPACT[anim] ?? 0.2;
        if (ic.t <= lead && p.swingT < 0) { p.chargeT = 0.6; this.startSwing(p, anim, lead); }
      }
    } else {
      // recover: baseline centre, or net if attacking
      const o = this.opp(p.side);
      const attack = (p.def.stats.volley > 80 && this.lastShotKind !== 'lob' && this.rng() < d.aggression * 0.02) || Math.abs(p.pos.z) < COURT.serviceLine;
      const homeZ = attack && Math.abs(p.pos.z) < COURT.serviceLine + 2 ? p.end * 3.2 : p.end * (COURT.halfLength + 0.8);
      // shade toward the side the opponent is likely to hit
      const homeX = THREE.MathUtils.clamp(this.ball.pos.x * 0.35 + o.pos.x * 0.1, -2.5, 2.5);
      this.aiMoveTo(p, new THREE.Vector3(homeX, 0, homeZ), dt, 0.75);
    }
  }

  private aiMoveTo(p: PlayerCtl, target: THREE.Vector3, dt: number, urgency = 1) {
    const dx = target.x - p.pos.x, dz = target.z - p.pos.z;
    const d = Math.hypot(dx, dz);
    const sp = d < 0.1 ? 0 : Math.min(p.maxSpeed * urgency, d * 5);
    const want = d > 0.001 ? new THREE.Vector3((dx / d) * sp, 0, (dz / d) * sp) : new THREE.Vector3();
    const acc = 20;
    p.vel.x += THREE.MathUtils.clamp(want.x - p.vel.x, -acc * dt, acc * dt);
    p.vel.z += THREE.MathUtils.clamp(want.z - p.vel.z, -acc * dt, acc * dt);
    this.integrate(p, dt);
  }

  private aiChooseShot(p: PlayerCtl, ic: Intercept): { kind: ShotKind; aim: THREE.Vector2; at: number } {
    const d = DIFFICULTY[p.diff];
    const o = this.opp(p.side);
    const oppAtNet = Math.abs(o.pos.z) < COURT.serviceLine + 1.5;
    let kind: ShotKind = 'drive';
    const r = this.rng();
    if (ic.kind === 'smash') kind = 'smash';
    else if (ic.kind === 'volley') kind = r < 0.15 ? 'drop' : 'volley';
    else if (oppAtNet && r < 0.35) kind = 'lob';
    else if (r < 0.18) kind = 'slice';
    else if (r < 0.22 && Math.abs(ic.p.z) < COURT.serviceLine + 2) kind = 'drop';
    // aim away from the opponent, more aggressively at higher difficulty
    const oppSide = Math.sign(o.pos.x) || (this.rng() < 0.5 ? 1 : -1);
    const away = -oppSide * (0.4 + d.aggression * 0.55);
    const aimX = THREE.MathUtils.clamp(away + (this.rng() - 0.5) * 0.7, -1, 1);
    const aimY = (this.rng() - 0.4) * 0.8;
    return { kind, aim: new THREE.Vector2(aimX, aimY), at: this.time };
  }

  /** End of the court the camera sits behind (+1 near / -1 far). */
  camEnd(): 1 | -1 { return this.players[0].end; }

  // ------------------------------------------------------------------ info for HUD
  labels() { return pointLabels(this.score); }
}

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
