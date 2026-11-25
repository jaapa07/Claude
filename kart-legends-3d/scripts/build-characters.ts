/**
 * Gera os GLBs dos pilotos em public/assets/characters/ e o manifesto.
 * Uso: npx tsx scripts/build-characters.ts [id ...]
 * Com ids, só esses pilotos são refeitos e as entradas deles são atualizadas no manifesto existente.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';
import { EXPRESSIONS } from './characters/face';
import { exportCharacter, type CharDef, type CharStats } from './characters/export';
import { REQUIRED_BONES } from './characters/rig';
import { nilo } from './characters/nilo';
import { boro } from './characters/boro';
import { lumi } from './characters/lumi';
import { kora } from './characters/kora';
import { tiko } from './characters/tiko';
import { mavi } from './characters/mavi';
import { runi } from './characters/runi';
import { zera } from './characters/zera';
import { capi } from './characters/capi';
import { tuca } from './characters/tuca';
import { yuki } from './characters/yuki';

const ALL: CharDef[] = [nilo, boro, lumi, kora, tiko, mavi, runi, zera, capi, tuca, yuki];

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const list = only.length ? ALL.filter((d) => only.includes(d.id)) : ALL;
const stats: CharStats[] = [];
for (const def of list) {
  console.log(`▶ ${def.id}`);
  const s = await exportCharacter(def);
  if (s.triangles < 6000 || s.triangles > 14000) console.warn(`  ! ${def.id}: ${s.triangles} triângulos fora do orçamento 6k–14k`);
  if (s.bytes > 600_000) console.warn(`  ! ${def.id}: ${s.bytes} bytes acima de ~600 kB`);
  console.log(`  ${s.triangles} tris, ${s.bones} ossos, ${(s.bytes / 1024).toFixed(1)} kB, altura sentada ${s.seatedHeight} m`);
  stats.push(s);
}
const manifestFile = path.join(ASSETS_DIR, 'characters', 'characters-manifest.json');
let all = stats;
if (only.length) {
  // Build parcial: preserva as entradas dos outros pilotos e mantém a ordem de ALL.
  let previous: CharStats[] = [];
  try { previous = (JSON.parse(await readFile(manifestFile, 'utf8')) as { characters: CharStats[] }).characters; } catch { /* sem manifesto anterior */ }
  const byId = new Map(previous.map((s) => [s.id, s]));
  for (const s of stats) byId.set(s.id, s);
  all = ALL.map((d) => byId.get(d.id)).filter((s): s is CharStats => !!s);
}
const manifest = {
  generator: 'scripts/build-characters.ts',
  units: 'metros; origem na base do quadril; frente = +Z; L = esquerda do personagem = +X',
  requiredBones: REQUIRED_BONES,
  bindPose: 'pose de direção sentada; todos os ossos têm rotação de repouso identidade; mãos em (±0.14, 0.52, 0.38)',
  face: {
    mesh: 'face', material: 'face_<id>', atlas: '4 colunas × 2 linhas', expressions: EXPRESSIONS,
    uvConvention: 'TEXCOORD_0 da malha `face` cobre a célula 0 (neutral): u de 0 a 0.25, v de 0 a 0.5, com v=0 no TOPO da imagem (convenção glTF; no three.js a textura do GLTFLoader vem com flipY=false). u cresce da direita do personagem (−X) para a esquerda (+X), ou seja, a imagem não fica espelhada vista de frente. Para a expressão i (0..7): map.offset.set(0.25 * (i % 4), 0.5 * Math.floor(i / 4)), mantendo map.repeat = (1, 1) e wrap padrão.',
    atlasPixels: '1024×1024 (conteúdo 1024×512 esticado 2× na vertical, pois scripts/lib/textures.ts só rasteriza quadrado; as UVs são as mesmas de um atlas 1024×512)',
  },
  animation: { fps: 30, once: ['hit', 'victory', 'defeat'], note: 'turn_right/drift_right são o espelho exato da pose de turn_left/drift_left' },
  characters: all,
};
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifesto: ${all.length} personagens`);
