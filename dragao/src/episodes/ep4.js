import * as THREE from 'three';
import ep3, { PIPO3_END, CAM3_END, GROW, KING_BUBBLE_R, kingBubble } from './ep3.js';
import { MARKET, CASTLE } from '../scenes/World.js';
import { MONSTER_POS } from './ep2.js';
import { iceMaterial } from '../characters/Cast.js';
import { Dragon } from '../characters/Dragon.js';
import { FREEZE } from '../characters/materials.js';
import { Bubble, BubbleField } from '../effects/Bubbles.js';
import { FireJet } from '../effects/Fire.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST, WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, rng, easeOutBack, easeOutElastic } from '../core/util.js';
import { drawBurst, drawSpeedLines } from '../overlay/Overlay.js';

const G = MARKET.y;
export const DOME_C = new THREE.Vector3(CASTLE.x, G, CASTLE.z + 18), DOME_R = 40;
export const HOVER = new THREE.Vector3(CASTLE.x - 4, G + 47, CASTLE.z + 30);
export const IMPACT_T = 3.3, HICS = [5.55, 6.2, 6.95, 7.55, 8.3], INHALE0 = 11.0, RELEASE_T = 15.0, WRAP_T = 15.7;
export const MON4_Z = (t) => keys(t, [[0, CASTLE.z - 52], [5, CASTLE.z - 52], [9.5, CASTLE.z - 42], [15, CASTLE.z - 40]]);
export const MON4_SCALE = (t) => GROW(20);
export function monsterLift(t) { const k = Math.max(0, t - WRAP_T); return k * k * 1.6 + k * 2.0; }
export const monsterBubbleR = (t) => lerp(2, 60, easeOutBack(range(t, RELEASE_T + 0.1, WRAP_T + 0.2), 1.4));
export const MB_CENTER = (t) => new THREE.Vector3(MONSTER_POS.x, G + 44 + monsterLift(t), MON4_Z(t));
export const CAM4_END = { x: HOVER.x + 3, y: G + 26, z: HOVER.z + 30, tx: MONSTER_POS.x, ty: G + 105, tz: CASTLE.z - 40, fov: 60, roll: -0.04 };

