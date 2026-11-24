/** Exportação GLB (glTF 2.0) com skins, animações, texturas WebP e compressão meshopt. */
import { Document, Logger, NodeIO, type Material, type Mesh, type Node, type Skin, type Texture } from '@gltf-transform/core';
import { EXTMeshoptCompression, EXTTextureWebP, KHRMaterialsEmissiveStrength, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { MATERIALS } from './materials';
import { getTexture } from './textures';
import type { Model, V3 } from './geo';

export type Quat = [number, number, number, number];
export interface NodeOpts { t?: V3; r?: Quat; s?: V3; parent?: Node; mesh?: Mesh; skin?: Skin }
export interface Channel { node: Node; path: 'translation' | 'rotation' | 'scale'; times: number[]; values: number[]; step?: boolean }

export async function createIO(): Promise<NodeIO> {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  return new NodeIO()
    .registerExtensions([EXTMeshoptCompression, EXTTextureWebP, KHRMaterialsEmissiveStrength, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
}

export class GlbBuilder {
  readonly doc = new Document();
  private readonly buffer = this.doc.createBuffer();
  readonly scene = this.doc.createScene('scene');
  private readonly mats = new Map<string, Material>();
  private readonly texs = new Map<string, Texture>();

  constructor(generator = 'Kart Legends 3D asset pipeline') {
    this.doc.setLogger(new Logger(Logger.Verbosity.SILENT));
    this.doc.getRoot().getAsset().generator = generator;
    this.doc.getRoot().getAsset().copyright = 'Equipe Kart Legends 3D — asset original do projeto';
  }

  private texture(name: string): Texture {
    let t = this.texs.get(name);
    if (!t) {
      this.doc.createExtension(EXTTextureWebP).setRequired(true);
      t = this.doc.createTexture(name).setImage(getTexture(name)).setMimeType('image/webp');
      this.texs.set(name, t);
    }
    return t;
  }

  material(name: string): Material {
    let m = this.mats.get(name);
    if (m) return m;
    const def = MATERIALS[name];
    if (!def) throw new Error(`Material desconhecido: ${name}`);
    const c = def.color ?? [1, 1, 1];
    m = this.doc.createMaterial(name)
      .setBaseColorFactor([c[0], c[1], c[2], def.alpha ?? 1])
      .setRoughnessFactor(def.roughness ?? 0.8)
      .setMetallicFactor(def.metalness ?? 0)
      .setDoubleSided(!!def.doubleSided);
    if (def.alpha !== undefined && def.alpha < 1) m.setAlphaMode('BLEND');
    if (def.emissive) {
      m.setEmissiveFactor(def.emissive);
      if (def.emissiveStrength && def.emissiveStrength !== 1) {
        const ext = this.doc.createExtension(KHRMaterialsEmissiveStrength);
        m.setExtension('KHR_materials_emissive_strength', ext.createEmissiveStrength().setEmissiveStrength(def.emissiveStrength));
      }
    }
    if (def.map) m.setBaseColorTexture(this.texture(def.map));
    if (def.emissiveMap) m.setEmissiveTexture(this.texture(def.emissiveMap));
    this.mats.set(name, m);
    return m;
  }

  /** Cria uma malha (uma primitiva por material) a partir de um Model. */
  mesh(name: string, model: Model, weld = true): Mesh {
    const mesh = this.doc.createMesh(name);
    for (const [matName, geo] of model.merged(weld)) {
      const prim = this.doc.createPrimitive().setMaterial(this.material(matName));
      const acc = (type: 'VEC2' | 'VEC3' | 'VEC4', arr: Float32Array | Uint16Array | Uint32Array) =>
        this.doc.createAccessor().setType(type).setArray(arr).setBuffer(this.buffer);
      prim.setAttribute('POSITION', acc('VEC3', new Float32Array(geo.getAttribute('position').array)));
      prim.setAttribute('NORMAL', acc('VEC3', new Float32Array(geo.getAttribute('normal').array)));
      prim.setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(geo.getAttribute('uv').array)));
      if (!MATERIALS[matName]?.noVertexColor) prim.setAttribute('COLOR_0', acc('VEC3', new Float32Array(geo.getAttribute('color').array)));
      const si = geo.getAttribute('skinIndex');
      const sw = geo.getAttribute('skinWeight');
      if (si && sw) {
        prim.setAttribute('JOINTS_0', acc('VEC4', new Uint16Array(si.array)));
        prim.setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array(sw.array)));
      }
      if (geo.index) {
        const count = geo.getAttribute('position').count;
        const idx = count > 65535 ? new Uint32Array(geo.index.array) : new Uint16Array(geo.index.array);
        prim.setIndices(this.doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(this.buffer));
      }
      mesh.addPrimitive(prim);
    }
    return mesh;
  }

  node(name: string, opts: NodeOpts = {}): Node {
    const n = this.doc.createNode(name);
    if (opts.t) n.setTranslation(opts.t);
    if (opts.r) n.setRotation(opts.r);
    if (opts.s) n.setScale(opts.s);
    if (opts.mesh) n.setMesh(opts.mesh);
    if (opts.skin) n.setSkin(opts.skin);
    if (opts.parent) opts.parent.addChild(n); else this.scene.addChild(n);
    return n;
  }

  /** Cria um skin. `inverseBind` = 16 floats por junta (column-major). */
  skin(name: string, joints: Node[], inverseBind: Float32Array, skeleton?: Node): Skin {
    const s = this.doc.createSkin(name);
    for (const j of joints) s.addJoint(j);
    s.setInverseBindMatrices(this.doc.createAccessor().setType('MAT4').setArray(inverseBind).setBuffer(this.buffer));
    if (skeleton) s.setSkeleton(skeleton);
    return s;
  }

  animation(name: string, channels: Channel[]): void {
    const anim = this.doc.createAnimation(name);
    for (const ch of channels) {
      const input = this.doc.createAccessor().setType('SCALAR').setArray(new Float32Array(ch.times)).setBuffer(this.buffer);
      const output = this.doc.createAccessor().setType(ch.path === 'rotation' ? 'VEC4' : 'VEC3')
        .setArray(new Float32Array(ch.values)).setBuffer(this.buffer);
      const sampler = this.doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(ch.step ? 'STEP' : 'LINEAR');
      anim.addSampler(sampler);
      anim.addChannel(this.doc.createAnimationChannel().setSampler(sampler).setTargetNode(ch.node).setTargetPath(ch.path));
    }
  }

  /** Grava o GLB (com dedup/prune e compressão meshopt) e devolve o tamanho em bytes. */
  async save(file: string, compress = true): Promise<number> {
    const io = await createIO();
    await this.doc.transform(dedup(), prune({ keepLeaves: true, keepAttributes: true }));
    if (compress) await this.doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await mkdir(path.dirname(file), { recursive: true });
    await io.write(file, this.doc);
    return (await stat(file)).size;
  }
}
