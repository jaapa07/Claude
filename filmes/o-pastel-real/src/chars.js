// The cast, drawn in code: Dol-soe (cook), Seol-hwa (court lady), the King, Nabi (the cat).
// Canvas units: y down, feet at (0,0), facing right; the caller flips for facing left.
import { TAU, clamp, lerp } from './lib.js';

export const INK = '#2a1712';
const LW = 7;                                  // outline width at scale 1

// a limb: an outlined thick stroke through points
export function limb(c, pts, w, fill, ink = INK) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) c.lineTo(...pts[i]);
  c.strokeStyle = ink; c.lineWidth = w + LW * 2; c.stroke(); c.strokeStyle = fill; c.lineWidth = w; c.stroke();
}
export function blob(c, fill, path, lw = LW) { c.beginPath(); path(); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); }
const circ = (c, x, y, r) => c.arc(x, y, r, 0, TAU);
const dir = a => [Math.sin(a), Math.cos(a)];                 // 0 = down, π/2 = forward, π = up
function armPts(sx, sy, a, b, l1, l2) { const [dx, dy] = dir(a), [ex, ey] = [sx + dx * l1, sy + dy * l1], [fx, fy] = dir(a + b); return [[sx, sy], [ex, ey], [ex + fx * l2, ey + fy * l2]]; }

// default pose & expression
export function pose(o = {}) {
  return Object.assign({ x: 0, y: 0, s: 1, face: 1, lean: 0, sq: 1, rot: 0, vis: 1,
    aB: .25, bB: .3, aF: .25, bF: .3,                 // back / front arm: shoulder angle, elbow bend
    walk: 0, ph: 0, kneel: 0, sit: 0, bow: 0, legs: null,
    hold: null, look: [0, 0], head: 0,
    E: { eye: 'open', brow: 0, browY: 0, mouth: 'smile', open: 0, blush: 0, sweat: 0, tears: 0, red: 0, soot: 0, pupil: 1, steam: 0 } }, o);
}

