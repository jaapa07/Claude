/** Faísca Turbo — hot-rod compacto: motor exposto com blower, escapamentos laterais, traseiras enormes. */
import { Model, cyl, sphere, torus, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, boltRow, both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, exhaustPipe, headlight, latheX, numberPlate,
  pedals, profileX, quads, rod, shell, steeringColumn, tubShell, type P2,
} from './common';

const RED = '#e23b4e', RED_D = '#a8222f', YELLOW = '#ffd23f', ORANGE = '#ff8a1f', CHROME = '#dfe3ea', STEEL = '#8a909b', DARK = '#26282e', BLACK = '#1b1c20';

export function buildFaisca(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.34, -0.24];
  const front = { x: 0.61, z: 0.82, r: 0.27, w: 0.16 };
  const rear = { x: 0.56, z: -0.66, r: 0.36, w: 0.36 };

  /* balde (T-bucket) */
  b.add(quads(tubShell([
    { z: -0.7, hw: 0.3, y0: 0.14, y1: 0.66, r: 0.12, th: 0.035, fl: 0.045 },
    { z: -0.55, hw: 0.335, y0: 0.1, y1: 0.66, r: 0.12, th: 0.035, fl: 0.045 },
    { z: -0.25, hw: 0.345, y0: 0.09, y1: 0.52, r: 0.1, th: 0.035, fl: 0.045 },
    { z: 0.1, hw: 0.35, y0: 0.09, y1: 0.44, r: 0.1, th: 0.035, fl: 0.045 },
    { z: 0.42, hw: 0.33, y0: 0.09, y1: 0.5, r: 0.1, th: 0.035, fl: 0.045 },
  ], { sub: 3, n: 2 }), (c, n) => (n.y > 0.7 && c.y < 0.2 ? DARK : n.y > 0.8 ? YELLOW : n.y < -0.4 ? RED_D : RED)), 'paint');
  b.add(shell([{ z: -0.74, hw: 0.29, y0: 0.15, y1: 0.64, r: 0.12 }, { z: -0.69, hw: 0.3, y0: 0.14, y1: 0.655, r: 0.12 }], { sub: 1, n: 2 }), 'paint', RED_D);
  // chamas pintadas nas laterais
  const flame: P2[] = [[0.42, 0.14], [0.3, 0.32], [0.14, 0.36], [-0.06, 0.3], [0.04, 0.26], [-0.18, 0.25], [-0.4, 0.3], [-0.2, 0.2], [-0.5, 0.18], [-0.22, 0.14], [-0.38, 0.1], [0.1, 0.11]];
  const flame2: P2[] = [[0.4, 0.15], [0.26, 0.26], [0.1, 0.28], [0.14, 0.22], [-0.1, 0.2], [0.12, 0.16]];
  for (const sg of [1, -1]) {
    b.add(profileX(flame, 0.012), 'glossy', YELLOW, { p: [sg * 0.35, 0.02, -0.02] });
    b.add(profileX(flame2, 0.012), 'glossy', ORANGE, { p: [sg * 0.357, 0.02, -0.02] });
    numberPlate(b, plate, 0.075, { p: [sg * 0.345, 0.5, -0.5], r: [0, sg * Math.PI / 2, 0] }, YELLOW);
  }

  /* capô estreito + torpedo do painel */
  b.add(quads(shell([
    { z: 0.38, hw: 0.335, y0: 0.09, y1: 0.56, r: 0.16, rb: 0.06, crown: 0.03 },
    { z: 0.5, hw: 0.32, y0: 0.09, y1: 0.5, r: 0.14, rb: 0.06, crown: 0.02 },
    { z: 0.6, hw: 0.25, y0: 0.1, y1: 0.42, r: 0.1, rb: 0.05 },
    { z: 1.0, hw: 0.2, y0: 0.12, y1: 0.4, r: 0.08, rb: 0.05 },
  ], { sub: 2, n: 2 }), (c, n) => (c.z < 0.39 && n.z < -0.5 ? DARK : n.y < -0.4 ? RED_D : RED)), 'paint');
  // grade do radiador
  b.add(quads(shell([
    { z: 0.98, hw: 0.2, y0: 0.11, y1: 0.58, r: 0.12, rb: 0.04 },
    { z: 1.06, hw: 0.21, y0: 0.1, y1: 0.6, r: 0.12, rb: 0.04 },
    { z: 1.085, hw: 0.19, y0: 0.12, y1: 0.58, r: 0.11, rb: 0.03 },
  ], { sub: 1, n: 3 }), (c, n) => (n.z > 0.8 ? BLACK : CHROME)), 'kart_metal');
  for (let i = 0; i < 5; i++) b.add(cbox(0.016, 0.38 - Math.abs(i - 2) * 0.04, 0.012), 'kart_metal', YELLOW, { p: [-0.11 + i * 0.055, 0.34 - Math.abs(i - 2) * 0.012, 1.09] });
  b.add(cyl(0.03, 0.022, 0.04, 8), 'kart_metal', CHROME, { p: [0, 0.615, 1.03] });
  // faróis em hastes
  for (const sg of [1, -1]) {
    b.addModel(headlight(0.075, RED, CHROME), { p: [sg * 0.31, 0.42, 1.0] });
    b.add(rod([sg * 0.2, 0.3, 0.96], [sg * 0.31, 0.36, 0.97], 0.014, 0.014, 5), 'kart_metal', STEEL);
  }

  /* motor exposto com blower */
  const eng = new Model();
  eng.add(cbox(0.3, 0.2, 0.36, 0.03), 'kart_metal', STEEL, { p: [0, 0.48, 0.74] });
  for (const sg of [1, -1]) {
    // cabeçotes em V + tampas de válvulas
    eng.add(cbox(0.14, 0.11, 0.34, 0.025), 'kart_metal', '#a4aab4', { p: [sg * 0.17, 0.5, 0.74], r: [0, 0, -sg * 0.6] });
    eng.add(shell([{ z: 0.58, hw: 0.05, y0: 0, y1: 0.05, r: 0.025 }, { z: 0.9, hw: 0.05, y0: 0, y1: 0.05, r: 0.025 }], { sub: 1, n: 1 }), 'paint', YELLOW, { p: [sg * 0.225, 0.53, 0], r: [0, 0, -sg * 0.6] });
    boltRow(eng, [sg * 0.25, 0.575, 0.62], [sg * 0.25, 0.575, 0.86], 3, 0.011, 'y', CHROME);
  }
  // blower (compressor) com nervuras
  eng.add(shell([{ z: 0.6, hw: 0.11, y0: 0.56, y1: 0.72, r: 0.05 }, { z: 0.88, hw: 0.11, y0: 0.56, y1: 0.72, r: 0.05 }], { sub: 1, n: 2 }), 'kart_metal', CHROME);
  for (let i = 0; i < 5; i++) eng.add(cbox(0.236, 0.13, 0.016, 0.006), 'kart_metal', STEEL, { p: [0, 0.645, 0.64 + i * 0.05] });
  // polia e correia
  eng.add(cyl(0.06, 0.06, 0.03, 12).rotateX(Math.PI / 2), 'kart_metal', CHROME, { p: [0, 0.64, 0.91] });
  eng.add(cyl(0.075, 0.075, 0.03, 12).rotateX(Math.PI / 2), 'kart_metal', STEEL, { p: [0, 0.46, 0.935] });
  eng.add(cbox(0.03, 0.2, 0.02), 'rubber', BLACK, { p: [0.064, 0.55, 0.925], r: [0, 0, -0.07] });
  eng.add(cbox(0.03, 0.2, 0.02), 'rubber', BLACK, { p: [-0.064, 0.55, 0.925], r: [0, 0, 0.07] });
  // tomada de ar (três bocais)
  eng.add(shell([{ z: 0.62, hw: 0.1, y0: 0.72, y1: 0.76, r: 0.02 }, { z: 0.86, hw: 0.1, y0: 0.72, y1: 0.76, r: 0.02 }], { sub: 1, n: 1 }), 'kart_metal', STEEL);
  eng.add(quads(shell([
    { z: 0.6, hw: 0.085, y0: 0.76, y1: 0.8, r: 0.02 },
    { z: 0.72, hw: 0.105, y0: 0.76, y1: 0.86, r: 0.04 },
    { z: 0.9, hw: 0.12, y0: 0.76, y1: 0.89, r: 0.04 },
  ], { sub: 2, n: 2 }), (c, n) => (n.z > 0.8 ? BLACK : YELLOW)), 'paint');
  for (const x of [-0.07, 0, 0.07]) eng.add(cyl(0.026, 0.026, 0.012, 8).rotateX(Math.PI / 2), 'kart_metal', CHROME, { p: [x, 0.825, 0.903] });
  b.addModel(eng);

  /* coletores + escapamentos laterais */
  const tips: V3[] = [];
  for (const sg of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const z = 0.62 + i * 0.08;
      bar(b, [[sg * 0.24, 0.5, z], [sg * 0.36, 0.44, z - 0.03], [sg * 0.41, 0.31, z - 0.14 - i * 0.02]], 0.022, i % 2 ? CHROME : '#c9ced6', 'kart_metal', false, 5, 2);
    }
    tips.push(exhaustPipe(b, [[sg * 0.41, 0.3, 0.62], [sg * 0.425, 0.27, 0.3], [sg * 0.425, 0.26, -0.1], [sg * 0.44, 0.27, -0.26]], 0.042, CHROME, BLACK));
    for (const z of [0.25, -0.05]) b.add(rod([sg * 0.34, 0.24, z], [sg * 0.42, 0.265, z], 0.012, 0.012, 5), 'kart_metal', STEEL);
    // escudo térmico perfurado
    b.add(cbox(0.012, 0.07, 0.3, 0.004), 'kart_metal', STEEL, { p: [sg * 0.472, 0.275, 0.12] });
    boltRow(b, [sg * 0.48, 0.275, 0.0], [sg * 0.48, 0.275, 0.24], 4, 0.012, 'x', BLACK);
  }

  /* painel + coluna */
  b.add(cbox(0.42, 0.1, 0.03, 0.015), 'paint', YELLOW, { p: [0, 0.6, 0.4], r: [-0.25, 0, 0] });
  for (const x of [-0.12, 0, 0.12]) {
    b.add(cyl(0.036, 0.036, 0.02, 10).rotateX(Math.PI / 2 - 0.25), 'kart_metal', CHROME, { p: [x, 0.605, 0.384] });
    b.add(cyl(0.028, 0.028, 0.022, 10).rotateX(Math.PI / 2 - 0.25), 'glossy', BLACK, { p: [x, 0.605, 0.382] });
  }
  b.addModel(steeringColumn(steeringCenter(seat), 0.3, CHROME));

  /* assento */
  b.addModel(buildSeat({ seat, col: BLACK, trim: YELLOW, shellCol: RED_D, backH: 0.46, mat: 'std', width: 0.48, lean: 10 }));

  /* traseira: tanque, santo-antônio e lanternas */
  b.add(latheX([[0.001, -0.27], [0.1, -0.26], [0.12, -0.22], [0.12, 0.22], [0.1, 0.26], [0.001, 0.27]], 12), 'paint', YELLOW, { p: [0, 0.32, -0.86] });
  for (const x of [-0.14, 0.14]) b.add(torus(0.122, 0.012, 4, 12).rotateY(Math.PI / 2), 'kart_metal', CHROME, { p: [x, 0.32, -0.86] });
  b.add(cyl(0.035, 0.035, 0.03, 8), 'kart_metal', CHROME, { p: [0.05, 0.445, -0.86] });
  bar(b, [[0.3, 0.6, -0.66], [0.29, 0.86, -0.7], [0.2, 0.95, -0.72], [0, 0.97, -0.72]], 0.024, CHROME, 'kart_metal', true, 6, 3);
  b.add(rod([0.24, 0.9, -0.72], [0.2, 0.3, -0.92], 0.016, 0.016, 5), 'kart_metal', STEEL);
  b.add(rod([-0.24, 0.9, -0.72], [-0.2, 0.3, -0.92], 0.016, 0.016, 5), 'kart_metal', STEEL);
  for (const sg of [1, -1]) {
    b.add(cyl(0.04, 0.035, 0.03, 10).rotateX(Math.PI / 2), 'glow_red', '#ff5a4a', { p: [sg * 0.2, 0.5, -0.762] });
    b.add(torus(0.04, 0.008, 4, 10), 'kart_metal', CHROME, { p: [sg * 0.2, 0.5, -0.775] });
  }
  // eixo traseiro e para-choque (nerf bar)
  b.add(rod([-0.4, rear.r, rear.z], [0.4, rear.r, rear.z], 0.035, 0.035, 8), 'kart_metal', STEEL);
  b.add(sphere(0.1, 10, 6), 'kart_metal', '#a4aab4', { p: [0, rear.r, rear.z] });
  bar(b, [[0.26, 0.22, -0.9], [0.27, 0.2, -1.04], [0.18, 0.2, -1.1], [0, 0.2, -1.11]], 0.02, CHROME, 'kart_metal', true, 6, 3);
  // eixo dianteiro rígido + para-choque
  b.add(rod([-0.5, 0.2, front.z], [0.5, 0.2, front.z], 0.022, 0.022, 6), 'kart_metal', CHROME);
  bar(b, [[0.2, 0.16, 1.02], [0.18, 0.16, 1.12], [0, 0.16, 1.15]], 0.018, CHROME, 'kart_metal', true, 6, 3);

  /* suspensão */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.2, armY: 0.2, topY: 0.4, topX: 0.2, armCol: CHROME, springCol: YELLOW, upper: false }));
  both(b, buildSuspension({ wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.3, armY: 0.2, topY: 0.56, topX: 0.3, armCol: STEEL, springCol: YELLOW, upper: false, armDz: 0.1 }));

  b.addModel(pedals(0.135, 0.3, CHROME));
  for (const sg of [1, -1]) boltRow(b, [sg * 0.352, 0.46, -0.2], [sg * 0.345, 0.43, 0.34], 4, 0.01, 'x', CHROME);

  const spec = { spokes: 5, sw0: 0.13, sw1: 0.085, st: 0.22, rimCol: CHROME, spokeCol: YELLOW, hubCol: RED, wellCol: '#33363d', lugs: 0, hubR: 0.24 };
  const wf = buildWheel({ r: front.r, w: front.w, grooves: 2, ...spec, wallBand: '#e9e4d6' });
  const wr = buildWheel({ r: rear.r, w: rear.w, grooves: 4, rim: 0.56, ...spec, wallBand: '#e9e4d6' });
  const steering = buildSteering({ rimCol: BLACK, spokeCol: CHROME, hubCol: STEEL, style: 'three', accent: YELLOW });
  return { body: b, wheelFront: wf, wheelRear: wr, steering, seat, front, rear, exhaustL: tips[0]!, exhaustR: tips[1]! };
}
