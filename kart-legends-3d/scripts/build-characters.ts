/**
 * Gera os GLBs dos oito pilotos em public/assets/characters/ e o manifesto.
 * Uso: npx tsx scripts/build-characters.ts [id ...]
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';
import { EXPRESSIONS } from './characters/face';
import { exportCharacter, type CharDef, type CharStats } from './characters/export';
import { REQUIRED_BONES } from './characters/rig';
import { nilo } from './characters/nilo';
import { boro } from './characters/boro';

const ALL: CharDef[] = [nilo, boro];

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
if (!only.length) {
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
    characters: stats,
  };
  await writeFile(path.join(ASSETS_DIR, 'characters', 'characters-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`manifesto: ${stats.length} personagens`);
}
