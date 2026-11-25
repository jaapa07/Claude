/**
 * Converte os poucos recursos de terceiros (CC0) usados no jogo — modelos, sprites e sons dos pacotes da Kenney
 * e árvores/plantas do Stylized Nature MegaKit da Quaternius — para os formatos do projeto, e registra a origem
 * de cada arquivo em `sources.json`. Só lê e converte arquivos dos pacotes (nada deles é executado).
 *
 * Os pacotes ficam fora do git, extraídos em `.cache/` (ver docs/ASSET_PIPELINE.md):
 *   .cache/kenney/{racing-kit,nature-kit,car-kit}/models/*.glb, particle-pack/png/*.png,
 *   impact-sounds/audio/*.ogg, interface-sounds/audio/*.ogg, <pacote>/License.txt
 *   .cache/quaternius/obj/*.obj|mtl, textures_unnamed/*, License_Standard.txt
 *
 * Saída:
 *   public/assets/kits/kenney-scenery.glb     (um nó por modelo; um material com cor de vértice)
 *   public/assets/kits/quaternius-nature.glb  (casca/pedra com cor de vértice + folhagem recortada num atlas)
 *   public/assets/kits/kenney-particles.webp  (atlas 4×4 de sprites, 128 px por célula)
 *   public/assets/audio/kenney/*.ogg e audio/aac/kenney/*.m4a (efeitos com nível casado aos sons sintetizados)
 * Uso: npx tsx scripts/build-kits.ts [--only=models|particles|audio]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { SAMPLE_SFX } from '../src/game/audio/audioIds';
import { KENNEY_MODELS, QUATERNIUS_MODELS } from './kits/catalog';
import { foliageAtlas, loadKenney, loadQuaternius } from './kits/load';
import { KENNEY_SPRITES } from './kits/sprites';
import { GlbBuilder } from './lib/glb';
import { Model } from './lib/geo';
import { defineMaterial } from './lib/materials';
import { ASSETS_DIR } from './lib/textures';

const ROOT = path.resolve(import.meta.dirname, '..');
const KENNEY = path.join(ROOT, '.cache/kenney');
const QUAT = path.join(ROOT, '.cache/quaternius');
const KITS = path.join(ASSETS_DIR, 'kits');
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }));
const only = flags.only as string | undefined;

const OWN = { author: 'Equipe Kart Legends 3D', license: 'Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)' };
const KENNEY_PACKS: Record<string, string> = {
  racing: 'Racing Kit 2.0', nature: 'Nature Kit 2.1', car: 'Car Kit 3.1', particle: 'Particle Pack 1.1', impact: 'Impact Sounds 1.0', interface: 'Interface Sounds 1.0',
};
const kenneyOrigin = (pack: string, files: string[], how: string): string =>
  `Kenney — ${KENNEY_PACKS[pack]} (https://kenney.nl/assets, CC0 1.0): ${files.join(', ')}; ${how}`;

interface Source { origin: string; author: string; license: string }
async function writeSources(dir: string, entries: Record<string, Source>): Promise<void> {
  const file = path.join(dir, 'sources.json');
  const prev = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) as Record<string, Source> : {};
  const all = { ...prev, ...entries, 'sources.json': { origin: 'scripts/build-kits.ts (origem, autor e licença de cada arquivo desta pasta)', ...OWN } };
  // só arquivos que existem
  const present = new Set(await readdir(dir));
  const out = Object.fromEntries(Object.entries(all).filter(([k]) => present.has(k) || k === 'sources.json').sort(([a], [b]) => (a === 'sources.json' ? 1 : b === 'sources.json' ? -1 : a.localeCompare(b))));
  await writeFile(file, JSON.stringify(out, null, 1) + '\n');
}

/* ---------------------------------------------------------------- modelos */

const SOLID = defineMaterial('kit_solid', { roughness: 0.86 });
const FOLIAGE = defineMaterial('kit_foliage', { roughness: 0.82, doubleSided: true });

