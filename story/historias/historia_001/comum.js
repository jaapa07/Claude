// comum.js: page plumbing for the four QUARTO 313 episodes: word times, the mirror rule (flipping whole shots),
// 2D inserts (the note, the hand with the ring, the wristwatch, the 1974 newspaper, VHS rewind, A/B/C badges, a
// projected smile), the end card and the seek loop.
import * as S from '../../../engine/stage.js';
import { buildWorld } from './mundo.js';
const { THREE, clamp, lerp, ease, spring, hud, chunkCaptions, drawCaptions, loadFonts, W: CW, H: CH } = S;
export { S, THREE, clamp, lerp, ease, spring };

export function setup() {
  const T = window.TIMING;
  const w = (li, word, n = 0) => { const b = s => s.toLowerCase().replace(/[^\p{L}0-9:]/gu, ''); let k = 0; for (const x of T.lines[li].words) if (b(x.w) === b(word) && k++ === n) return x.s; throw new Error(`word "${word}" not in line ${li}`); };
  const L0 = li => T.lines[li].words[0].s;
  const canvas = document.getElementById('film'); const c = canvas.getContext('2d');
  const stage = S.createStage(canvas);
  const Wd = buildWorld(stage);
  // camera-facing for figures/props inside rotated groups (the mirror chambers): yaw in world space
  const worldBill = m => cam => { const p = new THREE.Vector3(), q = new THREE.Vector3(), pq = new THREE.Quaternion(); cam.getWorldPosition(p); m.getWorldPosition(q); m.parent.getWorldQuaternion(pq); const py = new THREE.Euler().setFromQuaternion(pq, 'YXZ').y; m.rotation.y = Math.atan2(p.x - q.x, p.z - q.z) - py; };
  for (const p of [Wd.refl, Wd.lia, Wd.recep, Wd.viewer, ...Wd.ghosts]) p.mesh.userData.billboard = worldBill(p.mesh);
  Wd.cat.userData.billboard = worldBill(Wd.cat);
  return { T, w, L0, c, stage, Wd, worldBill };
}

// a figure lying on its side: the whole plane turned 90 degrees (the stickman stays upright inside its canvas)
export function lie(who, on = true, side = 1) { who.mesh.rotation.z = on ? side * Math.PI / 2 : 0; }
// the screen position of a stickman's head (for a 2D smile drawn on top)
export function headOnScreen(stage, who, flip) {
  stage.camera.updateMatrixWorld(true); const hw = who.headWorld(), v = hw.clone().project(stage.camera);
  const x = (v.x + 1) / 2 * CW, y = (1 - v.y) / 2 * CH, d = hw.distanceTo(stage.camera.position);
  const r = (who.o.height * 0.057) / (2 * d * Math.tan(stage.camera.fov * Math.PI / 360)) * CH;
  return { x: flip ? CW - x : x, y, r, front: v.z < 1 };
}
// aim the camera at a figure's face from a given offset
export function aimFace(stage, who, off, fov, dy = 0) { const h = who.headWorld(); stage.aim([h.x + off[0], h.y + off[1], h.z + off[2]], [h.x, h.y + dy, h.z], fov); }
export function smile(c, hd, k = 1) { if (!hd.front || k <= 0) return; c.save(); c.strokeStyle = '#15171c'; c.lineWidth = Math.max(4, hd.r * 0.16); c.lineCap = 'round'; c.beginPath(); c.arc(hd.x, hd.y + hd.r * 0.12, hd.r * 0.45, Math.PI * (0.5 - 0.3 * k), Math.PI * (0.5 + 0.3 * k)); c.stroke(); c.restore(); }
// draw the 3D frame mirrored (the mirror rule): text reverses, clocks run backwards, the ring changes hands
export function flipFrame(c, stage) { c.save(); c.setTransform(-1, 0, 0, 1, CW, 0); c.drawImage(stage.renderer.domElement, 0, 0, CW, CH); c.restore(); }
export function mirrored(c, on, fn) { c.save(); if (on) c.setTransform(-1, 0, 0, 1, CW, 0); fn(); c.restore(); }

