// The eight shots. Each: build(E) → { S, update(t), post(t), grade(t) }, t in film seconds.
import * as THREE from 'three';
import { aim } from './stage.js';
import { sheet, text } from './paper.js';
import { ss, seg, clamp, lerp, eio, eo, ei, track, vnoise, TAU, mulberry } from './lib.js';
import { rua, STREET, FEET, BW, BAK, DOOR, CLOCK } from './rua.js';
import { casa, FLOOR, OVEN, BED } from './casa.js';
import { PAPER, tint, glow } from './kit.js';

const flick = t => 1 + .06 * Math.sin(7.3 * t) * Math.sin(3.1 * t);
const POST = (focus, aper = 8, bloom = .38) => ({ focus, aper, maxCoc: 10, bloom: { strength: bloom, radius: .55, threshold: 1.1 } });
// focus on a layer: distance from the camera to plane z
const F = (S, z) => S.cam.position.z - z;
// world point → screen uv (for the iris)
const toUV = (cam, p) => { const v = new THREE.Vector3(...p).project(cam); return [(v.x + 1) / 2, (v.y + 1) / 2]; };

// common street state: chimney smoke drifting up, the bakery lit or not
function street(R, t, o) {
  const k = o.bak ?? 1;
  R.bakWin.userData.set(k, flick(t)); R.halo.userData.set(.55 * k * flick(t)); R.bakDoorL.userData.set(o.door ?? 0, flick(t + 1));
  R.smoke.forEach((m, i) => { const ph = ((t * .05 + i / R.smoke.length) % 1); m.position.set(BAK.x + .03 + ph * .012 + Math.sin(t * .4 + i) * .003, STREET + .095 + ph * .06, -.0795);
    m.scale.setScalar(.6 + ph * 1.1); m.material.opacity = 1; m.visible = (o.smoke ?? 1) > 0 && ph < .92; });
  R.U.uLit.value = o.lit ?? .8;
}
const hideFigs = R => { for (const p of [R.nurse, R.boy]) p.g.visible = false; R.bk.g.visible = false; R.bs.g.visible = false; };

// S1 0–10: darkness and one hole: a pinprick widens into the lit bakery window
export function s1(E) {
  const R = rua(), { S } = R, H = E.H; hideFigs(R);
  for (const w of R.winsAll) w.userData.set(0);
  const P = track([[0, [BW.x + .003, BW.y + .001, .17, BW.x, BW.y, -.074]], [10.6, [BW.x + .016, BW.y + .008, .235, BW.x + .01, BW.y + .004, -.074]]]);
  let iris = [.5, .5, 9];
  return { S,
    update(t) { street(R, t, { bak: 1, lit: .2 + .6 * ss(seg(t, H.iris[0], H.iris[1])) }); aim(S.cam, P(t), t);
      const r = t < H.pin ? 0 : t < H.iris[0] ? lerp(.006, .03, eo(seg(t, H.pin, H.iris[0]))) : lerp(.03, 1.4, ei(seg(t, H.iris[0], H.iris[1])) * .6 + ss(seg(t, H.iris[0], H.iris[1])) * .4);
      S.cam.updateMatrixWorld(); const c = toUV(S.cam, [BW.x, BW.y + .002, BAK.z]); iris = [c[0], c[1], t < H.pin - .05 ? 0 : r]; },
    post() { return POST(F(S, BAK.z), 7, .45); },
    grade(t) { return { iris, vig: .45 }; } };
}

// S2 10–22: dolly out: one light in a whole dark street; the church clock at three
export function s2(E) {
  const R = rua(), { S } = R; hideFigs(R);
  for (const w of R.winsAll) w.userData.set(0);
  const P = track([[9.0, [-.15, -.06, .27, -.15, -.065, -.08]], [21.6, [.005, -.005, .575, .0, -.004, -.08]]]);
  return { S, update(t) { street(R, t, { bak: 1 }); aim(S.cam, P(eio(seg(t, 9, 21.6)) * 12.6 + 9), t); },
    post() { return POST(F(S, -.08), 6); }, grade() { return { vig: .42 }; } };
}

