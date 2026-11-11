// EP 1 — O BOTÃO DO COCÔ INFINITO (90 s). All times are absolute episode seconds.
import { W, H, TAU, clamp, prog, lerp, ease, hash, noise, shake, shakes, K, physics } from '../../lib/core.js';
import { juninho, cleide, controle, coco, toilet, chinelo, speedLines, INK, ellipse as ell, rrect as rr, poly as line, PAL } from '../../lib/chars.js';
import { cam, comic, flash, whip, vignette, burst, titleCard, achievement, crickets, radial, text, irisOut, letterbox } from '../../lib/fx.js';
import { bathroom, livingRoom } from '../../lib/sets.js';
import { THREE, draw3d, camera, sky, earth, house, rubikHouse, lights } from '../../lib/world3d.js';

export const META = { num: 1, title: 'O BOTÃO DO COCÔ INFINITO', total: 90 };
// beats (s): the single source of truth for picture, dialogue and sound
const T = {
  press: 6.35, rise: 8.0, jump: 7.45, zoomFace: 12.6, out: 15.2, split: 16.0, flush: 25.0, spew: 25.7, dance: 29.0, heart: 31.6, selfie: 33.6,
  door: 35.0, sink: 40.0, silence: 45.0, throwC: 48.1, header: 48.75, hit: 49.25, blue: 56.0, zeroG: 58.5, fanHit: 70.6,
  cube: 75.0, toast: 78.4, space: 82.0, cleideClose: 87.6, end: 89.2,
};
export const LINES = [
  { id: 'j1', who: 'juninho', at: 0.9, text: 'Ué, que controle é esse? Será que liga o ventilador?' },
  { id: 'k1', who: 'coco', at: 9.4, text: 'FINALMENTE! TRINTA ANOS ESPERANDO A LIBERDADE!' },
  { id: 'j2', who: 'juninho', at: 12.85, text: 'QUE PORRA É ESSA?!', voice: { speed: 1.2 } },
  { id: 'j3', who: 'juninho', at: 17.4, text: 'VOLTA PRO VASO, DESGRAÇA!' },
  { id: 'k2', who: 'coco', at: 20.2, text: 'Agora é tarde, pai! A família cresceu!' },
  { id: 'c1', who: 'cleide', at: 36.0, text: 'JUNINHO! POR QUE TEM UM COCÔ FAZENDO EMBAIXADINHA NA MINHA PIA?!' },
  { id: 'z1', who: 'cocozinho', at: 41.2, text: 'É TREINO PRO BRASILEIRÃO, TIA!' },
  { id: 'j4', who: 'juninho', at: 50.7, text: 'Mãe, calma! Eu tenho um controle!' },
  { id: 'r1', who: 'controle', at: 56.5, text: 'Gravidade: desligada.' },
  { id: 'c2', who: 'cleide', at: 62.6, text: 'JUNINHO, EU VOU TE BATER ATÉ EM OUTRA DIMENSÃO!' },
  { id: 'j5', who: 'juninho', at: 68.0, text: 'Olha, mãe, eu tô voando! Ai!' },
  { id: 'r2', who: 'controle', at: 78.9, text: 'Parabéns. Você desbloqueou o modo apocalipse.' },
  { id: 'j6', who: 'juninho', at: 84.4, text: 'Mãe… acho que apertei o botão errado.' },
  { id: 'c3', who: 'cleide', at: 88.0, text: 'VOCÊ ACHA?!' },
];
export const SFX = [
  [0.25, 'swoosh_up', .6], [3.9, 'beep', .5], [5.6, 'drumroll', .5], [T.press, 'click', 1.4], [T.press + .05, 'boop', .8],
  [7.0, 'rumble', .9], [T.jump, 'boing', .9], [7.9, 'choir', .8], [8.2, 'sparkle', .7], [12.6, 'scratch', .5], [12.7, 'whoosh', .7],
  [T.out, 'boing', 1], [T.out + .5, 'plop', 1], ...[0, 1, 2, 3, 4, 5].map(i => [T.split + i * .6, 'pop', 1 - i * .08]), [19.2, 'squish', .7], [22.3, 'plop', 1.1], [22.35, 'squish', .8],
  [24.4, 'step', .7], [24.6, 'step', .7], [T.flush, 'flush', 1.2], [T.spew, 'splash', 1.1], [T.spew + .1, 'fart', .9], [T.spew + .3, 'cuica', .7],
  [T.heart, 'sparkle', .7], [T.selfie, 'click', 1], [T.selfie + .02, 'ding', .3],
  [34.85, 'scratch', 1], [T.door, 'crash', 1.3], [T.door + .1, 'thunder', .6], [T.sink + .1, 'apito', .8], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [T.sink + .5 + i * .55, 'tick', .9]),
  [T.silence + .3, 'crickets', .9], [T.throwC, 'whoosh', 1], [T.header, 'boing', 1], [T.hit, 'bigslap', 1.3], [T.hit + .5, 'cuica', .5],
  [54.0, 'rimshot', .7], [T.blue, 'click', 1.4], [57.3, 'power_down', 1], [T.zeroG + .1, 'swoosh_up', 1], [T.zeroG + .4, 'slide_up', .6],
  [65.5, 'boing', .5], [67.0, 'splash', .5], [T.fanHit, 'thud', 1.2], [T.fanHit + .05, 'honk', .8], [T.fanHit + .3, 'slide_down', .5],
  [T.cube, 'rumble', 1], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [75.4 + i * .65 + .5, 'thud', .7]), [T.toast, 'fanfare', 1], [81.3, 'swoosh_up', 1.1],
  [T.space, 'whoosh', .6], [T.cleideClose, 'whoosh', .4], [T.end, 'rimshot', .9],
];
export const MUSIC = [[0, 'lounge', .5], [7.0, 'none'], [15.0, 'chase', .55], [T.dance - .2, 'funk', .9], [34.85, 'none'], [T.sink, 'none'], [T.blue - .4, 'none'], [T.zeroG, 'space', .8], [T.cube, 'epic', .7], [T.space, 'space', .6], [T.cleideClose, 'none']];

