import * as THREE from 'three';
import { shot, newTimeline, seek } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, pulse, TAU, clamp } from '../timeline/util.js';
import { TEMPLE } from '../environments/desert.js';

// SEQUÊNCIA 3 — O templo dos mil universos (36–54 s)
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), A = new THREE.Vector3();
const TOUCH = 9.0, HZ = TEMPLE.z + 1.9;
function kaitoPos(t, out) {                                           // pouso → caminhada até o templo → sob o coração de cristal
  if (t < 4) return out.set(0, Math.max(0, 7 * (1 - seg(t, 0, 0.7)) * (1 - seg(t, 0, 0.7))), 0);
  if (t < 6.5) return out.set(0, 0, lerp(-46, -62, seg(t, 4, 6.5)));
  return out.set(0, 1.0, lerp(HZ + 4.2, HZ, sseg(t, 6.5, 8.1)));
}
function lumiPath(tt, out) {
  const t = tt - 36; kaitoPos(t, out);
  if (t < 9.6) return out.add(V2.set(Math.sin(tt * 1.6) * 1.1, 1.9 + Math.sin(tt * 2.3) * 0.2, Math.cos(tt * 1.6) * 1.1));
  return out.set(Math.sin(tt * 1.2) * 2.2, 0.8 + Math.sin(tt * 1.7) * 0.6, Math.cos(tt * 1.2) * 2.2);
}

