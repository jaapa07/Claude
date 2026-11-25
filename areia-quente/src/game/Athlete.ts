import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assets } from '../core/Assets';
import CLIPS from '../data/clips.json';

export const ATHLETE_URL = 'models/players/athlete.glb';
export const MODEL_SCALE = 1.8 / 3.77;
export type ClipName = keyof typeof CLIPS;
export const clipMeta = CLIPS as Record<string, { contact?: number; contact2?: number; loop: boolean; duration: number; endsLying?: string; reach?: number }>;

const LOCO = new Set(['idle', 'idle_ready', 'idle_tired', 'walk', 'jog', 'run', 'sprint', 'gk_idle', 'strafe_left', 'strafe_right', 'jog_back', 'gk_side_left', 'gk_side_right']);

/** Personagem animado (rig do Kenney + clipes autorais) com uniforme, sombra e aura do Modo Fogo. */
export class Athlete {
  root = new THREE.Group();
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions = new Map<string, THREE.AnimationAction>();
  current = 'idle';
  currentAction?: THREE.AnimationAction;
  actionTime = 0;
  locked = 0; // segundos restantes de animação de ação (bloqueia locomoção)
  mat: THREE.MeshStandardMaterial;
  aura: THREE.Sprite;
  shadow: THREE.Mesh;
  fire = 0;
  head?: THREE.Bone;
  rightFoot?: THREE.Bone;
  chest?: THREE.Bone;

  constructor(kitUrl: string) {
    const g = assets.gltf(ATHLETE_URL);
    this.model = SkeletonUtils.clone(g.scene);
    this.model.scale.setScalar(MODEL_SCALE);
    this.mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, emissive: new THREE.Color(0x3aa0ff), emissiveIntensity: 0 });
    assets.texAsync(kitUrl).then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; this.mat.map = t; this.mat.needsUpdate = true; });
    this.model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isMesh) { m.material = this.mat; m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; }
      if ((o as THREE.Bone).isBone) {
        if (o.name === 'Head') this.head = o as THREE.Bone;
        if (o.name === 'RightFoot') this.rightFoot = o as THREE.Bone;
        if (o.name === 'Chest') this.chest = o as THREE.Bone;
      }
    });
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of g.animations) {
      const a = this.mixer.clipAction(clip);
      const meta = clipMeta[clip.name];
      if (meta && !meta.loop) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions.set(clip.name, a);
    }
    // aura (brilho azul do Modo Fogo)
    const tex = assets.tex('vfx/light_01.png');
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x6fc8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    this.aura.scale.set(2.0, 2.6, 1);
    this.aura.position.y = 1.0;
    this.root.add(this.aura);
    // sombra de contato
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: assets.tex('vfx/blob_shadow.png'), transparent: true, depthWrite: false, opacity: 0.55 }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.012;
    this.root.add(this.shadow);
    this.play('idle', 0);
  }

  setKit(url: string) {
    assets.texAsync(url).then((t) => { t.flipY = false; t.needsUpdate = true; this.mat.map = t; this.mat.needsUpdate = true; });
  }

  /** Troca de animação com crossfade. Ações não-loop bloqueiam a locomoção até terminar. */
  play(name: string, fade = 0.15, speed = 1, force = false) {
    const next = this.actions.get(name);
    if (!next) return;
    if (name === this.current && !force && this.currentAction?.isRunning()) { next.timeScale = speed; return; }
    const prev = this.currentAction;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.timeScale = speed;
    next.play();
    if (prev && prev !== next && fade > 0) prev.crossFadeTo(next, fade, false);
    else if (prev && prev !== next) prev.stop();
    this.current = name;
    this.currentAction = next;
    this.actionTime = 0;
    const meta = clipMeta[name];
    this.locked = meta && !meta.loop ? meta.duration / speed : 0;
  }

  /** Locomoção em função da velocidade (m/s) e da direção do movimento em relação ao corpo
   *  (fwd = componente para a frente, side = para a esquerda do personagem), com corrida lateral e de costas. */
  locomote(speed: number, tired = false, gk = false, fwd = 1, side = 0) {
    if (this.locked > 0) return;
    let n = gk ? 'gk_idle' : tired ? 'idle_tired' : 'idle';
    let sp = 1;
    if (gk && speed > 0.6 && Math.abs(side) > 0.6 && speed < 6) { n = side > 0 ? 'gk_side_left' : 'gk_side_right'; sp = THREE.MathUtils.clamp(speed / 2.6, 0.7, 1.5); }
    else if (speed > 1.4 && speed < 6.2 && fwd < -0.55) { n = 'jog_back'; sp = THREE.MathUtils.clamp(speed / 2.6, 0.7, 1.5); }
    else if (speed > 1.4 && speed < 6.2 && Math.abs(side) > 0.75) { n = side > 0 ? 'strafe_left' : 'strafe_right'; sp = THREE.MathUtils.clamp(speed / 3.0, 0.7, 1.5); }
    // taxas calibradas para os ciclos de captura de movimento (pé sem patinar na areia)
    else if (speed > 7.2) { n = 'sprint'; sp = THREE.MathUtils.clamp(speed / 7.4, 0.85, 1.35); }
    else if (speed > 4.2) { n = 'run'; sp = THREE.MathUtils.clamp(speed / 3.9, 1.0, 1.7); }
    else if (speed > 1.6) { n = 'jog'; sp = THREE.MathUtils.clamp(speed / 3.3, 0.6, 1.3); }
    else if (speed > 0.35) { n = 'walk'; sp = THREE.MathUtils.clamp(speed / 1.35, 0.6, 1.3); }
    if (n !== this.current) this.play(n, 0.2, sp);
    else if (this.currentAction) this.currentAction.timeScale = sp;
  }

  isLoco() { return LOCO.has(this.current); }

  update(dt: number) {
    this.mixer.update(dt);
    this.actionTime += dt * (this.currentAction?.timeScale ?? 1);
    if (this.locked > 0) this.locked -= dt;
    // aura
    const target = this.fire > 0 ? 1 : 0;
    const m = this.aura.material as THREE.SpriteMaterial;
    m.opacity += (target * (0.32 + Math.sin(performance.now() * 0.02) * 0.12) - m.opacity) * Math.min(1, dt * 8);
    this.mat.emissiveIntensity = m.opacity * 0.55;
    this.aura.visible = m.opacity > 0.01;
  }

  worldOf(b: THREE.Object3D | undefined, out = new THREE.Vector3()) {
    if (!b) return out.copy(this.root.position);
    return b.getWorldPosition(out);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}
