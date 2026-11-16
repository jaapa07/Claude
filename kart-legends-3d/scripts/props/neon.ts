/**
 * CIDADE NEON — circuito urbano noturno (Copa Eclipse).
 * Arranha-céus com recuos e janelas acesas, letreiros de marcas fictícias originais, mobiliário urbano futurista.
 */
import { Model, box, cone, cyl, extrude, gradY, ico, mix, smoothOutline, torus, tube, type ColorLike, type V3, type Xf } from '../lib/geo';
import { TAU, archOutline, blob, fora, ngon, panel, pick, polar, prism, rectPts, revolve, ri, rr, shade, uvBox, vary, type P2, type Rand } from './kit-eclipse';
import { JANELA_TILE, UV_PAINEL, UV_SINAL_LOJA, UV_SINAL_VERTICAL } from './textures-eclipse';
import type { PropLibrary } from './types';

const NEONS = ['glow_cyan', 'glow_magenta', 'glow_violet', 'glow_warm'] as const;
interface Paleta { corpo: string; topo: string; vidro: string; neon: string; neon2: string }
const PALETAS: Paleta[] = [
  { corpo: '#1c2444', topo: '#34407a', vidro: '#a9bce6', neon: 'glow_cyan', neon2: 'glow_magenta' },
  { corpo: '#2b1c42', topo: '#4f3577', vidro: '#c7b0ea', neon: 'glow_magenta', neon2: 'glow_cyan' },
  { corpo: '#14303a', topo: '#22525e', vidro: '#9fd6d0', neon: 'glow_cyan', neon2: 'glow_warm' },
  { corpo: '#262935', topo: '#454b63', vidro: '#c9cede', neon: 'glow_warm', neon2: 'glow_cyan' },
  { corpo: '#2e1b2c', topo: '#5c3350', vidro: '#e3b6cf', neon: 'glow_violet', neon2: 'glow_warm' },
];

/** Arte luminosa em camadas coincidentes (uma máscara por cor de luz). */
function arte(m: Model, base: 'ecl_painel' | 'ecl_sinal', w: number, h: number, rect: [number, number, number, number], x: Xf): void {
  for (const layer of ['c', 'm', 'w']) m.add(panel(w, h, rect), `${base}_${layer}`, '#ffffff', x);
}

/** Painéis de janelas em cada face larga de um contorno: vidro escuro + faixas de andares acesos (quente ou frio). */
function fachadas(m: Model, rand: Rand, pts: P2[], at: P2, y0: number, h: number, vidro: ColorLike): void {
  const T = JANELA_TILE;
  const n = pts.length;
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x / n; cz += z / n; }
  const floors = Math.floor(h / T.andar);
  if (floors < 1) return;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!, b = pts[(i + 1) % n]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const cols = Math.floor((len - 1.2) / T.col);
    if (cols < 1) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = b[1] - a[1], nz = -(b[0] - a[0]);
    if (nx * (mx - cx) + nz * (mz - cz) < 0) { nx = -nx; nz = -nz; }
    const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
    const ry = Math.atan2(nx, nz);
    const w = cols * T.col;
    const u0 = ri(rand, 0, 7) / 8, v0 = ri(rand, 0, 7) / 8;
    const u1 = u0 + w / T.w;
    const at3 = (e: number, y: number): Xf => ({ p: [at[0] + mx + nx * e, y, at[1] + mz + nz * e], r: [0, ry, 0] });
    m.add(panel(w, floors * T.andar, [u0, v0, u1, v0 + floors / 8]), 'ecl_fachada', vidro, at3(0.05, y0 + (floors * T.andar) / 2));
    let f = 0;
    while (f < floors) {
      const band = Math.min(floors - f, ri(rand, 1, 4));
      const k = rand();
      const mat = k < 0.66 ? 'ecl_jan_q' : k < 0.9 ? 'ecl_jan_f' : '';
      if (mat) m.add(panel(w, band * T.andar, [u0, v0 + (floors - f - band) / 8, u1, v0 + (floors - f) / 8]), mat, '#ffffff', at3(0.11, y0 + (f + band / 2) * T.andar));
      f += band;
    }
  }
}

interface BlocoOpts { skirt?: number; neon?: string; chanfro?: number; pilastras?: boolean }
/** Um volume do prédio: corpo metálico chanfrado, fachadas de vidro, cornija e friso de néon. */
function bloco(m: Model, rand: Rand, pal: Paleta, pts: P2[], at: P2, y0: number, h: number, o: BlocoOpts = {}): void {
  const skirt = o.skirt ?? 0.6;
  m.add(prism(pts, y0, y0 + h, { at }), 'paint', gradY(pal.corpo, pal.topo, y0, y0 + h * 1.3));
  fachadas(m, rand, pts, at, y0 + skirt, h - skirt - 0.7, pal.vidro);
  const grow = (k: number): P2[] => pts.map(([x, z]) => [x + Math.sign(x) * k, z + Math.sign(z) * k]);
  m.add(prism(grow(0.35), y0 + h - 0.45, y0 + h, { at, cap: 'both' }), 'paint', mix(pal.topo, '#8892b8', 0.35));
  if (o.neon) m.add(prism(grow(0.42), y0 + h - 0.28, y0 + h - 0.12, { at, cap: 'none' }), o.neon, '#ffffff');
  if (o.pilastras) {
    for (const [x, z] of pts) m.add(box(0.5, h, 0.5), 'paint', mix(pal.topo, '#aab4d8', 0.25), { p: [at[0] + x * 1.0, y0 + h / 2, at[1] + z * 1.0], r: [0, Math.PI / 4, 0] });
  }
}

function antena(m: Model, rand: Rand, x: number, y: number, z: number, h: number): void {
  m.add(cyl(0.05, 0.14, h, 6), 'paint', '#8d97ad', { p: [x, y + h / 2, z] });
  const bars = ri(rand, 1, 3);
  for (let i = 0; i < bars; i++) m.add(box(rr(rand, 0.8, 1.6), 0.06, 0.06), 'paint', '#8d97ad', { p: [x, y + h * (0.45 + i * 0.16), z], r: [0, rand() * 3, 0] });
  m.add(ico(0.2, 0), 'glow_red', '#ffffff', { p: [x, y + h + 0.1, z] });
}

function telhado(m: Model, rand: Rand, w: number, d: number, y: number, at: P2): void {
  const k = ri(rand, 1, 3);
  for (let i = 0; i < k; i++) {
    const bw = rr(rand, 1.2, 2.6), bh = rr(rand, 0.8, 1.6);
    m.add(box(bw, bh, rr(rand, 1.2, 2.2), 0.12, 1), 'std', vary('#596078', rand), { p: [at[0] + rr(rand, -0.3, 0.3) * w, y + bh / 2, at[1] + rr(rand, -0.3, 0.3) * d] });
  }
  if (rand() < 0.6) {
    const tx = at[0] + rr(rand, -0.25, 0.25) * w, tz = at[1] + rr(rand, -0.25, 0.25) * d;
    m.add(cyl(0.9, 0.9, 1.5, 10), 'paint', '#6d7892', { p: [tx, y + 1.55, tz] });
    m.add(cone(1.0, 0.5, 10), 'paint', '#56607a', { p: [tx, y + 2.55, tz] });
    for (let i = 0; i < 3; i++) m.add(cyl(0.06, 0.06, 0.9, 5), 'paint', '#56607a', { p: [tx + Math.cos(i * 2.1) * 0.7, y + 0.45, tz + Math.sin(i * 2.1) * 0.7] });
  }
}

