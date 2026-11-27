import { isTouch } from '../core/platform';
import * as THREE from 'three';
import type { Match } from '../game/match';
import type { PlayerDef } from '../data/content';

const h = (html: string) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild as HTMLElement; };
const flag = (c: [string, string, string]) =>
  c[0] === c[2] && c[0].toLowerCase() === '#ffffff' && c[1].toLowerCase() === '#bc002d'
    ? `<span class="flag disc" style="--d:${c[1]}"></span>` // Japan: red disc on white
    : `<span class="flag">${c.map((x) => `<i style="background:${x}"></i>`).join('')}</span>`;

export class Hud {
  el: HTMLElement;
  private top: HTMLElement;
  private box: HTMLElement;
  private speed: HTMLElement;
  private callout: HTMLElement;
  private banner: HTMLElement;
  private meter: HTMLElement;
  private markers: HTMLElement[];
  private replay: HTMLElement;
  private calloutTimer = 0;
  private bannerTimer = 0;
  private markerTimer = 0;

  constructor(root: HTMLElement, private match: Match, labels: [string, string]) {
    const [a, b] = match.players.map((p) => p.def) as [PlayerDef, PlayerDef];
    const nm = (side: 0 | 1) => match.team(side).map((p) => p.def.short).join(' / ');
    this.el = h(`<div class="hud">
      <div class="top">
        <div class="plate" style="--plate:#f5c542"><div class="tag"><span>${labels[0]}</span></div><div class="pn">${flag(a.flagColors)}&nbsp;&nbsp;${nm(0)}</div><div class="games" data-g="0"></div></div>
        <div class="plate" style="--plate:#3ff7ff"><div class="games" data-g="1"></div><div class="pn">${nm(1)}&nbsp;&nbsp;${flag(b.flagColors)}</div><div class="tag"><span>${labels[1]}</span></div></div>
      </div>
      <div class="score-box">
        <div class="row" data-r="0"><span class="dot"></span><span>${labels[0]}</span><span class="sets"></span><span class="pt">0</span></div>
        <div class="row" data-r="1"><span class="dot"></span><span>${labels[1]}</span><span class="sets"></span><span class="pt">0</span></div>
      </div>
      <div class="speed"><span><b>0</b><small>km/h</small></span></div>
      <div class="toast" style="display:none"></div><div class="callout" style="display:none"><div class="c"></div><div class="s"></div></div>
      <div class="banner" style="display:none"><div></div></div>
      <div class="meter" style="display:none"><i></i></div>
      <div class="marker" style="--plate:#f5c542;opacity:0">${labels[0]}</div>
      <div class="marker" style="--plate:#3ff7ff;opacity:0">${labels[1]}</div>
      <div class="replay-tag" style="display:none">REPLAY</div><div class="skip-tag" style="display:none">${isTouch ? 'TOQUE' : 'ENTER'} PARA PULAR ▶▶</div>
    </div>`);
    root.appendChild(this.el);
    this.top = this.el.querySelector('.top')!;
    this.box = this.el.querySelector('.score-box')!;
    this.speed = this.el.querySelector('.speed b')!;
    this.callout = this.el.querySelector('.callout')!;
    this.banner = this.el.querySelector('.banner')!;
    this.meter = this.el.querySelector('.meter')!;
    this.markers = [...this.el.querySelectorAll('.marker')] as HTMLElement[];
    this.replay = this.el.querySelector('.replay-tag')!;
    this.refresh();
  }

  refresh() {
    const s = this.match.score;
    const lab = this.match.labels();
    for (const i of [0, 1]) {
      const row = this.box.querySelector(`[data-r="${i}"]`)!;
      const pt = row.querySelector('.pt') as HTMLElement;
      if (pt.textContent !== lab[i]) { pt.classList.remove('bump'); void pt.offsetWidth; pt.classList.add('bump'); }
      pt.textContent = lab[i];
      row.querySelector('.dot')!.classList.toggle('on', s.server === i);
      const hist = s.setHistory.map((g) => g[i]).join(' ');
      row.querySelector('.sets')!.textContent = `${hist}${hist ? ' ' : ''}${s.games[i]}`;
      const g = this.top.querySelector(`[data-g="${i}"]`)!;
      g.innerHTML = `<span class="srv ${s.server === i ? 'on' : ''}"></span>GAMES <b>${s.games[i]}</b>${this.match.cfg.sets > 1 ? ` SETS <b>${s.sets[i]}</b>` : ''}`;
    }
  }

