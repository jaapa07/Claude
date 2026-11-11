/* fx.js — the season's effects, as pure functions of the beat clock: q => draws the frame for time q.
   Screen-space pieces (title card, alarm, speed lines, the wave, KABUM, the end card) go on the panel p, outside the
   camera, in the upright frame's coordinates (SW × SH); world pieces (drops, stink) go in a camera's stage. */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
@font-face { font-family: Osw; font-weight: 600; src: url(../lib/fonts/Oswald-normal-600-latin.woff2) format('woff2'); unicode-range: U+0000-00FF; }
@font-face { font-family: Osw; font-weight: 600; src: url(../lib/fonts/Oswald-normal-600-latin-ext.woff2) format('woff2'); unicode-range: U+0100-024F; }</style>`);
const OSW = 'Osw, Oswald, Impact, Arial Black, sans-serif';
const svgText = (s, x, y, size, fill, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor || 'middle'}" font-family="${OSW}" font-weight="600" font-size="${size}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 14}" paint-order="stroke" stroke-linejoin="round"` : ''}>${s}</text>`;
// The series card over the first seconds of every episode (it is also the post's cover: the first frame shows it).
function titleCard(p, ep, a, b, until = 2.0) {
  const g = mk('g', {}, p);
  g.innerHTML = `<defs><linearGradient id="tcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".72"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
    <rect width="${SW}" height="760" fill="url(#tcg)"/>
    <rect x="${SW / 2 - 300}" y="214" width="600" height="72" rx="36" fill="#c8322f"/>${svgText(`A GRANDE GUERRA DO COCÔ · EP ${ep}`, SW / 2, 264, 38, '#fff')}
    ${svgText(a, SW / 2, 420, a.length > 14 ? 96 : 118, '#fff', { stroke: '#111' })}${svgText(b, SW / 2, 540, b.length > 14 ? 96 : 118, '#f6c443', { stroke: '#111' })}`;
  return q => { const k = q < until ? 1 : Math.max(0, 1 - (q - until) / .25); g.setAttribute('opacity', k.toFixed(2)); vis(g, k > 0); };
}
// the alarm: the frame washes red on and off
function alarm(p, t0, t1, hz = 2.2) { const r = mk('rect', { width: SW, height: SH, fill: '#ff1a1a', opacity: 0 }, p);
  return q => r.setAttribute('opacity', q >= t0 && q < t1 ? (.28 * Math.max(0, Math.sin((q - t0) * Math.PI * 2 * hz))).toFixed(2) : 0); }
// speed lines from the centre, for a snap zoom
function speedLines(p, t0, dur = .5) { const g = mk('g', { opacity: 0 }, p);
  g.innerHTML = Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2, r0 = 420 + 60 * (i % 3); return `<path d="M${SW / 2 + Math.cos(a) * r0},${SH / 2 + Math.sin(a) * r0 * 1.4} L${SW / 2 + Math.cos(a) * 1400},${SH / 2 + Math.sin(a) * 1900}" stroke="#fff" stroke-width="${6 + (i % 4) * 4}"/>`; }).join('');
  return q => g.setAttribute('opacity', q >= t0 && q < t0 + dur ? (.6 * (1 - (q - t0) / dur)).toFixed(2) : 0); }
// the flush wave: a wall of blue paper water rises from the bottom, covers the frame, and drains away
function wave(p, t0, dur = 2.4) {
  const g = mk('g', {}, p), w1 = mk('path', { fill: '#3f8fd0' }, g), w2 = mk('path', { fill: '#7fc4ef' }, g), w3 = mk('path', { fill: '#e9f6ff', opacity: .9 }, g);
  const crest = (y, ph, amp) => { let d = `M-50,${SH + 50} L-50,${y}`; for (let x = -50; x <= SW + 50; x += 50) d += ` L${x},${(y + Math.sin(x / 70 + ph) * amp).toFixed(1)}`; return d + ` L${SW + 50},${SH + 50} Z`; };
  return q => { const u = (q - t0) / dur; vis(g, u > 0 && u < 1); if (u <= 0 || u >= 1) return;
    const h = u < .45 ? ease(u / .45) : u < .6 ? 1 : 1 - ease((u - .6) / .4), y = SH - h * (SH + 300);
    w1.setAttribute('d', crest(y, q * 9, 40)); w2.setAttribute('d', crest(y + 70, q * 7 + 2, 30)); w3.setAttribute('d', crest(y - 10, q * 11 + 1, 14).replace(/L(-?\d+),(\d+) Z$/, '')); };
}
// a comic explosion word
function kabum(p, t0, word = 'KABUM!', x = SW / 2, y = SH * .42, dur = 1.0) {
  const g = mk('g', {}, p);
  g.innerHTML = `<path d="${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2, r = i % 2 ? 210 : 330; return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(0)},${(Math.sin(a) * r * .8).toFixed(0)}`; }).join('')} Z" fill="#f6c443" stroke="#111" stroke-width="10"/>
    <path d="${Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2 + .2, r = i % 2 ? 130 : 210; return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(0)},${(Math.sin(a) * r * .8).toFixed(0)}`; }).join('')} Z" fill="#ff5a3a"/>${svgText(word, 0, 40, 120, '#fff', { stroke: '#111', sw: 16 })}`;
  return q => { const u = (q - t0) / dur; vis(g, u >= 0 && u < 1); if (u < 0 || u >= 1) return; const s = u < .15 ? .4 + 4 * u : 1 + .05 * Math.sin(q * 40); tf(g, `translate(${x},${y}) scale(${s.toFixed(3)}) rotate(${(-6 + 4 * Math.sin(q * 30)).toFixed(1)})`); };
}
// a black card for the abrupt cut, with a line of text
function cutCard(p, t0, lines, { sub = '', until = 99 } = {}) {
  const g = mk('g', {}, p);
  g.innerHTML = `<rect width="${SW}" height="${SH}" fill="#0b0b0d"/>${lines.map((s, i) => svgText(s, SW / 2, SH / 2 - 40 + i * 110 - (lines.length - 1) * 55, 92, i ? '#f6c443' : '#fff')).join('')}${sub ? svgText(sub, SW / 2, SH / 2 + 160, 40, '#bbb') : ''}`;
  return q => vis(g, q >= t0 && q < until);
}
// splash drops thrown up from (x, y), falling back (world space)
function drops(parent, t0, x, y, n = 14, spread = 260, col = '#7fc4ef') {
  const ds = Array.from({ length: n }, (_, i) => { const e = mk('path', { d: 'M0,-14 C8,-2 10,6 0,10 C-10,6 -8,-2 0,-14 Z', fill: col, stroke: '#2f6fa8', 'stroke-width': 2 }, parent);
    return { e, vx: (jit(i, 3)) * spread, vy: -500 - 300 * Math.abs(jit(i, 5)) }; });
  return q => { const u = q - t0; for (const d of ds) { vis(d.e, u > 0 && u < 1.4); if (u > 0) tf(d.e, `translate(${(x + d.vx * u).toFixed(1)},${(y + d.vy * u + 900 * u * u).toFixed(1)})`); } };
}
// wavy stink lines rising from a point (world space)
function stink(parent, x, y, n = 3, col = '#7cc24c') {
  const ls = Array.from({ length: n }, () => mk('path', { fill: 'none', stroke: col, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .8 }, parent));
  return (q, on = true) => ls.forEach((l, i) => { vis(l, on); if (!on) return; const u = ((q * .7 + i / n) % 1), yy = y - 160 * u, xx = x + (i - (n - 1) / 2) * 40;
    l.setAttribute('d', `M${xx},${yy} q14,-20 0,-40 q-14,-20 0,-40`); l.setAttribute('opacity', (Math.sin(u * Math.PI) * .85).toFixed(2)); });
}
// a speech bubble in screen space (for a voice off screen)
function bubble(p, t0, t1, words, x = SW / 2, y = SH * .3) { const g = mk('g', {}, p);
  g.innerHTML = `<path d="M-330,-110 h660 q30,0 30,30 v150 q0,30 -30,30 h-300 l-60,70 l10,-70 h-310 q-30,0 -30,-30 v-150 q0,-30 30,-30 Z" fill="#fff" stroke="#111" stroke-width="8"/>${words.map((s, i) => svgText(s, 0, -20 + i * 80, 64, '#111')).join('')}`;
  return q => { vis(g, q >= t0 && q < t1); if (q >= t0) tf(g, `translate(${x},${y}) scale(${Math.min(1, .6 + 3 * (q - t0)).toFixed(3)})`); }; }
