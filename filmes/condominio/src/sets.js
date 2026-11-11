// Sets (one flat palette per world) and FX. World units: px at zoom 1, floor y = 0, y down.
import { TAU, clamp, lerp, mulberry, hash } from './lib.js';
import { INK, blob, ink, lw, word, shade } from './toon.js';

const band = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
function door(c, x, w, h, col, label) {
  blob(c, shade(col, .85), () => c.rect(x - w / 2 - 14, -h - 14, w + 28, h + 14));
  blob(c, col, () => c.rect(x - w / 2, -h, w, h), { sh: 14 });
  blob(c, '#d6b04a', () => c.arc(x + w * .35, -h * .48, 9, 0, TAU), { line: 4 });
  if (label) { blob(c, '#f4f0e0', () => c.roundRect(x - 50, -h + 40, 100, 50, 8), { line: 4 }); word(c, label, x, -h + 66, 34, 1, INK, 0); }
}
export function elevatorDoors(c, x, open = 0, h = 760, w = 420, glow = 0) {
  blob(c, '#6a6e78', () => c.rect(x - w / 2 - 40, -h - 60, w + 80, h + 60));
  c.fillStyle = glow ? '#ffd27a' : '#1a1418'; c.fillRect(x - w / 2, -h, w, h);
  if (glow) { c.fillStyle = `rgba(255,200,90,${.4 * glow})`; c.beginPath(); c.moveTo(x - w / 2 * open, -h); c.lineTo(x + w / 2 * open, -h); c.lineTo(x + w * open * 1.3, 0); c.lineTo(x - w * open * 1.3, 0); c.fill(); }
  const dw = w / 2 * (1 - open);
  for (const s of [-1, 1]) { blob(c, '#a8adb8', () => c.rect(s < 0 ? x - w / 2 : x + w / 2 - dw, -h, dw, h), { sh: 10 }); }
  blob(c, '#2a2a30', () => c.roundRect(x - 70, -h - 50, 140, 36, 8), { line: 4 }); c.fillStyle = '#ff4a3a'; c.font = '28px VT323, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('▼ 4', x, -h - 32);
}

