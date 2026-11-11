import * as THREE from 'three';
import ep4, { CAM4_END, MB_CENTER, monsterBubbleR, MON4_SCALE, HOVER } from './ep4.js';
import { PIPO3_END } from './ep3.js';
import { MARKET, CASTLE } from '../scenes/World.js';
import { SnowSpirit } from '../characters/Cast.js';
import { Dragon } from '../characters/Dragon.js';
import { toon, FREEZE } from '../characters/materials.js';
import { Bubble, BubbleField } from '../effects/Bubbles.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST, WIDTH, HEIGHT } from '../core/Engine.js';
import { clamp, smooth, range, keys, pulse, lerp, rng, easeOutBack, easeOutElastic } from '../core/util.js';
import { drawBurst, drawSpeedLines, drawFreeze } from '../overlay/Overlay.js';

const G = MARKET.y;
const B5 = PIPO3_END.clone();                                   // the celebration spot in the market square
const MELT0 = 1.2, MELT1 = 4.2, GRAB_T = 5.6, LAND_T = 8.0, MEDAL_T = 15.7, SNEEZE5 = 18.42, FREEZE_T = 19.3;
const SPOT = { pipo: B5.clone(), king: B5.clone().add(new THREE.Vector3(-1.25, 0, -0.35)), brasa: B5.clone().add(new THREE.Vector3(2.0, 0, -1.3)), spirit: B5.clone().add(new THREE.Vector3(-0.55, 0, 0.75)) };
const cloudC = (t) => MB_CENTER(20 + Math.min(t, 1.2) * 0.5);       // the bubble reaches the warm cloud and stops

