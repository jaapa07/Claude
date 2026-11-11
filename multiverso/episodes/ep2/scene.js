// EP 2 — A GRAVIDADE FOI PRO SACO (90 s). All times are absolute episode seconds.
import { W, H, TAU, clamp, prog, lerp, ease, hash, noise, shake, shakes, K } from '../../lib/core.js';
import { juninho, cleide, controle, chinelo, speedLines, INK, ellipse as ell, rrect as rr, poly as line, PAL } from '../../lib/chars.js';
import { alien, cafe, sanduiche, mortadela, disco } from '../../lib/chars2.js';
import { cam, comic, flash, whip, vignette, burst, titleCard, radial, text, irisOut, letterbox } from '../../lib/fx.js';
import { livingRoom } from '../../lib/sets.js';
import { THREE, draw3d, camera, sky, earth, house, lights, fleet, motherShip, portal } from '../../lib/world3d.js';

export const META = { num: 2, title: 'A GRAVIDADE FOI PRO SACO', total: 90 };
const T = {
  inside: 4.2, pour: 5.6, merge: 9.6, cafeYell: 12.2, cafeOut: 18.6, chase: 20.2, yellow: 22.8, portalOpen: 24.0, throwC: 25.2, gone: 25.75,
  planet: 29.2, hit: 33.5, dive: 38.9, burst: 39.9, point: 43.2, offer: 46.0, grab: 47.6, bite: 51.5, cry: 53.6, eyes: 60.5, holo: 63.8,
  warp: 72.5, beam: 77.5, yank: 80.5, reveal: 85.0, end: 88.6,
};
export const LINES = [
  { id: 'j1', who: 'juninho', at: 4.7, text: 'Relaxa, mãe. Um cafezinho resolve tudo.' },
  { id: 'f1', who: 'cafe', at: 12.4, text: 'EU NÃO AGUENTO MAIS SER BEBIDO POR GENTE BURRA!' },
  { id: 'j2', who: 'juninho', at: 16.0, text: 'Mas eu nem adocei ainda!' },
  { id: 'f2', who: 'cafe', at: 17.75, text: 'Fui! Prefiro virar picolé.' },
  { id: 'c1', who: 'cleide', at: 20.4, text: 'VEM CÁ, MOLEQUE!' },
  { id: 'r1', who: 'controle', at: 23.1, text: 'Portal de emergência aberto.' },
  { id: 'j3', who: 'juninho', at: 27.2, text: 'Errou, mãe.' },
  { id: 'a0', who: 'alien', at: 30.55, text: 'Povo de Zorg! Hoje conquistaremos o planeta número mil e...', say: 'Povo de Zorg! Hoje conquistaremos o planeta número mil e' },
  { id: 'a1', who: 'alien', at: 35.6, text: 'QUEM FOI O DESGRAÇADO?!' },
  { id: 'a2', who: 'alien', at: 40.8, text: 'Exijo explicações, terráqueos!' },
  { id: 'j4', who: 'juninho', at: 46.2, text: 'Calma, chefe. Aceita um pão com mortadela?' },
  { id: 'a3', who: 'alien', at: 54.0, text: 'Passei 800 anos conquistando planetas… e nunca comi um negócio desses.', say: 'Passei oitocentos anos conquistando planetas... e nunca comi um negócio desses.' },
  { id: 'c2', who: 'cleide', at: 59.0, text: 'Ai, coitadinho...' },
  { id: 'a4', who: 'alien', at: 61.0, text: 'Eu quero TODA a mortadela da Terra!' },
  { id: 'a5', who: 'alien', at: 64.2, text: 'Frota de Zorg! Mudança de planos: invadam a Terra e tragam a mortadela!' },
  { id: 'j5', who: 'juninho', at: 69.0, text: 'E o queijo?' },
  { id: 'a6', who: 'alien', at: 70.0, text: 'O queijo pode ficar. Não sou monstro.' },
  { id: 'c3', who: 'cleide', at: 80.9, text: 'NINGUÉM MEXE NO MEU CAFÉ DA TARDE!' },
];
export const SFX = [
  [0.2, 'swoosh_up', .6], [T.inside, 'whoosh', .6], [T.pour, 'splash', .4], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [6.0 + i * .35, 'plop', .5]),
  [T.merge, 'squish', 1], [T.merge + .6, 'squish', .8], [T.merge + 1.2, 'magic', .6], [11.0, 'boing', .5], [T.cafeYell, 'scratch', .7],
  [16.9, 'slap', .8], [T.cafeOut, 'whoosh', 1], [19.3, 'glitch', .3], [19.4, 'ding', .5],
  [T.chase, 'swoosh_up', .7], [T.yellow, 'click', 1.3], [T.portalOpen, 'warp', 1.1], [T.throwC, 'whoosh', 1], [T.gone, 'zap', .9], [26.3, 'power_down', .5],
  [T.planet, 'thunder', .5], [T.planet + .2, 'gol', .5], [33.0, 'warp', .8], [T.hit, 'bigslap', 1.4], [T.hit + .05, 'honk', .7], [34.2, 'gasp', 1],
  [37.6, 'kiss', .6], [37.7, 'kiss', .6], [T.dive - .3, 'warp', .9], [T.dive + .3, 'swoosh_up', .8],
  [T.burst - .3, 'warp', 1], [T.burst, 'boing', 1], [T.burst + .05, 'thud', .9], [T.point, 'whoosh', .6], [T.point + .4, 'boop', .6],
  [T.grab, 'pop', .9], [48.4, 'whoosh', .5], [49.5, 'sparkle', .9], [T.bite, 'gulp', 1.2], [T.bite + .3, 'gulp', .8], [T.cry, 'cry', 1], [56.5, 'cry', .7],
  [59.3, 'kiss', .4], [T.eyes, 'ding', .8], [T.eyes + .15, 'sparkle', .8], [T.holo, 'beep', .7], [T.holo + .15, 'power_up', .6], [68.5, 'gol', .4],
  [T.warp, 'warp', 1], ...[0, 1, 2, 3, 4, 5].map(i => [T.warp + .4 + i * .55, 'laser', .35]), [75.2, 'hum', 1], [75.6, 'rumble', .7],
  [T.beam, 'hum', .7], [78.0, 'power_up', .6], [79.4, 'gasp', .8], [T.yank, 'whoosh', 1], [T.yank + .1, 'slap', .6], [80.8, 'thunder', .6],
  [T.reveal, 'swoosh_up', .8], [T.reveal + .4, 'hum', 1.1], [T.end, 'rimshot', .9],
];
export const MUSIC = [[0, 'space', .6], [T.inside, 'lounge', .5], [T.cafeYell, 'none'], [15.8, 'lounge', .5], [T.chase, 'chase', .6], [26.3, 'none'],
  [T.planet, 'epic', .55], [33.4, 'none'], [T.burst - .4, 'tension', .6], [T.offer, 'lounge', .45], [T.bite, 'none'], [T.cry, 'sad', .9],
  [T.eyes, 'funk', .55], [T.holo, 'epic', .6], [T.warp, 'epic', .8], [T.beam, 'tension', .6], [T.yank, 'none'], [83.0, 'epic', .9]];

