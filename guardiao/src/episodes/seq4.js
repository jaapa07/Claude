import * as THREE from 'three';
import { shot, newTimeline, seek } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, easeIn, pulse, TAU, clamp } from '../timeline/util.js';
import { EARTH, GATE } from '../environments/cosmos.js';

// SEQUÊNCIA 4 — O despertar da última estrela (54–72 s)
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), PC = new THREE.Vector3(), O = new THREE.Vector3(0, 0, 0), FWD = new THREE.Vector3(0, 0, -1);
const SPEED = 130, T_FLY = 9, T_BOOM = 14.3, PE = new THREE.Vector3(0, 0, -(14 - T_FLY) * SPEED);
const center = (t, out) => out.set(0, 0, -clamp(t - T_FLY, 0, 14 - T_FLY) * SPEED);
function astraPath(tt, out) { const t = tt - 54; center(t, out); const arrive = easeOut(seg(t, 7.6, 9.6)); return out.add(V2.set(lerp(160, 78, arrive), lerp(-120, -30, arrive), lerp(330, -30, arrive))); }
function lumiPath(tt, out) { const t = tt - 54, fly = sseg(t, 8.6, 9.4); center(t, out); const a = tt * 1.5; return out.add(V2.set(lerp(Math.sin(a) * 1.3, -3.2, fly), lerp(0.1 + Math.sin(tt * 2.1) * 0.25, 0.8, fly), lerp(Math.cos(a) * 1.3, -2.5, fly))); }