/** Letreiro vertical em lâmina (duas faces), preso à fachada frontal. */
function letreiroVertical(m: Model, rand: Rand, x: number, zFace: number, y: number, h: number, pal: Paleta): void {
  const w = h / 8, idx = ri(rand, 0, 3), z = zFace + w / 2 + 0.5;
  m.add(box(0.36, h + 0.4, w + 0.3, 0.08, 1), 'paint', '#10131f', { p: [x, y, z] });
  m.add(box(0.44, h + 0.5, 0.1), pal.neon2, '#ffffff', { p: [x, y, z + w / 2 + 0.16] });
  for (const s of [-1, 1]) {
    arte(m, 'ecl_sinal', w, h, UV_SINAL_VERTICAL(idx), { p: [x + s * 0.19, y, z], r: [0, (s * Math.PI) / 2, 0] });
    m.add(box(0.14, 0.14, 0.7), 'paint', '#7f89a3', { p: [x, y + s * h * 0.36, zFace + 0.3] });
  }
}

/** Térreo: saguão envidraçado, porta iluminada e marquise com luz embaixo. */
function marquise(m: Model, rand: Rand, w: number, zFace: number, pal: Paleta): void {
  const mw = Math.min(w * 0.62, 9), md = rr(rand, 2.4, 3.4);
  m.add(box(mw + 1.4, 4.1, 0.3), 'glossy', gradY('#0e2c3c', '#1d5068', 0, 4), { p: [0, 2.2, zFace + 0.1] });
  m.add(box(2.6, 3.1, 0.12), 'glow_white', '#ffffff', { p: [0, 1.6, zFace + 0.26] });
  m.add(box(0.12, 3.1, 0.16), 'paint', '#10131f', { p: [0, 1.6, zFace + 0.3] });
  for (const s of [-1, 1]) m.add(box(0.2, 3.3, 0.2), 'paint', '#10131f', { p: [s * 1.4, 1.65, zFace + 0.3] });
  m.add(extrude([[-mw / 2, 0], [mw / 2, 0], [mw / 2 - 0.5, 0.42], [-mw / 2 + 0.5, 0.42]], md, 0.05), 'paint', mix(pal.topo, '#9aa6cc', 0.3), { p: [0, 4.5, zFace + md / 2] });
  m.add(box(mw - 0.8, 0.08, md - 0.6), 'glow_white', '#ffffff', { p: [0, 4.47, zFace + md / 2] });
  m.add(box(mw + 0.1, 0.14, 0.12), pal.neon, '#ffffff', { p: [0, 4.72, zFace + md + 0.04] });
  for (const s of [-1, 1]) m.add(cyl(0.1, 0.1, 4.5, 8), 'glossy', '#b9c4dc', { p: [s * (mw / 2 - 0.5), 2.25, zFace + md - 0.4] });
}

