import * as THREE from 'three';

export type CharacterClip = 'idle' | 'drive' | 'turn_left' | 'turn_right' | 'drift_left' | 'drift_right' | 'hit' | 'victory' | 'defeat' | 'podium';
export type Expression = 'neutral' | 'happy' | 'focus' | 'hurt' | 'sad' | 'blink' | 'wow' | 'grit';

const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'focus', 'hurt', 'sad', 'blink', 'wow', 'grit'];
const CLIPS: CharacterClip[] = ['idle', 'drive', 'turn_left', 'turn_right', 'drift_left', 'drift_right', 'hit', 'victory', 'defeat', 'podium'];
const ONE_SHOT: CharacterClip[] = ['hit', 'victory', 'defeat'];
/** Clipes em laço que compartilham a fase quando entram (o ciclo de quem entra continua o de quem sai). */
const SYNCED: CharacterClip[] = ['drive', 'turn_left', 'turn_right', 'drift_left', 'drift_right'];
/** Ossos do corpo; os demais ossos do esqueleto são acessórios (cauda, cachecol, tranças, orelhas...). */
const CORE_BONES = new Set(['root', 'hips', 'spine', 'chest', 'neck', 'head', 'armL', 'forearmL', 'handL', 'armR', 'forearmR', 'handR', 'legL', 'shinL', 'legR', 'shinR']);

/** Volante no referencial do piloto (mesmo contrato do rig em scripts/characters/rig.ts). */
const WHEEL_CENTER = new THREE.Vector3(0, 0.5, 0.42);
const WHEEL_TILT = THREE.MathUtils.degToRad(25);
const WHEEL_AXIS = new THREE.Vector3(0, Math.sin(WHEEL_TILT), -Math.cos(WHEEL_TILT));
const HAND_TARGET = [0.14, 0.52, 0.38] as const;

/** Passo máximo das molas (as camadas procedurais ficam iguais a 20 ou a 144 quadros por segundo). */
const SPRING_DT = 1 / 60;
const damp = (k: number, dt: number): number => 1 - Math.exp(-k * dt);
const smooth01 = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface DriverMood {
  speed: number;
  steer: number;
  drifting: boolean;
  driftDir: number;
  boosting: boolean;
  airborne: boolean;
  /** Estado final: comemoração, derrota ou pódio. */
  mood: 'race' | 'victory' | 'defeat' | 'podium' | 'idle';
  /** Aceleração sentida pelo kart (m/s²) no referencial dele: x = esquerda, y = cima, z = frente. */
  ax: number; ay: number; az: number;
  /** Nível de detalhe: 0 = só os clipes; 1 = também a inércia do corpo e dos acessórios. */
  detail: number;
}

interface SecondaryBone {
  bone: THREE.Object3D;
  /** Direção do osso (da junta para a ponta) no referencial do piloto. */
  dir: THREE.Vector3;
  stiffness: number;
  gain: number;
  /** Ângulos (x, y, z) e velocidades da mola. */
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
}

/** Direções de cada osso acessório, calculadas pelos vértices que ele controla (uma vez por malha). */
const directionCache = new WeakMap<THREE.BufferGeometry, Map<string, THREE.Vector3>>();

function boneDirections(root: THREE.Object3D): Map<string, THREE.Vector3> {
  const out = new Map<string, THREE.Vector3>();
  const v = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  root.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh) return;
    const cached = directionCache.get(sm.geometry);
    if (cached) { for (const [k, d] of cached) if (!out.has(k)) out.set(k, d); return; }
    const bones = sm.skeleton.bones;
    const pos = sm.geometry.getAttribute('position');
    const si = sm.geometry.getAttribute('skinIndex');
    const sw = sm.geometry.getAttribute('skinWeight');
    const local = new Map<string, THREE.Vector3>();
    if (pos && si && sw) {
      const sum = bones.map(() => new THREE.Vector3());
      const count = new Uint32Array(bones.length);
      for (let i = 0; i < pos.count; i++) {
        let best = -1, bw = 0.5;
        for (let c = 0; c < 4; c++) {
          const w = sw.getComponent(i, c);
          if (w > bw) { bw = w; best = si.getComponent(i, c); }
        }
        const b = bones[best];
        if (!b || CORE_BONES.has(b.name)) continue;
        v.fromBufferAttribute(pos, i).applyMatrix4(sm.bindMatrix);
        sum[best]!.add(v);
        count[best]!++;
      }
      bones.forEach((b, i) => {
        if (CORE_BONES.has(b.name) || count[i]! < 3) return;
        inv.copy(sm.skeleton.boneInverses[i]!).invert();
        const joint = v.setFromMatrixPosition(inv);
        const d = sum[i]!.multiplyScalar(1 / count[i]!).sub(joint);
        if (d.lengthSq() > 1e-8) local.set(b.name, d.normalize().clone());
      });
    }
    directionCache.set(sm.geometry, local);
    for (const [k, d] of local) if (!out.has(k)) out.set(k, d);
  });
  return out;
}

