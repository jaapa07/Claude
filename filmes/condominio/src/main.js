// O Condomínio dos Desgraçados — vertical adult toon, 5 episodes × 90 s. ?ep=1..5
// One beat list per episode drives picture, voices, subtitles and the mix. Characters step on twos (15 fps), camera on ones (30 fps),
// every outline boils (3 SVG displacement drawings cycling at 12 fps).
import { clamp, seg, ss, eo, back, lerp, TAU, hash, vnoise } from './lib.js';
import { DRAW, pose } from './cast.js';
import { SETS, ia } from './sets.js';
import { INK } from './toon.js';
import { EPS } from './eps.js';

const Q = new URLSearchParams(location.search), EP = +(Q.get('ep') || 1), W = 1080, H = 1920, FR = 1 / 30, EPDUR = 90;
const DUR = await (await fetch('voices/dur.json')).json();
const MOUTH = await (await fetch('voices/mouth.json')).json();
const LINES = Object.fromEntries((await (await fetch('voices/lines.json')).json()).map(l => [l.id, l]));
const COL = { jun: '#7ab8ff', osv: '#ffb24a', cle: '#d79aff', car: '#ffd84a', vaso: '#bff0ff', elev: '#ff8a7a', dem: '#ff5a4a', ia: '#5af0e0', chefe: '#e0d0b0' };

// —— timeline: beats → absolute times; the beat marked fill takes what is left of the 90 s ——
const TR = { cut: 0, whip: .25, zoom: .3, iris: .45, flash: .2, black: .5 };
const raw = EPS[EP].map(b => {
  const lead = b.lead ?? .2, tail = b.tail ?? .35; let cur = lead; const ls = [];
  for (const [id, at] of (b.lines || (b.line ? [[b.line, lead]] : []))) { const a = typeof at === 'string' ? cur + parseFloat(at) : at; ls.push({ id, at: a, d: DUR[id], who: LINES[id].who, text: LINES[id].sub }); cur = a + DUR[id]; }
  return { ...b, ls, need: Math.max(b.dur || 0, ls.length ? cur + tail : 0) };
});
const fixed = raw.filter(b => !b.fill).reduce((a, b) => a + b.need, 0), fillB = raw.find(b => b.fill);
if (fillB) fillB.need = Math.max(fillB.need, EPDUR - fixed);
const beats = []; let T = 0; const EV = [], LN = [];
for (const b of raw) {
  const B = { ...b, t0: T, D: b.need }; beats.push(B);
  for (const l of b.ls) { EV.push({ type: 'line', id: l.id, who: l.who, t: +(T + l.at).toFixed(3), d: l.d, text: l.text }); LN.push({ ...l, t: T + l.at }); }
  for (const [at, name, g, pan] of (b.sfx || [])) EV.push({ type: 'sfx', name, t: +(T + (typeof at === 'function' ? at(B.D) : at)).toFixed(3), g: g ?? 0, pan: pan ?? 0 });
  EV.push({ type: 'beat', name: b.name || '', mood: b.mood || '', t: +T.toFixed(3), d: +B.D.toFixed(3) });
  T += B.D;
}
window.DUR = +T.toFixed(3); window.EV = EV; window.BEATS = beats.map(b => [b.name, +b.t0.toFixed(2), +b.D.toFixed(2)]);

// —— canvases + boil filters ——
const main = document.getElementById('c'); main.width = W; main.height = H; const cx = main.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const bufA = mk(), bufB = mk(), bufS = mk(), sx = bufS.getContext('2d');

const mouthAt = (id, u) => { const m = MOUTH[id]; if (!m) return 0; const i = Math.floor(u * 15) * 2; return i >= 0 && i < m.length ? m[i] : 0; };
const BLINK = { jun: 3.1, osv: 4.3, cle: 2.7, car: 3.7, vaso: 5.1, dem: 4.9, chefe: 3.9 };

function renderBeat(B, t, ctx) {
  let u = t - B.t0, tDraw = t;
  if (B.bridge) { const [J, side] = B.bridge; u = side === 'out' ? J - (B.D - u) + FR : J + u; tDraw = 1000 + u; }   // shared clock across the episode cut
  const uq = Math.floor(u * 15 + 1e-6) / 15, tq = Math.floor(tDraw * 15 + 1e-6) / 15;                                   // characters on twos
  const S = { jun: pose({ vis: 0 }), osv: pose({ vis: 0 }), cle: pose({ vis: 0 }), car: pose({ vis: 0 }), vaso: pose({ vis: 0 }), dem: pose({ vis: 0 }), chefe: pose({ vis: 0 }), ia: pose({ vis: 0 }), elev: pose({ vis: 0 }) };
  if (B.cast) B.cast(uq, B.D, S, tq);
  const ul = t - B.t0;
  for (const l of B.ls) if (ul >= l.at && ul < l.at + l.d) { const ch = S[l.who]; if (ch && !ch.mute) { const m = mouthAt(l.id, ul - l.at); ch.E.open = Math.max(ch.E.open || 0, m * (ch.E.mouth === 'scream' ? 1.6 : 1)); } }
  for (const [k, P] of Object.entries(S)) {   // blinks, breathing
    if (!P.vis || !P.E) continue;
    const per = BLINK[k] || 4, ph = (tq + hash(k.length * 7.1) * per) % per;
    if (ph < .12 && (P.E.eye || 'open') === 'open' && !P.E.noblink) P.E.eye = 'closed';
    P.sq *= 1 + .012 * Math.sin(tq * 2.4 + k.length);
  }
  let [x, y, z] = B.cam ? B.cam(u, B.D, S) : [0, -700, 1];
  const sh = B.shake ? B.shake(u, B.D) : 0; x += sh * (vnoise(tDraw * 25) - .5) * 2; y += sh * (vnoise(tDraw * 25 + 9) - .5) * 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(z, 0, 0, z, W / 2 - x * z, H / 2 - y * z);
  SETS[B.scene](ctx, tDraw, B.set ? B.set(u, B.D) : {});
  if (B.back) B.back(ctx, u, B.D, tq, S);
  for (const k of (S.order || ['vaso', 'cle', 'osv', 'dem', 'chefe', 'jun', 'car'])) { const P = S[k]; if (P && P.vis && DRAW[k]) { ctx.save(); DRAW[k](ctx, P, tq); ctx.restore(); } }
  if (B.front) B.front(ctx, u, B.D, tq, S);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (B.ui) B.ui(ctx, u, B.D, tDraw, S);
  return tDraw;
}

