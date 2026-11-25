/**
 * Rodas da loja (pneu + aro) que servem em QUALQUER kart.
 *
 * Contrato dos assets (`public/assets/tires/<id>.glb`, gerados por `scripts/build-tires.ts`):
 * um nó de malha `tire`, modelado para o lado ESQUERDO (face externa em +X), centrado na origem,
 * eixo em X, com tamanho normalizado: raio externo 1 e largura total 1.
 *
 * Uso no KartModel (as rodas já reparentadas nos pivôs):
 *
 *     applyTires(this.wheels, tireGltf);   // equipa
 *     applyTires(this.wheels, null);       // volta às rodas originais do kart
 *
 * `wheels` são os objetos que o KartModel guarda em `Wheel.mesh` — os nós `wheel_fl|fr|rl|rr` do GLB do kart.
 * Também aceita a cena do kart (antes ou depois do KartModel): os nós são procurados pelo nome.
 *
 * Para cada nó de roda: as malhas originais (o filho `wheel_<k>_mesh`) ficam ocultas — nunca removidas — e um
 * clone do pneu é adicionado como filho, escalado para o tamanho da roda original (raio pela extensão em Y/Z,
 * largura pela extensão em X, medidas no espaço do próprio nó de roda) e girado 180° em Y nas rodas do lado
 * direito, exatamente como o `flipY` de `scripts/karts/assemble.ts`, para a face externa ficar para fora.
 * Como o pneu é filho do nó de roda, ele gira e esterça junto com ele, sem mudança no `update` do KartModel.
 * É idempotente: chamar de novo troca o pneu anterior. Clones compartilham geometria e material do GLTF
 * (não descarte o GLTF enquanto houver karts usando o pneu; o cache do loader já cuida disso).
 */
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

export const TIRE_IDS = ['offroad', 'slick', 'raios', 'neon', 'estrela', 'neve', 'flor'] as const;
export type TireId = (typeof TIRE_IDS)[number];

export const TIRE_NAMES: Record<TireId, string> = {
  offroad: 'Garra Off-road',
  slick: 'Slick de Corrida',
  raios: 'Raios Dourados',
  neon: 'Neon Turbo',
  estrela: 'Estrela',
  neve: 'Corrente de Neve',
  flor: 'Pétala',
};

/** Caminhos dentro de `public/assets` (use com `assetUrl`). */
export const tireModelPath = (id: TireId): string => `tires/${id}.glb`;
export const tireIconPath = (id: TireId): string => `ui/tires/${id}.webp`;

export const WHEEL_NODE_NAMES = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'] as const;
/** Nome do objeto que carrega o pneu dentro do nó de roda. */
export const TIRE_OBJECT_NAME = 'shop_tire';

/** Medidas da roda original, no espaço do nó de roda. */
export interface WheelSize {
  radius: number;
  width: number;
  /** centro em X (as rodas giram em torno do eixo X do nó) */
  centerX: number;
  /** a malha original está girada 180° em Y (roda do lado direito) */
  flipped: boolean;
}

interface WheelState { originals: THREE.Object3D[]; size: WheelSize; current: THREE.Object3D | null }
const states = new WeakMap<THREE.Object3D, WheelState>();
const templates = new WeakMap<object, THREE.Object3D>();

const tmpBox = new THREE.Box3();
const tmpM = new THREE.Matrix4();
const tmpInv = new THREE.Matrix4();
const tmpV = new THREE.Vector3();

/** Caixa das malhas de `roots` no espaço local de `frame`. */
function boxIn(frame: THREE.Object3D, roots: THREE.Object3D[]): { box: THREE.Box3; flipped: boolean } {
  frame.updateWorldMatrix(true, true);
  tmpInv.copy(frame.matrixWorld).invert();
  const box = new THREE.Box3();
  let flipped: boolean | null = null;
  for (const root of roots) {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      tmpM.multiplyMatrices(tmpInv, mesh.matrixWorld);
      box.union(tmpBox.copy(mesh.geometry.boundingBox!).applyMatrix4(tmpM));
      if (flipped === null) flipped = tmpV.set(1, 0, 0).transformDirection(tmpM).x < 0;
    });
  }
  return { box, flipped: flipped ?? false };
}

