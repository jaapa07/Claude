// The cast. Canvas units: y down, feet at (0,0), facing right (the caller flips for facing left).
import { TAU, clamp, lerp } from './lib.js';
import { INK, blob, ink, lw, noodle, hand, eyes, mouth, brows, sweat, shade, word } from './toon.js';

export function pose(o = {}) {
  return Object.assign({ x: 0, y: 0, s: 1, face: 1, rot: 0, sq: 1, lean: 0, vis: 1,
    aB: .15, bB: .25, aF: .15, bF: .25, walk: 0, ph: 0, legs: null, sit: 0, fall: 0,
    E: { eye: 'open', lid: 0, look: [0, 0], pupil: 1, brow: 0, browY: 0, open: 0, mouth: 'flat', curl: 0, sweat: 0, shake: 0 } }, o);
}
function base(c, P) {
  c.translate(P.x, P.y); c.scale(P.s * P.face, P.s); c.rotate(P.rot);
  const sq = P.sq; c.scale(1 / Math.sqrt(sq), sq);
  if (P.lean) { c.translate(0, -260); c.rotate(P.lean); c.translate(0, 260); }
  if (P.sit) c.translate(0, 120 * P.sit);
}
function legs2(c, P, hipY, len, w, col, foot) {
  for (const s of [1, -1]) {
    let th = P.walk * .55 * Math.sin(P.ph + (s > 0 ? Math.PI : 0)), kn = Math.max(0, P.walk * .9 * Math.sin(P.ph + (s > 0 ? Math.PI : 0) + 1.4));
    if (P.sit) { th = lerp(th, 1.5, P.sit); kn = lerp(kn, -1.5, P.sit); }
    if (P.legs) { th = P.legs[s > 0 ? 0 : 2]; kn = P.legs[s > 0 ? 1 : 3]; }
    const [fx, fy, fa] = noodle(c, s * 16, hipY, th, -kn, len, w, s > 0 ? shade(col, .85) : col);
    foot(c, fx, fy, s, th - kn);
  }
}
const headSpin = (c, P) => { if (P.head) c.rotate(P.head); };

