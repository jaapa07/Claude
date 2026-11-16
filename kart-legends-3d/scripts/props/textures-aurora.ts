/**
 * Texturas e materiais (prefixo `aur_`) usados pelos objetos de cenário da Copa Aurora.
 * Idempotente: pode ser chamada várias vezes; chame antes de qualquer `build`/exportação.
 */
import { defineMaterial } from '../lib/materials';
import { fbm, makeTexture, svgTexture, vnoise, voronoi } from '../lib/textures';

const g3 = (v: number): [number, number, number] => [v, v, v];
const frac = (x: number): number => x - Math.floor(x);
const hash = (i: number, j: number): number => frac(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);

const FONT = `font-family="Inter, 'DejaVu Sans', sans-serif" font-weight="900"`;

function signSvg(bg1: string, bg2: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 320" width="768" height="320">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
<rect width="768" height="320" fill="url(#g)"/><rect x="10" y="10" width="748" height="300" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="8"/>${body}</svg>`;
}

const SIGN_TURBO = signSvg('#1470d6', '#19c2c9', `
<g fill="none" stroke="#ffffff" stroke-linecap="round" stroke-width="16" opacity="0.9">
<path d="M70 110 q60 -40 120 0 t120 0"/><path d="M50 170 q60 -40 120 0 t120 0" opacity="0.7"/><path d="M90 230 q60 -40 120 0 t120 0" opacity="0.45"/></g>
<text x="734" y="150" text-anchor="end" font-size="112" ${FONT} font-style="italic" fill="#ffe14a" stroke="#0b3a78" stroke-width="6" paint-order="stroke">TURBO</text>
<text x="734" y="262" text-anchor="end" font-size="104" ${FONT} font-style="italic" fill="#ffffff" stroke="#0b3a78" stroke-width="6" paint-order="stroke">BRISA</text>`);

const SIGN_PNEUS = signSvg('#ff8a1f', '#f2385a', `
<g transform="translate(150 160)"><circle r="112" fill="#1d1b26"/><circle r="66" fill="#f5f0e6"/><circle r="40" fill="#ffc531"/>
<g stroke="#1d1b26" stroke-width="12">${[0, 60, 120].map((a) => `<line x1="-62" y1="0" x2="62" y2="0" transform="rotate(${a})"/>`).join('')}</g>
<g fill="#3a3748">${Array.from({ length: 12 }, (_, i) => `<rect x="-9" y="-116" width="18" height="24" rx="4" transform="rotate(${i * 30})"/>`).join('')}</g></g>
<text x="300" y="150" font-size="104" ${FONT} fill="#ffffff" stroke="#7a1430" stroke-width="6" paint-order="stroke">PNEUS</text>
<text x="300" y="258" font-size="96" ${FONT} fill="#fff1a8" stroke="#7a1430" stroke-width="6" paint-order="stroke">AURORA</text>`);

const SIGN_TIKO = signSvg('#2aa84f', '#b5d92c', `
<g transform="translate(626 160) rotate(-35)" fill="#f5f0e6" stroke="#14532a" stroke-width="7">
<path d="M-18 -60 h36 v130 a18 18 0 0 1 -36 0 z"/><path d="M-46 -116 a50 50 0 0 0 92 0 l-22 0 l0 34 l-48 0 l0 -34 z" transform="translate(0 20)"/></g>
<text x="46" y="128" font-size="84" ${FONT} fill="#ffffff" stroke="#14532a" stroke-width="6" paint-order="stroke">OFICINA</text>
<text x="46" y="254" font-size="118" ${FONT} fill="#fff27a" stroke="#14532a" stroke-width="7" paint-order="stroke">DO TIKO</text>`);

const CHEVRON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256" width="512" height="256">
<rect width="512" height="256" fill="#ffcf1a"/><rect x="6" y="6" width="500" height="244" rx="18" fill="none" stroke="#1b1b22" stroke-width="12"/>
${[40, 190, 340].map((x) => `<path d="M${x} 34 h70 l66 94 l-66 94 h-70 l66 -94 z" fill="#e3202e" stroke="#1b1b22" stroke-width="8" stroke-linejoin="round"/>`).join('')}</svg>`;

function sun(cx: number, cy: number, r: number, rays: number): string {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3b2414" stroke-width="9"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="#3b2414"/>`;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    s += `<line x1="${cx + Math.cos(a) * r * 1.3}" y1="${cy + Math.sin(a) * r * 1.3}" x2="${cx + Math.cos(a) * r * 1.85}" y2="${cy + Math.sin(a) * r * 1.85}" stroke="#3b2414" stroke-width="9" stroke-linecap="round"/>`;
  }
  return s;
}
const GLYPH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" width="256" height="512">
<rect width="256" height="512" fill="#efe2c8"/><rect x="14" y="14" width="228" height="484" fill="none" stroke="#3b2414" stroke-width="7"/>
${sun(128, 96, 34, 8)}
<g fill="none" stroke="#3b2414" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
<path d="M64 196 l64 -34 l64 34 M64 226 l64 -34 l64 34"/><path d="M128 256 v60 M92 286 h72"/><circle cx="128" cy="286" r="46"/>
<path d="M60 372 q34 -40 68 0 t68 0"/><path d="M60 402 q34 -40 68 0 t68 0"/>
<path d="M128 430 l40 44 h-80 z"/></g></svg>`;

const WOVEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<rect width="256" height="256" fill="#fff"/>
${[0, 64, 128, 192].map((y, i) => `<rect y="${y}" width="256" height="20" fill="${i % 2 ? '#c9c9c9' : '#9d9d9d'}"/><path d="M0 ${y + 42} ${Array.from({ length: 8 }, () => "l16 -12 l16 12").join(' ')}" fill="none" stroke="#8a8a8a" stroke-width="5"/>`).join('')}</svg>`;

