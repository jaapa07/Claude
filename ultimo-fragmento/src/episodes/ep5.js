import * as THREE from 'three';
import { buildMemoryHall, HALL, CAM4_END, NEO4_END } from './ep4.js';
import { Neo } from '../characters/Neo.js';
import { Rebirth, groundY } from '../scenes/Rebirth.js';
import { Shockwave, glowTexture } from '../effects/Crystal.js';
import { MorphPoints } from '../effects/Particles.js';
import { CameraRig } from '../camera/CameraRig.js';
import { DEFAULT_POST, WIDTH } from '../core/Engine.js';
import { smooth, range, keys, pulse, lerp, clamp } from '../core/util.js';
import { drawEndCard } from '../overlay/Overlay.js';

const BOOM_T = 10.0, REBIRTH_T = 10.35, VISION_T = 15.0, NEW_T = 18.0, END_T = 18.3;
const SOCKET = new THREE.Vector3(HALL.x, HALL.y, HALL.z + 12 * 0.56);
const neoZ5 = (t) => keys(t, [[0, NEO4_END.z], [6.2, NEO4_END.z], [9.0, SOCKET.z + 1.4]]);
const HILL_Y = groundY(0, 0);
const NEW_POS = new THREE.Vector3(-6, groundY(-6, 6), 6);

function drawPanel(ctx, t, a) {
  if (a <= 0) return;
  const x = 90, y = 540, w = WIDTH - 180, h = 560;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,40,80,0.35)'; ctx.strokeStyle = 'rgba(110,200,255,0.9)'; ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(80,180,255,0.9)'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(x + 30, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - 30); ctx.lineTo(x + w - 30, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 8; ctx.fillStyle = 'rgba(190,230,255,1)'; ctx.textAlign = 'left';
  ctx.font = '700 34px Orbitron, sans-serif'; ctx.letterSpacing = '4px'; ctx.fillText('PROTOCOLO: RESTAURAÇÃO', x + 40, y + 70);
  ctx.font = '500 27px Inter, sans-serif'; ctx.letterSpacing = '1px';
  const rows = [['UNIVERSO ESTÁVEL', `${(0.3 + smooth(1.5, 3, t) * 0).toFixed(1)}%`], ['FONTE NECESSÁRIA', 'NÚCLEO N.E.O.'], ['CUSTO', 'EXISTÊNCIA DO PORTADOR']];
  rows.forEach(([k, v], i) => { const ry = y + 140 + i * 62; if (t < 1.4 + i * 0.5) return; ctx.fillStyle = 'rgba(140,200,255,0.8)'; ctx.fillText(k, x + 40, ry); ctx.fillStyle = i === 2 ? 'rgba(255,140,140,1)' : 'rgba(230,245,255,1)'; ctx.textAlign = 'right'; ctx.fillText(v, x + w - 40, ry); ctx.textAlign = 'left'; });
  // core → world diagram
  const cx = x + w / 2, cy = y + 380, k = smooth(2.6, 4.0, t);
  ctx.strokeStyle = 'rgba(110,200,255,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx - 220, cy, 26, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(80,180,255,0.9)'; ctx.beginPath(); ctx.arc(cx - 220, cy, 12, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 180, cy); ctx.lineTo(cx - 180 + 340 * k, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 210, cy, 46, 0, Math.PI * 2 * k); ctx.stroke();
  ctx.font = '600 22px Inter, sans-serif'; ctx.fillStyle = 'rgba(190,230,255,0.9)'; ctx.textAlign = 'center';
  ctx.fillText('NÚCLEO', cx - 220, cy + 64); ctx.fillText('MUNDO', cx + 210, cy + 84);
  // buttons
  const by = y + h - 70, pulseA = 0.5 + 0.5 * Math.sin(t * 8);
  ctx.font = '700 26px Orbitron, sans-serif'; ctx.letterSpacing = '3px';
  ctx.strokeStyle = `rgba(120,220,255,${0.6 + 0.4 * pulseA * smooth(4, 4.5, t)})`; ctx.strokeRect(x + 40, by - 34, w / 2 - 60, 56);
  ctx.fillStyle = `rgba(80,180,255,${0.25 * smooth(4.4, 4.8, t)})`; ctx.fillRect(x + 40, by - 34, w / 2 - 60, 56);
  ctx.fillStyle = 'rgba(220,240,255,1)'; ctx.fillText('RESTAURAR', x + 40 + (w / 2 - 60) / 2, by + 3);
  ctx.strokeStyle = 'rgba(120,160,200,0.5)'; ctx.strokeRect(x + w / 2 + 20, by - 34, w / 2 - 60, 56);
  ctx.fillStyle = 'rgba(150,180,210,0.6)'; ctx.fillText('CANCELAR', x + w / 2 + 20 + (w / 2 - 60) / 2, by + 3);
  ctx.restore();
}

