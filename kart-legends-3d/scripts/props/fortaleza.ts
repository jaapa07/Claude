/**
 * FORTALEZA TEMPESTADE — castelo fantástico original sob relâmpagos (Copa Eclipse).
 */
import { Model, box, cone, cyl, extrude, gradY, ico, mix, plane, torus, tube, warp, type V3 } from '../lib/geo';
import { TAU, archOutline, blob, fora, loft, polar, revolve, ngon, panel, pick, prism, rectPts, ri, rr, shade, uvBox, vary, type P2, type Rand } from './kit-eclipse';
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


const FERRO = '#3b3948', FERRO_CLARO = '#6f6c82', OURO = '#c9b46a';
const pedra = (y0: number, y1: number) => shade(PEDRA_ESC, PEDRA_CLARA, y0, y1, 0.2);

/** Ameia (merlão) de pedra com topo chanfrado. */
function ameia(m: Model, x: number, y: number, z: number, w = 1.1, h = 1.1, d = 0.7, ry = 0): void {
  m.add(uvBox(prism(rectPts(w, d, 0.1), 0, h, { top: 0.84 }), 2.5), 'ecl_pedra', gradY(PEDRA_CLARA, PEDRA_QUINA, 0, h), { p: [x, y, z], r: [0, ry, 0] });
}

/** Chama estilizada (três camadas). */
function chama(m: Model, rand: Rand, x: number, y: number, z: number, s = 1): void {
  const lingua = (r: number, h: number, mat: string, dx: number): void => {
    m.add(revolve([[0.001, 0], [r * 0.8, h * 0.1], [r, h * 0.26], [r * 0.8, h * 0.5], [r * 0.34, h * 0.78], [0.001, h]], 7).translate(0, 0, 0), mat, '#ffffff', { p: [x + dx, y, z], r: [rr(rand, -0.12, 0.12), rand() * 3, rr(rand, -0.12, 0.12)] });
  };
  lingua(0.34 * s, 1.15 * s, 'ecl_chama', 0);
  lingua(0.2 * s, 0.7 * s, 'ecl_chama', 0.2 * s);
  lingua(0.18 * s, 0.6 * s, 'ecl_chama', -0.19 * s);
  lingua(0.22 * s, 0.8 * s, 'glow_warm', 0);
  lingua(0.11 * s, 0.42 * s, 'glow_white', 0);
}

/** Pano de estandarte ondulado, pendurado a partir de y=0 para baixo, voltado para +Z. */
function pano(_rand: Rand, w: number, h: number, cor: string): Model {
  const m = new Model();
  const g = warp(plane(w, h, 4, 8), (p) => {
    const t = 0.5 - p.y / h;
    p.z = Math.sin(t * 5 + p.x * 2) * 0.1 * t;
    const ponta = Math.max(0, t - 0.86) / 0.14;
    p.y = -t * h + ponta * Math.abs(p.x / (w / 2)) * h * 0.14;
  });
  m.add(g, 'leaf', (p) => (Math.abs(p.x) > w * 0.4 ? OURO : mix(cor, '#1a0d3a', Math.min(1, -p.y / h) * 0.5)));
  // emblema original: relâmpago dentro de um losango
  m.add(prism(ngon(w * 0.3, 4), -0.02, 0.02, { cap: 'both' }), 'leaf', OURO, { p: [0, -h * 0.36, 0.06], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.3] });
  m.add(extrude([[0.06, 0.3], [-0.14, -0.04], [0, -0.04], [-0.08, -0.34], [0.14, 0.04], [0, 0.04]], 0.03), 'glow_violet', '#ffffff', { p: [0, -h * 0.36, 0.1], s: w * 0.6 });
  return m;
}

function muralha(rand: Rand): Model {
  const m = new Model();
  const L = 12, H = 9, D = 2.6;
  const perfil: P2[] = [[-D / 2 - 0.5, -0.2], [-D / 2 - 0.5, 0.6], [-D / 2, 2.2], [-D / 2, H - 0.9], [-D / 2 - 0.35, H - 0.4], [-D / 2 - 0.35, H], [D / 2 + 0.35, H], [D / 2 + 0.35, H - 0.4], [D / 2, H - 0.9], [D / 2, 2.2], [D / 2 + 0.5, 0.6], [D / 2 + 0.5, -0.2]];
  m.add(uvBox(extrude(perfil, L), 4), 'ecl_pedra', pedra(0, H), { r: [0, -Math.PI / 2, 0] });
  // parapeitos e ameias dos dois lados
  for (const s of [-1, 1]) {
    const z = s * (D / 2 + 0.02);
    m.add(uvBox(box(L, 0.9, 0.55), 4), 'ecl_pedra', PEDRA_CLARA, { p: [0, H + 0.45, z] });
    for (let i = 0; i < 5; i++) ameia(m, -L / 2 + 1.2 + i * 2.4, H + 0.9, z, 1.3, 1.1, 0.6);
    // mísulas sob o adarve
    for (let i = 0; i < 8; i++) m.add(box(0.4, 0.6, 0.5), 'ecl_pedra', PEDRA_ESC, { p: [-L / 2 + 0.75 + i * 1.5, H - 0.75, s * (D / 2 + 0.1)], r: [s * 0.5, 0, 0] });
  }
  // contrafortes na face frontal
  for (const x of [-L / 2 + 1.6, L / 2 - 1.6]) {
    m.add(uvBox(prism(rectPts(1.6, 1.5, 0.2), -0.2, H * rr(rand, 0.62, 0.74), { top: 0.55, shift: [0, -0.5] }), 4), 'ecl_pedra', shade(PEDRA_ESC, PEDRA_QUINA, 0, H * 0.8), { p: [x, 0, D / 2 + 0.6] });
    m.add(uvBox(prism(rectPts(1.3, 1.1, 0.2), -0.2, H * 0.5, { top: 0.55, shift: [0, 0.4] }), 4), 'ecl_pedra', shade(PEDRA_ESC, PEDRA_QUINA, 0, H * 0.6), { p: [x, 0, -D / 2 - 0.45] });
  }
  // faixa de pedra, seteiras e brasão
  for (const s of [-1, 1]) m.add(box(L, 0.3, 0.2), 'ecl_pedra', PEDRA_QUINA, { p: [0, H * 0.56, s * (D / 2 + 0.04)] });
  for (const x of [-2.2, 2.2]) {
    seteira(m, Math.PI / 2, D / 2 - 0.1, H * 0.36);
    m.parts.slice(-3).forEach((pt) => pt.geo.translate(x, 0, 0));
  }
  if (rand() < 0.7) {
    const b = pano(rand, 1.5, 3.4, pick(rand, ['#6a2bb8', '#8a2a5a', '#2b4ab8']));
    m.addModel(b, { p: [0, H * 0.5, D / 2 + 0.2] });
    m.add(cyl(0.05, 0.05, 1.9, 6), 'paint', OURO, { p: [0, H * 0.5, D / 2 + 0.2], r: [0, 0, Math.PI / 2] });
  }
  // musgo/erosão na base
  for (let i = 0; i < 4; i++) m.add(blob(rr(rand, 0.4, 0.7), rand, { detail: 1, s: [1.3, 0.6, 1] }), 'ecl_pedra', vary(PEDRA_ESC, rand), { p: [rr(rand, -5, 5), 0.3, (i % 2 ? 1 : -1) * (D / 2 + 0.9)] });
  return m;
}

