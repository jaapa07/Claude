import * as THREE from 'three';
import ep1, { EYE_POS, CAM_END, NEO_END } from './ep1.js';
import { Neo } from '../characters/Neo.js';
import { DroneSwarm } from '../characters/Drone.js';
import { Abyss } from '../scenes/Abyss.js';
import { CubeDebris } from '../effects/Debris.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, rng, noise1 } from '../core/util.js';

// ─── NEO's chase path (shared with the sound design and episode 3) ───
export const RUN_START = 4.5, STOP_T = 13.8, EDGE_Z = 18.3, JUMP_T = 15.4, SLOW_T = 16.35;
const runEase = (x) => x * x * (3 - 2 * x) * 0.25 + x * 0.75;
export const neoRunZ = (t) => t < RUN_START ? NEO_END.z : lerp(NEO_END.z, EDGE_Z, runEase(range(t, RUN_START, STOP_T)));
// jump in local "story time" (slows to a near-stop: suspended over the abyss)
export const jumpClock = (t) => t < SLOW_T ? t : SLOW_T + (1 - Math.exp(-(t - SLOW_T) * 3)) * 0.06 + (t - SLOW_T) * 0.012;
export function neoJump(t) {
  const c = jumpClock(t) - JUMP_T; if (c <= 0) return { z: EDGE_Z, y: 0, k: 0 };
  return { z: EDGE_Z + c * 3.2, y: c * 4.4 - 0.5 * 9.8 * c * c * 0.55, k: c };
}
export const NEO2_END = (() => { const j = neoJump(20); return { x: 0, y: j.y, z: j.z }; })();
export const CAM2_END = { x: NEO2_END.x - 1.9, y: NEO2_END.y + 1.5, z: NEO2_END.z + 1.3, tx: NEO2_END.x, ty: NEO2_END.y - 0.25, tz: NEO2_END.z, fov: 46, roll: -0.12 };
// the ground breaks: edge position of the hole over time
export const holeEdge = (t) => t < 10.4 ? 1e4 : t < 15.0 ? lerp(60, EDGE_Z + 0.9, 1 - Math.pow(1 - range(t, 10.4, 13.6), 1.8)) : lerp(EDGE_Z + 0.9, 8, smooth(15.0, 16.2, t));

