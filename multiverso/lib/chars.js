// chars.js: the cast, drawn in Canvas 2D. One function per character, so they look the same in every shot.
// Common options: x, y (feet / base point, canvas px), s (scale), rot (radians), sq (squash & stretch: >1 tall, <1 flat),
// face (expression), talk (0..1 mouth opening, from the voice envelope), look ([dx, dy] pupils), blink (0..1),
// armL / armR ({a: shoulder angle rad, 0 = hanging, + = raised outward; b: elbow bend}), inL / inR (fn(g) drawn in the hand).
import { TAU, clamp, lerp, noise, hash } from './core.js';
export const INK = '#1b1226';
const LW = 7;

export const PAL = {
  skinJ: '#E8A877', skinJs: '#C98458', hairJ: '#3A2416', tee: '#FFD21F', teeS: '#E0AE00', shorts: '#2F6FDB', shortsS: '#1F4FA8',
  skinC: '#F1B48C', skinCs: '#D48E66', hairC: '#8E2C3E', dress: '#F27BA8', dressS: '#D9568A',
  remote: '#7B3FE4', remoteL: '#9D6BFF', remoteD: '#4A1FA0', led: '#5CF2FF',
  suit: '#2E8B57', suitD: '#1E5E3A', skinZ: '#E3B48F', must: '#3B2414', holo: '#4CF7E8',
  poo: '#7A4A1E', pooL: '#A0682E', pooD: '#52300F', gold: '#FFC83A', goldD: '#C88A10',
};

function path(g, fill, lw = LW, stroke = INK) { if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
function ell(g, x, y, rx, ry, fill, lw = LW, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); path(g, fill, lw); }
function rr(g, x, y, w, h, r, fill, lw = LW) { g.beginPath(); g.roundRect(x, y, w, h, r); path(g, fill, lw); }
function line(g, pts, w, color, cap = 'round') { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.lineWidth = w; g.strokeStyle = color; g.lineCap = cap; g.lineJoin = 'round'; g.stroke(); }
// a limb with an outline: draw the ink stroke wide, then the color narrower
function limb(g, pts, w, color) { line(g, pts, w + LW * 2, INK); line(g, pts, w, color); }

function frame(g, o, body) {
  g.save(); g.translate(o.x || 0, o.y || 0); g.rotate(o.rot || 0);
  const s = o.s || 1, sq = o.sq || 1; g.scale(s / Math.sqrt(sq), s * sq);
  if (o.flip) g.scale(-1, 1);
  body(); g.restore();
}
// arm: shoulder at (sx, sy), side = -1 (left of screen) / +1; returns nothing, calls inHand in the hand frame
function arm(g, sx, sy, side, a = 0, b = 0, len = 78, w = 30, skin, sleeve, inHand) {
  // direction of upper arm: angle measured from straight down, rotating outward with +a
  const ua = a, ux = Math.sin(ua) * side, uy = Math.cos(ua);
  const ex2 = sx + ux * len, ey2 = sy + uy * len;
  const fa = a + b, fx = Math.sin(fa) * side, fy = Math.cos(fa);
  const hx = ex2 + fx * len, hy = ey2 + fy * len;
  limb(g, [sx, sy, ex2, ey2, hx, hy], w, skin);
  if (sleeve) { limb(g, [sx, sy, sx + ux * 34, sy + uy * 34], w + 16, sleeve); }
  ell(g, hx, hy, w * .62, w * .62, skin, LW);
  if (inHand) { g.save(); g.translate(hx, hy); g.rotate(Math.atan2(fy, fx) - Math.PI / 2); inHand(g); g.restore(); }
}

