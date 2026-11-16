/**
 * FORTALEZA TEMPESTADE — castelo fantástico original sob relâmpagos (Copa Eclipse).
 */
import { Model, box, cone, cyl, extrude, gradY, ico, lathe, mix, sphere, torus, tube, type ColorLike } from '../lib/geo';
import { TAU, archOutline, blob, capped, fora, loft, polar, revolve, ngon, panel, pick, prism, rectPts, ri, rr, shade, uvBox, uvScale, vary, type Rand } from './kit-eclipse';
import type { PropLibrary } from './types';

const PEDRA_ESC = '#77728f', PEDRA_CLARA = '#c4c0dc', PEDRA_QUINA = '#d9d5ea';
const ARDOSIA_A = '#3f4378', ARDOSIA_B = '#8576c4';

/** Seteira com moldura de pedra e fresta de luz violeta. */
function seteira(m: Model, a: number, r: number, y: number, h = 1.8, w = 0.34): void {
  m.add(prism(rectPts(w + 0.5, 0.4, 0.1), -h / 2 - 0.3, h / 2 + 0.3, { cap: 'both' }), 'ecl_pedra', PEDRA_QUINA, { p: polar(a, r, y), r: [0, fora(a), 0] });
  m.add(box(w, h, 0.1), 'glow_violet', '#ffffff', { p: polar(a, r + 0.2, y), r: [0, fora(a), 0] });
  m.add(box(w + 0.7, 0.22, 0.5), 'ecl_pedra', PEDRA_QUINA, { p: polar(a, r + 0.06, y - h / 2 - 0.36), r: [0, fora(a), 0] });
}

/** Telhado cônico côncavo de ardósia com beiral, pináculo e esfera. */
function telhadoConico(m: Model, r: number, y: number, h: number, seg = 16, orb = 'glow_violet'): void {
  m.add(revolve([[r * 1.14, y - 0.1], [r * 1.08, y + 0.25], [r * 0.74, y + h * 0.26], [r * 0.42, y + h * 0.52], [r * 0.18, y + h * 0.78], [0.03, y + h]], seg, { uv: 2.6 }), 'ecl_ardosia', gradY(ARDOSIA_A, ARDOSIA_B, y, y + h));
  m.add(cyl(r * 1.14, r * 1.1, 0.22, seg), 'ecl_pedra', '#55506e', { p: [0, y - 0.2, 0] });
  m.add(cyl(0.04, 0.1, h * 0.22, 6), 'paint', '#c9b46a', { p: [0, y + h + h * 0.08, 0] });
  m.add(ico(Math.max(0.16, r * 0.07), 1), orb, '#ffffff', { p: [0, y + h + h * 0.2, 0] });
}

