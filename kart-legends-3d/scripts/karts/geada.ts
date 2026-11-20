/** Lâmina de Geada — trenó-kart anguloso: patins laterais, cristais de gelo e spoiler em lâmina. */
import { Model, cone, cyl, flat, type V3 } from '../lib/geo';
import { steeringCenter, type KartParts } from './assemble';
import {
  both, buildSeat, buildSteering, buildSuspension, buildWheel, cbox, exhaustPipe, fender, numberPlate, pedals, plateXZ, profileX,
  quads, rod, shell, steeringColumn, tubShell,
} from './common';

const ICE = '#58c7e8', ICE_L = '#b8ecfa', ICE_D = '#2e8fb4', GRAPH = '#27364a', GRAPH_L = '#42566f', STEELB = '#c7d6e2', WHITE = '#f1fbff';

/** Cristal de gelo: bipirâmide hexagonal alongada, base na origem. */
function crystal(h: number, r: number): Model {
  const m = new Model();
  m.add(flat(cone(r, h * 0.72, 6).translate(0, h * 0.64, 0)), 'glow_cyan', '#9fe6f7');
  m.add(flat(cone(r, h * 0.28, 6).rotateX(Math.PI).translate(0, h * 0.14, 0)), 'glow_cyan', '#6fcfe9');
  return m;
}