// ---------- eyes & mouths, shared ----------
function eyes(g, o, cx, cy, gap, r, opts = {}) {
  const f = o.face || 'neutral', lk = o.look || [0, 0], bl = clamp(o.blink || 0);
  for (const sd of [-1, 1]) {
    const x = cx + sd * gap; let rx = r, ry = r * 1.15;
    if (f === 'shock' || f === 'panic') { rx *= 1.25; ry *= 1.3; }
    if (f === 'pain' || f === 'squeeze') {               // > <
      line(g, [x - r * .8, cy - r * .5 * sd * 0 - r * .5, x + r * .6 * -sd * -1 * 0 + (sd < 0 ? r * .6 : -r * .6), cy, x - r * .8 + (sd < 0 ? 0 : r * 1.6), cy + r * .5], 8, INK);
      continue;
    }
    if (f === 'x') { line(g, [x - r * .6, cy - r * .6, x + r * .6, cy + r * .6], 9, INK); line(g, [x + r * .6, cy - r * .6, x - r * .6, cy + r * .6], 9, INK); continue; }
    const lid = Math.max(bl, f === 'smug' ? .45 : f === 'tired' ? .55 : f === 'bored' ? .5 : 0);
    ell(g, x, cy, rx, ry * (1 - lid * .92), '#fff', 6);
    if (lid < .95) {
      let pr = r * (f === 'shock' ? .32 : f === 'panic' ? .3 : .48), px = x + lk[0] * r * .45, py = cy + lk[1] * r * .45 + lid * ry * .3;
      if (f === 'dumb') px = x - sd * r * .35;
      if (f === 'panic') { px += noise(o.t * 30 || 0, sd + 3) * r * .2; py += noise(o.t * 33 || 0, sd + 9) * r * .2; }
      g.save(); g.beginPath(); g.ellipse(x, cy, rx, ry * (1 - lid * .92), 0, 0, TAU); g.clip();
      ell(g, px, py, pr, pr, '#140c1c', 0); ell(g, px + pr * .35, py - pr * .35, pr * .3, pr * .3, '#fff', 0);
      if (lid > 0) { g.fillStyle = opts.lidColor || '#d9a07a'; g.fillRect(x - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 * lid * .9); line(g, [x - rx, cy - ry + ry * 2 * lid * .9, x + rx, cy - ry + ry * 2 * lid * .9], 6, INK); }
      g.restore();
    }
  }
}
function brows(g, o, cx, cy, gap, w, color = INK, thick = 11) {
  const f = o.face || 'neutral';
  const tilt = { angry: .45, shock: -.25, panic: -.35, smug: 0, think: -.2, sad: -.4, tired: -.1, dumb: -.15, evil: .4, happy: -.1, pain: .3 }[f] ?? 0;
  const lift = { shock: -22, panic: -18, angry: 8, smug: -4, think: -10, dumb: -14, tired: 4, pain: 6 }[f] ?? 0;
  for (const sd of [-1, 1]) {
    let t2 = tilt * sd; let l2 = lift; if (f === 'smug' && sd > 0) l2 -= 16; if (f === 'think' && sd < 0) l2 += 10;
    const x = cx + sd * gap;
    g.save(); g.translate(x, cy + l2); g.rotate(-t2 * (sd < 0 ? -1 : 1) * (sd < 0 ? 1 : -1));
    line(g, [-w / 2, 0, w / 2, 0], thick, color); g.restore();
  }
}
// mouth: shape by expression, size by talk
function mouth(g, o, cx, cy, w, opts = {}) {
  const f = o.face || 'neutral', tk = clamp(o.talk || 0);
  const tongue = opts.tongue ?? '#E5607A', inner = '#3a0d18';
  const open = Math.max(tk, { shock: .7, panic: .8, pain: .6, dumb: .45, scream: 1 }[f] || 0);
  if (open < .08) {
    if (f === 'smug' || f === 'evil') { g.beginPath(); g.moveTo(cx - w * .45, cy + 4); g.quadraticCurveTo(cx + w * .1, cy + 18, cx + w * .5, cy - 14); path(g, null, 8); return; }
    if (f === 'happy') { g.beginPath(); g.moveTo(cx - w * .5, cy - 6); g.quadraticCurveTo(cx, cy + w * .55, cx + w * .5, cy - 6); g.closePath(); path(g, inner, 7); return; }
    if (f === 'angry' || f === 'sad' || f === 'tired') { g.beginPath(); g.moveTo(cx - w * .4, cy + 10); g.quadraticCurveTo(cx, cy - 10, cx + w * .4, cy + 10); path(g, null, 8); return; }
    if (f === 'think') { line(g, [cx - w * .2, cy + 4, cx + w * .35, cy - 4], 8, INK); return; }
    g.beginPath(); g.moveTo(cx - w * .35, cy); g.quadraticCurveTo(cx, cy + 12, cx + w * .35, cy); path(g, null, 8); return;
  }
  let mw = w * (.5 + open * .45), mh = w * (.12 + open * .62);
  if (f === 'shock') { mw = w * (.35 + tk * .2); mh = w * (.45 + tk * .2); }
  if (f === 'angry' || f === 'scream') { mw = w * (.75 + open * .2); }
  g.save(); g.beginPath();
  if (f === 'happy' || f === 'smug') { g.moveTo(cx - mw / 2, cy - mh * .2); g.quadraticCurveTo(cx, cy + mh * 1.3, cx + mw / 2, cy - mh * .2); g.quadraticCurveTo(cx, cy + mh * .1, cx - mw / 2, cy - mh * .2); }
  else g.ellipse(cx, cy + mh * .2, mw / 2, mh / 2, 0, 0, TAU);
  path(g, inner, 7); g.clip();
  ell(g, cx, cy + mh * .75, mw * .32, mh * .35, tongue, 0);
  if (opts.teeth !== false) { g.fillStyle = '#fff'; g.fillRect(cx - mw / 2, cy - mh * .45, mw, mh * .22); }
  g.restore();
  if (f === 'dumb') { ell(g, cx + mw * .15, cy + mh * .75, mw * .18, mh * .35, tongue, 5); }
}
function sweat(g, x, y, s = 1) { g.beginPath(); g.moveTo(x, y - 22 * s); g.quadraticCurveTo(x + 14 * s, y, x, y + 10 * s); g.quadraticCurveTo(x - 14 * s, y, x, y - 22 * s); path(g, '#8fe3ff', 5); }
export function vein(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#e0203a'; g.lineWidth = 9; g.lineCap = 'round';
  for (const r of [0, 1, 2, 3]) { g.save(); g.rotate(r * Math.PI / 2); g.beginPath(); g.moveTo(5, -18); g.quadraticCurveTo(5, -5, 18, -5); g.stroke(); g.restore(); }
  g.restore();
}