// —— JUNINHO: skinny janitor, messy hair, blue uniform, flip-flops, the face of a man who gave up ——
export function juninho(c, P, t = 0) {
  const skin = '#e8b48a', shirt = '#3b6fc4', pants = '#26386e', E = P.E; c.save(); base(c, P);
  legs2(c, P, -250, 250, 36, pants, (c, x, y, s) => {
    blob(c, '#2d8a5a', () => c.ellipse(x + 14, y + 6, 44, 11, 0, 0, TAU), { line: 5 });            // chinelo sole
    blob(c, skin, () => c.ellipse(x + 14, y - 6, 36, 13, 0, 0, TAU), { line: 5 });
    c.beginPath(); c.moveTo(x - 6, y - 4); c.lineTo(x + 22, y - 14); c.lineTo(x + 30, y - 2); c.lineWidth = lw(c, 6); c.strokeStyle = '#e0e0e0'; c.stroke();
  });
  noodle(c, -42, -430, P.aB, P.bB, 240, 28, shade(shirt, .85));
  const hb = armHand(P, 'B', -42, -430, 240); hand(c, hb[0], hb[1], 20, shade(skin, .9), hb[2]);
  blob(c, shirt, () => { c.moveTo(-62, -445); c.quadraticCurveTo(-72, -330, -58, -235); c.lineTo(62, -235); c.quadraticCurveTo(72, -330, 62, -445); c.quadraticCurveTo(0, -462, -62, -445); }, { sh: 22 });
  blob(c, '#f4f4f0', () => c.rect(10, -400, 50, 18), { line: 4 }); c.save(); c.translate(35, -391); c.scale(P.face, 1); word(c, 'JUNINHO', 0, 0, 11, 1, INK, 0, 'Fredoka'); c.restore();
  blob(c, pants, () => c.rect(-60, -252, 120, 26), { line: 5 });
  c.beginPath(); c.moveTo(-20, -446); c.lineTo(0, -410); c.lineTo(22, -446); ink(c, 5);
  c.save(); c.translate(6, -540); headSpin(c, P); const R = 82;
  blob(c, skin, () => c.rect(-16, 40, 32, 60), { line: 6 });
  blob(c, skin, () => c.ellipse(0, 0, R * .88, R * 1.05, 0, 0, TAU), { sh: 14 });
  blob(c, skin, () => c.ellipse(-R * .8, R * .1, R * .16, R * .24, 0, 0, TAU));
  // messy hair: irregular tufts, a few sticking out in every direction
  blob(c, '#3a2416', () => { c.moveTo(-R * .9, R * .05); const tuft = [[-1, -.5], [-.95, -1.05], [-.6, -.85], [-.5, -1.35], [-.15, -1.05], [.1, -1.4], [.3, -1.0], [.7, -1.25], [.75, -.85], [1.05, -.95], [.88, -.45], [.6, -.65], [.2, -.55], [-.3, -.7], [-.7, -.45]];
    for (const [x, y] of tuft) c.lineTo(x * R + Math.sin(t * 2 + x * 9) * 2, y * R); c.closePath(); });
  c.fillStyle = 'rgba(58,36,22,.35)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc((Math.sin(i * 7.7) * .4 + .25) * R, (.5 + Math.cos(i * 3.3) * .2) * R, 2.5, 0, TAU); c.fill(); }   // stubble
  eyes(c, R, { lid: .45, bags: 1, ...E }, { t, skin, dx: R * .18, y: -R * .1 });
  brows(c, R, E, { y: -R * .55, dx: R * .18, dx2: R * .18 });
  c.beginPath(); c.moveTo(R * .38, -R * .02); c.quadraticCurveTo(R * .6, R * .22, R * .34, R * .3); ink(c, 6);    // nose
  mouth(c, R * .26, R * .55, R, E);
  sweat(c, -R * .7, -R * .4, 12, E.sweat || 0);
  c.restore();
  const hf = armHand(P, 'F', 42, -430, 240); noodle(c, 42, -430, P.aF, P.bF, 240, 28, shirt); hand(c, hf[0], hf[1], 21, skin, hf[2]);
  if (P.hold) P.hold(c, hf[0], hf[1], hf[2], t);
  c.restore();
}
// hand position from a limb definition (same math as noodle)
export function armHand(P, which, sx, sy, len) {
  const a = which === 'B' ? P.aB : P.aF, b = which === 'B' ? P.bB : P.bF, l1 = len * .5;
  const ex = sx + Math.sin(a) * l1, ey = sy + Math.cos(a) * l1; return [ex + Math.sin(a + b) * l1, ey + Math.cos(a + b) * l1, Math.atan2(Math.cos(a + b), Math.sin(a + b))];
}

