// Bridges between episodes (a shared clock: the last frame of one episode is the first frame of the next) and episodes 2–5.
import { clamp, seg, ss, eo, ei, eio, back, lerp, shake, TAU, hash, mulberry } from './lib.js';
import { INK, blob, ink, lw, word, sweat } from './toon.js';
import { puff, stars, speedLines, punch, holo, pixelate, foam, ia, space, lab } from './sets.js';
import { E0, show, arc, walkPh, land, plunger, phone, money } from './common.js';
import { DRAW, pose } from './cast.js';

// —— small props ——
function ghost(c, x, y, s, t, sad = 0) { c.save(); c.translate(x, y + Math.sin(t * 3 + x) * 12); c.scale(s, s);
  blob(c, '#f4f4ff', () => { c.moveTo(-70, 0); c.lineTo(-70, -110); c.arc(0, -110, 70, Math.PI, 0); c.lineTo(70, 0); for (let k = 0; k < 4; k++) c.quadraticCurveTo(70 - k * 35 - 17, 25, 70 - (k + 1) * 35, 0); c.closePath(); });
  for (const s2 of [-1, 1]) { c.fillStyle = INK; c.beginPath(); c.ellipse(s2 * 24, -120, 10, 16, 0, 0, TAU); c.fill(); }
  c.beginPath(); c.arc(0, -70 + (sad ? 10 : 0), 16, sad ? Math.PI * 1.15 : .15, sad ? Math.PI * 1.85 : Math.PI - .15); ink(c, 5); c.restore(); }
function boleto(c, x, y, r, s = 1) { c.save(); c.translate(x, y); c.rotate(r); c.scale(s, s); blob(c, '#fffdf2', () => c.rect(-70, -45, 140, 90), { line: 4 }); c.fillStyle = INK; for (let i = 0; i < 16; i++) c.fillRect(-60 + i * 7.5, 10, i % 3 ? 3 : 5, 26); word(c, 'BOLETO', 0, -20, 26, 1, '#c8282a', 0, 'Fredoka'); c.restore(); }
function camIcon(c, x, y, s = 1) { c.save(); c.translate(x, y); c.scale(s, s); blob(c, '#2a2a30', () => c.roundRect(-30, -20, 60, 40, 8), { line: 3 }); blob(c, '#9ad8ff', () => c.arc(0, 0, 13, 0, TAU), { line: 3 }); blob(c, '#ff2a2a', () => c.arc(20, -12, 5, 0, TAU), { line: 2 }); c.restore(); }
function heads(c, t, scream = 0, y0 = 120) {   // the audience in the foreground
  const R = mulberry(31);
  for (let k = 0; k < 9; k++) { const x = -1000 + k * 250 + R() * 60, y = y0 + (k % 2) * 40, col = ['#e8b48a', '#c88a5a', '#f0c09a', '#a8703a'][k % 4], hair = ['#3a2416', '#8a4fc8', '#6a6a6a', '#1a1210'][k % 4];
    blob(c, '#4a5a8a', () => c.ellipse(x, y + 200, 130, 140, 0, 0, TAU)); blob(c, col, () => c.arc(x, y, 90, 0, TAU)); blob(c, hair, () => c.arc(x, y - 40, 80, Math.PI, 0));
    for (const s of [-1, 1]) { blob(c, '#fff', () => c.ellipse(x + s * 28, y - 5, 18, 22, 0, 0, TAU), { line: 4 }); c.fillStyle = INK; c.beginPath(); c.arc(x + s * 28, y - 5 + (scream ? 4 : 0), 4, 0, TAU); c.fill(); }
    if (scream > 0) blob(c, '#5a1020', () => c.ellipse(x, y + 45, 24, Math.max(3, 30 * scream + 5 * Math.sin(t * 30 + k)), 0, 0, TAU), { line: 4 }); }
}
function receipt(c, x, y, k, t) { if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); c.rotate(-.05); blob(c, '#fffdf2', () => c.rect(-220, -300, 440, 600), { line: 6 });
  c.fillStyle = INK; c.font = '700 34px Fredoka'; c.textAlign = 'center'; c.fillText('RECIBO', 0, -240); c.font = '28px Fredoka'; c.fillText('1 desentupidor', 0, -180); c.fillText('R$ 0,00', 0, -140);
  c.font = '13px Fredoka'; for (let i = 0; i < 12; i++) c.fillText('o abaixo assinado concorda com todos os termos do condomínio', 0, -60 + i * 18);
  c.font = '700 15px Fredoka'; c.fillStyle = '#c8282a'; c.fillText('...E CEDE A ALMA PRO CARGO DE CAPETA', 0, 170); c.restore(); }
function button(c, x, y, k, t) { blob(c, '#8a8a90', () => c.rect(x - 90, y, 180, 260), { sh: 12 }); blob(c, '#a01a14', () => c.ellipse(x, y, 110, 34, 0, 0, TAU)); blob(c, '#ff2a2a', () => c.ellipse(x, y - 30 + 22 * k, 90, 30, 0, 0, TAU), { sh: 10 }); c.save(); c.globalAlpha = .4 + .3 * Math.sin(t * 6); blob(c, '#ff6a5a', () => c.ellipse(x - 25, y - 40 + 22 * k, 30, 10, 0, 0, TAU), { line: 0 }); c.restore(); }
// draw a cast member somewhere (used inside holograms and the screen-space falls)
function drawP(c, k, o, t) { const P = pose(o); P.E = Object.assign(E0(), o.E || {}); DRAW[k](c, P, t); }