// ================= JUNINHO =================
// 28, messy hair with one rebel strand, yellow tee "CONFIA", blue shorts, flip-flops.
export function juninho(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, sit = o.pose === 'sit', fl = o.pose === 'float';
    const dy = sit ? 70 : 0;   // sitting lowers the upper body; on the toilet the shorts are down at the ankles
    if (sit) {
      for (const sd of [-1, 1]) limb(g, [sd * 42, -150, sd * 96, -136, sd * 90, -12], 32, PAL.skinJ);
      if (o.pantsDown !== false) { rr(g, -112, -70, 224, 50, 22, PAL.shorts); line(g, [-60, -62, -50, -30], 5, PAL.shortsS); line(g, [60, -62, 50, -30], 5, PAL.shortsS); }
      for (const sd of [-1, 1]) flipflop(g, sd * 92, 0, sd);
    } else {
      const sw = o.legSwing || 0;
      for (const sd of [-1, 1]) {
        const k = fl ? Math.sin(t * 3 + sd) * 14 : 0;
        const fx = sd * 36 + sd * sw * 20 + k, fy = fl ? -6 + Math.cos(t * 3 + sd) * 10 : -8;
        limb(g, [sd * 34, -150, sd * 38 + k * .5, -80, fx, fy], 30, PAL.skinJ);
        if (!o.noFlops) flipflop(g, fx, fy + 8, sd);
      }
    }
    g.save(); g.translate(0, dy);
    // shorts
    if (!sit) { g.beginPath(); g.moveTo(-82, -232); g.lineTo(82, -232); g.lineTo(92, -140); g.lineTo(8, -132); g.lineTo(0, -168); g.lineTo(-8, -132); g.lineTo(-92, -140); g.closePath(); path(g, PAL.shorts);
    line(g, [-60, -220, -66, -150], 6, PAL.shortsS); line(g, [60, -220, 66, -150], 6, PAL.shortsS); }
    // tee
    const belly = 8 + (o.belly || 0);
    g.beginPath(); g.moveTo(-78, -410); g.quadraticCurveTo(-96, -300, -90 - belly, -222); g.quadraticCurveTo(0, -206, 90 + belly, -222); g.quadraticCurveTo(96, -300, 78, -410); g.quadraticCurveTo(0, -430, -78, -410); g.closePath(); path(g, PAL.tee);
    g.save(); g.clip(); g.fillStyle = PAL.teeS; g.fillRect(40, -420, 70, 220); g.restore();
    g.fillStyle = INK; g.font = '900 30px Bangers, Nunito'; g.textAlign = 'center'; g.fillText(o.shirt || 'CONFIA', 0, -318);
    // arms
    arm(g, -74, -396, -1, o.armL?.a ?? .18, o.armL?.b ?? .1, 80, 28, PAL.skinJ, PAL.tee, o.inL);
    arm(g, 74, -396, 1, o.armR?.a ?? .18, o.armR?.b ?? .1, 80, 28, PAL.skinJ, PAL.tee, o.inR);
    // neck + head
    limb(g, [0, -410, 0, -440], 40, PAL.skinJ);
    if (o.head === 'potato') potatoHead(g, o, 0, -520);
    else juninhoHead(g, o, 0, -520);
    g.restore();
  });
}
function flipflop(g, x, y, sd) {
  ell(g, x + sd * 10, y + 4, 42, 13, '#2a8f4a', 6);
  line(g, [x - 16 + sd * 10, y - 2, x + sd * 4, y - 16, x + 22 + sd * 10, y - 2], 6, '#f5f5f5');
}
function juninhoHead(g, o, cx, cy) {
  const t = o.t || 0, f = o.face || 'neutral';
  // back hair
  g.beginPath();
  for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI, r = 104 + (i % 2 ? 26 : 0) + hash(i, 3) * 14; const x = cx + Math.cos(a) * r * 1.02, y = cy - 10 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); path(g, PAL.hairJ);
  // ears
  ell(g, cx - 92, cy + 6, 18, 26, PAL.skinJ); ell(g, cx + 92, cy + 6, 18, 26, PAL.skinJ);
  // face
  ell(g, cx, cy, 90, 102, PAL.skinJ);
  g.save(); g.beginPath(); g.ellipse(cx, cy, 90, 102, 0, 0, TAU); g.clip();
  g.fillStyle = 'rgba(80,40,30,.12)'; g.beginPath(); g.ellipse(cx, cy + 90, 70, 34, 0, 0, TAU); g.fill();   // stubble shadow
  if (o.blush) { g.fillStyle = `rgba(255,60,60,${o.blush * .5})`; g.fillRect(cx - 100, cy - 110, 200, 220); }
  g.restore();
  // fringe: messy spikes over the forehead + the rebel strand
  g.beginPath(); g.moveTo(cx - 96, cy - 30);
  const sp = [[-80, -100], [-58, -58], [-40, -112], [-18, -64], [4, -118], [24, -66], [46, -110], [62, -60], [86, -96], [96, -28]];
  for (const [x, y] of sp) g.lineTo(cx + x, cy + y + (o.hairWind || 0) * hash(x, 1) * 20);
  g.lineTo(cx + 92, cy - 70); g.quadraticCurveTo(cx, cy - 150, cx - 92, cy - 70); g.closePath(); path(g, PAL.hairJ);
  const st = Math.sin(t * 4) * 6 + (o.hairWind || 0) * 30;
  g.beginPath(); g.moveTo(cx + 6, cy - 120); g.quadraticCurveTo(cx + 30 + st, cy - 190, cx - 10 + st, cy - 200); path(g, null, 12, PAL.hairJ);
  g.beginPath(); g.moveTo(cx + 6, cy - 120); g.quadraticCurveTo(cx + 30 + st, cy - 190, cx - 10 + st, cy - 200); path(g, null, 0);
  // face parts
  eyes(g, { ...o, face: f }, cx, cy - 4, 36, 24, { lidColor: PAL.skinJ });
  brows(g, o, cx, cy - 46, 38, 40, PAL.hairJ, 12);
  g.beginPath(); g.moveTo(cx + 2, cy + 6); g.quadraticCurveTo(cx + 16, cy + 30, cx - 4, cy + 34); path(g, null, 6);   // nose
  mouth(g, o, cx + 4, cy + 58, 70);
  if (f === 'panic' || f === 'shock' || o.sweat) { sweat(g, cx + 84, cy - 40 + ((t * 120) % 60)); sweat(g, cx - 88, cy - 20, .8); }
}
function potatoHead(g, o, cx, cy) {
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = 100 + noise(i * .9, 5) * 14; const x = cx + Math.cos(a) * r * .95, y = cy + Math.sin(a) * r * 1.12; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); path(g, '#C9A060');
  for (let i = 0; i < 9; i++) ell(g, cx + (hash(i, 2) - .5) * 140, cy + (hash(i, 8) - .5) * 170, 6, 4, '#8a6630', 0);
  ell(g, cx - 34, cy - 18, 13, 13, '#140c1c', 0); ell(g, cx + 30, cy - 22, 9, 9, '#140c1c', 0);   // tiny dumb eyes, uneven
  line(g, [cx + 64, cy - 140, cx + 40, cy - 98], 9, '#5c8a2a'); ell(g, cx + 70, cy - 146, 20, 10, '#7fbf3a', 5, -.5);   // a sprout
  mouth(g, { ...o, face: o.talk > .1 ? 'neutral' : 'dumb' }, cx, cy + 40, 50, { teeth: false });
}