function predioNeon(rand: Rand): Model {
  const m = new Model();
  const pal = pick(rand, PALETAS);
  const estilo = ri(rand, 0, 4);
  const H = rr(rand, 34, 66);
  const W = ri(rand, 7, 9) * 2 + 1.6, D = ri(rand, 6, 8) * 2 + 1.6;
  let frente = D / 2;
  let topo = H;
  if (estilo === 0) { // escalonado clássico: três recuos e agulha
    const h1 = H * rr(rand, 0.42, 0.5), h2 = H * rr(rand, 0.28, 0.32), h3 = H - h1 - h2;
    bloco(m, rand, pal, rectPts(W, D, 0.8), [0, 0], 0, h1, { skirt: 5.6, neon: pal.neon, pilastras: true });
    bloco(m, rand, pal, rectPts(W - 4, D - 4, 0.7), [0, 0], h1, h2, { neon: pal.neon2 });
    bloco(m, rand, pal, rectPts(W - 8, D - 8, 0.6), [0, 0], h1 + h2, h3, { neon: pal.neon });
    m.add(prism(rectPts(W - 10.5, D - 10.5, 0.4), H, H + 3.2, { top: 0.55 }), 'paint', pal.topo);
    m.add(prism(ngon(0.5, 6), H + 3.2, H + 12, { top: 0.1 }), 'paint', '#9aa5c0');
    m.add(torus(1.1, 0.09, 6, 16), pal.neon, '#ffffff', { p: [0, H + 5.2, 0], r: [Math.PI / 2, 0, 0] });
    m.add(ico(0.26, 0), 'glow_red', '#ffffff', { p: [0, H + 12.2, 0] });
    telhado(m, rand, W - 2, 3, h1, [0, D / 2 - 1.6]);
    topo = h1 + h2 * 0.5;
  } else if (estilo === 1) { // torres gêmeas desiguais sobre um pódio, ligadas por passarela
    const hp = rr(rand, 9, 12), wt = Math.floor((W - 4) / 4) * 2 + 1.6;
    bloco(m, rand, pal, rectPts(W + 2, D, 0.8), [0, 0], 0, hp, { skirt: 5.6, neon: pal.neon, pilastras: true });
    const xa = -(W + 2) / 2 + wt / 2 + 0.6, xb = (W + 2) / 2 - wt / 2 - 0.6, hb = H * rr(rand, 0.62, 0.78);
    bloco(m, rand, pal, rectPts(wt, D - 3, 0.6), [xa, 0], hp, H - hp, { neon: pal.neon2 });
    bloco(m, rand, pal, rectPts(wt, D - 3, 0.6), [xb, 0], hp, hb - hp, { neon: pal.neon });
    const yb = hp + (hb - hp) * rr(rand, 0.5, 0.75);
    m.add(box(xb - xa - wt + 0.6, 2.8, 3.2, 0.3, 1), 'glossy', gradY('#12384a', '#2a6f86', yb - 1.4, yb + 1.4), { p: [(xa + xb) / 2, yb, 0] });
    for (const s of [-1, 1]) m.add(box(xb - xa - wt + 0.7, 0.14, 0.14), pal.neon, '#ffffff', { p: [(xa + xb) / 2, yb - 1.2, s * 1.62] });
    m.add(prism(rectPts(wt - 2, D - 5, 0.5), H, H + 2.4, { top: 0.7, shift: [0.6, 0] }), 'paint', pal.topo, );
    antena(m, rand, xa - 1, H + 2.4, 0, rr(rand, 6, 9));
    antena(m, rand, xa + 1.4, H + 2.4, 1, rr(rand, 3, 5));
    telhado(m, rand, wt - 2, D - 5, hb, [xb, 0]);
    topo = hb * 0.8;
  } else if (estilo === 2) { // cunha: coroa inclinada e aleta lateral luminosa
    const hs = H * rr(rand, 0.74, 0.82);
    bloco(m, rand, pal, rectPts(W, D, 0.8), [0, 0], 0, 9, { skirt: 5.6, neon: pal.neon, pilastras: true });
    bloco(m, rand, pal, rectPts(W - 3, D - 2, 0.7), [0, 0], 9, hs - 9, { neon: pal.neon2 });
    const cw = W - 3.6, cd = D - 2.6;
    m.add(extrude([[-cw / 2, 0], [cw / 2, 0], [cw / 2, H - hs], [-cw / 2, (H - hs) * 0.28]], cd, 0.12), 'paint', gradY(pal.topo, mix(pal.topo, '#b0bbe0', 0.4), hs, H), { p: [0, hs, 0] });
    const ang = Math.atan2((H - hs) * 0.72, cw);
    for (const s of [-1, 1]) m.add(box(Math.hypot(cw, (H - hs) * 0.72) + 0.2, 0.2, 0.2), pal.neon, '#ffffff', { p: [0, hs + (H - hs) * 0.64 + 0.2, s * (cd / 2 + 0.05)], r: [0, 0, ang] });
    const fx = (W - 3) / 2 + 0.25;
    m.add(prism(rectPts(0.7, 3.4, 0.2), 9, H + 5, { at: [fx, 0], top: 0.6 }), 'paint', pal.corpo);
    m.add(box(0.14, H - 6, 0.5), pal.neon, '#ffffff', { p: [fx + 0.36, 9 + (H - 6) / 2, 0] });
    antena(m, rand, cw / 2 - 1, H, 0, rr(rand, 5, 8));
    topo = hs * 0.75;
  } else if (estilo === 3) { // torre oitavada com anéis e coroa em halo
    const r = rr(rand, 8.6, 10), hp = 8;
    bloco(m, rand, pal, rectPts(W + 1, D + 1, 1.6), [0, 0], 0, hp, { skirt: 5.6, neon: pal.neon });
    frente = (D + 1) / 2;
    const oct = ngon(r, 8, Math.PI / 8);
    const seg = ri(rand, 2, 3), hsg = (H - hp) / seg;
    for (let i = 0; i < seg; i++) {
      const k = 1 - i * 0.1;
      bloco(m, rand, pal, oct.map(([x, z]) => [x * k, z * k] as P2), [0, 0], hp + i * hsg, hsg - 1, { neon: i % 2 ? pal.neon : pal.neon2 });
      m.add(prism(ngon(r * k * 0.86, 8, Math.PI / 8), hp + (i + 1) * hsg - 1, hp + (i + 1) * hsg, { cap: 'none' }), 'paint', '#0d101a');
    }
    const kt = 1 - seg * 0.1;
    m.add(prism(ngon(r * kt * 0.8, 8, Math.PI / 8), H, H + 4, { top: 0.45 }), 'paint', gradY(pal.topo, mix(pal.topo, '#c0c8ea', 0.4), H, H + 4));
    m.add(torus(r * kt * 0.72, 0.16, 6, 24), pal.neon, '#ffffff', { p: [0, H + 5.4, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) m.add(cyl(0.07, 0.07, 1.6, 5), 'paint', '#8d97ad', { p: [Math.cos(i * 1.57) * r * kt * 0.72, H + 4.7, Math.sin(i * 1.57) * r * kt * 0.72] });
    m.add(prism(ngon(0.45, 6), H + 4, H + 13, { top: 0.1 }), 'paint', '#9aa5c0');
    m.add(ico(0.26, 0), 'glow_red', '#ffffff', { p: [0, H + 13.2, 0] });
    topo = hp + hsg * 0.6;
  } else { // lajes deslocadas com vãos recuados e telão no topo
    const n = ri(rand, 3, 4), hb = H / n;
    let px = 0, pz = 0;
    for (let i = 0; i < n; i++) {
      const sx = i === 0 ? 0 : rr(rand, -1.6, 1.6), sz = i === 0 ? 0 : rr(rand, -1.2, 0.4);
      const wi = W - (i === 0 ? 0 : 2) - (i % 2) * 2, di = D - (i === 0 ? 0 : 2);
      if (i > 0) m.add(prism(rectPts(wi - 3, di - 3, 0.5), i * hb - 0.2, i * hb + 1.2, { at: [(px + sx) / 2, (pz + sz) / 2], cap: 'none' }), 'paint', '#0d101a');
      bloco(m, rand, pal, rectPts(wi, di, 0.8), [sx, sz], i * hb + (i ? 1.2 : 0), hb - (i ? 1.2 : 0), { skirt: i ? 0.6 : 5.6, neon: i % 2 ? pal.neon2 : pal.neon, pilastras: i === 0 });
      px = sx; pz = sz;
    }
    const pw = Math.min(W - 5, 10), ph = pw / 2;
    m.add(box(pw + 0.5, ph + 0.5, 0.5, 0.1, 1), 'paint', '#10131f', { p: [px, H + 1.6 + ph / 2, pz + 1] });
    arte(m, 'ecl_painel', pw, ph, UV_PAINEL(ri(rand, 0, 3)), { p: [px, H + 1.6 + ph / 2, pz + 1.27] });
    for (const s of [-1, 1]) m.add(box(0.25, 1.8, 0.25), 'paint', '#6d7892', { p: [px + s * pw * 0.35, H + 0.8, pz + 0.9] });
    antena(m, rand, px - pw * 0.3, H, pz - 2.5, rr(rand, 5, 8));
    telhado(m, rand, W - 6, 2, H, [px, pz - 3]);
    topo = hb * 0.9;
  }
  marquise(m, rand, W, frente, pal);
  const lh = rr(rand, 9, 12);
  letreiroVertical(m, rand, (rand() < 0.5 ? -1 : 1) * (W / 2 - 2.2), frente, Math.max(11.5, Math.min(topo, 22)), lh, pal);
  // soleira/calçada do prédio
  m.add(prism(rectPts(W + 2.4, D + 2.4, 1), -0.2, 0.18, { uv: 3 }), 'ecl_concreto', '#8a90a6');
  return m;
}


function predioBaixo(rand: Rand): Model {
  const m = new Model();
  const pal = pick(rand, PALETAS);
  const W = ri(rand, 4, 5) * 2 + 1.4, D = rr(rand, 6, 7.4), H = rr(rand, 7.2, 8.2), zf = D / 2;
  const cor = vary(pick(rand, ['#3b4a7a', '#5a3a72', '#2f5f66', '#6a3f52']), rand);
  m.add(prism(rectPts(W + 1.6, D + 1.6, 0.6), -0.2, 0.16, { uv: 3 }), 'ecl_concreto', '#8a90a6');
  m.add(prism(rectPts(W, D, 0.35), 0, H), 'paint', gradY(mix(cor, '#000000', 0.35), cor, 0, H));
  // andar de cima: janelas acesas + cornija com néon
  fachadas(m, rand, rectPts(W, D, 0.35), [0, 0], 4.2, 3, pal.vidro);
  m.add(prism(rectPts(W + 0.5, D + 0.5, 0.45), H - 0.4, H, { cap: 'both' }), 'paint', mix(cor, '#c0c8ea', 0.35));
  m.add(prism(rectPts(W + 0.62, D + 0.62, 0.5), H - 0.26, H - 0.12, { cap: 'none' }), pal.neon, '#ffffff');
  // vitrine iluminada: interior claro, mercadorias em silhueta, vidro e montantes
  const vw = W - 4.2, x0 = -W / 2 + 0.9 + vw / 2;
  m.add(box(vw, 2.7, 0.1), 'glow_warm', '#ffffff', { p: [x0, 1.95, zf - 0.02] });
  for (let i = 0; i < 4; i++) {
    const h = rr(rand, 0.6, 1.5);
    m.add(box(rr(rand, 0.4, 0.8), h, 0.1), 'matte', vary('#1c1630', rand, 0.1), { p: [x0 - vw / 2 + (i + 0.5) * (vw / 4) + rr(rand, -0.2, 0.2), 0.62 + h / 2, zf + 0.06] });
  }
  m.add(box(vw + 0.3, 0.5, 0.36), 'paint', mix(cor, '#000000', 0.5), { p: [x0, 0.35, zf + 0.06] });
  m.add(box(vw + 0.3, 0.16, 0.3), 'glossy', '#b9c4dc', { p: [x0, 3.38, zf + 0.1] });
  for (let i = 0; i <= 3; i++) m.add(box(0.1, 2.8, 0.16), 'glossy', '#b9c4dc', { p: [x0 - vw / 2 + (i * vw) / 3, 1.95, zf + 0.12] });
  m.add(box(vw, 2.7, 0.04), 'glass', '#9fd8ff', { p: [x0, 1.95, zf + 0.16] });
  // porta
  const xd = W / 2 - 1.7;
  m.add(box(1.7, 2.9, 0.12), 'glossy', gradY('#0e2c3c', '#1d5068', 0, 3), { p: [xd, 1.5, zf + 0.04] });
  m.add(box(1.9, 0.14, 0.2), pal.neon2, '#ffffff', { p: [xd, 3.05, zf + 0.08] });
  m.add(box(0.06, 0.9, 0.08), 'glossy', '#d6def0', { p: [xd - 0.5, 1.5, zf + 0.14] });
  // toldo e letreiro da marca
  m.add(extrude([[0, 0], [1.5, -0.45], [1.5, -0.6], [0, -0.14]], W - 0.6, 0.03), 'cloth', vary(pick(rand, ['#d84a8a', '#3ab8c8', '#e8a23a']), rand), { p: [0, 3.95, zf], r: [0, -Math.PI / 2, 0] });
  const sw = Math.min(W - 2, 6.4), sh = sw / 2;
  m.add(box(sw + 0.4, sh + 0.4, 0.4, 0.1, 1), 'paint', '#10131f', { p: [0, H + sh / 2 + 0.5, zf - 0.6] });
  arte(m, 'ecl_sinal', sw, sh, UV_SINAL_LOJA(ri(rand, 0, 3)), { p: [0, H + sh / 2 + 0.5, zf - 0.39] });
  for (const s of [-1, 1]) m.add(box(0.2, 1.2, 0.2), 'paint', '#6d7892', { p: [s * sw * 0.36, H + 0.3, zf - 0.75] });
  telhado(m, rand, W - 3, D - 4, H, [0, -1]);
  return m;
}

function painelLuminoso(rand: Rand): Model {
  const m = new Model();
  const yb = rr(rand, 5.2, 6.4), w = 8, h = 4, yc = yb + h / 2;
  m.add(prism(ngon(1.0, 8), -0.2, 0.5, { top: 0.8, uv: 2 }), 'ecl_concreto', '#8a90a6');
  m.add(prism(ngon(0.42, 8), 0.5, yb + 0.4, { top: 0.72 }), 'paint', gradY('#3a4258', '#7b86a2', 0, yb));
  m.add(torus(0.46, 0.07, 5, 12), 'glow_cyan', '#ffffff', { p: [0, 1.6, 0], r: [Math.PI / 2, 0, 0] });
  m.add(box(w + 0.6, h + 0.6, 0.5, 0.12, 1), 'paint', '#12151f', { p: [0, yc, 0] });
  m.add(box(w, h, 0.06), 'matte', '#07080d', { p: [0, yc, 0.26] });
  arte(m, 'ecl_painel', w, h, UV_PAINEL(ri(rand, 0, 3)), { p: [0, yc, 0.3] });
  // passarela de manutenção, refletores e treliça traseira
  m.add(box(w + 0.4, 0.1, 0.9), 'paint', '#56607a', { p: [0, yb - 0.45, 0.55] });
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + 1 + (i * (w - 2)) / 3;
    m.add(box(0.07, 0.07, 1.1), 'paint', '#7f89a3', { p: [x, yb + h + 0.45, 0.7], r: [0.35, 0, 0] });
    m.add(box(0.5, 0.16, 0.26), 'glow_white', '#ffffff', { p: [x, yb + h + 0.26, 1.2], r: [0.9, 0, 0] });
  }
  for (const s of [-1, 1]) {
    m.add(box(0.12, h * 1.25, 0.12), 'paint', '#56607a', { p: [s * 1.6, yc, -0.42], r: [0, 0, s * 0.62] });
    m.add(box(0.14, h, 0.14), 'paint', '#56607a', { p: [s * 3.2, yc, -0.34] });
  }
  m.add(ico(0.16, 0), 'glow_red', '#ffffff', { p: [w / 2, yb + h + 0.5, 0] });
  m.add(ico(0.16, 0), 'glow_red', '#ffffff', { p: [-w / 2, yb + h + 0.5, 0] });
  return m;
}

function posteNeon(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 6.6, 7.6), neon = pick(rand, NEONS), alc = rr(rand, 1.6, 2.2);
  m.add(prism(ngon(0.34, 8), -0.1, 0.5, { top: 0.7 }), 'paint', '#3a4258');
  m.add(tube([[0, 0.4, 0], [0, H * 0.6, 0], [0, H - 0.5, 0.15], [0, H, alc * 0.5], [0, H + 0.05, alc]], (t) => 0.12 - t * 0.05, 14, 7), 'paint', gradY('#39415a', '#8b96b4', 0, H));
  m.add(torus(0.2, 0.05, 5, 12), neon, '#ffffff', { p: [0, 1.3, 0], r: [Math.PI / 2, 0, 0] });
  m.add(revolve([[0.08, 0.12], [0.42, 0.05], [0.5, -0.06], [0.44, -0.14]], 12), 'paint', '#1a1e2c', { p: [0, H + 0.05, alc + 0.2] });
  m.add(torus(0.5, 0.06, 6, 18), neon, '#ffffff', { p: [0, H - 0.03, alc + 0.2], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.34, 0.34, 0.05, 12), 'glow_white', '#ffffff', { p: [0, H - 0.1, alc + 0.2] });
  if (rand() < 0.6) { // faixa de banner preso ao poste
    m.add(box(0.05, 1.5, 0.7), 'cloth', vary('#c93f8f', rand, 0.2), { p: [0, H * 0.62, -0.5] });
    for (const y of [0.7, -0.7]) m.add(box(0.05, 0.05, 0.85), 'paint', '#8b96b4', { p: [0, H * 0.62 + y, -0.45] });
  }
  return m;
}

