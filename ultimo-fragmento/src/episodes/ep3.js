import * as THREE from 'three';
import ep2, { NEO2_END, CAM2_END, jumpClock } from './ep2.js';
import { Neo } from '../characters/Neo.js';
import { InvertedWorld, GIANT_POS, PORTAL_POS } from '../scenes/InvertedWorld.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST } from '../core/Engine.js';
import { smooth, range, keys, pulse, lerp } from '../core/util.js';

export const FLIP_T = 4.0;
// Last pose/frame of episode 3 — episode 4 starts here.
export const NEO3_END = { x: 1.6, y: 0.2, z: -3.2, ry: -0.55 };
export const CAM3_END = { x: -0.3, y: 1.2, z: 1.0, tx: 7, ty: 3.5, tz: -14, fov: 50, roll: 0 };


// The inverted world after the flip (also rebuilt by episode 4 for its first second)
export function makeInverted(renderer) {
  const W = new InvertedWorld({ renderer });
  const neo = new Neo(); W.scene.add(neo.group);
    // ── 4–20 s: the inverted world ──
  const rig = new CameraRig({ x: 0.5, y: 0.9, z: 2.0, tx: 0, ty: 0.25, tz: 0, fov: 60, roll: 0.5 });
  rig.to(FLIP_T, 1.6, { x: 1.4, y: 0.45, z: 2.2, ty: 0.25, fov: 40, roll: 0 }, 'power3.out')       // settle on NEO, floating
    .to(5.6, 4.6, { x: 9, y: 4, z: 15, tx: -8, ty: 2, tz: -24, fov: 56 }, 'sine.inOut')           // reveal: islands, clocks, oceans
    .to(10.2, 2.4, { x: 0.8, y: -1.0, z: 4.0, tx: -2.4, ty: 12, tz: -29, fov: 54 }, 'power2.inOut') // low, behind NEO: the guardian
    .to(12.6, 2.6, { x: 0.7, y: -0.8, z: 3.6, fov: 50 }, 'sine.inOut')
    .to(15.2, 2.0, { x: -0.6, y: 2.6, z: 9.5, tx: 4.5, ty: 4, tz: -20, fov: 58 }, 'power2.inOut')       // the arm points
    .to(17.2, 2.8, { ...CAM3_END }, 'power2.inOut')
    .to(10.6, 0.4, { shake: 0.02 }, 'none').to(12, 1, { shake: 0 }, 'none');
  rig.prime(20);
  const neoY = (t) => lerp(-2.6, 0, smooth(FLIP_T, 6.2, t));
  rig.follow = (t) => [0, neoY(t) * (1 - smooth(9.5, 10.5, t)), 0];

  function update(t) {
      // the world after the flip
    const rise = smooth(FLIP_T, 6.2, t);
    const float = Math.sin(t * 1.3) * 0.08;
    const to = smooth(15.6, 19.4, t);               // drift toward the portal
    neo.group.position.set(lerp(0, NEO3_END.x, to), lerp(-2.6, 0, rise) + float + lerp(0, NEO3_END.y, to), lerp(0, NEO3_END.z, to));
    neo.group.rotation.set(lerp(0.6, 0, rise), keys(t, [[4, 0.4], [6.5, 0.0], [8, 0.7], [9.5, -0.6], [11, 0], [12.5, Math.PI * 0.08], [15.5, 0.1], [17.5, NEO3_END.ry]]), lerp(-0.8, 0, rise));
    const awe = smooth(5.5, 7, t);
    neo.pose({
      armsOut: 0.5 * (1 - smooth(6, 8, t)) + 0.15, spread: 0.6, lookUp: keys(t, [[4, -0.3], [6, 0.1], [8, 0.3], [10.5, 0.2], [12, 0.8], [14.5, 0.9], [16, 0.4], [18, 0.15]]),
      lookYaw: keys(t, [[7, 0], [8.2, 0.5], [9.3, -0.4], [10.2, 0]]),
      eyeOpen: Neo.blink(t, 1.3) * (1 + 0.25 * awe - 0.3 * pulse(t, 15.6, 18.6, 0.6)), mood: 0.45 * awe * (1 - smooth(10.5, 11.5, t)) - 0.5 * smooth(15.4, 16.4, t),
      eyeY: keys(t, [[11.5, 0], [12.5, 0.8], [15, 0.8], [16, 0.2]]), eyeX: keys(t, [[15.5, 0], [16.3, 0.8], [18.5, 0.5]]), sitHip: 0.25, crouch: 0.2,
    }, t);
    const form = smooth(10.0, 13.0, t), point = smooth(15.0, 16.8, t);
    W.update(t, { reveal: smooth(FLIP_T, 5.2, t), form, point, portal: smooth(15.8, 17.4, t) });
    W.scene.fog.color.setRGB(0.16 + 0.06 * form, 0.22 + 0.03 * form, 0.36 - 0.05 * form);
    const camera = rig.apply(t);
    const post = DEFAULT_POST();
    post.flash = 1 - smooth(FLIP_T, 4.8, t); post.flashColor = [1, 0.85, 0.6];
    post.bloom = 0.8 + 0.3 * form; post.bloomThreshold = 0.88; post.vignette = 0.5; post.exposure = 0.9;
    post.tint = [1.04 + 0.06 * form, 1.0, 0.96]; post.sat = 1.08;
    post.chroma = 0.0015 + 0.003 * pulse(t, 15.6, 17.5, 0.3);
    return { camera, post, scene: W.scene };
  }
  return { W, neo, rig, update };
}