function portaoFortaleza(rand: Rand, span = 16): Model {
  const m = new Model();
  const rt = 3.3, x = span / 2 + rt + 0.2, spring = 7.2, rise = 2.3, Ht = rr(rand, 15, 17), top = spring + rise + 3.4;
  // casa do portão: pano de muralha com arco e adarve
  const out = archOutline(span + 0.3, spring, rise, rt * 0.7, 3.4, 12);
  m.add(uvBox(extrude(out, 3.2), 4), 'ecl_pedra', pedra(spring - 2, top + 1));
  for (const z of [1.7, -1.7]) {
    m.add(uvBox(box(span + 1, 0.8, 0.5), 4), 'ecl_pedra', PEDRA_CLARA, { p: [0, top + 0.4, z] });
    const n = Math.round(span / 2.6);
    for (let i = 0; i < n; i++) ameia(m, -span / 2 + (i + 0.5) * (span / n), top + 0.8, z, 1.3, 1.1, 0.55);
    m.add(box(span + 0.6, 0.3, 0.16), 'ecl_pedra', PEDRA_QUINA, { p: [0, spring + rise + 0.9, z * 0.96] });
  }
  // aduelas do arco
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI, hx = span / 2 + 0.15;
    m.add(box(0.22, 0.7, 3.36), 'ecl_pedra', i === 6 ? OURO : PEDRA_QUINA, { p: [Math.cos(a) * hx, spring + Math.sin(a) * rise + 0.3, 0], r: [0, 0, a - Math.PI / 2] });
  }
  // grade levantada, visível no alto do arco (acima de 7 m)
  const nb = Math.round(span / 0.9);
  for (let i = 0; i <= nb; i++) {
    const px = -span / 2 + 0.3 + (i * (span - 0.6)) / nb, teto = spring + rise * Math.sqrt(Math.max(0, 1 - (px / (span / 2 + 0.15)) ** 2));
    const y0 = spring + 0.15;
    if (teto - y0 > 0.4) {
      m.add(box(0.12, teto - y0 + 0.2, 0.12), 'paint', FERRO, { p: [px, (teto + y0) / 2 + 0.1, 0.5], r: [0, Math.PI / 4, 0] });
      m.add(cone(0.11, 0.3, 4), 'paint', FERRO_CLARO, { p: [px, y0 - 0.14 + 0.1, 0.5], r: [Math.PI, 0, 0] });
    }
  }
  for (const y of [spring + 0.6, spring + 1.4]) {
    const w = (span / 2 + 0.15) * Math.sqrt(Math.max(0, 1 - ((y - spring) / rise) ** 2)) * 2 - 0.3;
    m.add(box(w, 0.1, 0.14), 'paint', FERRO, { p: [0, y, 0.5] });
  }
  // duas torres oitavadas com telhado, seteiras e estandartes
  for (const s of [-1, 1]) {
    const g = new Model();
    g.add(uvBox(prism(ngon(rt * 1.16, 8, Math.PI / 8), -0.2, 2.2, { top: 0.88 }), 4), 'ecl_pedra', pedra(0, 3));
    g.add(prism(ngon(rt, 8, Math.PI / 8), 2.2, Ht, { top: 0.94, uv: 4 }), 'ecl_pedra', pedra(0, Ht));
    g.add(prism(ngon(rt * 1.14, 8, Math.PI / 8), Ht - 0.6, Ht + 0.5, { uv: 4, cap: 'both' }), 'ecl_pedra', PEDRA_CLARA);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ameia(g, Math.cos(a) * rt * 0.98, Ht + 0.5, Math.sin(a) * rt * 0.98, 1.2, 1.0, 0.55, fora(a)); }
    g.add(revolve([[rt * 0.7, Ht + 0.5], [rt * 0.68, Ht + 2.6], [rt * 0.8, Ht + 2.9]], 10, { uv: 4 }), 'ecl_pedra', pedra(Ht, Ht + 3));
    telhadoConico(g, rt * 0.72, Ht + 2.9, rr(rand, 6, 7.5), 10);
    for (const y of [4.5, 9.5, Ht - 2.6]) seteira(g, Math.PI / 2, rt * 0.9, y);
    seteira(g, -Math.PI / 2, rt * 0.9, 9.5);
    m.addModel(g, { p: [s * x, 0, 0] });
    const b = pano(rand, 1.4, 4.6, '#6a2bb8');
    m.addModel(b, { p: [s * x, 8.2, rt * 0.96 + 0.25] });
    m.add(cyl(0.05, 0.05, 1.8, 6), 'paint', OURO, { p: [s * x, 8.2, rt * 0.96 + 0.25], r: [0, 0, Math.PI / 2] });
    // tocheiros ladeando a entrada
    m.add(box(0.14, 0.14, 0.7), 'paint', FERRO, { p: [s * (span / 2 + 0.75), 3.4, 1.9] });
    m.add(revolve([[0.08, 0], [0.26, 0.3], [0.22, 0.34]], 6), 'paint', FERRO, { p: [s * (span / 2 + 0.75), 3.4, 2.2] });
    chama(m, rand, s * (span / 2 + 0.75), 3.66, 2.2, 0.8);
    // correntes da grade
    m.add(cyl(0.05, 0.05, 2.6, 4), 'paint', FERRO_CLARO, { p: [s * (span / 2 - 0.6), top - 1.5, 1.72] });
  }
  return m;
}