export default {
  build(F) {
    const tl = newTimeline(), cam = F.cam, kaito = F.kaito, C = F.cosmos;
    shot(tl, cam, 0, 4, { p: [0.9, 0.5, 5.2], l: [0, 0.45, 0], fov: 42 }, { p: [0.16, 0.74, 1.05], l: [0, 0.73, 0], fov: 28 }, 'sine.inOut');
    shot(tl, cam, 4, 6.2, { p: [2.4, -1.4, 8.5], l: [0, 0.2, 0], fov: 52 }, { p: [4.5, -0.8, 15], l: [0, 0.2, 0], fov: 52 }, 'sine.out');
    shot(tl, cam, 6.2, 9, { p: [34, 12, 78], l: [0, 0, 0], fov: 50 }, { p: [100, 36, 190], l: [20, -8, -20], fov: 52 }, 'sine.inOut');

    return {
      update(t, T) {
        F.begin(T); seek(tl, t);
        C.group.visible = true; F.fill.intensity = 0.55;
        center(t, PC);
        // ---- câmera das partes amarradas ao voo
        if (t >= 9 && t < 11.6) { const k = sseg(t, 9, 11.6); cam.p.copy(PC).add(V.set(lerp(2.6, 1.8, k), lerp(1.5, 1.1, k), lerp(8, 5.2, k))); cam.l.copy(PC).add(V.set(4, -1, -40)); cam.fov = 62; }
        else if (t >= 11.6 && t < 14) { const k = sseg(t, 11.6, 14); cam.p.copy(PC).add(V.set(lerp(-8.5, -5.8, k), 1.1, lerp(-13.5, -9.5, k))); cam.l.copy(PC).add(V.set(3, 0.2, 3)); cam.fov = 46; }
        else if (t >= 14) { const k = easeIn(seg(t, 14.7, 18)); A.copy(PE).add(V.set(0, 6, 36)); B.copy(EARTH).add(V.set(0, 1000, 2900)); cam.p.lerpVectors(A, B, k); cam.l.copy(PE).lerp(EARTH, sseg(t, 14.6, 16)); cam.fov = lerp(50, 44, k); }
        cam.roll = (t >= 9 && t < 14) ? Math.sin(T * 0.9) * 0.05 : 0;
        const bloom = sseg(t, 4.6, 9), boom = t - T_BOOM;
        F.atmo.apply('void', 'bloom', bloom, T, PC, sseg(t, 5, 12) * 0.3);
        if (boom > 0) { F.atmo.u.uWave.value = seg(t, T_BOOM, 17.2); F.atmo.u.uWaveDir.value.copy(FWD); }
        // ---- Kaito
        F.show(kaito);
        const awake = sseg(t, 0.6, 3.6), open = sseg(t, 4.0, 4.9), fly = sseg(t, 8.7, 9.5), stop = sseg(t, 13.6, 14.2);
        kaito.place(PC.x, PC.y - 0.9, PC.z, 0); kaito.awaken(awake, T); kaito.setCrystal(0.4 + awake * 0.5); kaito.capeWind = 0.35 + open * 0.3 + fly * 0.5;
        const prone = fly * (1 - stop);
        kaito.root.rotation.set((Math.PI / 2 - 0.3) * prone, lerp(Math.sin(T * 0.25) * 0.25, 0, fly) + Math.PI * stop, Math.PI * prone);
        if (stop > 0) kaito.root.rotation.set(0, Math.PI, 0);
        kaito.set('legL', -0.2, 0, 0.1, 1); kaito.set('legR', 0.15, 0, -0.1, 1); kaito.set('shinL', 0.5, 0, 0, 1 - prone * 0.6); kaito.set('shinR', 0.3, 0, 0, 1 - prone * 0.6);
        kaito.set('armL', -0.25, 0, 0.35 + open * 1.25, 1); kaito.set('armR', -0.25, 0, -0.35 - open * 1.25, 1); kaito.set('spine', -0.12 * open, 0, 0, 1);
        kaito.set('armR', -2.95, 0, -0.15, prone); kaito.set('armL', 0.5, 0, 0.3, prone);
        if (boom > -0.6) { const curl = pulse(t, T_BOOM - 0.6, T_BOOM + 0.05, 0.25), star = sseg(t, T_BOOM, T_BOOM + 0.3); kaito.set('armL', -1.6, 0, -0.6, curl); kaito.set('armR', -1.6, 0, 0.6, curl); kaito.set('spine', 0.5, 0, 0, curl); kaito.set('armL', -0.3, 0, 2.1, star); kaito.set('armR', -0.3, 0, -2.1, star); kaito.set('spine', -0.3, 0, 0, star); }
        kaito.look(0, -0.75 * prone - 0.15 * open * (1 - fly), 1);
        kaito.face({ blink: 1 - sseg(t, 2.6, 3.1), brow: -0.3 + 0.7 * fly, smile: 0.3 * open + 0.4 * fly, mouth: 0.6 * pulse(t, T_BOOM - 0.1, T_BOOM + 1.2, 0.2) });
        kaito.body.position.y += Math.sin(T * 1.2) * 0.04 * (1 - fly);
        // ---- Lumi (vira um pequeno sol) e Astra
        F.lumi.update(T, lumiPath, cam.p, { sun: sseg(t, 8.8, 9.8), happy: 0.6, light: 0.6 });
        if (t > 7.4) { astraPath(T, V); F.astra.group.position.copy(V); F.astra.group.lookAt(V2.copy(V).add(A.set(lerp(-0.5, 0, sseg(t, 7.6, 9.6)), lerp(0.25, 0, sseg(t, 7.6, 9.6)), -1))); F.astra.group.rotateZ(Math.sin(T * 0.6) * 0.06);
          F.astra.update(T, { glow: 2.2, fins: 1.5, path: astraPath, fog: F.atmo.scene.fog, fogK: 0, speed: 1.3 }); }
        // ---- energia: cascas de luz, planetas que despertam, nebulosas que florescem, corredor de constelações
        const waves = [4.2, 5.8, 7.4].map((ts) => (t - ts) / 2.6), bw = boom > 0 ? [boom / 3.2, (boom - 0.4) / 3.2, (boom - 0.8) / 3.2] : null;
        C.update(T, { wave: boom > 0 ? 9999 : (t - 4.2) * 110, bloom, shells: bw ?? waves, shellR: bw ? 5200 : 720, origin: bw ? PE : O, cam: cam.p, reveal: t > 8.4 ? (t - 8.4) * 2.4 + (-PC.z) / GATE + 2.5 : 0, earth: t > 13.5, dawn: sseg(t, 15.6, 17.8) });
        [4.2, 5.8, 7.4].forEach((ts, i) => { const k = (t - ts) / 1.5; if (k > 0 && k < 1) F.wave(1 + (i % 2), V.set(0, 0.3, 0), k * 1.3, 0.05 * (1 - k)); });
        F.gold[0].u.uStagger.value = 2.5; F.gold[0].u.uSpeed.value = 1.2; F.gold[0].u.uGain.value = 0.6; F.gold[0].set(V.set(0, 0.2, 0), t - 0.8, [0.5, 1.0, 0.5]);
        F.motes.u.uBox.value.set(40, 30, 40); F.motes.u.uSize.value = 0.05; F.motes.update(T, F.ahead(14), 0.4 + bloom * 0.6);
        // ---- a explosão de luz que devolve as estrelas
        if (boom > 0) { F.big.u.uSpeed.value = 800; F.big.u.uSize.value = 12; F.big.u.uLife.value = 6; F.big.set(PE, boom, [2, 2, 2]); F.rays(0.7 * (1 - sseg(t, T_BOOM, 16)), PE, [1, 0.88, 0.6]); F.wave(1, PE, boom * 0.9, 0.06 * Math.max(0, 1 - boom / 1.6)); }
        F.rays(Math.max(F.stage.fx.uRays.value, 0.1 * awake * (1 - fly)), t < 9 ? V.set(0, 0.3, 0) : undefined, [1, 0.85, 0.55]);
        F.stage.flash(1, 0.95, 0.82, Math.pow(1 - sseg(t, 0, 1.2), 1.5) + pulse(t, T_BOOM - 0.03, T_BOOM + 0.55, 0.06) * 0.55 + Math.pow(sseg(t, 17.25, 18), 1.5));
        F.stage.fx.uWarp.value = pulse(t, 4.2, 9, 1) * 0.12 + (t >= 9 && t < 14 ? 0.15 : 0) + pulse(t, T_BOOM, 16, 0.4) * 0.3;
        cam.shake = (t >= 9 && t < 14 ? 0.5 : 0.1) + pulse(t, T_BOOM, 15.5, 0.2) * 1.4;
        F.end(T);
      },
    };
  },
};
