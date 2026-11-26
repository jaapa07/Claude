import * as THREE from 'three';
import type { World } from '../game/World';
import { Athlete, clipMeta } from '../game/Athlete';
import { input, type DeviceId } from '../core/Input';
import { audio } from '../core/Audio';
import { settings } from '../core/Save';
import { t } from '../core/Strings';
import { FX } from '../vfx/Effects';
import { Hud } from '../ui/Hud';
import { Ball, BALL_R, FIELD, ballistic } from './Ball';
import { Team } from './Team';
import { Player, type KickKind, type TeamData } from './Player';
import { CameraDirector } from './Camera';
import { Replay } from './Replay';
import { assets } from '../core/Assets';
import { teamAI, gkAI } from './AI';
import MOVES from '../data/moves.json';
import { makeMini, type MiniGame, type MiniKind } from './MiniGames';

export type MatchMode = 'friendly' | 'cup' | 'training' | 'mini';
export type MatchOpts = {
  home: TeamData; away: TeamData; homeKit: 'home' | 'away'; awayKit: 'home' | 'away'; arena: string;
  homeDevices: DeviceId[]; awayDevices: DeviceId[]; mode: MatchMode; label?: string; noDraw?: boolean; mini?: MiniKind;
};
export type MatchResult = { home: Team; away: Team; winner: Team | null; pens: boolean; extra: boolean; mom: Player };

type State = 'intro' | 'kickoff' | 'play' | 'setpiece' | 'goal' | 'replay' | 'periodEnd' | 'halftime' | 'fulltime' | 'penalties' | 'done';
type SetPiece = { kind: 'throw_in' | 'corner' | 'goal_kick' | 'free_kick' | 'penalty' | 'kickoff'; team: Team; taker: Player; spot: THREE.Vector3; t: number };

const STYLE = MOVES.style as Record<string, number>;
const LABEL: Partial<Record<KickKind, string>> = { bicycle_kick: 'bicycle', scissor_kick: 'scissor', volley: 'volley', header: 'header', diving_header: 'diving_header', sombrero_flick: 'sombrero', long_throw: 'long_throw' };
const v3 = () => new THREE.Vector3();

/** velocidade inicial para a bola rolar d metros na areia e chegar com 'arrive' m/s (modelo de atrito do Ball) */
function rollSpeedFor(d: number, arrive: number) {
  let lo = arrive, hi = 40;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (rollDist(mid, arrive) < d) lo = mid; else hi = mid; }
  return hi;
}
function rollDist(v0: number, vEnd: number) { let v = v0, x = 0; const h = 1 / 60; while (v > vEnd && x < 80) { v -= (3.2 + v * 0.35) * h; x += v * h; } return x; }
function rollTime(v0: number, d: number) { let v = v0, x = 0, t = 0; const h = 1 / 60; while (x < d && v > 0.3 && t < 5) { v -= (3.2 + v * 0.35) * h; x += v * h; t += h; } return t; }

export class Match {
  world: World;
  opts: MatchOpts;
  teams: [Team, Team];
  ball: Ball;
  ref: Athlete;
  refPos = new THREE.Vector3(0, 0, -10);
  refYaw = 0;
  fx = new FX();
  cam: CameraDirector;
  hud: Hud;
  replay = new Replay();
  state: State = 'intro';
  stateT = 0;
  period = 1;
  clock = 0;
  periodLen = 720;
  timeScale = 4;
  extra = false;
  sp: SetPiece | null = null;
  paused = false;
  slowmo = 1;
  difficulty = settings.data.difficulty;
  lastKick: { kind: KickKind; by: Player } | null = null;
  lastScorer: Player | null = null;
  lastGoalKind: KickKind | null = null;
  dancers: Athlete[] = [];
  onEnd?: (r: MatchResult) => void;
  onHalftime?: (show: boolean) => void;
  onEvent?: (e: string, p?: Player, extra?: any) => void;
  kickoffTeam: Team;
  pens: { taker: number; kicks: [boolean[], boolean[]]; turn: 0 | 1; phase: 'aim' | 'flight' | 'result'; t: number } | null = null;
  saveRolled = false;
  shotOnTarget = false;
  introStep = -1;
  trainingCones: THREE.Object3D[] = [];
  group = new THREE.Group();
  mini: MiniGame | null = null;
  /** Temporizadores em tempo de jogo (respeitam pausa, câmera lenta e aceleração). */
  private timers: { t: number; fn: () => void }[] = [];
  later(sec: number, fn: () => void) { this.timers.push({ t: sec, fn }); }
  private runTimers(dt: number) {
    if (!this.timers.length) return;
    const due: (() => void)[] = [];
    this.timers = this.timers.filter((x) => { x.t -= dt; if (x.t <= 0) { due.push(x.fn); return false; } return true; });
    for (const fn of due) fn();
  }
  private refT = 0;
  private dancerOn = false;
  private posses: (Team | null) = null;

  constructor(world: World, opts: MatchOpts) {
    this.world = world;
    this.opts = opts;
    const home = new Team(0, opts.home, opts.homeKit);
    const away = new Team(1, opts.away, opts.awayKit);
    home.opp = away; away.opp = home;
    home.devices = opts.homeDevices; away.devices = opts.awayDevices;
    const diff = settings.data.difficulty;
    for (const tm of [home, away]) tm.speedMul = tm.human ? 1 : [0.9, 1.0, 1.07][diff];
    this.teams = [home, away];
    home.build(); away.build();
    this.kickoffTeam = home;
    this.ball = new Ball();
    this.ref = new Athlete(Math.random() < 0.5 ? 'textures/kits/referee_0.webp' : 'textures/kits/referee_1.webp');
    this.cam = new CameraDirector(world.camera);
    this.hud = new Hud(home, away);
    this.periodLen = 720;
    this.timeScale = 720 / (settings.data.periodMinutes * 60);
    for (const tm of this.teams) for (const p of tm.players) this.group.add(p.ath.root);
    this.group.add(this.ref.root, this.ball.mesh, this.ball.shadow, this.ball.trail.mesh, this.fx.group);
    world.root.add(this.group);
    home.dir = 1; away.dir = -1;
    if (opts.mode === 'training') this.setupTraining();
    if (opts.mode === 'mini' && opts.mini) { this.mini = makeMini(opts.mini); this.mini.attach(this); }
  }

  get all(): Player[] { return [...this.teams[0].players, ...this.teams[1].players]; }
  get onField(): Player[] { return this.all.filter((p) => p.onField); }
  goalX(tm: Team) { return tm.dir * FIELD.HL; } // gol que o time ataca
  ownGoalX(tm: Team) { return -tm.dir * FIELD.HL; }

  dispose() {
    this.world.root.remove(this.group);
    this.hud.unmount();
    for (const d of this.dancers) d.dispose();
    this.world.after.enabled = false;
    this.world.grade.uniforms.flash.value = 0;
  }

  // ------------------------------------------------------------------ início
  start(withIntro = true) {
    this.hud.mount(document.getElementById('ui')!);
    this.formation(this.kickoffTeam, true);
    this.hud.setScore(0, 0);
    audio.crowd(true);
    audio.playMusic(null);
    if (this.mini) { this.mini.start(); return; }
    if (this.opts.mode === 'training') {
      const me = this.teams[0].players[4];
      me.device = this.teams[0].devices[0] ?? null;
      me.pos.set(-4, 0, 2); me.sync();
      this.hud.show(false);
      this.cam.broadcast(true);
      this.trainingReset();
    } else if (withIntro) this.beginIntro();
    else this.beginKickoff(this.kickoffTeam);
  }

  private beginIntro() {
    this.state = 'intro'; this.stateT = 0; this.introStep = -1;
    this.hud.show(false); this.hud.cinema(true);
    // aquecimento: espalha jogadores no campo
    const all = this.all;
    all.forEach((p, i) => {
      const s = p.team.side === 0 ? -1 : 1;
      p.pos.set(s * (3 + (i % 5) * 2.6), 0, -6 + ((i * 7) % 11));
      p.yaw = Math.random() * 6;
      p.ath.play(['stretch', 'freestyle', 'warmup_jacks', 'knee_juggle', 'idle'][i % 5], 0);
      p.sync();
    });
    this.ball.place(-3, 2, 0.6);
  }

  private updateIntro(dt: number) {
    const T = this.stateT;
    const steps = [0, 4.2, 8.4, 12.6, 16];
    let step = steps.findIndex((s, i) => T >= s && T < (steps[i + 1] ?? 1e9));
    if (input.menu.start && T > 0.5) step = 4;
    if (step !== this.introStep) {
      this.introStep = step;
      const H = FIELD.HL;
      if (step === 0) {
        this.cam.playPath([{ p: new THREE.Vector3(-70, 45, 70), l: new THREE.Vector3(0, 0, 0), t: 0 }, { p: new THREE.Vector3(10, 28, 55), l: new THREE.Vector3(0, 4, -10), t: 4.2 }]);
        this.hud.lower(null);
      } else if (step === 1) {
        const p = this.teams[0].players[4];
        p.pos.set(-4, 0, 3); p.yaw = 0.4; p.ath.play('juggle', 0); p.sync();
        this.ball.place(-3.6, 3.5, 1.0);
        this.cam.playPath([{ p: new THREE.Vector3(-1.5, 1.6, 7.5), l: new THREE.Vector3(-4, 1.2, 3), t: 0 }, { p: new THREE.Vector3(-6.5, 1.4, 7.0), l: new THREE.Vector3(-4, 1.3, 3), t: 4.2 }]);
        this.hud.lower(p, 'Aquecimento');
      } else if (step === 2) {
        const p = this.teams[1].players[4];
        p.pos.set(5, 0, 2); p.yaw = -0.5; p.ath.play('stretch', 0); p.sync();
        this.cam.playPath([{ p: new THREE.Vector3(8.5, 2.2, 7.5), l: new THREE.Vector3(5, 1.0, 2), t: 0 }, { p: new THREE.Vector3(3, 1.8, 7.8), l: new THREE.Vector3(5, 1.1, 2), t: 4.2 }]);
        this.hud.lower(p, 'Aquecimento');
      } else if (step === 3) {
        // perfilados
        this.teams.forEach((tm, s) => tm.players.forEach((p, i) => {
          p.pos.set((s === 0 ? -1 : 1) * (1.6 + i * 1.3), 0, 4.5); p.yaw = 0; p.ath.play('lineup', 0.2); p.sync();
        }));
        this.refPos.set(0, 0, 4.5); this.refYaw = 0;
        this.ball.place(0, 4.0, BALL_R);
        this.cam.playPath([{ p: new THREE.Vector3(-12, 2.0, 12), l: new THREE.Vector3(-4, 1.3, 4.5), t: 0 }, { p: new THREE.Vector3(12, 2.0, 12), l: new THREE.Vector3(4, 1.3, 4.5), t: 4.2 }]);
        this.hud.lower(null);
        audio.crowdReact('applause', 0.7);
        void H;
      } else if (step === 4) {
        this.hud.cinema(false); this.hud.show(true); this.hud.lower(null);
        this.beginKickoff(this.kickoffTeam);
      }
    }
    for (const p of this.all) { p.ath.update(dt); p.sync(); }
  }

