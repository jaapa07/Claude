// The paper worlds of "A Lanterna de São João": the post office, the envelope (cover, address, letter), the downhill ride
// through the June festival, the river crossing, and Aurora's bank looking across the water.
import * as THREE from 'three';
import { sheet, skyPanel, moon, setMoon, text } from './paper.js';
import { stage } from './stage.js';
import { mulberry, TAU, lerp } from './lib.js';
import { PAPER, tint, cut, winLight, glow, person, bike } from './kit.js';

const band = (x, x0, x1, f, bottom = -.3) => { x.beginPath(); x.moveTo(x0, bottom); for (let u = x0; u <= x1 + .001; u += .002) x.lineTo(u, f(u)); x.lineTo(x1, bottom); x.closePath(); x.fill(); };
const roof = (x, x0, x1, y, h, over = .004) => { x.beginPath(); x.moveTo(x0 - over, y); x.lineTo(x0 + (x1 - x0) * .18, y + h); x.lineTo(x1 - (x1 - x0) * .18, y + h); x.lineTo(x1 + over, y); x.closePath(); x.fill(); };
const FLAGS = ['#e8402a', '#f2b632', '#3aa0d8', '#4ab86a', '#e86aa8'];
// a string of festa junina flags between two points (drawn in real colours, never tinted)
function flags(x, x0, y0, x1, y1, sag, n, seed = 1) {
  const P = u => [lerp(x0, x1, u), lerp(y0, y1, u) - sag * 4 * u * (1 - u)];
  x.strokeStyle = '#2a2018'; x.lineWidth = .0005; x.beginPath(); for (let i = 0; i <= 30; i++) { const [px, py] = P(i / 30); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  for (let i = 0; i < n; i++) { const [px, py] = P((i + .5) / n), w = .0042; x.fillStyle = FLAGS[(i + seed) % FLAGS.length]; x.beginPath(); x.moveTo(px - w, py); x.lineTo(px + w, py); x.lineTo(px + w, py - .008); x.lineTo(px, py - .0055); x.lineTo(px - w, py - .008); x.closePath(); x.fill(); }
}
// a small bonfire: crossed logs (drawn) — the flame is a glow added by the shot
function logs(x, px, py, s = 1) { x.save(); x.translate(px, py); for (const a of [-.5, .5, 0]) { x.save(); x.rotate(a); x.fillRect(-.012 * s, 0, .024 * s, .0035 * s); x.restore(); } x.restore(); }
// a paper lantern / small hot-air balloon shape (São João), local origin at its centre
function lanternShape(x, r) { x.beginPath(); x.moveTo(0, r * 1.25); x.bezierCurveTo(r * 1.15, r * 1.1, r * 1.15, -r * .5, r * .42, -r * 1.05); x.lineTo(-r * .42, -r * 1.05); x.bezierCurveTo(-r * 1.15, -r * .5, -r * 1.15, r * 1.1, 0, r * 1.25); x.closePath(); x.fill(); x.fillRect(-r * .34, -r * 1.3, r * .68, r * .22); }
export function lantern(S, r, z, col = '#d8402a') {
  const m = S.add(sheet({ U: S.U, w: r * 3, h: r * 3.4, z, trans: .9, shadow: false, recv: false, ppm: 12000, glow: 0, glowCol: '#ffb060', finish: { rim: .3, under: .15 },
    draw: x => { x.fillStyle = col; lanternShape(x, r); cut(x, () => { x.lineWidth = r * .07; for (const k of [-.5, 0, .5]) { x.beginPath(); x.moveTo(k * r * .5, r * 1.1); x.quadraticCurveTo(k * r * 1.5, 0, k * r * .5, -r); x.stroke(); } }); },
    glowDraw: g => { g.fillStyle = '#000'; g.fillRect(-r * 2, -r * 2, r * 4, r * 4); g.fillStyle = '#fff'; lanternShape(g, r * .92); } }));
  const gl = glow(S, r * 5, '#ffb45a');
  return { m, gl, set(px, py, k, fl = 1) { m.position.set(px, py, z); gl.position.set(px, py, z + .002); m.material.emissiveIntensity = 2.6 * k * fl; m.material.userData.u.uGlowLit.value = 1; gl.userData.set(.55 * k * fl); } };
}

// ———————————————— A. the post office (warm) ————————————————
export const FLOOR = -.1;
export function agencia() {
  const S = stage({ light: [-.06, .03, -.14], lightR: .2, lightCol: '#ffcf8a', key: 1.1, keyCol: '#ffe6c8', amb: .25, ambCol: '#a07050', floor: .35, keyPos: [-.02, .3, .3], keyTarget: [0, -.04, -.09], keyAngle: 1.05 });
  const { U } = S, W = .7;
  const wall = tint(S.add(sheet({ U, w: W, h: .36, z: -.135, trans: .9, ppm: 2600, draw: x => { x.fillStyle = PAPER; x.fillRect(-W / 2, -.18, W, .36); cut(x, () => x.fillRect(.2, .0, .07, .08)); } })), '#e2b884');
  const night = winLight(S, .235, .04, -.138, .076, .086, '#3a4c86', 1, new THREE.Color('#0d1636')); night.userData.set(.7);
  // the pigeonholes: a rack with a grid of cut holes; the lit wall glows through them, some hold letters
  const R = mulberry(6), CELLS = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) CELLS.push([-.27 + c * .034, .095 - r * .03, R() < .55]);
  const rack = tint(S.add(sheet({ U, w: W, h: .36, z: -.118, trans: .5, ppm: 4200, draw: x => { x.fillStyle = PAPER;
    x.fillRect(-.285, -.045, .255, .18); x.fillRect(-W / 2, FLOOR - .08, W, .08);
    cut(x, () => { for (const [cx, cy] of CELLS) x.fillRect(cx + .003, cy + .003, .028, .024); });
    x.fillRect(-.2, .15, .09, .016); } })), '#b77444');
  const letters = S.add(sheet({ U, w: W, h: .36, z: -.1195, trans: .6, shadow: false, ppm: 4200, finish: { rim: .2, under: .15 }, draw: x => { x.fillStyle = '#f1e2c2';
    for (const [cx, cy, has] of CELLS) if (has) { x.save(); x.translate(cx + .017, cy + .012); x.rotate((R() - .5) * .5); x.fillRect(-.009, -.006, .018, .012); x.restore(); } } }));
  const sign = S.add(sheet({ U, w: .1, h: .02, x: -.155, y: .158, z: -.117, trans: .4, shadow: false, ppm: 12000, finish: { rim: .25, under: .2 }, draw: x => { x.fillStyle = '#f1e2c2'; x.beginPath(); x.roundRect(-.045, -.008, .09, .016, .002); x.fill(); text(x, 'CORREIOS', 0, -.0004, .0105, '"Cormorant"', { fill: '#2a160c', weight: 700 }); } }));
  // the letter that fell behind the cabinet: a tilted cream envelope on the floor, with a soft glint
  const carta = S.add(sheet({ U, w: .03, h: .022, x: .1, y: FLOOR - .004, z: -.112, trans: .7, shadow: false, ppm: 14000, finish: { rim: .35, under: .2 }, draw: x => { x.fillStyle = '#f4e6c6'; x.rotate(.35); x.fillRect(-.008, -.0055, .016, .011); x.fillStyle = '#c8402c'; x.fillRect(.004, .0012, .003, .003); } }));
  const glint = glow(S, .03, '#ffe0a0'); glint.position.set(.1, FLOOR - .002, -.108);
  // the old cabinet: its own sheet, it slides
  const cab = tint(S.add(sheet({ U, w: .13, h: .24, x: .1, y: FLOOR + .1, z: -.1, trans: .12, ppm: 6000, draw: x => { x.fillStyle = PAPER;
    x.fillRect(-.055, -.1, .11, .19); x.fillRect(-.06, .09, .12, .008); x.fillRect(-.05, -.106, .012, .008); x.fillRect(.038, -.106, .012, .008);
    cut(x, () => { x.lineWidth = .0007; for (const [bx, by, w, h] of [[-.047, .0, .044, .08], [.003, .0, .044, .08], [-.047, -.09, .044, .08], [.003, -.09, .044, .08]]) x.strokeRect(bx, by, w, h);
      for (const bx of [-.008, .008]) { x.beginPath(); x.arc(bx, .04, .0018, 0, TAU); x.fill(); } }); } })), '#6a3018');
  const lamp = tint(S.add(sheet({ U, w: .03, h: .1, x: -.02, y: .125, z: -.1, trans: .3, shadow: false, ppm: 9000, draw: x => { x.fillStyle = PAPER; x.fillRect(-.0005, -.01, .001, .06); x.beginPath(); x.moveTo(-.012, -.018); x.quadraticCurveTo(0, -.002, .012, -.018); x.closePath(); x.fill(); } })), '#3a1a0c');
  const bulb = glow(S, .035, '#ffd08a'); bulb.position.set(-.02, .105, -.098);
  const nico = person(S, 'carteiro', -.078, '#200f08'); nico.k = 1.4;
  const front = tint(S.add(sheet({ U, w: W, h: .36, z: -.03, trans: .04, ppm: 3000, draw: x => { x.fillStyle = PAPER;
    band(x, -W / 2, W / 2, u => -.118 + .0012 * Math.sin(u * 70), -.18);
    // mail sacks (left), a scale (right)
    for (const [sx, s] of [[-.26, 1], [-.215, .8]]) { x.beginPath(); x.moveTo(sx - .02 * s, -.118); x.quadraticCurveTo(sx - .026 * s, -.085, sx - .008 * s, -.078); x.lineTo(sx + .008 * s, -.078); x.quadraticCurveTo(sx + .026 * s, -.085, sx + .02 * s, -.118); x.closePath(); x.fill(); x.fillRect(sx - .004 * s, -.078, .008 * s, .008 * s); }
    x.fillRect(.22, -.118, .003, .05); x.fillRect(.195, -.07, .053, .003); for (const s of [-1, 1]) { x.beginPath(); x.arc(.2215 + s * .024, -.082, .01, 0, Math.PI); x.fill(); } } })), '#150905');
  return { S, U, cab, carta, glint, bulb, nico, W };
}

