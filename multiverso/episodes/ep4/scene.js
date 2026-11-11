// EP 4 — O IMPÉRIO DA SALSICHA (90 s). All times are absolute episode seconds.
import { W, H, TAU, clamp, prog, lerp, ease, hash, noise, shake, shakes, K, physics } from '../../lib/core.js';
import { juninho, cleide, controle, speedLines, INK, ellipse as ell, rrect as rr, poly as line, PAL } from '../../lib/chars.js';
import { imperador, salsicha, coxinha, pastel, hamburguer, pizza, requeijao, face } from '../../lib/chars2.js';
import { cam, comic, flash, whip, vignette, burst, titleCard, crickets, radial, text, irisOut, letterbox } from '../../lib/fx.js';
import { THREE, draw3d, camera, sky, earth, sausagePlanet, lights } from '../../lib/world3d.js';
import { duskSky, street, HORIZON, GROUND } from './city.js';

export const META = { num: 4, title: 'O IMPÉRIO DA SALSICHA', total: 90 };
const T = {
  planet: 0, emp: 6.0, street: 12.0, silence: 15.6, monocle: 17.7, insult: 19.0, rain: 23.0, march: 28.0, faint: 30.6,
  press: 40.0, btn: 41.4, alive: 45.0, merge: 57.5, cox: 60.0, scared: 65.5, blow: 70.0, boom: 71.3, alarm: 80.0, cubes: 84.0, end: 88.4,
};
export const LINES = [
  { id: 'i1', who: 'imperador', at: 7.0, text: 'VOCÊS HUMILHARAM NOSSA FAMÍLIA!' },
  { id: 'i2', who: 'imperador', at: 9.6, text: 'Tinha trinta mil salsichas naquela nave!' },
  { id: 'j1', who: 'juninho', at: 13.0, text: 'Mas eu nem gosto tanto de cachorro-quente!' },
  { id: 'i3', who: 'imperador', at: 19.2, text: 'CACHORRO-QUENTE?! ISSO É GENOCÍDIO COM PURÊ!' },
  { id: 'i4', who: 'imperador', at: 23.4, text: 'SOLDADOS! GARFOS EM POSIÇÃO!' },
  { id: 'c1', who: 'cleide', at: 33.6, text: 'JUNINHO, FAZ ALGUMA COISA, PELO AMOR DE DEUS!' },
  { id: 'j2', who: 'juninho', at: 36.9, text: 'Deixa comigo, mãe. Eu tenho um plano.' },
  { id: 'c2', who: 'cleide', at: 38.7, text: 'Esse é o problema.' },
  { id: 'r1', who: 'controle', at: 42.0, text: 'Modo comida viva. Boa sorte.' },
  { id: 'j3', who: 'juninho', at: 46.6, text: 'CHAMA OS SALGADOS, POVO!' },
  { id: 'i5', who: 'imperador', at: 53.6, text: 'Recuar? Jamais! Mandem a mostarda!' },
  { id: 'x1', who: 'coxinha', at: 61.4, text: 'NINGUÉM MEXE COM A CULINÁRIA BRASILEIRA!' },
  { id: 'i6', who: 'imperador', at: 66.0, text: 'Uma... coxinha?' },
  { id: 'x2', who: 'coxinha', at: 68.2, text: 'Prova o meu requeijão!' },
  { id: 'c3', who: 'cleide', at: 76.2, text: 'Depois eu quero a receita!' },
  { id: 'r2', who: 'controle', at: 81.0, text: 'Erro crítico. Realidade comprometida.' },
  { id: 'j4', who: 'juninho', at: 85.0, text: 'Desliga e liga de novo?' },
  { id: 'r3', who: 'controle', at: 87.0, text: 'Não.' },
];
export const SFX = [
  [0.2, 'rumble', .9], [0.4, 'swoosh_up', .6], [2.0, 'warp', .9], [4.2, 'choir', .5], [T.emp, 'whoosh', .6], [6.2, 'fanfare', .6],
  [T.street, 'whoosh', .5], [T.silence + .2, 'crickets', .8], [T.monocle, 'pop', 1], [T.monocle + .05, 'ding', .7], [T.monocle + .5, 'tick', .8],
  [T.insult, 'scratch', .7], [T.insult + .05, 'thud', 1], [T.rain, 'alarm', .4], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [T.rain + .8 + i * .55, 'thud', .7]),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => [T.march + i * .5, 'step', .9]), [T.faint, 'slide_down', .6], [T.faint + .7, 'thud', .7],
  [36.6, 'gasp', .4], [39.9, 'rimshot', .6], [T.btn, 'click', 1.4], [T.btn + .1, 'power_up', 1], [43.8, 'magic', .9],
  [T.alive, 'pop', 1], [T.alive + .3, 'pop', .9], [T.alive + .6, 'boing', .8], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [47.5 + i * 1.0, i % 3 ? 'squish' : 'slap', .9]),
  [49.0, 'explosion', .6], [52.0, 'splash', .7], [55.0, 'explosion', .6], [T.merge, 'magic', 1], [T.merge + 1.2, 'power_up', .8], [T.cox, 'thunder', .8], [T.cox + .2, 'choir', .7],
  [T.scared - .2, 'slide_down', .4], [T.blow, 'drumroll', .8], [T.boom, 'explosion', 1.3], [T.boom + .1, 'splash', 1.2], [T.boom + .4, 'cuica', .6], [73.5, 'gol', .6],
  [T.alarm, 'alarm', 1.1], [T.alarm + .2, 'glitch', .9], [82.6, 'glitch', .8], [T.cubes, 'rumble', 1.1], [85.5, 'glitch', .7], [87.6, 'power_down', 1], [T.end, 'crash', 1],
];
export const MUSIC = [[0, 'epic', .6], [T.street, 'tension', .5], [T.silence, 'none'], [T.insult, 'tension', .6], [T.march, 'chase', .6], [T.press, 'none'], [T.alive, 'epic', .8], [T.merge, 'glory', .8], [T.scared, 'none'], [T.boom, 'glory', .7], [T.alarm, 'tension', .7], [87.5, 'none']];

