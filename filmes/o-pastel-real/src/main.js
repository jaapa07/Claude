// O Pastel Real — a vertical 2D cartoon in three parts. ?part=1|2|3. One beat list per part drives picture, voice, subtitles and the mix.
import { clamp, seg, ss, eo, back, lerp, TAU, hash, vnoise } from './lib.js';
import { DRAW, pose, INK } from './chars.js';
import { SCENES } from './scenes.js';
import { PARTS, defaults } from './parts.js';

const Q = new URLSearchParams(location.search), PART = +(Q.get('part') || 1), W = 1080, H = 1920;
const DUR = await (await fetch('voices/dur.json')).json();
const MOUTH = await (await fetch('voices/mouth.json')).json();
const LINES = Object.fromEntries((await (await fetch('voices/lines.json')).json()).map(l => [l.id, l]));
const COL = { dol: '#ffb24a', seol: '#9ff07a', rei: '#ffd84a' };

// —— build the timeline: beats → absolute times; lines and sfx → events ——
const TR = { cut: 0, whip: .32, zoom: .4, iris: .55, flash: .3, slide: .4 };
const beats = []; let T = 0; const EV = [], LN = [];
for (const b of PARTS[PART]) {
  const lead = b.lead ?? .25, tail = b.tail ?? .45; let cur = lead; const ls = [];
  for (const [id, at] of (b.lines || (b.line ? [[b.line, lead]] : []))) {
    const a = typeof at === 'string' ? cur + parseFloat(at) : at; ls.push({ id, at: a, d: DUR[id], who: LINES[id].who, text: LINES[id].sub }); cur = a + DUR[id];
  }
  const D = Math.max(b.dur || 0, ls.length ? cur + tail : 0);
  const B = { ...b, t0: T, D, ls };
  beats.push(B);
  for (const l of ls) { const e = { type: 'line', id: l.id, who: l.who, t: +(T + l.at).toFixed(3), d: l.d }; EV.push(e); LN.push({ ...l, t: T + l.at }); }
  for (const [at, name, g, pan] of (b.sfx || [])) EV.push({ type: 'sfx', name, t: +(T + (typeof at === 'function' ? at(D) : at)).toFixed(3), g: g ?? 0, pan: pan ?? 0 });
  EV.push({ type: 'beat', name: b.name || '', mood: b.mood || '', t: +T.toFixed(3), d: +D.toFixed(3) });
  T += D;
}
window.DUR = +T.toFixed(3); window.EV = EV;

// —— canvases ——
const main = document.getElementById('c'); main.width = W; main.height = H; const cx = main.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const bufA = mk(), bufB = mk();

function mouthAt(id, u) { const m = MOUTH[id]; if (!m) return 0; const i = Math.floor(u * 30); return i >= 0 && i < m.length ? m[i] : 0; }

function renderBeat(B, t, ctx) {
  const u = t - B.t0, D = B.D;
  const S = defaults(B.scene);
  if (B.cast) B.cast(u, D, S, t);
  // lip sync: the speaker's mouth follows the voice envelope
  for (const l of B.ls) if (u >= l.at && u < l.at + l.d) { const ch = S[l.who]; if (ch && !ch.mute) { const m = mouthAt(l.id, u - l.at); ch.E.open = Math.max(ch.E.open || 0, m); if (m > .05 && ch.E.mouth !== 'scream') ch.E.mouth = 'talk'; } }
  let [x, y, z] = B.cam ? B.cam(u, D, S) : [0, -700, 1];
  const sh = B.shake ? B.shake(u, D) : 0;
  x += sh * (vnoise(t * 25) - .5) * 2; y += sh * (vnoise(t * 25 + 9) - .5) * 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(z, 0, 0, z, W / 2 - x * z, H / 2 - y * z);
  SCENES[B.scene](ctx, t, B.set ? B.set(u, D) : {});
  if (B.back) B.back(ctx, u, D, t, S);
  const order = S.order || ['cat', 'seol', 'dol', 'rei'];
  for (const k of order) { const P = S[k]; if (P && P.vis) { ctx.save(); const hand = DRAW[k](ctx, P, t); ctx.restore(); S['_' + k] = hand; } }
  if (B.front) B.front(ctx, u, D, t, S);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (B.ui) B.ui(ctx, u, D, t, S);
}