export default {
  build(F) {
    const tl = newTimeline(), cam = F.cam, kaito = F.kaito, D = F.desert, TU = F.tunnel;
    shot(tl, cam, 4, 6.5, { p: [14, 11, -18], l: [0, 36, -150], fov: 52 }, { p: [8, 21, -54], l: [0, 44, -150], fov: 50 }, 'sine.inOut');
    shot(tl, cam, 6.5, 9.6, { p: [4.4, 1.4, HZ + 10.5], l: [0, 6.6, HZ - 1], fov: 58 }, { p: [3.0, 1.5, HZ + 7.2], l: [0, 6.0, HZ - 1], fov: 56 }, 'sine.out');
    shot(tl, cam, 9.6, 11.8, { p: [1.6, 9, 2.2], l: [0, -30, 0], fov: 58 }, { p: [3.5, 5, 4.5], l: [0, -4, 0], fov: 54 }, 'sine.inOut');
    shot(tl, cam, 11.8, 14, { p: [5.5, 0.6, 3.5], l: [0, 0.4, 0], fov: 46 }, { p: [-4.6, -1.5, 4.6], l: [0, 0.4, 0], fov: 44 }, 'sine.inOut');
    shot(tl, cam, 14, 18, { p: [-4.6, -1.5, 4.6], l: [0, 0.4, 0], fov: 44 }, { p: [0.6, -1.0, 13.5], l: [0, 0.6, 0], fov: 50 }, 'sine.inOut');

    return {
      update(t, T) {
        F.begin(T); seek(tl, t);
        F.show(kaito);
        if (t < 9.6) {
          // ================= deserto celestial e templo
          D.group.visible = true;
          kaitoPos(t, V); const touch = sseg(t, 8.0, TOUCH), gone = sseg(t, TOUCH, 9.9);
          F.atmo.apply('desert', null, 0, T, V);
          D.update(T, F.atmo, sseg(t, 6.5, TOUCH) * 0.3 + pulse(t, TOUCH - 0.05, 9.6, 0.1) * 2, gone, lerp(48, 8.9, sseg(t, 6.0, 8.4)), lerp(1, 0.32, sseg(t, 6.0, 8.4)));
          F.motes.update(T, F.ahead(6), 1);
          if (t < 4) {                                                // pouso + órbita de 360°
            const land = seg(t, 0, 0.7), rise = sseg(t, 1.0, 2.2);
            kaito.place(V.x, V.y, V.z, Math.PI * 0.9).idle(T); kaito.kneel((land >= 1 ? 1 : 0.4) * (1 - rise)); kaito.capeWind = lerp(1, 0.35, sseg(t, 0.6, 1.6));
            kaito.look(Math.sin(t * 1.3) * 0.7 * rise, -0.25 * rise, 1); kaito.face({ brow: -0.8, mouth: 0.4 * rise });
            F.gold[0].u.uSpeed.value = 5; F.gold[0].set(A.set(0, 0.2, 0), t - 0.7, [0.8, 0.1, 0.8]);
            F.rings[0].position.set(0, 0.15, 0); F.rings[0].rotation.set(-Math.PI / 2, 0, 0); F.rings[0].scale.setScalar(16); F.rings[0].userData.set(clamp((t - 0.7) / 1.4), T);
            const k = sseg(t, 0.2, 4), a = 0.5 + k * TAU, R = lerp(6.5, 9.5, k);
            cam.p.set(Math.sin(a) * R, lerp(1.3, 3.4, k), Math.cos(a) * R); cam.l.set(0, lerp(1.2, 2.4, k), 0); cam.fov = lerp(46, 52, Math.sin(k * Math.PI));
            F.astra.group.position.set(150 + t * 14, 300 + t * 16, -330 - t * 40); F.astra.group.rotation.set(-0.25, 0.9, 0); F.astra.update(T, { glow: 1.6, fins: 1.2, fog: F.atmo.scene.fog, fogK: 0.1 });
            cam.shake = pulse(t, 0.65, 1.5, 0.15) * 1.2;
          } else if (t < 6.5) { kaito.place(V.x, V.y, V.z, Math.PI).walk((t - 4) * 1.5, 1, 0.2).idle(T); kaito.look(0, -0.35, 1); kaito.face({ brow: -0.8, mouth: 0.3 }); }
          else {
            const walk = 1 - sseg(t, 7.9, 8.1); kaito.place(V.x, V.y, V.z, Math.PI).idle(T); if (walk > 0) kaito.walk((t - 6.5) * 1.3, walk);
            kaito.set('armR', -2.75, 0, -0.1, touch); kaito.set('foreR', -0.15, 0, 0, touch); kaito.look(0, -0.6, sseg(t, 6.8, 7.6)); kaito.face({ brow: -0.7, mouth: 0.35 });
            kaito.setCrystal(0.5 + touch * 1.5);
            if (t > TOUCH) { V.y -= Math.pow(t - TOUCH, 2) * 6; kaito.place(V.x, V.y, V.z, Math.PI); kaito.set('armL', -0.5, 0, 1.6, gone); kaito.set('armR', -0.5, 0, -1.6, gone); kaito.capeWind = gone; kaito.face({ brow: -1, mouth: 0.8 }); }
            F.rings[1].position.copy(D.heartPos); F.rings[1].rotation.set(-Math.PI / 2, 0, 0); F.rings[1].scale.setScalar(150); F.rings[1].userData.set(clamp((t - TOUCH) / 1.2), T);
            if (t > TOUCH) F.wave(1, D.heartPos, (t - TOUCH) * 1.4, 0.07 * Math.max(0, 1 - (t - TOUCH)));
            cam.shake = pulse(t, TOUCH, 9.7, 0.1) * 1.8;
          }
          F.rays(0.14 + touch * 0.2, D.heartPos, [1, 0.8, 0.6]);
          F.lumi.update(T, lumiPath, cam.p, { happy: 0.3 });
          F.stage.flash(1, 0.94, 0.78, Math.pow(1 - sseg(t, 0, 0.9), 1.5) + pulse(t, TOUCH - 0.05, 9.75, 0.08) * 0.9);
        } else {
          // ================= queda pelo túnel de galáxias e os fragmentos de realidade
          TU.group.visible = true;
          F.atmo.apply('void', null, 0, T, V.set(0, 0, 0)); F.fill.intensity = 1.1;
          const slow = sseg(t, 13.6, 15.4), fall = (t - 9.6) * 95 - slow * (t - 13.6) * 60, frag = sseg(t, 13.7, 14.9), gather = sseg(t, 16.5, 17.9);
          TU.update(T, fall, T * 0.09, frag, gather, 1 - sseg(t, 17.4, 18) * 0.6);
          kaito.place(0, 0, 0, 0); kaito.root.rotation.set(lerp(1.15, 0.25, slow), T * lerp(0.9, 0.25, slow), Math.sin(T * 0.8) * 0.2);
          kaito.set('armL', -0.6, 0, 1.75, 1); kaito.set('armR', -0.7, 0, -1.6, 1); kaito.set('foreL', -0.5, 0, 0, 1); kaito.set('foreR', -0.4, 0, 0, 1);
          kaito.set('legL', -0.6 + Math.sin(T * 2) * 0.2, 0, 0.3, 1); kaito.set('legR', 0.2 - Math.sin(T * 2) * 0.2, 0, -0.3, 1); kaito.set('shinL', 0.9, 0, 0, 1); kaito.set('shinR', 0.7, 0, 0, 1);
          kaito.capeWind = lerp(1, 0.5, slow); kaito.look(Math.sin(T * 1.1) * 0.6 * slow, -0.2, 1); kaito.face({ brow: -0.9, mouth: lerp(0.7, 0.3, slow) }); kaito.setCrystal(1 + gather);
          kaito.awaken(gather * 0.5, T);
          F.lumi.update(T, lumiPath, cam.p, { happy: 0 });
          F.stage.flash(1, 0.95, 0.82, Math.pow(1 - sseg(t, 9.6, 10.3), 1.5) * 0.8 + Math.pow(sseg(t, 17.3, 18), 1.4));
          F.stage.fx.uWarp.value = 0.25 * (1 - slow) + gather * 0.5; cam.roll = Math.sin(T * 0.5) * 0.12 * (1 - slow);
          cam.shake = 0.5 * (1 - slow) + gather * 0.8;
          if (gather > 0) F.rays(gather * 0.6, V.set(0, 0.8, 0), [1, 0.9, 0.7]);
        }
        F.end(T);
      },
    };
  },
};
