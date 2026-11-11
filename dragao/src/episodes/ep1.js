import * as THREE from 'three';
import { World, ACADEMY } from '../scenes/World.js';
import { Dragon } from '../characters/Dragon.js';
import { Bubble, BubbleField } from '../effects/Bubbles.js';
import { FireJet } from '../effects/Fire.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST, WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, easeOutBack, easeOutElastic } from '../core/util.js';
import { drawBurst, drawSpeedLines } from '../overlay/Overlay.js';

// ─── staging (shared with episode 2) ───
export const PIPO_SPOT = new THREE.Vector3(0.55, 0, 2.2);
export const BRASA_SPOT = new THREE.Vector3(2.05, 0, 1.5);
export const POP_T = 12.05, SNEEZE_T = 17.62, GRAB_T = 17.95;
const podium = new THREE.Vector3(-4.2, 0.7, -3.4);
// the director's bubble: rises & drifts (also used by ep2 for t > 20)
export function directorBubble(t) {
  const k = Math.max(0, t - GRAB_T);
  const y = podium.y + 1.0 + (1 - Math.exp(-k * 0.9)) * 2.2 + k * 1.25;
  return new THREE.Vector3(podium.x + Math.sin(k * 1.3) * 0.35 + k * 0.25, y, podium.z + k * 0.15 - Math.max(0, k - 2) * 0.9);
}
export const DIR_BUBBLE_R = 1.35;
export const CAM1_END = { x: -1.8, y: 2.2, z: 3.6, tx: -3.5, ty: 5.7, tz: -3.1, fov: 50, roll: -0.05 };

export function buildAcademy(renderer) {
  const W = new World({ renderer }); const S = W.scene;
  const pipo = new Dragon('pipo'), brasa = new Dragon('brasa'), director = new Dragon('director');
  const bigs = [new Dragon('green'), new Dragon('violet'), new Dragon('orange')];
  S.add(pipo.root, brasa.root, director.root, ...bigs.map((d) => d.root));
  bigs.forEach((d, i) => { const p = W.perches[i]; d.root.position.copy(p); d.root.lookAt(0, p.y, 4); });
  const fires = bigs.map((d, i) => { const f = new FireJet({ seed: i + 1, speed: 16, size: 0.9, life: 1.0, count: 1600 }); S.add(f.points); return f; });
  return { W, S, pipo, brasa, director, bigs, fires };
}