// —— B12: black, then the lift opens by itself in the foam-flooded corridor (joint at J = 3.0) ——
function b12(side) {
  const J = 3.0;
  return { name: side === 'out' ? 'elevador abre' : 'sai da espuma', scene: 'corridor', bridge: [J, side], dur: side === 'out' ? 3.0 : 6.0, mood: 'eerie',
    lines: side === 'in' ? [['J7', 1.7]] : null, tail: .4,
    set: b => ({ foam: .32, foamSeed: 3, lift: ss(seg(b, 1.0, 2.6)), liftGlow: seg(b, 1.0, 1.6) }),
    cast(b, D, S, t) { if (b < J + .2) return; const up = eo(seg(b, J + .2, J + 1.2)), x = b < J + 3.8 ? 700 : lerp(700, 1250, ss(seg(b, J + 3.8, J + 5.6)));
      show(S.jun, { x, face: 1, walk: b > J + 3.8 && b < J + 5.6 ? .6 : 0, ph: walkPh(x), aB: .1, aF: .1, E: { lid: .6, mouth: 'flat', look: b > J + 3.4 ? [1, 0] : [0, 0] }, sq: lerp(.3, 1, up) }); },
    front(c, b, D, t, S) {
      if (b > 1.6 && b < J + .4) { for (const s of [-1, 1]) { blob(c, '#fff', () => c.ellipse(700 + s * 34, -500, 30, 36, 0, 0, TAU)); c.fillStyle = INK; c.beginPath(); c.arc(700 + s * 34 + 10, -495, 7, 0, TAU); c.fill(); } }
      if (S.jun.vis) { const P = S.jun; c.save(); c.translate(P.x, P.y); c.scale(1, P.sq); for (const [dx, dy, r] of [[-40, -620, 50], [30, -650, 44], [60, -420, 40], [-50, -300, 46], [10, -180, 36], [-20, -560, 30]]) blob(c, '#8a5a2a', () => c.arc(dx, dy, r, 0, TAU), { line: 5 }); c.restore(); }
    },
    cam: (b, D) => b < J + 3.6 ? [lerp(1050, 950, seg(b, 0, J + 3.6)), -620, lerp(.82, .9, seg(b, J, J + 3.6))] : [lerp(950, 1200, ss(seg(b, J + 3.6, J + 5.6))), -620, .9],
    ui(c, b) { if (b < .8) { c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1920); } },
    sfx: side === 'out' ? [[(D) => D - 2.0, 'ding', -2], [(D) => D - 1.9, 'lift_open', -6]] : [[.2, 'goo', -6], [3.8, 'squelch', -8]] };
}
// —— B23: the impact card (joint at J = .5): white, cracks, KRAAASH; then the court through the dust ——
function impactCard(c, b, J) {
  const k = b < J + .3 ? 1 : 1 - seg(b, J + .3, J + .9); if (k <= 0) return;
  c.save(); c.globalAlpha = k; c.fillStyle = '#fffbea'; c.fillRect(0, 0, 1080, 1920);
  const R = mulberry(77); c.strokeStyle = INK; c.lineWidth = 9; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(540, 900); let x = 540, y = 900; const a = i / 12 * TAU; for (let s = 0; s < 6; s++) { x += Math.cos(a + (R() - .5)) * 110; y += Math.sin(a + (R() - .5)) * 110; c.lineTo(x, y); } c.stroke(); }
  word(c, 'KRAAASH!', 540, 880, 190, 1, '#ff3a2a', -.1); c.restore();
}
function b23(side) {
  const J = .5;
  return { name: side === 'out' ? 'impacto' : 'tribunal', scene: 'court', bridge: [J, side], dur: side === 'out' ? .5 : 3.2, mood: side === 'out' ? 'boom' : 'court',
    set: b => ({}), cast(b, D, S, t) { if (b < J + .5) return; const cr = seg(b, J + 1.2, J + 2.4);
      show(S.jun, { x: lerp(-60, 140, cr), y: 0, face: 1, legs: b < J + 2.4 ? [1.4, 1.5, 1.2, 1.4] : null, lean: b < J + 2.4 ? 1.1 : lerp(1.1, 0, seg(b, J + 2.4, J + 2.7)), aB: 1.4 + .3 * Math.sin(b * 9), aF: 1.4 - .3 * Math.sin(b * 9), E: { eye: 'spiral', mouth: 'wobble' } }); },
    back(c, b, D, t) { if (b < J) return; c.save(); c.translate(-80, 0); c.rotate(-.12); blob(c, '#a8adb8', () => c.rect(-260, -560, 520, 560), { sh: 20 }); blob(c, '#1a1418', () => c.rect(-200, -500, 400, 500)); c.restore(); },
    front(c, b, D, t) { if (b < J) return; puff(c, -100, -300, 300 * (1 - seg(b, J, J + 2.4)) + 80, 1 - seg(b, J + 1.2, J + 2.6), '#d8c8a8'); if (b > J + 2.2) stars(c, 140, -700, 80, t, 4); },
    cam: (b, D) => [lerp(0, 40, seg(b, J, J + 3)), -560, .9],
    ui(c, b) { impactCard(c, b, J); },
    sfx: side === 'out' ? [[0, 'crash', 2], [.05, 'kaboom', 0]] : [[.5, 'rumble', -8], [1.6, 'birds', -10]] };
}
// —— B34: falling in the dark (joint at J = 1.6), drawn in screen space; then the iris opens on the lab ——
function fallDraw(c, b, t) {
  c.fillStyle = '#0a0812'; c.fillRect(0, 0, 1080, 1920);
  c.save(); c.translate(540, 960); c.rotate(b * .8); c.strokeStyle = 'rgba(120,90,200,.5)'; c.lineWidth = 6; for (let i = 0; i < 24; i++) { c.beginPath(); for (let k = 0; k < 40; k++) { const a = i / 24 * TAU + k * .12, r = ((k * 30 + b * 600) % 1200); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); } c.restore();
  const who = [['jun', -230, -300, 1.2], ['car', 230, -100, -1.4], ['cle', -160, 250, .9], ['osv', 220, 380, -.7], ['vaso', 0, -620, .5]];
  for (const [k, x, y, sp] of who) { c.save(); c.translate(540 + x + Math.sin(b * 2 + x) * 30, 960 + y + Math.cos(b * 1.7 + y) * 30); c.scale(.42, .42); c.rotate(b * sp);
    drawP(c, k, { x: 0, y: 300, aB: 2.8, aF: 2.9, cos: k === 'car' ? 'judge' : undefined, legs: [.6, 1, -.5, 1.2], E: { eye: 'wide', mouth: 'scream', open: .6 } }, t); c.restore(); }
  word(c, 'AAAAAAAH!', 540, 300, 110, 1, '#d79aff', -.05);
}
function b34(side) {
  const J = 1.6;
  return { name: side === 'out' ? 'queda no escuro' : 'laboratório', scene: 'lab', bridge: [J, side], dur: side === 'out' ? 1.6 : 4.0, mood: side === 'out' ? 'boom' : 'lab',
    set: () => ({}),
    cast(b, D, S, t) { if (b < J + .9) return; const l = (k, x, a, sq) => show(S[k], Object.assign({ x, face: x < 0 ? 1 : -1, sq: land(b, a), E: { eye: b < a + .4 ? 'spiral' : 'open', mouth: 'wobble' } }, sq));
      const y = (a) => b < a ? -1400 * (1 - seg(b, J + .9, a)) : 0;
      l('jun', -300, J + 1.3, { y: y(J + 1.3) }); l('car', 300, J + 1.45, { y: y(J + 1.45), cos: 'judge' }); l('cle', -650, J + 1.6, { y: y(J + 1.6) }); l('osv', 650, J + 1.75, { y: y(J + 1.75) }); l('vaso', 0, J + 1.9, { y: y(J + 1.9), face: 1, s: .8 }); },
    back(c, b, D, t, S) { ia(c, t, { mouth: 0, mood: 'calm', glitch: 1 - seg(b, J + 2.5, J + 3.4), text: '' }); },
    cam: (b, D) => [0, -1000, .58],
    shake: b => Math.abs(shake(b, J + 1.3, 20, .3)) + Math.abs(shake(b, J + 1.9, 25, .3)),
    ui(c, b, D, t) { if (b < J + .9) { const r = b < J + .3 ? 0 : seg(b, J + .3, J + .9) * 1300; fallDraw(c, b, t); if (r > 0) { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(540, 960, r, 0, TAU); c.fill(); c.restore(); } } },
    sfx: side === 'out' ? [[0, 'fall', -2], [.2, 'scream_crowd', -6]] : [[1.3, 'thud', 0], [1.45, 'thud', -2], [1.6, 'thud', -2], [1.75, 'thud', 0], [1.9, 'crash', -4], [2.4, 'power_up', -6]] };
}
// —— B45: the lab dissolves into pixels (joint at J = 2.0), space shows through ——
function b45(side) {
  const J = 2.0;
  return { name: side === 'out' ? 'pixels' : 'pixels 2', scene: side === 'out' ? 'lab' : 'lab', bridge: [J, side], dur: side === 'out' ? 2.0 : 3.6, mood: side === 'out' ? 'space' : 'space',
    cast(b, D, S, t) { const x0 = { jun: -300, car: 300, cle: -650, osv: 650, vaso: 0 };
      for (const k of Object.keys(x0)) show(S[k], { x: x0[k], face: x0[k] < 0 ? 1 : -1, s: k === 'vaso' ? .8 : 1, cos: k === 'car' ? 'judge' : undefined, y: -40 * Math.sin(b * 3 + x0[k]) * seg(b, J, J + 2), rot: .2 * Math.sin(b * 2 + x0[k]) * seg(b, J, J + 2), E: { eye: 'wide', mouth: 'o', open: .3, look: [0, -1] } }); },
    back(c, b, D, t) { ia(c, t, { mood: 'error', glitch: 1, text: 'REINICIANDO...' }); },
    cam: (b, D) => [0, -1000, .58],
    ui(c, b, D, t) { pixelate(c, seg(b, 0, J + 3.4) * .98, t); },
    sfx: side === 'out' ? [[0, 'glitch', -4], [1.0, 'glitch', -4]] : [[0, 'glitch', -4], [1.5, 'power_down', -4]] };
}
export const BR = { b12, b23, b34, b45 };

const juniorLift = (S, o = {}) => show(S.jun, Object.assign({ x: -150, face: 1, aB: .1, aF: .1, E: { lid: .55, mouth: 'flat' } }, o));
const liftCam = (u, D, z = 1.15) => [-60, -620, lerp(z, z + .08, u / D)];

