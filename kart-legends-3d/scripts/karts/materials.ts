/** Materiais e texturas autorais dos karts (prefixo `kart_`). */
import { defineMaterial } from '../lib/materials';
import { fbm, makeTexture, svgTexture, vnoise } from '../lib/textures';
import { TIRE_MAT } from './common';
import { textPaths } from './glyphs';

export interface PlateStyle { bg: string; fg: string; ring: string }

/** Placa redonda com o número do kart. Devolve o nome do material. */
export async function plateMaterial(id: string, num: number, st: PlateStyle): Promise<string> {
  const name = `kart_plate_${id}`;
  const glyph = textPaths(String(num), 38, 22, 5.2, `fill="none" stroke="${st.fg}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`).svg;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="${st.ring}"/>
    <circle cx="64" cy="64" r="57" fill="${st.bg}"/>
    <circle cx="64" cy="64" r="57" fill="none" stroke="${st.fg}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" opacity="0.55"/>
    ${glyph}</svg>`;
  await svgTexture(name, svg, 128, 88);
  return defineMaterial(name, { roughness: 0.55, map: name, noVertexColor: true });
}

export async function registerKartMaterials(): Promise<void> {
  defineMaterial('kart_metal', { roughness: 0.42, metalness: 0.55 });
  defineMaterial('kart_dark', { roughness: 0.7, metalness: 0.2 });
  // banda de rodagem: sulcos em V no centro (v 0,3–0,7), parede lateral com friso
  await makeTexture('kart_tread', 128, (u, v) => {
    const c = Math.abs(v - 0.5);
    let k = 1;
    if (c < 0.2) {
      const ph = (u + c * 1.1) % 1;
      const groove = ph < 0.16 ? 0.52 : 1;
      const center = c < 0.012 ? 0.6 : 1;
      k = Math.min(groove, center);
    } else if (c > 0.33 && c < 0.36) k = 1.35;
    else if (c > 0.4 && c < 0.44) k = (u * 4) % 1 < 0.5 ? 1.25 : 1;
    const n = 0.92 + 0.12 * vnoise(u, v, 16, 5);
    const g = Math.min(1, 0.72 * k * n);
    return [g, g, g * 1.02, 1];
  });
  defineMaterial(TIRE_MAT, { roughness: 0.92, map: 'kart_tread' });
  // madeira: veios ao longo de u
  await makeTexture('kart_wood', 128, (u, v) => {
    const grain = fbm(u * 0.5, v, 8, 4, 3);
    const rings = 0.5 + 0.5 * Math.sin((v * 9 + grain * 2.4) * Math.PI * 2);
    const k = 0.78 + 0.2 * rings + 0.1 * (vnoise(u, v, 32, 9) - 0.5);
    return [Math.min(1, k * 1.02), Math.min(1, k * 0.97), Math.min(1, k * 0.9), 1];
  });
  defineMaterial('kart_wood', { roughness: 0.74, map: 'kart_wood' });
  // lona/tecido trançado
  await makeTexture('kart_canvas', 64, (u, v) => {
    const a = Math.sin(u * Math.PI * 32), b = Math.sin(v * Math.PI * 32);
    const k = 0.86 + 0.09 * a * b + 0.05 * (vnoise(u, v, 16, 2) - 0.5);
    return [k, k, k, 1];
  });
  defineMaterial('kart_canvas', { roughness: 0.92, map: 'kart_canvas' });
  // fibra de carbono (sarja 2×2)
  await makeTexture('kart_carbon', 64, (u, v) => {
    const x = Math.floor(u * 16), y = Math.floor(v * 16);
    const twill = (x + y) % 4 < 2 ? 1 : 0.62;
    const fx = (u * 16) % 1;
    const k = twill * (0.8 + 0.2 * Math.sin(fx * Math.PI));
    return [k, k, k * 1.03, 1];
  });
  defineMaterial('kart_carbon', { roughness: 0.4, metalness: 0.3, map: 'kart_carbon' });
  // metal martelado/rebitado (latão, ferro)
  await makeTexture('kart_hammered', 128, (u, v) => {
    const k = 0.84 + 0.16 * fbm(u, v, 12, 3, 7);
    return [k, k, k, 1];
  });
  defineMaterial('kart_brass', { roughness: 0.48, metalness: 0.4, map: 'kart_hammered' });
}