function viadutoPilar(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 8.5, 10.5), a = rr(rand, 3.4, 4.2), s = 1.15, neon = pick(rand, ['glow_cyan', 'glow_magenta']);
  const y = H * 0.45;
  const out: P2[] = [[-s, 0], [-s, y], [-a, H], [-a + 1.5, H], [0, y + 1.7], [a - 1.5, H], [a, H], [s, y], [s, 0]];
  m.add(uvBox(extrude(out, 2.2, 0.14), 4), 'ecl_concreto', shade('#6f7790', '#b4bbd0', 0, H));
  m.add(uvBox(box(a * 2 + 2.6, 1.0, 3.2, 0.12, 1), 4), 'ecl_concreto', '#b4bbd0', { p: [0, H + 0.5, 0] });
  m.add(uvBox(prism(rectPts(4, 3.6, 0.4), -0.2, 0.7, { top: 0.82 }), 4), 'ecl_concreto', '#7b839c');
  for (const z of [1.24, -1.24]) {
    m.add(box(0.22, y - 1.4, 0.1), neon, '#ffffff', { p: [0, 1 + (y - 1.4) / 2, z] });
    for (const sg of [-1, 1]) {
      const L = Math.hypot(a - s - 0.75, H - y) * 0.8;
      m.add(box(0.18, L, 0.1), neon, '#ffffff', { p: [sg * (s + a - 0.75) / 2, (y + H) / 2 + 0.2, z], r: [0, 0, -sg * Math.atan2(a - s - 0.75, H - y)] });
    }
  }
  for (const sg of [-1, 1]) m.add(box(a * 2 + 2.6, 0.1, 0.08), 'glow_warm', '#ffffff', { p: [0, H + 0.12, sg * 1.62] });
  return m;
}

