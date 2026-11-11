import * as THREE from 'three';
import ep2, { PIPO2_END, LUNA_OFF, MONSTER_POS, MONSTER_SCALE, CAM2_END } from './ep2.js';
import { MARKET, CASTLE } from '../scenes/World.js';
import { King, iceMaterial } from '../characters/Cast.js';
import { Dragon } from '../characters/Dragon.js';
import { FREEZE } from '../characters/materials.js';
import { Bubble } from '../effects/Bubbles.js';
import { FireJet } from '../effects/Fire.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST, WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, rng, easeOutBack } from '../core/util.js';
import { drawBurst, drawSpeedLines } from '../overlay/Overlay.js';

const G = MARKET.y;
export const TRIP_T = 10.55, BUB_T = 10.9, CATCH_T = 11.45, HIT_T = 13.35;
export const GROW = (t) => MONSTER_SCALE * (1 + 0.28 * smooth(8.3, 9.4, t) + 0.06 * Math.sin(range(t, 8.3, 9.6) * Math.PI * 4) * (t > 8.3 && t < 9.6 ? 1 : 0));
export const freezeRadius = (t) => 50 + 19 * smooth(0.6, 4.4, t);           // stops right at Pipo's toes
export const KING_START = new THREE.Vector3(CASTLE.x + 1.5, G, CASTLE.z + 12);
export const CATCH_POS = new THREE.Vector3(PIPO2_END.x + 1.6, G, PIPO2_END.z - 4.2);
export function kingBubble(t) { const k = Math.max(0, t - CATCH_T); return new THREE.Vector3(CATCH_POS.x + Math.sin(k * 0.9) * 0.4 - k * 0.12, G + 0.75 + (1 - Math.exp(-k * 1.4)) * 1.6 + k * 0.28, CATCH_POS.z + k * 0.2); }
export const KING_BUBBLE_R = 0.85;
export const BRASA_HOVER = new THREE.Vector3(MARKET.x + 2, G + 44, CASTLE.z + 30);
export const PIPO3_END = new THREE.Vector3(PIPO2_END.x + 0.9, G, PIPO2_END.z - 2.5);
export const CAM3_END = { x: PIPO3_END.x + 0.05, y: G + 0.48, z: PIPO3_END.z + 0.95, tx: PIPO3_END.x - 0.05, ty: G + 0.36, tz: PIPO3_END.z, fov: 40, roll: 0 };

