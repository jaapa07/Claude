import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';
import { CharacterAnimator, type DriverMood } from '@/game/characters/characterAnimator';
import { flameById, metalById, neonById, paintById, type ColorRecipe, type Finish, type KartLook, type OutfitDef } from '@/data/customization';

/** Materiais recoloridos pela personalização. */
const OUTFIT_MATERIALS = ['cloth', 'chars_cloth_ds'];
const PAINT_MATERIALS = ['paint'];
const METAL_MATERIALS = ['kart_metal'];
const DEFAULT_FLAME = '#ffb347';

const tmpColor = new THREE.Color();
const tmpHsl = { h: 0, s: 0, l: 0 };

/** Aplica uma receita de cor a uma cor linear (in-place). */
export function applyRecipe(c: THREE.Color, r: ColorRecipe): THREE.Color {
  c.getHSL(tmpHsl);
  let { h, s, l } = tmpHsl;
  if (r.mode === 'shift') {
    h = (h + r.hue) % 1;
    s = Math.min(1, s * (r.sat ?? 1));
    l = Math.min(1, l * (r.light ?? 1));
  } else if (r.mode === 'set') {
    if (s < 0.12 && r.keepGrays !== false) return c;
    h = r.hue;
    s = r.sat;
    if (r.light) l = r.light[0] + (r.light[1] - r.light[0]) * l;
  } else {
    s *= 0.08;
    l = r.light[0] + (r.light[1] - r.light[0]) * l;
  }
  return c.setHSL(h, s, l);
}

/** Textura radial (centro claro, borda transparente) para o neon embaixo do kart. */
function glowTexture(): THREE.DataTexture {
  const n = 64, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1;
    const d = Math.min(1, Math.hypot(dx * 0.8, dy * 0.62));
    const a = Math.pow(1 - d, 1.6);
    const i = (y * n + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(a * 255);
  }
  const t = new THREE.DataTexture(data, n, n);
  t.needsUpdate = true;
  return t;
}

/** O que a camada visual precisa saber sobre um kart em um quadro. */
export interface KartVisualState {
  speed: number;
  steer: number;
  drifting: boolean;
  driftDir: number;
  driftLevel: number;
  /** 0..1 */
  boost: number;
  /** 0..1 (progresso do giro quando atingido). */
  spin: number;
  grounded: boolean;
  shield: boolean;
  invulnerable: boolean;
  /** 0..1 (pulinho de entrada no drift). */
  hop: number;
  mood: DriverMood['mood'];
}

const WHEELS = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'] as const;
const DRIFT_COLORS = [new THREE.Color('#ffffff'), new THREE.Color('#4fb6ff'), new THREE.Color('#ff9a2e'), new THREE.Color('#ff3fd2')];

interface Wheel { pivot: THREE.Group; mesh: THREE.Object3D; base: THREE.Quaternion; sign: number; radius: number; front: boolean; restY: number }

/**
 * Kart + piloto prontos para a cena: rodas independentes que giram e esterçam, volante, suspensão,
 * inclinação nas curvas, reação a saltos, chamas de turbo, bolha de escudo e animação do personagem.
 */
export class KartModel {
  readonly group = new THREE.Group();
  /** Rotação extra de drift/giro. */
  private readonly yaw = new THREE.Group();
  /** Chassi (inclina e balança sobre as rodas). */
  private readonly chassis = new THREE.Group();
  private readonly wheels: Wheel[] = [];
  private readonly steering: THREE.Object3D | null;
  private readonly steeringBase = new THREE.Quaternion();
  readonly exhausts: THREE.Object3D[] = [];
  private readonly flames: THREE.Mesh[] = [];
  private readonly flameMaterial: THREE.MeshBasicMaterial;
  private readonly blob: THREE.Mesh;
  private shieldMesh: THREE.Object3D | null = null;
  readonly animator: CharacterAnimator | null;
  private wheelAngle = 0;
  private roll = 0;
  private pitch = 0;
  private driftYaw = 0;
  private suspension = 0;
  private suspensionVel = 0;
  private lastSpeed = 0;
  private wasGrounded = true;
  private time = Math.random() * 10;
  private readonly owned: THREE.Material[] = [];
  private readonly kartScene: THREE.Object3D;
  private charScene: THREE.Object3D | null = null;
  /** Geometrias clonadas para recolorir (a original é compartilhada pelo cache do loader). */
  private readonly ownedGeometry: THREE.BufferGeometry[] = [];
  private readonly baseColors = new Map<THREE.Mesh, Float32Array>();
  private readonly baseMaterials = new Map<THREE.Mesh, THREE.Material>();
  private flameColor = DEFAULT_FLAME;
  private neon: THREE.Mesh | null = null;
  private neonTexture: THREE.DataTexture | null = null;
  private readonly tmpQ = new THREE.Quaternion();
  private readonly axisX = new THREE.Vector3(1, 0, 0);
  private readonly axisZ = new THREE.Vector3(0, 0, 1);