// —— face ——
function face(c, P, R, skin, o = {}) {
  const E = P.E, fx = R * .28, ex = R * .36, ey = -R * .02 + (o.eyeY || 0);
  c.save(); c.translate(fx, 0);
  const lk = P.look;
  // blush & spicy red
  if (E.blush > 0 || E.red > 0) { c.fillStyle = `rgba(255,90,90,${.35 * Math.max(E.blush, E.red * .6)})`; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * ex * 1.15, R * .32, R * .2, R * .12, 0, 0, TAU); c.fill(); } }
  for (const s of [-1, 1]) {
    const x = s * ex + (s < 0 ? -R * .04 : 0), sc = s < 0 ? .9 : 1;    // far eye slightly smaller (3/4 view)
    c.save(); c.translate(x, ey); c.scale(sc, 1);
    const ew = R * .22, eh = R * .3 * (o.eyeH || 1);
    if (E.eye === 'closed' || E.eye === 'happy') {
      c.beginPath(); c.lineWidth = LW; c.strokeStyle = INK; c.lineCap = 'round';
      if (E.eye === 'happy') c.arc(0, eh * .25, ew * .9, Math.PI * 1.1, Math.PI * 1.9); else { c.moveTo(-ew, 0); c.quadraticCurveTo(0, eh * .35, ew, 0); }
      c.stroke();
    } else if (E.eye === 'x') {
      c.lineWidth = LW; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.moveTo(-ew * .7, -eh * .5); c.lineTo(ew * .7, eh * .5); c.moveTo(ew * .7, -eh * .5); c.lineTo(-ew * .7, eh * .5); c.stroke();
    } else if (E.eye === 'spiral') {
      c.beginPath(); c.ellipse(0, 0, ew, eh, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = LW * .8; c.strokeStyle = INK; c.stroke();
      c.beginPath(); for (let k = 0; k < 60; k++) { const a = k * .35 + (o.t || 0) * 8, r = k / 60 * ew * .9; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * eh / ew); } c.lineWidth = 3; c.stroke();
    } else {
      const wide = E.eye === 'wide' ? 1.25 : 1;
      c.beginPath(); c.ellipse(0, 0, ew * wide, eh * wide, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = LW * .8; c.strokeStyle = INK; c.stroke();
      const pr = ew * .62 * (E.pupil ?? 1) * (E.eye === 'wide' ? .7 : 1), px = (lk[0] * .45 + .15) * ew, py = lk[1] * .4 * eh + eh * .08;
      c.beginPath(); c.ellipse(px, py, pr, pr * 1.18, 0, 0, TAU); c.fillStyle = o.iris || '#3a2418'; c.fill();
      c.beginPath(); c.ellipse(px, py + pr * .1, pr * .55, pr * .65, 0, 0, TAU); c.fillStyle = '#120806'; c.fill();
      c.fillStyle = '#fff'; c.beginPath(); circ(c, px - pr * .35, py - pr * .45, pr * .32); c.fill(); c.beginPath(); circ(c, px + pr * .35, py + pr * .4, pr * .14); c.fill();
      if (o.lashes) { c.lineWidth = LW * .9; c.strokeStyle = INK; c.beginPath(); c.ellipse(0, 0, ew * wide * 1.02, eh * wide * 1.02, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); c.beginPath(); c.moveTo(ew * .85, -eh * .6); c.lineTo(ew * 1.25, -eh * .85); c.stroke(); }
    }
    // brow: E.brow −1 angry (inner down) … +1 worried (inner up)
    const by = -eh - R * .12 - E.browY * R * .15;   // the inner end (toward the nose) is at x = −s·ew
    c.lineWidth = o.browW || LW * 1.6; c.strokeStyle = o.browCol || INK; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-s * ew * 1.05, by - E.brow * R * .1); c.lineTo(s * ew * 1.05, by + E.brow * R * .1);
    c.stroke();
    if (E.tears > 0) { c.fillStyle = 'rgba(120,200,255,.9)'; c.strokeStyle = INK; c.lineWidth = 3; const tl = E.tears * R * 1.2; c.beginPath(); c.moveTo(-ew * .3, eh * .6); c.quadraticCurveTo(-ew * .6, eh + tl * .5, -ew * .2, eh + tl); c.lineTo(ew * .2, eh + tl); c.quadraticCurveTo(ew * .4, eh + tl * .5, ew * .1, eh * .6); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
  }
  // nose
  c.lineWidth = LW * .7; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * .05, R * .12); c.quadraticCurveTo(R * .14, R * .22, R * .02, R * .25); c.stroke();
  // mouth
  const my = R * .45 + (o.mouthY || 0), mw = R * .3, op = clamp(E.open);
  c.lineWidth = LW; c.strokeStyle = INK;
  const shape = op > .08 && E.mouth !== 'scream' && E.mouth !== 'o' ? 'talk' : E.mouth;
  c.beginPath();
  if (shape === 'smile' || shape === 'flat' || shape === 'frown') {
    const k = shape === 'smile' ? 1 : shape === 'frown' ? -1 : 0;
    c.moveTo(-mw, my - k * 4); c.quadraticCurveTo(0, my + k * R * .18, mw, my - k * 4); c.stroke();
  } else if (shape === 'wobble') {
    c.moveTo(-mw, my); for (let k = 0; k <= 8; k++) c.lineTo(-mw + k * mw / 4, my + (k % 2 ? 6 : -6)); c.stroke();
  } else {
    const h = shape === 'scream' ? R * (.35 + .25 * op) : shape === 'o' ? R * (.14 + .2 * op) : R * (.06 + .32 * op), w = shape === 'o' ? mw * .55 : shape === 'grin' ? mw * 1.25 : mw * (1 - .15 * op);
    if (shape === 'grin') { c.moveTo(-w, my - 6); c.quadraticCurveTo(0, my + R * .36, w, my - 6); c.closePath(); }
    else c.ellipse(0, my + h * .3, w, h, 0, 0, TAU);
    c.fillStyle = '#7a1e1e'; c.fill(); c.stroke();
    c.save(); c.clip(); c.fillStyle = '#e8606a'; c.beginPath(); c.ellipse(0, my + h * 1.1, w * .7, h * .55, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-w, my - h * .75 - 2, w * 2, h * .3); c.restore();
  }
  if (E.sweat > 0) { c.fillStyle = 'rgba(150,215,255,.95)'; c.strokeStyle = INK; c.lineWidth = 3; const sx = -R * .95, sy = -R * .45; c.beginPath(); c.moveTo(sx, sy - R * .22 * E.sweat); c.quadraticCurveTo(sx + R * .13, sy, sx, sy + R * .08); c.quadraticCurveTo(sx - R * .13, sy, sx, sy - R * .22 * E.sweat); c.fill(); c.stroke(); }
  c.restore();
}

