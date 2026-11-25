/**
 * Recursos de terceiros (Poly Haven, CC0) convertidos para o jogo:
 *  - HDRIs → mapas de ambiente equirretangulares pequenos (WebP 512×256, faixa comprimida + escala em env.json),
 *    usados só para reflexos e luz ambiente (o céu visível continua sendo o shader do jogo);
 *  - texturas PBR → mapas de normal (e rugosidade em alguns) ladrilháveis de 512 px (WebP) para os pisos e muros;
 *  - mapas de normal derivados das texturas próprias de padrão regular (paralelepípedo, tijolo, laje...), para que
 *    o relevo acompanhe o desenho da cor.
 * Os originais baixados ficam em `.cache/polyhaven/` (fora do git); a saída vai para `public/assets/env` e
 * `public/assets/detail`, com a origem/autor/licença de cada arquivo em `sources.json` (lido pelo manifesto).
 *
 * Uso: npx tsx scripts/build-env.ts
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { ASSETS_DIR } from './lib/textures';
import { HDRIS, NORMALS_DERIVED, PH_TEXTURES } from '../src/game/tracks/iblSources';

const CACHE = path.resolve(import.meta.dirname, '../.cache/polyhaven');
const API = 'https://api.polyhaven.com';

export interface SourceInfo { origin: string; author: string; license: string }
const credits: Record<string, SourceInfo> = {};

function curl(url: string, out?: string): Buffer {
  // curl respeita o proxy do ambiente (o fetch do Node não)
  const args = ['-sSfL', '--retry', '3', '--max-time', '300', url];
  if (out) args.push('-o', out);
  return execFileSync('curl', args, { maxBuffer: 64 << 20 });
}

async function info(id: string): Promise<{ name: string; authors: Record<string, string> }> {
  const p = path.join(CACHE, `${id}.info.json`);
  if (!existsSync(p)) await writeFile(p, curl(`${API}/info/${id}`));
  return JSON.parse(await readFile(p, 'utf8')) as { name: string; authors: Record<string, string> };
}

async function download(id: string, pick: (files: Record<string, unknown>) => { url: string; md5: string }): Promise<Buffer> {
  const fp = path.join(CACHE, `${id}.files.json`);
  if (!existsSync(fp)) await writeFile(fp, curl(`${API}/files/${id}`));
  const { url, md5 } = pick(JSON.parse(await readFile(fp, 'utf8')) as Record<string, unknown>);
  const local = path.join(CACHE, path.basename(new URL(url).pathname));
  if (!existsSync(local)) curl(url, local);
  const buf = await readFile(local);
  if (createHash('md5').update(buf).digest('hex') !== md5) throw new Error(`md5 divergente: ${local}`);
  return buf;
}

const srgb = (x: number): number => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

async function buildHdri(id: string, ph: string): Promise<Record<string, number>> {
  const raw = await download(ph, (f) => (f as { hdri: Record<string, { hdr: { url: string; md5: string } }> }).hdri['1k']!.hdr);
  const loader = new RGBELoader().setDataType(THREE.FloatType);
  const tex = loader.parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer) as unknown as { width: number; height: number; data: Float32Array };
  const W = tex.width / 2, H = tex.height / 2;
  const px = new Float32Array(W * H * 3);
  // reduz 2× (média 2×2); a imagem do RGBELoader vem com a linha 0 no topo
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) s += tex.data[((y * 2 + dy) * tex.width + x * 2 + dx) * 4 + c]!;
    px[(y * W + x) * 3 + c] = s / 4;
  }
  const lum = new Float32Array(W * H);
  let mean = 0, wsum = 0;
  for (let i = 0; i < W * H; i++) {
    lum[i] = px[i * 3]! * 0.2126 + px[i * 3 + 1]! * 0.7152 + px[i * 3 + 2]! * 0.0722;
  }
  // escala = percentil 99,5 da luminância: só o disco do sol/lâmpadas fortes saturam
  const sorted = Float32Array.from(lum).sort();
  const scale = Math.max(1e-4, sorted[Math.floor(sorted.length * 0.995)]!);
  // luminância média (ponderada pelo ângulo sólido) do mapa JÁ comprimido, na escala 0..1
  for (let i = 0; i < W * H; i++) {
    const w = Math.sin(((Math.floor(i / W) + 0.5) / H) * Math.PI);
    mean += Math.min(1, lum[i]! / scale) * w; wsum += w;
  }
  mean /= wsum;
  // sol = centróide dos pixels mais fortes (direção usada para alinhar o HDRI com o sol da pista)
  const thr = sorted[Math.floor(sorted.length * 0.9995)]!;
  let sx = 0, sy = 0, sv = 0, sw = 0;
  for (let i = 0; i < W * H; i++) if (lum[i]! >= thr) {
    const w = lum[i]!, a = ((i % W) / W) * Math.PI * 2;
    // média circular em u (o sol pode estar na emenda da imagem)
    sx += Math.cos(a) * w; sy += Math.sin(a) * w; sv += (Math.floor(i / W) + 0.5) * w; sw += w;
  }
  const sunU = ((Math.atan2(sy, sx) / (Math.PI * 2)) + 1) % 1;
  const sunV = sv / sw / H;
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H * 3; i++) out[i] = Math.round(Math.min(1, srgb(Math.max(0, px[i]! / scale))) * 255);
  const file = `env/${id}.webp`;
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 88, smartSubsample: true }).toFile(path.join(ASSETS_DIR, file));
  const meta = await info(ph);
  credits[path.basename(file)] = {
    origin: `Poly Haven — HDRI "${meta.name}" (https://polyhaven.com/a/${ph}), 1k .hdr reduzido a 512×256 por scripts/build-env.ts`,
    author: Object.keys(meta.authors).join(', '), license: 'CC0-1.0',
  };
  return { scale: +scale.toFixed(5), mean: +mean.toFixed(4), sunU: +sunU.toFixed(4), sunV: +sunV.toFixed(4) };
}

/** Normal OpenGL (+Y) de 1k → 512 px; rugosidade opcional normalizada (média ≈ 0,8) em 256 px. */
async function buildPhTexture(id: string, ph: string, rough: boolean): Promise<void> {
  const files = (f: Record<string, unknown>, key: string): { url: string; md5: string } => (f as Record<string, Record<string, { jpg: { url: string; md5: string } }>>)[key]!['1k']!.jpg;
  const nor = await download(ph, (f) => files(f, 'nor_gl'));
  await sharp(nor).resize(512, 512, { kernel: 'lanczos3' }).webp({ quality: 90 }).toFile(path.join(ASSETS_DIR, `detail/${id}_n.webp`));
  const meta = await info(ph);
  const credit = (what: string): SourceInfo => ({
    origin: `Poly Haven — textura "${meta.name}" (https://polyhaven.com/a/${ph}), ${what} 1k reduzido por scripts/build-env.ts`,
    author: Object.keys(meta.authors).join(', '), license: 'CC0-1.0',
  });
  credits[`${id}_n.webp`] = credit('mapa de normal (OpenGL)');
  if (rough) {
    const r = await download(ph, (f) => files(f, 'Rough'));
    const { data } = await sharp(r).resize(256, 256).greyscale().raw().toBuffer({ resolveWithObject: true });
    let m = 0; for (const v of data) m += v; m /= data.length;
    // a rugosidade final = fator do material × mapa: normaliza para média 0,8 (o fator sobe 1/0,8 no jogo)
    const k = (0.8 * 255) / Math.max(1, m);
    const outBuf = Buffer.from(data.map((v) => Math.min(255, Math.round(v * k))));
    await sharp(outBuf, { raw: { width: 256, height: 256, channels: 1 } }).webp({ quality: 85 }).toFile(path.join(ASSETS_DIR, `detail/${id}_r.webp`));
    credits[`${id}_r.webp`] = credit('mapa de rugosidade');
  }
}