// —— SEU OSVALDO: síndico, belly, giant moustache, a social shirt losing the fight ——
export function osvaldo(c, P, t = 0) {
  const skin = '#e9a77d', shirt = '#f3f1ea', pants = '#5d5f6c', E = P.E; c.save(); base(c, P);
  legs2(c, P, -210, 210, 46, pants, (c, x, y) => blob(c, '#20161a', () => c.ellipse(x + 18, y - 4, 42, 18, 0, 0, TAU)));
  noodle(c, -80, -430, P.aB, P.bB, 230, 38, shade(shirt, .85)); const hb = armHand(P, 'B', -80, -430, 230); hand(c, hb[0], hb[1], 24, shade(skin, .9), hb[2]);
  const bel = 1 + .03 * Math.sin(t * 3);
  blob(c, shirt, () => { c.moveTo(-85, -455); c.bezierCurveTo(-150 * bel, -380, -160 * bel, -230, -100, -200); c.lineTo(110, -200); c.bezierCurveTo(175 * bel, -240, 165 * bel, -390, 85, -455); c.quadraticCurveTo(0, -475, -85, -455); }, { sh: 30 });
  // straining buttons with belly showing through the gaps
  for (const [y, g] of [[-410, 0], [-360, 6], [-310, 10], [-262, 7]]) { if (g) blob(c, skin, () => c.ellipse(30, y + 22, 7, g, 0, 0, TAU), { line: 3 }); blob(c, '#d8d0c0', () => c.arc(30, y, 6, 0, TAU), { line: 3 }); }
  c.beginPath(); c.moveTo(30, -455); c.lineTo(30, -205); ink(c, 3);
  blob(c, '#c8282a', () => { c.moveTo(18, -455); c.lineTo(42, -455); c.lineTo(36, -400); c.lineTo(30, -385); c.lineTo(24, -400); c.closePath(); }, { line: 4 });  // a tie far too short
  blob(c, '#3a2418', () => c.rect(-105, -215, 215, 22), { line: 5 }); blob(c, '#d6b04a', () => c.rect(20, -213, 24, 18), { line: 3 });
  c.save(); c.translate(10, -545); headSpin(c, P); const R = 86;
  blob(c, skin, () => c.ellipse(0, 0, R, R * .98, 0, 0, TAU), { sh: 15 });
  blob(c, skin, () => c.ellipse(-R * .9, R * .12, R * .18, R * .26, 0, 0, TAU));
  blob(c, '#8a8a8a', () => { c.moveTo(-R * .98, R * .2); c.quadraticCurveTo(-R * 1.08, -R * .45, -R * .55, -R * .55); c.quadraticCurveTo(-R * .7, -R * .1, -R * .78, R * .25); c.closePath(); });
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-R * .15, -R * .7, R * .3, R * .12, -.3, 0, TAU); c.fill();     // bald shine
  eyes(c, R, { lid: .2, ...E }, { t, skin, dx: R * .16, y: -R * .18, ew: .3, eh: .36 });
  brows(c, R, E, { y: -R * .6, dx: R * .16, dx2: R * .16, wpx: 12, col: '#5a5a5a' });
  blob(c, shade(skin, .92), () => c.ellipse(R * .48, R * .12, R * .22, R * .2, 0, 0, TAU));
  mouth(c, R * .28, R * .62, R, E, { w: .36 });
  // THE moustache: wider than the face, bristles with emotion
  const st = E.stache || 0, wig = Math.sin(t * 20) * st * 6;
  for (const s of [-1, 1]) blob(c, '#3f2c26', () => { c.moveTo(R * .28, R * .32); c.quadraticCurveTo(R * .28 + s * R * .6, R * .2 - st * 30 + wig, R * .28 + s * R * 1.25, R * .45 - st * 50); c.quadraticCurveTo(R * .28 + s * R * .9, R * .62, R * .28, R * .5); c.closePath(); }, { line: 5 });
  sweat(c, -R * .5, -R * .6, 12, E.sweat || 0);
  c.restore();
  noodle(c, 80, -430, P.aF, P.bF, 230, 38, shirt); const hf = armHand(P, 'F', 80, -430, 230); hand(c, hf[0], hf[1], 25, skin, hf[2]);
  if (P.hold) P.hold(c, hf[0], hf[1], hf[2], t);
  c.restore();
}

