import * as THREE from 'three';
import ep1, { CAM1_END, PIPO_SPOT, directorBubble, DIR_BUBBLE_R } from './ep1.js';
import { MARKET, CASTLE, STALLS } from '../scenes/World.js';
import { Luna, IceMonster } from '../characters/Cast.js';
import { Dragon } from '../characters/Dragon.js';
import { FREEZE } from '../characters/materials.js';
import { bounce, bounceTimes } from '../effects/Physics.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST, WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, rng, easeOutBack } from '../core/util.js';
import { drawBurst, drawSpeedLines } from '../overlay/Overlay.js';

const G = MARKET.y;                                    // market ground height
export const CUT_T = 5.0, CANOPY_T = 5.55, CRASH_T = 6.25, REST_T = 7.25, MELON_T = 7.6, BUMP_T = 9.0, PLOP_T = 14.55;
const S0 = STALLS[0], S1 = STALLS[1];
// where Pipo ends up (centre of the square) and the end-of-episode framing
export const PIPO2_END = new THREE.Vector3(MARKET.x + 1.2, G, MARKET.z + 3.2);
export const LUNA_OFF = new THREE.Vector3(0.55, 0.42, 0.25);
export const MONSTER_POS = new THREE.Vector3(CASTLE.x + 5, G, CASTLE.z - 30);
export const MONSTER_SCALE = 5.6;
export const monsterRise = (t) => smooth(15.6, 19.6, t);        // 0 → hidden below horizon, 1 → standing
export const CAM2_END = { x: PIPO2_END.x + 0.4, y: G + 0.3, z: PIPO2_END.z + 3.0, tx: CASTLE.x + 4, ty: G + 40, tz: CASTLE.z - 20, fov: 66, roll: 0.03 };

// flight at the academy (0–5 s): chasing the director's bubble, then the wings give up
function flyPos(t) {
  const k = keys(t, [[0, [PIPO_SPOT.x, 0, PIPO_SPOT.z]], [0.7, [0.4, 0.4, 1.6]], [1.8, [-0.6, 2.4, -2.5]], [3.0, [-1.6, 4.6, -7.5]], [3.9, [-2.2, 5.6, -11]]]);
  const p = new THREE.Vector3(...k); p.y += Math.sin(t * 9) * 0.18 * smooth(0.6, 1.0, t);
  if (t > 3.9) { const f = t - 3.9; p.z -= f * 2.0; p.y += 1.2 * f - 0.5 * 18 * f * f; }
  return p;
}
// market (5–20 s): tumble path
function marketPos(t) {
  const above = new THREE.Vector3(S0.x - 1.5, G + 16, S0.z + 1.5), can0 = new THREE.Vector3(S0.x, G + 2.75, S0.z);
  const s1 = new THREE.Vector3(S1.x, G + 1.0, S1.z);
  if (t < CANOPY_T) { const k = range(t, CUT_T, CANOPY_T); return above.clone().lerp(can0, k * k); }
  if (t < CRASH_T) { const k = range(t, CANOPY_T, CRASH_T); const p = can0.clone().lerp(s1, k); p.y += Math.sin(k * Math.PI) * 2.6; return p; }
  if (t < REST_T) { const k = range(t, CRASH_T, REST_T); const p = new THREE.Vector3(S1.x, G, S1.z).lerp(PIPO2_END.clone().add(new THREE.Vector3(-1.4, 0, -0.8)), 1 - Math.pow(1 - k, 2)); p.y = G + Math.abs(Math.sin(k * Math.PI * 3)) * 0.5 * (1 - k); return p; }
  const w = keys(t, [[REST_T, [-1.4, -0.8]], [8.2, [-0.6, -0.2]], [BUMP_T, [0.3, 0.5]], [9.4, [0.05, 0.25]], [10.0, [0, 0]]]);
  return new THREE.Vector3(PIPO2_END.x + w[0], G, PIPO2_END.z + w[1]);
}