// ================= DONA CLEIDE =================
// 55, curly wine-red perm, cat-eye glasses, floral dress, one chinelo in hand (so one foot is bare).
export function cleide(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, fl = o.pose === 'float';
    // legs
    for (const sd of [-1, 1]) {
      const k = fl ? Math.sin(t * 3.4 + sd * 2) * 16 : 0, fx = sd * 40 + k, fy = fl ? -10 + Math.cos(t * 3.4 + sd) * 10 : -6;
      limb(g, [sd * 36, -100, fx, fy], 32, PAL.skinC);
      if (sd < 0) { ell(g, fx - 6, fy + 6, 44, 14, '#2c66d6', 6); line(g, [fx - 22, fy, fx - 4, fy - 14, fx + 14, fy], 6, '#fff'); }
      else ell(g, fx + 6, fy + 2, 26, 12, PAL.skinC, 6);   // bare foot: the other chinelo is in her hand
    }
    // dress (A-line) with flowers
    const flare = (o.dressUp || 0);
    g.beginPath(); g.moveTo(-82, -372); g.quadraticCurveTo(-110, -250, -130 - flare * 60, -86 - flare * 120); g.quadraticCurveTo(0, -60 - flare * 160, 130 + flare * 60, -86 - flare * 120); g.quadraticCurveTo(110, -250, 82, -372); g.quadraticCurveTo(0, -396, -82, -372); g.closePath();
    path(g, PAL.dress);
    g.save(); g.clip();
    for (let i = 0; i < 26; i++) { const fx = (hash(i, 11) - .5) * 260, fy = -380 + hash(i, 12) * 320; flower(g, fx, fy, 15 + hash(i, 13) * 8, i % 3 === 0 ? '#fff6a8' : i % 3 === 1 ? '#ffffff' : '#ffb3d1'); }
    g.fillStyle = 'rgba(160,30,80,.18)'; g.fillRect(50, -400, 120, 360); g.restore();
    path(g, null);
    // arms
    arm(g, -78, -356, -1, o.armL?.a ?? .25, o.armL?.b ?? .15, 74, 32, PAL.skinC, PAL.dress, o.inL);
    arm(g, 78, -356, 1, o.armR?.a ?? .25, o.armR?.b ?? .15, 74, 32, PAL.skinC, PAL.dress, o.inR ?? (o.noChinelo ? null : g2 => chinelo(g2, 0, 0, 1)));
    // head
    limb(g, [0, -370, 0, -398], 40, PAL.skinC);
    const cx = 0, cy = -470, f = o.face || 'angry';
    for (let i = 0; i < 15; i++) { const a = Math.PI * .95 + i / 14 * Math.PI * 1.1; ell(g, cx + Math.cos(a) * 92, cy - 14 + Math.sin(a) * 92, 36, 36, PAL.hairC, 6); }
    ell(g, cx - 82, cy + 18, 16, 22, PAL.skinC); ell(g, cx + 82, cy + 18, 16, 22, PAL.skinC);
    g.beginPath(); g.arc(cx - 86, cy + 44, 12, 0, TAU); path(g, null, 5, PAL.gold); g.beginPath(); g.arc(cx + 86, cy + 44, 12, 0, TAU); path(g, null, 5, PAL.gold);
    ell(g, cx, cy, 82, 94, PAL.skinC);
    const red = clamp(o.red ?? (f === 'angry' || f === 'scream' ? .35 : 0));
    if (red > 0) { g.save(); g.beginPath(); g.ellipse(cx, cy, 82, 94, 0, 0, TAU); g.clip(); const gr = g.createLinearGradient(0, cy - 94, 0, cy + 94); gr.addColorStop(0, `rgba(230,30,40,${red * .8})`); gr.addColorStop(1, `rgba(230,30,40,${red * .2})`); g.fillStyle = gr; g.fillRect(cx - 90, cy - 100, 180, 200); g.restore(); }
    for (let i = 0; i < 7; i++) { const a = Math.PI * 1.15 + i / 6 * Math.PI * .7; ell(g, cx + Math.cos(a) * 70, cy - 10 + Math.sin(a) * 80, 26, 26, PAL.hairC, 6); }  // fringe curls
    eyes(g, o, cx, cy, 32, 20, { lidColor: PAL.skinC });
    // cat-eye glasses
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 6, cy - 10); g.quadraticCurveTo(cx + sd * 34, cy - 30, cx + sd * 66, cy - 26); g.quadraticCurveTo(cx + sd * 64, cy + 24, cx + sd * 32, cy + 24); g.quadraticCurveTo(cx + sd * 6, cy + 20, cx + sd * 6, cy - 10); path(g, 'rgba(255,255,255,.12)', 7, '#c2185b'); }
    brows(g, o, cx, cy - 44, 34, 36, PAL.hairC, 12);
    g.beginPath(); g.moveTo(cx, cy + 6); g.quadraticCurveTo(cx + 12, cy + 26, cx - 2, cy + 30); path(g, null, 6);
    mouth(g, o, cx, cy + 56, 64, { tongue: '#d94b6b' });
    g.beginPath(); g.ellipse(cx, cy + 56, 0, 0, 0, 0, 1);
    if (f === 'angry' || f === 'scream' || o.vein) vein(g, cx + 50, cy - 70, .8 + Math.sin(t * 20) * .1);
    if (o.steam) for (let i = 0; i < 2; i++) { const k = ((t * 1.6 + i * .5) % 1); g.globalAlpha = 1 - k; ell(g, cx + (i ? 96 : -96), cy - 40 - k * 120, 22 + k * 30, 18 + k * 24, '#ffffff', 0); g.globalAlpha = 1; }
  });
}
function flower(g, x, y, r, c) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ell(g, x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .6, r * .5, r * .5, c, 0); }
  ell(g, x, y, r * .35, r * .35, '#ffcf3a', 0);
}
// the chinelo: Dona Cleide's weapon. Drawn in its own frame, sole pointing "up" (along -y).
export function chinelo(g, x = 0, y = 0, s = 1, rot = 0, glow = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (glow) { g.shadowColor = '#7df9ff'; g.shadowBlur = 40 * glow; }
  g.beginPath(); g.ellipse(0, -70, 34, 76, 0, 0, TAU); path(g, '#2c66d6', 7);
  g.shadowBlur = 0;
  g.beginPath(); g.ellipse(0, -70, 26, 66, 0, 0, TAU); path(g, '#4f8af0', 0);
  line(g, [-26, -40, 0, -100, 26, -40], 9, '#ffffff');
  ell(g, 0, -100, 7, 7, '#fff', 4);
  g.restore();
}

