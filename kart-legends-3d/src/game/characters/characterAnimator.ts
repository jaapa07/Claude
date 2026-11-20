import * as THREE from 'three';

export type CharacterClip = 'idle' | 'drive' | 'turn_left' | 'turn_right' | 'drift_left' | 'drift_right' | 'hit' | 'victory' | 'defeat' | 'podium';
export type Expression = 'neutral' | 'happy' | 'focus' | 'hurt' | 'sad' | 'blink' | 'wow' | 'grit';

const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'focus', 'hurt', 'sad', 'blink', 'wow', 'grit'];
const ONE_SHOT: CharacterClip[] = ['hit', 'victory', 'defeat'];

export interface DriverMood {
  speed: number;
  steer: number;
  drifting: boolean;
  driftDir: number;
  boosting: boolean;
  airborne: boolean;
  /** Estado final: comemoração, derrota ou pódio. */
  mood: 'race' | 'victory' | 'defeat' | 'podium' | 'idle';
}

/**
 * Máquina de estados de animação do piloto: escolhe o clipe pelo que acontece na corrida,
 * faz crossfade entre eles, dispara reações (batida, vitória) e troca a expressão do rosto.
 */
export class CharacterAnimator {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: CharacterClip | null = null;
  private oneShot: CharacterClip | null = null;
  private oneShotTime = 0;
  private faceMap: THREE.Texture | null = null;
  private faceMaterial: THREE.MeshStandardMaterial | null = null;
  private expression: Expression = 'neutral';
  private blinkTimer = 4 + Math.random() * 3;
  private blinking = 0;
  private finalPlayed = false;
  private readonly head: THREE.Object3D | null;
  private headYaw = 0;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of clips) {
      const a = this.mixer.clipAction(clip);
      if (ONE_SHOT.includes(clip.name as CharacterClip)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions.set(clip.name, a);
    }
    this.head = root.getObjectByName('head') ?? null;
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
    this.play('idle', 0);
  }

  get hasFace(): boolean { return this.faceMap !== null; }
  get clip(): CharacterClip | null { return this.oneShot ?? this.current; }

  private play(name: CharacterClip, fade: number): void {
    const next = this.actions.get(name);
    if (!next || this.current === name) return;
    const prev = this.current ? this.actions.get(this.current) : undefined;
    next.reset().setEffectiveWeight(1).play();
    if (prev && fade > 0) prev.crossFadeTo(next, fade, false); else prev?.stop();
    this.current = name;
  }

  /** Reação pontual (batida). */
  trigger(name: 'hit'): void {
    const a = this.actions.get(name);
    if (!a) return;
    this.oneShot = name;
    this.oneShotTime = a.getClip().duration;
    this.play(name, 0.08);
  }

  setExpression(e: Expression): void {
    if (!this.faceMap || this.expression === e) return;
    this.expression = e;
    const i = EXPRESSIONS.indexOf(e);
    this.faceMap.offset.set((i % 4) * 0.25, Math.floor(i / 4) * 0.5);
  }

  update(dt: number, m: DriverMood): void {
    if (this.oneShot) {
      this.oneShotTime -= dt;
      if (this.oneShotTime <= 0) this.oneShot = null;
    }
    let face: Expression = 'neutral';
    if (!this.oneShot) {
      if (m.mood === 'victory' || m.mood === 'defeat') {
        if (!this.finalPlayed) { this.finalPlayed = true; this.play(m.mood, 0.2); }
        else if (this.actions.get(m.mood)?.paused || !this.actions.get(m.mood)?.isRunning()) this.play(m.mood === 'victory' ? 'podium' : 'idle', 0.4);
      } else if (m.mood === 'podium') this.play('podium', 0.3);
      else if (m.mood === 'idle' || Math.abs(m.speed) < 1.5) this.play('idle', 0.3);
      else if (m.drifting) this.play(m.driftDir > 0 ? 'drift_right' : 'drift_left', 0.14);
      else if (m.steer > 0.35) this.play('turn_right', 0.16);
      else if (m.steer < -0.35) this.play('turn_left', 0.16);
      else this.play('drive', 0.2);
    }
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
    // a cabeça acompanha a direção da curva (camada aditiva sobre o clipe)
    if (this.head && m.mood === 'race' && !this.oneShot) {
      const want = THREE.MathUtils.clamp(-m.steer * 0.3 - (m.drifting ? m.driftDir * 0.25 : 0), -0.6, 0.6);
      this.headYaw += (want - this.headYaw) * Math.min(1, dt * 6);
      this.head.rotateY(this.headYaw);
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.faceMap?.dispose();
    this.faceMaterial?.dispose();
  }
}
