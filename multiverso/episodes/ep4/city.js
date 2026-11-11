// city.js (EP4 only): a Brazilian street at dusk — padaria, boteco, sobrados, lamp posts, a street in perspective.
import { W, H, TAU, hash, clamp } from '../../lib/core.js';
import { INK, ellipse as ell, rrect as rr, poly as line } from '../../lib/chars.js';

export const HORIZON = 1060, GROUND = 1390;
export function duskSky(g, t, red = 0) {
  const gr = g.createLinearGradient(0, -300, 0, HORIZON);
  gr.addColorStop(0, '#2a1046'); gr.addColorStop(.55, red > 0 ? '#a0284a' : '#8a3a78'); gr.addColorStop(1, '#ff9a4a');
  g.fillStyle = gr; g.fillRect(-500, -500, W + 1000, HORIZON + 500);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${.3 + hash(i, 3) * .5})`; g.fillRect(-400 + hash(i, 1) * (W + 800), -400 + hash(i, 2) * 900, 3, 3); }
}
// o.noFront: skip the shop fronts layer; o.signFaint: the hot-dog sign gag; o.lights: lamp glow
export function street(g, t, o = {}) {
  // far skyline
  for (let i = 0; i < 16; i++) { const x = -400 + i * 120, h = 180 + hash(i, 7) * 260; g.fillStyle = '#4a2a5a'; g.fillRect(x, HORIZON - h, 110, h + 20);
    for (let j = 0; j < 6; j++) if (hash(i, j + 20) > .45) { g.fillStyle = '#ffd77a'; g.fillRect(x + 14 + (j % 3) * 32, HORIZON - h + 24 + Math.floor(j / 3) * 50, 16, 22); } }
  // asphalt in perspective + sidewalks
  g.fillStyle = '#3b3848'; g.fillRect(-500, HORIZON, W + 1000, 1400);
  g.fillStyle = '#9a8f86'; g.beginPath(); g.moveTo(-500, GROUND + 40); g.lineTo(380, HORIZON); g.lineTo(-500, HORIZON); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(W + 500, GROUND + 40); g.lineTo(700, HORIZON); g.lineTo(W + 500, HORIZON); g.closePath(); g.fill();
  for (let k = 0; k < 9; k++) { const z = 1 + k * 1.4 - ((t * 1.2) % 1.4) * 0, y = HORIZON + 900 / z * .6, h = 70 / z, w = 18 / z * 3; g.fillStyle = '#f2d24a'; g.fillRect(540 - w / 2, y, w, h); }
  // left: padaria + sobrado ; right: boteco + farmácia
  shop(g, -140, 560, 420, '#f4c95d', 'PADARIA', 'PÃO DE OURO', '#b5542a', t);
  shop(g, 760, 600, 420, '#5db0f4', 'BOTECO', 'DO TONHO', '#2a4fb5', t);
  // the boteco's chalkboard
  rr(g, 800, 1150, 150, 190, 8, '#1f2b22', 7);
  if (o.signFaint) { g.save(); g.translate(875, 1245); g.rotate(-.05); g.fillStyle = '#fff'; g.font = '400 30px Bangers'; g.textAlign = 'center'; g.fillText('HOJE:', 0, -55); g.fillStyle = '#ffd21f'; g.fillText('CACHORRO', 0, -20); g.fillText('QUENTE', 0, 12); g.fillStyle = '#ff7a7a'; g.fillText('2 x R$ 5', 0, 50); g.restore(); }
  // lamp posts
  for (const [x, s] of [[300, .8], [790, .8], [80, 1.1], [1010, 1.1]]) lamp(g, x, s < 1 ? HORIZON + 140 : GROUND + 20, s, o.lights ?? 1);
}
function shop(g, x, y, w, color, sign, sub, awning, t) {
  const h = GROUND - y;
  rr(g, x, y, w, h + 20, 6, color);
  for (let i = 0; i < 3; i++) rr(g, x + 30 + i * (w - 60) / 3, y + 30, (w - 60) / 3 - 20, 120, 6, '#ffe7a0', 6);   // upstairs windows
  // sign
  rr(g, x + 20, y + 180, w - 40, 110, 14, '#fff8e6', 7);
  g.fillStyle = awning; g.font = '400 64px Bangers'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sign, x + w / 2, y + 222);
  g.font = '900 28px Nunito'; g.fillStyle = INK; g.fillText(sub, x + w / 2, y + 268);
  // striped awning
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : awning; g.beginPath(); const ax = x + i * w / 8; g.moveTo(ax, y + 310); g.lineTo(ax + w / 8, y + 310); g.lineTo(ax + w / 8 + 6, y + 380); g.lineTo(ax + 6, y + 380); g.closePath(); g.fill(); }
  line(g, [x, y + 310, x + w, y + 310], 7, INK);
  for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(x + 6 + i * w / 8 + w / 16, y + 380, w / 16, 0, Math.PI); g.fillStyle = i % 2 ? '#fff' : awning; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); }
  // shop window (dark interior)
  rr(g, x + 30, y + 420, w - 60, h - 440, 8, '#2a1f3a', 7);
  g.fillStyle = 'rgba(255,220,140,.25)'; g.fillRect(x + 34, y + 424, w - 68, h - 448);
}
function lamp(g, x, y, s, on) {
  g.save(); g.translate(x, y); g.scale(s, s);
  line(g, [0, 0, 0, -520, 60, -560], 12, '#2a2a36');
  ell(g, 70, -556, 34, 18, '#ffe9a0', 6);
  if (on) { const gr = g.createRadialGradient(70, -540, 10, 70, -540, 260); gr.addColorStop(0, `rgba(255,230,150,${.45 * on})`); gr.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gr; g.fillRect(-200, -800, 540, 560); }
  g.restore();
}