  setSpeed(kmh: number) {
    this.speed.textContent = String(Math.round(kmh));
    const box = this.speed.closest('.speed') as HTMLElement;
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  }

  /** Small timing feedback under your player ("PERFEITO!", "ATRASADO"...). */
  toast(text: string, color: 'gold' | 'blue' | 'red' = 'gold') {
    const t = this.el.querySelector('.toast') as HTMLElement;
    t.textContent = text;
    t.className = 'toast ' + color;
    t.style.display = '';
    t.getAnimations().forEach((a) => a.cancel());
    t.animate([{ opacity: 0, transform: 'translate(-50%, 8px) scale(.8)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1.05)', offset: 0.25 }, { opacity: 1, transform: 'translate(-50%, -6px) scale(1)', offset: 0.75 }, { opacity: 0, transform: 'translate(-50%, -14px) scale(1)' }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
  }

  call(text: string, sub = '', color: 'green' | 'red' | 'gold' = 'green', dur = 1.6) {
    const c = this.callout.querySelector('.c') as HTMLElement;
    c.textContent = text;
    c.className = 'c ' + (color === 'green' ? '' : color);
    (this.callout.querySelector('.s') as HTMLElement).textContent = sub;
    c.style.display = text ? '' : 'none';
    this.callout.style.display = '';
    this.callout.animate([{ transform: 'translate(-50%,-50%) scaleX(0.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scaleX(1.05)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scaleX(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    this.calloutTimer = dur;
  }

  showBanner(text: string, dur = 2) {
    (this.banner.firstElementChild as HTMLElement).textContent = text;
    this.banner.style.display = '';
    this.banner.animate([{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
    this.bannerTimer = dur;
  }

  showMarkers(sec = 2.2) { this.markerTimer = sec; }

  setReplay(on: boolean) {
    this.replay.style.display = on ? '' : 'none';
    (this.el.querySelector('.skip-tag') as HTMLElement).style.display = on ? '' : 'none';
    this.el.classList.toggle('letterbox', on);
    this.top.style.display = on ? 'none' : '';
    this.box.style.display = on ? 'none' : '';
    (this.el.querySelector('.speed') as HTMLElement).style.display = on ? 'none' : '';
  }

  setMeter(v: number | null) {
    this.meter.style.display = v === null ? 'none' : '';
    if (v !== null) (this.meter.firstElementChild as HTMLElement).style.height = `${Math.round(v * 100)}%`;
  }

  update(dt: number, cam: THREE.Camera) {
    if (this.calloutTimer > 0 && (this.calloutTimer -= dt) <= 0) this.callout.style.display = 'none';
    if (this.bannerTimer > 0 && (this.bannerTimer -= dt) <= 0) this.banner.style.display = 'none';
    const proj = (p: THREE.Vector3) => {
      const v = p.clone().project(cam);
      return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, vis: v.z < 1 };
    };
    this.markerTimer -= dt;
    this.match.players.forEach((p, i) => {
      const m = this.markers[i];
      if (!m) return;
      const s = proj(p.pos.clone().add(new THREE.Vector3(0, 2.15, 0)));
      m.style.left = `${s.x}px`;
      m.style.top = `${s.y}px`;
      m.style.opacity = this.markerTimer > 0 && s.vis ? '1' : '0';
    });
    if (this.meter.style.display !== 'none') {
      const sv = this.match.players[this.match.server];
      const s = proj(sv.pos.clone().add(new THREE.Vector3(0, 1.2, 0)));
      this.meter.style.left = `${s.x + 70}px`;
      this.meter.style.top = `${s.y}px`;
    }
  }

  dispose() { this.el.remove(); }
}
