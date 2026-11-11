// Joseon sets, props and comic FX. World units: px at zoom 1, floor at y = 0, y down.
import { TAU, mulberry, clamp, lerp } from './lib.js';
import { INK, blob, limb } from './chars.js';

const R = (seed) => mulberry(seed);
function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }
function rad(c, x, y, r, stops) { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }

// a dancheong band: repeating painted motifs under the eaves
function dancheong(c, x0, x1, y, h) {
  c.fillStyle = '#2f7a62'; c.fillRect(x0, y, x1 - x0, h);
  for (let x = x0; x < x1; x += h * 1.4) {
    c.fillStyle = '#c8303a'; c.beginPath(); c.arc(x + h * .7, y + h * .5, h * .34, 0, TAU); c.fill();
    c.fillStyle = '#f3d24a'; c.beginPath(); c.arc(x + h * .7, y + h * .5, h * .16, 0, TAU); c.fill();
    c.fillStyle = '#4fa3d8'; c.fillRect(x, y + h * .82, h * 1.4, h * .18);
    c.fillStyle = '#fff'; c.fillRect(x + h * 1.32, y, h * .08, h);
  }
  c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(x0, y, x1 - x0, h);
}
// a curved giwa roof
function roof(c, x0, x1, y, h, col = '#3b3f4a') {
  const w = x1 - x0, ov = w * .1;
  blob(c, col, () => { c.moveTo(x0 - ov, y + h * .1); c.quadraticCurveTo(x0 + w * .1, y + h * .55, x0 + w * .22, y + h * .15); c.quadraticCurveTo(x0 + w * .35, y - h * .6, x0 + w * .5, y - h * .7); c.quadraticCurveTo(x0 + w * .65, y - h * .6, x1 - w * .22, y + h * .15); c.quadraticCurveTo(x1 - w * .1, y + h * .55, x1 + ov, y + h * .1); c.quadraticCurveTo(x1 - w * .05, y - h * .1, x1 - w * .2, y - h * .1); c.lineTo(x0 + w * .2, y - h * .1); c.quadraticCurveTo(x0 + w * .05, y - h * .1, x0 - ov, y + h * .1); });
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 4; for (let k = 1; k < 18; k++) { const x = x0 + w * .2 + k * w * .6 / 18; c.beginPath(); c.moveTo(x, y - h * .62 + Math.abs(k - 9) * h * .02); c.lineTo(x + (x - (x0 + w / 2)) * .08, y - h * .12); c.stroke(); }
  blob(c, '#2a2c34', () => { c.moveTo(x0 + w * .3, y - h * .66); c.quadraticCurveTo(x0 + w * .5, y - h * .78, x0 + w * .7, y - h * .66); c.lineTo(x0 + w * .7, y - h * .58); c.quadraticCurveTo(x0 + w * .5, y - h * .7, x0 + w * .3, y - h * .58); c.closePath(); });
}
function lattice(c, x, y, w, h, lit = 0) {
  blob(c, '#7a4a2a', () => c.rect(x - 14, y - 14, w + 28, h + 28));
  c.fillStyle = lit ? lin(c, x, y, x, y + h, [[0, '#fff4cf'], [1, '#ffd88a']]) : '#f3e6c4'; c.fillRect(x, y, w, h);
  c.strokeStyle = '#7a4a2a'; c.lineWidth = 7;
  for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(x + w * k / 6, y); c.lineTo(x + w * k / 6, y + h); c.stroke(); }
  for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x, y + h * k / 5); c.lineTo(x + w, y + h * k / 5); c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(x - 14, y - 14, w + 28, h + 28);
}
function onggi(c, x, y, s, col = '#6a3a24') {
  blob(c, col, () => { c.moveTo(x - 30 * s, y - 100 * s); c.quadraticCurveTo(x - 80 * s, y - 70 * s, x - 55 * s, y); c.lineTo(x + 55 * s, y); c.quadraticCurveTo(x + 80 * s, y - 70 * s, x + 30 * s, y - 100 * s); c.closePath(); });
  blob(c, '#4a2614', () => c.ellipse(x, y - 100 * s, 34 * s, 10 * s, 0, 0, TAU));
  c.strokeStyle = 'rgba(255,230,190,.35)'; c.lineWidth = 6 * s; c.beginPath(); c.moveTo(x - 40 * s, y - 70 * s); c.quadraticCurveTo(x - 50 * s, y - 40 * s, x - 38 * s, y - 15 * s); c.stroke();
}
function peppers(c, x, y, n, t) {
  c.strokeStyle = '#7a5a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(t) * 3, y + n * 34); c.stroke();
  for (let k = 0; k < n; k++) { const yy = y + 20 + k * 34; for (const s of [-1, 1]) blob(c, '#d4282a', () => c.ellipse(x + s * 16, yy, 9, 22, s * .5, 0, TAU), 3); }
}

