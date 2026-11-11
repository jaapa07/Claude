import * as THREE from 'three';
import { City } from '../scenes/City.js';
import { Neo } from '../characters/Neo.js';
import { Sky } from '../effects/Sky.js';
import { GiantEye } from '../effects/Eye.js';
import { Crystal, Shockwave } from '../effects/Crystal.js';
import { CubeDebris } from '../effects/Debris.js';
import { MorphPoints } from '../effects/Particles.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, rng } from '../core/util.js';
import { drawHud } from '../overlay/Overlay.js';

// ─── shared continuity anchors (episode 2 starts from these exact values) ───
export const EYE_POS = new THREE.Vector3(0, 300, -360);
export const CRYSTAL_POS = new THREE.Vector3(0.28, 0.62, -7.7);
export const NEO_END = { x: 0, z: -7.05 };
export const CAM_END = { x: 0.35, y: 0.16, z: -6.05, tx: 0, ty: 300, tz: -360, fov: 62, roll: 0 };
export const TOUCH_T = 11.0;

// NEO's walk along the street (distance drives the step phase → feet never slide)
export const neoZ = (t) => keys(t, [[3.6, 0.6], [7.6, -4.6], [8.4, -4.6], [10.1, -7.05]], (x) => x);
export const STEP_PER_M = 3.4;

export function cityFrameState(city, t) {
  city.setTime(t);
}

