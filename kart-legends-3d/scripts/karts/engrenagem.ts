/** Vagão Engrenagem — pesado, de latão e ferro: caldeira traseira, engrenagens, rebites e chaminés. */
import { Model, cyl, lathe, sphere, torus, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, boltRow, both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, fender, gear, latheZ,
  numberPlate, pedals, quads, rod, shell, steeringColumn, tubShell, type P2,
} from './common';

const BRASS = '#c9953a', BRASS_L = '#e3b85a', IRON = '#4b5d69', IRON_D = '#34424b', IRON_L = '#74889a', COPPER = '#b8643a', LEATHER = '#6b3f26';

export function buildEngrenagem(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.4, -0.12];
  const front = { x: 0.6, z: 0.72, r: 0.33, w: 0.27 };
  const rear = { x: 0.6, z: -0.72, r: 0.33, w: 0.27 };

  /* caixa do vagão (cockpit) */
  b.add(quads(tubShell([
    { z: -0.48, hw: 0.385, y0: 0.1, y1: 0.54, r: 0.035, th: 0.045, fl: 0.05 },
    { z: 0.0, hw: 0.385, y0: 0.1, y1: 0.5, r: 0.035, th: 0.045, fl: 0.05 },
    { z: 0.56, hw: 0.385, y0: 0.1, y1: 0.52, r: 0.035, th: 0.045, fl: 0.05 },
  ], { sub: 2, n: 1 }), (c, n) => (n.y > 0.7 && c.y > 0.4 ? BRASS_L : n.y > 0.7 ? '#4a3524' : c.y > 0.43 && Math.abs(n.x) > 0.7 ? BRASS : c.y < 0.17 ? IRON_D : IRON)), 'kart_brass');
  for (const sg of [1, -1]) {
    boltRow(b, [sg * 0.39, 0.4, -0.42], [sg * 0.39, 0.4, 0.5], 6, 0.014, 'x', BRASS_L);
    boltRow(b, [sg * 0.39, 0.16, -0.42], [sg * 0.39, 0.16, 0.5], 6, 0.012, 'x', IRON_L);
    numberPlate(b, plate, 0.09, { p: [sg * 0.394, 0.29, 0.06], r: [0, sg * Math.PI / 2, 0] }, BRASS_L);
  }
  for (let i = 0; i < 5; i++) b.add(cbox(0.6, 0.012, 0.1), 'kart_wood', '#8a6238', { p: [0, 0.155, 0.02 + i * 0.115] });

  /* capô dianteiro rebitado */
  b.add(quads(shell([
    { z: 0.52, hw: 0.385, y0: 0.1, y1: 0.62, r: 0.06, rb: 0.03 },
    { z: 0.78, hw: 0.36, y0: 0.1, y1: 0.6, r: 0.08, rb: 0.03 },
    { z: 0.98, hw: 0.33, y0: 0.11, y1: 0.52, r: 0.08, rb: 0.03 },
    { z: 1.02, hw: 0.3, y0: 0.14, y1: 0.47, r: 0.07, rb: 0.03 },
  ], { sub: 2, n: 2 }), (c, n) => (n.z < -0.6 && c.z < 0.53 ? IRON_D : n.y < -0.3 ? IRON_D : IRON)), 'kart_brass');
  for (const z of [0.6, 0.9]) {
    b.add(shell([{ z: z - 0.022, hw: 0.4 - (z - 0.52) * 0.13, y0: 0.09, y1: 0.635 - (z - 0.52) * 0.2, r: 0.07 }, { z: z + 0.022, hw: 0.4 - (z - 0.5) * 0.13, y0: 0.09, y1: 0.635 - (z - 0.5) * 0.2, r: 0.07 }], { sub: 1, n: 2 }), 'kart_brass', BRASS);
  }
  boltRow(b, [-0.27, 0.615, 0.75], [0.27, 0.615, 0.75], 5, 0.014, 'y', BRASS_L);
  // grade frontal + lanterna
  b.add(cbox(0.44, 0.24, 0.03, 0.02), 'kart_brass', BRASS, { p: [0, 0.31, 1.025] });
  for (let i = 0; i < 6; i++) b.add(cbox(0.02, 0.19, 0.024), 'matte', IRON_D, { p: [-0.165 + i * 0.066, 0.31, 1.036] });
  const lamp = new Model();
  lamp.add(cbox(0.13, 0.15, 0.12, 0.02), 'kart_brass', BRASS);
  lamp.add(cbox(0.1, 0.1, 0.02, 0.01), 'glow_warm', '#ffe6a8', { p: [0, 0, 0.056] });
  lamp.add(cbox(0.16, 0.025, 0.15, 0.01), 'kart_brass', BRASS_L, { p: [0, 0.085, 0] });
  lamp.add(torus(0.03, 0.007, 4, 10), 'kart_metal', IRON_L, { p: [0, 0.125, 0] });
  lamp.add(cbox(0.012, 0.1, 0.012), 'kart_metal', IRON_D, { p: [0, 0, 0.068] });
  lamp.add(cbox(0.1, 0.012, 0.012), 'kart_metal', IRON_D, { p: [0, 0, 0.068] });
  b.addModel(lamp, { p: [0, 0.675, 0.86] });
  // limpa-trilhos (para-choque dianteiro)
  bar(b, [[0.44, 0.36, 1.0], [0.3, 0.36, 1.08], [0, 0.36, 1.12]], 0.022, IRON_L, 'kart_metal', true, 5, 2);
  bar(b, [[0.47, 0.085, 1.04], [0.3, 0.085, 1.15], [0, 0.085, 1.22]], 0.022, IRON_L, 'kart_metal', true, 5, 2);
  for (let i = -4; i <= 4; i++) {
    const t = Math.abs(i) / 4;
    b.add(rod([i * 0.1, 0.36, 1.12 - t * t * 0.11], [i * 0.11, 0.085, 1.22 - t * t * 0.17], 0.014, 0.014, 5), 'kart_metal', i % 2 ? BRASS : IRON_L);
  }
  b.add(rod([0.3, 0.3, 0.98], [0.3, 0.36, 1.08], 0.016, 0.016, 5), 'kart_metal', IRON_D);
  b.add(rod([-0.3, 0.3, 0.98], [-0.3, 0.36, 1.08], 0.016, 0.016, 5), 'kart_metal', IRON_D);

  /* painel com manômetros */
  b.add(cbox(0.5, 0.14, 0.05, 0.02), 'kart_brass', IRON, { p: [0, 0.66, 0.53], r: [-0.3, 0, 0] });
  for (const [x, r] of [[-0.15, 0.05], [0, 0.04], [0.15, 0.05]] as P2[]) {
    b.add(cyl(r, r, 0.03, 12).rotateX(Math.PI / 2 - 0.3), 'kart_brass', BRASS_L, { p: [x, 0.665, 0.503] });
    b.add(cyl(r * 0.8, r * 0.8, 0.032, 12).rotateX(Math.PI / 2 - 0.3), 'glossy', '#f4efdf', { p: [x, 0.665, 0.5] });
    b.add(cbox(0.007, r * 0.75, 0.006), 'glossy', '#b0281c', { p: [x + 0.008, 0.673, 0.482], r: [-0.3, 0, x * 5 - 0.4] });
  }
  b.addModel(steeringColumn(steeringCenter(seat), 0.3, BRASS));

  /* assento de couro */
  b.addModel(buildSeat({ seat, col: LEATHER, trim: BRASS_L, shellCol: IRON_D, backH: 0.5, mat: 'std', width: 0.52 }));

  /* caldeira traseira */
  const by = 0.47, br = 0.28;
  b.add(latheZ([[0.001, -1.12], [br * 0.55, -1.1], [br * 0.9, -1.04], [br, -0.96], [br, -0.42], [0.001, -0.42]] as P2[], 16), 'kart_brass', BRASS, { p: [0, by, 0] });
  for (const z of [-0.5, -0.72, -0.94]) {
    b.add(torus(br + 0.006, 0.02, 5, 18), 'kart_brass', IRON, { p: [0, by, z] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      if (Math.sin(a) < -0.5) continue;
      b.add(sphere(0.015, 4, 2), 'kart_metal', IRON_L, { p: [Math.cos(a) * (br + 0.024), by + Math.sin(a) * (br + 0.024), z] });
    }
  }
  // porta da fornalha (traseira) com brasa
  b.add(cyl(0.15, 0.15, 0.03, 14).rotateX(Math.PI / 2), 'kart_brass', IRON, { p: [0, by, -1.11] });
  for (let i = 0; i < 3; i++) b.add(cbox(0.2 - Math.abs(i - 1) * 0.06, 0.022, 0.02), 'glow_warm', '#ffb060', { p: [0, by - 0.05 + i * 0.05, -1.125] });
  b.add(cbox(0.03, 0.05, 0.03), 'kart_brass', BRASS_L, { p: [0.11, by, -1.13] });
  // domo e apito
  b.add(lathe([[0.1, 0], [0.1, 0.06], [0.085, 0.11], [0.04, 0.145], [0.001, 0.15]], 12), 'kart_brass', BRASS_L, { p: [0, by + br - 0.02, -0.82] });
  b.add(rod([0, by + br + 0.12, -0.82], [0, by + br + 0.2, -0.82], 0.014, 0.014, 6), 'kart_metal', IRON_L);
  b.add(cyl(0.028, 0.022, 0.05, 8), 'kart_brass', BRASS, { p: [0, by + br + 0.21, -0.82] });
  // berço da caldeira
  for (const z of [-0.55, -0.95]) b.add(cbox(0.5, 0.14, 0.07, 0.02), 'kart_brass', IRON_D, { p: [0, 0.2, z] });
  b.add(cbox(0.66, 0.06, 0.7, 0.015), 'kart_brass', IRON, { p: [0, 0.13, -0.78] });

  /* chaminés (escapamentos) */
  const stackTop = 1.1;
  for (const sg of [1, -1]) {
    b.add(lathe([[0.05, 0.6], [0.05, 0.95], [0.062, 1.0], [0.085, stackTop - 0.03], [0.085, stackTop], [0.06, stackTop], [0.05, stackTop - 0.06]], 12), 'kart_brass', IRON, { p: [sg * 0.2, 0, -0.56] });
    b.add(torus(0.054, 0.012, 4, 12).rotateX(Math.PI / 2), 'kart_brass', BRASS_L, { p: [sg * 0.2, 0.9, -0.56] });
    b.add(torus(0.088, 0.012, 4, 12).rotateX(Math.PI / 2), 'kart_brass', BRASS_L, { p: [sg * 0.2, stackTop, -0.56] });
    b.add(cyl(0.058, 0.058, 0.01, 10), 'matte', '#15181b', { p: [sg * 0.2, stackTop - 0.02, -0.56] });
    // tubulação de cobre da caldeira até o capô
    bar(b, [[sg * 0.25, 0.66, -0.7], [sg * 0.33, 0.62, -0.6], [sg * 0.425, 0.56, -0.5], [sg * 0.425, 0.555, 0.4], [sg * 0.36, 0.6, 0.56]], 0.018, COPPER, 'kart_metal', false, 5, 2);
    for (const z of [-0.3, 0.2]) b.add(torus(0.024, 0.01, 4, 8), 'kart_metal', BRASS_L, { p: [sg * 0.425, 0.555, z] });
  }

  /* engrenagens expostas */
  const gears = new Model();
  const g1 = gear(0.2, 12, 0.04, 0.05, 0.04).rotateY(Math.PI / 2);
  gears.add(g1, 'kart_brass', BRASS_L, { p: [0.325, 0.5, -0.74], r: [0.1, 0, 0] });
  gears.add(gear(0.115, 8, 0.04, 0.03, 0.035).rotateY(Math.PI / 2), 'kart_brass', COPPER, { p: [0.33, 0.69, -0.5], r: [0.35, 0, 0] });
  for (const [y, z, r] of [[0.5, -0.74, 0.03], [0.69, -0.5, 0.02]] as V3[]) {
    gears.add(rod([0.24, y, z], [0.365, y, z], r, r, 8), 'kart_metal', IRON_D);
    gears.add(sphere(r * 0.9, 5, 3), 'kart_metal', IRON_L, { p: [0.365, y, z] });
  }
  both(b, gears);
  // engrenagem horizontal sobre o capô
  b.add(gear(0.12, 9, 0.03, 0.03, 0.035).rotateX(Math.PI / 2), 'kart_brass', BRASS_L, { p: [0.2, 0.628, 0.66] });
  b.add(gear(0.08, 6, 0.03, 0.02, 0.03).rotateX(Math.PI / 2), 'kart_brass', COPPER, { p: [0.02, 0.632, 0.68], r: [0, 0.3, 0] });
  b.add(cyl(0.02, 0.02, 0.06, 6), 'kart_metal', IRON_D, { p: [0.2, 0.64, 0.66] });
  b.add(cyl(0.015, 0.015, 0.06, 6), 'kart_metal', IRON_D, { p: [0.02, 0.64, 0.68] });

  /* para-lamas de ferro com friso de latão */
  for (const ax of [front, rear]) {
    const f = new Model();
    f.add(quads(fender(ax.r + 0.035, -78, 78, () => ({ hw: 0.155, th: 0.025 }), 6), (c) => (Math.abs(c.x) > 0.11 ? BRASS : IRON)), 'kart_brass', undefined, { p: [ax.x, ax.r, ax.z] });
    for (const dz of [-0.2, 0.2]) f.add(rod([0.4, 0.42, ax.z + dz * 0.6], [ax.x - 0.1, ax.r * 2 + 0.0, ax.z + dz], 0.014, 0.014, 5), 'kart_metal', IRON_D);
    boltRow(f, [ax.x, ax.r * 2 + 0.063, ax.z - 0.12], [ax.x, ax.r * 2 + 0.063, ax.z + 0.12], 3, 0.014, 'y', BRASS_L);
    both(b, f);
  }

  /* suspensão */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.3, armY: 0.22, topY: 0.5, topX: 0.3, armCol: IRON_L, springCol: BRASS_L }));
  both(b, buildSuspension({ upper: false, wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.3, armY: 0.2, topY: 0.5, topX: 0.3, armCol: IRON_L, springCol: BRASS_L }));

  /* para-choque traseiro com batentes */
  b.add(cbox(0.86, 0.09, 0.06, 0.02), 'kart_brass', IRON, { p: [0, 0.2, -1.13] });
  for (const x of [-0.3, 0.3]) {
    b.add(latheZ([[0.03, 0], [0.03, -0.05], [0.07, -0.06], [0.075, -0.085], [0.001, -0.09]].reverse() as P2[], 10), 'kart_brass', BRASS, { p: [x, 0.2, -1.13] });
    b.add(rod([x, 0.2, -0.95], [x, 0.2, -1.12], 0.02, 0.02, 6), 'kart_metal', IRON_D);
  }
  boltRow(b, [-0.12, 0.2, -1.162], [0.12, 0.2, -1.162], 4, 0.014, 'z', BRASS_L);

  b.addModel(pedals(0.15, 0.47, BRASS_L));

  const wspec = { spokes: 6, sw0: 0.11, sw1: 0.09, st: 0.24, rim: 0.7, rimCol: IRON_L, spokeCol: BRASS, hubCol: BRASS_L, wellCol: IRON_D, spokeMat: 'kart_brass', hubMat: 'kart_brass', hubTeeth: 8, hubR: 0.24, beadBolts: 8, beadCol: BRASS_L, lugs: 12, lugRows: 1 as const, lugLen: 0.55, lugH: 0.016, tireCol: '#34373d', nuts: 0 };
  const wheel = buildWheel({ r: front.r, w: front.w, ...wspec });
  const steering = buildSteering({ rimCol: BRASS, spokeCol: IRON_L, hubCol: BRASS_L, style: 'gear', accent: COPPER });
  return { body: b, wheelFront: wheel, wheelRear: wheel, steering, seat, front, rear, exhaustL: [0.2, stackTop + 0.01, -0.56], exhaustR: [-0.2, stackTop + 0.01, -0.56] };
}