// —— the royal kitchen (suragan) ——
export function kitchen(c, t, o = {}) {
  c.fillStyle = lin(c, 0, -1800, 0, 0, [[0, '#d9b48a'], [1, '#f1d9b2']]); c.fillRect(-1300, -2000, 2600, 2000);
  for (const x of [-1000, -360, 360, 1000]) blob(c, '#8a5632', () => c.rect(x - 34, -2000, 68, 2000));
  for (const y of [-1650, -1180]) blob(c, '#7a4a2a', () => c.rect(-1300, y - 30, 2600, 60));
  lattice(c, 120, -1020, 400, 320, 1);
  if (o.rays !== 0) { c.save(); c.globalAlpha = .22; c.fillStyle = '#fff1c0'; c.beginPath(); c.moveTo(120, -1020); c.lineTo(520, -1020); c.lineTo(300, 0); c.lineTo(-300, 0); c.closePath(); c.fill(); c.restore(); }
  blob(c, '#8a5632', () => c.rect(-1000, -760, 620, 28));
  for (const [x, s, col] of [[-930, .8, '#6a3a24'], [-820, 1, '#7a4428'], [-690, .7, '#5a3020'], [-560, .9, '#6a3a24']]) onggi(c, x, -760, s, col);
  for (const x of [-250, 700, 860]) peppers(c, x, -1150, 7, t + x);
  // the stove (agungi) and the iron pot
  const sx = -620;
  blob(c, '#9a8a7a', () => { c.moveTo(sx - 260, 0); c.lineTo(sx - 240, -360); c.lineTo(sx + 240, -360); c.lineTo(sx + 260, 0); c.closePath(); });
  c.strokeStyle = 'rgba(42,23,18,.3)'; c.lineWidth = 4; for (let y = -320; y < 0; y += 60) { c.beginPath(); c.moveTo(sx - 250, y); c.lineTo(sx + 250, y); c.stroke(); }
  blob(c, '#2a1510', () => { c.moveTo(sx - 110, 0); c.lineTo(sx - 110, -110); c.arc(sx, -110, 110, Math.PI, 0); c.lineTo(sx + 110, 0); c.closePath(); });
  fire(c, sx, -10, 1 + (o.fire || 0), t);
  blob(c, '#1f1f24', () => c.ellipse(sx, -380, 230, 70, 0, 0, TAU));                      // pot rim
  if (!o.potGone) { blob(c, '#26262c', () => { c.moveTo(sx - 200, -390); c.quadraticCurveTo(sx, -530 - (o.lid || 0), sx + 200, -390); c.closePath(); }); blob(c, '#3a3a42', () => c.ellipse(sx, -470 - (o.lid || 0), 34, 16, 0, 0, TAU)); }
  // the work table
  blob(c, '#9a6438', () => c.rect(-180, -330, 640, 40)); for (const x of [-150, 420]) blob(c, '#7a4a2a', () => c.rect(x, -290, 30, 290));
  // the big flour jar (right)
  onggi(c, 700, 0, 1.9, '#7a4428');
  // floor
  c.fillStyle = lin(c, 0, 0, 0, 500, [[0, '#a9703e'], [1, '#7a4a26']]); c.fillRect(-1300, 0, 2600, 600);
  c.strokeStyle = 'rgba(42,23,18,.35)'; c.lineWidth = 4; for (let x = -1300; x < 1300; x += 180) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x * 1.4, 600); c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-1300, 0); c.lineTo(1300, 0); c.stroke();
}
export function fire(c, x, y, k, t) {
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = rad(c, x, y - 60, 170 * k, [[0, 'rgba(255,200,80,.9)'], [1, 'rgba(255,90,20,0)']]); c.beginPath(); c.arc(x, y - 60, 170 * k, 0, TAU); c.fill();
  c.restore();
  for (let i = 0; i < 5; i++) { const ph = t * 7 + i * 1.7, h = (70 + 30 * Math.sin(ph)) * k, xx = x + (i - 2) * 34;
    blob(c, i % 2 ? '#ffb02a' : '#ff6a1a', () => { c.moveTo(xx - 26, y); c.quadraticCurveTo(xx - 30, y - h * .5, xx + Math.sin(ph * 1.3) * 10, y - h); c.quadraticCurveTo(xx + 30, y - h * .5, xx + 26, y); c.closePath(); }, 4);
    blob(c, '#ffe27a', () => { c.moveTo(xx - 12, y); c.quadraticCurveTo(xx - 12, y - h * .3, xx, y - h * .55); c.quadraticCurveTo(xx + 12, y - h * .3, xx + 12, y); c.closePath(); }, 0); }
}