function tunelNeon(rand: Rand, span = 16): Model {
  const m = new Model();
  const half = span / 2 + 0.45, spring = 6.4, rise = Math.min(3.2, span * 0.16);
  m.add(uvBox(extrude(archOutline(half * 2, spring, rise, 1.5, 1.0, 12), 10.6), 5), 'ecl_concreto', shade('#3c4460', '#7a84a4', 0, spring + rise + 1));
  // portais nas duas bocas
  for (const z of [5.65, -5.65]) {
    m.add(uvBox(extrude(archOutline(half * 2, spring, rise, 2.3, 1.9, 12), 0.7, 0.08), 5), 'ecl_concreto', shade('#59627f', '#aab3cc', 0, spring + rise + 2), { p: [0, 0, z] });
    const zs = z + Math.sign(z) * 0.44;
    m.add(box(5.2, 1.1, 0.12), 'paint', '#10131f', { p: [0, spring + rise + 1.05, zs] });
    for (let i = -2; i <= 2; i++) m.add(extrude([[-0.3, 0.3], [0, 0], [-0.3, -0.3], [-0.05, -0.3], [0.25, 0], [-0.05, 0.3]], 0.06), i % 2 ? 'glow_magenta' : 'glow_cyan', '#ffffff', { p: [i * 0.9 * Math.sign(z), spring + rise + 1.05, zs + Math.sign(z) * 0.08], r: [0, z > 0 ? 0 : Math.PI, 0] });
    for (const s of [-1, 1]) {
      m.add(box(0.5, spring - 0.6, 0.12), 'glow_warm', '#ffffff', { p: [s * (half + 1.3), spring / 2 + 0.3, zs] });
      for (let k = 0; k < 4; k++) m.add(box(0.52, 0.5, 0.14), 'paint', '#10131f', { p: [s * (half + 1.3), 1 + k * 1.5, zs + Math.sign(z) * 0.01], r: [0, 0, 0.5 * s] });
    }
  }
  // aros de luz internos
  const n = 5;
  for (let i = 0; i < n; i++) {
    const z = -4.4 + (i * 8.8) / (n - 1), hr = half - 0.16;
    const pts: V3[] = [[-hr, 0.2, z], [-hr, spring * 0.5, z], [-hr, spring, z]];
    for (let k = 1; k < 8; k++) pts.push([-Math.cos((k / 8) * Math.PI) * hr, spring + Math.sin((k / 8) * Math.PI) * (rise - 0.16), z]);
    pts.push([hr, spring, z], [hr, spring * 0.5, z], [hr, 0.2, z]);
    m.add(tube(pts, 0.1, 36, 4), i % 2 ? 'glow_magenta' : 'glow_cyan', '#ffffff');
  }
  // luminárias de teto e dutos
  for (const z of [-3.3, -1.1, 1.1, 3.3]) m.add(box(1.6, 0.12, 0.5), 'glow_white', '#ffffff', { p: [0, spring + rise - 0.12, z] });
  for (const s of [-1, 1]) m.add(cyl(0.14, 0.14, 10.4, 6), 'paint', '#56607a', { p: [s * half * 0.5, spring + rise * 0.86 - 0.3, 0], r: [Math.PI / 2, 0, 0] });
  // topo: guarda-corpo e respiro
  m.add(box(half * 2 + 3, 0.12, 0.12), 'glow_cyan', '#ffffff', { p: [0, spring + rise + 2.0, 6.0] });
  const vx = rr(rand, -0.3, 0.3) * span;
  m.add(box(2.2, 1.2, 2.2, 0.15, 1), 'std', '#596078', { p: [vx, spring + rise + 1.6, 0] });
  m.add(cyl(0.7, 0.7, 0.3, 10), 'paint', '#3a4258', { p: [vx, spring + rise + 2.3, 0] });
  return m;
}

function porticoNeon(rand: Rand, span = 16): Model {
  const m = new Model();
  const x = span / 2 + 0.9, yb = 6.7, neon = pick(rand, ['glow_cyan', 'glow_magenta']);
  for (const s of [-1, 1]) {
    m.add(prism(rectPts(1.3, 1.5, 0.3), -0.2, 0.9, { top: 0.8, at: [s * x, 0], uv: 3 }), 'ecl_concreto', '#8a90a6');
    m.add(prism(rectPts(0.62, 0.8, 0.14), 0.9, yb + 1.9, { at: [s * x, 0], top: 0.85 }), 'paint', gradY('#232a44', '#4c5886', 0, 9));
    m.add(box(0.1, yb - 1.6, 0.3), neon, '#ffffff', { p: [s * (x - 0.34), 1.2 + (yb - 1.6) / 2, 0] });
    m.add(box(0.9, 0.14, 0.14), 'paint', '#7f89a3', { p: [s * (x - 0.42), yb - 0.3, 0], r: [0, 0, s * 0.75] });
  }
  // viga treliçada
  for (const [y, z] of [[yb + 0.1, 0.5], [yb + 0.1, -0.5], [yb + 1.7, 0.5], [yb + 1.7, -0.5]] as P2[]) m.add(box(x * 2, 0.16, 0.16), 'paint', '#7f89a3', { p: [0, y, z] });
  const nb = Math.round((x * 2) / 1.8);
  for (let i = 0; i < nb; i++) {
    const cx = -x + (i + 0.5) * ((x * 2) / nb);
    for (const z of [0.5, -0.5]) m.add(box(0.09, 1.95, 0.09), 'paint', '#6d7892', { p: [cx, yb + 0.9, z], r: [0, 0, (i % 2 ? 1 : -1) * 0.5] });
  }
  // painéis com setas luminosas (uma por faixa)
  const lanes = Math.max(2, Math.round(span / 5.4)), lw = span / lanes;
  for (let i = 0; i < lanes; i++) {
    const cx = -span / 2 + (i + 0.5) * lw, mat = i % 2 ? 'glow_green' : 'glow_warm';
    m.add(box(lw - 0.8, 2.3, 0.3, 0.08, 1), 'paint', '#10131f', { p: [cx, yb + 0.95, 0.72] });
    m.add(box(lw - 1.0, 0.08, 0.06), neon, '#ffffff', { p: [cx, yb - 0.1, 0.9] });
    for (let k = 0; k < 2; k++) m.add(extrude([[-0.75, 0.25], [0, -0.3], [0.75, 0.25], [0.75, 0.55], [0, 0], [-0.75, 0.55]], 0.06), mat, '#ffffff', { p: [cx, yb + 0.6 + k * 0.72, 0.9] });
    m.add(box(0.5, 0.14, 0.3), 'glow_white', '#ffffff', { p: [cx, yb - 0.18, 0] });
  }
  m.add(ico(0.18, 0), 'glow_red', '#ffffff', { p: [x, yb + 2.1, 0] });
  m.add(ico(0.18, 0), 'glow_red', '#ffffff', { p: [-x, yb + 2.1, 0] });
  return m;
}

