import * as THREE from 'three';
import type { Match } from './Match';
import type { Player, KickKind } from './Player';
import { FIELD } from './Ball';
import { assets } from '../core/Assets';
import { audio } from '../core/Audio';
import { progress } from '../core/Progress';

export type MiniKind = 'pk' | 'juggle' | 'target';
export type MiniResult = { kind: MiniKind; score: number; best: boolean; record: number; stars: number; label: string };

/** Base dos minijogos "Desafios da Praia": usam o mesmo motor da partida com ganchos. */
export abstract class MiniGame {
  abstract kind: MiniKind;
  m!: Match;
  me!: Player;
  done = false;
  t = 0;
  onEnd?: (r: MiniResult) => void;
  attach(m: Match) {
    this.m = m;
    const [home, away] = m.teams;
    home.dir = 1; away.dir = -1;
    for (const p of [...home.players, ...away.players]) p.sentOff = 1e9;
    this.me = home.players[4];
    this.me.sentOff = 0;
  }
  start() {
    const m = this.m;
    this.me.device = m.teams[0].devices[0] ?? 'kb';
    m.hud.show(false);
    m.cam.broadcast(true);
  }
  update(_dt: number) { /* opcional */ }
  /** true = tratado pelo minijogo */
  goal(_p: THREE.Vector3): boolean { return true; }
  out(): boolean { return true; }
  bounce(_speed: number) { /* opcional */ }
  kicked(_p: Player, _k: KickKind) { /* opcional */ }
  finish(score: number, label: string, stars: number, rec: 'pk' | 'juggle' | 'target') {
    if (this.done) return;
    this.done = true;
    const best = progress.record(rec, score);
    this.m.hud.challenge(null);
    this.m.later(1.4, () => this.onEnd?.({ kind: this.kind, score, best, record: progress.data.records[rec], stars, label }));
  }
  panel(lines: string[]) { this.m.hud.challenge(lines.map((text) => ({ text, ok: false }))); }
}

/** Pênaltis de Ouro: 5 cobranças contra um goleiro cada vez melhor. */
export class PenaltyGame extends MiniGame {
  kind = 'pk' as const;
  kicks: boolean[] = [];
  waiting = false;
  waitT = 0;
  nextT = 0;
  attach(m: Match) {
    super.attach(m);
    m.teams[1].players[0].sentOff = 0; // goleiro adversário
  }
  start() { super.start(); this.setup(); }
  private setup() {
    const m = this.m;
    const home = m.teams[0];
    m.difficulty = ([0, 1, 1, 2, 2] as const)[Math.min(4, this.kicks.length)];
    m.setPiece('penalty', home, new THREE.Vector3(m.goalX(home) - home.dir * FIELD.PEN, 0, 0));
    this.me.device = home.devices[0] ?? 'kb';
    this.waiting = true; this.waitT = 0;
    this.show();
  }
  private show() {
    const dots = [0, 1, 2, 3, 4].map((i) => (i < this.kicks.length ? (this.kicks[i] ? '●' : '✕') : '○')).join(' ');
    this.panel([`PÊNALTIS DE OURO · cobrança ${Math.min(5, this.kicks.length + 1)}/5`, dots, `Recorde: ${progress.data.records.pk}/5`, 'Mire com o direcional · segure [K] para a força']);
  }
  private result(ok: boolean) {
    if (!this.waiting) return;
    this.waiting = false;
    this.kicks.push(ok);
    this.m.hud.big(ok ? 'GOL!' : 'DEFENDEU!', ok);
    audio.crowdReact(ok ? 'goal' : 'ooh', 0.9);
    this.show();
    this.nextT = 1.8;
    if (this.kicks.length >= 5) {
      const n = this.kicks.filter(Boolean).length;
      if (n === 5) progress.add('pk_ouro');
      this.finish(n, `${n}/5 gols`, n >= 5 ? 3 : n >= 4 ? 2 : n >= 3 ? 1 : 0, 'pk');
    }
  }
  update(dt: number) {
    const m = this.m, b = m.ball;
    if (this.done) return;
    if (!this.waiting) { this.nextT -= dt; if (this.nextT <= 0) this.setup(); return; }
    if (m.state === 'play') {
      this.waitT += dt;
      // defesa: assim que o goleiro toca na bola (ou ela para) a cobrança está decidida
      if (this.waitT > 0.3 && !b.inGoal && (b.held || b.speed < 1.0 || (b.owner && b.owner.isGK) || b.lastTouch?.isGK)) this.result(false);
      if (this.waitT > 4) this.result(false);
    }
  }
  goal() { this.result(true); return true; }
  out() { this.result(false); return true; }
}

