import * as THREE from 'three';
import { makeInverted, NEO3_END, CAM3_END } from './ep3.js';
import { PORTAL_POS } from '../scenes/InvertedWorld.js';
import { Neo } from '../characters/Neo.js';
import { memoryAtlas, ScreenField, tunnelPlacements, spherePlacements } from '../scenes/Memory.js';
import { Machine } from '../scenes/Machine.js';
import { Dust } from '../effects/Particles.js';
import { Sky } from '../effects/Sky.js';
import { makeEnv } from '../scenes/City.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST } from '../core/Engine.js';
import { smooth, range, keys, pulse, lerp } from '../core/util.js';

export const HALL = new THREE.Vector3(0, 0, -200);       // centre of the screen sphere = the machine
export const ENTER_T = 1.5;
// NEO's flight inside the memory space (z decreases), stops in front of the machine
export const neoMemZ = (t) => keys(t, [[ENTER_T, 0], [5.2, -128], [9.5, -158], [12, -163], [20, -166]], (x) => 1 - Math.pow(1 - x, 2));
export const NEO4_END = { x: 0, y: 0, z: -166 };
export const CAM4_END = { x: 0.3, y: 0.52, z: -167.15, tx: 0, ty: 0.5, tz: -166, fov: 32, roll: 0 }; // face close-up, lit by the core behind the camera

export function buildMemoryHall(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020814, 0.006);
  const sky = new Sky({ top: 0x01040c, horizon: 0x04122a, bottom: 0x01040c, nebula: 0x0a2a55, stars: 0.6 }); scene.add(sky.mesh);
  scene.environment = makeEnv(renderer); scene.environmentIntensity = 0.35;
  scene.add(new THREE.HemisphereLight(0x5a8cff, 0x05070c, 0.6));
  const atlas = memoryAtlas();
  const tunnel = new ScreenField(tunnelPlacements(), atlas, 4); scene.add(tunnel.mesh);
  const hall = new ScreenField(spherePlacements({ center: HALL }), atlas, 5); scene.add(hall.mesh);
  const machine = new Machine({ radius: 12 }); machine.group.position.copy(HALL); scene.add(machine.group);
  const streaks = new Dust({ count: 3000, box: [14, 14, 180], center: [0, 0, -90], color: 0x7fc8ff, size: 0.06, rise: 0, seed: 12, opacity: 1 });
  scene.add(streaks.points);
  const motes = new Dust({ count: 2500, box: [120, 120, 120], center: [HALL.x, HALL.y, HALL.z], color: 0x9fd8ff, size: 0.18, rise: 0.4, seed: 13, opacity: 0.7 });
  scene.add(motes.points);
  return { scene, tunnel, hall, machine, streaks, motes, sky };
}

