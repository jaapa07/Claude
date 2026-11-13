import * as THREE from 'three';
import { shot, newTimeline, seek } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, pulse, TAU, clamp } from '../timeline/util.js';

// SEQUÊNCIA 1 — A noite em que o céu morreu (0–18 s)
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), STAR = new THREE.Vector3(0, 950, -1700), KP = new THREE.Vector3(0, 0.25, -25), MAP = new THREE.Vector3(0.1, 2.35, -27.3);

/** trajetória de Astra ao emergir do mar de nuvens (usada também pelo rastro de estrelas). */
export function astraPath1(t, out) { const k = sseg(t, 12.2, 18.5); return out.set(lerp(-400, 150, k), lerp(-240, 140, easeOut(seg(t, 12.2, 17))), lerp(-640, -340, k)); }
function lumiPath(t, out) {
  const k = seg(t, 7.35, 9.5), a = k * TAU * 2.2 + 1.2, R = lerp(0.25, 0.95, sseg(k, 0, 0.3)) * (1 - sseg(k, 0.85, 1) * 0.3), s = sseg(t, 9.3, 9.9);
  out.set(Math.sin(a) * R, 1.45 + k * 0.7 + Math.sin(t * 2.3) * 0.05, -25 + 0.25 + Math.cos(a) * R);
  return out.lerp(V2.set(0.62, 2.0 + Math.sin(t * 2.3) * 0.06, -26.4), s);
}

