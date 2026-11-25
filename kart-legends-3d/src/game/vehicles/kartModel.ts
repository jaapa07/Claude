import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';
import { CharacterAnimator, type DriverMood } from '@/game/characters/characterAnimator';
import { applyTires } from './tires';
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
/** Passo máximo das molas visuais. */
const SPRING_DT = 1 / 60;
const damp = (k: number, dt: number): number => 1 - Math.exp(-k * dt);
const DRIFT_COLORS = [new THREE.Color('#ffffff'), new THREE.Color('#4fb6ff'), new THREE.Color('#ff9a2e'), new THREE.Color('#ff3fd2')];

interface Wheel { pivot: THREE.Group; mesh: THREE.Object3D; base: THREE.Quaternion; sign: number; radius: number; front: boolean; restY: number; angle: number }

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
  /** Nível de detalhe da animação do piloto (0 = só clipes; 1 = inércia e acessórios com mola). */
  detail = 1;
  private wheelSteer = 0;
  private steerWheel = 0;
  private roll = 0;
  private rollV = 0;
  private pitch = 0;
  private pitchV = 0;
  private driftYaw = 0;
  private suspension = 0;
  private suspensionVel = 0;
  private airK = 0;
  private landVy = 0;
  private lastHop = 0;
  private lastSpin = 0;
  private flameOn = false;
  private flameK = 0;
  private flameKick = 0;
  private wasGrounded = true;
  private hasPrev = false;
  private readonly prevPos = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();
  private readonly prevVel = new THREE.Vector3();
  private readonly accW = new THREE.Vector3();
  /** Aceleração filtrada no referencial do kart (x = esquerda, y = cima, z = frente). */
  private readonly acc = new THREE.Vector3();
  private readonly tmpV = new THREE.Vector3();
  private readonly mood: DriverMood = {
    speed: 0, steer: 0, drifting: false, driftDir: 0, boosting: false, airborne: false, mood: 'idle', ax: 0, ay: 0, az: 0, detail: 1,
  };
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

  private look: KartLook | null = null;

  /** Pneus da loja (null = os originais do kart). Reaplica a pintura/metais por cima dos pneus novos. */
  setTire(tire: GLTF | null): void {
    applyTires(this.wheels, tire);
    if (this.look) this.applyLook(this.look);
  }

  /** Modificações do kart: pintura, metais, chama do turbo e neon (os pneus vêm de `setTire`). */
  applyLook(look: KartLook): void {
    this.look = look;
    const paint = paintById(look.paint), metal = metalById(look.metal);
    // `group` inclui as rodas (que saem da cena do kart para os pivôs) e os pneus da loja.
    this.recolor(this.group, PAINT_MATERIALS, paint.recipe, paint.finish);
    this.recolor(this.group, METAL_MATERIALS, metal.recipe, metal.finish);
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
      this.wheels.push({ pivot, mesh, base: wq.clone(), sign, radius: Math.max(0.2, wp.y), front: name.endsWith('fl') || name.endsWith('fr'), restY: wp.y, angle: 0 });
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

  /** Velocidade/aceleração do kart medidas pela própria posição desenhada (filtradas, sem alocação). */
  private measureMotion(dt: number): void {
    const p = this.group.position;
    if (!this.hasPrev || dt <= 1e-4) {
      this.prevPos.copy(p); this.hasPrev = true;
      return;
    }
    this.tmpV.subVectors(p, this.prevPos);
    this.prevPos.copy(p);
    // teletransporte (renascimento, kart que volta a ser desenhado): zera a medição
    if (this.tmpV.lengthSq() > 64) { this.vel.set(0, 0, 0); this.prevVel.set(0, 0, 0); this.accW.set(0, 0, 0); this.acc.set(0, 0, 0); return; }
    this.vel.lerp(this.tmpV.divideScalar(dt), damp(30, dt));
    this.tmpV.subVectors(this.vel, this.prevVel).divideScalar(dt).clampLength(0, 90);
    this.prevVel.copy(this.vel);
    this.accW.lerp(this.tmpV, damp(14, dt));
    this.acc.copy(this.accW).applyQuaternion(this.tmpQ.copy(this.group.quaternion).invert());
  }

  update(dt: number, s: KartVisualState): void {
    this.time += dt;
    this.measureMotion(dt);
    const acc = this.acc;
    const speedK = Math.min(1, Math.abs(s.speed) / 26);

    // direção: uma só fonte para mãos, volante e rodas. Com piloto, as rodas seguem o volante que as mãos do
    // clipe seguram (inclusive o contra-esterço do drift); sem piloto, o esterço da física.
    const hands = this.animator?.wheelAngle;
    const held = hands !== null && hands !== undefined;
    const wantSteer = held ? hands * 0.42 : -s.steer * 0.42 + (s.drifting ? s.driftDir * 0.3 : 0);
    this.wheelSteer += (wantSteer - this.wheelSteer) * damp(16, dt);
    for (const w of this.wheels) {
      w.pivot.rotation.y = w.front ? this.wheelSteer : 0;
      // giro = velocidade no chão / raio; no drift as traseiras patinam um pouco mais rápido
      const slip = !w.front && s.drifting && s.grounded ? 1.18 : 1;
      w.angle = (w.angle + (s.speed * slip * dt) / w.radius) % (Math.PI * 2);
      this.tmpQ.setFromAxisAngle(this.axisX, w.angle * w.sign);
      w.mesh.quaternion.copy(w.base).multiply(this.tmpQ);
    }

    // impactos: aterrissagem (pela velocidade vertical), fim do pulinho do drift e começo do giro
    if (s.grounded && !this.wasGrounded) {
      const impact = THREE.MathUtils.clamp(-this.landVy * 0.16, 0.7, 3.4);
      this.suspensionVel -= impact;
      this.pitchV += impact * 0.55;
    }
    if (!s.grounded) this.landVy = Math.min(this.landVy, this.vel.y); else this.landVy = 0;
    this.wasGrounded = s.grounded;
    const hop = Math.min(1, Math.max(0, s.hop));
    if (this.lastHop > 0 && hop === 0) this.suspensionVel -= 1.1;
    this.lastHop = hop;
    if (s.spin > 0 && this.lastSpin === 0) { this.suspensionVel += 1.6; this.rollV += (Math.random() < 0.5 ? -1 : 1) * 2.2; }
    this.lastSpin = s.spin;

    // suspensão, arfagem e rolagem: molas amortecidas (passo fixo interno → mesmo resultado em qualquer FPS)
    this.airK += ((s.grounded ? 0 : 1) - this.airK) * damp(s.grounded ? 18 : 6, dt);
    const bumpAmp = s.grounded ? Math.min(1, Math.abs(s.speed) / 20) * 0.6 : 0;
    const wantPitch = THREE.MathUtils.clamp(-acc.z * 0.0032, -0.08, 0.1) - s.boost * 0.06 - this.airK * 0.1;
    const wantRoll = s.steer * 0.11 * speedK + (s.drifting ? s.driftDir * 0.2 : 0);
    let left = dt;
    while (left > 1e-5) {
      const h = Math.min(SPRING_DT, left);
      left -= h;
      const bump = Math.sin((this.time - left) * 31) * bumpAmp;
      this.suspensionVel += (-this.suspension * 260 - this.suspensionVel * 18 + bump) * h;
      this.suspension = THREE.MathUtils.clamp(this.suspension + this.suspensionVel * h, -0.13, 0.1);
      this.pitchV += (130 * (wantPitch - this.pitch) - 13 * this.pitchV) * h;
      this.pitch += this.pitchV * h;
      this.rollV += (110 * (wantRoll - this.roll) - 12 * this.rollV) * h;
      this.roll += this.rollV * h;
    }
    // motor em marcha lenta: vibração fininha parado
    const idle = Math.abs(s.speed) < 1 && s.grounded ? 1 : 0;
    const hopArc = Math.sin(hop * Math.PI);
    this.chassis.rotation.set(this.pitch - hopArc * 0.05, 0, this.roll + idle * Math.sin(this.time * 43) * 0.004);
    this.chassis.position.y = this.suspension + this.airK * 0.05 + idle * Math.sin(this.time * 57) * 0.005;
    for (const w of this.wheels) w.pivot.position.y = w.restY - this.airK * 0.07;

    // drift: o kart aponta para dentro da curva; atingido: gira (rápido no impacto, freando até parar de frente)
    const wantYaw = s.drifting ? -s.driftDir * 0.42 : 0;
    this.driftYaw += (wantYaw - this.driftYaw) * damp(9, dt);
    const spinEase = 1 - Math.pow(1 - Math.min(1, s.spin), 1.8);
    this.yaw.rotation.y = this.driftYaw + (s.spin > 0 ? spinEase * Math.PI * 4 : 0);
    this.yaw.position.y = hopArc * 0.32;

    // chamas de turbo: acendem com um estouro, oscilam e apagam encolhendo
    const on = s.boost > 0.02;
    if (on && !this.flameOn) this.flameKick = 1;
    this.flameOn = on;
    this.flameKick *= Math.exp(-5 * dt);
    this.flameK += ((on ? 1 : 0) - this.flameK) * damp(on ? 28 : 10, dt);
    const flameVisible = this.flameK > 0.02;
    const c = DRIFT_COLORS[Math.min(3, Math.max(0, s.driftLevel))]!;
    for (const f of this.flames) {
      f.visible = flameVisible;
      if (flameVisible) {
        const flick = 0.86 + 0.14 * Math.sin(this.time * 53 + f.id) * Math.sin(this.time * 21 + f.id * 2.3);
        const wid = (1 + s.boost * 0.8 + this.flameKick * 0.35) * (0.55 + 0.45 * this.flameK);
        f.scale.set(wid, wid, (0.7 + s.boost * 1.3 + this.flameKick * 0.9) * this.flameK * flick);
      }
    }
    if (on) this.flameMaterial.color.set(s.driftLevel > 0 ? c : this.flameColor);

    if (this.shieldMesh) {
      this.shieldMesh.visible = s.shield;
      if (s.shield) { this.shieldMesh.rotation.y += dt * 1.4; this.shieldMesh.scale.setScalar(1.75 + Math.sin(this.time * 5) * 0.05); }
    }
    // pisca enquanto invulnerável
    this.yaw.visible = !s.invulnerable || Math.floor(this.time * 14) % 2 === 0 || s.spin > 0;
    const blob = this.blob.material as THREE.MeshBasicMaterial;
    blob.opacity = 0.32 - this.airK * 0.18;
    this.blob.scale.set(0.9 * (1 - this.airK * 0.15), 1.35 * (1 - this.airK * 0.15), 1);

    if (this.animator) {
      const m = this.mood;
      m.speed = s.speed; m.steer = s.steer; m.drifting = s.drifting; m.driftDir = s.driftDir; m.boosting = on;
      m.airborne = !s.grounded; m.mood = s.mood; m.ax = acc.x; m.ay = acc.y; m.az = acc.z; m.detail = this.detail;
      this.animator.update(dt, m);
    }
    if (this.steering) {
      // o volante acompanha as mãos do piloto (pose deste quadro), assim as mãos nunca escorregam da coroa
      const grip = this.animator?.wheelAngle;
      const gripping = grip !== null && grip !== undefined;
      this.steerWheel = gripping ? -grip : this.steerWheel + (s.steer * 1.25 - this.steerWheel) * damp(14, dt);
      this.tmpQ.setFromAxisAngle(this.axisZ, this.steerWheel);
      this.steering.quaternion.copy(this.steeringBase).multiply(this.tmpQ);
    }
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