function hologramaBase(rand: Rand): Model {
  const m = new Model();
  const cor = vary('#2a3150', rand);
  m.add(revolve([[1.15, -0.1], [1.1, 0.25], [0.8, 0.45], [0.62, 0.95], [0.72, 1.05], [0.5, 1.15], [0.001, 1.15]], 12), 'paint', gradY('#151a2c', cor, 0, 1.2));
  m.add(torus(0.98, 0.06, 5, 18), 'glow_cyan', '#ffffff', { p: [0, 0.34, 0], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.36, 0.36, 0.06, 12), 'glow_white', '#ffffff', { p: [0, 1.17, 0] });
  for (let i = 0; i < 3; i++) m.add(box(0.16, 0.5, 0.34), 'paint', '#7f89a3', { p: polar(i * 2.094 + 0.4, 0.86, 0.5), r: [0, fora(i * 2.094 + 0.4), 0] });
  // feixe de projeção
  m.add(cyl(1.25, 0.34, 2.0, 12, true), 'ecl_holo', '#ffffff', { p: [0, 2.2, 0] });
  return m;
}
function hologramaFigura(rand: Rand): Model {
  const m = new Model();
  const tipo = ri(rand, 0, 2);
  if (tipo === 0) { // emblema do eclipse com órbitas
    m.add(ico(0.75, 1), 'ecl_holo', '#ffffff', { p: [0, 1.1, 0] });
    m.add(torus(1.25, 0.05, 4, 24), 'ecl_holo', '#ffffff', { p: [0, 1.1, 0], r: [1.2, 0, 0.3] });
    m.add(torus(1.0, 0.05, 4, 24), 'ecl_holo', '#ffffff', { p: [0, 1.1, 0], r: [0.5, 0, -0.6] });
  } else if (tipo === 1) { // troféu
    m.add(revolve([[0.4, 0], [0.42, 0.12], [0.12, 0.3], [0.1, 0.8], [0.5, 1.2], [0.72, 1.9], [0.66, 1.92], [0.001, 1.3]], 10), 'ecl_holo', '#ffffff');
    for (const s of [-1, 1]) m.add(torus(0.3, 0.05, 4, 10, Math.PI), 'ecl_holo', '#ffffff', { p: [s * 0.62, 1.55, 0], r: [0, 0, -s * Math.PI / 2] });
  } else { // seta dupla de corrida
    for (let k = 0; k < 3; k++) m.add(extrude([[-0.9, 0.3], [0, -0.35], [0.9, 0.3], [0.9, 0.7], [0, 0.05], [-0.9, 0.7]], 0.12), 'ecl_holo', '#ffffff', { p: [0, 0.5 + k * 0.7, 0], r: [0, 0, Math.PI] });
  }
  m.add(torus(1.4, 0.03, 4, 24), 'glow_cyan', '#ffffff', { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0] });
  return m;
}

function barreiraNeon(rand: Rand): Model {
  const m = new Model();
  const neon = pick(rand, ['glow_cyan', 'glow_magenta', 'glow_warm']);
  const perfil: P2[] = [[-0.42, 0], [-0.42, 0.22], [-0.2, 0.5], [-0.13, 1.02], [0.13, 1.02], [0.2, 0.5], [0.42, 0.22], [0.42, 0]];
  m.add(uvBox(extrude(perfil, 3.96, 0.02), 2.5), 'ecl_concreto', shade('#7b839c', '#c3c9da', 0, 1), { r: [0, Math.PI / 2, 0] });
  for (const s of [-1, 1]) {
    m.add(box(3.7, 0.09, 0.05), neon, '#ffffff', { p: [0, 0.8, s * 0.175], r: [s * -0.13, 0, 0] });
    for (let i = 0; i < 3; i++) m.add(extrude([[-0.16, 0.1], [0, -0.06], [0.16, 0.1], [0.16, 0.2], [0, 0.04], [-0.16, 0.2]], 0.03), 'paint', '#1a1e2c', { p: [-1.2 + i * 1.2, 0.3, s * 0.37], r: [s * -0.66, 0, Math.PI / 2] });
  }
  for (const x of [-1.98, 1.98]) m.add(box(0.06, 0.9, 0.3), 'paint', '#56607a', { p: [x, 0.5, 0] });
  m.add(box(3.6, 0.04, 0.2), 'paint', '#1a1e2c', { p: [0, 1.03, 0] });
  return m;
}