/** Embaixadinhas: aperte [I] no tempo certo e não deixe a bola cair. */
export class JuggleGame extends MiniGame {
  kind = 'juggle' as const;
  count = 0;
  started = false;
  time = 60;
  perfect = 0;
  start() {
    super.start();
    const m = this.m;
    this.me.pos.set(0, 0, 3); this.me.yaw = 0; this.me.sync();
    m.state = 'play'; m.stateT = 0;
    m.ball.place(0, 3.5);
    m.takeBall(this.me);
    m.cam.fixed(new THREE.Vector3(2.5, 2.2, 9.5), new THREE.Vector3(0, 1.0, 3), 40);
    this.show();
  }
  private show() {
    this.panel([`EMBAIXADINHAS: ${this.count}`, `Perfeitas: ${this.perfect} · Recorde: ${progress.data.records.juggle}`, `Tempo: ${Math.ceil(this.time)}s`, 'Aperte [I] quando a bola descer · não deixe cair']);
  }
  update(dt: number) {
    if (this.done) return;
    const m = this.m;
    if (this.started) { this.time -= dt; if (this.time <= 0) this.end('TEMPO!'); }
    // câmera acompanha o jogador
    m.cam.look.lerp(this.me.pos.clone().setY(1.0), 0.05);
    m.cam.pos.lerp(this.me.pos.clone().add(new THREE.Vector3(2.5, 2.2, 6.5)), 0.05);
    if (Math.floor(this.time * 4) !== Math.floor((this.time + dt) * 4)) this.show();
  }
  kicked(p: Player, k: KickKind) {
    if (p !== this.me || k !== 'juggle' || this.done) return;
    const y = this.m.ball.pos.y;
    this.started = true;
    this.count++;
    if (this.count > 1 && y > 0.4 && y < 0.85) { this.perfect++; this.m.hud.worldPop('PERFEITO!', p.pos.clone().setY(2.4), this.m.world.camera, '#7fd2ff'); }
    if (this.count % 10 === 0) { this.m.hud.big(`${this.count}!`, true); audio.crowdReact('applause', 0.7); }
    if (this.count >= 25) progress.add('embaixadinha');
    this.show();
  }
  bounce(speed: number) { if (this.started && speed > 0.5) this.end('CAIU!'); }
  private end(msg: string) {
    if (this.done) return;
    this.m.hud.big(msg, msg === 'TEMPO!');
    const score = this.count + this.perfect;
    this.finish(score, `${this.count} embaixadinhas (+${this.perfect} perfeitas)`, score >= 40 ? 3 : score >= 20 ? 2 : score >= 8 ? 1 : 0, 'juggle');
  }
  goal() { return true; }
  out() { this.end('SAIU!'); return true; }
}

type Target = { sprite: THREE.Sprite; z: number; y: number; r: number; pts: number; moving: boolean; hit: number };

