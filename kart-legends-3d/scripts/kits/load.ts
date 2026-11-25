/**
 * Leitura dos modelos de terceiros (somente leitura/conversão; nada dos pacotes é executado).
 * Saída: triângulos soltos em metros, com normal, cor de vértice linear e, nas folhas, UV do atlas.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO, type Primitive } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp, { type OverlayOptions } from 'sharp';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ATLAS_COLS, ATLAS_ROWS, ATLAS_SIZE, FOLIAGE_ATLAS, QUATERNIUS_TEXTURES, type KitModel } from './catalog';

export interface KitGeometry {
  solid: THREE.BufferGeometry | null;
  foliage: THREE.BufferGeometry | null;
}

interface Raster { w: number; h: number; data: Buffer }
const rasters = new Map<string, Promise<Raster>>();
function raster(key: string, src: () => Promise<Buffer | Uint8Array>): Promise<Raster> {
  let r = rasters.get(key);
  if (!r) {
    r = src().then(async (buf) => {
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { w: info.width, h: info.height, data };
    });
    rasters.set(key, r);
  }
  return r;
}

const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Cor média (linear) de uma pequena área da textura em (u, v), com repetição. */
function sample(r: Raster, u: number, v: number, flipV: boolean): [number, number, number] {
  u -= Math.floor(u); v -= Math.floor(v);
  if (flipV) v = 1 - v;
  const cx = Math.floor(u * r.w), cy = Math.floor(v * r.h);
  const acc = [0, 0, 0]; let n = 0;
  const rad = Math.max(1, Math.round(r.w / 128));
  for (let dy = -rad; dy <= rad; dy += rad) for (let dx = -rad; dx <= rad; dx += rad) {
    const x = Math.min(r.w - 1, Math.max(0, cx + dx)), y = Math.min(r.h - 1, Math.max(0, cy + dy));
    const k = (y * r.w + x) * 4;
    if (r.data[k + 3]! < 128) continue;
    for (let c = 0; c < 3; c++) acc[c]! += srgbToLinear(r.data[k + c]! / 255);
    n++;
  }
  return n ? [acc[0]! / n, acc[1]! / n, acc[2]! / n] : [0.5, 0.5, 0.5];
}