function bancaLamen(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#b8323f', '#2f6f8f', '#7a3f9a']), rand);
  m.add(box(3.6, 0.14, 2.6), 'ecl_concreto', '#8a90a6', { p: [0, -0.03, 0] });
  // balcão em U e cozinha
  m.add(uvBox(box(3.2, 1.0, 0.5, 0.05, 1), 2), 'ecl_madeira', gradY('#6b4630', '#a9744c', 0, 1), { p: [0, 0.5, 0.9] });
  m.add(box(3.4, 0.08, 0.7), 'ecl_madeira', '#c99a6a', { p: [0, 1.04, 0.92] });
  m.add(box(3.2, 1.9, 0.12), 'paint', mix(cor, '#000000', 0.4), { p: [0, 0.95, -1.05] });
  m.add(box(1.2, 0.9, 0.6), 'paint', '#8b96b4', { p: [-0.8, 0.45, -0.7] });
  m.add(cyl(0.3, 0.26, 0.4, 10), 'paint', '#c9d2e6', { p: [-0.8, 1.1, -0.7] });
  m.add(blob(0.3, rand, { detail: 1, s: [1, 0.7, 1], faceted: false }), 'ecl_nuvem', '#ffffff', { p: [-0.8, 1.6, -0.7] });
  for (let i = 0; i < 3; i++) m.add(revolve([[0.12, 0], [0.2, 0.1], [0.001, 0.1]], 8), 'glossy', pick(rand, ['#f2ede0', '#2f4f8f', '#d8553a']), { p: [-1 + i * 0.9, 1.08, 0.95] });
  // postes, telhado e cortinas
  for (const [x, z] of [[-1.6, 1.15], [1.6, 1.15], [-1.6, -1.1], [1.6, -1.1]] as P2[]) m.add(box(0.12, 2.9, 0.12), 'ecl_madeira', '#5a3a2a', { p: [x, 1.45, z] });
  m.add(extrude([[-1.7, 0], [1.9, 0], [1.9, 0.14], [-1.7, 0.5]], 3.9, 0.04), 'paint', gradY(mix(cor, '#000000', 0.2), cor, 0, 0.5), { p: [0, 2.85, 0.1], r: [0, -Math.PI / 2, 0] });
  for (let i = 0; i < 4; i++) m.add(box(0.72, 0.55, 0.03), 'cloth', i % 2 ? '#f2ede0' : cor, { p: [-1.17 + i * 0.78, 2.5, 1.2] });
  // letreiro da marca fictícia KUMO e lanternas
  m.add(box(2.6, 1.3, 0.16), 'paint', '#10131f', { p: [0, 3.9, 0.9] });
  arte(m, 'ecl_painel', 2.4, 1.2, UV_PAINEL(2), { p: [0, 3.9, 0.99] });
  for (const s of [-1, 1]) m.add(box(0.1, 0.6, 0.1), 'paint', '#56607a', { p: [s * 0.9, 3.2, 0.9] });
  for (let i = 0; i < 4; i++) {
    const x = -1.65 + i * 1.1, y = 2.25 - (i % 2) * 0.12;
    m.add(cyl(0.012, 0.012, 0.4, 4), 'paint', '#3a4258', { p: [x, y + 0.42, 1.55] });
    m.add(revolve([[0.07, -0.22], [0.2, -0.1], [0.22, 0.08], [0.07, 0.22]], 8), 'glow_warm', '#ffffff', { p: [x, y, 1.55] });
    for (const yy of [-0.24, 0.24]) m.add(cyl(0.09, 0.09, 0.05, 8), 'paint', '#1a1e2c', { p: [x, y + yy, 1.55] });
  }
  for (let i = 0; i < 3; i++) {
    m.add(cyl(0.2, 0.2, 0.07, 10), 'paint', cor, { p: [-1.1 + i * 1.1, 0.66, 1.75] });
    m.add(cyl(0.04, 0.12, 0.64, 6), 'glossy', '#b9c4dc', { p: [-1.1 + i * 1.1, 0.32, 1.75] });
  }
  return m;
}

function antenaParabolica(rand: Rand): Model {
  const m = new Model();
  const tilt = rr(rand, 0.5, 0.9), yaw = rr(rand, -0.6, 0.6), R = rr(rand, 1.4, 1.8);
  m.add(prism(ngon(0.9, 6), -0.1, 0.4, { top: 0.75 }), 'ecl_concreto', '#8a90a6');
  m.add(cyl(0.14, 0.2, 1.7, 8), 'paint', '#6d7892', { p: [0, 1.2, 0] });
  m.add(box(0.5, 0.4, 0.4, 0.06, 1), 'paint', '#2a3150', { p: [0, 2.05, 0] });
  const d = new Model();
  const prof: [number, number][] = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5; prof.push([Math.max(0.001, R * t), 0.42 * R * t * t]); }
  d.add(revolve([...prof].reverse(), 16), 'paint', gradY('#c9cede', '#f1f3fa', 0, 0.6));
  d.add(revolve(prof.map(([r, y]) => [r, y - 0.05] as [number, number]), 16), 'paint', '#59617d');
  d.add(torus(R, 0.04, 4, 16), 'glow_cyan', '#ffffff', { p: [0, 0.42 * R, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) d.add(cyl(0.025, 0.025, R * 1.12, 4), 'paint', '#8b96b4', { p: polar(i * 2.094, R * 0.42, R * 0.72), r: [0, -i * 2.094, 0.72] });
  d.add(cyl(0.1, 0.14, 0.3, 8), 'paint', '#3a4258', { p: [0, R * 1.18, 0] });
  d.add(ico(0.1, 0), 'glow_red', '#ffffff', { p: [0, R * 1.36, 0] });
  d.transform({ r: [tilt, yaw, 0], p: [0, 2.2, 0.1] });
  m.addModel(d);
  return m;
}

function arvoreUrbana(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 4.6, 6), folha = vary(pick(rand, ['#2f8f7a', '#3a9f5f', '#7a4fb0']), rand, 0.08);
  m.add(revolve([[1.15, -0.1], [1.2, 0.45], [1.05, 0.55], [0.9, 0.5], [0.001, 0.46]], 10, { uv: 2 }), 'ecl_concreto', shade('#7b839c', '#c3c9da', 0, 0.6));
  m.add(torus(1.14, 0.045, 4, 16), 'glow_cyan', '#ffffff', { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0] });
  const lean = rr(rand, -0.3, 0.3);
  m.add(tube([[0, 0.4, 0], [lean * 0.4, H * 0.3, 0.05], [lean, H * 0.55, 0], [lean * 1.2, H * 0.75, 0]], (t) => 0.2 - t * 0.09, 8, 6), 'matte', gradY('#3a2c36', '#6b5560', 0, H));
  for (const s of [-1, 1]) m.add(tube([[lean, H * 0.5, 0], [lean + s * 0.5, H * 0.66, s * 0.2], [lean + s * 0.9, H * 0.8, s * 0.3]], (t) => 0.09 - t * 0.05, 5, 5), 'matte', '#5a4650');
  const lobes: V3[] = [[lean * 1.2, H * 0.84, 0], [lean + 0.95, H * 0.76, 0.35], [lean - 0.95, H * 0.74, -0.3], [lean + 0.1, H * 0.72, -0.95], [lean - 0.1, H * 0.74, 0.95]];
  for (const [i, c] of lobes.entries()) {
    const r = (i === 0 ? 1.25 : rr(rand, 0.85, 1.05)) * (H / 5.4);
    m.add(blob(r, rand, { detail: 1, s: [1, 0.82, 1] }), 'matte', shade(mix(folha, '#0a1830', 0.45), mix(folha, '#b8ffd8', 0.25), -r, r), { p: c });
    for (let k = 0; k < 3; k++) {
      const a = rand() * TAU, e = rr(rand, -0.3, 0.6);
      m.add(ico(0.07, 0), 'glow_warm', '#ffffff', { p: [c[0] + Math.cos(a) * Math.cos(e) * r * 0.98, c[1] + Math.sin(e) * r * 0.8, c[2] + Math.sin(a) * Math.cos(e) * r * 0.98] });
    }
  }
  return m;
}

function hidrante(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#e23b6a', '#f0a02a', '#3ac0d8']), rand);
  m.add(revolve([[0.26, -0.05], [0.26, 0.08], [0.17, 0.12], [0.16, 0.6], [0.2, 0.64], [0.2, 0.7], [0.15, 0.76], [0.1, 0.88], [0.001, 0.92]], 10), 'paint', shade(mix(cor, '#000000', 0.35), cor, 0, 0.9));
  for (const s of [-1, 1]) {
    m.add(cyl(0.075, 0.075, 0.14, 8), 'paint', cor, { p: [s * 0.2, 0.5, 0], r: [0, 0, Math.PI / 2] });
    m.add(cyl(0.09, 0.09, 0.05, 6), 'glossy', '#d6def0', { p: [s * 0.28, 0.5, 0], r: [0, 0, Math.PI / 2] });
  }
  m.add(cyl(0.09, 0.09, 0.12, 8), 'paint', cor, { p: [0, 0.42, 0.2], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.11, 0.11, 0.05, 6), 'glossy', '#d6def0', { p: [0, 0.42, 0.28], r: [Math.PI / 2, 0, 0] });
  m.add(torus(0.17, 0.02, 4, 12), 'glow_cyan', '#ffffff', { p: [0, 0.28, 0], r: [Math.PI / 2, 0, 0] });
  m.add(cyl(0.05, 0.05, 0.08, 5), 'glossy', '#d6def0', { p: [0, 0.95, 0] });
  return m;
}