function salaoColuna(rand: Rand): Model {
  const m = new Model();
  const H = 10, r = rr(rand, 0.72, 0.84);
  m.add(uvBox(prism(ngon(r * 2.1, 8, Math.PI / 8), -0.2, 0.7, { top: 0.9 }), 3), 'ecl_pedra', pedra(0, 1));
  m.add(revolve([[r * 1.7, 0.7], [r * 1.5, 1.0], [r * 1.56, 1.2], [r * 1.14, 1.5]], 12, { uv: 3 }), 'ecl_pedra', PEDRA_QUINA);
  // fuste em feixe de oito colunetas
  const n = 24, ring = (rk: number, tw: number): P2[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + tw, k = 1 + 0.13 * Math.cos(a * 8 - tw * 8); return [Math.cos(a) * rk * k, Math.sin(a) * rk * k] as P2; });
  m.add(loft([{ y: 1.5, pts: ring(r, 0) }, { y: H * 0.5, pts: ring(r * 0.94, 0) }, { y: H - 1.9, pts: ring(r * 0.9, 0) }], { uv: 3 }), 'ecl_pedra', pedra(0, H));
  m.add(torus(r * 1.08, 0.12, 5, 14), 'ecl_pedra', PEDRA_QUINA, { p: [0, H * 0.5, 0], r: [Math.PI / 2, 0, 0] });
  // anel de runas luminosas e capitel em leque
  m.add(cyl(r * 0.99, r * 0.99, 0.22, 12, true), 'glow_violet', '#ffffff', { p: [0, H - 2.15, 0] });
  for (let i = 0; i < 8; i++) m.add(box(0.2, 0.34, 0.12), 'ecl_pedra', PEDRA_ESC, { p: polar((i / 8) * TAU, r * 1.0, H - 2.15), r: [0, fora((i / 8) * TAU), 0] });
  m.add(revolve([[r * 0.96, H - 1.9], [r * 1.2, H - 1.7], [r * 1.1, H - 1.5], [r * 1.5, H - 0.9], [r * 2.0, H - 0.5]], 12, { uv: 3 }), 'ecl_pedra', pedra(H - 3, H));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; m.add(prism(ngon(0.3, 4), 0, 1.2, { top: 0.3, shift: [0, 0.5] }), 'ecl_pedra', PEDRA_QUINA, { p: polar(a, r * 1.1, H - 1.6), r: [0, fora(a), 0] }); }
  m.add(uvBox(prism(ngon(r * 2.4, 8, Math.PI / 8), H - 0.5, H, { cap: 'both' }), 3), 'ecl_pedra', PEDRA_CLARA);
  return m;
}