// —— DONA CLEIDE: purple cloud of hair, giant glasses, floral dress, professional gossip ——
export function cleide(c, P, t = 0) {
  const skin = '#f0c09a', dress = '#f4c64e', E = P.E; c.save(); base(c, P);
  legs2(c, P, -170, 170, 26, skin, (c, x, y) => blob(c, '#8a2a5a', () => c.ellipse(x + 12, y - 4, 30, 14, 0, 0, TAU)));
  noodle(c, -50, -390, P.aB, P.bB, 190, 26, shade(skin, .9)); const hb = armHand(P, 'B', -50, -390, 190); hand(c, hb[0], hb[1], 18, shade(skin, .9), hb[2]);
  blob(c, dress, () => { c.moveTo(-55, -405); c.quadraticCurveTo(-120, -260, -125, -150); c.quadraticCurveTo(0, -130, 130, -150); c.quadraticCurveTo(120, -260, 55, -405); c.quadraticCurveTo(0, -420, -55, -405); }, { sh: 22 });
  c.save(); c.beginPath(); c.moveTo(-55, -405); c.quadraticCurveTo(-120, -260, -125, -150); c.quadraticCurveTo(0, -130, 130, -150); c.quadraticCurveTo(120, -260, 55, -405); c.closePath(); c.clip();
  for (let i = 0; i < 14; i++) { const fx = -100 + (i * 53) % 220, fy = -380 + (i * 37) % 230; c.fillStyle = ['#e8508a', '#4a8ae8', '#fff'][i % 3]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(fx + Math.cos(k * 1.26) * 9, fy + Math.sin(k * 1.26) * 9, 7, 0, TAU); c.fill(); } c.fillStyle = '#ffe23a'; c.beginPath(); c.arc(fx, fy, 5, 0, TAU); c.fill(); }
  c.restore();
  for (let k = 0; k < 9; k++) { const a = Math.PI * (.15 + k * .085); blob(c, '#fffbf0', () => c.arc(Math.cos(a) * 46 + 5, -420 + Math.sin(a) * 30, 7, 0, TAU), { line: 3 }); }   // pearls
  c.save(); c.translate(6, -500); headSpin(c, P); const R = 78;
  // the purple hair cloud (behind)
  blob(c, '#8a4fc8', () => { for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, r = R * (1.08 + .1 * Math.sin(k * 3.1)); c.moveTo(Math.cos(a) * r * 1.05 + R * .32, Math.sin(a) * r - R * .1); c.arc(Math.cos(a) * r * .95, Math.sin(a) * r * .95 - R * .1, R * .32, 0, TAU); } }, { sh: 10 });
  blob(c, skin, () => c.ellipse(0, R * .1, R * .82, R * .92, 0, 0, TAU), { sh: 12 });
  blob(c, '#8a4fc8', () => { c.moveTo(-R * .85, -R * .1); c.quadraticCurveTo(-R * .5, -R * 1.05, R * .3, -R * .85); c.quadraticCurveTo(R * .9, -R * .6, R * .85, -R * .2); c.quadraticCurveTo(R * .3, -R * .55, -R * .85, -R * .1); });
  // giant glasses: magnified eyes
  const gl = R * .42; eyes(c, R, { lid: .1, ...E }, { t, skin, dx: R * .2, y: R * .02, ew: .34, eh: .4 });
  for (const s of [-1, 1]) { c.beginPath(); c.arc(s * R * .36 + R * .2, R * .02, gl, 0, TAU); c.fillStyle = 'rgba(200,230,255,.18)'; c.fill(); ink(c, 9); }
  c.beginPath(); c.moveTo(R * .1, R * .02); c.lineTo(R * .3, R * .02); ink(c, 7);
  brows(c, R, E, { y: -R * .55, dx: R * .2, dx2: R * .2, col: '#6a3a9a' });
  c.beginPath(); c.moveTo(R * .4, R * .38); c.quadraticCurveTo(R * .58, R * .5, R * .38, R * .58); ink(c, 6);
  mouth(c, R * .26, R * .76, R, E, { w: .34 }); c.save(); c.globalAlpha = .9; c.restore();
  if ((E.open || 0) < .06 && E.mouth !== 'scream') { c.beginPath(); c.ellipse(R * .26, R * .76, R * .2, R * .07, 0, 0, TAU); c.fillStyle = '#d0203a'; c.fill(); ink(c, 4); }   // lipstick
  sweat(c, -R * .8, -R * .2, 11, E.sweat || 0);
  c.restore();
  noodle(c, 50, -390, P.aF, P.bF, 190, 26, skin); const hf = armHand(P, 'F', 50, -390, 190); hand(c, hf[0], hf[1], 18, skin, hf[2]);
  if (P.hold) P.hold(c, hf[0], hf[1], hf[2], t);
  c.restore();
}

