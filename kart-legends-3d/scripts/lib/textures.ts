/** Texturas autorais geradas por código (ruído, padrões) e gravadas como WebP. */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ASSETS_DIR = path.resolve(import.meta.dirname, '../../public/assets');
export type Rgba = [number, number, number, number];
export type TexFn = (u: number, v: number, x: number, y: number) => Rgba | [number, number, number];

const registry = new Map<string, Uint8Array>();

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Ruído de valor periódico (repete a cada `period` células → textura ladrilhável). */
export function vnoise(u: number, v: number, period: number, seed = 1): number {
  const x = u * period, y = v * period;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const w = (i: number): number => ((i % period) + period) % period;
  const a = hash2(w(x0), w(y0), seed), b = hash2(w(x0 + 1), w(y0), seed);
  const c = hash2(w(x0), w(y0 + 1), seed), d = hash2(w(x0 + 1), w(y0 + 1), seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Ruído fractal ladrilhável (0..1). */
export function fbm(u: number, v: number, period = 4, octaves = 4, seed = 1): number {
  let sum = 0, amp = 0.5, norm = 0, p = period;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(u, v, p, seed + o * 17);
    norm += amp; amp *= 0.5; p *= 2;
  }
  return sum / norm;
}

/** Voronoi ladrilhável: devolve [distância à célula mais próxima, distância à borda, id da célula]. */
export function voronoi(u: number, v: number, cells: number, seed = 1, jitter = 0.9): [number, number, number] {
  const x = u * cells, y = v * cells;
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j;
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    const px = cx + 0.5 + (hash2(wx, wy, seed) - 0.5) * jitter;
    const py = cy + 0.5 + (hash2(wx, wy, seed + 7) - 0.5) * jitter;
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; id = hash2(wx, wy, seed + 13); } else if (d < d2) d2 = d;
  }
  return [d1, d2 - d1, id];
}

/** Gera uma textura size×size e grava em public/assets/textures/<name>.webp. */
export async function makeTexture(name: string, size: number, fn: TexFn, quality = 82): Promise<Uint8Array> {
  const cached = registry.get(name);
  if (cached) return cached;
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = fn((x + 0.5) / size, (y + 0.5) / size, x, y);
    const k = (y * size + x) * 4;
    data[k] = Math.max(0, Math.min(255, Math.round(c[0] * 255)));
    data[k + 1] = Math.max(0, Math.min(255, Math.round(c[1] * 255)));
    data[k + 2] = Math.max(0, Math.min(255, Math.round(c[2] * 255)));
    data[k + 3] = Math.max(0, Math.min(255, Math.round((c[3] ?? 1) * 255)));
  }
  const bytes = new Uint8Array(await sharp(data, { raw: { width: size, height: size, channels: 4 } }).webp({ quality }).toBuffer());
  await saveTexture(name, bytes);
  return bytes;
}

/** Rasteriza um SVG (arte vetorial autoral) para WebP. */
export async function svgTexture(name: string, svg: string, size: number, quality = 90): Promise<Uint8Array> {
  const cached = registry.get(name);
  if (cached) return cached;
  const bytes = new Uint8Array(await sharp(Buffer.from(svg)).resize(size, size, { fit: 'fill' }).webp({ quality }).toBuffer());
  await saveTexture(name, bytes);
  return bytes;
}

async function saveTexture(name: string, bytes: Uint8Array): Promise<void> {
  registry.set(name, bytes);
  const file = path.join(ASSETS_DIR, 'textures', `${name}.webp`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export function getTexture(name: string): Uint8Array {
  const t = registry.get(name);
  if (!t) throw new Error(`Textura não registrada: ${name} (chame makeTexture/svgTexture antes de exportar)`);
  return t;
}