// ================= CONTROLE =================
// A purple remote with a screen face: LED eyes, LED-bar mouth, and a sarcastic robot voice.
// Origin = centre. o.face: 'neutral' | 'bored' | 'evil' | 'alarm' | 'happy' | 'dead'. o.press: which button glows.
export function controle(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, f = o.face || 'neutral', glowA = o.glow ?? .5;
    if (glowA) { const gr = g.createRadialGradient(0, 0, 40, 0, 0, 280); gr.addColorStop(0, `rgba(170,110,255,${.45 * glowA})`); gr.addColorStop(1, 'rgba(170,110,255,0)'); g.fillStyle = gr; g.fillRect(-300, -300, 600, 600); }
    if (o.arms) { line(g, [-70, 20, -120, 60 + Math.sin(t * 5) * 20, -140, 40], 10, INK); line(g, [70, 20, 124, -10 + Math.cos(t * 5) * 16, 148, -40], 10, INK); }
    // antenna
    line(g, [40, -160, 64, -214], 8, INK); ell(g, 66, -218, 12, 12, f === 'alarm' && Math.floor(t * 8) % 2 ? '#ff2a4a' : '#ff8cf0', 5);
    rr(g, -78, -165, 156, 330, 52, PAL.remote);
    g.save(); g.beginPath(); g.roundRect(-78, -165, 156, 330, 52); g.clip(); g.fillStyle = PAL.remoteL; g.fillRect(-78, -165, 40, 330); g.fillStyle = PAL.remoteD; g.fillRect(48, -165, 40, 330); g.restore();
    // screen
    rr(g, -58, -140, 116, 104, 22, f === 'alarm' ? (Math.floor(t * 6) % 2 ? '#3a0410' : '#160409') : '#0b0a1a', 6);
    const c = f === 'alarm' ? '#ff3b5c' : f === 'evil' ? '#ff5cf0' : PAL.led;
    g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 14;
    const blink = Math.floor((t + (o.seed || 0)) * 10) % 37 === 0 ? 1 : 0;
    const eye = (x) => {
      if (f === 'dead') { line(g, [x - 12, -110, x + 12, -86], 6, c); line(g, [x + 12, -110, x - 12, -86], 6, c); return; }
      let h = { bored: 7, neutral: 22, evil: 12, alarm: 28, happy: 18 }[f] ?? 22; if (blink) h = 3;
      const y = f === 'bored' ? -96 : -110;
      if (f === 'happy') { g.fillRect(x - 13, y + 6, 26, 6); g.fillRect(x - 16, y + 12, 6, 6); g.fillRect(x + 10, y + 12, 6, 6); return; }
      if (f === 'evil') { g.beginPath(); g.moveTo(x - 14, y - 4 + (x < 0 ? 0 : 8)); g.lineTo(x + 14, y - 4 + (x < 0 ? 8 : 0)); g.lineTo(x + 14, y + 12); g.lineTo(x - 14, y + 12); g.fill(); return; }
      g.fillRect(x - 12 + (o.look?.[0] || 0) * 6, y, 24, h);
    };
    eye(-24); eye(24);
    // LED-bar mouth: 7 bars, heights from talk + a little noise so it looks like a voice meter
    const tk = clamp(o.talk || 0);
    for (let i = 0; i < 7; i++) { const h = 3 + tk * 22 * (.4 + .6 * Math.abs(noise(t * 18 + i * 1.7, i))); g.fillRect(-35 + i * 10, -62 - h / 2, 6, h); }
    g.shadowBlur = 0;
    // buttons: power (red), green, blue + number grid
    const lit = o.press;
    const btn = (x, y, r, col, name) => { if (lit === name) { g.shadowColor = col; g.shadowBlur = 40; } ell(g, x, y, r, r, lit === name ? '#ffffff' : col, 6); g.shadowBlur = 0; if (lit === name) ell(g, x, y, r * .7, r * .7, col, 0); };
    btn(0, 8, 26, '#ff2a3a', 'red');
    btn(-34, 64, 16, '#2fe36a', 'green'); btn(0, 64, 16, '#2f8cff', 'blue'); btn(34, 64, 16, '#ffd21f', 'yellow');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) rr(g, -40 + k * 30, 94 + r * 26, 22, 16, 6, '#c7b4ff', 4);
    if (o.label) { g.fillStyle = '#e9ddff'; g.font = '900 16px Nunito'; g.textAlign = 'center'; g.fillText(o.label, 0, 154); }
  });
}

