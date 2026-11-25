/**
 * Objetos próprios das arenas de batalha (chafariz, coreto, banco, balaustrada, rochedo lunar, farol de borda).
 * Origem no chão, no centro. Usam os materiais das bibliotecas existentes (aur_*, ecl_*, glow_*).
 */
import { Model, cone, cyl, flat, ico, sphere, torus, tube, type V3 } from '../lib/geo';
import { revolve, uvBox, ngon, prism, rr, type Rand } from '../props/kit-eclipse';
import { box } from '../lib/geo';

const STONE = '#d9cdb8';
const STONE_DARK = '#a8987e';
const IRON = '#3b3f4a';
const GOLD = '#e8c267';

/** Chafariz da praça: bacia larga de pedra, água, coluna com duas taças e jatos. Raio externo ≈ 5,4 m. */
export function chafariz(rand: Rand): Model {
  const m = new Model();
  const R = 5.2;
  m.add(revolve([[R + 0.25, -0.1], [R + 0.25, 0.55], [R + 0.05, 0.75], [R - 0.35, 0.75], [R - 0.45, 0.3], [0.001, 0.3]], 32, { uv: 1.6 }), 'aur_stone', STONE);
  m.add(cyl(R - 0.42, R - 0.42, 0.05, 32), 'ecl_agua', '#ffffff', { p: [0, 0.6, 0] });
  m.add(revolve([[1.1, 0.3], [0.75, 0.9], [0.55, 1.8], [0.7, 2.0], [2.0, 2.25], [2.3, 2.6], [2.05, 2.62], [1.4, 2.42], [0.001, 2.4]], 20, { uv: 1.6 }), 'aur_stone', STONE);
  m.add(cyl(1.95, 1.95, 0.04, 20), 'ecl_agua', '#ffffff', { p: [0, 2.52, 0] });
  m.add(revolve([[0.36, 2.4], [0.28, 3.3], [0.45, 3.5], [1.05, 3.7], [1.2, 3.95], [1.0, 3.96], [0.5, 3.82], [0.001, 3.8]], 16, { uv: 1.6 }), 'aur_stone', STONE_DARK);
  m.add(cyl(0.95, 0.95, 0.03, 16), 'ecl_agua', '#ffffff', { p: [0, 3.88, 0] });
  m.add(revolve([[0.14, 3.8], [0.1, 4.6], [0.2, 4.7], [0.001, 4.95]], 10), 'glossy', GOLD);
  m.add(ico(0.2, 1), 'glow_white', '#ffffff', { p: [0, 5.05, 0] });
  // jatos que caem da taça grande e da pequena
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const big: V3[] = [];
    const small: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      big.push([ca * (2.25 + t * 1.3), 2.55 + Math.sin(t * 1.5) * 0.25 - t * t * 2.0, sa * (2.25 + t * 1.3)]);
      small.push([ca * (1.15 + t * 0.7), 3.92 + Math.sin(t * 1.5) * 0.18 - t * t * 1.45, sa * (1.15 + t * 0.7)]);
    }
    m.add(tube(big, (t) => 0.06 + t * 0.05, 6, 4), 'water_fall', '#ffffff');
    if (i % 2 === 0) m.add(tube(small, (t) => 0.05 + t * 0.04, 5, 4), 'water_fall', '#ffffff');
  }
  // vitórias-régias na água
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2, r = rr(rand, 2.8, R - 0.9);
    m.add(cyl(0.38, 0.38, 0.03, 9), 'leaf', '#5fae4a', { p: [Math.cos(a) * r, 0.64, Math.sin(a) * r] });
  }
  return m;
}

/** Coreto: oito colunas finas, telhado octogonal com lanternim e lambrequins dourados. Raio ≈ 5 m (sem piso: roda-se por baixo). */
export function coreto(): Model {
  const m = new Model();
  const R = 5;
  const H = 4.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    m.add(cyl(0.2, 0.24, H, 8), 'aur_metal', '#f2efe8', { p: [x, H / 2, z] });
    m.add(cyl(0.34, 0.34, 0.25, 8), 'aur_stone', STONE, { p: [x, 0.12, z] });
    m.add(torus(0.24, 0.05, 4, 10), 'glossy', GOLD, { p: [x, H - 0.25, z], r: [Math.PI / 2, 0, 0] });
  }
  // viga e lambrequim (renda) em volta
  m.add(flat(cyl(R + 0.35, R + 0.35, 0.35, 8, true)), 'aur_wood', '#f6f1e6', { p: [0, H + 0.1, 0], r: [0, Math.PI / 8, 0] });
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    m.add(cone(0.16, 0.35, 4), 'glossy', GOLD, { p: [Math.cos(a) * (R + 0.38), H - 0.22, Math.sin(a) * (R + 0.38)], r: [Math.PI, 0, 0] });
  }
  // telhado
  m.add(flat(cone(R + 1.3, 2.4, 8)), 'aur_roof', '#c8553d', { p: [0, H + 1.45, 0], r: [0, Math.PI / 8, 0] });
  m.add(flat(cyl(0.9, 0.9, 0.9, 8)), 'aur_wood', '#f6f1e6', { p: [0, H + 2.65, 0], r: [0, Math.PI / 8, 0] });
  m.add(flat(cone(1.25, 1.0, 8)), 'aur_roof', '#c8553d', { p: [0, H + 3.55, 0], r: [0, Math.PI / 8, 0] });
  m.add(sphere(0.22, 10, 8), 'glossy', GOLD, { p: [0, H + 4.15, 0] });
  m.add(cyl(0.03, 0.03, 0.9, 4), 'glossy', GOLD, { p: [0, H + 4.6, 0] });
  // lustre
  m.add(cyl(0.02, 0.02, 1.2, 4), 'metal', IRON, { p: [0, H - 0.5, 0] });
  m.add(ico(0.32, 1), 'glow_warm', '#ffffff', { p: [0, H - 1.2, 0] });
  return m;
}

