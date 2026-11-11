// EP 5 — O FIM DA BURRICE (90 s, season finale). All times are absolute episode seconds.
import { W, H, TAU, clamp, prog, lerp, ease, hash, noise, shake, shakes, K } from '../../lib/core.js';
import { juninho, cleide, controle, ze, coco, toilet, chinelo, speedLines, INK, ellipse as ell, rrect as rr, poly as line, PAL } from '../../lib/chars.js';
import { coxinha, pipoca, bola, sanduiche } from '../../lib/chars2.js';
import { cam, comic, flash, whip, vignette, burst, titleCard, text, irisOut, letterbox, radial } from '../../lib/fx.js';
import { bathroom } from '../../lib/sets.js';
import { THREE, draw3d, camera, sky, earth, house, lights, ballTexture, blackHole } from '../../lib/world3d.js';

export const META = { num: 5, title: 'O FIM DA BURRICE', total: 90 };
const T = {
  ball: 3.4, pops: 4.6, eat: 9.0, hole: 13.0, sofa: 14.2, burp: 18.4, ze: 20.0, ding: 20.6, point: 23.4, hand: 24.2,
  yell: 27.1, saturn: 29.6, stamp: 35.4, quiz: 40.0, show: 44.4, ask: 47.8, math: 50.0, err: 55.6, answer: 60.0,
  silence: 62.4, slap: 68.0, deferido: 71.6, press: 73.4, restore: 75.0, home: 78.4, bath: 81.0, green: 82.0, potato: 85.6, end: 88.8,
};
export const LINES = [
  { id: 'r1', who: 'controle', at: 0.7, text: 'Realidade em três por cento. Recomendo pânico.' },
  { id: 'j1', who: 'juninho', at: 7.3, text: 'Mãe, as estrelas viraram pipoca!' },
  { id: 'c1', who: 'cleide', at: 10.4, text: 'PARA DE COMER O UNIVERSO, JUNINHO!' },
  { id: 'c2', who: 'cleide', at: 14.4, text: 'O MEU SOFÁ, NÃO!' },
  { id: 'z1', who: 'ze', at: 21.2, text: 'Quem foi o animal que ativou o controle universal?' },
  { id: 'j2', who: 'juninho', at: 24.6, text: 'Foi sem querer, chefe.' },
  { id: 'z2', who: 'ze', at: 27.2, text: 'SEM QUERER?! VOCÊ TRANSFORMOU SATURNO NUMA COXINHA!' },
  { id: 'j3', who: 'juninho', at: 31.4, text: 'Mas ficou bonita, né?' },
  { id: 'z3', who: 'ze', at: 33.2, text: 'Multa de nível universal.' },
  { id: 'j4', who: 'juninho', at: 37.2, text: 'Aceita Pix?' },
  { id: 'z4', who: 'ze', at: 40.3, text: 'O único jeito de restaurar o universo é apertar o botão de reinicialização.' },
  { id: 'z5', who: 'ze', at: 44.6, text: 'Mas antes, uma pergunta extremamente simples.' },
  { id: 'z6', who: 'ze', at: 48.0, text: 'Quanto é dois mais dois?' },
  { id: 'j5', who: 'juninho', at: 60.2, text: 'Depende… é com ou sem imposto?' },
  { id: 'j6', who: 'juninho', at: 69.0, text: 'QUATRO! QUATRO, DESGRAÇA!' },
  { id: 'z7', who: 'ze', at: 71.8, text: 'Deferido.' },
  { id: 'r2', who: 'controle', at: 82.5, text: 'Modo inteligência ativado.' },
  { id: 'j7', who: 'juninho', at: 84.4, text: 'Agora sim!' },
  { id: 'c3', who: 'cleide', at: 86.9, text: 'EU DESISTO DESSE MENINO!' },
];
export const SFX = [
  [0.0, 'alarm', .7], [0.2, 'glitch', .8], [1.5, 'rumble', .8], [2.6, 'glitch', .6], [T.ball, 'boing', 1], [T.ball + .05, 'pop', .8],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [T.pops + i * .28, 'pop', .9]), [T.eat, 'gulp', 1], [T.eat + .3, 'sparkle', .6],
  [T.hole, 'warp', .9], [T.hole + .2, 'hum', .8], [T.sofa, 'whoosh', .9], [15.6, 'whoosh', .7], [16.6, 'whoosh', .7], [17.4, 'slide_down', .6],
  [T.burp, 'gulp', 1.2], [T.burp + .25, 'honk', .6], [T.ze, 'warp', 1], [T.ding, 'ding', 1], [T.point, 'kiss', .5], [T.hand, 'boop', .7],
  [T.yell, 'scratch', .7], [T.saturn, 'magic', .8], [T.saturn + .1, 'choir', .5], [T.stamp, 'thud', 1.3], [T.stamp + .05, 'slap', .7],
  [38.4, 'rimshot', .7], [T.quiz, 'power_up', .7], [T.show, 'fanfare', .8], [45.6, 'drumroll', .6], [T.ask - .2, 'ding', .7],
  [T.math, 'magic', .7], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [T.math + .4 + i * .5, i % 2 ? 'beep' : 'tick', .6]), [T.err, 'glitch', 1.1], [T.err + .1, 'power_down', .8], [57.2, 'power_up', .6], [59.4, 'ding', .6],
  [T.silence + 1.4, 'whoosh', .35], [T.silence + 2.8, 'whoosh', .3], [66.4, 'pop', .5],
  [T.slap - .25, 'whoosh', 1], [T.slap, 'bigslap', 1.4], [T.slap + .3, 'gasp', .5], [T.deferido + .5, 'thud', 1.2], [T.press, 'click', 1.3], [T.press + .1, 'power_up', 1],
  [T.restore, 'warp', 1.1], [T.restore + .2, 'scratch', .6], [77.0, 'explosion', 1.3], [77.1, 'sparkle', .9], [T.home, 'choir', .7], [80.3, 'thud', .8],
  [T.bath, 'whoosh', .5], [T.green, 'click', 1.3], [T.green + .1, 'magic', .7], [T.potato, 'magic', 1], [T.potato + .05, 'pop', 1], [86.4, 'slide_down', .6],
  [88.3, 'thud', .9], [T.end, 'rimshot', 1],
];
export const MUSIC = [[0, 'chase', .6], [T.hole, 'tension', .7], [T.ze, 'lounge', .6], [T.yell, 'tension', .5], [T.quiz, 'lounge', .5], [T.ask - .3, 'none'],
  [T.math, 'space', .7], [T.answer, 'none'], [T.slap, 'epic', .7], [T.restore, 'glory', .9], [T.bath, 'lounge', .4], [T.potato, 'none'], [T.end, 'glory', .8]];

