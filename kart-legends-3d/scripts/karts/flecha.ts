/** Flecha Rubra — kart de expedição: bico em flecha, bagageiro com mochila e mapa, farol redondo. */
import { Model, box, cyl, sphere, torus, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  bar, bolt, boltRow, both, cbox, quads, topStripe, buildSeat, buildSteering, buildSuspension, buildWheel, deg, exhaustPipe, fender, headlight,
  numberPlate, pedals, plateXZ, rod, shell, steeringColumn, tubShell,
} from './common';

const RED = '#e2542b', RED_D = '#b53c1c', CREAM = '#f6e2b8', CREAM_D = '#d9c08e', DARK = '#2b2f36', TAN = '#a9743f', OLIVE = '#6f7a45';

export function buildFlecha(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.36, -0.15];
  const front = { x: 0.62, z: 0.72, r: 0.29, w: 0.2 };
  const rear = { x: 0.61, z: -0.72, r: 0.31, w: 0.25 };

  /* banheira central (cockpit aberto) */
  b.add(quads(tubShell([
    { z: -0.5, hw: 0.36, y0: 0.085, y1: 0.47, r: 0.09, th: 0.035, fl: 0.045 },
    { z: -0.1, hw: 0.385, y0: 0.08, y1: 0.4, r: 0.09, th: 0.035, fl: 0.045 },
    { z: 0.3, hw: 0.375, y0: 0.08, y1: 0.41, r: 0.09, th: 0.035, fl: 0.045 },
    { z: 0.56, hw: 0.35, y0: 0.09, y1: 0.5, r: 0.09, th: 0.035, fl: 0.045 },
  ], { sub: 3, n: 2 }), (c, n) => (Math.abs(n.x) > 0.7 && Math.abs(c.x) > 0.36 && c.y > 0.2 && c.y < 0.33 ? CREAM : n.y > 0.7 && c.y < 0.2 ? DARK : c.y < 0.15 ? RED_D : RED)), 'paint');
  // tapete do piso
  b.add(cbox(0.5, 0.012, 0.62, 0.004), 'rubber', '#3a3d44', { p: [0, 0.131, 0.22] });
  for (let i = 0; i < 3; i++) b.add(box(0.44, 0.008, 0.02), 'rubber', '#565a63', { p: [0, 0.139, 0.04 + i * 0.18] });

  /* bico */
  b.add(quads(shell([
    { z: 0.5, hw: 0.355, y0: 0.09, y1: 0.54, r: 0.13, rb: 0.07, crown: 0.03 },
    { z: 0.6, hw: 0.34, y0: 0.09, y1: 0.585, r: 0.14, rb: 0.07, crown: 0.04 },
    { z: 0.8, hw: 0.27, y0: 0.1, y1: 0.5, r: 0.12, rb: 0.07, crown: 0.03 },
    { z: 0.98, hw: 0.17, y0: 0.13, y1: 0.39, r: 0.09, rb: 0.06, crown: 0.02 },
    { z: 1.1, hw: 0.1, y0: 0.16, y1: 0.31, r: 0.06 },
    { z: 1.16, hw: 0.05, y0: 0.19, y1: 0.27, r: 0.035 },
  ], { sub: 3, n: 3 }), (c, n, k) => {
    if (c.z < 0.502 && n.z < -0.5) return DARK;
    if (topStripe(k) && n.y > 0.3) return CREAM; // faixa central
    if (n.y < -0.3) return RED_D;
    return RED;
  }), 'paint');
  // entradas de ar no bico
  for (const sg of [1, -1]) {
    b.add(cbox(0.012, 0.05, 0.2, 0.005), 'matte', DARK, { p: [sg * 0.262, 0.33, 0.78], r: [0, sg * 0.32, sg * 0.1] });
    b.add(cbox(0.012, 0.05, 0.16, 0.005), 'matte', DARK, { p: [sg * 0.268, 0.25, 0.77], r: [0, sg * 0.32, sg * 0.1] });
  }
  /* ponta de flecha (para-choque/asa dianteira) */
  const head = plateXZ([[0, 1.25], [0.2, 1.1], [0.47, 0.99], [0.4, 1.065], [0.2, 1.06], [0.13, 0.99], [-0.13, 0.99], [-0.2, 1.06], [-0.4, 1.065], [-0.47, 0.99], [-0.2, 1.1]], 0.07, 0.014);
  b.add(head, 'paint', (p) => (p.y > 0.03 && Math.hypot(p.x * 0.7, p.z - 1.13) < 0.085 ? RED : CREAM), { p: [0, 0.2, 0] });
  b.add(plateXZ([[0, 1.275], [0.22, 1.105], [0.5, 0.985], [0.4, 1.085], [-0.4, 1.085], [-0.5, 0.985], [-0.22, 1.105]], 0.03, 0.008), 'rubber', '#3a3d44', { p: [0, 0.2, 0] });
  boltRow(b, [0.4, 0.238, 1.035], [0.16, 0.238, 1.115], 3, 0.013);
  boltRow(b, [-0.4, 0.238, 1.035], [-0.16, 0.238, 1.115], 3, 0.013);
  b.add(rod([0, 0.2, 1.0], [0, 0.22, 1.12], 0.035, 0.03, 8), 'kart_metal', '#8d939d');

  /* farol redondo de expedição + grade */
  const hl = headlight(0.1, RED, '#e8eaee');
  hl.add(rod([-0.1, 0, 0.03], [0.1, 0, 0.03], 0.007, 0.007, 4), 'kart_metal', '#e8eaee');
  hl.add(rod([0, -0.1, 0.03], [0, 0.1, 0.03], 0.007, 0.007, 5), 'kart_metal', '#e8eaee');
  b.addModel(hl, { p: [0, 0.66, 0.78], r: [deg(-6), 0, 0] });
  b.add(rod([0, 0.5, 0.74], [0, 0.6, 0.74], 0.03, 0.022, 8), 'kart_metal', '#8d939d');

  /* painel: quebra-vento, bússola e mostrador */
  b.add(shell([
    { z: 0.49, hw: 0.2, y0: 0.5, y1: 0.66, r: 0.05 },
    { z: 0.6, hw: 0.17, y0: 0.5, y1: 0.63, r: 0.05 },
  ], { sub: 1, n: 3 }), 'paint', (p, n) => (n.z < -0.5 ? CREAM_D : RED));
  for (const [x, c] of [[-0.1, '#f4f1e6'], [0.1, '#f4f1e6']] as [number, string][]) {
    b.add(cyl(0.042, 0.042, 0.014, 14).rotateX(Math.PI / 2), 'kart_metal', '#c9a24a', { p: [x, 0.59, 0.484] });
    b.add(cyl(0.034, 0.034, 0.016, 14).rotateX(Math.PI / 2), 'glossy', c, { p: [x, 0.59, 0.482] });
    b.add(box(0.006, 0.03, 0.004), 'glossy', '#d0342c', { p: [x + 0.006, 0.598, 0.472], r: [0, 0, x > 0 ? 0.7 : -0.5] });
  }
  b.add(cbox(0.5, 0.11, 0.012, 0.005), 'glass', '#cfe9ff', { p: [0, 0.69, 0.5], r: [deg(-22), 0, 0] });
  b.add(cbox(0.53, 0.02, 0.022, 0.008), 'kart_metal', CREAM, { p: [0, 0.632, 0.522], r: [deg(-22), 0, 0] });
  b.addModel(steeringColumn(steeringCenter(seat), 0.36, '#8d939d'));

  /* casulos laterais com entrada de ar */
  const pod = new Model();
  pod.add(quads(shell([
    { z: -0.38, hw: 0.075, y0: 0.09, y1: 0.33, r: 0.05, cx: 0.445 },
    { z: -0.1, hw: 0.1, y0: 0.085, y1: 0.33, r: 0.06, cx: 0.47 },
    { z: 0.2, hw: 0.1, y0: 0.085, y1: 0.31, r: 0.06, cx: 0.47 },
    { z: 0.4, hw: 0.075, y0: 0.09, y1: 0.26, r: 0.05, cx: 0.445 },
  ], { sub: 2, n: 3 }), (c, n) => (n.y > 0.8 ? CREAM : n.y < -0.3 ? RED_D : RED)), 'paint');
  pod.add(cbox(0.11, 0.11, 0.03, 0.02), 'matte', DARK, { p: [0.455, 0.19, 0.395] });
  for (let i = 0; i < 3; i++) pod.add(box(0.1, 0.012, 0.02), 'kart_metal', '#b9bec7', { p: [0.455, 0.158 + i * 0.032, 0.408] });
  numberPlate(pod, plate, 0.085, { p: [0.574, 0.21, -0.06], r: [0, Math.PI / 2, 0] });
  boltRow(pod, [0.565, 0.3, -0.3], [0.565, 0.29, 0.3], 3, 0.011, 'x');
  both(b, pod);

  /* assento */
  b.addModel(buildSeat({ seat, col: CREAM, trim: RED_D, shellCol: '#3b3f47', backH: 0.52, mat: 'kart_canvas' }));

  /* capô traseiro (motor) */
  b.add(quads(shell([
    { z: -0.36, hw: 0.36, y0: 0.09, y1: 0.47, r: 0.08, rb: 0.06 },
    { z: -0.52, hw: 0.37, y0: 0.09, y1: 0.56, r: 0.12, rb: 0.06, crown: 0.02 },
    { z: -0.8, hw: 0.35, y0: 0.1, y1: 0.55, r: 0.12, rb: 0.06, crown: 0.02 },
    { z: -1.0, hw: 0.3, y0: 0.13, y1: 0.46, r: 0.1, rb: 0.06 },
    { z: -1.06, hw: 0.26, y0: 0.16, y1: 0.4, r: 0.08 },
  ], { sub: 3, n: 3 }), (c, n, k) => (n.z < -0.6 && c.z < -1.0 ? RED_D : topStripe(k) && n.y > 0.3 ? CREAM : n.y < -0.3 ? RED_D : RED)), 'paint');
  // grelhas de ventilação nas laterais do capô
  for (const sg of [1, -1]) for (let i = 0; i < 4; i++) {
    b.add(cbox(0.012, 0.09, 0.022, 0.004), 'matte', DARK, { p: [sg * 0.357, 0.44, -0.6 - i * 0.05], r: [0.35, 0, 0] });
  }
  numberPlate(b, plate, 0.085, { p: [0, 0.3, -1.068], r: [0, Math.PI, 0] });
  b.add(cbox(0.12, 0.035, 0.02, 0.01), 'glow_red', '#ff5a4a', { p: [0.19, 0.36, -1.045], r: [0, deg(8), 0] });
  b.add(cbox(0.12, 0.035, 0.02, 0.01), 'glow_red', '#ff5a4a', { p: [-0.19, 0.36, -1.045], r: [0, deg(-8), 0] });

  /* bagageiro com mochila e mapa enrolado */
  const rackY = 0.615;
  bar(b, [[0.29, rackY - 0.06, -0.48], [0.3, rackY, -0.54], [0.3, rackY, -0.98], [0.26, rackY, -1.07], [0, rackY, -1.09]], 0.014, '#c9a24a', 'kart_metal', true, 5);
  for (const z of [-0.62, -0.78, -0.94]) b.add(rod([-0.3, rackY - 0.006, z], [0.3, rackY - 0.006, z], 0.01, 0.01, 6), 'kart_metal', '#c9a24a');
  for (const [x, z] of [[0.3, -0.56], [0.3, -0.95], [-0.3, -0.56], [-0.3, -0.95]] as [number, number][]) {
    b.add(rod([x * 0.93, 0.52, z], [x, rackY, z], 0.011, 0.011, 6), 'kart_metal', '#c9a24a');
  }
  // mochila
  const pack = new Model();
  pack.add(shell([
    { z: -0.15, hw: 0.17, y0: 0.0, y1: 0.24, r: 0.07, rb: 0.04 },
    { z: -0.1, hw: 0.2, y0: 0.0, y1: 0.29, r: 0.09, rb: 0.04, crown: 0.01 },
    { z: 0.08, hw: 0.2, y0: 0.0, y1: 0.3, r: 0.09, rb: 0.04, crown: 0.01 },
    { z: 0.14, hw: 0.17, y0: 0.0, y1: 0.25, r: 0.07, rb: 0.04 },
  ], { sub: 2, n: 3 }), 'kart_canvas', OLIVE);
  pack.add(cbox(0.36, 0.1, 0.24, 0.04), 'kart_canvas', '#59633a', { p: [0, 0.27, -0.005] }); // aba
  pack.add(cbox(0.24, 0.13, 0.05, 0.02), 'kart_canvas', '#59633a', { p: [0, 0.1, -0.165] }); // bolso
  for (const x of [-0.09, 0.09]) {
    pack.add(cbox(0.03, 0.2, 0.012, 0.004), 'std', TAN, { p: [x, 0.2, -0.158], r: [0.12, 0, 0] });
    pack.add(cbox(0.04, 0.03, 0.016, 0.004), 'kart_metal', '#d9c07a', { p: [x, 0.19, -0.166] });
  }
  pack.add(cbox(0.05, 0.03, 0.016, 0.004), 'kart_metal', '#d9c07a', { p: [0, 0.14, -0.193] });
  b.addModel(pack, { p: [0, rackY, -0.68], r: [0, deg(4), 0] });
  // mapa enrolado preso com fitas
  const map = new Model();
  map.add(cyl(0.045, 0.045, 0.5, 14).rotateZ(Math.PI / 2), 'std', '#f2e6c4');
  map.add(cyl(0.03, 0.03, 0.505, 8).rotateZ(Math.PI / 2), 'std', '#cbb98a');
  for (const x of [-0.14, 0.14]) map.add(torus(0.047, 0.008, 4, 10).rotateY(Math.PI / 2), 'std', RED_D, { p: [x, 0, 0] });
  b.addModel(map, { p: [0, rackY + 0.05, -0.98], r: [0, deg(-5), 0] });
  // lanterna e corda
  b.add(torus(0.07, 0.022, 5, 12).rotateX(Math.PI / 2), 'kart_canvas', '#d9c08e', { p: [0.2, rackY + 0.025, -0.9] });
  b.add(torus(0.07, 0.022, 5, 12).rotateX(Math.PI / 2), 'kart_canvas', '#cbb07a', { p: [0.2, rackY + 0.06, -0.9], r: [0, 0.5, 0] });

  /* para-lamas */
  const fr = new Model();
  fr.add(quads(fender(rear.r + 0.03, -105, 48, (t) => ({ hw: 0.125 + 0.02 * Math.sin(t * Math.PI), th: 0.022, crown: 0.02 }), 9), (c) => (Math.abs(c.x) < 0.04 ? CREAM : RED)), 'paint', undefined, { p: [rear.x, rear.r, rear.z] });
  fr.add(rod([0.36, 0.42, -0.66], [rear.x - 0.08, rear.r + rear.r + 0.03, -0.7], 0.012, 0.012, 6), 'kart_metal', '#8d939d');
  fr.add(rod([0.36, 0.38, -0.86], [rear.x - 0.08, rear.r + rear.r * 0.86, -0.9], 0.012, 0.012, 6), 'kart_metal', '#8d939d');
  const ff = new Model();
  ff.add(fender(front.r + 0.028, -62, 40, (t) => ({ hw: 0.1 + 0.015 * Math.sin(t * Math.PI), th: 0.02, crown: 0.018 }), 7), 'paint', CREAM, { p: [front.x, front.r, front.z] });
  ff.add(rod([front.x - 0.14, front.r + 0.02, front.z], [front.x - 0.1, front.r * 2 + 0.03, front.z], 0.011, 0.011, 6), 'kart_metal', '#8d939d');
  both(b, fr); both(b, ff);

  /* suspensão */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.25, armY: 0.2, topY: 0.46, topX: 0.24, armCol: '#8d939d', springCol: '#f2c14e' }));
  both(b, buildSuspension({ upper: false, wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.32, armY: 0.2, topY: 0.47, topX: 0.33, armCol: '#8d939d', springCol: '#f2c14e' }));

  /* escapamentos */
  const tipL = exhaustPipe(b, [[0.2, 0.22, -0.8], [0.22, 0.2, -0.96], [0.23, 0.2, -1.08], [0.23, 0.21, -1.14]], 0.03, '#c9ced6');
  const tipR = exhaustPipe(b, [[-0.2, 0.22, -0.8], [-0.22, 0.2, -0.96], [-0.23, 0.2, -1.08], [-0.23, 0.21, -1.14]], 0.03, '#c9ced6');

  /* para-choque traseiro */
  bar(b, [[0.4, 0.3, -0.98], [0.44, 0.28, -1.08], [0.36, 0.27, -1.15], [0, 0.27, -1.17]], 0.022, '#8d939d', 'kart_metal', true);
  for (const x of [0.3, -0.3]) b.add(rod([x, 0.27, -1.02], [x, 0.27, -1.16], 0.014, 0.014, 6), 'kart_metal', '#6b717b');

  /* pedais */
  b.addModel(pedals(0.13, 0.46));
  // parafusos da borda do cockpit
  b.add(bolt(0.02, 0.02, 'z'), 'kart_metal', '#c9a24a', { p: [0, 0.23, 1.165] });
  b.add(sphere(0.03, 10, 8), 'kart_metal', '#c9a24a', { p: [0, 0.23, 1.165] });

  const wheelFront = buildWheel({ r: front.r, w: front.w, spokes: 5, sw0: 0.11, sw1: 0.065, rimCol: '#d9dce2', spokeCol: CREAM, hubCol: RED });
  const wheelRear = buildWheel({ r: rear.r, w: rear.w, spokes: 5, sw0: 0.11, sw1: 0.065, rimCol: '#d9dce2', spokeCol: CREAM, hubCol: RED });
  const steering = buildSteering({ rimCol: '#3a3028', spokeCol: '#c9ced6', hubCol: '#8d939d', accent: RED });
  return { body: b, wheelFront, wheelRear, steering, seat, front, rear, exhaustL: tipL, exhaustR: tipR };
}