export default {
  number: 2, title: 'O PRIMEIRO DESASTRE', duration: 20,
  build({ renderer }) {
    const base = ep1.build({ renderer }); const A = base.objects; const { W, S, pipo } = A;
    const luna = new Luna(); luna.root.scale.setScalar(1.25); S.add(luna.root);
    const monster = new IceMonster(); monster.root.scale.setScalar(MONSTER_SCALE); monster.root.position.copy(MONSTER_POS); monster.root.lookAt(MARKET.x, G, MARKET.z); S.add(monster.root);
    // physics: fruits of the stall Pipo crashes into
    const r = rng(42); const hit = [];
    W.fruits.forEach((f, i) => { if (f.stall === 1 && !f.melon) { const away = new THREE.Vector3(f.p.x - S1.x, 0, f.p.z - S1.z).normalize(); hit.push({ i, p0: f.p.clone(), v0: new THREE.Vector3(away.x * (2 + r() * 3) + (r() - 0.5) * 3, 3 + r() * 5, away.z * (2 + r() * 3) + (r() - 0.5) * 3), t0: CRASH_T + r() * 0.08, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize() }); } });
    const melonI = W.fruits.findIndex((f) => f.melon); const melon0 = W.fruits[melonI].p.clone();
    const stall1 = W.stalls[1], stall0 = W.stalls[0];
    const q = new THREE.Quaternion(), headPos = new THREE.Vector3(), headQ = new THREE.Quaternion(), tmp = new THREE.Vector3();
    const sparkle = [];
    // camera
    const rig = new CameraRig({ ...CAM1_END });
    rig.to(0, 1.2, { x: 1.6, y: 1.4, z: 5.2, tx: 0.2, ty: 1.4, tz: 0.5, fov: 48 }, 'power2.inOut')                 // Pipo takes off
      .to(1.2, 2.6, { x: 2.4, y: 4.2, z: -2.5, tx: -1.8, ty: 4.6, tz: -8, fov: 50 }, 'sine.inOut')                  // chase: side tracking
      .to(3.8, 1.0, { x: 0.8, y: 7.2, z: -6.5, tx: -2.4, ty: 3.5, tz: -13, fov: 52 }, 'power2.out')                // ...and down he goes
      .set(CUT_T, { x: MARKET.x + 4.5, y: G + 1.1, z: MARKET.z + 9.5, tx: S0.x, ty: G + 6, tz: S0.z, fov: 60 })   // market: looking up
      .to(CUT_T, 1.2, { ty: G + 1.6, tx: lerp(S0.x, S1.x, 0.5), tz: lerp(S0.z, S1.z, 0.5), fov: 54 }, 'power2.inOut')
      .to(6.4, 1.1, { x: PIPO2_END.x + 2.2, y: G + 1.4, z: PIPO2_END.z + 4.2, tx: PIPO2_END.x - 0.8, ty: G + 0.5, tz: PIPO2_END.z - 0.6, fov: 48 }, 'power2.inOut')
      .to(7.5, 0.3, { x: PIPO2_END.x - 0.9, y: G + 0.75, z: PIPO2_END.z + 1.2, tx: PIPO2_END.x - 1.3, ty: G + 0.5, tz: PIPO2_END.z - 0.7, fov: 36 }, 'expo.out') // melon punch-in
      .to(8.0, 1.8, { x: PIPO2_END.x + 0.6, y: G + 0.9, z: PIPO2_END.z + 3.0, tx: PIPO2_END.x - 0.2, ty: G + 0.4, tz: PIPO2_END.z, fov: 44 }, 'sine.inOut')
      .to(9.9, 0.8, { x: PIPO2_END.x + 0.9, y: G + 0.55, z: PIPO2_END.z + 1.9, tx: PIPO2_END.x + 0.15, ty: G + 0.45, tz: PIPO2_END.z, fov: 40 }, 'power2.inOut')  // two-shot with Luna
      .to(13.3, 0.6, { x: PIPO2_END.x - 0.35, y: G + 0.45, z: PIPO2_END.z + 1.5, tx: PIPO2_END.x + 0.1, ty: G + 0.45, tz: PIPO2_END.z, fov: 38 }, 'power2.inOut')
      .to(15.2, 1.6, { ...CAM2_END }, 'power2.inOut')                                                              // the shadow: the monster rises
      .to(5.55, 0.05, { shake: 0.06 }, 'none').to(5.6, 0.3, { shake: 0 }, 'none').to(CRASH_T, 0.05, { shake: 0.12 }, 'none').to(CRASH_T + 0.05, 0.6, { shake: 0 }, 'power2.out')
      .to(16.5, 1, { shake: 0.04 }, 'none').to(19.8, 0.2, { shake: 0.02 }, 'none');
    rig.prime(20);

    function update(t) {
      base.update(20 + t);                                // the academy keeps living (director bubble, laughing, bubbles)
      const inMarket = t >= CUT_T;
      // ── PIPO ──
      const p = inMarket ? marketPos(t) : flyPos(t);
      pipo.root.position.copy(p);
      const spin = inMarket ? (t < REST_T ? (t - CUT_T) * 9 : 0) : (t > 3.9 ? (t - 3.9) * 8 : 0);
      pipo.root.rotation.set(inMarket ? (t < REST_T ? Math.sin(spin) * 0.6 : 0) : -0.35 * smooth(0.6, 1.2, t) + (t > 3.9 ? spin : 0), inMarket ? keys(t, [[REST_T, 0.8], [8.2, 0.2], [9, -0.4], [9.4, 0.3], [10, 0.25], [13.3, 0.6], [15.4, 0.2], [16, -0.2]]) : Math.PI + 0.3, inMarket && t < REST_T ? Math.cos(spin) * 0.8 : 0);
      const flying = !inMarket && t > 0.6, panicFly = smooth(3.4, 3.9, t) * (inMarket ? 0 : 1);
      const dizzy = pulse(t, REST_T, 8.2, 0.2), blind = smooth(MELON_T, MELON_T + 0.1, t) * (1 - smooth(PLOP_T, PLOP_T + 0.05, t));
      const shock = smooth(15.6, 16.2, t);
      const talk = (t > 1.1 && t < 3.2) || (t > 13.35 && t < 15.7) ? 0.3 + 0.4 * Math.abs(Math.sin(t * 14)) : 0;
      pipo.pose({
        flap: flying ? 1 : (inMarket && t < REST_T ? 0.8 : 0) + pulse(t, 13.3, 15.6, 0.3) * 0.4, flapSpeed: flying ? 34 + panicFly * 20 : 24, wingOpen: flying ? 1 : 0,
        lean: flying ? -0.4 : 0, tuck: flying ? 0.5 : 0, armsOut: flying ? 0.6 + panicFly * 0.4 : (blind ? 0.9 : 0) + shock * 0.3,
        armL: blind * (t > 10 && t < PLOP_T ? 0.85 + 0.1 * Math.sin(t * 9) : 0.2), armR: blind * (t > 10 && t < PLOP_T ? 0.85 + 0.1 * Math.sin(t * 9 + 1) : 0.2),
        walk: t * 2.2, walkAmt: t > REST_T + 0.4 && t < 10 ? 0.9 : 0,
        mouth: talk + panicFly * 0.8 + (inMarket && t < REST_T ? 0.9 : 0) + shock * 0.9, eyeBig: 1 + panicFly * 0.3 + shock * 0.3,
        eyeOpen: dizzy > 0.3 ? 0.5 : Dragon.blink(t, 0.3), lookX: dizzy * Math.sin(t * 10), lookY: dizzy * Math.cos(t * 10) * 0.6 + shock * 0.9,
        brow: -0.3 * shock - panicFly * 0.4, smile: 0.3 - shock * 0.8, lookUp: shock * 1.1 + (flying ? 0.5 : 0), wag: 0.5 + panicFly,
        squash: 1 - pulse(t, CANOPY_T - 0.03, CANOPY_T + 0.12, 0.04) * 0.3 - pulse(t, CRASH_T - 0.02, CRASH_T + 0.15, 0.04) * 0.35 + pulse(t, CANOPY_T + 0.1, CANOPY_T + 0.35, 0.08) * 0.2,
        shakeHead: dizzy * 0.5,
      }, t);
      // ── the melon ──
      pipo.root.updateMatrixWorld(true); pipo.head.getWorldPosition(headPos); pipo.head.getWorldQuaternion(headQ);
      const mi = melonI; const k = range(t, CRASH_T + 0.1, MELON_T);
      if (t < CRASH_T + 0.1) W.setFruit(mi, melon0, q.identity());
      else if (t < MELON_T) { tmp.copy(melon0).lerp(headPos, k); tmp.y += Math.sin(k * Math.PI) * 3.0; W.setFruit(mi, tmp, q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), k * 9)); }
      else if (t < PLOP_T) { tmp.set(0, 0.08 + 0.02 * Math.sin(t * 9) * (t > 10 ? 1 : 0), 0.0).applyQuaternion(headQ).add(headPos); W.setFruit(mi, tmp, headQ, 0.56); }
      else { const b = bounce(headPos.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(1.6, 3.8, 0.8), t - PLOP_T, { groundY: G, radius: 0.32 }); W.setFruit(mi, b.p, q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -b.rolled / 0.32)); }
      // ── fruit explosion (closed-form bounces) ──
      for (const h of hit) { const b = bounce(h.p0, h.v0, t - h.t0, { groundY: G, radius: W.fruits[h.i].r }); W.setFruit(h.i, b.p, q.setFromAxisAngle(h.ax, b.rolled / W.fruits[h.i].r)); }
      // stalls: canopy trampoline + stall 1 topples
      stall0.can.position.y = 2.65 - pulse(t, CANOPY_T - 0.02, CANOPY_T + 0.5, 0.05) * Math.sin(range(t, CANOPY_T, CANOPY_T + 0.5) * Math.PI * 3) * 0.35;
      const tip = range(t, CRASH_T, CRASH_T + 0.7); stall1.g.rotation.x = (tip * tip * 1.45) - Math.sin(range(t, CRASH_T + 0.7, CRASH_T + 1.2) * Math.PI * 2) * 0.06 * (t > CRASH_T + 0.7 ? 1 : 0);
      stall1.g.position.y = G - tip * 0.15;
      // ── LUNA ──
      const lk = range(t, 9.4, 10.3);
      const lp = PIPO2_END.clone().add(LUNA_OFF); lp.x += (1 - lk) * 4; lp.y += (1 - lk) * 1.6 + Math.sin(t * 2) * 0.03; lp.z -= (1 - lk) * 1.5;
      luna.root.position.copy(lp); luna.root.visible = t > 9.3; luna.root.rotation.y = -0.7 + (1 - lk) * -0.6 + 0.4 * shock;
      const lt = t > 10.2 && t < 13.1 ? 0.3 + 0.5 * Math.abs(Math.sin(t * 13)) : 0;
      luna.pose({ mouth: lt + shock * 0.7, armR: 0.3 + 0.4 * pulse(t, 10.2, 13.1, 0.3), lookUp: shock * 0.9, headYaw: -0.3, tilt: 0.25 * pulse(t, 11.5, 13, 0.3), eyeBig: 1 + shock * 0.3, lean: (1 - lk) * 0.5, wave: pulse(t, 10.2, 13, 0.2), eyeOpen: Dragon.blink(t, 1.1) }, t);
      // ── shadow, frost & the ICE MONSTER ──
      const rise = monsterRise(t);
      monster.root.position.set(MONSTER_POS.x, G - 85 * (1 - rise), MONSTER_POS.z);
      monster.root.visible = rise > 0.001;
      monster.pose({ lookUp: -0.3, roar: pulse(t, 18.6, 20.5, 0.3), armsOut: 0.3 + 0.3 * rise, armL: 0.25 * rise, eyeGlow: 0.3 + 1.2 * smooth(17.5, 18.8, t), glow: rise }, t);
      const dark = smooth(15.3, 17.0, t);
      W.skyU.uFreeze.value = 0.65 * smooth(15.6, 19, t); W.skyU.uDark.value = 0.55 * dark;
      W.hemi.intensity = 0.75 * (1 - 0.45 * dark); W.sun.intensity = 1.55 * (1 - 0.75 * dark);
      FREEZE.uFreezeCenter.value.copy(MONSTER_POS); FREEZE.uFreezeRadius.value = 50 * smooth(16, 20, t); FREEZE.uFreezeAmount.value = t > 15.9 ? 1 : 0;
      S.fog.color.setRGB(lerp(0.75, 0.6, dark), lerp(0.89, 0.72, dark), lerp(1, 0.9, dark));
      W.focus(inMarket ? new THREE.Vector3(PIPO2_END.x, G, PIPO2_END.z) : p, inMarket ? 9 : 14);
      const camera = rig.apply(t);
      const post = DEFAULT_POST();
      post.tint = [1 - 0.12 * dark, 1 - 0.05 * dark, 1 + 0.08 * dark];
      post.vignette = 0.3 + 0.35 * dark;
      const sp = (v) => { const q2 = v.clone().project(camera); return [(q2.x * 0.5 + 0.5) * WIDTH, (1 - (q2.y * 0.5 + 0.5)) * HEIGHT]; };
      const [hx, hy] = sp(headPos);
      return { camera, post, overlay: (ctx) => {
        drawSpeedLines(ctx, t, pulse(t, 3.9, 4.9, 0.1) * 0.7, WIDTH / 2, HEIGHT * 0.3);
        drawBurst(ctx, t, CANOPY_T, 'BOING!', 300, 620, { seed: 2, color: '#7ff0dc', size: 100 });
        drawBurst(ctx, t, CRASH_T, 'CRASH!', 760, 760, { seed: 5, color: '#ff8a5c', size: 120, rot: 0.1 });
        drawBurst(ctx, t, MELON_T, 'TUM!', clamp(hx, 250, 830), clamp(hy - 260, 260, 1400), { seed: 7, color: '#a6f06a', size: 100 });
        drawBurst(ctx, t, BUMP_T, 'PLOFT!', clamp(hx + 220, 260, 820), clamp(hy - 180, 260, 1400), { seed: 8, color: '#ffe14a', size: 90 });
        drawBurst(ctx, t, PLOP_T, 'PLOP!', clamp(hx - 160, 240, 820), clamp(hy - 240, 260, 1400), { seed: 6, color: '#ff8ab0', size: 90 });
      } };
    }
    return { scene: S, update, objects: { ...A, luna, monster } };
  },

  sound(s) {
    s.march(0, 3.8, 53, 0.06, 0.2);
    for (let i = 0; i < 26; i++) s.tone({ t: 0.6 + i * 0.12, dur: 0.06, freq: 900 + (i % 2) * 300, type: 'triangle', gain: 0.03, attack: 0.003, release: 0.05, send: 0.1 }); // tiny frantic flaps
    s.slide(3.9, 1.1, 1600, 220, 0.13);                                             // falling slide whistle
    s.whoosh(4.6, 0.6, 0.3, 2000, 300);
    s.boing(CANOPY_T, 0.25, 160);
    s.crash(CRASH_T, 0.45); s.thud(CRASH_T, 0.5);
    for (let i = 0; i < 12; i++) s.bloop(CRASH_T + 0.35 + i * 0.09 + s.r() * 0.05, 0.05, 200 + s.r() * 300);   // fruits bouncing
    s.thud(MELON_T, 0.35); s.tone({ t: MELON_T, dur: 0.3, freq: 180, freqEnd: 120, type: 'sine', gain: 0.2, attack: 0.002, release: 0.25, send: 0.2 });
    for (let i = 0; i < 5; i++) s.squeak(7.9 + i * 0.32, 0.04, 1100 + (i % 2) * 200);
    s.boing(BUMP_T, 0.2, 130);
    s.march(9.5, 15.2, 55, 0.035, 0.25);
    s.sparkle(9.4, 10, 0.03);                                                        // Luna arrives
    s.pop(PLOP_T, 0.25, 0.6);
    // the shadow — music turns cold
    s.tone({ t: 15.3, dur: 4.7, freq: 55, type: 'sawtooth', gain: 0.08, attack: 2, release: 1, filter: { type: 'lowpass', freq: 300 }, send: 0.4, curve: 'lin' });
    s.pad(15.6, 4.4, [45, 48, 52, 56], { gain: 0.1, cutoff: 1600, attack: 1.8, release: 1 });
    s.noise({ t: 15.8, dur: 4.2, gain: 0.08, attack: 2, release: 1, filter: { type: 'highpass', freq: 4000 }, send: 0.6, curve: 'lin' }); // frost crackle bed
    for (let i = 0; i < 14; i++) s.tone({ t: 16 + i * 0.28, dur: 0.05, freq: 3000 + s.r() * 3000, type: 'square', gain: 0.012, attack: 0.001, release: 0.04, send: 0.5 });
    s.rumble(16.2, 3.6, 0.45); s.roar(18.6, 1.4, 0.3);
    s.boom(19.0, 0.5);
  },
};