// ———————————————————— EPISÓDIO 2 · O ELEVADOR DO INFERNO ————————————————————
export const EP2 = [
  b12('in'),
  { name: 'painel', scene: 'liftInside', dur: 3.6, tr: 'whip', mood: 'normal',
    set: u => ({ lit: u > 2.2 ? 'INFERNO' : u > 1.4 ? 'COBERTURA' : null, floor: '4' }),
    cast(u, D, S, t) { const press = seg(u, .8, 1.4);
      juniorLift(S, { x: -40, aF: lerp(.1, 1.9, eo(press)), bF: .1, E: { lid: u > 2.2 ? 0 : .5, eye: u > 2.2 ? 'wide' : 'open', look: [1, -.5], mouth: u > 2.2 ? 'o' : 'flat', open: .2 } }); },
    front(c, u, D, t) { if (u > 2.2) word(c, 'ué', 120, -1050, 70, back(seg(u, 2.2, 2.4)), '#fff'); },
    cam: (u, D) => u < 2.2 ? [200, -1050, 1.6] : [60, -900, 1.1],
    sfx: [[1.4, 'boop', -4], [2.2, 'boop', -2], [2.4, 'lift_open', -10], [2.6, 'rumble', -12]] },
  { name: 'muzak', scene: 'liftInside', line: 'J28', lead: .8, tail: .6, tr: 'cut', mood: 'normal',
    set: () => ({ lit: 'INFERNO', floor: '▼' }),
    cast(u, D, S, t) { juniorLift(S, { x: -40, aF: .1, head: .05 * Math.sin(u * 3), E: { lid: .65, look: [0, -1], mouth: 'flat' } }); },
    front(c, u, D, t) { for (let i = 0; i < 3; i++) word(c, '♪', -300 + i * 220, -1300 - ((u * 120 + i * 90) % 300), 70, 1, '#7a7a90', Math.sin(u * 2 + i) * .3, 'Fredoka'); },
    cam: (u, D) => liftCam(u, D, 1.3), sfx: [[.1, 'dial', -18]] },
  { name: 'voz', scene: 'liftInside', lines: [['E1', .3], ['J8', '+.4']], tail: .5, tr: 'cut', mood: 'normal',
    set: () => ({ lit: 'INFERNO', floor: '▼' }),
    cast(u, D, S, t) { juniorLift(S, { x: -40, E: { lid: .6, look: [0, -1], mouth: 'flat' } }); },
    cam: (u, D) => liftCam(u, D, 1.2) },
  { name: 'vergonha 1', scene: 'liftInside', line: 'E2', lead: .4, tail: .6, tr: 'cut', mood: 'gossip',
    set: () => ({ lit: 'INFERNO', floor: '▼' }),
    cast(u, D, S, t) { juniorLift(S, { x: -300, E: { eye: 'wide', look: [1, -.6], mouth: 'o', open: .3, sweat: seg(u, 2, 3) } }); },
    front(c, u, D, t) { holo(c, 180, -1150, 520, 560, back(seg(u, .2, .5)), t, c => { c.fillStyle = '#2a5a3a'; c.fillRect(-300, -300, 600, 600); c.fillStyle = '#fff'; c.font = '30px Fredoka'; c.textAlign = 'center'; c.fillText('2 + 2 = ?', 0, -220);
      c.save(); c.translate(-120, 250); c.scale(.42, .42); drawP(c, 'cle', { face: 1, aF: 2.6, E: { eye: 'wide', mouth: 'o', open: .4 } }, t); c.restore();
      c.save(); c.translate(150, 250); c.scale(.3, .3); drawP(c, 'jun', { face: -1, aF: 2.8, E: { eye: 'happy', mouth: 'grin', open: .3, lid: 0 } }, t); c.restore();
      if (u > 2.6) word(c, 'MÃE!', 140, -60, 60, back(seg(u, 2.6, 2.8)), '#ffe23a'); }); },
    cam: (u, D) => [0, -900, .95],
    sfx: [[.2, 'holo', -6], [2.7, 'crowd_gasp', -8]] },
  { name: 'vergonha 2', scene: 'liftInside', lines: [['E3', .3], ['J9', '+.3']], tail: .5, tr: 'cut', mood: 'gossip',
    set: () => ({ lit: 'INFERNO', floor: '▼' }),
    cast(u, D, S, t) { const melt = seg(u, 2.5, 4.6); juniorLift(S, { x: -300, sq: lerp(1, .55, melt), E: { eye: u > 5 ? 'wide' : 'closed', mouth: u > 5 ? 'scream' : 'wobble', open: .3, sweat: 1, blush: 1 } }); },
    front(c, u, D, t) { holo(c, 180, -1150, 420, 620, back(seg(u, .2, .5)), t, c => { blob(c, '#2a2a30', () => c.roundRect(-170, -290, 340, 580, 30)); blob(c, '#f4f4f4', () => c.rect(-150, -240, 300, 460), { line: 3 });
      c.fillStyle = '#e8b48a'; c.fillRect(-120, -200, 240, 240); word(c, '2014', 0, -80, 50, 1, '#fff', 0); c.fillStyle = INK; c.font = '28px Fredoka'; c.textAlign = 'center'; c.fillText('03:12', 0, 120);
      const hk = back(seg(u, 2.0, 2.3)); c.save(); c.translate(0, 170); c.scale(hk, hk); blob(c, '#ff2a5a', () => { c.moveTo(0, 30); c.bezierCurveTo(-60, -20, -30, -60, 0, -30); c.bezierCurveTo(30, -60, 60, -20, 0, 30); }); c.restore(); }); },
    cam: (u, D) => [0, -900, .95],
    sfx: [[.2, 'holo', -6], [2.0, 'pop', -2], [2.1, 'sting_short', -4]] },
  { name: 'vergonha 3', scene: 'liftInside', lines: [['E4', .3], ['J29', '+.4']], tail: .6, tr: 'cut', mood: 'gossip',
    set: () => ({ lit: 'INFERNO', floor: '▼' }),
    cast(u, D, S, t) { juniorLift(S, { x: -300, sq: .7, aF: u > 3.8 ? 2.4 : .1, E: { eye: u > 3.8 ? 'angry' : 'closed', mouth: u > 3.8 ? 'scream' : 'wobble', brow: -1, open: .3, tears: u < 3.8 ? 1 : 0 } }); },
    front(c, u, D, t) { holo(c, 180, -1150, 480, 420, back(seg(u, .2, .5)), t, c => { c.fillStyle = '#ffe9a0'; c.fillRect(-300, -250, 600, 500); blob(c, '#ffd23a', () => c.roundRect(-120, -60, 240, 140, 20)); word(c, 'MARGARINA', 0, 10, 40, 1, '#c8282a', 0); word(c, 'FAMÍLIA FELIZ', 0, -160, 38, 1, INK, 0, 'Fredoka'); }); },
    cam: (u, D) => u < 3.8 ? [0, -900, .95] : [-300, -500, 1.8], sfx: [[.2, 'holo', -6], [.6, 'sob', -8]] },
  { name: 'osvaldo tela', scene: 'liftInside', lines: [['O4', .5], ['J10', '+.4'], ['O5', '+.3']], tail: .5, tr: 'cut', mood: 'comic',
    set: () => ({ lit: 'INFERNO', floor: '▼' }),
    cast(u, D, S, t) { juniorLift(S, { x: -300, aF: u > 5 ? 1.6 : .1, bF: .1, E: { lid: .5, look: [1, -.7], mouth: 'flat' } }); },
    front(c, u, D, t, S) { holo(c, 160, -1200, 560, 560, back(seg(u, 0, .3)), t, c => { c.fillStyle = '#c86a3a'; c.fillRect(-300, -300, 600, 600);
      for (let i = 0; i < 3; i++) ghost(c, -180 + i * 180, 230, .7, t, 1);
      c.save(); c.translate(0, 300); c.scale(.5, .5); drawP(c, 'osv', { face: 1, aF: 2.0 + .2 * Math.sin(t * 6), bF: .3, E: { lid: .1, brow: -.8, mouth: 'flat', open: S.osv.E.open, stache: .4 } }, t); c.restore();
      boleto(c, 120, -60, .2 + .1 * Math.sin(t * 5), .8); }); },
    cast2: null,
    cam: (u, D) => u < 4.8 ? [0, -950, .95] : u < 7.4 ? [-300, -540, 1.9] : [120, -1180, 1.8],
    sfx: [[0, 'holo', -6], [7.6, 'sob', -10]] },
  { name: 'inferno', scene: 'inferno', lines: [['D1', 1.3], ['J11', '+.4']], tail: .5, tr: 'whip', mood: 'hell',
    cast(u, D, S, t) { const x = lerp(-900, -500, eo(seg(u, 0, 1.0)));
      show(S.dem, { x: 120, face: -1, aB: .9, aF: u < 1.2 ? 1.3 + .15 * Math.sin(u * 30) : .4, bF: .8, bB: .8, E: { lid: .3, mouth: 'smile', curl: .3, look: [u < 1.2 ? .3 : 1, u < 1.2 ? 1 : 0] } });
      juniorLift(S, { x, face: 1, walk: u < 1 ? .6 : 0, ph: walkPh(x), E: { lid: .5, mouth: 'flat' } }); S.order = ['jun', 'dem']; },
    cam: (u, D) => [lerp(-350, -200, u / D), -560, lerp(1.0, 1.1, u / D)],
    sfx: [[0, 'ding', -6], [.1, 'hell', -10], [.2, 'typing', -10]] },
  { name: 'terceirizado', scene: 'inferno', lines: [['D2', .3], ['D3', '+.5']], tail: .6, tr: 'cut', mood: 'hell',
    cast(u, D, S, t) { show(S.dem, { x: 120, face: -1, aB: .9, aF: u > 4.6 ? 1.7 : 1.0, bF: .4, E: { lid: .4, mouth: 'flat', brow: .5, sad: 1 } }); juniorLift(S, { x: -500, E: { lid: .6, mouth: 'flat' } }); S.order = ['jun', 'dem']; },
    front(c, u, D, t) { const k = seg(u, 1.2, 1.6); c.save(); c.translate(560, -1150); c.scale(1, Math.abs(Math.cos(k * Math.PI))); blob(c, k < .5 ? '#f4e8c8' : '#9cc8a6', () => c.rect(-180, -110, 360, 220), { line: 6 });
      if (k < .5) word(c, 'INFERNO S.A.', 0, 0, 44, 1, '#c8282a', 0); else { word(c, 'ADM:', 0, -45, 40, 1, INK, 0); word(c, 'CONDOMÍNIO', 0, 25, 44, 1, '#2a5a3a', 0); } c.restore();
      if (u > 4.6) { boleto(c, 260, -760, -.2, 1.2); word(c, 'PAGO', 260, -760, 60, back(seg(u, 5.0, 5.2)), '#c8282a', -.3); } },
    cam: (u, D) => u < 4.4 ? [lerp(200, 280, u / 4.4), -900, .95] : [200, -620, 1.5],
    sfx: [[1.2, 'whoosh', -6], [5.0, 'stamp', -2]] },
  { name: 'plano de saúde', scene: 'inferno', lines: [['D4', .3], ['J30', '+.4']], tail: .7, tr: 'cut', mood: 'hell',
    cast(u, D, S, t) { show(S.dem, { x: 120, face: -1, aB: .9, aF: 1.5, bF: .5, E: { lid: .3, mouth: 'smile', curl: .4 } }); juniorLift(S, { x: -500, E: { lid: .7, mouth: 'flat', look: u > 4 ? [-.3, .2] : [1, 0] } }); S.order = ['jun', 'dem']; },
    front(c, u, D, t) { c.save(); c.translate(-80, -1000); blob(c, '#f4f4f0', () => c.roundRect(-150, -80, 300, 160, 14), { line: 5 }); word(c, 'PLANO', 0, -30, 36, 1, '#2a6ae8', 0); word(c, 'DOR TOTAL', 0, 30, 36, 1, '#c8282a', 0); c.restore(); },
    cam: (u, D) => u < 4 ? [-100, -800, 1.0] : [-480, -560, 2.3] },
  { name: 'puta que pariu', scene: 'inferno', line: 'J12', lead: .3, tail: 1.0, tr: 'cut', mood: 'hell',
    cast(u, D, S, t) { juniorLift(S, { x: -500, E: { lid: .6, mouth: 'flat', look: [1, 0] } }); show(S.dem, { x: 120, face: -1, aF: 1.5, bF: .3, aB: .9, E: { lid: .2, mouth: 'smile', curl: .5, look: [1, 0] } }); S.order = ['jun', 'dem']; },
    front(c, u, D, t) { if (u > 1.9) { c.save(); c.translate(-80, -520); c.rotate(-.06); blob(c, '#d6b04a', () => c.rect(-90, -110, 180, 220), { line: 6 }); blob(c, '#ffd8e8', () => c.rect(-70, -90, 140, 180), { line: 4 });
      blob(c, '#d8382c', () => c.arc(0, -10, 45, 0, TAU)); for (const s of [-1, 1]) blob(c, '#f2e8d0', () => { c.moveTo(s * 25, -45); c.lineTo(s * 45, -95); c.lineTo(s * 8, -55); c.closePath(); }); blob(c, '#8a4fc8', () => c.arc(0, -55, 40, Math.PI, 0)); word(c, 'MAMÃE', 0, 70, 30, 1, '#c8282a', 0, 'Fredoka'); c.restore(); } },
    cam: (u, D) => u < 1.9 ? [-480, -540, 2.2] : [-100, -560, 1.7],
    sfx: [[1.9, 'ding', -6]] },
  { name: 'caramelo advogado', scene: 'inferno', lines: [['K3', 1.2], ['K14', '+.4'], ['J13', '+.3'], ['K4', '+.3']], tail: 1.0, tr: 'cut', mood: 'dog',
    cast(u, D, S, t) { const x = lerp(-1200, -150, eo(seg(u, 0, 1.1)));
      show(S.car, { x, face: 1, cos: 'suit', walk: u < 1.1 ? .7 : 0, ph: walkPh(x, 120), aB: .2, aF: u > 1.2 ? 1.2 : .2, bF: .3, E: { lid: .6, mouth: 'flat', brow: -.2 }, hold: (c, x2, y2) => { if (u < 1.2) blob(c, '#6a3a24', () => c.roundRect(x2 - 50, y2, 100, 80, 10), { sh: 10 }); } });
      juniorLift(S, { x: 300, face: -1, E: { eye: u > 5.5 ? 'wide' : 'open', lid: .3, mouth: u > 5.5 ? 'scream' : 'flat', open: .2 } }); },
    front(c, u, D, t) { receipt(c, -150, -950, back(seg(u, D - 2.8, D - 2.5)), t); },
    cam: (u, D) => u < D - 2.8 ? [lerp(-500, 60, seg(u, 0, 1.2)), -560, 1.15] : [-150, -900, lerp(1.4, 2.6, eo(seg(u, D - 2.4, D - 1.4)))],
    sfx: [[.2, 'paws', -8], [.6, 'paws', -8], [(D) => D - 2.8, 'unroll', -6], [(D) => D - 1.4, 'zoom_in', -6]] },
  { name: 'despenca', scene: 'liftInside', dur: 2.2, fill: true, tr: 'whip', mood: 'alarm',
    set: (u, D) => ({ lit: 'INFERNO', floor: ['9', '7', '3', '-6', '-66', '-666'][Math.min(5, Math.floor(u * 3))], red: u > .6 ? 1 : 0 }),
    cast(u, D, S, t) { const fl = u > .6 ? 1 : 0;
      juniorLift(S, { x: -250, y: -600 * fl * eo(seg(u, .6, 1.2)) + Math.sin(u * 3) * 40 * fl, rot: .4 * Math.sin(u * 2) * fl, aB: 2.8, aF: 2.9, legs: fl ? [.6, 1, -.4, 1.2] : null, E: { eye: 'wide', mouth: 'scream', open: .5 } });
      show(S.car, { x: 200, cos: 'suit', face: -1, y: -500 * fl * eo(seg(u, .6, 1.3)) + Math.cos(u * 2.5) * 40 * fl, rot: -.3 * Math.sin(u * 1.7) * fl, aB: 2.4, aF: 1.2, bF: .4, E: { lid: .6, mouth: 'flat' }, hold: (c, x, y) => blob(c, '#ffe23a', () => c.roundRect(x - 30, y - 20, 60, 40, 8), { line: 4 }) }); },
    front(c, u, D, t) { if (u < .7) word(c, 'TEC!', 0, -1550, 120, back(seg(u, .3, .45)), '#fff'); },
    cam: (u, D) => [0, -900, .9],
    shake: u => u > .6 ? 18 : 0,
    ui(c, u, D, t) { speedLines(c, 540, 900, u > .7 ? .7 : 0, t, 'rgba(255,255,255,.5)'); },
    sfx: [[.3, 'snap', 0], [.6, 'fall', -2], [.7, 'alarm', -8], [.9, 'scream_crowd', -12]] },
  b23('out'),
];