// ================= ZÉ DO MULTIVERSO =================
// Interdimensional inspector: green suit, absurd handlebar moustache, eye bags, holographic clipboard. Always tired.
export function ze(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0;
    for (const sd of [-1, 1]) { limb(g, [sd * 30, -230, sd * 34, -10], 34, PAL.suitD); ell(g, sd * 46, -4, 36, 14, '#1a1a1a', 6); }
    // jacket
    g.beginPath(); g.moveTo(-74, -500); g.lineTo(-84, -220); g.quadraticCurveTo(0, -200, 84, -220); g.lineTo(74, -500); g.quadraticCurveTo(0, -520, -74, -500); g.closePath(); path(g, PAL.suit);
    g.beginPath(); g.moveTo(-26, -506); g.lineTo(0, -380); g.lineTo(26, -506); g.closePath(); path(g, '#f4f4f0', 6);
    g.beginPath(); g.moveTo(-8, -496); g.lineTo(8, -496); g.lineTo(14, -400); g.lineTo(0, -380); g.lineTo(-14, -400); g.closePath(); path(g, '#e8a020', 5);
    line(g, [-26, -506, -48, -420, -10, -360], 7, INK); line(g, [26, -506, 48, -420, 10, -360], 7, INK);
    rr(g, 36, -460, 40, 22, 4, '#fff', 4); g.fillStyle = INK; g.font = '900 11px Nunito'; g.textAlign = 'center'; g.fillText('FISCAL', 56, -445);
    for (const y of [-330, -290]) ell(g, 0, y, 5, 5, '#cfe', 3);
    arm(g, -70, -490, -1, o.armL?.a ?? .15, o.armL?.b ?? .9, 92, 28, PAL.skinZ, PAL.suit, o.inL ?? (g2 => holoBoard(g2, t, o.board)));
    arm(g, 70, -490, 1, o.armR?.a ?? .12, o.armR?.b ?? .1, 92, 28, PAL.skinZ, PAL.suit, o.inR);
    // head: long, balding, combover
    limb(g, [0, -510, 0, -540], 36, PAL.skinZ);
    const cx = 0, cy = -640;
    ell(g, cx - 72, cy + 10, 15, 24, PAL.skinZ); ell(g, cx + 72, cy + 10, 15, 24, PAL.skinZ);
    ell(g, cx, cy, 72, 112, PAL.skinZ);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 60, cy - 70 + i * 10); g.quadraticCurveTo(cx, cy - 130 + i * 8, cx + 56, cy - 80 + i * 12); path(g, null, 6, '#3a2a1a'); }
    ell(g, cx - 66, cy - 30, 12, 30, '#6b5640', 0); ell(g, cx + 66, cy - 30, 12, 30, '#6b5640', 0);
    const f = o.face || 'tired';
    eyes(g, { ...o, face: f }, cx, cy - 26, 30, 19, { lidColor: PAL.skinZ });
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(cx + sd * 30, cy - 4, 18, .2, Math.PI - .2); path(g, null, 5, '#8a5a6a'); }   // eye bags
    brows(g, o, cx, cy - 58, 32, 34, '#3a2a1a', 10);
    g.beginPath(); g.moveTo(cx, cy - 10); g.quadraticCurveTo(cx + 22, cy + 30, cx - 4, cy + 34); path(g, '#e0a68a', 6);
    // mouth hides under the moustache; it moves when he talks
    const tk = clamp(o.talk || 0);
    if (tk > .08) ell(g, cx, cy + 66, 20 + tk * 8, 6 + tk * 22, '#3a0d18', 6);
    else line(g, [cx - 16, cy + 66, cx + 16, cy + 68], 6, INK);
    // the moustache: two heavy curls; it bounces when he talks
    const mb = tk * 6 + Math.sin(t * 2) * 2;
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(cx, cy + 38 - mb);
      g.bezierCurveTo(cx + sd * 40, cy + 26 - mb, cx + sd * 80, cy + 62, cx + sd * 112, cy + 30);
      g.bezierCurveTo(cx + sd * 132, cy + 8, cx + sd * 120, cy - 16, cx + sd * 100, cy - 4);
      g.bezierCurveTo(cx + sd * 116, cy + 12, cx + sd * 104, cy + 30, cx + sd * 84, cy + 38);
      g.bezierCurveTo(cx + sd * 60, cy + 54, cx + sd * 30, cy + 60, cx, cy + 52 - mb);
      g.closePath(); path(g, PAL.must, 6);
    }
  });
}
function holoBoard(g, t, text) {
  g.save(); g.translate(0, -40); g.rotate(-.2);
  g.globalAlpha = .85; g.shadowColor = PAL.holo; g.shadowBlur = 30;
  rr(g, -70, -110, 140, 180, 12, 'rgba(76,247,232,.22)', 5);
  g.shadowBlur = 0;
  g.strokeStyle = PAL.holo; g.lineWidth = 4;
  for (let i = 0; i < 5; i++) { const y = -76 + i * 30, w = 70 + hash(i, 4) * 40; g.beginPath(); g.moveTo(-50, y); g.lineTo(-50 + w, y); g.stroke(); }
  for (let i = 0; i < 5; i++) { g.strokeRect(-62, -84 + i * 30, 10, 10); }
  g.fillStyle = PAL.holo; g.font = '900 13px Nunito'; g.textAlign = 'center'; g.fillText(text || 'PROTOCOLO 4.022-B', 0, -94);
  const sc = (t * 60) % 180; g.globalAlpha = .3; g.fillRect(-70, -110 + sc, 140, 4);
  g.restore();
}

