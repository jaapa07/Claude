/** Maré Alta — casco de barco sobre rodas: proa, boia salva-vidas, mastro com bandeirola e leme. */
import { Model, cyl, sphere, torus, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, exhaustPipe, fender, numberPlate, pedals,
  profileX, quads, rod, shell, steeringColumn, tubShell,
} from './common';

const BLUE = '#1f8fc4', BLUE_D = '#156a94', CREAM = '#f3ead7', RED = '#d8402f', WOOD = '#b98248', WOOD_D = '#7c5127', BRASS = '#d1a64a', ROPE = '#d9c69a', NAVY = '#1d3b57';

function buoy(r: number, t: number): Model {
  const m = new Model();
  m.add(quads(torus(r, t, 7, 16).toNonIndexed(), (c) => (Math.floor(((Math.atan2(c.y, c.x) + Math.PI) / (Math.PI * 2)) * 8 + 0.5) % 2 ? RED : '#ffffff')), 'std');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    m.add(torus(t * 1.12, 0.008, 4, 8).rotateX(Math.PI / 2), 'std', ROPE, { p: [Math.cos(a) * r, Math.sin(a) * r, 0], r: [0, 0, a] });
  }
  return m;
}

export function buildMare(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.38, -0.15];
  const front = { x: 0.62, z: 0.74, r: 0.29, w: 0.2 };
  const rear = { x: 0.62, z: -0.74, r: 0.29, w: 0.2 };

  /* casco */
  b.add(quads(tubShell([
    { z: -1.08, hw: 0.35, y0: 0.22, y1: 0.58, r: 0.1, th: 0.04, fl: 0.045, belly: 0.01 },
    { z: -0.92, hw: 0.385, y0: 0.14, y1: 0.55, r: 0.16, th: 0.04, fl: 0.045, belly: 0.025 },
    { z: -0.35, hw: 0.4, y0: 0.1, y1: 0.49, r: 0.18, th: 0.04, fl: 0.045, belly: 0.03 },
    { z: 0.3, hw: 0.385, y0: 0.1, y1: 0.49, r: 0.18, th: 0.04, fl: 0.045, belly: 0.03 },
    { z: 0.75, hw: 0.27, y0: 0.14, y1: 0.55, r: 0.15, th: 0.035, fl: 0.045, belly: 0.03 },
    { z: 1.04, hw: 0.11, y0: 0.26, y1: 0.63, r: 0.08, th: 0.03, fl: 0.04, belly: 0.02 },
    { z: 1.17, hw: 0.025, y0: 0.42, y1: 0.69, r: 0.02, th: 0.01, fl: 0.03 },
  ], { sub: 3, n: 3 }), (c, n) => {
    if (n.y > 0.6) return c.y < 0.25 ? WOOD : CREAM;
    const inner = n.x * c.x < 0 && Math.abs(n.x) > 0.3;
    if (inner) return CREAM;
    const top = 0.49 + Math.max(0, Math.abs(c.z) - 0.4) * 0.14;
    if (c.y > top - 0.1) return CREAM;
    if (c.y > top - 0.2 && c.y < top - 0.13) return RED;
    return n.y < -0.5 ? BLUE_D : BLUE;
  }), 'paint');
  // quilha
  b.add(profileX([[-1.0, 0.15], [-0.4, 0.085], [0.4, 0.085], [0.9, 0.17], [1.16, 0.42], [1.19, 0.7], [1.14, 0.7], [1.1, 0.44], [0.86, 0.23], [0.4, 0.13], [-0.4, 0.13], [-1.0, 0.2]], 0.03, 0.008), 'paint', NAVY);
  // corda no costado
  for (const sg of [1, -1]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const z = -0.3 + i * 0.075;
      pts.push([sg * 0.405, 0.45 - (i % 2) * 0.045, z]);
    }
    bar(b, pts, 0.011, ROPE, 'std', false, 4, 2);
    // vigias
    for (const z of [0.52, 0.72]) {
      const x = sg * (0.345 - (z - 0.52) * 0.42), ry = sg * (Math.PI / 2 - 0.42);
      b.add(torus(0.05, 0.013, 5, 12), 'kart_metal', BRASS, { p: [x, 0.37, z], r: [0, ry, 0] });
      b.add(cyl(0.045, 0.045, 0.012, 10).rotateX(Math.PI / 2), 'glossy', NAVY, { p: [x, 0.37, z], r: [0, ry, 0] });
    }
    // luzes de navegação (bombordo vermelho = esquerda, boreste verde)
    b.add(cbox(0.04, 0.05, 0.07, 0.012), sg > 0 ? 'glow_red' : 'glow_green', sg > 0 ? '#ff6a5a' : '#7dff9a', { p: [sg * 0.2, 0.6, 0.9] });
    b.add(cbox(0.05, 0.02, 0.08, 0.006), 'kart_metal', BRASS, { p: [sg * 0.2, 0.575, 0.9] });
    numberPlate(b, plate, 0.08, { p: [sg * 0.41, 0.33, -0.62], r: [0.2, sg * Math.PI / 2, 0] }, BRASS);
  }

  /* convés de proa (madeira) + farol */
  b.add(quads(shell([
    { z: 0.48, hw: 0.335, y0: 0.47, y1: 0.5, r: 0.012, crown: 0.07 },
    { z: 0.75, hw: 0.245, y0: 0.52, y1: 0.55, r: 0.012, crown: 0.05 },
    { z: 1.02, hw: 0.1, y0: 0.6, y1: 0.63, r: 0.012, crown: 0.02 },
    { z: 1.13, hw: 0.03, y0: 0.65, y1: 0.675, r: 0.008 },
  ], { sub: 3, n: 1 }), (c, n, k) => (n.z < -0.6 ? WOOD_D : (k % 16) % 2 ? WOOD : '#c99558')), 'kart_wood');
  b.add(cyl(0.05, 0.06, 0.05, 10), 'kart_metal', BRASS, { p: [0, 0.615, 0.84] });
  b.add(sphere(0.05, 10, 6), 'glow_warm', '#fff1c2', { p: [0, 0.66, 0.84] });
  b.add(torus(0.05, 0.008, 4, 10).rotateX(Math.PI / 2), 'kart_metal', BRASS, { p: [0, 0.69, 0.84] });
  for (const sg of [1, -1]) b.add(cbox(0.03, 0.03, 0.09, 0.008), 'kart_metal', BRASS, { p: [sg * 0.14, 0.59, 0.66] }); // cunhos
  // para-brisa curvo
  b.add(torus(0.3, 0.012, 4, 12, Math.PI).rotateX(-0.75), 'kart_metal', BRASS, { p: [0, 0.535, 0.5] });
  const glassG = torus(0.3, 0.3, 3, 12, Math.PI);
  glassG.scale(1, 1, 0.02);
  b.add(glassG.rotateX(-0.75), 'glass', '#cdeeff', { p: [0, 0.53, 0.5] });
  b.add(cbox(0.46, 0.09, 0.03, 0.012), 'kart_wood', WOOD, { p: [0, 0.51, 0.46], r: [-0.3, 0, 0] });
  b.add(cyl(0.045, 0.045, 0.02, 12).rotateX(Math.PI / 2 - 0.3), 'kart_metal', BRASS, { p: [0.14, 0.515, 0.44] });
  b.add(cyl(0.036, 0.036, 0.022, 12).rotateX(Math.PI / 2 - 0.3), 'glossy', CREAM, { p: [0.14, 0.515, 0.438] });
  b.add(cbox(0.006, 0.03, 0.006), 'glossy', RED, { p: [0.14, 0.525, 0.425], r: [-0.3, 0, 0.5] });
  b.addModel(steeringColumn(steeringCenter(seat), 0.4, BRASS));

  /* assento (banco de barco) */
  b.addModel(buildSeat({ seat, col: CREAM, trim: BLUE, shellCol: WOOD, backH: 0.48, mat: 'cloth', width: 0.5 }));

  /* convés de popa + motor de popa */
  b.add(quads(shell([
    { z: -0.46, hw: 0.36, y0: 0.47, y1: 0.5, r: 0.012, crown: 0.04 },
    { z: -0.9, hw: 0.355, y0: 0.52, y1: 0.55, r: 0.012, crown: 0.04 },
    { z: -1.07, hw: 0.32, y0: 0.55, y1: 0.58, r: 0.012, crown: 0.03 },
  ], { sub: 2, n: 1 }), (c, n, k) => ((k % 16) % 2 ? WOOD : '#c99558')), 'kart_wood');
  b.add(quads(shell([
    { z: -0.74, hw: 0.14, y0: 0.56, y1: 0.7, r: 0.05 },
    { z: -0.9, hw: 0.16, y0: 0.56, y1: 0.76, r: 0.07, crown: 0.01 },
    { z: -1.08, hw: 0.13, y0: 0.56, y1: 0.7, r: 0.06 },
  ], { sub: 2, n: 2 }), (c) => (c.y > 0.63 && c.y < 0.68 ? BLUE : CREAM)), 'paint');
  b.add(cbox(0.06, 0.03, 0.1, 0.01), 'kart_metal', BRASS, { p: [0, 0.775, -0.9] });
  // mastro com bandeirola e cesto
  const mastZ = -0.6;
  b.add(rod([0, 0.52, mastZ], [0, 1.5, mastZ], 0.022, 0.014, 7), 'kart_wood', WOOD);
  b.add(sphere(0.026, 8, 5), 'kart_metal', BRASS, { p: [0, 1.51, mastZ] });
  b.add(cyl(0.05, 0.035, 0.06, 8), 'kart_wood', WOOD_D, { p: [0, 0.55, mastZ] });
  b.add(profileX([[mastZ - 0.01, 1.47], [mastZ - 0.36, 1.39], [mastZ - 0.01, 1.3]], 0.012), 'leaf', RED);
  b.add(profileX([[mastZ - 0.012, 1.42], [mastZ - 0.2, 1.385], [mastZ - 0.012, 1.35]], 0.016), 'leaf', '#ffffff');
  b.add(rod([0, 1.12, mastZ - 0.02], [0, 1.12, mastZ - 0.5], 0.012, 0.01, 5), 'kart_wood', WOOD); // retranca
  b.add(profileX([[mastZ - 0.03, 1.13], [mastZ - 0.46, 1.13], [mastZ - 0.03, 1.28]], 0.008), 'leaf', CREAM);
  for (const sg of [1, -1]) b.add(rod([0, 1.3, mastZ], [sg * 0.37, 0.55, mastZ - 0.14], 0.005, 0.005, 3), 'std', ROPE);
  b.add(rod([0, 1.3, mastZ], [0, 0.66, 0.98], 0.005, 0.005, 3), 'std', ROPE);
  // leme + cana
  b.add(profileX([[-1.08, 0.5], [-1.1, 0.14], [-1.2, 0.1], [-1.25, 0.2], [-1.19, 0.5], [-1.14, 0.6]], 0.03, 0.008), 'kart_wood', WOOD);
  b.add(rod([0, 0.6, -1.12], [0, 0.72, -0.98], 0.012, 0.012, 5), 'kart_wood', WOOD_D);
  for (const y of [0.25, 0.45]) b.add(cbox(0.05, 0.03, 0.06, 0.006), 'kart_metal', BRASS, { p: [0, y, -1.1] });
  // boias salva-vidas
  b.addModel(buoy(0.14, 0.045), { p: [0.44, 0.36, -0.08], r: [0, Math.PI / 2 - 0.0, 0] });
  b.add(rod([0.41, 0.5, -0.08], [0.46, 0.5, -0.08], 0.01, 0.01, 4), 'kart_metal', BRASS);
  b.addModel(buoy(0.11, 0.036), { p: [-0.2, 0.4, -1.095], r: [0.1, 0, 0] });
  // âncora na proa
  const anchor = new Model();
  anchor.add(rod([0, 0, 0], [0, 0.2, 0], 0.012, 0.012, 5), 'kart_metal', '#5a6470');
  anchor.add(torus(0.025, 0.008, 4, 8), 'kart_metal', '#5a6470', { p: [0, 0.225, 0] });
  anchor.add(torus(0.08, 0.013, 4, 8, Math.PI), 'kart_metal', '#5a6470', { p: [0, 0.08, 0], r: [0, 0, Math.PI] });
  anchor.add(cbox(0.1, 0.014, 0.014), 'kart_metal', '#5a6470', { p: [0, 0.17, 0] });
  b.addModel(anchor, { p: [-0.415, 0.24, 0.2], r: [0, Math.PI / 2, 0.0] });

  /* para-lamas (guarda-respingos) */
  for (const ax of [front, rear]) {
    const f = new Model();
    f.add(quads(fender(ax.r + 0.03, -80, 80, (t) => ({ hw: 0.115, th: 0.02, crown: 0.02, dr: Math.abs(t - 0.5) > 0.38 ? (Math.abs(t - 0.5) - 0.38) * 0.3 : 0 }), 8), (c) => (Math.abs(c.x) > 0.07 ? BLUE : CREAM)), 'paint', undefined, { p: [ax.x, ax.r, ax.z] });
    f.add(rod([0.37, 0.44, ax.z], [ax.x - 0.08, ax.r * 2 + 0.03, ax.z], 0.012, 0.012, 5), 'kart_metal', BRASS);
    both(b, f);
  }

  /* suspensão */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.24, armY: 0.2, topY: 0.44, topX: 0.25, armCol: '#8d939d', springCol: RED }));
  both(b, buildSuspension({ wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.33, armY: 0.2, topY: 0.44, topX: 0.34, armCol: '#8d939d', springCol: RED, upper: false }));

  /* escapamentos na popa + para-choques (defensas) */
  const tipL = exhaustPipe(b, [[0.16, 0.34, -0.95], [0.17, 0.3, -1.08], [0.17, 0.3, -1.15]], 0.03, BRASS);
  const tipR = exhaustPipe(b, [[-0.16, 0.34, -0.95], [-0.17, 0.3, -1.08], [-0.17, 0.3, -1.15]], 0.03, BRASS);
  bar(b, [[0.36, 0.3, -1.0], [0.36, 0.24, -1.12], [0.26, 0.2, -1.17]], 0.02, '#8d939d', 'kart_metal', true, 5, 3);
  for (const sg of [1, -1]) {
    const g = sphere(0.05, 8, 6);
    g.scale(1, 1.7, 1);
    b.add(g, 'std', '#ffffff', { p: [sg * 0.3, 0.33, 0.93], r: [0, 0, sg * 0.25] });
    b.add(rod([sg * 0.28, 0.41, 0.93], [sg * 0.2, 0.56, 0.9], 0.006, 0.006, 3), 'std', ROPE);
  }

  b.addModel(pedals(0.15, 0.44, BRASS));

  const wheel = buildWheel({ r: front.r, w: front.w, spokes: 6, sw0: 0.09, sw1: 0.07, rimCol: CREAM, spokeCol: CREAM, hubCol: BLUE, wellCol: BLUE_D, lugs: 14, wallSectors: [RED, '#ffffff'], wallSectorCount: 8, rimMat: 'paint' });
  const steering = buildSteering({ rimCol: WOOD, spokeCol: WOOD, hubCol: BRASS, style: 'helm', accent: WOOD_D });
  return { body: b, wheelFront: wheel, wheelRear: wheel, steering, seat, front, rear, exhaustL: tipL, exhaustR: tipR };
}