class TriSoup {
  pos: number[] = []; nor: number[] = []; col: number[] = []; uv: number[] = [];
  push(p: THREE.Vector3[], n: THREE.Vector3[], c: [number, number, number], uv?: [number, number][]): void {
    for (let k = 0; k < 3; k++) {
      this.pos.push(p[k]!.x, p[k]!.y, p[k]!.z);
      this.nor.push(n[k]!.x, n[k]!.y, n[k]!.z);
      this.col.push(c[0], c[1], c[2]);
      const t = uv?.[k] ?? [0, 0];
      this.uv.push(t[0], t[1]);
    }
  }
  geometry(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

/** Base no chão (y=0); opcionalmente centralizada em x/z. */
function ground(geos: (THREE.BufferGeometry | null)[], center: boolean): void {
  const box = new THREE.Box3();
  for (const g of geos) if (g) { g.computeBoundingBox(); box.union(g.boundingBox!); }
  const c = box.getCenter(new THREE.Vector3());
  for (const g of geos) g?.translate(center ? -c.x : 0, -box.min.y, center ? -c.z : 0);
}

/** Kenney (glTF/GLB): material com cor sólida, ou paleta `colormap.png` amostrada no centro de cada face. */
export async function loadKenney(file: string, m: KitModel): Promise<KitGeometry> {
  const io = new NodeIO();
  const doc = await io.read(file);
  const soup = new TriSoup();
  const scale = new THREE.Matrix4().makeScale(m.scale, m.scale, m.scale);
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const world = new THREE.Matrix4().fromArray(node.getWorldMatrix()).premultiply(scale);
    const nmat = new THREE.Matrix3().getNormalMatrix(world);
    for (const prim of mesh.listPrimitives()) await primitive(prim, world, nmat, soup, file);
  }
  let solid = soup.geometry();
  if (solid && m.simplify) solid = simplify(solid, m.simplify, true);
  if (solid && m.stack) solid = stack(solid, m.stack);
  ground([solid], !!m.center);
  return { solid, foliage: null };
}

async function primitive(prim: Primitive, world: THREE.Matrix4, nmat: THREE.Matrix3, soup: TriSoup, file: string): Promise<void> {
  const mat = prim.getMaterial();
  const f = mat?.getBaseColorFactor() ?? [1, 1, 1, 1];
  const tex = mat?.getBaseColorTexture();
  const img = tex?.getImage();
  const r = img ? await raster(`${file}#${tex!.getName() || tex!.getURI()}`, async () => img) : null;
  const pos = prim.getAttribute('POSITION')!, nor = prim.getAttribute('NORMAL'), uv = prim.getAttribute('TEXCOORD_0');
  const idx = prim.getIndices();
  const count = idx ? idx.getCount() : pos.getCount();
  const at = (k: number): number => (idx ? idx.getScalar(k) : k);
  const v = (i: number): THREE.Vector3 => new THREE.Vector3().fromArray(pos.getElement(i, [])).applyMatrix4(world);
  const n = (i: number): THREE.Vector3 => (nor ? new THREE.Vector3().fromArray(nor.getElement(i, [])).applyMatrix3(nmat).normalize() : new THREE.Vector3(0, 1, 0));
  for (let k = 0; k < count; k += 3) {
    const ids = [at(k), at(k + 1), at(k + 2)];
    let c: [number, number, number] = [f[0]!, f[1]!, f[2]!];
    if (r && uv) {
      const t = ids.map((i) => uv.getElement(i, []));
      const s = sample(r, (t[0]![0]! + t[1]![0]! + t[2]![0]!) / 3, (t[0]![1]! + t[1]![1]! + t[2]![1]!) / 3, false);
      c = [c[0] * s[0], c[1] * s[1], c[2] * s[2]];
    }
    soup.push(ids.map(v), ids.map(n), c);
  }
}

/** Pilha de N cópias deitadas (pneus), cada uma levemente girada. */
function stack(g: THREE.BufferGeometry, count: number): THREE.BufferGeometry {
  g.rotateZ(Math.PI / 2);
  g.computeBoundingBox();
  const h = g.boundingBox!.max.y - g.boundingBox!.min.y;
  g.translate(0, -g.boundingBox!.min.y, 0);
  const parts = Array.from({ length: count }, (_, k) => g.clone().rotateY(k * 0.7).translate(Math.sin(k * 2.1) * 0.05, k * h * 0.98, Math.cos(k * 1.7) * 0.05));
  return mergeGeometries(parts)!;
}

/** Simplifica uma malha de triângulos soltos (soldando antes) mantendo a fração pedida. */
function simplify(g: THREE.BufferGeometry, ratio: number, keepColors = false): THREE.BufferGeometry {
  // solda por posição para o simplificador enxergar a topologia
  const pos = g.getAttribute('position').array as Float32Array;
  const col = g.getAttribute('color').array as Float32Array;
  const key = new Map<string, number>();
  const vp: number[] = [], vc: number[] = [], index: number[] = [];
  for (let i = 0; i < pos.length / 3; i++) {
    // keepColors: cada cor é uma ilha (bordas travadas) — preserva vidros, faixas e rodas da paleta
    const k = `${pos[i * 3]!.toFixed(4)},${pos[i * 3 + 1]!.toFixed(4)},${pos[i * 3 + 2]!.toFixed(4)}${keepColors ? `|${col[i * 3]!.toFixed(3)},${col[i * 3 + 1]!.toFixed(3)},${col[i * 3 + 2]!.toFixed(3)}` : ''}`;
    let id = key.get(k);
    if (id === undefined) { id = vp.length / 3; key.set(k, id); vp.push(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!); vc.push(col[i * 3]!, col[i * 3 + 1]!, col[i * 3 + 2]!); }
    index.push(id);
  }
  const target = Math.max(3, Math.floor((index.length * ratio) / 3) * 3);
  const [out] = MeshoptSimplifier.simplify(new Uint32Array(index), new Float32Array(vp), 3, target, 0.05, ['LockBorder']);
  const s = new THREE.BufferGeometry();
  s.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
  s.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3));
  s.setIndex(Array.from(out));
  const flat = s.toNonIndexed();
  flat.computeVertexNormals();
  // normais suavizadas por posição (casca arredondada) em vez de facetadas
  const sp = flat.getAttribute('position').array as Float32Array;
  const sum = new Map<string, THREE.Vector3>();
  const fn = flat.getAttribute('normal').array as Float32Array;
  const sc = flat.getAttribute('color').array as Float32Array;
  const kOf = (i: number): string => `${sp[i * 3]!.toFixed(4)},${sp[i * 3 + 1]!.toFixed(4)},${sp[i * 3 + 2]!.toFixed(4)}${keepColors ? `|${sc[i * 3]!.toFixed(3)}` : ''}`;
  for (let i = 0; i < sp.length / 3; i++) { const k = kOf(i); (sum.get(k) ?? sum.set(k, new THREE.Vector3()).get(k)!).add(new THREE.Vector3(fn[i * 3], fn[i * 3 + 1], fn[i * 3 + 2])); }
  for (let i = 0; i < sp.length / 3; i++) { const s0 = sum.get(kOf(i))!; const n = s0.lengthSq() > 1e-12 ? s0.clone().normalize() : new THREE.Vector3(0, 1, 0); fn[i * 3] = n.x; fn[i * 3 + 1] = n.y; fn[i * 3 + 2] = n.z; }
  flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((sp.length / 3) * 2), 2));
  return flat;
}

