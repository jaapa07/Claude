// EP 3 — A GUERRA INTERGALÁCTICA DA MORTADELA (90 s). All times are absolute episode seconds.
import { W, H, TAU, clamp, prog, lerp, ease, hash, noise, shake, shakes, K } from '../../lib/core.js';
import { juninho, cleide, controle, chinelo, speedLines, INK, ellipse as ell, rrect as rr, poly as line, PAL } from '../../lib/chars.js';
import { alien, sanduiche, mortadela, queijo, tomate, disco } from '../../lib/chars2.js';
import { cam, comic, flash, whip, vignette, burst, titleCard, radial, text, letterbox } from '../../lib/fx.js';
import { livingRoom } from '../../lib/sets.js';
import { THREE, draw3d, camera, sky, earth, house, fleet, motherShip, portal, lights, saucerGeometry } from '../../lib/world3d.js';

export const META = { num: 3, title: 'A GUERRA INTERGALÁCTICA DA MORTADELA', total: 90 };
const T = {
  room: 6.5, roof: 10.8, grab: 13.9, gulp: 14.9, holo: 20.0, beams: 24.4, refuse: 28.2, stare: 32.0, yank: 34.6, protocol: 37.6,
  battle: 40.0, laser: 43.4, shields: 44.9, reflect: 47.6, tomato: 50.0, launch: 52.2, boom1: 53.4, splat: 53.9, wiper: 55.6, salt: 57.0,
  cockpit: 60.0, honk: 63.6, chase: 70.0, cockpit2: 75.0, pull: 75.6, throwC: 80.0, smack: 81.35, boom: 81.5, quiet: 83.6, voz: 85.2,
};
export const LINES = [
  { id: 'j1', who: 'juninho', at: 6.9, text: 'Relaxa, mãe. Deixa que eu negocio.' },
  { id: 'c0', who: 'cleide', at: 8.7, text: 'Você não negocia nem com o despertador!' },
  { id: 'j2', who: 'juninho', at: 11.3, text: 'Calma, campeão! Trouxe um sanduíche da paz!' },
  { id: 'a1', who: 'alien', at: 16.2, text: 'Um? UM?! Eu tenho dois mil estômagos!' },
  { id: 'a2', who: 'alien', at: 20.4, text: 'POVO DA TERRA! EU EXIJO TODA A MORTADELA DO PLANETA!' },
  { id: 'j3', who: 'juninho', at: 28.6, text: 'Pode levar, mas deixa pelo menos o pão francês, seu miserável!' },
  { id: 'a3', who: 'alien', at: 34.0, text: 'Pão francês? Levem também.' },
  { id: 'r1', who: 'controle', at: 37.8, text: 'Protocolo guerra culinária: ativado.' },
  { id: 'j4', who: 'juninho', at: 44.3, text: 'QUEIJO, ESCUDO!' },
  { id: 'r2', who: 'controle', at: 50.0, text: 'Botão amarelo: tomate gigante.' },
  { id: 'j5', who: 'juninho', at: 57.7, text: 'Hm. Faltou sal.' },
  { id: 'c1', who: 'cleide', at: 60.6, text: 'SAI DA FRENTE QUE A MÃE TÁ PILOTANDO!' },
  { id: 'j6', who: 'juninho', at: 66.3, text: 'Mãe, eu vou vomitar!' },
  { id: 'c2', who: 'cleide', at: 67.9, text: 'ENGOLE!' },
  { id: 'r3', who: 'controle', at: 76.0, text: 'Aviso: o chinelo era o volante.' },
  { id: 'c3', who: 'cleide', at: 78.4, text: 'EU SEI!' },
  { id: 'v1', who: 'voz', at: 85.3, text: 'Vocês acabaram de declarar guerra ao Império da Salsicha.' },
];
export const SFX = [
  [0.0, 'hum', 1], [0.3, 'warp', .8], ...[0, 1, 2, 3, 4, 5, 6].map(i => [0.6 + i * .55, 'whoosh', .5]), [4.4, 'hum', 1.2], [4.6, 'rumble', .8],
  [T.room, 'whoosh', .4], [9.2, 'scratch', .3], [T.roof, 'swoosh_up', .5], [T.grab - .1, 'zap', .8], [T.grab + .2, 'slide_up', .6], [T.gulp, 'gulp', 1.2], [T.gulp + .3, 'gulp', .8], [15.6, 'ding', .4],
  [T.holo, 'glitch', .8], [T.holo + .1, 'thunder', .5], [T.beams, 'zap', .7], [T.beams + .3, 'hum', .8], [25.5, 'power_down', .6], [27.2, 'beep', .6], [27.5, 'beep', .6],
  [T.stare, 'drumroll', .4], [T.yank, 'zap', .9], [T.yank + .1, 'slide_up', .8], [35.8, 'boing', .9], [36.4, 'thud', .9], [T.protocol, 'power_up', 1],
  ...Array.from({ length: 12 }, (_, k) => [40.6 + k * .62, 'whoosh', .45]), ...Array.from({ length: 12 }, (_, k) => [41.4 + k * .62, k === 5 ? 'kiss' : 'pop', 1]),
  ...Array.from({ length: 10 }, (_, k) => [T.laser + k * .38, 'laser', .55]), [T.shields, 'magic', 1], [T.shields + .1, 'power_up', .5], ...[0, 1, 2, 3, 4, 5].map(k => [45.6 + k * .4, 'zap', .45]),
  [T.reflect, 'laser', 1], [T.reflect + .45, 'explosion', .7],
  [T.tomato + .2, 'power_up', .8], [51.8, 'gasp', .9], [T.launch, 'swoosh_up', 1.1], [T.boom1, 'explosion', 1.2], [T.boom1 + .05, 'splash', 1.2], [T.splat, 'squish', 1], [T.splat + .1, 'plop', .8],
  [T.wiper, 'whoosh', .5], [T.wiper + .5, 'squish', .5], [57.3, 'kiss', .5],
  [T.cockpit, 'power_up', .7], [T.cockpit + .2, 'hum', .9], [T.honk, 'honk', 1.3], [64.2, 'honk', 1.3], [64.9, 'whoosh', .6], [66.0, 'gulp', .3], [68.6, 'gulp', 1.2],
  [T.chase, 'whoosh', .9], [71.6, 'laser', .5], [72.4, 'whoosh', .8], [73.3, 'laser', .5], [74.2, 'whoosh', .9],
  [T.pull, 'alarm', .8], [T.pull + .1, 'scratch', .4], [79.2, 'whoosh', .4],
  [T.throwC, 'whoosh', 1.1], [T.throwC + .4, 'warp', 1], [T.smack, 'bigslap', 1.5], [T.boom, 'explosion', 1.5], [T.boom + .3, 'thunder', 1], [T.boom + .6, 'glitch', .7],
  [T.quiet + .6, 'tick', .5], [T.voz - .2, 'rumble', .9],
];
export const MUSIC = [[0, 'tension', .7], [T.roof, 'lounge', .45], [T.holo, 'tension', .8], [T.stare, 'none'], [T.protocol, 'epic', .8], [T.salt, 'none'], [T.cockpit, 'chase', .8], [T.pull, 'none'], [T.quiet, 'none'], [T.voz, 'tension', .45]];