function salaoArco(rand: Rand, span = 16): Model {
  const m = new Model();
  const spring = 6.5, rise = Math.min(span * 0.42, 7.5), half = span / 2 + 0.2, zs = 4.2, top = spring + rise + 1.3;
  // contorno de arco ogival (dois arcos de círculo)
  const ogiva = (h: number, sp: number, rs: number, side: number, over: number): P2[] => {
    const pts: P2[] = [[-h - side, 0], [-h - side, sp + rs + over], [h + side, sp + rs + over], [h + side, 0], [h, 0], [h, sp]];
    const N = 8;
    for (let i = 1; i <= N; i++) { const t = i / N; pts.push([h * (1 - t) ** 0.62 * (1 - 0.0), sp + rs * Math.sin((t * Math.PI) / 2) ** 0.9]); }
    for (let i = N - 1; i >= 0; i--) { const t = i / N; pts.push([-h * (1 - t) ** 0.62, sp + rs * Math.sin((t * Math.PI) / 2) ** 0.9]); }
    pts.push([-h, 0]);
    return pts;
  };
  for (const z of [-zs, zs]) {
    m.add(uvBox(extrude(ogiva(half, spring, rise, 1.5, 1.3), 1.5, 0.05), 4), 'ecl_pedra', pedra(0, top), { p: [0, 0, z] });
    // colunetas e capitéis nos pés
    for (const s of [-1, 1]) {
      m.add(revolve([[0.5, -0.2], [0.42, 0.5], [0.32, 0.8], [0.3, spring - 0.6], [0.5, spring - 0.2], [0.5, spring]], 8, { uv: 3 }), 'ecl_pedra', shade(PEDRA_ESC, PEDRA_QUINA, 0, spring), { p: [s * (half + 0.35), 0, z + Math.sign(z) * -0.95] });
      m.add(box(0.12, 0.12, 0.6), 'paint', FERRO, { p: [s * (half + 1.0), 3.6, z + Math.sign(z) * 0.95] });
      m.add(revolve([[0.07, 0], [0.24, 0.28], [0.2, 0.32]], 6), 'paint', FERRO, { p: [s * (half + 1.0), 3.6, z + Math.sign(z) * 1.25] });
      chama(m, rand, s * (half + 1.0), 3.86, z + Math.sign(z) * 1.25, 0.7);
    }
    m.add(prism(ngon(0.5, 4), -0.8, 0.8, { cap: 'both' }), 'paint', OURO, { p: [0, spring + rise + 0.6, z], r: [Math.PI / 2, 0, 0] });
  }
  // abóbada: nervuras longitudinais e diagonais, tudo acima da nascença
  const yk = spring + rise;
  m.add(uvBox(extrude(ogiva(half, spring, rise, 1.1, 0.9), zs * 2 - 1.4), 4), 'ecl_pedra', pedra(0, top));
  // telhado de duas águas em ardósia e pináculos nos cantos
  const tw = half + 1.9;
  m.add(uvBox(extrude([[-tw, 0], [0, 2.6], [tw, 0], [tw, -0.3], [-tw, -0.3]], zs * 2 + 2.2), 2.6), 'ecl_ardosia', gradY(ARDOSIA_A, ARDOSIA_B, 0, 2.6), { p: [0, top + 0.3, 0] });
  for (const s of [-1, 1]) for (const z of [-zs, zs]) m.add(prism(ngon(0.5, 4, Math.PI / 4), top, top + 2.4, { top: 0.05 }), 'ecl_pedra', PEDRA_QUINA, { p: [s * (half + 1.1), 0, z] });
  for (const s of [-1, 1]) {
    for (const d of [-1, 1]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([s * half * (1 - t) ** 0.62 * 0.98, spring + rise * Math.sin((t * Math.PI) / 2) ** 0.9 + 0.15, d * zs * (1 - t) * 0.82]); }
      m.add(tube(pts, 0.2, 10, 5), 'ecl_pedra', PEDRA_QUINA);
    }
  }
  // vitral lateral aceso e lustre de ferro com velas
  for (const s of [-1, 1]) m.add(box(0.12, 3.2, 1.5), 'glow_violet', '#ffffff', { p: [s * (half + 0.12), 3.6, 0] });
  for (const s of [-1, 1]) for (const k of [-0.9, 0, 0.9]) m.add(box(0.16, 3.3, 0.1), 'ecl_pedra', PEDRA_ESC, { p: [s * (half + 0.1), 3.6, k * 0.85] });
  const yl = Math.max(spring + 1.4, yk - 2.6);
  m.add(cyl(0.04, 0.04, yk + 0.3 - yl, 4), 'paint', FERRO, { p: [0, (yk + 0.3 + yl) / 2, 0] });
  m.add(torus(1.3, 0.08, 5, 14), 'paint', FERRO, { p: [0, yl, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) {
    const p = polar((i / 6) * TAU, 1.3, yl);
    m.add(cyl(0.05, 0.05, 0.3, 5), 'matte', '#efe6d0', { p: [p[0], yl + 0.2, p[2]] });
    m.add(ico(0.09, 0), 'glow_warm', '#ffffff', { p: [p[0], yl + 0.44, p[2]] });
    m.add(tube([[0, yl + 0.9, 0], [p[0], yl, p[2]]], 0.02, 1, 3), 'paint', FERRO);
  }
  return m;
}

function tocha(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 2.1, 2.5);
  for (let i = 0; i < 3; i++) m.add(tube([polar(i * 2.094, 0.5, -0.05), polar(i * 2.094, 0.2, 0.3), [0, 0.7, 0]], 0.045, 6, 4), 'paint', FERRO);
  m.add(cyl(0.05, 0.06, H - 0.6, 6), 'paint', gradY(FERRO, FERRO_CLARO, 0, H), { p: [0, 0.6 + (H - 0.6) / 2, 0] });
  for (const y of [0.9, H * 0.6]) m.add(torus(0.07, 0.03, 4, 8), 'paint', OURO, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
  m.add(revolve([[0.07, H - 0.12], [0.2, H], [0.34, H + 0.3], [0.3, H + 0.34], [0.18, H + 0.1], [0.001, H + 0.08]], 8), 'paint', FERRO);
  for (let i = 0; i < 6; i++) m.add(box(0.03, 0.34, 0.03), 'paint', FERRO_CLARO, { p: polar((i / 6) * TAU, 0.32, H + 0.36), r: [0, fora((i / 6) * TAU), 0] });
  m.add(torus(0.32, 0.025, 4, 10), 'paint', FERRO_CLARO, { p: [0, H + 0.5, 0], r: [Math.PI / 2, 0, 0] });
  m.add(blob(0.2, rand, { detail: 1, jitter: 0.3 }), 'glow_red', '#ffffff', { p: [0, H + 0.22, 0], s: [1, 0.5, 1] });
  chama(m, rand, 0, H + 0.24, 0, 1);
  return m;
}

function estandarteMastro(_rand: Rand): Model {
  const m = new Model();
  m.add(uvBox(prism(ngon(0.62, 6), -0.2, 0.5, { top: 0.7 }), 2), 'ecl_pedra', pedra(0, 0.5));
  m.add(cyl(0.06, 0.09, 6.6, 7), 'ecl_madeira', gradY('#3d2a24', '#7a5238', 0, 7), { p: [0, 3.7, 0] });
  m.add(cyl(0.045, 0.045, 2.1, 6), 'ecl_madeira', '#5a3a2a', { p: [0, 6.6, 0.1], r: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) m.add(ico(0.09, 0), 'paint', OURO, { p: [s * 1.08, 6.6, 0.1] });
  m.add(cone(0.12, 0.5, 4), 'paint', OURO, { p: [0, 7.25, 0] });
  m.add(torus(0.1, 0.03, 4, 8), 'paint', OURO, { p: [0, 2, 0], r: [Math.PI / 2, 0, 0] });
  return m;
}
function estandartePano(rand: Rand): Model {
  return pano(rand, 1.8, rr(rand, 4.2, 4.8), pick(rand, ['#6a2bb8', '#8a2a5a', '#2b4ab8', '#1f6a6a']));
}

function estatuaGuardia(rand: Rand): Model {
  const m = new Model();
  const aco = (y0: number, y1: number) => shade('#4d4a66', '#b9b6d2', y0, y1, 0.3), hp = 1.0;
  m.add(uvBox(prism(rectPts(1.9, 1.7, 0.2), -0.2, hp - 0.2, { top: 0.9 }), 2.5), 'ecl_pedra', pedra(0, hp));
  m.add(uvBox(prism(rectPts(1.9, 1.7, 0.16), hp - 0.2, hp, { cap: 'both' }), 2.5), 'ecl_pedra', PEDRA_QUINA);
  const g = new Model();
  for (const s of [-1, 1]) { // pernas, joelheiras e botas
    g.add(prism(ngon(0.2, 6), 0.1, 1.0, { top: 1.25 }), 'paint', aco(0, 3), { p: [s * 0.26, 0, 0] });
    g.add(box(0.36, 0.2, 0.62, 0.06, 1), 'paint', aco(-0.1, 0.4), { p: [s * 0.26, 0.1, 0.1] });
    g.add(ico(0.17, 0), 'paint', '#b9b6d2', { p: [s * 0.26, 0.62, 0.16] });
    // ombreiras em camadas e braços
    g.add(blob(0.3, rand, { detail: 1, jitter: 0.03, s: [1.1, 0.7, 1] }), 'paint', aco(-0.3, 0.3), { p: [s * 0.62, 2.08, 0] });
    g.add(prism(ngon(0.36, 6), 0, 0.14, { top: 0.6 }), 'paint', OURO, { p: [s * 0.66, 2.2, 0] });
    g.add(tube([[s * 0.66, 2.0, 0], [s * 0.74, 1.6, 0.1], [s * 0.6, 1.3, 0.34]], 0.12, 4, 6), 'paint', aco(1.2, 2.2));
    g.add(ico(0.15, 0), 'paint', '#6f6c82', { p: [s * 0.6, 1.3, 0.36] });
  }
  // saiote de placas, couraça e gola
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; g.add(prism(rectPts(0.34, 0.08), 0, 0.62, { top: 1.25 }), 'paint', i % 2 ? aco(0, 0.7) : '#5b3a8a', { p: [Math.cos(a) * 0.36, 0.86, Math.sin(a) * 0.3], r: [Math.PI, fora(a), 0] }); }
  g.add(revolve([[0.38, 1.05], [0.34, 1.3], [0.5, 1.75], [0.56, 2.0], [0.3, 2.2], [0.2, 2.24]], 8), 'paint', aco(1, 2.3), { s: [1, 1, 0.78] });
  g.add(extrude([[0, 0.24], [0.18, 0], [0, -0.3], [-0.18, 0]], 0.05), 'glow_violet', '#ffffff', { p: [0, 1.78, 0.41] });
  g.add(torus(0.42, 0.06, 4, 10), 'paint', OURO, { p: [0, 1.12, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.8, 1] });
  // elmo com crista e viseira luminosa
  g.add(revolve([[0.2, 2.22], [0.27, 2.36], [0.28, 2.6], [0.2, 2.8], [0.001, 2.9]], 8), 'paint', aco(2.2, 2.9));
  g.add(box(0.36, 0.05, 0.1), 'glow_violet', '#ffffff', { p: [0, 2.54, 0.24] });
  g.add(box(0.05, 0.26, 0.1), 'paint', '#3b3948', { p: [0, 2.44, 0.26] });
  g.add(extrude([[-0.3, 0], [-0.2, 0.34], [0.1, 0.46], [0.36, 0.3], [0.3, 0]], 0.06), 'cloth', '#8a3fd0', { p: [0, 2.84, 0], r: [0, Math.PI / 2, 0] });
  // capa e alabarda
  g.add(extrude([[-0.5, 0], [0.5, 0], [0.62, -1.9], [0, -2.1], [-0.62, -1.9]], 0.05), 'cloth', gradY('#2a1458', '#6a2bb8', -2.1, 0), { p: [0, 2.1, -0.34], r: [0.12, 0, 0] });
  const hx = 0.62;
  g.add(cyl(0.035, 0.035, 3.7, 6), 'ecl_madeira', '#5a3a2a', { p: [hx, 1.85, 0.4] });
  g.add(extrude([[0, 0], [0.5, 0.36], [0.62, 0], [0.5, -0.42], [0, -0.16]], 0.04, 0.015), 'paint', '#c9c6de', { p: [hx + 0.03, 3.2, 0.4] });
  g.add(extrude([[0, 0.1], [-0.34, 0], [0, -0.1]], 0.04), 'paint', '#c9c6de', { p: [hx - 0.03, 3.2, 0.4] });
  g.add(cone(0.07, 0.6, 4), 'paint', '#c9c6de', { p: [hx, 3.98, 0.4] });
  g.add(torus(0.06, 0.025, 4, 8), 'paint', OURO, { p: [hx, 3.0, 0.4], r: [Math.PI / 2, 0, 0] });
  m.addModel(g, { p: [0, hp, 0] });
  return m;
}

function braseiro(rand: Rand): Model {
  const m = new Model();
  const R = rr(rand, 0.72, 0.86);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.5;
    m.add(tube([polar(a, R * 1.0, -0.05), polar(a, R * 0.62, 0.45), polar(a, R * 0.78, 0.86)], 0.055, 6, 4), 'paint', FERRO);
    m.add(ico(0.09, 0), 'paint', OURO, { p: polar(a, R * 0.8, 0.9) });
  }
  m.add(torus(R * 0.62, 0.035, 4, 12), 'paint', FERRO_CLARO, { p: [0, 0.42, 0], r: [Math.PI / 2, 0, 0] });
  m.add(revolve([[0.12, 0.62], [R * 0.6, 0.7], [R, 1.05], [R * 1.06, 1.14], [R * 0.9, 1.14], [R * 0.6, 0.92], [0.001, 0.9]], 10), 'paint', shade(FERRO, FERRO_CLARO, 0.6, 1.2));
  for (let i = 0; i < 6; i++) m.add(prism(ngon(0.07, 4), 0, 0.2, { top: 0.1 }), 'paint', FERRO_CLARO, { p: polar((i / 6) * TAU, R * 0.98, 1.12) });
  for (let i = 0; i < 6; i++) m.add(blob(rr(rand, 0.14, 0.22), rand, { detail: 0, jitter: 0.3 }), i % 2 ? 'glow_red' : 'matte', i % 2 ? '#ffffff' : '#2a2030', { p: polar(rand() * TAU, R * rr(rand, 0.1, 0.6), 1.02) });
  chama(m, rand, 0, 1.0, 0, 1.25);
  chama(m, rand, R * 0.36, 0.98, 0.1, 0.7);
  return m;
}

