// fx.js: 2D effects shared by all episodes: comic onomatopoeia, transitions, particles, title cards, achievement pop-ups.
import { W, H, TAU, clamp, prog, ease, hash, noise, lerp } from './core.js';
import { INK } from './chars.js';

// camera: apply a 2D camera (centre cx, cy, zoom z, rotation r, shake [sx, sy]) to g
export function cam(g, { x = W / 2, y = H / 2, z = 1, r = 0, sx = 0, sy = 0 } = {}) {
  g.translate(W / 2 + sx, H / 2 + sy); g.rotate(r); g.scale(z, z); g.translate(-x, -y);
}
// big comic word ("PLOFT!") with a starburst, popping in at lt=0, gone after d
export function comic(g, text, x, y, lt, { size = 140, color = '#FFD21F', d = 1.1, rot = -.12, burst = '#ff3b5c' } = {}) {
  if (lt < 0 || lt > d) return;
  const k = ease.outBack(prog(lt, 0, .18), 3), out = prog(lt, d - .2, d);
  g.save(); g.translate(x, y); g.rotate(rot + Math.sin(lt * 20) * .02); g.scale(k * (1 + out * .3), k * (1 + out * .3)); g.globalAlpha = 1 - out;
  if (burst) { g.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, r = (i % 2 ? .55 : 1) * size * 1.6 * (1 + hash(i, 3) * .2); g.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); } g.closePath(); g.fillStyle = burst; g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); }
  g.font = `400 ${size}px Bangers`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size * .16; g.strokeStyle = INK; g.strokeText(text, 0, 0); g.fillStyle = color; g.fillText(text, 0, 0);
  g.restore();
}
// transitions drawn over the incoming shot during its first d seconds
export function flash(g, lt, d = .35, color = '#ffffff') { if (lt < d) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 - lt / d; g.fillStyle = color; g.fillRect(0, 0, W, H); g.restore(); } }
export function iris(g, lt, d = .5, cx = W / 2, cy = H / 2, close = false) {
  let k = prog(lt, 0, d); if (close) k = 1 - k; if (k >= 1) return; const r = ease.inOutCubic ? 0 : 0;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, Math.max(1, ease.io(k) * 1300), 0, TAU, true); g.fillStyle = '#0a0612'; g.fill(); g.restore();
}
export function irisOut(g, lt, t0, d = .5, cx = W / 2, cy = H / 2) {   // closing iris starting at t0
  if (lt < t0) return; const k = 1 - prog(lt, t0, t0 + d);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, Math.max(.1, ease.io(k) * 1300), 0, TAU, true); g.fillStyle = '#0a0612'; g.fill(); g.restore();
}
export function whip(g, lt, d = .3, dir = 1) {   // motion-blur streaks
  if (lt > d) return; const k = 1 - lt / d;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = k * .85;
  for (let i = 0; i < 26; i++) { const y = hash(i, 4) * H, h = 10 + hash(i, 5) * 60; g.fillStyle = i % 3 ? '#ffffff' : '#FFD21F'; g.fillRect(0, y, W, h * k); }
  g.restore();
}
export function vignette(g, a = .45) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}
export function letterbox(g, k) { if (k <= 0) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, 220 * k); g.fillRect(0, H - 220 * k, W, 220 * k); g.restore(); }
// burst of particles from (x, y) at time lt (deterministic: every particle is a closed-form ballistic arc)
export function burst(g, lt, x, y, { n = 60, speed = 900, g: grav = 1600, life = 1.4, seed = 1, colors = ['#FFD21F', '#ff3b5c', '#fff'], size = 14, shape = 'circle', spin = 1 } = {}) {
  if (lt < 0 || lt > life) return;
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed) * TAU, v = speed * (.3 + .7 * hash(i, seed + 1)), vx = Math.cos(a) * v, vy = Math.sin(a) * v - speed * .3;
    const px = x + vx * lt, py = y + vy * lt + .5 * grav * lt * lt, k = lt / life, sz = size * (.5 + hash(i, seed + 2)) * (1 - k * .6);
    g.save(); g.translate(px, py); g.rotate(lt * spin * (hash(i, seed + 3) * 10 - 5)); g.globalAlpha = 1 - k * k; g.fillStyle = colors[i % colors.length];
    if (shape === 'circle') { g.beginPath(); g.arc(0, 0, sz, 0, TAU); g.fill(); }
    else if (shape === 'rect') g.fillRect(-sz, -sz * .6, sz * 2, sz * 1.2);
    else if (shape === 'star') { g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? sz * .45 : sz; g.lineTo(Math.cos(j / 10 * TAU) * r, Math.sin(j / 10 * TAU) * r); } g.fill(); }
    else if (typeof shape === 'function') shape(g, sz, i);
    g.restore();
  }
}
// on-screen title (episode name), slides in and out
export function titleCard(g, t, ep, title, t0 = .2, d = 3.2) {
  const k = ease.outBack(prog(t, t0, t0 + .5)), o = prog(t, t0 + d - .4, t0 + d);
  if (t < t0 || o >= 1) return;
  g.save(); g.translate(W / 2 - (1 - k) * 1200 - o * 1400, 230);
  g.rotate(-.04);
  g.fillStyle = '#140c1c'; g.beginPath(); g.roundRect(-470, -110, 940, 210, 30); g.fill();
  g.fillStyle = '#7B3FE4'; g.beginPath(); g.roundRect(-458, -98, 916, 186, 24); g.fill();
  g.font = '400 50px Bangers'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5CF2FF';
  g.fillText('O MULTIVERSO DA BURRICE', 0, -52);
  g.font = '900 30px Nunito'; g.fillStyle = '#FFD21F'; g.fillText('EPISÓDIO ' + ep, 0, -8);
  g.font = '400 58px Bangers'; g.lineWidth = 10; g.strokeStyle = '#140c1c'; g.lineJoin = 'round'; g.strokeText(title, 0, 46); g.fillStyle = '#fff'; g.fillText(title, 0, 46);
  g.restore();
}
// a game-style "achievement unlocked" toast
export function achievement(g, lt, title, sub, { y = 380, d = 3.6, icon = '☢' } = {}) {
  if (lt < 0 || lt > d) return;
  const k = ease.outBack(prog(lt, 0, .4)), o = ease.inQ(prog(lt, d - .35, d));
  g.save(); g.translate(W / 2, y - o * 300); g.scale(k, k); g.globalAlpha = 1 - o;
  const gr = g.createLinearGradient(-430, 0, 430, 0); gr.addColorStop(0, '#2a0b4a'); gr.addColorStop(1, '#1a0630');
  g.fillStyle = gr; g.strokeStyle = '#FFD21F'; g.lineWidth = 8; g.beginPath(); g.roundRect(-440, -90, 880, 180, 90); g.fill(); g.stroke();
  g.fillStyle = '#FFD21F'; g.beginPath(); g.arc(-350, 0, 66, 0, TAU); g.fill();
  g.fillStyle = '#2a0b4a'; g.font = '900 76px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, -350, 6);
  g.textAlign = 'left'; g.fillStyle = '#FFD21F'; g.font = '900 30px Nunito'; g.fillText('CONQUISTA DESBLOQUEADA', -260, -34);
  g.fillStyle = '#ffffff'; g.font = '400 54px Bangers'; g.fillText(title, -260, 16);
  g.fillStyle = '#c9b6ff'; g.font = '700 26px Nunito'; g.fillText(sub, -260, 58);
  // shine sweep
  g.save(); g.beginPath(); g.roundRect(-440, -90, 880, 180, 90); g.clip(); const sx = -600 + ((lt * 900) % 1600); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(sx, -100); g.lineTo(sx + 80, -100); g.lineTo(sx - 20, 100); g.lineTo(sx - 100, 100); g.fill(); g.restore();
  g.restore();
}
export function crickets(g, lt, x = W - 170, y = 300) {   // the awkward-silence marker
  if (lt < 0) return; const a = clamp(lt * 3) * (.75 + .25 * Math.sin(lt * 30));
  g.save(); g.globalAlpha = a; g.font = '900 64px Nunito'; g.fillStyle = '#fff'; g.textAlign = 'center';
  g.lineWidth = 12; g.strokeStyle = INK; g.strokeText('cri... cri...', x, y + Math.sin(lt * 8) * 6); g.fillText('cri... cri...', x, y + Math.sin(lt * 8) * 6); g.restore();
}
export function halftone(g, x, y, w, h, color = 'rgba(0,0,0,.12)', step = 22) {
  g.save(); g.fillStyle = color; for (let j = 0; j < h / step; j++) for (let i = 0; i < w / step; i++) { g.beginPath(); g.arc(x + i * step + (j % 2) * step / 2, y + j * step, step * .28, 0, TAU); g.fill(); } g.restore();
}
export function radial(g, cx, cy, t, c1 = '#ffe066', c2 = '#ffb703', n = 18) {   // rotating sunburst background
  g.save(); g.translate(cx, cy); g.rotate(t * .3); g.fillStyle = c2; g.fillRect(-2000, -2000, 4000, 4000); g.fillStyle = c1;
  for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 2600, i / n * TAU, (i + .5) / n * TAU); g.closePath(); g.fill(); }
  g.restore();
}
export function text(g, s, x, y, { size = 80, color = '#fff', font = 'Bangers', weight = 400, stroke = 12, align = 'center', alpha = 1, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha; g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = stroke; g.strokeStyle = INK; g.strokeText(s, 0, 0); } g.fillStyle = color; g.fillText(s, 0, 0); g.restore();
}