// ---------------- local helpers ----------------
const holoCanvas = document.createElement('canvas'); holoCanvas.width = W; holoCanvas.height = H; const hg = holoCanvas.getContext('2d');
function holo(g, t, drawFn, alpha = .85) {        // Zorgnak's sky hologram: green tint, scanlines, flicker, slices that jump
  hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'source-over'; hg.clearRect(0, 0, W, H);
  drawFn(hg);
  hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = 'rgba(80,255,160,.35)'; hg.fillRect(0, 0, W, H);
  hg.fillStyle = 'rgba(0,40,20,.35)'; for (let y = (t * 120) % 8; y < H; y += 8) hg.fillRect(0, y, W, 3);
  hg.globalCompositeOperation = 'source-over';
  const fl = .85 + .15 * Math.sin(t * 37) * Math.sin(t * 13);
  g.save(); g.globalAlpha = alpha * fl; g.shadowColor = '#5cff9a'; g.shadowBlur = 40;
  const jump = Math.floor(t * 9) % 11 === 0 ? 1 : 0;
  if (jump) { g.drawImage(holoCanvas, 0, 0, W, 900, 18, 0, W, 900); g.drawImage(holoCanvas, 0, 900, W, H - 900, -10, 900, W, H - 900); }
  else g.drawImage(holoCanvas, 0, 0);
  g.restore();
}
function roof(g, t) {                             // the family roof, seen from the ridge, Earth-orbit edition
  g.save();
  rr(g, 820, 1090, 130, 330, 8, '#9a4a30');        // chimney
  for (let y = 1110; y < 1400; y += 36) line(g, [826, y, 944, y], 4, '#7a3420');
  g.beginPath(); g.moveTo(-60, 1390); g.lineTo(W + 60, 1390); g.lineTo(W + 200, H + 10); g.lineTo(-200, H + 10); g.closePath(); g.fillStyle = '#c4462e'; g.fill();
  g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  g.save(); g.clip();
  for (let r = 0; r < 9; r++) { const y = 1400 + r * 62, sc = 1 + r * .1; for (let x = -200 + (r % 2) * 40; x < W + 200; x += 80 * sc) { g.beginPath(); g.arc(x, y + 50, 40 * sc, Math.PI, 0); g.fillStyle = '#a63622'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#7a2414'; g.stroke(); } }
  g.restore();
  rr(g, -40, 1370, W + 80, 34, 14, '#8a2c1a');     // ridge cap
  g.restore();
}
const handItem = (fn, dy = 0, rot = Math.PI) => g => { g.save(); g.translate(0, dy); g.rotate(rot); fn(g); g.restore(); };
function cuecaFlag(g) {                           // a white flag. It is underwear. It has a stain.
  line(g, [0, 0, 0, 260], 9, '#8d5a2b');
  g.save(); g.translate(0, 230); g.rotate(Math.PI);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(120, -6); g.lineTo(112, 70); g.quadraticCurveTo(90, 50, 70, 90); g.lineTo(46, 90); g.quadraticCurveTo(40, 50, 6, 70); g.closePath();
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  ell(g, 58, 62, 12, 9, '#a9834a', 0); line(g, [4, 8, 116, 2], 8, '#cfd6ff');
  g.restore();
}
function hexShield(g, cx, cy, r, t, a = 1) {      // a cheese slice blown up into a holographic hex shield
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(cx, cy, r * .2, cx, cy, r); gr.addColorStop(0, 'rgba(255,210,31,.10)'); gr.addColorStop(.85, 'rgba(255,210,31,.28)'); gr.addColorStop(1, 'rgba(255,240,140,.8)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,230,90,.55)'; g.lineWidth = 3; const s = 34;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) {
    const x = cx + i * s * 1.5, y = cy + j * s * 1.73 + (i % 2 ? s * .866 : 0); if (Math.hypot(x - cx, y - cy) > r + s) continue;
    const pulse = .5 + .5 * Math.sin(t * 6 - Math.hypot(x - cx, y - cy) * .03);
    g.globalAlpha = a * (.35 + .65 * pulse); g.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU; g.lineTo(x + Math.cos(an) * s * .95, y + Math.sin(an) * s * .95); } g.closePath(); g.stroke();
  }
  for (const [hx, hy, hr] of [[-.3, -.2, .12], [.25, .1, .16], [-.05, .35, .09], [.35, -.35, .07]]) { g.globalAlpha = a * .5; g.fillStyle = 'rgba(255,170,0,.5)'; g.beginPath(); g.arc(cx + hx * r, cy + hy * r, hr * r, 0, TAU); g.fill(); }
  g.restore();
  g.globalAlpha = a; g.lineWidth = 10; g.strokeStyle = 'rgba(255,240,150,.9)'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
  g.restore();
}
function laserBolt(g, x0, y0, x1, y1, k, col = '#7dff4a') {
  const x = lerp(x0, x1, k), y = lerp(y0, y1, k), dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  g.strokeStyle = col; g.lineWidth = 16; g.globalAlpha = .5; g.beginPath(); g.moveTo(x - ux * 120, y - uy * 120); g.lineTo(x, y); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.globalAlpha = 1; g.beginPath(); g.moveTo(x - ux * 100, y - uy * 100); g.lineTo(x, y); g.stroke();
  g.restore();
}
function cockpit(g, t, o = {}) {                  // the inside of a stolen saucer: dome windshield + console
  g.fillStyle = '#1b0f2e'; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.moveTo(-20, 1260); g.lineTo(-20, 420); g.quadraticCurveTo(540, -140, W + 20, 420); g.lineTo(W + 20, 1260); g.closePath(); g.clip();
  o.view(g); g.restore();
  // dome frame
  g.beginPath(); g.moveTo(-20, 420); g.quadraticCurveTo(540, -140, W + 20, 420); g.lineWidth = 40; g.strokeStyle = '#4a3b6a'; g.stroke(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  line(g, [540, 140, 540, 60], 30, '#4a3b6a');
  g.save(); g.globalAlpha = .12; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(140, 420); g.quadraticCurveTo(300, 200, 520, 160); g.lineTo(520, 200); g.quadraticCurveTo(320, 240, 190, 430); g.closePath(); g.fill(); g.restore();
  if (o.mid) o.mid(g);
  // console
  g.beginPath(); g.moveTo(-20, 1230); g.quadraticCurveTo(540, 1150, W + 20, 1230); g.lineTo(W + 20, H + 10); g.lineTo(-20, H + 10); g.closePath();
  const gr = g.createLinearGradient(0, 1150, 0, H); gr.addColorStop(0, '#6b6f8a'); gr.addColorStop(1, '#2a2c3e'); g.fillStyle = gr; g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  for (let i = 0; i < 14; i++) { const x = 60 + i * 72, on = (Math.floor(t * 6 + i * 1.7) % 3) === 0; ell(g, x, 1290 + (i % 2) * 30, 14, 14, on ? ['#ff3bd1', '#5cf2ff', '#ffd21f', '#7dff4a'][i % 4] : '#3a3c52', 4); }
  for (const [x, y] of [[180, 1700], [900, 1700]]) { rr(g, x - 110, y - 60, 220, 120, 16, '#08120c', 6); g.fillStyle = '#7dff4a'; g.font = '400 34px Bangers'; g.textAlign = 'center'; g.fillText(['⊑⌖⟟⏁', '⍜⏃⋔⊬'][x > 500 ? 1 : 0], x, y + 12); }
  if (o.front) o.front(g);
}
function joystick(g, x, y, tilt, withChinelo = true) {
  rr(g, x - 70, y - 10, 140, 50, 20, '#2a2c3e');
  g.save(); g.translate(x, y); g.rotate(tilt);
  if (withChinelo) chinelo(g, 0, 10, .85, 0);
  else { line(g, [0, 0, 0, -90], 16, '#9aa0c0'); ell(g, 0, -100, 22, 22, '#ff3b5c', 5); g.save(); g.globalCompositeOperation = 'lighter'; ell(g, 0, -110, 40, 40, 'rgba(255,60,90,.4)', 0); g.restore(); }
  g.restore();
}
function spaceView(g, t, speed = 1, seed = 1) {
  g.fillStyle = '#05030f'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) { const k = ((t * .5 * speed + hash(i, seed)) % 1), a = hash(i, seed + 1) * TAU, r = 30 + k * k * 900; const x = 540 + Math.cos(a) * r, y = 560 + Math.sin(a) * r * .8; g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = 2 + k * 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 40 * k * speed, y + Math.sin(a) * 32 * k * speed); g.stroke(); }
}

