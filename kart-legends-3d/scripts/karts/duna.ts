/** Rastro de Duna — buggy do deserto: gaiola tubular, pneus balão, estepes, galão e faróis de milha. */
import { Model, cyl, torus, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, boltRow, both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, exhaustPipe, headlight, numberPlate, pedals,
  plateXZ, quads, rod, shell, spareWheel, steeringColumn, tubShell,
} from './common';

const SAND = '#d9a441', SAND_L = '#efc56a', BROWN = '#7a3b1e', BROWN_D = '#4f2512', STEEL = '#8d8f8a', DARK = '#2c2a27', OLIVE = '#74803f', CANVAS = '#cdb98c';

export function buildDuna(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.42, -0.12];
  const front = { x: 0.57, z: 0.74, r: 0.36, w: 0.34 };
  const rear = { x: 0.57, z: -0.74, r: 0.36, w: 0.34 };

  /* banheira de chapa */
  b.add(quads(tubShell([
    { z: -0.52, hw: 0.345, y0: 0.15, y1: 0.58, r: 0.05, th: 0.035, fl: 0.045, wt: 1.04 },
    { z: -0.2, hw: 0.36, y0: 0.14, y1: 0.5, r: 0.05, th: 0.035, fl: 0.045, wt: 1.04 },
    { z: 0.25, hw: 0.36, y0: 0.14, y1: 0.5, r: 0.05, th: 0.035, fl: 0.045, wt: 1.04 },
    { z: 0.5, hw: 0.345, y0: 0.16, y1: 0.58, r: 0.05, th: 0.035, fl: 0.045, wt: 1.04 },
  ], { sub: 2, n: 1 }), (c, n) => (n.y > 0.7 && c.y < 0.25 ? DARK : n.y > 0.8 ? BROWN : c.y < 0.25 ? BROWN : SAND)), 'paint');
  for (const sg of [1, -1]) {
    b.add(cbox(0.012, 0.05, 0.86, 0.004), 'paint', BROWN, { p: [sg * 0.372, 0.36, 0] });
    boltRow(b, [sg * 0.375, 0.44, -0.4], [sg * 0.375, 0.44, 0.4], 5, 0.012, 'x', STEEL);
  }
  numberPlate(b, plate, 0.085, { p: [-0.377, 0.33, 0.1], r: [0, -Math.PI / 2, 0] }, BROWN);

  /* capô inclinado + protetor de cárter */
  b.add(quads(shell([
    { z: 0.46, hw: 0.345, y0: 0.16, y1: 0.66, r: 0.07, rb: 0.03 },
    { z: 0.6, hw: 0.34, y0: 0.18, y1: 0.62, r: 0.07, rb: 0.03 },
    { z: 0.9, hw: 0.3, y0: 0.24, y1: 0.48, r: 0.06, rb: 0.03 },
    { z: 1.02, hw: 0.27, y0: 0.28, y1: 0.42, r: 0.05 },
  ], { sub: 2, n: 2 }), (c, n) => (c.z < 0.47 && n.z < -0.5 ? DARK : n.y < -0.3 ? BROWN_D : Math.abs(c.x) < 0.1 && n.y > 0.5 ? BROWN : SAND)), 'paint');
  b.add(plateXZ([[-0.3, 0.5], [0.3, 0.5], [0.26, 1.08], [-0.26, 1.08]], 0.025, 0.006), 'kart_metal', STEEL, { p: [0, 0.2, 0], r: [-0.22, 0, 0] });
  boltRow(b, [-0.2, 0.425, 1.03], [0.2, 0.425, 1.03], 4, 0.012, 'y', DARK);
  for (let i = 0; i < 4; i++) b.add(cbox(0.3, 0.014, 0.03, 0.004), 'matte', DARK, { p: [0, 0.57 - i * 0.03, 0.72 + i * 0.045], r: [0.46, 0, 0] });
  // quebra-mato com dois faróis
  bar(b, [[0.3, 0.3, 1.0], [0.3, 0.34, 1.13], [0.28, 0.56, 1.15], [0.16, 0.62, 1.15], [0, 0.62, 1.15]], 0.024, BROWN_D, 'kart_metal', true, 6, 3);
  b.add(rod([-0.29, 0.42, 1.15], [0.29, 0.42, 1.15], 0.02, 0.02, 6), 'kart_metal', BROWN_D);
  for (const sg of [1, -1]) b.addModel(headlight(0.07, SAND, STEEL), { p: [sg * 0.15, 0.52, 1.16] });

  /* painel + coluna */
  b.add(cbox(0.5, 0.11, 0.03, 0.012), 'paint', BROWN, { p: [0, 0.69, 0.47], r: [-0.3, 0, 0] });
  for (const x of [-0.15, 0.15]) {
    b.add(cyl(0.04, 0.04, 0.02, 10).rotateX(Math.PI / 2 - 0.3), 'kart_metal', STEEL, { p: [x, 0.695, 0.452] });
    b.add(cyl(0.032, 0.032, 0.022, 10).rotateX(Math.PI / 2 - 0.3), 'glossy', '#f3ead7', { p: [x, 0.695, 0.45] });
  }
  b.addModel(steeringColumn(steeringCenter(seat), 0.34, STEEL));

  /* assento */
  b.addModel(buildSeat({ seat, col: CANVAS, trim: BROWN, shellCol: DARK, backH: 0.54, mat: 'kart_canvas', width: 0.5, headrest: true }));

  /* motor traseiro exposto */
  b.add(cbox(0.4, 0.22, 0.34, 0.03), 'kart_metal', STEEL, { p: [0, 0.34, -0.78] });
  for (const sg of [1, -1]) {
    b.add(cyl(0.075, 0.075, 0.2, 10).rotateX(Math.PI / 2), 'paint', SAND_L, { p: [sg * 0.13, 0.52, -0.76] });
    b.add(cyl(0.08, 0.08, 0.03, 10).rotateX(Math.PI / 2), 'kart_metal', DARK, { p: [sg * 0.13, 0.52, -0.87] });
    for (let i = 0; i < 4; i++) b.add(cbox(0.03, 0.2, 0.02), 'kart_metal', '#6f716d', { p: [sg * 0.215, 0.34, -0.9 + i * 0.075] });
  }
  b.add(torus(0.11, 0.025, 5, 12), 'kart_metal', DARK, { p: [0, 0.34, -0.96] });
  b.add(cbox(0.62, 0.035, 0.5, 0.01), 'kart_metal', BROWN_D, { p: [0, 0.2, -0.8] });

  /* gaiola tubular */
  const top = 1.56;
  const hoop: V3[] = [[0.36, 0.56, 0.5], [0.35, 1.02, 0.34], [0.33, top - 0.05, 0.12], [0.33, top, -0.1], [0.33, top - 0.02, -0.46], [0.35, 1.1, -0.82], [0.37, 0.4, -1.04]];
  bar(b, hoop, 0.026, BROWN, 'kart_metal', true, 6, 3);
  for (const [y, z] of [[top - 0.03, 0.1], [top - 0.01, -0.44], [1.12, -0.81], [0.5, -1.02]] as [number, number][]) b.add(rod([-0.34, y, z], [0.34, y, z], 0.024, 0.024, 6), 'kart_metal', BROWN);
  for (const sg of [1, -1]) {
    b.add(rod([sg * 0.36, 0.58, -0.5], [sg * 0.335, top - 0.03, -0.42], 0.022, 0.022, 6), 'kart_metal', BROWN);
    b.add(rod([sg * 0.36, 0.58, -0.5], [sg * 0.35, 1.1, -0.82], 0.018, 0.018, 5), 'kart_metal', BROWN_D);
  }
  b.add(rod([-0.33, top - 0.03, 0.1], [0.33, top - 0.01, -0.44], 0.016, 0.016, 5), 'kart_metal', BROWN_D);
  // barra de faróis de milha
  for (const x of [-0.24, -0.08, 0.08, 0.24]) {
    b.addModel(headlight(0.062, DARK, STEEL, 'glow_warm', '#fff0b8'), { p: [x, top + 0.065, 0.14], r: [0.08, 0, 0] });
    b.add(rod([x, top - 0.02, 0.1], [x, top + 0.02, 0.12], 0.012, 0.012, 4), 'kart_metal', DARK);
  }

  /* estepes */
  const spare = spareWheel(0.27, 0.18, SAND_L);
  b.addModel(spare, { p: [0, 0.8, -1.09], r: [0.18, Math.PI / 2, 0] });
  b.add(rod([0, 0.82, -0.84], [0, 0.8, -1.06], 0.03, 0.03, 6), 'kart_metal', BROWN_D);
  b.add(cbox(0.1, 0.1, 0.02, 0.02), 'kart_metal', STEEL, { p: [0, 0.795, -1.19], r: [0.18, 0, 0] });
  const spare2 = spareWheel(0.2, 0.13, SAND_L);
  b.addModel(spare2, { p: [0.0, 0.62, 0.78], r: [0, 0, Math.PI / 2 ] });
  b.add(cyl(0.03, 0.03, 0.05, 6), 'kart_metal', STEEL, { p: [0, 0.69, 0.78] });

  /* galão + pá */
  const can = new Model();
  can.add(cbox(0.11, 0.3, 0.22, 0.025), 'paint', OLIVE);
  can.add(cbox(0.012, 0.2, 0.014), 'paint', '#5a6430', { p: [0.058, 0, 0], r: [0.62, 0, 0] });
  can.add(cbox(0.012, 0.2, 0.014), 'paint', '#5a6430', { p: [0.058, 0, 0], r: [-0.62, 0, 0] });
  can.add(cyl(0.025, 0.025, 0.04, 8), 'kart_metal', DARK, { p: [0, 0.165, -0.07] });
  can.add(torus(0.045, 0.01, 4, 8, Math.PI), 'paint', OLIVE, { p: [0, 0.15, 0.03], r: [0, Math.PI / 2, 0] });
  can.add(cbox(0.125, 0.03, 0.235, 0.006), 'std', BROWN_D, { p: [0, -0.04, 0] });
  b.addModel(can, { p: [0.44, 0.4, -0.12] });
  b.add(cbox(0.14, 0.02, 0.26), 'kart_metal', BROWN_D, { p: [0.44, 0.24, -0.12] });
  const shovel = new Model();
  shovel.add(rod([0, 0, -0.32], [0, 0, 0.14], 0.012, 0.012, 5), 'kart_wood', '#b98248');
  shovel.add(plateXZ([[-0.06, 0.12], [0.06, 0.12], [0.07, 0.26], [0, 0.35], [-0.07, 0.26]], 0.012, 0.003), 'kart_metal', STEEL);
  shovel.add(torus(0.03, 0.008, 4, 8).rotateX(Math.PI / 2), 'kart_wood', '#b98248', { p: [0, 0, -0.34] });
  b.addModel(shovel, { p: [-0.385, 0.47, -0.02], r: [0, 0, Math.PI / 2] });

  /* suspensão de curso longo */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.24, armY: 0.26, topY: 0.6, topX: 0.26, armCol: BROWN_D, springCol: SAND_L, upper: false }));
  both(b, buildSuspension({ wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.26, armY: 0.24, topY: 0.6, topX: 0.3, armCol: BROWN_D, springCol: SAND_L, upper: false }));

  /* escapamentos altos + para-choque traseiro */
  const tipL = exhaustPipe(b, [[0.2, 0.36, -0.94], [0.26, 0.4, -1.06], [0.28, 0.62, -1.1], [0.28, 0.82, -1.14]], 0.03, STEEL, DARK);
  const tipR = exhaustPipe(b, [[-0.2, 0.36, -0.94], [-0.26, 0.4, -1.06], [-0.28, 0.62, -1.1], [-0.28, 0.82, -1.14]], 0.03, STEEL, DARK);
  bar(b, [[0.37, 0.4, -1.04], [0.3, 0.26, -1.14], [0, 0.24, -1.16]], 0.024, BROWN, 'kart_metal', true, 6, 3);
  // paralamas de lona (barrinhas)
  for (const sg of [1, -1]) for (const z of [0.36, -0.36]) b.add(cbox(0.16, 0.2, 0.012, 0.004), 'rubber', DARK, { p: [sg * 0.47, 0.3, z] });

  b.addModel(pedals(0.185, 0.42, STEEL));

  const wheel = buildWheel({ r: front.r, w: front.w, rim: 0.5, balloon: true, spokes: 6, sw0: 0.16, sw1: 0.13, st: 0.26, rimCol: SAND_L, spokeCol: SAND, hubCol: BROWN, wellCol: BROWN_D, lugs: 9, lugRows: 2, lugH: 0.026, lugLen: 0.5, beadBolts: 8, beadCol: STEEL, tireCol: '#3b3a38', lugCol: '#4d4b47', hubR: 0.3, nuts: 4 });
  const steering = buildSteering({ rimCol: DARK, spokeCol: STEEL, hubCol: BROWN, style: 'three', accent: SAND_L });
  return { body: b, wheelFront: wheel, wheelRear: wheel, steering, seat, front, rear, exhaustL: tipL, exhaustR: tipR };
}