// ———————————————— B. the envelope, seen from above: cover, address, the open letter ————————————————
export function carta(mode) {
  const S = stage({ light: [.02, .02, -.13], lightR: .22, lightCol: '#ffd9a0', key: 1.25, keyCol: '#fff0d8', amb: .3, ambCol: '#b08060', floor: .4, keyPos: [-.08, .28, .34], keyTarget: [0, -.01, -.1], keyAngle: 1.0 });
  const { U } = S, R = mulberry(3);
  const desk = tint(S.add(sheet({ U, w: .8, h: .46, z: -.14, trans: .25, ppm: 2400, draw: x => { x.fillStyle = PAPER; x.fillRect(-.4, -.23, .8, .46);
    cut(x, () => { x.lineWidth = .0006; for (let i = 0; i < 9; i++) { const y = -.2 + i * .05; x.beginPath(); x.moveTo(-.4, y); for (let u = -.4; u <= .4; u += .02) x.lineTo(u, y + .003 * Math.sin(u * 30 + i)); x.stroke(); } }); } })), '#4a2412');
  const out = { S, U, strips: [], inks: [] };
  const EW = .34, EH = .2;
  if (mode !== 'open') {
    // the envelope: cream, a flap line, an old stamp (the red accent), a round postmark
    const env = S.add(sheet({ U, w: EW, h: EH, z: -.11, trans: .55, ppm: 5200, finish: { rim: .3, under: .25 }, draw: x => { x.fillStyle = '#efdfbd'; x.beginPath(); x.roundRect(-EW / 2, -EH / 2, EW, EH, .004); x.fill();
      x.fillStyle = 'rgba(120,80,40,.10)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((R() - .5) * EW, (R() - .5) * EH, .003 + R() * .012, 0, TAU); x.fill(); }   // age stains
      x.strokeStyle = 'rgba(60,40,20,.35)'; x.lineWidth = .0007; x.beginPath(); x.moveTo(-EW / 2, EH / 2); x.lineTo(0, .01); x.lineTo(EW / 2, EH / 2); x.stroke();
      x.strokeStyle = 'rgba(40,40,60,.55)'; x.lineWidth = .0008; for (const r of [.018, .014]) { x.beginPath(); x.arc(.085, .055, r, 0, TAU); x.stroke(); } for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(.1, .062 - k * .005); for (let u = 0; u <= .04; u += .004) x.lineTo(.1 + u, .062 - k * .005 + .0012 * Math.sin(u * 300)); x.stroke(); } } }));
    const stamp = S.add(sheet({ U, w: .04, h: .048, x: .135, y: .058, z: -.1085, trans: .5, shadow: true, ppm: 12000, finish: { rim: .3, under: .25 }, draw: x => { x.fillStyle = '#c8402c'; x.fillRect(-.017, -.021, .034, .042);
      cut(x, () => { for (let k = 0; k < 9; k++) { for (const s of [-1, 1]) { x.beginPath(); x.arc(-.016 + k * .004, s * .021, .0012, 0, TAU); x.fill(); } } for (let k = 0; k < 11; k++) { for (const s of [-1, 1]) { x.beginPath(); x.arc(s * .017, -.02 + k * .004, .0012, 0, TAU); x.fill(); } } });
      x.fillStyle = '#f4e2c0'; x.fillRect(-.012, -.016, .024, .032); x.fillStyle = '#c8402c'; x.translate(0, -.001); x.beginPath(); x.moveTo(0, .011); x.bezierCurveTo(.009, .01, .009, -.004, .0035, -.009); x.lineTo(-.0035, -.009); x.bezierCurveTo(-.009, -.004, -.009, .01, 0, .011); x.fill(); } }));
    out.env = env; out.stamp = stamp;
    const strip = (s, w, y, size, o = {}) => { const h = size * 1.7, m = S.add(sheet({ U, w, h, ax: -w / 2, z: -.104, trans: .6, shadow: true, recv: false, ppm: 9000, finish: { rim: .3, under: .22 }, draw: x => {
        x.fillStyle = o.bg || '#f8ecd0'; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, .0015); x.fill(); text(x, s, o.center ? 0 : -w / 2 + .006, -size * .04, size, '"Cormorant"', { fill: o.fill || '#2a160c', weight: 700, align: o.center ? 'center' : 'left' }); } }));
      m.position.set(o.x ?? -.13, y, -.104); out.strips.push(m); return m; };
    if (mode === 'cover') { strip('A Lanterna', .19, .012, .034, { x: -.135, bg: '#f8ecd0' }); strip('de São João', .2, -.036, .034, { x: -.115 }); strip('um filme de papel e luz', .13, -.078, .0105, { x: -.115, fill: '#7a4a2a' }); }
    else { strip('Para Aurora', .125, .012, .024); strip('Vila da Outra Margem', .185, -.028, .02); strip('Rem.: Joaquim', .1, -.066, .014, { fill: '#7a4a2a' }); }
  } else {
    // the letter itself: a sheet with ink lines that write themselves, and a small lantern drawn in the corner that glows
    const LW = .3, LH = .21;
    const page = S.add(sheet({ U, w: LW, h: LH, z: -.11, trans: .6, ppm: 5200, finish: { rim: .3, under: .25 }, draw: x => { x.fillStyle = '#f2e4c4'; x.fillRect(-LW / 2, -LH / 2, LW, LH);
      x.fillStyle = 'rgba(120,80,40,.10)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc((R() - .5) * LW, (R() - .5) * LH, .003 + R() * .012, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(90,60,30,.25)'; x.lineWidth = .0006; for (const u of [-.05, .05]) { x.beginPath(); x.moveTo(u, -LH / 2); x.lineTo(u, LH / 2); x.stroke(); } } }));
    const ink = (y, w, x0 = -.125, seed = 1) => { const m = S.add(sheet({ U, w, h: .016, ax: -w / 2, z: -.1085, trans: .2, shadow: false, recv: false, ppm: 9000, finish: { rim: 0, under: 0, grain: false }, draw: x => { const r = mulberry(seed);
        x.strokeStyle = '#2a1a3a'; x.lineWidth = .0011; x.lineCap = 'round'; let u = -w / 2 + .002;
        while (u < w / 2 - .01) { const wl = .008 + r() * .016; x.beginPath(); x.moveTo(u, 0); for (let k = 0; k <= wl; k += .0012) x.lineTo(u + k, .0028 * Math.sin(k * 900 + r() * 3) + (r() < .08 ? .004 : 0)); x.stroke(); u += wl + .005; } } }));
      m.position.set(x0, y, -.1085); out.inks.push(m); return m; };
    ink(.07, .2, -.125, 1); ink(.045, .16, -.125, 2); ink(.02, .2, -.125, 3); ink(-.02, .15, -.125, 4); ink(-.045, .09, -.125, 5);
    out.lant = lantern(S, .016, -.107); out.lant.set(.1, -.05, 0);
    const sig = S.add(sheet({ U, w: .08, h: .022, x: .05, y: -.082, z: -.108, trans: .2, shadow: false, recv: false, ppm: 9000, finish: { rim: 0, under: 0, grain: false }, draw: x => { text(x, 'Joaquim', 0, 0, .017, '"Cormorant"', { fill: '#2a1a3a', weight: 600 }); } })); out.sig = sig;
  }
  return out;
}

