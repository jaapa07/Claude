// Exterior: Rua da Ladeira at 3 a.m. One geography for every street shot (S1–S4, S7):
// the bakery at the foot of the hill (left), houses stepping up the slope, the church with its clock on top (right), a flat street in front.
import * as THREE from 'three';
import { sheet, skyPanel, text } from './paper.js';
import { stage } from './stage.js';
import { mulberry, TAU } from './lib.js';
import { PAPER, tint, cut, winLight, glow, person, bike, bus } from './kit.js';

export const STREET = -.106;                                   // top of the street line on the bakery layer
export const FEET = -.1165;                                    // where figures stand (in front, on the pavement)
export const slopeY = x => STREET + Math.max(0, x + .125) * .4;
export const BAK = { x: -.195, w: .1, h: .07, z: -.074 };       // the bakery
export const BW = { x: BAK.x - .022, y: STREET + .036, w: .028, h: .034 };   // its arched window
export const DOOR = { x: BAK.x + .025, w: .021, h: .044 };
export const CLOCK = { x: .162, y: .109, r: .0075 };

const roof = (x, x0, x1, y, h, over = .004) => { x.beginPath(); x.moveTo(x0 - over, y); x.lineTo(x0 + (x1 - x0) * .18, y + h); x.lineTo(x1 - (x1 - x0) * .18, y + h); x.lineTo(x1 + over, y); x.closePath(); x.fill(); };
const tiles = (x, x0, x1, y, h) => cut(x, () => { x.lineWidth = .00045; for (let k = 1; k < 4; k++) { const yy = y + h * k / 4, sh = (x1 - x0) * .18 * k / 4; x.beginPath(); x.moveTo(x0 + sh, yy); x.lineTo(x1 - sh, yy); x.stroke(); } });

