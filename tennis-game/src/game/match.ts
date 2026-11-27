import * as THREE from 'three';
import { Athlete, type AnimName } from './athlete';
import { Ball } from './ball';
import { COURT, isInside, predictPath, solveShot, type Vec3 } from './physics';
import { awardPoint, newScore, serviceCourt, gamePointFor, breakPoint, setPointFor, matchPointFor, isDeuce, pointLabels, type MatchConfig, type ScoreState, type Side } from './rules';
import { DIFFICULTY, type DifficultyId, type PlayerDef, type VenueDef } from '../data/content';
import { Input, type PadState } from '../core/input';
import { Save } from '../core/save';

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

// Contact data measured from the animation clips (tools/impact.html): time of racket-ball contact in the clip and
// where the racket head is at that instant relative to the feet (metres; right = player's right, fwd = toward net).
const SWING: Record<string, { impact: number; right: number; fwd: number; h: number; start?: number }> = {
  forehand: { impact: 0.245, right: 0.27, fwd: 1.08, h: 0.65 },
  backhand: { impact: 0.245, right: -0.29, fwd: 0.62, h: 0.78 }, // mirrored forehand, two hands
  volley: { impact: 0.255, right: 0.38, fwd: 1.16, h: 1.3 },
  smash: { impact: 0.385, right: 0.49, fwd: 0.48, h: 1.7 },
  // retarget of a motion-captured two-handed bat swing (optional asset): loaded power forehand
  bb_hit: { impact: 1.42, start: 1.08, right: 0.93, fwd: 0.08, h: 0.76 },
};
// serve: motion-captured overhand throw when available, else the overhead sword clip
const SERVE_CLIPS = {
  pitch: { start: 1.25, hold: 1.8, impact: 1.97, speed: 1.0, hop: 0.16 },
  smash: { start: 0, hold: 0.3, impact: 0.385, speed: 0.8, hop: 0.3 },
};
type ServeClip = keyof typeof SERVE_CLIPS;
const MAGNET = 0.14; // seconds before contact in which the ball is drawn onto the strings

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
  hopT = -1;
  interceptAge = 0;
  powerPick = false;
  predBounce: Vec3 | null = null;
  reactLoop: AnimName | null = null;
  prevVel = new THREE.Vector3();
  stats: MatchStats = { aces: 0, doubleFaults: 0, winners: 0, errors: 0, netPoints: 0, smashes: 0, maxServe: 0, pointsWon: 0 };
  prevInput: PadState = { x: 0, y: 0, shot: false, slice: false, lob: false };
  constructor(public side: Side, public def: PlayerDef, public human: boolean, public pad: 0 | 1, public diff: DifficultyId) {
    this.athlete = new Athlete(def);
  }
  get maxSpeed() { return 5.2 + (this.def.stats.speed / 100) * 2.4 * (this.human ? 1 : DIFFICULTY[this.diff].speed); }
}

type Inputs = Map<PlayerCtl, PadState | null>;
type Phase = 'idle' | 'preServe' | 'toss' | 'rally' | 'pointOver' | 'between' | 'matchOver';

export class Match {
  /** [team0 lead, team1 lead, team0 partner, team1 partner] (2 or 4 players). */
  players: PlayerCtl[];
  doubles = false;
  serverP!: PlayerCtl;
  receiverP!: PlayerCtl;
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

  constructor(p1: PlayerDef, p2: PlayerDef, public venue: VenueDef, public cfg: MatchConfig, opts: { p2Human: boolean; difficulty: DifficultyId; p1Difficulty?: DifficultyId; demo?: boolean; partners?: [PlayerDef, PlayerDef]; partnerDifficulty?: DifficultyId }, scene: THREE.Object3D) {
    this.players = [
      new PlayerCtl(0, p1, !opts.demo, 0, opts.p1Difficulty ?? 'normal'),
      new PlayerCtl(1, p2, opts.p2Human, 1, opts.difficulty),
    ];
    if (opts.partners) {
      this.doubles = true;
      this.players.push(new PlayerCtl(0, opts.partners[0], false, 0, opts.partnerDifficulty ?? 'normal'));
      this.players.push(new PlayerCtl(1, opts.partners[1], false, 1, opts.difficulty));
    }
    for (const p of this.players) p.end = p.side === 0 ? 1 : -1;
    for (const p of this.players) scene.add(p.athlete.root);
    this.ball = new Ball(scene);
    this.score = newScore(0);
    this.server = 0;
  }