// —— palace courtyard by day ——
export function courtyard(c, t, o = {}) {
  c.fillStyle = lin(c, 0, -2200, 0, 0, [[0, '#5fb2ec'], [.7, '#bfe4fb'], [1, '#e9f6ff']]); c.fillRect(-2600, -2600, 5200, 2600);
  c.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, s] of [[-700, -1700, 1], [500, -1900, 1.3], [1300, -1600, .9], [-1500, -1500, 1.1]]) { const xx = x + t * 12; for (const [dx, dy, r] of [[0, 0, 80], [70, 10, 60], [-70, 15, 55], [30, -40, 60]]) { c.beginPath(); c.arc(xx + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); } }
  // far mountains
  c.fillStyle = '#8fbfa0'; c.beginPath(); c.moveTo(-2600, -900); for (let x = -2600; x <= 2600; x += 40) c.lineTo(x, -1000 - 180 * Math.abs(Math.sin(x * .0012 + 1)) - 60 * Math.sin(x * .004)); c.lineTo(2600, -600); c.lineTo(-2600, -600); c.fill();
  // the hall: platform, pillars, walls, dancheong, roof
  const W0 = -900, W1 = 900;
  blob(c, '#d9d2c4', () => c.rect(W0 - 120, -260, W1 - W0 + 240, 260));
  for (let k = 0; k < 6; k++) blob(c, '#cfc7b6', () => c.rect(-220, -260 + k * 43, 440, 43), 3);   // the stairs
  blob(c, '#f2e3c8', () => c.rect(W0, -900, W1 - W0, 640));
  for (let x = W0 + 100; x < W1 - 100; x += 300) lattice(c, x + 40, -760, 180, 400);
  for (let x = W0; x <= W1; x += 300) blob(c, '#c13a2e', () => c.rect(x - 28, -920, 56, 660));
  dancheong(c, W0 - 60, W1 + 60, -1000, 90);
  roof(c, W0 - 60, W1 + 60, -1020, 420);
  // pine trees at the sides
  for (const [x, s] of [[-1500, 1.2], [1550, 1]]) { blob(c, '#6a4028', () => { c.moveTo(x - 18 * s, 0); c.quadraticCurveTo(x + 40 * s, -400 * s, x - 10 * s, -800 * s); c.lineTo(x + 20 * s, -800 * s); c.quadraticCurveTo(x + 70 * s, -400 * s, x + 18 * s, 0); c.closePath(); });
    for (const [dx, dy, w] of [[-120, -780, 220], [80, -650, 200], [-60, -520, 180], [100, -900, 160]]) blob(c, '#2f7a4a', () => c.ellipse(x + dx * s, dy * s, w * s, 55 * s, -.1, 0, TAU)); }
  // stone pavement
  c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#cfc6b4'], [1, '#b0a690']]); c.fillRect(-2600, 0, 5200, 900);
  c.strokeStyle = 'rgba(42,23,18,.22)'; c.lineWidth = 4; for (let y = 60; y < 900; y += 90) { c.beginPath(); c.moveTo(-2600, y); c.lineTo(2600, y); c.stroke(); for (let x = -2600 + (y % 180); x < 2600; x += 220) { c.beginPath(); c.moveTo(x, y - 90); c.lineTo(x, y); c.stroke(); } }
  c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-2600, 0); c.lineTo(2600, 0); c.stroke();
}

