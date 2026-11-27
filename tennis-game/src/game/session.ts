import * as THREE from 'three';
import { Match, type MatchEvent } from './match';
import { Venue } from '../world/venue';
import { FX } from '../render/fx';
import { CameraDirector } from '../render/camera';
import { Hud } from '../ui/hud';
import { Audio } from '../core/audio';
import { ReplayRecorder, ReplayPlayer } from './replay';
import type { Renderer } from '../render/renderer';
import type { PlayerDef, VenueDef, DifficultyId } from '../data/content';
import type { MatchConfig, Side } from './rules';
import { COURT } from './physics';
import { Save } from '../core/save';
import { Assets } from '../core/assets';

const STEP = 1 / 120;

export interface SessionOptions {
  p1: PlayerDef; p2: PlayerDef; venue: VenueDef; cfg: MatchConfig; difficulty: DifficultyId; p2Human: boolean; demo?: boolean; intro?: boolean;
  /** Doubles: [your partner, opponent's partner]. */
  partners?: [PlayerDef, PlayerDef];
}

type Flow = 'intro' | 'play' | 'afterPoint' | 'replay' | 'changeEnds' | 'matchEnd' | 'done';

export class Session {
  match: Match;
  venue: Venue;
  fx = new FX();
  /** Set while a menu showcase covers the demo rally: no ball trail. */
  ballHidden = false;
  cam: CameraDirector;
  hud: Hud | null = null;
  rec = new ReplayRecorder();
  replay: ReplayPlayer | null = null;
  flow: Flow = 'intro';
  flowT = 0;
  private acc = 0;
  private t = 0;
  private lastHighlight = false;
  onFinished: ((winner: Side) => void) | null = null;
  timeScale = 1;
  slowmo = 0;
  private replayCams: (() => void)[] = [];
  private footShadows: THREE.Mesh[] | null = null;

  constructor(private r: Renderer, public opts: SessionOptions, uiRoot: HTMLElement) {
    const scene = r.scene;
    this.venue = new Venue(opts.venue, scene, r.renderer);
    r.setExposure(opts.venue.exposure);
    r.setGrade(opts.venue.indoor ? 0.12 : -0.02, opts.venue.indoor ? 0.08 : 0.03);
    scene.add(this.fx.group);
    this.match = new Match(opts.p1, opts.p2, opts.venue, opts.cfg, { p2Human: opts.p2Human, difficulty: opts.difficulty, demo: opts.demo, partners: opts.partners }, scene);
    this.cam = new CameraDirector(r.camera);
    if (!opts.demo) this.hud = new Hud(uiRoot, this.match, [opts.demo ? 'COM' : '1P', opts.p2Human ? '2P' : 'COM']);
    this.match.start();
    if (opts.intro && !opts.demo) this.startIntro();
    else { this.flow = 'play'; this.cam.set({ kind: 'game', end: this.match.camEnd() }); this.hud?.showMarkers(); }
    Audio.crowdAmbience(true, 0.3);
  }

  private startIntro() {
    this.flow = 'intro';
    this.flowT = 0;
    const [a, b] = this.match.players;
    // 3 shots: crowd sweep, opponent close-up, player close-up
    this.cam.set({ kind: 'dolly', from: new THREE.Vector3(-9, 11, 4), to: new THREE.Vector3(9, 8, -2), look: new THREE.Vector3(0, 3, -26), dur: 2.6, t: 0 });
    this.replayCams = [
      () => this.cam.set({ kind: 'close', target: () => b.pos, offset: new THREE.Vector3(1.2, 1.6, b.end * -3.2) }),
      () => this.cam.set({ kind: 'close', target: () => a.pos, offset: new THREE.Vector3(-1.2, 1.6, a.end * -3.2) }),
    ];
    for (const p of this.match.players) p.athlete.play('arms_folded', { fade: 0 });
    if (this.hud) this.hud.el.style.opacity = '0';
  }

  skipIntro() {
    if (this.flow !== 'intro') return;
    this.flow = 'play';
    this.cam.set({ kind: 'game', end: this.match.camEnd() });
    for (const p of this.match.players) p.athlete.play(p.side === this.match.server ? 'idle' : 'ready');
    this.hud?.showMarkers();
    if (this.hud) this.hud.el.style.opacity = '1';
    Audio.play('vo_ready');
  }

