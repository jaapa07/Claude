/**
 * Texturas e materiais autorais dos cenários da Copa Eclipse (prefixo `ecl_`).
 * As texturas de detalhe são quase neutras: a cor vem da cor de vértice de cada objeto.
 * Artes luminosas (janelas, outdoors, letreiros, vitral) são máscaras com alfa, uma por cor de luz,
 * sobrepostas em camadas: assim cada cor brilha de verdade sem precisar de mapa emissivo.
 */
import { defineMaterial } from '../lib/materials';
import { fbm, makeTexture, svgTexture, vnoise, voronoi } from '../lib/textures';

let done = false;

const hash = (x: number, y: number, s: number): number => {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

/* Grade de janelas: o ladrilho cobre 16 m × 24 m = 8 colunas × 8 andares. */
const WIN = 8;
function windowCell(u: number, v: number): { cx: number; cy: number; lu: number; lv: number; pane: boolean } {
  const cx = Math.floor(u * WIN), cy = Math.floor(v * WIN);
  const lu = u * WIN - cx, lv = v * WIN - cy;
  return { cx, cy, lu, lv, pane: lu > 0.1 && lu < 0.9 && lv > 0.2 && lv < 0.8 };
}

const FONT = 'font-family="Inter, DejaVu Sans, sans-serif" font-weight="900"';
type Layer = 'c' | 'm' | 'w' | 'v';
type Art = Partial<Record<Layer, string>>;

/** Monta um atlas SVG só com os elementos de uma camada (tudo branco; a cor vem do material). */
function atlasSvg(cells: { x: number; y: number; w: number; h: number; vw: number; vh: number; art: Art }[], layer: Layer): string {
  const body = cells.map((c) => `<svg x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" viewBox="0 0 ${c.vw} ${c.vh}" preserveAspectRatio="none">${c.art[layer] ?? ''}</svg>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="#fff" stroke="none">${body}</svg>`;
}

/* ---------- outdoors (4 artes originais, 400×200 cada) ---------- */
const frame = '<rect x="6" y="6" width="388" height="188" rx="14" fill="none" stroke="#fff" stroke-width="5"/>';
const PAINEIS: Art[] = [
  { // VOLTIX: raio e anéis de energia
    c: `${frame}<text x="150" y="118" font-size="64" ${FONT}>VOLTIX</text><rect x="152" y="134" width="210" height="8" rx="4"/>`,
    w: '<polygon points="92,22 46,108 82,108 60,180 128,84 90,84 118,22"/>',
    m: '<circle cx="86" cy="100" r="74" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="26 12"/><text x="154" y="170" font-size="22" letter-spacing="6" font-family="Inter, sans-serif" font-weight="700">ENERGIA EM ÓRBITA</text>',
  },
  { // ORBE TURBO: planeta com anel
    m: `${frame}<circle cx="296" cy="96" r="58"/>`,
    c: '<ellipse cx="296" cy="100" rx="96" ry="22" fill="none" stroke="#fff" stroke-width="8" transform="rotate(-16 296 100)"/><text x="26" y="150" font-size="34" letter-spacing="10" font-family="Inter, sans-serif" font-weight="700">TURBO</text>',
    w: `<text x="24" y="104" font-size="74" ${FONT}>ORBE</text><circle cx="212" cy="36" r="5"/><circle cx="372" cy="170" r="4"/><circle cx="236" cy="172" r="3"/><circle cx="32" cy="176" r="4"/>`,
  },
  { // KUMO: tigela fumegante
    w: `${frame}<path d="M40 104 h130 a65 62 0 0 1 -130 0z"/><rect x="74" y="166" width="62" height="10" rx="5"/>`,
    c: '<path d="M70 88 q-16 -22 0 -40 q14 -16 0 -30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M105 88 q-16 -22 0 -40 q14 -16 0 -30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M140 88 q-16 -22 0 -40 q14 -16 0 -30" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><text x="196" y="160" font-size="26" letter-spacing="5" font-family="Inter, sans-serif" font-weight="700">LÁMEN 24H</text>',
    m: `<text x="190" y="112" font-size="76" ${FONT}>KUMO</text><path d="M26 96 l160 -14" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
  },
  { // COPA ECLIPSE: disco eclipsado e divisas
    w: '<circle cx="100" cy="100" r="70" fill="none" stroke="#fff" stroke-width="12"/><path d="M100 14 l6 -12 M172 44 l12 -8 M186 100 h14 M28 44 l-12 -8" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
    m: `<path d="M100 44 a56 56 0 1 0 0 112 a44 56 0 1 1 0 -112z"/><text x="196" y="150" font-size="52" ${FONT}>ECLIPSE</text>`,
    c: `${frame}<text x="198" y="88" font-size="40" letter-spacing="14" ${FONT}>COPA</text><path d="M200 168 l16 -10 l-16 -10 M228 168 l16 -10 l-16 -10 M256 168 l16 -10 l-16 -10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
];

/* ---------- letreiros: 4 verticais (100×800) e 4 horizontais de loja (400×200) ---------- */
const vert = (word: string, deco: string): string => `<rect x="5" y="5" width="90" height="790" rx="12" fill="none" stroke="#fff" stroke-width="6"/>${deco}` +
  [...word].map((ch, i) => `<text x="50" y="${130 + i * Math.min(150, 560 / Math.max(1, word.length - 1))}" font-size="88" text-anchor="middle" ${FONT}>${ch}</text>`).join('');
const VERTICAIS: Art[] = [
  { m: vert('ORBE', ''), c: '<circle cx="50" cy="716" r="30" fill="none" stroke="#fff" stroke-width="8"/><ellipse cx="50" cy="716" rx="44" ry="10" fill="none" stroke="#fff" stroke-width="5" transform="rotate(-20 50 716)"/>' },
  { c: vert('KUMO', ''), w: '<path d="M22 740 h56 a28 26 0 0 1 -56 0z"/><path d="M36 722 q-8 -12 0 -22 M64 722 q-8 -12 0 -22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' },
  { w: vert('VOLTIX', ''), m: '<polygon points="54,26 30,62 48,62 40,92 70,52 52,52 64,26" transform="translate(0 -12) scale(1 0.6)"/>' },
  { m: '<rect x="5" y="5" width="90" height="790" rx="12" fill="none" stroke="#fff" stroke-width="6"/>' + [0, 1, 2, 3, 4, 5].map((i) => `<path d="M24 ${150 + i * 110} l26 -34 l26 34" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`).join(''), c: `<text x="50" y="92" font-size="56" text-anchor="middle" ${FONT}>N9</text><text x="50" y="770" font-size="30" text-anchor="middle" ${FONT}>BAR</text>` },
];
const LOJAS: Art[] = [
  { c: `<text x="200" y="128" font-size="96" text-anchor="middle" ${FONT}>LUMA+</text>`, m: '<rect x="8" y="8" width="384" height="184" rx="40" fill="none" stroke="#fff" stroke-width="8"/><circle cx="44" cy="44" r="10"/><circle cx="356" cy="156" r="10"/>' },
  { w: `<text x="200" y="104" font-size="72" text-anchor="middle" ${FONT}>KAIRO</text>`, c: '<text x="200" y="164" font-size="40" letter-spacing="18" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700">MERCADO</text><rect x="8" y="8" width="384" height="184" rx="10" fill="none" stroke="#fff" stroke-width="6"/>' },
  { m: `<text x="230" y="126" font-size="70" text-anchor="middle" ${FONT}>NÉCTAR 9</text>`, w: '<path d="M30 60 h50 l-8 90 h-34z"/><path d="M62 60 l14 -36" stroke="#fff" stroke-width="7" stroke-linecap="round"/>', c: '<path d="M96 166 h280" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="30 14"/>' },
  { c: `<text x="238" y="100" font-size="66" text-anchor="middle" ${FONT}>ZAPP</text><rect x="24" y="52" width="80" height="70" rx="16" fill="none" stroke="#fff" stroke-width="9"/><circle cx="50" cy="84" r="8"/><circle cx="78" cy="84" r="8"/><path d="M64 52 v-22" stroke="#fff" stroke-width="7"/><circle cx="64" cy="26" r="8"/>`, m: '<text x="238" y="164" font-size="44" letter-spacing="12" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800">ROBÓTICA</text>' },
];

/* ---------- vitral original (200×500): torre sob eclipse e relâmpago ---------- */
const VITRAL: Art = {
  v: '<path d="M14 492 V190 Q14 60 100 12 Q186 60 186 190 V492z" fill="none" stroke="#fff" stroke-width="10"/>' +
    '<path d="M24 482 V300 h60 v182z M116 482 V300 h60 v182z M24 290 V200 Q24 150 44 116 l40 60 v114z M176 290 V200 Q176 150 156 116 l-40 60 v114z"/>',
  w: '<circle cx="100" cy="150" r="34" fill="none" stroke="#fff" stroke-width="12"/><path d="M100 96 v-22 M146 116 l16 -14 M54 116 l-16 -14" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
    '<rect x="92" y="340" width="16" height="30" rx="8"/><rect x="92" y="400" width="16" height="30" rx="8"/>',
  c: '<polygon points="108,196 84,268 102,268 88,330 124,250 104,250 120,196"/><path d="M92 482 v-36 h16 v36z"/><path d="M50 60 Q100 20 150 60 L132 84 Q100 58 68 84z"/>',
  m: '<path d="M92 290 h16 v-92 l10 -8 h-36 l10 8z"/><path d="M84 482 V300 h8 v182z M108 482 V300 h8 v182z"/><circle cx="100" cy="150" r="20"/>',
};

export async function registerEclipseTextures(): Promise<void> {
  if (done) return;

  /* ----- Cidade Neon ----- */
  await makeTexture('ecl_fachada', 512, (u, v) => {
    const c = windowCell(u, v);
    const n = fbm(u, v, 8, 3, 3);
    if (!c.pane) {
      const edge = c.lv < 0.2 ? 0.9 : 0.74;
      const k = edge * (0.86 + n * 0.2);
      return [k, k, k * 1.02];
    }
    const refl = 0.16 + 0.1 * (1 - c.lv) + 0.05 * hash(c.cx, c.cy, 5) + (c.lu + c.lv > 1.05 && c.lu + c.lv < 1.2 ? 0.07 : 0);
    return [refl * 0.85, refl * 0.95, refl * 1.25];
  });
  const lit = (kind: 'q' | 'f') => (u: number, v: number): [number, number, number, number] => {
    const c = windowCell(u, v);
    const h = hash(c.cx, c.cy, 11);
    const on = kind === 'q' ? h < 0.4 : h >= 0.4 && h < 0.56;
    if (!on || !c.pane) return [1, 1, 1, 0];
    const blind = hash(c.cx, c.cy, 23) < 0.3 ? (c.lv < 0.2 + 0.35 * hash(c.cx, c.cy, 31) ? 0.35 : 1) : 1;
    const person = hash(c.cx, c.cy, 41) < 0.12 && Math.hypot((c.lu - 0.5) * 0.8, c.lv - 0.62) < 0.13 ? 0.25 : 1;
    const k = (0.7 + 0.3 * hash(c.cx, c.cy, 17)) * (0.82 + 0.18 * c.lv) * blind * person;
    return [1, 1, 1, k];
  };
  await makeTexture('ecl_jan_q', 512, lit('q'), 90);
  await makeTexture('ecl_jan_f', 512, lit('f'), 90);
  await makeTexture('ecl_concreto', 256, (u, v) => {
    const n = fbm(u, v, 6, 4, 9);
    const seam = Math.min(Math.abs(((u * 2) % 1) - 0.5), Math.abs(((v * 2) % 1) - 0.5)) > 0.485 ? 0.72 : 1;
    const pore = vnoise(u, v, 64, 4) > 0.86 ? 0.9 : 1;
    const k = (0.8 + n * 0.2) * seam * pore;
    return [k, k, k];
  });
  await makeTexture('ecl_holo', 64, (_u, v) => {
    const line = (v * 16) % 1;
    return [1, 1, 1, line < 0.55 ? 0.62 : 0.2];
  }, 90);
  const cellsP = PAINEIS.map((art, i) => ({ x: (i % 2) * 512, y: Math.floor(i / 2) * 512, w: 512, h: 512, vw: 400, vh: 200, art }));
  const cellsS = [
    ...VERTICAIS.map((art, i) => ({ x: i * 128, y: 0, w: 128, h: 1024, vw: 100, vh: 800, art })),
    ...LOJAS.map((art, i) => ({ x: 512, y: i * 256, w: 512, h: 256, vw: 400, vh: 200, art })),
  ];
  for (const layer of ['c', 'm', 'w'] as const) {
    await svgTexture(`ecl_painel_${layer}`, atlasSvg(cellsP, layer), 1024);
    await svgTexture(`ecl_sinal_${layer}`, atlasSvg(cellsS, layer), 1024);
  }
  for (const layer of ['v', 'w', 'c', 'm'] as const) {
    await svgTexture(`ecl_vitral_${layer}`, atlasSvg([{ x: 0, y: 0, w: 1024, h: 1024, vw: 200, vh: 500, art: VITRAL }], layer), 512);
  }

  /* ----- Pico Boreal ----- */
  await makeTexture('ecl_gelo', 256, (u, v) => {
    const [d, e] = voronoi(u, v, 5, 7);
    const crack = e < 0.035 ? 1 : 0;
    const n = fbm(u, v, 4, 4, 2);
    const k = 0.74 + n * 0.18 + crack * 0.2 + (1 - d) * 0.05;
    return [k * 0.94, k * 0.99, Math.min(1, k * 1.06)];
  });
  await makeTexture('ecl_neve', 128, (u, v) => {
    const n = fbm(u, v, 5, 4, 5);
    const sparkle = vnoise(u, v, 64, 8) > 0.9 ? 0.04 : 0;
    const k = 0.9 + n * 0.08 + sparkle;
    return [k * 0.98, k * 0.995, Math.min(1, k * 1.02)];
  });
  await makeTexture('ecl_rocha', 256, (u, v) => {
    const wob = fbm(u, v, 3, 3, 12) * 0.22;
    const band = vnoise(0.37, v + wob, 16, 6);
    const fine = fbm(u, v, 12, 3, 21);
    const [, e] = voronoi(u, v, 6, 3);
    const crack = e < 0.02 ? 0.78 : 1;
    const k = (0.62 + band * 0.26 + fine * 0.14) * crack;
    return [k, k * 0.985, k * 0.97];
  });
  await makeTexture('ecl_madeira', 256, (u, v) => {
    const plank = Math.floor(u * 4);
    const lu = u * 4 - plank;
    const gap = lu < 0.04 || lu > 0.96 ? 0.55 : 1;
    const grain = fbm(u * 0.5 + plank * 0.31, v, 4, 4, 14 + plank) * 0.5 + vnoise(u, v * 0.25 + plank * 0.2, 48, 3) * 0.5;
    const k = (0.68 + grain * 0.3 + hash(plank, 0, 3) * 0.08) * gap;
    return [k, k * 0.97, k * 0.93];
  });

  /* ----- Jardim Celeste ----- */
  await makeTexture('ecl_grama', 256, (u, v) => {
    const n = fbm(u, v, 6, 4, 31);
    const blade = vnoise(u, v, 96, 12);
    const [d, , id] = voronoi(u, v, 9, 44);
    const k = 0.78 + n * 0.16 + (blade > 0.7 ? 0.06 : 0);
    if (d < 0.05 && id > 0.55) return id > 0.8 ? [1, 0.86, 0.95] : [1, 0.98, 0.8];
    return [k * 0.97, k, k * 0.94];
  });
  await makeTexture('ecl_marmore', 256, (u, v) => {
    const n = fbm(u, v, 3, 5, 51);
    const vein = Math.abs(fbm(u + n * 0.3, v, 4, 4, 60) - 0.5);
    const k = 0.92 + n * 0.06 - (vein < 0.018 ? 0.16 : vein < 0.04 ? 0.05 : 0);
    return [k, k * 0.99, k * 0.985];
  });

  /* ----- Fortaleza Tempestade ----- */
  await makeTexture('ecl_pedra', 256, (u, v) => {
    const rows = 6;
    const row = Math.floor(v * rows);
    const lv = v * rows - row;
    const off = (row % 2) * 0.5 + hash(row, 0, 2) * 0.2;
    const cols = 3;
    const bx = Math.floor(u * cols + off);
    const lu = u * cols + off - bx;
    const mortar = lu < 0.035 || lu > 0.965 || lv < 0.07 || lv > 0.93;
    const n = fbm(u, v, 8, 4, 71);
    const block = 0.7 + hash(((bx % cols) + cols) % cols, row, 9) * 0.2;
    const bevel = Math.min(1, Math.min(lu, 1 - lu) * 9, Math.min(lv, 1 - lv) * 5) * 0.08;
    const k = mortar ? 0.46 + n * 0.1 : block + n * 0.14 + bevel - 0.08;
    return [k, k * 0.99, k * 1.01];
  });
  await makeTexture('ecl_ardosia', 128, (u, v) => {
    const rows = 4;
    const row = Math.floor(v * rows);
    const lv = v * rows - row;
    const cols = 4;
    const su = u * cols + (row % 2) * 0.5;
    const cx = Math.floor(su);
    const lu = su - cx;
    const round = lv > 0.62 + 0.3 * Math.sin(lu * Math.PI) ? 0.5 : 1;
    const k = (0.68 + hash(((cx % cols) + cols) % cols, row, 4) * 0.22 + (1 - lv) * 0.1) * round * (lu < 0.04 ? 0.7 : 1);
    return [k, k, k * 1.03];
  });

  /* ----- materiais ----- */
  defineMaterial('ecl_fachada', { roughness: 0.42, metalness: 0.25, map: 'ecl_fachada' });
  defineMaterial('ecl_jan_q', { color: [1, 0.78, 0.46], roughness: 0.5, emissive: [1, 0.6, 0.22], emissiveStrength: 1.25, map: 'ecl_jan_q', alpha: 0.999 });
  defineMaterial('ecl_jan_f', { color: [0.5, 0.9, 1], roughness: 0.5, emissive: [0.2, 0.75, 1], emissiveStrength: 1.25, map: 'ecl_jan_f', alpha: 0.999 });
  defineMaterial('ecl_concreto', { roughness: 0.9, map: 'ecl_concreto' });
  defineMaterial('ecl_holo', { color: [0.35, 0.95, 1], roughness: 0.4, emissive: [0.2, 0.85, 1], emissiveStrength: 1.6, map: 'ecl_holo', alpha: 0.999, doubleSided: true });
  const luz: Record<Layer, [number, number, number]> = { c: [0.25, 0.9, 1], m: [1, 0.25, 0.75], w: [1, 0.72, 0.25], v: [0.62, 0.42, 1] };
  for (const layer of ['c', 'm', 'w'] as const) {
    defineMaterial(`ecl_painel_${layer}`, { color: luz[layer], roughness: 0.5, emissive: luz[layer], emissiveStrength: 1.5, map: `ecl_painel_${layer}`, alpha: 0.999 });
    defineMaterial(`ecl_sinal_${layer}`, { color: luz[layer], roughness: 0.5, emissive: luz[layer], emissiveStrength: 1.5, map: `ecl_sinal_${layer}`, alpha: 0.999 });
  }
  for (const layer of ['v', 'w', 'c', 'm'] as const) {
    defineMaterial(`ecl_vitral_${layer}`, { color: luz[layer], roughness: 0.3, emissive: luz[layer], emissiveStrength: 1.8, map: `ecl_vitral_${layer}`, alpha: 0.999 });
  }
  defineMaterial('ecl_gelo', { roughness: 0.12, alpha: 0.82, map: 'ecl_gelo', emissive: [0.05, 0.14, 0.2], emissiveStrength: 1, doubleSided: true });
  defineMaterial('ecl_gelo_solido', { roughness: 0.2, map: 'ecl_gelo', emissive: [0.03, 0.08, 0.12], emissiveStrength: 1 });
  defineMaterial('ecl_neve', { roughness: 0.9, map: 'ecl_neve' });
  defineMaterial('ecl_rocha', { roughness: 0.92, map: 'ecl_rocha' });
  defineMaterial('ecl_madeira', { roughness: 0.85, map: 'ecl_madeira' });
  defineMaterial('ecl_grama', { roughness: 0.95, map: 'ecl_grama' });
  defineMaterial('ecl_marmore', { roughness: 0.45, map: 'ecl_marmore' });
  defineMaterial('ecl_pedra', { roughness: 0.9, map: 'ecl_pedra' });
  defineMaterial('ecl_ardosia', { roughness: 0.7, metalness: 0.1, map: 'ecl_ardosia' });
  defineMaterial('ecl_nuvem', { roughness: 1, emissive: [0.2, 0.2, 0.24], emissiveStrength: 1 });
  defineMaterial('ecl_agua', { color: [0.6, 0.88, 1], roughness: 0.1, alpha: 0.72, doubleSided: true, emissive: [0.08, 0.2, 0.26], emissiveStrength: 1 });
  defineMaterial('water_fall', { color: [0.75, 0.92, 1], roughness: 0.15, alpha: 0.78, doubleSided: true, emissive: [0.1, 0.25, 0.3], emissiveStrength: 1 });
  done = true;
}

/** Retângulos de UV (coordenadas de imagem: [u0, v0, u1, v1]) dos atlas de arte. */
export const UV_PAINEL = (i: number): [number, number, number, number] => [(i % 2) * 0.5, Math.floor(i / 2) * 0.5, (i % 2) * 0.5 + 0.5, Math.floor(i / 2) * 0.5 + 0.5];
export const UV_SINAL_VERTICAL = (i: number): [number, number, number, number] => [i * 0.125, 0, i * 0.125 + 0.125, 1];
export const UV_SINAL_LOJA = (i: number): [number, number, number, number] => [0.5, i * 0.25, 1, i * 0.25 + 0.25];
/** Metros cobertos por um ladrilho da grade de janelas (8 colunas × 8 andares). */
export const JANELA_TILE = { w: 16, h: 24, col: 2, andar: 3 };