async function buildModels(): Promise<Record<string, Source>> {
  const sources: Record<string, Source> = {};
  // Kenney
  {
    const b = new GlbBuilder('Kart Legends 3D asset pipeline (scripts/build-kits.ts)');
    b.doc.getRoot().getAsset().copyright = 'Modelos de Kenney (https://kenney.nl), CC0 1.0 — convertidos por scripts/build-kits.ts';
    const byPack = new Map<string, string[]>();
    let tris = 0;
    for (const m of KENNEY_MODELS) {
      const dir = { racing: 'racing-kit', nature: 'nature-kit', car: 'car-kit', quaternius: '' }[m.pack];
      const g = await loadKenney(path.join(KENNEY, dir, 'models', `${m.file}.glb`), m);
      const model = new Model();
      if (g.solid) { model.parts.push({ geo: g.solid, mat: SOLID }); tris += g.solid.getAttribute('position').count / 3; }
      const bb = model.bounds();
      if (flags.verbose) console.log(`  ${m.id}: ${Math.round(model.triangleCount())} tri, ${(bb.max.x - bb.min.x).toFixed(1)}×${(bb.max.y - bb.min.y).toFixed(1)}×${(bb.max.z - bb.min.z).toFixed(1)} m`);
      b.node(m.id, { mesh: b.mesh(m.id, model) });
      byPack.set(m.pack, [...(byPack.get(m.pack) ?? []), `${m.file}.glb`]);
    }
    const bytes = await b.save(path.join(KITS, 'kenney-scenery.glb'));
    console.log(`kenney-scenery.glb: ${KENNEY_MODELS.length} modelos, ${Math.round(tris)} triângulos, ${(bytes / 1024).toFixed(0)} kB`);
    sources['kenney-scenery.glb'] = {
      origin: [...byPack].map(([p, files]) => kenneyOrigin(p, files, 'cores de material e paleta colormap.png convertidas em cor de vértice, escala em metros')).join(' | ') + ' — scripts/build-kits.ts',
      author: 'Kenney', license: 'CC0-1.0',
    };
  }
  // Quaternius
  {
    const b = new GlbBuilder('Kart Legends 3D asset pipeline (scripts/build-kits.ts)');
    b.doc.getRoot().getAsset().copyright = 'Modelos de Quaternius (https://quaternius.com), Stylized Nature MegaKit [Standard], CC0 1.0 — convertidos por scripts/build-kits.ts';
    let tris = 0;
    const report: string[] = [];
    for (const m of QUATERNIUS_MODELS) {
      const g = await loadQuaternius(QUAT, m);
      const model = new Model();
      if (g.solid) model.parts.push({ geo: g.solid, mat: SOLID });
      if (g.foliage) model.parts.push({ geo: g.foliage, mat: FOLIAGE });
      const t = model.triangleCount();
      tris += t;
      const bb = model.bounds();
      report.push(`${m.id} ${Math.round(t)} tri ${(bb.max.x - bb.min.x).toFixed(1)}×${(bb.max.y - bb.min.y).toFixed(1)} m`);
      b.node(m.id, { mesh: b.mesh(m.id, model) });
    }
    // atlas de folhagem: textura própria do GLB (não vai para public/assets/textures, que é só de arte do projeto)
    b.doc.createExtension(EXTTextureWebP).setRequired(true);
    const atlas = await foliageAtlas(QUAT);
    const tex = b.doc.createTexture('kit_foliage_atlas').setImage(new Uint8Array(atlas)).setMimeType('image/webp');
    b.material(FOLIAGE).setBaseColorTexture(tex).setAlphaMode('MASK').setAlphaCutoff(0.5);
    const bytes = await b.save(path.join(KITS, 'quaternius-nature.glb'));
    console.log(`quaternius-nature.glb: ${QUATERNIUS_MODELS.length} modelos, ${Math.round(tris)} triângulos (atlas ${(atlas.length / 1024).toFixed(0)} kB), ${(bytes / 1024).toFixed(0)} kB\n  ${report.join(', ')}`);
    sources['quaternius-nature.glb'] = {
      origin: `Quaternius — Stylized Nature MegaKit [Standard] (https://quaternius.com, CC0 1.0): ${QUATERNIUS_MODELS.map((m) => `${m.file}.obj`).join(', ')} e as texturas de casca, pedra, cogumelo, folhas e flores do pacote; casca/pedra viram cor de vértice (troncos simplificados com meshoptimizer), folhas e flores num atlas WebP 512 px recortado — scripts/build-kits.ts`,
      author: 'Quaternius', license: 'CC0-1.0',
    };
  }
  return sources;
}

/* ---------------------------------------------------------------- partículas */