  // ------------------------------------------------------------------ frame
  update(dt: number) {
    this.t += dt;
    this.flowT += dt;
    const m = this.match;
    if (this.flow === 'intro') {
      if (this.flowT > 2.6 && this.replayCams.length === 2) this.replayCams.shift()!();
      if (this.flowT > 4.6 && this.replayCams.length === 1) this.replayCams.shift()!();
      if (this.flowT > 6.6) this.skipIntro();
      for (const p of m.players) p.athlete.update(dt);
    } else if (this.flow === 'replay') {
      this.updateReplay(dt);
      if (this.flowT > 15) this.endReplay(); // watchdog: never stay stuck in a replay
    } else {
      // fixed-step simulation
      const scale = this.slowmo > 0 ? 0.35 : 1;
      if (this.slowmo > 0) this.slowmo -= dt;
      this.acc += Math.min(dt, 0.1) * scale;
      while (this.acc >= STEP) {
        m.update(STEP);
        this.acc -= STEP;
        this.handleEvents(m.drain());
        if (m.phase === 'rally' || m.phase === 'toss' || m.phase === 'pointOver') {
          this.rec.record(m.time, { ...m.ball.pos, vis: m.ball.visible, vx: m.ball.vel.x, vy: m.ball.vel.y, vz: m.ball.vel.z }, m.players.map((p) => p.athlete));
        }
      }
      this.updateFlow(dt);
    }
    // ball effects & camera
    const bp = new THREE.Vector3(m.ball.mesh.position.x, m.ball.mesh.position.y, m.ball.mesh.position.z);
    this.fx.ball(bp, m.ball.visible && !this.ballHidden && (m.phase === 'rally' || this.flow === 'replay'), this.r.camera, m.ball.speedKmh());
    const human = m.players[0].pos;
    this.cam.update(dt, bp, human);
    this.fx.update(dt, this.r.camera);
    // receiving hints for the local human player
    {
      const me = m.players[0];
      const show = !this.opts.demo && Save.data.options.hints && me.human && m.phase === 'rally' && m.lastHitter !== 0 && this.flow === 'play';
      const b = show && me.predBounce ? new THREE.Vector3(me.predBounce.x, 0, me.predBounce.z) : null;
      const spot = show && me.intercept && me.swingT < 0 ? m.hintSpot(me) : null;
      this.fx.hints(b, spot, this.t);
    }
    // soft contact shadows under the players' feet (grounding, also on low quality)
    this.footShadows ??= m.players.map(() => {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: Assets.t('textures/fx_dot.png'), color: '#000', transparent: true, opacity: 0.55, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.renderOrder = 1; this.fx.group.add(sh); return sh;
    });
    m.players.forEach((p, i) => { const sh = this.footShadows![i]; sh.position.set(p.athlete.root.position.x, 0.008, p.athlete.root.position.z); sh.visible = p.athlete.root.visible; const hop = p.athlete.root.position.y; sh.scale.setScalar(1 - hop * 0.8); });
    // racket swing arcs and footwork dust
    m.players.forEach((p, i) => {
      const a = p.athlete;
      const swinging = !!a.oneShot && ['forehand', 'backhand', 'volley', 'smash', 'bb_hit', 'pitch'].includes(a.oneShotName ?? '') && a.oneShot.time < a.oneShot.getClip().duration * 0.75;
      const grip = a.racket ? a.racket.getWorldPosition(new THREE.Vector3()) : null;
      this.fx.swingTrail(i, swinging ? a.racketHeadWorld(new THREE.Vector3()) : null, swinging ? grip : null, this.r.camera);
      const acc = a.accel.length();
      if (this.flow !== 'replay' && acc > 16 && Math.random() < dt * 12) this.fx.dust(new THREE.Vector3(p.pos.x, 0.03, p.pos.z), this.opts.venue.surface.tex, this.opts.venue.surface.tex === 'clay' ? 0.6 : 0.35);
    });
    // officials and spectators follow the ball
    const watch = m.ball.visible ? bp : new THREE.Vector3(0, 1.2, 0);
    for (const o of this.venue.officials()) o.lookAt = watch;
    this.venue.crowd.watch.copy(watch);
    this.venue.update(dt, this.t);
    this.hud?.update(dt, this.r.camera);
  }

