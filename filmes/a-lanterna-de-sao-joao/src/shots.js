// The shots. Each: build(E) → { S, update(t), post(t), grade(t) }, t in film seconds.
import * as THREE from 'three';
import { aim } from './stage.js';
import { sheet, setMoon } from './paper.js';
import { ss, seg, clamp, lerp, eio, eo, ei, track, TAU } from './lib.js';
import { agencia, carta, descida, travessia, margem, moveWaves, FLOOR, SLOPE, roadY, HOUSE, WIN, DOOR, FARL } from './mundo.js';

const WARM = [.014, .007, .002];   // warm blacks for the interiors and the paper close-ups
const flick = t => 1 + .06 * Math.sin(7.3 * t) * Math.sin(3.1 * t);
const POST = (focus, aper = 7, bloom = .38) => ({ focus, aper, maxCoc: 10, bloom: { strength: bloom, radius: .55, threshold: 1.1 } });
const F = (S, z) => S.cam.position.z - z;
const H0 = .034, hand = (px, py, a, k = 1, dir = 1) => [px + dir * Math.sin(a) * H0 * .33 * k, py + (H0 * .79 - Math.cos(a) * H0 * .33) * k];
const grow = (m, s) => { m.visible = s > .001; m.scale.x = Math.max(.001, s); m.material.map.repeat.x = Math.max(.001, s); };

// S0 0–2.2: the cover: an old envelope on a desk, the title where the address should be
export function s0(E) {
  const C = carta('cover'), { S } = C;
  return { S, update(t) { aim(S.cam, [0, -.004, lerp(.47, .445, seg(t, 0, 3.2)), 0, -.004, -.11], t, { roll: -.035 }); C.U.uLit.value = 1; },
    post() { return POST(F(S, -.108), 4, .3); }, grade() { return { vig: .5, lift: WARM }; } };
}

// S1 2.2–17.4: the post office: Seu Nico drags the old cabinet; behind it, a letter
export function s1(E) {
  const A = agencia(), { S } = A, H = E.H, FY = FLOOR - .014, K = A.nico.k;
  const P = track([[2, [-.02, -.035, .37, -.02, -.04, -.1]], [9.4, [.07, -.055, .3, .07, -.06, -.1]], [13.4, [.085, -.07, .23, .085, -.075, -.1]], [17.6, [.09, -.062, .19, .09, -.066, -.1]]]);
  return { S,
    update(t) { aim(S.cam, P(t), t); A.bulb.userData.set(.6 * flick(t));
      // three heaves: the cabinet moves in bursts, he leans into it
      const u = seg(t, H.push[0], H.push[1]), heave = (Math.floor(u * 3) + eo((u * 3) % 1)) / 3, cx = .1 + .1 * Math.min(1, heave), strain = u > 0 && u < 1 ? 1 : 0;
      A.cab.position.x = cx; A.cab.rotation.z = strain * -.012 * Math.sin(u * 3 * Math.PI);
      let nx, o;
      if (t < H.push[0]) { nx = lerp(-.2, .1 - .078, eo(seg(t, 2.2, H.push[0]))); o = { dir: 1, amp: t < H.push[0] - .2 ? 1 : 0, ph: nx / .014 * Math.PI / 2 }; }
      else if (t < H.push[1] + .4) { nx = cx - .078; o = { dir: 1, amp: strain * .7, ph: nx / .008 * Math.PI / 2, lean: -.28 * strain, armF: 1.35, armB: 1.2 }; }
      else if (t < H.pick - 1.2) { nx = lerp(.2 - .078, .06, ss(seg(t, 11.6, H.pick - 1.4))); o = { dir: t > 11.6 ? -1 : 1, amp: t > 11.6 && t < H.pick - 1.4 ? .8 : 0, ph: nx / .014 * Math.PI / 2, armF: .1 }; if (t > H.pick - 1.5) o.dir = 1; }
      else { nx = .06; const down = ss(seg(t, H.pick - 1.2, H.pick - .2)) * (1 - ss(seg(t, H.pick, H.pick + .9))), up = ss(seg(t, H.pick + .4, H.pick + 1.4)); o = { dir: 1, lean: -.3 * down, armF: .75 * down + 1.25 * up, armB: .3 * down }; }
      A.nico.pose(nx, FY, o);
      // the letter: on the floor, a glint when uncovered, then in his hand
      const got = t >= H.pick; const gl = clamp(seg(t, H.glint, H.glint + .5)) * (got ? .5 : 1) * (.7 + .3 * Math.sin(t * 5));
      if (!got) { A.carta.position.set(.1, FLOOR - .004, -.112); A.glint.position.set(.1, FLOOR - .002, -.108); A.carta.rotation.z = 0; }
      else { const [hx, hy] = hand(nx, FY, o.armF, K, 1), k = ss(seg(t, H.pick, H.pick + .5)); A.carta.position.set(lerp(.1, hx + .004, k), lerp(FLOOR - .004, hy, k), -.076); A.glint.position.set(A.carta.position.x, A.carta.position.y, -.074); A.carta.rotation.z = -.35 * k; }
      A.glint.userData.set(.9 * gl); },
    post() { return POST(F(S, -.09), 6, .4); }, grade() { return { vig: .42, lift: WARM }; } };
}

