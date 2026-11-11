// stage.js: the page contract shared by every episode.
//   window.READY = true once fonts, voice timing and 3D are ready
//   window.TOTAL = episode length (s)
//   window.seek(t) draws the frame at absolute time t onto canvas#film (1080x1920)
//   window.LINES / window.SFX / window.MUSIC = the episode's dialogue and sound cues (read by tools/*.py)
// The renderer (tools/render.js) and the player (player.html) both only ever call seek(t).
import { W, H, clamp, prog, ease, findShot } from './core.js';
import { post } from './world3d.js';

export const WHO = {
  juninho: { name: 'JUNINHO', color: '#FFD21F' }, cleide: { name: 'DONA CLEIDE', color: '#FF7FB4' },
  controle: { name: 'CONTROLE', color: '#5CF2FF' }, ze: { name: 'ZÉ DO MULTIVERSO', color: '#4CE08A' },
  coco: { name: 'COCÔ REI', color: '#D9A066' }, cocozinho: { name: 'COCOZINHO', color: '#D9A066' },
  cafe: { name: 'CAFÉ', color: '#C8875A' }, alien: { name: 'ZORGNAK', color: '#A6FF4D' },
  imperador: { name: 'IMPERADOR SALSICHA', color: '#FF8A5C' }, coxinha: { name: 'COXINHA', color: '#FFB347' },
  voz: { name: '???', color: '#FF5C5C' }, todos: { name: 'TODOS', color: '#FFFFFF' },
};

const S = { timing: null, lines: [], ep: null };

// mouth opening (0..1) of a character at time t, from the real voice envelope when it exists
export function talk(who, t) {
  let v = 0;
  for (const l of S.lines) {
    if (l.who !== who || t < l.start || t > l.start + l.dur) continue;
    if (l.env) { const k = (t - l.start) * 50, i = Math.floor(k), f = k - i; v = Math.max(v, (l.env[i] || 0) * (1 - f) + (l.env[i + 1] || 0) * f); }
    else v = Math.max(v, .5 + .5 * Math.sin((t - l.start) * 26) * Math.sin((t - l.start) * 9.3));
  }
  return clamp(v * 1.25);
}
export function lineAt(id) { return S.lines.find(l => l.id === id); }
export function speaking(t) { return S.lines.filter(l => t >= l.start && t <= l.start + l.dur).map(l => l.who); }

// ---------- captions: PT-BR, speaker tag, chunked, popped in ----------
function chunks(text) {
  if (text.length <= 40) return [text];
  const words = text.split(' '), out = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 34 && cur) { out.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
    if (/[.!?…]$/.test(w) && cur.trim().length > 18) { out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function wrap(g, text, maxW) {
  const words = text.split(' '), rows = []; let cur = '';
  for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (g.measureText(tryS).width > maxW && cur) { rows.push(cur); cur = w; } else cur = tryS; }
  if (cur) rows.push(cur); return rows;
}
function drawCaptions(g, t) {
  if (S.ep.noCaptions && S.ep.noCaptions(t)) return;
  const act = S.lines.filter(l => t >= l.start - .02 && t <= l.start + l.dur + .3);
  let y = 1590;
  for (const l of act.slice(-2).reverse()) {
    const cs = chunks(l.text), tot = cs.reduce((a, c) => a + c.length, 0); let acc = 0, idx = cs.length - 1, c0 = l.start;
    for (let i = 0; i < cs.length; i++) { const d = l.dur * cs[i].length / tot; if (t < l.start + (acc + cs[i].length) / tot * l.dur) { idx = i; c0 = l.start + acc / tot * l.dur; break; } acc += cs[i].length; c0 = l.start + acc / tot * l.dur - d; }
    const txt = cs[idx], k = ease.outBack(prog(t, c0, c0 + .16)), who = WHO[l.who] || { name: l.who.toUpperCase(), color: '#fff' };
    g.save(); g.translate(W / 2, y); g.scale(.85 + .15 * k, .85 + .15 * k); g.globalAlpha = clamp(k * 1.5);
    const loud = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}/.test(txt) && txt === txt.toUpperCase();
    g.font = `900 ${loud ? 64 : 58}px Nunito`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const rows = wrap(g, txt, 940), lh = loud ? 72 : 66, top = -(rows.length - 1) * lh;
    // speaker tag
    g.font = '900 30px Nunito'; const tw = g.measureText(who.name).width + 36;
    g.fillStyle = who.color; g.beginPath(); g.roundRect(-tw / 2, top - 78, tw, 46, 23); g.fill();
    g.fillStyle = '#140c1c'; g.fillText(who.name, 0, top - 54);
    g.font = `900 ${loud ? 64 : 58}px Nunito`;
    rows.forEach((r, i) => { g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = '#140c1c'; g.strokeText(r, 0, top + i * lh); g.fillStyle = loud ? '#FFF4B8' : '#ffffff'; g.fillText(r, 0, top + i * lh); });
    g.restore();
    y -= rows.length * lh + 110;
  }
}

export async function boot(ep) {
  S.ep = ep;
  const film = document.getElementById('film'); film.width = W; film.height = H;
  const fg = film.getContext('2d');
  const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
  const g = buf.getContext('2d');
  for (const [fam, url, wt] of [['Bangers', '../vendor/fonts/bangers.woff2', '400'], ['Nunito', '../vendor/fonts/nunito-900.woff2', '900'], ['Nunito', '../vendor/fonts/nunito-700.woff2', '700']]) {
    const f = new FontFace(fam, `url(${new URL(url, import.meta.url)})`, { weight: wt }); await f.load(); document.fonts.add(f);
  }
  try { const r = await fetch(new URL(`../episodes/ep${ep.META.num}/timing.json`, import.meta.url)); if (r.ok) S.timing = await r.json(); } catch (e) { }
  const tm = S.timing ? Object.fromEntries(S.timing.lines.map(l => [l.id, l])) : {};
  S.lines = ep.LINES.map(l => ({ ...l, start: tm[l.id]?.start ?? l.at, dur: tm[l.id]?.dur ?? Math.max(.8, l.text.length * .062), env: tm[l.id]?.env }));
  window.LINES = ep.LINES; window.SFX = ep.SFX; window.MUSIC = ep.MUSIC || []; window.TOTAL = ep.META.total || 90;
  window.CHUNKS = S.lines.flatMap(l => chunks(l.text).map(c => ({ words: c.split(' ') })));
  const shots = await ep.makeShots({ g, talk, lineAt });
  const ctx = { g, talk, lineAt, post: {} };
  window.seek = (t) => {
    t = clamp(t, 0, window.TOTAL - 1e-4);
    const sh = findShot(shots, t), lt = t - sh.t0;
    ctx.post = {};
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, W, H);
    sh.draw(g, lt, t, ctx);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    fg.setTransform(1, 0, 0, 1, 0, 0);
    if (Object.values(ctx.post).some(v => v)) post(buf, ctx.post, t, fg);
    else fg.drawImage(buf, 0, 0);
    if (ep.overlay) ep.overlay(fg, t);
    drawCaptions(fg, t);
  };
  window.seek(0);
  window.READY = true;
}
