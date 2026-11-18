// snooker/common.js: shots and overlays the five parts share
import { phone } from '../engine/stage.js';
export const BASE = { setup: null, which: 'snooker', minTotal: 61, tail: 4.2, gaugeLabel: 'TENSÃO' };
// a chat screen on a phone: a name, an audio bubble playing (k 0..1), an optional line of text
export function audioPhone(c, name, k, note) {
  phone(c, (c, x, y, w, h) => {
    c.fillStyle = '#e8ddd0'; c.fillRect(x, y, w, h); c.fillStyle = '#1f6a52'; c.fillRect(x, y, w, 120);
    c.fillStyle = '#fff'; c.font = '700 40px Oswald'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(name, x + 40, y + 66);
    if (note) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(x + 30, y + 170, w - 120, 90, 18); c.fill(); c.fillStyle = '#222'; c.font = '700 30px Oswald'; c.fillText(note, x + 52, y + 215); }
    const by = y + h - 360; c.fillStyle = '#d9fdd3'; c.beginPath(); c.roundRect(x + 60, by, w - 90, 130, 24); c.fill();
    c.fillStyle = '#1f6a52'; c.beginPath(); c.moveTo(x + 100, by + 40); c.lineTo(x + 100, by + 90); c.lineTo(x + 140, by + 65); c.closePath(); c.fill();
    for (let i = 0; i < 28; i++) { const bh = 10 + 40 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)); c.fillStyle = i / 28 < k ? '#1f6a52' : '#9ab8a8'; c.fillRect(x + 170 + i * 12, by + 65 - bh / 2, 7, bh); }
    c.fillStyle = '#555'; c.font = '700 24px "JetBrains Mono"'; c.fillText('0:0' + Math.min(9, Math.floor(3 + 6 * k)), x + w - 120, by + 110);
  });
}
// the blackout: a black frame and, sometimes, a shout written on it
export function inTheDark(c, s, k, bang) { c.save(); c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1920); c.restore(); if (s) bang(s, k, { y: 820, col: '#ff5a4f', size: 170, shake: 1 }); }
// Reny's map on the back of the consumption card: the bar in pen, n circles (0..8)
export function mapCard(c, n, k = 1) {
  c.save(); c.globalAlpha = Math.min(1, k * 3); c.translate(540, 980); c.rotate(-0.04);
  c.fillStyle = '#f6efd8'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.fillRect(-380, -300, 760, 600); c.shadowBlur = 0;
  c.strokeStyle = '#1d3a8a'; c.lineWidth = 6; c.strokeRect(-330, -250, 660, 500); c.strokeRect(-60, -130, 150, 260);
  c.strokeRect(-320, -150, 60, 300); c.font = '700 26px Oswald'; c.fillStyle = '#1d3a8a'; c.textAlign = 'center'; c.fillText('SINUCA', 15, 0); c.fillText('BALCÃO', -290, -170); c.fillText('FREEZER', -270, -215); c.fillText('PORTA', -200, 280); c.fillText('FUNDOS', 250, -215);
  const spots = [[-220, 60], [-230, -110], [170, -120], [250, -200], [-110, 170], [-210, 230], [-90, -120], [170, 110]];
  spots.slice(0, n).forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 26, 0, 7); c.stroke(); });
  c.restore();
}
// a recording frame: REC and a timer
export function recFrame(c, t) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 6; for (const [x, y, sx, sy] of [[80, 330, 1, 1], [1000, 330, -1, 1], [80, 1560, 1, -1], [1000, 1560, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * 70); c.lineTo(x, y); c.lineTo(x + sx * 70, y); c.stroke(); }
  if (Math.sin(t * 6) > 0) { c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(120, 380, 16, 0, 7); c.fill(); } c.font = '700 40px "JetBrains Mono"'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('REC', 150, 382); c.restore(); }
// a page of the complaints notebook
export function notePage(c, k, lines) { c.save(); c.globalAlpha = Math.min(1, k * 3); c.translate(540, 900); c.rotate(0.03); c.fillStyle = '#fbf7e8'; c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.fillRect(-360, -260, 720, 520); c.shadowBlur = 0;
  c.strokeStyle = '#9ab8d8'; c.lineWidth = 3; for (let y = -180; y < 260; y += 60) { c.beginPath(); c.moveTo(-340, y); c.lineTo(340, y); c.stroke(); } c.strokeStyle = '#e08a8a'; c.beginPath(); c.moveTo(-280, -260); c.lineTo(-280, 260); c.stroke();
  c.fillStyle = '#1d3a8a'; c.font = 'italic 700 42px Oswald'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; lines.forEach((s, i) => c.fillText(s, -260, -195 + i * 60)); c.restore(); }
// an incoming call on a phone: MÃE, ringing
export function callPhone(c, t, name) {
  phone(c, (c, x, y, w, h) => { const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#2a2a4a'); gr.addColorStop(1, '#0d0d1a'); c.fillStyle = gr; c.fillRect(x, y, w, h);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 34px Oswald'; c.fillText('chamada recebida...', x + w / 2, y + 200); c.font = '700 110px Oswald'; c.fillText(name, x + w / 2, y + 320);
    const r = 70 + 12 * Math.abs(Math.sin(t * 8)); c.fillStyle = '#2e9e57'; c.beginPath(); c.arc(x + w * 0.72, y + h - 200, r, 0, 7); c.fill(); c.fillStyle = '#c8372d'; c.beginPath(); c.arc(x + w * 0.28, y + h - 200, 70, 0, 7); c.fill(); });
}
