// Shared helpers and props for the episodes.
import { clamp, seg, lerp, back, TAU } from './lib.js';
import { INK, blob, ink, lw, word } from './toon.js';
export const E0 = () => ({ eye: 'open', lid: 0, look: [0, 0], pupil: 1, brow: 0, browY: 0, open: 0, mouth: 'flat', curl: 0, sweat: 0, shake: 0 });
export const show = (P, o) => { const e = o.E; Object.assign(P, { vis: 1 }, o); P.E = Object.assign(E0(), e || {}); return P; };
export const arc = (u, x0, y0, x1, y1, h) => [lerp(x0, x1, u), lerp(y0, y1, u) - h * 4 * u * (1 - u)];
export const walkPh = (x, stride = 150) => x / stride * Math.PI;
export const land = (u, a, amt = .25) => u < a ? 1 : 1 - amt * Math.exp(-(u - a) * 7) * Math.cos((u - a) * 22);   // squash on landing

// —— props ——
export function plunger(c, x, y, a, t) {   // desentupidor held at (x,y), pointing along a
  c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2);
  blob(c, '#c8945a', () => c.roundRect(-9, -20, 18, 230, 8)); blob(c, '#c8282a', () => { c.moveTo(-55, 230); c.quadraticCurveTo(0, 170, 55, 230); c.quadraticCurveTo(0, 260, -55, 230); });
  c.restore();
}
export function phone(c, x, y, a, t, flash = 0) {
  c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2); blob(c, '#2a2a30', () => c.roundRect(-30, -10, 60, 100, 10)); blob(c, '#9ad8ff', () => c.rect(-22, 0, 44, 70), { line: 3 });
  if (flash > 0) { c.globalAlpha = flash; blob(c, '#fff', () => { for (let k = 0; k < 16; k++) { const aa = k / 16 * TAU, r = k % 2 ? 60 : 160; k ? c.lineTo(Math.cos(aa) * r, 100 + Math.sin(aa) * r) : c.moveTo(Math.cos(aa) * r, 100 + Math.sin(aa) * r); } c.closePath(); }, { line: 0 }); }
  c.restore();
}
export function money(c, x, y, r, t) { c.save(); c.translate(x, y); c.rotate(r); blob(c, '#6ac86a', () => c.rect(-40, -20, 80, 40), { line: 4 }); word(c, 'R$', 0, 0, 22, 1, '#2a6a2a', 0, 'Fredoka'); c.restore(); }