// ---------------- local helpers ----------------
const remoteIn = (o = {}) => g => controle(g, { s: .34, glow: 0, ...o, y: -40 });
const thumb = (g, x, y, s = 1) => { g.save(); g.translate(x, y); g.scale(s, s); rr(g, -120, -40, 240, 900, 110, PAL.skinJ, 10); rr(g, -80, -10, 160, 150, 60, '#f6d2bd', 8); line(g, [-90, 260, 90, 250], 8, PAL.skinJs); g.restore(); };
// a perspective army of sausages marching down the street: back rows are cheap silhouettes, front rows full soldiers
function army(g, t, advance, { rows = 16, front = 1.0, faint = -1 } = {}) {
  const list = [];
  for (let r = 0; r < rows; r++) {
    const z = 1 + (r * .9 + (1 - advance) * 6) / front;           // depth: 1 = closest
    const sc = 1 / z, y = HORIZON + (GROUND + 380 - HORIZON) * sc, width = 1500 * sc, n = Math.max(5, Math.round(16 * sc + 4));
    for (let i = 0; i < n; i++) list.push({ x: 540 - width / 2 + (i + .5) * width / n + (hash(r, i) - .5) * 30 * sc, y, sc, r, i });
  }
  list.sort((a, b) => a.y - b.y);
  for (const p of list) {
    const bob = Math.abs(Math.sin(t * 8 + p.i + p.r)) * 14 * p.sc;
    if (p.sc < .28) { rr(g, p.x - 40 * p.sc, p.y - 220 * p.sc - bob, 80 * p.sc, 200 * p.sc, 40 * p.sc, '#c4553a', Math.max(1, 6 * p.sc)); line(g, [p.x + 50 * p.sc, p.y - 130 * p.sc - bob, p.x + 50 * p.sc, p.y - 300 * p.sc - bob], Math.max(1, 6 * p.sc), '#b8bcc8'); continue; }
    if (faint >= 0 && p.r === 2 && p.i === 3) continue;
    salsicha(g, { x: p.x, y: p.y - bob, s: p.sc * .9, t, seed: p.i * 3 + p.r, forkA: -.2 + Math.sin(t * 8 + p.i) * .1 });
  }
}
// food type drawers (alive)
const FOOD = [
  (g, x, y, s, o) => coxinha(g, { x, y, s: s * .55, ...o, emblem: false }),
  (g, x, y, s, o) => pastel(g, { x, y, s: s * .7, alive: true, ...o }),
  (g, x, y, s, o) => hamburguer(g, { x, y, s: s * .7, alive: true, ...o }),
  (g, x, y, s, o) => pizza(g, { x, y, s: s * .7, alive: true, ...o }),
];