function frame(t) {
  let i = beats.findIndex(b => t >= b.t0 && t < b.t0 + b.D); if (i < 0) i = beats.length - 1;
  const B = beats[i], u = t - B.t0, td = TR[B.tr || 'cut'];
  let tv;
  if (i > 0 && td > 0 && u < td) {
    const k = ss(u / td), P = beats[i - 1];
    renderBeat(P, t, bufA.getContext('2d')); tv = renderBeat(B, t, bufB.getContext('2d'));
    sx.setTransform(1, 0, 0, 1, 0, 0);
    if (B.tr === 'whip') { sx.drawImage(bufA, -W * k, 0); sx.drawImage(bufB, W - W * k, 0); sx.globalAlpha = .3 * Math.sin(Math.PI * k); for (let s = 1; s < 5; s++) sx.drawImage(k < .5 ? bufA : bufB, (k < .5 ? -W * k : W - W * k) - s * 30, 0); sx.globalAlpha = 1; }
    else if (B.tr === 'zoom') { sx.drawImage(bufA, 0, 0); sx.save(); sx.globalAlpha = k; const s = lerp(1.7, 1, eo(k)); sx.translate(W / 2, H / 2); sx.scale(s, s); sx.drawImage(bufB, -W / 2, -H / 2); sx.restore(); }
    else if (B.tr === 'iris') { const r = k < .5 ? lerp(1300, 0, ss(k * 2)) : lerp(0, 1300, ss(k * 2 - 1)); sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H); sx.save(); sx.beginPath(); sx.arc(W / 2, H * .45, r, 0, TAU); sx.clip(); sx.drawImage(k < .5 ? bufA : bufB, 0, 0); sx.restore(); }
    else if (B.tr === 'flash') { sx.drawImage(k < .5 ? bufA : bufB, 0, 0); sx.fillStyle = `rgba(255,255,240,${Math.sin(Math.PI * k)})`; sx.fillRect(0, 0, W, H); }
    else if (B.tr === 'black') { sx.drawImage(k < .5 ? bufA : bufB, 0, 0); sx.fillStyle = `rgba(0,0,0,${Math.sin(Math.PI * k)})`; sx.fillRect(0, 0, W, H); }
  } else tv = renderBeat(B, t, sx);
  // the boil: one of three displacement drawings, stepping at 12 fps
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  cx.filter = Q.has('noboil') ? 'none' : `url(#b${Math.floor(tv * 12 + 1e-6) % 3})`; cx.drawImage(bufS, 0, 0); cx.filter = 'none';
  subtitle(t);
}

// —— dynamic subtitles: words pop in with the voice, the current word in the speaker's colour ——
const SUB_Y = 1370, SUB_MAXW = 840;
function subtitle(t) {
  if (Q.has('nosub')) { window.__sub = ''; return; }
  const l = LN.find(l => t >= l.t - .05 && t < l.t + Math.max(l.d + .45, 1.5)); window.__sub = l ? l.text : '';
  if (!l) return;
  const words = l.text.split(' '), lens = words.map(w => w.length + 1), tot = lens.reduce((a, b) => a + b, 0);
  cx.font = '700 60px Fredoka'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
  const sp = cx.measureText(' ').width, rows = [[]]; let rw = 0;
  words.forEach((w, i) => { const ww = cx.measureText(w).width; if (rw + ww > SUB_MAXW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push({ w, i, ww }); rw += ww + sp; });
  const end = l.t + Math.max(l.d + .45, 1.5), fade = clamp((end - t) / .15);
  let acc = 0; const start = words.map((w, i) => { const s = l.t + l.d * acc / tot; acc += lens[i]; return s; });
  rows.forEach((row, r) => {
    const tw = row.reduce((a, o) => a + o.ww, 0) + sp * (row.length - 1); let x = W / 2 - tw / 2; const y = SUB_Y + (r - (rows.length - 1) / 2) * 76;
    for (const o of row) {
      const k = t < start[o.i] - .05 ? 0 : back(seg(t, start[o.i] - .05, start[o.i] + .12), 2.4), cur = t >= start[o.i] && (o.i === words.length - 1 ? t < l.t + l.d : t < start[o.i + 1]);
      if (k > 0) { cx.save(); cx.globalAlpha = fade; cx.translate(x + o.ww / 2, y); cx.scale(k, k); cx.lineWidth = 14; cx.strokeStyle = INK; cx.textAlign = 'center'; cx.strokeText(o.w, 0, 0); cx.fillStyle = cur ? COL[l.who] : '#fff'; cx.fillText(o.w, 0, 0); cx.restore(); }
      x += o.ww + sp;
    }
  });
}

await Promise.all([document.fonts.load('700 60px Fredoka', 'Ação'), document.fonts.load('80px "Lilita One"', 'BUM')]);
window.render = t => frame(t);
window.TEXTS = () => window.__sub ? [{ id: 'sub', text: window.__sub, x0: 120, y0: SUB_Y - 80, x1: 960, y1: SUB_Y + 80 }] : [];
window.READY = true;