// ———————————————————— EPISÓDIO 3 · O CACHORRO ADVOGADO ————————————————————
const judge = (S, o = {}) => show(S.car, Object.assign({ x: 0, y: -940, face: 1, s: .9, cos: 'judge', aB: .3, aF: .6, bF: .8, E: { lid: .6, mouth: 'flat' } }, o));
const reu = (S, o = {}) => show(S.jun, Object.assign({ x: -520, face: 1, aB: .1, aF: .1, E: { lid: .55, mouth: 'flat', look: [1, -.6] } }, o));
const gavelHand = (u, hits) => { let k = 0; for (const h of hits) if (u > h - .15 && u < h + .2) k = 1 - Math.abs(u - h) / .2; return k; };
export const EP3 = [
  b23('in'),
  { name: 'todos de pé', scene: 'court', line: 'K15', lead: .3, tail: .6, tr: 'cut', mood: 'court',
    cast(u, D, S, t) { judge(S, { aF: 2.6, bF: .1, E: { lid: .5, mouth: 'flat' } }); reu(S, { x: 140, lean: 1.1, legs: [1.4, 1.5, 1.2, 1.4], aB: 1.4, aF: 1.4, E: { eye: 'spiral', mouth: 'wobble' } }); },
    front(c, u, D, t) { heads(c, t, 0, 320 - 60 * eo(seg(u, .3, .7))); },
    cam: (u, D) => [0, -700, .7], sfx: [[.4, 'crowd_gasp', -10]] },
  { name: 'silêncio', scene: 'court', line: 'K5', lead: .6, tail: .4, tr: 'cut', mood: 'court',
    cast(u, D, S, t) { const g = gavelHand(u, [.3, .5]); judge(S, { aF: 2.4 - 1.2 * g, bF: .6, E: { lid: .5, brow: -1, mouth: 'flat' }, hold: (c, x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); blob(c, '#7a4a2a', () => c.rect(-8, -10, 16, 90)); blob(c, '#5a3420', () => c.roundRect(-40, 70, 80, 40, 10)); c.restore(); } }); },
    cam: (u, D) => [0, -1320, lerp(1.3, 1.45, u / D)],
    sfx: [[.3, 'gavel', 0], [.5, 'gavel', 0]] },
  { name: 'acusação', scene: 'court', lines: [['K6', .3], ['J14', '+.3']], tail: .4, tr: 'cut', mood: 'court',
    cast(u, D, S, t) { judge(S, { aF: 1.6, bF: 0 }); reu(S, { aF: u > 3.9 ? 1.4 : .1, E: { eye: u > 3.9 ? 'angry' : 'open', lid: .5, mouth: 'flat', brow: -1 } }); },
    back(c, u, D, t) { blob(c, '#5a3420', () => c.rect(-720, -330, 400, 330), { sh: 12 }); word(c, 'RÉU', -520, -200, 48, 1, '#ffe23a', 0); },
    cam: (u, D) => u < 3.8 ? [-200, -900, .85] : [-500, -560, 1.8] },
  { name: 'lixo', scene: 'court', lines: [['K7', .3], ['J15', '+.4'], ['K8', '+.4']], tail: .9, tr: 'cut', mood: 'court',
    cast(u, D, S, t) { judge(S, { aF: 1.6, bF: 0, E: { lid: .6, mouth: 'flat', brow: u > 5.3 ? -1 : 0 } }); reu(S, { aF: 1.4, E: { lid: 0, eye: 'wide', mouth: 'o', open: .3 } }); },
    back(c, u, D, t) { blob(c, '#5a3420', () => c.rect(-720, -330, 400, 330), { sh: 12 }); },
    front(c, u, D, t) { holo(c, 300, -560, 520, 420, back(seg(u, .6, .9)) * (1 - seg(u, 3.6, 3.9)), t, c => { c.fillStyle = '#1a2a4a'; c.fillRect(-300, -250, 600, 500); c.save(); c.translate(-60, 200); c.scale(.4, .4); drawP(c, 'jun', { face: 1, aF: 1.0, walk: .5, ph: t * 6, E: { lid: .6 }, hold: (c2, x, y) => blob(c2, '#2a2a2a', () => c2.ellipse(x + 30, y + 60, 60, 80, 0, 0, TAU)) }, t); c.restore(); word(c, '22:01', 160, -170, 60, 1, '#ff3a2a', 0); });
      if (u > D - 1.4) { word(c, 'HEDIONDO', 0, -1500, 100, back(seg(u, D - 1.4, D - 1.2)), '#ff3a2a', 0); } },
    ui(c, u, D, t) {},
    cam: (u, D) => u < 3.6 ? [0, -760, .9] : u < D - 1.6 ? [-500, -560, 1.9] : [0, -1250, 1.0],
    sfx: [[.6, 'holo', -6], [(D) => D - 1.4, 'crowd_gasp', -2]] },
  { name: 'cleide câmeras', scene: 'court', lines: [['C3', .9], ['K9', '+.5'], ['C4', '+.4']], tail: 1.2, tr: 'whip', mood: 'gossip',
    cast(u, D, S, t) { const open = eo(seg(u, 1.2, 1.7)); show(S.cle, { x: 420, face: -1, aB: lerp(.3, 1.8, open), aF: lerp(.3, 1.8, open), bB: -.2, bF: -.2, E: { eye: 'open', brow: -.3, mouth: 'grin', open: .1 }, hold: (c, x, y, a) => { if (u > D - 2.4) phone(c, x, y, a, t, 0); } });
      judge(S, { E: { lid: .4, mouth: 'flat', look: [1, .3] } }); },
    back(c, u, D, t) { blob(c, '#5a3420', () => c.rect(250, -330, 340, 330), { sh: 12 }); word(c, 'TESTEMUNHA', 420, -200, 36, 1, '#ffe23a', 0); },
    front(c, u, D, t) { if (u > 1.2) { const R = mulberry(47), n = Math.min(47, Math.floor(seg(u, 1.2, 2.6) * 47)); for (let i = 0; i < n; i++) camIcon(c, 420 + (R() - .5) * 380, -620 + (R() - .5) * 420, .8); word(c, '47', 650, -900, 80, back(seg(u, 2.5, 2.7)), '#ffe23a', .1); }
      if (u > D - 2.4) { holo(c, 380, -1050, 380, 300, back(seg(u, D - 2.3, D - 2.0)), t, c => { c.fillStyle = '#e8f8e0'; c.fillRect(-200, -160, 400, 320); c.fillStyle = '#25d366'; c.fillRect(-200, -160, 400, 60); word(c, 'Condomínio 😡', 0, -130, 30, 1, '#fff', 0, 'Fredoka'); for (let i = 0; i < 4; i++) blob(c, '#fff', () => c.roundRect(-170 + (i % 2) * 60, -80 + i * 55, 280, 42, 10), { line: 3 }); blob(c, '#ff2a2a', () => c.arc(160, -130, 30, 0, TAU), { line: 3 }); word(c, '999+', 160, -130, 20, 1, '#fff', 0, 'Fredoka'); }); } },
    cam: (u, D) => u < D - 2.8 ? [lerp(300, 380, u / D), -700, 1.05] : [380, -800, 1.25],
    sfx: [[1.2, 'camera', -4], [1.4, 'camera', -6], [1.6, 'camera', -6], [1.8, 'camera', -8], [2.0, 'camera', -8], [2.5, 'cash', -8], [(D) => D - 2.3, 'boop', -4]] },
  { name: 'miojo', scene: 'court', lines: [['C6', .3], ['J31', '+.3'], ['C7', '+.3']], tail: .8, tr: 'cut', mood: 'gossip',
    cast(u, D, S, t) { show(S.cle, { x: 420, face: -1, aF: 1.7, bF: .1, aB: .3, E: { eye: 'open', brow: -.6, mouth: 'grin', open: .1 } }); reu(S, { aF: u > 2.6 && u < 4.6 ? 1.6 : .1, E: { eye: u > 2.6 ? 'angry' : 'wide', brow: -1, mouth: 'flat' } }); },
    back(c, u, D, t) { blob(c, '#5a3420', () => c.rect(250, -330, 340, 330), { sh: 12 }); blob(c, '#5a3420', () => c.rect(-720, -330, 400, 330), { sh: 12 }); },
    front(c, u, D, t) { if (u < 2.5) { holo(c, 0, -1050, 360, 300, back(seg(u, .5, .8)), t, c => { c.fillStyle = '#1a1a3a'; c.fillRect(-200, -160, 400, 320); blob(c, '#f2d06a', () => c.roundRect(-110, -50, 220, 120, 16)); c.strokeStyle = '#c89a3a'; c.lineWidth = 4; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-90, -40 + i * 13); for (let k = 0; k < 10; k++) c.lineTo(-90 + k * 20, -40 + i * 13 + (k % 2 ? 6 : -6)); c.stroke(); } word(c, '03:47', 0, -120, 36, 1, '#ff3a2a', 0); }); heads(c, t, seg(u, 1.6, 1.8), 340); } },
    cam: (u, D) => u < 2.5 ? [0, -760, .85] : u < 4.6 ? [-500, -560, 1.8] : [420, -520, 1.7], sfx: [[.5, 'holo', -6], [1.6, 'crowd_gasp', -4]] },
  { name: 'testemunha surpresa', scene: 'court', lines: [['V8', 1.6], ['J16', '+.4']], tail: .8, tr: 'cut', mood: 'shock',
    cast(u, D, S, t) { const x = lerp(1300, 300, eo(seg(u, 0, 1.2))); show(S.vaso, { x, face: -1, s: .9, E: { eye: 'angry', brow: -1, mouth: 'flat', red: 1 } }); reu(S, { aF: u > 5.4 ? 2.6 : .1, aB: u > 5.4 ? 2.6 : .1, E: { eye: u > 5.4 ? 'angry' : 'wide', mouth: 'flat', brow: -1 } }); },
    front(c, u, D, t, S) { blob(c, '#6a6e78', () => c.rect(S.vaso.x - 180, -10, 360, 30), { line: 5 }); for (const s of [-1, 1]) blob(c, '#2a2a30', () => c.arc(S.vaso.x + s * 140, 25, 22, 0, TAU)); heads(c, t, u < 1.6 ? seg(u, 1.1, 1.3) : 0, 260); },
    cam: (u, D) => u < 5.3 ? [lerp(400, 0, seg(u, 0, 1.4)), -620, .95] : [-500, -560, 1.8],
    sfx: [[0, 'squelch', -8], [1.1, 'crowd_gasp', 0], [1.2, 'sting_short', -4]] },
  { name: 'desafinado', scene: 'court', lines: [['V12', .3], ['J32', '+.4']], tail: .6, tr: 'cut', mood: 'burn',
    cast(u, D, S, t) { show(S.vaso, { x: 300, face: -1, s: .9, E: { eye: 'open', lid: .5, brow: -.5, mouth: 'smile', curl: .6, smirk: 1 } }); reu(S, { aF: 2.7, aB: 2.7, bF: 1.8, bB: 1.8, E: { eye: 'closed', brow: 1, mouth: 'frown' } }); },
    front(c, u, D, t) { if (u < 2.2) for (let i = 0; i < 3; i++) word(c, '♪', -300 + i * 160, -900 - ((u * 150 + i * 70) % 300), 70, 1, '#9fd8ff', Math.sin(u * 7 + i) * .5, 'Fredoka'); },
    cam: (u, D) => u < 2.2 ? [300, -500, 1.6] : [-500, -580, 1.9] },
  { name: 'ao vivo', scene: 'court', line: 'O6', lead: .5, tail: .8, tr: 'whip', mood: 'chaos',
    cast(u, D, S, t) { show(S.osv, { x: 520, face: -1, aF: 2.6, bF: .2, aB: .3, E: { lid: .1, brow: .3, mouth: 'grin', stache: .5 }, hold: (c, x, y, a) => { c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2); blob(c, '#3a3a40', () => c.rect(-6, 0, 12, 260)); c.restore(); phone(c, x + Math.cos(a) * 250, y + Math.sin(a) * 250, a, t, 0); } }); },
    front(c, u, D, t) { blob(c, '#ff2a2a', () => c.roundRect(150, -1500, 220, 80, 20), { line: 5 }); word(c, '● AO VIVO', 260, -1460, 40, 1, '#fff', 0);
      const n = Math.floor(seg(u, 2.4, D) * 1200); word(c, `😡 ${n}`, 260, -1340, 64, n > 0 ? 1 : 0, '#ffe23a', 0, 'Fredoka');
      for (let i = 0; i < 14; i++) { const k = ((u * .7 + i / 14) % 1); if (u > 2.4) word(c, '😡', 100 + (i * 73) % 400, -400 - k * 1200, 60, 1, '#fff', Math.sin(i) * .3, 'Fredoka'); } },
    cam: (u, D) => [lerp(380, 300, u / D), -900, .95],
    sfx: [[.1, 'whoosh', -6], [2.4, 'pop', -6], [3.0, 'pop', -6], [3.6, 'pop', -6], [4.2, 'pop', -6]] },
  { name: 'alta definição', scene: 'court', line: 'O8', lead: .3, tail: .7, tr: 'cut', mood: 'chaos',
    cast(u, D, S, t) { show(S.osv, { x: 380, face: -1, aF: 2.4, bF: .2, aB: .3, E: { lid: .1, mouth: 'grin', stache: .6 }, hold: (c, x, y, a) => phone(c, x, y, a, t, u > 2.8 && u < 3.1 ? 1 : 0) }); reu(S, { E: { lid: .7, mouth: 'flat', look: [1, 0] } }); },
    back(c, u, D, t) { blob(c, '#5a3420', () => c.rect(-720, -330, 400, 330), { sh: 12 }); },
    cam: (u, D) => [-60, -600, 1.0], sfx: [[2.8, 'camera', -2]] },
  { name: 'defesa', scene: 'court', lines: [['K16', .3], ['J33', '+.3'], ['K17', '+.3'], ['J34', '+.6']], tail: .9, tr: 'cut', mood: 'court',
    cast(u, D, S, t) { judge(S, { aF: 1.4, bF: .1, E: { lid: .6, mouth: 'flat', look: [-1, .5] } }); reu(S, { aF: u > 2.6 && u < 4 ? 1.8 : .1, E: { eye: u > 4.4 ? 'open' : 'wide', lid: u > 4.4 ? .75 : 0, mouth: 'flat', look: u > 5.4 ? [-.3, .2] : [1, -.6] } }); },
    back(c, u, D, t) { blob(c, '#5a3420', () => c.rect(-720, -330, 400, 330), { sh: 12 }); },
    cam: (u, D) => u < 2.4 ? [0, -1250, 1.2] : u < 5.4 ? [-250, -800, .9] : [-510, -560, 2.4], sfx: [[(D) => D - .8, 'cricket', -12]] },
  { name: 'sentença', scene: 'court', lines: [['K10', .6], ['J17', '+.5']], tail: .8, tr: 'cut', mood: 'shock',
    cast(u, D, S, t) { const g = gavelHand(u, [5.0]); judge(S, { aF: 2.4 - 1.2 * g, bF: .6, E: { lid: .4, brow: -1, mouth: 'flat' }, hold: (c, x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); blob(c, '#7a4a2a', () => c.rect(-8, -10, 16, 90)); blob(c, '#5a3420', () => c.roundRect(-40, 70, 80, 40, 10)); c.restore(); } });
      reu(S, { kneel: 0, sit: 0, aB: 2.6, aF: 2.7, legs: u > 5.4 ? [1.4, 1.5, 1.2, 1.5] : null, E: { eye: 'closed', mouth: 'scream', open: .4, brow: 1 } }); },
    front(c, u, D, t) { if (u > 5) heads(c, t, 1, 300); if (u > 3.2) word(c, '300 ANOS', 0, -1580, 120, back(seg(u, 3.2, 3.4)), '#ff3a2a', 0); },
    cam: (u, D) => u < 5 ? [0, -1120, lerp(1.1, 1.3, u / 5)] : [-500, -600, 1.6],
    shake: u => Math.abs(shake(u, 5.0, 20, .3)),
    sfx: [[5.0, 'gavel', 2], [5.05, 'scream_crowd', -2], [3.2, 'sting_short', -4]] },
  { name: 'martelo quebra o chão', scene: 'court', dur: 2.8, fill: true, tr: 'cut', mood: 'alarm',
    set: (u, D) => ({ crack: eo(seg(u, .4, 1.4)), hole: eo(seg(u, 1.6, 2.6)) }),
    cast(u, D, S, t) { judge(S, { y: lerp(-940, -940, 0), aF: 2.7, bF: .2, E: { eye: 'wide', mouth: 'o', open: .4 } });
      const f = seg(u, D - 1.4, D); reu(S, { x: -150, y: 1800 * ei(f), aB: 2.8, aF: 2.9, legs: f > 0 ? [.6, 1, -.4, 1.2] : null, E: { eye: 'wide', mouth: 'scream', open: .5 } });
      show(S.cle, { x: 400, y: 1800 * ei(seg(u, D - 1.2, D)), face: -1, aB: 2.6, aF: 2.8, E: { eye: 'wide', mouth: 'scream', open: .4 } }); show(S.osv, { x: -500, y: 1800 * ei(seg(u, D - 1.0, D)), face: 1, aB: 2.6, aF: 2.8, E: { eye: 'wide', mouth: 'scream', open: .4, stache: 1 } }); },
    front(c, u, D, t) { if (u < .5) word(c, 'POC!', 0, -1500, 140, back(seg(u, .1, .25)), '#fff'); },
    cam: (u, D) => [0, -700, lerp(.62, .55, u / D)],
    shake: u => u > .4 ? 14 : 0,
    sfx: [[.1, 'gavel', 4], [.4, 'crash', 0], [1.6, 'rumble', 0], [(D) => D - 1.4, 'fall', -2]] },
  b34('out'),
];