export async function makeShots({ talk }) {
  const shots = []; const S = (t0, draw) => shots.push({ t0, draw });

  // 3D: space view — the sausage planet warps in beside the Earth
  const s1 = new THREE.Scene(); s1.add(sky(14, [.5, .1, .2], [.3, .1, .3])); lights(s1, { amb: .5, sun: 2.6, dir: [4, 5, 6] });
  const E = earth(100); E.position.set(-60, -170, -60); s1.add(E);
  const SP = sausagePlanet(60, 900); s1.add(SP);
  const c1 = camera(40);
  // 3D: the planet in the city sky (transparent background, drawn over a 2D dusk)
  const s2 = new THREE.Scene(); lights(s2, { amb: .7, sun: 2.4, dir: [-3, 4, 6] }); const SP2 = sausagePlanet(60, 900); s2.add(SP2);
  const c2 = camera(40); c2.position.set(0, 0, 0); c2.lookAt(0, 0, -1);
  const planetSky = (g, t, x = 120, y = 160, z = -520, red = 0) => { duskSky(g, t, red); SP2.position.set(x, y, z); SP2.rotation.set(.3, t * .15, .1); draw3d(g, s2, c2); };

  // ---------- 1. space: a planet of sausages appears (0 – 6) ----------
  S(0, (g, lt, t) => {
    E.userData.set(t);
    const k = ease.outBack(prog(t, 1.6, 3.6), 1.4);
    SP.scale.setScalar(Math.max(.001, k)); SP.position.set(70, 40 + (1 - k) * 30, -20); SP.rotation.set(.4, t * .3, .2);
    c1.position.set(lerp(-40, 20, prog(t, 0, 6)), 10, lerp(330, 260, ease.io(prog(t, 0, 6)))); c1.lookAt(30, 0, -20);
    draw3d(g, s1, c1);
    if (t > 1.6 && t < 3.0) { const a = 1 - prog(t, 1.6, 3.0); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(700, 760, 10, 700, 760, 600 * (1 - a) + 50); gr.addColorStop(0, `rgba(255,140,90,${a})`); gr.addColorStop(1, 'rgba(255,140,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
    titleCard(g, t, 4, META.title, .2, 3.6);
    if (t > 4.2) text(g, 'PLANETA SALSICHÔNIA', 540, 1200, { size: 70, color: '#FFC83A', alpha: clamp((t - 4.2) * 3), stroke: 10 });
    flash(g, t - 1.6, .3, '#ffb070');
  });

  // ---------- 2. the Emperor on his balcony, planet behind (6 – 12) ----------
  const eK = K({}, { z: [[0, 1.4], [1, 1.0, 'power3.out'], [6, 1.08]], y: [[0, 760], [1, 900, 'power3.out'], [6, 880]] });
  S(T.emp, (g, lt, t) => {
    const c = eK.at(lt); const [sx, sy] = shakes(t, [[7.0, 18, 1.0], [9.6, 8, 2]]);
    g.fillStyle = '#1a0612'; g.fillRect(0, 0, W, H);
    radial(g, 540, 700, t, '#7a0e2a', '#4a0618', 20);
    g.save(); cam(g, { x: 540, y: c.y, z: c.z, sx, sy });
    // banner with a sausage crest
    for (const bx of [140, 940]) { rr(g, bx - 90, 120, 180, 640, 10, '#7a0e2a'); ell(g, bx, 380, 60, 60, '#FFC83A'); rr(g, bx - 18, 330, 36, 100, 18, '#c4553a', 5); }
    imperador(g, { x: 540, y: 1330, s: 1.2, t, face: 'angry', talk: talk('imperador', t), armR: t > 9.5 ? 2.6 : .6 + Math.sin(t * 3) * .1, armL: t < 9.5 ? 2.5 : .5 });
    // balcony rail
    rr(g, -60, 1200, 1200, 70, 10, '#FFC83A'); for (let i = 0; i < 12; i++) rr(g, i * 100, 1270, 40, 180, 8, '#C88A10', 6);
    g.restore();
    if (t > 9.6) text(g, '30.000', 540 + Math.sin(t * 30) * 4, 300, { size: 140, color: '#ff5c5c', alpha: clamp((t - 9.6) * 4) * (1 - prog(t, 11.6, 12)) });
    flash(g, lt, .25, '#ff5c5c');
  });

  // ---------- 3. the street: Juninho's defence (12 – 15.6) ----------
  S(T.street, (g, lt, t) => {
    g.save(); cam(g, { x: 540, y: 1000, z: lerp(1.0, 1.12, prog(lt, 0, 3.6)) });
    planetSky(g, t);
    street(g, t, { signFaint: true });
    cleide(g, { x: 330, y: GROUND, s: 1.0, t, face: t > 14.2 ? 'shock' : 'angry', armR: { a: 2.6, b: .3 } });
    juninho(g, { x: 700, y: GROUND, s: 1.05, t, face: 'happy', talk: talk('juninho', t), armL: { a: 1.5 + Math.sin(t * 5) * .2, b: .4 }, armR: { a: 1.4, b: .5 }, inR: remoteIn({ t, face: 'bored' }) });
    // facepalm at the end of the line
    if (t > 14.6) { g.save(); g.translate(330, GROUND - 470); ell(g, 0, 0, 40, 30, PAL.skinC); g.restore(); }
    g.restore();
    whip(g, lt, .3);
  });

  // ---------- 4. silence: the Emperor's monocle pops (15.6 – 19.0) ----------
  S(T.silence, (g, lt, t) => {
    g.fillStyle = '#1a0612'; g.fillRect(0, 0, W, H); radial(g, 540, 800, t * .2, '#5a0a20', '#3a0614', 20);
    g.save(); cam(g, { x: 584, y: 720, z: lerp(2.3, 2.9, lt / 3.4) });
    const pop = t - T.monocle;
    imperador(g, { x: 540, y: 1330, s: 1.2, t, face: pop > 0 ? 'shock' : 'angry', look: [Math.floor(t * 10) % 2 ? .2 : 0, 0] });
    if (pop > 0) { const px = 593 + pop * 160, py = 730 - 1.2 * 0 + (pop * pop * 900 - pop * 300); g.save(); g.translate(px, py - 0); g.rotate(pop * 9); g.beginPath(); g.arc(0, 0, 41, 0, TAU); g.lineWidth = 7; g.strokeStyle = '#FFC83A'; g.stroke(); g.restore(); }
    g.restore();
    crickets(g, lt - .3, 790, 330);
    letterbox(g, ease.outC(prog(lt, 0, .4)));
  });

  // ---------- 5. the insult + sausage drop-pods rain from the sky (19.0 – 28.0) ----------
  S(T.insult, (g, lt, t) => {
    const [sx, sy] = shakes(t, [[T.insult, 30, .7], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [T.rain + .8 + i * .55, 10, .3])]);
    if (t < T.rain - .3) {
      g.fillStyle = '#2a0610'; g.fillRect(0, 0, W, H); radial(g, 540, 760, t, '#ff3b3b', '#b0102a', 22); speedLines(g, 540, 760, t, 46, 360);
      g.save(); cam(g, { x: 540, y: 900, z: 1.25, sx, sy });
      imperador(g, { x: 540, y: 1360, s: 1.15, t, face: 'angry', talk: talk('imperador', t), armL: 2.7, armR: 2.7, sq: 1 + Math.sin(t * 20) * .02 });
      g.restore();
      comic(g, 'PURÊ?!', 820, 380, t - 21.0, { size: 110, color: '#FFD21F', burst: '#7a0e2a', d: 1.4 });
      flash(g, lt, .25, '#ff2a3a');
      return;
    }
    const lk = t - (T.rain - .3);
    g.save(); cam(g, { x: 540, y: 960, z: 1.0, sx, sy });
    planetSky(g, t, 120, 160 - lk * 6, -520, 1);
    // drop pods: sausages falling with flame trails, landing in the street
    for (let i = 0; i < 26; i++) {
      const t0 = .3 + i * .18, k = (lk - t0) / .7; if (k < 0) continue;
      const x = 80 + hash(i, 41) * 920, landY = HORIZON + 80 + hash(i, 42) * 300, s = .35 + (landY - HORIZON) / 900;
      if (k < 1) { const y = lerp(-200, landY, k * k); g.save(); g.globalAlpha = .8; g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(x - 20 * s, y - 230 * s); g.lineTo(x + 20 * s, y - 230 * s); g.lineTo(x, y - 600 * s); g.closePath(); g.fill(); g.restore(); salsicha(g, { x, y, s, t, seed: i, face: 'shock' }); }
    }
    street(g, t, { signFaint: true, lights: .6 });
    for (let i = 0; i < 26; i++) { const t0 = .3 + i * .18, k = (lk - t0) / .7; if (k < 1) continue; const x = 80 + hash(i, 41) * 920, landY = HORIZON + 80 + hash(i, 42) * 300, s = .35 + (landY - HORIZON) / 900; salsicha(g, { x, y: landY, s, t, seed: i, sq: 1 - .3 * Math.exp(-(k - 1) * 8) }); burst(g, (k - 1) * .7, x, landY, { n: 12, speed: 300, g: 600, life: .6, colors: ['#9a8f86', '#fff'], size: 8, seed: i }); }
    // the Emperor's hologram in the sky gives the order
    g.save(); g.globalAlpha = .55 + .1 * Math.sin(t * 20); imperador(g, { x: 830, y: 760, s: .55, t, face: 'angry', talk: talk('imperador', t), armR: 2.8 }); g.restore();
    g.restore();
    flash(g, lk, .2);
  });

  // ---------- 6. the march (28.0 – 40.0) ----------
  S(T.march, (g, lt, t) => {
    const adv = prog(t, T.march, 40), [sx, sy] = shake(t, Math.floor(t * 2) / 2, 4, .3);
    const z = t < 33.4 ? lerp(1.0, 1.1, prog(t, T.march, 33.4)) : 1.15;
    g.save(); cam(g, { x: t < 33.4 ? 600 : 520, y: t < 33.4 ? 1060 : 1000, z, sx, sy });
    planetSky(g, t, 120, 130, -520, 1);
    street(g, t, { signFaint: true });
    // the faint gag: a soldier reads the chalkboard and passes out (others cover each other's eyes)
    const fk = t - T.faint;
    army(g, t, adv * .55, { rows: 14 });
    {
      const x = 870, y = GROUND + 40, fall = clamp((fk - .5) / .5);
      salsicha(g, { x, y, s: .9, t, face: fk > 0 ? 'shock' : 'angry', rot: ease.outBounce(fall) * 1.45, forkA: -.2 });
      if (fk > 0 && fk < 2.4) text(g, '!!!', x, y - 300, { size: 70, color: '#ff5c5c' });
    }
    if (t > 33.4) {
      cleide(g, { x: 260, y: GROUND + 80, s: 1.05, t, face: 'scream', talk: talk('cleide', t), armR: { a: 2.7, b: .3 }, armL: { a: 2.2, b: .6 } });
      juninho(g, { x: 560, y: GROUND + 80, s: 1.05, t, face: t > 38.6 ? 'dumb' : 'smug', talk: talk('juninho', t), armR: { a: t > 36.8 ? 1.9 : .5, b: .3 }, armL: { a: .3, b: .5 }, inR: remoteIn({ t, face: t > 38.6 ? 'bored' : 'neutral' }) });
    }
    g.restore();
    if (fk > .9) comic(g, 'DESMAIOU', 760, 420, fk - .9, { size: 90, color: '#fff', burst: '#c4553a', d: 1.4 });
    if (t > 33.4) whip(g, t - 33.4, .25);
    whip(g, lt, .3);
  });

  // ---------- 7. the yellow button (40.0 – 45.0) ----------
  S(T.press, (g, lt, t) => {
    const pressed = t >= T.btn;
    g.fillStyle = '#1e1200'; g.fillRect(0, 0, W, H);
    radial(g, 540, 820, t, pressed ? '#ffd21f' : '#3a2a00', pressed ? '#ffb000' : '#1e1200', 18);
    const z = pressed ? 1 + .08 * Math.exp(-(t - T.btn) * 6) : lerp(.92, 1, lt / 1.4);
    g.save(); g.translate(540, 820); g.scale(z, z); g.translate(-540, -820);
    controle(g, { x: 540, y: 760, s: 3.1, t, face: t > 42 ? 'evil' : 'neutral', talk: talk('controle', t), press: pressed ? 'yellow' : null, glow: 1, look: [1, 0] });
    thumb(g, 640, lerp(1950, 1060, ease.io(prog(lt, .2, 1.3))) + (pressed ? 20 : 0), .7);
    g.restore();
    if (pressed) comic(g, 'CLIC', 300, 420, t - T.btn, { size: 110, color: '#fff', burst: '#ffb000', d: .6 });
    // the magic wave rolls out
    if (t > 43.8) { const k = prog(t, 43.8, 45); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,220,90,${1 - k})`; g.lineWidth = 80; g.beginPath(); g.arc(540, 760, k * 1500, 0, TAU); g.stroke(); g.restore(); }
    flash(g, lt, .2);
  });

  // ---------- 8. the food comes alive and fights (45.0 – 57.5) ----------
  const NF = 16, NS = 20;
  const war = physics(() => {
    const b = [];
    for (let i = 0; i < NF; i++) b.push({ x: 0, y: 0, r: 56, bounce: .6, born: .2 + i * .22, parent: undefined, kick: [500 + hash(i, 81) * 700, -1200 - hash(i, 82) * 600], kind: i % 4, side: 0 });
    for (let i = 0; i < NS; i++) b.push({ x: 600 + hash(i, 83) * 440, y: 1300, vx: 0, vy: 0, r: 50, bounce: .5, kind: 9, side: 1 });
    b.forEach((o, i) => { if (o.side === 0) { o.x = 160 + (i % 3) * 30; o.y = 1150; } });
    return b;
  }, {
    g: 2600, box: [-60, 300, W + 60, GROUND + 20], collide: true,
    force: (b, t, dt) => { if (b.side === 0 && b.y > GROUND - 80 && Math.abs(b.vy) < 300) { b.vx += 2400 * dt; if (hash(Math.floor(t * 2), b.r * 7 + b.x | 0) > .96) b.vy = -1300; } if (b.side === 1 && b.y > GROUND - 80) b.vx -= 900 * dt; },
  });
  const pops = [[48.2, 520, 1150, ['#e8203a', '#ffd21f', '#5fbf3a']], [49.0, 760, 1100, ['#c4553a', '#ffb347', '#fff']], [50.6, 400, 1200, ['#F2B54A', '#fff3c0']], [52.0, 650, 1050, ['#FFD45A', '#d8303a']], [53.0, 880, 1180, ['#ffd21f', '#c4553a']], [55.0, 560, 1120, ['#e8203a', '#fff', '#c4553a']], [56.2, 300, 1150, ['#5fbf3a', '#ffd21f']]];
  S(T.alive, (g, lt, t, ctx) => {
    const bs = war(t - T.alive);
    const camX = 540 + Math.sin(lt * .7) * 120, camZ = 1.05 + .1 * Math.sin(lt * .5);
    const [sx, sy] = shakes(t, pops.map(p => [p[0], 18, .4]));
    g.save(); cam(g, { x: camX, y: 1020, z: camZ, r: Math.sin(lt * .6) * .02, sx, sy });
    planetSky(g, t, 120, 130, -520, 1);
    street(g, t, {});
    army(g, t, .55 - prog(t, T.alive, 57.5) * .35, { rows: 10 });   // the back of the army hesitates
    // the padaria door bursts: food pours out
    for (const b of bs) {
      if (b.born !== undefined && t - T.alive < b.born) continue;
      const sq = 1 - (b.hit || 0) * .3;
      if (b.side === 1) salsicha(g, { x: b.x, y: b.y + b.r, s: .85, t, sq, seed: b.x | 0, face: (b.hit || 0) > .3 ? 'x' : 'angry', rot: clamp(b.vx / 3000, -.6, .6) });
      else { g.save(); g.translate(b.x, b.y + b.r); g.rotate(clamp(b.vx / 4000, -.5, .5)); FOOD[b.kind](g, 0, 0, 1, { t, face: b.kind === 0 ? 'hero' : 'angry', sq, armL: 2.6, armR: 2.6 + Math.sin(t * 9) * .4 }); g.restore(); }
    }
    // Juninho, cheering from the boteco table; one pastel morphs into a pizza mid-jump (cartoon morph)
    juninho(g, { x: 900, y: GROUND - 10, s: .78, t, face: 'happy', talk: talk('juninho', t), armL: { a: 2.7, b: .2 }, armR: { a: 2.7 - Math.sin(t * 9) * .3, b: .2 }, inR: remoteIn({ t, face: 'happy' }) });
    const mk = prog(t, 51.0, 52.2);
    if (t > 50.6 && t < 53.4) { const y = 760 - Math.sin(prog(t, 50.6, 53.4) * Math.PI) * 300, x = lerp(250, 760, prog(t, 50.6, 53.4)); g.save(); g.translate(x, y); g.scale(1 + Math.sin(mk * Math.PI) * .5, 1 - Math.sin(mk * Math.PI) * .3); if (mk < .5) pastel(g, { s: .9, alive: true, face: 'shock' }); else pizza(g, { s: .9, alive: true, face: 'happy' }); g.restore(); }
    // ingredient explosions
    for (const [pt, px, py, col] of pops) burst(g, t - pt, px, py, { n: 46, speed: 1000, g: 1800, life: 1.4, colors: col, size: 16, seed: pt * 10 | 0, shape: 'rect', spin: 3 });
    g.restore();
    for (const [pt, px, py] of pops) comic(g, ['SPLAT', 'CRUNCH', 'BLOFT', 'NHAC'][(pt * 10 | 0) % 4], px, py - 600, t - pt, { size: 90, color: '#fff', burst: '#ff7a1a', d: .6 });
    if (t > 53.4 && t < 57.3) { g.save(); g.globalAlpha = .6; imperador(g, { x: 830, y: 760, s: .5, t, face: 'angry', talk: talk('imperador', t), armR: 2.8 }); g.restore(); }
    flash(g, lt, .3, '#ffd21f');
  });

  // ---------- 9. morph: the coxinhas merge into the giant Coxinha (57.5 – 65.5) ----------
  S(T.merge, (g, lt, t) => {
    const m = ease.ioC(prog(t, T.merge, T.merge + 1.6)), grow = ease.outBack(prog(t, T.merge + 1.4, T.cox + .6), 1.3);
    const [sx, sy] = shakes(t, [[T.cox, 40, 1.2], [61.4, 12, 3]]);
    g.save(); cam(g, { x: 540, y: lerp(1050, 820, grow), z: lerp(1.1, .95, grow), sx, sy });
    planetSky(g, t, 120, 130, -520, 1);
    street(g, t, { lights: 1 });
    army(g, t, .35, { rows: 10 });
    if (grow < .2) for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + lt * 3, r = 420 * (1 - m), x = 540 + Math.cos(a) * r, y = 1200 + Math.sin(a) * r * .4 - m * 100;
      coxinha(g, { x, y, s: .5 * (1 - m * .5), t, face: 'hero', emblem: false, armL: 2.8, armR: 2.8 });
    }
    if (grow > 0) {
      // the giant: towering over the street, in front of the planet
      coxinha(g, { x: 540, y: GROUND + 40, s: lerp(.4, 2.6, grow), t, face: 'hero', talk: talk('coxinha', t), armL: t > 61.4 ? 2.9 : .4, armR: t > 61.4 ? 2.9 : 1.4 });
      if (t > T.cox) for (let i = 0; i < 8; i++) { const a = t * 2 + i * TAU / 8; ell(g, 540 + Math.cos(a) * 420, 560 + Math.sin(a) * 120, 10, 10, '#fff6a8', 0); }
    }
    g.restore();
    if (t > T.merge + 1.4 && t < T.cox + .2) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,200,90,${.6 * (1 - prog(t, T.merge + 1.4, T.cox + .2))})`; g.fillRect(0, 0, W, H); g.restore(); }
    comic(g, 'COXINHA SUPREMA', 540, 300, t - (T.cox + .3), { size: 110, color: '#FFD21F', burst: '#2f6fdb', d: 1.6, rot: -.06 });
    flash(g, lt, .25, '#ffd21f');
  });

  // ---------- 10. the Emperor, tiny and scared (65.5 – 68.0); the requeijão (68.0 – 71.3) ----------
  S(T.scared, (g, lt, t) => {
    if (t < 68.0) {
      g.save(); cam(g, { x: 540, y: 820, z: 1.6 });
      planetSky(g, t, 120, 130, -520, 1);
      // the Emperor looking UP; the coxinha's shadow falls over him
      imperador(g, { x: 540, y: 1300, s: .9, t, face: 'shock', talk: talk('imperador', t), look: [0, -1], armL: .2, armR: .2, sq: 1 - Math.sin(t * 40) * .01 });
      g.restore();
      g.save(); g.fillStyle = 'rgba(20,0,10,.45)'; g.beginPath(); g.moveTo(-100, 0); g.lineTo(1180, 0); g.lineTo(1180, lerp(0, 1200, prog(t, T.scared, 67))); g.quadraticCurveTo(540, lerp(0, 1500, prog(t, T.scared, 67)), -100, lerp(0, 1200, prog(t, T.scared, 67))); g.fill(); g.restore();
      text(g, 'glup', 760, 600, { size: 70, color: '#fff', alpha: clamp((t - 66.8) * 4) });
      return;
    }
    const open = ease.outBack(prog(t, 68.8, 69.6));
    g.save(); cam(g, { x: 540, y: 860, z: lerp(1.3, 1.6, prog(t, 68, 71.3)) });
    radial(g, 540, 760, t, '#ffd21f', '#ff9a1a', 24);
    coxinha(g, { x: 540, y: 1700, s: 2.3, t, face: 'hero', talk: talk('coxinha', t), armL: .5, armR: 2.2 });
    // the cup of requeijão, lid flying off, glowing
    g.save(); g.translate(760, 1090); g.rotate(-.2); g.shadowColor = '#fff'; g.shadowBlur = 60 * open; requeijao(g, { s: 1.4 }); g.shadowBlur = 0; g.restore();
    if (open > 0) { g.save(); g.translate(760 + open * 200, 900 - open * 300); g.rotate(open * 4); rr(g, -110, -20, 220, 40, 14, '#2f6fdb'); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(740, 860, 10, 740, 860, 500 * open); gr.addColorStop(0, 'rgba(255,255,240,.9)'); gr.addColorStop(1, 'rgba(255,255,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
    g.restore();
    whip(g, t - 68.0, .25);
  });

  // ---------- 11. the explosive requeijão blow (71.3 – 80.0) ----------
  const fly = physics(() => { const b = []; for (let i = 0; i < 70; i++) b.push({ x: 100 + hash(i, 91) * 880, y: 1200 + hash(i, 92) * 150, vx: (hash(i, 93) - .3) * 1800, vy: -2600 - hash(i, 94) * 1800, r: 30, bounce: .4 }); return b; }, { g: 1800, box: [-2000, -4000, W + 2000, GROUND + 30] });
  S(T.boom, (g, lt, t, ctx) => {
    const [sx, sy] = shakes(t, [[T.boom, 60, 1.5]]);
    ctx.post.chroma = Math.max(0, 1 - lt * 1.5);
    const wave = ease.outC(prog(t, T.boom, T.boom + 1.4));
    g.save(); cam(g, { x: 540, y: 980, z: lerp(.9, 1.0, prog(lt, 0, 6)), sx, sy });
    planetSky(g, t, 120, 130, -520, 1);
    street(g, t, {});
    // flying sausages, spinning, some with tiny parachutes later
    const bs = fly(lt);
    bs.forEach((b, i) => { g.save(); g.translate(b.x, b.y); g.rotate(lt * (4 + hash(i, 95) * 8) * (i % 2 ? 1 : -1)); salsicha(g, { x: 0, y: 100, s: .55, t, seed: i, face: 'x', forkA: lt * 5 }); g.restore();
      if (lt > 3 && i % 6 === 0 && b.y < 900) { g.save(); g.translate(b.x, b.y - 120); g.beginPath(); g.arc(0, 0, 70, Math.PI, 0); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); g.restore(); } });
    // a creamy shockwave coats the street
    g.save(); g.globalAlpha = .9; g.fillStyle = '#fffdf0'; g.beginPath(); g.moveTo(-200, GROUND + 400);
    for (let i = 0; i <= 24; i++) { const x = -200 + i * 62; g.lineTo(x, GROUND + 400 - wave * (260 + Math.sin(i * 1.7 + t * 3) * 50)); } g.lineTo(W + 300, GROUND + 400); g.closePath(); g.fill(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.restore();
    // the heroine poses; Cleide and Juninho, covered in requeijão
    coxinha(g, { x: 260, y: GROUND + 30, s: 1.25, t, face: 'happy', armL: 2.9, armR: .6 });
    cleide(g, { x: 640, y: GROUND + 20, s: .85, t, face: t > 76 ? 'happy' : 'shock', talk: talk('cleide', t), armR: { a: 2.6, b: .3 }, armL: { a: 1.2, b: 1 } });
    juninho(g, { x: 880, y: GROUND + 20, s: .85, t, face: 'dumb', armL: { a: .3, b: .3 }, armR: { a: .3, b: .3 }, inR: remoteIn({ t, face: 'neutral' }) });
    for (const [x, s] of [[640, .85], [880, .85]]) { g.save(); g.fillStyle = '#fffdf0'; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.ellipse(x, GROUND + 20 - 580 * s, 70, 30, 0, 0, TAU); g.fill(); g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x - 40 + k * 40, GROUND + 20 - 560 * s + ((t * 30 + k * 20) % 60), 9, 14, 0, 0, TAU); g.fill(); g.stroke(); } g.restore(); }
    g.restore();
    flash(g, lt, .5, '#fffdf0');
    comic(g, 'SPLOFT!!', 540, 360, lt - .1, { size: 180, color: '#fffdf0', burst: '#2f6fdb', d: 1.8 });
    if (lt > 2.2 && lt < 5) text(g, 'PLACAR: SALGADOS 7 × 1 SALSICHAS', 540, 300, { size: 52, color: '#FFD21F', alpha: clamp((lt - 2.2) * 3) * (1 - prog(lt, 4.6, 5)), stroke: 9 });
  });

  // ---------- 12. critical error: reality cracks into cubes (80.0 – 90.0) ----------
  S(T.alarm, (g, lt, t, ctx) => {
    const bad = prog(t, T.alarm, 89.5);
    ctx.post.glitch = .15 + bad * .6 + (Math.floor(t * 3) % 4 === 0 ? .3 : 0); ctx.post.cubes = prog(t, T.cubes, 89.5) * 1.6; ctx.post.chroma = .4 + bad;
    const [sx, sy] = shakes(t, [[T.alarm, 20, 1], [T.cubes, 30, 3], [T.end, 50, 1.6]]);
    const close = t < 84.6 || (t > 86.9 && t < 88.0);
    g.save();
    if (close) {
      g.fillStyle = Math.floor(t * 6) % 2 ? '#3a0410' : '#160409'; g.fillRect(0, 0, W, H);
      radial(g, 540, 800, t * 3, '#ff2a4a', '#5a0010', 16);
      cam(g, { x: 540, y: 820, z: t > 86.9 ? 1.25 : 1, sx, sy });
      controle(g, { x: 540, y: 820, s: 2.8, t, face: t > 86.9 ? 'bored' : 'alarm', talk: talk('controle', t), glow: 1 });
      g.restore();
      text(g, '⚠ ERRO 404: REALIDADE NÃO ENCONTRADA', 540, 260, { size: 44, color: '#ff5c5c', font: 'Nunito', weight: 900, stroke: 8, alpha: Math.floor(t * 4) % 2 ? 1 : .4 });
      return;
    }
    cam(g, { x: 540, y: 960, z: 1.0 + bad * .1, r: Math.sin(t * 2) * .03 * bad, sx, sy });
    planetSky(g, t, 120 + Math.sin(t * 9) * 10, 130, -520, 1);
    // the sky shatters into falling cubes
    for (let i = 0; i < 60; i++) { const k = prog(t, 84.2 + hash(i, 71) * 3, 87 + hash(i, 72) * 3); if (k <= 0) continue; const x = hash(i, 73) * W, y0 = hash(i, 74) * 900, s = 50 + hash(i, 75) * 90; g.save(); g.translate(x, y0 + k * k * 1400); g.rotate(k * 4 * (hash(i, 76) - .5)); g.fillStyle = '#05030f'; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = '#5CF2FF'; g.lineWidth = 4; g.strokeRect(-s / 2, -s / 2, s, s); g.restore(); }
    street(g, t, { lights: Math.floor(t * 7) % 3 ? 1 : .1 });
    juninho(g, { x: 560, y: GROUND + 20, s: 1.0, t, face: t > 87 ? 'shock' : 'think', talk: talk('juninho', t), armR: { a: 1.6, b: 1.2 }, armL: { a: .3, b: .4 }, inR: remoteIn({ t, face: 'alarm' }) });
    cleide(g, { x: 250, y: GROUND + 20, s: .95, t, face: 'shock', armR: { a: 2.6, b: .3 } });
    g.restore();
    if (t > T.end) { const k = ease.outBack(prog(t, T.end, T.end + .35)); g.save(); g.translate(540, 700); g.rotate(-.1); g.scale(k, k); text(g, 'CONTINUA...', 0, 0, { size: 150, color: '#5CF2FF', stroke: 18 }); g.restore(); }
    irisOut(g, t, 89.5, .45, 560, 900);
    whip(g, lt, .2);
  });

  return shots;
}