function torreFortaleza(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 22, 33), r = rr(rand, 4.0, 4.7);
  const esc = vary(PEDRA_ESC, rand, 0.04), clara = vary(PEDRA_CLARA, rand, 0.04);
  const rAt = (y: number): number => (y < 4 ? r * (1.3 - 0.3 * (y / 4)) : r * (1 - 0.06 * ((y - 4) / (H - 4))));
  // fuste com base alargada e coroa em mísula
  m.add(revolve([[r * 1.34, -0.2], [r * 1.32, 1.1], [r * 1.14, 2.4], [r * 1.05, 3.2], [r, 4], [r * 0.94, H - 2.6], [r * 0.96, H - 1.8], [r * 1.24, H - 0.3], [r * 1.3, H + 0.2]], 20, { uv: 4 }), 'ecl_pedra', shade(esc, clara, 0, H * 1.1));
  for (const y of [4, H * 0.42, H * 0.7]) m.add(torus(rAt(y) + 0.05, 0.24, 5, 20), 'ecl_pedra', PEDRA_QUINA, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
  // contrafortes na base
  const nb = ri(rand, 4, 5), ab = rand() * TAU;
  for (let i = 0; i < nb; i++) {
    const a = ab + (i + 0.5) * (TAU / nb);
    m.add(uvBox(prism(rectPts(1.7, 2.6, 0.3), -0.2, rr(rand, 6, 8.5), { top: 0.5, shift: [0, -1.1] }), 3), 'ecl_pedra', shade(esc, PEDRA_QUINA, 0, 9), { p: polar(a, r * 1.24, 0), r: [0, fora(a), 0] });
  }
  // galeria com ameias
  const rg = r * 1.3;
  m.add(revolve([[rg, H + 0.2], [rg, H + 1.5], [rg - 0.7, H + 1.5], [rg - 0.7, H + 0.5], [0, H + 0.5]], 20, { uv: 4, smooth: false }), 'ecl_pedra', shade(clara, PEDRA_QUINA, H, H + 2));
  const nm = 10;
  for (let i = 0; i < nm; i++) {
    const a = (i / nm) * TAU;
    m.add(uvBox(prism(rectPts(1.25, 0.72, 0.12), 0, 1.25, { top: 0.86 }), 2.5), 'ecl_pedra', gradY(clara, PEDRA_QUINA, 0, 1.2), { p: polar(a, rg - 0.36, H + 1.5), r: [0, fora(a), 0] });
    m.add(box(0.5, 0.9, 0.7), 'ecl_pedra', esc, { p: polar(a + TAU / nm / 2, r * 1.12, H - 0.75), r: [0.5, fora(a + TAU / nm / 2), 0] });
  }
  // tambor superior e telhado
  const rd = r * 0.8, hd = rr(rand, 4.2, 5.4), hr = rr(rand, 9, 12);
  m.add(revolve([[rd, H + 0.4], [rd * 0.98, H + hd - 0.5], [rd * 1.1, H + hd]], 16, { uv: 4 }), 'ecl_pedra', shade(esc, clara, H, H + hd));
  for (let i = 0; i < 4; i++) seteira(m, ab + i * (TAU / 4) + 0.4, rd - 0.12, H + hd * 0.52, 1.7, 0.5);
  telhadoConico(m, rd, H + hd, hr);
  // estandarte de topo
  const yb = H + hd + hr * 1.12;
  m.add(cyl(0.035, 0.035, 2.4, 5), 'paint', '#c9b46a', { p: [0, yb + 0.6, 0] });
  m.add(extrude([[0, 0], [2.3, -0.2], [1.7, -0.55], [2.4, -0.95], [0, -1.1]], 0.04), 'cloth', gradY('#6a2bb8', '#c04ad6', -1.1, 0), { p: [0.04, yb + 1.7, 0] });
  // seteiras em espiral
  const ns = ri(rand, 6, 8), a0 = rand() * TAU;
  for (let i = 0; i < ns; i++) {
    const y = 7 + ((H - 11) * i) / (ns - 1);
    seteira(m, a0 + i * 1.9, rAt(y) - 0.14, y);
  }
  // porta voltada para +Z
  const zf = rAt(1.5);
  m.add(extrude(archOutline(2, 2.4, 1.0, 0.55, 0.5, 8), 0.9, 0.05), 'ecl_pedra', PEDRA_QUINA, { p: [0, 0, zf - 0.05] });
  m.add(box(2.1, 3.4, 0.2), 'ecl_madeira', gradY('#4a2f2a', '#7a4d38', 0, 3.4), { p: [0, 1.7, zf] });
  for (const y of [0.9, 2.3]) m.add(box(2.0, 0.16, 0.06), 'paint', '#3b3948', { p: [0, y, zf + 0.12] });
  m.add(torus(0.16, 0.035, 5, 10), 'paint', '#c9b46a', { p: [0.5, 1.6, zf + 0.14] });
  m.add(cyl(2.3, 2.5, 0.22, 14), 'ecl_pedra', clara, { p: [0, 0.0, zf + 0.5] });
  // estandarte pendurado acima da porta
  const yh = Math.min(H * 0.55, 13);
  m.add(cyl(0.05, 0.05, 2.2, 6), 'paint', '#c9b46a', { p: [0, yh, rAt(yh) + 0.35], r: [0, 0, Math.PI / 2] });
  m.add(extrude([[-0.85, 0], [0.85, 0], [0.85, -4.6], [0, -5.5], [-0.85, -4.6]], 0.05), 'cloth', gradY('#3b1d7a', '#8a3fd0', -5.5, 0), { p: [0, yh - 0.05, rAt(yh - 2.5) + 0.3] });
  m.add(prism(ngon(0.42, 4), 0, 0.04, { cap: 'both' }), 'glow_warm', '#ffffff', { p: [0, yh - 2.3, rAt(yh - 2.5) + 0.34], r: [Math.PI / 2, 0, 0] });
  // guarita lateral em balanço
  if (rand() < 0.75) {
    const a = a0 + 2.6, y = H * rr(rand, 0.55, 0.68), rt = 1.35, c = polar(a, rAt(y) + 0.75, 0);
    const g = new Model();
    g.add(revolve([[0.1, y - 2.6], [rt * 0.7, y - 1.2], [rt, y], [rt, y + 3.2], [rt * 1.12, y + 3.5]], 10, { uv: 4 }), 'ecl_pedra', shade(esc, clara, y - 2.6, y + 3.5));
    telhadoConico(g, rt, y + 3.5, 3.6, 10);
    m.addModel(g, { p: [c[0], 0, c[2]] });
    seteira(m, a, rAt(y) + 0.75 + rt - 0.14, y + 1.8, 1.2, 0.26);
  }
  return m;
}

export const FORTALEZA_PROPS: PropLibrary = {
  'torre-fortaleza': { build: torreFortaleza, radius: 7.5, collider: { radius: 6, height: 30 } },
};

void [cone, mix, sphere, tube, blob, capped, loft, panel, pick];
export type { ColorLike };