  // ------------------------------------------------------------------ formação / saída
  formation(kickTeam: Team, snap: boolean) {
    for (const tm of this.teams) {
      const d = tm.dir;
      const f = tm.formation;
      const spots = f === '2-2' ? [[-16.5, 0], [-7, -5], [-7, 5], [-3, -8], [-3, 8]]
        : f === '1-1-2' ? [[-16.5, 0], [-8, 0], [-4.5, -7], [-2.2, -3.5], [-2.2, 3.5]]
          : [[-16.5, 0], [-8, 0], [-4.5, -7], [-4.5, 7], [-1.6, 0]];
      tm.players.forEach((p, i) => {
        const [u, v] = spots[p.slot] ?? spots[i];
        let x = d * u, z = v;
        if (tm === kickTeam && p.slot === 4) { x = -d * 0.4; z = 0; }
        if (tm !== kickTeam && Math.hypot(x, z) < 5.2) { x = d * -5.5; }
        p.target.set(x, 0, z);
        if (snap) { p.pos.set(x, 0, z); p.vel.set(0, 0, 0); p.yaw = Math.atan2(d, 0); p.kick = null; p.stun = 0; p.lying = null; p.sliding = 0; p.ath.play(p.isGK ? 'gk_idle' : 'idle', 0); p.sync(); }
      });
    }
    this.refPos.set(0, 0, -6); this.refYaw = 0;
  }

  beginKickoff(team: Team) {
    this.state = 'kickoff'; this.stateT = 0; this.pendingSave = null;
    this.kickoffTeam = team;
    this.formation(team, true);
    const taker = team.players.find((p) => p.slot === 4 && p.onField) ?? team.field[1];
    this.ball.place(0, 0);
    this.ball.owner = null;
    this.sp = { kind: 'kickoff', team, taker, spot: v3(), t: 0 };
    taker.pos.set(-team.dir * 0.45, 0, 0); taker.yaw = Math.atan2(team.dir, 0); taker.sync();
    this.giveControl(taker);
    this.cam.broadcast(true);
    this.hud.msg(t('kickoff'));
    this.world.excitement = 0.35;
    this.fx.clear();
    this.ball.trail.reset();
    for (const tm of this.teams) this.assignDevices(tm);
    this.refWhistle('whistle_short');
  }

  // ------------------------------------------------------------------ controle
  private controlled(tm: Team, dev: DeviceId) { return tm.players.find((p) => p.device === dev && p.onField) ?? null; }

  assignDevices(tm: Team) {
    for (const dev of tm.devices) {
      if (!this.controlled(tm, dev)) {
        const cands = tm.field.filter((p) => !p.isGK && !p.device && p !== this.trainer);
        cands.sort((a, b) => a.pos.distanceTo(this.ball.pos) - b.pos.distanceTo(this.ball.pos));
        if (cands[0]) cands[0].device = dev;
      }
    }
  }

  giveControl(p: Player) {
    const tm = p.team;
    if (!tm.devices.length || p.device || p === this.trainer) return;
    // passa o dispositivo do jogador controlado mais distante para p
    const owners = tm.players.filter((x) => x.device);
    if (!owners.length) { p.device = tm.devices[0]; return; }
    owners.sort((a, b) => b.pos.distanceTo(p.pos) - a.pos.distanceTo(p.pos));
    p.device = owners[0].device; owners[0].device = null;
  }

  /**
   * Troca automática (Opções → "Troca automática"): sem a bola, se outro companheiro está bem mais perto dela,
   * o controle passa para ele — o jogador não precisa caçar o botão TROCAR a cada lance.
   */
  private autoT = 0;
  private autoSwitch(dt: number) {
    this.autoT -= dt;
    if (this.autoT > 0 || settings.data.autoSwitch === false || this.opts.mode === 'training' || this.mini) return;
    this.autoT = 0.35;
    const b = this.ball;
    for (const tm of this.teams) {
      if (tm.devices.length !== 1) continue;
      const dev = tm.devices[0];
      const cur = this.controlled(tm, dev);
      if (!cur || b.owner === cur || (b.owner && b.owner.team === tm) || this.passTo?.team === tm) continue;
      if (cur.sliding > 0 || (cur.kick && !cur.kick.done) || input.isDown('TouchPress')) continue;
      const tgt = b.predict(0.4);
      const dCur = cur.pos.distanceTo(tgt);
      const near = tm.field.filter((p) => !p.isGK && p !== cur && p.stun <= 0 && p !== this.trainer).sort((a, c) => a.pos.distanceTo(tgt) - c.pos.distanceTo(tgt))[0];
      if (near && near.pos.distanceTo(tgt) + 3.5 < dCur) { cur.device = null; near.device = dev; }
    }
  }

  private switchToNearest(tm: Team, dev: DeviceId) {
    const cur = this.controlled(tm, dev);
    const cands = tm.field.filter((p) => !p.isGK && (!p.device || p.device === dev) && p !== cur && p.stun <= 0 && p !== this.trainer);
    if (!cands.length) return;
    cands.sort((a, b) => a.pos.distanceTo(this.ball.pos) - b.pos.distanceTo(this.ball.pos));
    if (cur) cur.device = null;
    cands[0].device = dev;
    audio.play('ui_tick', 0.5);
  }

  private humanUpdate(p: Player, dt: number) {
    const dev = p.device!;
    const s = input.state(dev);
    const mv = new THREE.Vector3(s.mx, 0, s.my);
    const tm = p.team;
    this.requestT = Math.max(0, this.requestT - dt);
    const sp = this.sp;
    const inSet = this.state === 'setpiece' || this.state === 'kickoff';
    if (input.pressed(dev, 'fire')) this.activateFire(tm);
    const hasBall = this.ball.owner === p || (this.ball.held && this.ball.owner === p);
    if (inSet && sp?.taker === p) {
      // cobrança: só mira
      if (mv.lengthSq() > 0.01) p.faceTo(mv, dt, 8);
      if (input.pressed(dev, 'pass')) this.doPass(p, mv.lengthSq() > 0.01 ? mv : null, false);
      else if (input.pressed(dev, 'lob')) this.doPass(p, mv.lengthSq() > 0.01 ? mv : null, true);
      else if (input.held(dev, 'shoot')) { p.shootHold = Math.min(1, p.shootHold + dt * 1.25); }
      else if (input.released(dev, 'shoot')) { this.doShoot(p, p.shootHold, mv); p.shootHold = 0; }
      return;
    }
    if (inSet) { p.vel.set(0, 0, 0); return; }
    const canMove = p.stun <= 0 && p.sliding <= 0 && !(p.kick && !p.kick.done) && !this.ball.held;
    let sprint = input.held(dev, 'sprint');
    // recepção estilo PES/FIFA: direcional solto e passe vindo para ele → para, vira para a bola e espera no pé
    const waiting = this.passTo === p && !hasBall && mv.lengthSq() < 0.04 && !this.ball.owner;
    if (waiting) { p.vel.multiplyScalar(Math.exp(-10 * dt)); p.faceTo(this.ball.pos.clone().sub(p.pos).setY(0), dt, 10); }
    // MARCAR (toque): corre sozinho atrás da bola/adversário enquanto o botão estiver pressionado
    if (input.isDown('TouchPress') && dev === 'kb' && !hasBall && mv.lengthSq() < 0.04) {
      mv.copy(this.pressDir(p)); sprint = true;
      const c = this.ball.owner;
      if (c && c.team !== tm && c.pos.distanceTo(p.pos) < 1.15 && p.tackleCd <= 0) this.doTackle(p, false); // bote
    }
    if (canMove && !waiting) {
      const max = p.maxSpeed(sprint);
      const want = mv.clone().multiplyScalar(max);
      const acc = hasBall ? 16 : 20;
      p.vel.lerp(want, 1 - Math.exp(-acc * dt / Math.max(1, max * 0.4)));
      if (mv.lengthSq() > 0.01) p.faceTo(mv, dt, hasBall ? 9 : 12);
      if (sprint && mv.lengthSq() > 0.1) p.stamina = Math.max(0, p.stamina - dt * 0.085);
    } else if (p.sliding <= 0) p.vel.multiplyScalar(Math.exp(-8 * dt));
    // goleiro humano segurando a bola
    if (this.ball.held && this.ball.owner === p) {
      p.holdT += dt;
      if (mv.lengthSq() > 0.01) p.faceTo(mv, dt, 8);
      if (input.pressed(dev, 'pass')) this.doPass(p, mv.lengthSq() > 0.01 ? mv : null, false);
      else if (input.held(dev, 'shoot')) p.shootHold = Math.min(1, p.shootHold + dt * 1.25);
      else if (input.released(dev, 'shoot')) { this.longThrow(p, p.shootHold); p.shootHold = 0; }
      return;
    }
    // ações
    if (input.pressed(dev, 'pass')) {
      if (hasBall) this.doPass(p, mv.lengthSq() > 0.01 ? mv : null, false);
      else if (this.ball.owner?.team !== tm || !this.ball.owner) this.switchToNearest(tm, dev);
      else this.requestPass(p, false); // companheiro com a bola: pede o passe
    }
    if (input.pressed(dev, 'lob') && hasBall) this.doPass(p, mv.lengthSq() > 0.01 ? mv : null, true);
    else if (input.pressed(dev, 'lob') && this.opts.mode === 'training') this.trainerCross();
    else if (input.pressed(dev, 'lob') && this.ball.owner && this.ball.owner.team === tm) this.requestPass(p, true);
    if (input.pressed(dev, 'trick')) this.doTrick(p);
    if (input.pressed(dev, 'tackle') && !hasBall) this.doTackle(p, sprint);
    // chute: segurar = força; bola no alto = finalização acrobática imediata
    if (input.pressed(dev, 'shoot') && !hasBall && this.aerialChance(p)) { this.doShoot(p, 0.8, mv); p.shootHold = 0; }
    else if (input.held(dev, 'shoot') && (hasBall || this.nearLooseBall(p))) p.shootHold = Math.min(1, p.shootHold + dt * 1.25);
    else if (input.released(dev, 'shoot') && p.shootHold > 0) { this.doShoot(p, p.shootHold, mv); p.shootHold = 0; }
    else if (!input.held(dev, 'shoot')) p.shootHold = 0;
  }

  nearLooseBall(p: Player) {
    return !this.ball.owner && !this.ball.held && Math.hypot(this.ball.pos.x - p.pos.x, this.ball.pos.z - p.pos.z) < 1.6;
  }
  aerialChance(p: Player) {
    const b = this.ball;
    if (b.owner || b.held) return false;
    const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    return d < 2.6 && b.pos.y > 0.45 && b.pos.y < 3.2;
  }

  // ------------------------------------------------------------------ ações
  /** Pedir a bola (botão PEDIR / J sem bola): o companheiro da CPU que está com ela passa para o jogador. */
  requestT = 0;
  requestPass(p: Player, lob: boolean) {
    const o = this.ball.owner;
    if (!o || o === p || o.team !== p.team || o.device || o.isGK && this.ball.held || (o.kick && !o.kick.done) || this.requestT > 0) return false;
    this.requestT = 0.8;
    this.doPass(o, null, lob, p);
    this.hud.worldPop(lob ? 'NO ALTO!' : 'TOCA!', p.pos.clone().setY(2.3), this.world.camera, '#ffffff');
    return true;
  }
  /** Marcação assistida (botão MARCAR): direção até quem está com a bola, ou até onde a bola vai estar. */
  pressDir(p: Player) {
    const b = this.ball;
    const tgt = b.owner && b.owner.team !== p.team ? b.owner.pos.clone().add(b.owner.vel.clone().multiplyScalar(0.25)) : b.predict(0.3);
    const d = tgt.sub(p.pos).setY(0);
    return d.lengthSq() > 0.04 ? d.normalize() : new THREE.Vector3();
  }