// ---------------- local helpers ----------------
const remoteInHand = (o = {}) => g => controle(g, { s: .34, glow: 0, ...o, y: -40 });
const garrafa = g => { g.save(); g.translate(0, -20); rr(g, -26, -120, 52, 130, 16, '#d8303a', 6); rr(g, -22, -138, 44, 24, 8, '#f4f4f0', 5); line(g, [26, -100, 44, -90, 44, -30, 26, -20], 7, INK); g.restore(); };
const cup = (g, x, y, s = 1, tilt = 0) => { g.save(); g.translate(x, y); g.rotate(tilt); g.scale(s, s); g.beginPath(); g.moveTo(-40, -70); g.lineTo(40, -70); g.lineTo(32, 0); g.lineTo(-32, 0); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.beginPath(); g.arc(46, -38, 18, -1.4, 1.4); g.stroke(); line(g, [-30, -50, 30, -50], 6, '#d8303a'); g.restore(); };
function earthWindow(t, extra) {
  return wg => {
    wg.fillStyle = '#05030f'; wg.fillRect(500, 260, 520, 520);
    for (let i = 0; i < 40; i++) { wg.fillStyle = '#fff'; wg.fillRect(540 + hash(i, 1) * 440, 300 + hash(i, 2) * 440, 3, 3); }
    const gr = wg.createRadialGradient(700, 760, 40, 760, 820, 300); gr.addColorStop(0, '#4fa3ff'); gr.addColorStop(.7, '#1f5fbf'); gr.addColorStop(1, '#0a1f4a');
    wg.fillStyle = gr; wg.beginPath(); wg.arc(760, 900 + Math.sin(t * .3) * 10, 300, 0, TAU); wg.fill();
    wg.fillStyle = 'rgba(60,170,70,.8)'; wg.beginPath(); wg.ellipse(700, 680, 90, 40, .3, 0, TAU); wg.fill();
    if (extra) extra(wg);
  };
}
// a GLSL portal rendered in world pixel coordinates (draw it inside the 2D camera transform)
const pScene = new THREE.Scene(), pCam = new THREE.OrthographicCamera(0, W, 0, -H, .1, 20); pCam.position.z = 5;
const P = [portal(1, [0.4, 0.95, 1.0]), portal(1, [0.6, 1.0, 0.3])]; P.forEach(p => pScene.add(p));
function portals(g, t, list) {        // list: [[x, y, size, open], ...]
  P.forEach((p, i) => { const q = list[i]; p.visible = !!q && q[3] > .01; if (!p.visible) return; p.position.set(q[0], -q[1], 0); p.scale.set(q[2], q[2] * (q[4] ?? 1), 1); p.userData.set(t, q[3]); });
  if (P.some(p => p.visible)) draw3d(g, pScene, pCam);
}
const openK = (t, a, b, c, d) => t < a || t > d ? 0 : t < b ? ease.outBack(prog(t, a, b)) : t < c ? 1 : 1 - ease.inQ(prog(t, c, d));
// Zorgnak's head centre in world coords (for tears, mortadela eyes)
const zHead = (x, y, s) => ({ eyes: [[x - 50 * s, y - 540 * s], [x + 50 * s, y - 540 * s], [x, y - 592 * s]], cx: x, cy: y - 520 * s });