export default {
  number: 5, title: 'O MAIOR DRAGÃO DO REINO', duration: 20,
  build({ renderer }) {
    const base = ep4.build({ renderer }); const O = base.objects; const { W, S, pipo, luna, monster, brasa, king, mb, dome } = O;
    const spirit = new SnowSpirit(); S.add(spirit.root);
    const kingB = new Bubble(); S.add(kingB.mesh, kingB.pop.points);
    const party = new BubbleField(220, 21); S.add(party.mesh);
    party.emit({ n: 160, t0: 15.4, t1: 18.6, origin: SPOT.spirit.clone().add(new THREE.Vector3(0, 0.5, 0)), dir: [0, 1, 0.2], speed: 1.6, spread: 0.9, size: [0.04, 0.16], life: [1.5, 3.5], drag: 1.5, lift: 0.35 });
    const sneezeF = new BubbleField(120, 23); S.add(sneezeF.mesh);
    // warm golden cloud that melts the ice
    const cloud = new THREE.Group(); const cm = toon(0xffe2b0, { rough: 1, rim: 2, emissive: 0xff9a4a, ei: 0.35 }); const r = rng(3);
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(16 + r() * 18, 16, 12), cm); m.position.set((r() - 0.5) * 120, (r() - 0.5) * 20, (r() - 0.5) * 70); m.scale.y = 0.6; cloud.add(m); }
    cloud.position.copy(MB_CENTER(20)).add(new THREE.Vector3(0, 95, -10)); S.add(cloud);
    const sun = new THREE.PointLight(0xffb070, 0, 400, 1); cloud.add(sun);
    // drips of melted ice
    const NDR = 260, drips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.8 }), NDR); drips.frustumCulled = false; S.add(drips);
    const dr = [...Array(NDR)].map(() => ({ o: new THREE.Vector3((r() - 0.5) * 40, (r() - 0.5) * 50, (r() - 0.5) * 40), t0: MELT0 + r() * (MELT1 - MELT0 - 1.2), s: 0.5 + r() * 1.5 }));
    // the medal
    const medal = new THREE.Group(); const gold = toon(0xffc23a, { metal: 0.85, rough: 0.25, rim: 1.5 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24), gold); disc.rotation.x = Math.PI / 2; medal.add(disc);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), gold); star.position.z = 0.01; star.scale.z = 0.3; medal.add(star);
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 24, Math.PI), toon(0xe0473a)); ribbon.rotation.z = 0; ribbon.position.y = 0.0; medal.add(ribbon);
    S.add(medal);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), pm = new THREE.Vector3(), kh = new THREE.Vector3();
    // spirit bubble path: sky → Pipo's arms → ground
    const spiritSky = () => cloudC(4).clone().add(new THREE.Vector3(0, -2, 0));
    const descend = (t) => { const k = range(t, GRAB_T, LAND_T); const e = k * k * (3 - 2 * k); const p = spiritSky().lerp(SPOT.spirit.clone().add(new THREE.Vector3(0, 0.45, 0)), e); p.x += Math.sin(k * Math.PI * 2) * 6 * (1 - k); return p; };

    const LAND = SPOT.spirit.clone().add(new THREE.Vector3(0, 0.45, 0));
    const rig = new CameraRig({ ...CAM4_END });
    rig.to(0, 1.6, { x: MB_CENTER(20).x + 40, y: G + 115, z: MB_CENTER(20).z + 120, tx: MB_CENTER(20).x, ty: G + 150, tz: MB_CENTER(20).z, fov: 56 }, 'power2.inOut')  // into the warm cloud
      .to(1.6, 2.6, { x: MB_CENTER(20).x + 26, y: G + 140, z: MB_CENTER(20).z + 75, fov: 52 }, 'sine.inOut')                                                     // it melts
      .set(4.3, { x: spiritSky().x + 0.9, y: spiritSky().y + 0.3, z: spiritSky().z + 3.4, tx: spiritSky().x, ty: spiritSky().y, tz: spiritSky().z, fov: 40 })        // ...just a tiny snow spirit
      .to(4.3, 1.2, { x: spiritSky().x + 0.6, z: spiritSky().z + 2.8, fov: 36 }, 'sine.inOut')
      .set(5.5, { x: LAND.x + 1.5, y: LAND.y + 0.45, z: LAND.z + 3.3, tx: LAND.x, ty: LAND.y - 0.1, tz: LAND.z, fov: 46 })                                    // carrying it down (rides along)
      .to(5.5, 2.4, { x: LAND.x + 2.6, y: LAND.y + 1.0, z: LAND.z + 4.6, fov: 50 }, 'sine.inOut')
      .to(8.0, 1.0, { x: SPOT.spirit.x + 0.5, y: G + 0.55, z: SPOT.spirit.z + 2.3, tx: SPOT.spirit.x + 0.35, ty: G + 0.45, tz: SPOT.spirit.z, fov: 42 }, 'power2.inOut') // Luna explains
      .set(9.0, { x: SPOT.king.x + 0.6, y: G + 0.5, z: SPOT.king.z + 2.6, tx: SPOT.king.x + 0.1, ty: G + 1.0, tz: SPOT.king.z, fov: 44 })                         // the king declares
      .to(9.0, 2.3, { x: SPOT.king.x + 0.4, z: SPOT.king.z + 2.2, fov: 40 }, 'sine.inOut')
      .set(11.45, { x: SPOT.brasa.x - 0.8, y: G + 1.1, z: SPOT.brasa.z + 3.2, tx: SPOT.brasa.x, ty: G + 1.55, tz: SPOT.brasa.z, fov: 42 })                         // Brasa apologises
      .to(11.45, 2.4, { x: SPOT.brasa.x - 0.6, y: G + 1.2, z: SPOT.brasa.z + 2.6, fov: 38 }, 'sine.inOut')
      .set(13.9, { x: SPOT.pipo.x + 0.15, y: G + 0.45, z: SPOT.pipo.z + 1.35, tx: SPOT.pipo.x, ty: G + 0.38, tz: SPOT.pipo.z, fov: 40 })                          // Pipo's reply
      .to(13.9, 1.6, { z: SPOT.pipo.z + 1.15, fov: 38 }, 'sine.inOut')
      .to(15.5, 0.9, { x: SPOT.pipo.x + 0.3, y: G + 1.2, z: SPOT.pipo.z + 5.6, tx: SPOT.pipo.x + 0.3, ty: G + 0.95, tz: SPOT.pipo.z - 0.5, fov: 48 }, 'power2.inOut') // everyone laughs
      .to(17.9, 0.4, { x: SPOT.pipo.x + 0.1, y: G + 0.4, z: SPOT.pipo.z + 1.5, tx: SPOT.pipo.x, ty: G + 0.42, tz: SPOT.pipo.z, fov: 40 }, 'power2.out')           // heroic pose
      .to(SNEEZE5, 0.35, { x: SPOT.pipo.x - 0.2, y: G + 0.9, z: SPOT.pipo.z + 4.6, tx: SPOT.pipo.x - 0.6, ty: G + 1.0, tz: SPOT.pipo.z - 0.4, fov: 50 }, 'expo.out')
      .to(SNEEZE5, 0.05, { shake: 0.05 }, 'none').to(SNEEZE5 + 0.05, 0.5, { shake: 0 }, 'power2.out');
    rig.prime(20);
    // while Pipo carries the spirit down, the camera rides along with them
    const land = LAND;
    rig.follow = (t) => { const w = (t >= 5.5 ? 1 : 0) * (1 - smooth(7.4, 8.0, t)); if (w <= 0) return [0, 0, 0]; const d = descend(t).sub(land); return [d.x * w, d.y * w, d.z * w]; };

    function frame(t) {
      base.update(20); W.update(60 + t);
      dome.mesh.visible = false; dome.pop.points.visible = false;
      // ── melting in the warm cloud ──
      const melt = smooth(MELT0, MELT1, t);
      const c = cloudC(t);
      monster.root.position.set(c.x, c.y - 44 + 0.0, c.z); monster.root.scale.setScalar(MON4_SCALE(20) * Math.max(0.0001, 1 - melt));
      monster.root.visible = melt < 0.999; monster.pose({ heat: smooth(0.4, MELT0, t), scared: 1, flail: 1 - melt, dangle: 1, eyeGlow: 1.5 * (1 - melt), glow: 1 - melt, roar: 0.3 }, t);
      const bubR = lerp(monsterBubbleR(20), 0.75, smooth(MELT0 + 0.3, MELT1, t));
      const inSky = t < GRAB_T, sp = inSky ? spiritSky() : descend(t);
      if (t < LAND_T + 0.3) mb.set(inSky ? (t < MELT1 ? c : spiritSky()) : sp, t < MELT1 ? lerp(bubR, 0.75, smooth(MELT1 - 0.6, MELT1, t)) : 0.75, t, { wobble: 0.03 + 0.05 * melt, tint: 0.3 * pulse(t, 0, MELT1, 0.5), popT: LAND_T + 0.25 });
      else mb.set(sp, 0.75, t, { popT: LAND_T + 0.25 });
      dr.forEach((d, i) => { const tau = t - d.t0; if (tau < 0 || tau > 1.5 || t > MELT1) { m4.makeScale(0, 0, 0); drips.setMatrixAt(i, m4); return; } v.copy(c).add(d.o.clone().multiplyScalar(1 - melt * 0.8)); v.y -= 4.9 * tau * tau; const sc = d.s * (1 - smooth(1.1, 1.5, tau)); m4.compose(v, q.identity(), new THREE.Vector3(sc, sc * 1.4, sc)); drips.setMatrixAt(i, m4); });
      drips.instanceMatrix.needsUpdate = true;
      sun.intensity = 400 * pulse(t, 0.5, 5.5, 1.0);
      // the kingdom thaws, the sky warms up
      FREEZE.uFreezeAmount.value = 1 - smooth(2.0, 7.0, t);
      W.skyU.uFreeze.value = 0.57 * (1 - smooth(1.0, 6.0, t)); W.skyU.uDark.value = 0.22 * (1 - smooth(1.0, 6.0, t)); W.skyU.uWarm.value = 0.35 * pulse(t, 0.5, 9, 2);
      W.hemi.intensity = lerp(0.7, 0.75, smooth(1, 6, t)); W.sun.intensity = lerp(1.07, 1.55, smooth(1, 6, t));
      S.fog.color.setRGB(lerp(0.42, 0.75, smooth(1, 6, t)), lerp(0.52, 0.89, smooth(1, 6, t)), lerp(0.7, 1.0, smooth(1, 6, t)));
      // ── the snow spirit ──
      spirit.root.position.copy(t < LAND_T + 0.25 ? sp.clone().add(new THREE.Vector3(0, -0.32, 0)) : SPOT.spirit); spirit.root.visible = t > MELT1 - 0.8;
      spirit.root.scale.setScalar(easeOutBack(range(t, MELT1 - 0.8, MELT1), 2));
      spirit.root.rotation.y = keys(t, [[0, 0.3], [LAND_T, 0.3], [9, 0.2], [15.4, 0.4], [16, 0.1]]);
      const happy = smooth(14.8, 15.6, t);
      spirit.pose({ shiver: (1 - happy) * (t > MELT1 ? 1 : 0), cover: (1 - happy) * pulse(t, 4.4, 9.5, 0.4), happy, mouth: happy * 0.6 + pulse(t, 18.4, 19.3, 0.1) * 0.8, lookX: keys(t, [[8.3, 0], [9, 0.6], [11.4, 0.6], [12, -0.2], [15.6, 0.3]]), lookY: 0.3 * happy, eyeOpen: Dragon.blink(t, 0.8) }, t);
      // ── PIPO ──
      const carry = t > GRAB_T - 0.6 && t < LAND_T + 0.2;
      const pp = t < GRAB_T - 0.6 ? SPOT.pipo.clone().add(new THREE.Vector3(0, 60, 0)) : t < LAND_T ? sp.clone().add(new THREE.Vector3(0.05, -0.18 + (t < GRAB_T ? (GRAB_T - t) * -4 : 0), -0.5)) : SPOT.pipo.clone().lerp(SPOT.pipo, 1);
      if (t >= LAND_T) pp.lerp(SPOT.pipo, 1);
      if (t >= LAND_T - 0.2 && t < LAND_T + 0.6) pp.copy(sp.clone().add(new THREE.Vector3(0.05, -0.18, -0.5)).lerp(SPOT.pipo, smooth(LAND_T - 0.2, LAND_T + 0.6, t)));
      pipo.root.position.copy(pp); pipo.root.visible = t > GRAB_T - 0.7;
      pipo.root.rotation.set(0, keys(t, [[LAND_T, 0], [9, -0.6], [11.4, 0.7], [13.9, 0.05], [15.5, 0], [18.42, 0], [18.6, -0.5]]), 0);
      const reply = t > 14.0 && t < 16.3 ? 0.3 + 0.5 * Math.abs(Math.sin(t * 14)) : 0;
      const hero = smooth(17.9, 18.15, t) * (1 - smooth(SNEEZE5 - 0.05, SNEEZE5, t)), sn = pulse(t, SNEEZE5 - 0.02, SNEEZE5 + 0.4, 0.05);
      const laugh = pulse(t, 15.6, 17.8, 0.3);
      pipo.pose({ flap: carry ? 1 : 0.15 + hero * 0.8, flapSpeed: 30, armL: carry ? 0.55 : hero * 1.0, armR: carry ? 0.55 : 0.2 * laugh, armsOut: carry ? -0.25 : 0, mouth: reply + laugh * 0.8 + sn * 1.2, laugh: laugh * 0.8,
        puff: hero * 0.8, brow: hero * 0.7, smile: 0.6 + reply * 0.3, eyeOpen: laugh > 0.5 ? 0.25 : (hero > 0.5 ? 0.85 : Dragon.blink(t, 0.4)) * (1 - pulse(t, SNEEZE5 - 0.3, SNEEZE5, 0.1) * 0.7),
        lookX: keys(t, [[9, -0.7], [11.4, 0.7], [13.9, 0], [18.6, -0.6]]), lookY: carry ? -0.5 : 0, blush: 0.4 * pulse(t, 9, 11.3, 0.5), wag: 0.6 + laugh, lean: -0.25 * sn + 0.08 * hero, tailUp: hero, hop: pulse(t, 11.0, 11.4, 0.1) * 0.6 }, t);
      pipo.root.updateMatrixWorld(true); pipo.mouthAnchor.getWorldPosition(pm);
      // medal
      const mk = easeOutBack(range(t, MEDAL_T, MEDAL_T + 0.5), 2);
      pipo.torso.localToWorld(v.set(0, 0.17, 0.115)); medal.position.copy(v); medal.quaternion.copy(pipo.torso.getWorldQuaternion(q)); medal.scale.setScalar(mk * 1.0); medal.visible = t > MEDAL_T;
      // ── LUNA ──
      luna.root.visible = true;
      const lp = t < LAND_T ? sp.clone().add(new THREE.Vector3(0.75, 0.2 + Math.sin(t * 2) * 0.05, 0.1)) : SPOT.spirit.clone().add(new THREE.Vector3(0.35, 0.55 + Math.sin(t * 2) * 0.04, 0.3));
      if (t > 11.2) lp.lerp(SPOT.pipo.clone().add(new THREE.Vector3(0.55, 0.62, 0.15)), smooth(11.2, 12.5, t));
      luna.root.position.copy(lp); luna.root.rotation.y = keys(t, [[0, -0.5], [LAND_T, -0.5], [8.5, -0.9], [11.2, -0.4], [15.5, 0]]);
      const lt = t > 5.9 && t < 8.1 ? 0.3 + 0.6 * Math.abs(Math.sin(t * 13)) : 0;
      luna.pose({ mouth: lt + laugh * 0.7, armR: 0.3 + 0.5 * pulse(t, 8.2, 9.2, 0.2), armL: pulse(t, 8.1, 9.3, 0.2) * 0.6, cheer: laugh, wave: 1, lookUp: 0, tilt: 0.25 * pulse(t, 6, 8.2, 0.4), eyeOpen: laugh > 0.5 ? 0.3 : Dragon.blink(t, 2.4), eyeBig: 1 + pulse(t, 18.4, 20, 0.2) * 0.3 }, t);
      // ── KING ──
      const caught = t >= SNEEZE5 + 0.25;
      kh.copy(SPOT.king).add(new THREE.Vector3(0.05, 0.72 + (caught ? (t - SNEEZE5 - 0.25) * 1.2 : 0), 0));
      king.root.visible = t > 8.4; king.root.position.copy(caught ? kh.clone().add(new THREE.Vector3(0, -0.62, 0)) : SPOT.king);
      king.root.rotation.set(caught ? Math.sin(t * 2.4) * 0.2 : 0, keys(t, [[8.4, 0.5], [9, 0.3], [11.3, 0.6], [15.5, 0.25], [18.6, 0.6]]), 0);
      const decl = t > 9.0 && t < 11.25 ? 0.4 + 0.5 * Math.abs(Math.sin(t * 12)) : 0, scream = t > 18.35 && t < 19.8 ? 1 : 0;
      king.pose({ armL: pulse(t, 8.9, 11.4, 0.3) * 0.95 + pulse(t, MEDAL_T - 0.4, MEDAL_T + 0.5, 0.2) * 0.5 + scream * 0.8, armR: pulse(t, 8.9, 11.4, 0.3) * 0.95 + scream * 0.8, mouth: decl + laugh * 0.6 + scream, panic: scream, eyeBig: 1 + scream * 0.4 + 0.15 * pulse(t, 8.9, 11.4, 0.3), browUp: scream + 0.5 * pulse(t, 8.9, 11.4, 0.3), hop: pulse(t, 10.6, 11.0, 0.1), wind: 0.4 + scream, crownHop: pulse(t, SNEEZE5 + 0.25, SNEEZE5 + 0.6, 0.1), eyeOpen: laugh > 0.5 ? 0.3 : 1 }, t);
      if (t >= SNEEZE5) {
        const k = range(t, SNEEZE5, SNEEZE5 + 0.25); v.copy(pm).lerp(kh, k); v.y += Math.sin(k * Math.PI) * 0.4;
        kingB.set(caught ? kh : v, lerp(0.15, 0.85, easeOutBack(range(t, SNEEZE5, SNEEZE5 + 0.35), 1.6)), t, { wobble: 0.05 + pulse(t, SNEEZE5 + 0.25, SNEEZE5 + 0.9, 0.1) * 0.2 });
        if (!sneezeF.used) sneezeF.emit({ n: 110, t0: SNEEZE5, t1: SNEEZE5 + 0.3, origin: pm.clone(), dir: [-0.5, 0.4, 0.6], speed: 4, spread: 0.9, size: [0.03, 0.13], life: [1.2, 3], drag: 1.5, lift: 0.5 });
      } else kingB.set(pm, 0, t, { alpha: 0 });
      sneezeF.update(t); party.update(t);
      // ── BRASA ──
      brasa.root.visible = t > 8.4; brasa.root.position.copy(SPOT.brasa); brasa.root.rotation.set(0, -0.55 + 0.25 * pulse(t, 11.4, 14.3, 0.4), 0);
      const sorry = pulse(t, 11.4, 14.5, 0.4), bt = t > 11.55 && t < 14.4 ? 0.3 + 0.4 * Math.abs(Math.sin(t * 12)) : 0;
      brasa.pose({ sad: sorry * 0.9, brow: -0.4 * sorry, lookY: -0.6 * sorry, lookX: -0.4, mouth: bt + laugh * 0.9 + pulse(t, 18.5, 20, 0.2) * 0.6, laugh: laugh, belly: laugh * 0.8, smile: 0.4 - sorry * 0.6, armR: sorry * 0.55, blush: sorry * 0.8, headYaw: -0.3, lookUp: -0.3 * sorry, eyeOpen: laugh > 0.5 ? 0.3 : Dragon.blink(t, 1.4), flap: 0.1, flapSpeed: 4, eyeBig: 1 + pulse(t, 18.5, 20, 0.2) * 0.3 }, t);
      W.focus(t > LAND_T - 1 ? B5 : pp, 8);
      const camera = rig.apply(t);
      const post = DEFAULT_POST(); post.tint = [1.03, 1.0, 0.97]; post.sat = 1.08;
      post.flash = pulse(t, MELT1 - 0.15, MELT1 + 0.2, 0.08) * 0.35; post.flashColor = [1, 0.9, 0.7];
      const scr = (p) => { const q2 = p.clone().project(camera); return [(q2.x * 0.5 + 0.5) * WIDTH, (1 - (q2.y * 0.5 + 0.5)) * HEIGHT]; };
      return { camera, post, scr };
    }

    function update(t) {
      const tf = Math.min(t, FREEZE_T);                      // comic freeze frame: the world stops, the overlay keeps going
      const st = frame(tf);
      if (t > FREEZE_T) { st.post.sat = 1.25; st.post.contrast = 1.12; st.post.vignette = 0.5; }
      return { camera: st.camera, post: st.post, overlay: (ctx) => {
        drawBurst(ctx, t, MELT1 - 0.1, 'PSSSH…', 540, 520, { seed: 2, color: '#ffd28a', size: 90, dur: 1.0 });
        drawBurst(ctx, t, LAND_T + 0.25, 'POP!', 760, 760, { seed: 3, color: '#7ff0dc', size: 90 });
        drawBurst(ctx, t, MEDAL_T + 0.1, 'PLIM!', 760, 700, { seed: 5, color: '#ffe14a', size: 90 });
        drawSpeedLines(ctx, t, pulse(t, 17.9, 18.4, 0.05) * 0.6, WIDTH / 2, HEIGHT * 0.5, '255,230,140');
        drawBurst(ctx, t, SNEEZE5, 'ATCHIM!', 560, 500, { seed: 9, color: '#ffe14a', size: 115, dur: 1.2 });
      }, overlayTop: (ctx) => drawFreeze(ctx, t, FREEZE_T, 'SER DIFERENTE\nPODE SER SEU\nMAIOR PODER.') };
    }
    return { scene: S, update, objects: { ...O, spirit } };
  },

  sound(s) {
    s.pad(0, 5, [57, 61, 64, 69], { gain: 0.08, type: 'triangle', cutoff: 2600, attack: 1, release: 1 });
    s.noise({ t: MELT0, dur: MELT1 - MELT0 + 0.5, gain: 0.14, attack: 1, release: 1, filter: { type: 'lowpass', freq: 1400 }, send: 0.4, curve: 'lin' }); // sizzle / melt
    for (let i = 0; i < 24; i++) s.bloop(MELT0 + 0.2 + i * 0.12, 0.04, 300 + s.r() * 500);                        // drips
    s.slide(MELT1 - 0.6, 0.9, 900, 200, 0.08); s.chime(MELT1 + 0.1, 1318, 0.08, 1.6); s.chime(MELT1 + 0.3, 1568, 0.06, 1.6);
    s.whoosh(GRAB_T - 0.6, 1.0, 0.2, 400, 2000);
    s.march(5.6, 8.0, 58, 0.04, 0.25);
    s.pop(LAND_T + 0.25, 0.25, 0.8);
    for (let i = 0; i < 8; i++) s.tone({ t: 8.4 + i * 0.07, dur: 0.05, freq: 1800 + (i % 2) * 300, type: 'sine', gain: 0.02, attack: 0.002, release: 0.04, send: 0.2 }); // shivering
    // fanfare for the hero
    [[8.95, [60, 64, 67]], [9.35, [60, 64, 67]], [9.75, [65, 69, 72]], [10.4, [67, 71, 74]]].forEach(([t, ch]) => ch.forEach((n) => s.tone({ t, dur: 0.38, freq: 440 * Math.pow(2, (n - 69) / 12), type: 'sawtooth', gain: 0.035, attack: 0.01, release: 0.2, filter: { type: 'lowpass', freq: 2200 }, bus: 'music', send: 0.3 })));
    s.pad(11.4, 3, [57, 60, 64], { gain: 0.06, type: 'triangle', cutoff: 1500, attack: 0.6, release: 1 });
    s.march(14.0, 18.2, 60, 0.06, 0.2);
    s.chime(MEDAL_T + 0.1, 2093, 0.12, 2); s.sparkle(MEDAL_T + 0.15, 8, 0.03);
    for (let i = 0; i < 18; i++) s.bloop(15.5 + i * 0.16, 0.035, 500 + s.r() * 900);                              // playful bubbles
    s.slide(17.9, 0.3, 600, 1500, 0.08);                                                                          // heroic pose
    s.noise({ t: 18.0, dur: 0.4, gain: 0.1, attack: 0.35, release: 0.05, filter: { type: 'bandpass', freq: 600, freqEnd: 2000, Q: 1 }, send: 0.2, curve: 'lin' });
    s.whoosh(SNEEZE5, 0.6, 0.3, 3000, 500); for (let i = 0; i < 12; i++) s.bloop(SNEEZE5 + i * 0.04, 0.05, 400 + s.r() * 800);
    s.tone({ t: SNEEZE5 + 0.22, dur: 0.4, freq: 220, freqEnd: 90, type: 'sine', gain: 0.12, attack: 0.01, release: 0.3, send: 0.3 });
    // freeze frame sting
    s.tone({ t: 19.3, dur: 0.7, freq: 523, type: 'triangle', gain: 0.1, attack: 0.005, release: 0.65, send: 0.4 });
    s.tone({ t: 19.3, dur: 0.7, freq: 784, type: 'triangle', gain: 0.07, attack: 0.005, release: 0.65, send: 0.4 });
    s.noise({ t: 19.3, dur: 0.12, gain: 0.15, attack: 0.002, release: 0.1, filter: { type: 'highpass', freq: 3000 }, send: 0.3 }); // camera click
  },
};