export default {
  number: 1, title: 'O DRAGÃO DEFEITUOSO', duration: 20,
  build({ renderer }) {
    const A = buildAcademy(renderer); const { W, S, pipo, brasa, director, bigs, fires } = A;
    brasa.root.position.copy(BRASA_SPOT);
    director.root.position.copy(podium);
    const bub = new Bubble(); S.add(bub.mesh, bub.pop.points);
    const dirBub = new Bubble(); S.add(dirBub.mesh, dirBub.pop.points);
    const field = new BubbleField(420, 11); S.add(field.mesh);
    const v = new THREE.Vector3(), mouth = new THREE.Vector3(), nose = new THREE.Vector3(), dir = new THREE.Vector3();
    // fire schedule for the academy dragons (they keep showing off)
    const FIRE = [[[0.5, 2.1], [4.4, 5.2]], [[1.3, 3.0], [9.0, 9.8]], [[2.2, 3.9], [5.6, 6.3]]];
    let sneezeEmitted = false;

    // camera — paused GSAP timeline
    const rig = new CameraRig({ x: -34, y: 46, z: 62, tx: 0, ty: 4, tz: -6, fov: 46, roll: 0.12 });
    rig.to(0, 4.0, { x: 7.5, y: 4.2, z: 15.5, tx: 0, ty: 3.2, tz: -4, fov: 44, roll: 0 }, 'power3.inOut')      // dive past the floating castles
      .to(4.0, 1.6, { x: 1.4, y: 0.45, z: 5.6, tx: 1.4, ty: 0.85, tz: 1.4, fov: 46 }, 'power2.inOut')         // low two-shot: tiny vs huge
      .to(6.6, 0.35, { x: 0.68, y: 0.36, z: 3.25, tx: 0.58, ty: 0.32, tz: 2.2, fov: 34 }, 'expo.out')         // comic punch-in: fierce face
      .to(7.6, 0.9, { x: 1.2, y: 0.42, z: 4.5, tx: 1.1, ty: 0.55, tz: 1.8, fov: 42 }, 'power2.inOut')
      .to(8.4, 0.9, { x: -0.6, y: 0.55, z: 3.6, tx: 1.5, ty: 1.2, tz: 1.6, fov: 50 }, 'power2.inOut')          // vertical two-shot: Pipo low, Brasa high
      .to(9.3, 2.2, { x: -0.3, y: 0.7, z: 3.8, fov: 46 }, 'sine.inOut')
      .to(11.55, 0.4, { x: 2.25, y: 1.62, z: 3.0, tx: 2.05, ty: 1.62, tz: 1.6, fov: 30 }, 'expo.out')        // punch-in: nose
      .to(12.45, 0.8, { x: 3.6, y: 2.6, z: 9.5, tx: 0, ty: 2.2, tz: -3, fov: 52 }, 'power3.out')             // everyone laughs
      .to(13.6, 0.7, { x: 0.15, y: 0.42, z: 3.3, tx: 1.8, ty: 1.6, tz: 1.4, fov: 46 }, 'power2.inOut')       // over Pipo: Brasa points
      .to(15.6, 0.5, { x: 0.75, y: 0.33, z: 3.15, tx: 0.55, ty: 0.32, tz: 2.2, fov: 36 }, 'power2.out')      // sad Pipo
      .to(17.45, 0.25, { x: 0.68, y: 0.34, z: 2.95, ty: 0.34, fov: 30 }, 'expo.out')                        // the sneeze builds
      .to(SNEEZE_T, 0.5, { x: 2.2, y: 1.0, z: 7.0, tx: -0.8, ty: 1.4, tz: 0, fov: 54 }, 'power3.out')        // ATCHIM! wide
      .to(18.2, 1.8, { ...CAM1_END }, 'power2.inOut')                                                          // tilt up: the director floats away
      .to(12.05, 0.05, { shake: 0.02 }, 'none').to(12.1, 0.3, { shake: 0 }, 'none')
      .to(SNEEZE_T, 0.05, { shake: 0.05 }, 'none').to(SNEEZE_T + 0.05, 0.5, { shake: 0 }, 'power2.out');
    rig.prime(20);
    const NOSE_KEY = new THREE.Vector3(2.05, 1.62, 1.6); let noseNow = NOSE_KEY.clone();
    rig.follow = (t) => { const w = pulse(t, 11.45, 12.45, 0.12); return [(noseNow.x - NOSE_KEY.x) * w, (noseNow.y - NOSE_KEY.y) * w, (noseNow.z - NOSE_KEY.z) * w]; };

    function update(t) {
      W.update(t); W.focus(new THREE.Vector3(0, 0, 0), 14);
      // ── big dragons: fire + laughter ──
      bigs.forEach((d, i) => {
        const on = FIRE[i].some(([a, b]) => t > a - 0.3 && t < b);
        const laugh = smooth(12.3, 12.6, t) * (1 - smooth(16.2, 16.8, t));
        d.pose({ lookUp: on ? 0.85 : 0.1 + 0.3 * laugh, mouth: on ? 1 : laugh * (0.6 + 0.4 * Math.abs(Math.sin(t * 18 + i))), laugh, flap: on ? 0.4 : 0.15, flapSpeed: 5, wag: 0.4, belly: laugh * 0.8, eyeOpen: laugh > 0.5 ? 0.25 : Dragon.blink(t, i), brow: on ? 0.5 : 0, smile: 0.5 }, t + i);
        d.root.updateMatrixWorld(true); d.mouthAnchor.getWorldPosition(mouth);
        dir.set(0, 1, 0).applyQuaternion(d.head.getWorldQuaternion(new THREE.Quaternion())); dir.set(0, 0.25, 1).applyQuaternion(d.head.getWorldQuaternion(new THREE.Quaternion())).normalize();
        const [w1, w2] = FIRE[i]; const win = t < w2[0] - 0.4 ? w1 : w2;
        fires[i].set(t, mouth, dir, win[0], win[1]);
      });
      // ── PIPO ──
      const walkIn = range(t, 4.1, 5.6);
      pipo.root.position.set(lerp(-1.4, PIPO_SPOT.x, walkIn), 0, lerp(2.9, PIPO_SPOT.z, walkIn));
      pipo.root.rotation.y = keys(t, [[4, 1.2], [5.6, 0.35], [8.4, 0.6], [12.2, 0.55], [13, 0.2], [17.4, 0.2], [17.8, 0.35]]);
      const fierce = smooth(5.8, 6.4, t) * (1 - smooth(7.9, 8.2, t));
      const inhale1 = pulse(t, 8.1, 8.85, 0.3), blow1 = pulse(t, 8.8, 9.4, 0.12);
      const sad = smooth(14.2, 15.0, t) * (1 - smooth(16.9, 17.2, t));
      const inhale2 = smooth(17.0, 17.55, t) * (1 - smooth(SNEEZE_T - 0.02, SNEEZE_T + 0.05, t)), sneeze = pulse(t, SNEEZE_T - 0.03, SNEEZE_T + 0.45, 0.06);
      const hopeful = pulse(t, 9.4, 12.0, 0.4), shock = pulse(t, 18.0, 20.5, 0.2);
      pipo.pose({
        walk: walkIn * 2.6, walkAmt: t > 4.1 && t < 5.7 ? 1 : 0, puff: easeOutElastic(range(t, 5.8, 6.6)) * (1 - smooth(7.9, 8.2, t)) + inhale1 * 1.1 + inhale2 * 1.3,
        squash: 1 + fierce * 0.06 - inhale1 * 0.05 + blow1 * 0.08 - sad * 0.08 + inhale2 * 0.08 - sneeze * 0.18 + Math.sin(t * 40) * 0.02 * inhale2,
        brow: fierce * 1 + inhale1 * 0.6 - shock * 0.3, mouth: fierce * 0.75 + blow1 * 0.5 + sneeze * 1.2 + shock * 0.6, wide: fierce * 0.6, cheeks: inhale1 + inhale2,
        eyeOpen: (t < 4 ? 1 : Dragon.blink(t, 0.4)) * (1 - inhale2 * 0.6) * (1 - sneeze) + shock * 0.2, eyeBig: 1 + hopeful * 0.1 + sad * 0.12 + shock * 0.2,
        lookX: keys(t, [[9.4, 0], [10.4, 0.6], [12, 0.8], [12.4, 0.5], [17, 0.3], [18, -0.6]]), lookY: keys(t, [[9.4, 0], [10.5, 0.5], [12, 0.8], [13.5, 0.6], [16, -0.4], [17, 0], [18.1, 0.9]]),
        lookUp: keys(t, [[5.8, 0], [6.4, 0.15], [9.6, 0.25], [11.8, 0.55], [13.4, 0.55], [15.5, -0.1], [17.6, 0.1], [17.7, -0.4], [18.1, 0.6], [20, 0.8]]),
        smile: fierce ? -0.2 : 0.4 * hopeful - 0.8 * sad + 0.3, sad, tears: sad, armsOut: fierce * 0.4 + shock * 0.6, armR: fierce * 0.5, armL: fierce * 0.5,
        lean: -0.12 * fierce - 0.25 * sneeze + 0.15 * inhale2, flap: fierce * 0.8 + shock * 0.6, flapSpeed: 22, wag: 0.3 + fierce * 0.8, tailUp: fierce,
        hop: pulse(t, 6.0, 6.5, 0.12) * 0.5 + pulse(t, SNEEZE_T, SNEEZE_T + 0.35, 0.1) * 0.6, blush: sad * 0.6, shakeHead: pulse(t, 17.35, 17.6, 0.05) * 0.4,
      }, t);
      // ── BRASA ──
      const laughB = smooth(12.3, 12.55, t) * (1 - smooth(13.5, 13.8, t));
      const point = smooth(13.5, 13.9, t) * (1 - smooth(16.6, 17.1, t));
      const talk = (t > 13.7 && t < 17.0) ? 0.35 + 0.35 * Math.abs(Math.sin(t * 13)) : 0;
      const cross = smooth(10.6, 11.8, t) * (1 - smooth(POP_T + 0.2, POP_T + 0.5, t));
      brasa.root.rotation.y = keys(t, [[4, -0.25], [6, -0.55], [12.4, -0.5], [13.5, -0.85], [17, -0.85], [17.7, -0.4]]);
      brasa.pose({
        armsCrossed: (1 - smooth(12.2, 12.4, t)) + smooth(17.0, 17.5, t) * (1 - smooth(SNEEZE_T, SNEEZE_T + 0.2, t)), belly: laughB, point,
        laugh: laughB + point * 0.25 * Math.abs(Math.sin(t * 8)), mouth: laughB * 0.9 + talk + pulse(t, SNEEZE_T, 19.5, 0.2) * 0.7,
        brow: 0.55 - cross * 0.7 - pulse(t, POP_T, 12.5, 0.05) * 0.4, smile: 0.7, eyeOpen: (cross ? 1 : Dragon.blink(t, 1.7)) * (1 - pulse(t, POP_T, POP_T + 0.25, 0.04)) * (laughB > 0.5 ? 0.3 : 1),
        cross, lookY: cross * 0.6 + pulse(t, SNEEZE_T, 20, 0.3) * 0.9, lookX: -0.3 * point, eyeBig: 1 + pulse(t, SNEEZE_T, 20, 0.2) * 0.25,
        headYaw: keys(t, [[6, 0], [7, -0.3], [12, -0.1], [14, -0.35]]), lookUp: keys(t, [[11, 0], [11.6, -0.1], [12.4, 0.1], [17.8, 0.1], [18.4, 0.6]]),
        squash: 1 - pulse(t, POP_T, POP_T + 0.25, 0.04) * 0.06, flap: 0.12, flapSpeed: 4, wag: 0.3,
      }, t);
      // ── DIRECTOR ──
      const caught = t >= GRAB_T;
      const dp = caught ? directorBubble(t) : null;
      if (caught) director.root.position.set(dp.x, dp.y - 1.0 + Math.sin(t * 3) * 0.05, dp.z); else director.root.position.copy(podium);
      director.root.rotation.set(caught ? Math.sin(t * 2.2) * 0.15 : 0, 0.55 + (caught ? Math.sin(t * 1.4) * 0.3 : 0), caught ? Math.sin(t * 1.7) * 0.2 : 0);
      const panic = smooth(GRAB_T, GRAB_T + 0.3, t);
      director.pose({ mouth: (t > 18.25 && t < 20 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 15)) : 0) + pulse(t, 12.4, 16.5, 0.3) * 0.2, armL: panic * (0.6 + 0.3 * Math.sin(t * 12)), armR: panic * (0.6 + 0.3 * Math.sin(t * 12 + 2)),
        eyeBig: 1 + panic * 0.35, eyeOpen: Dragon.blink(t, 2.2), brow: -0.4 * panic, sad: panic * 0.6, tuck: panic * 0.4 + 0.3 * panic * Math.sin(t * 9), spread: panic, laugh: pulse(t, 12.5, 15.5, 0.3) * 0.4, flap: panic * 0.9, flapSpeed: 20 }, t);
      // ── bubble #1: one lonely soap bubble ──
      pipo.root.updateMatrixWorld(true); brasa.root.updateMatrixWorld(true);
      pipo.mouthAnchor.getWorldPosition(mouth); brasa.noseTip.getWorldPosition(nose);
      const born = 8.85, launch = 9.35;
      if (t >= born) {
        const g = easeOutBack(range(t, born, launch), 2.5);
        const fk = range(t, launch, POP_T); const e = fk * fk * (3 - 2 * fk);
        v.copy(mouth).lerp(nose, e); v.y += Math.sin(fk * Math.PI) * 0.35 + Math.sin(t * 3.1) * 0.03; v.x += Math.sin(t * 2.3) * 0.03 * (1 - fk); v.z += 0.05 * Math.sin(fk * Math.PI);
        if (fk === 0) v.copy(mouth).add(new THREE.Vector3(0.02, 0.03 * g, 0.05 * g));
        bub.set(v, 0.085 * g * (1 + fk * 0.25), t, { wobble: 0.08 + pulse(t, 11.6, POP_T, 0.1) * 0.2, squash: 1 + Math.sin(t * 7) * 0.04 + pulse(t, POP_T - 0.12, POP_T, 0.03) * -0.25, popT: POP_T });
      } else bub.set(mouth, 0, t, { alpha: 0 });
      // ── the sneeze: hundreds of glittering bubbles ──
      if (!sneezeEmitted) {
        const o = mouth.clone(); const d = new THREE.Vector3(Math.sin(0.35), 0.35, Math.cos(0.35));
        field.emit({ n: 330, t0: SNEEZE_T, t1: SNEEZE_T + 0.35, origin: o, dir: d.toArray(), speed: 7.5, spread: 0.8, size: [0.06, 0.34], life: [2.0, 5.5], drag: 1.2, lift: 0.6 });
        field.emit({ n: 60, t0: SNEEZE_T + 0.1, t1: SNEEZE_T + 0.9, origin: o, dir: [0, 1, 0.3], speed: 2, spread: 0.6, size: [0.03, 0.1], life: [1.5, 3.5], drag: 2, lift: 0.4 });
        sneezeEmitted = true;
      }
      field.update(t);
      // big bubble flies from the sneeze to the director and swallows him
      if (t >= SNEEZE_T) {
        const fk = range(t, SNEEZE_T, GRAB_T); const target = caught ? directorBubble(t) : podium.clone().add(new THREE.Vector3(0, 1.0, 0));
        v.copy(mouth).lerp(target, fk * fk * (3 - 2 * fk)); v.y += Math.sin(fk * Math.PI) * 1.2;
        const r = lerp(0.2, DIR_BUBBLE_R, easeOutBack(range(t, SNEEZE_T + 0.15, GRAB_T + 0.15), 1.8));
        dirBub.set(caught ? target : v, r, t, { wobble: 0.05 + pulse(t, GRAB_T, GRAB_T + 0.6, 0.1) * 0.25, squash: 1 + Math.sin((t - GRAB_T) * 9) * 0.1 * Math.exp(-Math.max(0, t - GRAB_T) * 2.5) });
      } else dirBub.set(mouth, 0, t, { alpha: 0 });
      noseNow.copy(nose);
      const camera = rig.apply(t);
      const post = DEFAULT_POST();
      post.fade = 1 - smooth(0, 0.6, t);
      post.flash = pulse(t, SNEEZE_T - 0.01, SNEEZE_T + 0.12, 0.03) * 0.35;
      // screen positions for comic overlays
      const scr = (p) => { const q = p.clone().project(camera); return [(q.x * 0.5 + 0.5) * WIDTH, (1 - (q.y * 0.5 + 0.5)) * HEIGHT]; };
      const [nx, ny] = scr(nose), [px, py] = scr(mouth);
      return { camera, post, overlay: (ctx) => {
        drawSpeedLines(ctx, t, pulse(t, 6.55, 7.3, 0.08) * 0.8, px, py);
        drawSpeedLines(ctx, t, pulse(t, 11.5, 12.25, 0.08) * 0.7, nx, ny);
        drawSpeedLines(ctx, t, pulse(t, SNEEZE_T - 0.02, SNEEZE_T + 0.5, 0.05), WIDTH / 2, HEIGHT * 0.55);
        drawBurst(ctx, t, POP_T, 'POP!', clamp(nx + 160, 220, 860), clamp(ny - 180, 300, 1500), { seed: 3, color: '#7ff0dc' });
        drawBurst(ctx, t, SNEEZE_T, 'ATCHIM!', WIDTH / 2, 560, { size: 120, seed: 9, color: '#ffe14a', dur: 1.0, rot: 0.08 });
        drawBurst(ctx, t, 6.45, 'GRRR!', clamp(px + 200, 240, 840), clamp(py - 330, 280, 1400), { size: 90, seed: 4, color: '#ff8a5c', dur: 0.95 });
      } };
    }
    return { scene: S, update, objects: A };
  },

  sound(s) {
    s.march(0.3, 12.2, 53, 0.07, 0.25);                                            // bouncy academy march
    s.whoosh(0.2, 3.6, 0.3, 300, 2000);
    [[0.5, 1.6], [1.3, 1.7], [2.2, 1.7], [4.4, 0.8], [5.6, 0.7], [9.0, 0.8]].forEach(([t, d], i) => s.roar(t, d, 0.22 - (i > 2 ? 0.08 : 0)));
    for (let i = 0; i < 6; i++) s.squeak(4.15 + i * 0.25, 0.05, 1300 + (i % 2) * 300);  // tiny waddle steps
    s.slide(5.8, 0.6, 300, 900, 0.1);                                               // chest puff
    s.tone({ t: 6.45, dur: 0.8, freq: 160, type: 'square', gain: 0.05, attack: 0.02, release: 0.4, filter: { type: 'lowpass', freq: 900 }, send: 0.2 }); // tiny "grrr"
    s.noise({ t: 8.1, dur: 0.7, gain: 0.12, attack: 0.6, release: 0.1, filter: { type: 'bandpass', freq: 600, freqEnd: 1800, Q: 1 }, send: 0.2, curve: 'lin' }); // inhale
    s.bloop(8.9, 0.14, 420);
    for (let i = 0; i < 8; i++) s.chime(9.4 + i * 0.32, 1568 * Math.pow(2, [0, 4, 7, 12, 7, 4, 9, 12][i] / 12) / 2, 0.035, 1.2, Math.sin(i) * 0.5); // floating
    s.pop(POP_T, 0.3);
    s.march(12.4, 17.0, 53, 0.04, 0.2);
    s.trombone(15.6, [58, 57, 56, 55], 0.1);
    s.noise({ t: 17.0, dur: 0.55, gain: 0.1, attack: 0.5, release: 0.05, filter: { type: 'bandpass', freq: 500, freqEnd: 2000, Q: 1 }, send: 0.2, curve: 'lin' });
    s.whoosh(SNEEZE_T, 0.9, 0.35, 3000, 400);
    for (let i = 0; i < 26; i++) s.bloop(SNEEZE_T + 0.02 + i * 0.045, 0.05, 380 + s.r() * 900);
    s.sparkle(SNEEZE_T + 0.1, 10, 0.03);
    s.tone({ t: GRAB_T - 0.05, dur: 0.4, freq: 220, freqEnd: 90, type: 'sine', gain: 0.12, attack: 0.01, release: 0.3, send: 0.3 }); // shloop
    s.slide(18.1, 1.8, 500, 1800, 0.08);                                            // wheee — up he goes
    s.pad(18.0, 2.0, [65, 69, 72], { gain: 0.06, type: 'triangle', cutoff: 2000, attack: 0.3, release: 0.8 });
  },
};
