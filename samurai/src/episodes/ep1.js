import * as THREE from 'three';
import { shot, newTimeline, key } from '../camera/director.js';
import { seg, sseg, lerp, makeTau, easeOut, pulse, TAU, clamp } from '../core/util.js';

// Enquadramento e estado do relógio no último frame — o episódio 2 começa exatamente daqui.
export const SKY_END = { cam: { p: [0.7, 1.5, 19.4], l: [0, 150, -330], fov: 54 }, turns: -2.3, akioZ: 16.2 };

const V = new THREE.Vector3(), COOL = new THREE.Color(0.6, 0.8, 1.2);

export default {
  id: 1, title: 'A ESPADA PROIBIDA',
  build(P) {
    const tl = newTimeline(), cam = P.cam, s = { orbit: 0 };
    const tau = makeTau([[0, 1], [11.45, 1], [11.9, 0], [20, 0]]);          // o tempo do mundo para aos 11,9 s
    // ---- câmera
    shot(tl, cam, 0, 4, { p: [9, 8.2, 104], l: [0, 7, 60], fov: 50 }, { p: [-2.5, 13, 44], l: [0, 78, -300], fov: 46 }, 'power2.inOut');
    shot(tl, cam, 4, 5.8, { p: [1.9, 1.2, 3.9], l: [0, 1.25, 7.4], fov: 40 }, { p: [-1.3, 1.5, 4.5], l: [0, 1.3, 7.4], fov: 37 }, 'sine.out');
    shot(tl, cam, 5.8, 8, { p: [2.8, 3.0, 13.2], l: [0, 0.6, 2], fov: 46 }, { p: [0.4, 9.5, 7.2], l: [0, -9, -0.5], fov: 50 }, 'power2.inOut');
    shot(tl, cam, 8, 9.6, { p: [-1.5, 0.8, 9.2], l: [0.3, 3.0, 0], fov: 52 }, { p: [-1.9, 1.4, 6.0], l: [0.2, 2.6, 0], fov: 50 }, 'sine.out');
    shot(tl, cam, 9.6, 11.25, { p: [1.7, 2.5, -1.9], l: [0, 2.25, 0.8], fov: 38 }, { p: [1.2, 2.45, -1.2], l: [0, 2.25, 0.8], fov: 34 }, 'sine.inOut');
    key(tl, s, 'orbit', 11.25, 13, 0, 1, 'power1.inOut');
    shot(tl, cam, 13, 14.9, { p: [-3.3, 1.15, 19.6], l: [0, 1.35, 20.6], fov: 42 }, { p: [-2.5, 1.5, 15.7], l: [0, 1.4, 17.3], fov: 40 }, 'none');
    shot(tl, cam, 14.9, 17, { p: [1.7, 1.75, 13.8], l: [-0.25, 1.75, 15.8], fov: 36 }, { p: [1.15, 1.85, 14.3], l: [-0.3, 1.78, 15.8], fov: 33 }, 'sine.out');
    shot(tl, cam, 17, 20, { p: [1.3, 1.0, 18.9], l: [0, 6, 5], fov: 48 }, SKY_END.cam, 'power2.inOut');

    const akio = P.akio, heroBird = new THREE.Vector3(-0.55, 1.88, 15.25);
    return {
      update(t) {
        P.begin(t); tl.time(t);
        const w = tau(t), frozen = sseg(t, 11.5, 12.0), inTemple = t >= 8 && t < 13;
        const storm = sseg(t, 5.6, 8.2) * 0.85;
        P.show(akio);
        // ================= 0–8 s e 13–20 s: vila
        if (!inTemple) {
          P.village.group.visible = true;
          P.atmo.apply('dawn', 'storm', t < 13 ? storm : 0.85, w, V.set(0, 0, cam.l.z > 30 ? 40 : 10));
          const chasm = t < 13 ? sseg(t, 5.9, 7.6) : 1;
          P.village.setChasm(chasm);
          P.village.update(w, P.atmo.scene.fog.color, t < 13 ? sseg(t, 6.5, 7.6) : 0.55);
          P.petals.update(w, P.ahead(9), 1, P.atmo.sun.color);
          P.rain.update(w, t, P.ahead(7), t < 13 ? sseg(t, 6.6, 8) * 0.7 : 1, frozen);
          P.motes.update(w, P.ahead(6), t < 13 ? 0.5 : 1);
          P.rays(lerp(0.9, 0.25, storm) * (t < 13 ? 1 : 0.6));
          // relógio no céu: translúcido no início, pleno e girando para trás no fim
          const op = t < 8 ? sseg(t, 1.2, 3.2) * 0.5 : sseg(t, 16.6, 18.2) * 0.8;
          const turns = t < 8 ? 0.34 + t * 0.012 : lerp(0.39, SKY_END.turns, Math.pow(seg(t, 17.2, 20), 2));
          P.skyClock.set(turns, op, t); P.skyClock.group.scale.setScalar(t < 8 ? 105 : lerp(120, 150, sseg(t, 17, 20)));
        }
        if (t < 4) {                                                    // voo sobre os telhados
          akio.place(0, 0, 7.4, Math.PI).guard(1).idle(t);
          akio.katana.userData.setGlow(0);
          P.birds.group.visible = true; P.birds.update(w, V.set(4, 9, 48), 1.6);
        } else if (t < 8) {                                             // treino + tremor + o chão se abre
          akio.katana.userData.setGlow(0);
          const k1 = seg(t, 4.0, 4.95), k2 = seg(t, 4.95, 5.8), back = sseg(t, 5.8, 6.6);
          akio.place(0, 0, 7.4 + back * 1.5, Math.PI);
          if (t < 4.95) akio.slash(k1); else if (t < 5.8) akio.sweep(k2); else { akio.guard(1).look(0, 0.35, back); akio.j.spine.rotation.x -= 0.2 * back; }
          akio.face({ brow: t < 5.8 ? 0.8 : -0.7, mouth: t < 5.8 ? 0.15 + 0.5 * pulse(t, 4.3, 4.7, 0.1) + 0.5 * pulse(t, 5.25, 5.6, 0.1) : 0.45 });
          P.arcs[0].position.set(0, 1.35, 7.0); P.arcs[0].rotation.set(0, -Math.PI / 2, 0); P.arcs[0].userData.set(seg(k1, 0.36, 0.8), t);
          P.arcs[1].position.set(0, 1.3, 7.2); P.arcs[1].rotation.set(-Math.PI / 2, 0, 2.2); P.arcs[1].scale.setScalar(1.15); P.arcs[1].userData.set(seg(k2, 0.36, 0.8), t);
          cam.shake = pulse(t, 5.55, 8.0, 0.35) * 1.8;
          P.dust[0].set(V.set(0, 0.3, 0), t - 5.9, [5, 0.3, 5]); P.dust[1].set(V.set(0, 0.5, 0), t - 6.7, [3, 0.5, 6]);
          P.blue[0].set(V.set(0, -1, 0), t - 6.6, [2.5, 1, 4]); P.blue[0].u.uDirBias.value.set(0, 1.6, 0);
          P.birds.group.visible = true; P.birds.update(w * 1.6, V.set(0, 4 + back * 6, -2), 0.5 + sseg(t, 5.7, 8) * 2.5);
          if (t > 6.4) P.rays(0.8, V.set(0, 2, 0), [0.4, 0.75, 1.0]);
        } else if (inTemple) {                                          // templo subterrâneo
          P.temple.group.visible = true;
          P.atmo.apply('temple', null, 0, w, V.set(0, 0, 0));
          const touched = t >= 11.3, energy = 1 + pulse(t, 11.3, 12.8, 0.25) * 1.5;
          P.temple.update(w, energy);
          const walk = seg(t, 8, 9.9), z = lerp(5.6, 1.08, walk), y = z < 1.8 ? 0.6 : z < 2.9 ? lerp(0.6, 0.3, seg(z, 1.8, 2.1)) : lerp(0.3, 0, seg(z, 2.9, 3.2));
          akio.place(0, y, z, Math.PI);
          if (walk < 1) akio.walk(walk * 3.2, 1 - sseg(walk, 0.9, 1)); akio.idle(t);
          akio.katana.visible = touched;
          if (!touched) {
            akio.reach(sseg(t, 9.9, 11.25)); akio.look(0, -0.25, sseg(t, 8.6, 9.6));
            akio.face({ brow: -0.6, mouth: 0.25 * sseg(t, 9.2, 10) });
            P.relic.visible = true; P.relic.position.set(0, 2.05 + y - 0.6 + Math.sin(t * 2.2) * 0.04, 0.44); P.relic.rotation.set(-1.16, 0, Math.sin(t * 1.3) * 0.12);
            P.relic.userData.setGlow(1.2 + 0.5 * Math.sin(t * 6));
          } else {                                                      // ergue a espada: o poder desperta
            const up = easeOut(seg(t, 11.3, 12.1));
            akio.reach(1 - up); akio.set('armR', -2.65, 0, -0.25, up); akio.set('foreR', -0.2, 0, 0, up); akio.set('handR', 1.3, 0, 0, up);
            akio.set('spine', -0.12, 0, 0, up); akio.look(0, -0.45, up);
            akio.face({ brow: 0.5 * up - 0.6 * (1 - up), mouth: 0.5 });
            akio.katana.userData.setGlow(1 + energy);
          }
          P.petals.u.uBox.value.set(7, 16, 7); P.petals.update(w, V.set(0, 8, 0), 0.7, COOL);
          P.rain.u.uBox.value.set(7.5, 20, 7.5); P.rain.update(w, t, V.set(0, 9.5, 0), 0.45, frozen);
          P.motes.update(w, V.set(0, 4, 1), 1);
          P.birds.group.visible = true; P.birds.update(w * 1.3, V.set(0, 5.2, 0), 0.42);
          P.rays(0.22 + energy * 0.12, V.set(0, 30, 0), [0.55, 0.8, 1.0]);
          if (t >= 11.25) {                                             // rotação de 360° em torno de Akio
            const a = 0.75 + s.orbit * TAU, R = lerp(3.2, 4.6, Math.sin(s.orbit * Math.PI));
            cam.p.set(Math.sin(a) * R, lerp(2.3, 3.1, s.orbit) + y, 1.0 + Math.cos(a) * R); cam.l.set(0, 2.25 + y, 0.9); cam.fov = lerp(40, 46, Math.sin(s.orbit * Math.PI));
            V.set(0, 2.2, 0.6); P.wave(1, V, seg(t, 11.3, 12.5) * 1.3, 0.05 * (1 - seg(t, 11.3, 12.5)));
            P.stage.flash(0.55, 0.8, 1, pulse(t, 11.27, 11.6, 0.08) * 0.6);
            P.blue[1].set(V.set(0, 2.3, 0.6), t - 11.3, [0.2, 0.4, 0.2]);
            P.rings[0].position.set(0, y + 0.75, 0.9); P.rings[0].rotation.set(-Math.PI / 2, 0, 0); P.rings[0].scale.setScalar(13); P.rings[0].userData.set(seg(t, 11.3, 12.6), t);
            cam.shake = pulse(t, 11.25, 12.0, 0.2) * 1.2;
          }
        } else {                                                        // 13–20 s: o mundo parado
          const z = lerp(21, SKY_END.akioZ, seg(t, 13, 15.2)), walking = 1 - sseg(t, 15.0, 15.3);
          akio.place(0, 0, z, Math.PI).walk((21 - z) * 0.62, walking).idle(t);
          const reach = sseg(t, 15.0, 15.75) * (1 - sseg(t, 16.3, 17.0));
          akio.reach(reach, 'L'); akio.look(-0.35 * reach, -0.1 * reach - 0.5 * sseg(t, 17.2, 18.2), 1);
          akio.face({ brow: -0.75 * sseg(t, 15.8, 16.1) + 0.2, mouth: 0.5 * sseg(t, 15.8, 16.2) });
          akio.katana.userData.setGlow(1.4 + 0.4 * Math.sin(t * 5));
          P.birds.group.visible = true; P.birds.update(w, V.set(0, 3.2, 14), 1.0);
          const hb = P.birds.birds[0]; hb.position.copy(heroBird); hb.rotation.y = 1.9; hb.scale.setScalar(1.7 * (1 - sseg(t, 15.8, 15.95)));
          P.gold[0].set(heroBird, t - 15.8, [0.22, 0.12, 0.22]);
          cam.shake = 0.15;
          P.stage.fx.uWarp.value = sseg(t, 17.3, 20) * 0.55;
          P.stage.flash(0.75, 0.9, 1, pulse(t, 12.95, 13.35, 0.12) * 0.5);
        }
        P.stage.fx.uFreeze.value = frozen * (t < 13 ? 0.8 : 0.9);
        P.stage.fx.uFade.value = 1 - sseg(t, 0, 0.35);
        P.end(t);
        return t < 11.5 ? t / 20 : 0.575 - (t - 11.5) * 0.3 - Math.pow(seg(t, 17.2, 20), 2) * 2;
      },
    };
  },
};