export default {
  number: 1, title: 'O DESPERTAR', duration: 20,
  build({ renderer }) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060b16, 0.0085);
    const sky = new Sky({ top: 0x01030a, horizon: 0x0a1630, bottom: 0x020306, nebula: 0x24104a });
    scene.add(sky.mesh);
    const city = new City({ renderer });
    scene.add(city.group); scene.environment = city.env; scene.environmentIntensity = 0.28;
    const neo = new Neo(); neo.group.rotation.y = Math.PI; scene.add(neo.group);
    const crystal = new Crystal(); scene.add(crystal.group);
    const wave = new Shockwave({ color: 0xb070ff }); scene.add(wave.mesh); wave.mesh.position.copy(CRYSTAL_POS);
    const eye = new GiantEye(); eye.mesh.position.copy(EYE_POS); eye.mesh.lookAt(0, 0, 0); scene.add(eye.mesh);
    // glow under the rubble + wisps
    const purple = new THREE.PointLight(0xa040ff, 0, 8, 2); purple.position.set(0.2, 0.25, -7.8); scene.add(purple);
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x252b38, roughness: 0.95, flatShading: true });
    const pile = new THREE.Group(); const pr = rng(42);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + pr() * 0.28, 0), rubbleMat);
      const a = pr() * Math.PI * 2, d = pr() * 1.1; m.position.set(0.2 + Math.cos(a) * d, 0.08 + pr() * 0.15, -8.1 + Math.sin(a) * d * 0.8);
      m.rotation.set(pr() * 3, pr() * 3, pr() * 3); m.castShadow = m.receiveShadow = true; pile.add(m);
    }
    scene.add(pile);
    const wisps = new MorphPoints({
      count: 900, seed: 9, size: 0.035, color: 0xb050ff, color2: 0xffb0ff, span: 0.5,
      start: (i, r) => [0.2 + (r() - 0.5) * 1.6, 0.05, -8.0 + (r() - 0.5) * 1.2],
      target: (i, r) => { const a = r() * 6.283, R = 0.1 + r() * 0.9; return [CRYSTAL_POS.x + Math.cos(a) * R, 0.1 + r() * 1.4, CRYSTAL_POS.z + Math.sin(a) * R]; },
      delay: (i, r) => r() * 0.5, drift: 0.25,
    });
    scene.add(wisps.points);
    // frozen debris: chunks falling from a broken façade, stopped mid-air by the time-freeze
    const fall = new CubeDebris({ count: 160, size: 0.5, color: 0x2a3142, emissive: 0x112244, emissiveIntensity: 0.3, seed: 12 });
    fall.emitBox({ n: 160, box: [-9, 26, -12, 3, 6, 4], t0: 8.6, t1: 10.6, vel: [1.2, 0, 0], spread: 2, gravity: [0, -9.8, 0], spin: 2, life: 4, order: 'random' });
    scene.add(fall.mesh);
    // buildings → cubes, sucked up into the broken sky
    const cubes = new CubeDebris({ count: 4200, size: 1.1, color: 0x1d2638, emissive: 0x2a6dff, emissiveIntensity: 1.2, seed: 21 });
    const dissolving = city.buildings.filter((b) => b.z < -14 || (b.far && b.z < 0));
    const dr = rng(5);
    dissolving.forEach((b) => { b.dStart = 13.0 + dr() * 2.0; b.dRate = 6 + dr() * 10; });
    for (const b of dissolving) {
      cubes.emitBox({ n: Math.min(b.far ? 20 : 45, Math.floor(b.h)), box: [b.x, b.h * 0.65, b.z, b.w, b.h * 0.7, b.d], t0: b.dStart, t1: b.dStart + 3.2, vel: [0, 4, 0], spread: 5, gravity: [0, 9, 0], spin: 2.5, life: 4.2, order: 'top' });
    }
    scene.add(cubes.mesh);

    // ─── camera (GSAP timeline, paused & seeked) ───
    const rig = new CameraRig({ x: 18, y: 95, z: 70, tx: 0, ty: 0, tz: -60, fov: 48, roll: 0.15 });
    rig.to(0, 4.4, { x: 3.2, y: 1.6, z: 5.5, tx: 0, ty: 0.6, tz: -4, fov: 42, roll: 0 }, 'power3.inOut')   // dive between buildings
      .to(4.4, 3.4, { x: 1.6, y: 0.75, z: -1.8, tx: 0, ty: 0.35, tz: -8, fov: 38 }, 'sine.inOut')             // follow NEO
      .to(7.5, 0.9, { x: 0.95, y: 0.82, z: -9.6, tx: 0, ty: 0.4, tz: -5.0, fov: 30 }, 'power3.inOut')          // reverse: crystal foreground, NEO face
      .to(8.4, 1.0, { x: 0.8, y: 0.78, z: -9.4, fov: 26 }, 'sine.inOut')
      .set(9.4, { x: -0.4, y: 0.82, z: -5.4, tx: 0.25, ty: 0.5, tz: -7.7, fov: 38 })              // cut: over the shoulder
      .to(9.4, 1.6, { x: -0.3, y: 0.8, z: -5.6, fov: 34 }, 'sine.inOut')     // over shoulder: touch
      .to(TOUCH_T + 0.1, 2.6, { x: -6, y: 3.2, z: -0.5, tx: 0, ty: 1.2, tz: -8, fov: 46 }, 'power2.out')     // pull back with the wave
      .to(13.6, 3.4, { x: -2.2, y: 0.5, z: -3.6, tx: 4, ty: 22, tz: -30, fov: 58, roll: -0.06 }, 'sine.inOut')  // low angle, sky breaking
      .to(17.0, 3.0, { ...CAM_END }, 'power2.inOut')
      .to(TOUCH_T, 0.05, { shake: 0.06 }, 'none').to(TOUCH_T + 0.05, 1.2, { shake: 0 }, 'power2.out')
      .to(13.2, 1, { shake: 0.04 }, 'none').to(16.5, 1, { shake: 0.0 }, 'none')
      .to(18.7, 0.05, { shake: 0.03 }, 'none').to(18.75, 1.2, { shake: 0.0 }, 'none');
    rig.prime(20);

    let screen = new THREE.Vector3(); const cam = rig.camera;

    function update(t) {
      // world clock freezes at the touch (dust & debris hang in the air)
      const freezeK = smooth(TOUCH_T, TOUCH_T + 0.6, t) * (1 - smooth(13.0, 15.5, t) * 0.55);
      const wt = t < TOUCH_T ? t : TOUCH_T + (t - TOUCH_T) * 0.02;
      city.setTime(wt);
      city.dust.uniforms.uTime.value = wt;
      // 0–4 s: materialise from particles
      const pk = range(t, 0.1, 3.4);
      city.particles.set(pk, t, 1 - smooth(3.6, 5.5, t));
      city.setReveal(range(t, 1.3, 4.6), 1 - smooth(4.5, 6, t));
      city.shared.uLit.value = 0.5 + 0.4 * smooth(2.5, 4, t);
      city.groundUniforms.uCrack.value = pulse(t, TOUCH_T, 16, 0.3) * 0.6;
      // NEO
      const z = neoZ(t), dist = 0.6 - z;
      const moving = (t > 3.6 && t < 7.6) || (t > 8.4 && t < 10.1);
      const walk = moving ? smooth(3.6, 4.0, t) * (1 - smooth(7.2, 7.6, t)) + smooth(8.4, 8.7, t) * (1 - smooth(9.8, 10.1, t)) : 0;
      neo.group.position.set(0, 0, z);
      neo.group.rotation.y = Math.PI + 0.25 * pulse(t, 7.4, 8.7, 0.4);
      const lookUp = keys(t, [[7.5, 0], [8.0, 0.2], [9.2, 0.55], [10.0, 0.25], [11.0, 0.3], [13.5, 0.5], [16.5, 0.9], [18.0, 1.2], [20, 1.25]]);
      neo.pose({
        phase: dist * STEP_PER_M / 2, walk,
        lookYaw: keys(t, [[6.0, 0], [6.8, 0.45], [7.8, 0.15], [8.6, 0], [13.5, 0], [14.5, -0.5], [15.5, 0.4], [16.6, 0]]),
        lookUp, reachL: smooth(10.0, 10.9, t) * (1 - smooth(11.6, 12.8, t)),
        eyeOpen: Neo.blink(t) * (t < 2.5 ? smooth(1.0, 2.2, t) : 1) * (1 - 0.35 * pulse(t, 10.6, 11.6, 0.2)) * (1 + 0.15 * smooth(17.5, 18.5, t)),
        mood: -0.6 * smooth(16.5, 18.5, t) + 0.3 * pulse(t, 8.6, 10.2, 0.4), eyeX: keys(t, [[6.0, 0], [6.6, 0.8], [7.6, 0]]),
        eyeY: 0.6 * smooth(8.0, 9.0, t) - 0.6 * smooth(10.0, 10.6, t) + 0.8 * smooth(16, 18, t),
        lean: -0.05 * smooth(15, 18, t), coreGlow: 1 + 0.6 * pulse(t, TOUCH_T - 0.2, 12, 0.2),
      }, t < TOUCH_T ? t : TOUCH_T + (t - TOUCH_T) * 0.3);
      city.focus(0, 0, z);
      // purple glow & crystal
      const glow = smooth(5.2, 7.2, t);
      purple.intensity = glow * (1.6 + Math.sin(t * 5) * 0.4) * (1 - smooth(8.5, 10, t) * 0.6);
      wisps.set(smooth(5.4, 8.6, t), wt, glow * (1 - smooth(11.5, 13, t)));
      const rise = smooth(8.0, 9.6, t);
      crystal.group.position.set(CRYSTAL_POS.x, lerp(0.05, CRYSTAL_POS.y, rise), CRYSTAL_POS.z);
      crystal.group.visible = t > 6.8;
      crystal.update(wt, (0.2 + 0.8 * smooth(6.8, 9.0, t)) * (1 + 1.5 * pulse(t, TOUCH_T - 0.1, TOUCH_T + 0.8, 0.15)) * (1 - 0.5 * smooth(13, 16, t)));
      // shock wave
      const wk = range(t, TOUCH_T, TOUCH_T + 2.4);
      wave.set(Math.pow(wk, 0.6) * 160, (1 - wk) * smooth(TOUCH_T, TOUCH_T + 0.1, t), t);
      fall.update(Math.min(t, TOUCH_T + (t - TOUCH_T) * 0.02));
      // sky failure + dissolve
      const glitch = smooth(13.0, 15.5, t);
      sky.uniforms.uTime.value = t; sky.uniforms.uGlitch.value = glitch * (1 - 0.6 * smooth(17.8, 19, t)); sky.uniforms.uRed.value = smooth(17, 19, t) * 0.45;
      for (const b of dissolving) b.uniforms.uCut.value = t < b.dStart ? 999 : Math.max(b.h * 0.22, b.h - (t - b.dStart) * b.dRate);
      cubes.update(t);
      // the eye
      const open = smooth(17.4, 19.2, t);
      eye.mesh.visible = t > 17.0;
      eye.uniforms.uOpen.value = open + Math.sin(t * 40) * 0.01 * open; eye.uniforms.uTime.value = t;
      eye.uniforms.uIntensity.value = smooth(17.0, 17.6, t) * (1 + 0.3 * pulse(t, 18.8, 19.6, 0.1));
      eye.uniforms.uLook.value.set(keys(t, [[18, 0.4], [19.2, 0]]), keys(t, [[18, 0.2], [19.2, -0.25]]));
      eye.uniforms.uDilate.value = 0.2 * pulse(t, 18.6, 19.4, 0.2);
      scene.fog.color.setRGB(0.024 + 0.1 * smooth(17.5, 19.5, t), 0.043, 0.086 - 0.04 * smooth(17.5, 19.5, t));
      city.hemi.color.setRGB(0.23 + 0.4 * smooth(17.5, 19.5, t), 0.35 - 0.15 * smooth(17.5, 19.5, t), 0.55 - 0.3 * smooth(17.5, 19.5, t));

      const camera = rig.apply(t);
      // post
      const post = DEFAULT_POST();
      post.fade = 1 - smooth(0.0, 0.9, t);
      post.freeze = freezeK;
      post.flash = pulse(t, TOUCH_T - 0.02, TOUCH_T + 0.35, 0.05) * 0.75; post.flashColor = [0.85, 0.7, 1];
      screen.copy(CRYSTAL_POS).project(camera);
      post.ripple = [screen.x * 0.5 + 0.5, screen.y * 0.5 + 0.5, wk * 1.4, (1 - wk) * smooth(TOUCH_T, TOUCH_T + 0.1, t)];
      post.glitch = glitch * 0.35 + 0.6 * pulse(t, 14.2, 14.6, 0.05) + 0.5 * pulse(t, 15.8, 16.1, 0.05) + 0.25 * pulse(t, 18.7, 18.9, 0.04);
      post.bloom = 0.9 + 0.6 * pulse(t, TOUCH_T, 12.5, 0.2) + 0.3 * smooth(17, 19, t);
      post.chroma = 0.0015 + 0.004 * smooth(17.5, 19, t);
      post.tint = [1 + 0.15 * smooth(17.5, 19.5, t), 1 - 0.1 * smooth(17.5, 19.5, t), 1 - 0.1 * smooth(17.5, 19.5, t)];
      const hudA = pulse(t, 8.9, 10.9, 0.25);
      const sx = (screen.x * 0.5 + 0.5) * 1080, sy = (1 - (screen.y * 0.5 + 0.5)) * 1920;
      return {
        camera, post,
        overlay: (ctx) => {
          drawHud(ctx, t, { x: clamp(sx, 150, 560), y: clamp(sy, 300, 1500), r: 110, alpha: hudA, color: '200,140,255', label: 'FRAGMENTO', lines: ['ENERGIA: ' + (Math.floor(clamp(range(t, 9, 10.2)) * 9999)).toString().padStart(4, '0') + ' ∞', 'ORIGEM: ???', 'TOQUE: NÃO RECOMENDADO'] });
        },
      };
    }
    return { scene, update, objects: { city, neo, sky, eye, crystal, wave, wisps, fall, cubes, rig, purple, pile, dissolving } };
  },

  sound(s) {
    // underscore: dark drone in A
    s.pad(0, 11.2, [33, 40, 45], { gain: 0.16, cutoff: 500, attack: 3, release: 1 });
    s.sub(0.5, 10.6, 21, 0.25);
    for (let i = 0; i < 26; i++) s.chime(0.2 + i * 0.13 + s.r() * 0.1, 1200 + s.r() * 2400, 0.02, 1.2, (s.r() - 0.5) * 1.6); // particles assembling
    s.whoosh(1.6, 2.6, 0.35, 200, 2400); s.whoosh(3.2, 1.4, 0.25, 2000, 300);
    s.boom(3.8, 0.35);
    // footsteps from NEO's own walk phase
    let prev = null;
    for (let t = 3.6; t < 10.2; t += 1 / 240) {
      const k = Math.floor((0.6 - neoZ(t)) * STEP_PER_M);
      if (prev !== null && k !== prev) s.click(t, 0.09, 2600 + (k % 2) * 500, (k % 2 ? 0.15 : -0.15));
      prev = k;
    }
    // purple glow hum
    s.tone({ t: 5.2, dur: 6, freq: 110, type: 'sawtooth', gain: 0.05, attack: 2, release: 0.5, filter: { type: 'lowpass', freq: 300, freqEnd: 1400 }, send: 0.5, curve: 'lin' });
    s.chime(8.1, 659, 0.12, 3); s.chime(8.5, 988, 0.08, 3); s.chime(9.0, 1319, 0.07, 3);
    s.choir(8.0, 3.5, [69, 72, 76], 0.14);
    // touch → freeze
    s.boom(TOUCH_T, 0.9);
    [880, 1109, 1319, 1760].forEach((f, i) => s.chime(TOUCH_T + i * 0.02, f, 0.1, 4));
    s.tone({ t: TOUCH_T, dur: 1.8, freq: 900, freqEnd: 50, type: 'sawtooth', gain: 0.12, attack: 0.01, release: 1.6, filter: { type: 'lowpass', freq: 3000, freqEnd: 200 }, send: 0.6 });
    s.tone({ t: TOUCH_T + 0.4, dur: 3.2, freq: 2093, type: 'sine', gain: 0.05, attack: 0.4, release: 2.4, send: 0.9 });
    s.pad(TOUCH_T + 0.2, 6, [57, 64, 69], { gain: 0.08, type: 'triangle', cutoff: 2000, attack: 1.2, release: 2 });
    // sky failure
    s.rumble(12.8, 5, 0.5);
    s.glitch(13.3, 0.5, 0.12); s.glitch(14.2, 0.6, 0.14); s.glitch(15.0, 0.4, 0.1); s.glitch(15.8, 0.5, 0.16); s.glitch(16.6, 0.3, 0.12);
    for (let i = 0; i < 6; i++) s.whoosh(13.2 + i * 0.6, 1.4, 0.12, 400, 4000, (i % 2 ? 0.6 : -0.6));
    // the eye
    s.riser(16.2, 2.6, 0.3, 80, 900);
    s.pad(18.7, 1.4, [33, 34, 45, 46], { gain: 0.5, cutoff: 1800, attack: 0.02, release: 0.9, send: 0.6 });
    s.boom(18.7, 1.0);
    s.heartbeat(19.35, 0.45);
  },
};