// ———————————————— C. the ride downhill through the festival ————————————————
export const SLOPE = .075, roadY = x => -.062 - SLOPE * x;
export function descida() {
  const S = stage({ light: [.3, -.02, -.13], lightR: .3, lightCol: '#a9b8ea', key: .9, keyCol: '#c8d4ff', amb: .22, ambCol: '#5a6ca8', floor: .34, keyPos: [-.06, .32, .32], keyTarget: [0, -.03, -.09], keyAngle: 1.1 });
  const { U } = S, X0 = -.5, X1 = 2.3, W = X1 - X0, CX = (X0 + X1) / 2;
  const sky = S.add(skyPanel({ w: 1.1, h: .7, z: -.142, stops: [[0, '#050a20'], [.5, '#0c173c'], [.85, '#1a2a58'], [1, '#22346a']], stars: 520, seed: 9 }));
  const mn = S.add(moon({ x: 0, y: 0, z: -.139, r: .011, gain: 1.5, halo: 5, haloGain: .16 })); setMoon(mn, 1);
  const hills = tint(S.add(sheet({ U, w: W, h: .6, x: CX, y: -.1, z: -.13, trans: .85, ppm: 1500, draw: x => { x.fillStyle = PAPER; x.translate(-CX, .1); band(x, X0, X1, u => .06 - SLOPE * .55 * u + .02 * Math.sin(u * 7 + 1) + .01 * Math.sin(u * 19), -.4); } })), '#6a86c2');
  // far houses with lit windows (everyone is awake tonight)
  const R = mulberry(11), FAR = []; for (let u = X0 + .05; u < X1; u += .07 + R() * .05) FAR.push([u, .018 + R() * .012, .022 + R() * .012]);
  const far = tint(S.add(sheet({ U, w: W, h: .6, x: CX, y: -.1, z: -.112, trans: .6, ppm: 2400, glow: 2.2, glowCol: '#ffbe68', draw: x => { x.fillStyle = PAPER; x.translate(-CX, .1);
    const g = u => .012 - SLOPE * .75 * u + .006 * Math.sin(u * 13); band(x, X0, X1, g, -.4);
    for (const [u, w, h] of FAR) { x.fillRect(u - w / 2, g(u) - .004, w, h); roof(x, u - w / 2, u + w / 2, g(u) - .004 + h, .007, .003); }
    x.save(); x.fillStyle = '#c8a070'; for (const [u, w, h] of FAR) x.fillRect(u - .003, g(u) + h * .35, .006, .007); x.restore(); },
    glowDraw: g2 => { g2.fillStyle = '#000'; g2.fillRect(-W, -1, W * 2, 2); g2.translate(-CX, .1); g2.fillStyle = '#fff'; const g = u => .012 - SLOPE * .75 * u + .006 * Math.sin(u * 13); for (const [u, w, h] of FAR) g2.fillRect(u - .003, g(u) + h * .35, .006, .007); } })), '#55709f');
  // the street: houses along the road, poles; then flags and bonfire logs in real colours
  const HS = []; for (let u = X0 + .1; u < X1 - .1; u += .21) HS.push([u + (R() - .5) * .04, .07 + R() * .02, .055 + R() * .02]);
  const POLES = []; for (let u = X0 + .02; u < X1; u += .21) POLES.push(u + .105);
  const street = tint(S.add(sheet({ U, w: W, h: .7, x: CX, y: -.12, z: -.088, trans: .22, ppm: 2400, glow: 2.3, glowCol: '#ffb862', draw: x => { x.fillStyle = PAPER; x.translate(-CX, .12);
    band(x, X0, X1, u => roadY(u) + .012, -.5);
    for (const [u, w, h] of HS) { const b = roadY(u) + .008; x.fillRect(u - w / 2, b, w, h); roof(x, u - w / 2, u + w / 2, b + h, .014); x.fillRect(u + w * .22, b + h + .006, .005, .014); }
    for (const u of POLES) x.fillRect(u - .001, roadY(u) + .01, .002, .1);
    cut(x, () => { for (const [u, w, h] of HS) x.fillRect(u - w * .06, roadY(u) + .008, w * .16, h * .5); });
    x.save(); x.fillStyle = '#c8a070'; for (const [u, w, h] of HS) for (const f of [-.3, .28]) x.fillRect(u + w * f - .006, roadY(u) + .008 + h * .45, .012, .016); x.restore(); },
    glowDraw: g => { g.fillStyle = '#000'; g.fillRect(-W, -1, W * 2, 2); g.translate(-CX, .12); g.fillStyle = '#fff'; for (const [u, w, h] of HS) for (const f of [-.3, .28]) g.fillRect(u + w * f - .006, roadY(u) + .008 + h * .45, .012, .016); } })), '#3f5a92');
  const deco = S.add(sheet({ U, w: W, h: .7, x: CX, y: -.12, z: -.084, trans: .5, shadow: false, ppm: 2400, finish: { rim: .2, under: .1 }, draw: x => { x.translate(-CX, .12);
    for (let i = 0; i < POLES.length - 1; i++) flags(x, POLES[i], roadY(POLES[i]) + .108, POLES[i + 1], roadY(POLES[i + 1]) + .108, .022, 13, i); } }));
  const FIRES = [.34, .82, 1.32, 1.8];
  const road = tint(S.add(sheet({ U, w: W, h: .7, x: CX, y: -.12, z: -.062, trans: .1, ppm: 2400, draw: x => { x.fillStyle = PAPER; x.translate(-CX, .12); band(x, X0, X1, u => roadY(u) - .012 + .0012 * Math.sin(u * 60), -.5);
    for (const u of FIRES) logs(x, u, roadY(u) - .011, 1); } })), '#1a2550');
  const fires = FIRES.map(u => { const fl = tint(S.add(sheet({ U, w: .04, h: .05, z: -.0615, trans: .95, shadow: false, recv: false, ppm: 9000, glow: 2.6, glowCol: '#ffa040', finish: { rim: 0, under: 0 },
      draw: x => { x.fillStyle = PAPER; x.beginPath(); x.moveTo(-.011, -.02); x.quadraticCurveTo(-.016, .0, -.004, .008); x.quadraticCurveTo(-.006, .016, 0, .022); x.quadraticCurveTo(.004, .012, .008, .008); x.quadraticCurveTo(.016, -.002, .011, -.02); x.closePath(); x.fill(); },
      glowDraw: g => { g.fillStyle = '#000'; g.fillRect(-1, -1, 2, 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-.011, -.02); g.quadraticCurveTo(-.016, .0, -.004, .008); g.quadraticCurveTo(-.006, .016, 0, .022); g.quadraticCurveTo(.004, .012, .008, .008); g.quadraticCurveTo(.016, -.002, .011, -.02); g.closePath(); g.fill(); } })), '#f08a30');
    fl.position.set(u, roadY(u) + .01, -.0615); const g = glow(S, .075, '#ff9a48'); g.position.set(u, roadY(u) + .01, -.058); return { fl, g, u }; });
  const nico = person(S, 'carteiro', -.05, '#0d1430'), bk = bike(S, -.0505, '#0d1430');
  const head = glow(S, .02, '#ffe2a8');
  const ballons = [0, 1, 2, 3, 4].map(i => lantern(S, .009 + (i % 2) * .003, -.125 + i * .001, FLAGS[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 4]));
  const front = tint(S.add(sheet({ U, w: W, h: .7, x: CX, y: -.12, z: -.026, trans: .04, ppm: 2000, shadow: false, draw: x => { x.fillStyle = PAPER; x.translate(-CX, .12); const r = mulberry(12);
    band(x, X0, X1, u => roadY(u) - .05 + .003 * Math.sin(u * 40), -.6);
    for (let u = X0; u < X1; u += .11 + r() * .12) { const b = roadY(u) - .05, h = .012 + r() * .014; x.fillRect(u - .0015, b, .003, h); if (r() < .5) for (const a of [.6, 1.3, 2.1]) { x.save(); x.translate(u, b + h); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(.01, .005, .02, .0005); x.quadraticCurveTo(.01, -.002, 0, 0); x.fill(); x.restore(); } } } })), '#0c1230');
  return { S, U, sky, mn, fires, nico, bk, head, ballons, X0, X1 };
}