// ———————————————————— EPISÓDIO 4 · A INTELIGÊNCIA ARTIFICIAL BURRA ————————————————————
const labCast = (S, b) => { show(S.jun, { x: -300, face: 1, aB: .1, aF: .1, E: { lid: .5, mouth: 'flat', look: [0, -1] } }); show(S.car, { x: 300, face: -1, cos: 'judge', E: { lid: .6, mouth: 'flat', look: [0, -1] } }); show(S.cle, { x: -650, face: 1, E: { look: [0, -1], mouth: 'flat' } }); show(S.osv, { x: 650, face: -1, E: { look: [0, -1], mouth: 'flat' } }); show(S.vaso, { x: 0, s: .8, face: 1, E: { look: [0, -1], mouth: 'flat' } }); };
const iaBack = (o = {}) => (c, u, D, t, S) => ia(c, t, Object.assign({ mouth: S.ia ? S.ia.E.open : 0 }, typeof o === 'function' ? o(u, D) : o));
export const EP4 = [
  b34('in'),
  { name: 'bem-vindos', scene: 'lab', line: 'I1', lead: .4, tail: .5, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); show(S.ia, { vis: 0 }); }, back: iaBack(),
    cam: (u, D) => [0, -1500, lerp(.7, .78, u / D)], sfx: [[0, 'power_up', -8]] },
  { name: 'carregando', scene: 'lab', lines: [['I11', .3], ['J35', '+.6'], ['K18', '+.3'], ['I12', '+.3']], tail: .6, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); show(S.ia, { vis: 0 }); S.jun.E = Object.assign(E0(), { lid: .7, look: [0, -1], mouth: 'flat' }); },
    back: iaBack((u) => ({ text: u > 2.4 && u < 5 ? 'QI: ▓▓▓░░░ 47%' : '', mood: u > 6.2 ? 'error' : 'calm' })),
    cam: (u, D) => u < 5 ? [0, -1400, .8] : u < 6.4 ? [150, -800, .9] : [0, -1500, 1.0], sfx: [[2.4, 'beep', -8], [3.2, 'beep', -8], [4.0, 'beep', -8]] },
  { name: 'controla tudo', scene: 'lab', lines: [['I2', .3], ['J18', '+.4']], tail: .4, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); S.cle.E = Object.assign(E0(), { eye: u > 3 ? 'wide' : 'open', mouth: u > 3 ? 'o' : 'flat', open: .3, look: [0, -1] }); show(S.ia, { vis: 0 }); },
    back: iaBack((u) => ({ text: u > 3.0 && u < 4.6 ? '👵 GRUPO DA FAMÍLIA' : '' })),
    cam: (u, D) => u < 4.6 ? [-200, -1100, .7] : [-300, -560, 1.8] },
  { name: 'erro 404', scene: 'lab', lines: [['I3', .3], ['V9', '+.4']], tail: .7, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); S.vaso.E = Object.assign(E0(), { eye: u > 3.6 ? 'angry' : 'open', brow: -1, mouth: 'flat', red: u > 3.6 }); S.jun.E = Object.assign(E0(), { lid: .7, mouth: 'flat', look: [1, 0] }); show(S.ia, { vis: 0 }); },
    back: iaBack((u) => ({ mood: u < 3.5 ? 'error' : 'calm', text: u < 3.5 ? 'ERRO 404' : '' })),
    cam: (u, D) => u < 3.6 ? [0, -1400, .8] : [0, -500, 1.6],
    sfx: [[.3, 'glitch', -4]] },
  { name: 'análise', scene: 'lab', lines: [['I13', .3], ['O9', '+.2']], tail: .8, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); show(S.ia, { vis: 0 }); S.osv.E = Object.assign(E0(), { eye: u > 5 ? 'wide' : 'open', brow: 1, mouth: u > 5 ? 'scream' : 'flat', open: .3, stache: u > 5 ? 1 : 0 }); },
    back: iaBack((u) => ({ text: u < 1.7 ? 'ANALISANDO...' : u < 2.9 ? 'JUNINHO: 0' : u < 4.2 ? 'CLEIDE: 9000' : 'OSVALDO: 🍞' })),
    cam: (u, D) => u < 5.1 ? [0, -1400, .78] : [650, -560, 1.9], sfx: [[1.7, 'boop', -6], [2.9, 'boop', -6], [4.2, 'boop', -6], [5.1, 'sting_short', -6]] },
  { name: 'histórico cleide', scene: 'lab', lines: [['C8', .3], ['I14', '+.3']], tail: .6, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); show(S.ia, { vis: 0 }); S.cle.E = Object.assign(E0(), { eye: 'wide', brow: 1, mouth: u < 2 ? 'scream' : 'o', open: .3, sweat: 1 }); },
    back: iaBack((u) => ({ text: u > 2.2 ? '☁ ☁ ☁' : '' })),
    cam: (u, D) => u < 2 ? [-650, -500, 1.9] : [0, -1400, .8] },
  { name: 'gerente de banco', scene: 'lab', lines: [['I4', .3], ['K11', '+.5']], tail: .8, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); S.car.E = Object.assign(E0(), { lid: .65, mouth: 'flat', brow: -.3, look: [-.5, 0] }); show(S.ia, { vis: 0 }); },
    back: iaBack((u) => ({ look: .5, text: u > 2.4 && u < 4.5 ? 'GERENTE DE BANCO 99%' : '' })),
    front(c, u, D, t, S) { if (u > 1.2 && u < 4.4) { c.save(); c.globalAlpha = .35; c.fillStyle = '#5af0e0'; c.beginPath(); c.moveTo(0, -1500); c.lineTo(160, -600 + 300 * Math.sin(u * 3)); c.lineTo(440, -600 + 300 * Math.sin(u * 3)); c.fill(); c.restore(); }
      if (u > 2.4) { c.save(); c.translate(310, -390); blob(c, '#5a5a62', () => c.roundRect(-70, -40, 140, 150, 10), { line: 4 }); blob(c, '#3a7ae8', () => { c.moveTo(-10, -40); c.lineTo(10, -40); c.lineTo(16, 70); c.lineTo(0, 90); c.lineTo(-16, 70); c.closePath(); }, { line: 4 }); c.restore(); blob(c, '#151018', () => c.roundRect(260, -480, 150, 26, 8), { line: 3 }); } },
    cam: (u, D) => u < 4.4 ? [150, -900, .85] : [300, -470, 1.7],
    sfx: [[1.2, 'holo', -6], [2.4, 'ding', -6]] },
  { name: 'café', scene: 'lab', lines: [['I5', .3], ['J19', 2.8], ['I6', '+.3']], tail: 1.6, tr: 'cut', mood: 'ai',
    cast(u, D, S) { labCast(S); S.jun.E = Object.assign(E0(), { lid: .65, mouth: 'flat', look: [1, .5] }); S.jun.aF = u > 2.6 ? 1.5 : .1; show(S.ia, { vis: 0 }); },
    back: iaBack(),
    front(c, u, D, t) { const k = eo(seg(u, .6, 2.4)); c.save(); c.translate(0, -420); blob(c, '#d8dce4', () => c.roundRect(-200 * k, -120 * k, 400 * k, 240 * k, 20), { sh: 14 }); if (k > .9) { blob(c, '#2a2a30', () => c.rect(-150, -70, 300, 26), { line: 4 }); blob(c, '#5af0e0', () => c.arc(140, -90, 12, 0, TAU), { line: 3 }); } c.restore();
      if (u > 1.0 && u < 2.4) for (let i = 0; i < 3; i++) { const a = u * 9 + i * 2; blob(c, '#ffe23a', () => c.arc(Math.cos(a) * 240, -420 + Math.sin(a) * 120, 14, 0, TAU), { line: 3 }); }
      if (u > D - 2.0) for (let i = 0; i < 18; i++) { const kk = seg(u, D - 2.0 + i * .05, D - .6 + i * .05), [x, y] = arc(kk, 0, -470, -900 + i * 110, -100, 500); if (kk > 0) boleto(c, x, y, kk * 6 + i, .8); } },
    cam: (u, D) => [0, -600, lerp(1.1, .95, u / D)],
    sfx: [[.6, 'swoosh_up', -6], [1.0, 'typing', -8], [(D) => D - 2.0, 'printer', -2]] },
  { name: 'ex do vaso', scene: 'lab', line: 'V13', lead: .3, tail: .9, tr: 'cut', mood: 'warm',
    cast(u, D, S) { labCast(S); S.vaso.E = Object.assign(E0(), { eye: 'open', lid: .5, sad: 1, mouth: 'frown', look: [0, -1] }); show(S.ia, { vis: 0 }); },
    back: iaBack({ mood: 'happy', text: '♥?' }),
    cam: (u, D) => [0, -500, 1.5], sfx: [[.4, 'sob', -12]] },
  { name: 'coração', scene: 'lab', line: 'O7', lead: .4, tail: 1.2, tr: 'cut', mood: 'warm',
    cast(u, D, S, t) { show(S.osv, { x: 150, face: -1, aB: 1.9, aF: 1.9, bB: .9, bF: .9, lean: .15, E: { eye: 'closed', brow: 1, mouth: 'smile', open: .1, stache: .3, sad: 1 } }); },
    front(c, u, D, t) { c.save(); c.translate(-80, -420); blob(c, '#d8dce4', () => c.roundRect(-200, -120, 400, 240, 20), { sh: 14 }); c.restore(); for (let i = 0; i < 6; i++) { const k = ((u * .6 + i / 6) % 1); boleto(c, -300 + i * 140, -1300 + k * 1300, k * 4 + i, .7); }
      for (const s of [-1, 1]) { c.fillStyle = 'rgba(120,200,255,.9)'; c.beginPath(); c.arc(150 + 45 + s * 30, -560 + ((u * 300) % 200), 12, 0, TAU); c.fill(); }
      if (u > 1) for (let i = 0; i < 3; i++) word(c, '♥', 50 + i * 120, -900 - ((u * 80 + i * 60) % 200), 60, 1, '#ff5a8a', 0, 'Fredoka'); },
    cam: (u, D) => [40, -560, lerp(1.4, 1.5, u / D)],
    sfx: [[.4, 'cash', -8], [1.0, 'harp_up', -6]] },
  { name: 'reinicialização', scene: 'lab', line: 'I7', lead: .3, tail: .4, tr: 'cut', mood: 'alarm',
    cast(u, D, S) { labCast(S); for (const k of ['jun', 'car', 'cle', 'osv', 'vaso']) S[k].E = Object.assign(E0(), { eye: 'wide', mouth: 'o', open: .3, look: [0, -1] }); show(S.ia, { vis: 0 }); },
    back: iaBack({ mood: 'error', text: 'REINICIAR MORADORES? [SIM]' }),
    front(c, u, D, t) { c.fillStyle = `rgba(255,30,30,${.2 + .15 * Math.sin(t * 14)})`; c.fillRect(-3000, -3000, 6000, 6000); },
    cam: (u, D) => [0, -1000, .6],
    sfx: [[0, 'alarm', -6]] },
  { name: 'aluguel barato', scene: 'lab', line: 'J20', lead: .4, tail: 1.0, tr: 'cut', mood: 'pause',
    cast(u, D, S) { show(S.jun, { x: -300, face: 1, aB: .1, aF: .1, E: { lid: .6, mouth: 'flat', look: [-.2, .2] } }); },
    cam: (u, D) => [-290, -560, 2.6] },
  { name: 'tudo some', scene: 'lab', dur: 3, fill: true, tr: 'cut', mood: 'space',
    cast(u, D, S) { labCast(S); const ks = ['jun', 'car', 'cle', 'osv', 'vaso'];
      ks.forEach((k, i) => { const P = S[k], x0 = P.x, run = u > .6 && k !== 'vaso', ph = u * 2.2 + i * 1.3, x = run ? x0 * .4 + Math.sin(ph) * 420 : x0;
        P.x = x; P.face = Math.cos(ph) > 0 ? 1 : -1; P.walk = run ? 1.2 : 0; P.ph = u * 14 + i; P.aB = run ? 2.6 : P.aB; P.aF = run ? 2.8 : P.aF; P.lean = run ? .15 : 0;
        P.E = Object.assign(E0(), { eye: 'wide', mouth: 'scream', open: .4 + .2 * Math.sin(u * 9 + i), look: [Math.sin(u * 2), -.5], sweat: 1 }); });
      S.vaso.shake = 1; show(S.ia, { vis: 0 }); },
    back: iaBack({ mood: 'error', glitch: 1, text: 'REINICIANDO...' }),
    front(c, u, D, t) { word(c, 'SOCORRO!', -400, -1100, 90, back(seg(u, .7, .9)) * (1 - seg(u, 2.4, 2.6)), '#ff8a7a', .1); word(c, 'MINHA MÃE!', 380, -900, 80, back(seg(u, 2.8, 3.0)) * (1 - seg(u, 4.4, 4.6)), '#d79aff', -.1); word(c, 'E O BOLETO?!', 0, -1250, 90, back(seg(u, 5.0, 5.2)) * (1 - seg(u, 6.8, 7)), '#ffb24a', .05); },
    ui(c, u, D, t) { // the set starts to blink out in patches
      const k = seg(u, 0, D) * .0; c.save(); for (let i = 0; i < 8; i++) if (hash(i + Math.floor(t * 8)) > .6) { c.fillStyle = ['#5af0e0', '#ff2e88', '#120a2a'][i % 3]; c.fillRect(hash(i * 3) * 1000, hash(i * 7) * 1800, 54 * (1 + i % 3), 54); } c.restore(); },
    cam: (u, D) => [0, -900, lerp(.58, .66, u / D)],
    sfx: [[0, 'glitch', -6], [.6, 'scream_crowd', -8], [1.2, 'glitch', -6], [3.0, 'glitch', -8], [5.0, 'alarm', -10]] },
  b45('out'),
];