/** Quaternius (OBJ+MTL): casca/pedra viram cor de vértice; folhas e flores ganham UV no atlas de folhagem. */
export async function loadQuaternius(dir: string, m: KitModel): Promise<KitGeometry> {
  const text = await readFile(path.join(dir, 'obj', `${m.file}.obj`), 'utf8');
  const root = new OBJLoader().parse(text);
  const solid = new TriSoup(), foliage = new TriSoup();
  const pad = 3 / ATLAS_SIZE;
  const tmpN = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const mesh of meshes) {
    const g = mesh.geometry as THREE.BufferGeometry;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.getAttribute('position').count, materialIndex: 0 }];
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = g.getAttribute('uv');
    for (const grp of groups) {
      const name = mats[grp.materialIndex ?? 0]!.name;
      const src = QUATERNIUS_TEXTURES[name];
      if (!src) throw new Error(`${m.file}: material sem textura mapeada: ${name}`);
      const r = await raster(src.file, () => readFile(path.join(dir, 'textures_unnamed', src.file)));
      for (let k = grp.start; k < grp.start + grp.count; k += 3) {
        const pts = [0, 1, 2].map((d) => new THREE.Vector3(p.getX(k + d), p.getY(k + d), p.getZ(k + d)).multiplyScalar(m.scale));
        const ns = [0, 1, 2].map((d) => tmpN[d]!.set(n.getX(k + d), n.getY(k + d), n.getZ(k + d)).clone());
        const uvs = [0, 1, 2].map((d) => [uv.getX(k + d), uv.getY(k + d)] as [number, number]);
        if (src.kind === 'bake') {
          const c = sample(r, (uvs[0]![0] + uvs[1]![0] + uvs[2]![0]) / 3, (uvs[0]![1] + uvs[1]![1] + uvs[2]![1]) / 3, true);
          solid.push(pts, ns, c);
        } else {
          const [cx, cy] = FOLIAGE_ATLAS[name]!;
          const cw = 1 / ATLAS_COLS, ch = 1 / ATLAS_ROWS;
          // UV do atlas na convenção do glTF (v = 0 no topo da imagem); o OBJ tem v = 0 embaixo
          const map = (t: [number, number]): [number, number] => {
            const u = Math.min(1, Math.max(0, t[0])), v = Math.min(1, Math.max(0, t[1]));
            return [cx * cw + pad + u * (cw - 2 * pad), cy * ch + pad + (1 - v) * (ch - 2 * pad)];
          };
          foliage.push(pts, ns, [1, 1, 1], uvs.map(map));
        }
      }
    }
  }
  let s = solid.geometry();
  if (s && m.simplify) s = simplify(s, m.simplify);
  const f = foliage.geometry();
  if (f) sphericalNormals(f);
  ground([s, f], true);
  return { solid: s, foliage: f };
}

/**
 * Folhagem: normais apontando para fora da copa (centro da caixa, um pouco abaixo) e levemente para cima.
 * Os cartões de folha ficam iluminados como um volume só, sem o "xadrez" claro/escuro das faces avulsas.
 */
function sphericalNormals(g: THREE.BufferGeometry): void {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const c = b.getCenter(new THREE.Vector3());
  c.y -= (b.max.y - b.min.y) * 0.15;
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i) - c.x, (p.getY(i) - c.y) * 0.8, p.getZ(i) - c.z).normalize();
    v.y += 0.35;
    v.normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
}

/** Atlas de folhagem 512×512 (WebP com alfa) a partir das texturas de folhas e flores. */
export async function foliageAtlas(dir: string): Promise<Buffer> {
  const cw = Math.floor(ATLAS_SIZE / ATLAS_COLS), ch = Math.floor(ATLAS_SIZE / ATLAS_ROWS);
  const layers: OverlayOptions[] = [];
  for (const [name, [cx, cy]] of Object.entries(FOLIAGE_ATLAS)) {
    const file = path.join(dir, 'textures_unnamed', QUATERNIUS_TEXTURES[name]!.file);
    const x0 = Math.round(cx * (ATLAS_SIZE / ATLAS_COLS)), y0 = Math.round(cy * (ATLAS_SIZE / ATLAS_ROWS));
    const w = (cx === ATLAS_COLS - 1 ? ATLAS_SIZE - x0 : cw), h = ch;
    const img = await sharp(file).ensureAlpha().resize(w, h, { fit: 'fill' }).png().toBuffer();
    layers.push({ input: img, left: x0, top: y0 });
  }
  const base = sharp({ create: { width: ATLAS_SIZE, height: ATLAS_SIZE, channels: 4, background: { r: 60, g: 90, b: 40, alpha: 0 } } });
  return base.composite(layers).webp({ quality: 85, alphaQuality: 90 }).toBuffer();
}