// S2 17.4–28: the envelope: the address writes itself
export function s2(E) {
  const C = carta('addr'), { S } = C, H = E.H;
  const P = track([[17, [-.012, .0, .5, -.012, .0, -.11]], [28.5, [-.03, -.006, .4, -.03, -.006, -.11]]]);
  return { S, update(t) { aim(S.cam, P(t), t, { roll: .03 }); C.strips.forEach((m, i) => grow(m, eo(seg(t, H.addr[i], H.addr[i] + 1.0)))); },
    post() { return POST(F(S, -.108), 4, .3); }, grade() { return { vig: .5, lift: WARM }; } };
}
// S2b 77.5–88.5: the letter: ink lines grow, the little lantern he drew lights up
export function s2b(E) {
  const C = carta('open'), { S } = C, H = E.H;
  const P = track([[77, [0, .004, .46, 0, .004, -.11]], [89, [.03, -.012, .36, .03, -.012, -.11]]]);
  return { S, update(t) { aim(S.cam, P(t), t, { roll: -.04 }); C.inks.forEach((m, i) => grow(m, seg(t, H.ink[i], H.ink[i] + 1.3)));
      const k = ss(seg(t, H.lanternDraw, H.lanternDraw + 1.4)); C.lant.set(.1, -.048, k, flick(t)); C.lant.m.visible = t > H.lanternDraw - 2.6; C.lant.m.material.opacity = 1;
      C.sig.visible = t > H.ink[4] + 1.2; },
    post() { return POST(F(S, -.108), 4, .42); }, grade() { return { vig: .5, lift: WARM }; } };
}

// S3 28–45: downhill on the bicycle through the night of São João
export function s3(E) {
  const D = descida(), { S } = D, H = E.H, rot = -Math.atan(SLOPE);
  return { S,
    update(t) { const u = seg(t, H.ride[0], H.ride[1]), bx = lerp(-.12, 1.72, u * (.92 + .08 * u)), by = roadY(bx) - .012;
      const cx = bx + .07, cy = roadY(cx) + .032; aim(S.cam, [cx, cy, .31, cx, cy - .004, -.06], t, { roll: -.035 });
      D.sky.position.set(cx, cy + .02, -.142); D.mn.position.set(cx + .17, cy + .085, -.139);
      const dist = (bx + .12) * 1.003; D.bk.set(bx, by, 1, dist); D.bk.g.rotation.z = rot;
      const ped = dist / .0072 * .33;
      D.nico.pose(bx - .001, by + .0075, { dir: 1, k: 1.12, legB: .55 + .5 * Math.sin(ped), legF: .55 - .5 * Math.sin(ped), armF: 1.05, armB: .95, lean: -.16 }); D.nico.g.rotation.z = rot;
      D.head.position.set(bx + .016, by + .016, -.047); D.head.userData.set(.8 * flick(t));
      D.fires.forEach((f, i) => { const k = .8 + .2 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i); f.fl.material.emissiveIntensity = 2.4 * k; f.fl.scale.set(.7, .65 + .1 * Math.sin(t * 11 + i), 1); f.g.userData.set(.7 * k); });
      D.ballons.forEach((b, i) => { const bxx = cx - .2 + i * .1 + .01 * Math.sin(t * .5 + i), byy = cy + .03 + i % 3 * .022 + .003 * (t - H.ride[0]); b.set(bxx - (cx - D.X0) * .0, byy, 1, flick(t + i)); }); },
    post() { return POST(F(S, -.055), 7, .42); }, grade() { return { vig: .42 }; } };
}

