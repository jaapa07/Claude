import * as THREE from 'three';
import { shot, newTimeline } from '../camera/director.js';
import { seg, sseg, lerp, easeOut, pulse, TAU, clamp, makeTau, noise1 } from '../core/util.js';
import { DUEL_END, arenaDiscs } from './ep3.js';

// Último frame: Akio abraça o seu futuro no centro de uma explosão de luz azul — o ep. 5 abre dessa luz.
export const HUG = { akioZ: -0.5, lordZ: -1.3 };

const V = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3();
const CLASH = [0.7, 1.5, 2.3, 3.1, 4.0], SEASON = [5.4, 6.5, 7.6, 8.7], MOODS = ['spring', 'winter', 'night', 'day'];
const WHITE = new THREE.Color(0xffffff), PINK = new THREE.Color(0xffc2d6), PALE = new THREE.Color(0xfff0f4);

export default {
  id: 4, title: 'A ÚLTIMA BATALHA',
  build(P) {
    const tl = newTimeline(), cam = P.cam, akio = P.akio, yuna = P.yuna, lord = P.lord;
    const tau = makeTau([[0, 1], [19.2, 1], [19.6, 0], [20, 0]]);
    shot(tl, cam, 0, 1.8, { p: [26, 15, 22], l: [0, 3, -6], fov: 50 }, { p: [8.5, 3.4, 9.5], l: [0, 1.5, 0], fov: 44 }, 'power2.out');
    shot(tl, cam, 1.8, 3.4, { p: [-5.8, 1.1, 3.2], l: [0, 1.5, 0], fov: 46 }, { p: [-4.4, 1.6, -3.2], l: [0, 1.5, 0], fov: 44 }, 'sine.inOut');
    shot(tl, cam, 3.4, 5.4, { p: [2.4, 0.5, 6.0], l: [0, 1.9, 0], fov: 52 }, { p: [4.2, 0.8, 4.4], l: [0, 1.8, 0], fov: 50 }, 'sine.out');
    shot(tl, cam, 5.4, 6.5, { p: [5.2, 1.4, -3.4], l: [0, 1.5, 0], fov: 46 }, { p: [4.2, 1.7, -4.4], l: [0, 1.5, 0], fov: 44 }, 'sine.out');
    shot(tl, cam, 6.5, 7.6, { p: [-5.6, 2.4, 3.0], l: [0, 1.4, 0], fov: 46 }, { p: [-6.2, 1.9, 0.8], l: [0, 1.4, 0], fov: 44 }, 'sine.out');
    shot(tl, cam, 7.6, 8.7, { p: [1.0, 0.5, 6.4], l: [0, 2.0, 0], fov: 54 }, { p: [0.3, 0.8, 5.6], l: [0, 1.9, 0], fov: 52 }, 'sine.out');
    shot(tl, cam, 8.7, 10, { p: [6.5, 3.6, 5], l: [0, 1.2, 0], fov: 46 }, { p: [10, 6.5, 8], l: [0, 1.5, -1], fov: 46 }, 'sine.inOut');
    shot(tl, cam, 12.1, 13.4, { p: [6, 6, 12], l: [0, 22, -58], fov: 50 }, { p: [4, 5, 15], l: [0, 20, -58], fov: 52 }, 'sine.out');
    shot(tl, cam, 13.4, 15, { p: [1, 14, 13], l: [0, 2, -3], fov: 48 }, { p: [0.5, 9, 9.5], l: [0, 2, -2], fov: 46 }, 'sine.inOut');
    shot(tl, cam, 15, 16.4, { p: [-0.9, 1.5, -0.3], l: [0, 1.55, 1.6], fov: 33 }, { p: [-0.65, 1.58, 0.0], l: [0, 1.6, 1.6], fov: 31 }, 'none');
    shot(tl, cam, 16.4, 18.4, { p: [2.8, 1.8, 2.8], l: [0, 1.55, -0.8], fov: 40 }, { p: [1.9, 1.85, 1.5], l: [0, 1.6, -0.9], fov: 36 }, 'sine.inOut');
    shot(tl, cam, 18.4, 20, { p: [2.3, 2.1, 2.2], l: [0, 1.5, -0.9], fov: 40 }, { p: [7, 8, 10], l: [0, 2.5, -0.9], fov: 46 }, 'power2.in');

    return {
      update(t) {
        P.begin(t); tl.time(t);
        const w = tau(t);
        P.arena.group.visible = true; P.fill.intensity = 0.7;
        // ---- estações e horas trocam a cada golpe (5–10 s)
        let si = -1; for (let i = 0; i < 4; i++) if (t >= SEASON[i]) si = i;
        const inSeason = si >= 0 && t < 9.7, mood = inSeason ? MOODS[si] : 'void';
        if (t >= 18.4) P.atmo.apply('void', 'blue', sseg(t, 18.6, 20) * 0.85, w, V.set(0, 0, 0));
        else if (t >= 9.7 && t < 10.1) P.atmo.apply('day', 'void', sseg(t, 9.7, 10.1), w, V.set(0, 0, 0));
        else P.atmo.apply(mood, null, 0, w, V.set(0, 0, 0));
        const snow = inSeason && si === 1 ? 1 : 0; P.arena.setSeason(snow);
        const allHits = [...CLASH, ...SEASON], hit = allHits.reduce((m, c) => Math.max(m, pulse(t, c - 0.02, c + 0.5, 0.05)), 0);
        const crack = sseg(t, 12.1, 12.35), collapse = seg(t, 12.25, 14.2);
        P.arena.update(w, w * 0.05 + hit * 0.6 + (t > 12.1 ? (t - 12.1) * 0.5 : 0), crack, collapse);
        arenaDiscs(P, w, inSeason ? 0.3 : 1);
        P.motes.update(w, P.ahead(6), 1);
        if (inSeason && si < 2) { P.petals.u.uColA.value.copy(si ? WHITE : PINK); P.petals.u.uColB.value.copy(si ? WHITE : PALE); P.petals.u.uFall.value = si ? 1.6 : 0.75; P.petals.update(w * (si ? 1 : 1.4), P.ahead(8), 1, P.atmo.sun.color); }
        P.rays(inSeason ? 0.5 : 0.15, inSeason ? undefined : P.arena.centralPos, inSeason ? undefined : [1, 0.85, 0.6]);

        // ---- duelo: os dois giram em torno do centro e alternam ataque e defesa
        P.show(akio, lord);
        const th = t < 10 ? t * 0.42 : 4.2, calm = sseg(t, 9.6, 10.4);
        const fight = t < 10;
        let ai = -1, ac = 0; for (let i = 0; i < allHits.length; i++) if (t >= allHits[i] - 0.45 && t < allHits[i] + 0.4) { ai = i; ac = allHits[i]; }
        const k = ai >= 0 ? seg(t, ac - 0.45, ac + 0.4) : 0, akioAtk = ai % 2 === 0;
        const sep = 0.92 + (ai >= 0 ? 0.25 * Math.sin(k * Math.PI) : 0.2);
        let ax = Math.sin(th) * sep, az = Math.cos(th) * sep, lx = -Math.sin(th) * sep * 1.04, lz = -Math.cos(th) * sep * 1.04, ary = th + Math.PI, lry = th;
        if (t >= 10) {                                                    // encaram-se; depois Akio solta a espada e caminha
          const s0x = Math.sin(4.2), s0z = Math.cos(4.2), settle = sseg(t, 10, 11.5);
          ax = lerp(s0x * 1.12, 0, settle); az = lerp(s0z * 1.12, 1.6, settle); lx = lerp(-s0x * 1.16, 0, settle); lz = lerp(-s0z * 1.16, HUG.lordZ, settle);
          ary = lerp(4.2 + Math.PI, Math.PI, settle); lry = lerp(4.2, 0, settle) ; if (settle >= 1) lry = 0;
          az = lerp(az, HUG.akioZ, sseg(t, 16.3, 17.3));
        }
        akio.place(ax, 0, az, ary).idle(t); lord.place(lx, 0, lz, lry).idle(t);
        if (fight) {
          if (ai < 0) { akio.guard(1); lord.guard(1); }
          else if (akioAtk) { (ai % 4 === 0 ? akio.slash(k) : akio.sweep(k)); lord.block(1); }
          else { (ai % 4 === 1 ? lord.sweep(k) : lord.slash(k)); akio.block(1); }
          akio.face({ brow: 0.95, mouth: 0.2 + 0.5 * hit }); lord.face({ brow: 0.5 });
          const arc = P.arcs[ai % 2 === 0 ? 0 : 2];
          if (ai >= 0) { const atkSlash = akioAtk ? ai % 4 === 0 : ai % 4 !== 1, px = akioAtk ? ax : lx, pz = akioAtk ? az : lz, ry = akioAtk ? ary : lry;
            arc.position.set(px, 1.35, pz); if (atkSlash) arc.rotation.set(0, ry + Math.PI / 2, 0); else arc.rotation.set(-Math.PI / 2, 0, 2.2 - ry); arc.scale.setScalar(akioAtk ? 1.2 : 1.45); arc.userData.set(seg(k, 0.36, 0.85), t); }
        }
        const lookClock = pulse(t, 12.0, 15.2, 0.4);
        if (!fight) {
          const drop = sseg(t, 15.3, 15.8);
          akio.guard((1 - drop) * (1 - lookClock * 0.5)); akio.look(lookClock * -0.5, -0.35 * lookClock, 1);
          lord.guard(1 - sseg(t, 17.4, 18.4)); lord.look(lookClock * 0.5, -0.35 * lookClock, 1);
          const tremble = pulse(t, 15.5, 18, 0.5); lord.j.armR.rotation.x += noise1(t * 14) * 0.05 * tremble; lord.j.armR.rotation.z += noise1(t * 11 + 3) * 0.04 * tremble;
          const hug = sseg(t, 17.1, 17.9), back = sseg(t, 18.3, 19.1);
          if (t > 16.3 && t < 17.3) akio.walk(seg(t, 16.3, 17.3) * 1.6, 1 - sseg(t, 17.1, 17.3) * 1);
          akio.hug(hug); lord.hug(back * 0.75); lord.set('head', 0.35, 0, 0, sseg(t, 17.6, 18.6));
          akio.face({ brow: -0.35 * drop + 0.6 * (1 - drop), smile: 0.5 * drop, blink: hug * 0.9 });
          if (t >= 15.5 && t <= 18.9) akio.talk(t, 0.9);
          lord.face({ brow: 0.5 - 1.1 * sseg(t, 16.2, 17.6), blink: back });
          // a espada cai da mão
          akio.katana.visible = t < 15.75;
          if (t >= 15.75) { const f = Math.min(0.32, t - 15.75), land = f >= 0.32; P.relic.visible = true; P.relic.position.set(0.32, Math.max(0.04, 1.0 - 9.8 * f * f), 1.25 - f * 0.6); P.relic.rotation.set(land ? Math.PI / 2 : 0.4 + f * 9, 0.7, land ? 0 : f * 5); P.relic.userData.setGlow(1 - sseg(t, 16, 18.5) * 0.8); }
          lord.katana.userData.setGlow(1 - sseg(t, 17.4, 18.6) * 0.9);
        }
        lord.breakMask(1);

        // ---- Yuna: flecha de energia no relógio central
        const isl = P.arena.yunaIsland.position, target = P.arena.centralPos;
        if (t >= 9.9 && t < 15) {
          P.show(yuna);
          const draw = sseg(t, 10.3, 11.2) * (1 - sseg(t, 11.3, 11.36));
          yuna.place(isl.x, isl.y, isl.z, Math.atan2(target.x - isl.x, target.z - isl.z)).idle(t).aim(sseg(t, 10.0, 10.5) * (1 - sseg(t, 12.6, 13.6)), draw, 0.34);
          yuna.bow.userData.setDraw(draw); yuna.face({ brow: 0.8, mouth: 0.05 });
          A.set(isl.x, isl.y + 1.42, isl.z); D.subVectors(target, A).normalize(); A.addScaledVector(D, 0.55);
          const fly = seg(t, 11.3, 12.1);
          if (t >= 10.5 && t < 12.1) { P.arrow.visible = true; P.arrow.position.copy(A).addScaledVector(D, -draw * 0.45).lerp(target, fly); P.arrow.lookAt(target); P.arrow.scale.setScalar(fly > 0 ? 1 + fly * 2.5 : 0.6); P.arrow.userData.light.intensity = fly > 0 ? 5 : 0.3; P.arrow.userData.halo.visible = fly > 0; }
          if (t < 11.3) { const kk = sseg(t, 10, 11.3); cam.p.set(isl.x + lerp(2.2, 1.5, kk), isl.y + 1.75, isl.z - lerp(3.0, 2.2, kk)); cam.l.set(isl.x, isl.y + 1.35, isl.z); cam.fov = lerp(38, 33, kk); }
          else if (t < 12.1) { cam.p.copy(P.arrow.position).addScaledVector(D, -lerp(3, 9, fly)); cam.p.x += 1.2; cam.p.y += 0.8 + fly * 2; cam.l.copy(P.arrow.position).addScaledVector(D, 12); cam.fov = lerp(50, 44, fly); }
          P.blue[0].set(A, t - 11.3, [0.2, 0.2, 0.2]);
        }
        // ---- o relógio central rui; os fragmentos se reorganizam em um anel ao redor da arena
        if (t >= 12.1) {
          const age = t - 12.1, re = sseg(t, 13.5, 15.0);
          for (const [sh, n] of [[P.shards, 0], [P.shards2, 1]]) sh.update((i, s, d) => {
            const a = s[0] * TAU, r = Math.sqrt(s[1]) * 22;
            A.set(target.x + Math.cos(a) * r, target.y + Math.sin(a) * r, target.z);
            const tr = (1 - Math.exp(-age * 1.1)) / 1.1;
            A.x += Math.cos(a) * tr * (8 + s[2] * 20); A.y += Math.sin(a) * tr * (6 + s[3] * 14) - age * age * (0.5 + s[4]); A.z += tr * (6 + s[5] * 40);
            const ra = s[6] * TAU + w * (0.35 + n * 0.2) * (n ? -1 : 1), rr = 17 + s[7] * 5 + n * 3;
            B.set(Math.sin(ra) * rr, 1.5 + s[2] * 9 + Math.sin(w + s[3] * 9) * 0.6, Math.cos(ra) * rr);
            d.position.lerpVectors(A, B, re);
            const sp = age * (2 + s[4] * 5) * (1 - re * 0.8); d.rotation.set(sp * s[5], sp * s[6] + ra * re, sp * s[7]);
            d.scale.setScalar(lerp(1.5, 0.22, re) * (0.5 + s[1]) * Math.min(1, age * 6));
          });
          P.stage.flash(1, 0.92, 0.75, pulse(t, 12.07, 12.4, 0.06) * 0.32);
          if (age < 1.6) P.wave(1, target, age * 0.8, 0.05 * (1 - age / 1.6));
          P.big.u.uCol.value.setHex(0xffd27a); P.big.set(target, age, [20, 20, 2]);
        } else P.big.u.uCol.value.setHex(0x7fc8ff);

        // ---- choques, tela e o congelamento final em luz azul
        allHits.forEach((c, i) => {
          const age = t - c; if (age < 0 || age > 0.9) return;
          const cx = (ax + lx) / 2, cz = (az + lz) / 2; V.set(cx, 1.55, cz);
          P.wave(1 + (i % 2), V, age * 1.2, 0.05 * (1 - age / 0.9));
          const ring = P.rings[i % 3]; ring.position.copy(V); ring.lookAt(cam.p); ring.scale.setScalar(3); ring.userData.set(age / 0.8, t);
          P.blue[1 + (i % 2)].set(V, age, [0.1, 0.1, 0.1]);
        });
        const flashHit = allHits.reduce((m, c) => Math.max(m, pulse(t, c - 0.03, c + 0.2, 0.05)), 0);
        const boom = sseg(t, 18.9, 19.9);
        P.beam.position.set(0, 0, -0.9); P.beam.scale.set(1 + boom * 5, 1, 1 + boom * 5); P.beam.userData.set(boom * 0.9, t);
        P.gold[0].u.uStagger.value = 2; P.gold[0].set(V.set(0, 1.4, -0.9), t - 17.2, [0.6, 0.9, 0.6]);
        if (t > 18.8) { V.set(0, 1.4, -0.9); P.wave(1, V, seg(t, 18.9, 20) * 1.4, 0.06); P.rings[0].position.set(0, 0.1, -0.9); P.rings[0].rotation.set(-Math.PI / 2, 0, 0); P.rings[0].scale.setScalar(30); P.rings[0].userData.set(seg(t, 18.9, 20) * 0.9, t); }
        if (boom > 0) P.stage.flash(0.62, 0.85, 1, Math.pow(boom, 1.6));
        else if (t < 12) P.stage.flash(0.8, 0.92, 1, flashHit * (SEASON.some((c) => Math.abs(t - c - 0.08) < 0.14) ? 0.3 : 0.05));
        P.stage.fx.uFreeze.value = sseg(t, 19.2, 19.7) * 0.6;
        P.stage.fx.uWarp.value = 0.15 + hit * 0.35 + boom * 0.5;
        cam.shake = hit * 1.5 + 0.15 + pulse(t, 12.1, 14, 0.3) * 0.9 + boom * 1.2;
        P.end(t);
        return w / 20 + (t > 5.4 && t < 9.7 ? Math.floor((t - 5.4) / 1.1 + 1) * 0.25 : 0);
      },
    };
  },
};