export default {
  number: 3, title: 'O MUNDO INVERTIDO', duration: 20,
  build({ renderer }) {
    const base = ep2.build({ renderer });          // the abyss, exactly as episode 2 left it
    const B = base.objects;
    const inv = makeInverted(renderer); const { W, neo } = inv;
    // ── 0–4 s: the fall (in the episode-2 world) ──
    const fallRig = new CameraRig({ ...CAM2_END });
    fallRig.to(0, 4.0, { roll: Math.PI, fov: 62 }, 'power2.in');
    fallRig.prime(20);
    const fallY = (t) => NEO2_END.y - 0.5 * 14 * t * t;
    function update(t) {
      if (t < FLIP_T) {
        // keep episode 2's world running (slow-motion clock) while NEO drops away
        base.update(20 + t * 0.15);
        const n = B.neo; const y = fallY(t);
        n.group.position.set(NEO2_END.x, y, NEO2_END.z + t * 0.8);
        n.group.rotation.set(-0.25 - t * 0.7, 0, t * 0.9);
        n.pose({ armsOut: 0.9, mood: -0.7, eyeOpen: 1.2, lookUp: -0.5 }, jumpClock(20) + t * 0.3);
        fallRig.follow = (tt) => [0, fallY(tt) - NEO2_END.y, tt * 0.8];
        const camera = fallRig.apply(t);
        B.abyss.update(20 + t * 2, 1);
        const post = DEFAULT_POST();
        post.freeze = 0.45 * (1 - smooth(0, 1.2, t)); post.sat = 0.8 + 0.2 * smooth(0, 1, t);
        post.chroma = 0.0055 + 0.01 * smooth(2, 4, t); post.glitch = 0.4 * smooth(3.2, 4, t);
        post.flash = smooth(3.55, 4.0, t); post.flashColor = [1, 0.85, 0.6]; post.bloom = 1.5;
        return { camera, post, scene: base.scene };
      }
      return inv.update(t);
    }
    return { scene: W.scene, update, objects: { W, neo } };
  },

  sound(s) {
    // the fall
    s.whoosh(0, 3.8, 0.5, 200, 1800); s.noise({ t: 0, dur: 4, gain: 0.2, attack: 2.5, release: 1, filter: { type: 'bandpass', freq: 500, freqEnd: 2500, Q: 0.6 }, send: 0.2, curve: 'lin' });
    s.tone({ t: 0.5, dur: 3.5, freq: 80, freqEnd: 600, type: 'sawtooth', gain: 0.06, attack: 3, release: 0.4, filter: { type: 'lowpass', freq: 400, freqEnd: 3000 }, send: 0.5, curve: 'lin' });
    s.riser(1.4, 2.6, 0.25, 200, 2000);
    // gravity flips: a bright inverted swell
    s.boom(FLIP_T, 0.6);
    [64, 68, 71, 76, 80].forEach((n, i) => s.chime(FLIP_T + i * 0.06, 440 * Math.pow(2, (n - 69) / 12) * 2, 0.06, 3.5, (i - 2) * 0.3));
    // dreamlike music (E lydian)
    s.pad(4.2, 6.8, [52, 59, 63, 70], { gain: 0.1, type: 'triangle', cutoff: 2200, attack: 2, release: 2 });
    const arp = [64, 71, 75, 78, 82, 78, 75, 71];
    for (let i = 0; i < 22; i++) s.pluck(5.0 + i * 0.25, arp[i % 8] - (i > 15 ? 2 : 0), 0.05, 1.4, Math.sin(i) * 0.6);
    // clocks ticking out of sync
    for (let i = 0; i < 26; i++) s.click(5.4 + i * 0.37 + (i % 3) * 0.05, 0.035, 4500 - (i % 4) * 600, (i % 2 ? 0.7 : -0.7));
    // water
    s.noise({ t: 6, dur: 7, gain: 0.07, attack: 2, release: 2, filter: { type: 'lowpass', freq: 700, Q: 0.4 }, send: 0.4, curve: 'lin' });
    // the guardian forms
    s.riser(9.6, 3.4, 0.18, 60, 500);
    for (let i = 0; i < 30; i++) s.chime(10 + i * 0.1, 900 + s.r() * 2600, 0.018, 1.5, (s.r() - 0.5) * 1.6);
    s.choir(11.4, 8.4, [40, 47, 52, 56], 0.22);
    s.sub(11.4, 8.4, 28, 0.3);
    s.noise({ t: 12.5, dur: 2.2, gain: 0.12, attack: 1.1, release: 1, filter: { type: 'lowpass', freq: 300 }, send: 0.5, curve: 'lin' }); // breath
    // pointing → portal
    s.whoosh(15.0, 1.6, 0.2, 200, 1200);
    s.tone({ t: 15.9, dur: 4, freq: 110, freqEnd: 440, type: 'sine', gain: 0.1, attack: 1.5, release: 1, send: 0.6, curve: 'lin' });
    s.tone({ t: 15.9, dur: 4, freq: 165, freqEnd: 880, type: 'triangle', gain: 0.05, attack: 1.5, release: 1, send: 0.8, curve: 'lin' });
    s.noise({ t: 16, dur: 4, gain: 0.12, attack: 1.5, release: 1, filter: { type: 'bandpass', freq: 300, freqEnd: 2400, Q: 3 }, send: 0.6, curve: 'lin' });
  },
};
