import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Assets } from '../core/assets';
import { makeOutfitMaterial } from '../game/athlete';

// Spectators: real character meshes (low-poly variant of the athlete models) posed with real animation frames,
// baked once to static geometry and drawn with instancing.  A vertex shader adds idle sway, clapping bounce and
// standing ovations driven by the match excitement level.

const SHIRTS = ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557', '#ffb703', '#fb8500', '#2a9d8f', '#e9c46a', '#264653', '#ffffff', '#8338ec', '#3a86ff', '#ff006e', '#06d6a0', '#d62828', '#f4a261', '#adb5bd'];
const PANTS = ['#1d3557', '#2b2d42', '#6c757d', '#e9ecef', '#3d405b', '#5e503f', '#0b090a'];
const SKINS = ['#f2d0b5', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0673e'];

export interface Seat { pos: THREE.Vector3; ry: number; }

function bakePose(gltfPath: string, clip: string, t: number): { geom: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial } {
  const src = Assets.g(gltfPath);
  const model = SkeletonUtils.clone(src.scene);
  const mixer = new THREE.AnimationMixer(model);
  const c = Assets.g('models/anims.glb').animations.find((a) => a.name === clip)!;
  const act = mixer.clipAction(c);
  act.play();
  mixer.setTime(t * c.duration);
  model.updateMatrixWorld(true);
  let out: THREE.BufferGeometry | null = null;
  let mat: THREE.MeshStandardMaterial | null = null;
  model.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh || out) return;
    sm.skeleton.update();
    const g = sm.geometry.clone();
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    void nrm;
    const bind = new Float32Array(pos.count * 3);
    const posed = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      bind.set([v.x, v.y, v.z], i * 3);
      sm.applyBoneTransform(i, v);
      v.applyMatrix4(sm.matrixWorld);
      posed.set([v.x, v.y, v.z], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(posed, 3));
    g.deleteAttribute('color');
    // recompute normals from posed mesh
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    g.computeVertexNormals();
    // keep bind-pose position for the outfit shader (it reads `position` as bind pose; give it a separate attribute)
    g.setAttribute('aBind', new THREE.BufferAttribute(bind, 3));
    out = g;
    mat = sm.material as THREE.MeshStandardMaterial;
  });
  return { geom: out!, mat: mat! };
}

export class Crowd {
  group = new THREE.Group();
  private meshes: THREE.InstancedMesh[] = [];
  private uniforms = { uTime: { value: 0 }, uExcite: { value: 0 }, uStand: { value: 0 }, uWave: { value: -100 } };
  excitement = 0;
  standing = 0;