function gargula(rand: Rand): Model {
  const m = new Model();
  const cor = shade('#5d5a76', '#aeabc6', 0, 2.6, 0.25), hp = 1.1;
  m.add(uvBox(prism(rectPts(1.4, 1.5, 0.16), -0.2, hp - 0.25, { top: 0.86 }), 2.5), 'ecl_pedra', pedra(0, hp));
  m.add(uvBox(prism(rectPts(1.55, 1.65, 0.14), hp - 0.25, hp, { cap: 'both' }), 2.5), 'ecl_pedra', PEDRA_QUINA);
  const g = new Model();
  g.add(blob(0.5, rand, { detail: 2, jitter: 0.05, s: [0.9, 1.0, 1.15], faceted: true }), 'std', cor, { p: [0, 0.62, -0.05], r: [0.5, 0, 0] });
  for (const s of [-1, 1]) {
    g.add(blob(0.3, rand, { detail: 1, jitter: 0.05, s: [0.7, 1, 1.2] }), 'std', cor, { p: [s * 0.42, 0.36, 0.1] }); // coxas agachadas
    g.add(tube([[s * 0.4, 0.86, 0.3], [s * 0.46, 0.4, 0.56], [s * 0.4, 0.06, 0.62]], 0.1, 5, 5), 'std', cor);
    for (let k = -1; k <= 1; k++) g.add(cone(0.045, 0.2, 4), 'std', '#d9d5ea', { p: [s * 0.4 + k * 0.09, 0.05, 0.78], r: [Math.PI / 2 + 0.3, 0, 0] });
    g.add(cone(0.08, 0.46, 5), 'std', '#d9d5ea', { p: [s * 0.22, 1.66, 0.26], r: [-0.5, 0, -s * 0.5] }); // chifres
    g.add(extrude([[0, 0], [0.26, 0.2], [0.12, -0.1]], 0.05), 'std', cor, { p: [s * 0.3, 1.36, 0.38], s: [s, 1, 1] }); // orelhas
    g.add(ico(0.06, 0), 'glow_violet', '#ffffff', { p: [s * 0.14, 1.38, 0.68] });
    const asa: P2[] = [[0, 0], [0.3, 0.9], [1.1, 1.35], [0.92, 0.82], [1.2, 0.5], [0.84, 0.36], [0.96, -0.1], [0.5, 0.02], [0.3, -0.4]];
    g.add(extrude(asa, 0.07, 0.02), 'std', shade('#4d4a66', '#9a97b4', -0.4, 1.4), { p: [s * 0.3, 0.9, -0.34], r: [0, s > 0 ? 0.9 : Math.PI - 0.9, s * 0.15] });
  }
  g.add(blob(0.33, rand, { detail: 1, jitter: 0.05, s: [1, 0.9, 1.1] }), 'std', cor, { p: [0, 1.34, 0.42] });
  g.add(prism(rectPts(0.34, 0.3, 0.06), 0, 0.2, { top: 0.7 }), 'std', cor, { p: [0, 1.12, 0.66], r: [0.5, 0, 0] }); // focinho
  for (const s of [-1, 1]) g.add(cone(0.035, 0.12, 4), 'std', '#efeaf8', { p: [s * 0.1, 1.12, 0.8], r: [Math.PI, 0, 0] });
  g.add(tube([[0, 0.3, -0.5], [0.3, 0.14, -0.8], [0.7, 0.1, -0.5], [0.8, 0.3, -0.2]], (t) => 0.1 - t * 0.07, 8, 5), 'std', cor);
  g.add(cone(0.09, 0.22, 4), 'std', '#d9d5ea', { p: [0.82, 0.42, -0.14], r: [0.3, 0, -0.2] });
  m.addModel(g, { p: [0, hp, 0] });
  return m;
}

