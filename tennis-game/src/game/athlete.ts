import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Assets } from '../core/assets';
import type { PlayerDef } from '../data/content';

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
      .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * (1.0 - 0.8 * vClothAmt);');
  };
  m.customProgramCacheKey = () => 'outfit' + (instanced ? 'I' : '');
  return m;
}

// ------------------------------------------------------------------ animated athlete
export type AnimName =
  | 'idle' | 'ready' | 'run' | 'sprint' | 'walk' | 'forehand' | 'backhand' | 'smash' | 'volley' | 'serve' | 'dive' | 'dive_up'
  | 'cheer' | 'dance' | 'upset' | 'frustrated' | 'arms_folded' | 'fist_pump' | 'jump' | 'land' | 'sit' | 'sit_talk' | 'talk'
  | 'pickup' | 'point' | 'call' | 'interact' | 'roll';

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
      this.actions.set(clip.name as AnimName, a);
    }
    this.actions.get('idle')!.play();

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
      r.rotation.set(0, 0, Math.PI / 2 + 0.25);
      r.position.set(-0.02, 0.07, 0.0);
      r.scale.setScalar(1.05);
      this.racketHead.position.set(0, 0.5, 0);
      r.add(this.racketHead);
      this.bones.get('hand_r')?.add(r);
      this.racket = r;
    }
  }

  play(name: AnimName, opts: { fade?: number; speed?: number; from?: number } = {}) {
    const a = this.actions.get(name);
    if (!a) return;
    const fade = opts.fade ?? 0.15;
    if (ONE_SHOT.has(name)) {
      if (this.oneShot && this.oneShot !== a) this.oneShot.fadeOut(fade);
      a.reset();
      a.setEffectiveTimeScale(opts.speed ?? 1);
      a.setEffectiveWeight(1);
      if (opts.from) a.time = opts.from;
      a.fadeIn(fade).play();
      this.oneShot = a;
      this.oneShotName = name;
      return;
    }
    if (this.current === name && !this.oneShot) {
      a.setEffectiveTimeScale(opts.speed ?? 1);
      return;
    }
    const prev = this.actions.get(this.current)!;
    a.reset().setEffectiveTimeScale(opts.speed ?? 1).setEffectiveWeight(1).play();
    prev.crossFadeTo(a, fade, false);
    if (this.oneShot) { this.oneShot.fadeOut(fade); this.oneShot = null; this.oneShotName = null; }
    this.current = name;
  }

  setLocoSpeed(speed: number) {
    const a = this.actions.get(this.current);
    if (a) a.setEffectiveTimeScale(speed);
  }

  oneShotDone(): boolean {
    if (!this.oneShot) return true;
    return this.oneShot.time >= this.oneShot.getClip().duration - 0.001 || !this.oneShot.isRunning();
  }

  releaseOneShot(fade = 0.2) {
    if (this.oneShot) { this.oneShot.fadeOut(fade); this.oneShot = null; this.oneShotName = null; }
    const loco = this.actions.get(this.current)!;
    loco.enabled = true;
    loco.setEffectiveWeight(1);
    if (!loco.isRunning()) loco.play();
  }

  update(dt: number) {
    this.mixer.update(dt);
    if (this.oneShot && this.oneShotDone() && this.oneShot.clampWhenFinished) {
      // keep final pose until caller releases
    }
  }

  racketHeadWorld(out = new THREE.Vector3()) {
    return this.racketHead.getWorldPosition(out);
  }

  /** Snapshot for replays. */
  snapshot() {
    return {
      x: this.root.position.x, y: this.root.position.y, z: this.root.position.z, ry: this.root.rotation.y,
      loco: this.current, locoT: this.actions.get(this.current)!.time,
      shot: this.oneShotName, shotT: this.oneShot ? this.oneShot.time : 0, shotW: this.oneShot ? this.oneShot.getEffectiveWeight() : 0,
    };
  }

  applySnapshot(s: ReturnType<Athlete['snapshot']>) {
    this.root.position.set(s.x, s.y, s.z);
    this.root.rotation.y = s.ry;
    for (const [n, a] of this.actions) {
      if (n === s.loco) { a.enabled = true; a.play(); a.time = s.locoT; a.setEffectiveWeight(1 - s.shotW); a.setEffectiveTimeScale(0); }
      else if (n === s.shot) { a.enabled = true; a.play(); a.time = s.shotT; a.setEffectiveWeight(s.shotW); a.setEffectiveTimeScale(0); }
      else { a.setEffectiveWeight(0); }
    }
    this.mixer.update(0);
  }

  restoreFromReplay() {
    for (const [n, a] of this.actions) {
      a.setEffectiveTimeScale(1);
      if (n === this.current) { a.setEffectiveWeight(1); a.play(); } else { a.stop(); }
    }
    this.oneShot = null;
    this.oneShotName = null;
  }
}