  private updateFlow(_dt: number) {
    const m = this.match;
    if (this.flow === 'play' && m.phase === 'pointOver') {
      this.flow = 'afterPoint';
      this.flowT = 0;
    }
    if (this.flow === 'afterPoint') {
      // close-up on the winner after ~0.6s for real points
      const isRealPoint = this.lastPointWinner !== null;
      if (isRealPoint && this.flowT > 0.7 && this.cam.shot.kind === 'game') {
        const w = m.players[this.lastPointWinner!];
        const front = w.end * -1;
        this.cam.set({ kind: 'close', target: () => w.pos, offset: new THREE.Vector3(1.0, 1.5, front * 3.4) }, true);
      }
      const wait = isRealPoint ? 2.3 : 1.2;
      if (this.flowT > wait) {
        if (m.score.winner !== null) { this.beginMatchEnd(); return; }
        if (this.lastHighlight && !this.opts.demo) { this.beginReplay(); return; }
        this.nextPoint();
      }
    }
    if (this.flow === 'changeEnds' && this.flowT > 1.4) {
      this.flow = 'play';
      document.getElementById('fade')!.classList.remove('on');
      this.cam.set({ kind: 'game', end: m.camEnd() });
    }
    if (this.flow === 'matchEnd') {
      if (this.flowT > 7 || (this.flowT > 2 && this.skipRequested)) {
        this.flow = 'done';
        this.onFinished?.(m.score.winner!);
      }
    }
    this.skipRequested = false;
  }

  skipRequested = false;
  requestSkip() {
    this.skipRequested = true;
    if (this.flow === 'intro') this.skipIntro();
    else if (this.flow === 'replay') this.endReplay();
  }

  private nextPoint() {
    const m = this.match;
    const before = m.players[0].end;
    this.lastPointWinner = null;
    this.lastHighlight = false;
    m.continueAfterPoint();
    this.fx.clearMarks();
    this.rec.clear();
    if (m.phase === 'matchOver') { this.beginMatchEnd(); return; }
    if (m.players[0].end !== before) {
      this.flow = 'changeEnds';
      this.flowT = 0;
      this.hud?.showBanner('TROCA DE LADO', 1.6);
      document.getElementById('fade')!.classList.add('on');
      setTimeout(() => document.getElementById('fade')!.classList.remove('on'), 500); // always: a stuck fade is a black screen
      this.cam.set({ kind: 'game', end: m.camEnd() });
    } else {
      this.flow = 'play';
      this.cam.set({ kind: 'game', end: m.camEnd() }, true);
    }
    this.hud?.showMarkers(1.5);
  }

  private beginReplay() {
    const clip = this.rec.clip(3.2);
    if (clip.length < 30) { this.nextPoint(); return; }
    this.flow = 'replay';
    this.flowT = 0;
    this.replay = new ReplayPlayer(clip, 0.6); // ~5 s of slow motion
    this.hud?.setReplay(true);
    const m = this.match;
    const angles = [
      () => this.cam.set({ kind: 'track', from: new THREE.Vector3(-11.5, 2.6, m.players[0].end * 5), target: () => m.ball.mesh.position.clone(), fov: 34 }),
      () => this.cam.set({ kind: 'track', from: new THREE.Vector3(7, 3.0, m.players[1].end * -(COURT.halfLength + 6)), target: () => m.ball.mesh.position.clone(), fov: 30 }),
      () => this.cam.set({ kind: 'orbit', center: new THREE.Vector3(0, 1, 0), radius: 15, height: 4.5, speed: 0.25, angle: 1.2 }),
    ];
    const pick = Math.floor(Math.random() * angles.length);
    angles[pick]();
    this.replayCams = [angles[(pick + 1) % angles.length]];
    Audio.setRateAll(0.6);
  }

  private updateReplay(dt: number) {
    if (!this.replay) return;
    const m = this.match;
    this.replay.update(dt, m.players.map((p) => p.athlete), (b) => {
      m.ball.mesh.position.set(b.x, b.y, b.z);
      m.ball.mesh.visible = b.vis;
      m.ball.state.v = { x: b.vx, y: b.vy, z: b.vz };
    });
    if (this.replayCams.length && this.flowT > this.replay.duration * 0.5) this.replayCams.shift()!();
    for (const p of m.players) p.pos.copy(p.athlete.root.position);
    if (this.replay.done || this.flowT > this.replay.duration + 0.3) this.endReplay();
  }

  private endReplay() {
    if (this.flow !== 'replay') return;
    this.replay = null;
    this.hud?.setReplay(false);
    Audio.setRateAll(1);
    for (const p of this.match.players) p.athlete.restoreFromReplay();
    this.nextPoint();
  }

