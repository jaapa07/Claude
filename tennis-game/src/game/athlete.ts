import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Assets } from '../core/assets';
import type { PlayerDef } from '../data/content';
import { mirrorClip, sampleMirroredRacket, twoBoneIK, setWorldQuat, type BackhandData } from './backhand';

// ------------------------------------------------------------------ tennis outfit material
// The base characters ship as bare bodies. The kit (shirt, shorts, socks, shoes, wrist & head bands, chest logo) is
// applied in the shader using the bind-pose position, so hems are clean and every player gets their own colours.
export interface OutfitColors {
  shirt: string; accent: string; shorts: string; socks: string; shoes: string; skin: string; band?: string; sponsor: number; female: boolean; plain?: boolean;
}

const SKIN_REF = new THREE.Color('#d9a27a');

export function makeOutfitMaterial(src: THREE.MeshStandardMaterial, o: OutfitColors, instanced = false): THREE.MeshStandardMaterial {
  const m = src.clone();
  const sponsorTex = Assets.t('textures/sponsor_atlas.webp');
  const fabric = Assets.t('textures/fabric_normal.webp', 1);
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  const skin = new THREE.Color(o.skin);
  const tint = new THREE.Color(skin.r / SKIN_REF.r, skin.g / SKIN_REF.g, skin.b / SKIN_REF.b);
  const s = o.female ? 0.965 : 1.0; // proportions
  const uniforms = {
    uShirt: { value: new THREE.Color(o.shirt) },
    uAccent: { value: new THREE.Color(o.accent) },
    uShorts: { value: new THREE.Color(o.shorts) },
    uSocks: { value: new THREE.Color(o.socks) },
    uShoes: { value: new THREE.Color(o.shoes) },
    uBand: { value: new THREE.Color(o.band ?? o.accent) },
    uHasBand: { value: o.band ? 1 : 0 },
    uSkinTint: { value: tint },
    uSponsor: { value: sponsorTex },
    uSponsorRow: { value: o.sponsor },
    uFabric: { value: fabric },
    uScale: { value: s },
    uHandX: { value: o.female ? 0.641 : 0.706 },
    uPlain: { value: o.plain ? 1 : 0 },
  };
  m.userData.outfit = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBind;
        uniform float uScale; uniform float uHandX;
        ${instanced ? 'attribute vec3 aShirt; attribute vec3 aShorts; varying vec3 vShirtI; varying vec3 vShortsI;' : ''}
        float puffAmt(vec3 p){
          float y = p.y / uScale; float ax = abs(p.x);
          float shirt = step(0.9, y) * step(y, 1.5) * step(ax, 0.36);
          float shorts = step(0.6, y) * step(y, 1.0) * step(ax, 0.3);
          float shoe = step(y, 0.12);
          return shirt * 0.008 + shorts * (0.012 + 0.02 * smoothstep(0.85, 0.62, y)) + shoe * 0.014;
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBind = position;
        ${instanced ? 'vShirtI = aShirt; vShortsI = aShorts;' : ''}
        transformed += objectNormal * puffAmt(position);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBind;
        ${instanced ? 'varying vec3 vShirtI; varying vec3 vShortsI;' : ''}
        uniform vec3 uShirt, uAccent, uShorts, uSocks, uShoes, uBand, uSkinTint;
        uniform float uHasBand, uSponsorRow, uScale, uHandX, uPlain;
        uniform sampler2D uSponsor, uFabric;
        float band(float v, float a, float b, float f){ return smoothstep(a - f, a + f, v) * (1.0 - smoothstep(b - f, b + f, v)); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 p = vBind; float y = p.y / uScale; float ax = abs(p.x); float f = 0.004;
          vec3 shirtC = ${instanced ? 'vShirtI' : 'uShirt'};
          vec3 shortsC = ${instanced ? 'vShortsI' : 'uShorts'};
          // neckline: lower at the front
          float neck0 = mix(1.52, 1.465, smoothstep(0.0, 0.09, p.z));
          float neck = mix(neck0, 1.7, smoothstep(0.075, 0.115, ax));
          float torso = band(y, 0.905, neck, f) * (1.0 - smoothstep(0.255, 0.265, ax));
          float sleeve = band(y, 1.33, 1.65, f) * band(ax, 0.16, 0.355, f);
          float shirt = max(torso, sleeve);
          float shorts = band(y, 0.64 - 0.04 * smoothstep(0.0, 0.1, p.z), 0.965, f) * (1.0 - smoothstep(0.3, 0.31, ax));
          float socks = band(y, 0.075, mix(0.21, 0.13, uPlain), f) * (1.0 - shirt);
          float shoes = 1.0 - smoothstep(0.105 + 0.03 * smoothstep(0.02, 0.12, p.z), 0.115 + 0.03 * smoothstep(0.02, 0.12, p.z), y);
          float wrist = (1.0 - uPlain) * band(ax, uHandX * 0.86, uHandX * 0.93, 0.003) * step(1.3, y);
          float head = uHasBand * band(y, 1.735, 1.772, 0.003) * step(ax, 0.2);
          // accents: sleeve hem, collar, side seams, shorts side stripe, shoe sole & swoosh
          float hem = sleeve * band(ax, 0.33, 0.355, 0.002);
          float collar = torso * band(y, neck0 - 0.02, neck0, 0.002) * (1.0 - smoothstep(0.07, 0.1, ax));
          float seam = torso * band(ax, 0.235, 0.255, 0.002) * step(abs(p.z), 0.06);
          float sstripe = shorts * band(ax, 0.255, 0.285, 0.002) * step(abs(p.z), 0.05);
          float sole = shoes * (1.0 - smoothstep(0.018, 0.024, y));
          float weave = texture2D(uFabric, p.xy * 18.0).r;
          vec3 cloth = vec3(0.0); float clothA = 0.0;
          vec3 base = diffuseColor.rgb * uSkinTint;
          cloth = mix(cloth, shirtC, shirt); clothA = max(clothA, shirt);
          cloth = mix(cloth, uAccent, max(hem, max(collar, seam)) * (1.0 - uPlain * 0.7));
          cloth = mix(cloth, shortsC, shorts); clothA = max(clothA, shorts);
          cloth = mix(cloth, uAccent, sstripe);
          cloth = mix(cloth, uSocks, socks); clothA = max(clothA, socks);
          cloth = mix(cloth, uShoes, shoes); clothA = max(clothA, shoes);
          cloth = mix(cloth, vec3(0.95), sole);
          cloth = mix(cloth, uBand, max(wrist, head)); clothA = max(clothA, max(wrist, head));
          // chest sponsor logo (player's left chest = +x, front = +z)
          vec2 lp = vec2((p.x - 0.03) / 0.16, (y - (uScale < 0.99 ? 1.39 : 1.29)) / 0.05);
          if (uPlain < 0.5 && p.z > 0.04 && lp.x > 0.0 && lp.x < 1.0 && lp.y > 0.0 && lp.y < 1.0) {
            vec2 uv = vec2(lp.x, 1.0 - (uSponsorRow + 1.0 - lp.y) / 6.0);
            vec4 logo = texture2D(uSponsor, uv);
            float lum = dot(logo.rgb, vec3(0.333));
            cloth = mix(cloth, logo.rgb, shirt * 0.9);
          }
          float shade = 0.82 + 0.3 * weave;
          diffuseColor.rgb = mix(base, cloth * shade * (0.75 + 0.4 * dot(diffuseColor.rgb, vec3(0.6))), clothA);
          vClothAmt = clothA;
        }`)
      .replace('void main() {', 'float vClothAmt = 0.0;\nvoid main() {')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.82, vClothAmt);`)
      .replace('mapN.xy *= normalScale;', `mapN.xy *= normalScale * (1.0 - 0.85 * vClothAmt);
        {
          // woven fabric + soft folds on the clothing
          vec3 fab = texture2D(uFabric, vBind.xy * 7.0 + vBind.z * 2.0).xyz * 2.0 - 1.0;
          float folds = sin(vBind.y * 55.0 + sin(vBind.x * 18.0) * 2.0) * 0.5 + sin(vBind.y * 23.0 - vBind.x * 31.0) * 0.5;
          vec3 clothN = normalize(vec3(fab.xy * 0.55 + vec2(folds * 0.09, folds * 0.05), 1.0));
          mapN = normalize(mix(mapN, clothN, vClothAmt * 0.9));
        }`);
  };
  m.customProgramCacheKey = () => 'outfit' + (instanced ? 'I' : '');
  return m;
}