  /**
   * Quem recebe o passe. Com o direcional apontado, a direção manda (cone estreito); solto, vale o companheiro
   * mais livre e mais à frente. Passe rasteiro evita linhas com adversário no caminho; o lençol passa por cima.
   */
  pickPassTarget(p: Player, dir: THREE.Vector3 | null, lob: boolean): Player | null {
    const mates = p.team.field.filter((m) => m !== p && !m.isGK && m.stun <= 0);
    const aimed = !!dir && dir.lengthSq() > 0.04;
    const fwd = aimed ? dir!.clone().setY(0).normalize() : p.forward;
    let best: Player | null = null, bestS = -1e9;
    for (const m of mates) {
      const to = m.pos.clone().sub(p.pos).setY(0); const d = to.length(); to.normalize();
      const ang = to.dot(fwd);
      if (aimed && ang < 0.2) continue; // nunca passa para trás de onde o jogador apontou
      const lane = Math.min(...p.team.opp.field.map((o) => distToSeg(o.pos, p.pos, m.pos)));
      const mark = Math.min(...p.team.opp.field.map((o) => o.pos.distanceTo(m.pos)));
      const run = m.runT > 0 ? 1.2 : 0; // companheiro na corrida da tabela
      const s = ang * (aimed ? 6 : 2.5) - Math.abs(d - (lob ? 11 : 7)) * 0.14 + Math.min(lob ? 3 : lane, 3) * 0.9 + Math.min(mark, 4) * 0.5 + (m.pos.x * p.team.dir) * 0.06 + run;
      if (s > bestS) { bestS = s; best = m; }
    }
    return best;
  }
  /** tabela: o passador dispara para o espaço à frente (na diagonal do recebedor) para receber de volta */
  startRun(p: Player, recv: Player) {
    const d = p.team.dir;
    const side = Math.sign(p.pos.z - recv.pos.z) || (p.pos.z > 0 ? 1 : -1);
    p.runTarget.set(THREE.MathUtils.clamp(recv.pos.x + d * 6, -FIELD.HL + 2, FIELD.HL - 2), 0, THREE.MathUtils.clamp(recv.pos.z + side * 4, -FIELD.HW + 1.5, FIELD.HW - 1.5));
    p.runT = 1.8;
  }
  /**
   * Passe "no pé": enquanto o passe do time está a caminho (ninguém tocou), a bola corrige a direção para o
   * pé do recebedor — se ele se mexer, ela acompanha — e não morre no meio do caminho por causa da areia.
   */
  private homePass(dt: number) {
    const r = this.passTo, b = this.ball;
    if (!r || b.owner || b.held || b.inGoal || !r.onField || b.lastTouch?.team !== r.team) return;
    const to = r.pos.clone().sub(b.pos).setY(0);
    const dist = to.length();
    if (dist < 0.3) return;
    to.divideScalar(dist);
    const hv = new THREE.Vector3(b.vel.x, 0, b.vel.z);
    let hs = hv.length();
    if (hs < 0.05) return;
    hv.divideScalar(hs);
    if (hv.dot(to) < -0.2) return; // já passou do recebedor
    const k = 1 - Math.exp(-(b.airborne ? 2.5 : 7) * dt);
    hv.lerp(to, k).normalize();
    if (!b.airborne) hs = Math.max(hs, Math.min(5, 1.5 + dist * 1.2)); // areia não segura o passe antes de chegar
    b.vel.x = hv.x * hs; b.vel.z = hv.z * hs;
  }
  /** jogador que deve receber o passe em andamento (recepção assistida) */
  passTo: Player | null = null;
  /** bola aérea dominável agora pelo jogador humano (o celular pisca o botão CHUTE) */
  aerialCue = false;
  private cueFor: Player | null = null;
  passT = 0;

  doPass(p: Player, dir: THREE.Vector3 | null, lob: boolean, target?: Player) {
    const b = this.ball;
    const hasIt = b.owner === p || this.sp?.taker === p || this.nearLooseBall(p);
    if (!hasIt || (p.kick && !p.kick.done)) return;
    const best = target ?? this.pickPassTarget(p, dir, lob);
    const kind: KickKind = p.isGK && b.held ? 'gk_throw' : this.sp?.kind === 'throw_in' ? 'throw_in' : lob ? 'pass_lob' : 'pass_short';
    this.queueKick(p, kind, 0.5, null, best);
  }

  longThrow(p: Player, power: number) {
    const fwdMates = p.team.field.filter((m) => !m.isGK).sort((a, b) => b.pos.x * p.team.dir - a.pos.x * p.team.dir);
    this.queueKick(p, 'long_throw', Math.max(0.5, power), null, fwdMates[0] ?? null);
  }

  doShoot(p: Player, power: number, aimIn: THREE.Vector3) {
    if (p.kick && !p.kick.done) return;
    const b = this.ball;
    const goal = new THREE.Vector3(this.goalX(p.team), 0, 0);
    let kind: KickKind = 'shot';
    if (b.owner === p || this.sp?.taker === p) kind = 'shot';
    else if (this.aerialChance(p)) {
      const tBall = Math.max(0.2, b.timeToHeight(1.0));
      const pr = b.predict(0.35);
      const h = pr.y;
      const toGoal = goal.clone().sub(p.pos).setY(0).normalize();
      const toBall = pr.clone().sub(p.pos).setY(0);
      const facing = toBall.lengthSq() > 0.01 ? toBall.normalize() : p.forward;
      const ang = Math.acos(THREE.MathUtils.clamp(facing.dot(toGoal), -1, 1)) * 180 / Math.PI;
      if (h > 1.55) kind = 'header';
      else if (h > 0.9 && ang > 105) kind = 'bicycle_kick';
      else if (h > 0.7 && ang > 55) kind = 'scissor_kick';
      else if (h < 1.0 && p.vel.length() > 5 && ang < 50 && b.pos.y < 1.2 && Math.random() < 0.5) kind = 'diving_header';
      else kind = 'volley';
      void tBall;
    } else if (!this.nearLooseBall(p)) {
      return;
    }
    const aim = aimIn && aimIn.lengthSq() > 0.01 ? aimIn.clone().normalize() : null;
    this.queueKick(p, kind, power, aim, null);
  }

  doTrick(p: Player) {
    const b = this.ball;
    if (p.kick && !p.kick.done) return;
    if (b.owner === p) {
      const opp = p.team.opp.field.find((o) => { const d = o.pos.clone().sub(p.pos); return d.length() < 2.6 && d.normalize().dot(p.forward) > 0.5; });
      const cone = this.trainingCones.find((c) => { const d = c.position.clone().sub(p.pos).setY(0); return d.length() < 2.6 && d.normalize().dot(p.forward) > 0.5; });
      this.queueKick(p, opp || cone ? 'sombrero_flick' : 'juggle', 0.5, null, null);
    } else if (!b.held && b.lastTouch === p && b.airborne && Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 1.6 && b.pos.y < 1.6) {
      this.queueKick(p, 'juggle', 0.5, null, null);
    } else if (this.aerialChance(p) && b.pos.y > 1.1 && b.pos.y < 2.0) {
      this.queueKick(p, 'chest_control', 0.3, null, null);
    }
  }

  doTackle(p: Player, sprint: boolean) {
    if (p.tackleCd > 0 || p.stun > 0 || p.sliding > 0) return;
    const carrier = this.ball.owner && this.ball.owner.team !== p.team ? this.ball.owner : null;
    const d = carrier ? carrier.pos.distanceTo(p.pos) : this.ball.pos.distanceTo(p.pos);
    if (sprint || d > 1.4) {
      // carrinho
      p.sliding = 0.75; p.tackleCd = 1.6;
      const target = carrier ? carrier.pos.clone().addScaledVector(carrier.vel, 0.25) : this.ball.pos.clone();
      p.slideDir.copy(target.sub(p.pos).setY(0).normalize());
      p.yaw = Math.atan2(p.slideDir.x, p.slideDir.z);
      p.vel.copy(p.slideDir).multiplyScalar(Math.max(7.5, p.vel.length() + 1.5));
      p.ath.play('slide_tackle', 0.08, 1.3);
      audio.play('tackle', 0.8);
      this.fx.sandPuff(p.pos, 6, 1.2);
    } else {
      p.tackleCd = 0.9;
      p.ath.play('shoulder_charge', 0.08);
      if (carrier && d < 1.3) {
        const chance = (0.35 + p.stat('defesa') * 0.4 - carrier.stat('tecnica') * 0.25 + (p.team.human ? 0.1 : 0)) * (carrier.protectT > 0 ? 0.25 : 1);
        if (Math.random() < chance) { this.looseBall(carrier, p.forward.clone().multiplyScalar(3)); audio.play('body', 0.7); this.addStyle(p.team, 'tackle', p); }
      }
    }
  }

  private looseBall(from: Player, push: THREE.Vector3) {
    this.ball.owner = null;
    this.ball.vel.copy(push).setY(1.2);
    from.cooldown = 0.6;
  }

  queueKick(p: Player, kind: KickKind, power: number, aim: THREE.Vector3 | null, target: Player | null) {
    const setShot = kind === 'shot' && (this.sp?.kind === 'penalty' || this.sp?.kind === 'free_kick' || !!this.pens) && this.sp?.taker === p;
    const anim = kind === 'long_throw' ? 'gk_drop_kick' : setShot ? 'penalty_kick' : kind;
    const meta = clipMeta[anim] ?? { contact: 0.25 };
    // clipes de captura de movimento têm preparação longa; acelera para manter a resposta arcade
    const speed = setShot ? 1.15 : ({ shot: 1.25, pass_short: 1.3, pass_lob: 1.3, gk_throw: 1.6, long_throw: 1.5, throw_in: 1.5, header: 1.4, bicycle_kick: 1.3, scissor_kick: 1.3, gk_punch: 1.4 } as Record<string, number>)[kind] ?? 1;
    p.kick = { kind, at: (meta.contact ?? 0.25) / speed, power, aim, target, fire: p.team.fire > 0, done: false };
    // vira para o alvo antes de chutar
    const goal = new THREE.Vector3(this.goalX(p.team), 0, (aim ? aim.z : 0) * 2);
    let face: THREE.Vector3 | null = null;
    if (target) face = target.pos.clone().sub(p.pos);
    else if (kind === 'shot' || kind === 'volley' || kind === 'header' || kind === 'diving_header') face = goal.clone().sub(p.pos);
    else if (kind === 'bicycle_kick') face = p.pos.clone().sub(goal);
    else if (kind === 'scissor_kick') { const g = goal.clone().sub(p.pos).normalize(); face = new THREE.Vector3(-g.z, 0, g.x).multiplyScalar(Math.sign(this.ball.pos.z - p.pos.z) || 1); }
    if (face && face.setY(0).lengthSq() > 0.01) p.yaw = Math.atan2(face.x, face.z) * 0.85 + p.yaw * 0.15 + (Math.abs(Math.atan2(face.x, face.z) - p.yaw) > Math.PI ? 0 : 0);
    if (face && face.setY(0).lengthSq() > 0.01) p.yaw = Math.atan2(face.x, face.z);
    p.ath.play(anim, 0.06, speed, true);
    if (kind === 'diving_header') p.vel.copy(p.forward).multiplyScalar(6.5);
    else if (['bicycle_kick', 'scissor_kick', 'volley', 'header'].includes(kind)) {
      // aproxima o jogador do ponto de contato previsto
      const pr = this.ball.predict(p.kick.at);
      const off = kind === 'bicycle_kick' ? p.forward.clone().multiplyScalar(-0.35) : kind === 'header' ? v3() : p.forward.clone().multiplyScalar(0.5);
      const want = pr.clone().setY(0).sub(off);
      p.vel.copy(want.sub(p.pos).setY(0).divideScalar(Math.max(0.15, p.kick.at)));
      if (p.vel.length() > 9) p.vel.setLength(9);
    } else p.vel.multiplyScalar(kind === 'shot' ? 0.4 : 0.6);
    if (kind === 'shot' || kind === 'volley' || kind === 'bicycle_kick' || kind === 'scissor_kick' || kind === 'header' || kind === 'diving_header') { p.team.shots++; p.shots++; }
  }

