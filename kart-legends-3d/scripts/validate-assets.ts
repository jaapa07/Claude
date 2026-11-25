/**
 * Validação automática dos assets (npm run validate:assets).
 * Confere: arquivos ausentes ou não registrados, texturas quebradas, modelos inválidos, nós/ossos/clipes
 * obrigatórios, referências das pistas a modelos, áudio esperado e licenças. Qualquer falha encerra com erro.
 */
import { existsSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ARENA_IDS } from '../src/data/battle';
import { CHARACTER_IDS, ITEM_IDS, KART_IDS, TRACK_IDS } from '../src/data/ids';
import type { ArenaData } from '../src/game/battle/arenaTypes';
import { TIRE_IDS } from '../src/game/vehicles/tires';
import { ALL_AUDIO_FILES } from '../src/game/audio/audioIds';
import type { TrackData } from '../src/game/tracks/trackTypes';
import { LICENSE, buildManifest, type ManifestEntry } from './build-manifest';
import { createIO } from './lib/glb';
import { ASSETS_DIR } from './lib/textures';

const errors: string[] = [];
const fail = (msg: string): void => { errors.push(msg); };
const file = (rel: string): string => path.join(ASSETS_DIR, rel);

const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'armL', 'forearmL', 'handL', 'armR', 'forearmR', 'handR', 'legL', 'shinL', 'legR', 'shinR'];
const CLIPS = ['idle', 'drive', 'turn_left', 'turn_right', 'drift_left', 'drift_right', 'hit', 'victory', 'defeat', 'podium'];
const KART_NODES = ['body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'steering', 'seat', 'exhaust_l', 'exhaust_r'];
const ITEM_MODELS = [
  'item-box', 'pulso-solar', 'bolha-guardia', 'nevoa-prisma', 'faisca-rastreadora', 'onda-vento', 'cristal-salto',
  'boost-pad', 'ramp', 'finish-arch', 'trophy-gold', 'trophy-silver', 'trophy-bronze', 'podium',
];

const manifestPath = file('manifest.json');
if (!existsSync(manifestPath)) {
  console.error('ERRO: public/assets/manifest.json ausente. Rode "npm run assets:manifest".');
  process.exit(1);
}
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { version: number; generatedBy: string; assets: ManifestEntry[] };
const listed = new Map(manifest.assets.map((a) => [a.path, a]));

// 1. o manifesto corresponde exatamente ao que está no disco
const onDisk = await buildManifest();
for (const d of onDisk) {
  const m = listed.get(d.path);
  if (!m) fail(`não registrado no manifesto: ${d.path}`);
  else if (m.bytes !== d.bytes) fail(`tamanho divergente do manifesto: ${d.path} (${m.bytes} ≠ ${d.bytes})`);
}
for (const a of manifest.assets) {
  if (!existsSync(file(a.path))) fail(`arquivo ausente: ${a.path}`);
  if (a.license !== LICENSE) fail(`licença não reconhecida em ${a.path}: "${a.license}"`);
  for (const k of ['id', 'name', 'type', 'path', 'format', 'origin', 'author', 'license', 'usedIn'] as const) if (!a[k]) fail(`campo "${k}" vazio em ${a.path}`);
}

// 2. conjunto obrigatório
const need = (rel: string): boolean => { if (!listed.has(rel)) { fail(`recurso obrigatório ausente: ${rel}`); return false; } return true; };
for (const id of CHARACTER_IDS) { need(`characters/${id}.glb`); need(`ui/portraits/${id}.webp`); need(`ui/icons/${id}.webp`); }
for (const id of KART_IDS) { need(`karts/${id}.glb`); need(`ui/karts/${id}.webp`); }
for (const id of TRACK_IDS) { need(`tracks/${id}.glb`); need(`tracks/${id}.json`); need(`ui/tracks/${id}.webp`); }
for (const id of ITEM_IDS) need(`ui/items/${id}.webp`);
for (const id of ITEM_MODELS) need(`items/${id}.glb`);
for (const f of ALL_AUDIO_FILES) need(f);
need('vfx/particles.webp');
for (const id of ARENA_IDS) { need(`arenas/${id}.glb`); need(`arenas/${id}.json`); }
for (const id of TIRE_IDS) { need(`tires/${id}.glb`); need(`ui/tires/${id}.webp`); }

// 3. imagens e texturas decodificam
for (const a of manifest.assets.filter((x) => x.format === 'webp' || x.format === 'png')) {
  try {
    const meta = await sharp(file(a.path)).metadata();
    if (!meta.width || !meta.height) fail(`imagem sem dimensões: ${a.path}`);
  } catch (e) { fail(`imagem quebrada: ${a.path} (${(e as Error).message})`); }
}

// 4. áudio: cabeçalho Ogg e tamanho mínimo
for (const a of manifest.assets.filter((x) => x.type === 'audio')) {
  const buf = await readFile(file(a.path));
  if (a.format === 'm4a') {
    if (buf.subarray(4, 8).toString('latin1') !== 'ftyp') fail(`áudio sem cabeçalho MP4: ${a.path}`);
  } else if (buf.subarray(0, 4).toString('latin1') !== 'OggS') fail(`áudio sem cabeçalho Ogg: ${a.path}`);
  if (buf.length < 2000) fail(`áudio suspeito (muito pequeno): ${a.path}`);
}

// 5. modelos: leitura completa + requisitos por categoria
const io = await createIO();
let triangles = 0;
for (const a of manifest.assets.filter((x) => x.type === 'model')) {
  try {
    const doc = await io.read(file(a.path));
    const root = doc.getRoot();
    const names = new Set(root.listNodes().map((n) => n.getName()));
    let tris = 0;
    for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos || pos.getCount() === 0) { fail(`primitiva sem vértices: ${a.path}`); continue; }
      const arr = pos.getArray()!;
      for (let i = 0; i < arr.length; i += 97) if (!Number.isFinite(arr[i]!)) { fail(`vértice inválido (NaN) em ${a.path}`); break; }
      tris += (prim.getIndices()?.getCount() ?? pos.getCount()) / 3;
      if (!prim.getMaterial()) fail(`primitiva sem material: ${a.path}`);
    }
    if (tris === 0) fail(`modelo sem geometria: ${a.path}`);
    triangles += tris;
    for (const tex of root.listTextures()) if (!tex.getImage()?.byteLength) fail(`textura embutida vazia em ${a.path}`);
    if (a.path.startsWith('characters/')) {
      for (const b of BONES) if (!names.has(b)) fail(`${a.path}: osso obrigatório ausente "${b}"`);
      const clips = new Map(root.listAnimations().map((c) => [c.getName(), c]));
      for (const c of CLIPS) {
        const clip = clips.get(c);
        if (!clip) { fail(`${a.path}: animação ausente "${c}"`); continue; }
        for (const s of clip.listSamplers()) {
          const out = s.getOutput()?.getArray();
          if (!out || Array.from(out).some((v) => !Number.isFinite(v))) { fail(`${a.path}: clipe "${c}" com valores inválidos`); break; }
        }
      }
      if (root.listSkins().length === 0) fail(`${a.path}: sem skin`);
      if (!names.has('face') && !root.listMeshes().some((m) => m.getName() === 'face') && !root.listMaterials().some((m) => m.getName().startsWith('face_'))) fail(`${a.path}: malha "face" ausente`);
    }
    if (a.path.startsWith('tires/') && !names.has('tire')) fail(`${a.path}: nó obrigatório ausente "tire"`);
    if (a.path.startsWith('karts/')) for (const nme of KART_NODES) if (!names.has(nme)) fail(`${a.path}: nó obrigatório ausente "${nme}"`);
  } catch (e) { fail(`modelo inválido: ${a.path} (${(e as Error).message})`); }
}