  emit(e: MatchEvent) { this.events.push(e); }
  drain(): MatchEvent[] { const e = this.events; this.events = []; return e; }

  surf() { return this.venue.surface; }
  opp(s: Side): PlayerCtl { return this.players[1 - s]; }
  team(s: Side): PlayerCtl[] { return this.players.filter((p) => p.side === s); }
  mate(p: PlayerCtl): PlayerCtl | null { return this.players.find((q) => q.side === p.side && q !== p) ?? null; }
  /** Teammate that should play the incoming ball (doubles), refreshed while the ball travels. */
  responsible: [PlayerCtl | null, PlayerCtl | null] = [null, null];

  // ------------------------------------------------------------------ point setup
  start() {
    this.setupPoint();
  }

  setupPoint() {
    if (this.training) { this.setupTraining(); return; }
    const s = this.score;
    this.server = s.server;
    const court = serviceCourt(s);
    // who serves / receives: in doubles the four players take turns (A1, B1, A2, B2) and each receiver keeps a court
    const games = s.setHistory.reduce((a, g) => a + g[0] + g[1], 0) + s.games[0] + s.games[1];
    const sTeam = this.team(this.server), rTeam = this.team((1 - this.server) as Side);
    this.serverP = this.doubles ? sTeam[Math.floor(games / 2) % 2] : sTeam[0];
    this.receiverP = this.doubles ? rTeam[court === 'deuce' ? 0 : 1] : rTeam[0];
    for (const p of this.players) {
      const right = p.end === 1 ? 1 : -1; // world x of this end's right side
      const sx = court === 'deuce' ? right : -right; // server side for this end
      const isServer = p === this.serverP, isReceiver = p === this.receiverP;
      if (isServer) p.pos.set(sx * (this.doubles ? 2.0 : 0.7), 0, p.end * (COURT.halfLength + 0.25));
      else if (isReceiver) {
        p.pos.set(sx * (this.doubles ? 2.9 : 2.6), 0, p.end * (COURT.halfLength + (p.human ? 1.3 : 0.6)));
      } else if (p.side === this.server) {
        // server's partner waits at the net on the other half
        const svx = this.serverP.pos.x;
        p.pos.set(-Math.sign(svx || 1) * 2.7, 0, p.end * 3.4);
      } else {
        // receiver's partner on the service line of the other half
        p.pos.set(-Math.sign(this.receiverP.pos.x || 1) * 2.6, 0, p.end * 6.4);
      }
      p.vel.set(0, 0, 0);
      p.charging = false; p.chargeT = 0; p.swingT = -1; p.swingAnim = null; p.intercept = null; p.aiDecision = null; p.lockT = 0;
      p.facing = p.end === 1 ? Math.PI : 0;
      p.athlete.root.position.copy(p.pos);
      p.athlete.root.rotation.y = p.facing;
      p.athlete.releaseOneShot(0.1);
      p.athlete.play(isServer ? 'idle' : 'ready', { fade: 0.2 });
    }
    this.responsible = [null, null];
    this.ball.active = false;
    this.ball.visible = true;
    this.ball.held = this.serverP.athlete.bones.get('hand_l') ?? null;
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
    const inputs: Inputs = new Map(this.players.map((p) => [p, p.human ? Input.read(p.pad) : null]));

    switch (this.phase) {
      case 'preServe': this.updatePreServe(dt, inputs); break;
      case 'toss': this.updateToss(dt, inputs); break;
      case 'rally': this.updateRally(dt, inputs); break;
      case 'pointOver': this.updatePointOver(dt); break;
      default: break;
    }
    const ballVis = this.ball.visible ? this.ball.mesh.position : null;
    for (const p of this.players) {
      // serve hop
      let hop = 0;
      if (p.hopT >= 0) { p.hopT += dt; hop = Math.sin(Math.min(1, p.hopT / 0.55) * Math.PI) * SERVE_CLIPS[this.serveClip(p)].hop; if (p.hopT > 0.55) p.hopT = -1; }
      p.athlete.root.position.set(p.pos.x, hop, p.pos.z);
      // body language: legs follow movement, chest and eyes stay on the play
      const o = this.opp(p.side);
      p.athlete.lookAt = ballVis && (this.phase === 'rally' || this.phase === 'toss') ? ballVis : o.athlete.root.position.clone().add(new THREE.Vector3(0, 1.6, 0));
      p.athlete.chestYaw = p.athlete.oneShot ? null : p.end === 1 ? Math.PI : 0;
      const ax = (p.vel.x - p.prevVel.x) / dt, az = (p.vel.z - p.prevVel.z) / dt;
      p.athlete.accel.set(p.athlete.accel.x * 0.85 + ax * 0.15, 0, p.athlete.accel.z * 0.85 + az * 0.15);
      p.prevVel.copy(p.vel);
      p.athlete.update(dt);
      if (p.human) p.prevInput = inputs.get(p) ?? p.prevInput;
    }
    this.ball.sync(dt);
    // contact magnet: in the last instants of a swing the ball is drawn onto the racket strings
    for (const p of this.players) {
      if (p.swingT >= 0 && p.swingT < MAGNET && this.lastHitter !== p.side && this.ball.visible) {
        const k = 1 - p.swingT / MAGNET;
        const head = p.athlete.racketHeadWorld(new THREE.Vector3());
        if (head.distanceTo(this.ball.mesh.position) < 1.6) this.ball.mesh.position.lerp(head, k * k * 0.92);
      }
      if (this.phase === 'toss' && p === this.serverP && !this.tossHeld) {
        const act = p.athlete.oneShot;
        if (act) {
          const sc = SERVE_CLIPS[this.serveClip(p)];
          const k = THREE.MathUtils.clamp((act.time - sc.hold) / (sc.impact - sc.hold), 0, 1);
          this.ball.mesh.position.lerp(p.athlete.racketHeadWorld(new THREE.Vector3()), k * k * 0.9);
        }
      }
    }
  }