export async function makeShots({ talk }) {
  const shots = []; const S = (t0, draw) => shots.push({ t0, draw });

  // ---------- the shared 3D world: Earth, the house in orbit, 2400 saucers and the mothership ----------
  const W3 = new THREE.Scene(); W3.add(sky(13, [.35, .1, .5], [.05, .25, .5])); lights(W3, { amb: .55, sun: 2.4, dir: [4, 6, 5] });
  const E = earth(100); W3.add(E);
  const HS = house(); HS.scale.setScalar(.9); HS.position.set(0, 116, 30); W3.add(HS);
  const NF = 2400, F = fleet(NF); W3.add(F);
  F.children.forEach(m => { m.frustumCulled = false; });   // lib workaround: InstancedMesh bounds are computed once from the identity matrices
  E.rotation.x = -1.0;   // tilt the planet so the polar cap is not under the house
  W3.add(new THREE.HemisphereLight(0xb0b8ff, 0x663355, 1.3));
  const MS = motherShip(); W3.add(MS); const M0 = new THREE.Vector3(0, 330, -80);
  const ships = [];
  for (let i = 0; i < NF; i++) {
    const yy = .18 + hash(i, 102) * .82, th = hash(i, 103) * TAU, rr_ = Math.sqrt(1 - yy * yy), r = 250 + hash(i, 104) * 280;
    const dx = Math.cos(th) * rr_, dy = yy, dz = Math.sin(th) * rr_;
    ships.push({ x: dx * r, y: dy * r, z: dz * r, dx, dy, dz, s: 2.2 + hash(i, 105) * 2.6, ta: hash(i, 106) * 4.6 });
  }
  const hits = new Map();
  const shipAt = (i, t) => {
    const b = ships[i], k = ease.outC(clamp((t - b.ta) / 1.3));
    if (k <= 0) return [0, -9999, 0, 0, 0];
    const far = (1 - k) * 900;
    let x = b.x + b.dx * far, y = b.y + b.dy * far + Math.sin(t * 1.3 + i) * 1.2, z = b.z + b.dz * far, s = b.s * Math.min(1, k * 3), rx = 0;
    const h = hits.get(i); if (h !== undefined && t > h) s *= 1 - clamp((t - h) / .25);
    if (t > T.boom) { const e = t - T.boom, ex = x - M0.x, ey = y - M0.y, ez = z - M0.z, d = Math.hypot(ex, ey, ez) || 1, push = 520 * (1 - Math.exp(-e * 1.4)) / (1 + d / 160); x += ex / d * push; y += ey / d * push; z += ez / d * push; rx = e * 6 * hash(i, 9) / (1 + d / 200); }
    return [x, y, z, s, t * .6 + i, rx];
  };
  // explosion pieces (3D): fireball, white core, shock ring and 3000 debris points
  const fire = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); W3.add(fire);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); W3.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .04, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2 - .3; W3.add(ring);
  const ND = 3000, dpos = new Float32Array(ND * 3), dvel = [], dcol = new Float32Array(ND * 3);
  for (let i = 0; i < ND; i++) { const u = hash(i, 201) * 2 - 1, th = hash(i, 202) * TAU, rr_ = Math.sqrt(1 - u * u), v = 40 + hash(i, 203) * 160; dvel.push([Math.cos(th) * rr_ * v, u * v, Math.sin(th) * rr_ * v]); const w = hash(i, 204); dcol.set(w > .6 ? [1, .9, .5] : w > .3 ? [1, .45, .1] : [.6, .62, .8], i * 3); }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dgeo.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
  const debris = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); W3.add(debris);
  const PT = portal(40, [.35, .95, 1]); PT.position.set(-70, 410, 120); W3.add(PT);
  const her = new THREE.Group(); { const h = new THREE.Mesh(saucerGeometry(), new THREE.MeshStandardMaterial({ color: 0xff7fb4, metalness: .5, roughness: .3 })); her.add(h); const d = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd21f, emissiveIntensity: .6 })); d.position.y = .2; her.add(d); her.scale.setScalar(4); W3.add(her); }
  function setWorld(t) {
    E.userData.set(t);
    F.userData.set(t, shipAt);
    const mk = ease.outC(prog(t, 3.6, 6.4));
    MS.position.set(M0.x, M0.y + (1 - mk) * 260, M0.z - (1 - mk) * 900); MS.rotation.y = t * .15;
    MS.visible = t < T.boom + .2;
    const e = t - T.boom;
    fire.visible = core.visible = ring.visible = debris.visible = e > 0 && e < 8;
    if (e > 0) {
      fire.position.copy(M0); core.position.copy(M0); ring.position.copy(M0);
      fire.scale.setScalar(10 + 110 * ease.outC(clamp(e / 1.6))); fire.material.opacity = clamp(1 - e / 2.6);
      core.scale.setScalar(6 + 60 * ease.outC(clamp(e / .5))); core.material.opacity = clamp(1 - e / .9);
      ring.scale.setScalar(20 + 260 * ease.outC(clamp(e / 2))); ring.material.opacity = clamp(1 - e / 2.2);
      for (let i = 0; i < ND; i++) { const v = dvel[i], d = 1 - Math.exp(-e * 1.1); dpos[i * 3] = M0.x + v[0] * d * 2; dpos[i * 3 + 1] = M0.y + v[1] * d * 2; dpos[i * 3 + 2] = M0.z + v[2] * d * 2; }
      dgeo.attributes.position.needsUpdate = true; debris.material.opacity = clamp(1.6 - e / 4);
    }
    PT.visible = t > T.throwC && t < T.boom + .4; PT.userData.set(t, ease.outBack(prog(t, T.throwC + .2, T.throwC + .7)) * (1 - prog(t, T.boom, T.boom + .4)));
    PT.lookAt(90, 385, 240);
    her.visible = t > T.chase && t < T.cockpit2;
  }
  const proj = (v, c) => { const p = v.clone().project(c); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; };

  // roof / battle camera: from the house, looking up into the fleet
  const BC = camera(62); BC.position.set(0, 132, 44); BC.lookAt(0, 262, -110); BC.updateMatrixWorld();
  // targets for the sandwich missiles: ships that are big and on screen from the battle camera
  const cand = [];
  for (let i = 0; i < NF; i++) { const s = ships[i]; const [x, y, z] = proj(new THREE.Vector3(s.x, s.y, s.z), BC); if (z < 1 && x > 140 && x < 940 && y > 160 && y < 860) cand.push({ i, x, y, d: Math.hypot(s.x - BC.position.x, s.y - BC.position.y, s.z - BC.position.z) }); }
  cand.sort((a, b) => a.d - b.d);
  const targets = cand.filter((c, k) => cand.findIndex(o => Math.hypot(o.x - c.x, o.y - c.y) < 90) === k).slice(0, 26);
  const MIS = Array.from({ length: 12 }, (_, k) => ({ t0: 40.6 + k * .62, tg: targets[k], love: k === 5 }));
  MIS.forEach(m => { if (m.tg && !m.love) hits.set(m.tg.i, m.t0 + .8); });
  const refl = targets[14]; if (refl) hits.set(refl.i, T.reflect + .45);
  const tomTarget = [540, 430];
  cand.forEach(c => { if (Math.hypot(c.x - tomTarget[0], c.y - tomTarget[1]) < 300) hits.set(c.i, T.boom1 + hash(c.i, 7) * .3); });
  const LAS = Array.from({ length: 10 }, (_, k) => { const s = targets[16 + (k % 10)] || targets[k]; return { t0: T.laser + k * .38, x0: s ? s.x : 540, y0: s ? s.y : 300, x1: [300, 540, 780, 420, 660][k % 5] + hash(k, 3) * 60, y1: 1300 }; });
  const SH = [[250, 760, 210], [540, 640, 230], [830, 760, 210]];
  const shotsAgain = (g, t) => { setWorld(t); draw3d(g, W3, BC); };

  // ---------- 1. the fleet arrives (0 – 6.5) ----------
  const C1 = camera(44);
  S(0, (g, lt, t) => {
    setWorld(t);
    const k = ease.ioC(prog(lt, 0, 6.5));
    C1.position.set(lerp(18, 170, k), lerp(124, 210, k), lerp(78, 470, k)); C1.lookAt(lerp(0, 0, k), lerp(118, 220, k), lerp(30, -60, k));
    draw3d(g, W3, C1);
    if (lt > 4.2 && lt < 6.5) { const a = prog(lt, 4.2, 5); g.save(); g.globalAlpha = a * .25; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore(); }
    titleCard(g, t, 3, 'A GUERRA DA MORTADELA', .3, 3.6);
    vignette(g, .5);
  });

  // ---------- 2. living room: "deixa que eu negocio" (6.5 – 10.8) ----------
  S(T.room, (g, lt, t) => {
    g.save(); cam(g, { x: 560, y: 980, z: 1.05 + lt * .02 });
    livingRoom(g, t, { window: wg => { wg.fillStyle = '#05030f'; wg.fillRect(500, 260, 520, 520); ell(wg, 760, 330, 260, 70, '#8a90b8', 6); for (let i = 0; i < 26; i++) disco(wg, 560 + hash(i, 1) * 400, 420 + hash(i, 2) * 320 + Math.sin(t * 2 + i) * 6, .18 + hash(i, 3) * .12, t, { pilot: false }); } });
    juninho(g, { x: 330, y: 1390, s: 1.05, t, face: t > 8.7 ? 'smug' : 'happy', talk: talk('juninho', t), armR: { a: 2.6, b: .2 }, inR: handItem(cuecaFlag, 0, 0), armL: { a: 1.1, b: 1.2 }, inL: handItem(g2 => sanduiche(g2, { s: .45 }), 40) });
    cleide(g, { x: 800, y: 1390, s: 1.05, t, face: t > 8.7 ? 'angry' : 'neutral', talk: talk('cleide', t), armR: { a: 2.4, b: .5 }, armL: { a: .6, b: 1.6 } });
    g.restore();
    if (t > 9.3) comic(g, 'TOUCHÉ', 760, 300, t - 9.6, { size: 90, color: '#fff', burst: '#ff7fb4', d: 1.1 });
    whip(g, lt, .3);
  });

  // ---------- 3. on the roof: the peace sandwich (10.8 – 20.0) ----------
  const alienHolo = (t, o = {}) => hg2 => alien(hg2, { x: 540, y: 1180, s: 1.55, t, face: 'angry', talk: talk('alien', t), ...o });
  S(T.roof, (g, lt, t) => {
    shotsAgain(g, t);
    const gk = t - T.grab, ate = t > T.gulp;
    holo(g, t, alienHolo(t, { face: t > T.gulp && t < 16 ? 'happy' : t > 16 ? 'angry' : 'neutral', armR: t > T.grab + .4 && t < T.gulp + .2 ? 2.6 : .4, inR: t > T.grab + .6 && !ate ? g2 => sanduiche(g2, { s: .5, y: 40 }) : null }), .8);
    if (t > 16.2) { text(g, 'ESTÔMAGOS: 2.000', 540, 230, { size: 70, color: '#7dff4a', stroke: 10 }); for (let i = 0; i < 18; i++) ell(g, 150 + (i % 9) * 98, 320 + Math.floor(i / 9) * 70 + Math.sin(t * 6 + i) * 4, 34, 24, '#ff9ec7', 5); }
    // the tractor beam takes the sandwich
    if (gk > 0 && gk < 1.0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(125,255,74,${.35 * (1 - gk)})`; g.beginPath(); g.moveTo(440, 0); g.lineTo(640, 0); g.lineTo(760, 1250); g.lineTo(520, 1250); g.closePath(); g.fill(); g.restore(); }
    roof(g, t);
    const sy = gk > 0 ? lerp(1020, -200, ease.inQ(clamp(gk / .8))) : 1020;
    juninho(g, { x: 640, y: 1385, s: 1.0, t, face: gk > 0 && gk < 2 ? 'shock' : t > 16.2 ? 'dumb' : 'happy', talk: talk('juninho', t), armR: { a: gk > 0 ? 2.8 : 2.2, b: .2 }, inR: gk > 0 ? null : handItem(g2 => sanduiche(g2, { s: .5 }), 50), armL: { a: 2.6, b: .2 }, inL: handItem(cuecaFlag, 0, 0) });
    if (gk > 0 && gk < .8) sanduiche(g, { x: 700, y: sy, s: .5, rot: gk * 6 });
    if (t > T.gulp) comic(g, 'NHAC', 540, 600, t - T.gulp, { size: 140, color: '#7dff4a', burst: '#2a5a10', d: 1.0 });
    flash(g, lt, .25);
  });

  // ---------- 4. the demand (20.0 – 24.4) ----------
  S(T.holo, (g, lt, t, ctx) => {
    ctx.post.chroma = .6 + .4 * Math.sin(t * 9); ctx.post.glitch = lt < .35 ? .8 : 0;
    const [sx, sy] = shakes(t, [[20.4, 18, 1.2], [21.8, 14, 1.5]]);
    g.fillStyle = '#020a06'; g.fillRect(0, 0, W, H);
    radial(g, 540, 700, t, '#06301a', '#020a06', 20);
    g.save(); g.translate(sx, sy); g.translate(540, 900); const z = lerp(1, 1.18, lt / 4.4); g.scale(z, z); g.translate(-540, -900);
    holo(g, t, hg2 => alien(hg2, { x: 540, y: 1700, s: 2.3, t, face: 'angry', talk: talk('alien', t), armL: 2.5 + Math.sin(t * 5) * .2, armR: 2.7, inR: g3 => mortadela(g3, { s: .9, y: 60 }) }), .95);
    g.restore();
    vignette(g, .6);
    whip(g, lt, .2);
  });

  // ---------- 5. the beams suck up every mortadela on Earth (24.4 – 28.2) ----------
  const C5 = camera(40); C5.position.set(40, 190, 330); C5.lookAt(0, 30, 0); C5.updateMatrixWorld();
  const beamSrc = cand.length ? [] : []; { const pool = []; for (let i = 0; i < NF; i += 7) { const s = ships[i]; const [x, y, z] = proj(new THREE.Vector3(s.x, s.y, s.z), C5); if (z < 1 && x > 80 && x < 1000 && y > 60 && y < 700) pool.push([x, y]); } for (let k = 0; k < 9 && k < pool.length; k++) beamSrc.push(pool[Math.floor(k * pool.length / 9)]); }
  const surf = Array.from({ length: 9 }, (_, k) => { const a = -1 + k * .25, v = new THREE.Vector3(Math.sin(a) * .7, .55, .45 + Math.cos(a) * .3).normalize().multiplyScalar(100); return proj(v, C5); });
  S(T.beams, (g, lt, t) => {
    setWorld(t); draw3d(g, W3, C5);
    g.save(); g.globalCompositeOperation = 'lighter';
    beamSrc.forEach(([x0, y0], k) => { const [x1, y1] = surf[k]; g.fillStyle = `rgba(125,255,74,${.16 + .06 * Math.sin(t * 10 + k)})`; g.beginPath(); g.moveTo(x0 - 10, y0); g.lineTo(x0 + 10, y0); g.lineTo(x1 + 50, y1); g.lineTo(x1 - 50, y1); g.closePath(); g.fill(); });
    g.restore();
    beamSrc.forEach(([x0, y0], k) => { const [x1, y1] = surf[k]; for (let j = 0; j < 4; j++) { const q = ((lt * .7 + j / 4 + hash(k, 4)) % 1); mortadela(g, { x: lerp(x1, x0, q), y: lerp(y1, y0, q) + 40 * (1 - q), s: .5 * (1 - q * .6), rot: q * 6 + k }); } });
    // national mortadela stock meter
    const lvl = lerp(100, 3, ease.io(prog(lt, .3, 3.0)));
    g.save(); g.translate(540, 1180); rr(g, -420, -70, 840, 140, 30, '#140c1c', 0); g.globalAlpha = .9;
    text(g, 'ESTOQUE NACIONAL DE MORTADELA', 0, -36, { size: 40, color: '#fff', stroke: 0 });
    rr(g, -380, 0, 760, 44, 20, '#3a2a3a', 5); rr(g, -380, 0, 760 * lvl / 100, 44, 20, lvl < 20 ? '#ff3b5c' : '#F3A3B0', 5);
    text(g, Math.round(lvl) + '%', 0, 22, { size: 40, color: '#fff', stroke: 8 });
    g.restore();
    if (lt > 2.8) comic(g, 'CRÍTICO', 780, 1020, lt - 2.8, { size: 80, color: '#fff', burst: '#ff3b5c', d: 1.0 });
    flash(g, lt, .2, '#7dff4a');
  });

  // ---------- 6. the refusal, the stare, the yank (28.2 – 40.0) ----------
  S(T.refuse, (g, lt, t) => {
    const stare = t > T.stare && t < T.yank, yk = t - T.yank;
    const z = t < T.stare ? lerp(1.25, 1.4, prog(t, T.refuse, T.stare)) : stare ? 1.0 : 1.0;
    shotsAgain(g, t);
    if (stare) {   // dramatic close-up on the three eyes of the hologram
      const k = ease.ioC(prog(t, T.stare, T.stare + 1.6));
      g.fillStyle = 'rgba(0,10,5,.6)'; g.fillRect(0, 0, W, H);
      holo(g, t, hg2 => { hg2.save(); hg2.translate(540, 700); hg2.scale(lerp(2.4, 3.4, k), lerp(2.4, 3.4, k)); alien(hg2, { x: 0, y: 560, s: 1, t, face: 'angry', look: [Math.sin(t * 1.4) * .6, 0], vein: false }); hg2.restore(); }, .95);
      letterbox(g, ease.outC(prog(t, T.stare, T.stare + .4)));
      return;
    }
    holo(g, t, alienHolo(t, { face: t > T.yank ? 'happy' : 'angry', armR: 1.4 }), .75);
    // the beam yanks the bag of pão francês; Juninho holds on and stretches like gum
    const hold = yk > 0 && yk < 1.1, fall = yk > 1.1;
    if (yk > 0 && yk < 1.8) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(125,255,74,${.3 * (1 - clamp((yk - 1.2) / .6))})`; g.beginPath(); g.moveTo(520, 0); g.lineTo(700, 0); g.lineTo(820, 1300); g.lineTo(560, 1300); g.closePath(); g.fill(); g.restore(); }
    g.save(); cam(g, { x: 600, y: 1000, z: t < T.stare ? z : 1.0 });
    roof(g, t);
    const bagY = yk > 0 ? lerp(880, hold ? 560 : -400, fall ? ease.inQ(clamp((yk - 1.1) / .5)) : ease.outC(clamp(yk / .4))) : 880;
    const stretch = hold ? 1 + .35 * ease.outC(clamp(yk / .5)) : fall ? 1 - .3 * Math.exp(-(yk - 1.1) * 8) : 1;
    const jy = fall ? 1385 + 0 * yk : 1385;
    cleide(g, { x: 880, y: 1385, s: .95, t, face: yk > 1.2 ? 'shock' : 'angry', talk: talk('cleide', t), armR: { a: 2.5, b: .4 }, armL: { a: .5, b: .5 } });
    juninho(g, { x: 600, y: jy, s: 1.0, sq: stretch, t, face: fall ? 'x' : hold ? 'panic' : t < T.stare ? 'angry' : 'shock', talk: talk('juninho', t), armR: { a: 2.9, b: 0 }, armL: { a: 2.9, b: 0 }, rot: fall ? -.25 * Math.exp(-(yk - 1.1) * 3) : 0 });
    if (bagY > -300 && !(fall && yk > 1.7)) { g.save(); g.translate(610, bagY - (hold ? 240 : 0) - (yk > 0 ? 0 : 0)); g.rotate(Math.sin(t * 3) * .1);
      g.beginPath(); g.moveTo(-70, -10); g.lineTo(70, -10); g.lineTo(60, 150); g.lineTo(-60, 150); g.closePath(); g.fillStyle = '#d9b27a'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
      for (const [px, pr] of [[-30, -.3], [10, .1], [40, .4]]) { g.save(); g.translate(px, -10); g.rotate(pr); ell(g, 0, -30, 26, 60, '#E3A24A', 5); line(g, [-10, -60, 10, -40], 5, '#c9822e'); g.restore(); }
      text(g, 'PADARIA', 0, 80, { size: 30, color: '#7a3e1a', stroke: 0 }); g.restore(); }
    g.restore();
    if (fall && yk < 2.6) comic(g, 'PLOFT', 380, 900, yk - 1.15, { size: 110, color: '#fff', burst: '#c4462e' });
    if (t > T.protocol) { const k = ease.outBack(prog(t, T.protocol, T.protocol + .4)); controle(g, { x: 220, y: 760, s: 1.25 * k, t, face: 'evil', talk: talk('controle', t), glow: 1, arms: true, press: Math.floor(t * 6) % 2 ? 'red' : 'yellow' }); }
    if (t < T.stare) flash(g, lt, .15);
    if (t > T.stare + 2 && t < T.stare + 2.25) flash(g, t - T.stare - 2, .2);
  });

  // ---------- 7. battle: sandwich missiles, cheese shields, a reflected laser (40.0 – 50.0) ----------
  S(T.battle, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[41.4, 8, .3], [42.6, 8, .3], [44.3, 6, .4], [T.reflect + .45, 20, .6]]);
    g.save(); g.translate(sx, sy);
    shotsAgain(g, t);
    // lasers coming down; after the shields go up they stop on the cheese
    const shieldA = clamp((t - T.shields) / .5);
    LAS.forEach((l, k) => { const e = t - l.t0; if (e < 0 || e > .6) return; let x1 = l.x1, y1 = l.y1; const sh = SH[k % 3]; let stop = 1;
      if (t > T.shields) { const dx = x1 - l.x0, dy = y1 - l.y0; for (let q = 0; q < 1; q += .01) { const px = l.x0 + dx * q, py = l.y0 + dy * q; if (Math.hypot(px - sh[0], py - sh[1]) < sh[2]) { stop = q; break; } } }
      const k2 = Math.min(stop, e / .35); laserBolt(g, l.x0, l.y0, x1, y1, k2);
      if (k2 >= stop && stop < 1) burst(g, e - .35 * stop, l.x0 + (x1 - l.x0) * stop, l.y0 + (y1 - l.y0) * stop, { n: 14, speed: 500, g: 0, life: .4, colors: ['#ffd21f', '#fff'], size: 8, seed: k + 50 }); });
    SH.forEach(([x, y, r], k) => { const a = ease.outBack(clamp((t - T.shields - k * .12) / .45)); hexShield(g, x, y, r * a, t, shieldA); });
    // the reflected laser: bounces off the middle shield and back into a ship
    if (refl && t > T.reflect - .3 && t < T.reflect + .45) { const e = t - T.reflect; if (e < 0) laserBolt(g, refl.x, refl.y, 540, 700, clamp((e + .3) / .3)); else laserBolt(g, 540, 700, refl.x, refl.y, clamp(e / .45), '#ffd21f'); }
    if (refl) { comic(g, 'TOMA!', refl.x, refl.y + 30, t - T.reflect - .45, { size: 90, color: '#fff', burst: '#ff8a2a', d: .9 }); burst(g, t - T.reflect - .45, refl.x, refl.y, { n: 30, speed: 600, g: 500, life: 1, colors: ['#ffd21f', '#ff8a2a', '#fff'], size: 12, seed: 77 }); }
    // sandwich missiles from the remote
    MIS.forEach((m, k) => { if (!m.tg) return; const e = t - m.t0, x0 = 300, y0 = 1000, cx = (x0 + m.tg.x) / 2 + (k % 2 ? 220 : -220), cy = 600;
      if (e > 0 && e < .8) { const q = e / .8, bx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * cx + q * q * m.tg.x, by = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * cy + q * q * m.tg.y;
        for (let j = 1; j < 7; j++) { const qq = Math.max(0, q - j * .04); const tx = (1 - qq) * (1 - qq) * x0 + 2 * (1 - qq) * qq * cx + qq * qq * m.tg.x, ty = (1 - qq) * (1 - qq) * y0 + 2 * (1 - qq) * qq * cy + qq * qq * m.tg.y; ell(g, tx, ty, 18 - j * 2, 18 - j * 2, `rgba(230,230,240,${.6 - j * .08})`, 0); }
        const ang = Math.atan2(2 * (1 - q) * (cy - y0) + 2 * q * (m.tg.y - cy), 2 * (1 - q) * (cx - x0) + 2 * q * (m.tg.x - cx));
        sanduiche(g, { x: bx, y: by + 30, s: .62 * (1 - q * .45), rot: ang }); }
      if (e >= .8) { if (m.love) { const h = e - .8; text(g, '♥', m.tg.x, m.tg.y - h * 200, { size: 90 + h * 30, color: '#ff3b8a', stroke: 8, alpha: clamp(1.6 - h) }); disco(g, m.tg.x + h * 600, m.tg.y - h * 400, .35, t, { pilot: true }); comic(g, 'AMEI', m.tg.x, m.tg.y + 80, h, { size: 70, color: '#fff', burst: '#ff3b8a', d: 1 }); }
        else burst(g, e - .8, m.tg.x, m.tg.y, { n: 26, speed: 520, g: 600, life: .9, colors: ['#ff8a2a', '#ffd21f', '#F3A3B0', '#E3A24A'], size: 12, seed: 90 + k }); } });
    roof(g, t);
    // Cheese throw
    const thr = t - (T.shields - .5);
    controle(g, { x: 300, y: 1060, s: .9, t, face: 'evil', glow: 1, arms: true, press: Math.floor(t * 3) % 2 ? 'red' : null, rot: Math.sin(t * 20) * .03 });
    juninho(g, { x: 660, y: 1385, s: .95, t, face: t > 44.2 && t < 46 ? 'angry' : 'happy', talk: talk('juninho', t), armR: { a: thr > 0 && thr < .6 ? 2.9 : 1.2, b: .4 }, armL: { a: 2.2, b: .5 }, inR: thr < 0 ? handItem(g2 => queijo(g2, { s: .45 }), 30) : null });
    if (thr > 0 && thr < .5) for (let k = 0; k < 3; k++) { const q = thr / .5; queijo(g, { x: lerp(700, SH[k][0], q), y: lerp(1100, SH[k][1], q), s: .4 + q * .3, rot: q * 8 + k }); }
    cleide(g, { x: 900, y: 1385, s: .9, t, face: 'angry', armR: { a: 2.4 + Math.sin(t * 6) * .2, b: .4 } });
    g.restore();
    whip(g, lt, .3);
  });

  // ---------- 8. the giant tomato (50.0 – 60.0) ----------
  const SPL = Array.from({ length: 16 }, (_, i) => ({ x: 80 + hash(i, 301) * 920, y: 120 + hash(i, 302) * 1200, r: 50 + hash(i, 303) * 110 }));
  S(T.tomato, (g, lt, t, ctx) => {
    const launch = t - T.launch, bk = t - T.boom1;
    const [sx, sy] = shakes(t, [[T.boom1, 46, 1.2], [T.splat, 20, .4]]);
    if (bk > 0 && bk < .5) ctx.post.chroma = 2 * (1 - bk / .5);
    g.save(); g.translate(sx, sy);
    shotsAgain(g, t);
    if (bk > 0) {
      g.save(); g.globalCompositeOperation = 'lighter'; const r = 80 + bk * 1500; const gr = g.createRadialGradient(tomTarget[0], tomTarget[1], 0, tomTarget[0], tomTarget[1], r); gr.addColorStop(0, `rgba(255,120,80,${clamp(1 - bk)})`); gr.addColorStop(1, 'rgba(255,40,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
      burst(g, bk, tomTarget[0], tomTarget[1], { n: 900, speed: 1500, g: 700, life: 3.2, seed: 7, colors: ['#e8203a', '#ff4a5c', '#b5101f', '#ff8a8a'], size: 11 });
      burst(g, bk, tomTarget[0], tomTarget[1], { n: 120, speed: 900, g: 700, life: 3, seed: 8, colors: ['#fff3b0', '#f6e08a'], size: 7, shape: (gg, sz) => { gg.beginPath(); gg.ellipse(0, 0, sz, sz * .55, 0, 0, TAU); gg.fill(); } });
      burst(g, bk, tomTarget[0], tomTarget[1], { n: 10, speed: 700, g: 900, life: 3, seed: 9, colors: ['#2fa34d'], size: 26, shape: 'star' });
    }
    // the tomato rises behind the roof, realises it is the ammunition, and goes
    if (bk < 0) {
      const grow = ease.outBack(prog(t, T.tomato + .3, T.tomato + 1.6)), q = launch > 0 ? ease.inQ(clamp(launch / 1.2)) : 0;
      const tx = lerp(430, tomTarget[0], q), ty = lerp(1480, tomTarget[1] + 120, q) - (launch > 0 ? 0 : grow * 330) + (launch > 0 ? 0 : 0), s = lerp(.5 + grow * 3.4, .35, q);
      if (launch > 0) { g.save(); g.globalAlpha = .7; for (let j = 1; j < 8; j++) ell(g, tx + Math.sin(j * 1.3) * 20, ty + j * 60 * s, 40 * s * (1 - j / 9), 40 * s * (1 - j / 9), '#ffd8a0', 0); g.restore(); }
      tomate(g, { x: tx, y: ty, s, alive: true, face: t > 51.8 ? 'shock' : 'happy', rot: launch > 0 ? Math.sin(t * 20) * .1 : 0 });
    }
    roof(g, t);
    controle(g, { x: 260, y: 1080, s: .85, t, face: t < 53 ? 'evil' : 'happy', talk: talk('controle', t), glow: 1, press: t > 50.1 && t < 51.5 ? 'yellow' : null, arms: true });
    const salt = t > T.salt;
    juninho(g, { x: 660, y: 1385, s: .95, t, face: bk > 0 && !salt ? 'shock' : salt ? 'think' : 'happy', talk: talk('juninho', t), armR: { a: salt ? 1.0 : 2.4, b: salt ? 2.3 : .3 }, armL: { a: salt ? .3 : 2.4, b: .3 }, blush: 0 });
    if (bk > 1.0) for (let i = 0; i < 6; i++) { const k = ((t * .9 + hash(i, 5)) % 1); ell(g, 600 + hash(i, 6) * 130, 760 + k * 640, 9, 14, '#e8203a', 3); }
    cleide(g, { x: 900, y: 1385, s: .9, t, face: bk > 0 ? 'shock' : 'angry', armR: { a: 2.3, b: .4 } });
    g.restore();
    // splat on the lens, then the wiper
    if (t > T.splat) {
      const wa = t > T.wiper ? ease.io(clamp((t - T.wiper) / 1.0)) * Math.PI : 0;   // wiper angle 0..PI from the right
      SPL.forEach((p, i) => { if (t > T.wiper && Math.atan2(1900 - p.y, p.x - 540) < wa) return;
        const k = ease.outBack(clamp((t - T.splat - i * .015) / .12)), drip = clamp((t - T.splat) / 3) * 60 * hash(i, 7);
        g.save(); g.translate(p.x, p.y); g.scale(k, k); g.fillStyle = 'rgba(210,20,40,.92)'; g.beginPath(); for (let j = 0; j <= 16; j++) { const an = j / 16 * TAU, rr_ = p.r * (.75 + .35 * hash(i * 20 + j, 9)); g.lineTo(Math.cos(an) * rr_, Math.sin(an) * rr_); } g.closePath(); g.fill();
        g.fillRect(-8, 0, 16, p.r + drip); ell(g, 0, p.r + drip, 12, 14, 'rgba(210,20,40,.92)', 0); ell(g, -p.r * .3, -p.r * .3, p.r * .18, p.r * .12, 'rgba(255,255,255,.5)', 0); g.restore(); });
      if (t > T.wiper && t < T.wiper + 1.1) { g.save(); g.translate(540, 1900); g.rotate(-wa); rr(g, 0, -14, 1300, 28, 12, '#1a1a1a', 6); g.restore(); }
    }
    if (bk > 0) comic(g, 'SPLASH', 540, 300, bk - .05, { size: 150, color: '#fff', burst: '#e8203a', d: 1.2 });
    flash(g, lt, .2);
  });

  // ---------- 9. the cockpit: Mom drives (60.0 – 70.0) ----------
  const LANE = Array.from({ length: 9 }, (_, i) => ({ x: 120 + hash(i, 401) * 840, y: 300 + hash(i, 402) * 520, s: .35 + hash(i, 403) * .5, side: hash(i, 404) > .5 ? 1 : -1 }));
  S(T.cockpit, (g, lt, t) => {
    const yank = Math.sin(t * 2.6) * .35 + (t > 62 && t < 63 ? .6 : 0), roll = Math.sin(t * 1.3) * .06;
    const [sx, sy] = shakes(t, [[T.cockpit, 12, .5], [64.9, 16, .5]]);
    g.save(); g.translate(sx, sy);
    cockpit(g, t, {
      view: vg => { vg.save(); vg.translate(540, 560); vg.rotate(roll * 3); vg.translate(-540, -560); spaceView(vg, t, 2.2, 3);
        LANE.forEach((l, i) => { const hk = t - (T.honk + (i % 3) * .2); const move = hk > 0 ? ease.outC(clamp(hk / .6)) * 700 * l.side : 0; disco(vg, l.x + move + Math.sin(t * 2 + i) * 30, l.y + Math.cos(t * 1.7 + i) * 20, l.s, t, { rot: hk > 0 ? l.side * .5 : 0 }); });
        if (t > T.honk && t < T.honk + 1.6) comic(vg, 'FON FON!', 540, 420, t - T.honk, { size: 120, color: '#ffd21f', burst: '#2f6fdb', d: 1.5 });
        vg.restore();
        text(vg, 'PILOTO: MÃE', 540, 260, { size: 50, color: '#7dff4a', stroke: 0, font: 'Nunito', weight: 900, alpha: .85 });
        text(vg, '⚠ VELOCIDADE: BRAVA', 300, 340, { size: 32, color: '#ff3b5c', stroke: 0, font: 'Nunito', weight: 900, alpha: .5 + .5 * Math.sin(t * 8) });
        text(vg, 'CINTO: NÃO', 800, 340, { size: 32, color: '#ffd21f', stroke: 0, font: 'Nunito', weight: 900, alpha: .8 }); },
      mid: mg => {
        const sick = t > 65.8 && t < 68.6, gulp = t > 68.6;
        juninho(mg, { x: 830, y: 1490, s: 1.05, t, rot: -roll * 2 + .05, face: sick ? 'squeeze' : gulp ? 'shock' : 'panic', talk: talk('juninho', t), armL: { a: .3, b: 2.2 }, armR: { a: 2.6, b: .4 }, inR: handItem(g2 => controle(g2, { s: .3, glow: 0, t, face: 'happy' }), -30, 0) });
        if (sick) { mg.save(); mg.globalAlpha = .55; ell(mg, 834, 1490 - 1.05 * 520, 92, 100, '#7dbf3a', 0); mg.restore(); ell(mg, 834 - 40, 1490 - 1.05 * 460, 26, 20, '#9ccf3a', 5); ell(mg, 834 + 46, 1490 - 1.05 * 460, 26, 20, '#9ccf3a', 5); }
        if (gulp && t < 69.6) comic(mg, 'GLUP', 900, 820, t - 68.6, { size: 80, color: '#9ccf3a', burst: '#2a5a10', d: 1 });
        cleide(mg, { x: 360, y: 1510, s: 1.15, t, rot: roll * 2, face: 'scream', talk: talk('cleide', t), noChinelo: true, red: .5, armR: { a: .5 + yank * .6, b: .9 }, armL: { a: 1.9, b: .9 } });
      },
      front: fg => { joystick(fg, 470, 1300, yank); },
    });
    g.restore();
    whip(g, lt, .3);
  });

  // ---------- 10. the chase through the fleet (70.0 – 75.0) ----------
  const C10 = camera(50);
  const herPath = q => new THREE.Vector3(Math.sin(q * 9) * 40 * (1 - q), lerp(150, 300, q) + Math.sin(q * 13) * 10, lerp(140, 20, q));
  S(T.chase, (g, lt, t) => {
    setWorld(t);
    const q = ease.io(prog(lt, 0, 5)), p = herPath(q), pn = herPath(Math.min(1, q + .02));
    her.position.copy(p); her.rotation.set(0, t * 4, Math.sin(lt * 3) * .6 + (lt > 2 && lt < 3 ? (lt - 2) * TAU : 0));
    C10.position.set(p.x + 6, p.y + 14, p.z + 44); C10.lookAt(pn.x, pn.y + 4, pn.z - 30);
    draw3d(g, W3, C10);
    // lasers passing by
    for (let k = 0; k < 5; k++) { const e = lt - 1.2 - k * .8; if (e > 0 && e < .4) laserBolt(g, hash(k, 1) > .5 ? -100 : W + 100, 300 + hash(k, 2) * 600, 540 + (hash(k, 3) - .5) * 300, 900, e / .4); }
    speedLines(g, 540, 900, t, 30, 360, 'rgba(255,255,255,.5)');
    if (lt > 2 && lt < 3.2) comic(g, 'IÁÁÁ!', 760, 420, lt - 2, { size: 110, color: '#ff7fb4', burst: '#7B3FE4', d: 1.2 });
    flash(g, lt, .2);
  });

  // ---------- 11. cockpit again: the mothership, and the chinelo comes out of the joystick (75.0 – 80.0) ----------
  S(T.cockpit2, (g, lt, t) => {
    const pulled = t > T.pull, alarm = pulled && t < 80;
    const [sx, sy] = shakes(t, [[T.pull, 26, 1.2], [77, 12, 2]]);
    g.save(); g.translate(sx, sy);
    cockpit(g, t, {
      view: vg => { spaceView(vg, t, pulled ? 3 : 1.4, 5);
        const k = ease.ioC(prog(t, T.cockpit2, 80)); vg.save(); vg.translate(540, lerp(420, 520, k) + (pulled ? Math.sin(t * 9) * 30 : 0)); vg.rotate(pulled ? Math.sin(t * 3) * .25 : 0); const s = lerp(1.6, 4.2, k); vg.scale(s, s);
        disco(vg, 0, 0, 1, t, { pilot: false }); vg.restore();
        if (alarm && Math.floor(t * 6) % 2) { vg.fillStyle = 'rgba(255,0,40,.18)'; vg.fillRect(0, 0, W, H); }
        if (pulled) text(vg, 'SEM VOLANTE', 540, 300, { size: 64, color: '#ff3b5c', stroke: 0, font: 'Nunito', weight: 900, alpha: .6 + .4 * Math.sin(t * 10) }); },
      mid: mg => {
        juninho(mg, { x: 830, y: 1490, s: 1.05, t, face: pulled ? 'panic' : 'shock', talk: talk('juninho', t), armL: { a: 2.6, b: .3 }, armR: { a: 2.6, b: .3 } });
        const wind = prog(t, 78.6, 80);
        cleide(mg, { x: 360, y: 1510, s: 1.15, t, face: t > 78.3 ? 'scream' : 'angry', talk: talk('cleide', t), red: .6 + wind * .4, steam: pulled, noChinelo: !pulled,
          armR: pulled ? { a: lerp(1.6, 3.0, ease.outBack(clamp((t - T.pull) / .4))) + wind * .3, b: lerp(.2, .8, wind) } : { a: .6, b: .9 }, armL: { a: 1.5, b: 1 } });
        controle(mg, { x: 660, y: 1080, s: .75, t, face: 'alarm', talk: talk('controle', t), glow: .8 });
      },
      front: fg => { joystick(fg, 470, 1300, pulled ? Math.sin(t * 14) * .3 : Math.sin(t * 2) * .2, !pulled); },
    });
    g.restore();
    if (pulled) comic(g, 'PLOC', 470, 1180, t - T.pull, { size: 80, color: '#fff', burst: '#ff3b5c', d: .8 });
    whip(g, lt, .25);
  });

  // ---------- 12. the interdimensional chinelada (80.0 – 83.6) ----------
  const C12 = camera(46); C12.position.set(90, 385, 240); C12.lookAt(M0); C12.updateMatrixWorld();
  const mScr = proj(M0, C12), pScr = proj(new THREE.Vector3(-70, 410, 120), C12);
  S(T.throwC, (g, lt, t, ctx) => {
    const e = t - T.boom;
    if (e > 0) { ctx.post.glitch = clamp(1 - e / 1.5) * .9; ctx.post.swirl = clamp(1 - e / 1.2) * .8; ctx.post.center = [mScr[0] / W, mScr[1] / H]; ctx.post.chroma = clamp(1 - e / 2) * 2; }
    const [sx, sy] = shakes(t, [[T.smack, 60, 1.6]]);
    setWorld(t); C12.position.set(90 + sx * .3, 385 + sy * .3, 240); C12.lookAt(M0);
    draw3d(g, W3, C12);
    // the chinelo leaves the portal, giant, spinning, and lands on the mothership
    const fly = prog(t, T.throwC + .5, T.smack);
    if (t > T.throwC + .5 && t < T.boom + .6) {
      const x = lerp(pScr[0], mScr[0], fly), y = lerp(pScr[1] + 200, mScr[1] - 60, fly) - Math.sin(fly * Math.PI) * 260, s = lerp(.8, 6, ease.inQ(fly));
      const flatten = t > T.smack ? 1 - .5 * Math.exp(-(t - T.smack) * 10) : 1;
      g.save(); g.translate(x, y); g.scale(1, flatten); chinelo(g, 0, 70 * s * .5, s, fly * TAU * 1.5 + (t > T.smack ? 0 : 0), 1); g.restore();
    }
    if (t < T.throwC + .6) { const k = prog(t, T.throwC, T.throwC + .6); g.save(); g.translate(pScr[0], pScr[1] + 200 + (1 - k) * 900); chinelo(g, 0, 0, 1 + k, k * TAU, 1); g.restore(); }
    comic(g, 'PLÁÁÁ!', 540, 360, t - T.smack, { size: 200, color: '#FFD21F', burst: '#ff3b5c', d: 1.5, rot: -.2 });
    if (e > 0 && e < .25) { g.fillStyle = `rgba(255,255,255,${1 - e / .25})`; g.fillRect(0, 0, W, H); }
    flash(g, lt, .2, '#5CF2FF');
  });

  // ---------- 13. silence: Mom blows the smoke off her chinelo (83.6 – 85.2) ----------
  S(T.quiet, (g, lt, t) => {
    g.save(); cam(g, { x: 430, y: 1000, z: lerp(1.45, 1.6, lt / 1.6) });
    cockpit(g, t, {
      view: vg => { spaceView(vg, t, .1, 7); for (let i = 0; i < 30; i++) ell(vg, 540 + (hash(i, 1) - .5) * 900, 500 + (hash(i, 2) - .5) * 500 + lt * 20 * hash(i, 3), 6, 4, '#ff8a2a', 0); },
      mid: mg => {
        cleide(mg, { x: 360, y: 1510, s: 1.15, t, face: 'smug', blink: .0, noChinelo: true, armR: { a: 2.7, b: .5 }, armL: { a: 1.3, b: 1 }, inR: g2 => { chinelo(g2, 0, 40, .8, Math.PI * .9); for (let i = 0; i < 3; i++) { const k = (lt * .7 + i / 3) % 1; g2.globalAlpha = 1 - k; ell(g2, 10 + Math.sin(k * 6) * 10, 120 + k * 120, 16 + k * 20, 14 + k * 16, '#dddddd', 0); g2.globalAlpha = 1; } } });
      },
      front: fg => joystick(fg, 470, 1300, 0, false),
    });
    g.restore();
    letterbox(g, 1);
  });

  // ---------- 14. the mysterious voice: the Sausage Empire (85.2 – 90) ----------
  const C14 = camera(40); C14.position.set(0, 60, 420); C14.lookAt(0, 40, 0); C14.updateMatrixWorld();
  S(T.voz, (g, lt, t) => {
    setWorld(t); draw3d(g, W3, C14);
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(255,60,40,${.25 + .45 * prog(lt, 0, 2)})`; g.fillRect(0, 0, W, H); g.restore();
    // a colossal sausage silhouette rising behind the planet, red eyes opening
    const rise = ease.outC(prog(lt, .2, 3.4)), y = lerp(1500, 520, rise);
    g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(540, y, 100, 540, y, 700); gr.addColorStop(0, 'rgba(255,60,30,.35)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.translate(540, y);
    g.fillStyle = '#0a0204'; g.beginPath(); g.roundRect(-260, -480, 520, 1500, 260); g.fill();
    g.beginPath(); g.moveTo(-40, -470); g.lineTo(0, -650); g.lineTo(40, -470); g.closePath(); g.fill();
    const eo = prog(lt, 1.2, 1.6), blink = (lt > 3.2 && lt < 3.35) ? .1 : 1;
    for (const sd of [-1, 1]) { g.save(); g.shadowColor = '#ff2020'; g.shadowBlur = 50; g.fillStyle = '#ff3030'; g.beginPath(); g.ellipse(sd * 90, -260, 52, 30 * eo * blink, sd * .25, 0, TAU); g.fill(); g.restore(); }
    g.restore();
    // the Earth's limb in front of it (redrawn as a dark arc so the sausage is "behind" the planet)
    g.save(); g.fillStyle = '#050208'; g.beginPath(); g.arc(540, 2420, 1150, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,90,60,.8)'; g.lineWidth = 10; g.stroke(); g.restore();
    if (t > 89.25) { const k = ease.outBack(prog(t, 89.25, 89.55)); g.save(); g.translate(540, 1240); g.scale(k, k); text(g, 'CONTINUA...', 0, 0, { size: 110, color: '#FF8A5C', stroke: 16 }); g.restore(); }
    vignette(g, .7);
    flash(g, lt, .5, '#000000');
  });

  return shots;
}