export default {
  number: 3, title: 'O MONSTRO DE GELO', duration: 20,
  build({ renderer }) {
    const base = ep2.build({ renderer }); const O = base.objects; const { W, S, pipo, brasa, luna, monster } = O;
    const king = new King(); S.add(king.root);
    const kb = new Bubble(); S.add(kb.mesh, kb.pop.points);
    const giant = new Bubble(); S.add(giant.mesh, giant.pop.points);
    const frost = new FireJet({ count: 1800, life: 2.0, speed: 34, spread: 0.2, size: 3.2, seed: 9 }); frost.u.uIce.value = 1; S.add(frost.points);
    const frost2 = new FireJet({ count: 700, life: 1.2, speed: 20, spread: 0.16, size: 1.4, seed: 13 }); frost2.u.uIce.value = 1; S.add(frost2.points);
    const fire = new FireJet({ count: 900, life: 1.3, speed: 30, spread: 0.1, size: 1.6, seed: 21, alpha: 0.32 }); S.add(fire.points);
    // ice spikes that grow as the freeze front passes
    const r = rng(17), N = 160; const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), iceMaterial({ glow: 0.5 }), N); spikes.frustumCulled = false; S.add(spikes);
    const sp = [...Array(N)].map(() => { const a = r() * Math.PI * 2, d = 12 + r() * 62; const p = new THREE.Vector3(MONSTER_POS.x + Math.cos(a) * d, G, MONSTER_POS.z + Math.sin(a) * d); return { p, d: p.distanceTo(new THREE.Vector3(MONSTER_POS.x, G, MONSTER_POS.z)), h: 1.5 + r() * 5, w: 0.4 + r() * 0.9, tilt: new THREE.Euler((r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6) }; }).filter((s) => s.p.distanceTo(new THREE.Vector3(PIPO2_END.x, G, PIPO2_END.z)) > 9);
    // ice shards bouncing off the king's bubble
    const shards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.12, 0), iceMaterial({ glow: 0.8 }), 60); shards.frustumCulled = false; S.add(shards);
    const shd = [...Array(60)].map(() => ({ d: new THREE.Vector3(r() - 0.5, r() * 0.8 + 0.2, r() - 0.5).normalize(), sp: 2 + r() * 3, t0: HIT_T + r() * 1.2, ax: new THREE.Vector3(r(), r(), r()).normalize() }));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), mouthW = new THREE.Vector3(), brasaMouth = new THREE.Vector3(), chest = new THREE.Vector3(), pm = new THREE.Vector3();
    const rig = new CameraRig({ ...CAM2_END });
    rig.to(0.2, 1.6, { x: PIPO2_END.x + 3, y: G + 2.0, z: PIPO2_END.z + 8, tx: MONSTER_POS.x - 6, ty: G + 46, tz: MONSTER_POS.z, fov: 60 }, 'power2.inOut')   // the freezing breath
      .to(2.2, 2.4, { x: PIPO2_END.x + 0.6, y: G + 0.35, z: PIPO2_END.z + 2.6, tx: PIPO2_END.x - 1, ty: G + 3, tz: PIPO2_END.z - 30, fov: 56 }, 'power2.inOut') // the frost rolls in
      .to(4.6, 0.25, { x: PIPO2_END.x + 0.3, y: G + 0.3, z: PIPO2_END.z + 1.25, tx: PIPO2_END.x, ty: G + 0.3, tz: PIPO2_END.z, fov: 38 }, 'expo.out')        // gulp
      .set(5.1, { x: BRASA_HOVER.x + 4, y: BRASA_HOVER.y - 6, z: BRASA_HOVER.z + 26, tx: BRASA_HOVER.x, ty: BRASA_HOVER.y + 6, tz: BRASA_HOVER.z - 40, fov: 52 })
      .to(5.1, 1.5, { x: BRASA_HOVER.x + 1.3, y: BRASA_HOVER.y + 1.4, z: BRASA_HOVER.z + 6, tx: BRASA_HOVER.x - 1.5, ty: BRASA_HOVER.y + 4, tz: BRASA_HOVER.z - 40, fov: 56 }, 'power2.out')                                      // behind Brasa: FIRE!
      .to(8.2, 1.2, { x: BRASA_HOVER.x - 10, y: BRASA_HOVER.y - 8, z: BRASA_HOVER.z + 40, tx: MONSTER_POS.x, ty: G + 48, tz: MONSTER_POS.z, fov: 62 }, 'power2.inOut') // it grows!
      .set(9.4, { x: BRASA_HOVER.x - 1.6, y: BRASA_HOVER.y + 2.2, z: BRASA_HOVER.z - 3.6, tx: BRASA_HOVER.x, ty: BRASA_HOVER.y + 1.7, tz: BRASA_HOVER.z, fov: 46 })
      .to(9.4, 0.3, { x: BRASA_HOVER.x - 1.2, y: BRASA_HOVER.y + 2.0, z: BRASA_HOVER.z - 3.0, fov: 40 }, 'expo.out') // Brasa: oh no
      .set(10.0, { x: PIPO2_END.x + 2.4, y: G + 0.45, z: PIPO2_END.z - 0.6, tx: PIPO2_END.x + 0.2, ty: G + 0.3, tz: PIPO2_END.z - 1.8, fov: 46 })
      .to(10.0, 1.1, { x: PIPO2_END.x + 2.8, y: G + 0.7, z: PIPO2_END.z - 1.2, tx: PIPO2_END.x + 0.5, ty: G + 0.5, tz: PIPO2_END.z - 2.6, fov: 50 }, 'sine.inOut')
      .to(11.6, 1.6, { x: CATCH_POS.x + 1.3, y: G + 1.7, z: CATCH_POS.z + 4.2, tx: CATCH_POS.x, ty: G + 2.0, tz: CATCH_POS.z, fov: 46 }, 'power2.out')       // the king in a bubble
      .to(13.2, 1.8, { x: CATCH_POS.x - 2.6, y: G + 2.6, z: CATCH_POS.z + 5.2, ty: G + 2.6, fov: 52 }, 'sine.inOut')
      .set(15.2, { x: PIPO3_END.x + 0.85, y: G + 0.6, z: PIPO3_END.z + 1.4, tx: PIPO3_END.x + 0.45, ty: G + 0.62, tz: PIPO3_END.z, fov: 40 })            // Luna
      .to(15.2, 2.8, { x: PIPO3_END.x + 0.7, z: PIPO3_END.z + 1.3, fov: 38 }, 'sine.inOut')
      .to(18.0, 0.5, { ...CAM3_END }, 'power2.inOut')                                                                                                       // Pipo looks at his paws
      .to(0.6, 0.3, { shake: 0.05 }, 'none').to(4.5, 0.3, { shake: 0 }, 'none').to(6.6, 0.2, { shake: 0.15 }, 'none').to(8.6, 0.3, { shake: 0.05 }, 'none').to(9.6, 0.3, { shake: 0 }, 'none')
      .to(HIT_T, 0.05, { shake: 0.05 }, 'none').to(HIT_T + 0.05, 0.6, { shake: 0 }, 'power2.out');
    rig.prime(20);

    function update(t) {
      base.update(20);                                        // freeze episode-2 state, then direct episode 3
      W.update(20 + t);
      // ── monster ──
      const sc = GROW(t); monster.root.scale.setScalar(sc); monster.root.position.copy(MONSTER_POS);
      const blast = pulse(t, 0.6, 4.2, 0.4), blast2 = pulse(t, HIT_T - 0.6, HIT_T + 1.4, 0.3);
      const heat = smooth(6.8, 8.6, t) * (1 - smooth(9.5, 11.5, t));
      monster.pose({ roar: blast + blast2 * 0.8 + pulse(t, 9.4, 9.9, 0.1), lean: 0.25 * blast + 0.1 * blast2, armsOut: 0.4 + 0.3 * blast, armL: 0.25 + 0.5 * pulse(t, 9.4, 10.6, 0.3), armR: 0.25 + 0.5 * pulse(t, 9.4, 10.6, 0.3), heat, eyeGlow: 1.5, glow: 1, lookUp: -0.35 + 0.3 * pulse(t, 9.3, 10.4, 0.2), walk: t * 0.4, walkAmt: 0.3 }, t);
      monster.root.updateMatrixWorld(true); monster.mouth.getWorldPosition(mouthW); monster.torso.getWorldPosition(chest); chest.y += 8 * sc / MONSTER_SCALE;
      const toMarket = new THREE.Vector3(PIPO2_END.x, G + 2, PIPO2_END.z).sub(mouthW).normalize();
      frost.set(t, mouthW, toMarket, 0.7, 3.0); frost.u.uLife.value = 1.6;
      pm.set(kingBubble(HIT_T).x, G + 2, kingBubble(HIT_T).z);
      frost2.set(t, mouthW, pm.clone().sub(mouthW).normalize(), HIT_T - 0.45, HIT_T + 0.6); frost2.u.uSpeed.value = mouthW.distanceTo(pm) / 1.1; frost2.u.uLife.value = 1.2;
      frost.u.uSpeed.value = (mouthW.distanceTo(new THREE.Vector3(PIPO2_END.x, G, PIPO2_END.z)) - 14) / 1.5;
      // the kingdom freezes
      FREEZE.uFreezeCenter.value.copy(MONSTER_POS); FREEZE.uFreezeRadius.value = freezeRadius(t); FREEZE.uFreezeAmount.value = 1;
      W.skyU.uFreeze.value = 0.65 + 0.3 * smooth(0.6, 4, t); W.skyU.uDark.value = 0.55;
      W.hemi.intensity = 0.75 * 0.6; W.sun.intensity = 1.55 * 0.3; S.fog.color.setRGB(0.42, 0.52, 0.7);
      const fr = freezeRadius(t);
      sp.forEach((s, i) => { const g = clamp((fr - s.d) / 6); const h = s.h * easeOutBack(g, 2); q.setFromEuler(s.tilt); m4.compose(v.set(s.p.x, G + h / 2 - 0.2, s.p.z), q, new THREE.Vector3(s.w, Math.max(h, 0.001), s.w)); spikes.setMatrixAt(i, m4); });
      spikes.count = sp.length; spikes.instanceMatrix.needsUpdate = true;
      // ── BRASA: fly in, blast, regret ──
      const arrive = range(t, 4.9, 6.3);
      brasa.root.position.copy(BRASA_HOVER).add(new THREE.Vector3(0, Math.sin(t * 2.4) * 0.4 + (1 - arrive) * 10, (1 - arrive) * 40));
      brasa.root.rotation.set(0, Math.PI + 0.12 + 0.9 * smooth(9.3, 9.6, t), 0);
      const shoot = pulse(t, 6.6, 8.6, 0.15), oops = smooth(9.3, 9.6, t);
      brasa.pose({ flap: 1, flapSpeed: 7, wingOpen: 1, mouth: shoot * 1.1 + oops * 0.6, brow: 0.9 * shoot - oops * 0.7, eyeBig: 1 + oops * 0.45, browUp: oops, lean: 0.3 * shoot - 0.3 * oops, tuck: 0.4, armsOut: 0.4 + oops * 0.4, smile: 0.5 - oops * 1.2, lookUp: -0.05, eyeOpen: Dragon.blink(t, 0.7) }, t);
      brasa.root.updateMatrixWorld(true); brasa.mouthAnchor.getWorldPosition(brasaMouth);
      fire.set(t, brasaMouth, chest.clone().sub(brasaMouth).normalize(), 6.6, 8.6, { suck: [chest.x, chest.y, chest.z, 0.85] }); fire.u.uSpeed.value = brasaMouth.distanceTo(chest) / 1.1;
      brasa.root.visible = t > 4.8;
      // ── PIPO: cower, run, trip ──
      const run = range(t, 10.0, TRIP_T);
      const pp = PIPO2_END.clone().lerp(PIPO3_END.clone().add(new THREE.Vector3(-0.2, 0, -0.3)), run);
      const fall = smooth(TRIP_T, TRIP_T + 0.2, t) * (1 - smooth(12.8, 13.6, t));
      if (t > 12.8) pp.lerp(PIPO3_END, smooth(12.8, 14, t));
      pipo.root.position.copy(pp);
      pipo.root.rotation.set(fall * 1.35, keys(t, [[0, 0.2], [2, 0.1], [10, 0.1], [10.1, Math.PI - 0.15], [12.8, Math.PI - 0.15], [14, 0.45], [15.2, 0.6], [17.9, 0.4], [18.3, 0]]), 0);
      const cower = pulse(t, 2.0, 5.0, 0.3), surprised = smooth(17.9, 18.3, t);
      pipo.pose({ walk: t * 3.2, walkAmt: t > 10.0 && t < TRIP_T ? 1 : 0, lean: -0.2 * (t > 10 && t < TRIP_T ? 1 : 0), squash: 1 - cower * 0.15, cover: cower * 0.8, eyeBig: 1 + cower * 0.2 + surprised * 0.25,
        mouth: pulse(t, TRIP_T, 11.2, 0.05) * 1.1 + pulse(t, 4.6, 5.0, 0.05) * 0.4, cheeks: pulse(t, 10.7, 11.0, 0.08), brow: -0.4 * cower, sad: 0.4 * cower,
        armL: surprised * 0.45 + fall * 0.9, armR: surprised * 0.45 + fall * 0.9, armsOut: surprised * -0.15, lookY: -0.9 * surprised + 0.6 * pulse(t, 15.2, 17.8, 0.3), lookX: 0.6 * pulse(t, 15.2, 17.8, 0.3),
        lookUp: -0.5 * surprised + 0.5 * pulse(t, 13, 15.2, 0.4), eyeOpen: (t > TRIP_T && t < 11.6) ? 0.3 : Dragon.blink(t, 0.5), smile: 0.2 - cower * 0.6 + surprised * 0.2, flap: surprised * 0.5, tuck: fall * 0.8, wag: 0.4 + surprised }, t);
      pipo.root.updateMatrixWorld(true);
      // ── the giant bubble that catches the king ──
      const bornP = pipo.mouthAnchor.getWorldPosition(new THREE.Vector3());
      const kingRun = range(t, 9.0, CATCH_T);
      const kpos = KING_START.clone().lerp(CATCH_POS, kingRun);
      const caught = t >= CATCH_T;
      if (t >= BUB_T) {
        const k = range(t, BUB_T, CATCH_T); const target = caught ? kingBubble(t) : CATCH_POS.clone().setY(G + 0.75);
        v.copy(bornP).lerp(target, k); v.y += Math.sin(k * Math.PI) * 0.6;
        const rr = lerp(0.12, KING_BUBBLE_R, easeOutBack(range(t, BUB_T, CATCH_T + 0.1), 1.6));
        const kh = kingBubble(t);
        kb.set(caught ? kh : v, rr, t, { wobble: 0.05 + pulse(t, CATCH_T, CATCH_T + 0.7, 0.1) * 0.2 + pulse(t, HIT_T, HIT_T + 0.8, 0.05) * 0.25, tint: pulse(t, HIT_T, HIT_T + 1.5, 0.1) * 0.6, squash: 1 + Math.sin((t - CATCH_T) * 10) * 0.12 * Math.exp(-Math.max(0, t - CATCH_T) * 2.5) });
      } else kb.set(bornP, 0, t, { alpha: 0 });
      // ── KING GORAN ──
      king.root.position.copy(caught ? kingBubble(t).add(new THREE.Vector3(0, -0.62, 0)) : kpos);
      king.root.rotation.set(caught ? Math.sin(t * 2.1) * 0.2 : 0, caught ? 0.5 + Math.sin(t * 1.3) * 0.4 : Math.PI + 0.35, caught ? Math.sin(t * 1.7) * 0.25 : 0);
      king.root.visible = t > 8.9;
      const shout = (t > 11.7 && t < 13.75) ? 0.5 + 0.5 * Math.abs(Math.sin(t * 14)) : 0;
      king.pose({ panic: 1, run: caught ? 0.3 : 1, mouth: 0.4 + shout * 0.6, eyeBig: 1.3, browUp: 0.8, armL: caught ? 0.7 + 0.2 * Math.sin(t * 9) : 0.5, armR: caught ? 0.7 + 0.2 * Math.sin(t * 9 + 2) : 0.5, crownTilt: caught ? 0.3 : 0.1, crownHop: pulse(t, CATCH_T, CATCH_T + 0.4, 0.1), wind: 0.8 }, t);
      // shards bounce off the bubble
      const kc = kingBubble(t);
      shd.forEach((s, i) => { const tau = t - s.t0; if (tau < 0 || tau > 1.6) { m4.makeScale(0, 0, 0); shards.setMatrixAt(i, m4); return; } v.copy(kc).addScaledVector(s.d, KING_BUBBLE_R + s.sp * tau); v.y -= 4.9 * tau * tau; q.setFromAxisAngle(s.ax, tau * 9); const ssc = 1 - smooth(1.2, 1.6, tau); m4.compose(v, q, new THREE.Vector3(ssc, ssc, ssc)); shards.setMatrixAt(i, m4); });
      shards.instanceMatrix.needsUpdate = true;
      // ── LUNA ──
      const lp = (t < 14 ? PIPO2_END.clone().add(LUNA_OFF) : PIPO3_END.clone().add(new THREE.Vector3(0.48, 0.45, 0.15)));
      if (t >= 13 && t < 14) lp.lerp(PIPO3_END.clone().add(new THREE.Vector3(0.48, 0.45, 0.15)), smooth(13, 14, t));
      luna.root.position.copy(lp); luna.root.position.y += Math.sin(t * 2) * 0.03;
      luna.root.rotation.y = keys(t, [[0, -0.3], [13, -0.3], [14.5, -0.4], [15.5, -0.9], [17.6, -0.6]]);
      const lt = (t > 15.5 && t < 17.9) ? 0.3 + 0.6 * Math.abs(Math.sin(t * 13)) : 0;
      luna.pose({ mouth: lt + pulse(t, 0.6, 4, 0.3) * 0.7, eyeBig: 1.15 + pulse(t, 15.2, 18, 0.3) * 0.2, armR: 0.3 + 0.6 * pulse(t, 15.4, 18, 0.2), armL: pulse(t, 2, 5, 0.3) * 0.7, lookUp: 0.3 * pulse(t, 13, 15.3, 0.3), cheer: pulse(t, 15.4, 18, 0.2), wave: 1, tilt: 0.2 * pulse(t, 16, 18, 0.3), eyeOpen: Dragon.blink(t, 1.9) }, t);
      W.focus(new THREE.Vector3(PIPO2_END.x, G, PIPO2_END.z), 10);
      const camera = rig.apply(t);
      const post = DEFAULT_POST();
      post.tint = [0.9, 0.96, 1.08]; post.vignette = 0.5; post.exposure = 0.85; post.bloom = 0.35 + 0.25 * shoot; post.bloomThreshold = 1.4;
      post.flash = pulse(t, 6.55, 6.8, 0.05) * 0.3 + pulse(t, HIT_T, HIT_T + 0.2, 0.04) * 0.25; post.flashColor = [1, 0.85, 0.6];
      const scr = (p) => { const q2 = p.clone().project(camera); return [(q2.x * 0.5 + 0.5) * WIDTH, (1 - (q2.y * 0.5 + 0.5)) * HEIGHT]; };
      const [kx, ky] = scr(kc);
      return { camera, post, overlay: (ctx) => {
        drawSpeedLines(ctx, t, pulse(t, 4.6, 5.0, 0.05) * 0.6, WIDTH / 2, HEIGHT * 0.45, '200,235,255');
        drawSpeedLines(ctx, t, pulse(t, 9.4, 9.9, 0.06) * 0.7, WIDTH / 2, HEIGHT * 0.4);
        drawBurst(ctx, t, 4.62, 'GLUP!', 760, 620, { seed: 3, color: '#9fe8ff', size: 90 });
        drawBurst(ctx, t, 9.45, 'NHAC!', 300, 520, { seed: 11, color: '#ff8a5c', size: 110 });
        drawBurst(ctx, t, TRIP_T + 0.05, 'TROPEÇO!', 560, 520, { seed: 4, color: '#ffe14a', size: 80 });
        drawBurst(ctx, t, HIT_T + 0.1, 'PLINK!', clamp(kx + 180, 240, 840), clamp(ky - 260, 260, 1400), { seed: 6, color: '#9fe8ff', size: 90 });
      } };
    }
    return { scene: S, update, objects: { ...O, king, kb, giant, spikes } };
  },

  sound(s) {
    // freezing breath
    s.roar(0.4, 1.4, 0.35); s.noise({ t: 0.7, dur: 3.2, gain: 0.3, attack: 0.3, release: 1, filter: { type: 'bandpass', freq: 2500, freqEnd: 900, Q: 0.6 }, send: 0.5, curve: 'lin' });
    for (let i = 0; i < 40; i++) s.tone({ t: 1.0 + i * 0.08, dur: 0.05, freq: 2500 + s.r() * 4000, type: 'square', gain: 0.02, attack: 0.001, release: 0.04, send: 0.5, pan: (s.r() - 0.5) * 1.6 }); // crackling ice
    s.pad(0, 6, [45, 48, 52, 55], { gain: 0.09, cutoff: 1400, attack: 0.5, release: 1 });
    s.tone({ t: 4.6, dur: 0.3, freq: 300, freqEnd: 120, type: 'sine', gain: 0.15, attack: 0.005, release: 0.25, send: 0.2 }); // gulp
    // Brasa to the rescue
    s.whoosh(4.9, 1.5, 0.35, 300, 2400); s.march(5.2, 8.4, 50, 0.06, 0.18);
    s.roar(6.6, 2.0, 0.5); s.noise({ t: 6.6, dur: 2.0, gain: 0.25, attack: 0.05, release: 0.6, filter: { type: 'lowpass', freq: 1800 }, send: 0.3 });
    s.tone({ t: 7.2, dur: 1.6, freq: 120, freqEnd: 60, type: 'sawtooth', gain: 0.08, attack: 0.3, release: 0.5, filter: { type: 'lowpass', freq: 500 }, send: 0.3, curve: 'lin' }); // absorption
    s.slide(8.3, 1.2, 150, 600, 0.12);                                                  // inflating
    s.tone({ t: 9.45, dur: 0.6, freq: 90, freqEnd: 60, type: 'sawtooth', gain: 0.25, attack: 0.01, release: 0.4, filter: { type: 'lowpass', freq: 600 }, send: 0.2 }); // burp
    s.trombone(9.7, [62, 61], 0.08);
    // Pipo trips → the giant bubble catches the king
    for (let i = 0; i < 6; i++) s.squeak(10.05 + i * 0.09, 0.05, 1300 + (i % 2) * 300);
    s.thud(TRIP_T + 0.12, 0.35); s.bloop(BUB_T, 0.2, 260); s.slide(BUB_T + 0.05, 0.5, 300, 900, 0.1);
    s.tone({ t: CATCH_T - 0.05, dur: 0.4, freq: 220, freqEnd: 90, type: 'sine', gain: 0.14, attack: 0.01, release: 0.3, send: 0.3 });
    s.march(11.6, 15.0, 57, 0.04, 0.2);
    s.noise({ t: HIT_T - 0.5, dur: 1.2, gain: 0.2, attack: 0.1, release: 0.6, filter: { type: 'bandpass', freq: 2200, Q: 0.6 }, send: 0.5 });
    for (let i = 0; i < 10; i++) s.chime(HIT_T + i * 0.06, 2600 + s.r() * 2600, 0.05, 0.6, (s.r() - 0.5));
    // the realisation
    s.pad(15.2, 4.8, [60, 64, 67, 72], { gain: 0.08, type: 'triangle', cutoff: 2600, attack: 1.2, release: 1.5 });
    s.sparkle(18.0, 8, 0.04); s.chime(18.2, 1568, 0.08, 2);
  },
};