  private pressed(p: PlayerCtl, i: PadState | null, key: 'shot' | 'slice' | 'lob') {
    return !!i && i[key] && !p.prevInput[key];
  }

  // ------------------------------------------------------------------ serve
  private updatePreServe(dt: number, inputs: Inputs) {
    const sv = this.serverP;
    const i = inputs.get(this.serverP) ?? null;
    // server may shuffle along the baseline
    const court = serviceCourt(this.score);
    const right = sv.end === 1 ? 1 : -1;
    const sx = court === 'deuce' ? right : -right;
    if (i) {
      sv.pos.x = THREE.MathUtils.clamp(sv.pos.x + i.x * dt * 2.2, sx > 0 ? 0.25 : -3.6, sx > 0 ? 3.6 : -0.25);
      if (this.phaseT > 0.4 && (this.pressed(sv, i, 'shot') || this.pressed(sv, i, 'slice') || this.pressed(sv, i, 'lob'))) this.beginToss();
    } else if (this.phaseT > 1.4 + this.rng() * 0.6) {
      sv.pos.x = sx * (this.doubles ? 1.6 + this.rng() * 0.8 : 0.5 + this.rng() * 0.8);
      this.beginToss();
    }
    // receiver AI/human can adjust
    const rc = this.receiverP;
    const ri = inputs.get(rc) ?? null;
    if (ri) this.movePlayer(rc, ri, dt, 1);
    else rc.athlete.setLoco(0, true);
    sv.athlete.setLoco(0, false);
    this.faceNet(sv, dt);
    this.faceNet(rc, dt);
    for (const p of this.players) if (p !== sv && p !== rc) { p.athlete.setLoco(0, true); this.faceNet(p, dt); }
  }

