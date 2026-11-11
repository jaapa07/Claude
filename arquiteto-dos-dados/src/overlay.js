// overlay.js: tudo o que é 2D sobre a cena (Canvas): moldura de HUD, cartão do episódio, legendas
// sincronizadas palavra a palavra e os letreiros finais. É desenhado no mesmo canvas que vai para o vídeo.
import { W, H, EP_DUR, N_EPS, TOTAL, clamp, sstep, pulse, rng } from './core.js';

const GLYPHS = '01<>{}[]/\\#$%&=+*ABCDEFXYZ';
function scramble(text, p, seed) {   // revela o texto da esquerda para a direita, com glifos sorteados na frente
  const n = text.length, shown = p * (n + 4); let out = '';
  for (let i = 0; i < n; i++) out += text[i] === ' ' ? ' ' : i < shown - 4 ? text[i] : i < shown ? GLYPHS[Math.floor(rng(seed + i * 131 + Math.floor(p * 40) * 17)() * GLYPHS.length)] : ' ';
  return out;
}
function wrap(x, words, maxW) {
  const lines = [[]]; let w = 0; const sp = x.measureText(' ').width;
  for (const o of words) { const ww = x.measureText(o.w).width; if (w + ww > maxW && lines.at(-1).length) { lines.push([]); w = 0; } lines.at(-1).push({ ...o, ww }); w += ww + sp; }
  return lines.map(l => ({ items: l, width: l.reduce((a, o) => a + o.ww, 0) + sp * (l.length - 1) }));
}