// S4 45–62.5: the borrowed canoe: rowing slowly across
export function s4(E) {
  const R = travessia(), { S } = R, H = E.H;
  return { S,
    update(t) { const u = seg(t, H.row[0], H.row[1]), cx = lerp(-.45, .37, u - .12 * u * u * u), bob = .002 * Math.sin(t * 1.7), cy = -.064 + bob;
      const camx = lerp(cx + .04, .6, ss(seg(t, 56.5, 62.8))); aim(S.cam, [camx, -.032, lerp(.27, .36, ss(seg(t, 56.5, 62.8))), camx, -.038, -.07], t);
      R.sky.position.x = camx; R.mn.position.x = camx - .13;
      moveWaves(R.ws, t);
      const ph = (t - H.strokes[0]) / 2.2 * TAU, pull = Math.sin(ph);
      R.canoe.position.set(cx, cy, -.076); R.canoe.rotation.z = .02 * Math.sin(t * 1.7 + 1);
      R.nico.pose(cx - .012, cy + .004 - .016 * 1.15, { dir: 1, k: 1.15, legB: 1.45, legF: 1.38, lean: -.08 - .14 * pull, armF: .95 + .35 * pull, armB: .85 + .35 * pull });
      R.oar.position.set(cx + .012 + .008 * pull, cy + .026, -.0745); R.oar.rotation.z = .25 - .5 * pull;
      R.prow.set(cx + .058, cy + .022, 1, flick(t)); R.bankWin.userData.set(0); },
    post() { return POST(F(S, -.076), 7, .42); }, grade() { return { vig: .45 }; } };
}

// S5 62.5–77.5: the door: Dona Aurora opens with eighty years and no fright; she reads standing
export function s5(E) {
  const M = margem(), { S } = M, H = E.H, G = HOUSE.g - .001, KN = M.nico.k, KA = M.aurora.k;
  const P = track([[62, [-.1, -.04, .36, -.11, -.045, -.05]], [69, [-.14, -.045, .3, -.15, -.048, -.05]], [77.8, [DOOR.x + .02, HOUSE.g + .032, .21, DOOR.x + .014, HOUSE.g + .032, -.05]]]);
  M.balls.forEach(b => { b.m.visible = false; b.gl.visible = false; }); M.lant.m.visible = false; M.lant.gl.visible = false;
  return { S,
    update(t) { aim(S.cam, P(t), t); moveWaves(M.ws, t); M.farWin.userData.set(0); M.farGlow.userData.set(0); M.bridge.forEach(b => b.userData.set(0)); M.winL.userData.set(0);
      const nx = lerp(-.06, DOOR.x + .034, eo(seg(t, 62.3, 63.0))), walking = t < 62.95;
      let kn = 0; for (const h of H.knock) kn = Math.max(kn, t >= h ? Math.exp(-(t - h) * 12) : 0);
      const raise = ss(seg(t, 62.85, 63.0)) * (1 - ss(seg(t, 63.6, 64.0))), give = ss(seg(t, H.hand - .5, H.hand)) * (1 - ss(seg(t, H.hand + .6, H.hand + 1.4)));
      const aN = raise * (1.45 - .3 * kn) + give * 1.2;
      M.nico.pose(nx + .012 * ss(seg(t, 69.5, 71)), G, { dir: -1, amp: walking ? 1 : 0, ph: nx / .014 * Math.PI / 2, armF: aN, armB: 0, lean: .04 * give });
      const op = ss(seg(t, H.open, H.open + 1.0)); M.leaf.position.x = DOOR.x - op * (DOOR.w + .004); M.doorL.userData.set(.42 * op, flick(t));
      const take = ss(seg(t, H.hand, H.hand + .7)), read = ss(seg(t, H.hand + .8, H.hand + 1.8)), aA = take * .9 + read * .35;
      M.aurora.pose(DOOR.x + .001, HOUSE.g - .004, { dir: 1, armF: aA, armB: read * 1.1, lean: -.05 * read }); M.aurora.g.visible = op > .05;
      const [hx, hy] = hand(nx, G, aN, KN, -1), [ax, ay] = hand(DOOR.x + .001, HOUSE.g - .004, aA, KA, 1), k = ss(seg(t, H.hand - .1, H.hand + .5));
      M.letter.visible = t > H.hand - .5; M.letter.position.set(lerp(hx, ax + .002, k), lerp(hy, ay, k), lerp(-.043, -.0505, k)); },
    post() { return POST(F(S, -.05), 6, .42); }, grade() { return { vig: .45 }; } };
}