let done = false;

export async function registerAuroraTextures(): Promise<void> {
  if (!done) {
    await makeTexture('aur_plaster', 256, (u, v) => {
      const f = fbm(u, v, 4, 4, 3);
      const sp = vnoise(u, v, 48, 9) > 0.86 ? 0.95 : 1;
      return g3((0.84 + 0.16 * f) * sp);
    });
    await makeTexture('aur_roof', 256, (u, v) => {
      const r = Math.floor(v * 4), fv = frac(v * 4);
      const cu = u * 4 + (r % 2) * 0.5;
      const ci = ((Math.floor(cu) % 4) + 4) % 4, fu = frac(cu);
      const edge = 1 - 0.3 * Math.pow(Math.abs(2 * fu - 1), 2.2);
      if (fv > edge) {
        const cu2 = u * 4 + ((r + 1) % 2) * 0.5;
        const t2 = 0.82 + 0.18 * hash((((Math.floor(cu2) % 4) + 4) % 4) + 11, (r + 1) % 4);
        return g3(0.5 * t2);
      }
      const tint = 0.8 + 0.2 * hash(ci + 11, r);
      const round = 0.84 + 0.16 * Math.sin(Math.PI * fu);
      const shade = 0.62 + 0.38 * Math.pow(fv / edge, 0.55);
      const gap = fu < 0.04 || fu > 0.96 ? 0.72 : 1;
      return g3(tint * round * shade * gap * (0.94 + 0.06 * fbm(u, v, 8, 2, 5)));
    });
    await makeTexture('aur_stone', 256, (u, v) => {
      const [, e, id] = voronoi(u, v, 5, 4, 0.85);
      const mortar = e < 0.05 ? 0.55 + e * 5 : 1;
      return g3((0.74 + 0.26 * id) * mortar * (0.9 + 0.1 * fbm(u, v, 8, 3, 2)));
    });
    await makeTexture('aur_block', 256, (u, v) => {
      const r = Math.floor(v * 4), fv = frac(v * 4);
      const cu = u * 2 + (r % 2) * 0.5;
      const fu = frac(cu);
      const m = Math.min(fu, 1 - fu) * 2 < 0.045 || Math.min(fv, 1 - fv) < 0.07 ? 0.6 : 1;
      const tint = 0.8 + 0.2 * hash(((Math.floor(cu) % 2) + 2) % 2 + 3, r + 5);
      return g3(tint * m * (0.88 + 0.12 * fbm(u, v, 8, 3, 6)));
    });
    await makeTexture('aur_wood', 256, (u, v) => {
      const streak = 0.5 * vnoise(0.31, v, 32, 3) + 0.3 * vnoise(0.77, v, 64, 5) + 0.2 * fbm(u, v, 8, 2, 7);
      const fv = frac(v * 4);
      const line = fv < 0.04 ? 0.6 : 1;
      const plank = 0.9 + 0.1 * hash(Math.floor(v * 4), 2);
      return g3((0.76 + 0.24 * streak) * line * plank);
    });
    await makeTexture('aur_bark', 256, (u, v) => {
      const w = fbm(u, v, 2, 3, 4);
      const ridge = Math.abs(Math.sin(Math.PI * (v * 7 + w * 2.4)));
      return g3(0.62 + 0.38 * Math.pow(ridge, 0.6) * (0.85 + 0.15 * vnoise(u, v, 16, 8)));
    });
    await makeTexture('aur_rock', 256, (u, v) => {
      const [, e] = voronoi(u, v, 4, 6, 1);
      const crack = e < 0.035 ? 0.72 + e * 6 : 1;
      const band = 0.95 + 0.05 * Math.sin(Math.PI * 2 * (v * 6 + fbm(u, v, 2, 2, 3) * 1.5));
      return g3((0.78 + 0.22 * fbm(u, v, 4, 5, 1)) * crack * band);
    });
    await makeTexture('aur_foliage', 256, (u, v) => {
      const [d, e, id] = voronoi(u, v, 9, 2, 1);
      return g3((0.76 + 0.24 * id) * (0.9 + 0.1 * Math.min(1, e * 6)) * (1 - d * 0.12));
    });
    await makeTexture('aur_sand', 256, (u, v) => g3(0.9 + 0.1 * Math.sin(Math.PI * 2 * (v * 9 + 1.6 * fbm(u, v, 2, 3, 2))) * (0.6 + 0.4 * fbm(u, v, 4, 2, 9))));
    await makeTexture('aur_hay', 256, (u, v) => {
      const streak = 0.6 * vnoise(0.2, v, 64, 3) + 0.4 * vnoise(u, v * 1, 64, 5);
      return g3(0.7 + 0.3 * streak);
    });
    await makeTexture('aur_cloth', 128, (u, v) => g3(0.93 + 0.07 * Math.sin(u * Math.PI * 2 * 16) * Math.sin(v * Math.PI * 2 * 16)));
    await makeTexture('aur_metal', 128, (u, v) => g3(0.86 + 0.14 * fbm(u, v, 4, 3, 12)));
    await makeTexture('aur_net', 128, (u, v) => {
      const a = frac((u + v) * 6), b = frac((u - v) * 6);
      const line = Math.min(a, 1 - a) < 0.09 || Math.min(b, 1 - b) < 0.09;
      return line ? [0.95, 0.95, 0.95, 1] : [0.8, 0.8, 0.8, 0.12];
    });
    await svgTexture('aur_sign_turbo', SIGN_TURBO, 512);
    await svgTexture('aur_sign_pneus', SIGN_PNEUS, 512);
    await svgTexture('aur_sign_tiko', SIGN_TIKO, 512);
    await svgTexture('aur_chevron', CHEVRON, 256);
    await svgTexture('aur_glyph', GLYPH, 256);
    await svgTexture('aur_woven', WOVEN, 256);
    done = true;
  }
  defineMaterial('aur_plaster', { map: 'aur_plaster', roughness: 0.92 });
  defineMaterial('aur_roof', { map: 'aur_roof', roughness: 0.72 });
  defineMaterial('aur_stone', { map: 'aur_stone', roughness: 0.9 });
  defineMaterial('aur_block', { map: 'aur_block', roughness: 0.9 });
  defineMaterial('aur_wood', { map: 'aur_wood', roughness: 0.82 });
  defineMaterial('aur_bark', { map: 'aur_bark', roughness: 0.95 });
  defineMaterial('aur_rock', { map: 'aur_rock', roughness: 0.95 });
  defineMaterial('aur_foliage', { map: 'aur_foliage', roughness: 0.85 });
  defineMaterial('aur_sand', { map: 'aur_sand', roughness: 0.97 });
  defineMaterial('aur_hay', { map: 'aur_hay', roughness: 0.95 });
  defineMaterial('aur_cloth', { map: 'aur_cloth', roughness: 0.88, doubleSided: true });
  defineMaterial('aur_metal', { map: 'aur_metal', roughness: 0.45, metalness: 0.6 });
  defineMaterial('aur_woven', { map: 'aur_woven', roughness: 0.9, doubleSided: true });
  defineMaterial('aur_glyph', { map: 'aur_glyph', roughness: 0.9 });
  defineMaterial('aur_chevron', { map: 'aur_chevron', roughness: 0.5, noVertexColor: true, emissive: [0.25, 0.2, 0.05], emissiveStrength: 1 });
  defineMaterial('aur_sign_turbo', { map: 'aur_sign_turbo', roughness: 0.5, noVertexColor: true });
  defineMaterial('aur_sign_pneus', { map: 'aur_sign_pneus', roughness: 0.5, noVertexColor: true });
  defineMaterial('aur_sign_tiko', { map: 'aur_sign_tiko', roughness: 0.5, noVertexColor: true });
  defineMaterial('aur_lant_laranja', { roughness: 0.6, emissive: [1, 0.2, 0.045], emissiveStrength: 1.7 });
  defineMaterial('aur_lant_ambar', { roughness: 0.6, emissive: [1, 0.445, 0.045], emissiveStrength: 1.7 });
  defineMaterial('aur_lant_vermelha', { roughness: 0.6, emissive: [1, 0.1, 0.1], emissiveStrength: 1.7 });
  defineMaterial('aur_lant_amarela', { roughness: 0.6, emissive: [1, 0.65, 0.07], emissiveStrength: 1.7 });
  defineMaterial('aur_lant_rosa', { roughness: 0.6, emissive: [1, 0.275, 0.434], emissiveStrength: 1.7 });
  defineMaterial('aur_cristal', { roughness: 0.12, metalness: 0.1, emissive: [0.05, 0.07, 0.14], emissiveStrength: 1 });
  defineMaterial('aur_suave_ciano', { roughness: 0.5, emissive: [0.08, 0.55, 0.75], emissiveStrength: 1 });
  defineMaterial('aur_suave_violeta', { roughness: 0.5, emissive: [0.36, 0.2, 0.85], emissiveStrength: 1 });
  defineMaterial('aur_suave_magenta', { roughness: 0.5, emissive: [0.85, 0.1, 0.45], emissiveStrength: 1 });
  defineMaterial('aur_suave_verde', { roughness: 0.5, emissive: [0.18, 0.7, 0.25], emissiveStrength: 1 });
  defineMaterial('aur_net', { map: 'aur_net', roughness: 0.9, alpha: 0.99, doubleSided: true });
  defineMaterial('aur_water', { color: [0.55, 0.85, 0.95], roughness: 0.1, alpha: 0.82, emissive: [0.05, 0.15, 0.2], emissiveStrength: 1 });
  defineMaterial('water_fall', { color: [0.75, 0.92, 1], roughness: 0.15, alpha: 0.78, doubleSided: true, emissive: [0.1, 0.25, 0.3], emissiveStrength: 1 });
}