/** Banco de praça (madeira e ferro). */
export function banco(): Model {
  const m = new Model();
  for (const x of [-0.9, 0.9]) {
    m.add(box(0.08, 0.45, 0.5), 'aur_metal', IRON, { p: [x, 0.22, 0] });
    m.add(box(0.08, 0.6, 0.08), 'aur_metal', IRON, { p: [x, 0.75, -0.24] });
  }
  for (let i = 0; i < 3; i++) m.add(uvBox(box(2.1, 0.05, 0.14), 1), 'aur_wood', '#a66b3c', { p: [0, 0.47, -0.17 + i * 0.17] });
  for (let i = 0; i < 2; i++) m.add(uvBox(box(2.1, 0.12, 0.04), 1), 'aur_wood', '#a66b3c', { p: [0, 0.72 + i * 0.2, -0.27] });
  return m;
}

/** Trecho de balaustrada de pedra entre dois pilares (comprimento `len`, ao longo de +X), com lampião no pilar. */
export function balaustrada(len: number, lamp: boolean): Model {
  const m = new Model();
  m.add(uvBox(box(len, 0.35, 0.7), 1.5), 'aur_stone', STONE_DARK, { p: [0, 0.17, 0] });
  m.add(uvBox(box(len, 0.14, 0.8), 1.5), 'aur_stone', STONE, { p: [0, 1.0, 0] });
  const n = Math.max(2, Math.floor(len / 0.42));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    m.add(revolve([[0.1, 0], [0.07, 0.08], [0.13, 0.25], [0.07, 0.5], [0.1, 0.58]], 6), 'aur_stone', STONE, { p: [x, 0.35, 0] });
  }
  m.add(uvBox(box(0.9, 1.35, 0.95), 1.5), 'aur_stone', STONE, { p: [-len / 2, 0.67, 0] });
  m.add(uvBox(box(1.05, 0.12, 1.1), 1.5), 'aur_stone', STONE_DARK, { p: [-len / 2, 1.4, 0] });
  if (lamp) {
    m.add(cyl(0.06, 0.09, 2.4, 6), 'aur_metal', IRON, { p: [-len / 2, 2.6, 0] });
    m.add(flat(cyl(0.22, 0.14, 0.45, 6)), 'aur_metal', IRON, { p: [-len / 2, 3.95, 0] });
    m.add(ico(0.2, 1), 'glow_warm', '#ffffff', { p: [-len / 2, 3.65, 0] });
  }
  return m;
}

/** Canteiro elevado: mureta baixa em volta do topo (não bloqueia, é decoração do degrau). */
export function arbusto(rand: Rand): Model {
  const m = new Model();
  for (let i = 0; i < 4; i++) {
    m.add(flat(ico(rr(rand, 0.6, 0.9), 1)), 'aur_foliage', i % 2 ? '#4f9a45' : '#3f8a3e', { p: [rr(rand, -0.6, 0.6), rr(rand, 0.5, 0.8), rr(rand, -0.6, 0.6)] });
  }
  for (let i = 0; i < 5; i++) m.add(sphere(0.12, 6, 5), 'std', ['#ff5f7e', '#ffd34a', '#ffffff'][i % 3]!, { p: [rr(rand, -0.8, 0.8), rr(rand, 0.9, 1.3), rr(rand, -0.8, 0.8)] });
  return m;
}

/** Baliza luminosa da borda da cratera. */
export function balizaBorda(): Model {
  const m = new Model();
  m.add(prism(ngon(0.35, 6), 0, 0.3), 'aur_metal', '#7a7f8c');
  m.add(cyl(0.08, 0.1, 2.2, 6), 'aur_metal', '#c9ccd4', { p: [0, 1.3, 0] });
  m.add(ico(0.22, 1), 'glow_cyan', '#ffffff', { p: [0, 2.5, 0] });
  return m;
}