function frame(t) {
  let i = beats.findIndex(b => t >= b.t0 && t < b.t0 + b.D); if (i < 0) i = beats.length - 1;
  const B = beats[i], u = t - B.t0, td = TR[B.tr || 'cut'];
  if (i > 0 && td > 0 && u < td) {
    const k = ss(u / td), P = beats[i - 1];
    renderBeat(P, t, bufA.getContext('2d')); renderBeat(B, t, bufB.getContext('2d'));
    cx.setTransform(1, 0, 0, 1, 0, 0);
    if (B.tr === 'whip') { const dx = W * k; cx.globalAlpha = 1; cx.drawImage(bufA, -dx * 1.2, 0); cx.drawImage(bufB, W - dx * 1.2 > 0 ? W - dx * 1.2 : 0, 0);
      cx.globalAlpha = .35 * Math.sin(Math.PI * k); for (let s = 1; s < 6; s++) cx.drawImage(k < .5 ? bufA : bufB, -s * 40 * (k < .5 ? 1 : -1) - (k < .5 ? dx * 1.2 : 0), 0); cx.globalAlpha = 1; }
    else if (B.tr === 'zoom') { cx.drawImage(bufA, 0, 0); cx.save(); cx.globalAlpha = k; const s = lerp(1.6, 1, eo(k)); cx.translate(W / 2, H / 2); cx.scale(s, s); cx.drawImage(bufB, -W / 2, -H / 2); cx.restore(); }
    else if (B.tr === 'iris') { const r = k < .5 ? lerp(1300, 0, ss(k * 2)) : lerp(0, 1300, ss(k * 2 - 1)); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H); cx.save(); cx.beginPath(); cx.arc(W / 2, H * .42, r, 0, TAU); cx.clip(); cx.drawImage(k < .5 ? bufA : bufB, 0, 0); cx.restore(); }
    else if (B.tr === 'flash') { cx.drawImage(k < .5 ? bufA : bufB, 0, 0); cx.fillStyle = `rgba(255,255,240,${Math.sin(Math.PI * k)})`; cx.fillRect(0, 0, W, H); }
    else if (B.tr === 'slide') { cx.drawImage(bufA, 0, -H * eo(k)); cx.drawImage(bufB, 0, H - H * eo(k)); }
  } else renderBeat(B, t, cx);
  cx.setTransform(1, 0, 0, 1, 0, 0);
  // gentle vignette and warm grade
  const g = cx.createRadialGradient(W / 2, H * .45, H * .35, W / 2, H * .45, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,8,0,.35)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  subtitle(t);
  if (t > window.DUR - .4) { cx.fillStyle = `rgba(0,0,0,${seg(t, window.DUR - .4, window.DUR)})`; cx.fillRect(0, 0, W, H); }
}

// —— dynamic subtitles: words pop in with the voice, the current word in the speaker's colour ——
const SUB_Y = 1400, SUB_MAXW = 860;
function subtitle(t) {
  if (Q.has('nosub')) { window.__sub = ''; return; }
  const l = LN.find(l => t >= l.t - .08 && t < l.t + Math.max(l.d + .5, 1.6)); window.__sub = l ? l.text : '';
  if (!l) return;
  const words = l.text.split(' '), lens = words.map(w => w.length + 1), tot = lens.reduce((a, b) => a + b, 0);
  cx.font = '700 62px Fredoka'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
  const sp = cx.measureText(' ').width, rows = [[]]; let rw = 0;
  words.forEach((w, i) => { const ww = cx.measureText(w).width; if (rw + ww > SUB_MAXW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push({ w, i, ww }); rw += ww + sp; });
  const fade = clamp((l.t + Math.max(l.d + .5, 1.6) - t) / .2);
  let acc = 0; const start = words.map((w, i) => { const s = l.t + l.d * acc / tot; acc += lens[i]; return s; });
  rows.forEach((row, r) => {
    const tw = row.reduce((a, o) => a + o.ww, 0) + sp * (row.length - 1); let x = W / 2 - tw / 2; const y = SUB_Y + (r - (rows.length - 1) / 2) * 78;
    for (const o of row) {
      const k = t < start[o.i] - .06 ? 0 : back(seg(t, start[o.i] - .06, start[o.i] + .14), 2.4), cur = t >= start[o.i] && (o.i === words.length - 1 ? t < l.t + l.d : t < start[o.i + 1]);
      if (k > 0) { cx.save(); cx.globalAlpha = fade; cx.translate(x + o.ww / 2, y); cx.scale(k, k);
        cx.lineWidth = 14; cx.strokeStyle = INK; cx.textAlign = 'center'; cx.strokeText(o.w, 0, 0); cx.fillStyle = cur ? COL[l.who] : '#fff'; cx.fillText(o.w, 0, 0); cx.restore(); }
      x += o.ww + sp;
    }
  });
}

await Promise.all([document.fonts.load('700 62px Fredoka', 'Ação'), document.fonts.load('80px "Lilita One"', 'BUM')]);
window.render = t => frame(t);
window.TEXTS = () => window.__sub ? [{ id: 'sub', text: window.__sub, x0: 110, y0: SUB_Y - 80, x1: 970, y1: SUB_Y + 80 }] : [];
window.READY = true;