/**
 * Máquina de estados de animação do piloto. Os clipes são misturados por pesos que convergem
 * exponencialmente (sem saltos mesmo quando o estado troca várias vezes no meio de uma transição);
 * a curva mistura condução e curva pelo esterço × velocidade. Por cima dos clipes há camadas
 * procedurais baratas: cabeça que olha para dentro da curva, inércia do tronco (turbo, frenagem,
 * aterrissagem, batida) e molas amortecidas nos acessórios (caudas, cachecóis, tranças, orelhas...).
 */
export class CharacterAnimator {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions: (THREE.AnimationAction | null)[] = [];
  private readonly weights = new Float32Array(CLIPS.length);
  private readonly targets = new Float32Array(CLIPS.length);
  private oneShot: CharacterClip | null = null;
  private oneShotTime = 0;
  private oneShotRate = 22;
  private faceMap: THREE.Texture | null = null;
  private faceMaterial: THREE.MeshStandardMaterial | null = null;
  private expression: Expression = 'neutral';
  private blinkTimer = 4 + Math.random() * 3;
  private blinking = 0;
  private finalPlayed: 'victory' | 'defeat' | null = null;
  private readonly head: THREE.Object3D | null;
  private readonly neck: THREE.Object3D | null;
  private readonly spine: THREE.Object3D | null;
  private readonly handL: THREE.Object3D | null;
  private readonly handR: THREE.Object3D | null;
  private readonly root: THREE.Object3D;
  private headYaw = 0;
  private headPitch = 0;
  private lookWeight = 0;
  /** Inércia do tronco (pitch/roll) e da cabeça (mola mais mole). */
  private bodyP = 0; private bodyPV = 0; private bodyR = 0; private bodyRV = 0;
  private headP = 0; private headPV = 0;
  private latSlow = 0;
  private readonly secondary: SecondaryBone[] = [];
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpC = new THREE.Vector3();
  private readonly tmpW = new THREE.Vector3();
  /** Ângulo do volante segurado pelas mãos (rad, positivo = esquerda) ou null se as mãos estão fora. */
  private wheel: number | null = 0;
  private readonly restL: THREE.Vector3;
  private readonly restR: THREE.Vector3;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    for (const name of CLIPS) {
      const clip = clips.find((c) => c.name === name);
      if (!clip) { this.actions.push(null); continue; }
      const a = this.mixer.clipAction(clip);
      if (ONE_SHOT.includes(name)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      a.setEffectiveWeight(0);
      this.actions.push(a);
    }
    this.head = root.getObjectByName('head') ?? null;
    this.neck = root.getObjectByName('neck') ?? null;
    this.spine = root.getObjectByName('spine') ?? null;
    this.handL = root.getObjectByName('handL') ?? null;
    this.handR = root.getObjectByName('handR') ?? null;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const isFace = o.name === 'face' || o.parent?.name === 'face' || mat.name.startsWith('face_');
      if (isFace && mat.map && !this.faceMap) {
        // textura e material próprios desta instância (o deslocamento do atlas é por piloto)
        this.faceMaterial = mat.clone();
        this.faceMap = mat.map.clone();
        this.faceMap.needsUpdate = true;
        this.faceMaterial.map = this.faceMap;
        m.material = this.faceMaterial;
      }
    });

    // acessórios com mola: rigidez cai ao longo da cadeia (a ponta atrasa e chicoteia)
    const dirs = boneDirections(root);
    root.traverse((o) => {
      if (!(o as THREE.Bone).isBone || CORE_BONES.has(o.name)) return;
      let depth = 0;
      for (let p = o.parent; p && !CORE_BONES.has(p.name); p = p.parent) depth++;
      const child = o.children.find((c) => (c as THREE.Bone).isBone);
      const dir = dirs.get(o.name)?.clone() ?? (child ? child.position.clone().normalize() : o.position.clone().normalize());
      this.secondary.push({ bone: o, dir, stiffness: 150 / (1 + depth * 0.55), gain: 0.009 * (1 + depth * 0.25), x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    });

    // ponto de pegada de cada mão em repouso, projetado no plano do volante
    this.restL = this.projectOnWheel(this.tmpV.set(HAND_TARGET[0], HAND_TARGET[1], HAND_TARGET[2])).clone();
    this.restR = this.projectOnWheel(this.tmpV.set(-HAND_TARGET[0], HAND_TARGET[1], HAND_TARGET[2])).clone();

    // começa no idle em uma fase aleatória (pilotos lado a lado não respiram em sincronia)
    const idle = this.actions[0];
    if (idle) {
      idle.play();
      idle.time = Math.random() * idle.getClip().duration;
      this.weights[0] = 1;
      idle.setEffectiveWeight(1);
    }
  }

  get hasFace(): boolean { return this.faceMap !== null; }
  get clip(): CharacterClip | null {
    let best = -1, bw = 0;
    for (let i = 0; i < CLIPS.length; i++) if (this.weights[i]! > bw) { bw = this.weights[i]!; best = i; }
    return best >= 0 ? CLIPS[best]! : null;
  }
  /** Ângulo do volante que as mãos do clipe estão segurando (rad, positivo = esquerda); null = mãos soltas. */
  get wheelAngle(): number | null { return this.wheel; }

  /** Reação pontual (batida). */
  trigger(name: 'hit'): void {
    const i = CLIPS.indexOf(name);
    const a = this.actions[i];
    if (!a) return;
    this.oneShot = name;
    this.oneShotTime = a.getClip().duration;
    this.oneShotRate = 22;
    a.reset().play();
    // tranco no tronco e nos acessórios
    this.bodyPV += 2.6; this.headPV += 4;
    this.bodyRV += (Math.random() - 0.5) * 3;
    for (const s of this.secondary) { s.vx += (Math.random() - 0.3) * 6; s.vy += (Math.random() - 0.5) * 5; s.vz += (Math.random() - 0.5) * 6; }
  }

  setExpression(e: Expression): void {
    if (!this.faceMap || this.expression === e) return;
    this.expression = e;
    const i = EXPRESSIONS.indexOf(e);
    this.faceMap.offset.set((i % 4) * 0.25, Math.floor(i / 4) * 0.5);
  }

  private setTarget(name: CharacterClip, w: number): void { this.targets[CLIPS.indexOf(name)] = w; }

  /** Pesos-alvo dos clipes conforme o que acontece; devolve a taxa de convergência (1/s). */
  private chooseTargets(m: DriverMood): number {
    this.targets.fill(0);
    if (this.oneShot) {
      const a = this.actions[CLIPS.indexOf(this.oneShot)]!;
      // segura o clipe e, perto do fim, devolve o corpo ao estado da corrida
      if (this.oneShotTime > 0.28) { this.setTarget(this.oneShot, 1); return this.oneShotRate; }
      if (!a.isRunning() && this.oneShotTime <= 0) this.oneShot = null;
    }
    if (m.mood === 'victory' || m.mood === 'defeat') {
      if (this.finalPlayed !== m.mood) {
        this.finalPlayed = m.mood;
        const a = this.actions[CLIPS.indexOf(m.mood)];
        if (a) { a.reset().play(); this.oneShot = m.mood; this.oneShotTime = a.getClip().duration; this.oneShotRate = 7; this.setTarget(m.mood, 1); return 7; }
      }
      // depois da comemoração, o laço do pódio; depois da derrota, o idle
      this.setTarget(m.mood === 'victory' ? 'podium' : 'idle', 1);
      return 3.5;
    }
    if (m.mood === 'podium') { this.setTarget('podium', 1); return 4; }
    const speed = Math.abs(m.speed);
    if (m.mood === 'idle' || speed < 1.5) { this.setTarget('idle', 1); return 4; }
    if (m.drifting) { this.setTarget(m.driftDir > 0 ? 'drift_right' : 'drift_left', 1); return 9; }
    // curva: mistura contínua por esterço × velocidade (devagar o corpo quase não inclina)
    const turn = smooth01(0.08, 0.75, Math.abs(m.steer)) * smooth01(2, 14, speed);
    this.setTarget('drive', 1 - turn);
    this.setTarget(m.steer > 0 ? 'turn_right' : 'turn_left', turn);
    return 7;
  }

  private applyWeights(dt: number, rate: number): void {
    const k = damp(rate, dt);
    let sum = 0;
    for (let i = 0; i < CLIPS.length; i++) {
      this.weights[i]! += (this.targets[i]! - this.weights[i]!) * k;
      if (this.weights[i]! < 1e-3 && this.targets[i] === 0) this.weights[i] = 0;
      sum += this.weights[i]!;
    }
    // fase do laço dominante (quem entra continua o mesmo ponto do ciclo, sem tropeço)
    let phase = -1, pw = 0;
    for (let i = 0; i < CLIPS.length; i++) {
      const a = this.actions[i];
      if (a && SYNCED.includes(CLIPS[i]!) && a.isRunning() && this.weights[i]! > pw) { pw = this.weights[i]!; phase = a.time / a.getClip().duration; }
    }
    for (let i = 0; i < CLIPS.length; i++) {
      const a = this.actions[i];
      if (!a) continue;
      const w = sum > 0 ? this.weights[i]! / sum : 0;
      if (w > 0) {
        if (!a.isRunning() && !ONE_SHOT.includes(CLIPS[i]!)) {
          a.play();
          if (phase >= 0 && SYNCED.includes(CLIPS[i]!)) a.time = phase * a.getClip().duration;
          // comemoração em laço: cada piloto num ponto do ciclo (o pódio não pula em uníssono)
          else if (CLIPS[i] === 'podium') a.time = Math.random() * a.getClip().duration;
        }
        a.setEffectiveWeight(w);
      } else if (a.isRunning() || a.getEffectiveWeight() > 0) {
        a.setEffectiveWeight(0);
        if (!ONE_SHOT.includes(CLIPS[i]!) || CLIPS[i] !== this.oneShot) a.stop();
      }
    }
  }

  update(dt: number, m: DriverMood): void {
    if (this.oneShot) this.oneShotTime -= dt;
    this.applyWeights(dt, this.chooseTargets(m));

    let face: Expression = 'neutral';
    if (this.oneShot === 'hit') face = 'hurt';
    else if (m.mood === 'victory' || m.mood === 'podium') face = 'happy';
    else if (m.mood === 'defeat') face = 'sad';
    else if (m.airborne) face = 'wow';
    else if (m.boosting) face = 'happy';
    else if (m.drifting) face = 'grit';
    else if (Math.abs(m.speed) > 12) face = 'focus';
    // piscar
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) { this.blinking = 0.12; this.blinkTimer = 2.5 + Math.random() * 3.5; }
    if (this.blinking > 0 && (face === 'neutral' || face === 'focus')) { this.blinking -= dt; face = 'blink'; }
    this.setExpression(face);
    this.mixer.update(dt);

    const racing = m.mood === 'race' && this.oneShot === null;
    // a cabeça olha para dentro da curva e, no drift, para a saída dela (camada aditiva, entra e sai suave)
    this.lookWeight += ((racing ? 1 : 0) - this.lookWeight) * damp(5, dt);
    const speedK = smooth01(3, 16, Math.abs(m.speed));
    const wantYaw = THREE.MathUtils.clamp((-m.steer * 0.24 - (m.drifting ? m.driftDir * 0.2 : 0)) * speedK, -0.5, 0.5);
    const wantPitch = m.boosting ? -0.06 : 0;
    this.headYaw += (wantYaw - this.headYaw) * damp(6, dt);
    this.headPitch += (wantPitch - this.headPitch) * damp(4, dt);

    if (m.detail > 0) this.springs(dt, m); else this.relaxSprings(dt);

    if (this.head) {
      const lw = this.lookWeight;
      if (lw > 1e-3) this.head.rotateY(this.headYaw * lw);
      this.head.rotateX(this.headPitch * lw + this.headP);
    }
    if (this.neck) this.neck.rotateX(this.bodyP * 0.45);
    if (this.spine) { this.spine.rotateX(this.bodyP * 0.35); this.spine.rotateZ(this.bodyR * 0.5); }
    for (const s of this.secondary) {
      if (s.x !== 0) s.bone.rotateX(s.x);
      if (s.y !== 0) s.bone.rotateY(s.y);
      if (s.z !== 0) s.bone.rotateZ(s.z);
    }
    this.measureWheel();
  }

  /** Inércia do tronco e dos acessórios: molas amortecidas excitadas pela aceleração do kart. */
  private springs(total: number, m: DriverMood): void {
    // a parte lenta da aceleração lateral é a curva (os clipes já inclinam); a mola reage aos trancos
    this.latSlow += (m.ax - this.latSlow) * damp(2.5, total);
    const lat = m.ax - this.latSlow;
    const wantP = THREE.MathUtils.clamp(-m.az * 0.0035 + Math.max(0, m.ay) * 0.0022, -0.1, 0.11);
    const wantR = THREE.MathUtils.clamp(lat * 0.003, -0.07, 0.07);
    // força fictícia sentida pelos acessórios (contrária à aceleração), em m/s²
    const fx = THREE.MathUtils.clamp(-m.ax, -45, 45), fy = THREE.MathUtils.clamp(-m.ay, -45, 45), fz = THREE.MathUtils.clamp(-m.az, -45, 45);
    let left = total;
    while (left > 1e-5) {
      const h = Math.min(SPRING_DT, left);
      left -= h;
      // tronco: firme e bem amortecido; cabeça: mais mole (chicote)
      this.bodyPV += (90 * (wantP - this.bodyP) - 11 * this.bodyPV) * h; this.bodyP += this.bodyPV * h;
      this.bodyRV += (90 * (wantR - this.bodyR) - 11 * this.bodyRV) * h; this.bodyR += this.bodyRV * h;
      this.headPV += (55 * (wantP * 0.8 - this.headP) - 7 * this.headPV) * h; this.headP += this.headPV * h;
      for (const s of this.secondary) {
        const d = s.dir;
        // torque = direção × força, no referencial do piloto (os ossos do rig não têm rotação de repouso)
        const tx = THREE.MathUtils.clamp((d.y * fz - d.z * fy) * s.gain, -0.45, 0.45);
        const ty = THREE.MathUtils.clamp((d.z * fx - d.x * fz) * s.gain, -0.45, 0.45);
        const tz = THREE.MathUtils.clamp((d.x * fy - d.y * fx) * s.gain, -0.45, 0.45);
        const c = 2 * 0.32 * Math.sqrt(s.stiffness);
        s.vx += (s.stiffness * (tx - s.x) - c * s.vx) * h;
        s.vy += (s.stiffness * (ty - s.y) - c * s.vy) * h;
        s.vz += (s.stiffness * (tz - s.z) - c * s.vz) * h;
        s.x = THREE.MathUtils.clamp(s.x + s.vx * h, -0.6, 0.6);
        s.y = THREE.MathUtils.clamp(s.y + s.vy * h, -0.6, 0.6);
        s.z = THREE.MathUtils.clamp(s.z + s.vz * h, -0.6, 0.6);
      }
    }
  }

  /** Sem detalhe (longe da câmera): as camadas voltam suavemente ao zero. */
  private relaxSprings(dt: number): void {
    const k = 1 - damp(6, dt);
    this.bodyP *= k; this.bodyR *= k; this.headP *= k;
    this.bodyPV = this.bodyRV = this.headPV = 0;
    for (const s of this.secondary) { s.x *= k; s.y *= k; s.z *= k; s.vx = s.vy = s.vz = 0; }
  }

  private projectOnWheel(p: THREE.Vector3): THREE.Vector3 {
    p.sub(WHEEL_CENTER);
    return p.addScaledVector(WHEEL_AXIS, -p.dot(WHEEL_AXIS));
  }

  /** Posição de um osso no referencial do piloto (compõe só a cadeia até a raiz, sem atualizar a cena). */
  private boneInRoot(bone: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
    out.set(0, 0, 0);
    for (let o: THREE.Object3D | null = bone; o && o !== this.root; o = o.parent) {
      o.updateMatrix();
      out.applyMatrix4(o.matrix);
    }
    return out;
  }

  /** Ângulo em que as mãos seguram o volante (o volante do kart acompanha as mãos, não o contrário). */
  private measureWheel(): void {
    if (!this.handL || !this.handR) { this.wheel = null; return; }
    const a = this.signedWheelAngle(this.boneInRoot(this.handL, this.tmpV), this.restL);
    const b = this.signedWheelAngle(this.boneInRoot(this.handR, this.tmpW), this.restR);
    this.wheel = a !== null && b !== null && Math.abs(a - b) < 0.35 ? (a + b) * 0.5 : a ?? b;
  }

  private signedWheelAngle(hand: THREE.Vector3, rest: THREE.Vector3): number | null {
    const p = this.projectOnWheel(hand);
    const r = rest.length();
    // a mão precisa estar na coroa do volante
    if (Math.abs(p.length() - r) > 0.06) return null;
    const sin = this.tmpC.crossVectors(rest, p).dot(WHEEL_AXIS);
    return Math.atan2(sin, rest.dot(p));
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    this.faceMap?.dispose();
    this.faceMaterial?.dispose();
  }
}
