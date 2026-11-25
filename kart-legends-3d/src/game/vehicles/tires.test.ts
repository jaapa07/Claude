import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { describe, expect, it } from 'vitest';
import { TIRE_IDS, TIRE_NAMES, TIRE_OBJECT_NAME, applyTires, tireFitOf } from './tires';

/** Roda falsa como a do GLB do kart: nó `wheel_<k>` com o filho `wheel_<k>_mesh` (girado 180° em Y à direita). */
function fakeWheel(key: string, radius: number, width: number, right: boolean): THREE.Object3D {
  const node = new THREE.Group();
  node.name = `wheel_${key}`;
  const geo = new THREE.CylinderGeometry(radius, radius, width, 12).rotateZ(Math.PI / 2);
  geo.translate(0.01, 0, 0); // assimetria: face externa um pouco saltada
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  mesh.name = `wheel_${key}_mesh`;
  if (right) mesh.rotation.y = Math.PI;
  node.add(mesh);
  node.position.set(right ? -0.6 : 0.6, radius, 0.8);
  return node;
}

/** Pneu falso no contrato: nó `tire` de raio 1 e largura 1, com uma marca na face externa (+X). */
function fakeTire(): GLTF {
  const scene = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial());
  tire.name = 'tire';
  scene.add(tire);
  return { scene } as unknown as GLTF;
}

const sizeIn = (frame: THREE.Object3D, obj: THREE.Object3D): THREE.Box3 => {
  frame.updateWorldMatrix(true, true);
  const inv = frame.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld)));
  });
  return box;
};

describe('applyTires', () => {
  it('lista os 7 pneus com nome', () => {
    expect(TIRE_IDS).toHaveLength(7);
    for (const id of TIRE_IDS) expect(TIRE_NAMES[id]).toBeTruthy();
  });

  it('escala o pneu para o tamanho de cada roda original e espelha o lado direito', () => {
    const kart = new THREE.Group();
    const wheels = [fakeWheel('fl', 0.27, 0.16, false), fakeWheel('fr', 0.27, 0.16, true), fakeWheel('rl', 0.36, 0.36, false), fakeWheel('rr', 0.36, 0.36, true)];
    kart.add(...wheels);
    applyTires(wheels.map((mesh) => ({ mesh })), fakeTire());
    for (const w of wheels) {
      const orig = w.getObjectByName(`${w.name}_mesh`)!;
      const tire = w.getObjectByName(TIRE_OBJECT_NAME)!;
      expect(orig.visible).toBe(false);
      expect(tire).toBeTruthy();
      const a = sizeIn(w, orig), b = sizeIn(w, tire);
      for (const k of ['x', 'y', 'z'] as const) {
        expect(b.min[k]).toBeCloseTo(a.min[k], 5);
        expect(b.max[k]).toBeCloseTo(a.max[k], 5);
      }
      const fit = tireFitOf(w)!;
      expect(fit.flipped).toBe(w.name.endsWith('r'));
      // face externa (+X do pneu) aponta para fora: +X à esquerda, −X à direita
      const out = new THREE.Vector3(1, 0, 0).transformDirection(tire.matrix);
      expect(Math.sign(out.x)).toBe(w.name.endsWith('r') ? -1 : 1);
    }
    expect(tireFitOf(wheels[2]!)!.radius).toBeCloseTo(0.36, 5);
    expect(tireFitOf(wheels[0]!)!.width).toBeCloseTo(0.16, 5);
  });

  it('é idempotente e `null` restaura as rodas originais', () => {
    const kart = new THREE.Group();
    const wheels = ['fl', 'fr', 'rl', 'rr'].map((k) => fakeWheel(k, 0.3, 0.2, k.endsWith('r')));
    kart.add(...wheels);
    const tire = fakeTire();
    applyTires(kart, tire);
    applyTires(kart, tire);
    applyTires(kart, fakeTire());
    for (const w of wheels) {
      expect(w.children.filter((c) => c.name === TIRE_OBJECT_NAME)).toHaveLength(1);
      expect(w.children).toHaveLength(2);
    }
    applyTires(kart, null);
    for (const w of wheels) {
      expect(w.children).toHaveLength(1);
      expect(w.children[0]!.visible).toBe(true);
    }
    // e pode equipar de novo depois de restaurar
    applyTires(kart, tire);
    for (const w of wheels) expect(w.getObjectByName(TIRE_OBJECT_NAME)?.parent).toBe(w);
  });

  it('o clone compartilha geometria e material do GLTF', () => {
    const w = fakeWheel('fl', 0.3, 0.2, false);
    const tire = fakeTire();
    applyTires([{ mesh: w }], tire);
    let mesh: THREE.Mesh | null = null;
    w.getObjectByName(TIRE_OBJECT_NAME)!.traverse((o) => { if ((o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
    const src = tire.scene.getObjectByName('tire') as THREE.Mesh;
    expect(mesh!.geometry).toBe(src.geometry);
    expect(mesh!.material).toBe(src.material);
  });
});