// ---------------- local helpers ----------------
const remoteInHand = (o = {}) => g => controle(g, { s: .34, glow: 0, ...o, y: -40 });
function spaceBG(g, t, o = {}) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, o.top || '#120630'); gr.addColorStop(1, o.bot || '#05020f');
  g.fillStyle = gr; g.fillRect(-600, -600, W + 1200, H + 1200);
  for (let i = 0; i < 140; i++) {
    const x = hash(i, 11) * (W + 400) - 200, y = hash(i, 12) * (H + 400) - 200, r = 1.5 + hash(i, 13) * 3;
    if (o.popcorn && hash(i, 14) > .55) { pipoca(g, x, y, .35 + hash(i, 15) * .3, i); continue; }
    g.globalAlpha = .5 + .5 * Math.sin(t * 3 + i); g.fillStyle = '#fff'; g.fillRect(x, y, r, r); g.globalAlpha = 1;
  }
  // broken-reality cubes drifting
  if (o.cubes !== false) for (let i = 0; i < 26; i++) {
    const x = (hash(i, 21) * (W + 600) - 300 + t * (20 + hash(i, 22) * 60)) % (W + 300) - 150, y = hash(i, 23) * H, s = 20 + hash(i, 24) * 50;
    g.save(); g.translate(x, y); g.rotate(t * (hash(i, 25) - .5) * 2 + i);
    g.fillStyle = ['#7B3FE4', '#5CF2FF', '#ff3bd1', '#FFD21F'][i % 4]; g.globalAlpha = .55; g.fillRect(-s / 2, -s / 2, s, s); g.globalAlpha = 1;
    g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(-s / 2, -s / 2, s, s); g.restore();
  }
}
function sofa(g, x, y, s = 1) { g.save(); g.translate(x, y); g.scale(s, s); rr(g, -260, -110, 520, 220, 50, '#3f7fd0'); rr(g, -280, -160, 120, 260, 40, '#356cb5'); rr(g, 160, -160, 120, 260, 40, '#356cb5'); rr(g, -180, -80, 160, 100, 30, '#5b97e4', 5); rr(g, 20, -80, 160, 100, 30, '#5b97e4', 5); g.restore(); }
function duck(g, x, y, s = 1) { g.save(); g.translate(x, y); g.scale(s, s); ell(g, 0, 0, 40, 32, '#FFD21F'); ell(g, 26, -26, 22, 20, '#FFD21F'); g.beginPath(); g.moveTo(44, -28); g.lineTo(64, -22); g.lineTo(44, -16); g.closePath(); g.fillStyle = '#ff8a00'; g.fill(); ell(g, 30, -32, 4, 4, INK, 0); g.restore(); }
function ticket(g, n = '0001') { g.save(); g.rotate(-.2); rr(g, -46, -80, 92, 64, 6, '#fff8e0', 5); g.fillStyle = INK; g.font = '900 15px Nunito'; g.textAlign = 'center'; g.fillText('SENHA', 0, -58); g.font = '900 24px Nunito'; g.fillText(n, 0, -30); g.restore(); }
function senhaPanel(g, x, y, k, t) {
  g.save(); g.translate(x, y); g.scale(k, k);
  rr(g, -260, -90, 520, 180, 20, '#111018', 8);
  const blink = t > T.ding && t < T.ding + 1.2 && Math.floor(t * 6) % 2 === 0;
  g.fillStyle = blink ? '#ffffff' : '#ff3b3b'; g.shadowColor = '#ff3b3b'; g.shadowBlur = 20;
  g.font = '900 34px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SENHA', -120, -40); g.fillText('GUICHÊ', 140, -40);
  g.font = '900 86px Nunito'; g.fillText('0001', -120, 30); g.fillText('7', 140, 30); g.shadowBlur = 0;
  g.restore();
}
function stampMark(g, x, y, word, k, color = '#e8203a', rot = -.25) {
  if (k <= 0) return; const s = k < 1 ? lerp(2.4, 1, ease.outBack(k)) : 1;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = Math.min(1, k * 2) * .9;
  g.lineWidth = 10; g.strokeStyle = color; g.strokeRect(-word.length * 22 - 20, -46, word.length * 44 + 40, 92);
  g.font = '400 80px Bangers'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, 0, 4); g.restore();
}
function tumbleweed(g, x, y, r, a) {
  g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = '#a0763a'; g.lineWidth = 5;
  for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(0, 0, r * (.5 + hash(i, 3) * .5), r * (.3 + hash(i, 4) * .6), i * .7, 0, TAU); g.stroke(); }
  g.restore();
}
// object being spaghettified into a black hole at (cx, cy): k = 0..1 progress along the spiral
function sucked(g, cx, cy, k, a0, r0, drawObj) {
  if (k >= 1 || k < 0) return; const r = r0 * Math.pow(1 - k, 1.4), a = a0 + k * 7;
  const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .8, st = 1 + k * 2.2, sc = 1 - k * .85;
  g.save(); g.translate(x, y); g.rotate(a); g.scale(st * sc, sc / st); g.rotate(-a + k * 3); drawObj(g); g.restore();
}