/** Normal derivado da luminância de uma textura própria (ladrilhável: o Sobel dá a volta nas bordas). */
async function buildDerived(tex: string, strength: number): Promise<void> {
  const { data, info: im } = await sharp(path.join(ASSETS_DIR, `textures/${tex}.webp`)).greyscale().blur(0.8).raw().toBuffer({ resolveWithObject: true });
  const W = im.width, H = im.height;
  const h = (x: number, y: number): number => data[((y + H) % H) * W + ((x + W) % W)]! / 255;
  const out = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
    const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
    // claro = alto; convenção OpenGL (+Y para cima na imagem, que no glTF tem v=0 no topo)
    let nx = -dx * strength, ny = dy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * W + x) * 3;
    out[i] = Math.round((nx * 0.5 + 0.5) * 255); out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255); out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(path.join(ASSETS_DIR, `detail/${tex}_n.webp`));
  credits[`${tex}_n.webp`] = {
    origin: `scripts/build-env.ts (relevo derivado da textura própria textures/${tex}.webp)`,
    author: 'Equipe Kart Legends 3D', license: 'Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)',
  };
}

await mkdir(CACHE, { recursive: true });
await mkdir(path.join(ASSETS_DIR, 'env'), { recursive: true });
await mkdir(path.join(ASSETS_DIR, 'detail'), { recursive: true });

const envMeta: Record<string, Record<string, number>> = {};
for (const [id, h] of Object.entries(HDRIS)) {
  envMeta[id] = await buildHdri(id, h.ph);
  console.log('hdri', id, h.ph, envMeta[id]);
}
await writeFile(path.join(ASSETS_DIR, 'env/env.json'), JSON.stringify({ generator: 'scripts/build-env.ts', encoding: 'sRGB 8 bits; radiância linear = cor × scale', maps: envMeta }, null, 1));
credits['env.json'] = { origin: 'scripts/build-env.ts (metadados dos mapas de ambiente)', author: 'Equipe Kart Legends 3D', license: 'Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)' };
credits['sources.json'] = { ...credits['env.json'], origin: 'scripts/build-env.ts (origem, autor e licença de cada arquivo desta pasta)' };
await writeFile(path.join(ASSETS_DIR, 'env/sources.json'), JSON.stringify(credits, null, 1));

for (const k of Object.keys(credits)) delete credits[k];
for (const [id, t] of Object.entries(PH_TEXTURES)) { await buildPhTexture(id, t.ph, !!t.rough); console.log('textura', id, t.ph); }
for (const [tex, s] of Object.entries(NORMALS_DERIVED)) { await buildDerived(tex, s); console.log('derivada', tex); }
credits['sources.json'] = { origin: 'scripts/build-env.ts (origem, autor e licença de cada arquivo desta pasta)', author: 'Equipe Kart Legends 3D', license: 'Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)' };
await writeFile(path.join(ASSETS_DIR, 'detail/sources.json'), JSON.stringify(credits, null, 1));
console.log('ok');
