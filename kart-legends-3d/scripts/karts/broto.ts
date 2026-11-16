/** Broto Verde — leve e orgânico: casca de semente, para-lamas de folha, madeira e flor no capô. */
import { Model, cyl, sphere, tube, mix, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, exhaustPipe, fender, leafBlade, numberPlate, pedals,
  quads, rod, shell, steeringColumn, topStripe, tubShell,
} from './common';

const GREEN = '#4caf50', GREEN_L = '#8fd66a', GREEN_D = '#2f7d3a', WOOD = '#a06a35', WOOD_D = '#6f4520', PETAL = '#fff3d9', POLLEN = '#f5a623', PINK = '#f48fb1';

export function buildBroto(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.36, -0.12];
  const front = { x: 0.61, z: 0.74, r: 0.31, w: 0.13 };
  const rear = { x: 0.61, z: -0.72, r: 0.31, w: 0.15 };

  /* casca de semente (vagem aberta) */
  b.add(quads(tubShell([
    { z: -1.02, hw: 0.07, y0: 0.4, y1: 0.6, r: 0.06, th: 0.025, fl: 0.03 },
    { z: -0.86, hw: 0.24, y0: 0.2, y1: 0.56, r: 0.2, th: 0.035, fl: 0.04, belly: 0.02 },
    { z: -0.45, hw: 0.37, y0: 0.1, y1: 0.47, r: 0.2, th: 0.035, fl: 0.045, belly: 0.03 },
    { z: 0.05, hw: 0.39, y0: 0.1, y1: 0.41, r: 0.2, th: 0.035, fl: 0.045, belly: 0.025 },
    { z: 0.5, hw: 0.35, y0: 0.1, y1: 0.44, r: 0.2, th: 0.035, fl: 0.045, belly: 0.03 },
    { z: 0.9, hw: 0.2, y0: 0.2, y1: 0.48, r: 0.16, th: 0.03, fl: 0.04, belly: 0.02 },
    { z: 1.08, hw: 0.06, y0: 0.34, y1: 0.5, r: 0.05, th: 0.02, fl: 0.03 },
  ], { sub: 3, n: 3 }), (c, n) => (n.y > 0.75 && c.y > 0.38 ? GREEN_L : n.y > 0.5 ? WOOD : n.y < -0.55 ? GREEN_D : (Math.floor((c.z + 2) * 9) % 5 === 0 ? GREEN_D : GREEN))), 'paint');
  // piso de ripas de madeira
  for (let i = 0; i < 6; i++) b.add(cbox(0.56 - Math.abs(i - 2) * 0.03, 0.014, 0.1, 0.004), 'kart_wood', i % 2 ? WOOD : '#b47a40', { p: [0, 0.132, -0.12 + i * 0.118] });

  /* capô: folha grande com nervura e flor */
  b.add(quads(shell([
    { z: 0.46, hw: 0.33, y0: 0.42, y1: 0.47, r: 0.02, crown: 0.09 },
    { z: 0.6, hw: 0.31, y0: 0.43, y1: 0.48, r: 0.02, crown: 0.1 },
    { z: 0.85, hw: 0.2, y0: 0.44, y1: 0.49, r: 0.02, crown: 0.06 },
    { z: 1.06, hw: 0.07, y0: 0.47, y1: 0.51, r: 0.015, crown: 0.02 },
    { z: 1.16, hw: 0.012, y0: 0.52, y1: 0.54, r: 0.006 },
  ], { sub: 3, n: 1 }), (c, n, k) => (topStripe(k, 1) && n.y > 0.3 ? GREEN_D : n.y < -0.3 ? GREEN_D : GREEN_L)), 'paint');
  for (const sg of [1, -1]) for (let i = 0; i < 3; i++) {
    b.add(rod([0, 0.555 - i * 0.02, 0.56 + i * 0.14], [sg * (0.24 - i * 0.06), 0.51 - i * 0.012, 0.66 + i * 0.14], 0.008, 0.005, 4), 'paint', GREEN_D);
  }
  // flor
  const flower = new Model();
  for (let i = 0; i < 6; i++) {
    const g = sphere(0.07, 8, 5);
    g.scale(0.62, 0.2, 1);
    g.translate(0, 0.012, 0.085);
    g.rotateX(-0.22);
    g.rotateY((i / 6) * Math.PI * 2);
    flower.add(g, 'std', (p) => mix(PINK, PETAL, Math.hypot(p.x, p.z) / 0.11));
  }
  const core = sphere(0.05, 10, 6);
  core.scale(1, 0.6, 1);
  flower.add(core, 'glow_warm', POLLEN, { p: [0, 0.03, 0] });
  for (let i = 0; i < 7; i++) flower.add(sphere(0.01, 5, 3), 'std', '#b86a12', { p: [Math.cos(i * 2.4) * 0.028 * (i % 3), 0.06 - (i % 3) * 0.004, Math.sin(i * 2.4) * 0.028 * (i % 3)] });
  flower.add(rod([0, -0.06, 0], [0, 0.01, 0], 0.012, 0.012, 5), 'paint', GREEN_D);
  b.addModel(flower, { p: [0, 0.61, 0.74], r: [0.25, 0, 0] });
  b.add(leafBlade(0.16, 0.09, 0.3, 4), 'leaf', GREEN, { p: [0.03, 0.56, 0.72], r: [-0.3, 1.9, 0] });
  b.add(leafBlade(0.14, 0.08, 0.3, 4), 'leaf', GREEN_D, { p: [-0.03, 0.56, 0.72], r: [-0.3, -2.2, 0] });
  // faróis: vaga-lumes em cúpulas de bolota
  for (const sg of [1, -1]) {
    b.add(sphere(0.055, 10, 6), 'glow_warm', '#fff0a8', { p: [sg * 0.2, 0.37, 0.93] });
    const cap = sphere(0.062, 10, 5, );
    cap.scale(1, 1, 1);
    b.add(cyl(0.064, 0.05, 0.05, 10).rotateX(Math.PI / 2), 'kart_wood', WOOD_D, { p: [sg * 0.2, 0.37, 0.9] });
    b.add(rod([sg * 0.2, 0.37, 0.86], [sg * 0.17, 0.36, 0.8], 0.012, 0.012, 5), 'kart_wood', WOOD_D);
  }

  /* painel de madeira + coluna */
  b.add(cbox(0.44, 0.1, 0.035, 0.015), 'kart_wood', WOOD, { p: [0, 0.56, 0.47], r: [-0.3, 0, 0] });
  b.add(cyl(0.035, 0.035, 0.02, 10).rotateX(Math.PI / 2 - 0.3), 'glossy', PETAL, { p: [-0.12, 0.565, 0.452] });
  b.add(cyl(0.035, 0.035, 0.02, 10).rotateX(Math.PI / 2 - 0.3), 'glossy', GREEN_L, { p: [0.12, 0.565, 0.452] });
  b.addModel(steeringColumn(steeringCenter(seat), 0.36, WOOD_D));

  /* assento trançado */
  b.addModel(buildSeat({ seat, col: '#e8d9a6', trim: GREEN_D, shellCol: WOOD, backH: 0.48, mat: 'kart_canvas', width: 0.48 }));

  /* tampa traseira (folha) + broto */
  b.add(quads(shell([
    { z: -0.42, hw: 0.34, y0: 0.44, y1: 0.49, r: 0.02, crown: 0.08 },
    { z: -0.6, hw: 0.32, y0: 0.47, y1: 0.52, r: 0.02, crown: 0.1 },
    { z: -0.85, hw: 0.2, y0: 0.52, y1: 0.57, r: 0.02, crown: 0.06 },
    { z: -1.0, hw: 0.07, y0: 0.57, y1: 0.61, r: 0.015, crown: 0.02 },
  ], { sub: 3, n: 1 }), (c, n, k) => (topStripe(k, 1) && n.y > 0.3 ? GREEN_D : n.y < -0.3 ? GREEN_D : GREEN_L)), 'paint');
  b.add(tube([[0, 0.58, -0.98], [0, 0.7, -1.06], [0, 0.86, -1.04], [0, 0.95, -0.94]], (t) => 0.022 - t * 0.01, 8, 6), 'paint', GREEN_L);
  b.add(leafBlade(0.24, 0.14, 0.25, 5), 'leaf', GREEN, { p: [0, 0.95, -0.94], r: [-0.5, 0.9, 0] });
  b.add(leafBlade(0.2, 0.12, 0.25, 5), 'leaf', GREEN_L, { p: [0, 0.95, -0.94], r: [-0.4, -1.3, 0] });
  b.add(sphere(0.03, 6, 4), 'paint', GREEN_D, { p: [0, 0.95, -0.94] });

  /* para-lamas de folha */
  for (const ax of [front, rear]) {
    const f = new Model();
    f.add(quads(fender(ax.r + 0.03, -100, 70, (t) => ({ hw: 0.115 * Math.sin(Math.PI * (0.06 + 0.9 * t)) ** 0.7 + 0.008, th: 0.016, crown: 0.03, dr: (t < 0.2 ? (0.2 - t) * 0.35 : 0) + (t > 0.85 ? (t - 0.85) * 0.3 : 0) }), 11), (c, n, k) => (topStripe(k, 0) ? GREEN_D : n.y < -0.2 ? GREEN_D : GREEN)), 'leaf', undefined, { p: [ax.x, ax.r, ax.z] });
    f.add(tube([[0.36, 0.4, ax.z - 0.1], [0.45, 0.56, ax.z - 0.06], [ax.x - 0.06, ax.r * 2 + 0.03, ax.z - 0.02]], 0.012, 6, 5), 'kart_wood', WOOD_D);
    both(b, f);
  }

  /* suspensão de galhos */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.24, armY: 0.2, topY: 0.44, topX: 0.24, armCol: WOOD, springCol: GREEN_L }));
  both(b, buildSuspension({ wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.27, armY: 0.2, topY: 0.46, topX: 0.27, armCol: WOOD, springCol: GREEN_L }));

  /* para-choques: gavinhas enroladas */
  for (const sg of [1, -1]) {
    const curl: V3[] = [[sg * 0.1, 0.3, 1.02], [sg * 0.26, 0.22, 1.12], [sg * 0.42, 0.2, 1.1], [sg * 0.47, 0.27, 1.04], [sg * 0.42, 0.33, 1.06], [sg * 0.38, 0.28, 1.1]];
    b.add(tube(curl, (t) => 0.022 - t * 0.012, 16, 6), 'paint', GREEN_D);
    const curl2: V3[] = [[sg * 0.12, 0.34, -0.96], [sg * 0.3, 0.24, -1.08], [sg * 0.45, 0.22, -1.08], [sg * 0.5, 0.3, -1.02], [sg * 0.45, 0.35, -1.05], [sg * 0.42, 0.3, -1.08]];
    b.add(tube(curl2, (t) => 0.022 - t * 0.012, 16, 6), 'paint', GREEN_D);
    numberPlate(b, plate, 0.085, { p: [sg * 0.392, 0.27, -0.02], r: [0.12, sg * Math.PI / 2, 0] }, WOOD);
  }
  bar(b, [[-0.14, 0.31, 1.03], [0, 0.26, 1.1], [0.14, 0.31, 1.03]], 0.02, GREEN_D, 'paint', false, 6, 3);

  /* escapamentos de bambu */
  const tipL = exhaustPipe(b, [[0.2, 0.3, -0.7], [0.27, 0.34, -0.9], [0.3, 0.42, -1.06]], 0.032, '#c9a35a', '#2a2118', 'kart_wood');
  const tipR = exhaustPipe(b, [[-0.2, 0.3, -0.7], [-0.27, 0.34, -0.9], [-0.3, 0.42, -1.06]], 0.032, '#c9a35a', '#2a2118', 'kart_wood');
  for (const sg of [1, -1]) b.add(rod([sg * 0.262, 0.335, -0.87], [sg * 0.272, 0.345, -0.895], 0.037, 0.037, 8), 'kart_wood', WOOD_D);

  b.addModel(pedals(0.135, 0.44, GREEN_L));

  const wspec = { spokes: 10, sw0: 0.05, sw1: 0.04, st: 0.16, rim: 0.74, rimCol: WOOD, spokeCol: '#c58f4e', hubCol: GREEN, wellCol: WOOD_D, rimMat: 'kart_wood', spokeMat: 'kart_wood', hubMat: 'paint', lugs: 14, lugRows: 1 as const, lugLen: 0.42, lugH: 0.01, hubR: 0.2, nuts: 0, wallBand: '#5a4632' };
  const wf = buildWheel({ r: front.r, w: front.w, ...wspec });
  const wr = buildWheel({ r: rear.r, w: rear.w, ...wspec });
  const steering = buildSteering({ rimCol: WOOD, spokeCol: GREEN_L, hubCol: GREEN_D, style: 'leaf', accent: POLLEN });
  return { body: b, wheelFront: wf, wheelRear: wr, steering, seat, front, rear, exhaustL: tipL, exhaustR: tipR };
}
