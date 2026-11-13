import { sseg, clamp } from '../timeline/util.js';

// Legendas e texto final: DOM escrito diretamente em função de T (fazem parte do quadro exportado,
// por isso não dependem do ciclo de renderização do React).
const WHO = { narrador: { name: '', color: '#f4efe6', cls: 'narr' }, kaito: { name: 'KAITO', color: '#7fb8ff' }, lumi: { name: 'LUMI', color: '#ffd27a' }, voz: { name: '', color: '#c8b0ff', cls: 'narr voz' } };
export class Overlay {
  constructor(root, script) {
    this.script = script;
    root.innerHTML = '<div class="sub"><div class="who"></div><div class="txt"></div></div><div class="final"><div class="f1">ÀS VEZES, O INFINITO</div><div class="f2">COMEÇA DENTRO<br>DE VOCÊ.</div></div>';
    const $ = (s) => root.querySelector(s); this.el = { sub: $('.sub'), who: $('.who'), txt: $('.txt'), final: $('.final'), f1: $('.f1'), f2: $('.f2') }; this.lineId = null;
  }
  update(T) {
    const e = this.el, line = this.script.lines.find((l) => T >= l.at - 0.05 && T <= l.at + l.dur + 0.3);
    if (line) {
      const w = WHO[line.who];
      if (this.lineId !== line.id) { this.lineId = line.id; e.who.textContent = w.name; e.who.style.color = w.color; e.who.style.display = w.name ? '' : 'none'; e.sub.className = 'sub ' + (w.cls ?? '');
        e.txt.innerHTML = line.text.split(' ').map((x) => `<span>${x}</span>`).join(' '); this.words = [...e.txt.children]; this.wc = line.text.split(' ').map((x) => x.length + 1); this.wt = this.wc.reduce((s, x) => s + x, 0); }
      const k = clamp((T - line.at) / line.dur); let acc = 0;
      this.words.forEach((s, i) => { const start = acc / this.wt; acc += this.wc[i]; s.style.opacity = (0.45 + 0.55 * clamp((k - start) * this.wt / 3)).toFixed(3); });
      e.sub.style.display = ''; e.sub.style.opacity = Math.min(sseg(T, line.at - 0.05, line.at + 0.15), 1 - sseg(T, line.at + line.dur + 0.05, line.at + line.dur + 0.3));
    } else { e.sub.style.display = 'none'; this.lineId = null; }
    const fin = sseg(T, 87.9, 88.6);
    e.final.style.display = fin > 0.002 ? '' : 'none';
    if (fin > 0.002) { e.final.style.opacity = 1 - sseg(T, 89.5, 89.95); e.f1.style.opacity = sseg(T, 87.9, 88.4); e.f1.style.letterSpacing = `${(0.06 + 0.08 * sseg(T, 87.9, 90)).toFixed(4)}em`; e.f2.style.opacity = sseg(T, 88.3, 88.9); e.f2.style.transform = `scale(${(1.12 - 0.12 * sseg(T, 88.3, 89.1)).toFixed(3)})`; }
  }
}