  private executeKick(p: Player) {
    const k = p.kick!;
    k.done = true;
    // chute que ficou na fila não é executado fora do jogo (ex.: durante a comemoração de gol)
    if (!['play', 'kickoff', 'setpiece', 'penalties'].includes(this.state)) return;
    const b = this.ball;
    const tm = p.team;
    const fire = k.fire;
    const foot = p.ath.worldOf(p.ath.rightFoot);
    const head = p.ath.worldOf(p.ath.head);
    const reachable = (pt: THREE.Vector3, r: number) => pt.distanceTo(b.pos) < r;
    const owned = b.owner === p || (b.held && b.owner === p) || this.sp?.taker === p;
    let contact: THREE.Vector3;
    switch (k.kind) {
      case 'header': case 'diving_header': contact = head; break;
      case 'bicycle_kick': case 'scissor_kick': case 'volley': contact = foot; break;
      default: contact = foot;
    }
    const aerial = ['header', 'diving_header', 'bicycle_kick', 'scissor_kick', 'volley', 'chest_control'].includes(k.kind);
    if (!owned && !reachable(aerial ? contact : p.pos.clone().setY(BALL_R).addScaledVector(p.forward, 0.5), aerial ? 1.7 : 1.4)) return; // furou
    if (this.state === 'setpiece' || this.state === 'kickoff') this.resumePlay();
    b.owner = null; b.held = false;
    if (aerial) b.pos.lerp(contact, 0.6);
    else b.pos.copy(p.pos).addScaledVector(p.forward, 0.45).setY(BALL_R + 0.02);
    p.cooldown = 0.35;
    b.lastTouch = p;
    this.saveRolled = false;
    this.lastKick = { kind: k.kind, by: p };
    const goalX = this.goalX(tm);
    const acc = (0.5 + p.stat('chute') * 0.35 + (fire ? 0.4 : 0) - (p.stamina < 0.25 ? 0.15 : 0)) * (tm.human ? 1 : [0.75, 0.9, 1.0][this.difficulty]);
    let v = v3();
    let spin = 0;
    let sfx: 'kick_soft' | 'kick' | 'kick_hard' = 'kick';
    const target = k.target;
    switch (k.kind) {
      case 'pass_short': case 'gk_throw': case 'throw_in': {
        let tp = target ? target.pos.clone() : b.pos.clone().addScaledVector(p.forward, 10);
        const d = tp.distanceTo(b.pos);
        if (k.kind === 'pass_short') {
          // areia segura muito a bola: a velocidade de saída é calculada para ela chegar viva (~5 m/s) no recebedor,
          // e o alvo é onde ele vai estar quando a bola chegar
          // no pé: mira a posição do recebedor (ele espera a bola); só antecipa quem está correndo na tabela
          let sp = rollSpeedFor(d, 6.5);
          if (target && target.runT > 0) { const tArr = rollTime(sp, d); tp = target.pos.clone().addScaledVector(target.vel, Math.min(1.0, tArr * 0.8)); sp = rollSpeedFor(tp.distanceTo(b.pos), 6.5); }
          v = tp.sub(b.pos).setY(0).normalize().multiplyScalar(Math.min(sp, 24)); v.y = 0.6;
          sfx = 'kick_soft';
          if (target) { this.passTo = target; this.passT = 3; }
        } else {
          tp.y = 1.1;
          v = ballistic(b.pos.setY(k.kind === 'throw_in' ? 2.0 : 1.4), tp, 0.45 + d * 0.045);
          sfx = 'kick_soft';
          if (k.kind === 'throw_in') this.addStyle(tm, 'pass', p);
        }
        this.addStyle(tm, 'pass', p);
        if (target) { this.giveControl(target); target.aiT = 0; }
        if (k.kind === 'pass_short' && target && !p.isGK) this.startRun(p, target);
        break;
      }
      case 'pass_lob': case 'long_throw': {
        const tp = target ? (target.runT > 0 ? target.pos.clone().addScaledVector(target.vel, 0.9) : target.pos.clone()) : b.pos.clone().addScaledVector(p.forward, 14);
        const d = tp.distanceTo(b.pos);
        tp.y = k.kind === 'long_throw' ? 1.0 : 0.9;
        v = ballistic(b.pos, tp, 0.8 + d * 0.05);
        if (k.kind === 'long_throw') { this.addStyle(tm, 'long_throw', p, t('long_throw')); this.hud.big(t('long_throw')); }
        else this.addStyle(tm, 'lob', p);
        if (target) { this.giveControl(target); this.passTo = target; this.passT = 3.5; }
        sfx = 'kick';
        break;
      }
      case 'juggle': {
        v.set(p.forward.x * 0.6 + p.vel.x * 0.5, 4.4, p.forward.z * 0.6 + p.vel.z * 0.5);
        if (this.mini?.kind === 'juggle') {
          // minijogo: a bola volta para os pés do jogador (tempo de voo ~0.9 s)
          v.x = (p.pos.x + p.forward.x * 0.35 + p.vel.x * 0.9 - b.pos.x) / 0.9;
          v.z = (p.pos.z + p.forward.z * 0.35 + p.vel.z * 0.9 - b.pos.z) / 0.9;
        }
        b.pos.y = Math.max(b.pos.y, 0.3);
        p.juggling = 1.4;
        this.addStyle(tm, 'juggle', p);
        sfx = 'kick_soft';
        break;
      }
      case 'sombrero_flick': {
        const tp = p.pos.clone().addScaledVector(p.forward, 3.4).setY(0.5);
        v = ballistic(b.pos, tp, 0.85);
        p.juggling = 1.2;
        this.pendingSombrero = { p, t: 1.6 };
        sfx = 'kick_soft';
        break;
      }
      case 'chest_control': {
        v.set(p.forward.x * 1.2, 1.2, p.forward.z * 1.2);
        this.addStyle(tm, 'chest', p);
        sfx = 'kick_soft';
        break;
      }
      default: {
        // finalizações
        const power = THREE.MathUtils.clamp(k.power, tm.human ? 0.42 : 0.15, 1);
        const kindBoost = k.kind === 'bicycle_kick' || k.kind === 'scissor_kick' ? 4 : k.kind === 'volley' ? 3 : k.kind === 'header' ? -3 : k.kind === 'diving_header' ? 0 : 0;
        const speed = 13 + power * 15 + kindBoost + (fire ? 7 : 0);
        const d0 = Math.abs(goalX - b.pos.x) + Math.abs(b.pos.z) * 0.3;
        // mira: lateral escolhida pelo direcional, senão canto longe do goleiro
        const gk = tm.opp.gk;
        let z: number;
        const lateral = k.aim ? k.aim.z : 0;
        if (Math.abs(lateral) > 0.3) z = Math.sign(lateral) * (1.5 + Math.random() * 1.0);
        else z = (gk && gk.pos.z > 0 ? -1 : 1) * (0.6 + Math.random() * 1.9);
        let y = k.kind === 'header' || k.kind === 'diving_header' ? 0.4 + Math.random() * 0.6 : 0.5 + Math.random() * 1.3;
        const over = Math.max(0, power - 0.85) * 3;
        y += over * (0.6 + Math.random());
        const err = (1 - Math.min(1, acc)) * (tm.human ? 2.4 : 3.4) + over * 0.4 + (d0 > 11 ? (d0 - 11) * 0.12 : 0);
        z += (Math.random() - 0.5) * err * 2;
        y += (Math.random() - 0.3) * err;
        const tp = new THREE.Vector3(goalX + tm.dir * 0.3, Math.max(0.15, y), z);
        void 0;
        const d = tp.distanceTo(b.pos);
        v = ballistic(b.pos, tp, d / speed);
        spin = (Math.random() - 0.5) * (k.kind === 'shot' ? 3 : 1.5);
        sfx = power > 0.6 || fire ? 'kick_hard' : 'kick';
        const label = LABEL[k.kind];
        if (label) { this.addStyle(tm, k.kind, p, t(label)); this.hud.worldPop(t(label), p.pos.clone().setY(2.6), this.world.camera); }
        this.shotOnTarget = Math.abs(z) < FIELD.GOAL_W / 2 && y < FIELD.GOAL_H;
        this.cam.shake(power * 0.25 + (fire ? 0.3 : 0));
        if (k.kind === 'bicycle_kick' || k.kind === 'scissor_kick') { this.slowmo = 0.35; this.later(0.38, () => (this.slowmo = 1)); }
        this.world.excitement = 0.8;
      }
    }
    b.kick(v, p, spin, fire && !['juggle', 'pass_short', 'chest_control'].includes(k.kind));
    audio.play(sfx, 0.5 + Math.min(1, v.length() / 30) * 0.5);
    this.fx.kickBurst(b.pos.clone(), v.clone().normalize(), Math.min(1, v.length() / 28), b.fire);
    if (b.fire) { audio.play('fire_on', 0.5); }
    this.mini?.kicked(p, k.kind);
  }
  pendingSombrero: { p: Player; t: number } | null = null;
  pendingSave: { gk: Player; t: number; speed: number; fire: boolean; pr: THREE.Vector3 } | null = null;

  private doSave(dt: number) {
    const ps = this.pendingSave;
    if (!ps) return;
    ps.t -= dt;
    if (ps.t > 0) return;
    this.pendingSave = null;
    const b = this.ball, gk = ps.gk, tm = gk.team;
    if (b.owner || b.inGoal || b.held) return;
    const side = Math.sign(this.ownGoalX(tm));
    const catchIt = ps.speed < 19 && !ps.fire && Math.random() < 0.55 && ps.pr.y < 1.8;
    b.pos.lerp(gk.ath.worldOf(gk.ath.chest), 0.5);
    if (catchIt) this.takeBall(gk);
    else {
      const out = new THREE.Vector3(-side * (3 + Math.random() * 4), 3 + Math.random() * 4, Math.sign(ps.pr.z || 1) * (4 + Math.random() * 5));
      b.kick(out, gk, 0, false);
      audio.play('catch', 0.9);
    }
    this.hud.big(t('save'));
    audio.crowdReact('ooh', 1);
    this.addStyle(tm, 'save', gk);
    this.onEvent?.('save', gk);
  }

