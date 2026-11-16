/** Cometa Prata — baixo, longo e aerodinâmico: aletas, cauda de cometa e propulsor central luminoso. */
import { Model, cyl, sphere, torus, tube, mix, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, fender, latheZ, numberPlate, pedals, plateXZ,
  profileX, quads, rod, shell, steeringColumn, topStripe, tubShell, type P2,
} from './common';

const SILVER = '#c9d1e6', SILVER_D = '#8f99b3', WHITE = '#eef2fb', VIOLET = '#6c5ce7', VIOLET_D = '#4636b8', DARK = '#22263a';

export function buildCometa(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.31, -0.22];
  const front = { x: 0.62, z: 0.76, r: 0.27, w: 0.17 };
  const rear = { x: 0.6, z: -0.7, r: 0.3, w: 0.26 };

  /* banheira do cockpit */
  b.add(quads(tubShell([
    { z: -0.56, hw: 0.34, y0: 0.075, y1: 0.42, r: 0.13, th: 0.03, fl: 0.04 },
    { z: -0.1, hw: 0.36, y0: 0.07, y1: 0.36, r: 0.14, th: 0.03, fl: 0.04 },
    { z: 0.3, hw: 0.345, y0: 0.07, y1: 0.37, r: 0.14, th: 0.03, fl: 0.04 },
    { z: 0.5, hw: 0.32, y0: 0.08, y1: 0.44, r: 0.13, th: 0.03, fl: 0.04 },
  ], { sub: 3, n: 2 }), (c, n) => (n.y > 0.7 && c.y < 0.16 ? DARK : n.y > 0.8 ? VIOLET : n.y < -0.4 ? SILVER_D : SILVER)), 'paint');

  /* bico longo em agulha */
  b.add(quads(shell([
    { z: 0.44, hw: 0.325, y0: 0.08, y1: 0.45, r: 0.16, rb: 0.1, crown: 0.03 },
    { z: 0.56, hw: 0.3, y0: 0.08, y1: 0.47, r: 0.16, rb: 0.1, crown: 0.04 },
    { z: 0.78, hw: 0.22, y0: 0.09, y1: 0.39, r: 0.13, rb: 0.09, crown: 0.03 },
    { z: 1.0, hw: 0.13, y0: 0.12, y1: 0.3, r: 0.08, crown: 0.02 },
    { z: 1.14, hw: 0.06, y0: 0.155, y1: 0.24, r: 0.04 },
    { z: 1.2, hw: 0.02, y0: 0.18, y1: 0.215, r: 0.015 },
  ], { sub: 3, n: 3 }), (c, n, k) => (c.z < 0.442 && n.z < -0.5 ? DARK : topStripe(k) && n.y > 0.3 ? VIOLET : n.y < -0.35 ? SILVER_D : c.z > 1.12 ? VIOLET_D : SILVER)), 'paint');
  // aletas dianteiras (canards) + lâmina inferior
  const canard = new Model();
  canard.add(plateXZ([[0.1, 1.08], [0.44, 1.0], [0.46, 0.93], [0.43, 0.9], [0.12, 0.96]], 0.025, 0.008), 'paint', VIOLET, { p: [0, 0.16, 0] });
  canard.add(profileX([[0.9, 0.12], [1.02, 0.12], [1.0, 0.25], [0.93, 0.27]], 0.02, 0.006), 'paint', SILVER, { p: [0.445, 0, 0] });
  canard.add(cbox(0.012, 0.035, 0.16, 0.005), 'glow_violet', '#b9a8ff', { p: [0.268, 0.25, 0.7], r: [0, 0.36, 0] });
  both(b, canard);
  // para-brisa em bolha
  const glassG = sphere(0.24, 12, 6);
  glassG.scale(1, 0.62, 1.15);
  b.add(glassG, 'glass', '#a99cff', { p: [0, 0.4, 0.5] });
  b.add(torus(0.215, 0.012, 4, 14, Math.PI).rotateX(-0.5), 'kart_metal', SILVER_D, { p: [0, 0.455, 0.44] });
  b.addModel(steeringColumn(steeringCenter(seat), 0.34, SILVER_D));
  b.add(cbox(0.3, 0.07, 0.03, 0.015), 'paint', DARK, { p: [0, 0.47, 0.46], r: [-0.4, 0, 0] });
  for (const x of [-0.09, 0, 0.09]) b.add(cbox(0.05, 0.03, 0.01, 0.006), 'glow_violet', '#c9bdff', { p: [x, 0.474, 0.443], r: [-0.4, 0, 0] });

  /* casulos laterais (entradas de ar) que viram aletas */
  const pod = new Model();
  pod.add(quads(shell([
    { z: 0.42, hw: 0.03, y0: 0.1, y1: 0.2, r: 0.025, cx: 0.4 },
    { z: 0.25, hw: 0.085, y0: 0.08, y1: 0.28, r: 0.06, cx: 0.44 },
    { z: -0.15, hw: 0.1, y0: 0.075, y1: 0.32, r: 0.07, cx: 0.455 },
    { z: -0.42, hw: 0.08, y0: 0.08, y1: 0.36, r: 0.06, cx: 0.44 },
  ], { sub: 3, n: 2 }), (c, n) => (n.y > 0.75 ? VIOLET : n.y < -0.4 ? SILVER_D : SILVER)), 'paint');
  pod.add(cbox(0.012, 0.03, 0.3, 0.005), 'glow_violet', '#b9a8ff', { p: [0.557, 0.2, -0.1] });
  numberPlate(pod, plate, 0.07, { p: [0.556, 0.21, -0.32], r: [0, Math.PI / 2, 0] }, SILVER_D);
  both(b, pod);

  /* assento */
  b.addModel(buildSeat({ seat, col: '#3a3566', trim: VIOLET, shellCol: WHITE, backH: 0.5, lean: 18, mat: 'cloth', width: 0.48 }));

  /* carenagem traseira até o propulsor */
  b.add(quads(shell([
    { z: -0.5, hw: 0.34, y0: 0.08, y1: 0.46, r: 0.14, rb: 0.08 },
    { z: -0.62, hw: 0.33, y0: 0.085, y1: 0.55, r: 0.17, rb: 0.08, crown: 0.03 },
    { z: -0.85, hw: 0.29, y0: 0.11, y1: 0.53, r: 0.18, rb: 0.12, crown: 0.02 },
    { z: -1.02, hw: 0.21, y0: 0.15, y1: 0.49, r: 0.17, rb: 0.16 },
  ], { sub: 3, n: 3 }), (c, n, k) => (topStripe(k) && n.y > 0.3 ? VIOLET : n.y < -0.4 ? SILVER_D : SILVER)), 'paint');
  // propulsor central
  const ty = 0.32;
  b.add(latheZ([[0.15, -0.98], [0.185, -1.04], [0.19, -1.13], [0.17, -1.15], [0.15, -1.12], [0.12, -1.02], [0.001, -1.0]].reverse() as P2[], 16), 'kart_metal', SILVER_D, { p: [0, ty, 0] });
  b.add(latheZ([[0.001, -1.06], [0.05, -1.035], [0.12, -1.03]] as P2[], 14), 'glow_violet', '#cfc4ff', { p: [0, ty, 0] });
  b.add(latheZ([[0.001, -1.12], [0.03, -1.07], [0.045, -1.03]] as P2[], 8), 'glow_white', '#ffffff', { p: [0, ty, 0] });
  b.add(torus(0.192, 0.012, 4, 16), 'paint', VIOLET, { p: [0, ty, -1.09] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.52;
    b.add(cbox(0.02, 0.05, 0.1, 0.006), 'paint', WHITE, { p: [Math.cos(a) * 0.2, ty + Math.sin(a) * 0.2, -1.07], r: [0, 0, a - Math.PI / 2] });
  }
  // jatos auxiliares (escapamentos)
  const tips: V3[] = [];
  for (const sg of [1, -1]) {
    b.add(latheZ([[0.04, -0.9], [0.05, -1.0], [0.058, -1.08], [0.04, -1.08], [0.03, -1.0]].reverse() as P2[], 9), 'kart_metal', SILVER_D, { p: [sg * 0.27, 0.2, 0] });
    b.add(cyl(0.036, 0.036, 0.01, 8).rotateX(Math.PI / 2), 'glow_violet', '#b9a8ff', { p: [sg * 0.27, 0.2, -1.03] });
    tips.push([sg * 0.27, 0.2, -1.09]);
  }

  /* deriva central + cauda de cometa */
  b.add(profileX([[-0.42, 0.5], [-0.78, 0.54], [-1.16, 0.86], [-1.22, 0.84], [-1.06, 0.5], [-0.9, 0.44]], 0.03, 0.01), 'paint', VIOLET);
  b.add(profileX([[-0.9, 0.62], [-1.12, 0.8], [-1.07, 0.62]], 0.036, 0.004), 'glow_violet', '#b9a8ff');
  for (const sg of [1, -1]) {
    const pts: V3[] = [[sg * 0.43, 0.3, -0.36], [sg * 0.5, 0.4, -0.7], [sg * 0.47, 0.56, -1.0], [sg * 0.4, 0.7, -1.22]];
    const tail = tube(pts, (t) => 0.06 * (1 - t) ** 0.8 + 0.006, 10, 6);
    tail.scale(1, 1, 1);
    b.add(tail, 'paint', (p) => mix(SILVER, VIOLET, (-p.z - 0.4) / 0.7));
    const pts2: V3[] = [[sg * 0.4, 0.42, -0.6], [sg * 0.34, 0.6, -0.9], [sg * 0.24, 0.7, -1.16]];
    b.add(tube(pts2, (t) => 0.035 * (1 - t) + 0.005, 8, 5), 'paint', (p) => mix(WHITE, VIOLET, (-p.z - 0.6) / 0.5));
    b.add(sphere(0.02, 6, 4), 'glow_violet', '#d9d0ff', { p: [sg * 0.4, 0.7, -1.22] });
  }

  /* carenagem das rodas dianteiras + para-lama traseiro baixo */
  const ff = new Model();
  ff.add(quads(fender(front.r + 0.028, -118, 100, (t) => ({ hw: 0.105 * Math.sin(Math.PI * (0.12 + 0.88 * (1 - t))) ** 0.5 + 0.012, th: 0.02, dr: t < 0.3 ? (0.3 - t) * 0.22 : 0, crown: 0.025 }), 12), (c) => (Math.abs(c.x) < 0.03 ? VIOLET : SILVER)), 'paint', undefined, { p: [front.x, front.r, front.z] });
  ff.add(rod([front.x - 0.13, front.r + 0.03, front.z], [front.x - 0.09, front.r * 2 + 0.03, front.z], 0.011, 0.011, 5), 'kart_metal', SILVER_D);
  both(b, ff);
  const fr = new Model();
  fr.add(quads(fender(rear.r + 0.03, -112, 30, (t) => ({ hw: 0.135, th: 0.02, crown: 0.03, dr: t < 0.25 ? (0.25 - t) * 0.3 : 0 }), 9), (c) => (Math.abs(c.x) < 0.04 ? VIOLET : SILVER)), 'paint', undefined, { p: [rear.x, rear.r, rear.z] });
  fr.add(rod([0.33, 0.44, -0.7], [rear.x - 0.1, rear.r * 2 + 0.03, -0.72], 0.012, 0.012, 5), 'kart_metal', SILVER_D);
  both(b, fr);

  /* suspensão */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.2, armY: 0.17, topY: 0.36, topX: 0.19, armCol: SILVER_D, springCol: VIOLET }));
  both(b, buildSuspension({ upper: false, wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.3, armY: 0.19, topY: 0.45, topX: 0.3, armCol: SILVER_D, springCol: VIOLET }));

  /* para-choques */
  bar(b, [[0.3, 0.11, 1.02], [0.2, 0.11, 1.13], [0, 0.11, 1.2]], 0.016, SILVER_D, 'kart_metal', true, 5, 3);
  bar(b, [[0.42, 0.14, -0.98], [0.4, 0.13, -1.1], [0.27, 0.115, -1.17], [0, 0.11, -1.19]], 0.018, SILVER_D, 'kart_metal', true, 6, 3);
  b.add(plateXZ([[-0.3, -1.0], [0.3, -1.0], [0.26, -1.17], [-0.26, -1.17]], 0.02, 0.006), 'kart_carbon', '#5a5f78', { p: [0, 0.1, 0] });

  b.addModel(pedals(0.11, 0.4, SILVER));

  const wf = buildWheel({ r: front.r, w: front.w, spokes: 3, disc: true, discCol: WHITE, sw0: 0.2, sw1: 0.08, sweep: 0.55, st: 0.14, rimCol: SILVER, spokeCol: VIOLET, hubCol: VIOLET_D, lugs: 0, grooves: 2, hubR: 0.2, nuts: 3 });
  const wr = buildWheel({ r: rear.r, w: rear.w, spokes: 3, disc: true, discCol: WHITE, sw0: 0.2, sw1: 0.08, sweep: 0.55, st: 0.14, rimCol: SILVER, spokeCol: VIOLET, hubCol: VIOLET_D, lugs: 0, grooves: 3, hubR: 0.2, nuts: 3 });
  const steering = buildSteering({ rimCol: '#2a2d44', spokeCol: SILVER, hubCol: SILVER_D, style: 'four', accent: VIOLET });
  return { body: b, wheelFront: wf, wheelRear: wr, steering, seat, front, rear, exhaustL: tips[0]!, exhaustR: tips[1]! };
}
