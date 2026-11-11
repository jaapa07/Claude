import * as THREE from 'three';
import { shot, newTimeline } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, pulse, TAU, clamp } from '../core/util.js';
import { MOUNT_END } from './ep2.js';

// Estado no último frame — o episódio 4 retoma o duelo deste ponto.
export const DUEL_END = { cam: { p: [2.7, 2.0, 4.3], l: [0, 1.6, 0], fov: 40 }, akioZ: 1.5, lordZ: -0.95 };

const V = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
const PORTAL = new THREE.Vector3(0, 62, -205), CLASH = new THREE.Vector3(0, 1.55, 0.1);
const CLASHES = [10.9, 12.1, 13.3];

/** pequenos relógios flutuando ao redor da arena (usado também no ep. 4). */
export function arenaDiscs(P, t, amount = 1) {
  P.discs.update((i, s, d) => {
    if (i > 420 * amount) { d.scale.setScalar(0); return; }
    const a = s[0] * TAU + t * 0.03 * (s[1] - 0.5), r = 17 + s[2] * 48;
    d.position.set(Math.sin(a) * r, -12 + s[3] * 44 + Math.sin(t * 0.5 + s[4] * 9) * 1.2, Math.cos(a) * r - 12);
    d.rotation.set(s[5] * 6 + t * 0.4 * (s[6] - 0.5), s[6] * 6 + t * 0.3, s[7] * 3); d.scale.setScalar(0.35 + s[4] * 1.3);
  });
}

