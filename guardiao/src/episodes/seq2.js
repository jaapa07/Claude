import * as THREE from 'three';
import { pathFn } from '../camera/director.js';
import { seg, sseg, lerp, pulse, clamp } from '../timeline/util.js';
import { SPHERE, CITY } from '../environments/ocean.js';

// SEQUÊNCIA 2 — O oceano acima das nuvens (18–36 s). A câmera fica amarrada à baleia: todo o percurso é uma
// única trajetória contínua (voo → mergulho na esfera de água → cidade → portal).
const V = new THREE.Vector3(), K = new THREE.Vector3(), W = new THREE.Vector3(), D = new THREE.Vector3(), R = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const PORTAL = new THREE.Vector3(0, 66, 690);
export const whalePath2 = pathFn([[-1, 0, 95, -250], [0, 0, 95, -200], [4.0, 0, 105, -30], [6.2, 0, 72, 222], [9, 26, 48, 390], [12, -30, 52, 455], [14.5, -22, 62, 500], [16.6, 0, 66, 650], [18, 0, 66, 790], [19, 0, 66, 880]]);
const dirAt = (t, out) => { whalePath2(t + 0.15, out); return out.sub(whalePath2(t, A)).normalize(); };
function lumiPath(tt, out) { const t = tt - 18; dirAt(t, B); return whalePath2(t, out).addScaledVector(B, 53.5).add(V.set(Math.sin(tt * 1.3) * 0.8 + 0.5, 15.2 + Math.sin(tt * 2.1) * 0.25, Math.cos(tt * 1.1) * 0.5)); }