// ================= COCÔ =================
// The royal poo and his family. Origin = base centre. o.crown, o.gloves.
export function coco(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0;
    // legs
    const step = o.dance ? Math.sin(t * 9 + (o.seed || 0)) * 16 : 0;
    if (!o.noLegs) for (const sd of [-1, 1]) { limb(g, [sd * 34, -20, sd * 40 + (sd > 0 ? step : -step), 0], 13, PAL.pooD); ell(g, sd * 48 + (sd > 0 ? step : -step), 2, 22, 10, '#fff', 5); }
    // arms
    const wave = o.dance ? Math.sin(t * 9 + (o.seed || 0)) : 0;
    const aL = o.armL ?? (1.2 + wave * .7), aR = o.armR ?? (1.2 - wave * .7);
    for (const [sd, a] of [[-1, aL], [1, aR]]) {
      const sx = sd * 78, sy = -78, px = sx + sd * Math.sin(a) * 72, py = sy + Math.cos(a) * 72;
      limb(g, [sx, sy, px, py], 11, PAL.pooD);
      ell(g, px, py, 17, 17, '#fff', 5);
    }
    // body: three tiers + tip swirl
    const tier = (y, rx, ry, c) => { ell(g, 0, y, rx, ry, c, LW); g.save(); g.beginPath(); g.ellipse(0, y, rx, ry, 0, 0, TAU); g.clip(); ell(g, -rx * .35, y - ry * .35, rx * .45, ry * .3, 'rgba(255,220,170,.25)', 0); g.restore(); };
    tier(-46, 92, 46, PAL.poo); tier(-108, 72, 40, PAL.poo); tier(-162, 50, 32, PAL.poo);
    g.beginPath(); g.moveTo(-18, -186); g.quadraticCurveTo(0, -236, 30, -228); g.quadraticCurveTo(10, -214, 16, -190); path(g, PAL.poo);
    // face on the middle tier
    const fo = { ...o, face: o.face || 'happy' };
    eyes(g, fo, 0, -122, 26, 19, { lidColor: PAL.poo });
    mouth(g, fo, 0, -76, 56, { tongue: '#ff8fa0' });
    if (o.crown) { g.save(); g.translate(4, -226); g.rotate(-.12);
      g.beginPath(); g.moveTo(-50, 10); g.lineTo(-56, -40); g.lineTo(-28, -14); g.lineTo(0, -54); g.lineTo(28, -14); g.lineTo(56, -40); g.lineTo(50, 10); g.closePath();
      g.shadowColor = '#ffe27a'; g.shadowBlur = o.crownGlow ? 40 : 0; path(g, PAL.gold); g.shadowBlur = 0;
      ell(g, 0, -8, 9, 9, '#e8203a', 4); ell(g, -30, -2, 6, 6, '#2f8cff', 3); ell(g, 30, -2, 6, 6, '#2fe36a', 3); g.restore(); }
    if (o.hat === 'scarf') { line(g, [-60, -140, 60, -140], 16, '#f4f4f0'); line(g, [50, -140, 70, -100], 14, '#f4f4f0'); }
    if (o.shades) { rr(g, -50, -138, 44, 24, 8, '#111', 4); rr(g, 6, -138, 44, 24, 8, '#111', 4); line(g, [-6, -128, 6, -128], 5, INK); }
    if (o.stink) for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; g.globalAlpha = (1 - k) * .8; g.beginPath(); const sx = -40 + i * 40; g.moveTo(sx, -230 - k * 120); for (let j = 1; j < 8; j++) g.lineTo(sx + Math.sin(j * 1.4 + t * 4 + i) * 14, -230 - k * 120 - j * 12); path(g, null, 6, '#9ccf3a'); g.globalAlpha = 1; }
  });
}