// S3 22–35.2: travelling along the street at walking height: the nurse, the boy on his bike, the first bus
export function s3(E) {
  const R = rua(), { S } = R, H = E.H;
  for (const w of R.winsAll) w.userData.set(0);
  const P = track([[22, [-.255, -.084, .235, -.255, -.087, -.06]], [35.4, [-.1, -.082, .25, -.1, -.086, -.06]]]);
  return { S,
    update(t) { street(R, t, { bak: 1 }); aim(S.cam, P(t), t);
      const nx = -.34 + .026 * (t - H.nurse[0]); R.nurse.pose(nx, FEET, { dir: 1, amp: 1, ph: (nx + .34) / .0105 * Math.PI / 2 });
      const bt = t - H.boy[0], bx = .02 - .095 * bt; R.bk.set(bx, FEET - .0005, -1, .095 * Math.max(0, bt)); R.bk.g.visible = bt > -.2 && bx > -.4;
      R.boy.pose(bx + .002, FEET + .0075, { dir: -1, legB: -.9 + .5 * Math.sin(bt * 9), legF: -.9 - .5 * Math.sin(bt * 9), armF: -1.1, armB: -1.0, lean: .15, vis: R.bk.g.visible });
      // the bus: comes in from the left and brakes to a stop by the houses; s(t) = distance driven
      const u = seg(t, H.bus[0], 33.6), d = .33 * (1 - Math.pow(1 - u, 2.2)); R.bs.set(-.42 + d, FEET - .001, d, 1); R.bs.g.visible = t > H.bus[0] - .1; },
    post() { return POST(F(S, -.05), 7); }, grade() { return { vig: .4 }; } };
}

// S4 35.2–48: another night: three bells, and the window stays dark. Silence. The street stops.
export function s4(E) {
  const R = rua(), { S } = R, H = E.H;
  for (const w of R.winsAll) w.userData.set(0); R.bs.g.visible = false;
  const P = track([[35, [-.19, -.074, .27, -.19, -.079, -.074]], [48.5, [-.185, -.08, .225, -.185, -.083, -.074]]]);
  return { S,
    update(t) { street(R, t, { bak: 0, smoke: 0, lit: .55 }); aim(S.cam, P(t), t);
      // the clock face pulses with each bell
      let b = 0; for (const h of H.bells) b = Math.max(b, Math.exp(-Math.max(0, t - h) * 3) * (t > h ? 1 : 0)); R.clockFace.userData.set(.45 + .4 * b);
      const nu = seg(t, H.nurse2[0], H.nurse2[1]), nx = lerp(-.33, -.212, 1 - Math.pow(1 - nu, 1.6)), walking = nu > 0 && nu < 1;
      R.nurse.pose(nx, FEET, { dir: 1, amp: walking ? 1 - ss(seg(nu, .8, 1)) : 0, ph: (nx + .33) / .0105 * Math.PI / 2, vis: t > H.nurse2[0] });
      const bu = seg(t, H.boy2[0], H.boy2[1]), bd = .2 * (1 - Math.pow(1 - bu, 2)), bx = -.0 - bd; R.bk.set(bx, FEET - .0005, -1, bd); R.bk.g.visible = t > H.boy2[0];
      const off = ss(seg(t, H.boy2[1], H.boy2[1] + .7));   // he gets off: steps down beside the bike
      R.boy.pose(bx + .002 - off * .012, FEET + .0075 * (1 - off), { dir: -1, legB: lerp(-.9, 0, off), legF: lerp(-.9, 0, off), armF: lerp(-1.1, -.2, off), armB: lerp(-1.0, .1, off), lean: .15 * (1 - off), vis: R.bk.g.visible }); },
    post() { return POST(F(S, -.06), 7); }, grade(t) { return { vig: .48, expo: .92 }; } };
}

// S5 48–53: close on the red door: a flashlight, three knocks, the door slides open
export function s5(E) {
  const R = rua(), { S, U } = R, H = E.H;
  for (const w of R.winsAll) w.userData.set(0); R.bs.g.visible = false;
  const P = track([[47, [-.176, -.086, .2, -.176, -.088, -.074]], [53.5, [-.172, -.088, .155, -.172, -.088, -.074]]]);
  return { S,
    update(t) { street(R, t, { bak: 0, smoke: 0, lit: .5, door: .85 * ss(seg(t, H.open, H.open + 1)) }); aim(S.cam, P(t), t);
      let kn = 0; for (const h of H.knock) kn = Math.max(kn, Math.exp(-Math.max(0, t - h) * 14) * (t >= h ? 1 : 0));
      const raise = ss(seg(t, 48.15, 48.5)) * (1 - ss(seg(t, 50.0, 50.6)));
      R.nurse.pose(-.193, FEET, { dir: 1, armF: raise * (1.45 - .25 * kn), armB: 0, lean: -.03 * raise });
      R.bk.set(-.137, FEET - .0005, -1, 0); R.boy.pose(-.152, FEET, { dir: -1, armF: 1.3, armB: .1 });
      const op = ss(seg(t, H.open, H.open + 1.2));
      R.doorL.position.x = DOOR.x - DOOR.w / 4 - op * DOOR.w * .55; R.doorR.position.x = DOOR.x + DOOR.w / 4 + op * DOOR.w * .55;
      // the boy's flashlight: a soft wedge from his hand to the door
      U.uBeamO.value.set(-.158, FEET + .019, .7 * (1 - .6 * op)); U.uBeamD.value.set(Math.PI * .93, .2, .09); },
    post() { return POST(F(S, -.065), 6); }, grade() { return { vig: .5 }; } };
}