// —— generic body parts ——
function legs(c, P, hip, len, pants, shoe, w = 50) {
  const ph = P.ph, amp = P.walk;
  for (const s of [1, -1]) {           // s=1 back leg first
    let th = amp * .55 * Math.sin(ph + (s > 0 ? Math.PI : 0)), sh = Math.max(0, amp * .8 * Math.sin(ph + (s > 0 ? Math.PI : 0) + 1.3));
    if (P.kneel) { th = lerp(th, s > 0 ? -.2 : 1.45, P.kneel); sh = lerp(sh, s > 0 ? 1.6 : -1.5, P.kneel); }
    if (P.sit) { th = lerp(th, 1.5, P.sit); sh = lerp(sh, -1.5, P.sit); }
    if (P.legs) { th = P.legs[s > 0 ? 0 : 2]; sh = P.legs[s > 0 ? 1 : 3]; }
    const hx = s * 18, hy = hip, [dx, dy] = dir(th), kx = hx + dx * len / 2, ky = hy + dy * len / 2, [fx, fy] = dir(th - sh), ax = kx + fx * len / 2, ay = ky + fy * len / 2;
    limb(c, [[hx, hy], [kx, ky], [ax, ay]], w, s > 0 ? shade(pants) : pants);
    blob(c, shoe, () => c.ellipse(ax + 16, ay + 4, 34, 18, Math.atan2(fy, fx) - Math.PI / 2, 0, TAU));
  }
}
function shade(hex, k = .82) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * k | 0, g = (n >> 8 & 255) * k | 0, b = (n & 255) * k | 0; return `rgb(${r},${g},${b})`; }
function arm(c, P, which, sx, sy, l1, l2, sleeve, skin, w = 46, cuff) {
  const a = which === 'B' ? P.aB : P.aF, b = which === 'B' ? P.bB : P.bF, pts = armPts(sx, sy, a, b, l1, l2);
  limb(c, pts, w, which === 'B' ? shade(sleeve) : sleeve);
  if (cuff) limb(c, [pts[1], [lerp(pts[1][0], pts[2][0], .75), lerp(pts[1][1], pts[2][1], .75)]], w * .8, cuff);
  const [hx, hy] = [pts[2][0] + (pts[2][0] - pts[1][0]) * .12, pts[2][1] + (pts[2][1] - pts[1][1]) * .12];
  blob(c, which === 'B' ? shade(skin, .9) : skin, () => circ(c, hx, hy, w * .48));
  return [hx, hy];
}

