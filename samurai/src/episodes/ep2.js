import * as THREE from 'three';
import { shot, newTimeline } from '../camera/director.js';
import { seg, sseg, lerp, makeTau, easeOut, pulse, TAU, clamp } from '../core/util.js';
import { SKY_END } from './ep1.js';

// Estado no último frame — o episódio 3 começa exatamente daqui.
export const MOUNT_END = { cam: { p: [1.6, 2.6, 30.5], l: [0, 70, -330], fov: 44 }, dissolve: 0.42, akio: [0, 27], yuna: [0.9, 28.4] };

const V = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
const WX = [-3, -1.2, 0.7, 2.5, -2.1, 1.6], WZ = [19.6, 21.2, 22.7, 20.4, 24.0, 25.2];

export default {
  id: 2, title: 'O PREÇO DO PODER',
  build(P) {
    const tl = newTimeline(), cam = P.cam, akio = P.akio, yuna = P.yuna;
    const tau = makeTau([[0, 0], [1.1, 0], [1.5, 1], [6.75, 1], [7.0, 0.03], [10.0, 0.03], [10.3, 1], [20, 1]]);
    shot(tl, cam, 0, 1.6, SKY_END.cam, { p: [0.7, 1.6, 19.6], l: [0, 160, -330], fov: 50 }, 'sine.in');
    shot(tl, cam, 1.6, 3.4, { p: [9, 15, 38], l: [0, 110, -200], fov: 52 }, { p: [5.5, 8, 29], l: [0, 1.5, 13], fov: 48 }, 'power2.inOut');
    shot(tl, cam, 3.4, 5, { p: [-2.1, 0.8, 13.0], l: [0, 1.5, 16.2], fov: 44 }, { p: [-1.3, 1.25, 13.7], l: [0, 1.45, 16.4], fov: 40 }, 'sine.out');
    shot(tl, cam, 5, 6.95, { p: [1.1, 1.1, 13.3], l: [0, 1.7, 24], fov: 46 }, { p: [0.6, 1.35, 14.3], l: [0, 1.6, 22], fov: 42 }, 'sine.inOut');
    shot(tl, cam, 6.95, 8.6, { p: [4.8, 1.5, 18.2], l: [0.4, 1.3, 18.2], fov: 42 }, { p: [3.4, 1.45, 22.4], l: [0, 1.3, 22.2], fov: 40 }, 'sine.inOut');
    shot(tl, cam, 8.6, 10, { p: [-3.6, 1.0, 24.6], l: [0.2, 1.3, 22.6], fov: 44 }, { p: [-2.3, 1.4, 28.6], l: [0.2, 1.4, 26.4], fov: 40 }, 'sine.inOut');
    shot(tl, cam, 10, 11.4, { p: [1.9, 1.15, 30.6], l: [0, 1.25, 26.4], fov: 40 }, { p: [1.2, 1.4, 29.7], l: [0, 1.3, 26.6], fov: 37 }, 'sine.out');
    shot(tl, cam, 11.4, 15, { p: [4.4, 1.9, 24.8], l: [10.5, 3.2, 14], fov: 50 }, { p: [5.0, 2.5, 23.6], l: [10.5, 3.0, 14], fov: 46 }, 'sine.inOut');
    shot(tl, cam, 15, 16.6, { p: [-2.4, 1.6, 25.6], l: [0.9, 1.4, 28.4], fov: 40 }, { p: [-2.1, 1.6, 26.0], l: [0.9, 1.4, 28.4], fov: 37 }, 'sine.out');
    shot(tl, cam, 16.6, 18.1, { p: [2.3, 1.5, 26.7], l: [0.9, 1.4, 28.4], fov: 31 }, { p: [2.0, 1.5, 26.9], l: [0.9, 1.4, 28.4], fov: 28 }, 'none');
    shot(tl, cam, 18.1, 20, { p: [2.6, 1.7, 31.8], l: [0, 40, -150], fov: 50 }, MOUNT_END.cam, 'power2.out');
    const clockTurns = (t) => SKY_END.turns - (1 - Math.pow(1 - seg(t, 0, 1.2), 2)) * 0.9;

    return {
      update(t) {
        P.begin(t); tl.time(t);
        const w = tau(t), frozen = t < 1.6 ? 1 - sseg(t, 1.15, 1.6) : sseg(t, 6.85, 7.1) * (1 - sseg(t, 10.0, 10.3));
        P.village.group.visible = true; P.village.setChasm(1);
        const dusk = sseg(t, 10.2, 15.5);
        P.atmo.apply('storm', 'dusk', dusk, w, V.set(0, 0, 20));
        P.village.update(w, P.atmo.scene.fog.color, 0.4);
        P.petals.update(w, P.ahead(9), 1, P.atmo.sun.color);
        P.rain.update(w, t, P.ahead(7), 1 - sseg(t, 10.4, 13), frozen);
        P.motes.update(w, P.ahead(6), 0.8);
        P.birds.group.visible = true; P.birds.update(w, V.set(0, 6, 30), 2.2);
        P.rays(0.3 + dusk * 0.5);
        P.stage.fx.uFreeze.value = frozen * 0.88;

        // ---- relógio: os ponteiros travam, se partem e caem sobre a vila
        const turns = clockTurns(t), jam = t >= 1.2;
        P.skyClock.group.scale.setScalar(150);
        P.skyClock.set(turns, 0.8 * (1 - sseg(t, 1.6, 4.2)), t);
        P.skyClock.mat.uniforms.uCrack.value = sseg(t, 0.9, 1.3);
        P.skyClock.hour.visible = P.skyClock.minute.visible = !jam;
        if (jam && t < 11.2) {
          P.skyClock.group.updateMatrixWorld();
          const am = -clockTurns(1.2) * TAU, ah = am / 12 - 1.1, mw = P.skyClock.group.matrixWorld, fade = 1 - sseg(t, 10.2, 11.1);
          P.shards.update((i, s, d) => {
            const minute = s[0] < 0.62, ang = (minute ? am : ah) + Math.PI / 2, len = (minute ? 0.8 : 0.5) * (s[1] * 1.08 - 0.08), wdt = (s[2] - 0.5) * 0.09;
            A.set(Math.cos(ang) * len - Math.sin(ang) * wdt, Math.sin(ang) * len + Math.cos(ang) * wdt, 0.02).applyMatrix4(mw);
            const near = i < 46, r = near ? 1.4 + s[3] * 3.4 : 4 + s[3] * 34, a = s[4] * TAU;
            B.set(near ? Math.sin(a) * r : Math.sin(a) * r * 0.9, 0.22, near ? 16.2 + Math.cos(a) * r : 22 + Math.cos(a) * r);
            const T = near ? 2.2 + s[5] * 1.5 : 1.3 + s[5] * 2.6, k = clamp((t - 1.2 - s[6] * 0.25) / T), kk = Math.pow(k, 1.9);
            d.position.lerpVectors(A, B, kk);
            d.position.x += Math.sin(k * Math.PI) * (s[7] - 0.5) * 60 * (1 - k); d.position.y += Math.sin(k * Math.PI) * 14 * (1 - k);
            const spin = (1 - k) * 14 + s[3] * 6;
            if (k < 1) d.rotation.set(spin * (s[4] + 0.3), spin * s[5], spin * s[6]); else d.rotation.set((s[4] - 0.5) * 0.9, s[5] * TAU, (s[6] - 0.5) * 0.9 + Math.PI);
            d.scale.setScalar(lerp(4.5, near ? 0.13 : 0.2, Math.pow(k, 0.5)) * (0.6 + s[7] * 0.8) * fade);
          });
          P.blue[2].set(A.set(0, 300, -400), t - 1.2, [70, 70, 10]);
        }
        P.stage.flash(0.8, 0.92, 1, pulse(t, 1.17, 1.5, 0.08) * 0.5 + pulse(t, 6.88, 7.15, 0.07) * 0.4 + pulse(t, 9.98, 10.3, 0.08) * 0.4);
        cam.shake = pulse(t, 1.2, 5.2, 0.4) * 0.9 + pulse(t, 5, 6.9, 0.3) * 0.5 + (t > 17.8 ? 0.6 : 0);
        P.dust[0].set(V.set(0.5, 0.3, 16.5), t - 3.7, [3.5, 0.3, 3.5]); P.dust[1].set(V.set(0, 0.3, 21), t - 4.4, [6, 0.3, 6]);

        // ---- Akio
        P.show(akio);
        const walk = seg(t, 7.2, 9.8), az = lerp(SKY_END.akioZ, 27, walk), ax = Math.sin(walk * Math.PI * 2) * 1.5;
        let ry = Math.PI;
        ry = lerp(ry, 0, sseg(t, 4.5, 5.1)); ry = lerp(ry, 2.46, sseg(t, 11.6, 12.4)); ry = lerp(ry, 0.3, sseg(t, 15.1, 15.8)); ry = lerp(ry, Math.PI - 0.15, sseg(t, 17.7, 18.5));
        if (t >= 7.2 && t < 9.8) ry = Math.cos(walk * Math.PI * 2) * 0.45;
        akio.place(ax, 0, az, ry).idle(t);
        akio.katana.userData.setGlow(1.2 + frozen * 1.2 + 0.3 * Math.sin(t * 5));
        if (t < 3.4) { akio.look(0, -0.55, 1); akio.face({ brow: -0.6, mouth: 0.4 }); }
        else if (t < 5) { akio.block(sseg(t, 3.3, 3.7) * (1 - sseg(t, 4.5, 5))); akio.kneel(pulse(t, 3.5, 4.6, 0.3) * 0.35); akio.face({ brow: 0.6, mouth: 0.3 }); }
        else if (t < 7.2) {
          const up = easeOut(seg(t, 6.35, 6.9)); akio.guard(1 - up);
          akio.set('armR', -2.65, 0, -0.25, up); akio.set('foreR', -0.2, 0, 0, up); akio.set('handR', 1.3, 0, 0, up);
          akio.face({ brow: 0.9, mouth: 0.2 + 0.5 * up });
        } else if (t < 9.8) {                                             // atravessa o campo congelado, cortando
          akio.walk(walk * 5.2, 0.8, 0.25);
          for (const [i, ts] of [[0, 7.7], [1, 8.5], [2, 9.2]]) {
            const k = seg(t, ts, ts + 0.55); if (k > 0 && k < 1) akio.sweep(0.3 + k * 0.7, Math.sin(k * Math.PI));
            const arc = P.arcs[i]; arc.position.set(ax, 1.25, az + 0.2); arc.rotation.set(-Math.PI / 2, 0, 0.6 + i * 2.1 - ry); arc.scale.setScalar(1.35); arc.userData.set(seg(t, ts + 0.12, ts + 0.6), t);
          }
          akio.face({ brow: 0.9, mouth: 0.1 });
        } else if (t < 11.6) { akio.set('spine', 0.18, 0, 0, pulse(t, 10.2, 11.6, 0.4)); akio.face({ brow: 0.1, mouth: 0.3 * pulse(t, 10.3, 11.3, 0.3) }); }
        else if (t < 15.1) { akio.look(0, -0.1, 1); akio.reach(pulse(t, 12.6, 14.6, 0.5) * 0.5, 'L'); akio.face({ brow: -0.9, mouth: 0.55 * sseg(t, 12.2, 12.8) }); }
        else { akio.face({ brow: -0.6 - 0.3 * sseg(t, 18.2, 19), mouth: 0.25 + 0.3 * sseg(t, 18.4, 19) }); akio.look(0, -0.25 * sseg(t, 18.2, 19), 1); }
        if (t >= 6.9 && t < 7.6) { V.set(0, 1.6, SKY_END.akioZ); P.wave(1, V, seg(t, 6.9, 7.6) * 1.3, 0.05 * (1 - seg(t, 6.9, 7.6)));
          P.rings[0].position.set(0, 0.15, SKY_END.akioZ); P.rings[0].rotation.set(-Math.PI / 2, 0, 0); P.rings[0].scale.setScalar(26); P.rings[0].userData.set(seg(t, 6.9, 8.0), t); }

        // ---- guerreiros mascarados
        if (t >= 4.8 && t < 15) {
          P.warriors.forEach((wr, i) => {
            wr.root.visible = true;
            const run = seg(t, 5 + i * 0.05, 6.95), z0 = 41 + i * 1.6, z = lerp(z0, WZ[i], run), leap = sseg(run, 0.82, 1);
            const fall = sseg(t, 10.12 + i * 0.07, 10.85 + i * 0.07);
            wr.place(WX[i] * lerp(1.6, 1, run), Math.sin(leap * Math.PI * 0.6) * 0.45 * (1 - fall), z, Math.PI + (i % 2 ? 0.2 : -0.2) * leap);
            wr.walk((z0 - z) * 0.42 + i * 0.3, 1 - leap, 1); wr.slash(0.34 + 0.12 * (i % 3) / 2 + w * 0.02, leap);
            wr.root.rotation.x = -fall * 1.5; wr.root.position.y += fall * 0.18; wr.root.position.z += fall * 0.9;
            if (fall > 0) { wr.set('armR', -0.3, 0, -1.2, fall); wr.set('armL', -0.2, 0, 1.2, fall); wr.set('legL', -0.3, 0, 0.3, fall); wr.set('shinR', 0.6, 0, 0, fall); }
            wr.katana.userData.setGlow(0);
          });
          if (t > 10) P.dust[0].set(V.set(0, 0.3, 23.5), t - 10.5, [3.5, 0.3, 4]);
          P.blue[0].set(V.set(0, 1.2, 22), t - 10.02, [3, 1, 4]);
        }

        // ---- a casa desaparece
        const van = sseg(t, 11.9, 13.8);
        P.village.vanishDis.uDissolve.value = van * 1.05; P.village.vanishHouse.visible = van < 0.995;
        P.blue[1].u.uDirBias.value.set(0, 1.4, 0); P.blue[1].u.uGain.value = 0.35; P.blue[1].set(V.set(10.5, 3, 14), t - 12.0, [4.5, 3, 4.5]);
        P.gold[0].set(V.set(10.5, 2.5, 14), t - 12.6, [4.5, 3, 4.5]);
        if (t > 11.9 && t < 14) P.wave(2, V.set(10.5, 3, 14), seg(t, 12.2, 14) * 0.9, 0.018 * pulse(t, 12.2, 14, 0.4));

        // ---- Yuna
        if (t >= 14.9) {
          P.show(yuna);
          const run = seg(t, 15, 16.45), yz = lerp(45, MOUNT_END.yuna[1], easeOut(run) * 0.35 + run * 0.65), stop = sseg(run, 0.85, 1);
          yuna.place(lerp(1.8, MOUNT_END.yuna[0], run), 0, yz, Math.PI + 0.1).walk((45 - yz) * 0.45, 1 - stop, 1).idle(t);
          const pt = sseg(t, 16.7, 17.3);
          yuna.point(pt, 'L', 0.12); yuna.set('armR', -0.5, 0, -0.5, pt * 0.6);
          if (t >= 15.5 && t <= 19.05) yuna.talk(t);
          yuna.face({ brow: 0.75, mouth: 0.1 }); yuna.look(-0.12, 0, 1);
        }

        // ---- a montanha começa a se desfazer
        const md = sseg(t, 17.5, 20) * MOUNT_END.dissolve;
        P.village.bigDis.uDissolve.value = md;
        P.big.set(V.set(0, 95, -330), t - 17.7, [95, 95, 60]);
        P.stage.fx.uWarp.value = pulse(t, 11.9, 14, 0.5) * 0.25 + sseg(t, 18.2, 20) * 0.3;
        P.end(t);
        return t < 1.2 ? 0.05 - t * 0.6 : (t - 1.2) / 20 + (frozen > 0.5 ? -(t - 7) * 0.2 : 0);
      },
    };
  },
};