export default {
  id: 3, title: 'O GUERREIRO DO FUTURO',
  build(P) {
    const tl = newTimeline(), cam = P.cam, akio = P.akio, yuna = P.yuna, lord = P.lord;
    shot(tl, cam, 0, 2.4, MOUNT_END.cam, { p: [1.0, 4.2, 29], l: [0, 82, -330], fov: 42 }, 'sine.inOut');
    shot(tl, cam, 2.4, 5, { p: [0, 10, 4], l: [0, 72, -300], fov: 48 }, { p: [0, 24, -70], l: [0, 62, -205], fov: 44 }, 'power2.inOut');
    shot(tl, cam, 10, 10.9, { p: [1.3, 0.9, 12], l: [0, 1.7, -1], fov: 46 }, { p: [0.9, 1.3, 4.4], l: [0, 1.6, -0.5], fov: 42 }, 'power1.in');
    shot(tl, cam, 10.9, 12, { p: [5.6, 1.6, 0.8], l: [0, 1.45, 0.1], fov: 40 }, { p: [4.3, 1.9, -2.4], l: [0, 1.45, 0.1], fov: 38 }, 'sine.out');
    shot(tl, cam, 12, 13.2, { p: [-4.6, 0.7, 2.6], l: [0, 1.6, 0.1], fov: 46 }, { p: [-3.6, 1.0, 0.6], l: [0, 1.6, 0.1], fov: 44 }, 'sine.out');
    shot(tl, cam, 13.2, 14.1, { p: [0.6, 8, 3.4], l: [0, 1, 0], fov: 44 }, { p: [0.5, 5.6, 2.6], l: [0, 1, 0], fov: 42 }, 'sine.out');
    shot(tl, cam, 14.1, 15, { p: [1.5, 1.95, 3.0], l: [0, 1.75, -0.4], fov: 36 }, { p: [1.2, 1.95, 2.5], l: [0, 1.78, -0.4], fov: 33 }, 'none');
    shot(tl, cam, 15, 16.6, { p: [0.7, 2.0, 1.3], l: [0, 2.0, -0.95], fov: 34 }, { p: [0.45, 2.06, 0.85], l: [0, 2.02, -0.95], fov: 32 }, 'sine.out');
    shot(tl, cam, 16.6, 18.2, { p: [-0.55, 1.7, -0.5], l: [0, 1.7, 1.4], fov: 31 }, { p: [-0.4, 1.72, -0.25], l: [0, 1.71, 1.5], fov: 29 }, 'none');
    shot(tl, cam, 18.2, 20, { p: [3.6, 1.8, 5.2], l: [0, 1.6, 0], fov: 42 }, DUEL_END.cam, 'sine.out');

    return {
      update(t) {
        P.begin(t); tl.time(t);
        if (t < 10) {
          // ================= vila: a montanha vira relógios; o portal se abre; o Senhor das Horas surge
          P.village.group.visible = true; P.village.setChasm(1); P.village.vanishHouse.visible = false;
          const dist = Math.max(0, t - 5.2) * 2.1, lx = 0, ly = 60 - dist * 0.14, lz = -202 + dist;
          P.atmo.apply('dusk', 'void', sseg(t, 0.5, 6) * 0.65, t, t < 5 ? V.set(0, 0, 20) : V.set(lx, ly, lz));
          P.village.update(t, P.atmo.scene.fog.color, 0.4);
          P.petals.update(t, P.ahead(9), t < 5 ? 1 : 0, P.atmo.sun.color); P.motes.update(t, P.ahead(6), 1);
          const md = lerp(MOUNT_END.dissolve, 1.05, sseg(t, 0, 2.7));
          P.village.bigDis.uDissolve.value = md; P.village.bigMountain.visible = md < 1.0;
          P.big.set(V.set(0, 95, -330), t + 2.3, [95, 95, 60]);
          P.discs.update((i, s, d) => {                                   // milhares de relógios nascem do volume da montanha
            const h = Math.pow(s[0], 1.4) * 190, r = (1 - h / 215) * 135 * Math.sqrt(s[1]), a = s[2] * TAU;
            A.set(Math.cos(a) * r, h, -330 + Math.sin(a) * r);
            const age = t - (0.15 + s[3] * 2.5); if (age < 0) { d.scale.setScalar(0); return; }
            const near = s[4] < 0.3, tr = (1 - Math.exp(-age * 0.45)) / 0.45;
            if (near) { B.set((s[5] - 0.5) * 90, 6 + s[6] * 70, -150 + s[7] * 190); d.position.lerpVectors(A, B, 1 - Math.exp(-age * 0.42)); }
            else d.position.set(A.x + Math.cos(a) * tr * (6 + s[5] * 22), A.y + (s[6] - 0.3) * tr * 16, A.z + Math.sin(a) * tr * 14 + tr * s[7] * 16);
            d.position.y += Math.sin(t * 0.6 + s[5] * 20) * 1.5;
            d.rotation.set(s[5] * 6 + t * 0.5 * (s[6] - 0.5), s[6] * 6 + t * 0.4, s[7] * 3);
            d.scale.setScalar((near ? 0.5 + s[6] * 1.6 : 1.5 + s[7] * 4) * easeOut(age / 0.7));
          });
          const open = sseg(t, 2.5, 4.4);
          P.portal.position.copy(PORTAL); P.portal.scale.setScalar(3.1); P.portal.rotation.set(0, 0, 0); P.portal.userData.set(open, t);
          P.rays(t < 5 ? 0.35 + open * 0.4 : 0.3, PORTAL, [0.45, 0.75, 1]);
          P.stage.flash(0.6, 0.85, 1, pulse(t, 2.45, 2.85, 0.1) * 0.4);
          if (t > 2.4 && t < 4) P.wave(1, PORTAL, seg(t, 2.5, 4) * 1.1, 0.035 * (1 - seg(t, 2.5, 4)));
          P.stage.fx.uWarp.value = 0.3 + open * 0.25;
          cam.shake = (1 - sseg(t, 2, 3)) * 0.6 + pulse(t, 2.4, 3.4, 0.2) * 0.8;
          if (t < 5) {
            P.show(akio, yuna);
            akio.place(MOUNT_END.akio[0], 0, MOUNT_END.akio[1], Math.PI - 0.15).idle(t).look(0, -0.3, 1).face({ brow: -0.8, mouth: 0.5 });
            yuna.place(MOUNT_END.yuna[0], 0, MOUNT_END.yuna[1], Math.PI + 0.1).idle(t).look(0, -0.3, 1).face({ brow: -0.6, mouth: 0.3 });
          } else {
            P.show(lord);
            lord.place(lx, ly, lz, 0).walk(dist * 0.36, 0.85).idle(t);
            lord.dissolve(1 - sseg(t, 5.25, 6.5)); lord.face({ brow: 0.6 });
            P.shards2.update((i, s, d) => {                               // degraus de fragmentos que se montam sob cada passo
              const step = Math.floor(i / 12), sd = step * 0.62 - 1.0, near = sseg(dist - sd, -3.2, -0.8), gone = sseg(dist - sd, 2.5, 6);
              const a = (i % 12) / 12 * TAU, rr = 0.25 + s[0] * 0.75;
              A.set(Math.cos(a) * rr * 1.25, 60 - sd * 0.14 - 0.1 - s[1] * 0.12, -202 + sd + Math.sin(a) * rr * 0.6);
              B.set(A.x + (s[2] - 0.5) * 14, A.y - 4 - s[3] * 9, A.z + (s[4] - 0.5) * 10);
              d.position.lerpVectors(B, A, easeOut(near)); d.position.y -= gone * (2 + s[5] * 6);
              const sp = (1 - near) * 6 + gone * 3; d.rotation.set(Math.PI / 2 + sp * s[5], sp * s[6] + a, sp * s[7]);
              d.scale.setScalar((0.14 + s[6] * 0.16) * Math.min(1, near * 3 + 0.3) * (1 - gone));
            });
            for (let k = 0; k < 2; k++) {                                 // onda a cada passo
              const n = Math.floor(dist / 1.38 - k * 0.5), sd = (n + k * 0.5) * 1.38, age = (dist - sd) / 2.1;
              const ring = P.rings[k]; ring.position.set(0, 60 - sd * 0.14 - 0.05, -202 + sd); ring.rotation.set(-Math.PI / 2, 0, 0); ring.scale.setScalar(3.2); ring.userData.set(clamp(age / 0.6), t);
            }
            // câmera amarrada ao personagem
            if (t < 6.6) { const k = sseg(t, 5, 6.6); cam.p.set(0.4, 61.3, -188 - k * 5); cam.l.set(0, 61.2 + k * 0.4, -203); cam.fov = lerp(40, 34, k); }
            else if (t < 8.4) { const k = sseg(t, 6.6, 8.4); cam.p.set(1.0 - k * 0.3, ly + 0.25 + k * 0.5, lz + 2.6); cam.l.set(0, ly + lerp(0.3, 2.0, k), lz); cam.fov = 44; }
            else { const k = seg(t, 8.4, 10); cam.p.set(lerp(5.5, 3.6, k), ly + lerp(2.4, 1.3, k), lz + 7.5); cam.l.set(0, ly + 1.4, lz - 1); cam.fov = 40; }
            cam.shake = 0.25;
          }
        } else {
          // ================= arena temporal: o duelo
          P.arena.group.visible = true;
          P.atmo.apply('dusk', 'void', 0.85, t, V.set(0, 0, 0));
          const hit = CLASHES.reduce((m, c) => Math.max(m, pulse(t, c - 0.02, c + 0.6, 0.06)), 0);
          P.arena.update(t, t * 0.05 + hit * 0.8);
          arenaDiscs(P, t); P.motes.update(t, P.ahead(6), 1);
          P.rays(0.15, P.arena.centralPos, [1, 0.85, 0.6]);
          P.show(akio, lord); P.fill.intensity = 0.7;
          const locked = sseg(t, 13.9, 14.3), brk = seg(t, 15.05, 16.5);
          // Akio
          const dash = seg(t, 10, 10.85), az = t < 10.85 ? lerp(9, 1.0, dash) : lerp(lerp(1.0 + 0.5 * pulse(t, 11.2, 12.9, 0.3), 0.72, locked), DUEL_END.akioZ, sseg(t, 16.4, 17.4));
          akio.place(0, 0, az, Math.PI).idle(t);
          if (t < 10.45) akio.walk(dash * 3.2, 1, 1);
          else if (t < 11.6) akio.slash(seg(t, 10.45, 11.35));
          else if (t < 12.85) akio.block(1);
          else if (t < 13.9) akio.slash(seg(t, 12.85, 13.75));
          else if (t < 15.05) { akio.block(1); akio.j.spine.rotation.x += 0.2; }
          else { akio.guard(1 - sseg(t, 15.4, 16.6) * 0.8); akio.look(0, -0.15, 1); }
          akio.face(t < 15.2 ? { brow: 0.95, mouth: 0.25 + 0.5 * hit } : { brow: -0.95 * sseg(t, 15.3, 15.9), mouth: 0.6 * sseg(t, 15.4, 16) });
          akio.katana.userData.setGlow(1.5 + hit * 2);
          // Senhor das Horas
          const lz = lerp(lerp(-1.1 - 0.4 * pulse(t, 11.2, 11.8, 0.2), -0.72, locked), DUEL_END.lordZ, sseg(t, 15.05, 15.6));
          lord.place(0, 0, lz, 0).idle(t);
          if (t < 11.65) lord.block(1);
          else if (t < 12.85) lord.sweep(seg(t, 11.65, 12.55));
          else if (t < 13.9) lord.slash(seg(t, 12.85, 13.75));
          else if (t < 15.05) { lord.block(1); lord.j.spine.rotation.x += 0.2; }
          else { lord.guard(1 - sseg(t, 15.2, 16.4)); lord.set('head', 0.08, 0, 0, 1); }
          lord.breakMask(brk); lord.face({ brow: -0.55 * sseg(t, 15.2, 16), mouth: 0.05 });
          if (t >= 15.9 && t <= 19.1) lord.talk(t, 0.8);
          lord.katana.userData.setGlow(1.2 + hit * 2 - sseg(t, 15.2, 17) * 0.8);
          // energia dos choques: ondas, anéis, centelhas e a tela dividida entre passado e futuro
          CLASHES.forEach((c, i) => {
            const age = t - c; if (age < 0 || age > 1.2) return;
            P.wave(1 + (i % 2), CLASH, age * 1.1, 0.06 * (1 - age / 1.2));
            const ring = P.rings[i]; ring.position.copy(CLASH); ring.lookAt(cam.p); ring.scale.setScalar(3); ring.userData.set(age / 1.0, t);
            P.blue[i].set(CLASH, age, [0.1, 0.1, 0.1]);
          });
          if (t > 13.9 && t < 15.3) { P.gold[0].u.uStagger.value = 1.2; P.gold[0].set(V.set(0, 1.75, 0), t - 14.0, [0.08, 0.2, 0.08]); }
          P.blue[0].set(V.set(0, 2.02, lz + 0.25), t - 15.05, [0.15, 0.15, 0.1]);
          P.stage.fx.uSplit.value = hit * 0.9 + pulse(t, 14.1, 15.05, 0.3) * 0.35;
          P.stage.flash(0.75, 0.9, 1, CLASHES.reduce((m, c) => Math.max(m, pulse(t, c - 0.03, c + 0.22, 0.05)), 0) * 0.06 + pulse(t, 15.02, 15.3, 0.06) * 0.25);
          cam.shake = hit * 1.6 + pulse(t, 14.1, 15.2, 0.2) * 0.7 + 0.15;
          P.stage.fx.uWarp.value = 0.18 + hit * 0.4;
          P.gold[1].u.uStagger.value = 3; P.gold[1].set(V.set(0, 1.5, 0.3), t - 17.6, [3, 1.5, 3]);
        }
        P.stage.fx.uFade.value = 0;
        P.end(t);
        return t / 20;
      },
    };
  },
};
