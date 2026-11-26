import * as THREE from 'three';
import { A } from '../core/Assets';
import { t } from '../core/Strings';
import type { Team } from '../match/Team';
import type { Player } from '../match/Player';

const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

/** HUD em HTML/CSS sobre o 3D (placar, medidores, marcadores e mensagens). */
export class Hud {
  root = el('div', 'screen hud');
  private goals: HTMLElement[] = [];
  private crests: HTMLElement[] = [];
  private golds: HTMLImageElement[] = [];
  private per = el('div', 'per');
  private time = el('div', 'time');
  private mult: HTMLElement[] = [el('div', 'mult l'), el('div', 'mult r')];
  private pl: { nm: HTMLElement; st: HTMLElement; card: HTMLImageElement }[] = [];
  private markers: HTMLElement[] = [];
  private power = el('div', 'power', '<i></i>');
  private offs: HTMLImageElement[] = [];
  private replayEl = el('div', 'replay', `R<small>${t('replay')}</small>`);
  private msgEl = el('div', 'msg');
  private lowerEl = el('div', 'lower');
  private chEl = el('div', 'challenge panel');
  private scoreEl = el('div', 'score');
  private v = new THREE.Vector3();

  constructor(home: Team, away: Team) {
    const mk = (team: Team, right: boolean) => {
      const crest = el('div', 'crest' + (right ? ' right' : ''));
      const blue = el('img') as HTMLImageElement; blue.src = A('ui/crest_blue.png');
      const gold = el('img', 'gold') as HTMLImageElement; gold.src = A('ui/crest_gold.png');
      crest.append(blue, gold);
      this.crests.push(crest); this.golds.push(gold);
      const bar = el('div', 'bar');
      const flag = el('img', 'flag') as HTMLImageElement; flag.src = A(`ui/flags/${team.id}.png`);
      const g = el('div', 'goals', '00'); this.goals.push(g);
      const tid = el('div', 'tid', team.id);
      if (right) bar.append(g, tid, flag); else bar.append(flag, tid, g);
      return right ? [bar, crest] : [crest, bar];
    };
    const clock = el('div', 'clock'); clock.append(this.per, this.time);
    this.scoreEl.append(...mk(home, false), clock, ...mk(away, true));
    this.root.append(this.scoreEl, ...this.mult);
    for (const side of ['l', 'r']) {
      const box = el('div', 'pl ' + side);
      const nm = el('div', 'nm');
      const card = el('img') as HTMLImageElement; card.style.display = 'none';
      const st = el('div', 'st', '<i></i>');
      box.append(nm, st);
      this.root.append(box);
      this.pl.push({ nm, st, card });
    }
    for (let i = 0; i < 4; i++) {
      const m = el('div', 'marker', `<img src="${A(i === 0 ? 'ui/marker_p1.png' : i === 1 ? 'ui/marker_p2.png' : 'ui/marker_cpu.png')}" style="width:100%"><b></b>`);
      m.style.display = 'none'; this.markers.push(m); this.root.append(m);
    }
    for (let i = 0; i < 2; i++) {
      const o = el('img', 'offs') as HTMLImageElement; o.src = A('ui/marker_p1.png'); o.style.display = 'none'; this.offs.push(o); this.root.append(o);
    }
    this.root.append(this.power, this.replayEl, this.msgEl, this.lowerEl, this.chEl, el('div', 'cine t'), el('div', 'cine b'));
    this.replayEl.style.display = 'none'; this.msgEl.style.display = 'none'; this.lowerEl.style.display = 'none'; this.chEl.style.display = 'none';
  }

  mount(ui: HTMLElement) { ui.appendChild(this.root); }
  unmount() { this.root.remove(); }
  show(on: boolean) { this.scoreEl.style.visibility = on ? 'visible' : 'hidden'; for (const p of this.pl) p.nm.parentElement!.style.visibility = on ? 'visible' : 'hidden'; }
  cinema(on: boolean) { this.root.classList.toggle('cinema', on); }