/** Tiro ao Alvo: 10 bolas, alvos nos cantos do gol (e um alvo móvel a partir da 6ª). */
export class TargetGame extends MiniGame {
  kind = 'target' as const;
  shots = 0;
  score = 0;
  waiting = false;
  waitT = 0;
  nextT = 0;
  targets: Target[] = [];
  group = new THREE.Group();
  start() {
    super.start();
    const tex = assets.tex('vfx/circle_05.png');
    const mk = (z: number, y: number, r: number, pts: number, color: number, moving = false) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(r * 2.4);
      s.position.set(FIELD.HL + 0.05, y, z);
      this.group.add(s);
      this.targets.push({ sprite: s, z, y, r, pts, moving, hit: 0 });
    };
    mk(-2.15, 1.75, 0.5, 100, 0xffd21f); mk(2.15, 1.75, 0.5, 100, 0xffd21f);
    mk(-2.15, 0.45, 0.55, 50, 0x7fd2ff); mk(2.15, 0.45, 0.55, 50, 0x7fd2ff);
    mk(0, 1.1, 0.42, 150, 0xff3e8a, true);
    this.m.group.add(this.group);
    this.next();
  }
  private next() {
    const m = this.m;
    if (this.shots >= 10) {
      if (this.score >= 500) progress.add('mira');
      this.finish(this.score, `${this.score} pontos`, this.score >= 600 ? 3 : this.score >= 350 ? 2 : this.score >= 150 ? 1 : 0, 'target');
      return;
    }
    const x = 6 + Math.random() * 4, z = (Math.random() - 0.5) * 10;
    this.me.pos.set(x - 1, 0, z); this.me.yaw = Math.atan2(FIELD.HL - x, -z * 0.3); this.me.vel.set(0, 0, 0); this.me.kick = null; this.me.sync();
    m.ball.owner = null; m.ball.held = false;
    m.ball.place(x - 0.5, z);
    m.takeBall(this.me);
    m.state = 'play'; m.stateT = 0;
    m.cam.broadcast(true);
    this.waiting = true; this.waitT = 0;
    this.show();
  }
  private show() {
    this.panel([`TIRO AO ALVO · bola ${Math.min(10, this.shots + 1)}/10`, `Pontos: ${this.score} · Recorde: ${progress.data.records.target}`,
      'Amarelo 100 · azul 50 · rosa (móvel, a partir da 6ª) 150 · rede 10']);
  }
  private result(pts: number, label: string) {
    if (!this.waiting) return;
    this.waiting = false;
    this.shots++;
    this.score += pts;
    this.m.hud.big(label, pts >= 100);
    if (pts > 0) this.m.hud.stylePop(0, pts);
    this.show();
    this.nextT = 1.5;
  }
  update(dt: number) {
    if (this.done) return;
    const m = this.m, b = m.ball;
    const tt = m.world.time;
    for (const tg of this.targets) {
      if (tg.moving) { tg.sprite.visible = this.shots >= 5; tg.z = Math.sin(tt * 1.4) * 1.8; tg.sprite.position.z = tg.z; }
      tg.hit = Math.max(0, tg.hit - dt);
      const pulse = 1 + Math.sin(tt * 4) * 0.06 + tg.hit * 1.5;
      tg.sprite.scale.setScalar(tg.r * 2.4 * pulse);
    }
    if (!this.waiting) { this.nextT -= dt; if (this.nextT <= 0) this.next(); return; }
    if (!b.owner && b.lastTouch === this.me) {
      this.waitT += dt;
      if ((this.waitT > 1.2 && b.speed < 0.8) || this.waitT > 5) this.result(0, 'FRACO!');
    }
  }
  goal(p: THREE.Vector3) {
    let best: Target | null = null;
    for (const tg of this.targets) {
      if (!tg.sprite.visible) continue;
      const d = Math.hypot(p.z - tg.z, p.y - tg.y);
      if (d < tg.r && (!best || tg.pts > best.pts)) best = tg;
    }
    if (best) { best.hit = 0.4; this.m.fx.kickBurst(new THREE.Vector3(FIELD.HL, best.y, best.z), new THREE.Vector3(1, 0, 0), 1, best.pts >= 150); this.result(best.pts, `NO ALVO! +${best.pts}`); }
    else this.result(10, 'NA REDE');
    return true;
  }
  out() { this.result(0, 'FORA!'); return true; }
}

export function makeMini(kind: MiniKind): MiniGame {
  return kind === 'pk' ? new PenaltyGame() : kind === 'juggle' ? new JuggleGame() : new TargetGame();
}
