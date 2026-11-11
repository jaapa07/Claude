import { WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, easeOutBack, easeOutElastic, rng } from '../core/util.js';

// 2D comic layer baked into every frame: subtitles with speaker tags,
// bouncy title card, onomatopoeia bursts, speed lines, freeze-frame and end card.
export const FONT = 'Nunito, "Arial Rounded MT Bold", Arial, sans-serif';
export const DISPLAY = 'Fredoka, Nunito, Arial, sans-serif';
export const SERIES = 'O DRAGÃO QUE TINHA MEDO DE FOGO';

function wrap(ctx, words, maxW) {
  const lines = [[]]; let w = 0; const sp = ctx.measureText(' ').width;
  for (const word of words) { const ww = ctx.measureText(word.text).width; if (w + ww > maxW && lines.at(-1).length) { lines.push([]); w = 0; } lines.at(-1).push({ ...word, w: ww }); w += ww + sp; }
  return lines;
}
function pill(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function drawSubtitle(ctx, cue, t) {
  if (!cue) return;
  const a = smooth(cue.start - 0.12, cue.start + 0.1, t) * (1 - smooth(cue.end + 0.25, cue.end + 0.5, t));
  if (a <= 0.001) return;
  const size = 58, pop = easeOutBack(clamp((t - cue.start + 0.12) / 0.3));
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `900 ${size}px ${FONT}`; ctx.textBaseline = 'middle';
  const lines = wrap(ctx, cue.words, WIDTH - 170), lh = size * 1.18, sp = ctx.measureText(' ').width * 1.25;
  const y0 = HEIGHT * 0.775 - (lines.length - 1) * lh / 2;
  ctx.translate(WIDTH / 2, y0); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.translate(-WIDTH / 2, -y0);
  if (cue.speaker) {
    ctx.font = `700 34px ${DISPLAY}`; const tw = ctx.measureText(cue.speaker).width + 44;
    ctx.fillStyle = `rgb(${cue.tagColor})`; pill(ctx, WIDTH / 2 - tw / 2, y0 - lh * 0.6 - 56, tw, 50, 25); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#1b1030'; ctx.stroke();
    ctx.fillStyle = '#1b1030'; ctx.textAlign = 'center'; ctx.fillText(cue.speaker, WIDTH / 2, y0 - lh * 0.6 - 30);
    ctx.font = `900 ${size}px ${FONT}`;
  }
  ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  lines.forEach((line, li) => {
    const lw = line.reduce((s, w) => s + w.w, 0) + sp * (line.length - 1);
    let x = (WIDTH - lw) / 2; const y = y0 + li * lh;
    for (const w of line) {
      const on = smooth(w.start - 0.06, w.start + 0.08, t);
      const bump = 1 - 0.05 * Math.max(0, 1 - Math.abs(t - w.start) / 0.15);
      ctx.save(); ctx.translate(x + w.w / 2, y); ctx.scale(1 / bump, 1 / bump); ctx.translate(-(x + w.w / 2), -y);
      ctx.lineWidth = 14; ctx.strokeStyle = '#1b1030'; ctx.strokeText(w.text, x, y);
      const c = cue.color || [255, 255, 255];
      ctx.fillStyle = on > 0.5 ? `rgb(${c})` : 'rgba(205,200,230,0.85)';
      if (on > 0.5 && cue.hot) ctx.fillStyle = '#ffe14a';
      ctx.fillText(w.text, x, y); ctx.restore();
      x += w.w + sp;
    }
  });
  ctx.restore();
}

export function drawTitleCard(ctx, ep, t) {
  const a = smooth(0.15, 0.4, t) * (1 - smooth(2.7, 3.2, t)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const y = 230;
  ctx.font = `700 34px ${DISPLAY}`; ctx.lineWidth = 9; ctx.strokeStyle = '#2a1650';
  ctx.strokeText(SERIES, WIDTH / 2, y); ctx.fillStyle = '#ffe58a'; ctx.fillText(SERIES, WIDTH / 2, y);
  const k = easeOutElastic(clamp((t - 0.35) / 0.9));
  ctx.font = `700 30px ${DISPLAY}`; const lab = `EPISÓDIO ${ep.number}`; const tw = ctx.measureText(lab).width + 48;
  ctx.fillStyle = '#ff6f61'; pill(ctx, WIDTH / 2 - tw / 2, y + 36, tw, 48, 24); ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillText(lab, WIDTH / 2, y + 61);
  // title letters pop in one by one
  ctx.font = `700 76px ${DISPLAY}`;
  const words = ep.title.split(' '); const rows = []; let cur = '';
  for (const w of words) { if (ctx.measureText(cur + ' ' + w).width > WIDTH - 140 && cur) { rows.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  rows.push(cur);
  let idx = 0;
  rows.forEach((row, ri) => {
    const rw = ctx.measureText(row).width; let x = WIDTH / 2 - rw / 2; const ry = y + 150 + ri * 84;
    for (const ch of row) {
      const cw = ctx.measureText(ch).width; const kk = easeOutBack(clamp((t - 0.45 - idx * 0.035) / 0.35), 2.4);
      ctx.save(); ctx.translate(x + cw / 2, ry); ctx.scale(kk, kk); ctx.rotate((1 - kk) * 0.6 + Math.sin(t * 6 + idx) * 0.03);
      ctx.lineWidth = 16; ctx.strokeStyle = '#2a1650'; ctx.strokeText(ch, 0, 0);
      ctx.fillStyle = idx % 2 ? '#7ff0dc' : '#ffffff'; ctx.fillText(ch, 0, 0); ctx.restore();
      x += cw; idx++;
    }
  });
  ctx.restore(); return k;
}

// Comic onomatopoeia burst ("POP!", "HIC!")
export function drawBurst(ctx, t, t0, text, x, y, { size = 110, color = '#ffe14a', ink = '#2a1650', dur = 0.9, rot = -0.12, seed = 1 } = {}) {
  const k = t - t0; if (k < 0 || k > dur) return;
  const s = easeOutBack(clamp(k / 0.18), 3) * (1 - smooth(dur - 0.2, dur, k) * 0.3); const a = 1 - smooth(dur - 0.2, dur, k);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const r = rng(seed); ctx.beginPath();
  const n = 14; for (let i = 0; i <= n * 2; i++) { const ang = (i / (n * 2)) * Math.PI * 2; const rr = (i % 2 ? 0.55 : 1) * size * 1.35 * (0.85 + r() * 0.3); ctx.lineTo(Math.cos(ang) * rr * 1.25, Math.sin(ang) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = ink; ctx.stroke();
  ctx.font = `700 ${size}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 14; ctx.strokeStyle = ink; ctx.strokeText(text, 0, 6); ctx.fillStyle = '#fff'; ctx.fillText(text, 0, 6);
  ctx.restore();
}

// Anime-style radial speed lines for comic zooms
export function drawSpeedLines(ctx, t, amount, cx = WIDTH / 2, cy = HEIGHT / 2, color = '255,255,255') {
  if (amount <= 0.01) return;
  const r = rng(Math.floor(t * 24) + 7);
  ctx.save(); ctx.globalAlpha = amount * 0.75; ctx.fillStyle = `rgb(${color})`;
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, w = 0.004 + r() * 0.012, r0 = 420 + r() * 300, r1 = 1600;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0); ctx.lineTo(cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0); ctx.fill();
  }
  ctx.restore();
}

// Comic freeze frame: paper border, halftone tint and a final caption
export function drawFreeze(ctx, t, t0, caption) {
  const k = t - t0; if (k < 0) return;
  const a = smooth(0, 0.15, k);
  ctx.save();
  ctx.globalAlpha = a * 0.22; ctx.fillStyle = '#ffd34d';
  for (let y = 0; y < HEIGHT; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < WIDTH; x += 18) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
  ctx.globalAlpha = a; ctx.lineWidth = 34; ctx.strokeStyle = '#fff7e0'; ctx.strokeRect(17, 17, WIDTH - 34, HEIGHT - 34);
  ctx.lineWidth = 8; ctx.strokeStyle = '#2a1650'; ctx.strokeRect(38, 38, WIDTH - 76, HEIGHT - 76);
  const p = easeOutBack(clamp((k - 0.25) / 0.4), 2);
  ctx.translate(WIDTH / 2, 330); ctx.rotate(-0.05); ctx.scale(p, p);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const lines = caption.split('\n');
  ctx.font = `700 74px ${DISPLAY}`;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 90, bh = lines.length * 92 + 60;
  ctx.fillStyle = '#ff6f61'; pill(ctx, -bw / 2, -bh / 2, bw, bh, 40); ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#2a1650'; ctx.stroke();
  lines.forEach((l, i) => { const yy = (i - (lines.length - 1) / 2) * 92; ctx.lineWidth = 16; ctx.strokeText(l, 0, yy); ctx.fillStyle = '#fff'; ctx.fillText(l, 0, yy); });
  ctx.restore();
}

export function cueAt(cues, t) { let best = null; for (const c of cues) if (t >= c.start - 0.15 && t <= c.end + 0.5) best = c; return best; }