export function rua(o = {}) {
  const S = stage({ light: [.02, .02, -.13], lightR: .2, lightCol: '#9fb4ea', key: .9, keyCol: '#c8d4ff', amb: .2, ambCol: '#5a6ca8', floor: .3, keyPos: [-.06, .32, .32], keyTarget: [0, -.03, -.09], keyAngle: 1.0 });
  const { U } = S;
  S.add(skyPanel({ w: .62, h: .38, z: -.142, stops: [[0, '#050a20'], [.5, '#0c173c'], [.85, '#1a2a58'], [1, '#22346a']], stars: 420, starMinY: -.01, seed: 9 }));
  // far hills of the countryside
  const hills = tint(S.add(sheet({ U, w: .6, h: .35, z: -.13, trans: .85, ppm: 3200, draw: x => { x.fillStyle = PAPER;
    x.beginPath(); x.moveTo(-.3, -.2); for (let u = -.3; u <= .3; u += .003) x.lineTo(u, .045 + .02 * Math.sin(u * 9 + 1) + .01 * Math.sin(u * 23)); x.lineTo(.3, -.2); x.closePath(); x.fill(); } })), '#6a86c2');
  // upper town: little houses on the crest and the church with the clock
  const UP = [[-.06, .05, .03], [-.025, .056, .026], [.01, .062, .03], [.05, .07, .028], [.255, .085, .03]];
  const upWins = [];
  const upper = tint(S.add(sheet({ U, w: .6, h: .35, z: -.112, trans: .6, ppm: 4200, draw: x => { x.fillStyle = PAPER;
    x.beginPath(); x.moveTo(-.3, -.2); for (let u = -.3; u <= .3; u += .003) x.lineTo(u, .035 + Math.max(0, u + .1) * .16 + .004 * Math.sin(u * 40)); x.lineTo(.3, -.2); x.closePath(); x.fill();
    for (const [cx, by, w] of UP) { x.fillRect(cx - w / 2, by - .01, w, .026); roof(x, cx - w / 2, cx + w / 2, by + .016, .008); }
    // church: nave, two towers, a pediment, the clock in the left tower
    const cx = .19, by = .062; x.fillRect(cx - .035, by - .01, .07, .05); x.beginPath(); x.moveTo(cx - .037, by + .04); x.quadraticCurveTo(cx, by + .062, cx + .037, by + .04); x.closePath(); x.fill();
    for (const tx of [-.028, .028]) { x.fillRect(cx + tx - .009, by + .02, .018, .045); x.beginPath(); x.moveTo(cx + tx - .011, by + .065); x.lineTo(cx + tx, by + .078); x.lineTo(cx + tx + .011, by + .065); x.closePath(); x.fill();
      x.fillRect(cx + tx - .0006, by + .078, .0012, .006); x.fillRect(cx + tx - .0028, by + .0815, .0056, .0011); }
    cut(x, () => { x.beginPath(); x.arc(cx - .028, by + .047, CLOCK.r, 0, TAU); x.fill(); x.beginPath(); x.arc(cx + .028, by + .047, .004, Math.PI, 0); x.rect(cx + .024, by + .039, .008, .008); x.fill();
      x.beginPath(); x.arc(cx, by + .0, .007, Math.PI, 0); x.rect(cx - .007, by - .01, .014, .01); x.fill();
      for (const [ux, uy, w] of UP) { x.fillRect(ux - w * .25 - .002, uy - .002, .005, .007); x.fillRect(ux + w * .25 - .003, uy - .002, .005, .007); } });
  } })), '#55709f');
  for (const [ux, uy, w] of UP) { upWins.push(winLight(S, ux - w * .25 + .0005, uy + .0015, -.1135, .008, .01, '#ffb862', 2.2), winLight(S, ux + w * .25 - .0005, uy + .0015, -.1135, .008, .01, '#ffb862', 2.2)); }
  const clockFace = winLight(S, CLOCK.x, CLOCK.y, -.1135, .02, .02, '#ffe7b8', 1.2, new THREE.Color('#1a2448'));
  clockFace.userData.set(.45);
  const hands = tint(S.add(sheet({ U, w: .018, h: .018, x: CLOCK.x, y: CLOCK.y, z: -.1108, trans: .05, shadow: false, ppm: 16000, finish: { rim: 0, under: 0 }, draw: x => { x.fillStyle = PAPER;
    x.fillRect(-.0005, 0, .001, .0058); x.fillRect(0, -.00045, .0042, .0009); x.beginPath(); x.arc(0, 0, .0009, 0, TAU); x.fill();
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; x.fillRect(Math.cos(a) * .0064 - .0003, Math.sin(a) * .0064 - .0003, .0006, .0006); } } })), '#141b38');   // 3:00
  const churchDoor = winLight(S, .19, .058, -.1135, .016, .02, '#ffb862', 1.6);
  // the slope: houses stepping up the hill (colonial row, tiled roofs, shuttered windows)
  const HS = [], R = mulberry(4);
  for (let i = 0; i < 7; i++) { const x0 = -.118 + i * .056, w = .05, b = slopeY(x0 + w / 2) - .004, h = .036 + R() * .012; HS.push({ x0, w, b, h }); }
  const wins = [];
  const slope = tint(S.add(sheet({ U, w: .6, h: .35, z: -.088, trans: .22, ppm: 4800, draw: x => { x.fillStyle = PAPER;
    x.beginPath(); x.moveTo(-.3, -.2); x.lineTo(-.3, STREET); for (let u = -.3; u <= .3; u += .002) x.lineTo(u, slopeY(u)); x.lineTo(.3, -.2); x.closePath(); x.fill();
    for (const H of HS) { x.fillRect(H.x0, H.b, H.w, H.h); roof(x, H.x0, H.x0 + H.w, H.b + H.h, .011); tiles(x, H.x0, H.x0 + H.w, H.b + H.h, .011); x.fillRect(H.x0 + H.w * .72, H.b + H.h + .004, .004, .011); }
    cut(x, () => { for (const H of HS) { for (const f of [.24, .58]) x.fillRect(H.x0 + H.w * f - .0045, H.b + H.h * .42, .009, .012); x.fillRect(H.x0 + H.w * .82 - .004, H.b, .008, .016); } });
    x.save(); for (const H of HS) for (const f of [.24, .58]) { x.fillRect(H.x0 + H.w * f - .0072, H.b + H.h * .42 - .0008, .0024, .0136); x.fillRect(H.x0 + H.w * f + .0048, H.b + H.h * .42 - .0008, .0024, .0136); } x.restore();   // shutters
  } })), '#3f5a92');
  for (const H of HS) for (const f of [.24, .58]) wins.push(winLight(S, H.x0 + H.w * f, H.b + H.h * .42 + .006, -.0895, .011, .014, '#ffb862', 2.3));
  for (const H of HS) winLight(S, H.x0 + H.w * .82, H.b + .008, -.0895, .01, .018, '#000', 0, new THREE.Color('#080d22'));   // doors (always dark)
  wins.sort((a, b) => a.position.x - b.position.x);
  // the bakery: its own sheet at the foot of the hill, arched window, a cut sign, chimney
  const bak = tint(S.add(sheet({ U, w: .13, h: .11, x: BAK.x, y: STREET + .04, z: BAK.z, trans: .1, ppm: 9000, draw: x => { x.fillStyle = PAPER; x.translate(0, -.04);
    const L = -BAK.w / 2, Rr = BAK.w / 2;
    x.fillRect(L, -.01, BAK.w, BAK.h - .0); roof(x, L, Rr, BAK.h - .01, .014, .006); tiles(x, L, Rr, BAK.h - .01, .014);
    x.fillRect(Rr - .02, BAK.h, .008, .022); x.fillRect(Rr - .0215, BAK.h + .021, .011, .003);   // chimney
    x.fillRect(L - .003, -.01, BAK.w + .006, .003);                                                 // step
    cut(x, () => { const wx = BW.x - BAK.x, wy = BW.y - STREET; x.beginPath(); x.moveTo(wx - BW.w / 2, wy - BW.h / 2); x.lineTo(wx - BW.w / 2, wy + BW.h / 2 - BW.w / 2); x.arc(wx, wy + BW.h / 2 - BW.w / 2, BW.w / 2, Math.PI, 0, true); x.lineTo(wx + BW.w / 2, wy - BW.h / 2); x.closePath(); x.fill();
      const dx = DOOR.x - BAK.x; x.beginPath(); x.moveTo(dx - DOOR.w / 2, -.007); x.lineTo(dx - DOOR.w / 2, DOOR.h - DOOR.w / 2); x.arc(dx, DOOR.h - DOOR.w / 2, DOOR.w / 2, Math.PI, 0, true); x.lineTo(dx + DOOR.w / 2, -.007); x.closePath(); x.fill(); });
    x.lineWidth = .0012; x.strokeStyle = PAPER; const wx = BW.x - BAK.x, wy = BW.y - STREET;   // window mullions
    x.beginPath(); x.moveTo(wx, wy - BW.h / 2); x.lineTo(wx, wy + BW.h / 2); x.moveTo(wx - BW.w / 2, wy - .002); x.lineTo(wx + BW.w / 2, wy - .002); x.stroke();
    x.beginPath(); x.moveTo(wx - BW.w / 2 - .003, wy - BW.h / 2 - .0015); x.lineTo(wx + BW.w / 2 + .003, wy - BW.h / 2 - .0015); x.lineWidth = .0025; x.stroke();
  } })), '#334a80');
  const sign = S.add(sheet({ U, w: .06, h: .011, x: BAK.x, y: STREET + .062, z: BAK.z + .0012, trans: .35, shadow: false, ppm: 16000, finish: { rim: .25, under: .2 }, draw: x => {
    x.fillStyle = '#c9b48a'; x.beginPath(); x.roundRect(-.029, -.005, .058, .01, .0015); x.fill(); text(x, 'PADARIA', 0, -.0002, .0062, '"Cormorant"', { fill: '#1b1a2a', weight: 700 }); } }));
  const bakWin = winLight(S, BW.x, BW.y, BAK.z - .002, BW.w + .004, BW.h + .004, '#ffb050', 2.8);
  const bakDoorL = winLight(S, DOOR.x, STREET + DOOR.h / 2, BAK.z - .002, DOOR.w + .004, DOOR.h + .006, '#ffb050', 2.4);
  // the red door (the one accent): two leaves that can slide open
  const leaf = side => tint(S.add(sheet({ U, w: DOOR.w / 2 + .001, h: DOOR.h + .002, x: DOOR.x + side * DOOR.w / 4, y: STREET + DOOR.h / 2 - .003, z: BAK.z - .001, trans: .12, ppm: 14000, draw: x => { x.fillStyle = PAPER;
    const w = DOOR.w / 2 + .001, h = DOOR.h + .002; x.beginPath(); x.rect(-w / 2, -h / 2, w, h); x.fill();
    cut(x, () => { x.lineWidth = .0006; x.strokeRect(-w / 2 + .002, -h / 2 + .004, w - .004, h * .38); x.strokeRect(-w / 2 + .002, h * .02, w - .004, h * .3); });
    x.beginPath(); x.arc(side * -(w / 2 - .0025), 0, .0008, 0, TAU); x.fillStyle = '#000'; x.fill(); } })), '#b8402c');
  const doorL = leaf(-1), doorR = leaf(1);
  // a lamp inside the window: a soft halo seen through the glass
  const halo = glow(S, .03, '#ffbf70'); halo.position.set(BW.x, BW.y, BAK.z + .004); halo.visible = false;
  const smoke = [];
  for (let k = 0; k < 4; k++) { const m = tint(S.add(sheet({ U, w: .02, h: .014, z: -.08, trans: .9, shadow: false, ppm: 6000, finish: { rim: .15, under: 0 }, draw: x => { x.fillStyle = PAPER; const r = mulberry(30 + k);
    for (let i = 0; i < 4; i++) { x.beginPath(); x.arc((r() - .5) * .01, (r() - .5) * .005, .003 + r() * .002, 0, TAU); x.fill(); } } })), '#7088c0'); smoke.push(m); }
  // the street figures (between the houses and the pavement)
  const nurse = person(S, 'nurse', -.048, '#0d1430'), boy = person(S, 'boy', -.05, '#0d1430'), bk = bike(S, -.0505, '#0d1430'), bs = bus(S, -.056, '#0c1330');
  // the pavement in front: kerb, grass tufts, a banana plant left, a bench and an unlit lamp post
  const front = tint(S.add(sheet({ U, w: .6, h: .35, z: -.026, trans: .04, ppm: 4200, draw: x => { x.fillStyle = PAPER; const r = mulberry(12);
    x.beginPath(); x.moveTo(-.3, -.2); x.lineTo(-.3, -.118); for (let u = -.3; u <= .3; u += .002) x.lineTo(u, -.118 + .0015 * Math.sin(u * 90)); x.lineTo(.3, -.2); x.closePath(); x.fill();
    for (let i = 0; i < 70; i++) { const u = -.3 + r() * .6, h = .003 + r() * .006; x.beginPath(); x.moveTo(u - .0015, -.118); x.lineTo(u + (r() - .5) * .003, -.118 + h); x.lineTo(u + .0015, -.118); x.fill(); }
    // banana plant
    const bx = -.272; x.fillRect(bx - .002, -.12, .004, .05); for (const [a, l] of [[.5, .045], [1.1, .05], [2.2, .048], [2.8, .042], [1.6, .03]]) { x.save(); x.translate(bx, -.07); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(l * .5, .016, l, .002); x.quadraticCurveTo(l * .55, -.006, 0, 0); x.fill(); x.restore(); }
    cut(x, () => { x.lineWidth = .0005; for (const [a, l] of [[.5, .045], [1.1, .05], [2.2, .048], [2.8, .042]]) { x.save(); x.translate(bx, -.07); x.rotate(a); for (let s = .2; s < .95; s += .14) { x.beginPath(); x.moveTo(l * s, 0); x.lineTo(l * s + .002, .005); x.stroke(); } x.restore(); } });
    // lamp post and bench
    x.fillRect(.098, -.12, .0022, .085); x.beginPath(); x.moveTo(.099, -.036); x.quadraticCurveTo(.106, -.03, .113, -.036); x.lineWidth = .0016; x.strokeStyle = PAPER; x.stroke(); x.beginPath(); x.moveTo(.109, -.036); x.lineTo(.117, -.036); x.lineTo(.115, -.042); x.lineTo(.111, -.042); x.closePath(); x.fill();
    x.fillRect(.13, -.112, .036, .0025); x.fillRect(.131, -.12, .0018, .008); x.fillRect(.163, -.12, .0018, .008); x.fillRect(.13, -.106, .036, .002);
  } })), '#0c1230');
  const winsAll = [...wins, ...upWins];
  return { S, U, sky: null, hills, upper, slope, bak, sign, bakWin, bakDoorL, doorL, doorR, halo, smoke, wins, upWins, winsAll, clockFace, churchDoor, nurse, boy, bk, bs, front, HS };
}