// —— Dol-soe: round cook, topknot with white headband, white jeogori, tan apron ——
export function dolsoe(c, P, t = 0) {
  const skin = '#f2c49a', shirt = '#f7f1e6', pants = '#cfc6b8', R = 100;
  c.save(); body0(c, P);
  legs(c, P, -190, 190, pants, '#3a2a22', 58);
  arm(c, P, 'B', -40, -370, 105, 95, shirt, skin, 54);
  // torso: round belly
  blob(c, shirt, () => { c.moveTo(-95, -390); c.quadraticCurveTo(-150, -270, -110, -170); c.quadraticCurveTo(0, -140, 110, -170); c.quadraticCurveTo(160, -270, 95, -390); c.quadraticCurveTo(0, -415, -95, -390); });
  blob(c, '#d9b07a', () => { c.moveTo(-60, -300); c.quadraticCurveTo(-95, -230, -70, -160); c.quadraticCurveTo(10, -140, 90, -165); c.quadraticCurveTo(120, -240, 80, -300); c.closePath(); });   // apron
  c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.moveTo(-40, -395); c.lineTo(30, -330); c.stroke();     // jeogori collar
  blob(c, '#c46a3a', () => { c.moveTo(-100, -305); c.lineTo(110, -305); c.lineTo(110, -290); c.lineTo(-100, -290); c.closePath(); });   // apron string
  // head
  c.save(); c.translate(10, -470); c.rotate(P.head);
  blob(c, skin, () => { c.ellipse(0, 0, R * 1.02, R * .96, 0, 0, TAU); });
  blob(c, skin, () => c.ellipse(-R * .78, R * .08, R * .2, R * .26, 0, 0, TAU));                // ear
  blob(c, '#1c1410', () => { c.moveTo(-R, -R * .05); c.quadraticCurveTo(-R * 1.05, -R * 1.05, 0, -R * 1.02); c.quadraticCurveTo(R * 1.02, -R * .98, R * .98, -R * .25); c.quadraticCurveTo(R * .3, -R * .6, -R * .55, -R * .3); c.closePath(); });   // hair
  blob(c, '#1c1410', () => c.ellipse(-R * .1, -R * 1.12, R * .22, R * .2, 0, 0, TAU));             // topknot
  blob(c, '#fffdf6', () => { c.moveTo(-R * 1.0, -R * .4); c.quadraticCurveTo(0, -R * .78, R * 1.0, -R * .52); c.lineTo(R * .98, -R * .32); c.quadraticCurveTo(0, -R * .58, -R * 1.0, -R * .2); c.closePath(); });   // headband
  blob(c, '#fffdf6', () => { c.moveTo(-R * .95, -R * .3); c.quadraticCurveTo(-R * 1.35, -R * .2 + Math.sin(t * 9) * 8, -R * 1.45, -R * .05); c.lineTo(-R * 1.35, R * .02); c.quadraticCurveTo(-R * 1.2, -R * .15, -R * .95, -R * .2); });   // knot tail
  if (P.E.soot > 0) soot(c, R, P.E.soot);
  face(c, P, R, skin, { t, browW: 13, eyeH: .95 });
  c.restore();
  const hand = arm(c, P, 'F', 40, -370, 105, 95, shirt, skin, 54);
  c.restore(); return hand;
}
// —— Seol-hwa: court lady, green jeogori, deep red chima, braided bun ——
export function seolhwa(c, P, t = 0) {
  const skin = '#f6d3b5', top = '#7fbf6a', skirt = '#b8324a', R = 88;
  c.save(); body0(c, P);
  // skirt hides the legs; feet peek out when walking
  const sw = Math.sin(P.ph) * P.walk;
  for (const s of [1, -1]) blob(c, '#f3eee4', () => c.ellipse(s * 30 + sw * s * 30 + 14, -8, 30, 15, 0, 0, TAU));
  arm(c, P, 'B', -30, -362, 95, 88, top, skin, 42, '#f3eee4');
  blob(c, skirt, () => { c.moveTo(-70, -330); c.bezierCurveTo(-120, -200, -170 - sw * 10, -60, -150 - sw * 10, -6); c.quadraticCurveTo(0, 14, 155 + sw * 10, -6); c.bezierCurveTo(175 + sw * 10, -60, 125, -200, 75, -330); c.closePath(); });
  c.strokeStyle = 'rgba(42,23,18,.35)'; c.lineWidth = 4; for (const x of [-60, 0, 60]) { c.beginPath(); c.moveTo(x * .4, -300); c.quadraticCurveTo(x * .9, -150, x * 1.4, -12); c.stroke(); }
  blob(c, top, () => { c.moveTo(-70, -395); c.quadraticCurveTo(-95, -340, -85, -300); c.lineTo(90, -300); c.quadraticCurveTo(100, -340, 72, -395); c.quadraticCurveTo(0, -410, -70, -395); });
  blob(c, '#7a2a6a', () => { c.moveTo(0, -330); c.quadraticCurveTo(20, -280, 8, -230); c.lineTo(26, -232); c.quadraticCurveTo(34, -285, 14, -330); c.closePath(); });     // goreum ribbon
  c.lineWidth = 5; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(-40, -398); c.lineTo(20, -335); c.stroke();
  c.save(); c.translate(6, -460); c.rotate(P.head);
  blob(c, '#1a1210', () => c.ellipse(-R * .95, R * .45, R * .34, R * .3, 0, 0, TAU));             // the bun at the nape
  blob(c, '#d7b84a', () => { c.rect(-R * 1.45, R * .38, R * 1.0, R * .1); });                     // binyeo pin
  blob(c, skin, () => c.ellipse(0, 0, R * .98, R * 1.0, 0, 0, TAU));
  blob(c, '#1a1210', () => { c.moveTo(-R * .98, R * .2); c.quadraticCurveTo(-R * 1.08, -R * 1.08, 0, -R * 1.04); c.quadraticCurveTo(R * 1.0, -R * 1.0, R * .96, -R * .1); c.quadraticCurveTo(R * .55, -R * .75, 0, -R * .62); c.quadraticCurveTo(-R * .5, -R * .45, -R * .7, R * .2); c.closePath(); });
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-R * .5, -R * .8); c.quadraticCurveTo(0, -R * .95, R * .5, -R * .8); c.stroke();
  face(c, P, R, skin, { t, lashes: true, iris: '#5a3020', browW: 8, eyeH: 1.1, mouthY: -4 });
  c.restore();
  const hand = arm(c, P, 'F', 32, -362, 95, 88, top, skin, 42, '#f3eee4');
  c.restore(); return hand;
}
// —— the King: red robe with gold dragon roundel, black winged hat, moustache ——
export function rei(c, P, t = 0) {
  const skin = '#efc39c', robe = '#c8262c', R = 96;
  c.save(); body0(c, P);
  if (!P.sit) for (const s of [1, -1]) blob(c, '#241612', () => c.ellipse(s * 40 + 14, -8, 38, 17, 0, 0, TAU));
  arm(c, P, 'B', -55, -372, 100, 90, robe, skin, 64);
  const hem = P.sit ? -120 : 0;
  blob(c, robe, () => { c.moveTo(-90, -400); c.quadraticCurveTo(-140, -200, -125, hem - 8); c.quadraticCurveTo(0, hem + 6, 125, hem - 8); c.quadraticCurveTo(140, -200, 90, -400); c.quadraticCurveTo(0, -425, -90, -400); });
  if (P.sit) blob(c, robe, () => { c.moveTo(-110, -150); c.lineTo(150, -160); c.quadraticCurveTo(175, -60, 140, -10); c.lineTo(-100, -10); c.closePath(); });
  blob(c, '#e7b93a', () => circ(c, 12, -300, 52));                                                       // the roundel
  c.strokeStyle = '#a6331f'; c.lineWidth = 5; c.beginPath(); for (let k = 0; k < 30; k++) { const a = k * .5; c.lineTo(12 + Math.cos(a) * (8 + k * 1.2), -300 + Math.sin(a) * (8 + k * 1.2)); } c.stroke();   // dragon coil
  blob(c, '#2b6a4a', () => { c.moveTo(-105, -215); c.quadraticCurveTo(0, -190, 110, -215); c.lineTo(110, -195); c.quadraticCurveTo(0, -170, -105, -195); c.closePath(); });     // jade belt
  for (const x of [-60, -10, 40, 85]) blob(c, '#9fd3b0', () => c.rect(x, -207, 18, 13), 3);
  c.save(); c.translate(10, -478); c.rotate(P.head);
  blob(c, skin, () => c.ellipse(0, 0, R * .96, R * 1.02, 0, 0, TAU));
  blob(c, '#18100c', () => { c.moveTo(-R * .95, -R * .3); c.quadraticCurveTo(-R * .9, -R * 1.25, 0, -R * 1.3); c.quadraticCurveTo(R * .95, -R * 1.25, R * .95, -R * .35); c.quadraticCurveTo(0, -R * .55, -R * .95, -R * .3); });   // ikseongwan crown
  for (const s of [-1, 1]) blob(c, '#18100c', () => c.ellipse(-R * .55 + s * R * .22, -R * 1.2, R * .2, R * .42, s * .25, 0, TAU));   // the two wings
  c.strokeStyle = '#d6a93a'; c.lineWidth = 5; c.beginPath(); c.moveTo(-R * .9, -R * .45); c.quadraticCurveTo(0, -R * .66, R * .9, -R * .5); c.stroke();
  face(c, P, R, skin, { t, browW: 14, browCol: '#1a100c', eyeH: .85 });
  // moustache and goatee
  c.save(); c.translate(R * .28, 0);
  const mo = P.E.stache || 0;
  for (const s of [-1, 1]) blob(c, '#1a100c', () => { c.moveTo(0, R * .33); c.quadraticCurveTo(s * R * .3, R * .28 - mo * 30, s * R * .5, R * .42 - mo * 60); c.quadraticCurveTo(s * R * .25, R * .4, 0, R * .4); }, 3);
  blob(c, '#1a100c', () => { c.moveTo(-R * .1, R * .78); c.quadraticCurveTo(0, R * 1.05, R * .1, R * .78); c.closePath(); }, 3);
  c.restore();
  if (P.E.steam > 0) steam(c, R, P.E.steam, t);
  c.restore();
  const hand = arm(c, P, 'F', 55, -372, 100, 90, robe, skin, 64);
  c.restore(); return hand;
}
// —— Nabi: an orange tabby; feet at (0,0), facing right ——
export function gato(c, P, t = 0) {
  const fur = '#f0953a', R = 60;
  c.save(); body0(c, P);
  const run = P.walk, ph = P.ph;
  // tail
  c.lineCap = 'round'; const tw = Math.sin(t * 3) * .3;
  limb(c, [[-70, -70], [-120, -110 + Math.sin(t * 4) * 10], [-110 + tw * 60, -170], [-80 + tw * 50, -190]], 20, fur);
  for (const [lx, o] of [[-50, 0], [40, Math.PI]]) for (const s of [1, -1]) {
    const a = run * .9 * Math.sin(ph + o + (s > 0 ? .4 : 0)); limb(c, [[lx + s * 6, -55], [lx + s * 6 + Math.sin(a) * 50, -55 + Math.cos(a) * 50]], 22, s > 0 ? shade(fur) : fur);
  }
  blob(c, fur, () => c.ellipse(0, -75, 82, 45, 0, 0, TAU));
  c.strokeStyle = '#c0601e'; c.lineWidth = 7; for (const x of [-40, -15, 10]) { c.beginPath(); c.moveTo(x, -118); c.quadraticCurveTo(x + 8, -95, x, -80); c.stroke(); }
  c.save(); c.translate(80, -120); c.rotate(P.head);
  for (const s of [-1, 1]) blob(c, fur, () => { c.moveTo(s * R * .6 - R * .3, -R * .5); c.lineTo(s * R * .55, -R * 1.25); c.lineTo(s * R * .6 + R * .3, -R * .4); c.closePath(); });
  blob(c, fur, () => c.ellipse(0, 0, R, R * .88, 0, 0, TAU));
  blob(c, '#fff3e0', () => c.ellipse(R * .2, R * .35, R * .55, R * .38, 0, 0, TAU), 0);
  c.strokeStyle = '#c0601e'; c.lineWidth = 6; for (const x of [-.25, 0, .25]) { c.beginPath(); c.moveTo(x * R, -R * .85); c.lineTo(x * R * .8, -R * .55); c.stroke(); }
  const E = P.E;
  for (const s of [-1, 1]) { const x = s * R * .38 + R * .15;
    if (E.eye === 'closed' || E.eye === 'happy') { c.lineWidth = 6; c.strokeStyle = INK; c.beginPath(); c.arc(x, -R * .02, R * .16, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    else { blob(c, '#d8f07a', () => c.ellipse(x, -R * .08, R * .2, R * .25 * (E.eye === 'wide' ? 1.2 : 1), 0, 0, TAU), 4); c.fillStyle = '#120806'; c.beginPath(); c.ellipse(x + P.look[0] * 6, -R * .06, R * .06 * (E.pupil ?? 1) * (E.eye === 'wide' ? 2.2 : 1), R * .2, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); circ(c, x - 5, -R * .18, 5); c.fill(); } }
  c.fillStyle = '#e86a7a'; c.beginPath(); c.moveTo(R * .1, R * .2); c.lineTo(R * .24, R * .2); c.lineTo(R * .17, R * .3); c.fill();
  c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(R * .17, R * .3); c.quadraticCurveTo(R * .05, R * .45, -R * .05, R * .36); c.moveTo(R * .17, R * .3); c.quadraticCurveTo(R * .3, R * .45, R * .4, R * .36); c.stroke();
  c.lineWidth = 2.5; for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(R * .17 + s * R * .25, R * .3 + k * 6); c.lineTo(R * .17 + s * R * .85, R * .25 + k * 16); c.stroke(); }
  if (P.hat) { blob(c, '#e7b93a', () => { c.moveTo(-R * .35, -R * .7); c.lineTo(-R * .4, -R * 1.15); c.lineTo(-R * .15, -R * .95); c.lineTo(0, -R * 1.25); c.lineTo(R * .15, -R * .95); c.lineTo(R * .4, -R * 1.15); c.lineTo(R * .35, -R * .7); c.closePath(); }, 4); }
  if (E.flour > 0) { c.fillStyle = `rgba(255,255,255,${.85 * E.flour})`; c.beginPath(); c.ellipse(0, 0, R * 1.05, R * .95, 0, 0, TAU); c.fill(); }
  c.restore();
  if (P.E.flour > 0) { c.fillStyle = `rgba(255,255,255,${.8 * P.E.flour})`; c.beginPath(); c.ellipse(0, -75, 84, 47, 0, 0, TAU); c.fill(); }
  c.restore();
}

function body0(c, P) {
  c.translate(P.x, P.y); c.scale(P.s * P.face, P.s); c.rotate(P.rot);
  c.scale(1 / Math.sqrt(P.sq), P.sq);
  if (P.lean) { c.translate(0, -200); c.rotate(P.lean); c.translate(0, 200); }
  if (P.kneel) c.translate(0, 95 * P.kneel);
  if (P.sit) c.translate(0, 80 * P.sit);
  if (P.bow) { c.translate(0, -180); c.rotate(P.bow * 1.2); c.translate(0, 180); }
}
function soot(c, R, k) {
  c.save(); c.globalAlpha = k; c.fillStyle = '#2b2522';
  for (const [x, y, r] of [[-.45, -.35, .2], [.75, .25, .17], [.0, .62, .16], [-.6, .45, .18], [.35, -.55, .14]]) { c.beginPath(); c.ellipse(x * R, y * R, r * R, r * R * .8, 0, 0, TAU); c.fill(); }
  c.restore();
}
function steam(c, R, k, t) {
  c.save(); c.globalAlpha = .85 * k; c.fillStyle = '#fff';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const u = (t * 1.6 + i / 3) % 1; c.beginPath(); c.arc(s * R * 1.0 + s * u * 40, -R * .2 - u * 120, 18 + u * 22, 0, TAU); c.fill(); }
  c.restore();
}

export const DRAW = { dol: dolsoe, seol: seolhwa, rei, cat: gato };