/** Mede a roda original (o que o pneu novo deve ocupar). */
export function measureWheel(wheel: THREE.Object3D, originals: THREE.Object3D[] = wheel.children.slice()): WheelSize {
  const { box, flipped } = boxIn(wheel, originals);
  if (box.isEmpty()) return { radius: 0.3, width: 0.2, centerX: 0, flipped: false };
  const s = box.getSize(new THREE.Vector3());
  return { radius: Math.max(s.y, s.z) / 2, width: s.x, centerX: (box.min.x + box.max.x) / 2, flipped };
}

/** Objeto do pneu normalizado (centro em x = 0, largura 1, raio 1), criado uma vez por GLTF. */
function tireTemplate(tire: GLTF): THREE.Object3D {
  let t = templates.get(tire);
  if (t) return t;
  const src = tire.scene.getObjectByName('tire') ?? tire.scene;
  // o clone mantém a transformação de dequantização da malha (meshopt); as medidas reais são conferidas abaixo
  const inner = src.clone();
  t = new THREE.Group();
  t.add(inner);
  const { box } = boxIn(t, [inner]);
  const s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.y, s.z) / 2 || 1, w = s.x || 1;
  inner.position.x -= (box.min.x + box.max.x) / 2;
  inner.position.y -= (box.min.y + box.max.y) / 2;
  inner.position.z -= (box.min.z + box.max.z) / 2;
  inner.position.multiply(tmpV.set(1 / w, 1 / r, 1 / r));
  inner.scale.multiply(tmpV.set(1 / w, 1 / r, 1 / r));
  templates.set(tire, t);
  return t;
}

function wheelsOf(target: readonly { mesh: THREE.Object3D }[] | THREE.Object3D): THREE.Object3D[] {
  if (Array.isArray(target)) return (target as readonly { mesh: THREE.Object3D }[]).map((w) => w.mesh);
  const root = target as THREE.Object3D;
  return WHEEL_NODE_NAMES.map((n) => root.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o);
}

/**
 * Equipa o pneu `tire` (ou restaura as rodas originais com `null`).
 * @param wheels as rodas do KartModel (`{ mesh }[]`, onde `mesh` é o nó `wheel_<k>`) ou a cena do kart.
 */
export function applyTires(wheels: readonly { mesh: THREE.Object3D }[] | THREE.Object3D, tire: GLTF | null): void {
  for (const wheel of wheelsOf(wheels)) {
    let st = states.get(wheel);
    if (!st) {
      const originals = wheel.children.filter((c) => c.name !== TIRE_OBJECT_NAME);
      st = { originals, size: measureWheel(wheel, originals), current: null };
      states.set(wheel, st);
    }
    if (st.current) { wheel.remove(st.current); st.current = null; }
    for (const o of st.originals) o.visible = !tire;
    if (!tire) continue;
    const holder = new THREE.Group();
    holder.name = TIRE_OBJECT_NAME;
    holder.position.set(st.size.centerX, 0, 0);
    if (st.size.flipped) holder.rotation.y = Math.PI;
    holder.scale.set(st.size.width, st.size.radius, st.size.radius);
    const clone = tireTemplate(tire).clone();
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.frustumCulled = true; }
    });
    holder.add(clone);
    wheel.add(holder);
    st.current = holder;
  }
}

/** Medidas usadas para a roda (após a primeira chamada de `applyTires`); útil para testes/ferramentas. */
export function tireFitOf(wheel: THREE.Object3D): WheelSize | null {
  return states.get(wheel)?.size ?? null;
}