// —— the lobby: sad mint walls, damp stains, a notice board with the rules ——
export function lobby(c, t, o = {}) {
  band(c, -1400, -2400, 2800, 2400, '#9cc8a6'); band(c, -1400, -2400, 2800, 300, '#87b593');
  c.fillStyle = '#86b08f'; for (const [x, y, r] of [[-700, -1300, 160], [600, -1700, 120], [200, -400, 90]]) { c.beginPath(); c.ellipse(x, y, r * 1.4, r, .3, 0, TAU); c.fill(); }
  band(c, -1400, -300, 2800, 300, '#7aa085');
  elevatorDoors(c, 350, o.lift || 0, 760, 420, o.liftGlow || 0);
  // mailboxes
  blob(c, '#b8a07a', () => c.rect(-820, -900, 420, 300), { sh: 14 });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { blob(c, '#d8c49a', () => c.rect(-805 + k * 102, -885 + r * 96, 90, 82), { line: 4 }); word(c, `${r + 1}0${k + 1}`, -760 + k * 102, -850 + r * 96, 22, 1, INK, 0, 'Fredoka'); }
  // notice board
  blob(c, '#b8743a', () => c.rect(-820, -1500, 420, 420), { sh: 14 }); blob(c, '#f4f0e0', () => c.rect(-790, -1470, 360, 360), { line: 4 });
  c.fillStyle = INK; c.font = '700 30px Fredoka'; c.textAlign = 'left';
  ['AVISOS:', '• PROIBIDO SER FELIZ', '   APÓS AS 22H', '• NÃO DÊ DESCARGA', '   NO 404', '• TAXA EXTRA: SIM'].forEach((s, i) => c.fillText(s, -770, -1420 + i * 50));
  // a dead plant
  blob(c, '#c86a3a', () => { c.moveTo(-260, 0); c.lineTo(-300, -170); c.lineTo(-120, -170); c.lineTo(-160, 0); c.closePath(); }, { sh: 10 });
  for (const a of [-.6, -.1, .4]) { c.beginPath(); c.moveTo(-210, -170); c.quadraticCurveTo(-210 + a * 120, -300, -210 + a * 220, -260); c.lineWidth = lw(c, 7); c.strokeStyle = '#6a5a2a'; c.stroke(); }
  floorTiles(c, '#d8d2c4', '#b8b0a0');
}
function floorTiles(c, a, b, y0 = 0) {
  for (let r = 0; r < 8; r++) for (let k = -12; k < 12; k++) { c.fillStyle = (r + k) % 2 ? a : b; c.fillRect(k * 120, y0 + r * 90, 120, 90); }
  c.beginPath(); c.moveTo(-1500, y0); c.lineTo(1500, y0); ink(c, 7);
}
// —— apartment 404's bathroom ——
export function bathroom(c, t, o = {}) {
  band(c, -1300, -2400, 2600, 2400, '#7fc4d8');
  c.strokeStyle = '#5aa4bc'; c.lineWidth = lw(c, 4); for (let y = -2400; y < 0; y += 110) { c.beginPath(); c.moveTo(-1300, y); c.lineTo(1300, y); c.stroke(); } for (let x = -1300; x < 1300; x += 110) { c.beginPath(); c.moveTo(x, -2400); c.lineTo(x, 0); c.stroke(); }
  // mirror + sink (left), shower curtain (right), a tiny window with a pigeon
  blob(c, '#d8f0f8', () => c.roundRect(-760, -1250, 300, 380, 20), { sh: 14 }); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-720, -1200, 30, 200);
  blob(c, '#f4f6fa', () => c.roundRect(-780, -760, 340, 90, 20), { sh: 10 }); blob(c, '#f4f6fa', () => c.rect(-660, -670, 100, 670), { sh: 8 });
  blob(c, '#e86aa8', () => { c.moveTo(560, -1500); for (let k = 0; k <= 8; k++) c.quadraticCurveTo(560 + k * 70 + 35, -700, 560 + (k + 1) * 70, k % 2 ? -40 : -10); c.lineTo(560, -10); c.closePath(); }, { sh: 18 });
  blob(c, '#c0c4cc', () => c.rect(520, -1530, 700, 30), { line: 5 });
  blob(c, '#ffe9a0', () => c.rect(-200, -1700, 260, 200), { sh: 8 }); c.beginPath(); c.moveTo(-70, -1700); c.lineTo(-70, -1500); ink(c, 5);
  if (o.drip !== 0) { const u = (t * .8) % 1; blob(c, '#7ab0e8', () => c.ellipse(-610, -660 + u * 600, 9, 13, 0, 0, TAU), { line: 3 }); }
  floorTiles(c, '#f0f0f0', '#c8d4e0');
}
// —— the 4th-floor corridor, numbered doors, the lift at the end; foam can flood it ——
export function corridor(c, t, o = {}) {
  band(c, -1800, -2400, 3600, 2400, '#e8c47a'); band(c, -1800, -360, 3600, 360, '#c89a5a');
  for (const [x, n] of [[-1150, '401'], [-550, '402'], [650, '403']]) door(c, x, 260, 680, '#8a5a3a', n);
  door(c, 0, 0, 0, '#000', null);
  elevatorDoors(c, 1250, o.lift || 0, 760, 420, o.liftGlow || 0);
  blob(c, '#f4f0e0', () => c.rect(60, -680, 300, 680), { sh: 10 }); word(c, '404', 210, -600, 50, 1, '#c8282a', 0);   // 404's door ajar
  floorTiles(c, '#b88a5a', '#a07448');
  if (o.foam) foam(c, o.foam, t, o.foamSeed || 3);
}
export function foam(c, k, t, seed = 3) {   // brown cartoon foam: bubbly blobs up to height 1600·k
  const R = mulberry(seed), H = 1600 * k;
  blob(c, '#8a5a2a', () => { c.moveTo(-2000, 400); c.lineTo(-2000, -H); for (let x = -2000; x <= 2000; x += 90) c.quadraticCurveTo(x + 45, -H - 70 - 30 * Math.sin(x * .02 + t * 3), x + 90, -H - 10 * Math.sin(x * .05)); c.lineTo(2000, 400); c.closePath(); }, { sh: 30, shade: '#6a4018' });
  for (let i = 0; i < 70; i++) { const x = -1900 + R() * 3800, y = -H * R() * .95, r = 20 + R() * 50; c.beginPath(); c.arc(x, y + Math.sin(t * 2 + i) * 6, r, 0, TAU); c.fillStyle = i % 3 ? '#a8763a' : '#c8965a'; c.fill(); ink(c, 4); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - r * .35, y - r * .35, r * .22, 0, TAU); c.fill(); }
}
// —— inside the lift ——
export function liftInside(c, t, o = {}) {
  band(c, -900, -2400, 1800, 2400, '#b0b4be'); band(c, -900, -2400, 1800, 260, '#888c96');
  for (const x of [-500, 0, 500]) { c.beginPath(); c.moveTo(x, -2400); c.lineTo(x, 0); ink(c, 4); }
  blob(c, '#d8e8f0', () => c.rect(-430, -1500, 360, 900), { sh: 12 });                        // mirror
  // the panel: 1, 2, 3, INFERNO, COBERTURA
  blob(c, '#2a2a30', () => c.roundRect(150, -1300, 230, 620, 20), { sh: 10 });
  ['COBERTURA', 'INFERNO', '3', '2', '1'].forEach((s, i) => { const lit = o.lit === s; blob(c, lit ? '#ff4a2a' : '#d8d8dc', () => c.arc(205, -1220 + i * 115, 34, 0, TAU), { line: 4 }); c.fillStyle = s === 'INFERNO' ? '#ff6a3a' : '#f4f4f0'; c.font = `${s.length > 3 ? 28 : 40}px "Lilita One"`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, 250, -1220 + i * 115); });
  blob(c, '#151018', () => c.roundRect(-300, -1880, 600, 220, 16), { line: 6 });
  c.fillStyle = '#ff4a3a'; c.font = '120px VT323, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.floor || '4', 0, -1770);
  band(c, -900, 0, 1800, 700, '#6a6e78'); c.beginPath(); c.moveTo(-900, 0); c.lineTo(900, 0); ink(c, 7);
  if (o.red) { c.fillStyle = `rgba(255,40,20,${.35 * o.red})`; c.fillRect(-2000, -3000, 4000, 4000); }
}
// —— hell's office: orange and black, cubicles, a motivational poster ——
export function inferno(c, t, o = {}) {
  band(c, -1600, -2600, 3200, 2600, '#2a0a10'); for (let i = 0; i < 6; i++) band(c, -1600, -1400 + i * 200, 3200, 200, ['#ff6a1a', '#e8401a', '#c82a1a', '#a01a14', '#7a1010', '#4a0a0c'][i]);
  for (let i = 0; i < 9; i++) { const x = -1400 + i * 340, h = 200 + 120 * Math.sin(t * 5 + i * 1.7); blob(c, '#ffb02a', () => { c.moveTo(x - 90, -1400); c.quadraticCurveTo(x - 60, -1400 - h, x + Math.sin(t * 7 + i) * 20, -1400 - h * 1.4); c.quadraticCurveTo(x + 60, -1400 - h, x + 90, -1400); c.closePath(); }); }
  blob(c, '#f4e8c8', () => c.rect(380, -1300, 360, 460), { sh: 10 }); word(c, 'SOFRA COM', 560, -1200, 48, 1, '#c8282a', 0); word(c, 'PROPÓSITO', 560, -1130, 48, 1, '#c8282a', 0);
  c.fillStyle = INK; c.font = '28px Fredoka'; c.textAlign = 'center'; c.fillText('— RH do Inferno', 560, -900);
  for (const x of [-1100, -700]) { blob(c, '#5a5a62', () => c.rect(x - 150, -520, 300, 520), { sh: 14 }); for (let k = 0; k < 3; k++) { blob(c, '#7a7a84', () => c.rect(x - 130, -500 + k * 165, 260, 140), { line: 4 }); blob(c, '#d0d0d4', () => c.rect(x - 30, -440 + k * 165, 60, 16), { line: 3 }); } }
  // the desk with spreadsheets
  blob(c, '#5a2a1a', () => c.rect(-350, -380, 700, 60), { sh: 10 }); blob(c, '#4a2014', () => c.rect(-330, -320, 660, 320), { sh: 14 });
  for (let k = 0; k < 4; k++) { blob(c, '#f4f4f0', () => c.rect(-280 + k * 60, -420 - k * 30, 220, 50), { line: 4 }); }
  band(c, -1600, 0, 3200, 700, '#1a0608'); c.beginPath(); c.moveTo(-1600, 0); c.lineTo(1600, 0); ink(c, 7);
}
// —— the courtroom of the condominium ——
export function court(c, t, o = {}) {
  band(c, -1600, -2600, 3200, 2600, '#7a4a2a'); for (let x = -1600; x < 1600; x += 160) { c.fillStyle = (x / 160) % 2 ? '#6a3e22' : '#82502e'; c.fillRect(x, -2600, 160, 2600); }
  // the bench, high, with the seal of a toilet
  blob(c, '#4a2a16', () => c.rect(-520, -900, 1040, 900), { sh: 20 }); blob(c, '#5a3420', () => c.rect(-560, -940, 1120, 60), { sh: 8 });
  blob(c, '#d6b04a', () => c.arc(0, -560, 140, 0, TAU), { sh: 14 }); blob(c, '#f4f6fa', () => { c.ellipse(0, -540, 60, 26, 0, 0, TAU); }, { line: 5 }); blob(c, '#f4f6fa', () => c.roundRect(-45, -640, 90, 70, 10), { line: 5 });
  word(c, 'JUSTIÇA CONDOMINIAL', 0, -1080, 64, 1, '#ffe23a', 0);
  // jury box of residents (heads)
  if (o.jury !== 0) for (let k = 0; k < 7; k++) { const x = -1250 + k * 120, y = -320 + (k % 2) * 30; blob(c, ['#e8b48a', '#c88a5a', '#f0c09a', '#a8703a'][k % 4], () => c.arc(x, y, 50, 0, TAU)); c.fillStyle = INK; c.beginPath(); c.arc(x - 14, y - 6, 6, 0, TAU); c.arc(x + 14, y - 6, 6, 0, TAU); c.fill(); }
  blob(c, '#5a3420', () => c.rect(-1400, -280, 600, 280), { sh: 14 });
  // cameras on tripods, a live red light
  for (const x of [900, 1250]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x - 80, -400); c.moveTo(x, 0); c.lineTo(x + 80, -400); c.moveTo(x, 0); c.lineTo(x, -400); ink(c, 7); blob(c, '#2a2a30', () => c.roundRect(x - 90, -520, 180, 120, 12), { sh: 8 }); blob(c, '#ff2a2a', () => c.arc(x + 60, -500, 14 * (Math.sin(t * 6) > 0 ? 1 : .6), 0, TAU), { line: 3 }); }
  band(c, -1600, 0, 3200, 700, '#5a3018'); c.beginPath(); c.moveTo(-1600, 0); c.lineTo(1600, 0); ink(c, 7);
  if (o.crack) { c.save(); c.lineWidth = lw(c, 10); c.strokeStyle = INK; const R = mulberry(9); for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(0, 10); let x = 0, y = 10; for (let k = 0; k < 5; k++) { x += (R() - .5) * 500 * o.crack; y += R() * 120 * o.crack; c.lineTo(x, y); } c.stroke(); } c.restore();
    if (o.hole) { blob(c, '#0a0a14', () => c.ellipse(0, 260, 900 * o.hole, 300 * o.hole, 0, 0, TAU), { line: 10 }); } }
}
// —— the lab under the court: teal, pipes, the AI wall ——
export function lab(c, t, o = {}) {
  band(c, -1800, -2800, 3600, 2800, '#0e3a44'); for (let i = 0; i < 8; i++) band(c, -1800, -2800 + i * 120, 3600, 4, '#1a5a66');
  for (const x of [-1300, 1300]) { blob(c, '#3a7a86', () => c.rect(x - 60, -2800, 120, 2800), { sh: 16 }); for (let y = -2600; y < 0; y += 400) blob(c, '#5aaab4', () => c.rect(x - 80, y, 160, 40), { line: 5 }); }
  for (const [x, col] of [[-900, '#7af0c0'], [900, '#f07ac0']]) { blob(c, '#c8e8f0', () => c.roundRect(x - 120, -760, 240, 560, 100), { sh: 12 }); c.fillStyle = col; c.globalAlpha = .7; c.fillRect(x - 100, -560 + Math.sin(t * 2) * 10, 200, 340); c.globalAlpha = 1; for (let i = 0; i < 5; i++) { const u = (t * .6 + i / 5) % 1; blob(c, '#fff', () => c.arc(x - 50 + i * 25, -240 - u * 300, 10, 0, TAU), { line: 3 }); } blob(c, '#3a7a86', () => c.rect(x - 140, -200, 280, 200), { sh: 10 }); }
  // the giant screen for the AI (the face is drawn by ia())
  blob(c, '#0a1418', () => c.roundRect(-760, -2300, 1520, 1100, 40), { sh: 20 });
  band(c, -1800, 0, 3600, 700, '#0a262c'); c.beginPath(); c.moveTo(-1800, 0); c.lineTo(1800, 0); ink(c, 7);
}
// the AI: a face on the wall screen; mouth = live waveform from the voice envelope
export function ia(c, t, o = {}) {
  const x = 0, y = -1750, mood = o.mood || 'calm', m = o.mouth || 0, glitch = o.glitch || 0;
  c.save(); c.beginPath(); c.roundRect(-740, -2280, 1480, 1060, 30); c.clip();
  c.fillStyle = mood === 'error' ? '#3a0a10' : '#062830'; c.fillRect(-760, -2300, 1520, 1100);
  const col = mood === 'error' ? '#ff4a4a' : '#5af0e0';
  for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(90,240,224,.06)'; c.fillRect(-760, -2300 + k * 28, 1520, 2); }
  for (const s of [-1, 1]) { const ex = x + s * 300 + (glitch ? (hash(Math.floor(t * 15) + s) - .5) * 80 * glitch : 0);
    c.beginPath(); c.arc(ex, y - 120, 130, 0, TAU); c.lineWidth = 26; c.strokeStyle = col; c.stroke();
    c.beginPath(); c.arc(ex + (o.look || 0) * 40, y - 120, mood === 'error' ? 20 : 46 + 10 * Math.sin(t * 2), 0, TAU); c.fillStyle = col; c.fill();
    if (mood === 'happy') { c.fillStyle = '#062830'; c.fillRect(ex - 150, y - 120, 300, 160); } }
  for (let i = -18; i <= 18; i++) { const h = 12 + m * 150 * Math.abs(Math.sin(i * .9 + t * 18)) * (1 - Math.abs(i) / 20); c.fillStyle = col; c.fillRect(x + i * 30 - 10, y + 200 - h / 2, 20, h); }
  if (o.text) { c.fillStyle = col; c.font = '74px VT323, monospace'; c.textAlign = 'center'; c.fillText(o.text, 0, -1290); }
  c.restore();
}
// —— space, for the simulation's end ——
export function space(c, t, o = {}) {
  band(c, -3000, -4000, 6000, 6000, '#120a2a'); const R = mulberry(4); c.fillStyle = '#fff'; for (let i = 0; i < 260; i++) { const x = (R() - .5) * 5000, y = -3600 + R() * 5000; c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); c.fillRect(x, y, 6, 6); } c.globalAlpha = 1;
  for (const [x, y, r, col] of [[-700, -2000, 220, '#e85aa8'], [800, -500, 140, '#5ae0a8']]) { blob(c, col, () => c.arc(x, y, r, 0, TAU), { sh: r * .25 }); }
}
// —— the ordinary office: suspiciously normal beige ——
export function office(c, t, o = {}) {
  band(c, -1400, -2400, 2800, 2400, '#e4d8bc'); band(c, -1400, -2400, 2800, 200, '#d2c4a4');
  for (const x of [-1000, 1000]) { blob(c, '#f4f0e4', () => c.rect(x - 220, -1500, 440, 340), { sh: 10 }); for (let k = 0; k < 4; k++) { c.fillStyle = '#c8bca0'; c.fillRect(x - 200 + k * 110, -1480, 4, 300); } }
  blob(c, '#f4f0e4', () => c.rect(-200, -1350, 400, 300), { sh: 10 }); word(c, 'SEJA FELIZ', 0, -1250, 46, 1, '#a89870', 0); word(c, 'AQUI', 0, -1180, 46, 1, '#a89870', 0);
  blob(c, '#b8a07a', () => c.rect(-600, -330, 1200, 50), { sh: 8 }); blob(c, '#a08a64', () => c.rect(-580, -280, 1160, 280), { sh: 12 });
  blob(c, '#3a3a40', () => c.roundRect(-180, -720, 360, 280, 12), { sh: 10 }); blob(c, '#9ac8e8', () => c.rect(-160, -700, 320, 240), { line: 4 }); blob(c, '#3a3a40', () => c.rect(-30, -440, 60, 110), { line: 4 });
  band(c, -1400, 0, 2800, 700, '#b8a888'); c.beginPath(); c.moveTo(-1400, 0); c.lineTo(1400, 0); ink(c, 7);
}
// —— the roof water tank (for the toilet's hologram) ——
export function roof(c, t, o = {}) {
  band(c, -1400, -2400, 2800, 2400, '#f2a65a'); band(c, -1400, -900, 2800, 900, '#e8885a');
  blob(c, '#4a8ae8', () => c.roundRect(-300, -800, 600, 800, 40), { sh: 30 }); word(c, 'CAIXA D\'ÁGUA', 0, -420, 54, 1, '#fff', 0);
  band(c, -1400, 0, 2800, 700, '#8a8a90'); c.beginPath(); c.moveTo(-1400, 0); c.lineTo(1400, 0); ink(c, 7);
}
export const SETS = { lobby, bathroom, corridor, liftInside, inferno, court, lab, space, office, roof };