// wave sheets: wide strips with a scalloped top edge; they slide a little, each at its own speed
function waves(S, U, W, levels) {
  return levels.map(([y, z, col, amp, k], i) => { const m = tint(S.add(sheet({ U, w: W + .2, h: .3, z, trans: .5 - i * .1, ppm: 2600, shadow: i > 0, draw: x => { x.fillStyle = PAPER;
      x.beginPath(); x.moveTo(-W, -.15); x.lineTo(-W, .1); for (let u = -W; u <= W; u += .0015) { const ph = (u * k) % 1; x.lineTo(u, .1 + amp * (Math.abs(Math.sin(u * k * Math.PI)) - .5)); } x.lineTo(W, -.15); x.closePath(); x.fill();
      cut(x, () => { x.lineWidth = .0006; const r = mulberry(40 + i); for (let j = 0; j < 60; j++) { const u = (r() - .5) * W * 1.6, v = .1 - .012 - r() * .1; x.beginPath(); x.moveTo(u, v); x.quadraticCurveTo(u + .008, v + .002, u + .016, v); x.stroke(); } }); } })), col);
    m.userData.y0 = y - .1; m.userData.i = i; return m; });
}
export function moveWaves(ws, t, x0 = 0) { ws.forEach(m => { const i = m.userData.i; m.position.x = x0 + .012 * Math.sin(t * (.5 + i * .13) + i * 1.7); m.position.y = m.userData.y0 + .0012 * Math.sin(t * .9 + i); }); }