export async function makeShots({ talk }) {
  const shots = [];
  const S = (t0, draw) => shots.push({ t0, draw });

  // ---------- shared 3D: the universe breaking into cubes ----------
  const U = new THREE.Scene(); U.add(sky(17, [.4, .1, .5], [.1, .2, .6])); lights(U, { amb: .7, sun: 2.4, dir: [4, 5, 8] });
  const NC = 2600, cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: .4, metalness: .2 }), NC);
  const pal = [0x7B3FE4, 0x5CF2FF, 0xff3bd1, 0xFFD21F, 0x2a1a5a, 0x13235a];
  const col = new THREE.Color();
  for (let i = 0; i < NC; i++) { col.setHex(pal[Math.floor(hash(i, 31) * pal.length)]); cubes.setColorAt(i, col); }
  U.add(cubes);
  const ballTex = ballTexture();
  const planets = [[-26, 14, -40, 9, 0xe0703a, 3.4], [24, -6, -60, 13, 0x3a8ae0, 3.9], [6, 30, -90, 7, 0x9ae03a, 4.3]].map(([x, y, z, r, c, ts]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshStandardMaterial({ color: c, roughness: .6 })); m.position.set(x, y, z); U.add(m); return { m, c, ts, r };
  });
  const E = earth(40); E.position.set(0, -10, -120); E.visible = false; U.add(E);
  const hs = house(); hs.scale.setScalar(.6); hs.visible = false; U.add(hs);
  const camU = camera(50);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  // breakage b: 0 = intact fabric of space far behind, 1 = flown apart
  function setCubes(t, b) {
    for (let i = 0; i < NC; i++) {
      const gx = (i % 52) - 26, gy = Math.floor(i / 52) - 25; const x0 = gx * 6, y0 = gy * 6, z0 = -220;
      const delay = Math.hypot(gx, gy) / 36, k = clamp((b * 1.6 - delay) / .8), kk = k * k;
      const dx = (hash(i, 32) - .5) * 160, dy = (hash(i, 33) - .5) * 160, dz = 160 + hash(i, 34) * 120;
      p.set(x0 + dx * kk, y0 + dy * kk, z0 + dz * kk);
      eu.set(kk * hash(i, 35) * 9 + t * k, kk * hash(i, 36) * 9, kk * 3); q.setFromEuler(eu); sc.setScalar(5.4 * (1 - k * .5));
      mtx.compose(p, q, sc); cubes.setMatrixAt(i, mtx);
    }
    cubes.instanceMatrix.needsUpdate = true;
  }
  function setPlanets(t, ballK) {     // ballK(i) -> 0 normal / 1 football
    planets.forEach((P, i) => {
      const k = ballK(i); P.m.material.map = k > .5 ? ballTex : null; P.m.material.color.setHex(k > .5 ? 0xffffff : P.c); P.m.material.needsUpdate = true;
      const pop = Math.abs(k - .5) < .5 ? 1 + .35 * Math.sin(clamp(Math.abs(k - .5) * 2) * Math.PI) : 1;
      P.m.scale.setScalar(pop); P.m.rotation.set(t * .7, t * (1 + i * .3), 0);
    });
  }

  // ---------- 1. reality at 3 % (0 – 7) ----------
  S(0, (g, lt, t, ctx) => {
    const b = ease.inQ(prog(t, .3, 7.2));
    setCubes(t, b); setPlanets(t, i => prog(t, planets[i].ts, planets[i].ts + .35));
    camU.position.set(Math.sin(t * .15) * 10, Math.cos(t * .2) * 5, 40); camU.lookAt(0, 0, -60);
    draw3d(g, U, camU);
    ctx.post.cubes = .4 + b * .6; ctx.post.glitch = (Math.floor(t * 3) % 4 === 0 ? .6 : .1); ctx.post.chroma = .5;
    // stars pop into popcorn
    for (let i = 0; i < 8; i++) {
      const x = 120 + hash(i, 41) * 840, y = 200 + hash(i, 42) * 1100, k = t - T.pops - i * .28;
      if (k < 0) { g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 20; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.shadowBlur = 0; }
      else { const s = ease.outBack(clamp(k / .25)) * .9; pipoca(g, x, y, s, i); }
    }
    comic(g, 'GOL?!', 300, 560, t - T.ball, { size: 110, color: '#fff', burst: '#2fa34d', d: 1.2 });
    // the remote, in alarm, as an inset (continuity from EP4)
    const ki = ease.outBack(prog(lt, .3, .6)) * (1 - ease.inQ(prog(lt, 4.0, 4.3)));
    if (ki > 0) { g.save(); g.translate(820, 380); g.scale(ki, ki); g.beginPath(); g.arc(0, 0, 190, 0, TAU); g.fillStyle = '#2a0410'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#ff3b5c'; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, 182, 0, TAU); g.clip(); controle(g, { x: 0, y: 150, s: 1.6, t, face: 'alarm', talk: talk('controle', t), glow: 1 }); g.restore(); g.restore();
      text(g, '3%', 820, 620, { size: 90, color: '#ff3b5c', alpha: ki }); }
    titleCard(g, t, 5, META.title, 1.0, 3.0);
  });

  // ---------- 2. stars are popcorn; Juninho eats one (7 – 13) ----------
  S(7.0, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[10.4, 16, 1.6]]);
    g.save(); cam(g, { x: 540, y: 960, z: 1.05 + lt * .02, sx, sy });
    spaceBG(g, t, { popcorn: true });
    const eatK = t - T.eat;
    // a popcorn drifts to his hand, he eats it; then his mouth glows like a star
    const pk = prog(t, 7.6, T.eat - .3);
    if (eatK < 0) pipoca(g, lerp(820, 640, ease.io(pk)), lerp(420, 720, ease.io(pk)) - (t > T.eat - .5 ? (t - T.eat + .5) * 200 : 0), 1.1, 3);
    const glow = eatK > .2 ? clamp((eatK - .2) * 3) : 0;
    juninho(g, { x: 560, y: 1330 + Math.sin(t * 1.2) * 14, s: .95, t, pose: 'float', rot: .08, face: eatK > 0 && eatK < .4 ? 'happy' : glow > 0 ? (t > 10.4 ? 'shock' : 'smug') : 'happy', talk: eatK > 0 && eatK < .5 ? .4 + .4 * Math.sin(eatK * 40) : talk('juninho', t),
      armR: { a: eatK < 0 ? 1.9 : lerp(1.9, .4, clamp(eatK * 3)), b: eatK < 0 ? .3 : 1.4 }, armL: { a: .7, b: .3 }, inL: remoteInHand({ t, face: 'alarm' }) });
    if (glow > 0) { const hx = 564, hy = 1330 - .95 * 462; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(hx, hy, 5, hx, hy, 260); gr.addColorStop(0, `rgba(255,240,160,${glow * .9})`); gr.addColorStop(1, 'rgba(255,240,160,0)'); g.fillStyle = gr; g.fillRect(hx - 300, hy - 300, 600, 600); g.restore(); }
    cleide(g, { x: 250, y: 1250 + Math.sin(t * 1.1) * 18, s: .95, t, pose: 'float', rot: -.12, face: t > 10.3 ? 'angry' : 'shock', talk: talk('cleide', t), steam: t > 10.4, armR: { a: 2.6, b: .3 }, armL: { a: 1.4, b: .8 } });
    g.restore();
    comic(g, 'CROC', 820, 520, eatK, { size: 110, color: '#fff6a8', burst: '#ffb703', d: 1.0 });
    whip(g, lt, .3);
  });

  // ---------- 3. black hole sucking random objects (13 – 20) ----------
  const BH = new THREE.Scene(); BH.add(sky(23, [.3, .1, .4], [.4, .2, .1])); const bh = blackHole(70); BH.add(bh); const camB = camera(45); camB.position.set(0, 0, 120); camB.lookAt(0, 0, 0);
  S(T.hole, (g, lt, t, ctx) => {
    bh.userData.set(t); bh.rotation.z = t * .3;
    const burp = t - T.burp, bz = burp > 0 && burp < .5 ? 1 + .4 * Math.sin(burp / .5 * Math.PI) : 1;
    bh.scale.setScalar(lerp(.6, 1.1, ease.outC(prog(lt, 0, 1.2))) * bz);
    draw3d(g, BH, camB);
    ctx.post.swirl = .55 * clamp(lt) * (burp > 0 ? 1 - clamp(burp) : 1); ctx.post.center = [.5, .5];
    const cx = 540, cy = 960;
    sucked(g, cx, cy, prog(t, T.sofa, T.sofa + 2.2), -2.2, 700, gg => sofa(gg, 0, 0, .55));
    sucked(g, cx, cy, prog(t, 15.4, 17.4), .5, 650, gg => toilet(gg, 0, 120, .45, {}));
    sucked(g, cx, cy, prog(t, 16.4, 18.0), 2.5, 620, gg => { coco(gg, { x: 0, y: 60, s: .6, t, crown: true, face: 'happy', armR: 3.0, armL: 1.2 }); rr(gg, -90, -260, 180, 56, 8, '#fff', 5); gg.fillStyle = INK; gg.font = '400 40px Bangers'; gg.textAlign = 'center'; gg.fillText('TCHAU, PAI!', 0, -220); });
    sucked(g, cx, cy, prog(t, 15.0, 17.0), 4.0, 680, gg => duck(gg, 0, 0, 1.3));
    sucked(g, cx, cy, prog(t, 17.0, 18.3), 1.2, 600, gg => sanduiche(gg, { s: .6, y: 40 }));
    // Juninho and Cleide clinging to a floating cube, hair blown towards the hole
    g.save(); g.translate(Math.sin(t * 3) * 6, 0);
    rr(g, 60, 360, 200, 200, 14, '#7B3FE4', 8);
    cleide(g, { x: 150, y: 760, s: .7, t, rot: .5 + Math.sin(t * 9) * .04, face: t > 14.3 ? 'scream' : 'shock', talk: talk('cleide', t), armL: { a: 2.9, b: .1 }, armR: { a: 2.4, b: .2 }, dressUp: .6 });
    juninho(g, { x: 260, y: 860, s: .65, t, rot: .9 + Math.sin(t * 8) * .06, pose: 'float', face: 'panic', hairWind: 1, armL: { a: 2.8, b: .1 }, armR: { a: 2.6, b: .1 } });
    g.restore();
    // the burp: it spits out a paper ticket
    if (burp > 0) {
      comic(g, 'BURP', 560, 640, burp, { size: 120, color: '#e0d0ff', burst: '#3a1a6a', d: 1.0 });
      const k = clamp(burp / 1.2); g.save(); g.translate(lerp(540, 330, ease.outC(k)), lerp(960, 600, ease.outC(k))); g.rotate(burp * 6); g.scale(1.6, 1.6); ticket(g); g.restore();
    }
    flash(g, lt, .25, '#ffb070');
  });

  // ---------- 4. Zé do Multiverso, guichê 7 (20 – 27.1) ----------
  S(T.ze, (g, lt, t, ctx) => {
    g.save(); cam(g, { x: 540, y: 950, z: 1.0 });
    spaceBG(g, t, { popcorn: true });
    // a portal opens; he steps out like it's a Monday
    const po = ease.outBack(prog(t, T.ze, T.ze + .6)) * (1 - ease.inQ(prog(t, 22.0, 22.6)));
    if (po > 0) { g.save(); g.translate(760, 1000); g.scale(po, po * 1.25); for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(0, 0, 300 - i * 46, t * 3 + i, t * 3 + i + 4.6); g.lineWidth = 26; g.strokeStyle = i % 2 ? '#5CF2FF' : '#4CE08A'; g.stroke(); } g.restore(); }
    const zx = lerp(860, 760, ease.outC(prog(t, T.ze + .2, T.ze + 1.2)));
    ze(g, { x: zx, y: 1360, s: 1.0, t, face: 'tired', talk: talk('ze', t), armR: { a: .3, b: 1.2 } });
    senhaPanel(g, 560, 230, ease.outBack(prog(t, T.ding - .3, T.ding)), t);
    // Juninho holds the ticket; Cleide points at him BEFORE he confesses
    const hand = t > T.hand;
    juninho(g, { x: 340, y: 1360 + Math.sin(t * 1.3) * 12, s: .9, t, pose: 'float', face: t > 24.5 ? 'smug' : t > T.ding ? 'shock' : 'neutral', talk: talk('juninho', t), look: [.6, -.3],
      armR: { a: hand ? 2.9 : 1.5, b: hand ? .05 : .9 }, armL: { a: .5, b: .5 }, inR: hand ? null : g2 => ticket(g2) });
    cleide(g, { x: 130, y: 1300 + Math.sin(t * 1.1) * 12, s: .85, t, pose: 'float', face: t > T.point ? 'angry' : 'shock', armR: { a: t > T.point ? 1.75 : .5, b: 0 }, armL: { a: .4, b: .6 } });
    g.restore();
    if (t > T.point && t < T.point + 1.4) { text(g, 'FOI ELE!', 200, 760, { size: 70, color: '#FF7FB4', alpha: clamp((t - T.point) * 4) * (1 - clamp((t - T.point - 1.1) * 4)) }); }
    flash(g, lt, .25, '#4CE08A');
  });

  // ---------- 5. "SEM QUERER?!" and Saturn the coxinha (27.1 – 33.0) ----------
  S(T.yell, (g, lt, t) => {
    if (t < T.saturn) {
      const [sx, sy] = shakes(t, [[T.yell + .1, 26, 2.4]]);
      g.save(); radial(g, 540, 700, t, '#2f8b57', '#1e5e3a'); speedLines(g, 540, 700, t, 46, 300);
      cam(g, { x: 540, y: 900, z: lerp(1.3, 2.0, ease.outC(prog(lt, 0, .3))), sx, sy });
      ze(g, { x: 540, y: 1500, s: 1.15, t, face: 'angry', talk: talk('ze', t), armR: { a: 2.4, b: .2 }, armL: { a: .3, b: .9 } });
      g.restore(); whip(g, lt, .25); return;
    }
    const k = t - T.saturn;
    g.save(); cam(g, { x: 540, y: 900, z: lerp(.8, 1.0, ease.outC(clamp(k / 1.2))) });
    spaceBG(g, t, { cubes: false });
    // the ring (back half), the coxinha planet, the ring (front half)
    const ring = (front) => { g.save(); g.translate(540, 820); g.rotate(-.25); g.beginPath(); g.ellipse(0, 0, 520, 120, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); g.lineWidth = 60; g.strokeStyle = '#e8c27a'; g.stroke(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.restore(); };
    ring(false);
    coxinha(g, { x: 540, y: 1080, s: 1.6 + Math.sin(t * 2) * .02, t, face: 'shock', emblem: false, armL: .3, armR: .3, rot: Math.sin(t) * .05 });
    ring(true);
    for (let i = 0; i < 4; i++) { const a = t * .8 + i * TAU / 4; ell(g, 540 + Math.cos(a) * 470, 820 + Math.sin(a) * 110 - Math.cos(a) * 120, 22, 22, '#f2c14e', 5); }   // moons: cheese balls
    g.restore();
    text(g, 'SATURNO (ATUAL)', 540, 260, { size: 76, color: '#FFD21F' });
    line(g, [540, 310, 540, 380], 8, '#fff');
    // Juninho, impressed, drooling
    if (t > 31.2) { juninho(g, { x: 870, y: 1880, s: .8, t, face: 'happy', talk: talk('juninho', t), armL: { a: .4, b: .4 }, armR: { a: 2.2, b: .6 } }); ell(g, 880, 1880 - .8 * 455, 7, 14 + (t - 31.2) * 10, '#9be7ff', 3); }
    flash(g, k, .3, '#fff');
  });

  // ---------- 6. the fine: a stamp on the forehead (33.0 – 40.0) ----------
  S(33.0, (g, lt, t) => {
    const sk = t - T.stamp;
    const [sx, sy] = shakes(t, [[T.stamp, 26, .5]]);
    g.save(); cam(g, { x: 560, y: 900, z: lerp(1.15, 1.45, ease.io(prog(t, 36.2, 38.0))), sx, sy });
    spaceBG(g, t, { popcorn: true });
    // Zé's stamp comes down onto Juninho's forehead
    const down = sk < 0 ? prog(t, T.stamp - .8, T.stamp) : 1 - prog(t, T.stamp + .3, T.stamp + .8);
    ze(g, { x: 800, y: 1420, s: 1.0, t, face: 'tired', talk: talk('ze', t), armR: { a: lerp(.6, 2.0, ease.inQ(down)), b: lerp(1.2, -.1, ease.inQ(down)) },
      inR: g2 => { g2.save(); g2.rotate(Math.PI); rr(g2, -16, -70, 32, 70, 10, '#7a4a22', 5); rr(g2, -40, -10, 80, 34, 8, '#e8203a', 5); g2.restore(); } });
    juninho(g, { x: 420, y: 1420, s: 1.0, t, face: sk > 0 && sk < .5 ? 'x' : sk > 0 ? 'dumb' : 'smug', talk: talk('juninho', t), sq: sk > 0 ? 1 - .15 * Math.exp(-sk * 7) : 1, armL: { a: .3, b: .3 }, armR: { a: t > 37.0 ? 1.5 : .3, b: t > 37 ? 1.2 : .2 } });
    if (sk > 0) { g.save(); g.translate(424, 1420 - 1.0 * 560); g.rotate(-.12); g.font = '400 40px Bangers'; g.textAlign = 'center'; g.fillStyle = 'rgba(232,32,58,.9)'; g.fillText('MULTADO', 0, 0); g.lineWidth = 4; g.strokeStyle = 'rgba(232,32,58,.9)'; g.strokeRect(-86, -32, 172, 46); g.restore(); }
    g.restore();
    if (sk > 0) comic(g, 'TÓIN', 640, 420, sk, { size: 110, color: '#fff', burst: '#e8203a', d: .9 });
    // the bill, like a receipt unrolling
    if (t > 34.4) { const r = ease.outC(prog(t, 34.4, 35.2)); g.save(); g.translate(880, 180); rr(g, -150, 0, 300, 440 * r, 8, '#fffdf4', 6); g.save(); g.beginPath(); g.rect(-150, 0, 300, 440 * r); g.clip();
      g.fillStyle = INK; g.font = '900 26px Nunito'; g.textAlign = 'left'; ['MULTA INTERDIMENSIONAL', 'Saturno → coxinha ... ∞', 'Sol → pipoca ....... ∞', 'Sofá da mãe ......... R$ 1.200', 'Taxa de burrice ... 100%', '', 'TOTAL: ∞ + R$ 1.200', 'Parcela em 10 mil anos'].forEach((s, i) => g.fillText(s, -136, 40 + i * 48)); g.restore(); g.restore(); }
    whip(g, lt, .25);
  });

  // ---------- 7. the reset button, the quiz-show (40.0 – 47.6) ----------
  S(T.quiz, (g, lt, t) => {
    const show = ease.outC(prog(t, T.show, T.show + .8));
    g.save(); cam(g, { x: 540, y: 960, z: 1.0 });
    spaceBG(g, t, { popcorn: true });
    // quiz-show stage fades in: spotlights, a floor of lights, a podium with a buzzer
    if (show > 0) {
      g.globalAlpha = show; g.fillStyle = '#1a0b2e'; g.fillRect(-200, -200, W + 400, H + 400);
      for (let i = 0; i < 6; i++) { g.save(); g.translate(180 + i * 144, -40); g.rotate(Math.sin(t * 2 + i) * .4); g.globalCompositeOperation = 'lighter'; g.fillStyle = ['rgba(255,210,31,.2)', 'rgba(92,242,255,.2)', 'rgba(255,60,160,.2)'][i % 3]; g.beginPath(); g.moveTo(0, 0); g.lineTo(-140, 1900); g.lineTo(140, 1900); g.closePath(); g.fill(); g.restore(); }
      for (let i = 0; i < 18; i++) { ell(g, 60 + i * 56, 210, 14, 14, Math.floor(t * 6 + i) % 2 ? '#FFD21F' : '#ff3b8a', 4); }
      text(g, 'QUEM QUER SALVAR O UNIVERSO?', 540, 140, { size: 66, color: '#FFD21F', stroke: 12 });
      rr(g, 230, 1180, 260, 240, 20, '#7B3FE4', 8); rr(g, 250, 1200, 220, 60, 12, '#140c1c', 5); g.fillStyle = '#5CF2FF'; g.font = '900 34px Nunito'; g.textAlign = 'center'; g.fillText('JUNINHO', 360, 1242);
      g.globalAlpha = 1;
    }
    // the holographic reset button
    const bk = ease.outBack(prog(t, 41.4, 42.2));
    if (bk > 0) { g.save(); g.translate(540, 560); g.scale(bk, bk); g.globalAlpha = .9; g.shadowColor = '#4CF7E8'; g.shadowBlur = 50; ell(g, 0, 0, 200, 70, 'rgba(76,247,232,.3)', 6); ell(g, 0, -30, 150, 70, Math.floor(t * 3) % 2 ? 'rgba(76,247,232,.75)' : 'rgba(76,247,232,.55)', 6); g.shadowBlur = 0;
      g.fillStyle = '#05202a'; g.font = '400 64px Bangers'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('REINICIAR', 0, -32); g.restore();
      text(g, 'BOTÃO DE REINICIALIZAÇÃO UNIVERSAL', 540, 700, { size: 36, font: 'Nunito', weight: 900, color: '#4CF7E8', stroke: 8, alpha: bk }); }
    ze(g, { x: 800, y: 1400, s: 1.0, t, face: 'tired', talk: talk('ze', t), armR: { a: t > 41.4 && t < 44 ? 2.2 : .3, b: .2 }, inR: show > 0 ? g2 => { rr(g2, -10, -90, 20, 90, 8, '#333', 4); ell(g2, 0, -100, 18, 22, '#888', 4); } : null });
    juninho(g, { x: 360, y: 1180, s: .85, t, face: show > 0 ? 'happy' : 'neutral', armL: { a: .3, b: .3 }, armR: { a: .3, b: .3 }, sq: 1 + Math.sin(t * 6) * .01 });
    g.restore();
    if (show > 0 && show < 1) flash(g, (t - T.show), .3, '#FFD21F');
  });

  // ---------- 8. "Quanto é dois mais dois?" close on Zé (47.6 – 50.0) ----------
  S(47.6, (g, lt, t) => {
    g.save(); g.fillStyle = '#0b0518'; g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(540, 700, 40, 540, 800, 900); gr.addColorStop(0, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    cam(g, { x: 540, y: 820, z: lerp(2.2, 2.45, lt / 2.4) });
    ze(g, { x: 540, y: 1500, s: 1.0, t, face: 'tired', talk: talk('ze', t), armR: { a: .2, b: 1.6 }, armL: { a: .3, b: .9 } });
    g.restore(); letterbox(g, 1);
  });

  // ---------- 9. the math storm inside Juninho's head (50.0 – 60.0) ----------
  const EQ = ['2 + 2 = ?', 'E = mc²', 'Δ = b² − 4ac', 'π ≈ 3,14159…', 'Σ 1/n² = π²/6', '√−1', 'x = (−b ± √Δ) / 2a', 'f(x) = sen(x)', '∞', '2 + 2 = 22?', '2 × 2 ≠ 2²?', 'IMPOSTO: 27,5%', 'ICMS + IPI', 'e^{iπ} + 1 = 0', '2 + 2 = PEIXE', 'lim x→∞', '1 + 1 = 11', '∫ burrice dx'];
  S(T.math, (g, lt, t, ctx) => {
    const errK = t - T.err, inErr = errK > 0 && errK < 1.6;
    g.fillStyle = '#04101c'; g.fillRect(0, 0, W, H);
    // hologram grid floor in perspective
    g.strokeStyle = 'rgba(76,247,232,.35)'; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) { const y = 1100 + Math.pow(i / 13, 2) * 820 + ((t * 60) % 40); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(540 + i * 20, 1100); g.lineTo(540 + i * 220, 1920); g.stroke(); }
    // Juninho thinking, face lit from below by the hologram
    g.save(); cam(g, { x: 540, y: 980, z: 1.6 + lt * .02, r: Math.sin(t * .7) * .02 });
    juninho(g, { x: 540, y: 1560, s: 1.0, t, face: inErr ? 'x' : lt > 7.5 ? 'smug' : 'think', look: [Math.sin(t * 5) * .8, -.6], armR: { a: 2.3, b: 2.2 }, armL: { a: .3, b: .5 }, sweat: lt > 4 });
    if (t > 57.6 && t < 59.4) for (let i = 0; i < 2; i++) { const k = ((t * 1.8 + i * .5) % 1); g.globalAlpha = 1 - k; ell(g, 540 + (i ? 110 : -110) * (1 + k), 1560 - 520 - k * 140, 24 + k * 30, 20 + k * 24, '#cfd6e6', 0); g.globalAlpha = 1; }
    g.restore();
    // flying equations (fake depth: each comes towards camera)
    if (!inErr) for (let i = 0; i < EQ.length; i++) {
      const ph = ((t - T.math) * .35 + hash(i, 61)) % 1, z = .3 + ph * 1.6, x = 540 + (hash(i, 62) - .5) * 1300 * z, y = 760 + (hash(i, 63) - .5) * 1100 * z;
      text(g, EQ[i], x, y, { size: 44 * z, font: 'Nunito', weight: 900, color: i % 3 ? '#4CF7E8' : '#FFD21F', stroke: 6 * z, alpha: Math.sin(ph * Math.PI) });
    }
    // a graph drawing itself (top-left) and a bar chart (top-right)
    const gk = prog(t, 50.6, 54.6);
    g.save(); g.translate(70, 160); g.globalAlpha = .9; line(g, [0, 0, 0, 260, 400, 260], 5, '#4CF7E8');
    g.beginPath(); for (let i = 0; i <= 100 * gk; i++) { const x = i * 4, y = 200 - Math.sin(i * .14) * 70 - i * 1.2 * (1 + noise(i * .2, 4) * .3); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineWidth = 6; g.strokeStyle = '#FFD21F'; g.stroke();
    g.fillStyle = '#4CF7E8'; g.font = '900 24px Nunito'; g.fillText('QI × TEMPO', 10, 300); g.restore();
    g.save(); g.translate(640, 160); line(g, [0, 260, 380, 260], 5, '#4CF7E8');
    ['2', '4', '22', '?'].forEach((lab, i) => { const h = [80, 120, 230, 260][i] * ease.outBack(prog(t, 51 + i * .4, 51.6 + i * .4)); rr(g, 20 + i * 92, 260 - h, 64, Math.max(1, h), 6, ['#4CF7E8', '#2fe36a', '#ff3b8a', '#FFD21F'][i], 4); g.fillStyle = '#fff'; g.font = '900 28px Nunito'; g.textAlign = 'center'; g.fillText(lab, 52 + i * 92, 296); });
    g.restore();
    // rotating wireframe "simulation" sphere
    g.save(); g.translate(540, 420); g.strokeStyle = 'rgba(76,247,232,.7)'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(0, 0, 150 * Math.abs(Math.cos(t * 1.2 + i * Math.PI / 8)), 150, 0, 0, TAU); g.stroke(); }
    for (let i = 1; i < 6; i++) { const y = -150 + i * 50; g.beginPath(); g.ellipse(0, y, Math.sqrt(150 * 150 - y * y), 18, 0, 0, TAU); g.stroke(); }
    g.restore();
    // the loading bar
    const pct = inErr ? 99 : errK > 1.6 ? Math.min(100, Math.floor(prog(t, 57.2, 59.4) * 100)) : Math.floor(prog(t, 50.4, T.err) * 99);
    g.save(); g.translate(540, 1300 - 640); rr(g, -380, -38, 760, 76, 38, '#0b2a36', 6); rr(g, -372, -30, 744 * pct / 100, 60, 30, inErr ? '#e8203a' : '#4CF7E8', 0);
    g.restore();
    text(g, inErr ? 'ERRO 404: NEURÔNIO NÃO ENCONTRADO' : errK > 1.6 ? `REINICIANDO NEURÔNIO… ${pct}%` : `CALCULANDO… ${pct}%`, 540, 590, { size: inErr ? 46 : 50, font: 'Nunito', weight: 900, color: inErr ? '#ff3b5c' : '#ffffff', stroke: 10 });
    if (inErr) { ctx.post.glitch = .9; ctx.post.chroma = 1; ctx.post.invert = Math.floor(t * 10) % 3 === 0 ? 1 : 0; }
    if (t > 59.4) comic(g, 'EUREKA!', 540, 860, t - 59.4, { size: 120, color: '#FFD21F', burst: '#2fa34d', d: .7 });
    flash(g, lt, .2, '#4CF7E8');
  });

  // ---------- 10. the answer, and a long, long silence (60.0 – 68.0) ----------
  S(T.answer, (g, lt, t) => {
    const push = ease.io(prog(t, T.silence, 67.5));
    g.save(); cam(g, { x: 540, y: lerp(960, 850, push), z: lerp(1.0, 1.42, push) });
    spaceBG(g, t * (t > T.silence ? .1 : 1), { popcorn: true, cubes: false });
    cleide(g, { x: 170, y: 1380, s: .9, t, face: t > T.silence + 2 ? 'angry' : 'shock', red: push * .8, armR: { a: 2.6, b: .3 }, armL: { a: .4, b: .4 }, blink: t > 65.5 && t < 65.7 ? 1 : 0 });
    juninho(g, { x: 540, y: 1400, s: .95, t, face: t < T.silence ? 'smug' : 'happy', talk: talk('juninho', t), armL: { a: .3, b: .3 }, armR: { a: t < 62.2 ? 1.9 : 0.3, b: t < 62.2 ? 1.4 : .2 } });
    ze(g, { x: 900, y: 1430, s: .95, t, face: 'tired', blink: t > T.silence ? .2 : 0, armL: { a: .15, b: .9 }, inL: t > 64.6 ? g2 => { } : undefined });
    controle(g, { x: 760, y: 560, s: .8, t, face: t > T.silence + 1 ? 'dead' : 'bored', glow: .4, rot: .1 });
    // tumbleweed... in space
    const tk = prog(t, T.silence + 1.2, T.silence + 4.6);
    if (tk > 0 && tk < 1) tumbleweed(g, lerp(-200, 1300, tk), 1360 - Math.abs(Math.sin(tk * 9)) * 120, 70, tk * 20);
    if (t > 66.4) pipoca(g, 300, 520, ease.outBack(clamp((t - 66.4) * 5)) * 1.2, 2);
    g.restore();
    letterbox(g, ease.outC(prog(t, T.silence, T.silence + .6)));
  });

  // ---------- 11. the chinelada; QUATRO!; Deferido (68.0 – 75.0) ----------
  S(T.slap - .5, (g, lt, t, ctx) => {
    const hk = t - T.slap;
    const [sx, sy] = shakes(t, [[T.slap, 44, .8], [T.deferido + .5, 20, .4]]);
    g.save(); cam(g, { x: 540, y: 920, z: hk < 0 ? 1.2 : lerp(1.2, 1.0, ease.outC(clamp(hk / .5))), sx, sy });
    spaceBG(g, t, { popcorn: true });
    // Cleide's swing: wind up, then strike
    const swing = hk < 0 ? lerp(2.6, 3.2, prog(t, T.slap - .5, T.slap - .15)) : lerp(3.2, .9, ease.outC(clamp(hk / .2)));
    cleide(g, { x: 300, y: 1400, s: 1.0, t, face: 'scream', red: .9, steam: true, armR: { a: swing, b: .1 }, armL: { a: .5, b: .5 } });
    juninho(g, { x: 600, y: 1420, s: .95, t, face: hk > 0 && hk < .6 ? 'x' : hk > 0 ? 'panic' : 'smug', talk: talk('juninho', t), rot: hk > 0 ? .3 * Math.exp(-hk * 3) * Math.cos(hk * 16) : 0,
      sq: hk > 0 ? 1 - .25 * Math.exp(-hk * 6) : 1, armL: { a: t > 69 ? 2.6 : .3, b: .2 }, armR: { a: t > 69 ? 2.6 : .3, b: .2 }, blush: hk > 0 ? 1 : 0 });
    if (hk > 0) { g.save(); g.translate(606, 1420 - .95 * 520); g.rotate(.4); g.globalAlpha = .5; chinelo(g, 0, 70, .85); g.restore(); }
    const dk = t - T.deferido;
    ze(g, { x: 900, y: 1440, s: .95, t, face: 'tired', talk: talk('ze', t), armR: { a: dk > 0 && dk < 1.2 ? lerp(1.0, 2.2, Math.sin(clamp(dk / .5) * Math.PI)) : .3, b: .3 } });
    g.restore();
    // RPG damage numbers
    if (hk > 0 && hk < 1.6) { const k = hk / 1.6; text(g, '-9999', 640 + hk * 60, 520 - k * 220, { size: 130, color: '#ff3b3b', stroke: 14, alpha: 1 - k * k }); text(g, 'CHINELADA CRÍTICA!', 560, 330 - k * 60, { size: 70, color: '#FFD21F', alpha: 1 - k * k }); }
    stampMark(g, 540, 640, 'DEFERIDO', prog(t, T.deferido + .4, T.deferido + .6), '#2fe36a', -.15);
    // the reset button is pressed
    if (t > T.press) { const k = t - T.press; ctx.post.swirl = clamp(k / 1.6) * 1.4; ctx.post.center = [.5, .4]; ctx.post.chroma = clamp(k); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(76,247,232,${clamp(k / 1.6) * .6})`; g.fillRect(0, 0, W, H); g.restore(); }
    flash(g, hk, .2, '#ffffff');
  });

  // ---------- 12. restoration: everything rewinds into place (75.0 – 81.0) ----------
  S(T.restore, (g, lt, t, ctx) => {
    const rk = 1 - ease.ioC(prog(t, T.restore, 77.6));          // breakage goes back to 0
    const home = prog(t, T.home, 80.6);
    setCubes(t, rk); setPlanets(t, i => rk > .4 ? 1 : 0);
    cubes.visible = rk > .01; planets.forEach(P => P.m.visible = t < T.home);
    E.visible = t > 77.0; hs.visible = t > 77.0; E.userData.set(t);
    E.position.set(0, -10, -120);
    hs.position.set(lerp(30, 0, ease.io(home)), lerp(30, 30.5, home), lerp(-60, -80, home)); hs.rotation.set(Math.sin(t) * .3 * (1 - home), t * .8 * (1 - home), 0);
    camU.position.set(0, 10, 40 - home * 10); camU.lookAt(0, lerp(0, 10, home), -90);
    draw3d(g, U, camU);
    ctx.post.swirl = lerp(1.2, 0, ease.outC(prog(t, T.restore, 77.2))); ctx.post.center = [.5, .45];
    burst(g, t - 77.0, 540, 900, { n: 160, speed: 1400, g: 200, life: 2.6, shape: 'star', colors: ['#FFD21F', '#5CF2FF', '#ff3bd1', '#ffffff'], size: 18, seed: 77 });
    burst(g, t - 77.0, 540, 900, { n: 90, speed: 700, g: -100, life: 2.2, colors: ['#ffffff', '#9be7ff'], size: 10, seed: 78 });
    if (t < 77.6 && Math.floor(t * 3) % 2 === 0) text(g, '◀◀ REBOBINANDO', 300, 160, { size: 54, font: 'Nunito', weight: 900, color: '#fff', stroke: 8 });
    if (t > 80.2) comic(g, 'TUDO NORMAL', 540, 520, t - 80.2, { size: 100, color: '#2fe36a', burst: '#140c1c', d: .8 });
    flash(g, t - 77.0, .5, '#ffffff');
  });

  // ---------- 13. back in the bathroom, back on the toilet (81.0 – 90) ----------
  S(T.bath, (g, lt, t) => {
    const pk = t - T.potato, endK = t - T.end;
    g.save(); cam(g, { x: 540, y: lerp(1000, 960, prog(t, 85.8, 87)), z: lerp(1.22, 1.08, prog(t, 85.8, 87)) });
    bathroom(g, t, { fan: 0, door: t > 86.2 ? 1 : 0, light: .8 });
    const giveUp = t > 88.2;
    if (t > 86.2) cleide(g, { x: 175, y: 1310, s: 1.15, t, face: t > 86.8 ? 'angry' : 'shock', talk: talk('cleide', t), noChinelo: giveUp, armR: { a: giveUp ? .3 : 2.6, b: .2 }, armL: { a: 2.8, b: 1.6 } });
    if (giveUp) { const k = clamp((t - 88.2) / .35); chinelo(g, 290, lerp(840, 1300, ease.inQ(k)), .9, k * 3); }
    juninho(g, { x: 540, y: 1408, s: 1.15, pose: 'sit', t, head: pk > 0 ? 'potato' : undefined, face: t < T.green ? 'think' : pk > 0 ? 'dumb' : 'smug', talk: talk('juninho', t),
      armR: { a: 1.9, b: 1.3 }, armL: { a: .3, b: .6 }, inR: remoteInHand({ t, face: t > T.green ? 'happy' : 'neutral', press: t > T.green && t < T.green + .4 ? 'green' : null }) });
    if (pk > 0) burst(g, pk, 540, 1408 - 1.15 * 520, { n: 30, speed: 500, g: -200, life: 1.0, colors: ['#ffffff', '#e0e0e0'], size: 40, seed: 85 });
    g.restore();
    // the green-button inset
    const ik = ease.outBack(prog(t, T.green - .3, T.green)) * (1 - ease.inQ(prog(t, 84.2, 84.5)));
    if (ik > 0) { g.save(); g.translate(820, 520); g.scale(ik, ik); g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.fillStyle = '#052a14'; g.fill(); g.lineWidth = 12; g.strokeStyle = '#2fe36a'; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, 190, 0, TAU); g.clip(); controle(g, { x: 60, y: 40, s: 1.8, t, face: 'happy', talk: talk('controle', t), press: 'green', glow: 1 }); g.restore(); g.restore();
      text(g, 'QI +1000', 820, 760, { size: 64, color: '#2fe36a', alpha: ik }); }
    if (pk > 0) comic(g, 'PUF!', 760, 420, pk, { size: 120, color: '#C9A060', burst: '#6b4a20', d: .9 });
    if (pk > .3 && t < 86.6) text(g, 'QI: 1 BATATA', 540, 300, { size: 70, color: '#C9A060', alpha: clamp((pk - .3) * 4) });
    // END CARD
    if (endK > 0) {
      irisOut(g, t, T.end, .4, 540, 1408 - 1.08 * 520);
      if (endK > .4) {
        const k = ease.outBack(prog(t, T.end + .4, T.end + .8));
        g.save(); g.fillStyle = '#0a0612'; g.fillRect(0, 0, W, H); radial(g, 540, 820, t, '#2a0b4a', '#1a0630', 20);
        g.translate(540, 760); g.scale(k, k); g.rotate(-.06);
        text(g, 'FIM', 0, -120, { size: 260, color: '#FFD21F', stroke: 22 });
        text(g, 'DA TEMPORADA', 0, 70, { size: 110, color: '#ffffff', stroke: 16 });
        text(g, 'O MULTIVERSO DA BURRICE', 0, 200, { size: 54, color: '#5CF2FF', stroke: 10 });
        g.restore();
        juninho(g, { x: 540, y: 1360 + Math.abs(Math.sin(t * 6)) * -30, s: .55 * k, t, head: 'potato', face: 'dumb', armL: { a: 2.6, b: .2 }, armR: { a: 2.6, b: .2 } });
      }
    }
    whip(g, lt, .3);
  });

  return shots;
}