// —— FX ——
export function puff(c, x, y, r, a = 1, col = '#e8e2d8') { if (a <= 0 || r <= 0) return; c.save(); c.globalAlpha = a; for (const [dx, dy, k] of [[0, 0, 1], [r * .7, r * .2, .7], [-r * .7, r * .25, .75], [r * .3, -r * .5, .7], [-r * .35, -r * .45, .6]]) blob(c, col, () => c.arc(x + dx, y + dy, r * k, 0, TAU), { line: 5 }); c.restore(); }
export function stars(c, x, y, r, t, n = 5, col = '#ffe23a') { for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 4, xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r * .35, s = 18; blob(c, col, () => { for (let k = 0; k < 10; k++) { const aa = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? s * .45 : s; k ? c.lineTo(xx + Math.cos(aa) * rr, yy + Math.sin(aa) * rr) : c.moveTo(xx + Math.cos(aa) * rr, yy + Math.sin(aa) * rr); } c.closePath(); }, { line: 4 }); } }
export function speedLines(c, cx, cy, a, t, col = 'rgba(255,255,255,.8)') { if (a <= 0) return; const R = mulberry(Math.floor(t * 15)); c.save(); c.globalAlpha = a; c.fillStyle = col; for (let i = 0; i < 70; i++) { const th = R() * TAU, w = .006 + R() * .01, r0 = 420 + R() * 300; c.beginPath(); c.moveTo(cx + Math.cos(th) * 1700, cy + Math.sin(th) * 1700); c.lineTo(cx + Math.cos(th + w) * r0, cy + Math.sin(th + w) * r0); c.lineTo(cx + Math.cos(th - w) * r0, cy + Math.sin(th - w) * r0); c.closePath(); c.fill(); } c.restore(); }
// microgame-style punch card: sunburst + shouted word (screen space)
export function punch(c, s, k, t, cols = ['#2a0f5c', '#ff2e88'], txt = '#ffc928') {
  if (k <= 0) return; c.save(); c.globalAlpha = Math.min(1, k * 1.5);
  c.translate(540, 900); for (let i = 0; i < 20; i++) { c.fillStyle = i % 2 ? cols[0] : cols[1]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 2400, i / 20 * TAU + t, (i + 1) / 20 * TAU + t); c.fill(); }
  c.rotate(-.06); const sc = .6 + .4 * Math.min(1, k * 1.4); c.scale(sc, sc);
  const lines = s.split('\n'); lines.forEach((l, i) => word(c, l, 0, (i - (lines.length - 1) / 2) * 160, l.length > 9 ? 120 : 160, 1, txt, 0));
  c.restore();
}
// hologram panel: flat translucent rings + a clipped mini-scene (draw callback)
export function holo(c, x, y, w, h, k, t, draw) {
  if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k);
  c.globalAlpha = .9; c.fillStyle = 'rgba(90,240,224,.18)'; c.beginPath(); c.roundRect(-w / 2 - 30, -h / 2 - 30, w + 60, h + 60, 30); c.fill();
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 20); c.save(); c.clip(); draw(c); c.fillStyle = 'rgba(90,240,224,.22)'; c.fillRect(-w, -h, w * 2, h * 2);
  for (let k2 = 0; k2 < h; k2 += 14) { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(-w / 2, -h / 2 + k2 + (t * 60) % 14, w, 3); } c.restore();
  c.lineWidth = lw(c, 8); c.strokeStyle = '#5af0e0'; c.stroke(); c.restore();
}
// pixel dissolve over the frame (screen space): cells vanish (to black or to space) by noise
export function pixelate(c, k, t, src) {
  if (k <= 0) return; const cell = 54;
  for (let y = 0; y < 1920; y += cell) for (let x = 0; x < 1080; x += cell) {
    const n = hash(x * .37 + y * 1.13);
    if (n < k) { c.fillStyle = n < k * .7 ? '#120a2a' : ['#5af0e0', '#ff2e88', '#ffc928'][Math.floor(n * 30) % 3]; c.fillRect(x, y + (n < k * .7 ? 0 : Math.sin(t * 5 + n * 9) * 10), cell - 2, cell - 2); }
  }
}
