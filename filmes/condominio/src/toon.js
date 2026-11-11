// Toon kit: constant screen-space ink, hard-edged shadows, noodle limbs, sitcom eyes and elastic mouths.
import { TAU, clamp, lerp } from './lib.js';
export const INK = '#1e1028';
export const scaleOf = c => { const m = c.getTransform(); return Math.hypot(m.a, m.b) || 1; };
export const lw = (c, px) => px / scaleOf(c);                    // a width in screen pixels, whatever the zoom
export function ink(c, px = 7) { c.lineWidth = lw(c, px); c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
// a filled shape with a hard shadow on the side away from the upper-left light
export function blob(c, fill, path, o = {}) {
  c.beginPath(); path(); c.fillStyle = fill; c.fill();
  if (o.sh) { c.save(); c.clip(); c.fillStyle = o.shade || shade(fill, .78); c.fillRect(-1e4, -1e4, 2e4, 2e4); c.translate(-o.sh, -o.sh * .8); c.beginPath(); path(); c.fillStyle = fill; c.fill(); c.restore(); c.beginPath(); path(); }
  if (o.line !== 0) ink(c, o.line || 7);
}
export function shade(hex, k = .78) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * k | 0, g = (n >> 8 & 255) * k | 0, b = (n & 255) * k | 0; return `rgb(${r},${g},${b})`; }
// a noodle limb: shoulder → hand through a soft bend; a: 0 down, π/2 forward, π up; b: bend
export function noodle(c, sx, sy, a, b, len, w, col) {
  const l1 = len * .5, [d1x, d1y] = [Math.sin(a), Math.cos(a)], ex = sx + d1x * l1, ey = sy + d1y * l1, [d2x, d2y] = [Math.sin(a + b), Math.cos(a + b)], hx = ex + d2x * l1, hy = ey + d2y * l1;
  const cx = 2 * ex - (sx + hx) / 2, cy = 2 * ey - (sy + hy) / 2;
  c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(cx, cy, hx, hy);
  c.lineCap = 'round'; c.lineWidth = w + lw(c, 14); c.strokeStyle = INK; c.stroke(); c.lineWidth = w; c.strokeStyle = col; c.stroke();
  return [hx, hy, Math.atan2(d2y, d2x)];
}
export function hand(c, x, y, r, col, ang = 0, open = 0) {   // a cartoon mitt with a thumb
  c.save(); c.translate(x, y); c.rotate(ang - Math.PI / 2);
  blob(c, col, () => { c.ellipse(0, r * .2, r, r * 1.05, 0, 0, TAU); });
  blob(c, col, () => c.ellipse(-r * .85, -r * .1, r * .38, r * .55, -.5 - open, 0, TAU));
  c.restore();
}
// eyes: big whites (touching in 3/4), tiny pupils, heavy lids, bags. E: { eye:'open|closed|happy|x|wide|angry|spiral', lid 0..1, look [x,y], pupil (scale), bags, shake }
export function eyes(c, R, E, o = {}) {
  const w = R * (o.ew || .36), h = R * (o.eh || .44), gap = w * .98, y = o.y || -R * .08, t = o.t || 0;
  const kind = E.eye || 'open', jit = (E.shake || 0) * Math.sin(t * 71) * R * .02;
  for (const s of [-1, 1]) {
    const x = s * gap + (o.dx || 0) + jit;
    c.save(); c.translate(x, y);
    if (kind === 'closed' || kind === 'happy') {
      c.beginPath(); if (kind === 'happy') c.arc(0, h * .3, w * .8, Math.PI * 1.12, Math.PI * 1.88); else { c.moveTo(-w * .85, 0); c.quadraticCurveTo(0, h * .3, w * .85, 0); } ink(c, 7);
    } else {
      const k = kind === 'wide' ? 1.25 : 1;
      c.beginPath(); c.ellipse(0, 0, w * k, h * k, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); ink(c, 6);
      if (kind === 'x') { c.beginPath(); c.moveTo(-w * .5, -h * .4); c.lineTo(w * .5, h * .4); c.moveTo(w * .5, -h * .4); c.lineTo(-w * .5, h * .4); ink(c, 7); }
      else if (kind === 'spiral') { c.beginPath(); for (let i = 0; i < 50; i++) { const a = i * .38 + t * 9, r = i / 50 * w * .8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * h / w); } ink(c, 4); }
      else {
        const pr = R * .055 * (E.pupil ?? 1) * (kind === 'wide' ? .8 : 1), lk = E.look || [0, 0];
        c.fillStyle = E.red ? '#d0202a' : INK; c.beginPath(); c.arc(lk[0] * w * .55 + (E.cross ? -s * w * .35 : 0), lk[1] * h * .55, pr, 0, TAU); c.fill();
        const lid = clamp(E.lid ?? 0) * (kind === 'wide' ? 0 : 1);
        if (lid > 0 || kind === 'angry') {   // a lid in skin colour from the top; angry = slanted toward the nose
          c.save(); c.beginPath(); c.ellipse(0, 0, w * k, h * k, 0, 0, TAU); c.clip();
          const tilt = kind === 'angry' ? s * -.45 : (E.sad ? s * .35 : 0), ly = -h + 2 * h * Math.max(lid, kind === 'angry' ? .35 : 0);
          c.beginPath(); c.save(); c.rotate(tilt); c.rect(-w * 2, -h * 3, w * 4, h * 3 + ly); c.restore(); c.fillStyle = o.skin || '#e8b48a'; c.fill();
          c.beginPath(); c.save(); c.rotate(tilt); c.moveTo(-w * 2, ly); c.lineTo(w * 2, ly); c.restore(); ink(c, 6); c.restore();
        }
      }
    }
    if (E.bags ?? o.bags) { c.beginPath(); c.arc(0, h * .55, w * .75, Math.PI * .2, Math.PI * .8); ink(c, 3.5); }
    c.restore();
  }
}
// elastic mouth: open 0..1, width, curl (−1 frown … +1 smile), teeth, tongue; shape 'scream' stretches tall
export function mouth(c, x, y, R, E, o = {}) {
  const open = clamp(E.open || 0), curl = E.curl ?? (E.mouth === 'smile' || E.mouth === 'grin' ? .8 : E.mouth === 'frown' ? -.7 : 0), wd = R * (o.w || .42) * (E.mouth === 'grin' ? 1.25 : 1) * (E.mouth === 'o' ? .45 : 1);
  const hgt = R * (E.mouth === 'scream' ? .55 + .5 * open : E.mouth === 'o' ? .18 + .25 * open : .04 + .42 * open);
  c.save(); c.translate(x, y); if (E.skew) c.rotate(E.skew);
  if (open < .06 && E.mouth !== 'scream' && E.mouth !== 'o' && E.mouth !== 'grin') {
    c.beginPath(); c.moveTo(-wd, -curl * R * .08); c.quadraticCurveTo(0, curl * R * .2, wd, -curl * R * .08 + (E.smirk ? -R * .1 : 0)); ink(c, 7);
  } else {
    c.beginPath();
    if (E.mouth === 'grin') { c.moveTo(-wd, -R * .05); c.quadraticCurveTo(0, R * .02, wd, -R * .05); c.quadraticCurveTo(wd * .7, R * .5 * (.6 + open), 0, R * .5 * (.6 + open)); c.quadraticCurveTo(-wd * .7, R * .5 * (.6 + open), -wd, -R * .05); }
    else { c.moveTo(-wd, -curl * R * .06); c.quadraticCurveTo(0, -hgt * .45 + curl * R * .1, wd, -curl * R * .06); c.quadraticCurveTo(wd * .8, hgt, 0, hgt * 1.05); c.quadraticCurveTo(-wd * .8, hgt, -wd, -curl * R * .06); }
    c.fillStyle = '#5a1020'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#e45a6a'; c.beginPath(); c.ellipse(0, hgt * 1.0, wd * .65, hgt * .5 + R * .05, 0, 0, TAU); c.fill();
    if (o.teeth !== false) { c.fillStyle = '#fff'; c.fillRect(-wd, -R * .2, wd * 2, R * .2 + hgt * .12 + R * .02); if (o.gap) { c.fillStyle = '#5a1020'; c.fillRect(-R * .03, -R * .2, R * .06, R * .3); } }
    c.restore(); c.beginPath();
    if (E.mouth === 'grin') { c.moveTo(-wd, -R * .05); c.quadraticCurveTo(0, R * .02, wd, -R * .05); c.quadraticCurveTo(wd * .7, R * .5 * (.6 + open), 0, R * .5 * (.6 + open)); c.quadraticCurveTo(-wd * .7, R * .5 * (.6 + open), -wd, -R * .05); }
    else { c.moveTo(-wd, -curl * R * .06); c.quadraticCurveTo(0, -hgt * .45 + curl * R * .1, wd, -curl * R * .06); c.quadraticCurveTo(wd * .8, hgt, 0, hgt * 1.05); c.quadraticCurveTo(-wd * .8, hgt, -wd, -curl * R * .06); }
    ink(c, 7);
  }
  c.restore();
}
export function brows(c, R, E, o = {}) {   // brow: −1 angry … +1 worried; browY raises
  const w = R * .3, y = (o.y || -R * .62) - (E.browY || 0) * R * .15, gap = R * .36 * .98 + (o.dx || 0);
  const b = E.brow || 0;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * (gap - w * .9) + (o.dx2 || 0), y - b * R * .12); c.lineTo(s * (gap + w * .9) + (o.dx2 || 0), y + b * R * .12);
    c.lineWidth = lw(c, o.wpx || 9); c.strokeStyle = o.col || INK; c.lineCap = 'round'; c.stroke(); }
}
export function sweat(c, x, y, r, k = 1) { if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); blob(c, '#9fd8ff', () => { c.moveTo(0, -r * 1.6); c.quadraticCurveTo(r, 0, 0, r); c.quadraticCurveTo(-r, 0, 0, -r * 1.6); }); c.restore(); }
export function word(c, s, x, y, size, k, col = '#ffe23a', rot = -.08, font = '"Lilita One"') {
  if (k <= 0) return; c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k);
  c.font = `${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = size * .22; c.strokeStyle = INK; c.strokeText(s, 0, 0); c.fillStyle = col; c.fillText(s, 0, 0); c.restore();
}