async function buildParticles(): Promise<Record<string, Source>> {
  const C = 128;
  const layers: sharp.OverlayOptions[] = [];
  for (const [i, name] of KENNEY_SPRITES.entries()) {
    const img = await sharp(path.join(KENNEY, 'particle-pack', 'png', `${name}.png`)).ensureAlpha().resize(C, C, { kernel: 'lanczos3' }).png().toBuffer();
    layers.push({ input: img, left: (i % 4) * C, top: Math.floor(i / 4) * C });
  }
  const out = await sharp({ create: { width: C * 4, height: C * 4, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
    .composite(layers).webp({ quality: 88, alphaQuality: 100 }).toBuffer();
  await writeFile(path.join(KITS, 'kenney-particles.webp'), out);
  console.log(`kenney-particles.webp: ${KENNEY_SPRITES.length} sprites, ${(out.length / 1024).toFixed(0)} kB`);
  return {
    'kenney-particles.webp': {
      origin: kenneyOrigin('particle', KENNEY_SPRITES.map((s) => `${s}.png`), 'reduzidos a 128 px e montados num atlas 4×4 — scripts/build-kits.ts'),
      author: 'Kenney', license: 'CC0-1.0',
    },
  };
}

/* ---------------------------------------------------------------- áudio */

function ff(args: string[]): string {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg falhou: ${args.join(' ')}\n${r.stderr}`);
  return r.stderr;
}
function levels(file: string): { peak: number; rms: number } {
  const log = ff(['-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(log)?.[1] ?? 0);
  const rms = Number(/mean_volume: (-?[\d.]+) dB/.exec(log)?.[1] ?? -20);
  return { peak, rms };
}

async function buildAudio(): Promise<void> {
  const outDir = path.join(ASSETS_DIR, 'audio', 'kenney');
  const aacDir = path.join(ASSETS_DIR, 'audio', 'aac', 'kenney');
  await rm(outDir, { recursive: true, force: true });
  await rm(aacDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(aacDir, { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(ASSETS_DIR, 'audio', 'audio-manifest.json'), 'utf8')) as { files: { id: string; kind: string; rmsDb: number }[] };
  const synthRms = new Map(manifest.files.filter((f) => f.kind === 'sfx').map((f) => [f.id, f.rmsDb]));
  const sources: Record<string, Source> = {}, aacSources: Record<string, Source> = {};
  for (const [id, spec] of Object.entries(SAMPLE_SFX)) {
    // nível: RMS casado com o som sintetizado que ele substitui (camadas ficam alguns dB abaixo), pico ≤ −1 dBFS
    const ref = synthRms.get(spec.levelOf ?? id) ?? -20;
    const target = ref + (spec.layer !== undefined ? -3 : 0);
    for (const rel of spec.files) {
      const name = path.basename(rel, '.ogg');
      const pack = name.startsWith('impact') || name.startsWith('footstep') ? 'impact' : 'interface';
      const src = path.join(KENNEY, pack === 'impact' ? 'impact-sounds' : 'interface-sounds', 'audio', `${name}.ogg`);
      const lv = levels(src);
      const gain = Math.min(target - lv.rms, -1 - lv.peak);
      const dest = path.join(outDir, `${name}.ogg`);
      if (existsSync(dest)) continue;
      ff(['-y', '-i', src, '-af', `volume=${gain.toFixed(2)}dB,apad=whole_dur=0.3`, '-ar', '44100', '-ac', '2', '-c:a', 'libvorbis', '-q:a', '4', '-fflags', '+bitexact', '-map_metadata', '-1', dest]);
      ff(['-y', '-loglevel', 'error', '-i', dest, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(aacDir, `${name}.m4a`)]);
      const how = `nível ajustado em ${gain.toFixed(1)} dB (RMS casado com o efeito "${id}" do jogo), 44,1 kHz estéreo`;
      sources[`${name}.ogg`] = { origin: `${kenneyOrigin(pack, [`${name}.ogg`], `${how}, Ogg Vorbis`)} — scripts/build-kits.ts`, author: 'Kenney', license: 'CC0-1.0' };
      aacSources[`${name}.m4a`] = { origin: `${kenneyOrigin(pack, [`${name}.ogg`], `${how}, cópia AAC para o Safari`)} — scripts/build-kits.ts`, author: 'Kenney', license: 'CC0-1.0' };
    }
  }
  await writeSources(outDir, sources);
  await writeSources(aacDir, aacSources);
  console.log(`áudio: ${Object.keys(sources).length} efeitos em audio/kenney (+ AAC)`);
}

/* ---------------------------------------------------------------- principal */

await mkdir(KITS, { recursive: true });
const kitSources: Record<string, Source> = {};
if (!only || only === 'models') Object.assign(kitSources, await buildModels());
if (!only || only === 'particles') Object.assign(kitSources, await buildParticles());
if (Object.keys(kitSources).length || !existsSync(path.join(KITS, 'sources.json'))) await writeSources(KITS, kitSources);
if (!only || only === 'audio') await buildAudio();