export default {
  build(F) {
    const tl = newTimeline(), cam = F.cam, kaito = F.kaito;
    shot(tl, cam, 0, 3, { p: [0, 150, 260], l: [0, 620, -1100], fov: 52 }, { p: [0, 560, -820], l: [0, 900, -1650], fov: 58 }, 'power2.in');
    shot(tl, cam, 3, 5.6, { p: [52, 20, 16], l: [8, 2, -6], fov: 50 }, { p: [7, 3.6, -15], l: [0, 1.7, -25], fov: 44 }, 'power2.inOut');
    shot(tl, cam, 5.6, 7.2, { p: [1.7, 1.55, -28.0], l: [0, 1.55, -25], fov: 36 }, { p: [1.2, 1.6, -27.5], l: [0, 1.55, -25], fov: 33 }, 'sine.out');
    shot(tl, cam, 7.2, 9.5, { p: [2.8, 1.7, -28.4], l: [0, 1.6, -25.2], fov: 44 }, { p: [-2.4, 2.1, -28.6], l: [0, 1.7, -25.2], fov: 42 }, 'sine.inOut');
    shot(tl, cam, 9.5, 12, { p: [-0.9, 2.1, -29.6], l: [0.1, 1.95, -25.6], fov: 40 }, { p: [-0.5, 2.15, -29.0], l: [0.1, 1.9, -25.6], fov: 37 }, 'sine.inOut');
    shot(tl, cam, 12, 14.2, { p: [2.2, 2.3, -20.5], l: [-20, 6, -200], fov: 46 }, { p: [4.5, 3.2, -18.5], l: [-200, 30, -560], fov: 48 }, 'sine.inOut');
    shot(tl, cam, 14.2, 16.7, { p: [7, 5, -12], l: [-160, 60, -560], fov: 48 }, { p: [120, 80, 230], l: [50, 110, -380], fov: 54 }, 'power2.inOut');
    shot(tl, cam, 16.7, 18, { p: [120, 80, 230], l: [50, 110, -380], fov: 54 }, { p: [128, 160, -278], l: [146, 142, -338], fov: 40 }, 'power3.in');

    return {
      update(t, T) {
        F.begin(T); seek(tl, t);
        F.islands.group.visible = true;
        const die = sseg(t, 1.0, 3.2), hope = sseg(t, 12.4, 16.5);
        if (t < 12) F.atmo.apply('gold', 'dark', die, T, KP, 1 - die); else F.atmo.apply('dark', 'hope', hope, T, KP);
        F.islands.update(T, F.atmo, 0);
        // ---- 0–3 s: a estrela explode em silêncio e as constelações se apagam
        if (t < 5) {
          const boom = t - 0.3;
          F.star.visible = t < 0.42; F.star.position.copy(STAR); F.star.scale.setScalar(70 * (1 + sseg(t, 0, 0.3) * 0.5 + pulse(t, 0.28, 0.45, 0.05) * 1.6));
          F.big.set(STAR, boom, [30, 30, 30]);
          F.rings[0].position.copy(STAR); F.rings[0].lookAt(cam.p); F.rings[0].scale.setScalar(1500); F.rings[0].userData.set(clamp(boom / 2.6), T);
          F.stage.flash(1, 0.92, 0.75, pulse(t, 0.27, 0.7, 0.06) * 0.22);
          if (boom > 0 && boom < 2) F.wave(1, STAR, boom * 0.75, 0.05 * (1 - boom / 2));
          F.rays(0.5 * (1 - sseg(t, 0.3, 2.2)), STAR, [1, 0.85, 0.6]);
          cam.shake = pulse(t, 0.3, 2.4, 0.3) * 1.2; cam.roll = sseg(t, 0, 3) * 0.35 * (t < 3 ? 1 : 0);
        }
        // ---- Kaito no mirante
        F.show(kaito);
        const cry = t < 7.35 ? sseg(t, 4.6, 5.6) * (0.5 + 0.5 * Math.sin(t * 9)) : 0.3;
        kaito.place(KP.x, KP.y, KP.z, Math.PI).idle(T); kaito.setCrystal(cry + pulse(t, 7.2, 7.6, 0.1) * 2);
        kaito.capeWind = 0.3 + hope * 0.5;
        if (t < 7.35) { kaito.look(0, -0.5 + 0.75 * sseg(t, 5.4, 6.6), 1); kaito.set('armR', -0.9, 0, 0.5, sseg(t, 5.8, 6.8)); kaito.set('foreR', -1.5, 0, 0.3, sseg(t, 5.8, 6.8)); kaito.face({ brow: -0.6, mouth: 0.12 }); }
        else if (t < 12) {
          const amaze = sseg(t, 7.4, 8.2), reach = sseg(t, 9.9, 10.9);
          kaito.look(Math.sin((t - 7.4) * 2.4) * 0.5 * (1 - sseg(t, 9.2, 9.8)) - 0.1 * reach, -0.3 * sseg(t, 9.3, 10), 1); kaito.j.spine.rotation.x -= 0.12 * amaze * (1 - sseg(t, 8.6, 9.4));
          kaito.reach(reach * 0.85, 'R'); kaito.set('armR', -2.0, 0, -0.15, reach * 0.85);
          kaito.face({ brow: -0.8, mouth: 0.45 * amaze * (1 - sseg(t, 9, 9.6)), smile: 0.4 * sseg(t, 11.2, 12) });
          if (T >= 10.3 && T <= 11.95) kaito.talk(T, 0.9);
        } else { kaito.look(0, -0.3, 1); kaito.face({ brow: -0.9, mouth: 0.5 * sseg(t, 12.6, 13.4) }); kaito.j.spine.rotation.x -= 0.1; }
        // ---- 7–12 s: Lumi sai do cristal e projeta o mapa de constelações
        if (t >= 7.35) {
          F.lumi.update(T, t < 12 ? lumiPath : (tt, o) => lumiPath(Math.min(tt, 12), o).add(V.set(0, Math.sin(tt * 2) * 0.05, 0)), t < 9.4 ? V.copy(cam.p) : (t < 12 ? V.set(0, 1.7, -25) : V.set(0, 30, -400)), { happy: pulse(t, 7.6, 9.2, 0.3), size: sseg(t, 7.35, 7.7) });
          F.gold[0].u.uLife.value = 1.3; F.gold[0].u.uGain.value = 0.7; F.gold[0].set(V.set(0, 1.55, -25.2), t - 7.35, [0.05, 0.05, 0.05]);
          const mk = sseg(t, 9.5, 10.3) * (1 - sseg(t, 12.2, 13)); F.map.set(MAP, 1.5, mk, T);
        }
        // ---- 12–18 s: Astra emerge do oceano de nuvens
        if (t >= 12) {
          const p = astraPath1(t, V); F.astra.group.position.copy(p); F.astra.group.rotation.set(-0.5 * (1 - sseg(t, 13.5, 17.2)), 1.08, 0.06 * Math.sin(T * 0.4));
          F.astra.update(T, { glow: 0.8 + hope * 0.8 + sseg(t, 16.8, 18) * 3, fins: 1.2, path: astraPath1, fog: F.atmo.scene.fog, fogK: 0.25, wake: sseg(t, 12.6, 14) });
          cam.shake = pulse(t, 12, 15, 0.5) * 0.9;
          F.rays(0.3 * hope, p, [0.5, 0.75, 1]);
          F.stage.flash(1, 0.95, 0.8, Math.pow(sseg(t, 17.35, 18), 1.5));
          F.stage.fx.uWarp.value = sseg(t, 17, 18) * 0.5;
        }
        F.motes.update(T, F.ahead(6), t > 3 ? 0.6 : 0);
        F.stage.fx.uFade.value = 1 - sseg(t, 0, 0.25);
        F.end(T);
      },
    };
  },
};