function semaforo(rand: Rand): Model {
  const m = new Model();
  const H = rr(rand, 6.2, 6.8), L = rr(rand, 3.6, 4.6);
  m.add(prism(ngon(0.36, 8), -0.1, 0.6, { top: 0.6 }), 'paint', '#2c3348');
  m.add(tube([[0, 0.5, 0], [0, H - 0.8, 0], [0.25, H - 0.15, 0], [1.2, H, 0], [L, H + 0.05, 0]], (t) => 0.12 - t * 0.05, 18, 7), 'paint', gradY('#2c3348', '#6d7892', 0, H));
  const caixa = (x: number, y: number, vertical: boolean): void => {
    m.add(box(vertical ? 0.46 : 1.3, vertical ? 1.3 : 0.46, 0.34, 0.06, 1), 'paint', '#12151f', { p: [x, y, 0.1] });
    (['glow_red', 'glow_warm', 'glow_green'] as const).forEach((g, i) => {
      const dx = vertical ? 0 : (i - 1) * 0.4, dy = vertical ? (1 - i) * 0.4 : 0;
      m.add(cyl(0.14, 0.14, 0.05, 10), g, '#ffffff', { p: [x + dx, y + dy, 0.29], r: [Math.PI / 2, 0, 0] });
      m.add(cyl(0.17, 0.17, 0.2, 10, true), 'paint', '#12151f', { p: [x + dx, y + dy + 0.02, 0.36], r: [Math.PI / 2, 0, 0] });
    });
  };
  caixa(L - 0.6, H - 0.38, false);
  caixa(L - 2.4, H - 0.4, false);
  caixa(0, 3.1, true);
  m.add(box(0.36, 0.42, 0.2, 0.04, 1), 'paint', '#12151f', { p: [0, 1.5, 0.2] });
  m.add(box(0.2, 0.24, 0.03), 'glow_cyan', '#ffffff', { p: [0, 1.5, 0.31] });
  return m;
}

function carroEstacionado(rand: Rand): Model {
  const m = new Model();
  const cor = vary(pick(rand, ['#d83a6f', '#2fb6d0', '#f2b233', '#7a54e0', '#e8ecf5', '#3fd08a']), rand, 0.06);
  const L = rr(rand, 4.2, 4.6), h = rr(rand, 1.2, 1.36);
  const perfil = smoothOutline([[-L / 2, 0.34], [-L / 2 + 0.05, 0.72], [-L * 0.3, 0.86], [-L * 0.12, h], [L * 0.16, h * 0.98], [L * 0.36, 0.78], [L / 2, 0.62], [L / 2 + 0.02, 0.34], [L * 0.3, 0.24], [-L * 0.3, 0.24]], 30);
  m.add(extrude(perfil, 1.62, 0.1), 'paint', shade(mix(cor, '#000000', 0.4), mix(cor, '#ffffff', 0.15), 0.2, h));
  const vidro = smoothOutline([[-L * 0.27, 0.86], [-L * 0.11, h - 0.05], [L * 0.14, h - 0.07], [L * 0.31, 0.82]], 14);
  m.add(extrude(vidro, 1.84, 0.02), 'glossy', gradY('#0c1626', '#3a5878', 0.8, h));
  m.add(box(L * 0.3, 0.05, 1.3), 'glossy', '#0c1626', { p: [L * 0.02, h + 0.045, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    m.add(cyl(0.36, 0.36, 0.26, 12), 'rubber', '#15161c', { p: [sx * L * 0.31, 0.36, sz * 0.8], r: [Math.PI / 2, 0, 0] });
    m.add(cyl(0.2, 0.2, 0.28, 8), 'glossy', '#c4cce0', { p: [sx * L * 0.31, 0.36, sz * 0.8], r: [Math.PI / 2, 0, 0] });
    m.add(torus(0.27, 0.025, 4, 12), 'glow_cyan', '#ffffff', { p: [sx * L * 0.31, 0.36, sz * 0.94] });
  }
  m.add(box(0.06, 0.09, 1.5), 'glow_white', '#ffffff', { p: [L / 2 + 0.08, 0.62, 0] });
  m.add(box(0.06, 0.07, 1.6), 'glow_red', '#ffffff', { p: [-L / 2 - 0.08, 0.7, 0] });
  for (const sz of [-1, 1]) m.add(box(L * 0.5, 0.04, 0.04), 'glow_magenta', '#ffffff', { p: [0, 0.22, sz * 0.86] });
  m.add(extrude([[0, 0], [0.5, 0.05], [0.42, 0.2], [0, 0.12]], 1.5, 0.02), 'paint', mix(cor, '#000000', 0.5), { p: [-L / 2 + 0.05, 0.86, 0] });
  return m;
}

export const NEON_PROPS: PropLibrary = {
  'predio-neon': { build: predioNeon, radius: 13, collider: { radius: 10.5, height: 60 } },
  'predio-baixo': { build: predioBaixo, radius: 7.5, collider: { radius: 5.5, height: 8 } },
  'painel-luminoso': { build: painelLuminoso, radius: 4.6, collider: { radius: 0.6, height: 10 } },
  'poste-neon': { build: posteNeon, radius: 0.8, collider: { radius: 0.3, height: 7 } },
  'viaduto-pilar': { build: viadutoPilar, radius: 5.5, collider: { radius: 1.8, height: 10 } },
  'tunel-neon': { build: tunelNeon, radius: 14 },
  'portico-neon': { build: porticoNeon, radius: 11 },
  holograma: { build: hologramaBase, radius: 1.6, collider: { radius: 1.1, height: 1.3 }, animated: { build: hologramaFigura, pivot: [0, 2.6, 0], motion: { kind: 'spin', axis: 'y', period: 6 } } },
  'barreira-neon': { build: barreiraNeon, radius: 2.1, collider: { radius: 0.6, height: 1.05 } },
  'banca-lamen': { build: bancaLamen, radius: 2.8, collider: { radius: 2.1, height: 3 } },
  'antena-parabolica': { build: antenaParabolica, radius: 2.2, collider: { radius: 0.8, height: 3 } },
  'arvore-urbana': { build: arvoreUrbana, radius: 1.6, collider: { radius: 0.9, height: 3 } },
  hidrante: { build: hidrante, radius: 0.5, collider: { radius: 0.28, height: 0.95 } },
  semaforo: { build: semaforo, radius: 1, collider: { radius: 0.3, height: 6.5 } },
  'carro-estacionado': { build: carroEstacionado, radius: 2.6, collider: { radius: 1.5, height: 1.4 } },
};