export function buildGeada(plate: string): KartParts {
  const b = new Model();
  const seat: V3 = [0, 0.33, -0.18];
  const front = { x: 0.62, z: 0.76, r: 0.28, w: 0.18 };
  const rear = { x: 0.61, z: -0.7, r: 0.3, w: 0.24 };
  const facet = (keys: Parameters<typeof shell>[0], fn: Parameters<typeof quads>[1]): ReturnType<typeof flat> => quads(flat(shell(keys, { sub: 1, n: 0 })), fn);

  /* banheira facetada */
  b.add(quads(flat(tubShell([
    { z: -0.56, hw: 0.33, y0: 0.08, y1: 0.46, r: 0.06, th: 0.03, fl: 0.04, wt: 1.1 },
    { z: -0.1, hw: 0.35, y0: 0.075, y1: 0.36, r: 0.06, th: 0.03, fl: 0.04, wt: 1.1 },
    { z: 0.3, hw: 0.34, y0: 0.075, y1: 0.36, r: 0.06, th: 0.03, fl: 0.04, wt: 1.1 },
    { z: 0.5, hw: 0.31, y0: 0.08, y1: 0.46, r: 0.06, th: 0.03, fl: 0.04, wt: 1.08 },
  ], { sub: 1, n: 1 })), (c, n) => (n.y > 0.7 && c.y < 0.16 ? GRAPH : n.y > 0.8 ? ICE_L : c.y < 0.17 ? GRAPH : ICE)), 'paint');

  /* bico em cunha */
  b.add(facet([
    { z: 0.45, hw: 0.325, y0: 0.08, y1: 0.5, r: 0.09, rb: 0.04 },
    { z: 0.58, hw: 0.31, y0: 0.08, y1: 0.5, r: 0.11, rb: 0.04 },
    { z: 0.88, hw: 0.23, y0: 0.09, y1: 0.33, r: 0.07, rb: 0.03 },
    { z: 1.1, hw: 0.19, y0: 0.1, y1: 0.19, r: 0.03 },
    { z: 1.17, hw: 0.14, y0: 0.11, y1: 0.15, r: 0.012 },
  ], (c, n) => (c.z < 0.452 && n.z < -0.5 ? GRAPH : n.y < -0.3 ? GRAPH : Math.abs(n.x) > 0.55 ? ICE_D : n.y > 0.85 ? ICE_L : ICE)), 'paint');
  // crista central (lâmina) + cristal na ponta
  b.add(profileX([[0.5, 0.5], [0.6, 0.56], [0.9, 0.36], [1.14, 0.2], [1.19, 0.13], [1.1, 0.15], [0.86, 0.3]], 0.03, 0.01), 'paint', GRAPH);
  b.add(profileX([[0.62, 0.54], [0.88, 0.37], [0.85, 0.34], [0.6, 0.5]], 0.04, 0.004), 'glow_cyan', '#8fe0f5');
  // lâmina dianteira (splitter) + pontas de trenó curvadas
  b.add(plateXZ([[-0.44, 0.98], [-0.3, 1.16], [0.3, 1.16], [0.44, 0.98], [0.3, 1.04], [-0.3, 1.04]], 0.024, 0.006), 'kart_metal', STEELB, { p: [0, 0.1, 0] });
  for (const sg of [1, -1]) {
    b.add(profileX([[0.96, 0.085], [1.12, 0.09], [1.21, 0.16], [1.24, 0.3], [1.2, 0.3], [1.17, 0.19], [1.1, 0.125], [0.96, 0.12]], 0.035, 0.008), 'kart_metal', STEELB, { p: [sg * 0.33, 0, 0] });
    b.add(rod([sg * 0.33, 0.29, 1.21], [sg * 0.2, 0.2, 1.08], 0.01, 0.01, 4), 'kart_metal', GRAPH_L);
    b.add(cbox(0.012, 0.04, 0.2, 0.004), 'glow_cyan', '#8fe0f5', { p: [sg * 0.283, 0.3, 0.72], r: [0.48, sg * 0.27, 0] });
  }

  /* patins laterais decorativos */
  const skate = new Model();
  skate.add(profileX([[-0.4, 0.078], [0.3, 0.078], [0.43, 0.13], [0.47, 0.24], [0.43, 0.24], [0.39, 0.15], [0.28, 0.1], [-0.4, 0.1], [-0.46, 0.085]], 0.03, 0.008), 'kart_metal', STEELB, { p: [0.49, 0, 0] });
  skate.add(profileX([[-0.36, 0.1], [0.3, 0.1], [0.4, 0.17], [0.36, 0.2], [0.2, 0.16], [-0.3, 0.17]], 0.05, 0.012), 'paint', GRAPH, { p: [0.49, 0, 0] });
  skate.add(cbox(0.012, 0.022, 0.5, 0.004), 'glow_cyan', '#8fe0f5', { p: [0.519, 0.135, -0.04] });
  for (const z of [-0.26, 0.16]) {
    skate.add(rod([0.36, 0.26, z], [0.49, 0.15, z], 0.016, 0.016, 5), 'kart_metal', GRAPH_L);
    skate.add(rod([0.36, 0.14, z + 0.06], [0.49, 0.14, z + 0.02], 0.012, 0.012, 4), 'kart_metal', GRAPH_L);
  }
  numberPlate(skate, plate, 0.075, { p: [0.378, 0.25, -0.02], r: [0, Math.PI / 2, 0] }, GRAPH_L);
  both(b, skate);

  /* painel + coluna */
  b.add(flat(cbox(0.4, 0.1, 0.04, 0.015)), 'paint', GRAPH, { p: [0, 0.53, 0.47], r: [-0.4, 0, 0] });
  b.add(cbox(0.16, 0.05, 0.01, 0.006), 'glow_cyan', '#a8ecfb', { p: [0, 0.535, 0.447], r: [-0.4, 0, 0] });
  b.add(flat(plateXZ([[-0.26, 0], [0.26, 0], [0.16, 0.14], [-0.16, 0.14]], 0.012)), 'glass', ICE_L, { p: [0, 0.56, 0.5], r: [-1.05, 0, 0] });
  b.addModel(steeringColumn(steeringCenter(seat), 0.34, STEELB));

  /* assento */
  b.addModel(buildSeat({ seat, col: GRAPH_L, trim: ICE, shellCol: GRAPH, backH: 0.5, lean: 16, mat: 'cloth', width: 0.48 }));

  /* capô traseiro facetado */
  b.add(facet([
    { z: -0.5, hw: 0.33, y0: 0.08, y1: 0.48, r: 0.07, rb: 0.04 },
    { z: -0.6, hw: 0.325, y0: 0.085, y1: 0.58, r: 0.12, rb: 0.04 },
    { z: -0.9, hw: 0.28, y0: 0.11, y1: 0.5, r: 0.1, rb: 0.05 },
    { z: -1.06, hw: 0.2, y0: 0.15, y1: 0.36, r: 0.06 },
  ], (c, n) => (n.z < -0.75 ? GRAPH : n.y < -0.3 ? GRAPH : Math.abs(n.x) > 0.55 ? ICE_D : n.y > 0.85 ? ICE_L : ICE)), 'paint');
  for (const sg of [1, -1]) for (let i = 0; i < 3; i++) b.add(cbox(0.012, 0.03, 0.12, 0.004), 'matte', GRAPH, { p: [sg * (0.318 - i * 0.012), 0.36 + i * 0.05, -0.74 - i * 0.02], r: [0.3, sg * -0.12, 0] });
  b.add(cbox(0.24, 0.03, 0.012, 0.006), 'glow_red', '#ff6a5a', { p: [0, 0.3, -1.066] });

  /* spoiler em lâmina */
  const wing = profileX([[-0.84, 0.86], [-1.0, 0.875], [-1.14, 0.93], [-1.1, 0.9], [-0.98, 0.85], [-0.84, 0.835]], 1.3, 0.008);
  b.add(flat(wing), 'paint', (p) => (Math.abs(p.x) > 0.52 ? ICE_D : p.z < -1.02 ? ICE_L : ICE));
  for (const sg of [1, -1]) {
    b.add(flat(profileX([[-0.8, 0.8], [-1.0, 0.78], [-1.2, 0.98], [-1.16, 1.0], [-0.98, 0.96], [-0.78, 0.9]], 0.022, 0.004)), 'paint', GRAPH, { p: [sg * 0.655, 0, 0] });
    b.add(flat(profileX([[-0.7, 0.5], [-0.92, 0.46], [-1.02, 0.86], [-0.92, 0.86]], 0.03, 0.006)), 'paint', GRAPH, { p: [sg * 0.2, 0, 0] });
    b.add(cbox(0.012, 0.02, 0.2, 0.004), 'glow_cyan', '#8fe0f5', { p: [sg * 0.668, 0.9, -1.0], r: [0.3, 0, 0] });
  }

  /* cristais de gelo (discretos) */
  for (const [x, y, z, h, rx, rz] of [[0.2, 0.5, -0.86, 0.2, -0.5, -0.5], [0.26, 0.48, -0.78, 0.13, -0.2, -0.9], [0.14, 0.5, -0.95, 0.11, -0.9, -0.2], [-0.2, 0.5, -0.86, 0.2, -0.5, 0.5], [-0.26, 0.48, -0.78, 0.13, -0.2, 0.9], [-0.14, 0.5, -0.95, 0.11, -0.9, 0.2]] as number[][]) {
    b.addModel(crystal(h!, h! * 0.24), { p: [x!, y!, z!], r: [rx!, 0, rz!] });
  }
  b.addModel(crystal(0.1, 0.022), { p: [0, 0.13, 1.17], r: [1.25, 0, 0] });

  /* para-lamas angulosos */
  const ff = new Model();
  ff.add(quads(flat(fender(front.r + 0.03, -70, 50, (t) => ({ hw: 0.1, th: 0.018, dr: t > 0.8 ? (t - 0.8) * 0.3 : 0 }), 4)), (c) => (Math.abs(c.x) < 0.035 ? ICE : GRAPH)), 'paint', undefined, { p: [front.x, front.r, front.z] });
  ff.add(rod([front.x - 0.13, front.r + 0.03, front.z], [front.x - 0.09, front.r * 2 + 0.03, front.z], 0.011, 0.011, 4), 'kart_metal', GRAPH_L);
  both(b, ff);
  const fr = new Model();
  fr.add(quads(flat(fender(rear.r + 0.03, -100, 40, (t) => ({ hw: 0.13, th: 0.02, dr: t < 0.2 ? (0.2 - t) * 0.4 : 0 }), 5)), (c) => (Math.abs(c.x) < 0.045 ? ICE : GRAPH)), 'paint', undefined, { p: [rear.x, rear.r, rear.z] });
  fr.add(rod([0.33, 0.44, -0.7], [rear.x - 0.1, rear.r * 2 + 0.03, -0.7], 0.012, 0.012, 4), 'kart_metal', GRAPH_L);
  both(b, fr);

  /* suspensão */
  both(b, buildSuspension({ wheel: [front.x, front.r, front.z], wheelW: front.w, inner: 0.22, armY: 0.17, topY: 0.36, topX: 0.2, armCol: GRAPH_L, springCol: ICE }));
  both(b, buildSuspension({ wheel: [rear.x, rear.r, rear.z], wheelW: rear.w, inner: 0.3, armY: 0.19, topY: 0.45, topX: 0.3, armCol: GRAPH_L, springCol: ICE, upper: false }));

  /* escapamentos sextavados + para-choque traseiro */
  const tipL = exhaustPipe(b, [[0.12, 0.24, -0.9], [0.13, 0.21, -1.04], [0.13, 0.21, -1.13]], 0.032, STEELB, GRAPH);
  const tipR = exhaustPipe(b, [[-0.12, 0.24, -0.9], [-0.13, 0.21, -1.04], [-0.13, 0.21, -1.13]], 0.032, STEELB, GRAPH);
  b.add(flat(plateXZ([[-0.4, -1.0], [0.4, -1.0], [0.3, -1.17], [-0.3, -1.17]], 0.03, 0.008)), 'kart_metal', GRAPH_L, { p: [0, 0.12, 0] });
  b.add(cyl(0.02, 0.02, 0.5, 6).rotateZ(Math.PI / 2), 'kart_metal', STEELB, { p: [0, 0.145, -1.165] });

  b.addModel(pedals(0.115, 0.42, STEELB));

  const spec = { spokes: 6, sw0: 0.14, sw1: 0.03, st: 0.16, sweep: 0.35, rimCol: GRAPH_L, spokeCol: ICE, hubCol: WHITE, wellCol: GRAPH, lugs: 16, lugRows: 2 as const, lugH: 0.008, lugLen: 0.3, lugCol: '#7d93a6', grooves: 0, hubR: 0.22, nuts: 6 };
  const wf = buildWheel({ r: front.r, w: front.w, ...spec });
  const wr = buildWheel({ r: rear.r, w: rear.w, ...spec });
  const steering = buildSteering({ rimCol: GRAPH, spokeCol: STEELB, hubCol: GRAPH_L, style: 'yoke', accent: ICE });
  return { body: b, wheelFront: wf, wheelRear: wr, steering, seat, front, rear, exhaustL: tipL, exhaustR: tipR };
}