// —— CARAMELO: yellow mutt on two legs, red collar, the voice of a tired man; costumes: 'suit' | 'judge' ——
export function caramelo(c, P, t = 0) {
  const fur = '#e8b04a', E = P.E, cos = P.cos; c.save(); base(c, P);
  // tail
  c.beginPath(); c.moveTo(-60, -200); c.quadraticCurveTo(-140, -230 + Math.sin(t * 6) * 20 * (P.wag ?? .3), -150, -320); c.lineCap = 'round'; c.lineWidth = 26 + lw(c, 14); c.strokeStyle = INK; c.stroke(); c.lineWidth = 26; c.strokeStyle = fur; c.stroke();
  legs2(c, P, -170, 170, 40, cos === 'suit' || cos === 'judge' ? '#2a2f48' : fur, (c, x, y) => blob(c, fur, () => c.ellipse(x + 16, y - 6, 34, 18, 0, 0, TAU)));
  const top = cos === 'suit' ? '#2a2f48' : cos === 'judge' ? '#151018' : fur;
  noodle(c, -45, -360, P.aB, P.bB, 180, 32, shade(top, .85)); const hb = armHand(P, 'B', -45, -360, 180); blob(c, shade(fur, .9), () => c.ellipse(hb[0], hb[1], 22, 20, 0, 0, TAU));
  blob(c, top, () => { c.moveTo(-60, -380); c.quadraticCurveTo(-100, -260, -80, -160); c.quadraticCurveTo(0, -140, 85, -160); c.quadraticCurveTo(105, -260, 60, -380); c.quadraticCurveTo(0, -400, -60, -380); }, { sh: 22 });
  if (cos !== 'suit' && cos !== 'judge') blob(c, '#f6dca0', () => c.ellipse(15, -260, 45, 70, 0, 0, TAU), { line: 0 });
  if (cos === 'suit') { blob(c, '#fff', () => { c.moveTo(-10, -380); c.lineTo(40, -380); c.lineTo(15, -300); c.closePath(); }, { line: 4 }); blob(c, '#c8282a', () => { c.moveTo(8, -375); c.lineTo(22, -375); c.lineTo(28, -300); c.lineTo(15, -285); c.lineTo(2, -300); c.closePath(); }, { line: 4 }); }
  if (cos === 'judge') { blob(c, '#fff', () => { c.moveTo(-10, -380); c.lineTo(40, -380); c.lineTo(25, -340); c.lineTo(5, -340); c.closePath(); }, { line: 4 }); }
  c.save(); c.translate(10, -440); headSpin(c, P); const R = 80;
  blob(c, '#c8282a', () => c.ellipse(0, 50, 62, 18, 0, 0, TAU), { line: 5 }); blob(c, '#f2d24a', () => c.arc(10, 72, 12, 0, TAU), { line: 4 });   // collar + tag
  if (cos === 'judge') blob(c, '#f4f4f0', () => { for (let k = 0; k < 9; k++) { const a = Math.PI * (.9 + k * .15); c.moveTo(Math.cos(a) * R * 1.05 + R * .3, Math.sin(a) * R * 1.0 - R * .1); c.arc(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.0 - R * .1, R * .3, 0, TAU); } for (const s of [-1, 1]) { c.moveTo(s * R * .9 + R * .25, R * .4); c.arc(s * R * .9, R * .4, R * .25, 0, TAU); c.moveTo(s * R * .9 + R * .25, R * .8); c.arc(s * R * .9, R * .8, R * .25, 0, TAU); } }, { line: 6 });
  blob(c, fur, () => c.ellipse(0, 0, R * .9, R * .82, 0, 0, TAU), { sh: 14 });
  blob(c, '#b4702a', () => { c.moveTo(-R * .55, -R * .6); c.quadraticCurveTo(-R * 1.25, -R * .4, -R * 1.0, R * .55 + Math.sin(t * 3) * 4); c.quadraticCurveTo(-R * .75, R * .2, -R * .45, -R * .35); c.closePath(); });   // droopy ear
  blob(c, '#f6dca0', () => c.ellipse(R * .55, R * .28, R * .58, R * .38, 0, 0, TAU), { sh: 8 });                                                    // snout
  blob(c, '#1e1028', () => c.ellipse(R * 1.02, R * .12, R * .16, R * .12, 0, 0, TAU), { line: 3 });
  eyes(c, R, { lid: .55, bags: 1, ...E }, { t, skin: fur, dx: R * .02, y: -R * .22, ew: .28, eh: .34 });
  brows(c, R, E, { y: -R * .62, dx: 0, wpx: 10, col: '#7a4a1a' });
  mouth(c, R * .55, R * .52, R, E, { w: .34 });
  if (cos === 'suit') { blob(c, '#3a2a20', () => c.rect(-R * .3, -R * .95, 0, 0), { line: 0 }); }
  sweat(c, -R * .4, -R * .6, 11, E.sweat || 0);
  if (E.smoke) { c.save(); c.globalAlpha = .8 * E.smoke; for (let i = 0; i < 4; i++) { const u = (t * 1.3 + i / 4) % 1; blob(c, '#c8c0b8', () => c.arc(-R * .2 + Math.sin(u * 5 + i) * 20, -R * (1 + u * 1.6), 14 + u * 22, 0, TAU), { line: 4 }); } c.restore(); }
  c.restore();
  noodle(c, 45, -360, P.aF, P.bF, 180, 32, top); const hf = armHand(P, 'F', 45, -360, 180); blob(c, fur, () => c.ellipse(hf[0], hf[1], 23, 21, 0, 0, TAU));
  if (P.hold) P.hold(c, hf[0], hf[1], hf[2], t);
  c.restore();
}

