import * as THREE from 'three';
import { shot, newTimeline, pathFn, seek } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, pulse, TAU, clamp } from '../timeline/util.js';
import { EARTH } from '../environments/cosmos.js';

// SEQUÊNCIA 5 — Quando o universo voltou a respirar (72–90 s)
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), A = new THREE.Vector3(), KP = new THREE.Vector3(0, 0.25, -25);
const flyP = pathFn([[-1, 300, 170, 380], [0, 250, 140, 320], [2.6, 110, 52, 130], [5, 34, 16, 22], [6, 20, 10, 10]]), flyL = pathFn([[-1, 0, 40, -200], [0, 0, 30, -160], [2.6, -40, 20, -120], [5, 0, 4, -12], [6, 0, 3, -10]]);
const astraIsl = pathFn([[70, -900, 30, -620], [77, -520, 70, -520], [82, 120, 120, -440], [86, 620, 170, -420], [92, 1100, 220, -400]], false);
const SPACE_T = 15.9;
const camSpace = (t, out) => { const k = sseg(t, SPACE_T, 18); return out.copy(EARTH).add(V2.set(lerp(-200, 0, k), lerp(600, 850, k), lerp(4800, 6000, k))); };
const astraSpace = (tt, o) => { const k = (tt - 87.6) / 2.6; return camSpace(tt - 72, o).add(V2.set(lerp(-430, 430, k), lerp(-55, -5, k), lerp(-230, -250, k))); };
const upP = pathFn([[13.5, 1.6, 1.9, -22.4], [14.1, 1.4, 2.0, -22.4], [15.0, 6, 40, 20], [16.1, 20, 420, 300], [17, 30, 900, 700]]);
function lumiPath(tt, out) {
  const t = tt - 72, sit = sseg(t, 9.0, 10.2);
  if (t < 5) return out.set(4 + Math.sin(tt) * 3, 8 + Math.sin(tt * 1.7), -6 + Math.cos(tt) * 3);
  const kx = 0, kz = t < 9 ? lerp(-15, -8, seg(t, 5, 7.6)) : KP.z; out.set(kx + Math.sin(tt * 1.5) * 1.4, 2.3 + Math.sin(tt * 2.2) * 0.3, kz + Math.cos(tt * 1.5) * 1.4);
  return out.lerp(V2.set(0.36, 1.73 + Math.sin(tt * 3) * 0.012, KP.z - 0.03), sit);
}