export default {
  number: 5, title: 'A ESCOLHA FINAL', duration: 20,
  build({ renderer }) {
    const M = buildMemoryHall(renderer);
    const neo = new Neo(); M.scene.add(neo.group);
    // the core leaves the backpack: it becomes a free object in the scene
    const core = neo.core; neo.pack.remove(core); M.scene.add(core);
    core.children[0].material = neo.coreMat.clone(); core.children[0].material.emissiveIntensity = 4;
    const wave = new Shockwave({ color: 0x9fd8ff }); wave.mesh.position.copy(SOCKET); M.scene.add(wave.mesh);
    const R = new Rebirth({ renderer });
    const neoV = new Neo(); neoV.group.position.set(0, HILL_Y, 0); neoV.group.rotation.y = Math.PI * 0.82; R.scene.add(neoV.group);
    const motes = new MorphPoints({
      count: 2600, seed: 71, size: 0.05, color: 0x6cc8ff, color2: 0xe0f4ff, span: 0.55, drift: 0.2,
      start: (i, r) => { const u = r(); return u < 0.45 ? [(r() - 0.5) * 0.3, 0.42 + r() * 0.26, (r() - 0.5) * 0.28] : [(r() - 0.5) * 0.24, 0.02 + r() * 0.42, (r() - 0.5) * 0.2]; },
      target: (i, r) => [(r() - 0.5) * 8 + 3, 4 + r() * 14, (r() - 0.5) * 8 - 6], delay: (i, r) => 0.1 + r() * 0.45,
    });
    motes.points.position.set(0, HILL_Y, 0); R.scene.add(motes.points);
    const newbot = new Neo(); newbot.group.position.copy(NEW_POS); newbot.group.rotation.set(0, 0.62, 0); R.scene.add(newbot.group);
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x6cc8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    R.scene.add(spark);

    const rig = new CameraRig({ ...CAM4_END });
    rig.to(0.2, 4.6, { x: 0.7, y: 0.9, z: -161.8, tx: 0, ty: 0.2, tz: -185, fov: 46 }, 'sine.inOut')                  // over the shoulder: the choice
      .to(4.8, 1.4, { x: -0.55, y: 0.55, z: -165.0, tx: 0, ty: 0.38, tz: -166.2, fov: 34 }, 'power2.inOut')         // behind: the core comes out
      .to(6.4, 2.0, { x: 3.4, y: 0.75, z: SOCKET.z + 3.0, tx: 0, ty: 0.4, tz: SOCKET.z + 1.6, fov: 52 }, 'power2.inOut')   // toward the machine
      .to(8.6, 1.4, { x: 2.0, y: 0.6, z: SOCKET.z + 2.8, fov: 44 }, 'sine.inOut')
      .to(BOOM_T - 0.05, 0.1, { shake: 0.08 }, 'none').to(BOOM_T + 0.05, 0.3, { shake: 0 }, 'none');
    rig.prime(20);
    const rig2 = new CameraRig({ x: 2, y: HILL_Y + 1.2, z: 6, tx: 0, ty: HILL_Y + 2, tz: -30, fov: 60 });
    rig2.to(REBIRTH_T, 4.6, { x: 30, y: 60, z: 90, tx: 20, ty: 0, tz: -60, fov: 50 }, 'power2.inOut')              // rise over the reborn world
      .set(VISION_T, { x: -0.2, y: HILL_Y + 0.75, z: 1.6, tx: 2, ty: HILL_Y - 1, tz: -30, fov: 46 })                // NEO on the hill
      .to(VISION_T, 3, { x: -0.4, y: HILL_Y + 0.95, z: 2.5, fov: 50 }, 'sine.inOut')
      .set(NEW_T, { x: NEW_POS.x + 1.0, y: NEW_POS.y + 0.6, z: NEW_POS.z + 1.6, tx: NEW_POS.x, ty: NEW_POS.y + 0.62, tz: NEW_POS.z, fov: 38 }) // a new robot
      .to(NEW_T, 2, { x: NEW_POS.x + 0.8, y: NEW_POS.y + 0.55, z: NEW_POS.z + 1.3, fov: 36 }, 'sine.out');
    rig2.prime(20);
    const sockW = new THREE.Vector3(), palm = new THREE.Vector3();
    let panelA = 0;

    function update(t) {
      const post = DEFAULT_POST();
      if (t < REBIRTH_T) {
        const z = neoZ5(t);
        neo.group.position.set(0, Math.sin(t * 1.4) * 0.05 + 0.05 * smooth(6, 7, t), z);
        neo.group.rotation.set(0, Math.PI + 0.35 * pulse(t, 4.8, 6.6, 0.5), 0);
        const weak = smooth(8.8, 9.9, t);
        neo.pose({
          backReach: smooth(5.0, 5.8, t) * (1 - smooth(6.1, 6.8, t)), reachL: smooth(6.3, 7.0, t) * (1 - smooth(9.4, 10, t) * 0.7),
          lookUp: keys(t, [[0, 0], [1, 0.2], [3.5, 0.2], [4.5, -0.2], [5.2, -0.1], [6.8, -0.3], [8, 0.1]]),
          lookYaw: keys(t, [[4.6, 0], [5.2, 0.9], [6.4, 0.4], [7, 0]]), tilt: -0.15 * pulse(t, 2.5, 5, 0.6),
          eyeOpen: Neo.blink(t, 0.4) * (1 - 0.35 * smooth(2.8, 3.6, t) * (1 - smooth(4.2, 4.8, t))) * (1 - 0.5 * weak),
          mood: -0.55 * pulse(t, 1.5, 4.6, 0.6) + 0.35 * pulse(t, 7.2, 9.6, 0.6), eyeY: keys(t, [[4.5, 0], [5, -0.6], [6.8, -0.5], [7.4, 0]]),
          eyePower: 1 - 0.65 * weak, coreGlow: 1 - 0.85 * smooth(6.0, 6.6, t), sitHip: 0.15, crouch: 0.1 * weak,
        }, t);
        // core path: backpack → hand → socket
        neo.group.updateMatrixWorld(true);
        const home = neo.pack.localToWorld(neo.coreHome.clone());
        neo.arms[0].palm.getWorldPosition(palm);
        const inHand = smooth(5.9, 6.25, t), toSock = smooth(9.0, 9.9, t);
        core.position.copy(home).lerp(palm, inHand).lerp(SOCKET, toSock);
        core.scale.setScalar(1 + 0.6 * smooth(6.2, 8, t) - 0.3 * toSock);
        core.children[0].material.emissiveIntensity = 4 + 3 * smooth(6, 7, t) + 3 * smooth(9.6, BOOM_T, t);
        core.children[1].material.opacity = 0.25 + 0.3 * smooth(6, 7, t);
        core.children[0].rotation.set(t * 2, t * 1.4, 0);
        M.machine.update(t, 1, 0.75 + 0.6 * smooth(9.5, BOOM_T, t));
        M.hall.uniforms.uTime.value = t; M.tunnel.uniforms.uTime.value = t;
        M.hall.uniforms.uAll.value = 1 - smooth(0.5, 4, t); M.hall.uniforms.uBright.value = 0.5 + 0.6 * smooth(9.4, BOOM_T, t); M.hall.uniforms.uReveal.value = 1;
        M.tunnel.uniforms.uAll.value = 1 - smooth(0.5, 4, t); M.tunnel.uniforms.uBright.value = 0.33;
        M.motes.uniforms.uTime.value = t; M.sky.uniforms.uTime.value = t; M.streaks.uniforms.uOpacity.value = 0;
        const wk = range(t, BOOM_T, BOOM_T + 0.5); wave.set(wk * 120, (1 - wk), t);
        panelA = pulse(t, 0.9, 5.2, 0.4);
        const camera = rig.apply(t);
        post.flash = smooth(BOOM_T - 0.15, BOOM_T + 0.2, t); post.glitch = 0.12 * (1 - smooth(0, 0.8, t));
        post.flashColor = [0.85, 0.95, 1]; post.bloom = 0.9 + 0.4 * smooth(9.6, BOOM_T, t); post.exposure = 1 - 0.2 * smooth(8.5, 9.8, t); post.tint = [0.92, 1.0, 1.1];
        post.sat = 1 - 0.2 * pulse(t, 2, 6, 1);
        return { camera, post, scene: M.scene, overlay: (ctx) => drawPanel(ctx, t, panelA) };
      }
      // ── the reborn universe ──
      R.update(t, { green: smooth(REBIRTH_T, 11.4, t), forest: range(t, 10.6, 12.2), ocean: smooth(11.8, 13.2, t), city: range(t, 13.0, 14.6), stars: smooth(14.2, 15.4, t) });
      // NEO's vision on the hill — dissolving into particles
      const dis = smooth(15.6, 17.9, t);
      neoV.group.visible = t >= VISION_T && t < NEW_T;
      neoV.pose({ lookUp: 0.25 + 0.3 * smooth(16.5, 17.5, t), mood: 0.5, eyeOpen: Neo.blink(t, 0.9) * 0.85, dissolve: dis, coreGlow: 0.1, armsOut: 0.1 * dis }, t);
      motes.set(range(t, 15.7, 18), t, t >= VISION_T && t < NEW_T ? smooth(15.6, 16.0, t) : 0);
      motes.points.rotation.y = neoV.group.rotation.y;
      // a new robot: a tiny blue light inside
      newbot.group.visible = t >= NEW_T;
      const ignite = smooth(18.35, 18.9, t), boot = smooth(19.0, 19.5, t);
      newbot.pose({ eyePower: boot * (0.6 + 0.4 * Math.abs(Math.sin(t * 30)) * (1 - smooth(19.4, 19.6, t))), eyeOpen: 0.25 + 0.75 * boot, coreGlow: ignite, lookUp: -0.1 + 0.25 * boot, lookYaw: 0.15 * boot, sitHip: 0, mood: 0.3 * boot }, t);
      newbot.group.updateMatrixWorld(true); newbot.chest.localToWorld(spark.position.set(0, 0, 0.03));
      spark.scale.setScalar(0.06 + 0.12 * ignite + 0.03 * Math.sin(t * 9) * ignite); spark.material.opacity = ignite; spark.visible = t >= NEW_T;
      const camera = rig2.apply(t);
      post.flash = (1 - smooth(REBIRTH_T, 11.2, t)) * 0.95 + 0.25 * pulse(t, 13.0, 13.6, 0.1); post.flashColor = [1, 0.95, 0.85];
      post.bloom = 0.8 + 0.2 * dis; post.bloomThreshold = 0.88; post.exposure = 0.95 - 0.25 * smooth(NEW_T - 0.01, NEW_T, t); post.tint = [1.06, 1.0, 0.94]; post.sat = 1.1;
      post.fade = smooth(19.55, 20, t) * 0.85; post.vignette = 0.5 + 0.2 * smooth(NEW_T, 20, t);
      return { camera, post, scene: R.scene, overlayTop: (ctx) => drawEndCard(ctx, t, END_T) };
    }
    return { scene: M.scene, update, objects: { M, R, neo } };
  },

  sound(s) {
    // the choice: sparse plucked theme (A minor)
    s.pad(0, 9.8, [45, 52, 57, 60], { gain: 0.09, type: 'triangle', cutoff: 1400, attack: 2, release: 1.5 });
    const mel = [69, 72, 76, 74, 72, 71, 69, 67, 69, 64]; mel.forEach((n, i) => s.pluck(0.6 + i * 0.85, n, 0.07, 2.2, 0));
    for (let i = 0; i < 5; i++) s.tone({ t: 1.0 + i * 0.5, dur: 0.08, freq: 1800 + i * 200, type: 'sine', gain: 0.04, attack: 0.002, release: 0.06, send: 0.3 }); // HUD
    s.tone({ t: 4.5, dur: 0.15, freq: 2400, type: 'sine', gain: 0.05, attack: 0.002, release: 0.1, send: 0.4 });
    // the core comes out
    s.click(5.95, 0.15, 1800); s.noise({ t: 5.95, dur: 0.6, gain: 0.08, filter: { type: 'highpass', freq: 3000 }, send: 0.5 });
    s.tone({ t: 6.0, dur: 2.5, freq: 330, freqEnd: 165, type: 'sine', gain: 0.07, attack: 0.05, release: 2, send: 0.6 });
    s.tone({ t: 6.2, dur: 3.6, freq: 220, type: 'sine', gain: 0.05, attack: 0.5, release: 1, send: 0.6, curve: 'lin' });
    s.riser(7.4, 2.5, 0.2, 100, 1200);
    s.noise({ t: 9.6, dur: 0.4, gain: 0.25, attack: 0.002, release: 0.35, filter: { type: 'bandpass', freq: 300, Q: 3 }, send: 0.5 }); // socket clunk
    // light explosion → rebirth
    s.boom(BOOM_T, 1.0);
    s.noise({ t: BOOM_T - 1.2, dur: 1.25, gain: 0.25, attack: 1.2, release: 0.05, filter: { type: 'highpass', freq: 2500 }, send: 0.6, curve: 'lin' }); // reverse cymbal
    s.choir(BOOM_T, 8, [48, 55, 60, 64, 67], 0.26);
    const prog = [[48, 55, 64], [43, 55, 62], [45, 52, 60], [41, 53, 60]];
    prog.forEach((ch, i) => s.pad(10.4 + i * 1.9, 2.4, ch, { gain: 0.12, cutoff: 2600, attack: 0.4, release: 1 }));
    const up = [60, 64, 67, 72, 76, 79, 84]; for (let i = 0; i < 28; i++) s.pluck(10.6 + i * 0.25, up[i % 7], 0.05, 1.2, Math.sin(i) * 0.5);
    s.noise({ t: 11.8, dur: 4, gain: 0.08, attack: 1, release: 2, filter: { type: 'lowpass', freq: 900 }, send: 0.3, curve: 'lin' }); // ocean wash
    for (let i = 0; i < 9; i++) s.tone({ t: 14.8 + i * 0.33, dur: 0.12, freq: 2600 + (i % 3) * 600, freqEnd: 3800, type: 'sine', gain: 0.03, attack: 0.01, release: 0.1, send: 0.3, pan: (i % 2 ? 0.5 : -0.5) }); // birds
    // dissolving
    for (let i = 0; i < 24; i++) s.chime(15.7 + i * 0.1, 1500 + s.r() * 2500, 0.02, 1.4, (s.r() - 0.5));
    s.pad(15.5, 2.8, [57, 64, 69, 72], { gain: 0.08, type: 'triangle', cutoff: 3000, attack: 1, release: 1.4 });
    // a new beginning
    s.chime(18.4, 1760, 0.1, 2.0); s.heartbeat(18.6, 0.2);
    s.tone({ t: 19.0, dur: 0.6, freq: 600, freqEnd: 1800, type: 'sine', gain: 0.05, attack: 0.02, release: 0.4, send: 0.5 });
    s.pad(18.3, 1.7, [48, 55, 64], { gain: 0.08, type: 'triangle', cutoff: 1800, attack: 0.6, release: 1 });
  },
};
