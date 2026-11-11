// sets.js: reusable backgrounds. The bathroom (EP1 and the EP5 finale) and the living room/kitchen (EP2).
import { W, H, TAU, hash, clamp } from './core.js';
import { INK, toilet, ellipse as ell, rrect as rr, poly as line } from './chars.js';

// the bathroom; o.fan = ceiling-fan angle, o.door = 0 closed .. 1 blown away, o.light = 0..1 backlight in the doorway,
// o.noToilet to draw the toilet yourself (for layering), o.tilt for camera roll is done by the caller
export function bathroom(g, t, o = {}) {
  // wall tiles
  g.fillStyle = '#bfe8e0'; g.fillRect(-400, -400, W + 800, 1700 + 400);
  g.strokeStyle = '#9fd3c9'; g.lineWidth = 4;
  for (let y = -400; y < 1300; y += 90) { g.beginPath(); g.moveTo(-400, y); g.lineTo(W + 400, y); g.stroke(); }
  for (let x = -400; x < W + 400; x += 90) { g.beginPath(); g.moveTo(x, -400); g.lineTo(x, 1300); g.stroke(); }
  g.fillStyle = '#7cc7b8'; g.fillRect(-400, 1040, W + 800, 40);                      // tile border stripe
  for (let x = -400; x < W + 400; x += 60) { g.fillStyle = (x / 60) % 2 ? '#f2c14e' : '#7cc7b8'; g.fillRect(x, 1046, 30, 28); }
  // floor in perspective
  g.fillStyle = '#e9e3f5'; g.fillRect(-400, 1300, W + 800, 1000);
  g.save(); g.beginPath(); g.rect(-400, 1300, W + 800, 1000); g.clip();
  const vx = 540, vy = 760;
  const rows = [1300, 1352, 1416, 1494, 1590, 1706, 1846, 2010];
  for (let r = 0; r < rows.length - 1; r++) for (let c = -14; c < 14; c++) {
    if ((r + c) % 2 === 0) continue;
    const xa = k => vx + (c * 120 - vx + 540) * (rows[k] - vy) / (1300 - vy) + 0, xb = k => vx + ((c + 1) * 120 - vx + 540) * (rows[k] - vy) / (1300 - vy);
    g.beginPath(); g.moveTo(xa(r), rows[r]); g.lineTo(xb(r), rows[r]); g.lineTo(xb(r + 1), rows[r + 1]); g.lineTo(xa(r + 1), rows[r + 1]); g.closePath(); g.fillStyle = '#c9bfe6'; g.fill();
  }
  g.restore();
  line(g, [-400, 1300, W + 400, 1300], 8, INK);
  // little window with daylight
  rr(g, 620, 230, 220, 180, 16, '#9be7ff'); line(g, [730, 236, 730, 404], 7, INK); line(g, [626, 320, 834, 320], 7, INK);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(640, 250); g.lineTo(700, 250); g.lineTo(650, 300); g.closePath(); g.fill();
  // door (left)
  if ((o.door || 0) < .05) {
    rr(g, 30, 520, 280, 780, 10, '#c98a4b'); rr(g, 66, 570, 208, 300, 8, '#b5763a', 6); rr(g, 66, 920, 208, 320, 8, '#b5763a', 6);
    ell(g, 270, 900, 16, 16, '#ffd21f', 6);
  } else {
    // open doorway with backlight
    g.fillStyle = '#2a1f3a'; g.fillRect(30, 520, 280, 780);
    const L = o.light ?? 1; const gr = g.createRadialGradient(170, 900, 40, 170, 900, 600); gr.addColorStop(0, `rgba(255,250,220,${L})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.fillRect(30, 520, 280, 780);
    g.lineWidth = 8; g.strokeStyle = INK; g.strokeRect(30, 520, 280, 780);
  }
  // toilet paper holder
  line(g, [380, 1120, 440, 1120], 8, INK); ell(g, 410, 1150, 38, 32, '#ffffff'); ell(g, 410, 1150, 12, 10, '#c9bfe6', 4);
  // sink + mirror (right)
  rr(g, 800, 560, 250, 330, 20, '#d8f6ff'); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(830, 600); g.lineTo(900, 600); g.lineTo(830, 700); g.closePath(); g.fill();
  rr(g, 780, 1000, 320, 40, 10, '#ffffff'); ell(g, 930, 1004, 100, 22, '#cfe9f5', 5);
  line(g, [930, 960, 930, 990, 960, 990], 12, '#b0b8c8');
  g.beginPath(); g.moveTo(860, 1040); g.lineTo(880, 1300); g.lineTo(980, 1300); g.lineTo(1000, 1040); g.closePath(); g.fillStyle = '#f4f6fb'; g.fill(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  // ceiling fan (yes, in the bathroom)
  const fa = o.fan || 0;
  line(g, [540, -400, 540, 110], 12, INK);
  g.save(); g.translate(540, 130); g.scale(1, .28);
  for (let i = 0; i < 4; i++) { const a = fa + i * TAU / 4; g.save(); g.rotate(a); g.beginPath(); g.ellipse(140, 0, 130, 34, 0, 0, TAU); g.fillStyle = '#8d5a2b'; g.fill(); g.lineWidth = 16; g.strokeStyle = INK; g.stroke(); g.restore(); }
  g.restore();
  ell(g, 540, 130, 40, 26, '#d0d0d8'); ell(g, 540, 160, 22, 16, '#fff7c0', 5);
  if (!o.noToilet) toilet(g, 540 + (o.shakeT || 0), 1430, 1.05, { glow: o.glow || 0, water: o.water });
}

// the family living room + kitchen corner (EP2 opens here, floating in space: the window shows the Earth)
export function livingRoom(g, t, o = {}) {
  g.fillStyle = '#f6d7a0'; g.fillRect(-400, -400, W + 800, 1700);
  for (let x = -400; x < W + 400; x += 70) { g.fillStyle = 'rgba(200,140,80,.18)'; g.fillRect(x, -400, 30, 1700); }
  g.fillStyle = '#b07a46'; g.fillRect(-400, 1300, W + 800, 1000);
  for (let y = 1300; y < 2300; y += 70) { line(g, [-400, y, W + 400, y], 4, '#8f5d32'); }
  line(g, [-400, 1300, W + 400, 1300], 8, INK);
  // round window to space
  g.save(); g.beginPath(); g.arc(760, 520, 220, 0, TAU); g.clip();
  if (o.window) o.window(g); else { g.fillStyle = '#05030f'; g.fillRect(500, 260, 520, 520); }
  g.restore();
  g.beginPath(); g.arc(760, 520, 220, 0, TAU); g.lineWidth = 26; g.strokeStyle = '#7a4a22'; g.stroke(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.arc(760, 520, 233, 0, TAU); g.stroke();
  // kitchen counter + stove + coffee pot spot
  rr(g, -60, 1000, 520, 300, 12, '#e8e2d0'); rr(g, -60, 980, 540, 40, 10, '#9a6b3e');
  for (const x of [60, 200, 340]) rr(g, x, 1050, 110, 200, 8, '#d8d0b8', 5);
  // a framed photo: Juninho as a baby, already holding a remote
  rr(g, 120, 420, 220, 270, 10, '#fff8e6'); rr(g, 140, 440, 180, 200, 6, '#bde0ff', 5);
  ell(g, 230, 540, 54, 60, '#E8A877', 5); ell(g, 214, 530, 7, 7, INK, 0); ell(g, 246, 530, 7, 7, INK, 0);
  rr(g, 270, 560, 20, 50, 6, '#7B3FE4', 4);
  g.fillStyle = INK; g.font = '900 22px Nunito'; g.textAlign = 'center'; g.fillText('JUNINHO 1997', 230, 668);
  // sofa
  rr(g, 520, 1090, 520, 220, 50, '#3f7fd0'); rr(g, 500, 1040, 120, 260, 40, '#356cb5'); rr(g, 960, 1040, 120, 260, 40, '#356cb5');
  rr(g, 600, 1120, 160, 100, 30, '#5b97e4', 5); rr(g, 780, 1120, 160, 100, 30, '#5b97e4', 5);
}