  activateFire(tm: Team) {
    if (tm.heat < 1 || tm.fire > 0) return;
    tm.fire = MOVES.fireDuration;
    tm.heat = 0;
    this.hud.big(t('fire_mode'), true);
    audio.play('fire_on', 1);
    audio.playMusic('fire', 400);
    this.world.bloom.strength = (this.world.def?.bloom ?? 0.3) + 0.8;
    this.onEvent?.('fire', undefined, tm);
  }

  addStyle(tm: Team, key: string, p: Player, label?: string) {
    const base = STYLE[key] ?? 5;
    const pts = base * tm.multiplier;
    tm.stylePts += pts; p.style += pts;
    if (tm.fire <= 0) tm.heat = Math.min(1, tm.heat + pts / MOVES.heatToFill);
    if (key !== 'pass' && key !== 'lob' && key !== 'tackle') {
      tm.comboT = 6;
      tm.multiplier = Math.min(MOVES.maxMultiplier, tm.multiplier + 1);
      if (tm.multiplier >= MOVES.maxMultiplier) this.onEvent?.('combo', p, tm);
      audio.play(tm.multiplier > 2 ? 'combo' : 'style', 0.6);
      if (tm.heat >= 1 && tm.human) this.hud.msg(t('fire_ready'));
    }
    this.hud.stylePop(tm.side, pts, label);
  }

  // ------------------------------------------------------------------ loop
  update(rawDt: number) {
    if (this.paused) { this.world.update(0); return; }
    const dt = Math.min(rawDt, 1 / 20) * this.slowmo;
    this.stateT += rawDt;
    this.runTimers(Math.min(rawDt, 1 / 20));
    this.fx.update(dt);
    switch (this.state) {
      case 'intro': this.updateIntro(dt); break;
      case 'replay': this.updateReplay(rawDt); break;
      case 'halftime': this.updateHalftime(dt); break;
      default: this.updatePlay(dt);
    }
    this.updateRef(dt);
    this.updateHud();
    const attackDir = this.ball.owner ? this.ball.owner.team.dir : this.ball.lastTouch ? this.ball.lastTouch.team.dir : 1;
    if (this.state !== 'replay') this.cam.update(rawDt, this.ball.pos, attackDir, this.sp?.taker.pos);
    this.ball.trail.update(this.ball.pos, this.world.camera, this.ball.speed, this.ball.fire);
    if (this.ball.fire && this.ball.speed > 5) for (let i = 0; i < 2; i++) this.fx.fireTrail(this.ball.pos);
    audio.setCrowd(0.3 + Math.max(0, 1 - Math.abs(Math.abs(this.ball.pos.x) - 18) / 12) * 0.6);
    this.world.excitement += (0.35 - this.world.excitement) * dt * 0.3;
    this.world.update(dt);
    audio.ambient(dt, true);
  }

  private updatePlay(dt: number) {
    const st = this.state;
    const running = st === 'play';
    // relógio
    if (running) {
      this.clock += dt * this.timeScale;
      const len = this.extra ? 180 : this.periodLen;
      if (this.clock >= len) { this.clock = len; this.endPeriod(); }
      for (const tm of this.teams) {
        if (tm.fire > 0) { tm.fire -= dt; if (tm.fire <= 0) { audio.playMusic(null, 1200); this.world.bloom.strength = this.world.def?.bloom ?? 0.3; } }
        if (tm.comboT > 0) { tm.comboT -= dt; if (tm.comboT <= 0) tm.multiplier = 1; }
        for (const p of tm.players) if (p.sentOff > 0) { p.sentOff -= dt * this.timeScale; if (p.sentOff <= 0) this.returnPlayer(p); }
      }
      const pt = this.ball.owner?.team ?? this.ball.lastTouch?.team;
      if (pt) pt.possT += dt;
      if (pt && pt !== this.posses) { if (this.posses) this.posses.multiplier = 1; this.posses = pt; }
    }
    if (st === 'kickoff' || st === 'setpiece') this.updateSetPiece(dt);
    if (st === 'goal') this.updateGoalCele(dt);
    if (st === 'periodEnd' && this.stateT > 2.5) this.afterPeriod();
    if (st === 'fulltime') this.updateFulltime(dt);
    if (st === 'penalties') this.updatePens(dt);
    this.mini?.update(dt);

    if (this.passT > 0) { this.passT -= dt; if (this.passT <= 0) this.passTo = null; }
    if (st === 'play') this.homePass(dt);
    if (st === 'play') this.autoSwitch(dt);
    // controle humano + IA
    const live = st === 'play' || st === 'kickoff' || st === 'setpiece';
    for (const tm of this.teams) {
      if (live) {
        if (tm.devices.length) for (const p of tm.players) if (p.device && p.onField) this.humanUpdate(p, dt);
        teamAI(this, tm, dt);
        gkAI(this, tm, dt);
      }
    }
    // física dos jogadores
    for (const p of this.all) {
      if (!p.onField) { p.ath.root.visible = false; continue; }
      p.ath.root.visible = true;
      this.integrate(p, dt);
    }
    if (live) this.doSave(dt);
    if (live || st === 'goal') this.ballUpdate(dt);
    if (running || st === 'goal') this.replay.record(dt, this.onField, this.ball);
  }