function ponteFortalezaMureta(_rand: Rand): Model {
  const m = new Model();
  const perfil: P2[] = [[-0.38, -0.1], [-0.38, 0.2], [-0.28, 0.3], [-0.28, 1.0], [0.28, 1.0], [0.28, 0.3], [0.38, 0.2], [0.38, -0.1]];
  m.add(uvBox(extrude(perfil, 6), 2.5), 'ecl_pedra', pedra(0, 1.1), { r: [0, Math.PI / 2, 0] });
  for (let i = 0; i < 4; i++) ameia(m, -2.25 + i * 1.5, 1.0, 0, 0.9, 0.62, 0.56);
  m.add(box(6, 0.12, 0.66), 'ecl_pedra', PEDRA_QUINA, { p: [0, 0.98, 0] });
  for (const x of [-1.5, 1.5]) m.add(box(0.12, 0.44, 0.6), 'glow_violet', '#ffffff', { p: [x, 0.6, 0] });
  return m;
}

function paraRaios(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 7.5, 9);
  m.add(uvBox(prism(ngon(0.95, 6), -0.2, 0.9, { top: 0.72 }), 2.5), 'ecl_pedra', pedra(0, 1));
  m.add(uvBox(prism(ngon(0.5, 6), 0.9, 1.5, { top: 0.6 }), 2.5), 'ecl_pedra', PEDRA_QUINA);
  m.add(cyl(0.05, 0.12, H - 1.4, 7), 'paint', gradY(FERRO, '#9a97b4', 1, H), { p: [0, 1.4 + (H - 1.4) / 2, 0] });
  for (let i = 0; i < 3; i++) m.add(tube([polar(i * 2.094, 0.7, 0.8), polar(i * 2.094, 0.3, 2.6), [0, 3.4, 0]], 0.03, 5, 3), 'paint', FERRO_CLARO);
  // bobinas e isoladores
  for (let i = 0; i < 4; i++) m.add(torus(0.26 - i * 0.03, 0.045, 5, 12), 'paint', OURO, { p: [0, H * 0.55 + i * 0.3, 0], r: [Math.PI / 2, 0, 0] });
  m.add(revolve([[0.1, H * 0.48], [0.22, H * 0.5], [0.1, H * 0.52]], 8), 'glossy', '#d9d5ea');
  // esfera carregada com garras e arcos elétricos
  m.add(ico(0.42, 2), 'glow_violet', '#ffffff', { p: [0, H + 0.3, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    m.add(tube([polar(a, 0.08, H - 0.5), polar(a, 0.62, H - 0.1), polar(a, 0.56, H + 0.6)], 0.03, 6, 3), 'paint', FERRO_CLARO);
    const b = rand() * TAU, pts: V3[] = [];
    for (let k = 0; k <= 4; k++) pts.push([Math.cos(b) * (0.4 + k * 0.22) + rr(rand, -0.12, 0.12), H + 0.3 + Math.sin(k * 2.2 + i) * 0.26 + k * 0.1, Math.sin(b) * (0.4 + k * 0.22) + rr(rand, -0.12, 0.12)]);
    m.add(tube(pts, (t) => 0.03 * (1 - t) + 0.006, 6, 3), 'glow_violet', '#ffffff');
  }
  m.add(cone(0.05, 0.9, 5), 'paint', '#d9d5ea', { p: [0, H + 1.1, 0] });
  return m;
}

function vitral(_rand: Rand): Model {
  const m = new Model();
  const w = 2.6, h = 6.5, y0 = 1.4;
  // parede/moldura ogival em pedra
  const N = 8, arco: P2[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N; arco.push([(w / 2) * (1 - t) ** 0.7, h * 0.62 + h * 0.38 * Math.sin((t * Math.PI) / 2)]); }
  const dentro: P2[] = [[-w / 2, 0], [w / 2, 0], ...arco, ...arco.slice(0, -1).reverse().map(([a, b]) => [-a, b] as P2)];
  const fora2: P2[] = [[-w / 2 - 0.7, -y0 - 0.2], [w / 2 + 0.7, -y0 - 0.2], [w / 2 + 0.7, h * 0.66], [w * 0.24, h + 0.5], [0, h + 0.95], [-w * 0.24, h + 0.5], [-w / 2 - 0.7, h * 0.66]];
  m.add(uvBox(extrude(fora2, 0.9, 0.06, [dentro]), 3), 'ecl_pedra', pedra(-y0, h), { p: [0, y0, 0] });
  m.add(box(w + 1.9, 0.3, 1.3), 'ecl_pedra', PEDRA_QUINA, { p: [0, y0 - 0.15, 0.1] });
  m.add(uvBox(prism(rectPts(w + 2.2, 1.5, 0.15), -0.2, 0.5, { top: 0.92 }), 3), 'ecl_pedra', pedra(0, 0.5));
  // fundo escuro (chumbo) + camadas luminosas do vitral
  m.add(extrude(dentro.map(([a, b]) => [a * 1.06, b * 1.03] as P2), 0.1), 'matte', '#0d0a1c', { p: [0, y0 - 0.05, -0.12] });
  for (const layer of ['v', 'w', 'c', 'm']) m.add(panel(w, h, [0, 0, 1, 1]), `ecl_vitral_${layer}`, '#ffffff', { p: [0, y0 + h / 2, 0] });
  // mainel central e fecho
  m.add(prism(ngon(0.34, 4), -0.5, 0.5, { cap: 'both' }), 'paint', OURO, { p: [0, y0 + h + 0.45, 0], r: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) m.add(revolve([[0.2, 0], [0.14, 0.3], [0.12, h * 0.62], [0.22, h * 0.66]], 6, { uv: 3 }), 'ecl_pedra', PEDRA_QUINA, { p: [s * (w / 2 + 0.25), y0, 0.42] });
  return m;
}

/** Barril de madeira com aros; eixo em Y, base em y=0. */
function barril(rand: Rand, r = 0.5, h = 1.15): Model {
  const m = new Model();
  const cor = vary('#a9744c', rand, 0.06);
  m.add(revolve([[r * 0.8, 0], [r * 0.95, h * 0.22], [r, h * 0.5], [r * 0.95, h * 0.78], [r * 0.8, h]], 12, { uv: 1.1 }), 'ecl_madeira', shade(mix(cor, '#2a1a14', 0.4), cor, 0, h));
  for (const y of [0.04, h - 0.04]) m.add(cyl(r * 0.76, r * 0.76, 0.03, 12), 'ecl_madeira', '#c99a6a', { p: [0, y, 0] });
  for (const [y, k] of [[h * 0.12, 0.89], [h * 0.36, 0.985], [h * 0.64, 0.985], [h * 0.88, 0.89]] as P2[]) m.add(cyl(r * k + 0.012, r * k + 0.012, 0.07, 12, true), 'paint', FERRO_CLARO, { p: [0, y, 0] });
  m.add(cyl(0.05, 0.05, 0.06, 6), 'matte', '#5a3a2a', { p: [0, h * 0.5, r], r: [Math.PI / 2, 0, 0] });
  return m;
}
function barrilFortaleza(rand: Rand): Model {
  const m = barril(rand, rr(rand, 0.46, 0.54), rr(rand, 1.05, 1.25));
  m.add(extrude([[0, 0.14], [0.1, 0], [0, -0.16], [-0.1, 0]], 0.02), 'glow_violet', '#ffffff', { p: [0.2, 0.6, 0.48], r: [0, 0.4, 0] });
  if (rand() < 0.5) m.addModel(barril(rand, 0.34, 0.8), { p: [0.85, 0, 0.15] });
  return m;
}

function catapulta(rand: Rand): Model {
  const m = new Model();
  const mad = (y0: number, y1: number) => gradY('#5a3a2a', '#a9744c', y0, y1), ang = rr(rand, 0.5, 0.8);
  for (const s of [-1, 1]) {
    m.add(uvBox(box(0.3, 0.3, 4.4), 1.4), 'ecl_madeira', mad(0, 1), { p: [s * 1.0, 0.72, 0] });
    for (const z of [-1.6, 1.6]) {
      m.add(cyl(0.56, 0.56, 0.2, 12), 'ecl_madeira', '#7a5238', { p: [s * 1.3, 0.56, z], r: [0, 0, Math.PI / 2] });
      m.add(torus(0.56, 0.05, 4, 14), 'paint', FERRO_CLARO, { p: [s * 1.3, 0.56, z], r: [0, Math.PI / 2, 0] });
      m.add(cyl(0.12, 0.12, 0.26, 6), 'paint', FERRO, { p: [s * 1.3, 0.56, z], r: [0, 0, Math.PI / 2] });
    }
    // cavalete em A
    m.add(uvBox(box(0.26, 3.0, 0.26), 1.4), 'ecl_madeira', mad(0.8, 3.4), { p: [s * 1.0, 2.1, 0.75], r: [0.5, 0, 0] });
    m.add(uvBox(box(0.26, 3.0, 0.26), 1.4), 'ecl_madeira', mad(0.8, 3.4), { p: [s * 1.0, 2.1, -0.75], r: [-0.5, 0, 0] });
    m.add(cyl(0.05, 0.05, 0.4, 5), 'paint', OURO, { p: [s * 1.16, 3.35, 0], r: [0, 0, Math.PI / 2] });
  }
  for (const z of [-1.9, 0, 1.9]) m.add(uvBox(box(2.3, 0.26, 0.26), 1.4), 'ecl_madeira', mad(0.5, 1), { p: [0, 0.72, z] });
  m.add(cyl(0.11, 0.11, 2.5, 8), 'paint', FERRO, { p: [0, 3.35, 0], r: [0, 0, Math.PI / 2] });
  m.add(uvBox(box(2.2, 0.3, 0.3), 1.4), 'ecl_madeira', '#7a5238', { p: [0, 2.3, 1.1] });
  // braço com colher, contrapeso e pedra
  const b = new Model();
  b.add(uvBox(box(0.24, 0.24, 5.2), 1.4), 'ecl_madeira', '#b98458', { p: [0, 0, -0.9] });
  b.add(revolve([[0.001, -0.1], [0.4, -0.06], [0.52, 0.2], [0.44, 0.2], [0.34, 0.04], [0.001, 0.02]], 8), 'paint', FERRO_CLARO, { p: [0, 0.14, -3.3] });
  b.add(blob(0.36, rand, { detail: 1, jitter: 0.2 }), 'ecl_rocha', '#8d8aa6', { p: [0, 0.5, -3.3] });
  b.add(uvBox(box(0.9, 0.9, 0.9, 0.08, 1), 2), 'ecl_pedra', pedra(-0.5, 0.5), { p: [0, -0.5, 1.5] });
  for (const z of [1.08, 1.92]) b.add(box(0.96, 0.96, 0.08), 'paint', FERRO, { p: [0, -0.5, z] });
  for (const z of [-2.2, -1.0, 0.4]) b.add(box(0.3, 0.3, 0.1), 'paint', FERRO_CLARO, { p: [0, 0, z] });
  b.transform({ r: [-ang, 0, 0], p: [0, 3.35, 0] });
  m.addModel(b);
  // corda e manivela
  m.add(cyl(0.16, 0.16, 1.7, 8), 'ecl_madeira', '#c99a6a', { p: [0, 0.95, -1.9], r: [0, 0, Math.PI / 2] });
  for (let i = 0; i < 4; i++) m.add(torus(0.18, 0.035, 4, 8), 'matte', '#d9c08a', { p: [-0.3 + i * 0.2, 0.95, -1.9], r: [0, Math.PI / 2, 0] });
  m.add(box(0.06, 0.5, 0.06), 'paint', FERRO, { p: [1.0, 1.1, -1.9] });
  return m;
}

export const FORTALEZA_PROPS: PropLibrary = {
  'torre-fortaleza': { build: torreFortaleza, radius: 7.5, collider: { radius: 6, height: 30 } },
  muralha: { build: muralha, radius: 6.5, collider: { radius: 6, height: 10 } },
  'portao-fortaleza': { build: portaoFortaleza, radius: 15 },
  'salao-coluna': { build: salaoColuna, radius: 2.2, collider: { radius: 1.6, height: 10 } },
  'salao-arco': { build: salaoArco, radius: 12 },
  tocha: { build: tocha, radius: 0.6, collider: { radius: 0.3, height: 2.6 } },
  estandarte: { build: estandarteMastro, radius: 0.9, collider: { radius: 0.4, height: 7 }, animated: { build: estandartePano, pivot: [0, 6.56, 0.16], motion: { kind: 'sway', axis: 'x', angle: 0.14, period: 3 } } },
  'estatua-guardia': { build: estatuaGuardia, radius: 1.4, collider: { radius: 1.1, height: 4 } },
  braseiro: { build: braseiro, radius: 1, collider: { radius: 0.9, height: 1.2 } },
  gargula: { build: gargula, radius: 1.3, collider: { radius: 0.9, height: 2.6 } },
  'ponte-fortaleza-mureta': { build: ponteFortalezaMureta, radius: 3.1, collider: { radius: 0.4, height: 1.2 } },
  'para-raios': { build: paraRaios, radius: 1.1, collider: { radius: 0.8, height: 8 } },
  vitral: { build: vitral, radius: 2.6, collider: { radius: 2, height: 8 } },
  'barril-fortaleza': { build: barrilFortaleza, radius: 0.9, collider: { radius: 0.55, height: 1.2 } },
  catapulta: { build: catapulta, radius: 3.4, collider: { radius: 2.2, height: 3 } },
};

export { barril, chama };