// 6. dados das pistas e suas referências
for (const id of TRACK_IDS) {
  const p = file(`tracks/${id}.json`);
  if (!existsSync(p)) continue;
  const t = JSON.parse(await readFile(p, 'utf8')) as TrackData;
  if (t.id !== id) fail(`tracks/${id}.json: id divergente`);
  if (t.main.halfWidth.length !== t.count || t.main.pos.length !== t.count * 3) fail(`tracks/${id}.json: amostras inconsistentes`);
  if (t.checkpoints.length < 8) fail(`tracks/${id}.json: poucos checkpoints`);
  if (t.grid.length < 8) fail(`tracks/${id}.json: grid com menos de 8 posições`);
  if (t.itemRows.length < 3) fail(`tracks/${id}.json: poucas zonas de itens`);
  if (t.shortcuts.length < 1) fail(`tracks/${id}.json: sem atalho`);
  if (t.ramps.length < 1) fail(`tracks/${id}.json: sem rampa`);
  if (t.introCamera.length < 1) fail(`tracks/${id}.json: sem câmera de apresentação`);
  if (t.minimap.points.length < 20) fail(`tracks/${id}.json: minimapa vazio`);
  for (const m of new Set([...t.obstacles.map((o) => o.model), ...t.animatedProps.map((o) => o.model)])) {
    if (!listed.has(`props/${m}.glb`)) fail(`tracks/${id}.json: referência quebrada a props/${m}.glb`);
  }
}

// 7. arenas de batalha
for (const id of ARENA_IDS) {
  const p = file(`arenas/${id}.json`);
  if (!existsSync(p)) continue;
  const a = JSON.parse(await readFile(p, 'utf8')) as ArenaData;
  if (a.id !== id) fail(`arenas/${id}.json: id divergente`);
  if (a.spawns.length < 8) fail(`arenas/${id}.json: menos de 8 posições de largada`);
  if (a.itemBoxes.length < 4) fail(`arenas/${id}.json: poucas caixas de item`);
  if (a.crystalSpawns.length < 20) fail(`arenas/${id}.json: poucos pontos de cristal`);
  if (a.crownSpawns.length < 1) fail(`arenas/${id}.json: sem ponto da coroa`);
  if (a.ground.nx * a.ground.nz * 2 !== Buffer.from(a.ground.heights, 'base64').length) fail(`arenas/${id}.json: chão inconsistente`);
  if (a.boxes.length % 7 || a.cylinders.length % 5) fail(`arenas/${id}.json: colisores malformados`);
  for (const m of new Set(a.animatedProps.map((o) => o.model))) if (!listed.has(`props/${m}.glb`)) fail(`arenas/${id}.json: referência quebrada a props/${m}.glb`);
}

if (errors.length) {
  console.error(`\nFALHA: ${errors.length} problema(s) nos assets:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
for (const a of manifest.assets) a.status = 'validado';
await writeFile(manifestPath, JSON.stringify(manifest, null, 1));
const bytes = manifest.assets.reduce((s, a) => s + a.bytes, 0);
const sizes = await Promise.all(manifest.assets.map((a) => stat(file(a.path)).then((s) => s.size)));
console.log(`OK: ${manifest.assets.length} recursos validados (${(bytes / 1048576).toFixed(1)} MB, ${sizes.length} arquivos, ~${Math.round(triangles / 1000)} mil triângulos em modelos). Manifesto marcado como "validado".`);