// —— VASO 404: a white toilet with eyes on the tank and a mouth in the bowl; the lid is the upper lip ——
export function vaso(c, P, t = 0) {
  const E = P.E, por = '#f4f6fa', sh = '#c8d4e4'; c.save(); base(c, P);
  const shk = (P.shake || 0) * Math.sin(t * 60) * 6; c.translate(shk, 0);
  // tank with the face
  blob(c, por, () => { c.roundRect(-120, -560, 240, 230, 26); }, { sh: 20, shade: sh });
  blob(c, por, () => c.roundRect(-135, -585, 270, 36, 14), { sh: 8, shade: sh });
  blob(c, '#c8ccd4', () => c.roundRect(70, -540, 34, 14, 6), { line: 4 });                                                 // the flush lever
  c.save(); c.translate(0, -365); c.scale(P.face, 1); word(c, '404', 0, 0, 40, 1, '#4a5a7a', 0); c.restore();
  c.save(); c.translate(0, -460); eyes(c, 120, { lid: 0, ...E }, { t, skin: por, ew: .36, eh: .42, y: -10 }); brows(c, 120, E, { y: -90, wpx: 11 }); c.restore();
  // pedestal and bowl
  blob(c, por, () => { c.moveTo(-60, 0); c.quadraticCurveTo(-70, -120, -110, -200); c.lineTo(110, -200); c.quadraticCurveTo(70, -120, 60, 0); c.closePath(); }, { sh: 16, shade: sh });
  blob(c, por, () => c.ellipse(0, -240, 165, 70, 0, 0, TAU), { sh: 18, shade: sh });
  // mouth: the bowl opening; open widens it, the seat ring around it
  const op = clamp(E.open || 0), mh = 18 + op * 70, curl = E.curl ?? (E.mouth === 'grin' ? .8 : E.mouth === 'frown' ? -.8 : 0);
  blob(c, '#e4eaf2', () => c.ellipse(0, -255, 135, 42 + op * 20, 0, 0, TAU), { line: 6 });
  c.beginPath(); c.moveTo(-100, -258 - curl * 10); c.quadraticCurveTo(0, -258 - mh * .5 + curl * 25, 100, -258 - curl * 10); c.quadraticCurveTo(0, -258 + mh + curl * 10, -100, -258 - curl * 10);
  c.fillStyle = '#2a4a7a'; c.fill(); c.save(); c.clip(); c.fillStyle = '#6aa8e8'; c.beginPath(); c.ellipse(0, -240 + mh * .6, 80, 30, 0, 0, TAU); c.fill(); if (E.brown) { c.fillStyle = '#6a3a1a'; c.beginPath(); c.ellipse(0, -240 + mh * .5, 60 * E.brown, 24 * E.brown, 0, 0, TAU); c.fill(); } c.restore(); ink(c, 7);
  // the lid: hinged at the back, flaps like an upper lip when it talks
  const lidA = -.2 - op * .9 - (E.lidUp || 0);
  c.save(); c.translate(0, -300); c.scale(1, Math.cos(lidA) * .9 + .1);
  blob(c, por, () => c.ellipse(0, -10, 150, 40, 0, Math.PI, TAU), { sh: 8, shade: sh }); c.restore();
  if (E.steam) { c.save(); c.globalAlpha = E.steam; for (let i = 0; i < 4; i++) { const u = (t * 1.4 + i / 4) % 1; blob(c, '#ffffff', () => c.arc(Math.sin(i * 2 + u * 4) * 60, -620 - u * 200, 20 + u * 25, 0, TAU), { line: 4 }); } c.restore(); }
  c.restore();
}