// —— the throne hall ——
export function hall(c, t, o = {}) {
  c.fillStyle = lin(c, 0, -2000, 0, 0, [[0, '#7a3a24'], [1, '#c48850']]); c.fillRect(-1600, -2400, 3200, 2400);
  dancheong(c, -1600, 1600, -1850, 110);
  // the dais and the screen of the sun, moon and five peaks
  blob(c, '#8a2a22', () => c.rect(-520, -1500, 1040, 1200));
  c.save(); c.beginPath(); c.rect(-480, -1460, 960, 1120); c.clip();
  c.fillStyle = '#2a6aa8'; c.fillRect(-480, -1460, 960, 1120);
  blob(c, '#e83a2a', () => c.arc(-250, -1240, 80, 0, TAU)); blob(c, '#f4f0e0', () => c.arc(250, -1240, 72, 0, TAU));
  for (const [x, h, w] of [[-380, 520, 220], [-190, 640, 240], [0, 760, 260], [190, 640, 240], [380, 520, 220]]) blob(c, '#3a9a5a', () => { c.moveTo(x - w, -340); c.quadraticCurveTo(x - w * .3, -340 - h, x, -340 - h); c.quadraticCurveTo(x + w * .3, -340 - h, x + w, -340); c.closePath(); });
  c.strokeStyle = '#e8f4ff'; c.lineWidth = 10; for (const x of [-290, 290]) { c.beginPath(); c.moveTo(x, -820); c.quadraticCurveTo(x + 10, -600, x - 6, -400); c.stroke(); }
  c.fillStyle = '#f4f0e0'; for (let k = 0; k < 20; k++) { c.beginPath(); c.arc(-470 + k * 50, -350 + Math.sin(k * 1.3 + t * 2) * 10, 30, Math.PI, 0); c.fill(); }
  c.restore();
  c.strokeStyle = '#e7b93a'; c.lineWidth = 14; c.strokeRect(-490, -1470, 980, 1140);
  // the throne platform and steps
  blob(c, '#a8322a', () => c.rect(-600, -340, 1200, 340));
  for (let k = 0; k < 4; k++) blob(c, '#c13a2e', () => c.rect(-260 + k * 0, -340 + k * 85, 520, 85), 4);
  // red pillars
  for (const x of [-1150, -760, 760, 1150]) { blob(c, '#c13a2e', () => c.rect(x - 60, -1760, 120, 1760)); c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(x - 40, -1760, 22, 1760); }
  // lacquered floor with reflections
  c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#8a4a28'], [1, '#5a2c16']]); c.fillRect(-1600, 0, 3200, 900);
  c.globalAlpha = .18; for (const x of [-1150, -760, 760, 1150]) { c.fillStyle = '#ff6a50'; c.fillRect(x - 60, 0, 120, 500); } c.globalAlpha = 1;
  c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-1600, 0); c.lineTo(1600, 0); c.stroke();
}