  private beginToss() {
    const sv = this.serverP;
    this.phase = 'toss';
    this.phaseT = 0;
    this.serveMeter = 0;
    this.serveMeterDir = 1;
    this.tossHeld = true;
    const sc = SERVE_CLIPS[this.serveClip(sv)];
    sv.athlete.play(this.serveClip(sv), { fade: 0.18, speed: sc.speed, from: sc.start });
    // toss: ball leaves the left hand, rises in front of the hitting shoulder
    const hand = new THREE.Vector3();
    (sv.athlete.bones.get('hand_l') ?? sv.athlete.root).getWorldPosition(hand);
    const pitch = this.serveClip(sv) === 'pitch';
    this.ball.set({ x: sv.pos.x + (pitch ? -0.3 : 0.45) * sv.end, y: Math.max(1.3, hand.y), z: sv.pos.z - sv.end * (pitch ? 0.3 : 0.35) }, { x: (pitch ? 0 : 0.12) * sv.end, y: pitch ? 4.6 : 5.0, z: 0 }, 0);
    this.serveAim.set(0, 0);
    this.emit({ type: 'meter', side: this.server, value: 0 });
  }

  private updateToss(dt: number, inputs: Inputs) {
    const sv = this.serverP;
    const i = inputs.get(this.serverP) ?? null;
    // ball physics during toss (no ground)
    const st = this.ball.state;
    st.v.y -= 9.81 * dt;
    st.p.y += st.v.y * dt;
    // serve animation holds the trophy pose until the hit
    const act = sv.athlete.oneShot;
    const scT = SERVE_CLIPS[this.serveClip(sv)];
    if (act && this.tossHeld && act.time >= scT.hold) act.setEffectiveTimeScale(0.04);
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
      act?.setEffectiveTimeScale(1.25);
      sv.hopT = 0;
      (sv as PlayerCtl & { meterAtHit?: number }).meterAtHit = meterValue;
    }
    // impact
    if (!this.tossHeld && act && act.time >= scT.impact) {
      this.hitServe(sv, (sv as PlayerCtl & { meterAtHit?: number }).meterAtHit ?? 0.5);
      return;
    }
    if (st.p.x !== 0) st.p.x += st.v.x * dt;
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
    const rc = this.receiverP;
    // target inside the diagonal service box
    const rRight = rc.end === 1 ? 1 : -1;
    const boxSign = court === 'deuce' ? rRight : -rRight;
    const aimX = this.serveAim.x * this.camEnd();
    const tx = boxSign * (2.05 + aimX * boxSign * 1.75);
    const depth = COURT.serviceLine - 0.55 - Math.max(0, -this.serveAim.y) * 1.6;
    const perfect = meter > 0.94;
    const stat = sv.def.stats.serve / 100;
    const second = this.secondServe;
    const speedKmh = (second ? 115 : 135) + stat * (second ? 28 : 58) * meter + (sv.human ? 8 : 0);
    const err = (1 - meter) * (second ? 0.6 : 1.4) + (perfect ? 0 : 0.12) + (sv.human ? 0 : DIFFICULTY[sv.diff].error * 0.12);
    const target = { x: tx + (this.rng() - 0.5) * err * 1.6, y: 0, z: rc.end * (depth + (this.rng() - 0.35) * err * 1.8) };
    const head = sv.athlete.racketHeadWorld(new THREE.Vector3());
    const from = { x: head.x, y: Math.max(2.35, head.y) + stat * 0.15, z: head.z };
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
    // the other team plans an intercept
    for (const r of this.team((1 - side) as Side)) {
      r.intercept = null;
      r.aiDecision = null;
      r.aiReact = r.human ? 0 : DIFFICULTY[r.diff].reaction * (0.7 + this.rng() * 0.6);
      r.powerPick = !r.human && this.rng() < DIFFICULTY[r.diff].aggression * 0.45;
    }
    for (const h of this.team(side)) { h.intercept = null; h.charging = false; }
    this.responsible = [null, null];
    this.respT = 0;
  }

  private respT = 0;
  /** Doubles: decide which member of the receiving team plays the ball (the one who gets there most comfortably). */
  private updateResponsibility(dt: number) {
    if (!this.doubles || this.lastHitter === null) return;
    const rs = (1 - this.lastHitter) as Side;
    this.respT -= dt;
    const cur = this.responsible[rs];
    if (cur && (cur.swingT >= 0 || this.respT > 0)) return;
    this.respT = 0.15;
    let best: PlayerCtl | null = null, bestScore = Infinity;
    for (const p of this.team(rs)) {
      const ic = this.computeIntercept(p);
      if (!ic) continue;
      const spot = this.contactSpot(p, ic.p, ic.kind);
      const dist = Math.hypot(spot.x - p.pos.x, spot.z - p.pos.z);
      const score = dist / p.maxSpeed - ic.t + (p === cur ? -0.08 : 0); // slight hysteresis
      if (score < bestScore) { bestScore = score; best = p; }
    }
    if (best) this.responsible[rs] = best;
  }

  private updateRally(dt: number, inputs: Inputs) {
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
      this.updateHuman(pl, inputs.get(pl)!, dt);
      this.updateSwing(pl, dt);
      return;
    }
    // ball left the stadium area
    const p = this.ball.pos;
    if (Math.abs(p.z) > COURT.halfLength + 8 || Math.abs(p.x) > 11) this.ballDead('out_of_area');
    if (this.phase !== 'rally') return;

    this.updateResponsibility(dt);
    for (const pl of this.players) {
      const i = inputs.get(pl) ?? null;
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
        inCourt = isInside(e.p, targetHalf, this.doubles ? 'doubles' : 'singles');
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
      this.serverP.stats.doubleFaults++;
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
        const pick = <T,>(xs: T[]) => xs[Math.floor(this.rng() * xs.length)];
        if (p.side === lastWinner) p.athlete.play(out.matchWon !== null ? 'cheer' : out.gameWon !== null ? pick<AnimName>(['cheer', 'fist_pump']) : pick<AnimName>(['fist_pump', 'fist_pump', 'point']), { fade: 0.2 });
        else { p.athlete.play(pick<AnimName>(['frustrated', 'frustrated', 'land']), { fade: 0.2 }); p.reactLoop = pick<AnimName>(['upset', 'arms_folded', 'idle']); }
      }
    }
    for (const p of this.players) {
      // decelerate
      p.vel.multiplyScalar(Math.max(0, 1 - dt * 6));
      p.pos.addScaledVector(p.vel, dt);
      if (p.athlete.oneShot && p.athlete.oneShotDone()) { p.athlete.releaseOneShot(0.35); p.athlete.play(p.reactLoop ?? 'idle', { fade: 0.35 }); }
      if (!p.athlete.oneShot && this.reactionDone) p.athlete.play(p.reactLoop ?? 'idle', { fade: 0.35 });
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
    p.reactLoop = null;
    const swinging = a.oneShot && !a.oneShotDone();
    if (a.oneShot && !swinging) a.releaseOneShot(0.22);
    a.setLoco(sp, this.phase === 'rally' || this.phase === 'preServe');
    const netFacing = p.end === 1 ? Math.PI : 0;
    if (swinging) { this.faceNet(p, dt); return; }
    // legs face the direction of travel when moving fast; the chest twist (procedural) keeps the body on the net
    let target = netFacing;
    if (sp > 1.2 && !p.charging) target = Math.atan2(p.vel.x, p.vel.z);
    let d = angleDiff(target, netFacing);
    // back-pedal: keep facing the net instead of turning the back to it
    if (Math.abs(d) > 2.2) target = netFacing; else if (Math.abs(d) > 1.6) target = netFacing + Math.sign(d) * 1.6;
    d = angleDiff(target, p.facing);
    p.facing += d * Math.min(1, dt * 9);
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
    p.predBounce = null;
    for (const s of path) {
      if (!p.predBounce && this.bouncesSinceHit === 0 && s.bounces === 1) p.predBounce = { ...s.p, y: 0 };
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
      const comfort = Math.abs(s.p.y - (kind === 'smash' ? 2.0 : kind === 'volley' ? 1.25 : 0.7));
      const score = (feasible ? 0 : 100 + (need - s.t) * 10) + comfort * 1.5 + dist * 0.15 + (kind === 'volley' ? (p.human ? 0.4 : 0.8) : 0) + (kind === 'smash' ? -0.4 : 0);
      if (score < bestScore) { bestScore = score; best = { t: s.t, p: { ...s.p }, bounces: s.bounces, kind }; }
    }
    return best;
  }

  /** Where the player's feet should be to strike a ball at `bp` with the swing chosen for it. */
  private contactSpot(p: PlayerCtl, bp: Vec3, kind: Intercept['kind']): THREE.Vector3 {
    const sw = SWING[this.swingAnimFor(p, { t: 0, p: bp, bounces: 0, kind })];
    // right side of a player at the near end (facing -z) is +x; the net is -z
    return new THREE.Vector3(bp.x - sw.right * p.end, 0, bp.z + sw.fwd * p.end);
  }

  // ------------------------------------------------------------------ human control
  private updateHuman(p: PlayerCtl, i: PadState, dt: number) {
    const incoming = this.lastHitter !== p.side && this.ball.active;
    const pressedAny = this.pressed(p, i, 'shot') || this.pressed(p, i, 'slice') || this.pressed(p, i, 'lob');
    // presses are buffered: pressing while the opponent is still hitting already starts charging (like arcade tennis)
    if (pressedAny && p.swingT < 0) {
      p.charging = true;
      p.chargeT = 0;
      p.chargeKind = i.lob ? 'lob' : i.slice ? (i.y < -0.5 ? 'drop' : 'slice') : 'drive';
    }
    if (p.charging) p.chargeT += dt;
    // keep the predicted contact fresh (spin and bounces change the path)
    if (incoming) {
      p.interceptAge += dt;
      if (p.swingT < 0 && (!p.intercept || p.interceptAge > 0.12)) {
        const ic = this.computeIntercept(p);
        if (ic) { p.intercept = ic; p.interceptAge = 0; } else if (p.intercept) p.intercept.t -= dt;
      } else if (p.intercept) p.intercept.t -= dt;
    } else if (p.swingT < 0) { p.intercept = null; }
    const ic = p.intercept;
    const stick = Math.hypot(i.x, i.y) > 0.25;
    if (ic && incoming && p.swingT < 0) {
      const spot = this.contactSpot(p, ic.p, ic.kind);
      // auto-positioning: full when charging, gentle when the stick is idle (Opções > Assistência)
      const mine = !this.doubles || this.responsible[p.side] === p;
      const assist = p.charging ? 1 : !stick && Save.data.options.assist && mine ? 0.85 : 0;
      if (assist > 0) {
        if (stick) { const camEnd = this.camEnd(); spot.x += i.x * camEnd * 0.6; spot.z += -i.y * camEnd * 0.4; }
        this.aiMoveTo(p, spot, dt, assist * 1.08);
      } else this.movePlayer(p, i, dt, 1);
      if (p.charging) {
        const anim = this.swingAnimFor(p, ic);
        const lead = this.swingLead(anim);
        // late press: start the swing part-way through so the contact still lines up with the ball
        if (ic.t <= lead) this.startSwing(p, anim, Math.max(0.03, ic.t), (SWING[anim]?.start ?? 0) + Math.max(0, lead - ic.t));
      }
    } else {
      this.movePlayer(p, i, dt, p.swingT >= 0 ? 0.35 : p.charging ? 0.8 : 1);
    }
  }

  private serveClip(p: PlayerCtl): ServeClip { return p.athlete.actions.has('pitch') ? 'pitch' : 'smash'; }

  /** Clip lead time (start -> contact) for a swing. */
  private swingLead(anim: AnimName) { const sw = SWING[anim]; return sw ? sw.impact - (sw.start ?? 0) : 0.24; }

  private swingAnimFor(p: PlayerCtl, ic: Intercept): AnimName {
    if (ic.kind === 'smash') return 'smash';
    if (ic.kind === 'volley') return 'volley';
    const fore = (ic.p.x - p.pos.x) * p.end >= -0.15;
    if (fore && p.athlete.actions.has('bb_hit') && ic.kind === 'ground' && ic.p.y < 1.3 && (p.human ? p.chargeT > 0.45 && p.chargeKind === 'drive' : p.powerPick)) return 'bb_hit';
    return fore ? 'forehand' : 'backhand';
  }

  private startSwing(p: PlayerCtl, anim: AnimName, lead: number, from = 0) {
    p.swingT = lead;
    p.swingAnim = anim;
    p.athlete.play(anim, { fade: from > 0 ? 0.03 : 0.06, from });
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
    if (errLat > (p.human ? 1.7 : 1.2) || tooHigh || tooLow || dz > 1.6 || Math.abs(bp.z - p.pos.z) > 2.4) {
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

    // the ball leaves from the strings (it was drawn onto them by the contact magnet)
    const head = p.athlete.racketHeadWorld(new THREE.Vector3());
    const bp0 = new THREE.Vector3(this.ball.pos.x, this.ball.pos.y, this.ball.pos.z);
    if (head.distanceTo(bp0) < 1.6) bp0.lerp(head, 0.85);
    const from = { x: bp0.x, y: Math.max(0.35, bp0.y), z: bp0.z };
    const halfW = COURT.halfWidthSingles - 0.35;
    // default depth: deep; up = deeper, down = shorter angle
    let tz = o.end * (COURT.halfLength - 1.9 + aimY * 1.1);
    let tx = aimX * halfW * 0.92;
    // natural angle: mid-court contacts can go wider
    let speed = 0, spin = 0, minClear = 0.3, lob = false;
    switch (shot) {
      case 'drive': speed = 23 + charge * 11 + pow * 9 + (p.swingAnim === 'bb_hit' ? 5 : 0); spin = 0.55 + tech * 0.5; minClear = 0.35 + (1 - charge) * 0.4; break;
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
    if (this.doubles && !(incoming && this.responsible[p.side] === p)) { this.doublesSupport(p, incoming, dt); return; }
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
        const lead = this.swingLead(anim);
        if (ic.t <= lead && p.swingT < 0) { p.chargeT = 0.6; this.startSwing(p, anim, lead, SWING[anim]?.start ?? 0); }
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

  /** Doubles positioning for the player not playing the ball: one up, one back, covering the open half. */
  private doublesSupport(p: PlayerCtl, incoming: boolean, dt: number) {
    const mate = this.mate(p)!;
    const atNet = Math.abs(p.pos.z) < Math.abs(mate.pos.z) - 0.5 || (Math.abs(p.pos.z) < 6 && Math.abs(mate.pos.z) >= 6);
    const ref = incoming ? (this.responsible[p.side] ?? mate) : mate;
    const side = -Math.sign(ref.pos.x || (p.pos.x >= 0 ? -1 : 1));
    const x = THREE.MathUtils.clamp(side * 2.4 + this.ball.pos.x * 0.25, -4.6, 4.6);
    const z = p.end * (atNet ? 3.3 : COURT.halfLength + 0.4);
    if (incoming && !this.responsible[p.side]) { this.aiMoveTo(p, new THREE.Vector3(p.pos.x, 0, p.pos.z), dt, 0.5); return; }
    this.aiMoveTo(p, new THREE.Vector3(x, 0, z), dt, 0.85);
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

  /** Where the player should stand for their current intercept (receiving hint). */
  hintSpot(p: PlayerCtl): THREE.Vector3 | null { return p.intercept ? this.contactSpot(p, p.intercept.p, p.intercept.kind) : null; }

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