// —— DEMÔNIO: red office worker with horns, glasses, tie, spreadsheets ——
export function demonio(c, P, t = 0) {
  const skin = '#d8382c', E = P.E; c.save(); base(c, P);
  c.beginPath(); c.moveTo(-50, -220); c.quadraticCurveTo(-170, -200, -150, -330 + Math.sin(t * 4) * 15); c.lineWidth = 16 + lw(c, 14); c.strokeStyle = INK; c.stroke(); c.lineWidth = 16; c.strokeStyle = skin; c.stroke();
  blob(c, skin, () => { c.moveTo(-150, -330 + Math.sin(t * 4) * 15); c.lineTo(-180, -370); c.lineTo(-125, -350); c.closePath(); });
  legs2(c, P, -220, 220, 40, '#2a2030', (c, x, y) => blob(c, '#151018', () => c.ellipse(x + 16, y - 5, 40, 16, 0, 0, TAU)));
  noodle(c, -55, -430, P.aB, P.bB, 220, 32, '#e8e4dc'); const hb = armHand(P, 'B', -55, -430, 220); hand(c, hb[0], hb[1], 22, shade(skin, .9), hb[2]);
  blob(c, '#f2eee6', () => { c.moveTo(-70, -450); c.quadraticCurveTo(-90, -330, -75, -215); c.lineTo(75, -215); c.quadraticCurveTo(90, -330, 70, -450); c.quadraticCurveTo(0, -465, -70, -450); }, { sh: 22 });
  blob(c, '#151018', () => { c.moveTo(-8, -450); c.lineTo(8, -450); c.lineTo(14, -290); c.lineTo(0, -270); c.lineTo(-14, -290); c.closePath(); }, { line: 4 });
  c.save(); c.translate(6, -540); headSpin(c, P); const R = 80;
  for (const s of [-1, 1]) blob(c, '#f2e8d0', () => { c.moveTo(s * R * .45 - 14, -R * .7); c.quadraticCurveTo(s * R * .9, -R * 1.2, s * R * .75, -R * 1.55); c.quadraticCurveTo(s * R * .55, -R * 1.1, s * R * .45 + 14, -R * .75); c.closePath(); });
  blob(c, skin, () => c.ellipse(0, 0, R * .85, R * 1.0, 0, 0, TAU), { sh: 14 });
  eyes(c, R, { lid: .3, ...E }, { t, skin, dx: R * .15, y: -R * .12, ew: .3, eh: .36 });
  for (const s of [-1, 1]) { c.beginPath(); c.rect(s * R * .3 + R * .15 - R * .3, -R * .35, R * .6, R * .48); ink(c, 6); }
  brows(c, R, E, { y: -R * .58, dx: R * .15, dx2: R * .15, wpx: 11 });
  mouth(c, R * .22, R * .5, R, E, { w: .36 });
  blob(c, '#1e1028', () => { c.moveTo(R * .05, R * .75); c.lineTo(R * .4, R * .75); c.lineTo(R * .22, R * 1.2); c.closePath(); }, { line: 3 });   // goatee
  c.restore();
  noodle(c, 55, -430, P.aF, P.bF, 220, 32, '#f2eee6'); const hf = armHand(P, 'F', 55, -430, 220); hand(c, hf[0], hf[1], 22, skin, hf[2]);
  if (P.hold) P.hold(c, hf[0], hf[1], hf[2], t);
  c.restore();
}

