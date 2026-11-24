/**
 * Valida os GLBs dos pilotos: ossos obrigatórios, 10 clipes, malha `face` (UV na célula 0 + textura),
 * ausência de NaN, quaternions normalizados e contínuos, posição das mãos, orçamento de triângulos e tamanho.
 * Uso: npx tsx scripts/characters/validate.ts
 */
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { Node } from '@gltf-transform/core';
import { createIO } from '../lib/glb';
import { ASSETS_DIR } from '../lib/textures';
import { CLIP_NAMES } from './anim';
import { HAND_TARGET, REQUIRED_BONES } from './rig';
import { CHARACTER_IDS } from '../../src/data/ids';

const IDS: readonly string[] = CHARACTER_IDS;
const io = await createIO();
let failures = 0;
const fail = (id: string, msg: string): void => { failures++; console.error(`  ✗ ${id}: ${msg}`); };

for (const id of IDS) {
  const file = path.join(ASSETS_DIR, 'characters', `${id}.glb`);
  const doc = await io.read(file);
  const root = doc.getRoot();
  const nodes = new Map<string, Node>(root.listNodes().map((n) => [n.getName(), n]));
  const bytes = (await stat(file)).size;

  for (const b of REQUIRED_BONES) if (!nodes.has(b)) fail(id, `osso ausente: ${b}`);
  const skin = root.listSkins()[0];
  if (!skin) fail(id, 'sem skin');
  const joints = new Set(skin?.listJoints().map((j) => j.getName()));
  for (const b of REQUIRED_BONES) if (!joints.has(b)) fail(id, `osso fora do skin: ${b}`);

  // mãos na pose de bind
  for (const [name, sg] of [['handL', 1], ['handR', -1]] as [string, number][]) {
    const m = nodes.get(name)?.getWorldTranslation() ?? [9, 9, 9];
    const d = Math.hypot(m[0] - sg * HAND_TARGET[0], m[1] - HAND_TARGET[1], m[2] - HAND_TARGET[2]);
    if (d > 0.03) fail(id, `${name} a ${(d * 100).toFixed(1)} cm do alvo`);
  }

  // clipes
  const anims = new Map(root.listAnimations().map((a) => [a.getName(), a]));
  const durations: string[] = [];
  for (const name of CLIP_NAMES) {
    const a = anims.get(name);
    if (!a) { fail(id, `clipe ausente: ${name}`); continue; }
    let dur = 0, minDot = 1;
    for (const ch of a.listChannels()) {
      const s = ch.getSampler()!;
      const input = s.getInput()!, output = s.getOutput()!;
      const target = ch.getTargetNode()?.getName() ?? '?';
      dur = Math.max(dur, input.getElement(input.getCount() - 1, [])[0]!);
      const size = output.getElementSize();
      let prev: number[] | null = null;
      for (let i = 0; i < output.getCount(); i++) {
        const v = output.getElement(i, []);
        if (v.some((x) => !Number.isFinite(x))) { fail(id, `${name}/${target}: valor não finito`); break; }
        if (ch.getTargetPath() === 'rotation') {
          const len = Math.hypot(v[0]!, v[1]!, v[2]!, v[3]!);
          if (Math.abs(len - 1) > 2e-3) { fail(id, `${name}/${target}: quaternion não normalizado (${len.toFixed(4)})`); break; }
          if (prev) minDot = Math.min(minDot, prev[0]! * v[0]! + prev[1]! * v[1]! + prev[2]! * v[2]! + prev[3]! * v[3]!);
          prev = v.slice(0, size);
        }
      }
      for (let i = 0; i < input.getCount(); i++) if (!Number.isFinite(input.getElement(i, [])[0]!)) fail(id, `${name}/${target}: tempo não finito`);
    }
    if (minDot < 0.9) fail(id, `${name}: salto de rotação entre quadros (dot mínimo ${minDot.toFixed(3)})`);
    durations.push(`${name} ${dur.toFixed(2)}s`);
  }

  // malhas
  let tris = 0, faceOk = false;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices(), pos = prim.getAttribute('POSITION')!;
      tris += (idx ? idx.getCount() : pos.getCount()) / 3;
      for (const sem of ['POSITION', 'NORMAL']) {
        const acc = prim.getAttribute(sem)!;
        for (let i = 0; i < acc.getCount(); i++) if (acc.getElement(i, []).some((x) => !Number.isFinite(x))) { fail(id, `${mesh.getName()}: ${sem} não finito`); break; }
      }
      if (!prim.getAttribute('JOINTS_0') || !prim.getAttribute('WEIGHTS_0')) fail(id, `${mesh.getName()}: primitiva sem skin`);
    }
    if (mesh.getName() === 'face') {
      const prim = mesh.listPrimitives()[0]!;
      const uv = prim.getAttribute('TEXCOORD_0')!;
      let u0 = 9, u1 = -9, v0 = 9, v1 = -9;
      for (let i = 0; i < uv.getCount(); i++) { const e = uv.getElement(i, []); u0 = Math.min(u0, e[0]!); u1 = Math.max(u1, e[0]!); v0 = Math.min(v0, e[1]!); v1 = Math.max(v1, e[1]!); }
      const eps = 2e-3;
      if (u0 < -eps || u1 > 0.25 + eps || v0 < -eps || v1 > 0.5 + eps) fail(id, `face: UV fora da célula 0 (u ${u0.toFixed(3)}..${u1.toFixed(3)}, v ${v0.toFixed(3)}..${v1.toFixed(3)})`);
      else if (u1 - u0 < 0.24 || v1 - v0 < 0.48) fail(id, 'face: UV não cobre a célula 0');
      const mat = prim.getMaterial();
      if (mat?.getName() !== `face_${id}`) fail(id, `face: material ${mat?.getName()}`);
      if (!mat?.getBaseColorTexture()) fail(id, 'face: material sem textura');
      faceOk = true;
    }
  }
  if (!faceOk) fail(id, 'malha `face` ausente');
  if (!nodes.get('face')?.getMesh()) fail(id, 'nó `face` sem malha');
  if (tris < 6000 || tris > 14000) fail(id, `${tris} triângulos fora de 6k–14k`);
  if (bytes > 600_000) fail(id, `${bytes} bytes > 600 kB`);
  console.log(`✓ ${id}: ${tris} tris, ${joints.size} ossos, ${(bytes / 1024).toFixed(0)} kB, ${anims.size} clipes [${durations.join(', ')}]`);
}
if (failures) { console.error(`\n${failures} falha(s)`); process.exit(1); }
console.log('\nTodos os personagens passaram na validação.');