export async function makeShots({ talk }) {
  const shots = []; const S = (t0, draw) => shots.push({ t0, draw });

  // ---------- shared 3D: space, Earth, the house, 2000 saucers, the mothership ----------
  const sp = new THREE.Scene(); sp.add(sky(9)); lights(sp, { amb: .4, sun: 2.6, dir: [6, 3, 5] });
  const E = earth(100); E.position.set(0, -150, -40); sp.add(E);
  const hs = house(); hs.scale.setScalar(.9); sp.add(hs);
  const NF = 2000, F = fleet(NF, 3); sp.add(F);
  const MS = motherShip(); MS.scale.setScalar(3); sp.add(MS);
  const C = new THREE.Vector3(0, -150, -40), tgt = [];
  for (let i = 0; i < NF; i++) {
    const u = hash(i, 81) * 1.6 - .6, th = hash(i, 82) * TAU, r = Math.sqrt(1 - u * u), R = 135 + hash(i, 83) * 380;
    const d = new THREE.Vector3(Math.cos(th) * r, u, Math.sin(th) * r);
    tgt.push({ d, p: C.clone().addScaledVector(d, R), s: 3.5 + hash(i, 84) * 5, ta: T.warp + .3 + hash(i, 85) * 4.2 });
  }
  const camS = camera(38);
  const setSpace = t => {
    E.userData.set(t);
    hs.position.set(Math.sin(t * .2) * 6, 10 + Math.sin(t * .7) * 1.5, 0); hs.rotation.set(Math.sin(t * .5) * .3, t * .4, Math.cos(t * .4) * .25);
    F.userData.set(t, (i, tt) => {
      const q = tgt[i]; if (tt < q.ta) return [0, 0, 0, 0, 0];
      const k = ease.outC(clamp((tt - q.ta) / .6)), far = (1 - k) * 900;
      return [q.p.x + q.d.x * far, q.p.y + q.d.y * far + Math.sin(tt * 1.3 + i) * 2, q.p.z + q.d.z * far, q.s, tt * .8 + i, Math.sin(tt + i) * .15];
    });
    const mk = ease.outC(clamp((t - 75.2) / 2.2)); MS.visible = t > 75.2; MS.position.set(60, 140 + (1 - mk) * 900, -260); MS.rotation.y = t * .2;
  };

  // ---------- 1. continuity: the house still orbits the Earth (0 – 4.2) ----------
  S(0, (g, lt, t) => {
    setSpace(t);
    const k = ease.ioC(prog(lt, .3, 4.2));      // from EP1's last wide framing in to the window
    camS.position.set(lerp(40, 8, k), lerp(60, 15, k), lerp(260, 34, k)); camS.lookAt(lerp(0, hs.position.x, k), lerp(-40, 13, k), 0);
    draw3d(g, sp, camS);
    titleCard(g, t, 2, META.title, .15, 3.4);
    if (lt > 3.4) { g.fillStyle = `rgba(255,255,255,${prog(lt, 3.4, 4.2)})`; g.fillRect(0, 0, W, H); }
  });

  // ---------- 2. zero-g coffee (4.2 – 9.6) and 3. the blobs merge (9.6 – 12.2) ----------
  const blobs = Array.from({ length: 9 }, (_, i) => ({ t0: 6.0 + i * .35, ax: (hash(i, 11) - .5) * 520, ay: -180 - hash(i, 12) * 420, r: 18 + hash(i, 13) * 22 }));
  const CUP = [330, 975], CAFE = [430, 930];
  const blobPos = (b, t) => { const k = clamp((t - b.t0) / 3); let x = CUP[0] + b.ax * ease.outQ(k) + noise(t * .8 + b.r, 2) * 40, y = CUP[1] - 60 + b.ay * ease.outQ(k) + noise(t * .7 + b.r, 5) * 30; const m = ease.inC(prog(t, T.merge, T.merge + 1.2)); return [lerp(x, CAFE[0], m), lerp(y, CAFE[1] - 160, m), b.r * (1 - m * .6)]; };
  const cafeMouth = (g, x, y, s, tk) => { const mx = x, my = y + (-170 + 57) * s, o = clamp(tk); g.save(); g.beginPath(); g.ellipse(mx, my, (26 + o * 22) * s, (8 + o * 30) * s, 0, 0, TAU); g.fillStyle = '#2a0a05'; g.fill(); g.lineWidth = 6 * s; g.strokeStyle = '#f0c090'; g.stroke(); g.clip(); ell(g, mx, my + (10 + o * 20) * s, 20 * s, 12 * s, '#ff8fa0', 0); g.restore(); };
  const room = (g, t, extra) => livingRoom(g, t, { window: earthWindow(t, extra) });
  const plate = (g, x, y, t, full = true) => { g.save(); g.translate(x, y); g.rotate(Math.sin(t * .9) * .15); ell(g, 0, 0, 110, 26, '#ffffff', 6); if (full) sanduiche(g, { x: 0, y: 6, s: .55 }); g.restore(); };
  S(T.inside, (g, lt, t, ctx) => {
    ctx.post.wobble = .35; ctx.post.chroma = .15;
    const m = prog(t, T.merge, T.merge + 1.2), z = t < T.merge ? 1.12 : lerp(1.12, 1.4, ease.io(prog(t, T.merge, 12.2)));
    g.save(); cam(g, { x: t < T.merge ? 540 : lerp(540, 430, ease.io(m)), y: t < T.merge ? 1010 : lerp(1010, 880, ease.io(m)), z });
    room(g, t);
    // Cleide floats over the sofa with her café da tarde (setup for the finale)
    cleide(g, { x: 800, y: 1290 + Math.sin(t * 1.1) * 18, s: .9, t, pose: 'float', rot: .08 * Math.sin(t * .7), face: t > T.merge + .5 ? 'shock' : 'bored', armL: { a: .9, b: 1.3 }, armR: { a: .4, b: .3 } });
    plate(g, 700, 1050 + Math.sin(t * 1.3) * 20, t);
    // the cup, then the escaping coffee
    const pouring = t > T.pour && t < 6.8;
    cup(g, CUP[0], CUP[1] - (t > 6 ? Math.sin(t * 2) * 8 : 0), 1, Math.sin(t * 1.5) * .1);
    if (pouring) { g.beginPath(); g.moveTo(312, 760); g.quadraticCurveTo(330 + Math.sin(t * 9) * 20, 860, 330, 920); g.lineWidth = 22; g.strokeStyle = '#5a3014'; g.stroke(); }
    for (const b of blobs) { if (t < b.t0) continue; const [x, y, r] = blobPos(b, t); g.save(); g.translate(x, y); g.scale(1 + .14 * Math.sin(t * 6 + r), 1 - .14 * Math.sin(t * 6 + r)); ell(g, 0, 0, r, r, '#5a3014', 5); ell(g, -r * .3, -r * .35, r * .25, r * .18, 'rgba(255,220,180,.5)', 0); g.restore(); }
    if (m > .7) cafe(g, { x: CAFE[0], y: CAFE[1], s: .95 * ease.outBack(prog(t, T.merge + .85, T.merge + 1.4)), t, face: 'angry', armL: 1.6, armR: 1.6 });
    // Juninho: pours, then looks into the empty cup, then shakes it upside down
    const empty = t > 10.6;
    juninho(g, { x: 200, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', rot: -.06, face: t < 9 ? 'smug' : empty ? 'dumb' : 'shock', talk: talk('juninho', t),
      armR: { a: pouring ? 2.0 : empty ? 2.9 : 1.1, b: pouring ? .9 : .2 }, armL: { a: .4, b: .5 },
      inR: empty ? g2 => cup(g2, 0, 40, .9, Math.PI + Math.sin(t * 20) * .3) : garrafa, inL: remoteInHand({ t, face: 'bored' }) });
    g.restore();
    if (t > T.merge) comic(g, 'BLOB!', 760, 420, t - T.merge - .8, { size: 110, color: '#d9a066', burst: '#5a3014', d: 1.0 });
    flash(g, lt, .3);
  });

  // ---------- 4. the coffee speaks (12.2 – 15.8) ----------
  S(T.cafeYell, (g, lt, t, ctx) => {
    ctx.post.wobble = .25;
    const [sx, sy] = shakes(t, [[12.4, 22, 1.2], [13.6, 16, 1.2]]);
    g.save(); radial(g, 540, 700, t, '#8a4a1e', '#5a3014', 20);
    cam(g, { x: 430, y: 760, z: lerp(2.3, 2.6, lt / 3.6), sx, sy });
    cafe(g, { x: 430, y: 930, s: .95, t, face: 'angry', talk: talk('cafe', t), armL: 2.4 + Math.sin(t * 9) * .3, armR: 2.2 - Math.sin(t * 9) * .3 }); cafeMouth(g, 430, 930, .95, talk('cafe', t));
    g.restore();
    whip(g, lt, .25);
  });

  // ---------- 5. "I didn't even add sugar" — the coffee leaves (15.8 – 20.2) ----------
  S(15.8, (g, lt, t, ctx) => {
    ctx.post.wobble = .35;
    const out = t - T.cafeOut, slapK = t - 16.9;
    g.save(); cam(g, { x: 520, y: 1000, z: 1.15 });
    room(g, t, wg => {   // outside the window: the coffee freezes into a popsicle in the vacuum
      if (out < .5) return; const k = prog(out, .5, 1.6), x = 760 + Math.sin(t) * 30, y = 520 - out * 20;
      wg.save(); wg.translate(x, y); wg.rotate(.3 + out * .4);
      if (k < 1) cafe(wg, { x: 0, y: 90, s: .5, t, face: 'shock' });
      wg.globalAlpha = k; rr(wg, -50, -70, 100, 150, 30, '#7a4a2a', 6); rr(wg, -10, 70, 20, 70, 6, '#e8c890', 5); ell(wg, -20, -30, 12, 30, 'rgba(255,255,255,.4)', 0);
      for (let i = 0; i < 6; i++) ell(wg, -40 + hash(i, 3) * 80, -60 + hash(i, 4) * 130, 4, 4, '#cfefff', 0);
      wg.restore();
    });
    cleide(g, { x: 800, y: 1290 + Math.sin(t * 1.1) * 18, s: .9, t, pose: 'float', face: 'shock', armL: { a: .9, b: 1.3 }, armR: { a: .4, b: .3 } });
    plate(g, 700, 1050 + Math.sin(t * 1.3) * 20, t);
    juninho(g, { x: 310, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', face: slapK > 0 && slapK < .7 ? 'x' : t > 18 ? 'sad' : 'shock', talk: talk('juninho', t), rot: slapK > 0 ? -.3 * Math.exp(-slapK * 3) : 0,
      armR: { a: 1.6, b: .4 }, armL: { a: .4, b: .5 }, inR: g2 => cup(g2, 0, 40, .9, .4), inL: remoteInHand({ t, face: 'bored' }), blush: slapK > 0 ? .6 : 0 });
    // the coffee slaps him with a spoon, then shoots out through the window
    if (out < 0) {
      const cx = 470, cy = 980;
      cafe(g, { x: cx, y: cy, s: .8, t, face: 'angry', talk: talk('cafe', t), armL: 1.5, armR: slapK > -.3 && slapK < .3 ? 0.2 : 2.6 }); cafeMouth(g, cx, cy, .8, talk('cafe', t));
      g.save(); g.translate(cx + 140, cy - 230); g.rotate(slapK > -.3 && slapK < .3 ? -1.4 : .3); line(g, [0, 0, 0, -120], 10, '#b8bcc8'); ell(g, 0, -140, 22, 30, '#b8bcc8', 6); g.restore();
    } else if (out < .5) {
      const k = out / .5; cafe(g, { x: lerp(470, 760, k), y: lerp(980, 600, k), s: lerp(.8, .5, k), t, rot: k * 6, sq: 1.4, face: 'happy' });
    }
    g.restore();
    comic(g, 'PLIM!', 300, 560, slapK, { size: 110, color: '#fff', burst: '#b8bcc8', d: .8 });
    if (out > 1.0) text(g, 'PICOLÉ DE CAFÉ', 760, 260, { size: 56, color: '#cfefff', stroke: 10, alpha: clamp((out - 1) * 3) });
  });

  // ---------- 6. Cleide charges; the yellow button opens a portal (20.2 – 25.0) and 7. the throw (25.0 – 29.2) ----------
  const portalA = t => openK(t, T.portalOpen, T.portalOpen + .5, 25.9, 26.3);
  S(T.chase, (g, lt, t, ctx) => {
    ctx.post.wobble = .35; ctx.post.chroma = .2;
    const charge = ease.io(prog(t, 20.2, 22.6));
    const thrown = t > T.throwC, sil = t > 26.3;
    const z = sil ? lerp(1.2, 1.9, ease.outC(prog(t, 26.3, 26.8))) : 1.12;
    const cxW = sil ? 700 : 540, cyW = sil ? 840 : 1010;
    const [sx, sy] = shakes(t, [[20.4, 14, 1.0]]);
    g.save(); cam(g, { x: cxW, y: cyW, z, sx, sy });
    room(g, t);
    portals(g, t, [[540, 640, 300, portalA(t)]]);
    // the chinelo's flight into the portal
    if (thrown && t < T.gone) { const k = prog(t, T.throwC, T.gone); chinelo(g, lerp(700, 540, k), lerp(700, 640, k) + 70, lerp(1, .2, k), k * 12); }
    const pressed = t > T.yellow;
    juninho(g, { x: 260, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', face: t > 27 ? 'smug' : pressed ? 'happy' : 'panic', talk: talk('juninho', t),
      armR: { a: 2.3, b: .5 }, armL: { a: .4, b: .5 }, inR: remoteInHand({ t, face: pressed && t < 25 ? 'evil' : 'neutral', press: pressed && t < 23.4 ? 'yellow' : null, talk: talk('controle', t) }) });
    cleide(g, { x: lerp(820, 760, charge), y: 1290 + Math.sin(t * 1.1) * 18, s: .95, t, pose: 'float', rot: lerp(0, -.25, charge), face: sil ? (t > 27.6 ? 'angry' : 'shock') : 'angry', talk: talk('cleide', t), red: t > 27.6 ? .8 : .35, steam: t > 27.8,
      noChinelo: thrown, armR: { a: thrown ? (sil ? 2.0 : 1.3) : 2.8 + Math.sin(t * 10) * .08, b: thrown && sil ? 1.2 : .3 }, armL: { a: .6, b: .4 } });
    g.restore();
    if (sil && t < 27.1) text(g, '...', 700, 420, { size: 120, color: '#fff' });
    if (t > T.gone && t < 26.4) comic(g, 'ZUUP', 560, 500, t - T.gone, { size: 120, color: '#5CF2FF', burst: '#7B3FE4', d: .7 });
    if (sil) letterbox(g, ease.outC(prog(t, 26.3, 26.7)));
    flash(g, lt, .2);
  });

  // ---------- 8. planet Zorg: the speech and the chinelo (29.2 – 39.9) ----------
  const zs = new THREE.Scene(); zs.add(sky(21, [.55, .1, .4], [.1, .5, .35])); const zcam = camera(50);
  const crowd = Array.from({ length: 40 }, (_, i) => ({ x: (i % 10) * 120 + (Math.floor(i / 10) % 2) * 60, y: 1680 + Math.floor(i / 10) * 90, c: hash(i, 3) }));
  S(T.planet, (g, lt, t) => {
    const hitK = t - T.hit;
    zcam.position.set(0, 0, 0); zcam.lookAt(Math.sin(t * .05) * 10, 3 + Math.cos(t * .04), -10); draw3d(g, zs, zcam);
    const close = t > 35.3 && t < 37.4, sniff = t > 37.4;
    const z = close ? lerp(1.9, 2.2, prog(t, 35.3, 37.4)) : sniff ? 1.5 : lerp(1.0, 1.08, prog(t, T.planet, T.hit));
    const [sx, sy] = shakes(t, [[T.hit, 40, .8], [35.6, 20, 1.4]]);
    g.save(); cam(g, { x: 540, y: close ? 800 : sniff ? 880 : 960, z, sx, sy });
    // the sky dressing: a ringed planet, two moons
    g.save(); g.translate(260, 420); ell(g, 0, 0, 150, 150, '#ff8c42', 7); g.save(); g.beginPath(); g.arc(0, 0, 150, 0, TAU); g.clip(); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffb36b' : '#e5672a'; g.fillRect(-160, -150 + i * 64, 320, 30); } g.restore();
    g.rotate(-.3); g.beginPath(); g.ellipse(0, 0, 260, 50, 0, 0, TAU); g.lineWidth = 16; g.strokeStyle = '#ffe0a0'; g.stroke(); g.restore();
    ell(g, 860, 300, 60, 60, '#d8f0ff', 6); ell(g, 960, 470, 30, 30, '#b0ffd0', 5);
    // ground with crystals
    g.beginPath(); g.moveTo(-200, 1250); for (let x = -200; x <= 1300; x += 100) g.lineTo(x, 1230 + Math.sin(x * .02) * 40); g.lineTo(1300, 2200); g.lineTo(-200, 2200); g.closePath(); g.fillStyle = '#4a1a6a'; g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
    for (let i = 0; i < 7; i++) { const x = 60 + i * 160, y = 1260; g.beginPath(); g.moveTo(x - 24, y); g.lineTo(x, y - 90 - hash(i, 5) * 60); g.lineTo(x + 24, y); g.closePath(); g.fillStyle = i % 2 ? '#5cf2ff' : '#ff3bd1'; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
    // Zorgnak at the podium
    const zx = 540, zy = 1330, spin = hitK > 0 && hitK < .8 ? hitK * 14 : 0;
    const face = hitK < 0 ? 'happy' : hitK < 1.8 ? 'shock' : sniff ? 'happy' : 'angry';
    alien(g, { x: zx, y: zy, s: 1, t, rot: spin ? Math.sin(spin) * .5 : 0, face, talk: talk('alien', t), armL: hitK < 0 ? 2.6 + Math.sin(t * 4) * .3 : sniff ? 2.2 : .6, armR: hitK < 0 ? 2.4 : sniff ? 2.6 : 1.8,
      inR: hitK > 1.2 ? g2 => chinelo(g2, 0, 30, .7, Math.PI) : null, look: [0, 0] });
    if (hitK > 0) { g.save(); g.translate(zx + 4, zy - 520); g.rotate(-.2); g.globalAlpha = .45; chinelo(g, 0, 80, .9, 0); g.restore(); }   // the print
    rr(g, 380, 1110, 320, 260, 20, '#6b6f8a'); for (const [dx, dy] of [[-40, 0], [40, 0], [0, -50]]) ell(g, 540 + dx, 1240 + dy, 26, 26, '#9BE03A', 5);
    line(g, [600, 1110, 640, 1010], 7, INK); ell(g, 644, 1000, 14, 18, '#333', 5);
    // the portal opens over his head; the chinelo drops in
    portals(g, t, [[560, 470, 300, openK(t, 33.0, 33.25, 33.6, 34.0), .55]]);
    if (t > 33.15 && t < T.hit) { const k = prog(t, 33.15, T.hit); chinelo(g, 560, lerp(470, 790, ease.inQ(k)) + 70, 1.0, k * 8); }
    // he jumps back through it at the end
    portals(g, t, [[540, 900, 420, openK(t, 38.4, 38.7, 39.5, 39.9)]]);
    if (sniff) { text(g, t < 38.2 ? 'SNIFF SNIFF' : 'CHEIRO DE TERRA', 540, 400, { size: 70, color: '#A6FF4D', stroke: 12 }); }
    g.restore();
    // the crowd of aliens (foreground, from behind)
    for (const c of crowd) { const hop = hitK > .7 && hitK < 1.6 ? Math.abs(Math.sin(t * 10 + c.c * 5)) * 30 : Math.abs(Math.sin(t * 3 + c.c * 9)) * (hitK < 0 ? 18 : 0); ell(g, c.x, c.y - hop, 70, 60, c.c > .5 ? '#9BE03A' : '#7fc72a', 6); line(g, [c.x - 20, c.y - 50 - hop, c.x - 34, c.y - 100 - hop], 6, INK); line(g, [c.x + 20, c.y - 50 - hop, c.x + 34, c.y - 100 - hop], 6, INK); ell(g, c.x - 34, c.y - 104 - hop, 9, 9, '#ff3bd1', 4); ell(g, c.x + 34, c.y - 104 - hop, 9, 9, '#ff3bd1', 4); }
    comic(g, 'PLAFT!!', 800, 380, hitK, { size: 170, color: '#FFD21F', burst: '#ff3b5c', d: 1.2 });
    if (hitK > 1 && hitK < 2) text(g, 'OOOH!', 220, 1330, { size: 80, color: '#fff', stroke: 12 });
    flash(g, lt, .3, '#ff3bd1');
  });

  // ---------- 9. Zorgnak bursts into the living room (39.9 – 46.0) ----------
  const zIn = K({}, { y: [[0, 900], [.35, 1330, 'power2.out']], sq: [[0, .6], [.3, 1.35], [.45, .75], [.65, 1.1], [.85, 1]] });
  S(39.5, (g, lt, t, ctx) => {
    ctx.post.wobble = .35;
    const k = zIn.at(t - T.burst), out = t > T.burst, pt = t > T.point;
    const [sx, sy] = shakes(t, [[T.burst, 30, .7]]);
    g.save(); cam(g, { x: 540, y: 1010, z: 1.12, sx, sy });
    room(g, t);
    portals(g, t, [[560, 860, 420, openK(t, 39.5, 39.8, 40.6, 41.0), 1], null]);
    cleide(g, { x: 870, y: 1290 + Math.sin(t * 1.1) * 18, s: .9, t, pose: 'float', face: pt ? 'angry' : 'shock', noChinelo: true, armL: { a: pt ? 1.6 : .9, b: pt ? 0 : 1.3 }, armR: { a: .5, b: .3 } });
    plate(g, 960, 1050 + Math.sin(t * 1.3) * 20, t);
    if (out) alien(g, { x: 560, y: k.y + Math.sin(t * 1.2) * 14, s: .82, sq: k.sq, t, face: 'angry', talk: talk('alien', t), armL: 2.6 + Math.sin(t * 6) * .1, armR: pt ? .4 : 1.2, inL: g2 => chinelo(g2, 0, 30, .7, Math.PI) });
    juninho(g, { x: 220, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', face: pt ? 'smug' : 'panic', armR: { a: pt ? 1.65 : 2.4, b: 0 }, armL: { a: .4, b: .5 }, inL: remoteInHand({ t, face: 'bored' }) });
    g.restore();
    if (pt) { text(g, 'FOI ELA!', 280, 420, { size: 84, color: '#FFD21F', rot: -.1, alpha: clamp((t - T.point) * 4) }); text(g, 'FOI ELE!', 820, 420, { size: 84, color: '#FF7FB4', rot: .1, alpha: clamp((t - T.point) * 4) }); }
    comic(g, 'TCHUM', 560, 420, t - T.burst, { size: 120, color: '#A6FF4D', burst: '#2a0b4a', d: .8 });
    flash(g, lt, .25, '#A6FF4D');
  });

  // ---------- 10. the offering (46.0 – 51.3) ----------
  S(T.offer, (g, lt, t, ctx) => {
    ctx.post.wobble = .3;
    const grabbed = t > T.grab, offered = t > 48.4, close = t > 49.4;
    g.save(); cam(g, { x: close ? 470 : 540, y: close ? 820 : 1010, z: close ? lerp(1.6, 1.9, prog(t, 49.4, 51.3)) : 1.12 });
    room(g, t);
    cleide(g, { x: 870, y: 1290 + Math.sin(t * 1.1) * 18, s: .9, t, pose: 'float', face: grabbed ? 'shock' : 'angry', noChinelo: true, armL: { a: grabbed ? 2.2 : .9, b: .5 }, armR: { a: .5, b: .3 } });
    plate(g, 960, 1050 + Math.sin(t * 1.3) * 20, t, !grabbed);
    alien(g, { x: 600, y: 1330 + Math.sin(t * 1.2) * 14, s: .82, t, face: offered ? 'shock' : 'angry', armL: 2.6, armR: .4, inL: g2 => chinelo(g2, 0, 30, .7, Math.PI), look: [-1, 0] });
    const jx = grabbed && !offered ? lerp(700, 330, prog(t, T.grab, 48.4)) : 330;
    juninho(g, { x: t < T.grab ? lerp(220, 700, ease.io(prog(t, 46.6, T.grab))) : jx, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', face: 'smug', talk: talk('juninho', t),
      armR: { a: offered ? 1.7 : 1.0, b: offered ? 0 : .6 }, armL: { a: .4, b: .5 }, inR: grabbed ? g2 => sanduiche(g2, { s: .5, y: 50, rot: -1.5 }) : null });
    g.restore();
    if (close) { burst(g, t - 49.5, 520, 760, { n: 30, speed: 300, g: -100, life: 1.8, shape: 'star', colors: ['#FFD21F', '#ffffff', '#F3A3B0'], size: 18, seed: 9 }); text(g, 'PÃO COM MORTADELA', 540, 330, { size: 74, color: '#F3A3B0', stroke: 12, alpha: clamp((t - 49.5) * 3) }); }
    if (grabbed && t < 48.6) text(g, 'MEU LANCHE?!', 860, 520, { size: 60, color: '#FF7FB4', stroke: 10 });
  });

  // ---------- 11. the bite, the silence, the tears (51.3 – 60.5) ----------
  S(51.3, (g, lt, t, ctx) => {
    ctx.post.wobble = .3;
    const silent = t > 51.8 && t < T.cry, crying = t > T.cry;
    const zx = 560, zy = 1330 + Math.sin(t * 1.2) * 14, s = .82, hd = zHead(zx, zy, s);
    const z = silent ? lerp(2.2, 2.6, prog(t, 51.8, T.cry)) : crying ? lerp(1.5, 1.25, prog(t, T.cry, 56)) : 1.3;
    const cxW = silent ? hd.cx : 560, cyW = silent ? hd.cy : 900;
    g.save(); cam(g, { x: cxW, y: cyW, z });
    room(g, t);
    cleide(g, { x: 880, y: 1290 + Math.sin(t * 1.1) * 18, s: .9, t, pose: 'float', face: t > 58.8 ? 'sad' : 'shock', talk: talk('cleide', t), noChinelo: true, armL: { a: t > 58.8 ? 2.4 : .9, b: t > 58.8 ? 1.2 : .3 }, armR: { a: .5, b: .3 } });
    alien(g, { x: zx, y: zy, s, t, face: crying ? 'cry' : t > T.bite ? 'shock' : 'happy', talk: talk('alien', t), armL: 2.6, armR: crying ? 2.9 : 1.6,
      inR: t < 51.8 ? g2 => sanduiche(g2, { s: .45, y: 30 }) : crying ? g2 => sanduiche(g2, { s: .38, y: 30, rot: .3 }) : null, inL: g2 => chinelo(g2, 0, 30, .7, Math.PI) });
    // zero-g tears: they don't fall, they float away as little bubbles (and hit Juninho)
    if (crying) for (let i = 0; i < 26; i++) { const tb = T.cry + i * .25, k = t - tb; if (k < 0) continue; const e = hd.eyes[i % 3]; const dir = (hash(i, 4) - .5) * 2; const x = e[0] + dir * 160 * k + Math.sin(k * 3 + i) * 10, y = e[1] - 40 * k + Math.cos(k * 2 + i) * 14; if (k > 6) continue; ell(g, x, y, 10 + hash(i, 5) * 8, 10 + hash(i, 5) * 8, 'rgba(127,214,255,.85)', 4); }
    juninho(g, { x: 260, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', face: crying ? (t > 57 ? 'dumb' : 'shock') : 'smug', armR: { a: 1.0, b: .4 }, armL: { a: .4, b: .5 }, inL: remoteInHand({ t, face: crying ? 'bored' : 'neutral' }) });
    g.restore();
    if (t > T.bite && t < 51.9) comic(g, 'NHAC', 700, 520, t - T.bite, { size: 120, color: '#F3A3B0', burst: '#2a0b4a', d: .5 });
    if (silent) { vignette(g, .6); letterbox(g, ease.outC(prog(t, 51.8, 52.2))); }
  });

  // ---------- 12. mortadela eyes (60.5 – 63.8) and the hologram call (63.8 – 72.5) ----------
  S(T.eyes, (g, lt, t, ctx) => {
    ctx.post.wobble = .3;
    const holo = t > T.holo, zx = holo ? 620 : 560, zy = 1330 + Math.sin(t * 1.2) * 14, s = holo ? .8 : .82, hd = zHead(zx, zy, s);
    const z = holo ? 1.1 : lerp(2.1, 2.3, prog(t, T.eyes, T.holo));
    g.save(); cam(g, { x: holo ? 540 : hd.cx, y: holo ? 990 : hd.cy + 40, z });
    room(g, t);
    cleide(g, { x: 900, y: 1300 + Math.sin(t * 1.1) * 18, s: .85, t, pose: 'float', face: t > 69 ? 'bored' : 'shock', noChinelo: true, armL: { a: .9, b: 1.2 }, armR: { a: .5, b: .3 } });
    alien(g, { x: zx, y: zy, s, t, face: holo ? 'angry' : 'happy', talk: talk('alien', t), vein: false, armL: holo ? 2.2 : 2.6, armR: holo ? 2.0 : 1.6, inL: g2 => chinelo(g2, 0, 30, .7, Math.PI) });
    if (!holo) { const k = ease.outBack(prog(t, T.eyes, T.eyes + .3)); for (const [ex, ey] of hd.eyes) { g.save(); g.translate(ex, ey + 60 * s * .7 * 0); g.scale(k, k); mortadela(g, { x: 0, y: 60 * .4, s: .4 }); g.restore(); } }
    // the hologram from his wrist: the fleet salutes (with forks)
    if (holo) {
      const hk = ease.outBack(prog(t, T.holo, T.holo + .4)), hx = 600, hy = 560;
      g.save(); g.translate(hx, hy); g.scale(hk, hk); g.globalAlpha = .85;
      g.fillStyle = 'rgba(92,242,255,.18)'; g.beginPath(); g.moveTo(-300, -220); g.lineTo(300, -220); g.lineTo(300, 220); g.lineTo(-300, 220); g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = '#5CF2FF'; g.stroke();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const salute = Math.sin(t * 6 + r + c) > 0; disco(g, -220 + c * 146, -130 + r * 130, .42, t, { rot: salute ? -.1 : .1 }); if (t > 68 && t < 69.4) text(g, 'ÊÊÊ!', -220 + c * 146, -180 + r * 130, { size: 30, color: '#A6FF4D', stroke: 5 }); }
      g.globalAlpha = .25; for (let y = -220; y < 220; y += 12) { g.fillStyle = '#5CF2FF'; g.fillRect(-300, y + ((t * 60) % 12), 600, 3); }
      g.restore(); line(g, [hx, hy + 220 * hk, zx - 100, zy - 330], 4, 'rgba(92,242,255,.6)');
      text(g, 'FROTA DE ZORG · CANAL 1', hx, hy - 250 * hk, { size: 40, color: '#5CF2FF', stroke: 8, alpha: hk });
    }
    juninho(g, { x: 230, y: 1300 + Math.sin(t * 1.2) * 16, s: .9, t, pose: 'float', face: t > 68.8 && t < 69.8 ? 'think' : t > 69.8 ? 'happy' : 'shock', talk: talk('juninho', t), armR: { a: t > 68.8 && t < 70 ? 2.8 : 1.0, b: .3 }, armL: { a: .4, b: .5 }, inL: remoteInHand({ t, face: 'bored' }) });
    g.restore();
    if (!holo) { comic(g, 'PLIM PLIM', 800, 420, t - T.eyes, { size: 90, color: '#F3A3B0', burst: '#ff3bd1', d: 1.0 }); }
    flash(g, lt, .2, '#F3A3B0');
  });

  // ---------- 13. the fleet warps in around the Earth (72.5 – 77.5) ----------
  S(T.warp, (g, lt, t) => {
    setSpace(t);
    const a = .2 + lt * .05; camS.position.set(Math.sin(a) * 520, 120 + lt * 8, Math.cos(a) * 520); camS.lookAt(0, -80, -40);
    draw3d(g, sp, camS);
    if (lt < 4.5) speedLines(g, 540, 960, t, 50, 250, `rgba(166,255,77,${.6 * (1 - lt / 4.5)})`);
    if (t > 75.4) text(g, 'NAVE-MÃE', 540, 300, { size: 80, color: '#A6FF4D', stroke: 12, alpha: clamp((t - 75.4) * 3) * (1 - prog(t, 77, 77.5)) });
    flash(g, lt, .3, '#A6FF4D');
  });

  // ---------- 14. a tractor beam steals the mortadela from the kitchen (77.5 – 80.5) ----------
  S(T.beam, (g, lt, t, ctx) => {
    ctx.post.wobble = .3;
    const lift = ease.inQ(prog(t, 78.0, 80.2));
    g.save(); cam(g, { x: 480, y: 900, z: 1.2 });
    room(g, t, wg => { disco(wg, 760, 420, .9, t, { beam: false }); });
    // the beam through the window down to the counter
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(166,255,77,${.28 + .08 * Math.sin(t * 20)})`; g.beginPath(); g.moveTo(700, 440); g.lineTo(820, 440); g.lineTo(380, 1000); g.lineTo(120, 1000); g.closePath(); g.fill(); g.restore();
    // the big peça de mortadela rises along the beam
    const mx = lerp(250, 760, lift), my = lerp(960, 450, lift);
    g.save(); g.translate(mx, my); g.rotate(lift * 4); g.scale(1 - lift * .6, 1 - lift * .6); rr(g, -130, -60, 260, 120, 60, '#F3A3B0'); ell(g, 130, 0, 30, 60, '#f6b5c0', 6); for (let i = 0; i < 8; i++) ell(g, -100 + i * 28, (hash(i, 2) - .5) * 70, 6, 5, '#fff', 0); rr(g, -20, -64, 40, 128, 4, 'rgba(200,30,40,.5)', 0); g.restore();
    cleide(g, { x: 860, y: 1300, s: .9, t, pose: 'float', face: t > 79.4 ? 'angry' : 'shock', red: t > 79.4 ? .7 : 0, noChinelo: true, armL: { a: 1.6, b: 0 }, armR: { a: .5, b: .3 } });
    g.restore();
    if (t > 79.4) text(g, 'A MINHA MORTADELA?!', 540, 300, { size: 66, color: '#FF7FB4', stroke: 12 });
    flash(g, lt, .2, '#A6FF4D');
  });

  // ---------- 15. Cleide takes the chinelo back (80.5 – 85.0) ----------
  S(T.yank, (g, lt, t, ctx) => {
    ctx.post.wobble = .3;
    const has = t > T.yank + .3;
    const [sx, sy] = shakes(t, [[80.9, 30, 2.2]]);
    g.save(); radial(g, 540, 700, t, '#ff5c7a', '#c2185b', 18);
    cam(g, { x: 470, y: 820, z: lerp(1.5, 1.9, ease.outC(prog(t, 80.6, 81.2))), sx, sy });
    alien(g, { x: 830, y: 1330, s: .8, t, face: 'shock', armL: has ? 2.0 : 2.4, armR: 1.6, inL: has ? null : g2 => chinelo(g2, 0, 30, .7, Math.PI), inR: g2 => sanduiche(g2, { s: .35, y: 30 }) });
    cleide(g, { x: 470, y: 1300, s: 1.05, t, pose: 'float', face: t > 80.9 ? 'scream' : 'angry', talk: talk('cleide', t), red: .9, steam: true, noChinelo: !has, armR: { a: has ? 2.8 + Math.sin(t * 9) * .06 : 1.5, b: .3 }, armL: { a: .9, b: 1.3 }, inR: has ? g2 => chinelo(g2, 0, 0, 1.15, 0, .6 + .4 * Math.sin(t * 8)) : null });
    g.restore();
    letterbox(g, ease.outC(prog(t, T.yank, T.yank + .4)));
    whip(g, lt, .3);
  });

  // ---------- 16. pull back: thousands of ships (85.0 – 90) ----------
  S(T.reveal, (g, lt, t) => {
    setSpace(t);
    const k = ease.ioC(prog(lt, 0, 3.6));
    camS.position.set(lerp(6, -120, k), lerp(16, 380, k), lerp(28, 1250, k)); camS.lookAt(lerp(hs.position.x, 0, k), lerp(12, -60, k), lerp(0, -40, k));
    draw3d(g, sp, camS);
    if (lt > 1.2) text(g, '2.000 NAVES', 540, 330, { size: 76, color: '#A6FF4D', stroke: 12, alpha: clamp((lt - 1.2) * 3) * (1 - prog(t, T.end - .3, T.end)) });
    if (t > T.end) { const kk = ease.outBack(prog(t, T.end, T.end + .35)); g.save(); g.translate(540, 760); g.rotate(-.12); g.scale(kk, kk); text(g, 'CONTINUA...', 0, 0, { size: 150, color: '#FFD21F', stroke: 18 }); g.restore(); }
    irisOut(g, t, 89.55, .4, 540, 960);
    flash(g, lt, .25);
  });

  return shots;
}