// ---------------- local helpers ----------------
const thumb = (g, x, y, s = 1) => {                       // a huge thumb coming in from below for button close-ups
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(g, -120, -40, 240, 900, 110, PAL.skinJ, 10);
  rr(g, -80, -10, 160, 150, 60, '#f6d2bd', 8);
  line(g, [-90, 260, 90, 250], 8, PAL.skinJs); line(g, [-80, 300, 80, 292], 8, PAL.skinJs);
  g.restore();
};
const miniCoco = (g, x, y, s, t, seed, extra = {}) => coco(g, { x, y, s, t, seed, face: seed % 5 === 0 ? 'smug' : 'happy', dance: true, sq: 1 + .08 * Math.sin(t * 9 + seed), ...extra });
const rays = (g, x, y, t, a = 1, col = '255,230,120') => {
  g.save(); g.translate(x, y); g.rotate(t * .4); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { g.rotate(TAU / 14); g.fillStyle = `rgba(${col},${.13 * a})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-70, -1400); g.lineTo(70, -1400); g.closePath(); g.fill(); }
  g.restore();
};
const remoteInHand = (o = {}) => g => controle(g, { s: .34, glow: 0, ...o, y: -40 });

export async function makeShots({ talk }) {
  const shots = [];
  const S = (t0, draw) => shots.push({ t0, draw });

  // ---------- 1. bathroom, the mysterious remote (0 – 5.5) ----------
  const c1 = K({}, { z: [[0, 1.0], [5.5, 1.22, 'sine.inOut']], y: [[0, 1060], [5.5, 1000]] });
  S(0, (g, lt, t) => {
    const c = c1.at(lt);
    g.save(); cam(g, { x: 540, y: c.y, z: c.z });
    bathroom(g, t, { fan: 0 });
    const up = prog(lt, 3.8, 4.4);   // he points the remote at the ceiling fan
    juninho(g, { x: 540, y: 1408, s: 1.15, pose: 'sit', t, face: lt < 2.6 ? 'think' : lt < 4 ? 'happy' : 'smug', talk: talk('juninho', t), look: [up * .3, -1 * up],
      armR: { a: lerp(1.0, 2.7, ease.outBack(up)), b: lerp(1.5, .1, up) }, armL: { a: .3, b: .6 },
      inR: remoteInHand({ t, face: lt > 3.8 ? (lt > 4.6 ? 'evil' : 'neutral') : 'dead', look: [lt > 3.8 ? -1 : 0, 0] }) });
    g.restore();
    // the remote opens its eyes and looks at YOU (nobody notices)
    // ...but WE notice: a comic inset of the remote staring straight at the camera
    if (lt > 3.75 && lt < 5.2) {
      const k = ease.outBack(prog(lt, 3.75, 4.0)) * (1 - ease.inQ(prog(lt, 4.95, 5.2)));
      g.save(); g.translate(800, 560); g.scale(k, k); g.rotate(.06);
      g.beginPath(); g.arc(0, 0, 210, 0, TAU); g.fillStyle = '#140b24'; g.fill(); g.lineWidth = 12; g.strokeStyle = '#fff'; g.stroke(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.clip(); controle(g, { x: 0, y: 190, s: 1.9, t, face: 'evil', glow: 1 }); g.restore();
      g.restore();
      text(g, '?!', 960, 360, { size: 100, color: '#5CF2FF', alpha: k });
    }
    titleCard(g, t, 1, META.title, .15, 3.4);
    whip(g, lt + .2, .5);
  });

  // ---------- 2. extreme close-up: the red button (5.5 – 7.0) ----------
  S(5.5, (g, lt, t) => {
    const k = t - T.press, pressed = k >= 0;
    const z = pressed ? 1 + .06 * Math.exp(-k * 8) : 1 + lt * .04;
    g.fillStyle = '#140b24'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(540, 1000); g.scale(z, z); g.translate(-540, -1000);
    controle(g, { x: 540, y: 1300, s: 4.6, t, face: 'evil', press: pressed ? 'red' : null, glow: pressed ? 1 : .3 });
    // the thumb hesitates (down, up, down) then presses
    const ty = lerp(1820, 1350, ease.io(prog(lt, 0, .45))) + Math.sin(prog(lt, .45, .85) * Math.PI) * -120 + (pressed ? 36 : 0);
    thumb(g, 560, ty, 1.05);
    g.restore();
    if (pressed) { flash(g, k, .25, '#ff2a3a'); comic(g, 'CLIC', 760, 560, k, { size: 120, color: '#fff', burst: '#ff2a3a', d: .6 }); }
    vignette(g, .7);
  });

  // ---------- 3. the toilet awakens; the King rises (7.0 – 12.6) ----------
  const jumpK = K({}, { x: [[0, 540], [.6, 270, 'power1.out']], y: [[0, 1408], [.3, 1150, 'power2.out'], [.6, 1430, 'power2.in']], sq: [[0, 1], [.1, .75], [.3, 1.25], [.58, 1.2], [.66, .7], [.85, 1.05], [1.0, 1]] });
  S(7.0, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[7.0, 14, 1.2], [7.6, 10, 4.5]]);
    const rise = ease.outBack(prog(t, T.rise, T.rise + 1.3), 1.2), glow = prog(t, 7.2, 8.0);
    g.save(); cam(g, { x: 540, y: 1000 - rise * 40, z: 1.05, sx, sy });
    bathroom(g, t, { noToilet: true });
    rays(g, 540, 1250, t, glow * (1 + .2 * Math.sin(t * 6)));
    const shk = Math.sin(t * 70) * 7 * (1 - rise * .6);
    toilet(g, 540 + shk, 1430, 1.05, { glow: glow * .9 });
    // bubbles in the bowl
    for (let i = 0; i < 14; i++) { const k = (t * 1.3 + hash(i, 4)) % 1; ell(g, 540 + (hash(i, 2) - .5) * 220, 1240 - k * 60, 8 + hash(i, 3) * 10, 8 + hash(i, 3) * 10, 'rgba(255,255,255,.7)', 3); }
    // the King, clipped to rise out of the water
    g.save(); g.beginPath(); g.rect(0, 0, W, 1240); g.clip();
    coco(g, { x: 540 + shk, y: 1250 + (1 - rise) * 260, s: 1.25, t, crown: true, crownGlow: true, face: t > 9.3 ? 'happy' : 'smug', talk: talk('coco', t), armL: lerp(.4, 2.7, rise), armR: lerp(.4, 2.7, rise) });
    g.restore();
    const j = jumpK.at(t - T.jump);
    juninho(g, { x: t < T.jump ? 540 : j.x, y: t < T.jump ? 1408 : j.y, s: 1.15, pose: t < T.jump ? 'sit' : 'stand', sq: t < T.jump ? 1 + Math.sin(t * 60) * .02 : j.sq, t, face: t < 9 ? 'shock' : 'panic',
      armL: { a: 2.4, b: .4 }, armR: { a: 2.4, b: .4 }, inR: remoteInHand({ t, face: 'evil' }) });
    g.restore();
    if (t > T.rise + .9) burst(g, t - T.rise - .9, 540, 900, { n: 50, speed: 700, g: 400, life: 2.4, shape: 'star', colors: ['#FFD21F', '#fff6a8', '#ffffff'], size: 16, seed: 3 });
    flash(g, lt, .2);
  });

  // ---------- 4. violent zoom on Juninho's face (12.6 – 15.0) ----------
  S(T.zoomFace, (g, lt, t) => {
    const z = lerp(1.2, 3.1, ease.outC(prog(lt, 0, .25)));
    const [sx, sy] = shake(t, 12.85, 22, 1.6);
    g.save(); radial(g, 540, 700, t, '#ff5c7a', '#ff2a4a'); speedLines(g, 540, 700, t, 50, 300);
    cam(g, { x: 300, y: 860, z, sx, sy });
    juninho(g, { x: 300, y: 1430, s: 1.15, t, face: 'panic', talk: talk('juninho', t), armL: { a: 2.6, b: .2 }, armR: { a: 2.6, b: .2 } });
    g.restore();
    whip(g, lt, .25);
  });

  // ---------- 5. mitosis: the family grows (15.0 – 24.2) ----------
  const N = 96;
  const fam = physics(() => {
    const b = [{ x: 540, y: 1150, vx: -260, vy: -1500, r: 70, bounce: .55 }];
    for (let i = 1; i < N; i++) {
      const gen = Math.floor(Math.log2(i)) + 1, born = T.split - T.out + (gen - 1) * .6 + hash(i, 1) * .12;
      b.push({ x: 0, y: 0, r: 34, bounce: .72, born, parent: Math.floor((i - 1) / 2), kick: [(hash(i, 2) - .5) * 1600, -900 - hash(i, 3) * 900] });
    }
    return b;
  }, { g: 2400, box: [0, 0, W, 1420] });
  const famDraw = (g, t, from = T.out) => {
    const bs = fam(t - from);
    bs.forEach((b, i) => {
      if (b.born !== undefined && t - from < b.born) return;
      const sq = 1 - (b.hit || 0) * .35 + clamp(Math.abs(b.vy) / 4000) * .25;
      if (i === 0) return;
      miniCoco(g, b.x, b.y + b.r, .42, t, i, { sq, face: (b.hit || 0) > .4 ? 'shock' : i % 5 === 0 ? 'smug' : 'happy' });
    });
    return bs;
  };
  const kingK = K({}, { x: [[0, 540], [.7, 380, 'power1.out'], [4.4, 380], [4.9, 600, 'power2.out']], y: [[0, 1240], [.35, 1000, 'power2.out'], [.7, 1420, 'power2.in'], [4.4, 1420], [4.65, 1250, 'power2.out'], [4.9, 1235, 'power2.in']], sq: [[0, 1], [.68, 1.2], [.76, .65], [.95, 1.08], [1.1, 1]] });
  S(15.0, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[T.out + .7, 18, .4]]);
    g.save(); cam(g, { x: 540, y: 980, z: 1.0, sx, sy });
    bathroom(g, t);
    const bs = famDraw(g, t);
    const kk = kingK.at(t - T.out);
    coco(g, { x: kk.x, y: kk.y, s: 1.0, sq: kk.sq, t, crown: true, face: t > 20 ? 'happy' : 'smug', talk: talk('coco', t), armL: t > 20 ? 2.8 : 1.4, armR: t > 20 ? 2.8 : 1.4, dance: t > 21.5 });
    // Juninho: points and yells, then a cocozinho lands on his head
    const onHead = t > 22.3;
    juninho(g, { x: 230, y: 1430, s: 1.05, t, face: onHead ? 'dumb' : t > 17.3 ? 'angry' : 'shock', talk: talk('juninho', t),
      armR: { a: t > 17.3 && t < 19.5 ? 1.7 : .4, b: 0 }, armL: { a: .3, b: .4 }, inL: remoteInHand({ t, face: 'bored' }) });
    const dropK = clamp((t - 21.6) / .7);
    if (t > 21.6) miniCoco(g, 230, lerp(-100, 1430 - 1.05 * 612, ease.inQ(dropK)), .42, t, 3, { sq: onHead ? 1 - .3 * Math.exp(-(t - 22.3) * 9) * Math.cos((t - 22.3) * 30) : 1.15, face: onHead ? 'smug' : 'happy', dance: false });
    g.restore();
    if (t > T.split) for (let i = 0; i < 6; i++) comic(g, 'POP', 200 + hash(i, 9) * 680, 500 + hash(i, 8) * 500, t - T.split - i * .6, { size: 70 + i * 6, color: '#fff', burst: '#9b5cff', d: .5, rot: hash(i, 7) - .5 });
    if (onHead) comic(g, 'PLOFT', 640, 420, t - 22.3, { size: 110, color: '#D9A066', burst: '#7A4A1E' });
    flash(g, lt, .15);
  });

  // ---------- 6. the flush makes it worse (24.2 – 29.0) ----------
  S(24.2, (g, lt, t) => {
    const ks = t - T.spew;
    const [sx, sy] = shakes(t, [[T.spew, 30, .9]]);
    const z = lerp(1.0, 1.25, ease.io(prog(t, 24.2, 25.4))) - (ks > 0 ? .25 * ease.outC(clamp(ks / .5)) : 0);
    g.save(); cam(g, { x: 540, y: 1050, z, sx, sy });
    bathroom(g, t);
    famDraw(g, t);
    // Juninho walks to the toilet and pulls the handle, then the fountain blows him back
    const walk = prog(t, 24.2, 24.9), blow = ks > 0 ? ease.outC(clamp(ks / .6)) : 0;
    const jx = lerp(230, 690, ease.io(walk)) + blow * 260, jy = 1430 - (ks > 0 ? Math.sin(clamp(ks / .8) * Math.PI) * 220 : 0);
    juninho(g, { x: jx, y: jy, s: 1.05, t, rot: blow * .5, face: ks > 0 ? 'x' : t > T.flush ? 'smug' : 'angry', legSwing: walk < 1 ? Math.sin(t * 18) : 0,
      armL: { a: t > T.flush - .2 && ks < 0 ? 2.0 : .4, b: .3 }, armR: { a: ks > 0 ? 2.6 : .3, b: .2 } });
    // the fountain
    if (ks > 0) {
      const wa = clamp(1 - (ks - 2) / 1.5);
      g.save(); g.globalAlpha = wa; const gr = g.createLinearGradient(0, 700, 0, 1250); gr.addColorStop(0, 'rgba(127,214,240,0)'); gr.addColorStop(1, 'rgba(127,214,240,.9)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(470, 1250); g.quadraticCurveTo(540 + Math.sin(t * 20) * 20, 500, 610, 1250); g.fill(); g.restore();
      burst(g, ks, 540, 1220, { n: 40, speed: 1500, g: 2000, life: 2.8, seed: 21, shape: (gg, sz, i) => { gg.globalAlpha = 1; coco(gg, { x: 0, y: 20, s: .3, t, seed: i, face: i % 3 ? 'happy' : 'shock' }); } });
      burst(g, ks, 540, 1220, { n: 50, speed: 900, g: 2000, life: 1.6, seed: 22, colors: ['#9be7ff', '#ffffff'], size: 12 });
    }
    coco(g, { x: 220, y: 1420, s: 1.0, t, crown: true, face: ks > 0 ? 'happy' : 'smug', talk: ks > 0 && ks < 1.4 ? .5 + .5 * Math.sin(ks * 30) : 0, armL: 2.8, armR: 2.8 });
    g.restore();
    if (ks > 0) comic(g, 'FLUSH?!', 700, 480, ks, { size: 120, color: '#9be7ff', burst: '#2f6fdb', d: 1.3 });
  });

  // ---------- 7. the choreography (29.0 – 35.0) ----------
  S(T.dance, (g, lt, t) => {
    const beat = 60 / 130, bt = (t - T.dance) / beat, pulse = Math.exp(-((bt % 1) * 6));
    g.fillStyle = '#1a0b2e'; g.fillRect(0, 0, W, H);
    g.save(); cam(g, { x: 540, y: 960, z: 1 + pulse * .02, r: Math.sin(bt * Math.PI / 2) * .015 });
    // disco wall + floor
    for (let i = 0; i < 6; i++) { const a = Math.sin(t * 1.5 + i) * .5; g.save(); g.translate(540, 0); g.rotate(a); g.globalCompositeOperation = 'lighter'; g.fillStyle = ['rgba(255,60,160,.22)', 'rgba(60,200,255,.22)', 'rgba(255,220,60,.22)'][i % 3]; g.beginPath(); g.moveTo(0, 0); g.lineTo(-160, 2000); g.lineTo(160, 2000); g.closePath(); g.fill(); g.restore(); }
    // disco ball (the ceiling fan got promoted)
    g.save(); g.translate(540, 160); line(g, [0, -200, 0, -60], 10, INK); ell(g, 0, 0, 70, 70, '#cfd6e6', 7);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j + Math.floor(bt)) % 3 === 0) { g.fillStyle = '#fff'; g.fillRect(-50 + i * 18, -50 + j * 18, 12, 12); }
    g.restore();
    for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) { const k = (r + c + Math.floor(bt)) % 4; g.fillStyle = ['#ff3b8a', '#3bd1ff', '#ffd21f', '#8b5cff'][k]; g.globalAlpha = .55 + .45 * pulse * (k === 0); g.beginPath(); const y0 = 1330 + r * 90, xs = 1 + r * .12; g.moveTo(540 + (c * 120 - 540) * xs, y0); g.lineTo(540 + ((c + 1) * 120 - 540) * xs, y0); g.lineTo(540 + ((c + 1) * 120 - 540) * (xs + .12), y0 + 90); g.lineTo(540 + (c * 120 - 540) * (xs + .12), y0 + 90); g.fill(); }
    g.globalAlpha = 1;
    // formation: grid -> heart (morph), everyone on the beat
    const m = ease.ioC(prog(t, T.heart, T.heart + 1.2));
    const list = [];
    for (let i = 0; i < 48; i++) {
      const r = Math.floor(i / 8), c = i % 8;
      const gx = 120 + c * 120 + (r % 2) * 40, gy = 560 + r * 140;
      const a = i / 48 * TAU, hx = 540 + 16 * Math.pow(Math.sin(a), 3) * 24, hy = 760 - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 24;
      list.push({ x: lerp(gx, hx, m), y: lerp(gy, hy, m) + 100, i });
    }
    list.sort((a, b) => a.y - b.y);
    for (const p of list) {
      const hop = Math.abs(Math.sin(bt * Math.PI)) * 30;
      miniCoco(g, p.x, p.y - hop, .38 + p.y / 6000, t, p.i, { sq: 1 + pulse * .25 - .1, shades: p.i % 7 === 0, armL: 2.6 + Math.sin(bt * Math.PI) * .5, armR: 2.6 - Math.sin(bt * Math.PI) * .5 });
    }
    // the selfie
    const sk = t - T.selfie;
    coco(g, { x: 830, y: 1560, s: .7, t, face: 'happy', armR: 3.0, armL: 1.2, dance: false, sq: 1 + pulse * .1 });
    rr(g, 870, 1270, 54, 90, 10, '#222', 5);
    if (sk > 0 && sk < .3) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 - sk / .3; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
    // the King in shades, front and centre, and Juninho... nodding along despite himself
    coco(g, { x: 540, y: 1700, s: 1.05, t, crown: true, shades: true, face: 'smug', armL: 2.6 + Math.sin(bt * Math.PI) * .6, armR: 2.6 - Math.sin(bt * Math.PI) * .6, sq: 1 + pulse * .12 });
    juninho(g, { x: 190, y: 1880, s: 1.0, t, face: 'dumb', rot: Math.sin(bt * Math.PI) * .06, armL: { a: .5 + pulse * .6, b: .9 }, armR: { a: 2.6 + Math.sin(bt * Math.PI) * .3, b: .5 }, sq: 1 - pulse * .04, inL: remoteInHand({ t, face: 'happy' }) });
    g.restore();
    if (sk > 0) comic(g, '#FAMÍLIA', 700, 400, sk - .1, { size: 90, color: '#fff', burst: '#ff3b8a', d: 1.3 });
    whip(g, lt, .3);
  });

  // ---------- 8. the door explodes: Dona Cleide (35.0 – 40.0) ----------
  const cK = K({}, { z: [[0, 1.0], [.6, 1.0], [5, 1.35, 'sine.inOut']], x: [[0, 380], [5, 300]], y: [[0, 1000], [5, 860]] });
  S(T.door, (g, lt, t) => {
    const c = cK.at(lt); const [sx, sy] = shakes(t, [[T.door, 36, .8], [36.0, 10, 1.5], [37.5, 12, 2]]);
    g.save(); cam(g, { x: c.x, y: c.y, z: c.z, sx, sy });
    bathroom(g, t, { door: 1, light: 1 });
    rays(g, 170, 900, t * .5, 1, '255,250,220');
    famDraw(g, t);
    cleide(g, { x: 175, y: 1310, s: 1.15, t, face: 'angry', talk: talk('cleide', t), steam: t > 36.5, armR: { a: 2.7 + Math.sin(t * 8) * .06, b: .3 }, armL: { a: .8, b: 1.4 } });
    g.restore();
    burst(g, lt, 170, 900, { n: 26, speed: 1600, g: 2600, life: 1.6, shape: 'rect', colors: ['#c98a4b', '#b5763a', '#8d5a2b'], size: 34, seed: 31, spin: 2 });
    comic(g, 'KABUM', 640, 520, lt, { size: 150, color: '#FFD21F', burst: '#ff3b5c', d: 1.0 });
    flash(g, lt, .25);
  });

  // ---------- 9. the sink: keepie-uppies with a soap bar (40.0 – 45.0) ----------
  S(T.sink, (g, lt, t) => {
    g.save(); cam(g, { x: 930, y: 900, z: 2.1 + lt * .03 });
    bathroom(g, t, { door: 1 });
    // the crowd on the counter
    for (let i = 0; i < 6; i++) { miniCoco(g, 800 + i * 50 - (i > 2 ? 0 : 0), 1000, .2, t, 40 + i, { armL: 2.8, armR: 2.8 }); line(g, [800 + i * 50 + 16, 960, 800 + i * 50 + 16, 900], 4, INK); g.fillStyle = i % 2 ? '#1fbf4a' : '#ffd21f'; g.fillRect(800 + i * 50 + 16, 900, 26, 18); }
    // keepie-uppies: soap goes up and down on a beat; the striker squashes on every touch
    const per = .55, k = ((lt - .5) / per), ph = k - Math.floor(k), touching = lt > .5 && ph < .12;
    const sy = lt < .5 ? 980 : 980 - Math.sin(ph * Math.PI) * 120;
    coco(g, { x: 930, y: 1005, s: .5, t, sq: touching ? .75 : 1.06, face: 'happy', talk: talk('cocozinho', t), armL: 1.8, armR: 1.8, dance: false, hat: 'scarf' });
    g.save(); g.translate(930 + Math.sin(k * 3) * 6, sy - 116); g.rotate(k * 2.4); rr(g, -22, -12, 44, 24, 8, '#ff9ec7', 4); g.restore();
    // counter
    text(g, String(Math.max(0, Math.floor(k) + 1)).padStart(2, '0'), 1010, 740, { size: 40, color: '#FFD21F', stroke: 7 });
    g.restore();
    flash(g, lt, .15);
  });

  // ---------- 10. awkward silence, close on Cleide (45.0 – 48.0) ----------
  S(T.silence, (g, lt, t) => {
    g.save(); cam(g, { x: 175, y: 820, z: lerp(2.4, 2.9, lt / 3) });
    bathroom(g, t, { door: 1, light: .4 });
    const tw = Math.floor(t * 12) % 3 === 0 ? 1 : 0;   // the eye twitch
    cleide(g, { x: 175, y: 1310, s: 1.15, t, face: 'neutral', blink: tw * .8, red: lt / 3 * .8, armR: { a: 2.7, b: .3 }, armL: { a: .3, b: .2 } });
    g.restore();
    crickets(g, lt - .3, 760, 330);
    letterbox(g, ease.outC(prog(lt, 0, .4)));
  });

  // ---------- 11. throw, header, PLAFT (48.0 – 55.0) ----------
  S(48.0, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[T.hit, 40, .7]]);
    const z = t < T.hit ? 1.0 : t < 53.6 ? lerp(1.0, 1.55, ease.outC(prog(t, T.hit, T.hit + .3))) : 1.55;
    g.save(); cam(g, { x: t < T.hit ? 560 : 520, y: t < T.hit ? 960 : 880, z, sx, sy });
    bathroom(g, t, { door: 1, light: .5 });
    famDraw(g, t);
    cleide(g, { x: 175, y: 1310, s: 1.15, t, face: t < T.hit ? 'angry' : 'shock', noChinelo: t > T.throwC, talk: talk('cleide', t), armR: { a: t < T.throwC ? 2.9 : 1.6, b: t < T.throwC ? .6 : 0 }, armL: { a: .5, b: .3 } });
    coco(g, { x: 930, y: 1005, s: .32, t, sq: Math.abs(t - T.header) < .08 ? .7 : 1, face: 'happy', armL: 2.8, armR: 2.8, hat: 'scarf' });
    // Juninho, with the chinelo print on his face after the hit
    const hitK = t - T.hit;
    juninho(g, { x: 560, y: 1430, s: 1.05, t, face: hitK > 0 && hitK < .6 ? 'x' : hitK > 0 ? 'smug' : 'shock', talk: talk('juninho', t), rot: hitK > 0 ? -.25 * Math.exp(-hitK * 4) * Math.cos(hitK * 18) : 0,
      sq: hitK > 0 ? 1 - .2 * Math.exp(-hitK * 6) : 1, armR: { a: t > 50.5 ? 2.5 : .4, b: .1 }, inR: remoteInHand({ t, face: t > 52 ? 'bored' : 'neutral' }), blush: hitK > 0 ? .9 : 0 });
    if (hitK > 0) { g.save(); g.translate(566, 1430 - 1.05 * 520); g.rotate(-.3); g.globalAlpha = .55; chinelo(g, 0, 70, .9, 0); g.restore(); }
    // the chinelo's flight: Cleide -> sink (header) -> Juninho's face
    let cx = null, cy, cr;
    if (t > T.throwC && t < T.header) { const k = prog(t, T.throwC, T.header); cx = lerp(240, 930, k); cy = lerp(780, 930, k) - Math.sin(k * Math.PI) * 300; cr = k * 14; }
    else if (t >= T.header && t < T.hit) { const k = prog(t, T.header, T.hit); cx = lerp(930, 570, k); cy = lerp(930, 860, k) - Math.sin(k * Math.PI) * 120; cr = 14 + k * 10; }
    if (cx !== null) { chinelo(g, cx, cy + 70, 1, cr); }
    g.restore();
    comic(g, 'PLAFT!', 640, 520, hitK, { size: 170, color: '#FFD21F', burst: '#ff3b5c', d: 1.3 });
    if (t > 53.6) { controle(g, { x: 860, y: 520, s: 1.1, t, face: 'bored', glow: .6, rot: -.1 }); text(g, '...', 860, 300, { size: 90, color: '#5CF2FF' }); }
  });

  // ---------- 12. the blue button (55.0 – 58.5) ----------
  S(55.0, (g, lt, t) => {
    const pressed = t >= T.blue;
    g.fillStyle = '#0c1430'; g.fillRect(0, 0, W, H);
    radial(g, 540, 900, t, '#13235a', '#0c1430', 16);
    const z = pressed ? 1.0 + .08 * Math.exp(-(t - T.blue) * 6) : lerp(.9, 1.0, lt);
    g.save(); g.translate(540, 900); g.scale(z, z); g.translate(-540, -900);
    controle(g, { x: 540, y: 820, s: 3.2, t, face: t > 56.4 ? 'neutral' : 'bored', talk: talk('controle', t), press: pressed ? 'blue' : null, glow: 1 });
    thumb(g, 540, lerp(1900, 1060, ease.io(prog(lt, .3, 1.0))) + (pressed ? 20 : 0), .8);
    g.restore();
    if (t > 57.3) { const k = prog(t, 57.3, 58.4); g.fillStyle = `rgba(92,242,255,${k * .5})`; g.fillRect(0, 0, W, H); }
    flash(g, lt, .2);
  });

  // ---------- 13. zero gravity (58.5 – 75.0) ----------
  const ZG = 16.5;
  const items = physics(() => {
    const r = []; for (let i = 0; i < 36; i++) r.push({ x: 120 + hash(i, 61) * 840, y: 1380 - hash(i, 62) * 60, vx: (hash(i, 63) - .5) * 220, vy: -200 - hash(i, 64) * 500, r: 36, bounce: .9 });
    return r;
  }, { g: t => t < .6 ? -500 : 0, drag: .05, box: [0, 0, W, 1420] });
  S(T.zeroG, (g, lt, t, ctx) => {
    const wob = clamp(lt * 2) * (t < 74 ? 1 : 1 - (t - 74));
    ctx.post.wobble = wob; ctx.post.chroma = .3 * wob;
    const fanA = (t - T.zeroG) * 9 + (t - T.zeroG) * (t - T.zeroG) * .3;
    const [sx, sy] = shakes(t, [[T.fanHit, 30, .6]]);
    g.save(); cam(g, { x: 540, y: 960, z: 1.0, r: Math.sin(t * .4) * .03, sx, sy });
    bathroom(g, t, { door: 1, light: .3, fan: fanA, noToilet: true });
    toilet(g, 540, 1430, 1.05, {});
    // water blobs escaping the toilet
    for (let i = 0; i < 9; i++) { const k = clamp((t - T.zeroG - i * .3) / 8); if (k <= 0) continue; const x = 540 + (hash(i, 71) - .5) * 700 * k, y = 1230 - k * (600 + hash(i, 72) * 500); const r = 20 + hash(i, 73) * 30; g.save(); g.translate(x, y); g.scale(1 + .15 * Math.sin(t * 5 + i), 1 - .15 * Math.sin(t * 5 + i)); ell(g, 0, 0, r, r, 'rgba(127,214,240,.8)', 5); ell(g, -r * .3, -r * .3, r * .25, r * .2, '#fff', 0); g.restore(); }
    // toilet paper unspooling: a long ribbon
    const tpX = 410 + Math.sin(t * .5) * 40, tpY = 1150 - clamp((t - T.zeroG) / 3) * 500;
    g.beginPath(); g.moveTo(410, 1150); for (let i = 0; i < 40; i++) { const k = i / 40; g.lineTo(lerp(410, tpX, k) + Math.sin(k * 8 + t * 2) * 80 * k, lerp(1150, tpY, k)); } g.lineWidth = 40; g.strokeStyle = INK; g.stroke(); g.lineWidth = 30; g.strokeStyle = '#fff'; g.stroke();
    ell(g, tpX, tpY, 38, 32, '#ffffff');
    const bs = items(t - T.zeroG);
    bs.forEach((b, i) => {
      if (i === 0) { g.save(); g.translate(b.x, b.y); g.rotate(t * .8); ell(g, 0, 0, 40, 32, '#FFD21F'); ell(g, 26, -26, 22, 20, '#FFD21F'); g.beginPath(); g.moveTo(44, -28); g.lineTo(64, -22); g.lineTo(44, -16); g.closePath(); g.fillStyle = '#ff8a00'; g.fill(); ell(g, 30, -32, 4, 4, INK, 0); g.restore(); return; }   // rubber duck
      if (i === 1) { g.save(); g.translate(b.x, b.y); g.rotate(t * 1.3); rr(g, -60, -8, 120, 16, 6, '#3bd1ff', 4); rr(g, 40, -14, 30, 28, 6, '#fff', 4); g.restore(); return; }   // toothbrush
      g.save(); g.translate(b.x, b.y); g.rotate(Math.sin(t * .7 + i) * .8 + i);
      miniCoco(g, 0, 40, .36, t, i, { face: i % 4 === 0 ? 'shock' : 'happy', dance: false, armL: 2.4 + Math.sin(t * 3 + i) * .4, armR: 2.4 - Math.sin(t * 3 + i) * .4 });
      g.restore();
    });
    // the King on a toilet-paper magic carpet
    g.save(); g.translate(760 + Math.sin(t * .6) * 80, 640 + Math.cos(t * .5) * 50); g.rotate(Math.sin(t * .8) * .1);
    rr(g, -120, -10, 240, 26, 10, '#ffffff', 6); coco(g, { x: 0, y: -6, s: .65, t, crown: true, shades: true, face: 'smug', armL: 2.9, armR: 1.3 });
    g.restore();
    // Cleide swims after Juninho, holding her dress down with one hand
    const cfx = lerp(220, 430, prog(t, 60, 72)) + Math.sin(t * .8) * 40, cfy = lerp(1300, 900, prog(t, T.zeroG, 63)) + Math.sin(t * 1.1) * 30;
    const stroke = Math.sin(t * 4);
    cleide(g, { x: cfx, y: cfy, s: .95, t, rot: .35 + Math.sin(t * .9) * .1, pose: 'float', face: 'angry', talk: talk('cleide', t), dressUp: .5 + .3 * Math.sin(t * 2),
      armR: { a: 2.6 + stroke * .4, b: .3 }, armL: { a: .2, b: .9 } });
    // Juninho drifts, happy, until the ceiling fan he asked about in the first line gets him
    const hitK = t - T.fanHit, flying = hitK < 0;
    const jx = flying ? lerp(640, 560, prog(t, 64, T.fanHit)) : 560 + hitK * 300, jy = flying ? lerp(1300, 520, ease.io(prog(t, T.zeroG, T.fanHit))) : 520 + hitK * 260;
    juninho(g, { x: jx, y: jy, s: .95, t, rot: flying ? -Math.PI + Math.sin(t * .5) * .3 + prog(t, T.zeroG, 62) * Math.PI : hitK * 6, pose: 'float', face: flying ? (t > 67.6 ? 'happy' : 'shock') : 'x', talk: talk('juninho', t),
      armL: { a: 2.2 + Math.sin(t * 3) * .3, b: .2 }, armR: { a: 2.2 - Math.sin(t * 3) * .3, b: .2 }, hairWind: .5, inR: remoteInHand({ t, face: 'neutral' }) });
    g.restore();
    comic(g, 'TOING!', 760, 300, hitK, { size: 120, color: '#fff', burst: '#8d5a2b', d: 1.2 });
    if (hitK > .2) for (let i = 0; i < 5; i++) { const a = t * 5 + i * TAU / 5; text(g, '★', jx + Math.cos(a) * 90, jy - 540 * .95 + Math.sin(a) * 30 + hitK * 200, { size: 46, color: '#FFD21F', stroke: 6 }); }
    flash(g, lt, .3, '#5CF2FF');
  });

  // ---------- 14. exterior: the house turns into a Rubik's cube (75.0 – 82.0) ----------
  const s3 = new THREE.Scene(); s3.add(sky(4, [.16, .3, .7], [.5, .2, .5]));
  lights(s3, { amb: .8, sun: 2.4 }); const rh = rubikHouse(); rh.scale.setScalar(5); s3.add(rh);
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(12, 6, 6, 9), new THREE.MeshStandardMaterial({ color: 0x5a3b22, flatShading: true })); ground.position.y = -10.5; s3.add(ground);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 12.2, .6, 9), new THREE.MeshStandardMaterial({ color: 0x3fa34d, flatShading: true })); grass.position.y = -7.5; s3.add(grass);
  const cam3 = camera(42);
  const moves = []; const seq = [['y', 1, 1], ['x', -1, -1], ['z', 1, 1], ['y', 0, -2], ['x', 1, 1], ['z', 0, -1], ['y', -1, 1], ['x', 0, 2]];
  seq.forEach(([a, l, q], i) => moves.push([a, l, q, 75.4 + i * .65, .5]));
  const undo = seq.slice().reverse().map(([a, l, q], i) => [a, l, -q, 80.9 + i * .03, .25]);   // it snaps back, all at once
  S(T.cube, (g, lt, t) => {
    const a = .5 + lt * .35, r = 74 - lt * 2.5, lift = clamp((t - 81.2) / .8);
    cam3.position.set(Math.sin(a) * r, 10 + Math.sin(lt * .6) * 4, Math.cos(a) * r); cam3.lookAt(0, -1 + lift * 20, 0);
    rh.userData.set(t, [...moves, ...undo]);
    rh.position.y = lift * lift * 60; ground.position.y = -10.5 + lift * lift * 60; grass.position.y = -7.5 + lift * lift * 60;
    rh.rotation.y = Math.sin(lt * 1.5) * .1;
    draw3d(g, s3, cam3);
    const [sx, sy] = shake(t, 75.0, 0);
    achievement(g, t - T.toast, 'MODO APOCALIPSE', 'Desbloqueado por: Juninho (QI: 3)', { y: 420, d: 3.4 });
    if (t > 81.2) speedLines(g, 540, 960, t, 40, 200);
    flash(g, lt, .3);
  });

  // ---------- 15. space: the house orbits the Earth (82.0 – 87.6) ----------
  const sp = new THREE.Scene(); sp.add(sky(9)); const sun = lights(sp, { amb: .35, sun: 2.6, dir: [6, 3, 5] });
  const E = earth(100); E.position.set(0, -150, -40); sp.add(E);
  const hs = house(); hs.scale.setScalar(.9); sp.add(hs);
  const camS = camera(38);
  S(T.space, (g, lt, t) => {
    E.userData.set(t);
    const pull = ease.ioC(prog(lt, 0, 3.4));
    hs.position.set(Math.sin(t * .2) * 6, 10 + Math.sin(t * .7) * 1.5, 0); hs.rotation.set(Math.sin(t * .5) * .3, t * .4, Math.cos(t * .4) * .25);
    camS.position.set(lerp(10, 40, pull), lerp(18, 60, pull), lerp(30, 260, pull)); camS.lookAt(0, lerp(10, -40, pull), 0);
    draw3d(g, sp, camS);
    // little floating cocozinhos drift around the house (2D, on top)
    for (let i = 0; i < 10; i++) { const a = t * .3 + i * TAU / 10, rr_ = lerp(330, 90, pull); const x = 540 + Math.cos(a) * rr_ * 1.2, y = lerp(900, 640, pull) + Math.sin(a) * rr_ * .5; g.save(); g.translate(x, y); g.rotate(t + i); coco(g, { x: 0, y: 0, s: lerp(.25, .07, pull), t, seed: i, face: 'happy' }); g.restore(); }
    // speech pointer: the voice comes from the house
    if (t > 84.3 && t < 87.4) { const hx = 540 + Math.sin(t * .2) * 10, hy = lerp(900, 640, pull) - 30; g.save(); g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(hx + 20, hy - 30); g.lineTo(hx + 120, hy - 160); g.lineTo(hx + 60, hy - 150); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    flash(g, lt, .3);
  });

  // ---------- 16. close on Cleide inside, Earth in the window (87.6 – 90) ----------
  S(T.cleideClose, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[88.0, 34, 1.2]]);
    g.save(); cam(g, { x: 560, y: 800, z: 1.35 + lt * .05, sx, sy });
    livingRoom(g, t, { window: wg => { wg.fillStyle = '#05030f'; wg.fillRect(500, 260, 520, 520); for (let i = 0; i < 40; i++) { wg.fillStyle = '#fff'; wg.fillRect(540 + hash(i, 1) * 440, 300 + hash(i, 2) * 440, 3, 3); } const gr = wg.createRadialGradient(700, 760, 40, 760, 820, 300); gr.addColorStop(0, '#4fa3ff'); gr.addColorStop(.7, '#1f5fbf'); gr.addColorStop(1, '#0a1f4a'); wg.fillStyle = gr; wg.beginPath(); wg.arc(760, 900, 300, 0, TAU); wg.fill(); } });
    juninho(g, { x: 840, y: 1500 + Math.sin(t * 1.3) * 20, s: .9, t, pose: 'float', rot: .4 + Math.sin(t) * .1, face: 'sad', armL: { a: 2, b: .3 }, armR: { a: .6, b: .3 }, inR: remoteInHand({ t, face: 'happy' }) });
    cleide(g, { x: 400, y: 1480 + Math.sin(t * 1.1) * 20, s: 1.1, t, pose: 'float', rot: -.15, face: t > 88.0 ? 'scream' : 'angry', talk: talk('cleide', t), steam: true, red: .7, armR: { a: 2.6, b: .3 }, armL: { a: 1.2, b: 1.2 } });
    g.restore();
    if (t > T.end) { const k = ease.outBack(prog(t, T.end, T.end + .35)); g.save(); g.translate(540, 700); g.rotate(-.12); g.scale(k, k); text(g, 'CONTINUA...', 0, 0, { size: 150, color: '#FFD21F', stroke: 18 }); g.restore(); }
    irisOut(g, t, 89.55, .4, 400, 900);
    whip(g, lt, .25);
  });

  return shots;
}