// ------------------------------------------------------------------ animated athlete
export type AnimName =
  | 'idle' | 'ready' | 'run' | 'sprint' | 'walk' | 'forehand' | 'backhand' | 'smash' | 'volley' | 'serve' | 'dive' | 'dive_up'
  | 'cheer' | 'dance' | 'upset' | 'frustrated' | 'arms_folded' | 'fist_pump' | 'jump' | 'land' | 'sit' | 'sit_talk' | 'talk'
  | 'pickup' | 'point' | 'call' | 'interact' | 'roll';

const LOCO_CYCLE: AnimName[] = ['walk', 'run', 'sprint'];
const NATURAL_SPEED: Record<string, number> = { walk: 1.4, run: 4.0, sprint: 6.4 };

const ONE_SHOT = new Set<AnimName>(['forehand', 'backhand', 'smash', 'volley', 'serve', 'dive', 'dive_up', 'cheer', 'frustrated', 'fist_pump', 'jump', 'land', 'pickup', 'point', 'interact', 'roll']);

export class Athlete {
  root = new THREE.Group();
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions = new Map<AnimName, THREE.AnimationAction>();
  current: AnimName = 'idle';
  oneShot: THREE.AnimationAction | null = null;
  oneShotName: AnimName | null = null;
  racket: THREE.Object3D | null = null;
  racketHead = new THREE.Object3D();
  bones = new Map<string, THREE.Bone>();
  bodyMat: THREE.MeshStandardMaterial | null = null;