export default {
  build(F) {
    const cam = F.cam, kaito = F.kaito, O = F.ocean;
    F.portal.material.uniforms.uColA.value.setHex(0x9a5200); F.portal.material.uniforms.uColB.value.setHex(0xffd870);
    return {
      update(t, T) {
        F.begin(T);
        O.group.visible = true; O.fish.visible = true;
        whalePath2(t, W); dirAt(t, D); R.crossVectors(D, UP).normalize();
        // ---- Astra e Kaito
        F.astra.group.position.copy(W); F.astra.group.lookAt(V.copy(W).add(D)); F.astra.group.rotateZ(Math.sin(T * 0.5) * 0.05);
        F.astra.update(T, { glow: 1.3 + sseg(t, 14, 17) * 1.2, fins: 1.3, path: (tt, o) => whalePath2(tt - 18, o), fog: F.atmo.scene.fog, fogK: 0.5, speed: 1.1 });
        F.astra.backPoint(K, 0.7);
        F.show(kaito); kaito.place(K.x, K.y, K.z, 0); kaito.root.quaternion.copy(F.astra.group.quaternion); kaito.capeWind = 1;
        kaito.set('legL', -0.25, 0, 0.22, 1); kaito.set('legR', 0.2, 0, -0.22, 1); kaito.set('shinL', 0.3, 0, 0, 1); kaito.set('shinR', 0.35, 0, 0, 1); kaito.set('spine', 0.22, 0, 0, 1); kaito.set('armL', -0.3, 0, 0.5, 1); kaito.set('armR', -0.3, 0, -0.5, 1); kaito.body.position.y -= 0.06;
        kaito.look(Math.sin(T * 0.7) * 0.5, -0.2 + 0.25 * pulse(t, 9, 14, 0.6), 1); kaito.idle(T);
        kaito.face({ brow: -0.7, mouth: 0.3 + 0.25 * pulse(t, 9, 10.4, 0.3), smile: 0.6 * pulse(t, 1, 5, 0.6) });
        kaito.j.spine.rotation.z += Math.sin(T * 1.1) * 0.05;
        // ---- câmera amarrada à baleia
        const set = (p, l, fov) => { cam.p.copy(p); cam.l.copy(l); cam.fov = fov; };
        const kHead = V.copy(K).addScaledVector(UP, 1.3).clone();
        if (t < 4.2) {
          const k = sseg(t, 1.7, 3.9); A.copy(K).addScaledVector(R, 2.4).addScaledVector(UP, 1.0).addScaledVector(D, 4.6); B.copy(W).addScaledVector(R, 120).addScaledVector(UP, 85).addScaledVector(D, 190);
          set(A.lerp(B, k), V.copy(kHead).lerp(B.copy(W).addScaledVector(UP, -25).addScaledVector(D, 20), k), lerp(40, 54, k));
        } else if (t < 9) {
          const k = sseg(t, 6.4, 9); A.copy(W).addScaledVector(D, -lerp(210, 120, k)).addScaledVector(UP, lerp(62, 22, k)).addScaledVector(R, lerp(0, 90, k));
          set(A, V.copy(W).addScaledVector(D, lerp(140, 30, k)), lerp(52, 48, k));
        } else if (t < 10.2) { const k = seg(t, 9, 10.2); set(A.copy(K).addScaledVector(D, 3.4 - k * 0.5).addScaledVector(R, -1.5).addScaledVector(UP, 0.7), kHead, 34); }
        else if (t < 14) { const k = sseg(t, 10.2, 14); set(A.set(lerp(-190, -90, k), lerp(70, 40, k), lerp(330, 380, k)), V.set(0, 62, 590), lerp(52, 48, k)); }
        else { const k = sseg(t, 14, 18); set(A.copy(W).addScaledVector(D, -lerp(230, 150, k)).addScaledVector(UP, lerp(46, 20, k)).addScaledVector(R, lerp(30, 0, k)), V.copy(PORTAL).lerp(B.copy(W).addScaledVector(D, 200), sseg(t, 16.4, 17.5)), lerp(48, 56, k)); }
        cam.roll = Math.sin(T * 0.6) * 0.03 + pulse(t, 4.4, 6.6, 0.8) * 0.12;
        F.lumi.update(T, lumiPath, cam.p, { happy: 0.5 });
        // ---- atmosfera: céu aberto → dentro da esfera de água
        const inside = THREE.MathUtils.smoothstep(SPHERE.r - cam.p.distanceTo(SPHERE.c), -5, 25);
        F.atmo.apply('ocean', 'deep', inside, T, K);
        const city = sseg(t, 10.6, 13.6);
        O.update(T, F.atmo, W, city, cam.p);
        F.motes.u.uBox.value.set(60, 40, 60); F.motes.u.uSize.value = 0.25; F.motes.update(T, F.ahead(30), inside);
        F.rays(0.3 + inside * 0.25, inside > 0.5 ? V.copy(SPHERE.c).add(B.set(60, 500, 0)) : undefined, inside > 0.5 ? [0.5, 0.95, 1] : undefined);
        // entrada na esfera: anel de respingo e clarão quando a câmera atravessa a superfície
        const hit = t - 6.15; if (hit > 0 && hit < 2) { A.set(0, 74, SPHERE.c.z - 292); F.rings[1].position.copy(A); F.rings[1].lookAt(V.copy(A).add(B.set(0, 0.2, -1))); F.rings[1].scale.setScalar(240); F.rings[1].userData.set(hit / 2, T); F.wave(1, A, hit * 0.7, 0.04 * (1 - hit / 2)); }
        const cross = pulse(inside, 0.05, 0.95, 0.3); F.stage.flash(0.6, 0.95, 1, cross * 0.3 + Math.pow(1 - sseg(t, 0, 1.0), 1.5));
        F.stage.fx.uWarp.value = inside * 0.12 + cross * 0.5;
        // ---- o portal dourado e a dobra do oceano
        const open = sseg(t, 14, 15.6); F.portal.position.copy(PORTAL); F.portal.scale.setScalar(118); F.portal.rotation.set(0, Math.PI, 0); F.portal.userData.set(open, T);
        if (open > 0.05) F.rays(0.35 * open, PORTAL, [1, 0.85, 0.5]);
        const fold = sseg(t, 16.7, 18); F.stage.fx.uFold.value = fold;
        if (t > 16.2) F.stage.flash(1, 0.94, 0.78, Math.pow(sseg(t, 17.3, 18), 1.6));
        cam.shake = 0.2 + pulse(t, 5.8, 7.2, 0.3) * 0.9 + fold * 1.2;
        F.end(T);
      },
    };
  },
};