// —— the courtyard at night, lanterns and fireworks ——
export function night(c, t, o = {}) {
  c.fillStyle = lin(c, 0, -2400, 0, 0, [[0, '#0c1236'], [.7, '#2a2a6a'], [1, '#5a3a6a']]); c.fillRect(-2600, -2800, 5200, 2800);
  const r = R(5); c.fillStyle = '#fff'; for (let i = 0; i < 160; i++) { const x = (r() - .5) * 5200, y = -2600 + r() * 1700; c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); c.fillRect(x, y, 4, 4); } c.globalAlpha = 1;
  // fireworks
  for (const [x, y, t0, col] of (o.fw || [])) firework(c, x, y, t - t0, col);
  c.fillStyle = '#141433'; c.beginPath(); c.moveTo(-2600, -900); for (let x = -2600; x <= 2600; x += 40) c.lineTo(x, -1000 - 160 * Math.abs(Math.sin(x * .0012 + 1))); c.lineTo(2600, -600); c.lineTo(-2600, -600); c.fill();
  blob(c, '#4a3a4a', () => c.rect(-1020, -260, 2040, 260));
  blob(c, '#6a3a3a', () => c.rect(-900, -900, 1800, 640));
  for (let x = -800; x < 800; x += 300) { lattice(c, x + 40, -760, 180, 400, 1); }
  dancheong(c, -960, 960, -1000, 90); roof(c, -960, 960, -1020, 420, '#22243a');
  // a string of lanterns across the frame
  for (const row of [[-1100, -1250, 1100, -1200], [-1300, -620, 1300, -660]]) {
    const [x0, y0, x1, y1] = row; c.strokeStyle = '#2a1712'; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 + 160, x1, y1); c.stroke();
    for (let k = 1; k < 10; k++) { const u = k / 10, x = lerp(x0, x1, u), y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (y0 + 160) + u * u * y1; lantern(c, x, y + 10, k % 3, t + k); } }
  c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#4a3a4a'], [1, '#2a2030']]); c.fillRect(-2600, 0, 5200, 900);
  c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(-2600, 0); c.lineTo(2600, 0); c.stroke();
}
function lantern(c, x, y, k, t) {
  const col = ['#e8402a', '#f0a030', '#e85a8a'][k], sw = Math.sin(t * 1.3) * .06;
  c.save(); c.translate(x, y); c.rotate(sw);
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 0, 50, 150, [[0, 'rgba(255,190,90,.5)'], [1, 'rgba(255,120,40,0)']]); c.beginPath(); c.arc(0, 50, 150, 0, TAU); c.fill(); c.restore();
  blob(c, col, () => c.ellipse(0, 50, 46, 56, 0, 0, TAU), 4);
  c.fillStyle = 'rgba(255,240,180,.55)'; c.beginPath(); c.ellipse(-8, 44, 20, 34, 0, 0, TAU); c.fill();
  blob(c, '#2a1712', () => c.rect(-22, -8, 44, 10), 0); blob(c, '#2a1712', () => c.rect(-22, 102, 44, 10), 0);
  c.strokeStyle = '#f3d24a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 112); c.lineTo(0, 150); c.stroke();
  c.restore();
}
export function firework(c, x, y, u, col) {
  if (u < 0 || u > 2.2) return;
  if (u < .5) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y + (1 - u / .5) * 600, 6, 0, TAU); c.fill(); return; }
  const v = u - .5, r = 260 * (1 - Math.exp(-v * 3)), a = clamp(1 - v / 1.7);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 7; c.lineCap = 'round';
  for (let k = 0; k < 18; k++) { const th = k / 18 * TAU; c.beginPath(); c.moveTo(x + Math.cos(th) * r * .6, y + Math.sin(th) * r * .6 + v * v * 30); c.lineTo(x + Math.cos(th) * r, y + Math.sin(th) * r + v * v * 40); c.stroke(); }
  c.restore();
}