// S6 88.5–120: forty São Joãos in the dark; she lights the lantern; across the river, slowly, another answers; pull out to the lamp on a table
export function s6(E) {
  const M = margem(), { S } = M, H = E.H;
  // the box and the room (seen only in the pull-out)
  S.scene.background = new THREE.Color('#06070b');
  const box = new THREE.Group(); S.scene.add(box);
  const wood = new THREE.MeshStandardMaterial({ color: '#4a2c18', roughness: .55 }), lining = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1 });
  const shape = new THREE.Shape(); shape.moveTo(-.33, -.205); shape.lineTo(.33, -.205); shape.lineTo(.33, .205); shape.lineTo(-.33, .205); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(-.275, -.16); hole.lineTo(.275, -.16); hole.lineTo(.275, .16); hole.lineTo(-.275, .16); hole.closePath(); shape.holes.push(hole);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .02, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2 }), wood); frame.position.z = -.006; frame.castShadow = frame.receiveShadow = true; box.add(frame);
  for (const [w, h, x, y, ry, rx] of [[.17, .33, -.2775, 0, Math.PI / 2, 0], [.17, .33, .2775, 0, -Math.PI / 2, 0], [.56, .17, 0, .1625, 0, Math.PI / 2], [.56, .17, 0, -.1625, 0, -Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lining); m.position.set(x, y, -.07); m.rotation.y = ry; m.rotation.x = rx; box.add(m); }
  const tableM = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: .8 })); tableM.rotation.x = -Math.PI / 2; tableM.position.set(0, -.211, .5); tableM.receiveShadow = true; S.scene.add(tableM);
  const spill = new THREE.PointLight('#ffb870', 0, 1.2, 1.6); spill.position.set(0, -.19, .3); S.scene.add(spill);
  // on the table: a small stack of old letters tied together, and a cup
  const paperM = new THREE.MeshStandardMaterial({ color: '#e6d6b4', roughness: .9 });
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.17, .004, .1), paperM); m.position.set(-.47 + i * .004, -.208 + i * .0045, .16); m.rotation.y = .35 + i * .07; S.scene.add(m); }
  const st = new THREE.Mesh(new THREE.BoxGeometry(.012, .02, .12), new THREE.MeshStandardMaterial({ color: '#c8402c', roughness: .8 })); st.position.set(-.465, -.2, .16); st.rotation.y = .4; S.scene.add(st);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.032, .028, .07, 32), new THREE.MeshStandardMaterial({ color: '#d9cbb0', roughness: .4 })); cup.position.set(.47, -.176, .14); S.scene.add(cup);
  M.leaf.position.x = DOOR.x; M.letter.visible = false;
  const P = track([[88, [-.05, -.04, .4, -.05, -.045, -.07]], [104.5, [-.01, -.028, .52, -.01, -.03, -.07]], [H.pull, [.0, -.022, .57, .0, -.024, -.07]], [119.3, [.0, -.03, 1.42, .0, -.025, -.05]]]);
  const BX = [FARL.x - .07, -.2, FARL.x + .09, .02];
  return { S,
    update(t) { aim(S.cam, P(t), t); moveWaves(M.ws, t); M.doorL.userData.set(0);
      const lit = ss(seg(t, H.light, H.light + .5)), hang = eo(seg(t, H.light - 1.0, H.light - .3));
      // she is at the window; the lantern is hung on the sill, then lit
      M.winL.userData.set(.34 * lit, flick(t + 2)); M.aurora.pose(WIN.x - .007, WIN.y - WIN.h / 2 - .022, { dir: 1, armF: 1.3 * hang, armB: 0 }); M.aurora.g.visible = true;
      M.lant.m.visible = M.lant.gl.visible = hang > 0; M.lant.set(WIN.x + .011, lerp(WIN.y - .03, WIN.y - .004, hang), lit, flick(t));
      // Nico waits in the canoe, watching
      M.nico.pose(.15, -.112 + .004 - .016 * 1.3, { dir: -1, legB: 1.45, legF: 1.38, lean: .06 });
      // the answer: slowly, the far window; then the light crosses the water, streak by streak
      const ans = ss(seg(t, H.answer, H.answer + 3.2)); M.farWin.userData.set(ans, flick(t + 5)); M.farGlow.userData.set(.75 * ans * flick(t + 5));
      M.bridge.forEach((b, i) => { const n = M.bridge.length, a = H.bridge[0] + (H.bridge[1] - H.bridge[0]) * i / n, mine = i >= n - 2 ? .45 * lit : 0, far = i < 2 ? .5 * ans : 0;
        const k = Math.max(mine, far, ss(seg(t, a, a + .8))); b.userData.set(k * (.75 + .25 * Math.sin(t * 2.3 + i * 1.3))); });
      M.balls.forEach((b, i) => { const u = t - H.balloons - i * .7, on = u > 0; b.m.visible = b.gl.visible = on; if (on) b.set(BX[i] + .01 * Math.sin(u * .7 + i), (i % 2 ? HOUSE.g + .14 : .03) + .0085 * u, ss(seg(u, 0, 1.2)), flick(t + i)); });
      const out = ss(seg(t, H.pull, 119.3)); spill.intensity = .7 * out; },
    post(t) { const out = ss(seg(t, H.pull, 119.3)); return POST(F(S, -.08), lerp(6, 3, out), .42); },
    grade(t) { return { vig: lerp(.45, .55, ss(seg(t, H.pull, 119.3))), fade: 1 - ss(seg(t, H.end, 120)) }; } };
}