// —— O CHEFE: a suspiciously normal manager ——
export function chefe(c, P, t = 0) {
  const skin = '#e2b08a', suit = '#6a6a70', E = P.E; c.save(); base(c, P);
  legs2(c, P, -230, 230, 40, suit, (c, x, y) => blob(c, '#2a2020', () => c.ellipse(x + 16, y - 5, 40, 16, 0, 0, TAU)));
  noodle(c, -60, -440, P.aB, P.bB, 230, 34, shade(suit, .85)); const hb = armHand(P, 'B', -60, -440, 230); hand(c, hb[0], hb[1], 22, shade(skin, .9), hb[2]);
  blob(c, suit, () => { c.moveTo(-75, -460); c.quadraticCurveTo(-95, -340, -80, -225); c.lineTo(80, -225); c.quadraticCurveTo(95, -340, 75, -460); c.quadraticCurveTo(0, -475, -75, -460); }, { sh: 22 });
  blob(c, '#fff', () => { c.moveTo(-20, -460); c.lineTo(25, -460); c.lineTo(3, -400); c.closePath(); }, { line: 4 });
  c.save(); c.translate(6, -550); const R = 80;
  blob(c, skin, () => c.ellipse(0, 0, R * .88, R * 1.0, 0, 0, TAU), { sh: 14 });
  blob(c, '#6a5040', () => { c.moveTo(-R * .88, 0); c.quadraticCurveTo(-R * .9, -R * .6, -R * .5, -R * .7); c.lineTo(-R * .6, -R * .1); c.closePath(); });
  eyes(c, R, { lid: .15, ...E }, { t, skin, dx: R * .15, y: -R * .12, ew: .3, eh: .36 });
  brows(c, R, E, { y: -R * .58, dx: R * .15, dx2: R * .15 });
  mouth(c, R * .22, R * .5, R, { mouth: 'smile', ...E }, { w: .36 });
  c.restore();
  noodle(c, 60, -440, P.aF, P.bF, 230, 34, suit); const hf = armHand(P, 'F', 60, -440, 230); hand(c, hf[0], hf[1], 22, skin, hf[2]);
  if (P.hold) P.hold(c, hf[0], hf[1], hf[2], t);
  c.restore();
}

export const DRAW = { jun: juninho, osv: osvaldo, cle: cleide, car: caramelo, vaso, dem: demonio, chefe };