// ================= PROPS =================
export function toilet(g, x, y, s = 1, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // tank
  rr(g, -150, -560, 300, 220, 30, '#fbfbff'); rr(g, -164, -580, 328, 40, 16, '#ffffff');
  g.fillStyle = 'rgba(120,150,200,.18)'; g.fillRect(90, -555, 50, 210);
  rr(g, 100, -520, 50, 18, 8, '#d8dbe6', 5);   // flush handle
  // base & bowl
  g.beginPath(); g.moveTo(-90, -120); g.quadraticCurveTo(-110, -10, -120, 0); g.lineTo(120, 0); g.quadraticCurveTo(110, -10, 90, -120); g.closePath(); path(g, '#f0f2fa');
  ell(g, 0, -170, 200, 76, '#ffffff');
  if (!o.seatUp) { ell(g, 0, -182, 176, 58, '#e9ecf6'); ell(g, 0, -182, 130, 38, o.water || '#7fd6f0', 6); }
  if (o.glow) { const gr = g.createRadialGradient(0, -182, 10, 0, -182, 260); gr.addColorStop(0, `rgba(255,230,120,${o.glow})`); gr.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gr; g.fillRect(-300, -460, 600, 560); }
  g.restore();
}
export function speedLines(g, cx, cy, t, n = 40, r0 = 380, col = 'rgba(255,255,255,.8)') {
  g.save(); g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = hash(i, 5) * TAU, k = (t * 3 + hash(i, 9)) % 1, r = r0 + k * 900; g.lineWidth = 4 + hash(i, 2) * 10; g.globalAlpha = 1 - k;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * (r + 160), cy + Math.sin(a) * (r + 160)); g.stroke(); }
  g.restore();
}
export const ellipse = ell, rrect = rr, poly = line, limbs = limb, outline = path;
