// Interior: Dona Zélia's kitchen, a warm stack (another place = another ladder).
// Left: where she fell (cabinet, the night window). Right: the work table, the wood-fired oven, the bedroom doorway.
import * as THREE from 'three';
import { sheet, text } from './paper.js';
import { stage } from './stage.js';
import { mulberry, TAU } from './lib.js';
import { PAPER, tint, cut, winLight, glow, person } from './kit.js';

export const FLOOR = -.1;
export const OVEN = { x: .27, y: FLOOR + .028, r: .045 };
export const BED = { x: .02, y: FLOOR + .045, w: .07, h: .085 };
export const STRIPS = [['2 xícaras de polvilho', .12], ['1 de queijo meia-cura', .105], ['leite morno, 1 ovo, sal', .095], ['e paciência', .085]];

// Dona Zélia seated on the floor against the cabinet (legs out, facing right), or sitting up in bed
function zelia(S, z, pose) {
  const { U } = S, g = new THREE.Group(), H = .034;
  const body = tint(S.add(sheet({ U, w: .05, h: .04, ay: -.015, trans: .05, ppm: 14000, draw: x => { x.fillStyle = PAPER; x.translate(0, -.015);
    if (pose === 'floor') {
      x.beginPath(); x.moveTo(-.008, 0); x.lineTo(.03, 0); x.lineTo(.031, .0035); x.lineTo(.004, .006); x.lineTo(.003, .019); x.quadraticCurveTo(-.001, .023, -.006, .019); x.lineTo(-.009, .004); x.closePath(); x.fill();
      x.beginPath(); x.ellipse(.031, .003, .002, .0035, 0, 0, TAU); x.fill();                             // feet
      x.beginPath(); x.arc(-.002, .0245, H * .085, 0, TAU); x.fill();                                       // head
    } else {
      x.beginPath(); x.moveTo(-.006, 0); x.lineTo(.006, 0); x.lineTo(.0055, .016); x.quadraticCurveTo(0, .02, -.0055, .016); x.closePath(); x.fill();
      x.beginPath(); x.arc(0, .0215, H * .085, 0, TAU); x.fill();
    }
  } })), '#1a0c08');
  const scarf = tint(S.add(sheet({ U, w: .01, h: .008, trans: .15, ppm: 16000, shadow: false, draw: x => { x.fillStyle = PAPER;
    x.beginPath(); x.arc(0, .0004, H * .092, Math.PI * .95, TAU * 1.03); x.fill(); x.beginPath(); x.moveTo(-.0028, -.0003); x.lineTo(-.0048, -.0035); x.lineTo(-.0018, -.0012); x.closePath(); x.fill(); } })), '#c0392b');
  const arm = tint(S.add(sheet({ U, w: .01, h: .02, ay: .006, trans: .05, ppm: 14000, draw: x => { x.fillStyle = PAPER; x.translate(0, .006); x.beginPath(); x.roundRect(-.001, -.0105, .002, .011, .001); x.fill(); x.beginPath(); x.arc(0, -.0105, .0014, 0, TAU); x.fill(); } })), '#1a0c08');
  const hy = pose === 'floor' ? .0245 : .0215;
  scarf.position.set(pose === 'floor' ? -.002 : 0, hy + .0012, .0006); arm.position.set(pose === 'floor' ? .0 : .001, pose === 'floor' ? .016 : .015, .0008); body.position.set(0, 0, 0);
  S.scene.remove(body, scarf, arm); g.add(body, scarf, arm); g.position.z = z; S.scene.add(g);
  return { g, arm, set(px, py, k = 1, armA = 0) { g.position.set(px, py, z); g.scale.setScalar(k); arm.rotation.z = armA; } };
}

