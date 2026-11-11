import { WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, range } from '../core/util.js';

// 2D layer composited on top of the 3D frame (so it is baked into exports):
// subtitles with word-by-word highlight, episode title cards, end card.
const FONT = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DISPLAY = '"Orbitron", "Rajdhani", "Inter", Arial, sans-serif';

function wrap(ctx, words, maxW) {
  const lines = [[]]; let w = 0; const sp = ctx.measureText(' ').width;
  for (const word of words) {
    const ww = ctx.measureText(word.text).width;
    if (w + ww > maxW && lines[lines.length - 1].length) { lines.push([]); w = 0; }
    lines[lines.length - 1].push({ ...word, w: ww }); w += ww + sp;
  }
  return lines;
}

export function drawSubtitle(ctx, cue, t, opts = {}) {
  if (!cue) return;
  const a = smooth(cue.start - 0.15, cue.start + 0.15, t) * (1 - smooth(cue.end + 0.2, cue.end + 0.55, t));
  if (a <= 0.001) return;
  const size = opts.size || 54;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const words = cue.words;
  const lines = wrap(ctx, words, WIDTH - 180);
  const lh = size * 1.32; const y0 = (opts.y || HEIGHT * 0.79) - (lines.length - 1) * lh / 2;
  const sp = ctx.measureText(' ').width;
  // speaker tag
  if (cue.speaker) {
    ctx.font = `700 ${Math.round(size * 0.5)}px ${DISPLAY}`; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${cue.tagColor || '120,190,255'},${a * 0.95})`;
    ctx.letterSpacing = '6px';
    ctx.fillText(cue.speaker, WIDTH / 2, y0 - lh * 0.95);
    ctx.letterSpacing = '0px';
    ctx.font = `600 ${size}px ${FONT}`; ctx.textAlign = 'left';
  }
  lines.forEach((line, li) => {
    const lw = line.reduce((s, w) => s + w.w, 0) + sp * (line.length - 1);
    let x = (WIDTH - lw) / 2; const y = y0 + li * lh;
    for (const w of line) {
      const on = smooth(w.start - 0.05, w.start + 0.12, t);
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18;
      ctx.lineWidth = 8; ctx.strokeStyle = `rgba(0,0,0,${a * 0.55})`; ctx.strokeText(w.text, x, y);
      const base = cue.color || [255, 255, 255];
      const dim = 0.42 + 0.58 * on;
      ctx.fillStyle = `rgba(${base[0]},${base[1]},${base[2]},${a * dim})`;
      ctx.fillText(w.text, x, y);
      x += w.w + sp;
    }
  });
  ctx.restore();
}

export function drawTitleCard(ctx, ep, t) {
  // appears 0.3–3.0 s
  const a = smooth(0.25, 0.75, t) * (1 - smooth(2.6, 3.2, t));
  if (a <= 0) return;
  ctx.save();
  const y = 250;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 30px ${DISPLAY}`; ctx.letterSpacing = '14px';
  ctx.fillStyle = `rgba(140,200,255,${a * 0.9})`;
  ctx.fillText('O ÚLTIMO FRAGMENTO', WIDTH / 2 + 7, y);
  ctx.font = `600 26px ${DISPLAY}`; ctx.letterSpacing = '10px';
  ctx.fillStyle = `rgba(255,255,255,${a * 0.7})`;
  ctx.fillText(`EPISÓDIO ${ep.number}`, WIDTH / 2 + 5, y + 58);
  const reveal = smooth(0.5, 1.4, t);
  ctx.font = `800 64px ${DISPLAY}`; ctx.letterSpacing = '6px';
  const title = ep.title.slice(0, Math.ceil(ep.title.length * reveal));
  ctx.shadowColor = 'rgba(60,150,255,0.9)'; ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillText(title, WIDTH / 2 + 3, y + 130);
  ctx.shadowBlur = 0;
  const lw = 380 * smooth(0.4, 1.2, t);
  ctx.fillStyle = `rgba(80,170,255,${a * 0.8})`;
  ctx.fillRect(WIDTH / 2 - lw / 2, y + 185, lw, 3);
  ctx.restore();
}

// Holographic HUD helper (Canvas): corner brackets, scanning reticle, readouts.
export function drawHud(ctx, t, { x, y, r = 120, label = '', lines = [], color = '90,190,255', alpha = 1 }) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = `rgba(${color},0.9)`; ctx.fillStyle = `rgba(${color},0.95)`; ctx.lineWidth = 3;
  ctx.shadowColor = `rgba(${color},0.9)`; ctx.shadowBlur = 14;
  const k = r * 0.35;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath(); ctx.moveTo(x + sx * r, y + sy * (r - k)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - k), y + sy * r); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, t * 2, t * 2 + Math.PI * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.42, -t * 3, -t * 3 + Math.PI * 0.8); ctx.stroke();
  ctx.font = `700 24px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.letterSpacing = '4px';
  if (label) ctx.fillText(label, x + r + 18, y - r + 14);
  ctx.font = `500 20px ${FONT}`; ctx.letterSpacing = '2px';
  lines.forEach((l, i) => ctx.fillText(l, x + r + 18, y - r + 50 + i * 30));
  ctx.restore();
}

export function drawEndCard(ctx, t, start) {
  const k = t - start; if (k < 0) return;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const a = smooth(0, 0.6, k);
  ctx.font = `800 72px ${DISPLAY}`; ctx.letterSpacing = '8px';
  ctx.shadowColor = 'rgba(80,170,255,1)'; ctx.shadowBlur = 40;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillText('FIM…', WIDTH / 2 + 4, HEIGHT * 0.15);
  const b = smooth(0.5, 1.2, k);
  ctx.font = `700 50px ${DISPLAY}`; ctx.letterSpacing = '5px';
  ctx.fillStyle = `rgba(150,210,255,${b})`;
  ctx.fillText('OU UM NOVO', WIDTH / 2 + 3, HEIGHT * 0.15 + 100);
  ctx.fillText('COMEÇO?', WIDTH / 2 + 3, HEIGHT * 0.15 + 170);
  ctx.restore();
}

export function cueAt(cues, t) {
  let best = null;
  for (const c of cues) if (t >= c.start - 0.2 && t <= c.end + 0.6) best = c;
  return best;
}