// ———————————————— D. the river crossing, from the side ————————————————
export function travessia() {
  const S = stage({ light: [.2, .04, -.13], lightR: .3, lightCol: '#a9b8ea', key: .85, keyCol: '#c8d4ff', amb: .22, ambCol: '#5a6ca8', floor: .34, keyPos: [-.06, .32, .32], keyTarget: [0, -.03, -.09], keyAngle: 1.1 });
  const { U } = S, W = 1.4;
  const sky = S.add(skyPanel({ w: 1.1, h: .6, z: -.142, stops: [[0, '#040818'], [.5, '#0a1434'], [.85, '#16244e'], [1, '#1e2e60']], stars: 520, seed: 4 }));
  const mn = S.add(moon({ x: 0, y: .1, z: -.139, r: .013, gain: 1.6, halo: 5, haloGain: .18 })); setMoon(mn, 1);
  const hills = tint(S.add(sheet({ U, w: W + .4, h: .4, z: -.13, trans: .85, ppm: 1800, draw: x => { x.fillStyle = PAPER; band(x, -.9, .9, u => .0 + .02 * Math.sin(u * 6 + 2) + .008 * Math.sin(u * 17), -.2); } })), '#5f7ab8');
  // the town left behind: a low dark shore with little fires and lit windows
  const shore = tint(S.add(sheet({ U, w: W + .4, h: .4, z: -.118, trans: .5, ppm: 2400, glow: 2.2, glowCol: '#ffb060', draw: x => { x.fillStyle = PAPER; band(x, -.9, .9, u => -.022 + .004 * Math.sin(u * 20), -.2); const r = mulberry(5);
      for (let u = -.85; u < .1; u += .05 + r() * .04) { const w = .02 + r() * .012, h = .014 + r() * .01; x.fillRect(u, -.024, w, h); roof(x, u, u + w, -.024 + h, .006, .002); } },
    glowDraw: g => { g.fillStyle = '#000'; g.fillRect(-1, -1, 2, 2); g.fillStyle = '#fff'; const r = mulberry(5); for (let u = -.85; u < .1; u += .05 + r() * .04) { const w = .02 + r() * .012, h = .014 + r() * .01; g.fillRect(u + w * .35, -.02 + h * .2, .005, .006); } } })), '#3d5590');
  const ws = waves(S, U, W, [[-.032, -.105, '#33508e', .003, 60], [-.05, -.09, '#28427c', .004, 45], [-.072, -.062, '#1b2f62', .005, 34], [-.1, -.04, '#111f48', .006, 26]]);
  // the canoe sits between the 2nd and 3rd wave sheets
  const canoe = tint(S.add(sheet({ U, w: .14, h: .03, z: -.076, trans: .08, ppm: 9000, draw: x => { x.fillStyle = PAPER; x.beginPath(); x.moveTo(-.062, .008); x.quadraticCurveTo(-.05, -.012, 0, -.012); x.quadraticCurveTo(.05, -.012, .066, .01); x.quadraticCurveTo(.03, .002, -.062, .008); x.closePath(); x.fill(); cut(x, () => { x.lineWidth = .0006; x.beginPath(); x.moveTo(-.05, .001); x.quadraticCurveTo(0, -.006, .055, .003); x.stroke(); }); } })), '#0e1630');
  const oar = tint(S.add(sheet({ U, w: .012, h: .09, ay: .03, z: -.0745, trans: .08, ppm: 9000, shadow: false, draw: x => { x.fillStyle = PAPER; x.fillRect(-.0009, -.03, .0018, .07); x.beginPath(); x.ellipse(0, -.034, .0045, .011, 0, 0, TAU); x.fill(); } })), '#0e1630');
  const nico = person(S, 'carteiro', -.0755, '#0d1430');
  const prow = lantern(S, .0055, -.0735);
  // Aurora's bank at the far right: reeds, a pier, her dark house
  const bank = tint(S.add(sheet({ U, w: .5, h: .4, x: .62, z: -.07, trans: .1, ppm: 3600, draw: x => { x.fillStyle = PAPER; band(x, -.25, .25, u => -.07 + .05 / (1 + Math.exp(-(u + .12) * 40)) + .003 * Math.sin(u * 30), -.2);
      x.fillRect(-.2, -.062, .09, .003); for (const u of [-.19, -.15, -.12]) x.fillRect(u, -.11, .003, .05);
      x.fillRect(.0, -.02, .1, .07); roof(x, .0, .1, .05, .018, .006); cut(x, () => { x.fillRect(.014, .0, .02, .022); x.fillRect(.06, -.02, .018, .04); });
      const r = mulberry(8); for (let i = 0; i < 16; i++) { const u = -.24 + r() * .14, h = .02 + r() * .03; x.beginPath(); x.moveTo(u - .001, -.07); x.quadraticCurveTo(u + .004, -.07 + h * .6, u + .008 * (r() - .3), -.07 + h); x.lineTo(u + .001, -.07); x.fill(); } } })), '#0e1838');
  const bankWin = winLight(S, .62 + .024, .011, -.072, .024, .026, '#ffb45a', 2.2);
  const bankDoor = winLight(S, .62 + .069, .0, -.072, .022, .044, '#000', 0, new THREE.Color('#080d22'));
  return { S, U, sky, mn, ws, canoe, oar, nico, prow, bankWin };
}