// S5b 53–60.2: inside: Dona Zélia on the kitchen floor; the nurse kneels; she is all right
export function s5b(E) {
  const C = casa(), { S } = C;
  C.driver.g.visible = false; C.balls.forEach(b => b.visible = false); C.strips.forEach(m => m.visible = false); C.tray.visible = false;
  const P = track([[52, [-.26, -.055, .26, -.25, -.065, -.09]], [60.5, [-.235, -.06, .2, -.235, -.068, -.09]]]);
  return { S,
    update(t) { aim(S.cam, P(t), t); C.U.uLit.value = .55; C.U.uLight.value.set(-.2, -.06, -.14); C.U.uLightR.value = .14;
      C.fire.userData.set(.35, flick(t)); C.fireGlow.userData.set(.2); C.bulb.userData.set(0); C.bedLight.userData.set(.3);
      C.zFloor.set(-.25, FLOOR - .014, 1.25, lerp(-.25, 1.1, ss(seg(t, 57.6, 58.6))));
      C.nurse.pose(-.205, FLOOR - .014, { dir: -1, lean: -.1, armF: lerp(.75, .45, ss(seg(t, 57.6, 58.6))), armB: .35 });
      C.boy.pose(-.33, FLOOR - .014, { dir: 1, armF: 1.2, armB: .05 });
      C.U.uBeamO.value.set(-.322, FLOOR + .02, .5); C.U.uBeamD.value.set(-.15, .18, .1); },
    post() { return POST(F(S, -.075), 6, .4); }, grade() { return { vig: .42 }; } };
}

// S6 60.2–73.6: the street makes the bread; she dictates from her bed; the recipe writes itself; into the oven
export function s6(E) {
  const C = casa(), { S } = C, H = E.H;
  C.zFloor.g.visible = false;
  const P = track([[59.5, [-.03, -.04, .31, -.03, -.05, -.09]], [66.5, [.11, -.03, .31, .11, -.04, -.09]], [72.2, [.14, -.025, .28, .14, -.03, -.09]], [74.2, [.25, -.05, .24, .26, -.055, -.09]]]);
  return { S,
    update(t) { aim(S.cam, P(t), t); C.U.uLit.value = 1; C.U.uLight.value.set(.12, .02, -.14); C.U.uLightR.value = .22;
      const blaze = ss(seg(t, H.oven, H.oven + .8));
      C.fire.userData.set(.8 + .6 * blaze, flick(t * 1.6)); C.fireGlow.userData.set(.45 + 1.6 * blaze); C.bulb.userData.set(.6); C.bedLight.userData.set(.9, flick(t + 3));
      // kneading on the beat: arms swing down and up
      const kn = (o) => .55 + .35 * Math.sin((t + o) * 4.4);
      C.nurse.pose(.07, FLOOR - .01, { dir: 1, armF: kn(0), armB: kn(.4), lean: .12 });
      C.boy.pose(.175, FLOOR - .01, { dir: -1, armF: kn(.7), armB: kn(1.1), lean: .1 });
      C.driver.pose(.125, FLOOR - .012, { dir: 1, armF: kn(.25) * .8, armB: .3, lean: .06, k: 1.32 });
      C.balls.forEach((b, i) => { const a = 61.5 + i * .55; b.scale.setScalar(Math.max(.001, eo(seg(t, a, a + .25)))); b.visible = t < H.oven; });
      C.tray.visible = t < H.oven;
      // her arm in the doorway: dictating (65.6 – 72)
      C.zBed.set(BED.x - .018, FLOOR + .01, 1.25, t > 65.2 && t < 72.5 ? .9 + .35 * Math.sin((t - 65.2) * 3.2) : .2);
      C.strips.forEach((m, i) => { const s = eo(seg(t, H.strips[i], H.strips[i] + .9)); m.visible = s > .001; m.scale.x = Math.max(.001, s); m.material.map.repeat.x = Math.max(.001, s); }); },
    post(t) { return POST(F(S, -.07), 6, .42 + .3 * ss(seg(t, H.oven, H.oven + 1))); }, grade(t) { return { vig: .38, expo: 1 + .35 * ss(seg(t, H.oven + .2, H.oven + 1.1)) }; } };
}