// ———————————————————— EPISÓDIO 5 · A REVOLTA DOS IDIOTAS ————————————————————
const floatCast = (S, u, o = {}) => { const x0 = { jun: -300, car: 300, cle: -650, osv: 650, vaso: 0 };
  for (const k of Object.keys(x0)) show(S[k], Object.assign({ x: x0[k], face: x0[k] < 0 ? 1 : -1, s: k === 'vaso' ? .8 : 1, cos: k === 'car' ? 'judge' : undefined, y: -40 * Math.sin(u * 2 + x0[k]), rot: .12 * Math.sin(u * 1.5 + x0[k]), E: { lid: .4, mouth: 'flat' } }, (o[k] || {}))); };
function platform(c, t) { blob(c, '#9cc8a6', () => { c.moveTo(-900, 20); c.lineTo(900, 20); c.lineTo(700, 220); c.lineTo(400, 420); c.lineTo(0, 330); c.lineTo(-500, 460); c.lineTo(-800, 230); c.closePath(); }, { sh: 30 }); }
function building(c, x, y, s, rot, t) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); blob(c, '#d8d2c4', () => c.rect(-200, -700, 400, 700), { sh: 30 }); for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) blob(c, hash(r * 3 + k + Math.floor(t * 2)) > .5 ? '#ffe9a0' : '#5a6a8a', () => c.rect(-160 + k * 115, -650 + r * 105, 80, 70), { line: 4 }); word(c, 'CONDOMÍNIO', 0, -740, 50, 1, '#ffe23a', 0); c.restore(); }
const KAR = ['♪ Taxa extra todo mês ♪', '♪ Ai, ai, ai, condomínio! ♪', '♪ Ninguém paga, mas todo mundo grita ♪', '♪ Reunião até morrer! ♪'];
export const EP5 = [
  b45('in'),
  { name: 'de mentira', scene: 'space', lines: [['J21', .4], ['K12', '+.4']], tail: .5, tr: 'cut', mood: 'space',
    cast(u, D, S) { floatCast(S, u, { jun: { aB: 1.6, aF: 1.6, bB: 1.2, bF: 1.2, E: { eye: 'wide', mouth: 'o', open: .2, look: [0, 1] } }, car: { E: { lid: .65, mouth: 'flat' } } }); },
    back(c, u, D, t) { platform(c, t); }, front(c, u, D, t) { for (let i = 0; i < 20; i++) { const k = (u * .3 + hash(i)) % 1; c.fillStyle = ['#5af0e0', '#ff2e88', '#ffc928'][i % 3]; c.fillRect(-900 + hash(i * 5) * 1800, -1800 + k * 2400, 40, 40); } },
    cam: (u, D) => u < 2.6 ? [-300, -560, 1.7] : [300, -520, 1.7],
    sfx: [[0, 'power_down', -10]] },
  { name: 'nunca perguntou', scene: 'space', lines: [['J22', .3], ['K13', '+.4']], tail: .9, tr: 'cut', mood: 'dog',
    cast(u, D, S) { floatCast(S, u, { jun: { aF: 1.6, bF: .1, E: { eye: 'angry', brow: -1, mouth: 'flat' } }, car: { E: { lid: .7, mouth: 'flat', look: [-1, 0] } } }); },
    back(c, u, D, t) { platform(c, t); },
    cam: (u, D) => [0, -600, lerp(1.0, 1.1, u / D)] },
  { name: 'controle remoto', scene: 'space', lines: [['C5', .3], ['I8', '+.6']], tail: .4, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { floatCast(S, u, { cle: { aF: 2.0, bF: .2, E: { eye: 'open', brow: -.6, mouth: 'grin', open: .1 }, hold: (c, x, y, a) => { c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2); blob(c, '#2a2a30', () => c.roundRect(-22, -10, 44, 130, 10)); for (let i = 0; i < 4; i++) blob(c, ['#ff2a2a', '#ffe23a', '#5ae0a8', '#5a8ae8'][i], () => c.arc(0, 15 + i * 25, 8, 0, TAU), { line: 2 }); c.restore(); } } }); show(S.ia, { vis: 0 }); },
    back(c, u, D, t, S) { platform(c, t); if (u > 3.2) { c.save(); c.translate(0, 800); c.scale(.55, .55); ia(c, t, { mouth: S.ia.E.open, mood: 'happy', text: 'KARAOKÊ' }); c.restore(); } },
    cam: (u, D) => u < 3.2 ? [-600, -560, 1.6] : [0, -700, .7],
    sfx: [[2.9, 'boop', -2], [3.0, 'power_up', -6]] },
  { name: 'karaokê', scene: 'space', dur: 17, tr: 'flash', mood: 'karaoke',
    cast(u, D, S, t) { const b = u * 112 / 60, sw = Math.sin(b * Math.PI);
      floatCast(S, u, { jun: { aB: 2.6 + .3 * sw, aF: 2.6 - .3 * sw, E: { eye: 'closed', mouth: 'o', open: .3 + .5 * Math.abs(sw) } }, car: { aB: 2.4, aF: 2.6 + .3 * sw, E: { eye: 'closed', mouth: 'o', open: .3 + .5 * Math.abs(sw) } }, cle: { aB: 2.7, aF: 2.7, E: { eye: 'happy', mouth: 'o', open: .4 + .4 * Math.abs(sw) } },
        osv: { x: 380 + Math.cos(u * 3) * 120, rot: Math.sin(u * 3) * .3, aB: 1.6, aF: 1.6, bB: .6, bF: .6, E: { eye: 'happy', mouth: 'grin', open: .3, stache: .5 } }, vaso: { x: 260 + Math.cos(u * 3 + Math.PI) * 120, rot: -Math.sin(u * 3) * .3, E: { eye: 'happy', mouth: 'o', open: .4 + .4 * Math.abs(sw) } } }); },
    back(c, u, D, t) { building(c, -500, -1000, .9, u * .6, t); platform(c, t); c.save(); c.translate(0, -1700); c.rotate(t); blob(c, '#d8dce4', () => c.arc(0, 0, 90, 0, TAU), { sh: 20 }); c.restore(); },
    ui(c, u, D, t) { const i = Math.min(3, Math.floor(u / (D / 4))), lu = (u % (D / 4)) / (D / 4);
      c.fillStyle = 'rgba(18,10,42,.75)'; c.fillRect(0, 1180, 1080, 150); c.font = '700 54px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; const s = KAR[i], w = c.measureText(s).width;
      c.fillStyle = '#fff'; c.fillText(s, 540, 1255); c.save(); c.beginPath(); c.rect(540 - w / 2, 1180, w * lu, 150); c.clip(); c.fillStyle = '#ffc928'; c.fillText(s, 540, 1255); c.restore();
      const bx = 540 - w / 2 + w * lu, by = 1185 - Math.abs(Math.sin(lu * Math.PI * 8)) * 50; blob(c, '#ff2e88', () => c.arc(bx, by, 16, 0, TAU), { line: 4 }); },
    cam: (u, D) => [Math.sin(u * .5) * 150, -800, lerp(.75, .85, Math.sin(u))],
    sfx: [] },
  { name: 'tão vivo', scene: 'space', lines: [['O10', .3], ['C9', '+.4'], ['V14', '+.4']], tail: .6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { floatCast(S, u, { osv: { x: 380, aB: 2.6, aF: 2.6, E: { eye: 'happy', mouth: 'grin', open: .2, stache: .6, tears: .6 } }, cle: { aF: 2.4, bF: .2, E: { mouth: 'grin' }, hold: (c, x, y, a) => phone(c, x, y, a, t, 0) }, vaso: { E: { lid: .5, sad: 1, mouth: 'frown' } } }); },
    back(c, u, D, t) { platform(c, t); },
    cam: (u, D) => u < 3.9 ? [500, -560, 1.5] : u < 6 ? [-650, -500, 1.7] : [0, -480, 1.6] },
  { name: 'botão', scene: 'space', lines: [['J23', .9], ['I9', '+.4'], ['K19', '+.3'], ['J36', '+.3'], ['J24', '+.4'], ['I10', '+.3'], ['J25', '+.5']], tail: .3, tr: 'cut', mood: 'ominous',
    cast(u, D, S, t) { show(S.jun, { x: -200, face: 1, aB: .2, aF: u > D - 2.4 ? 2.0 : .9, bF: .2, E: { eye: u > D - 2.4 ? 'angry' : 'wide', brow: u > D - 2.4 ? -1 : .5, mouth: 'flat', look: [1, .3] } }); show(S.car, { x: -560, face: 1, cos: 'judge', E: { lid: .6, mouth: 'flat' } }); show(S.ia, { vis: 0 }); },
    back(c, u, D, t, S) { platform(c, t); c.save(); c.translate(300, -1200); c.scale(.45, .45); ia(c, t, { mouth: S.ia.E.open, mood: 'calm' }); c.restore(); button(c, 200, -260, 0, t); },
    cam: (u, D) => u < 3 ? [0, -600, 1.0] : [lerp(0, 0, 0), -700, lerp(1.0, 1.3, seg(u, 3, D))],
    sfx: [[.7, 'sting_short', -6], [(D) => D - .3, 'heartbeat', -4]] },
  { name: 'aperta', scene: 'space', dur: 1.8, tr: 'cut', mood: 'pause',
    cast(u, D, S, t) { show(S.jun, { x: -200, face: 1, aB: .2, aF: lerp(2.4, 1.2, eo(seg(u, 0, .3))), bF: .2, lean: .2, E: { eye: 'closed', brow: -1, mouth: 'grin' } }); },
    back(c, u, D, t) { platform(c, t); button(c, 200, -260, eo(seg(u, .2, .35)), t); },
    cam: (u, D) => [100, -400, 1.8],
    ui(c, u) { if (u > .4) { c.fillStyle = '#fff'; c.fillRect(0, 0, 1080, 1920); } },
    sfx: [[.3, 'click', 0]] },
  { name: 'silêncio absoluto', scene: 'space', dur: 2.0, tr: 'cut', mood: 'pause',
    ui(c, u) { c.fillStyle = '#fff'; c.fillRect(0, 0, 1080, 1920); c.fillStyle = `rgba(0,0,0,${seg(u, .6, 2)})`; c.fillRect(0, 0, 1080, 1920); },
    cam: () => [0, 0, 1] },
  { name: 'escritório', scene: 'office', lines: [['J37', 2.4]], dur: 4, fill: true, tr: 'cut', mood: 'normal',
    cast(u, D, S, t) { const wake = seg(u, .8, 1.4), pinch = u > 4.2 && u < 5.0, relax = seg(u, 5.6, 6.4), freeze = u > D - 2.4;
      show(S.jun, { x: -120, face: 1, sit: 1, lean: lerp(.9, 0, eo(wake)) - .25 * relax * (freeze ? 0 : 1), aB: relax > 0 && !freeze ? 2.6 : .9, bB: relax > 0 && !freeze ? 1.8 : 1.2, aF: pinch ? 2.2 : relax > 0 && !freeze ? 2.6 : lerp(1.6, .9, wake), bF: pinch ? 1.4 : relax > 0 && !freeze ? 1.8 : 1.2,
        E: { eye: u < .8 ? 'closed' : freeze ? 'wide' : pinch ? 'x' : relax > .5 ? 'happy' : 'open', lid: .5, look: freeze ? [1, -.3] : u > 1.6 ? [Math.sin(u * 2), -.2] : [0, 0], mouth: freeze ? 'flat' : pinch ? 'o' : relax > .5 ? 'smile' : 'flat', open: pinch ? .3 : 0, curl: relax } }); },
    front(c, u, D, t) { if (u < .8) word(c, 'zzz', 60, -760, 60, 1, '#a89870', 0); if (u > 4.2 && u < 5.2) word(c, 'AI!', 120, -820, 80, back(seg(u, 4.2, 4.35)), '#ff8a7a');
      if (u > D - 2.4) { c.save(); c.translate(0, -580); blob(c, '#25d366', () => c.roundRect(-150, -100, 300, 110, 14), { line: 5 }); word(c, 'Grupo do Condomínio', 0, -70, 26, 1, '#fff', 0, 'Fredoka'); word(c, '999+ mensagens', 0, -30, 26, 1, '#fff', 0, 'Fredoka'); c.restore(); } },
    cam: (u, D) => [0, -560, lerp(1.2, 1.25, u / D)],
    sfx: [[.8, 'snort', -4], [1.2, 'typing', -14], [4.2, 'slap', -2], [5.8, 'sigh', -4], [(D) => D - 2.4, 'ding', -2], [(D) => D - 2.2, 'sting_short', -6]] },
  { name: 'chefe', scene: 'office', line: 'H1', lead: 1.6, tail: .3, tr: 'cut', mood: 'normal',
    cast(u, D, S, t) { const x = lerp(1200, 450, eo(seg(u, 0, 1.0))); show(S.chefe, { x, face: -1, walk: u < 1 ? .6 : 0, ph: walkPh(x), aF: u > 1.6 ? 1.6 : .2, bF: .2, E: { lid: .15, mouth: 'smile' }, hold: (c, x2, y2) => blob(c, '#f4f4f0', () => c.roundRect(x2 - 25, y2 - 20, 50, 60, 8), { line: 4 }) });
      show(S.jun, { x: -120, face: 1, sit: 1, aB: .9, aF: .9, bF: 1.2, bB: 1.2, E: { lid: .5, look: [1, 0], mouth: 'flat' } }); },
    cam: (u, D) => [lerp(300, 150, u / D), -600, 1.0],
    sfx: [[0, 'door_slam', -10], [.2, 'tiptoe', -10], [.6, 'tiptoe', -10]] },
  { name: 'vai tomar', scene: 'office', line: 'J26', lead: .5, tail: -.02, tr: 'cut', mood: 'pause',
    cast(u, D, S, t) { show(S.jun, { x: -120, face: 1, sit: 1, aB: .9, aF: .9, bF: 1.2, bB: 1.2, E: { lid: .65, look: [-.2, .2], mouth: 'flat' } }); },
    cam: (u, D) => [-110, -640, lerp(2.3, 2.5, u / D)] },
  { name: 'segunda temporada', scene: 'office', dur: 4.0, tr: 'cut', mood: 'end',
    ui(c, u, D, t) { c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1920); if (u > .8) { word(c, 'SEGUNDA', 540, 820, 130, back(seg(u, .8, 1.1)), '#ffc928', -.06); word(c, 'TEMPORADA?', 540, 980, 130, back(seg(u, 1.0, 1.3)), '#ff2e88', -.06); } },
    cam: () => [0, 0, 1], sfx: [[.8, 'sting_short', -2]] },
];

