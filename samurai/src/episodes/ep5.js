import * as THREE from 'three';
import { shot, newTimeline } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, pulse, TAU, clamp } from '../core/util.js';
import { HUG } from './ep4.js';

const V = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
const GOLD = new THREE.Color(0xffc45a), GOLD2 = new THREE.Color(0xfff0b0), SKYCLOCK = new THREE.Vector3(0, 300, -400);

export default {
  id: 5, title: 'UM NOVO AMANHECER',
  build(P) {
    const tl = newTimeline(), cam = P.cam, akio = P.akio, yuna = P.yuna, lord = P.lord;
    shot(tl, cam, 0, 2.4, { p: [2.3, 1.9, 1.7], l: [0, 1.6, -0.9], fov: 40 }, { p: [1.6, 1.85, 1.0], l: [0, 1.65, -0.9], fov: 37 }, 'sine.out');
    shot(tl, cam, 2.4, 5, { p: [0.6, 1.95, 0.4], l: [0, 2.0, -1.4], fov: 34 }, { p: [0.45, 2.4, 1.2], l: [0, 2.9, -1.4], fov: 42 }, 'sine.inOut');
    shot(tl, cam, 5, 6.2, { p: [0.9, 0.6, -3.4], l: [0, 1.8, -0.5], fov: 48 }, { p: [0.5, 1.0, -2.7], l: [0, 1.5, -0.5], fov: 44 }, 'sine.inOut');
    shot(tl, cam, 6.2, 7.2, { p: [0.2, 8, 1.2], l: [0, 0, -0.9], fov: 50 }, { p: [0.2, 19, 2.5], l: [0, 0, -0.9], fov: 52 }, 'power2.out');
    shot(tl, cam, 7.2, 8.7, { p: [-14, 22, 64], l: [0, 46, -200], fov: 52 }, { p: [-7, 16, 48], l: [0, 60, -300], fov: 48 }, 'sine.inOut');
    shot(tl, cam, 8.7, 10, { p: [4.4, 1.9, 24.8], l: [10.5, 3.2, 14], fov: 50 }, { p: [5.0, 2.5, 23.6], l: [10.5, 3.0, 14], fov: 46 }, 'sine.out');
    shot(tl, cam, 10, 12.2, { p: [0.6, 0.55, 33.6], l: [2.5, 0.75, 30], fov: 56 }, { p: [1.8, 0.8, 34.0], l: [2.5, 0.7, 30], fov: 52 }, 'sine.inOut');
    shot(tl, cam, 12.2, 15, { p: [-3.6, 1.5, 26.6], l: [-0.3, 1.35, 24.4], fov: 40 }, { p: [2.6, 1.6, 26.6], l: [-0.3, 1.4, 24.4], fov: 36 }, 'sine.inOut');
    shot(tl, cam, 15, 17.4, { p: [0.7, 1.8, 28.0], l: [0, 30, -150], fov: 48 }, { p: [0.1, 3.0, 29.6], l: [0, 80, -330], fov: 46 }, 'sine.inOut');
    shot(tl, cam, 17.4, 18.5, { p: [-0.5, 1.5, 22.5], l: [0.1, 1.42, 24.4], fov: 32 }, { p: [-0.35, 1.5, 22.7], l: [0.1, 1.42, 24.4], fov: 30 }, 'none');
    shot(tl, cam, 18.5, 20, { p: [-0.1, 0.95, 26.0], l: [-0.17, 0.98, 24.4], fov: 36 }, { p: [-0.15, 1.0, 26.5], l: [-0.17, 1.06, 24.4], fov: 36 }, 'sine.inOut');

    return {
      update(t) {
        P.begin(t); tl.time(t);
        if (t < 7.2) {
          // ================= arena: a luz se dissipa; o futuro se desfaz em pétalas; a katana é quebrada
          P.arena.group.visible = true; P.fill.intensity = 0.8;
          P.atmo.apply('blue', 'dawn', sseg(t, 0, 3.5) * 0.8, t, V.set(0, 0, 0));
          P.arena.update(t, t * 0.03, 0.5, 1);
          P.motes.update(t, P.ahead(6), 1);
          P.rays(0.6 * (1 - sseg(t, 2, 6)) + 0.25);
          P.stage.flash(0.62, 0.85, 1, Math.pow(1 - sseg(t, 0, 1.9), 1.4) + pulse(t, 6.17, 6.5, 0.06) * 0.55);
          const fadeRing = 1 - sseg(t, 2.5, 5);
          for (const [sh, n] of [[P.shards, 0], [P.shards2, 1]]) sh.update((i, s, d) => {
            const ra = s[6] * TAU + (19.4 + t) * (0.35 + n * 0.2) * (n ? -1 : 1), rr = 17 + s[7] * 5 + n * 3;
            d.position.set(Math.sin(ra) * rr, 1.5 + s[2] * 9 + t * s[4] * 3, Math.cos(ra) * rr); d.rotation.set(s[5] * 6, s[6] * 6 + ra, s[7] * 6); d.scale.setScalar(0.22 * (0.5 + s[1]) * fadeRing);
          }, fadeRing > 0.01 && t < 6.15);
          P.show(akio);
          const part = sseg(t, 1.3, 2.4), dis = sseg(t, 2.7, 4.9);
          akio.place(0, 0, lerp(HUG.akioZ, -0.25, part), Math.PI).idle(t);
          if (t < 5) {
            akio.hug(1 - part); akio.katana.visible = false;
            akio.face({ brow: -0.5, smile: 0.3, blink: (1 - part) * 0.9, mouth: 0.15 * dis }); akio.look(0, -0.25 * dis, 1);
            if (dis < 1) {
              P.show(lord); lord.place(0, 0, HUG.lordZ, 0).idle(t); lord.breakMask(1);
              lord.hug((1 - part) * 0.75); lord.set('armR', -0.9, 0, 0.35, part * (1 - dis * 0.5)); lord.set('foreR', -0.9, 0, 0, part * (1 - dis * 0.5));
              lord.face({ brow: -0.4, smile: sseg(t, 1.2, 2.2), blink: 0.25 * dis }); lord.set('head', 0.12 * (1 - part), 0, 0, 1);
              lord.dissolve(dis * 1.05); lord.katana.visible = dis < 0.3; lord.katana.userData.setGlow(0.2);
            }
            // pétalas douradas sobem do lugar onde ele estava
            P.petals.u.uColA.value.copy(GOLD); P.petals.u.uColB.value.copy(GOLD2); P.petals.u.uGlow.value = 0.15; P.petals.u.uFall.value = -1.1; P.petals.u.uBox.value.set(5, 9, 5);
            P.petals.update(t, V.set(0, 4.2, HUG.lordZ), sseg(t, 2.8, 3.6) * (1 - sseg(t, 6, 7)), P.atmo.sun.color);
            for (let i = 0; i < 3; i++) { P.gold[i].u.uStagger.value = 1.6; P.gold[i].u.uDirBias.value.set(0, 1.2, 0); P.gold[i].set(V.set(0, 0.6 + i * 0.6, HUG.lordZ), t - 2.75 - i * 0.25, [0.35, 0.4, 0.3]); }
          } else {
            const up = easeOut(seg(t, 5.05, 5.75)), down = seg(t, 5.95, 6.25);                 // ergue a espada e a crava no mostrador
            akio.set('armR', -2.75, 0, -0.2, up); akio.set('foreR', -0.25, 0, 0, up); akio.set('handR', 1.3, 0, 0, up); akio.set('armL', -2.6, 0, 0.25, up); akio.set('foreL', -0.4, 0, 0, up); akio.set('spine', -0.15, 0, 0, up);
            if (down > 0) { akio.set('armR', -0.75, 0, 0, down); akio.set('handR', -1.1, 0, 0, down); akio.set('armL', -0.8, 0, 0.1, down); akio.set('spine', 0.5, 0, 0, down); akio.kneel(down * 0.75); }
            akio.face({ brow: 0.7, mouth: 0.3 + 0.5 * down }); akio.katana.visible = t < 6.2; akio.katana.userData.setGlow(2 + up * 2);
            const age = t - 6.2; V.set(0, 0.3, -1.0);
            if (age >= 0) {
              P.shards.update((i, s, d) => { if (i > 90) { d.scale.setScalar(0); return; } const a = s[0] * TAU, sp = 2 + s[1] * 7, tr = (1 - Math.exp(-age * 1.6)) / 1.6;
                d.position.set(Math.cos(a) * sp * tr, 0.4 + (3 + s[2] * 6) * tr - 4.9 * age * age * 0.5, -1.0 + Math.sin(a) * sp * tr); d.rotation.set(age * 9 * s[3], age * 7 * s[4], age * 8 * s[5]); d.scale.setScalar(0.06 + s[6] * 0.07); });
              P.blue[0].set(V, age, [0.1, 0.4, 0.1]); P.gold[0].set(V, age - 0.1, [0.3, 0.3, 0.3]);
              [0, 0.8, 1.6].forEach((dl, i) => { const k = clamp((age - dl) / 1.6); const r = P.rings[i]; r.position.set(0, 0.06 + i * 0.01, -1.0); r.rotation.set(-Math.PI / 2, 0, 0); r.scale.setScalar(34); r.userData.set(k, t); });
              P.wave(1, V, age * 1.3, 0.07 * Math.max(0, 1 - age));
            }
            cam.shake = pulse(t, 6.2, 7.2, 0.1) * 1.6;
          }
          P.stage.fx.uWarp.value = 0.2 * (1 - sseg(t, 0, 3)) + pulse(t, 6.2, 7.2, 0.2) * 0.4;
        } else {
          // ================= a vila: o mundo se reconstrói e volta à vida
          P.village.group.visible = true;
          const day = sseg(t, 15.2, 18);
          if (t < 10) P.atmo.apply('void', 'sunrise', sseg(t, 7.2, 9.6), t, V.set(0, 0, 25)); else P.atmo.apply('sunrise', 'morning', day, t, V.set(0, 0, 26));
          P.atmo.u.uSunSize.value = 1.6;
          const heal = sseg(t, 7.5, 9.6);
          P.village.setChasm(1 - sseg(t, 7.4, 9.2)); P.village.update(t, P.atmo.scene.fog.color, (1 - heal) * 0.5);
          P.village.bigDis.uDissolve.value = (1 - heal) * 1.05;
          const house = sseg(t, 8.4, 9.9); P.village.vanishDis.uDissolve.value = (1 - house) * 1.05; P.village.vanishHouse.visible = house > 0.01;
          if (t < 10) {
            P.discs.update((i, s, d) => {                                 // os relógios voltam para dentro da montanha
              const h = Math.pow(s[0], 1.4) * 190, r = (1 - h / 215) * 135 * Math.sqrt(s[1]), a = s[2] * TAU, age = lerp(4.5, 0, sseg(t, 7.2, 9.3 + s[3] * 0.4)), tr = (1 - Math.exp(-age * 0.45)) / 0.45;
              d.position.set(Math.cos(a) * r + Math.cos(a) * tr * (6 + s[5] * 22), h + (s[6] - 0.3) * tr * 16, -330 + Math.sin(a) * r + Math.sin(a) * tr * 14 + tr * s[7] * 16);
              d.rotation.set(s[5] * 6 + t * 2 * (s[6] - 0.5), s[6] * 6 + t * 1.4, s[7] * 3); d.scale.setScalar((1.5 + s[7] * 4) * Math.min(1, age * 1.2));
            });
            [7.3, 8.0, 8.7].forEach((ts, i) => { const k = clamp((t - ts) / 2.2), r = P.rings[i]; r.position.set(0, 0.5 + i * 0.3, 40); r.rotation.set(-Math.PI / 2, 0, 0); r.scale.setScalar(520); r.userData.set(k, t);
              if (k > 0 && k < 1 && i < 2) P.wave(1 + i, V.set(0, 30, -100), k * 1.4, 0.03 * (1 - k)); });
            P.big.u.uCol.value.setHex(0xffd890); P.big.set(V.set(0, 95, -330), 3.2 - (t - 7.2), [95, 95, 60]);
            P.gold[1].u.uGain.value = 0.8; P.gold[1].set(V.set(10.5, 3, 14), t - 8.5, [4.5, 3, 4.5]);
            P.stage.flash(1, 0.95, 0.85, pulse(t, 7.15, 7.6, 0.1) * 0.5);
          }
          P.petals.update(t, P.ahead(9), 1, P.atmo.sun.color); P.motes.update(t, P.ahead(6), 1);
          P.birds.group.visible = true; P.birds.update(t * 1.2, V.set(0, 7, 28), 2);
          P.rays(0.15 + day * 0.2); if (t >= 15 && t < 17.4) P.stage.bloom.strength = 0.3;
          // relógio do céu se desfaz em ouro
          const fadeClock = sseg(t, 15.4, 17.3);
          if (t >= 12) { P.skyClock.set(0.3 + t * 0.01, 0.55 * sseg(t, 12, 14.5) * (1 - fadeClock), t); P.skyClock.group.scale.setScalar(130);
            if (t > 15.4) { P.big.u.uCol.value.setHex(0xffd27a); P.big.set(SKYCLOCK, t - 15.4, [110, 110, 10]); } }
          // crianças brincando
          if (t >= 9.9) P.children.forEach((c, i) => {
            c.root.visible = true; const a = t * 1.25 + i * 1.57, R = 1.7 + (i % 2) * 0.5;
            c.place(2.5 + Math.sin(a) * R, 0, 30 + Math.cos(a) * R, a + Math.PI / 2).walk(t * 2.6 + i * 0.4, 1, 0.75); c.face({ smile: 1, mouth: 0.5 + 0.3 * Math.sin(t * 6 + i) });
            c.set('armL', -2.4, 0, 0.5, i % 2 ? 0.8 : 0); c.set('armR', -2.4, 0, -0.5, i % 2 ? 0 : 0.6);
          });
          // Akio e Yuna
          if (t >= 10) {
            P.show(akio, yuna); akio.katana.visible = false; yuna.bow.visible = false;
            const hug = sseg(t, 13.1, 13.8) * (1 - sseg(t, 14.7, 15.4)), turn = sseg(t, 14.9, 15.7), run = seg(t, 12.2, 13.2);
            akio.place(-0.6 + 0.0 * turn, 0, 24.4 - 0.35 * (1 - turn), lerp(0, Math.PI, turn)).idle(t);
            const yz = lerp(36.5, 25.1, easeOut(run)); yuna.place(lerp(1.0, -0.3, run) + 0.55 * turn, 0, lerp(yz, 24.4, turn), lerp(Math.PI, Math.PI, turn)).idle(t);
            if (run < 1) yuna.walk(run * 6, 1 - sseg(run, 0.85, 1), 1);
            akio.hug(hug); yuna.hug(hug);
            const hold = sseg(t, 17.6, 18.6);
            akio.set('armR', 0.05, 0, -0.42, hold); akio.set('foreR', -0.1, 0, 0, hold); yuna.set('armL', 0.05, 0, 0.46, hold); yuna.set('foreL', -0.1, 0, 0, hold);
            akio.look(0.25 * hold - 0.0, -0.4 * turn * (1 - hold * 0.6), 1); yuna.look(-0.5 * hold, -0.3 * turn * (1 - hold), 1);
            akio.face({ brow: -0.3, smile: 0.5 + 0.5 * hug, blink: hug * 0.9 }); yuna.face({ brow: -0.3, smile: 0.9, blink: hug * 0.9 });
            if (t >= 17.3 && t <= 19.45) yuna.talk(t, 0.8);
          }
          P.stage.fx.uSat.value = 1.08 + 0.1 * day;
          P.stage.fx.uFade.value = sseg(t, 19.75, 20) * 0.25;
        }
        P.end(t);
        return t / 20;
      },
    };
  },
};
