import { seg, sseg, pulse, clamp, TAU } from '../core/util.js';

// Interface sobre o vídeo (SVG + DOM), toda em função de (episódio, t): legendas, cartela de título,
// emblema-relógio e barra de episódios. Faz parte do quadro exportado.
const WHO = { narrador: { name: '', color: '#f4efe6', cls: 'narr' }, akio: { name: 'AKIO', color: '#6fb4ff' }, yuna: { name: 'YUNA', color: '#ff6b74' }, senhor: { name: 'SENHOR DAS HORAS', color: '#f2c04e' } };

export class Hud {
  constructor(root, script, episodes) {
    this.script = script; this.episodes = episodes;
    root.innerHTML = `
      <div class="bars">${episodes.map(() => '<i><b></b></i>').join('')}</div>
      <div class="brand">
        <svg viewBox="-50 -50 100 100" class="emblem">
          <circle r="44" class="ring"/><circle r="36" class="ring thin"/>
          ${[...Array(12)].map((_, i) => `<line x1="0" y1="-44" x2="0" y2="${i % 3 ? -39 : -34}" transform="rotate(${i * 30})" class="tk"/>`).join('')}
          <line class="hand h" x1="0" y1="4" x2="0" y2="-20"/><line class="hand m" x1="0" y1="6" x2="0" y2="-31"/><circle r="3.2" class="dot"/>
        </svg>
        <div class="brandtxt"><span>O SAMURAI QUE</span><span>ROUBOU O TEMPO</span></div>
        <div class="epno"></div>
      </div>
      <div class="card"><svg viewBox="0 0 800 20" class="stroke"><path d="M4 12 C 120 2, 260 18, 400 9 S 690 4, 796 12"/></svg><div class="k">EPISÓDIO <b></b></div><div class="t"></div><svg viewBox="0 0 800 20" class="stroke s2"><path d="M4 9 C 160 18, 300 2, 420 11 S 700 16, 796 8"/></svg></div>
      <div class="sub"><div class="who"></div><div class="txt"></div></div>
      <div class="final"><div class="f1">O TEMPO NÃO SE POSSUI.</div><div class="f2">SE VIVE.</div><div class="fim">FIM</div></div>
      <div class="next">CONTINUA NO EPISÓDIO <b></b> ›</div>`;
    const $ = (s) => root.querySelector(s);
    this.el = { bars: [...root.querySelectorAll('.bars b')], card: $('.card'), cardNo: $('.card .k b'), cardT: $('.card .t'), strokes: [...root.querySelectorAll('.stroke path')], sub: $('.sub'), who: $('.sub .who'), txt: $('.sub .txt'),
      final: $('.final'), f1: $('.f1'), f2: $('.f2'), fim: $('.fim'), next: $('.next'), nextNo: $('.next b'), hh: $('.hand.h'), hm: $('.hand.m'), epno: $('.epno'), brand: $('.brand') };
    this.lineId = null;
  }
  /** ep: 1..5; t: 0..20; turns: voltas do relógio do mundo (para trás = tempo roubado). */
  update(ep, t, turns = t / 20) {
    const e = this.el, E = this.episodes[ep - 1];
    e.bars.forEach((b, i) => { b.style.transform = `scaleX(${i < ep - 1 ? 1 : i === ep - 1 ? clamp(t / 20) : 0})`; });
    e.hm.setAttribute('transform', `rotate(${(turns * 360).toFixed(2)})`); e.hh.setAttribute('transform', `rotate(${(turns * 30 + 40).toFixed(2)})`);
    e.epno.textContent = `EP ${ep}/5`;
    // cartela de título: 0,35 s → 3,1 s
    const a = pulse(t, 0.35, 3.1, 0.45);
    e.card.style.opacity = a; e.card.style.display = a > 0.002 ? '' : 'none';
    if (a > 0.002) {
      e.cardNo.textContent = ep; e.cardT.textContent = E.title;
      e.cardT.style.letterSpacing = `${(0.02 + 0.1 * sseg(t, 0.35, 3.1)).toFixed(4)}em`;
      e.card.style.transform = `translateY(${((1 - sseg(t, 0.35, 0.9)) * 40).toFixed(1)}px)`;
      e.strokes.forEach((p, i) => { p.style.strokeDashoffset = (820 * (1 - sseg(t, 0.4 + i * 0.15, 1.2 + i * 0.15))).toFixed(1); });
    }
    // legendas sincronizadas com a dublagem (palavra a palavra)
    const line = this.script.lines.find((l) => l.ep === ep && t >= l.at - 0.05 && t <= l.at + l.dur + 0.35);
    if (line) {
      const w = WHO[line.who];
      if (this.lineId !== line.id) { this.lineId = line.id; e.who.textContent = w.name; e.who.style.color = w.color; e.who.style.display = w.name ? '' : 'none'; e.sub.className = 'sub ' + (w.cls ?? '') + (line.fx ? ' ' + line.fx : '');
        e.txt.innerHTML = line.text.split(' ').map((x) => `<span>${x}</span>`).join(' '); this.words = [...e.txt.children]; this.wchars = line.text.split(' ').map((x) => x.length + 1); this.wtotal = this.wchars.reduce((s, x) => s + x, 0); }
      const k = clamp((t - line.at) / line.dur); let acc = 0;
      this.words.forEach((s, i) => { const start = acc / this.wtotal; acc += this.wchars[i]; const on = clamp((k - start) * this.wtotal / 3 + 0.0); s.style.opacity = (0.38 + 0.62 * on).toFixed(3); s.style.color = on > 0.5 && on < 1 ? w.color : ''; });
      e.sub.style.display = ''; e.sub.style.opacity = Math.min(sseg(t, line.at - 0.05, line.at + 0.15), 1 - sseg(t, line.at + line.dur + 0.1, line.at + line.dur + 0.35));
    } else { e.sub.style.display = 'none'; this.lineId = null; }
    // encerramentos
    const fin = ep === 5 ? sseg(t, 18.3, 18.9) : 0;
    e.final.style.display = fin > 0.002 ? '' : 'none';
    if (fin > 0.002) { e.f1.style.opacity = sseg(t, 18.3, 18.8); e.f1.style.letterSpacing = `${(0.04 + 0.06 * sseg(t, 18.3, 20)).toFixed(4)}em`; e.f2.style.opacity = sseg(t, 18.95, 19.35); e.f2.style.transform = `scale(${(1.25 - 0.25 * sseg(t, 18.95, 19.5)).toFixed(3)})`; e.fim.style.opacity = sseg(t, 19.5, 19.9) * 0.8; }
    const nx = ep < 5 ? sseg(t, 19.0, 19.4) : 0;
    e.next.style.display = nx > 0.002 ? '' : 'none'; e.next.style.opacity = nx; e.nextNo.textContent = ep + 1;
    e.brand.style.opacity = 0.92 - 0.5 * fin;
  }
}
