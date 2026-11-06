// common.js: the page plumbing shared by the three parts: word times, the balance panel, the phone screens,
// the contract, the shot table and the seek loop.
import * as S from '../../engine/stage.js';
const { clamp, lerp, ease, spring } = S;
export function words(T) {
  const w = (li, word, n = 0) => { const b = s => s.toLowerCase().replace(/[^\p{L}0-9:]/gu, ''); let k = 0; for (const x of T.lines[li].words) if (b(x.w) === b(word) && k++ === n) return x.s; throw new Error(`word "${word}" not in line ${li}`); };
  const L0 = li => T.lines[li].words[0].s;
  return { w, L0 };
}
// keyed values: [[t, v], ...]; each value lands on its time (eased over 0.35 s before it)
export function keyed(K, t, d = 0.35) { let v = K[0][1]; for (let i = 1; i < K.length; i++) { const [tk, vk] = K[i]; if (t >= tk - d) v = lerp(K[i - 1][1], vk, ease((t - tk + d) / d)); } return v; }
const brl = v => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export { brl };
export function balance(c, v, t) {
  const x = 640, y = 120, wd = 400, ht = 108, neg = v < 0;
  c.save(); c.fillStyle = 'rgba(8,9,12,0.62)'; c.beginPath(); c.roundRect(x, y, wd, ht, 18); c.fill();
  c.font = '700 30px "JetBrains Mono"'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#f3eee4'; c.fillText('SALDO', x + 24, y + 32);
  c.textAlign = 'right'; c.fillStyle = neg ? '#ff5a4f' : '#4fe08a'; c.font = '700 44px "JetBrains Mono"'; c.fillText(brl(v), x + wd - 22, y + 74); c.restore();
}
// a phone app screen: title bar, then rows; draw(c, x, y, w, h)
export function app(c, x, y, w, h, title, color, body) {
  c.fillStyle = '#f4f1ea'; c.fillRect(x, y, w, h); c.fillStyle = color; c.fillRect(x, y, w, 130);
  c.fillStyle = '#fff'; c.font = '700 52px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(title, x + w / 2, y + 78);
  c.save(); c.translate(x, y + 130); body(c, w, h - 130); c.restore();
}
export function row(c, w, y, a, b, colB = '#1f2026', sizeA = 34, sizeB = 40) {
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = '#4a4d55'; c.font = `700 ${sizeA}px "JetBrains Mono"`; c.fillText(a, 34, y);
  c.textAlign = 'right'; c.fillStyle = colB; c.font = `700 ${sizeB}px Oswald`; c.fillText(b, w - 34, y);
}
export function paper(c, k, draw, { x = 540, y = 780, w = 760, h = 900, rot = 0.03 } = {}) {
  if (k <= 0) return; c.save(); c.globalAlpha = clamp(k * 2); c.translate(x, y); c.rotate(rot); const s = 0.9 + 0.1 * clamp(k); c.scale(s, s);
  c.fillStyle = '#f2ecdc'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 40; c.fillRect(-w / 2, -h / 2, w, h); c.shadowBlur = 0;
  c.translate(-w / 2, -h / 2); draw(c, w, h); c.restore();
}
export function scribble(c, x, y, k, col = '#1f3a8a', wd = 300) {
  c.save(); c.strokeStyle = col; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); const n = Math.floor(60 * clamp(k));
  for (let i = 0; i <= n; i++) { const u = i / 60, px = x + u * wd, py = y + Math.sin(u * 22) * 22 * (1 - u * 0.5) + Math.sin(u * 7) * 8; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); c.restore();
}
export function pill(c, s, y) { c.save(); c.font = '700 44px Oswald'; const wd = c.measureText(s).width + 70; c.fillStyle = '#d93b30'; c.beginPath(); c.roundRect(540 - wd / 2, y - 40, wd, 80, 40); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 540, y + 2); c.restore(); }
export function title(c, a, b, colB = '#ff5a4f') { c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; for (const [s, y, col] of [[a, 450, '#ffffff'], [b, 590, colB]]) { c.font = '700 140px Oswald'; c.lineWidth = 16; c.strokeStyle = '#0b0c0f'; c.strokeText(s, 540, y); c.fillStyle = col; c.fillText(s, 540, y); } c.restore(); }
export function strike(c, t, t0) { c.save(); c.translate(540, 560); c.rotate(-0.06); c.strokeStyle = '#d93b30'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(-360, 60); c.lineTo(-360 + 720 * ease((t - t0) / 0.3), -40); c.stroke(); c.restore(); }