export default {
  build(F) {
    const tl = newTimeline(), cam = F.cam, kaito = F.kaito, kids = F.children;
    shot(tl, cam, 5, 7.3, { p: [3.6, 0.9, 5.5], l: [0, 1.2, -6], fov: 50 }, { p: [2.2, 1.1, 2.6], l: [0, 1.2, -6], fov: 46 }, 'sine.out');
    shot(tl, cam, 7.3, 9, { p: [1.2, 1.5, 3.2], l: [-14, 24, -120], fov: 54 }, { p: [2.0, 2.3, 6.2], l: [-8, 30, -120], fov: 54 }, 'sine.inOut');
    shot(tl, cam, 9, 14.1, { p: [1.7, 1.75, -27.9], l: [-0.1, 1.68, -25], fov: 36 }, { p: [1.1, 1.82, -27.3], l: [-0.1, 1.7, -25], fov: 32 }, 'sine.inOut');

    return {
      update(t, T) {
        F.begin(T); seek(tl, t);
        const space = t >= SPACE_T;
        if (!space) {
          // ================= o mundo transformado
          F.islands.group.visible = true;
          F.atmo.apply('dawn', 'morning', sseg(t, 2, 12), T, t < 9 ? V.set(0, 0, -8) : KP);
          F.islands.update(T, F.atmo, sseg(t, 0, 3.5));
          F.ocean.fish.visible = true; F.ocean.updateFish(T, V.set(40, 30, -60), 0.5);
          astraIsl(T, V); F.astra.group.position.copy(V); F.astra.group.lookAt(astraIsl(T + 0.2, V2)); F.astra.update(T, { glow: 1.8, fins: 1.3, path: astraIsl, fog: F.atmo.scene.fog, fogK: 0.12 });
          if (t < 5) { flyP(t, cam.p); flyL(t, cam.l); cam.fov = lerp(54, 48, sseg(t, 0, 5)); cam.roll = Math.sin(t * 0.7) * 0.05; }
          else if (t >= 14.1) { upP(t, cam.p); cam.l.set(0, lerp(4, 300, sseg(t, 14.2, 15.9)), lerp(-60, -200, sseg(t, 14.1, 15.9))); cam.fov = lerp(40, 56, sseg(t, 14.1, 15.5)); }
          F.rays(0.5 * (1 - sseg(t, 9, 14)) + 0.2);
          F.motes.u.uBox.value.set(40, 24, 40); F.motes.u.uSize.value = 0.06; F.motes.update(T, F.ahead(12), 1);
          // Kaito volta à vila
          F.show(kaito); kaito.capeWind = 0.4;
          if (t < 9) {
            const z = lerp(-15, -8, seg(t, 5, 7.6)), walking = t > 5 && t < 7.6 ? 1 : 0, up = sseg(t, 7.2, 8);
            kaito.place(0, 0, z, 0).idle(T); if (walking) kaito.walk((z + 15) * 0.6, 1 - sseg(t, 7.3, 7.6));
            kaito.look(0, -0.1, 1); kaito.face({ brow: -0.3, smile: 0.8 }); kaito.root.rotation.y = lerp(0, Math.PI, up);
            if (up > 0.5) kaito.look(0, -0.45, 1);
            kids.forEach((c, i) => {                                   // crianças correm para ver o céu
              c.root.visible = t >= 4.9; const run = seg(t, 5.1 + i * 0.25, 7.3 + i * 0.1), zz = lerp(9 + i * 2, -3.2 + i * 0.7, easeOut(run)), stop = sseg(run, 0.85, 1), lookUp = sseg(t, 7.4, 8.1);
              c.place([-1.5, 1.4, 0.2][i], 0, zz, Math.PI).walk((9 - zz) * 0.9 + i, 1 - stop, 0.8).idle(T);
              c.face({ smile: 1, mouth: 0.5 }); c.look(0, -0.5 * lookUp, 1); c.set(i % 2 ? 'armL' : 'armR', -2.5, 0, i % 2 ? 0.3 : -0.3, lookUp);
            });
          } else {
            kaito.place(KP.x, KP.y, KP.z, Math.PI).idle(T); kaito.look(0.35 * pulse(t, 10.4, 13.9, 0.5), -0.3 * (1 - pulse(t, 10.4, 13.9, 0.5) * 0.7), 1);
            kaito.face({ brow: -0.3, smile: 0.7 }); if (T >= 81.4 && T <= 84.2) kaito.talk(T, 0.8);
          }
          F.lumi.update(T, lumiPath, t >= 10 && t < 14.1 ? V.set(1.5, 1.7, -27.6) : cam.p, { happy: 0.8, size: lerp(1, 0.62, sseg(t, 9, 10.2)), light: 0.4, dim: sseg(t, 9, 10.2) * (1 - sseg(t, 14, 14.6)) });
          F.stage.flash(1, 0.96, 0.85, Math.pow(1 - sseg(t, 0, 1.6), 1.4) + pulse(t, 15.4, 16.6, 0.5) * 1.0);
          F.stage.fx.uSat.value = 1.12;
        } else {
          // ================= o planeta visto do espaço
          F.cosmos.group.visible = true;
          F.atmo.apply('space', null, 0, T, EARTH);
          F.cosmos.update(T, { earth: true, dawn: 1, onlyEarth: true });
          const k = sseg(t, SPACE_T, 18); camSpace(t, cam.p); cam.l.copy(EARTH).add(V.set(0, lerp(350, 250, k), 0)); cam.fov = 46;
          astraSpace(T, V); F.astra.group.position.copy(V); F.astra.group.lookAt(A.copy(V).add(V2.set(1, 0.03, 0.18))); F.astra.group.rotateZ(-0.3); F.astra.update(T, { glow: 2.2, fins: 1.5, path: astraSpace, fogK: 0 });
          const pul = 0.5 + 0.5 * Math.sin((T - 88) * 5.2); A.copy(EARTH).add(V.set(1350, 3050, -900));
          F.star.visible = true; F.star.position.copy(A); F.star.scale.setScalar(26 + pul * 20 + sseg(t, 16.6, 17.8) * 20);
          F.rays(0.18 + pul * 0.14, A, [1, 0.9, 0.7]);
          F.stage.flash(1, 0.96, 0.85, Math.pow(1 - sseg(t, SPACE_T, 16.45), 1.3) * 1.0);
          F.stage.fx.uFade.value = sseg(t, 17.35, 17.95);
        }
        F.end(T);
      },
    };
  },
};