export default {
  number: 4, title: 'O HERÓI IMPROVÁVEL', duration: 20,
  build({ renderer }) {
    const base = ep3.build({ renderer }); const O = base.objects; const { W, S, pipo, luna, monster, brasa, king, kb } = O;
    const dome = new Bubble(); S.add(dome.mesh, dome.pop.points);
    const mb = new Bubble(); S.add(mb.mesh, mb.pop.points);
    const hics = new BubbleField(30, 4); S.add(hics.mesh);
    const frost = new FireJet({ count: 1400, life: 1.4, speed: 30, spread: 0.16, size: 3.0, seed: 31 }); frost.u.uIce.value = 1; S.add(frost.points);
    const r = rng(9), NS = 700;
    const shards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.5, 0), iceMaterial({ glow: 0.9 }), NS); shards.frustumCulled = false; S.add(shards);
    const mouthW = new THREE.Vector3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pm = new THREE.Vector3();
    const impact = (() => { const d = new THREE.Vector3(0.12, 0.55, -1).normalize(); return DOME_C.clone().addScaledVector(d, DOME_R); })();
    const sh = [...Array(NS)].map(() => { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 14; const n = impact.clone().sub(DOME_C).normalize(); const t1 = new THREE.Vector3(1, 0, 0).cross(n).normalize(), t2 = n.clone().cross(t1);
      const p = impact.clone().addScaledVector(t1, Math.cos(a) * rr).addScaledVector(t2, Math.sin(a) * rr); return { p, v: n.clone().multiplyScalar(4 + r() * 10).addScaledVector(t1, (r() - 0.5) * 12).addScaledVector(t2, (r() - 0.5) * 12), t0: IMPACT_T + r() * 0.9 + rr * 0.02, ax: new THREE.Vector3(r(), r(), r()).normalize(), s: 0.4 + r() * 1.3 }; });
    HICS.forEach((h, i) => hics.emit({ n: 3 + (i % 2), t0: h + 0.02, t1: h + 0.12, origin: [0, 0, 0], dir: [0, 0.3, 1], speed: 0.6, spread: 0.6, size: [0.03, 0.07], life: [0.8, 1.6], drag: 3, lift: 0.3 }));
    const rig = new CameraRig({ ...CAM3_END });
    rig.to(0.9, 1.3, { x: MARKET.x + 14, y: G + 6, z: MARKET.z + 30, tx: HOVER.x, ty: G + 30, tz: HOVER.z - 20, fov: 62 }, 'power2.inOut')            // he takes off
      .to(2.2, 1.0, { x: MARKET.x + 22, y: G + 22, z: MARKET.z + 60, tx: DOME_C.x, ty: G + 22, tz: DOME_C.z, fov: 64 }, 'sine.inOut')               // the dome
      .set(3.0, { x: DOME_C.x + 6, y: G + 18, z: DOME_C.z - 12, tx: impact.x, ty: impact.y, tz: impact.z, fov: 66 })                               // inside: the ice shatters
      .to(3.0, 2.0, { x: DOME_C.x + 9, y: G + 14, z: DOME_C.z - 6, fov: 70 }, 'sine.out')
      .set(5.1, { x: HOVER.x + 1.6, y: HOVER.y + 0.5, z: HOVER.z + 2.2, tx: HOVER.x, ty: HOVER.y + 0.25, tz: HOVER.z, fov: 44 })                    // hiccups
      .to(5.1, 3.6, { x: HOVER.x + 1.2, z: HOVER.z + 1.8, fov: 42 }, 'sine.inOut')
      .to(8.8, 0.8, { x: HOVER.x + 0.9, y: HOVER.y + 0.55, z: HOVER.z + 2.5, tx: HOVER.x + 0.35, ty: HOVER.y + 0.35, fov: 46 }, 'power2.inOut')   // Luna
      .to(INHALE0, 3.6, { x: HOVER.x + 0.35, y: HOVER.y + 0.4, z: HOVER.z + 3.3, tx: HOVER.x, ty: HOVER.y + 0.35, fov: 58 }, 'power1.in')     // he inflates (comic zoom)
      .to(RELEASE_T - 0.05, 0.6, { x: HOVER.x + 30, y: G + 30, z: HOVER.z + 70, tx: MONSTER_POS.x, ty: G + 50, tz: CASTLE.z - 40, fov: 64 }, 'expo.out')  // KA-BLOOP
      .to(16.4, 3.6, { ...CAM4_END }, 'power2.inOut')
      .to(IMPACT_T, 0.05, { shake: 0.25 }, 'none').to(IMPACT_T + 0.05, 0.8, { shake: 0 }, 'power2.out')
      .to(12, 2.9, { shake: 0.02 }, 'power1.in').to(RELEASE_T, 0.05, { shake: 0.3 }, 'none').to(RELEASE_T + 0.05, 0.8, { shake: 0 }, 'power2.out');
    rig.prime(20);

    function update(t) {
      base.update(20); W.update(40 + t);
      kb.mesh.visible = false; kb.pop.points.visible = false; king.root.visible = false; brasa.root.visible = false;   // the king got home; Brasa watches from afar
      FREEZE.uFreezeRadius.value = 69; FREEZE.uFreezeAmount.value = 1;
      // ── PIPO ──
      const lift = range(t, 0.8, 2.0);
      const pp = PIPO3_END.clone().lerp(HOVER, 1 - Math.pow(1 - lift, 2.2)); pp.y += Math.sin(t * 2.4) * 0.15 * lift;
      const hicJ = HICS.reduce((a, h) => a + pulse(t, h, h + 0.22, 0.03), 0);
      pp.y += hicJ * 0.25;
      const inflate = smooth(INHALE0, RELEASE_T - 0.2, t), deflate = range(t, RELEASE_T, 16.3);
      if (t > RELEASE_T && t < 16.3) { const k = deflate; pp.x += Math.sin(k * 25) * 2.5 * (1 - k); pp.y += Math.sin(k * 17) * 1.5 * (1 - k) + k * 1.2; pp.z += Math.cos(k * 21) * 2 * (1 - k); }
      pipo.root.position.copy(pp);
      pipo.root.rotation.set(-0.15 * lift, (t < 1 ? 0 : 0.25) + (t > RELEASE_T && t < 16.3 ? deflate * 30 : 0) + (t > 16.3 ? Math.PI : 0) * smooth(16.3, 16.9, t), (t > RELEASE_T && t < 16.3 ? Math.sin(t * 30) * 0.8 : 0));
      const blowDome = pulse(t, 1.6, 2.9, 0.25), hero = smooth(0.2, 0.7, t) * (1 - smooth(5.3, 5.6, t));
      const round = inflate * (1 - smooth(RELEASE_T, 16.2, t));
      const b3 = 1 - smooth(0, 0.7, t);                       // blend out of episode 3's last pose
      pipo.pose({ flap: lift > 0 ? 1 : 0.5 * b3, flapSpeed: 30 + inflate * 30, wingOpen: 1, tuck: 0.5, lean: -0.15, brow: hero * 0.9 + inflate * 0.6, mouth: blowDome * 0.6 + hicJ * 0.7 + pulse(t, RELEASE_T - 0.05, 16.3, 0.05) * 1.2,
        cheeks: blowDome + inflate * 1.4, round: round * 1.4, puff: round * 2.6, eyeOpen: inflate > 0.6 ? 0.45 : Dragon.blink(t, 0.2), eyeBig: 1 + hicJ * 0.3 + pulse(t, 16.3, 20, 0.4) * 0.1 + 0.25 * b3,
        smile: 0.4 + hero * 0.2 - hicJ * 0.6 + pulse(t, 16.4, 20, 0.3) * 0.6, sad: 0.3 * pulse(t, 5.5, 8.9, 0.3), armL: 0.35 * hero + 0.9 * pulse(t, 16.6, 20, 0.3) + 0.45 * b3, armR: 0.35 * hero + 0.45 * b3, armsOut: -0.15 * b3,
        lookUp: pulse(t, 16.6, 20, 0.4) * 0.6 - 0.5 * b3, lookY: pulse(t, 16.6, 20, 0.4) * 0.6 - 0.9 * b3, squash: 1 - hicJ * 0.12, blush: inflate * 0.6, wag: 0.5 }, t);
      pipo.root.updateMatrixWorld(true); pipo.mouthAnchor.getWorldPosition(pm);
      // ── the dome ──
      const dr = DOME_R * easeOutElastic(range(t, 1.7, 3.0)) ;
      const domePopT = 16.8;
      dome.set(DOME_C, Math.max(dr, 0.001), t, { wobble: 0.02 + pulse(t, IMPACT_T, IMPACT_T + 1.2, 0.05) * 0.1, tint: pulse(t, IMPACT_T, IMPACT_T + 1.5, 0.05) * 0.7, alpha: t > 1.65 ? 0.9 : 0, popT: domePopT });
      dome.pop.points.scale.setScalar(1);
      // monster's frost hits the dome and shatters
      monster.root.position.set(MONSTER_POS.x, G + (t > WRAP_T ? monsterLift(t) : 0), MON4_Z(t)); monster.root.scale.setScalar(MON4_SCALE(t));
      const scared = smooth(WRAP_T, WRAP_T + 0.6, t), stomp = 5 < t && t < 9.5;
      monster.pose({ roar: pulse(t, 2.6, 4.2, 0.2) + pulse(t, 13.4, 15, 0.2) + scared * (t > 17.3 && t < 19.8 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 12)) : 0.3), lean: 0.2 * pulse(t, 2.6, 4.2, 0.2), walk: t * 0.9, walkAmt: stomp ? 1 : 0,
        armL: 0.3 + 0.7 * pulse(t, 12.8, 15.2, 0.4) + scared * 0.6, armR: 0.3 + 0.7 * pulse(t, 12.8, 15.2, 0.4) + scared * 0.6, flail: scared, dangle: scared, scared, eyeGlow: 1.5, glow: 1, heat: 0, lookUp: -0.3 + scared * 0.2 }, t);
      monster.root.updateMatrixWorld(true); monster.mouth.getWorldPosition(mouthW);
      frost.set(t, mouthW, impact.clone().sub(mouthW).normalize(), 2.7, 4.1); frost.u.uSpeed.value = mouthW.distanceTo(impact) / 1.2; frost.u.uLife.value = 1.25;
      sh.forEach((s, i) => { const tau = t - s.t0; if (tau < 0 || tau > 2.4) { m4.makeScale(0, 0, 0); shards.setMatrixAt(i, m4); return; } v.copy(s.p).addScaledVector(s.v, tau); v.y -= 4.9 * tau * tau; q.setFromAxisAngle(s.ax, tau * 6); const sc = s.s * (1 - smooth(1.8, 2.4, tau)) * clamp(tau / 0.08); m4.compose(v, q, new THREE.Vector3(sc, sc, sc)); shards.setMatrixAt(i, m4); });
      shards.instanceMatrix.needsUpdate = true;
      // hiccup bubbles follow Pipo's mouth
      hics.mesh.position.copy(pm); hics.update(t);
      // ── the monster bubble ──
      if (t >= RELEASE_T) {
        const k = range(t, RELEASE_T, WRAP_T); const c = MB_CENTER(t);
        v.copy(pm).lerp(c, 1 - Math.pow(1 - k, 2));
        mb.set(t < WRAP_T ? v : c, monsterBubbleR(t), t, { wobble: 0.03 + pulse(t, WRAP_T, WRAP_T + 1, 0.1) * 0.12, squash: 1 + Math.sin((t - WRAP_T) * 6) * 0.1 * Math.exp(-Math.max(0, t - WRAP_T) * 1.5) });
      } else mb.set(pm, 0, t, { alpha: 0 });
      // ── LUNA ──
      const la = range(t, 8.2, 9.0);
      luna.root.position.copy(HOVER).add(new THREE.Vector3(0.62 + (1 - la) * 3, 0.3 + (1 - la) * -6 + Math.sin(t * 2) * 0.04 - inflate * 0.2, 0.25 + inflate * 0.5));
      luna.root.rotation.y = -0.9 + 0.3 * inflate; luna.root.visible = t > 8.1 && t < RELEASE_T + 0.4 || t > 16.6;
      const lt = (t > 8.9 && t < 10.9) ? 0.3 + 0.6 * Math.abs(Math.sin(t * 13)) : 0;
      luna.pose({ mouth: lt + inflate * 0.4, cheer: pulse(t, 8.9, 11, 0.3) + pulse(t, 16.8, 20, 0.3), armL: pulse(t, 8.9, 11, 0.3) * 0.8 + pulse(t, 16.8, 20, 0.3), armR: 0.4 + pulse(t, 16.8, 20, 0.3) * 0.5, eyeBig: 1.1 + inflate * 0.35, lookUp: 0.2, wave: 1, eyeOpen: Dragon.blink(t, 2.2) }, t);
      if (t > 16.6) luna.root.position.copy(pipo.root.position).add(new THREE.Vector3(0.6, 0.15, 0.3));
      W.skyU.uFreeze.value = 0.95 * (1 - 0.4 * smooth(16.5, 20, t)); W.skyU.uDark.value = 0.55 * (1 - smooth(16.5, 20, t) * 0.6);
      W.hemi.intensity = 0.45 + 0.25 * smooth(16.5, 20, t); W.sun.intensity = 0.47 + 0.6 * smooth(16.5, 20, t);
      W.focus(HOVER, 10);
      const camera = rig.apply(t);
      const post = DEFAULT_POST(); post.tint = [0.92, 0.97, 1.06]; post.vignette = 0.45; post.exposure = 0.88;
      post.flash = pulse(t, IMPACT_T, IMPACT_T + 0.2, 0.04) * 0.4 + pulse(t, RELEASE_T, RELEASE_T + 0.2, 0.04) * 0.35;
      const scr = (p) => { const q2 = p.clone().project(camera); return [(q2.x * 0.5 + 0.5) * WIDTH, (1 - (q2.y * 0.5 + 0.5)) * HEIGHT]; };
      const [px, py] = scr(pm);
      return { camera, post, overlay: (ctx) => {
        HICS.forEach((h, i) => drawBurst(ctx, t, h, 'HIC!', clamp(px + (i % 2 ? 210 : -210), 220, 860), clamp(py - 260 - i * 20, 260, 1400), { seed: 20 + i, color: '#ffe14a', size: 80, dur: 0.6, rot: i % 2 ? 0.15 : -0.15 }));
        drawBurst(ctx, t, IMPACT_T + 0.05, 'KRAKK!', 540, 520, { seed: 2, color: '#9fe8ff', size: 110 });
        drawSpeedLines(ctx, t, smooth(12.5, 14.9, t) * (1 - smooth(14.95, 15.0, t)) * 0.55, px, py);
        drawSpeedLines(ctx, t, pulse(t, RELEASE_T, RELEASE_T + 0.7, 0.05), WIDTH / 2, HEIGHT / 2);
        drawBurst(ctx, t, RELEASE_T + 0.02, 'BLOOOP!', 540, 640, { seed: 7, color: '#7ff0dc', size: 120, dur: 1.0 });
        drawBurst(ctx, t, 15.2, 'PFFFFT!', 300, 1180, { seed: 8, color: '#ff8ab0', size: 80, dur: 1.0, rot: 0.2 });
      } };
    }
    return { scene: S, update, objects: { ...O, dome, mb } };
  },

  sound(s) {
    s.march(0.2, 3.0, 55, 0.07, 0.22);
    s.tone({ t: 0.8, dur: 1.2, freq: 900, freqEnd: 1300, type: 'triangle', gain: 0.03, attack: 0.05, release: 0.3, send: 0.2 });
    s.noise({ t: 1.6, dur: 1.3, gain: 0.12, attack: 0.2, release: 0.6, filter: { type: 'bandpass', freq: 400, freqEnd: 1600, Q: 1 }, send: 0.4 });
    s.slide(1.7, 1.3, 200, 900, 0.12); s.boing(2.9, 0.2, 90);
    s.roar(2.6, 1.6, 0.35); s.noise({ t: 2.8, dur: 1.3, gain: 0.25, attack: 0.1, release: 0.5, filter: { type: 'bandpass', freq: 2400, Q: 0.6 }, send: 0.5 });
    s.boom(3.3, 0.5); for (let i = 0; i < 30; i++) s.chime(3.35 + i * 0.04, 2400 + s.r() * 3500, 0.04, 0.7, (s.r() - 0.5) * 1.6);  // KRAKK + tinkling crystals
    for (let i = 0; i < 5; i++) s.thud(5.2 + i * 0.95, 0.4);                                                            // stomps
    [5.55, 6.2, 6.95, 7.55, 8.3].forEach((h) => { s.hic(h, 0.22); s.bloop(h + 0.08, 0.06, 1200); });
    s.sparkle(8.2, 8, 0.03);
    s.pad(9.0, 6, [53, 57, 60, 65], { gain: 0.08, type: 'triangle', cutoff: 2200, attack: 1, release: 0.5 });
    s.noise({ t: 11.0, dur: 3.9, gain: 0.14, attack: 3.6, release: 0.2, filter: { type: 'bandpass', freq: 300, freqEnd: 2200, Q: 1 }, send: 0.3, curve: 'lin' }); // huge inhale
    s.slide(11.0, 3.9, 120, 1300, 0.09);
    s.riser(12.5, 2.5, 0.2, 100, 1500);
    s.boom(15.0, 0.7); s.tone({ t: 15.0, dur: 0.9, freq: 120, freqEnd: 600, type: 'sine', gain: 0.25, attack: 0.01, release: 0.6, send: 0.4 });  // BLOOOP
    s.tone({ t: 15.1, dur: 1.2, freq: 260, freqEnd: 140, type: 'sawtooth', gain: 0.07, attack: 0.02, release: 0.4, filter: { type: 'bandpass', freq: 900, Q: 3 }, send: 0.2 }); // pffft deflate
    s.noise({ t: 15.1, dur: 1.2, gain: 0.12, attack: 0.02, release: 0.4, filter: { type: 'bandpass', freq: 1400, Q: 2 }, send: 0.2 });
    s.pop(16.8, 0.3, 0.5); s.sparkle(16.85, 10, 0.03);
    s.slide(16.0, 3.5, 300, 1800, 0.08);                                                                                // up, up he goes
    s.march(16.4, 20, 60, 0.07, 0.2);
  },
};