export default {
  number: 4, title: 'A VERDADE', duration: 20,
  build({ renderer }) {
    const inv = makeInverted(renderer);                  // ep3's final frame, rebuilt
    const M = buildMemoryHall(renderer);
    const neo = new Neo(); M.scene.add(neo.group);
    const enterRig = new CameraRig({ ...CAM3_END });
    enterRig.to(0, ENTER_T, { x: PORTAL_POS.x - 2.2, y: PORTAL_POS.y + 0.3, z: PORTAL_POS.z + 4.5, tx: PORTAL_POS.x, ty: PORTAL_POS.y, tz: PORTAL_POS.z, fov: 60 }, 'power2.in');
    enterRig.prime(20);
    const rig = new CameraRig({ x: 0.6, y: 0.5, z: 3.5, tx: 0, ty: 0, tz: -20, fov: 70 });
    rig.to(ENTER_T, 3.7, { fov: 64 }, 'none')
      .to(5.2, 4.3, { x: 6, y: 3, z: -150, tx: 0, ty: 0, tz: -175, fov: 60 }, 'power2.inOut')         // into the hall of screens
      .to(9.5, 2.5, { x: 3.5, y: 2, z: -150, tx: 0, ty: 0, tz: -200, fov: 50 }, 'power2.inOut')        // the machine
      .to(12, 3, { x: -4, y: -1.5, z: -152, ty: 1, fov: 46 }, 'sine.inOut')                             // it opens
      .to(15, 2.6, { x: 1.1, y: 0.75, z: -168.6, tx: 0, ty: 0.4, tz: -166, fov: 40 }, 'power2.inOut')   // the voice: NEO
      .to(17.6, 2.4, { ...CAM4_END }, 'sine.inOut')
      .to(10.6, 0.3, { shake: 0.04 }, 'none').to(14.5, 1, { shake: 0 }, 'none')
      .to(15.0, 0.1, { shake: 0.05 }, 'none').to(15.1, 1.0, { shake: 0 }, 'power2.out').to(17.6, 0.1, { shake: 0.04 }, 'none').to(17.7, 1.0, { shake: 0 }, 'power2.out');
    rig.prime(20);
    rig.follow = (t) => { const k = 1 - smooth(4.6, 5.6, t); return [0, 0, (t < ENTER_T ? 0 : neoMemZ(t)) * k]; };

    function update(t) {
      if (t < ENTER_T) {
        const st = inv.update(20 + t * 0.6);
        const k = smooth(0, ENTER_T, t), e = k * k;
        inv.neo.group.position.set(lerp(NEO3_END.x, PORTAL_POS.x, e), lerp(NEO3_END.y, PORTAL_POS.y, e), lerp(NEO3_END.z, PORTAL_POS.z, e));
        inv.neo.group.rotation.set(-0.4 * k, lerp(NEO3_END.ry, -1.0, k), 0);
        inv.neo.pose({ armsOut: 0.2, reach: 0.8 * k, reachL: 0.8 * k, lean: -0.3 * k, eyeOpen: 1.1, mood: -0.3, sitHip: 0.25 * (1 - k) }, 20 + t);
        inv.W.portal.update(20 + t, 1 + 0.5 * k);
        const camera = enterRig.apply(t);
        const post = st.post; post.flash = smooth(ENTER_T - 0.45, ENTER_T, t); post.flashColor = [0.75, 0.9, 1];
        post.chroma = 0.0015 + 0.01 * k; post.bloom = 0.9 + 0.8 * k;
        return { camera, post, scene: inv.W.scene };
      }
      const z = neoMemZ(t), fly = 1 - smooth(8.5, 10, t);
      neo.group.position.set(Math.sin(t * 1.1) * 0.4 * fly, Math.sin(t * 1.7) * 0.15, z);
      neo.group.rotation.set(-1.0 * fly + 0.0, Math.PI + keys(t, [[6.5, 0], [7.5, 0.5], [8.5, -0.4], [9.5, 0]]), Math.sin(t * 1.1) * 0.3 * fly);
      const shock = smooth(15.0, 16.0, t);
      neo.pose({
        armsOut: 0.3 * fly + 0.1, reach: 0.6 * fly, reachL: 0.6 * fly, lean: 0, spread: 0.3,
        lookUp: keys(t, [[6, 0.2], [7, 0.6], [8.5, 0.3], [10, 0], [12, 0.15], [16, 0.0]]), lookYaw: keys(t, [[6.5, 0], [7.3, 0.7], [8.3, -0.6], [9.5, 0], [16.5, 0], [17.2, -0.2]]),
        eyeOpen: Neo.blink(t, 2.1) * (1 + 0.35 * shock), mood: -0.8 * shock, eyeY: 0.5 * pulse(t, 6, 9.5, 0.5), eyeX: keys(t, [[16.5, 0], [17.5, -0.4], [19, 0]]),
        coreGlow: 1 + 0.8 * pulse(t, 15, 19.5, 0.3), sitHip: 0.2 * (1 - fly),
      }, t);
      const open = smooth(10.4, 14.2, t);
      const voice = pulse(t, 15.0, 15.9, 0.15) + pulse(t, 17.1, 18.7, 0.2);
      M.machine.update(t, open, 1 + 0.6 * voice);
      M.machine.coreU.uHue.value = 0;
      M.tunnel.uniforms.uTime.value = t; M.hall.uniforms.uTime.value = t;
      M.tunnel.uniforms.uBright.value = 1.1 * (1 - smooth(6, 9, t) * 0.7);
      M.hall.uniforms.uReveal.value = smooth(4.2, 7.5, t); M.hall.uniforms.uBright.value = 0.55 + 0.4 * voice;
      M.hall.uniforms.uAll.value = smooth(15.6, 18.8, t); M.tunnel.uniforms.uAll.value = smooth(15.6, 18.8, t);
      M.streaks.uniforms.uTime.value = t; M.streaks.points.position.z = -((t * 40) % 20); M.streaks.uniforms.uOpacity.value = 1 - smooth(5, 7, t);
      M.motes.uniforms.uTime.value = t; M.sky.uniforms.uTime.value = t;
      const camera = rig.apply(t);
      const post = DEFAULT_POST();
      post.flash = (1 - smooth(ENTER_T, ENTER_T + 0.7, t)) * 0.9 + 0.35 * pulse(t, 14.95, 15.4, 0.08); post.flashColor = [0.75, 0.9, 1];
      post.chroma = 0.003 + 0.004 * (1 - smooth(ENTER_T, 5, t)) + 0.004 * voice;
      post.bloom = 1.0 + 0.4 * open + 0.3 * voice; post.glitch = 0.3 * pulse(t, 14.9, 15.3, 0.05) + 0.25 * pulse(t, 17.0, 17.3, 0.05) + 0.12 * smooth(18.5, 20, t);
      post.tint = [0.92, 1.0, 1.1];
      return { camera, post, scene: M.scene };
    }
    return { scene: M.scene, update, objects: { M, neo, inv } };
  },

  sound(s) {
    s.riser(0, ENTER_T, 0.3, 200, 3000); s.whoosh(0.6, 1.0, 0.3, 500, 5000);
    s.boom(ENTER_T, 0.7);
    // tunnel: data chatter + rushing air
    s.noise({ t: ENTER_T, dur: 4, gain: 0.18, attack: 0.2, release: 1.5, filter: { type: 'bandpass', freq: 1200, freqEnd: 400, Q: 0.7 }, send: 0.3 });
    for (let i = 0; i < 40; i++) s.tone({ t: ENTER_T + 0.2 + i * 0.09, dur: 0.05, freq: 1500 + s.r() * 3000, type: 'square', gain: 0.025, attack: 0.002, release: 0.04, send: 0.2, pan: (s.r() - 0.5) * 1.8 });
    for (let i = 0; i < 12; i++) s.whoosh(ENTER_T + i * 0.3, 0.5, 0.08, 800, 3000, i % 2 ? 0.8 : -0.8);
    // hall of screens: eerie arpeggio (C# minor)
    s.pad(5, 10, [49, 56, 61, 64], { gain: 0.1, cutoff: 1500, attack: 2, release: 2 });
    const arp = [61, 64, 68, 73, 68, 64]; for (let i = 0; i < 20; i++) s.pluck(5.2 + i * 0.25, arp[i % 6] + 12, 0.035, 1.0, Math.sin(i * 1.7) * 0.7);
    for (let i = 0; i < 8; i++) s.glitch(5.5 + i * 0.6, 0.1, 0.05, 30);
    // the machine opens: heavy mechanics
    for (let i = 0; i < 9; i++) { const t = 10.4 + i * 0.42; s.noise({ t, dur: 0.35, gain: 0.25, attack: 0.002, release: 0.3, filter: { type: 'bandpass', freq: 180 + i * 40, Q: 4 }, send: 0.5 }); s.tone({ t, dur: 0.3, freq: 90 + i * 9, freqEnd: 60, type: 'square', gain: 0.05, attack: 0.002, release: 0.25, send: 0.4 }); }
    s.tone({ t: 10.4, dur: 4.6, freq: 40, freqEnd: 80, type: 'sawtooth', gain: 0.08, attack: 1, release: 1, filter: { type: 'lowpass', freq: 200, freqEnd: 900 }, send: 0.4, curve: 'lin' });
    s.riser(12, 2.6, 0.2, 100, 1600);
    s.boom(14.6, 0.7); s.sub(14.6, 5.4, 25, 0.35);
    s.choir(14.8, 5.2, [37, 44, 49, 52], 0.18);
    // the revelation
    s.heartbeat(18.9, 0.5); s.glitch(17.0, 0.3, 0.08);
  },
};