  constructor(seats: Seat[], density = 0.85) {
    const poses = [
      bakePose('models/crowd_m.glb', 'sit', 0.2),
      bakePose('models/crowd_f.glb', 'sit', 0.6),
      bakePose('models/crowd_m.glb', 'sit_talk', 0.35),
      bakePose('models/crowd_f.glb', 'sit_talk', 0.7),
    ];
    const used = seats.filter(() => Math.random() < density);
    const buckets: Seat[][] = poses.map(() => []);
    used.forEach((s, i) => buckets[(i * 7 + Math.floor(Math.random() * 4)) % poses.length].push(s));
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    poses.forEach((p, pi) => {
      const seatsB = buckets[pi];
      if (!seatsB.length) return;
      const female = pi % 2 === 1;
      const mat = makeOutfitMaterial(p.mat, { shirt: '#fff', accent: '#e8e8e8', shorts: '#333', socks: '#ddd', shoes: '#2a2a2a', skin: '#d9a27a', sponsor: 0, female, plain: true }, true);
      // crowd: no shoes/socks accents needed; patch the vertex shader so the outfit uses aBind and adds motion
      mat.vertexColors = false;
      const prev = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, r) => {
        prev.call(mat, shader, r);
        Object.assign(shader.uniforms, this.uniforms);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
            attribute vec3 aBind; attribute float aPhase; attribute vec3 aSkin;
            uniform float uTime, uExcite, uStand, uWave; varying vec3 vSkinI;`)
          .replace('vBind = position;', 'vBind = aBind; vSkinI = aSkin;')
          .replace('transformed += objectNormal * puffAmt(position);', `transformed += objectNormal * puffAmt(aBind);
            {
              float ph = aPhase * 6.2831;
              float upper = smoothstep(0.75, 1.3, transformed.y);
              float sway = sin(uTime * (0.8 + aPhase) + ph) * 0.03 * upper;
              transformed.x += sway;
              // clapping / bouncing when excited
              float bounce = max(0.0, sin(uTime * 9.0 + ph * 3.0)) * 0.05 * uExcite;
              transformed.y += bounce * upper;
              // arms raise when cheering: lift points far from the body centre line
              float arm = smoothstep(0.25, 0.55, abs(aBind.x)) * smoothstep(1.2, 1.4, aBind.y);
              transformed.y += arm * uExcite * (0.25 + 0.2 * sin(uTime * 7.0 + ph));
              // standing ovation and mexican wave
              float waveAmt = exp(-pow((instanceMatrix[3].x - uWave) * 0.15, 2.0));
              float st = clamp(uStand * step(0.35, fract(aPhase * 7.31)) + waveAmt, 0.0, 1.0);
              transformed.y += st * 0.45 * smoothstep(0.3, 0.9, transformed.y);
              transformed.y += arm * waveAmt * 0.5;
            }`);
        shader.fragmentShader = shader.fragmentShader
          .replace('varying vec3 vBind;', 'varying vec3 vBind; varying vec3 vSkinI;')
          .replace('vec3 base = diffuseColor.rgb * uSkinTint;', 'vec3 base = diffuseColor.rgb * vSkinI;');
      };
      mat.customProgramCacheKey = () => 'crowd';
      const geom = p.geom;
      const n = seatsB.length;
      const shirt = new Float32Array(n * 3), shorts = new Float32Array(n * 3), skin = new Float32Array(n * 3), phase = new Float32Array(n);
      const c = new THREE.Color();
      const ref = new THREE.Color('#d9a27a');
      const im = new THREE.InstancedMesh(geom, mat, n);
      seatsB.forEach((s, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.ry + (Math.random() - 0.5) * 0.4);
        const sc = 0.93 + Math.random() * 0.12;
        m4.compose(s.pos, q, new THREE.Vector3(sc, sc, sc));
        im.setMatrixAt(i, m4);
        c.set(SHIRTS[(Math.random() * SHIRTS.length) | 0]).toArray(shirt, i * 3);
        c.set(PANTS[(Math.random() * PANTS.length) | 0]).toArray(shorts, i * 3);
        const sk = new THREE.Color(SKINS[(Math.random() * SKINS.length) | 0]);
        skin.set([sk.r / ref.r, sk.g / ref.g, sk.b / ref.b], i * 3);
        phase[i] = Math.random();
      });
      geom.setAttribute('aShirt', new THREE.InstancedBufferAttribute(shirt, 3));
      geom.setAttribute('aShorts', new THREE.InstancedBufferAttribute(shorts, 3));
      geom.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 3));
      geom.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = false;
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.meshes.push(im);
      this.group.add(im);
    });
  }

  private waveT = -1;
  startWave() { this.waveT = 0; }

  update(dt: number, t: number) {
    this.uniforms.uTime.value = t;
    this.excitement = Math.max(0, this.excitement - dt * 0.35);
    this.uniforms.uExcite.value = THREE.MathUtils.lerp(this.uniforms.uExcite.value, Math.min(1, this.excitement), Math.min(1, dt * 6));
    this.uniforms.uStand.value = THREE.MathUtils.lerp(this.uniforms.uStand.value, this.standing, Math.min(1, dt * 3));
    if (this.waveT >= 0) {
      this.waveT += dt;
      this.uniforms.uWave.value = -40 + this.waveT * 18;
      if (this.waveT > 5) { this.waveT = -1; this.uniforms.uWave.value = -100; }
    }
  }
}
