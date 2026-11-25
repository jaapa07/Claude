import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { suspend } from 'suspend-react';
import { assetUrl } from '@/game/core/assets';
import { useModels } from '../assets';

/** Formato de tracks/<id>.dress.json e arenas/<id>.dress.json (gerado por scripts/build-dressing.ts). */
export interface DressData {
  version: 1;
  models: string[];
  tints: string[];
  /** 8 números por objeto: modelo, x, y, z, rotY, escala, camada, tinta (−1 = sem). */
  items: number[];
}

const KITS = { kenney: 'kits/kenney-scenery.glb', quaternius: 'kits/quaternius-nature.glb' } as const;
/** Lado (m) dos blocos em que a decoração é fundida: um bloco = no máximo 2 chamadas de desenho. */
const CHUNK = 110;

const cache = new Map<string, Promise<DressData | null>>();
function loadDress(path: string): Promise<DressData | null> {
  let p = cache.get(path);
  if (!p) {
    // sem decoração para a pista (arquivo ausente) = nada a desenhar
    p = fetch(assetUrl(path)).then((r) => (r.ok ? r.json() as Promise<DressData> : null)).catch(() => null);
    cache.set(path, p);
  }
  return p;
}

/** Atributo em Float32 (as malhas vêm quantizadas: inteiros normalizados). */
function toFloat(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, size = a.itemSize): THREE.BufferAttribute {
  const out = new Float32Array(a.count * size);
  for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) out[i * size + c] = a.getComponent(i, c);
  return new THREE.BufferAttribute(out, size);
}

interface Part { geo: THREE.BufferGeometry; foliage: boolean }

/** Peças (em espaço do modelo, Float32) de cada nó dos GLB dos kits, separadas em sólido e folhagem. */
function partsOf(root: THREE.Object3D): Map<string, Part[]> {
  const out = new Map<string, Part[]>();
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (const node of root.children) {
    const list: Part[] = [];
    node.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.geometry;
      const g = new THREE.BufferGeometry();
      const foliage = !!(mesh.material as THREE.MeshStandardMaterial).map;
      g.setAttribute('position', toFloat(src.getAttribute('position')));
      const normal = toFloat(src.getAttribute('normal'));
      // normal nula vira NaN no shader (e o bloom espalha o NaN pela tela): troca por "para cima"
      for (let i = 0; i < normal.count; i++) if (Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) < 0.5) normal.setXYZ(i, 0, 1, 0);
      g.setAttribute('normal', normal);
      const color = src.getAttribute('color');
      g.setAttribute('color', color ? toFloat(color, 3) : new THREE.BufferAttribute(new Float32Array(src.getAttribute('position').count * 3).fill(1), 3));
      if (foliage) g.setAttribute('uv', toFloat(src.getAttribute('uv')));
      g.setIndex(src.index ? Array.from(src.index.array) : null);
      // a desquantização fica na matriz do nó (KHR_mesh_quantization)
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
      list.push({ geo: g, foliage });
    });
    out.set(node.name, list);
  }
  return out;
}

let shared: { solid: THREE.MeshStandardMaterial; foliage: THREE.MeshStandardMaterial } | null = null;
/** Dois materiais para toda a decoração (os mesmos em todas as pistas). */
function materials(foliageMap: THREE.Texture | null): { solid: THREE.MeshStandardMaterial; foliage: THREE.MeshStandardMaterial } {
  if (shared && shared.foliage.map === foliageMap) return shared;
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, envMapIntensity: 0.7 });
  const foliage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, map: foliageMap, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  // folhas com dois lados: as normais já apontam para fora da copa; não inverter no verso (sem "xadrez" escuro)
  foliage.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'); };
  foliage.customProgramCacheKey = () => 'kit-foliage';
  shared = { solid, foliage };
  return shared;
}

/**
 * Decoração extra com modelos CC0 (Kenney, Quaternius): só visual, sem colisão. Os objetos até a camada
 * `maxTier` da qualidade são fundidos por material em blocos de terreno (frustum culling por bloco).
 */
export function KitDressing({ file, maxTier, shadows }: { file: string; maxTier: number; shadows: boolean }): JSX.Element | null {
  const data = suspend(() => loadDress(file), ['kit-dress', file]);
  if (!data || maxTier < 0) return null;
  return <DressMeshes data={data} maxTier={maxTier} shadows={shadows} />;
}

function DressMeshes({ data, maxTier, shadows }: { data: DressData; maxTier: number; shadows: boolean }): JSX.Element {
  const needQ = data.models.some((m) => m.startsWith('quaternius:'));
  const gltfs = useModels(needQ ? [KITS.kenney, KITS.quaternius] : [KITS.kenney]);
  const group = useMemo(() => {
    const parts = new Map<string, Part[]>();
    let foliageMap: THREE.Texture | null = null;
    gltfs.forEach((g, k) => {
      const kit = k === 0 ? 'kenney' : 'quaternius';
      for (const [name, list] of partsOf(g.scene)) parts.set(`${kit}:${name}`, list);
      g.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.map) foliageMap = m.map; });
    });
    const mats = materials(foliageMap);
    const tints = data.tints.map((t) => new THREE.Color(t));
    const chunks = new Map<string, { solid: THREE.BufferGeometry[]; foliage: THREE.BufferGeometry[] }>();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const it = data.items;
    for (let k = 0; k < it.length; k += 8) {
      if (it[k + 6]! > maxTier) continue;
      const list = parts.get(data.models[it[k]!]!);
      if (!list) continue;
      const x = it[k + 1]!, y = it[k + 2]!, z = it[k + 3]!, s = it[k + 5]!;
      m.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, it[k + 4]!), new THREE.Vector3(s, s, s));
      const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
      let c = chunks.get(key);
      if (!c) { c = { solid: [], foliage: [] }; chunks.set(key, c); }
      const tint = it[k + 7]! >= 0 ? tints[it[k + 7]!] : undefined;
      for (const p of list) {
        const g = p.geo.clone().applyMatrix4(m);
        if (tint) {
          const col = g.getAttribute('color') as THREE.BufferAttribute;
          for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * tint.r, col.getY(i) * tint.g, col.getZ(i) * tint.b);
        }
        (p.foliage ? c.foliage : c.solid).push(g);
      }
    }
    const root = new THREE.Group();
    root.name = 'kit-dressing';
    for (const c of chunks.values()) {
      for (const [list, mat] of [[c.solid, mats.solid], [c.foliage, mats.foliage]] as const) {
        if (!list.length) continue;
        const merged = mergeGeometries(list, false);
        for (const g of list) g.dispose();
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = shadows;
        mesh.receiveShadow = shadows;
        mesh.matrixAutoUpdate = false;
        root.add(mesh);
      }
    }
    for (const list of parts.values()) for (const p of list) p.geo.dispose();
    return root;
  }, [gltfs, data, maxTier, shadows]);
  useEffect(() => () => { group.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); }); }, [group]);
  return <primitive object={group} />;
}