export function makeOverlay(film, roteiro) {
  const x = film.getContext('2d');
  const eps = roteiro.episodios;

  function hud(T, ep, t) {
    const a = 0.75 * sstep(0.3, 1.2, T) * (1 - sstep(TOTAL - 4.5, TOTAL - 3.5, T));
    if (a <= 0) return;
    x.save(); x.globalAlpha = a; x.strokeStyle = '#3fd8ff'; x.fillStyle = '#3fd8ff'; x.lineWidth = 3;
    const m = 44, L = 46;
    for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { x.beginPath(); x.moveTo(cx + sx * L, cy); x.lineTo(cx, cy); x.lineTo(cx, cy + sy * L); x.stroke(); }
    const bw = (W - 2 * m - 60 - 4 * 10) / N_EPS;                          // barra de progresso em 5 segmentos
    for (let i = 0; i < N_EPS; i++) {
      const bx = m + 30 + i * (bw + 10), f = clamp((T - i * EP_DUR) / EP_DUR);
      x.globalAlpha = a * 0.28; x.fillRect(bx, 76, bw, 5); x.globalAlpha = a; x.fillRect(bx, 76, bw * f, 5);
    }
    x.font = '700 30px Orbitron'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#fff';
    x.fillText(`EP 0${ep + 1}`, m + 30, 124); x.fillStyle = '#3fd8ff'; x.font = '600 30px Rajdhani';
    x.fillText(eps[ep].titulo, m + 150, 125);
    x.textAlign = 'right'; x.font = '500 24px "JetBrains Mono"'; x.fillStyle = 'rgba(200,225,255,.85)';
    const mm = Math.floor(T / 60), ss = (T % 60).toFixed(1).padStart(4, '0'); x.fillText(`${mm}:${ss}`, W - m - 30, 124);
    x.restore();
  }

  function card(ep, t) {
    const p = sstep(0.5, 1.7, t), out = 1 - sstep(3.1, 3.7, t); if (p <= 0 || out <= 0) return;
    x.save(); x.globalAlpha = out; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = '#1f7bff'; x.shadowBlur = 28;
    x.font = '700 40px Orbitron'; x.fillStyle = '#3fd8ff'; if ('letterSpacing' in x) x.letterSpacing = '14px';
    x.fillText(scramble(`EPISÓDIO ${ep + 1}`, sstep(0.5, 1.2, t), 7), W / 2, 500);
    if ('letterSpacing' in x) x.letterSpacing = '2px';
    x.font = '900 84px Orbitron'; x.fillStyle = '#fff';
    const words = eps[ep].titulo.split(' '), lines = [''];
    for (const w of words) { const cand = (lines.at(-1) + ' ' + w).trim(); if (x.measureText(cand).width > 930 && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = cand; }
    lines.forEach((l, i) => x.fillText(scramble(l, sstep(0.7 + i * 0.25, 1.9 + i * 0.25, t), 31 + i), W / 2, 610 + i * 104));
    x.fillStyle = '#3fd8ff'; x.shadowBlur = 12; const lw = 520 * p; x.fillRect(W / 2 - lw / 2, 552, lw, 3);
    x.restore();
  }

  function subtitles(T, cues) {
    const c = cues.find(c => T >= c.T0 - 0.12 && T <= c.T0 + c.dur + 0.45); if (!c) return;
    const a = sstep(c.T0 - 0.12, c.T0 + 0.1, T) * (1 - sstep(c.T0 + c.dur + 0.15, c.T0 + c.dur + 0.45, T));
    x.save(); x.font = '700 60px Rajdhani'; x.textBaseline = 'middle'; x.textAlign = 'left';
    const lines = wrap(x, c.words, 880), lh = 74, y0 = 1560 - (lines.length - 1) * lh / 2, sp = x.measureText(' ').width;
    const bw = Math.max(...lines.map(l => l.width)) + 70, bh = lines.length * lh + 36;
    x.globalAlpha = a * 0.55; x.fillStyle = '#01040d'; x.beginPath(); x.roundRect(W / 2 - bw / 2, y0 - lh / 2 - 18, bw, bh, 16); x.fill();
    x.globalAlpha = a * 0.9; x.fillStyle = '#3fd8ff'; x.fillRect(W / 2 - bw / 2, y0 - lh / 2 - 18, 5, bh);
    lines.forEach((l, i) => {
      let px = W / 2 - l.width / 2;
      for (const o of l.items) {
        const now = T - c.T0, cur = now >= o.a && now < o.b, done = now >= o.b;
        x.globalAlpha = a * (cur || done ? 1 : 0.5); x.fillStyle = cur ? '#5fe4ff' : '#fff'; x.shadowColor = cur ? '#1f9bff' : 'rgba(0,0,0,.9)'; x.shadowBlur = cur ? 22 : 8;
        x.fillText(o.w, px, y0 + i * lh); px += o.ww + sp;
      }
    });
    x.restore();
  }

  function finale(t) {   // episódio 5, 15-20 s
    const p = sstep(16.0, 17.4, t); if (p <= 0) return;
    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = 1 - sstep(19.2, 19.9, t);
    x.shadowColor = '#1f7bff'; x.shadowBlur = 40; x.fillStyle = '#fff'; x.font = '900 92px Orbitron'; if ('letterSpacing' in x) x.letterSpacing = `${4 + (1 - p) * 30}px`;
    x.fillText(scramble('RODRIGO HAJIME', p, 77), W / 2, 900);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    const q = sstep(17.2, 18.2, t);
    x.shadowBlur = 14; x.fillStyle = '#3fd8ff'; x.fillRect(W / 2 - 330 * q, 978, 660 * q, 3);
    x.globalAlpha *= q; x.font = '600 52px Rajdhani'; x.fillStyle = '#cfeaff'; x.fillText('Transformando dados em possibilidades.', W / 2, 1048 + (1 - q) * 14);
    x.restore();
  }

  return function draw(gl, T, { cues, showSubs = true, showHud = true }) {
    const ep = Math.min(N_EPS - 1, Math.floor(T / EP_DUR)), t = T - ep * EP_DUR;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.drawImage(gl, 0, 0, W, H);
    if (showHud) hud(T, ep, t);
    card(ep, t);
    if (ep === 4) finale(t);
    if (showSubs) subtitles(T, cues);
  };
}