// —— the cover that opens every episode (also exported as the thumbnail) ——
const EPN = { 1: 'O Vaso Possuído', 2: 'O Elevador do Inferno', 3: 'O Cachorro Advogado', 4: 'A Inteligência Artificial Burra', 5: 'A Revolta dos Idiotas' };
export function cover(ep) {
  return { name: 'capa', scene: 'lobby', dur: 1.3, mood: 'title',
    cast(u, D, S, t) {
      const judgeCos = ep >= 3 ? 'judge' : ep === 2 ? 'suit' : undefined;
      show(S.cle, { x: -400, y: 40, face: 1, s: .95, aB: .3, aF: 2.0, bF: .2, E: { eye: 'wide', brow: -.6, mouth: 'grin', open: .1 }, hold: (c, x, y, a) => phone(c, x, y, a, t, 0) });
      show(S.osv, { x: 400, y: 40, face: -1, s: .95, aB: .3, aF: ep === 4 ? 2.6 : .4, bF: .2, E: { lid: .1, brow: -.8, mouth: ep === 4 ? 'grin' : 'flat', stache: .6 } });
      show(S.jun, { x: -40, y: 120, s: 1.1, face: 1, aB: .2, aF: 2.6, bF: .2, E: { eye: ep === 5 ? 'angry' : 'open', lid: ep === 5 ? 0 : .6, mouth: 'flat', look: [-.2, .2], brow: ep === 5 ? -1 : 0 }, hold: (c, x, y, a) => plunger(c, x, y, a, t) });
      show(S.car, { x: 330, y: 170, face: -1, s: .8, cos: judgeCos, E: { lid: .65, mouth: 'flat' } });
      show(S.vaso, { x: -330, y: 170, face: 1, s: .62, E: { eye: ep === 1 ? 'angry' : 'open', brow: -1, mouth: 'grin', red: ep === 1 } });
      if (ep === 2) show(S.dem, { x: 0, y: -260, s: .7, face: 1, aB: 2.4, aF: 2.6, E: { lid: .3, mouth: 'grin', open: .2 } });
      S.order = ['dem', 'cle', 'osv', 'jun', 'car', 'vaso'];
    },
    back(c, u, D, t) {
      c.save(); c.translate(0, -700); for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#2a0f5c' : '#ff2e88'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 4000, i / 24 * TAU + t * .2, (i + 1) / 24 * TAU + t * .2); c.fill(); } c.restore();
      if (ep === 4) { c.save(); c.translate(0, 180); c.scale(.55, .55); ia(c, t, { mood: 'calm', text: '' }); c.restore(); }
      if (ep === 5) { c.save(); c.translate(0, -300); c.scale(1.3, 1.3); button(c, 0, 0, 0, t); c.restore(); }
    },
    cam: (u, D) => [0, -430, lerp(1.04, 1.07, u / D)],
    ui(c, u, D, t) {
      c.save(); c.translate(540, 300); c.rotate(-.05); c.fillStyle = '#ffc928'; c.strokeStyle = INK; c.lineWidth = 10; c.beginPath(); c.roundRect(-480, -150, 960, 300, 40); c.fill(); c.stroke();
      word(c, 'O CONDOMÍNIO', 0, -62, 104, 1, '#fff', 0); word(c, 'DOS DESGRAÇADOS', 0, 62, 104, 1, '#ff2e88', 0); c.restore();
      c.save(); c.translate(540, 530); c.rotate(.04); c.fillStyle = '#1fd1d1'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.roundRect(-220, -56, 440, 112, 56); c.fill(); c.stroke(); word(c, `EPISÓDIO ${ep}`, 0, 4, 72, 1, '#fff', 0); c.restore();
      c.save(); c.translate(540, 1690); c.fillStyle = 'rgba(30,14,40,.85)'; c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.roundRect(-440, -60, 880, 120, 60); c.fill(); c.stroke();
      c.font = '700 60px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(EPN[ep], 0, 4); c.restore();
    },
    sfx: [[0, 'sting_short', -2]] };
}
for (const [ep, E] of [[2, EP2], [3, EP3], [4, EP4], [5, EP5]]) E.unshift(cover(ep));