export function casa(o = {}) {
  const S = stage({ light: [.2, -.04, -.14], lightR: .2, lightCol: '#ffcf8a', key: 1.1, keyCol: '#ffe6c8', amb: .25, ambCol: '#a07050', floor: .35, keyPos: [-.02, .3, .3], keyTarget: [0, -.04, -.09], keyAngle: 1.05 });
  const { U } = S, W = .9;
  // back wall: plaster, a night window on the left, a doorway to the bedroom, shelves
  const wall = tint(S.add(sheet({ U, w: W, h: .36, z: -.135, trans: .9, ppm: 2600, draw: x => { x.fillStyle = PAPER; x.fillRect(-W / 2, -.18, W, .36);
    cut(x, () => { x.fillRect(-.33, -.02, .06, .07); x.fillRect(BED.x - BED.w / 2, FLOOR, BED.w, BED.h); }); } })), '#e2b884');
  const night = winLight(S, -.3, .015, -.138, .066, .076, '#3a4c86', 1, new THREE.Color('#0d1636')); night.userData.set(.6);
  const bedLight = winLight(S, BED.x, FLOOR + BED.h / 2, -.1395, BED.w + .004, BED.h + .004, '#ffd290', 1.25, new THREE.Color('#3a2010'));
  // the bedroom seen through the doorway: a bed, Zélia sitting up in it
  const bed = tint(S.add(sheet({ U, w: .08, h: .05, x: BED.x, y: FLOOR + .02, z: -.1385, trans: .1, ppm: 9000, shadow: false, draw: x => { x.fillStyle = PAPER;
    x.fillRect(-.032, -.02, .064, .016); x.fillRect(-.034, -.024, .003, .03); x.fillRect(.031, -.024, .003, .018); x.beginPath(); x.ellipse(-.024, .0, .009, .004, 0, 0, TAU); x.fill(); } })), '#5a2c18');
  const zBed = zelia(S, -.1388, 'bed'); zBed.set(BED.x - .018, FLOOR + .01, 1.25);
  const shelf = tint(S.add(sheet({ U, w: W, h: .36, z: -.118, trans: .55, ppm: 3200, draw: x => { x.fillStyle = PAPER; const r = mulberry(8);
    x.fillRect(-.24, .04, .2, .004); x.fillRect(.1, .055, .14, .004);
    for (let u = -.23; u < -.05; u += .014 + r() * .006) { const h = .008 + r() * .01, w = .006 + r() * .004; x.beginPath(); x.roundRect(u, .044, w, h, .0015); x.fill(); }
    for (const u of [.12, .15, .19, .22]) { x.beginPath(); x.arc(u, .07, .006 + r() * .003, 0, TAU); x.fill(); x.fillRect(u - .0005, .058, .001, .006); }   // hanging pans
    x.fillRect(-W / 2, FLOOR - .08, W, .08); } })), '#b77444');
  // the hanging lamp over the table (S6) and its glow
  const lamp = tint(S.add(sheet({ U, w: .03, h: .1, x: .15, y: .125, z: -.1, trans: .3, shadow: false, ppm: 9000, draw: x => { x.fillStyle = PAPER; x.fillRect(-.0005, -.01, .001, .06); x.beginPath(); x.moveTo(-.012, -.018); x.quadraticCurveTo(0, -.002, .012, -.018); x.closePath(); x.fill(); } })), '#3a1a0c');
  const bulb = glow(S, .035, '#ffd08a'); bulb.position.set(.15, .105, -.098);
  // the cabinet and counter (left, where she fell) and the work table (right)
  const mid = tint(S.add(sheet({ U, w: W, h: .36, z: -.095, trans: .22, ppm: 4200, draw: x => { x.fillStyle = PAPER;
    x.fillRect(-.42, FLOOR, .19, .05); x.fillRect(-.425, FLOOR + .05, .2, .004);
    cut(x, () => { x.lineWidth = .0007; for (const u of [-.4, -.34, -.28]) x.strokeRect(u, FLOOR + .008, .045, .036); });
    // the oven: a dome of brick with a mouth, a chimney
    x.beginPath(); x.moveTo(OVEN.x - OVEN.r * 1.3, FLOOR); x.lineTo(OVEN.x - OVEN.r * 1.3, OVEN.y); x.arc(OVEN.x, OVEN.y, OVEN.r * 1.3, Math.PI, 0, true); x.lineTo(OVEN.x + OVEN.r * 1.3, FLOOR); x.closePath(); x.fill();
    x.fillRect(OVEN.x + .02, OVEN.y + OVEN.r * 1.1, .012, .12);
    cut(x, () => { x.beginPath(); x.moveTo(OVEN.x - .016, OVEN.y - .012); x.lineTo(OVEN.x - .016, OVEN.y + .004); x.arc(OVEN.x, OVEN.y + .004, .016, Math.PI, 0, true); x.lineTo(OVEN.x + .016, OVEN.y - .012); x.closePath(); x.fill();
      x.lineWidth = .0006; for (let a = .15; a < 3; a += .26) { x.beginPath(); x.arc(OVEN.x, OVEN.y, OVEN.r * 1.18, a, a + .2); x.stroke(); } });
  } })), '#7c3a1e');
  const fire = winLight(S, OVEN.x, OVEN.y - .002, -.0975, .036, .034, '#ff9a3a', 3.0, new THREE.Color('#200a04'));
  const fireGlow = glow(S, .06, '#ff9a48'); fireGlow.position.set(OVEN.x, OVEN.y, -.093);
  // recipe strips on the wall (paper that writes itself): cream strips, dark ink, grown from the left edge
  const strips = STRIPS.map(([s, w], i) => { const m = S.add(sheet({ U, w, h: .016, ax: -w / 2, x: -.06 - w / 2 + .0, y: .03 - i * .022, z: -.128, trans: .5, shadow: false, recv: false, ppm: 9000, finish: { rim: .3, under: .22 }, draw: x => {
      x.fillStyle = '#f1e2c2'; x.beginPath(); x.roundRect(-w / 2, -.007, w, .014, .001); x.fill(); text(x, s, -w / 2 + .005, -.0003, .0085, '"Cormorant"', { fill: '#2a160c', weight: 700, align: 'left' }); } }));
    m.position.x = .062; return m; });
  // figures: Zélia on the floor, the helpers
  const zFloor = zelia(S, -.076, 'floor');
  const nurse = person(S, 'nurse', -.072, '#200f08'), boy = person(S, 'boy', -.07, '#200f08'), driver = person(S, 'driver', -.073, '#200f08');
  for (const p of [nurse, boy, driver]) p.k = 1.25;
  const table = tint(S.add(sheet({ U, w: W, h: .36, z: -.062, trans: .08, ppm: 4200, draw: x => { x.fillStyle = PAPER;
    x.fillRect(.02, FLOOR + .036, .2, .006); x.fillRect(.03, FLOOR - .01, .005, .047); x.fillRect(.205, FLOOR - .01, .005, .047); } })), '#3a1a0e');
  // the tray of pão de queijo (balls appear one by one), and the dough bowl
  const balls = [];
  const tray = tint(S.add(sheet({ U, w: .08, h: .01, x: .12, y: FLOOR + .043, z: -.061, trans: .1, ppm: 12000, draw: x => { x.fillStyle = PAPER; x.fillRect(-.036, -.002, .072, .003); } })), '#2a120a');
  for (let i = 0; i < 9; i++) { const b = tint(S.add(sheet({ U, w: .008, h: .008, x: .09 + i * .0075, y: FLOOR + .0455, z: -.0612, trans: .35, shadow: false, ppm: 14000, finish: { rim: .5, under: .2 }, draw: x => { x.fillStyle = PAPER; x.beginPath(); x.ellipse(0, 0, .003, .0026, 0, 0, TAU); x.fill(); } })), '#e8b060'); b.scale.setScalar(0.001); balls.push(b); }
  const front = tint(S.add(sheet({ U, w: W, h: .36, z: -.03, trans: .04, ppm: 3000, draw: x => { x.fillStyle = PAPER; const r = mulberry(5);
    x.fillRect(-W / 2, -.18, W, .062); x.beginPath(); x.moveTo(-W / 2, -.118); for (let u = -W / 2; u <= W / 2; u += .004) x.lineTo(u, -.118 + .0012 * Math.sin(u * 70)); x.lineTo(W / 2, -.18); x.lineTo(-W / 2, -.18); x.fill();
    // a chair (left), a sack of flour (centre), firewood (right)
    x.fillRect(-.16, -.118, .003, .05); x.fillRect(-.135, -.118, .003, .028); x.fillRect(-.16, -.093, .028, .003);
    x.beginPath(); x.moveTo(.0, -.118); x.quadraticCurveTo(-.003, -.09, .008, -.087); x.lineTo(.022, -.087); x.quadraticCurveTo(.032, -.09, .03, -.118); x.closePath(); x.fill();
    for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(.33 + (i % 3) * .012, -.112 + Math.floor(i / 3) * .009, .006, .0045, 0, 0, TAU); x.fill(); }
  } })), '#150905');
  const sack = S.add(sheet({ U, w: .03, h: .012, x: .015, y: -.1, z: -.0295, trans: .2, shadow: false, ppm: 12000, finish: { rim: 0, under: 0 }, draw: x => { text(x, 'POLVILHO', 0, 0, .0045, '"Cormorant"', { fill: '#3a2414', weight: 700 }); } }));
  return { S, U, wall, night, bedLight, zBed, shelf, lamp, bulb, mid, fire, fireGlow, strips, zFloor, nurse, boy, driver, table, tray, balls, front, W };
}