  constructor(def: Pick<PlayerDef, 'body' | 'hair' | 'beard' | 'skinTint' | 'hairColor' | 'shirt' | 'shirtAccent' | 'shorts' | 'socks' | 'shoes' | 'headband' | 'sponsor' | 'racket'>, opts: { racket?: boolean; shadow?: boolean } = {}) {
    const src = Assets.g(def.body === 'f' ? 'models/athlete_f.glb' : 'models/athlete_m.glb');
    this.model = SkeletonUtils.clone(src.scene);
    this.root.add(this.model);
    this.model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones.set(o.name, o as THREE.Bone);
    });
    let bodyMesh: THREE.SkinnedMesh | null = null;
    this.model.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      sm.castShadow = opts.shadow !== false;
      sm.frustumCulled = false;
      const mat = sm.material as THREE.MeshStandardMaterial;
      if (/Superhero/i.test(mat.name)) {
        bodyMesh = sm;
        this.bodyMat = makeOutfitMaterial(mat, {
          shirt: def.shirt, accent: def.shirtAccent, shorts: def.shorts, socks: def.socks, shoes: def.shoes, skin: def.skinTint, band: def.headband, sponsor: def.sponsor, female: def.body === 'f',
        });
        sm.material = this.bodyMat;
      } else if (/Hair/i.test(mat.name)) {
        // eyebrows
        const m2 = mat.clone();
        m2.color = new THREE.Color(def.hairColor).multiplyScalar(2.2);
        sm.material = m2;
      }
    });
    const attachHair = (path: string) => {
      const hg = Assets.g(path);
      const hairScene = SkeletonUtils.clone(hg.scene);
      hairScene.traverse((o) => {
        const hm = o as THREE.SkinnedMesh;
        if (!hm.isSkinnedMesh || !bodyMesh) return;
        const bones = hm.skeleton.bones.map((b) => this.bones.get(b.name) ?? b);
        const skel = new THREE.Skeleton(bones, hm.skeleton.boneInverses);
        const mesh = new THREE.SkinnedMesh(hm.geometry, (hm.material as THREE.MeshStandardMaterial).clone());
        const hmat = mesh.material as THREE.MeshStandardMaterial;
        hmat.color = new THREE.Color(def.hairColor).multiplyScalar(2.4);
        hmat.roughness = 0.65;
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        (bodyMesh.parent ?? this.model).add(mesh);
        mesh.bind(skel, bodyMesh.bindMatrix);
      });
    };
    if (def.hair) attachHair(`models/${def.hair}.glb`);
    if (def.beard) attachHair('models/hair_beard.glb');

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of Assets.g('models/anims.glb').animations) {
      const a = this.mixer.clipAction(clip);
      if (ONE_SHOT.has(clip.name as AnimName)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      a.enabled = true;
      a.setEffectiveWeight(0);
      a.play();
      this.actions.set(clip.name as AnimName, a);
    }
    for (const n of LOCO_CYCLE) this.actions.get(n)!.setEffectiveTimeScale(0); // driven by the shared gait phase
    this.weights.set('idle', 1);
    this.spine = ['spine_01', 'spine_02', 'spine_03'].map((n) => this.bones.get(n)!).filter(Boolean);
    this.neck = this.bones.get('neck_01') ?? null;
    this.head = this.bones.get('Head') ?? null;
    this.applyWeights();

    if (opts.racket !== false) {
      const r = Assets.g('models/props/racket.glb').scene.clone(true);
      r.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          if ((m.material as THREE.MeshStandardMaterial).name === 'frame') {
            const mm = (m.material as THREE.MeshStandardMaterial).clone();
            mm.color = new THREE.Color(def.racket);
            m.material = mm;
          }
        }
      });
      r.rotation.set(Math.PI / 2, Math.PI / 2, 0); // handle across the fist (knuckle line = hand +z), face normal = palm normal
      r.position.set(-0.02, 0.075, -0.07);
      r.scale.setScalar(1.05);
      this.racketHead.position.set(0, 0.5, 0);
      r.add(this.racketHead);
      this.bones.get('hand_r')?.add(r);
      this.racket = r;
    }
    // two-handed backhand: mirrored forehand + right hand on the grip (built once, shared)
    if (this.racket) {
      const fh = this.actions.get('forehand')!.getClip();
      if (!Athlete.bh) {
        const clip = mirrorClip(fh, this.model, 'backhand2h');
        const path = sampleMirroredRacket(this.model, fh, this.racket, this.racketHead);
        Athlete.bh = { clip, ...path };
      }
      const old = this.actions.get('backhand')!;
      old.stop();
      const a = this.mixer.clipAction(Athlete.bh.clip);
      a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.enabled = true; a.setEffectiveWeight(0); a.play();
      this.actions.set('backhand', a);
    }
  }

  static bh: BackhandData | null = null;

  /** Right hand joins the left on the grip and the racket follows the mirrored forehand path. */
  private applyTwoHand(t: number, w: number) {
    const bh = Athlete.bh;
    const ua = this.bones.get('upperarm_r'), la = this.bones.get('lowerarm_r'), hr = this.bones.get('hand_r'), hl = this.bones.get('hand_l');
    if (!bh || !ua || !la || !hr || !hl || !this.racket || w < 0.01) return;
    const i = THREE.MathUtils.clamp(Math.round(t * bh.fps), 0, bh.dir.length - 1);
    this.model.updateMatrixWorld(true);
    const mq = this.model.getWorldQuaternion(new THREE.Quaternion());
    const d = bh.dir[i].clone().applyQuaternion(mq).normalize();
    const n0 = bh.normal[i].clone().applyQuaternion(mq);
    const target = hl.getWorldPosition(new THREE.Vector3()).addScaledVector(d, -0.1);
    const pole = la.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.6, 0));
    twoBoneIK(ua, la, hr, target, pole, w);
    const z = n0.sub(d.clone().multiplyScalar(n0.dot(d))).normalize();
    const x = new THREE.Vector3().crossVectors(d, z);
    const qr = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, d, z));
    const handQ = qr.multiply(this.racket.quaternion.clone().invert());
    setWorldQuat(hr, handQ, w);
  }

  // ================================================================== animation system
  // Base layer: either a smooth locomotion blend (idle/ready -> walk -> run -> sprint, phase-synchronised so feet
  // never pop) or a named loop.  One-shot layer (swings, celebrations) fades over it with its own envelope.
  // Procedural layer on top: chest twist toward the net, head tracking the ball, lean into acceleration.
  private weights = new Map<AnimName, number>();
  private base: 'loco' | AnimName = 'idle';
  private baseFade = 6;
  private locoSpeed = 0;
  private locoReady = false;
  private gaitPhase = 0;
  private shotW = 0;
  private shotFadeIn = 0.1;
  private shotFadeOut = 0.2;
  private shotReleasing = false;
  private spine: THREE.Bone[] = [];
  private neck: THREE.Bone | null = null;
  private head: THREE.Bone | null = null;
  /** World point the head should look at (ball, opponent, camera); null = straight ahead. */
  lookAt: THREE.Vector3 | null = null;
  /** World yaw the chest should face (e.g. the net) while the legs follow the root; null = no twist. */
  chestYaw: number | null = null;
  /** Acceleration in world space (m/s^2) for body lean. */
  accel = new THREE.Vector3();
  private twist = 0;
  private headYaw = 0;
  private headPitch = 0;
  private leanFwd = 0;
  private leanSide = 0;
  procedural = true;

  play(name: AnimName, opts: { fade?: number; speed?: number; from?: number } = {}) {
    const a = this.actions.get(name);
    if (!a) return;
    const fade = Math.max(0.02, opts.fade ?? 0.15);
    if (ONE_SHOT.has(name)) {
      if (this.oneShot && this.oneShot !== a) {
        // hand the old shot's weight to the new one so there is no pose pop
        this.oneShot.setEffectiveWeight(0);
      }
      a.reset();
      a.play();
      a.setEffectiveTimeScale(opts.speed ?? 1);
      if (opts.from) a.time = opts.from;
      this.oneShot = a;
      this.oneShotName = name;
      this.shotFadeIn = fade;
      this.shotReleasing = false;
      if (opts.fade === 0) this.shotW = 1;
      this.applyWeights();
      return;
    }
    if (this.base !== name) {
      if (opts.fade === 0) { for (const k of this.weights.keys()) this.weights.set(k, 0); this.weights.set(name, 1); }
      const act = this.actions.get(name)!;
      if (!LOCO_CYCLE.includes(name)) { act.setEffectiveTimeScale(opts.speed ?? 1); if ((this.weights.get(name) ?? 0) < 0.05) act.time = opts.from ?? 0; }
    }
    this.base = name;
    this.current = name;
    this.baseFade = 1 / fade;
    if (this.oneShot && !this.shotReleasing) this.releaseOneShot(fade);
    if (opts.fade === 0) this.applyWeights();
  }

  /** Drive the locomotion blend by ground speed (m/s). `ready` = split-step stance instead of a relaxed idle. */
  setLoco(speed: number, ready: boolean) {
    this.base = 'loco';
    this.locoSpeed = speed;
    this.locoReady = ready;
    this.current = speed > 4.4 ? 'sprint' : speed > 1.5 ? 'run' : speed > 0.3 ? 'walk' : ready ? 'ready' : 'idle';
    this.baseFade = 7;
  }

  /** @deprecated kept for callers that set gait speed explicitly */
  setLocoSpeed(_speed: number) { /* gait rate now derives from setLoco */ }

  oneShotDone(): boolean {
    if (!this.oneShot) return true;
    return this.oneShot.time >= this.oneShot.getClip().duration - 0.001 || !this.oneShot.isRunning();
  }

  /** Time left until the one-shot clip ends (s). */
  oneShotRemaining(): number {
    if (!this.oneShot) return 0;
    return Math.max(0, (this.oneShot.getClip().duration - this.oneShot.time) / Math.max(0.01, this.oneShot.getEffectiveTimeScale()));
  }

  releaseOneShot(fade = 0.2) {
    if (!this.oneShot) return;
    this.shotReleasing = true;
    this.shotFadeOut = Math.max(0.02, fade);
  }

  private baseTargets(): Map<AnimName, number> {
    const t = new Map<AnimName, number>();
    if (this.base !== 'loco') { t.set(this.base, 1); return t; }
    const s = this.locoSpeed;
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const tri = (x: number, a: number, b: number, c: number) => (x <= a || x >= c ? 0 : x < b ? (x - a) / (b - a) : (c - x) / (c - b));
    const still = clamp01(1 - s / 0.6);
    const walk = s < 1.0 ? clamp01((s - 0.15) / 0.6) * (1 - clamp01((s - 1.0) / 1.0)) : tri(s, 0.3, 1.0, 2.2);
    const run = s < 3.6 ? clamp01((s - 1.2) / 2.0) : 1 - clamp01((s - 4.3) / 1.4);
    const sprint = clamp01((s - 4.3) / 1.4);
    const sum = still + walk + run + sprint || 1;
    t.set(this.locoReady ? 'ready' : 'idle', still / sum);
    t.set('walk', walk / sum);
    t.set('run', run / sum);
    t.set('sprint', sprint / sum);
    return t;
  }

  private applyWeights() {
    const shot = this.oneShot ? this.shotW : 0;
    for (const [n, a] of this.actions) {
      if (a === this.oneShot) { a.setEffectiveWeight(shot); continue; }
      a.setEffectiveWeight((this.weights.get(n) ?? 0) * (1 - shot));
    }
  }

  update(dt: number) {
    // one-shot envelope
    if (this.oneShot) {
      if (this.shotReleasing) {
        this.shotW -= dt / this.shotFadeOut;
        if (this.shotW <= 0) { this.shotW = 0; this.oneShot.setEffectiveWeight(0); this.oneShot = null; this.oneShotName = null; this.shotReleasing = false; }
      } else this.shotW = Math.min(1, this.shotW + dt / this.shotFadeIn);
    } else this.shotW = 0;
    // base layer weights move smoothly toward their targets
    const targets = this.baseTargets();
    const k = 1 - Math.exp(-dt * this.baseFade * 1.6);
    let sum = 0;
    for (const n of new Set([...this.weights.keys(), ...targets.keys()])) {
      const w = THREE.MathUtils.lerp(this.weights.get(n) ?? 0, targets.get(n) ?? 0, k);
      if (w < 0.002 && !targets.get(n)) this.weights.delete(n); else { this.weights.set(n, w); sum += w; }
    }
    if (sum > 0) for (const [n, w] of this.weights) this.weights.set(n, w / sum);
    // gait phase shared by walk/run/sprint: blend cycle length and playback rate by weight
    let cyc = 0, nat = 0, mw = 0;
    for (const n of LOCO_CYCLE) {
      const w = this.weights.get(n) ?? 0;
      if (!w) continue;
      cyc += w * this.actions.get(n)!.getClip().duration;
      nat += w * NATURAL_SPEED[n];
      mw += w;
    }
    if (mw > 0.001) {
      cyc /= mw; nat /= mw;
      const rate = THREE.MathUtils.clamp(this.base === 'loco' ? Math.max(this.locoSpeed, 0.4) / nat : 1, 0.55, 1.7);
      this.gaitPhase = (this.gaitPhase + (dt * rate) / cyc) % 1;
      for (const n of LOCO_CYCLE) { const a = this.actions.get(n)!; a.time = this.gaitPhase * a.getClip().duration; }
    }
    this.applyWeights();
    this.mixer.update(dt);
    if (this.procedural) this.applyProcedural(dt, false);
    if (this.oneShotName === 'backhand' && this.oneShot) this.applyTwoHand(this.oneShot.time, this.shotW);
  }

  // ------------------------------------------------------------------ procedural layer
  private static tmpQ = new THREE.Quaternion();
  private static tmpQ2 = new THREE.Quaternion();
  private static tmpV = new THREE.Vector3();
  private static UP = new THREE.Vector3(0, 1, 0);

  /** Rotate a bone about a world-space axis, preserving its parent chain. */
  private rotateWorld(bone: THREE.Bone, axis: THREE.Vector3, angle: number) {
    if (Math.abs(angle) < 1e-5) return;
    const parent = bone.parent!;
    parent.updateWorldMatrix(true, false);
    bone.updateWorldMatrix(false, false);
    const world = bone.getWorldQuaternion(Athlete.tmpQ);
    const rot = Athlete.tmpQ2.setFromAxisAngle(axis, angle);
    world.premultiply(rot);
    const parentWorld = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(parentWorld.multiply(world));
    bone.updateMatrixWorld(true);
  }

  private applyProcedural(dt: number, snap: boolean) {
    if (!this.spine.length) return;
    const k = snap ? 1 : 1 - Math.exp(-dt * 10);
    const shotDamp = 1 - this.shotW * 0.85; // swings own the upper body
    this.root.updateMatrixWorld(true);
    // chest twist toward chestYaw
    let twistT = 0;
    if (this.chestYaw !== null) {
      let d = this.chestYaw - this.root.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      twistT = THREE.MathUtils.clamp(d, -1.15, 1.15) * shotDamp;
    }
    this.twist = THREE.MathUtils.lerp(this.twist, twistT, k);
    // lean into acceleration (local frame)
    const yaw = this.root.rotation.y;
    const fwd = Math.sin(yaw) * this.accel.x + Math.cos(yaw) * this.accel.z;
    const side = Math.cos(yaw) * this.accel.x - Math.sin(yaw) * this.accel.z;
    this.leanFwd = THREE.MathUtils.lerp(this.leanFwd, THREE.MathUtils.clamp(fwd * 0.018, -0.16, 0.2), k * 0.6);
    this.leanSide = THREE.MathUtils.lerp(this.leanSide, THREE.MathUtils.clamp(side * 0.014, -0.14, 0.14), k * 0.6);
    this.model.rotation.set(this.leanFwd, 0, -this.leanSide);
    this.model.updateMatrixWorld(true);
    const share = [0.3, 0.3, 0.25];
    this.spine.forEach((b, i) => this.rotateWorld(b, Athlete.UP, this.twist * share[i]));
    if (this.neck) this.rotateWorld(this.neck, Athlete.UP, this.twist * 0.15);
    // head look-at
    let hy = 0, hp = 0;
    if (this.lookAt && this.head) {
      const hpos = this.head.getWorldPosition(Athlete.tmpV.set(0, 0, 0));
      const dx = this.lookAt.x - hpos.x, dy = this.lookAt.y - hpos.y, dz = this.lookAt.z - hpos.z;
      const faceYaw = yaw + this.twist;
      let d = Math.atan2(dx, dz) - faceYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      hy = THREE.MathUtils.clamp(d, -1.25, 1.25) * shotDamp;
      hp = THREE.MathUtils.clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.6, 0.5) * shotDamp;
    }
    this.headYaw = THREE.MathUtils.lerp(this.headYaw, hy, snap ? 1 : 1 - Math.exp(-dt * 7));
    this.headPitch = THREE.MathUtils.lerp(this.headPitch, hp, snap ? 1 : 1 - Math.exp(-dt * 7));
    if (this.neck) this.rotateWorld(this.neck, Athlete.UP, this.headYaw * 0.4);
    if (this.head) {
      this.rotateWorld(this.head, Athlete.UP, this.headYaw * 0.6);
      const right = Athlete.tmpV.set(Math.cos(yaw + this.twist + this.headYaw), 0, -Math.sin(yaw + this.twist + this.headYaw));
      this.rotateWorld(this.head, right.clone(), -this.headPitch * 0.7);
    }
  }

  racketHeadWorld(out = new THREE.Vector3()) {
    return this.racketHead.getWorldPosition(out);
  }

  /** Snapshot for replays. */
  snapshot() {
    const acts: [string, number, number][] = [];
    for (const [n, a] of this.actions) { const w = a.getEffectiveWeight(); if (w > 0.005) acts.push([n, a.time, w]); }
    return {
      x: this.root.position.x, y: this.root.position.y, z: this.root.position.z, ry: this.root.rotation.y,
      acts, twist: this.twist, hy: this.headYaw, hp: this.headPitch, lf: this.leanFwd, ls: this.leanSide,
    };
  }

  applySnapshot(s: ReturnType<Athlete['snapshot']>) {
    this.root.position.set(s.x, s.y, s.z);
    this.root.rotation.y = s.ry;
    const on = new Map(s.acts.map(([n, t, w]) => [n, { t, w }]));
    for (const [n, a] of this.actions) {
      const st = on.get(n);
      a.setEffectiveTimeScale(0);
      if (st) { a.time = st.t; a.setEffectiveWeight(st.w); } else a.setEffectiveWeight(0);
    }
    this.mixer.update(0);
    this.twist = s.twist; this.headYaw = s.hy; this.headPitch = s.hp; this.leanFwd = s.lf; this.leanSide = s.ls;
    const save = { lookAt: this.lookAt, chestYaw: this.chestYaw };
    this.lookAt = null; this.chestYaw = null;
    // re-apply stored procedural angles exactly
    this.model.rotation.set(this.leanFwd, 0, -this.leanSide);
    this.root.updateMatrixWorld(true);
    const share = [0.3, 0.3, 0.25];
    this.spine.forEach((b, i) => this.rotateWorld(b, Athlete.UP, this.twist * share[i]));
    if (this.neck) this.rotateWorld(this.neck, Athlete.UP, this.twist * 0.15 + this.headYaw * 0.4);
    if (this.head) this.rotateWorld(this.head, Athlete.UP, this.headYaw * 0.6);
    this.lookAt = save.lookAt; this.chestYaw = save.chestYaw;
    const bhAct = s.acts.find(([n]) => n === 'backhand');
    if (bhAct) this.applyTwoHand(bhAct[1], bhAct[2]);
  }

  restoreFromReplay() {
    for (const [n, a] of this.actions) a.setEffectiveTimeScale(LOCO_CYCLE.includes(n) ? 0 : 1);
    if (this.oneShot) { this.oneShot.setEffectiveWeight(0); this.oneShot = null; this.oneShotName = null; }
    this.shotW = 0;
    this.applyWeights();
  }
}
