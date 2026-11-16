/** Monta o GLB de um piloto: esqueleto, skin, malhas `body` e `face`, e os 10 clipes. */
import path from 'node:path';
import { GlbBuilder, type Channel } from '../lib/glb';
import { defineMaterial } from '../lib/materials';
import { ASSETS_DIR } from '../lib/textures';
import { CLIPS, sampleClip } from './anim';
import { Ctx } from './base';
import { buildFaceAtlas, type FaceSpec } from './face';
import { HAND_TARGET, REQUIRED_BONES, type RigSpec } from './rig';

export interface CharDef {
  id: string;
  rig?: RigSpec;
  /** Modela o personagem no contexto e devolve a especificação do rosto. */
  build: (c: Ctx) => FaceSpec;
}

export interface CharStats {
  id: string; file: string; bytes: number; triangles: number; bones: number; extraBones: string[];
  handL: number[]; handR: number[]; seatedHeight: number;
  facePatch: { widthM: number; heightM: number };
  clips: { name: string; duration: number; loop: boolean }[];
}

const r4 = (n: number): number => Math.round(n * 1e4) / 1e4;

export async function exportCharacter(def: CharDef, outDir = path.join(ASSETS_DIR, 'characters')): Promise<CharStats> {
  const c = new Ctx(def.id, def.rig);
  const faceSpec = def.build(c);
  const faceMat = defineMaterial(`face_${def.id}`, { map: `face_${def.id}`, roughness: 0.7, noVertexColor: true });
  await buildFaceAtlas(faceMat, faceSpec, c.patch.w * 1000, c.patch.h * 1000);

  const rig = c.rig;
  for (const b of REQUIRED_BONES) rig.i(b);
  const glb = new GlbBuilder();
  const nodes = rig.bones.map((b) => glb.doc.createNode(b.name));
  rig.bones.forEach((b, k) => {
    const par = b.parent >= 0 ? rig.bones[b.parent]!.pos : null;
    nodes[k]!.setTranslation(par ? [b.pos.x - par.x, b.pos.y - par.y, b.pos.z - par.z] : [b.pos.x, b.pos.y, b.pos.z]);
    if (b.parent >= 0) nodes[b.parent]!.addChild(nodes[k]!); else glb.scene.addChild(nodes[k]!);
  });
  // verificação numérica: posição mundial das mãos na pose de bind (soma das translações locais)
  const world = (name: string): number[] => {
    let k = rig.i(name);
    const p = [0, 0, 0];
    while (k >= 0) { const t = nodes[k]!.getTranslation(); p[0]! += t[0]; p[1]! += t[1]; p[2]! += t[2]; k = rig.bones[k]!.parent; }
    return p.map(r4);
  };
  const handL = world('handL'), handR = world('handR');
  for (const [name, p, sg] of [['handL', handL, 1], ['handR', handR, -1]] as [string, number[], number][]) {
    const d = Math.hypot(p[0]! - sg * HAND_TARGET[0], p[1]! - HAND_TARGET[1], p[2]! - HAND_TARGET[2]);
    console.log(`  ${def.id}.${name} mundo = (${p.join(', ')})  erro = ${(d * 100).toFixed(2)} cm`);
    if (d > 0.03) throw new Error(`${def.id}: ${name} a ${(d * 100).toFixed(1)} cm do alvo do volante`);
  }

  const ibm = new Float32Array(rig.bones.length * 16);
  rig.bones.forEach((b, k) => ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -b.pos.x, -b.pos.y, -b.pos.z, 1], k * 16));
  const skin = glb.skin('skin', nodes, ibm, nodes[0]);
  glb.node('body', { mesh: glb.mesh('body', c.body), skin });
  glb.node('face', { mesh: glb.mesh('face', c.face), skin });

  const hipsI = rig.i('hips');
  for (const clip of CLIPS) {
    const s = sampleClip(rig, c.chains, clip);
    const channels: Channel[] = [];
    const push = (node: number, p: 'rotation' | 'translation', values: number[], size: number): void => {
      let constant = true;
      for (let i = size; i < values.length && constant; i++) if (Math.abs(values[i]! - values[i % size]!) > 1e-6) constant = false;
      if (values.some((v) => !Number.isFinite(v))) throw new Error(`${def.id}/${clip.name}: valor inválido em ${rig.bones[node]!.name}.${p}`);
      if (constant) channels.push({ node: nodes[node]!, path: p, times: [0, s.dur], values: [...values.slice(0, size), ...values.slice(0, size)] });
      else channels.push({ node: nodes[node]!, path: p, times: s.times, values });
    };
    rig.bones.forEach((_b, k) => { if (k > 0) push(k, 'rotation', s.rot[k]!, 4); });
    push(hipsI, 'translation', s.hips, 3);
    glb.animation(clip.name, channels);
  }

  const file = path.join(outDir, `${def.id}.glb`);
  const triangles = c.body.triangleCount() + c.face.triangleCount();
  const bytes = await glb.save(file);
  const req = new Set<string>(REQUIRED_BONES);
  let top = 0;
  for (const part of c.face.parts) { part.geo.computeBoundingBox(); top = Math.max(top, part.geo.boundingBox!.max.y); }
  return {
    id: def.id, file: `assets/characters/${def.id}.glb`, bytes, triangles, bones: rig.bones.length,
    extraBones: rig.bones.map((b) => b.name).filter((n) => !req.has(n)), handL, handR, seatedHeight: r4(c.headTop || top),
    facePatch: { widthM: r4(c.patch.w), heightM: r4(c.patch.h) },
    clips: CLIPS.map((cl) => ({ name: cl.name, duration: cl.dur, loop: cl.loop })),
  };
}