// ---------- 2D inserts ----------
export function noteCard(c, k, lines, { reveal = 1, x = 540, y = 820, reversed = true } = {}) {
  if (k <= 0) return; c.save(); c.globalAlpha = clamp(k * 2); c.translate(x, y); c.rotate(0.03); const s = 0.9 + 0.1 * clamp(k); c.scale(s, s);
  c.fillStyle = '#efe6cf'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 50; c.fillRect(-330, -300, 660, 600); c.shadowBlur = 0;
  c.fillStyle = '#8a1f2a'; c.font = '700 30px Oswald'; c.textAlign = 'center'; c.fillText('HOTEL AURORA', 0, -250); c.fillRect(-120, -232, 240, 3);
  c.save(); if (reversed) c.scale(-1, 1); c.fillStyle = '#1f3a8a'; c.font = 'italic 700 54px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const total = lines.join('').length; let shown = Math.floor(total * clamp(reveal));
  lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, shown)); shown -= ln.length; c.fillText(part, 0, -150 + i * 84); }); c.restore();
  c.restore();
}
export function ringHand(c, k, flipped, circle = 0) {      // a macro of a hand with a silver ring and a gold watch
  if (k <= 0) return; mirrored(c, flipped, () => { c.globalAlpha = clamp(k * 2);
    c.fillStyle = 'rgba(5,8,8,0.82)'; c.fillRect(0, 0, CW, CH);
    c.lineCap = 'round'; c.lineJoin = 'round'; const sk = '#c9926b', ol = '#2a1810';
    const finger = (x0, y0, x1, y1, w) => { c.strokeStyle = ol; c.lineWidth = w + 14; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = sk; c.lineWidth = w; c.stroke(); };
    c.fillStyle = '#5a1424'; c.fillRect(170, 1250, 380, 520);                                   // the velvet sleeve
    c.strokeStyle = ol; c.lineWidth = 14; c.fillStyle = sk; c.beginPath(); c.ellipse(420, 1060, 190, 230, -0.2, 0, 7); c.fill(); c.stroke();
    finger(300, 900, 250, 600, 70); finger(390, 870, 380, 520, 74); finger(480, 880, 520, 540, 72); finger(560, 930, 640, 650, 62); finger(560, 1150, 760, 1020, 70);
    c.strokeStyle = '#d9dde3'; c.lineWidth = 26; c.beginPath(); c.moveTo(452, 760); c.lineTo(520, 770); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.moveTo(460, 752); c.lineTo(500, 758); c.stroke();
    c.fillStyle = '#c9a23a'; c.fillRect(230, 1230, 340, 60); c.beginPath(); c.arc(400, 1260, 70, 0, 7); c.fill(); c.fillStyle = '#efe6cf'; c.beginPath(); c.arc(400, 1260, 54, 0, 7); c.fill();
    c.strokeStyle = '#2b2522'; c.lineWidth = 6; c.beginPath(); c.moveTo(400, 1260); c.lineTo(400, 1220); c.moveTo(400, 1260); c.lineTo(425, 1270); c.stroke();
    if (circle > 0) { c.strokeStyle = '#ff4b3e'; c.lineWidth = 12; c.beginPath(); c.arc(486, 765, 120, 0, Math.PI * 2 * clamp(circle)); c.stroke(); } });
}
export function watch(c, k, flipped, hh, mm, ss) {
  if (k <= 0) return; mirrored(c, flipped, () => { c.globalAlpha = clamp(k * 2); c.fillStyle = 'rgba(5,8,8,0.8)'; c.fillRect(0, 0, CW, CH);
    c.fillStyle = '#c9926b'; c.fillRect(0, 760, CW, 400); c.fillStyle = '#5a1424'; c.fillRect(0, 760, 220, 400);
    c.fillStyle = '#7a5a20'; c.fillRect(380, 700, 320, 520); c.fillStyle = '#c9a23a'; c.beginPath(); c.arc(540, 960, 230, 0, 7); c.fill(); c.fillStyle = '#efe6cf'; c.beginPath(); c.arc(540, 960, 196, 0, 7); c.fill();
    c.fillStyle = '#2b2522'; c.font = '700 40px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let n = 1; n <= 12; n++) { const a = n / 12 * Math.PI * 2; c.fillText(String(n), 540 + Math.sin(a) * 160, 960 - Math.cos(a) * 160); }
    const hand = (a, len, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(540, 960); c.lineTo(540 + Math.sin(a) * len, 960 - Math.cos(a) * len); c.stroke(); };
    hand((hh + mm / 60) / 12 * Math.PI * 2, 100, 16, '#2b2522'); hand(mm / 60 * Math.PI * 2, 150, 10, '#2b2522'); hand(ss / 60 * Math.PI * 2, 170, 4, '#c8372d'); });
}
export function newspaper(c, k) {
  if (k <= 0) return; c.save(); c.globalAlpha = clamp(k * 2);
  c.globalCompositeOperation = 'color'; c.fillStyle = '#7a5a30'; c.fillRect(0, 0, CW, CH); c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(40,30,15,0.35)'; c.fillRect(0, 0, CW, CH);
  c.fillStyle = '#e9dfc6'; c.fillRect(60, 180, 960, 260); c.fillStyle = '#1f1a12'; c.font = '700 44px Georgia, serif'; c.textAlign = 'center'; c.fillText('DIÁRIO DA CIDADE · 1974', 540, 240);
  c.font = '700 74px Oswald'; c.fillText('INCÊNDIO NO HOTEL AURORA', 540, 330); c.font = '700 36px Georgia, serif'; c.fillText('hóspede do quarto 313 nunca foi encontrada', 540, 400);
  for (let i = 0; i < 400; i++) { const x = (i * 97.3) % CW, y = (i * 211.7) % CH; c.fillStyle = `rgba(0,0,0,${0.08 + (i % 5) * 0.02})`; c.fillRect(x, y, 2, 2); }
  c.restore();
}
export function vhs(c, t, k = 1) { c.save(); c.globalAlpha = k; for (let y = 0; y < CH; y += 7) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, CW, 3); } const by = (t * 900) % CH; c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, by, CW, 40);
  c.fillStyle = '#ffffff'; c.font = '700 70px "JetBrains Mono"'; c.textAlign = 'left'; c.fillText('◀◀ REW', 70, 380); c.restore(); }