// S7 73.6–90: today: windows light one by one up the hill; pull out of the box to the lamp on a table; the title
export function s7(E) {
  const R = rua(), { S } = R, H = E.H; hideFigs(R);
  const order = [...R.wins].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x).concat(R.upWins);
  // the box: wooden frame with a cavity window, black lining, a table, a dark room
  S.scene.background = new THREE.Color('#06070b');
  const box = new THREE.Group(); S.scene.add(box);
  const wood = new THREE.MeshStandardMaterial({ color: '#4a2c18', roughness: .55 }), lining = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1 });
  const shape = new THREE.Shape(); shape.moveTo(-.33, -.205); shape.lineTo(.33, -.205); shape.lineTo(.33, .205); shape.lineTo(-.33, .205); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(-.275, -.16); hole.lineTo(.275, -.16); hole.lineTo(.275, .16); hole.lineTo(-.275, .16); hole.closePath(); shape.holes.push(hole);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .02, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2 }), wood); frame.position.z = -.006; frame.castShadow = frame.receiveShadow = true; box.add(frame);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(.66, .41, .17), wood); shell.position.z = -.075 - .006; box.add(shell);
  for (const [w, h, x, y, ry, rx] of [[.17, .33, -.2775, 0, Math.PI / 2, 0], [.17, .33, .2775, 0, -Math.PI / 2, 0], [.56, .17, 0, .1625, 0, Math.PI / 2], [.56, .17, 0, -.1625, 0, -Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lining); m.position.set(x, y, -.07); m.rotation.y = ry; m.rotation.x = rx; box.add(m); }
  shell.visible = false;
  const tableM = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: .8 })); tableM.rotation.x = -Math.PI / 2; tableM.position.set(0, -.211, .5); tableM.receiveShadow = true; S.scene.add(tableM);
  const spill = new THREE.PointLight('#ffb870', 0, 1.2, 1.6); spill.position.set(0, -.19, .3); S.scene.add(spill);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.032, .028, .07, 32), new THREE.MeshStandardMaterial({ color: '#d9cbb0', roughness: .4 })); cup.position.set(.47, -.176, .14); S.scene.add(cup);
  const bread = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.022, 24, 16), new THREE.MeshStandardMaterial({ color: '#d79a4c', roughness: .7 })); b.scale.y = .8; b.position.set(-.48 + (i % 2) * .05, -.193, .12 + Math.floor(i / 2) * .05); bread.add(b); } S.scene.add(bread);
  // the title: a cream strip cut inside the box, grown from its left edge
  const TW = .3;
  const title = S.add(sheet({ U: R.U, w: TW, h: .05, ax: -TW / 2, z: -.02, trans: .45, shadow: false, recv: false, ppm: 9000, finish: { rim: .35, under: .25 }, draw: x => {
    x.fillStyle = '#efdfbd'; x.beginPath(); x.roundRect(-TW / 2, -.022, TW, .044, .003); x.fill(); text(x, 'A Luz das Três', 0, -.0008, .03, '"Cormorant"', { fill: '#1c1830', weight: 700 }); } }));
  title.position.set(-.255, .112, -.02);
  const P = track([[73, [-.15, -.06, .34, -.15, -.065, -.08]], [81.5, [.0, .0, .57, .0, .0, -.08]], [82.8, [.0, .0, .6, .0, .0, -.08]], [88.6, [.0, -.03, 1.42, .0, -.025, -.05]]]);
  return { S,
    update(t) { street(R, t, { bak: 1, lit: .85 }); aim(S.cam, P(t), t);
      order.forEach((w, i) => { const a = H.wins[Math.min(i, H.wins.length - 1)] + (i >= H.wins.length ? (i - H.wins.length + 1) * .18 : 0); w.userData.set(ss(seg(t, a, a + .25)), flick(t + i * .7)); });
      R.churchDoor.userData.set(ss(seg(t, 80.2, 81)) * .8);
      const out = ss(seg(t, H.pull, 88.6)); spill.intensity = .7 * out; R.front.material.color.set('#0c1230').multiplyScalar((1 / .604) * 1);
      const s = eo(seg(t, H.title, H.title + 1.1)); title.visible = s > .001; title.scale.x = Math.max(.001, s); title.material.map.repeat.x = Math.max(.001, s); },
    post(t) { const out = ss(seg(t, H.pull, 88.6)); return POST(F(S, -.08), lerp(6, 3, out), .4); },
    grade(t) { return { vig: lerp(.42, .55, ss(seg(t, H.pull, 88.6))), fade: 1 - ss(seg(t, H.end, 90)) }; } };
}