// —— props ——
// mandu: kind 'raw' | 'burnt' | 'kimchi' | 'batata' | 'mel'
const MCOL = { raw: '#fbf3e2', burnt: '#2a2220', kimchi: '#e85a3a', batata: '#f0a040', mel: '#f2c84a' };
export function mandu(c, x, y, s = 1, kind = 'raw', t = 0, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  blob(c, MCOL[kind], () => { c.moveTo(-46, 10); c.quadraticCurveTo(-50, -34, 0, -40); c.quadraticCurveTo(50, -34, 46, 10); c.quadraticCurveTo(0, 22, -46, 10); }, 5);
  c.strokeStyle = kind === 'burnt' ? '#5a4a44' : 'rgba(42,23,18,.5)'; c.lineWidth = 4; for (const k of [-.5, -.17, .17, .5]) { c.beginPath(); c.moveTo(k * 60, -30 - Math.abs(k) * 4); c.quadraticCurveTo(k * 60 + 6, -15, k * 66, 4); c.stroke(); }
  if (kind !== 'burnt') { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-18, -18, 12, 7, -.4, 0, TAU); c.fill(); }
  else { c.save(); c.globalAlpha = .6; c.fillStyle = '#9a9a9a'; for (let i = 0; i < 3; i++) { const u = (t * .7 + i / 3) % 1; c.beginPath(); c.arc(-10 + i * 10 + Math.sin(u * 6 + i) * 10, -50 - u * 90, 10 + u * 16, 0, TAU); c.fill(); } c.restore(); }
  c.restore();
}
export function tray(c, x, y, s = 1, items = [], t = 0, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  blob(c, '#a8683a', () => c.ellipse(0, 0, 170, 36, 0, 0, TAU)); blob(c, '#c88a50', () => c.ellipse(0, -8, 150, 26, 0, 0, TAU), 3);
  items.forEach((k, i) => { const n = items.length, xx = (i - (n - 1) / 2) * Math.min(64, 260 / n), yy = -16 - (i % 2) * 10; mandu(c, xx, yy, .7, k, t + i); });
  c.restore();
}
export function bowl(c, x, y, s = 1, fill = '#d8a070') {
  c.save(); c.translate(x, y); c.scale(s, s);
  blob(c, fill, () => c.ellipse(0, -40, 92, 22, 0, 0, TAU), 4);
  blob(c, '#f2ead8', () => { c.moveTo(-100, -40); c.quadraticCurveTo(-90, 20, 0, 22); c.quadraticCurveTo(90, 20, 100, -40); c.closePath(); });
  c.strokeStyle = '#3a6aa8'; c.lineWidth = 6; c.beginPath(); c.moveTo(-80, -10); c.quadraticCurveTo(0, 8, 80, -10); c.stroke();
  c.restore();
}
export function dough(c, x, y, s = 1, sq = 1) { c.save(); c.translate(x, y); c.scale(s / Math.sqrt(sq), s * sq); blob(c, '#fbf3e2', () => c.ellipse(0, -40, 80, 42, 0, 0, TAU)); c.restore(); }

// —— comic FX ——
export function puff(c, x, y, r, a = 1, col = '#e8e2d8') { c.save(); c.globalAlpha = a; for (const [dx, dy, k] of [[0, 0, 1], [r * .7, r * .2, .7], [-r * .7, r * .25, .75], [r * .3, -r * .5, .7], [-r * .35, -r * .45, .6]]) blob(c, col, () => c.arc(x + dx, y + dy, r * k, 0, TAU), 4); c.restore(); }
export function boom(c, x, y, k, t) {   // explosion: star burst + puffs
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k);
  blob(c, '#ffd23a', () => { for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = i % 2 ? 160 : 300; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); });
  blob(c, '#ff7a2a', () => { for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU + .2, r = i % 2 ? 90 : 180; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); });
  c.restore();
}
export function speedLines(c, cx, cy, a, t, col = 'rgba(255,255,255,.75)') {   // radial manga speed lines (screen space)
  if (a <= 0) return; const r = R(Math.floor(t * 12)); c.save(); c.globalAlpha = a; c.fillStyle = col;
  for (let i = 0; i < 70; i++) { const th = r() * TAU, w = .006 + r() * .01, r0 = 420 + r() * 300; c.beginPath(); c.moveTo(cx + Math.cos(th) * 1600, cy + Math.sin(th) * 1600); c.lineTo(cx + Math.cos(th + w) * r0, cy + Math.sin(th + w) * r0); c.lineTo(cx + Math.cos(th - w) * r0, cy + Math.sin(th - w) * r0); c.closePath(); c.fill(); }
  c.restore();
}
export function sparkles(c, x, y, r, t, n = 6, col = '#ffe46a') {
  for (let i = 0; i < n; i++) { const a = i / n * TAU + t * .8, k = .5 + .5 * Math.sin(t * 6 + i * 2), xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r * .7, s = 18 + 16 * k;
    blob(c, col, () => { c.moveTo(xx, yy - s); c.quadraticCurveTo(xx, yy, xx + s, yy); c.quadraticCurveTo(xx, yy, xx, yy + s); c.quadraticCurveTo(xx, yy, xx - s, yy); c.quadraticCurveTo(xx, yy, xx, yy - s); }, 3); }
}
export function word(c, s, x, y, size, k, col = '#ffe23a', rot = -.08) {   // onomatopoeia
  if (k <= 0) return; c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k);
  c.font = `${size}px "Lilita One"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = size * .22; c.strokeStyle = INK; c.strokeText(s, 0, 0); c.fillStyle = col; c.fillText(s, 0, 0);
  c.restore();
}
export const SCENES = { kitchen, courtyard, hall, night };