export function badge(c, letter, k, col = '#ffcc4d') { if (k <= 0) return; c.save(); c.translate(150, 520); const s = clamp(spring(k * 1.5), 0, 1.2); c.scale(s, s); c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = col; c.stroke(); c.fillStyle = col; c.font = '700 130px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, 0, 8); c.restore(); }
export function ring(c, x, y, r, k, col = '#ff4b3e') { if (k <= 0) return; c.save(); c.strokeStyle = col; c.lineWidth = 12; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(k)); c.stroke(); c.restore(); }
export function triptych(c, k) { if (k <= 0) return; c.save(); c.globalAlpha = clamp(k * 2); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, CW, CH);
  [['A', 'A PORTA', '#2e9e57'], ['B', 'O ESPELHO', '#c8372d'], ['C', 'A JANELA', '#3a6fd6']].forEach(([l, s, col], i) => { const x = 60 + i * 330; c.fillStyle = col; c.globalAlpha = clamp(k * 2) * 0.85; c.beginPath(); c.roundRect(x, 620, 300, 560, 26); c.fill(); c.globalAlpha = clamp(k * 2);
    c.fillStyle = '#fff'; c.font = '700 200px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(l, x + 150, 840); c.font = '700 46px Oswald'; c.fillText(s, x + 150, 1080); }); c.restore(); }
export function hardBlack(c, k) { if (k <= 0) return; c.save(); c.fillStyle = `rgba(0,0,0,${clamp(k)})`; c.fillRect(0, 0, CW, CH); c.restore(); }

// the end card (the same design as cenas/cartao_final.jpg)
export function card(c, E, t0, t) {
  const k = clamp(spring(t - t0), 0, 1.1), C = E.card;
  c.save(); c.fillStyle = 'rgba(5,7,13,0.9)'; c.fillRect(0, 0, CW, CH);
  c.translate(540, 900); c.scale(0.86 + 0.14 * k, 0.86 + 0.14 * k); c.translate(-540, -900);
  const txt = (s, y, size, col, stroke = 10) => { c.font = `700 ${size}px Oswald`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = '#000'; if (stroke) c.strokeText(s, 540, y); c.fillStyle = col; c.fillText(s, 540, y); };
  c.fillStyle = '#d93b30'; c.beginPath(); c.roundRect(340, 300, 400, 80, 40); c.fill(); txt(`QUARTO 313 · EP ${E.n}`, 342, 44, '#fff', 0);
  C.titulo.forEach((s, i) => txt(s, 520 + i * 125, 112, '#ffffff'));
  const cols = ['#2e9e57', '#c8372d', '#3a6fd6'];
  if (C.opcoes) C.opcoes.forEach((s, i) => { const y = 880 + i * 190; c.fillStyle = cols[i % 3]; c.beginPath(); c.roundRect(150, y - 72, 780, 144, 32); c.fill(); txt(s, y, 66, '#fff', 0); });
  else { txt(C.linha1, 900, 64, '#ffcc4d'); txt(C.linha2, 990, 64, '#ffcc4d'); }
  txt('COMENTE ABAIXO', 1520, 60, '#ffffff', 8); txt(C.rodape, 1610, 50, '#ffcc4d', 8); c.restore();
}

// the seek loop: shots are [start, fn(t, u) -> {flip, fx(c)}]; fx draws the 2D inserts for that shot
export async function run({ T, c, stage, SH, E, clockAt, extra, coverAt, cover }) {
  const CHUNKS = chunkCaptions(T); window.CHUNKS = CHUNKS;
  const tEnd = T.voice_end + 0.3; window.TOTAL = T.voice_end + 3.6;
  const draw = t => {
    let i = 0; while (i + 1 < SH.length && t >= SH[i + 1][0]) i++;
    const r = SH[i][1](t, t - SH[i][0]) || {};
    stage.draw(t, { vignette: 0.55, bloomStrength: r.bloom ?? 0.6, fisheye: r.fisheye || 0 });
    if (r.flip) flipFrame(c, stage);
    if (r.fx) r.fx(c);
    const [a, b] = clockAt(t); hud(c, a, b);
    if (extra) extra(c, t, i);
    return r;
  };
  window.seek = t => {
    if (location.hash === '#cover') { draw(coverAt); if (cover) cover(c); return; }
    const r = draw(t);
    if (t >= tEnd) card(c, E, tEnd, t); else if (!r.noCaptions) drawCaptions(c, CHUNKS, t, r.capY || 1310);
  };
  await loadFonts(); window.seek(0); window.READY = true;
}