  private beginMatchEnd() {
    this.flow = 'matchEnd';
    this.flowT = 0;
    const m = this.match;
    const w = m.players[m.score.winner!];
    const l = m.players[1 - m.score.winner!];
    w.athlete.play('cheer', { fade: 0.2 });
    l.athlete.play('frustrated', { fade: 0.2 });
    this.cam.set({ kind: 'orbit', center: w.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), radius: 4.5, height: 2.4, speed: 0.35, angle: 0 });
    this.venue.crowd.standing = 1;
    this.venue.crowd.excitement = 2;
    this.fx.confetti(new THREE.Vector3(w.pos.x, 0, w.pos.z));
    Audio.play('crowd_cheer_big', { vol: 1 });
    Audio.play('ump_game_over');
    const human = !this.opts.demo && w.side === 0;
    this.later(() => Audio.play(human || this.opts.p2Human ? 'jingle_win' : 'jingle_lose'), 900);
    this.later(() => Audio.play(human || this.opts.p2Human ? 'vo_you_win' : 'vo_you_lose'), 1800);
    for (let i = 0; i < 14; i++) this.later(() => this.cameraFlash(), 200 + i * 230);
    this.hud?.showBanner('GAME, SET AND MATCH', 4);
  }

  private cameraFlash() {
    const x = (Math.random() - 0.5) * 30, z = (Math.random() < 0.5 ? -1 : 1) * (22 + Math.random() * 6);
    this.fx.cameraFlash(new THREE.Vector3(x, 3 + Math.random() * 4, z));
    if (Math.random() < 0.3) Audio.play('camera', { vol: 0.25 });
  }

  // ------------------------------------------------------------------ match events -> audio/fx/hud
  private lastPointWinner: Side | null = null;
  private handleEvents(events: MatchEvent[]) {
    const m = this.match;
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const p = new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z);
          const pan = THREE.MathUtils.clamp(e.pos.x / 8, -1, 1) * m.camEnd();
          const kind = e.kind;
          if (kind === 'serve' || kind === 'smash' || e.power > 0.75) Audio.play('hit_hard', { vol: 1, rate: 0.95 + Math.random() * 0.1, pan });
          else if (kind === 'slice' || kind === 'drop' || kind === 'lob') Audio.play('hit_soft', { vol: 0.9, rate: 1.05, pan });
          else Audio.play('hit_mid', { vol: 0.95, rate: 0.95 + Math.random() * 0.15, pan });
          Audio.play(['swish1', 'swish2', 'swish3'][Math.floor(Math.random() * 3)], { vol: 0.35, pan });
          this.fx.impact(p, e.perfect);
          this.fx.trailColor.set(kind === 'slice' || kind === 'drop' ? '#59b8ff' : kind === 'lob' ? '#ffffff' : kind === 'smash' ? '#ff4d5a' : '#ffb347');
          if (e.perfect) { this.cam.addShake(0.12); this.slowmo = 0.12; }
          if (kind === 'smash') this.cam.addShake(0.2);
          this.hud?.setSpeed(e.speedKmh);
          this.venue.crowd.excitement = Math.min(1.2, this.venue.crowd.excitement + (m.rally > 5 ? 0.1 : 0.02));
          if (kind === 'serve') this.hud?.setMeter(null);
          break;
        }
        case 'bounce': {
          const p = new THREE.Vector3(e.pos.x, 0.02, e.pos.z);
          m.ball.squash = Math.min(1, e.speed / 10);
          Audio.play('bounce', { vol: Math.min(1, e.speed / 12) * 0.8, rate: this.opts.venue.surface.tex === 'clay' ? 0.8 : this.opts.venue.surface.tex === 'grass' ? 0.75 : 0.9 });
          this.fx.dust(p, this.opts.venue.surface.tex, Math.min(1.4, e.speed / 10));
          if (this.opts.venue.surface.tex === 'clay') this.fx.ballMark(p);
          break;
        }
        case 'net':
          Audio.play('net', { vol: 0.8 });
          if (e.cord) this.venue.crowd.excitement += 0.3;
          break;
        case 'call': {
          const red = e.text === 'OUT' || e.text === 'FAULT' || e.text === 'DOUBLE FAULT' || e.text === 'NET';
          this.hud?.call(e.text === 'ACE' ? 'ACE!' : e.text === 'DOUBLE FAULT' ? 'DUPLA FALTA' : e.text === 'FAULT' ? 'FALTA' : e.text === 'NET' ? 'REDE' : e.text, '', red ? 'red' : 'gold', 1.4);
          if (e.text === 'OUT') {
            const j = this.venue.lineJudges[Math.floor(Math.random() * this.venue.lineJudges.length)];
            j.play('point', { fade: 0.1 });
            Audio.play('crowd_ooh', { vol: 0.5 });
          }
          if (e.text === 'FAULT' || e.text === 'NET') Audio.play('crowd_ooh', { vol: 0.35 });
          if (e.text === 'ACE') { Audio.play('crowd_cheer', { vol: 0.6 }); this.venue.crowd.excitement = 1; }
          break;
        }
        case 'point': {
          this.lastPointWinner = e.winner;
          this.lastHighlight = e.highlight;
          const loud = Math.min(1, 0.3 + e.rally * 0.07);
          Audio.play(e.rally > 6 || e.highlight ? 'crowd_cheer' : 'applause', { vol: loud });
          this.venue.crowd.excitement = Math.max(this.venue.crowd.excitement, loud * 1.1);
          if (e.rally > 12 && Math.random() < 0.5) this.venue.crowd.startWave();
          // ball kid retrieves
          const kid = this.venue.ballKids[Math.floor(Math.random() * this.venue.ballKids.length)];
          this.later(() => kid.play('pickup', { fade: 0.15 }), 700);
          this.later(() => { kid.releaseOneShot(); kid.play('ready'); }, 1800);
          break;
        }
        case 'score': {
          this.hud?.refresh();
          const big = e.matchWon !== null ? 'GAME, SET AND MATCH' : e.setWon !== null ? 'SET' : e.gameWon !== null ? 'GAME' : '';
          this.later(() => {
            if (big) this.hud?.call(big, e.tag ?? '', 'gold', 2);
            else this.hud?.call('', `${callText(e.call)}${e.tag ? '  ·  ' + tagText(e.tag) : ''}`, 'green', 1.8);
          }, 450);
          this.later(() => this.umpireCall(e), 650);
          if (e.tag === 'MATCH POINT') for (let i = 0; i < 5; i++) this.later(() => this.cameraFlash(), 300 + i * 300);
          break;
        }
        case 'changeEnds':
          break;
        case 'serveReady':
          if (e.second) this.hud?.call('', '2º SAQUE', 'green', 1.2);
          break;
        case 'meter':
          this.hud?.setMeter(e.value);
          break;
        case 'swing':
          if (e.anim === 'roll') { /* whiff */ }
          break;
      }
    }
  }

  private umpireCall(e: Extract<MatchEvent, { type: 'score' }>) {
    const s = this.match.score;
    this.venue.umpire.play('point', { fade: 0.2 });
    this.later(() => { this.venue.umpire.releaseOneShot(); this.venue.umpire.play('sit'); }, 1200);
    if (e.matchWon !== null) return;
    if (e.tag === 'MATCH POINT') { Audio.play('ump_match_point'); return; }
    if (e.tag === 'SET POINT') { Audio.play('ump_set_point'); return; }
    if (e.setWon !== null) { Audio.play(e.setWon === s.server ? 'ump_set_receiver' : 'ump_set_server'); return; }
    if (e.gameWon !== null) {
      // after a game the server has already rotated: previous server = 1 - current
      Audio.play(e.gameWon === s.server ? 'ump_game_receiver' : 'ump_game_server');
      return;
    }
    const c = e.call;
    if (c === 'DEUCE') return; // no 'deuce' recording: the umpire stays silent rather than say 'forty'
    if (c === 'ADVANTAGE SERVER') { Audio.play('ump_advantage_server'); return; }
    if (c === 'ADVANTAGE RECEIVER') { Audio.play('ump_advantage_receiver'); return; }
    const parts = c.split(/\s*-\s*|\s+ALL/).filter(Boolean);
    const say = (w: string) => (w === 'LOVE' ? 'ump_love' : w === '15' ? 'ump_fifteen' : w === '30' ? 'ump_thirty' : w === '40' ? 'ump_fourty_five' : null);
    const first = say(parts[0]);
    if (first) Audio.play(first);
    if (parts[1]) { const second = say(parts[1]); if (second) this.later(() => Audio.play(second), 700); }
  }

  private disposed = false;
  /** setTimeout that is dropped once the session is disposed. */
  private later(f: () => void, ms: number) { setTimeout(() => { if (!this.disposed) f(); }, ms); }

  dispose() {
    this.disposed = true;
    this.venue.dispose(this.r.scene);
    this.r.scene.remove(this.fx.group);
    this.fx.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.geometry) return;
      m.geometry.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat?.dispose();
    });
    for (const p of this.match.players) { this.r.scene.remove(p.athlete.root); p.athlete.dispose(); }
    this.r.scene.remove(this.match.ball.mesh);
    this.hud?.dispose();
    Audio.crowdAmbience(false);
    Audio.setRateAll(1);
  }
}

function callText(c: string) {
  return c.replace('LOVE', '0').replace('ADVANTAGE SERVER', 'VANTAGEM SACADOR').replace('ADVANTAGE RECEIVER', 'VANTAGEM RECEBEDOR').replace('DEUCE', 'IGUAIS').replace(' ALL', ' IGUAIS');
}
function tagText(t: string) {
  return t === 'BREAK POINT' ? 'BREAK POINT' : t === 'DEUCE' ? 'DEUCE' : t;
}