  /**
   * Recolore as cores de vértice dos materiais `names` dentro de `root` segundo a receita (null = cores originais)
   * e aplica o acabamento (metal/rugosidade) num material próprio.
   */
  private recolor(root: THREE.Object3D, names: readonly string[], recipe: ColorRecipe | null, finish?: Finish): void {
    const materials = new Map<THREE.Material, THREE.Material>();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || Array.isArray(m.material)) return;
      const baseMat = this.baseMaterials.get(m) ?? m.material;
      if (!names.includes(baseMat.name)) return;
      this.baseMaterials.set(m, baseMat);
      let base = this.baseColors.get(m);
      if (!base) {
        const attr = m.geometry.getAttribute('color');
        if (!attr) return;
        m.geometry = m.geometry.clone();
        this.ownedGeometry.push(m.geometry);
        const a = m.geometry.getAttribute('color') as THREE.BufferAttribute;
        base = new Float32Array(a.count * 3);
        for (let i = 0; i < a.count; i++) { base[i * 3] = a.getX(i); base[i * 3 + 1] = a.getY(i); base[i * 3 + 2] = a.getZ(i); }
        // Atributo novo em ponto flutuante (o original pode estar quantizado).
        const fresh = new THREE.BufferAttribute(new Float32Array(a.count * a.itemSize), a.itemSize);
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) fresh.setComponent(i, c, a.getComponent(i, c));
        m.geometry.setAttribute('color', fresh);
        this.baseColors.set(m, base);
      }
      const attr = m.geometry.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        tmpColor.setRGB(base[i * 3]!, base[i * 3 + 1]!, base[i * 3 + 2]!);
        if (recipe) applyRecipe(tmpColor, recipe);
        attr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      }
      attr.needsUpdate = true;
      if (finish) {
        let mat = materials.get(baseMat);
        if (!mat) {
          const c = (baseMat as THREE.MeshStandardMaterial).clone();
          c.metalness = finish.metalness; c.roughness = finish.roughness;
          this.owned.push(c);
          materials.set(baseMat, c);
          mat = c;
        }
        m.material = mat;
      } else m.material = baseMat;
    });
  }

  /** Roupa do piloto. */
  applyOutfit(outfit: OutfitDef): void {
    if (this.charScene) this.recolor(this.charScene, OUTFIT_MATERIALS, outfit.recipe, outfit.finish);
  }

  /** Modificações do kart: pintura, metais, chama do turbo e neon. */
  applyLook(look: KartLook): void {
    const paint = paintById(look.paint), metal = metalById(look.metal);
    this.recolor(this.kartScene, PAINT_MATERIALS, paint.recipe, paint.finish);
    this.recolor(this.kartScene, METAL_MATERIALS, metal.recipe, metal.finish);
    this.flameColor = flameById(look.flame).color ?? DEFAULT_FLAME;
    this.flameMaterial.color.set(this.flameColor);
    const neon = neonById(look.neon).color;
    if (neon && !this.neon) {
      this.neonTexture = glowTexture();
      const mat = new THREE.MeshBasicMaterial({ map: this.neonTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.owned.push(mat);
      const geo = new THREE.PlaneGeometry(2.3, 3.1);
      geo.rotateX(-Math.PI / 2);
      this.ownedGeometry.push(geo);
      this.neon = new THREE.Mesh(geo, mat);
      this.neon.position.y = 0.04;
      this.neon.renderOrder = 2;
      this.yaw.add(this.neon);
    }
    if (this.neon) {
      this.neon.visible = !!neon;
      if (neon) (this.neon.material as THREE.MeshBasicMaterial).color.set(neon).multiplyScalar(1.6);
    }
  }

  /**
   * Repinta a carroceria com a cor de um piloto — usado quando dois pilotos da mesma corrida têm o mesmo kart,
   * para não haver dois karts idênticos na pista.
   */
  repaint(color: string): void {
    new THREE.Color(color).getHSL(tmpHsl);
    this.recolor(this.kartScene, PAINT_MATERIALS, { mode: 'set', hue: tmpHsl.h, sat: Math.max(0.55, tmpHsl.s) });
  }

  constructor(kart: GLTF, character: GLTF | null, shield: GLTF | null) {
    const kartScene = SkeletonUtils.clone(kart.scene);
    this.kartScene = kartScene;
    this.group.add(this.yaw);
    this.yaw.add(this.chassis);
    this.chassis.add(kartScene);
    kartScene.updateMatrixWorld(true);

    for (const name of WHEELS) {
      const mesh = kartScene.getObjectByName(name);
      if (!mesh) throw new Error(`Kart sem o nó obrigatório "${name}"`);
      const pivot = new THREE.Group();
      const wp = mesh.getWorldPosition(new THREE.Vector3());
      const wq = mesh.getWorldQuaternion(new THREE.Quaternion());
      pivot.position.copy(wp);
      this.yaw.add(pivot);
      pivot.add(mesh);
      mesh.position.set(0, 0, 0);
      mesh.quaternion.copy(wq);
      const sign = new THREE.Vector3(1, 0, 0).applyQuaternion(wq).x >= 0 ? 1 : -1;
      this.wheels.push({ pivot, mesh, base: wq.clone(), sign, radius: Math.max(0.2, wp.y), front: name.endsWith('fl') || name.endsWith('fr'), restY: wp.y });
    }
    this.steering = kartScene.getObjectByName('steering') ?? null;
    if (this.steering) this.steeringBase.copy(this.steering.quaternion);

    this.flameMaterial = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.owned.push(this.flameMaterial);
    const flameGeo = new THREE.ConeGeometry(0.13, 0.9, 10, 1, true);
    flameGeo.rotateX(-Math.PI / 2);
    flameGeo.translate(0, 0, -0.45);
    for (const name of ['exhaust_l', 'exhaust_r']) {
      const node = kartScene.getObjectByName(name);
      if (!node) continue;
      this.exhausts.push(node);
      const flame = new THREE.Mesh(flameGeo, this.flameMaterial);
      flame.visible = false;
      // o nó do escapamento olha para −Z; a chama é modelada apontando para −Z no espaço do kart
      const holder = new THREE.Group();
      holder.position.copy(node.getWorldPosition(new THREE.Vector3()));
      this.chassis.add(holder);
      holder.add(flame);
      this.flames.push(flame);
    }

    // sombra de contato
    const blobMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false });
    this.owned.push(blobMat);
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), blobMat);
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.03;
    this.blob.scale.set(0.9, 1.35, 1);
    this.blob.renderOrder = 2;
    this.group.add(this.blob);

    if (character) {
      const seat = kartScene.getObjectByName('seat');
      if (!seat) throw new Error('Kart sem o nó obrigatório "seat"');
      const charScene = SkeletonUtils.clone(character.scene);
      this.charScene = charScene;
      seat.add(charScene);
      this.animator = new CharacterAnimator(charScene, character.animations);
    } else this.animator = null;

    if (shield) {
      this.shieldMesh = SkeletonUtils.clone(shield.scene);
      this.shieldMesh.scale.setScalar(1.75);
      this.shieldMesh.position.y = 0.75;
      this.shieldMesh.visible = false;
      this.group.add(this.shieldMesh);
    }
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m !== this.blob && !this.flames.includes(m)) { m.castShadow = true; m.frustumCulled = !(m as THREE.SkinnedMesh).isSkinnedMesh; }
    });
  }

  triggerHit(): void { this.animator?.trigger('hit'); }

  update(dt: number, s: KartVisualState): void {
    this.time += dt;
    // rodas
    this.wheelAngle += (s.speed * dt);
    const steerAngle = -s.steer * 0.42 + (s.drifting ? s.driftDir * 0.3 : 0);
    for (const w of this.wheels) {
      w.pivot.rotation.y = w.front ? steerAngle : 0;
      this.tmpQ.setFromAxisAngle(this.axisX, (this.wheelAngle / w.radius) * w.sign);
      w.mesh.quaternion.copy(w.base).multiply(this.tmpQ);
    }
    if (this.steering) {
      this.tmpQ.setFromAxisAngle(this.axisZ, s.steer * 1.25);
      this.steering.quaternion.copy(this.steeringBase).multiply(this.tmpQ);
    }

    // suspensão: mola amortecida excitada por aceleração, aterrissagem e irregularidade
    const accel = (s.speed - this.lastSpeed) / Math.max(dt, 1e-3);
    this.lastSpeed = s.speed;
    if (s.grounded && !this.wasGrounded) this.suspensionVel -= 2.4;
    this.wasGrounded = s.grounded;
    const bump = s.grounded ? Math.sin(this.time * 31) * Math.min(1, Math.abs(s.speed) / 20) * 0.6 : 0;
    this.suspensionVel += (-this.suspension * 260 - this.suspensionVel * 18 + bump) * dt;
    this.suspension = THREE.MathUtils.clamp(this.suspension + this.suspensionVel * dt, -0.12, 0.1);
    const air = s.grounded ? 0 : 1;

    // inclinação: rola para fora da curva, mergulha na frenagem, empina no turbo
    const speedK = Math.min(1, Math.abs(s.speed) / 26);
    const wantRoll = (s.steer * 0.11 * speedK) + (s.drifting ? s.driftDir * 0.2 : 0);
    const wantPitch = THREE.MathUtils.clamp(-accel * 0.0035, -0.09, 0.12) - s.boost * 0.07 - air * 0.12;
    this.roll += (wantRoll - this.roll) * Math.min(1, dt * 8);
    this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 7);
    this.chassis.rotation.set(this.pitch, 0, this.roll);
    this.chassis.position.y = this.suspension + air * 0.05;
    for (const w of this.wheels) w.pivot.position.y = w.restY - air * 0.07;

    // drift: o kart aponta para dentro da curva; atingido: gira
    const wantYaw = s.drifting ? -s.driftDir * 0.42 : 0;
    this.driftYaw += (wantYaw - this.driftYaw) * Math.min(1, dt * 9);
    this.yaw.rotation.y = this.driftYaw + s.spin * Math.PI * 4;
    this.yaw.position.y = Math.sin(Math.min(1, s.hop) * Math.PI) * 0.32;

    // chamas de turbo
    const on = s.boost > 0.02;
    const c = DRIFT_COLORS[Math.min(3, Math.max(0, s.driftLevel))]!;
    for (const f of this.flames) {
      f.visible = on;
      if (on) {
        const flick = 0.85 + Math.sin(this.time * 60 + f.id) * 0.15;
        f.scale.set(1 + s.boost * 0.8, 1 + s.boost * 0.8, (0.7 + s.boost * 1.3) * flick);
      }
    }
    if (on) this.flameMaterial.color.set(s.driftLevel > 0 ? c : this.flameColor);

    if (this.shieldMesh) {
      this.shieldMesh.visible = s.shield;
      if (s.shield) { this.shieldMesh.rotation.y += dt * 1.4; this.shieldMesh.scale.setScalar(1.75 + Math.sin(this.time * 5) * 0.05); }
    }
    // pisca enquanto invulnerável
    this.yaw.visible = !s.invulnerable || Math.floor(this.time * 14) % 2 === 0 || s.spin > 0;
    (this.blob.material as THREE.MeshBasicMaterial).opacity = s.grounded ? 0.32 : 0.14;

    this.animator?.update(dt, {
      speed: s.speed, steer: s.steer, drifting: s.drifting, driftDir: s.driftDir, boosting: on, airborne: !s.grounded, mood: s.mood,
    });
  }

  /** Posição mundial das rodas traseiras (para fumaça/faíscas). */
  rearWheelWorld(index: 0 | 1, out: THREE.Vector3): THREE.Vector3 {
    const w = this.wheels[2 + index]!;
    return w.pivot.getWorldPosition(out).setY(out.y - w.radius * 0.9);
  }

  dispose(): void {
    this.animator?.dispose();
    for (const m of this.owned) m.dispose();
    this.neonTexture?.dispose();
    for (const g of this.ownedGeometry) g.dispose();
    this.group.removeFromParent();
  }
}