export default {
  number: 2, title: 'A PERSEGUIÇÃO', duration: 20,
  build({ renderer }) {
    const base = ep1.build({ renderer });          // the same world, continuing from ep1's last frame
    const { scene } = base; const O = base.objects; const { city, neo, eye, sky } = O;
    const abyss = new Abyss({ y: -45, center: [0, 0, 45] }); scene.add(abyss.group);
    // drones born from the eye
    const N = 360, swarm = new DroneSwarm(N, 0.85); scene.add(swarm.group);
    const r = rng(77), eyeM = eye.mesh; eyeM.updateMatrixWorld();
    const drones = [...Array(N)].map((_, i) => {
      const x = (r() * 2 - 1); const y = (r() * 2 - 1) * (1 - x * x) * 0.55;
      const spawn = new THREE.Vector3(x * 125, y * 160 * 0.62, 0); eyeM.localToWorld(spawn);
      return { spawn, t0: 0.6 + r() * 2.6, off: new THREE.Vector3((r() - 0.5) * 26, 5 + r() * 18, -8 - r() * 30), ph: r() * 100, lag: 0.3 + r() * 1.4, mid: new THREE.Vector3((r() - 0.5) * 120, 90 + r() * 80, -150 + r() * 60) };
    });
    // collapsing buildings along the escape route
    const fallers = city.buildings.filter((b) => !b.far && !b.back && b.z > -8 && b.z < 40);
    const fr = rng(31);
    fallers.forEach((b) => { b.fall0 = 5.0 + clamp((b.z + 8) / 48) * 5.5 + fr() * 1.2; b.fallDir = Math.sign(b.x); b.fallAxis = fr() < 0.5 ? 'z' : 'x'; });
    const collapse = new CubeDebris({ count: 1600, size: 1.3, color: 0x232b3a, emissive: 0x1a3366, emissiveIntensity: 0.4, seed: 8 });
    for (const b of fallers) collapse.emitBox({ n: 60, box: [b.x, b.h * 0.5, b.z, b.w, b.h, b.d], t0: b.fall0 + 0.3, t1: b.fall0 + 2.0, vel: [-b.fallDir * 3, 2, 0], spread: 6, gravity: [0, -14, 0], spin: 3, life: 3.5, order: 'top' });
    scene.add(collapse.mesh);
    // ground slabs dropping into the abyss as the edge passes
    const slabs = new CubeDebris({ count: 700, size: 1, color: 0x1a202b, emissive: 0x5520aa, emissiveIntensity: 0.06, seed: 19 });
    slabs.emitBox({ n: 700, box: [0, -0.2, 40, 60, 0.1, 44], t0: 0, t1: 1, vel: [0, -1, 0], spread: 1.5, gravity: [0, -9.8, 0], spin: 1.2, life: 5, order: 'random', size: 2.4, shape: [1.4, 0.18, 1.1] });
    const edgeTime = (z) => { for (let tt = 10.4; tt < 20; tt += 0.02) if (holeEdge(tt) < z) return tt; return 99; };
    for (let i = 0; i < slabs.used; i++) slabs.data[i].t = edgeTime(slabs.data[i].o[2]) - 0.1;
    scene.add(slabs.mesh);

    // camera
    const rig = new CameraRig({ ...CAM_END, shake: 0 });
    rig.to(0, 2.4, { ty: 260, tz: -340, fov: 60 }, 'sine.inOut')
      .to(2.4, 2.0, { x: 0.9, y: 0.55, z: -4.6, tx: 0, ty: 0.9, tz: -7.0, fov: 40 }, 'power2.inOut')        // tilt down to NEO
      .to(4.4, 1.0, { x: 4.4, y: 1.1, z: neoRunZ(5.4) + 0.6, tx: 0, ty: 1.8, tz: neoRunZ(5.4), fov: 52 }, 'power2.inOut') // whip to the side
      .to(5.4, 4.8, { x: 4.4, y: 1.2, z: neoRunZ(10.2) + 0.6, tx: 0, ty: 2.0, tz: neoRunZ(10.2), fov: 54 }, 'none')        // lateral travelling
      .to(10.2, 1.4, { x: 1.8, y: 6.5, z: 33, tx: 0, ty: -1.5, tz: neoRunZ(12), fov: 44 }, 'power2.inOut')               // ahead, the abyss opens
      .to(11.6, 2.2, { x: 1.2, y: 4.2, z: 28, ty: -0.5, tz: EDGE_Z - 2, fov: 40 }, 'sine.inOut')
      .set(13.8, { x: 0.15, y: 2.4, z: EDGE_Z - 2.0, tx: 0, ty: -4, tz: EDGE_Z + 5, fov: 56 })                        // cut: over the edge
      .to(13.8, 1.5, { y: 2.2, z: EDGE_Z - 1.7, fov: 52 }, 'sine.inOut')
      .to(15.3, 1.2, { x: 2.2, y: 1.2, z: EDGE_Z + 0.5, tx: 0, ty: 1.2, tz: EDGE_Z + 2.4, fov: 46 }, 'power2.out')       // jump
      .to(16.5, 3.5, { ...CAM2_END }, 'sine.inOut')                                                                         // bullet-time orbit
      .to(5.4, 0.3, { shake: 0.025 }, 'none').to(13.5, 0.4, { shake: 0.06 }, 'none').to(15.2, 0.3, { shake: 0.09 }, 'none').to(16.4, 0.8, { shake: 0 }, 'power2.out');
    rig.prime(20);

    function update(t) {
      base.update(20 + t * 0.6);                    // sky glitch, cubes, eye state continue from ep1
      O.cubes.update(20 + t);
      O.crystal.group.visible = t < 2.6; O.purple.intensity = 0; O.wisps.set(0, 0, 0); O.wave.set(0, 0, 0);
      // eye shatters → drones
      eye.mesh.visible = t < 4.2;
      eye.uniforms.uOpen.value = 1; eye.uniforms.uTime.value = 20 + t;
      eye.uniforms.uBreak.value = smooth(0.5, 3.6, t); eye.uniforms.uIntensity.value = 1 + 0.4 * pulse(t, 0.4, 1.2, 0.2);
      eye.uniforms.uDilate.value = 0.25 * pulse(t, 0.3, 1.4, 0.3); eye.uniforms.uLook.value.set(0, -0.25);
      sky.uniforms.uTime.value = 20 + t; sky.uniforms.uGlitch.value = 0.25 * (1 - smooth(4, 8, t)) + 0.15 + 0.5 * pulse(t, 10.4, 11.2, 0.1);
      sky.uniforms.uRed.value = 0.3 * (1 - smooth(3, 7, t)) + 0.15;
      // NEO
      const z = neoRunZ(t), j = neoJump(t), jumping = t > JUMP_T;
      const run = smooth(RUN_START - 0.2, RUN_START + 0.4, t) * (1 - smooth(STOP_T - 0.5, STOP_T, t));
      neo.group.position.set(0, jumping ? j.y : 0, jumping ? j.z : z);
      neo.group.rotation.set(jumping ? -0.25 * smooth(JUMP_T, JUMP_T + 0.5, t) : 0, keys(t, [[3.3, Math.PI], [4.3, 0]]), 0);
      const fear = smooth(1.0, 2.0, t);
      neo.pose({
        phase: (z - NEO_END.z) * 0.95, run, lookUp: keys(t, [[0, 1.25], [2.6, 1.1], [3.3, 0.3], [13.8, 0], [14.3, -0.7], [15.3, -0.4], [16.4, -0.5]]),
        lookYaw: keys(t, [[6, 0], [6.6, 0.7], [7.4, 0], [8.8, 0], [9.4, 0.6], [10, 0]]),
        eyeOpen: Neo.blink(t, 0.7) * (1.15 + 0.05 * fear), mood: -0.6 - 0.1 * fear, eyeY: keys(t, [[0, 0.8], [2.8, 0.5], [3.4, 0], [14, -0.8]]), eyeX: keys(t, [[6.4, 0], [6.8, 0.8], [7.4, 0]]),
        armsOut: smooth(STOP_T - 0.3, STOP_T + 0.2, t) * (1 - smooth(14.6, 15.2, t)) * 0.6 + smooth(JUMP_T + 0.2, SLOW_T, t) * 0.9,
        jumpTuck: pulse(t, JUMP_T - 0.15, JUMP_T + 0.6, 0.15) * 0.6, crouch: pulse(t, 14.9, JUMP_T + 0.05, 0.25),
        lean: -0.05 * (1 - smooth(0, 2, t)) - 0.15 * smooth(13.8, 14.4, t) * (1 - smooth(14.8, 15.2, t)),
      }, jumpClock(t));
      city.focus(0, 0, jumping ? j.z : z);
      // collapsing buildings
      for (const b of fallers) {
        const k = range(t, b.fall0, b.fall0 + 2.4), e = k * k;
        if (b.fallAxis === 'z') b.pivot.rotation.z = -b.fallDir * e * 0.9; else b.pivot.rotation.x = (b.z > 0 ? 1 : -1) * e * 0.7;
        b.pivot.position.y = -e * b.h * 0.45;
        b.uniforms.uCut.value = t > b.fall0 + 0.4 ? Math.max(0, b.h - (t - b.fall0 - 0.4) * b.h * 0.45) : 999;
      }
      collapse.update(t);
      // the hole
      const edge = holeEdge(t);
      city.hole.uHole.value.set(edge, t > 10.4 ? 1 : 0, 1);
      for (const b of city.buildings) if (b.z > edge - 2 && (b.far || b.back || !fallers.includes(b))) b.pivot.position.y = -Math.pow(Math.max(0, b.z - edge), 1.4) * 1.2;
      for (const c of city.cars || []) c.position.y = -Math.pow(Math.max(0, c.position.z - edge + 1), 1.6) * 1.4;
      slabs.update(t);
      abyss.update(t, smooth(10.2, 11.5, t));
      scene.fog.density = lerp(0.0085, 0.0045, smooth(10, 13, t));
      // drones
      const nz = jumping ? j.z : z;
      swarm.update((i) => {
        const d = drones[i]; const k = range(t, d.t0, d.t0 + 3.4); if (k <= 0) return null;
        const tt = Math.max(RUN_START, jumpClock(t) - d.lag);
        const chase = new THREE.Vector3(d.off.x * 0.6 + noise1(t * 0.7 + d.ph) * 4, d.off.y + noise1(t * 0.5 + d.ph + 9) * 3, Math.min(neoRunZ(tt), nz) + d.off.z * 0.6);
        const e = k * k * (3 - 2 * k);
        const a = d.spawn.clone().lerp(d.mid, e), b = d.mid.clone().lerp(chase, e);
        const p = a.lerp(b, e);
        const dir = chase.clone().sub(p); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
        if (k >= 1) dir.set(0, -0.2, 1);
        return { p, dir: dir.normalize(), s: smooth(0, 0.08, k) };
      });
      const camera = rig.apply(t);
      const post = DEFAULT_POST();
      post.glitch = 0.35 * (1 - smooth(1, 4, t)) + 0.4 * pulse(t, 0.4, 0.9, 0.1) + 0.5 * pulse(t, 10.4, 10.8, 0.05) + 0.35 * pulse(t, 15.0, 15.3, 0.05);
      post.tint = [1.15 - 0.15 * smooth(2, 6, t), 0.9 + 0.1 * smooth(2, 6, t), 0.9 + 0.1 * smooth(2, 6, t)];
      post.chroma = 0.004 * (1 - smooth(0, 3, t)) + 0.0015 + 0.004 * smooth(SLOW_T - 0.3, SLOW_T + 0.5, t);
      post.bloom = 1.2 - 0.2 * smooth(0, 3, t) + 0.3 * smooth(10, 12, t);
      post.freeze = 0.45 * (1 - smooth(0, 3, t)) + 0.45 * smooth(SLOW_T - 0.2, SLOW_T + 0.6, t);
      post.sat = 1 - 0.2 * smooth(SLOW_T, 18, t);
      return { camera, post };
    }
    return { scene, update, objects: { ...O, abyss, swarm } };
  },

  sound(s) {
    // the eye shatters into a swarm
    s.glitch(0.4, 1.0, 0.16, 30); s.boom(0.5, 0.6);
    for (let i = 0; i < 6; i++) s.droneBuzz(0.8 + i * 0.4, 13 - i * 0.4, 0.03, 90 + i * 23, (i % 2 ? 0.5 : -0.5));
    s.riser(1.0, 3.4, 0.25, 60, 600);
    s.whoosh(3.3, 1.2, 0.2, 400, 2600);
    // chase music: kicks + bass ostinato in D minor
    for (let b = 0; b < 19; b++) { const t = RUN_START + b * 0.5; if (t > 14) break; s.kick(t, 0.55); if (b % 2) s.noise({ t: t + 0.25, dur: 0.12, gain: 0.08, filter: { type: 'highpass', freq: 6000 }, bus: 'music', send: 0.1 }); }
    const bass = [38, 38, 41, 38, 43, 41, 36, 38];
    for (let k = 0; k < 38; k++) { const t = RUN_START + k * 0.25; if (t > 14) break; s.tone({ t, dur: 0.22, freq: 440 * Math.pow(2, (bass[Math.floor(k / 2) % 8] - 69) / 12), type: 'sawtooth', gain: 0.07, attack: 0.005, release: 0.15, filter: { type: 'lowpass', freq: 900 }, bus: 'music', send: 0.05 }); }
    s.pad(RUN_START, 9.6, [50, 53, 57], { gain: 0.07, cutoff: 1400, attack: 1 });
    // footsteps while running
    let prev = null; for (let t = RUN_START; t < STOP_T; t += 1 / 240) { const k = Math.floor((neoRunZ(t) - NEO_END.z) * 0.95 * 2); if (prev !== null && k !== prev) s.click(t, 0.07, 2400 + (k % 2) * 600, k % 2 ? 0.2 : -0.2); prev = k; }
    // collapses
    for (let i = 0; i < 7; i++) { const t = 5.3 + i * 0.85; s.rumble(t, 2.4, 0.3); s.noise({ t: t + 0.4, dur: 1.2, gain: 0.18, filter: { type: 'lowpass', freq: 800, freqEnd: 200 }, send: 0.4, pan: (i % 2 ? -0.6 : 0.6) }); }
    // the ground breaks
    s.boom(10.4, 0.8); s.glitch(10.4, 0.5, 0.14);
    for (let i = 0; i < 14; i++) s.noise({ t: 10.5 + i * 0.28, dur: 0.25, gain: 0.12, attack: 0.002, release: 0.22, filter: { type: 'bandpass', freq: 600 + (i % 4) * 300, Q: 2 }, send: 0.3, pan: (s.r() - 0.5) });
    s.tone({ t: 10.6, dur: 5, freq: 55, type: 'sine', gain: 0.2, attack: 2, release: 2, bus: 'music', send: 0.3, curve: 'lin' });
    s.choir(11.5, 5, [50, 57, 62], 0.1);
    s.heartbeat(14.0, 0.4); s.boom(15.0, 0.6);
    s.whoosh(JUMP_T - 0.1, 1.0, 0.35, 300, 2400);
    // suspended: time slows down
    s.tone({ t: SLOW_T - 0.2, dur: 2.0, freq: 600, freqEnd: 70, type: 'sawtooth', gain: 0.08, attack: 0.05, release: 1.5, filter: { type: 'lowpass', freq: 2000, freqEnd: 150 }, send: 0.6 });
    s.pad(SLOW_T, 3.7, [62, 65, 69, 74], { gain: 0.09, type: 'triangle', cutoff: 2600, attack: 1.4, release: 1.5 });
    s.heartbeat(17.1, 0.35); s.heartbeat(18.6, 0.3);
    s.tone({ t: 17, dur: 3, freq: 2637, type: 'sine', gain: 0.03, attack: 1, release: 1.5, send: 1 });
  },
};