  setScore(a: number, b: number) { this.goals[0].textContent = String(a).padStart(2, '0'); this.goals[1].textContent = String(b).padStart(2, '0'); }
  setClock(period: number, sec: number, extra = false) {
    this.per.textContent = extra ? 'PRORR.' : `${period}${t('period')}`;
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    this.time.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  setHeat(side: number, heat: number, fire: boolean) {
    this.golds[side].style.clipPath = `inset(${(1 - heat) * 100}% 0 0 0)`;
    this.crests[side].classList.toggle('full', heat >= 1 || fire);
  }
  setMult(side: number, m: number) {
    this.mult[side].textContent = `x${m}`;
    this.mult[side].classList.toggle('on', m > 1);
  }
  setPlayer(side: number, p: Player | null) {
    const s = this.pl[side];
    if (!p) { s.nm.textContent = ''; return; }
    const card = p.yellow > 0 ? `<img src="${A(p.yellow > 1 ? 'ui/card_red.png' : 'ui/card_yellow.png')}">` : '';
    const html = side === 0 ? `${card}${p.data.number} ${p.name}` : `${p.name} ${p.data.number}${card}`;
    if (s.nm.innerHTML !== html) s.nm.innerHTML = html;
    (s.st.firstChild as HTMLElement).style.width = `${Math.round(p.stamina * 100)}%`;
  }

  private screen(p: THREE.Vector3, cam: THREE.Camera) {
    this.v.copy(p).project(cam);
    return { x: (this.v.x * 0.5 + 0.5) * innerWidth, y: (-this.v.y * 0.5 + 0.5) * innerHeight, behind: this.v.z > 1 };
  }

  marker(i: number, p: Player | null, cam: THREE.Camera, label = '') {
    const m = this.markers[i];
    if (!p) { m.style.display = 'none'; if (i < 2) this.offs[i].style.display = 'none'; return; }
    const s = this.screen(this.v.copy(p.pos).setY(2.35), cam);
    const inside = s.x > 20 && s.x < innerWidth - 20 && s.y > 20 && s.y < innerHeight - 20 && !s.behind;
    m.style.display = inside ? 'block' : 'none';
    m.style.left = `${s.x}px`; m.style.top = `${s.y}px`;
    (m.lastChild as HTMLElement).textContent = label;
    if (i < 2) {
      const o = this.offs[i];
      o.style.display = inside ? 'none' : 'block';
      if (!inside) {
        const x = Math.min(innerWidth - 30, Math.max(6, s.x)), y = Math.min(innerHeight - 30, Math.max(6, s.y));
        const ang = Math.atan2(s.y - innerHeight / 2, s.x - innerWidth / 2) - Math.PI / 2;
        o.style.left = `${x}px`; o.style.top = `${y}px`; o.style.transform = `rotate(${ang}rad)`;
      }
    }
  }

  /** anel "PASSE" sobre quem vai receber o passe (aparece enquanto o jogador humano está com a bola) */
  passTarget(p: Player | null, cam: THREE.Camera) {
    const m = this.markers[3];
    if (!p) { m.style.display = 'none'; return; }
    const s = this.screen(this.v.copy(p.pos).setY(2.25), cam);
    m.style.display = s.behind ? 'none' : 'block';
    m.classList.add('ptgt');
    m.style.left = `${s.x}px`; m.style.top = `${s.y}px`;
    const lb = m.lastChild as HTMLElement;
    if (lb.textContent !== 'PASSE') lb.textContent = 'PASSE';
  }

  powerBar(p: Player | null, f: number, cam: THREE.Camera) {
    if (!p || f <= 0) { this.power.style.display = 'none'; return; }
    const s = this.screen(this.v.copy(p.pos).setY(-0.2), cam);
    this.power.style.display = 'block';
    this.power.style.left = `${s.x}px`; this.power.style.top = `${s.y + 8}px`;
    (this.power.firstChild as HTMLElement).style.width = `${Math.round(f * 100)}%`;
  }

  /** "+25" saltando perto do brasão do time. */
  stylePop(side: number, pts: number, label?: string) {
    const e = el('div', 'pop', label ? `${label} <span style="color:#fff">+${pts}</span>` : `+${pts}`);
    e.style.fontSize = `${Math.min(40, 22 + pts / 5)}px`;
    e.style.left = side === 0 ? 'calc(50% - 330px)' : 'calc(50% + 330px)';
    e.style.top = '70px';
    this.root.appendChild(e);
    setTimeout(() => e.remove(), 1150);
  }
  worldPop(text: string, p: THREE.Vector3, cam: THREE.Camera, color = '#ffb81f') {
    const s = this.screen(p, cam);
    const e = el('div', 'pop', text);
    e.style.left = `${s.x}px`; e.style.top = `${s.y}px`; e.style.fontSize = '26px'; e.style.color = color;
    this.root.appendChild(e);
    setTimeout(() => e.remove(), 1150);
  }
  big(text: string, gold = false) {
    this.root.querySelectorAll('.big').forEach((b) => b.remove());
    const e = el('div', 'big' + (gold ? ' gold' : ''), text);
    this.root.appendChild(e);
    setTimeout(() => e.remove(), 1850);
  }
  msg(text: string | null) {
    this.msgEl.style.display = text ? 'block' : 'none';
    if (text) this.msgEl.textContent = text;
  }
  replay(on: boolean) { this.replayEl.style.display = on ? 'block' : 'none'; }
  lower(p: Player | null, sub = '') {
    if (!p) { this.lowerEl.style.display = 'none'; return; }
    this.lowerEl.style.display = 'flex';
    this.lowerEl.innerHTML = `<img src="${A(`ui/emblems/${p.team.id}.png`)}"><div><div class="n">${p.data.number} · ${p.data.name}</div><div class="s">${sub || p.data.pos + ' · ' + p.team.data.name}</div></div>`;
  }
  challenge(lines: { text: string; ok: boolean }[] | null) {
    this.chEl.style.display = lines ? 'block' : 'none';
    if (lines) this.chEl.innerHTML = lines.map((l) => `<div class="${l.ok ? 'ok' : ''}">${l.ok ? '✔' : '•'} ${l.text}</div>`).join('');
  }
}