// ———————————————— E. Aurora's bank, looking across the river ————————————————
export const HOUSE = { x: -.15, w: .17, h: .11, g: -.085 };       // her house: left edge centre x, ground y
export const WIN = { x: HOUSE.x + .045, y: HOUSE.g + .058, w: .034, h: .04 }, DOOR = { x: HOUSE.x - .035, w: .03, h: .062 };
export const FARL = { x: .13, y: .008 };                             // Joaquim's lantern on the far bank
export function margem() {
  const S = stage({ light: [.1, .05, -.13], lightR: .3, lightCol: '#a9b8ea', key: .85, keyCol: '#c8d4ff', amb: .22, ambCol: '#5a6ca8', floor: .32, keyPos: [-.06, .32, .32], keyTarget: [0, -.03, -.09], keyAngle: 1.05 });
  const { U } = S, W = .6;
  S.add(skyPanel({ w: .62, h: .38, z: -.142, stops: [[0, '#040818'], [.5, '#0a1434'], [.85, '#16244e'], [1, '#1e2e60']], stars: 480, starMinY: .0, seed: 21 }));
  const mn = S.add(moon({ x: -.02, y: .105, z: -.139, r: .012, gain: 1.6, halo: 5, haloGain: .18 })); setMoon(mn, 1);
  const hills = tint(S.add(sheet({ U, w: W, h: .35, z: -.132, trans: .85, ppm: 3200, draw: x => { x.fillStyle = PAPER; band(x, -.3, .3, u => .035 + .018 * Math.sin(u * 8 + 1) + .008 * Math.sin(u * 21), -.2); } })), '#5f7ab8');
  // the far bank: a low strip, trees, one small house; its window is a hole with a light behind
  const farBank = tint(S.add(sheet({ U, w: W, h: .35, z: -.122, trans: .5, ppm: 5200, draw: x => { x.fillStyle = PAPER; band(x, -.3, .3, u => -.004 + .003 * Math.sin(u * 25), -.2); const r = mulberry(14);
      for (let u = -.29; u < .29; u += .018 + r() * .03) { if (Math.abs(u - FARL.x) < .03) continue; const h = .004 + r() * .006; x.beginPath(); x.ellipse(u, -.003 + h, .004 + r() * .003, h, 0, 0, TAU); x.fill(); x.fillRect(u - .0006, -.006, .0012, .006); }
      x.fillRect(FARL.x - .016, -.004, .032, .02); roof(x, FARL.x - .016, FARL.x + .016, .016, .007, .003);
      cut(x, () => x.fillRect(FARL.x - .0045, FARL.y - .0045, .009, .009)); } })), '#34508c');
  const farWin = winLight(S, FARL.x, FARL.y, -.1235, .012, .012, '#ffb45a', 3.0, new THREE.Color('#0a1028'));
  const farGlow = glow(S, .05, '#ffb45a'); farGlow.position.set(FARL.x, FARL.y, -.1195);
  const ws = waves(S, U, W, [[-.012, -.112, '#33508e', .0022, 90], [-.03, -.098, '#28427c', .003, 70], [-.052, -.082, '#1f3468', .004, 52], [-.078, -.064, '#162856', .005, 40]]);
  // reflections: flat streaks of light on the water (far lantern's, then the bridge of light, and hers)
  const streak = (x, y, z, w, col = '#ffb45a') => { const g = glow(S, w, col); g.position.set(x, y, z); g.scale.set(1, .16, 1); return g; };
  const bridge = []; for (let i = 0; i < 9; i++) { const u = i / 8; bridge.push(streak(lerp(FARL.x, WIN.x + .05, u) + .006 * Math.sin(i * 2.1), lerp(-.016, -.088, u), lerp(-.111, -.06, u), lerp(.016, .05, u))); }
  // her bank: ground, the house (door, river-side window), a pole with flags, the pier
  const near = tint(S.add(sheet({ U, w: W, h: .35, z: -.05, trans: .08, ppm: 5200, draw: x => { x.fillStyle = PAPER;
      x.beginPath(); x.moveTo(-.3, -.2); x.lineTo(-.3, HOUSE.g); for (let u = -.3; u <= .3; u += .002) x.lineTo(u, HOUSE.g - .03 / (1 + Math.exp(-(u - .02) * 45)) + .0015 * Math.sin(u * 60)); x.lineTo(.3, -.2); x.closePath(); x.fill();
      const L = HOUSE.x - HOUSE.w / 2, R = HOUSE.x + HOUSE.w / 2; x.fillRect(L, HOUSE.g - .004, HOUSE.w, HOUSE.h); roof(x, L, R, HOUSE.g - .004 + HOUSE.h, .026, .008);
      cut(x, () => { x.lineWidth = .0006; for (let k = 1; k < 4; k++) { const yy = HOUSE.g - .004 + HOUSE.h + .026 * k / 4, sh = HOUSE.w * .18 * k / 4; x.beginPath(); x.moveTo(L + sh, yy); x.lineTo(R - sh, yy); x.stroke(); } });
      x.fillRect(R - .03, HOUSE.g + HOUSE.h + .008, .01, .028);
      cut(x, () => { x.fillRect(WIN.x - WIN.w / 2, WIN.y - WIN.h / 2, WIN.w, WIN.h); x.beginPath(); x.moveTo(DOOR.x - DOOR.w / 2, HOUSE.g - .004); x.lineTo(DOOR.x - DOOR.w / 2, HOUSE.g + DOOR.h - DOOR.w / 2); x.arc(DOOR.x, HOUSE.g + DOOR.h - DOOR.w / 2, DOOR.w / 2, Math.PI, 0, true); x.lineTo(DOOR.x + DOOR.w / 2, HOUSE.g - .004); x.closePath(); x.fill(); });
      x.fillRect(WIN.x - WIN.w / 2 - .003, WIN.y - WIN.h / 2 - .003, WIN.w + .006, .003);                 // sill
      x.fillRect(.085, HOUSE.g - .03, .002, .125);                                                          // flag pole
      x.fillRect(.03, HOUSE.g - .034, .11, .003); for (const u of [.05, .09, .13]) x.fillRect(u, HOUSE.g - .09, .003, .058);   // pier
    } })), '#243c74');
  const deco = S.add(sheet({ U, w: W, h: .35, z: -.0485, trans: .5, shadow: false, ppm: 5200, finish: { rim: .2, under: .1 }, draw: x => { flags(x, HOUSE.x + HOUSE.w / 2 - .006, HOUSE.g + HOUSE.h + .012, .086, HOUSE.g + .093, .016, 9, 2); } }));
  const winL = winLight(S, WIN.x, WIN.y, -.0525, WIN.w + .004, WIN.h + .004, '#ffb45a', 1.6, new THREE.Color('#080d22'));
  const doorL = winLight(S, DOOR.x, HOUSE.g + DOOR.h / 2 - .003, -.0535, DOOR.w + .004, DOOR.h + .006, '#ffc070', 2.2, new THREE.Color('#080d22'));
  const leaf = tint(S.add(sheet({ U, w: DOOR.w + .002, h: DOOR.h + .002, x: DOOR.x, y: HOUSE.g + DOOR.h / 2 - .004, z: -.0512, trans: .12, ppm: 12000, draw: x => { x.fillStyle = PAPER; const w = DOOR.w + .002, h = DOOR.h + .002; x.fillRect(-w / 2, -h / 2, w, h);
      cut(x, () => { x.lineWidth = .0006; x.strokeRect(-w / 2 + .003, -h / 2 + .005, w - .006, h * .36); x.strokeRect(-w / 2 + .003, h * .0, w - .006, h * .3); }); } })), '#2f6a8a');
  const aurora = person(S, 'aurora', -.0518, '#1a0c08'); aurora.k = 1.18;
  const nico = person(S, 'carteiro', -.044, '#070b1c'); nico.k = 1.3;
  const letter = S.add(sheet({ U, w: .012, h: .009, z: -.043, trans: .8, shadow: false, recv: false, ppm: 14000, finish: { rim: .3, under: .1 }, draw: x => { x.fillStyle = '#f4e6c6'; x.fillRect(-.005, -.0035, .01, .007); } }));
  const lant = lantern(S, .0085, -.047);
  const canoe = tint(S.add(sheet({ U, w: .14, h: .03, x: .16, y: -.112, z: -.045, trans: .08, ppm: 9000, draw: x => { x.fillStyle = PAPER; x.beginPath(); x.moveTo(-.062, .008); x.quadraticCurveTo(-.05, -.012, 0, -.012); x.quadraticCurveTo(.05, -.012, .066, .01); x.quadraticCurveTo(.03, .002, -.062, .008); x.closePath(); x.fill(); } })), '#0a1228');
  const balls = [0, 1, 2, 3].map(i => lantern(S, .006 + (i % 2) * .002, -.127 + i * .0012, FLAGS[[0, 1, 4, 0][i]]));
  const front = tint(S.add(sheet({ U, w: W, h: .35, z: -.024, trans: .04, ppm: 4200, shadow: false, draw: x => { x.fillStyle = PAPER; const r = mulberry(12);
      band(x, -.3, .3, u => -.128 + .0015 * Math.sin(u * 90), -.2);
      for (let i = 0; i < 60; i++) { const u = -.3 + r() * .6, h = .006 + r() * .02 * (u > .12 || u < -.24 ? 2 : .6); x.beginPath(); x.moveTo(u - .0012, -.128); x.quadraticCurveTo(u + .003, -.128 + h * .6, u + .006 * (r() - .4), -.128 + h); x.lineTo(u + .0012, -.128); x.fill(); } } })), '#070c20');
  return { S, U, mn, ws, farWin, farGlow, bridge, winL, doorL, leaf, aurora, nico, letter, lant, canoe, balls, near, front };
}