  private integrate(p: Player, dt: number) {
    if (p.cooldown > 0) p.cooldown -= dt;
    if (p.tackleCd > 0) p.tackleCd -= dt;
    if (p.protectT > 0) p.protectT -= dt;
    if (p.runT > 0) p.runT -= dt;
    if (p.juggling > 0) p.juggling -= dt;
    if (p.stun > 0) {
      p.stun -= dt;
      p.vel.multiplyScalar(Math.exp(-6 * dt));
      if (p.stun <= 0.9 && p.lying) { p.ath.play(p.lying === 'front' ? 'get_up_front' : 'get_up', 0.1); p.lying = null; }
    }
    if (p.sliding > 0) {
      p.sliding -= dt;
      p.vel.multiplyScalar(Math.exp(-2.2 * dt));
      if (Math.random() < 0.5) this.fx.sandPuff(p.pos, 1, 0.8);
      this.checkSlide(p);
      if (p.sliding <= 0) p.stun = 0.35;
    }
    // execução de chute agendado
    if (p.kick && !p.kick.done) {
      if (p.ath.actionTime >= p.kick.at) this.executeKick(p);
      p.vel.multiplyScalar(Math.exp(-3 * dt));
      if (p.kick.kind === 'diving_header' || p.kick.kind === 'bicycle_kick' || p.kick.kind === 'scissor_kick') { /* mantém impulso */ }
    }
    if (p.kick?.done && p.ath.locked <= 0) {
      const m = clipMeta[p.ath.current];
      if (m?.endsLying) { p.lying = m.endsLying; p.stun = 1.5; }
      p.kick = null;
    }
    // stamina
    if (p.vel.length() < 5) p.stamina = Math.min(1, p.stamina + dt * 0.035);
    // move
    p.pos.addScaledVector(p.vel, dt);
    p.pos.x = THREE.MathUtils.clamp(p.pos.x, -FIELD.HL - 2.5, FIELD.HL + 2.5);
    p.pos.z = THREE.MathUtils.clamp(p.pos.z, -FIELD.HW - 2.5, FIELD.HW + 2.5);
    // separação simples entre jogadores
    for (const o of this.onField) {
      if (o === p) continue;
      const dx = p.pos.x - o.pos.x, dz = p.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.36 && d2 > 1e-6) { const d = Math.sqrt(d2); p.pos.x += (dx / d) * (0.6 - d) * 0.5; p.pos.z += (dz / d) * (0.6 - d) * 0.5; }
    }
    const sp = Math.hypot(p.vel.x, p.vel.z);
    if (p.stun <= 0 && p.sliding <= 0 && !(p.kick && !p.kick.done) && !(this.ball.held && this.ball.owner === p)) {
      const f = p.forward;
      const fwd = sp > 0.1 ? (p.vel.x * f.x + p.vel.z * f.z) / sp : 1;
      const side = sp > 0.1 ? (p.vel.x * f.z - p.vel.z * f.x) / sp : 0; // componente para a esquerda do personagem
      p.ath.locomote(sp, p.stamina < 0.2, p.isGK && sp < 3, fwd, side);
    }
    if (this.ball.held && this.ball.owner === p && p.ath.locked <= 0 && p.ath.current !== 'gk_hold' && p.isGK) p.ath.play('gk_hold', 0.15);
    // pegadas e poeira
    if (sp > 1.5 && p.stun <= 0) {
      p.stepT -= dt * sp;
      if (p.stepT <= 0) {
        p.stepT = 0.9; p.stepSide *= -1;
        this.fx.footprints.add(p.pos.x, p.pos.z, p.yaw, p.stepSide);
        if (sp > 6.5) this.fx.sandPuff(p.pos, 1, 0.5);
        if (p.team.fire > 0) this.fx.auraSparks(p.pos);
      }
    }
    p.ath.fire = p.team.fire > 0 ? 1 : 0;
    if (p.team.fire > 0 && Math.random() < 0.2) this.fx.auraSparks(p.pos);
    p.ath.update(dt);
    p.sync();
  }

  private checkSlide(p: Player) {
    const b = this.ball;
    // bola primeiro
    if (b.pos.distanceTo(p.pos.clone().setY(BALL_R)) < 1.0 && b.pos.y < 0.6) {
      if (b.owner && b.owner.team !== p.team) { const o = b.owner; this.looseBall(o, p.slideDir.clone().multiplyScalar(5)); o.stun = 0.3; this.addStyle(p.team, 'tackle', p); }
      else if (!b.owner) { b.vel.copy(p.slideDir).multiplyScalar(6).setY(1); b.lastTouch = p; }
      p.sliding = Math.min(p.sliding, 0.25);
      audio.play('body', 0.6);
      return;
    }
    for (const o of p.team.opp.field) {
      if (o.stun > 0 || o.pos.distanceTo(p.pos) > 0.85) continue;
      // contato no jogador sem tocar na bola: falta
      const fromBehind = o.forward.dot(p.slideDir) > 0.3;
      o.stun = 2.2; o.lying = 'back'; o.ath.play('fall_hit', 0.05); o.vel.copy(p.slideDir).multiplyScalar(3);
      audio.play('body', 0.9);
      audio.crowdReact('ooh', 0.8);
      this.fx.sandPuff(o.pos, 8, 1.3);
      if (this.state === 'play') this.foul(p, o, fromBehind);
      p.sliding = 0.1;
      return;
    }
  }

  private ballUpdate(dt: number) {
    const b = this.ball;
    // dono da bola: condução
    if (b.owner && !b.held) {
      const o = b.owner;
      if (!o.onField || o.stun > 0) { b.owner = null; }
      else if (!(o.kick && !o.kick.done && o.kick.kind !== 'juggle')) {
        const sp = o.vel.length();
        const ahead = 0.42 + Math.min(0.5, sp * 0.06) + Math.sin(this.world.time * (6 + sp)) * 0.08 * Math.min(1, sp / 3);
        const want = o.pos.clone().addScaledVector(o.forward, ahead).setY(BALL_R);
        b.vel.copy(want).sub(b.pos).divideScalar(Math.max(dt, 1e-3)).clampLength(0, 30);
        b.pos.lerp(want, 1 - Math.exp(-18 * dt));
      }
    } else if (b.held && b.owner) {
      const o = b.owner;
      const hand = o.pos.clone().addScaledVector(o.forward, 0.35).setY(o.isGK ? 1.25 : 2.0);
      b.pos.lerp(hand, 0.5); b.vel.set(0, 0, 0);
    }
    b.update(dt);
    for (const e of b.events) {
      if (e.type === 'bounce') this.mini?.bounce(e.speed);
      if (e.type === 'bounce' && e.speed > 2) { audio.play('bounce', Math.min(0.8, e.speed / 10)); this.fx.sandPuff(e.p, 3, Math.min(1.2, e.speed / 6)); }
      if (e.type === 'post') { audio.play('post', 1); audio.crowdReact('ooh', 1); this.hud.big(t('post')); this.cam.shake(0.4); this.world.excitement = 1; }
      if (e.type === 'net') { audio.play('net', 0.8); this.world.netHit(e.p, b.vel.clone().addScalar(0.01).setLength(Math.max(4, e.speed))); }
      if (e.type === 'goal' && this.state === 'play') this.goal(e.p.x > 0 ? 1 : -1, e.p);
      if (e.type === 'board') audio.play('body', 0.4);
    }
    if (this.pens && this.shotPen && this.stateT > 0.4 && (b.held || (b.speed < 1.2 && !b.inGoal) || (b.owner && b.owner.isGK))) {
      this.shotPen = false; this.state = 'penalties'; audio.crowdReact('ooh', 1); this.later(0.9, () => this.penResult(false)); return;
    }
    if (this.state !== 'play') return;
    // sombrero: conta se recuperou depois de passar o adversário
    if (this.pendingSombrero) {
      this.pendingSombrero.t -= dt;
      if (this.pendingSombrero.t <= 0) this.pendingSombrero = null;
      else if (b.owner === this.pendingSombrero.p) { const p = this.pendingSombrero.p; this.addStyle(p.team, 'sombrero_flick', p, t('sombrero')); this.hud.worldPop(t('sombrero'), p.pos.clone().setY(2.5), this.world.camera); this.onEvent?.('sombrero', p); if (this.opts.mode === 'training') { this.training.sombrero++; this.onEvent?.('training', undefined, this.training); } this.pendingSombrero = null; }
    }
    // domínio da bola solta
    if (!b.owner && !b.held && !b.inGoal) {
      let best: Player | null = null, bd = 1e9;
      for (const p of this.onField) {
        if (p.cooldown > 0 || p.stun > 0 || p.sliding > 0 || (p.kick && !p.kick.done)) continue;
        const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
        const recv = p === this.passTo;
        const reachH = p.isGK && this.inOwnArea(p, b.pos) ? 2.4 : p.juggling > 0 ? 0.25 : recv ? 1.25 : 0.75;
        const reachD = p.isGK && this.inOwnArea(p, b.pos) ? 1.2 : recv ? 1.25 : 0.8;
        if (d < reachD && b.pos.y < reachH && d < bd) { best = p; bd = d; }
      }
      if (best) this.takeBall(best);
    }
    // saída de bola
    if (!b.inGoal && !b.owner) {
      if (Math.abs(b.pos.z) > FIELD.HW + BALL_R) this.outOfPlay('side');
      else if (Math.abs(b.pos.x) > FIELD.HL + BALL_R && !b.inGoal) this.outOfPlay('end');
    } else if (b.owner && !b.held) {
      if (Math.abs(b.pos.z) > FIELD.HW + 0.3) { b.owner = null; }
      if (Math.abs(b.pos.x) > FIELD.HL + 0.3) { b.owner = null; }
    }
  }

  inOwnArea(p: Player, pt: THREE.Vector3) {
    const gx = this.ownGoalX(p.team);
    return Math.abs(pt.x - gx) < FIELD.PEN && Math.abs(pt.z) < FIELD.HW;
  }

  takeBall(p: Player) {
    const b = this.ball;
    this.passTo = null;
    const prevTeam = b.lastTouch?.team;
    b.lastTouch = p;
    p.juggling = 0;
    if (p.isGK && this.inOwnArea(p, b.pos) && (b.speed > 3 || b.pos.y > 0.6)) {
      b.owner = p; b.held = true; p.holdT = 0;
      p.ath.play('gk_catch', 0.08);
      audio.play('catch', 0.8);
      if (prevTeam && prevTeam !== p.team) { this.addStyle(p.team, 'save', p); }
      this.giveControl(p);
      return;
    }
    if (b.pos.y > 0.5 && b.speed > 4) p.ath.play('chest_control', 0.06);
    b.owner = p; b.held = false; b.fire = false;
    p.protectT = 0.5;
    audio.play('kick_soft', 0.25);
    if (p.team.devices.length) this.giveControl(p);
  }

  // ------------------------------------------------------------------ regras
  private foul(by: Player, victim: Player, fromBehind: boolean) {
    by.fouls++; by.team.fouls++;
    this.refWhistle('whistle_foul');
    this.hud.big(t('foul'));
    let card: 'yellow' | 'red' | null = null;
    if (fromBehind || by.fouls >= 2) {
      by.yellow++;
      card = by.yellow >= 2 ? 'red' : 'yellow';
    }
    if (card) {
      this.later(0.6, () => { this.hud.msg(`${t(card!)} · ${by.data.short}`); this.ref.play('ref_card', 0.1); });
      if (card === 'red') { by.sentOff = 120; by.device = null; this.assignDevices(by.team); }
    }
    const spot = victim.pos.clone().setY(0);
    spot.x = THREE.MathUtils.clamp(spot.x, -FIELD.HL + 0.5, FIELD.HL - 0.5);
    spot.z = THREE.MathUtils.clamp(spot.z, -FIELD.HW + 0.5, FIELD.HW - 0.5);
    const inArea = Math.abs(spot.x - this.goalX(victim.team)) < FIELD.PEN;
    this.ball.owner = null;
    this.later(0.9, () => {
      if (this.state !== 'play' && this.state !== 'setpiece') return;
      if (inArea) this.setPiece('penalty', victim.team, new THREE.Vector3(this.goalX(victim.team) - victim.team.dir * FIELD.PEN, 0, 0));
      else this.setPiece('free_kick', victim.team, spot);
    });
    this.state = 'setpiece'; this.stateT = 0; this.sp = null;
    this.onEvent?.('foul', by, card);
  }

  private outOfPlay(kind: 'side' | 'end') {
    const b = this.ball;
    if (this.mini) { this.mini.out(); this.ball.owner = null; return; }
    if (this.pens && this.shotPen) { this.shotPen = false; this.state = 'penalties'; this.later(0.9, () => this.penResult(false)); return; }
    if (this.opts.mode === 'training') { this.trainingReset(); return; }
    const last = b.lastTouch?.team ?? this.teams[0];
    const other = last.opp;
    if (kind === 'side') {
      const spot = new THREE.Vector3(THREE.MathUtils.clamp(b.pos.x, -FIELD.HL + 1, FIELD.HL - 1), 0, Math.sign(b.pos.z) * FIELD.HW);
      this.setPiece('throw_in', other, spot);
    } else {
      const side = Math.sign(b.pos.x);
      // linha de fundo do time "other"? Se quem tocou por último atacava esse lado -> bola do goleiro
      const attackedBy = this.teams.find((tm) => tm.dir === side)!;
      if (last === attackedBy) this.setPiece('goal_kick', attackedBy.opp, new THREE.Vector3(side * (FIELD.HL - 1.5), 0, 0));
      else this.setPiece('corner', attackedBy, new THREE.Vector3(side * (FIELD.HL - 0.3), 0, Math.sign(b.pos.z || 1) * (FIELD.HW - 0.3)));
    }
  }

  setPiece(kind: SetPiece['kind'], team: Team, spot: THREE.Vector3) {
    const b = this.ball;
    let taker: Player;
    if (kind === 'goal_kick') taker = team.gk;
    else if (kind === 'penalty') taker = [...team.field].filter((p) => !p.isGK).sort((a, c) => c.stat('chute') - a.stat('chute'))[0];
    else taker = team.field.filter((p) => !p.isGK).sort((a, c) => a.pos.distanceTo(spot) - c.pos.distanceTo(spot))[0];
    this.state = 'setpiece'; this.stateT = 0;
    this.sp = { kind, team, taker, spot, t: 0 };
    const out = new THREE.Vector3(spot.x, 0, spot.z).setLength(Math.max(0.01, spot.length()));
    const face = new THREE.Vector3(this.goalX(team) - spot.x, 0, -spot.z * 0.5);
    taker.pos.copy(spot).addScaledVector(face.clone().normalize(), kind === 'throw_in' ? 0 : -0.55);
    if (kind === 'throw_in') taker.pos.z = spot.z + Math.sign(spot.z) * 0.3;
    taker.vel.set(0, 0, 0);
    taker.yaw = Math.atan2(face.x, face.z);
    taker.kick = null; taker.stun = 0; taker.sliding = 0;
    taker.sync();
    void out;
    b.place(spot.x, spot.z);
    b.lastTouch = taker;
    if (kind === 'throw_in' || kind === 'goal_kick') { b.owner = taker; b.held = true; taker.ath.play(kind === 'goal_kick' ? 'gk_hold' : 'idle', 0.1); }
    else { b.owner = null; b.held = false; }
    if (team.devices.length && !taker.isGK) this.giveControl(taker);
    else if (team.devices.length && taker.isGK) { const cur = team.players.find((p) => p.device); if (cur) { taker.device = cur.device; cur.device = null; } }
    // afasta adversários (5 m)
    for (const o of team.opp.field) if (o.pos.distanceTo(spot) < 5 && !o.isGK) o.pos.add(o.pos.clone().sub(spot).setY(0).setLength(5.2 - o.pos.distanceTo(spot)));
    if (kind === 'penalty') {
      for (const p of this.onField) if (p !== taker && !p.isGK) { p.pos.set(spot.x - team.dir * (3 + Math.random() * 3), 0, (Math.random() - 0.5) * 10); p.sync(); }
      const gk = team.opp.gk; gk.pos.set(this.goalX(team) - team.dir * 0.3, 0, 0); gk.yaw = Math.atan2(-team.dir, 0); gk.sync();
      gk.kick = null; gk.stun = 0; gk.lying = null; gk.vel.set(0, 0, 0); gk.holdT = 0; gk.ath.locked = 0; gk.ath.play('gk_idle', 0.1);
      this.pendingSave = null; this.saveRolled = false;
      this.cam.mode = 'behind';
    }
    this.hud.msg(t(kind === 'penalty' ? 'penalties' : kind));
    this.refWhistle(null);
  }

  private updateSetPiece(dt: number) {
    const sp = this.sp;
    if (!sp) return;
    sp.t += dt;
    const tk = sp.taker;
    tk.vel.set(0, 0, 0);
    tk.pos.lerp(tk.pos, 1);
    if (this.state === 'kickoff' && sp.t > 0.5 && !this.ball.owner) {
      // a bola rola na saída quando o batedor toca
    }
    if (!tk.team.human || !tk.device) {
      // IA cobra depois de um tempo
      if (sp.t > (sp.kind === 'penalty' ? 2.2 : 1.3) && !tk.kick) {
        if (sp.kind === 'penalty' || (sp.kind === 'free_kick' && Math.abs(sp.spot.x - this.goalX(sp.team)) < 12)) this.doShoot(tk, 0.75 + Math.random() * 0.2, new THREE.Vector3(0, 0, Math.random() < 0.5 ? -1 : 1));
        else if (sp.kind === 'corner') this.doPass(tk, null, true);
        else if (sp.kind === 'goal_kick' && Math.random() < 0.4) this.longThrow(tk, 0.8);
        else this.doPass(tk, null, sp.kind === 'kickoff' ? false : Math.random() < 0.3);
      }
    }
  }

  private resumePlay() {
    this.state = 'play'; this.stateT = 0;
    this.hud.msg(null);
    if (this.cam.mode === 'behind') this.cam.broadcast();
    this.sp = null;
  }

  private goal(side: number, at = this.ball.pos.clone()) {
    if (this.mini) { this.mini.goal(at); return; }
    if (this.pens && this.shotPen) { this.hud.big(t('goal'), true); audio.crowdReact('goal', 0.9); this.shotPen = false; this.later(1.4, () => this.penResult(true)); this.state = 'penalties'; return; }
    if (this.opts.mode === 'training') { this.trainingGoal(); return; }
    const scorer = this.teams.find((tm) => tm.dir === side)!;
    const by = this.ball.lastTouch;
    const own = !!by && by.team !== scorer;
    scorer.score++;
    for (const p of this.all) { if (p.kick && !p.kick.done) p.kick = null; p.sliding = 0; }
    this.pendingSave = null;
    this.hud.setScore(this.teams[0].score, this.teams[1].score);
    this.state = 'goal'; this.stateT = 0;
    this.lastScorer = own ? null : by;
    this.lastGoalKind = this.lastKick?.by === by ? this.lastKick!.kind : null;
    if (by && !own) { by.goals++; this.addStyle(scorer, 'goal', by); }
    const kindLabel = this.lastGoalKind ? LABEL[this.lastGoalKind] : undefined;
    this.hud.big(own ? t('own_goal') : t('goal'), true);
    if (kindLabel && !own) this.later(1.6, () => this.hud.big(t(kindLabel)));
    audio.crowdReact('goal', 1);
    audio.play('whistle_short', 0.6);
    this.world.excitement = 1.2;
    this.world.grade.uniforms.flash.value = 0.6;
    this.cam.shake(0.5, 0.6);
    this.fx.confettiBurst(new THREE.Vector3(side * 14, 0, -12), 160, 16);
    this.fx.confettiBurst(new THREE.Vector3(side * 21, 0, 0), 120, 10);
    this.kickoffTeam = scorer.opp;
    this.onEvent?.('goal', by ?? undefined, { own, kind: this.lastGoalKind, team: scorer });
    // comemoração
    const celeb = ['celebrate_knee_slide', 'celebrate_samba', 'celebrate_point_sky', 'celebrate_fist', 'run_airplane', 'celebrate_cartwheel', 'dance_1'];
    const hero = by && !own ? by : scorer.field.find((p) => !p.isGK)!;
    hero.ath.play(celeb[(Math.random() * celeb.length) | 0], 0.15);
    hero.kick = null; hero.stun = 0; hero.vel.set(0, 0, 0);
    hero.ath.locked = 99;
    this.celebHero = hero;
    for (const p of scorer.field) if (p !== hero && !p.isGK) { p.target.copy(hero.pos).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)); }
    for (const p of scorer.opp.field) { if (p.isGK && p.stun > 0) continue; p.ath.play(p.isGK ? 'gk_miss' : Math.random() < 0.5 ? 'hands_on_head' : 'sad', 0.2); p.ath.locked = 99; p.vel.set(0, 0, 0); }
    this.cam.orbit(hero.pos, 4.2, 1.4, Math.atan2(this.world.camera.position.x - hero.pos.x, this.world.camera.position.z - hero.pos.z), 0.45);
    this.hud.cinema(true);
  }
  celebHero: Player | null = null;

  private updateGoalCele(dt: number) {
    const hero = this.celebHero;
    if (hero) this.cam.orbitTarget.lerp(hero.pos, 0.1);
    for (const p of this.celebHero?.team.field ?? []) {
      if (p === hero || p.isGK) continue;
      const d = p.target.clone().sub(p.pos).setY(0);
      if (d.length() > 1.2) { p.vel.copy(d.setLength(6)); p.faceTo(p.vel, dt); }
      else { p.vel.set(0, 0, 0); if (p.ath.current !== 'clap' && p.ath.current !== 'celebrate_samba') { p.ath.play(Math.random() < 0.5 ? 'clap' : 'celebrate_samba', 0.2); p.ath.locked = 99; } }
    }
    this.world.grade.uniforms.flash.value *= Math.exp(-dt * 5);
    if (this.stateT > 4.2 || (this.stateT > 1 && input.menu.start)) {
      this.hud.cinema(false);
      for (const p of this.all) p.ath.locked = 0;
      if (this.opts.mode !== 'training' && this.replay.start(5)) {
        this.state = 'replay'; this.stateT = 0;
        this.hud.replay(true);
        this.world.after.enabled = true; (this.world.after.uniforms as any).damp.value = 0.45;
        const f = this.replay.focusPoint();
        const side = Math.sign(f.x || 1);
        this.replayAngle = (this.replayAngle + 1) % 3;
        this.replayCam(side);
      } else this.afterGoal();
    }
  }
  private replayAngle = 0;
  private replayCam(side: number) {
    const a = this.replayAngle;
    if (a === 0) this.cam.fixed(new THREE.Vector3(side * (FIELD.HL + 5), 2.4, 0.5), new THREE.Vector3(side * 8, 1, 0), 40);
    else if (a === 1) this.cam.fixed(new THREE.Vector3(side * 10, 1.2, 13), new THREE.Vector3(side * 14, 1, 0), 36);
    else this.cam.fixed(new THREE.Vector3(side * 6, 7, -12), new THREE.Vector3(side * 13, 0.5, 0), 38);
  }

  private updateReplay(dt: number) {
    const ok = this.replay.apply(dt, this.onField, this.ball);
    const f = this.replay.focusPoint();
    this.cam.look.lerp(f, 0.12);
    this.cam.update(dt, f, 1);
    this.fx.update(dt * this.replay.speed);
    if (!ok || (this.stateT > 0.6 && input.menu.start)) {
      this.hud.replay(false);
      this.world.after.enabled = false;
      this.afterGoal();
    }
  }

  private afterGoal() {
    if (this.opts.mode === 'training') { this.trainingReset(); return; }
    if (this.extra) { this.endPeriod(); return; } // gol de ouro na prorrogação
    this.beginKickoff(this.kickoffTeam);
  }

  private endPeriod() {
    this.state = 'periodEnd'; this.stateT = 0;
    this.refWhistle(this.period >= 3 ? 'whistle_end' : 'whistle_long');
    this.ball.owner = null; this.ball.held = false;
    for (const p of this.all) { p.vel.multiplyScalar(0.2); p.kick = null; }
  }

  private afterPeriod() {
    const [h, a] = this.teams;
    if (this.period < 3) { this.beginHalftime(); return; }
    if (h.score === a.score && (this.opts.noDraw || this.opts.mode === 'cup')) {
      if (!this.extra) { this.extra = true; this.period = 4; this.clock = 0; this.hud.big(t('extra_time'), true); this.beginKickoff(this.kickoffTeam.opp); return; }
      this.beginPens(); return;
    }
    this.beginFulltime();
  }

  // ------------------------------------------------------------------ intervalo
  private beginHalftime() {
    this.state = 'halftime'; this.stateT = 0;
    this.hud.show(false);
    audio.playMusic('halftime', 800);
    // jogadores saem para as laterais, dançarinas entram
    this.all.forEach((p, i) => { p.pos.set((p.team.side ? 1 : -1) * (3 + (i % 5) * 1.4), 0, -FIELD.HW - 4.5); p.yaw = Math.PI; p.vel.set(0, 0, 0); p.ath.play('idle', 0); p.sync(); });
    this.ball.place(0, -FIELD.HW - 3);
    if (!this.dancers.length) {
      for (let i = 0; i < 4; i++) { const d = new Athlete(`textures/kits/dancer_${i}.webp`); this.dancers.push(d); this.group.add(d.root); }
    }
    this.dancers.forEach((d, i) => { d.root.visible = true; d.root.position.set(-3 + i * 2, 0, 1 + (i % 2) * 1.2); d.root.rotation.y = 0.15 * (i - 1.5); d.play(`dance_${(i % 3) + 1}`, 0); });
    this.dancerOn = true;
    this.cam.orbit(new THREE.Vector3(0, 0, 1.5), 9, 2.6, -0.6, 0.12);
    this.onHalftime?.(true);
    this.world.excitement = 0.9;
  }

  private updateHalftime(dt: number) {
    for (const d of this.dancers) d.update(dt);
    for (const p of this.all) { p.ath.update(dt); p.sync(); }
    if (Math.random() < dt * 2) this.fx.confettiBurst(new THREE.Vector3(0, -2, 1), 20, 10);
    if (this.stateT > 14 || (this.stateT > 1.2 && input.menu.start)) this.endHalftime();
  }

  endHalftime() {
    if (this.state !== 'halftime') return;
    this.dancers.forEach((d) => (d.root.visible = false));
    this.dancerOn = false;
    this.onHalftime?.(false);
    this.hud.show(true);
    audio.playMusic(null, 800);
    this.period++; this.clock = 0;
    for (const tm of this.teams) { tm.dir = (tm.dir * -1) as 1 | -1; for (const p of [...tm.players, ...tm.bench]) p.stamina = Math.min(1, p.stamina + 0.45); }
    // IA troca jogadores cansados
    for (const tm of this.teams) if (!tm.human) tm.players.forEach((p, i) => { if (i > 0 && p.stamina < 0.6 && Math.random() < 0.6) this.substitute(tm, i, i); });
    this.hud.big(`${this.period}${t('period')}`);
    this.beginKickoff(this.period % 2 === 0 ? this.teams[1] : this.teams[0]);
  }

  substitute(tm: Team, onIdx: number, benchIdx: number) {
    const r = tm.substitute(onIdx, benchIdx);
    if (!r) return;
    this.group.remove(r.out.ath.root); this.group.add(r.inn.ath.root);
    r.inn.sync();
    this.replay.clear();
    this.onEvent?.('sub', r.inn, r.out);
  }

  private returnPlayer(p: Player) {
    p.sentOff = 0; p.yellow = 0; p.fouls = 0;
    p.pos.set(0, 0, -FIELD.HW); p.sync();
  }

  // ------------------------------------------------------------------ fim de jogo
  private beginFulltime() {
    this.state = 'fulltime'; this.stateT = 0;
    const [h, a] = this.teams;
    const winner = h.score + h.penScore > a.score + a.penScore ? h : a.score + a.penScore > h.score + h.penScore ? a : null;
    for (const tm of this.teams) for (const p of tm.field) {
      p.vel.set(0, 0, 0); p.kick = null;
      p.ath.play(!winner ? 'clap' : tm === winner ? (Math.random() < 0.5 ? 'celebrate_samba' : 'celebrate_fist') : (Math.random() < 0.5 ? 'sad' : 'hands_on_head'), 0.3);
      p.ath.locked = 999;
    }
    const mom = this.manOfMatch();
    this.cam.orbit(mom.pos, 4.5, 1.5, 0, 0.25);
    this.hud.msg(null);
    this.later(2.5, () => this.hud.show(false));
    this.hud.big(t('full_time'), true);
    if (winner?.human || (!winner && h.human)) { audio.playMusic('victory', 600); }
    audio.crowdReact('applause', 1);
    this.fx.confettiBurst(new THREE.Vector3(0, 0, 0), 300, 30);
    this.later(3.2, () => this.onEnd?.({ home: h, away: a, winner, pens: !!this.pens, extra: this.extra, mom }));
  }

  manOfMatch() {
    const all = this.all.filter((p) => p.onField || true);
    const winner = this.teams[0].score > this.teams[1].score ? this.teams[0] : this.teams[1].score > this.teams[0].score ? this.teams[1] : null;
    return all.sort((x, y) => (y.goals * 300 + y.style + (y.team === winner ? 200 : 0)) - (x.goals * 300 + x.style + (x.team === winner ? 200 : 0)))[0];
  }

  private updateFulltime(dt: number) {
    for (const p of this.all) { p.ath.update(dt); }
  }

  // ------------------------------------------------------------------ pênaltis
  private beginPens() {
    this.state = 'penalties'; this.stateT = 0;
    this.pens = { taker: 0, kicks: [[], []], turn: 0, phase: 'aim', t: 0 };
    this.hud.big(t('penalties'), true);
    this.setupPenKick();
  }
  private setupPenKick() {
    const pn = this.pens!;
    const tm = this.teams[pn.turn];
    const takers = tm.field.filter((p) => !p.isGK).sort((a, b) => b.stat('chute') - a.stat('chute'));
    const taker = takers[Math.floor(pn.kicks[pn.turn].length) % takers.length];
    const gx = this.goalX(tm);
    const spot = new THREE.Vector3(gx - tm.dir * FIELD.PEN, 0, 0);
    this.setPiece('penalty', tm, spot);
    this.state = 'penalties';
    this.sp!.taker = taker;
    taker.pos.copy(spot).add(new THREE.Vector3(-tm.dir * 0.6, 0, 0)); taker.yaw = Math.atan2(tm.dir, 0); taker.sync();
    if (tm.devices.length) { tm.players.forEach((p) => (p.device = null)); taker.device = tm.devices[0]; }
    pn.phase = 'aim'; pn.t = 0;
  }
  private updatePens(dt: number) {
    const pn = this.pens!;
    pn.t += dt;
    const tm = this.teams[pn.turn];
    const tk = this.sp?.taker;
    if (pn.phase === 'aim' && tk) {
      if (!tk.device && pn.t > 1.8 && !tk.kick) this.doShoot(tk, 0.7 + Math.random() * 0.25, new THREE.Vector3(0, 0, Math.random() < 0.5 ? -1 : 1));
      if (tk.kick?.done || (this.ball.speed > 2 && !this.ball.owner)) { pn.phase = 'flight'; pn.t = 0; this.state = 'play'; this.shotPen = true; }
    }
  }
  shotPen = false;
  /** Chamado pelo loop quando a cobrança termina (gol, defesa ou fora). */
  penResult(scored: boolean) {
    const pn = this.pens!;
    pn.kicks[pn.turn].push(scored);
    this.teams[pn.turn].penScore += scored ? 1 : 0;
    this.hud.msg(`${t('penalties')}: ${this.teams[0].penScore} × ${this.teams[1].penScore}`);
    const [a, b] = pn.kicks;
    const done = (a.length >= 3 && b.length >= 3 && a.length === b.length && this.teams[0].penScore !== this.teams[1].penScore)
      || (a.length <= 3 && b.length <= 3 && (this.teams[0].penScore > this.teams[1].penScore + (3 - b.length) || this.teams[1].penScore > this.teams[0].penScore + (3 - a.length)));
    if (done) { this.shotPen = false; this.beginFulltime(); return; }
    pn.turn = pn.turn === 0 ? 1 : 0;
    this.shotPen = false;
    this.state = 'penalties';
    this.later(0.8, () => this.setupPenKick());
  }

  // ------------------------------------------------------------------ árbitro
  private refWhistle(s: 'whistle_short' | 'whistle_long' | 'whistle_end' | 'whistle_foul' | null) {
    if (s) audio.play(s, 0.9);
    this.ref.play('ref_whistle', 0.1);
  }
  private updateRef(dt: number) {
    this.refT += dt;
    if (this.state === 'play' || this.state === 'setpiece' || this.state === 'kickoff') {
      const want = new THREE.Vector3(this.ball.pos.x * 0.85, 0, THREE.MathUtils.clamp(this.ball.pos.z - 7, -FIELD.HW + 1, FIELD.HW - 4));
      const d = want.sub(this.refPos);
      const sp = Math.min(6, d.length() * 1.5);
      const vel = d.setLength(sp);
      this.refPos.addScaledVector(vel, dt);
      const look = this.ball.pos.clone().sub(this.refPos);
      this.refYaw = Math.atan2(look.x, look.z);
      this.ref.locomote(sp);
    } else if (this.state === 'halftime') { this.refPos.set(0, 0, -FIELD.HW - 3); this.refYaw = 0; this.ref.locomote(0); }
    this.ref.root.position.copy(this.refPos);
    this.ref.root.rotation.y = this.refYaw;
    this.ref.update(dt);
  }

  // ------------------------------------------------------------------ HUD
  private updateHud() {
    const h = this.hud;
    h.setClock(Math.min(3, this.period), this.clock, this.extra);
    this.teams.forEach((tm, i) => { h.setHeat(i, tm.fire > 0 ? tm.fire / MOVES.fireDuration : tm.heat, tm.fire > 0); h.setMult(i, tm.multiplier); });
    const cam = this.world.camera;
    const live = ['play', 'kickoff', 'setpiece', 'penalties'].includes(this.state);
    const humans = this.all.filter((p) => p.device && p.onField);
    const left = humans.find((p) => p.team.side === 0) ?? null;
    const right = humans.find((p) => p.team.side === 1) ?? null;
    const nearestOpp = (p: Player | null) => p ? [...p.team.opp.field].sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0] : null;
    const closest = (tm: Team) => [...tm.field].sort((a, b) => a.pos.distanceTo(this.ball.pos) - b.pos.distanceTo(this.ball.pos))[0] ?? null;
    h.setPlayer(0, left ?? (right ? nearestOpp(right) : closest(this.teams[0])));
    h.setPlayer(1, right ?? (left ? nearestOpp(left) : closest(this.teams[1])));
    for (let i = 0; i < 2; i++) {
      const p = humans[i] ?? null;
      h.marker(i, live ? p : null, cam, p ? (p.team.devices.length > 1 || this.teams[0].human && this.teams[1].human ? `${p.team.devices.indexOf(p.device!) + 1 + (p.team.side && this.teams[0].human ? 1 : 0)}P` : '1P') : '');
    }
    const cpuCarrier = this.ball.owner && !this.ball.owner.device ? this.ball.owner : null;
    h.marker(2, live && cpuCarrier ? cpuCarrier : null, cam);
    // bola aérea ao alcance do jogador humano: aviso "CHUTE!" (bicicleta / voleio / cabeçada)
    const aerialMe = live && this.state === 'play' ? humans.find((p) => !this.ball.owner && this.aerialChance(p) && this.ball.vel.y < 1.5 && this.ball.speed > 3) ?? null : null;
    this.aerialCue = !!aerialMe;
    if (aerialMe && this.ball.lastTouch !== this.cueFor) { this.cueFor = this.ball.lastTouch; h.worldPop('CHUTE!', aerialMe.pos.clone().setY(2.6), cam, '#ffd21f'); }
    if (!this.ball.airborne) this.cueFor = null;
    // indicador do passe: quem recebe se o jogador apertar PASSE agora
    const carrier = humans.find((p) => (this.ball.owner === p && !this.ball.held) || (this.sp?.taker === p && this.state !== 'play')) ?? null;
    if (live && carrier && humans.length === 1 && !this.mini) { const s = input.state(carrier.device!); h.passTarget(this.pickPassTarget(carrier, new THREE.Vector3(s.mx, 0, s.my), false), cam); }
    else h.passTarget(null, cam);
    const shooter = humans.find((p) => p.shootHold > 0) ?? null;
    h.powerBar(shooter, shooter?.shootHold ?? 0, cam);
    if (this.state === 'play' && this.stateT > 2.5 && !this.teams.some((tm) => tm.human && tm.heat >= 1 && tm.fire <= 0)) h.msg(null);
  }

  // ------------------------------------------------------------------ treino
  training = { bicycle: 0, sombrero: 0, volley: 0, done: false };
  trainer: Player | null = null;
  private setupTraining() {
    const [home, away] = this.teams;
    away.players.forEach((p) => { p.sentOff = 1e9; });
    home.players.forEach((p, i) => { if (i !== 4 && i !== 2) p.sentOff = 1e9; });
    this.trainer = home.players[2];
    home.dir = 1;
    const cone = (x: number, z: number) => {
      const o = assets.gltf('models/props/cone.glb').scene.clone(true);
      o.position.set(x, 0, z); o.scale.setScalar(1.6); this.group.add(o); this.trainingCones.push(o);
    };
    for (const [x, z] of [[2, -3], [6, 2], [10, -1], [-4, 4], [-2, -6]]) cone(x, z);
  }
  private trainingGoal() {
    const k = this.lastKick?.kind;
    if (k === 'bicycle_kick' || k === 'scissor_kick') this.training.bicycle++;
    if (k === 'volley') this.training.volley++;
    this.hud.big(k && LABEL[k] ? t(LABEL[k]!) : t('goal'), true);
    audio.crowdReact('applause', 0.8);
    this.fx.confettiBurst(new THREE.Vector3(18, 0, 0), 60, 6);
    this.state = 'goal'; this.stateT = 3.2; this.celebHero = null;
    this.onEvent?.('training', undefined, this.training);
    this.later(1.2, () => this.trainingReset());
  }
  trainingReset() {
    const p = this.teams[0].players[4];
    this.state = 'play'; this.stateT = 0;
    this.ball.place(p.pos.x + 1, p.pos.z);
    this.hud.msg(null);
    this.cam.broadcast();
  }
  /** Treinador cruza a bola para o jogador (para treinar bicicleta/voleio). */
  trainerCross() {
    const tr = this.trainer, me = this.teams[0].players[4];
    if (!tr || !me) return;
    tr.pos.set(me.pos.x + 6, 0, -FIELD.HW + 1.5); tr.sync();
    this.ball.place(tr.pos.x, tr.pos.z + 0.4);
    const tp = me.pos.clone().addScaledVector(me.forward, 0.6).setY(1.5);
    this.ball.kick(ballistic(this.ball.pos, tp, 1.1), tr);
    tr.ath.play('pass_lob', 0.05);
    audio.play('kick', 0.6);
  }
}

function distToSeg(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const ab = b.clone().sub(a).setY(0), ap = p.clone().sub(a).setY(0);
  const t = THREE.MathUtils.clamp(ap.dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1);
  return ap.sub(ab.multiplyScalar(t)).length();
}
