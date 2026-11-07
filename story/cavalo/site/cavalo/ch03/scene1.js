/* ch03 scene1 — the ladies' door opens and a zebra walks out with the newspaper: he has been in there since Tuesday. */
'use strict';
const PRE1 = .3;
const NX3 = 480, VX3 = 1380, ZX3 = 1080, TX3 = 660, EX3 = 1240;   // Neide, Valdir, Zé, Trovão (facing right), the zebra's mark
const V3 = { nei: { x: NX3 + 20, y: 990, z: 2.2 }, val: { x: VX3 + 10, y: 950, z: 2.4 }, ze: { x: ZX3 - 30, y: 950, z: 2.2 },
             door: { x: 1500, y: 980, z: 1.3 }, wide: { x: 960, y: 980, z: .95 }, pair: { x: 980, y: 880, z: 1.7 } };
let zClip = 0;
// the zebra inside a wrapper clipped at the doorway's far edge, so the part still in the toilet stays out of sight
function zebraIn(stage, before) {
  const id = 'zclip' + (++zClip), cp = mk('clipPath', { id }, stage);
  mk('rect', { x: -800, y: -800, width: 1690 + 800, height: 3000 }, cp);
  const wrap = mk('g', { 'clip-path': `url(#${id})` }, stage); if (before) stage.insertBefore(wrap, before);
  return horsePuppet(wrap, ZEBRA);
}
const TRO3 = q => ({ x: TX3, y: FLOORY, s: TRO.s, flip: 1, neck: 4 + 3 * Math.sin(q), head: 6 * Math.sin(q * .7), tail: 8 * Math.sin(q * 2) });
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true, wall: true });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const door = ladiesDoor(cam.stageAt.wall), zeb = zebraIn(cam.stage, nei.g), tag = partTag(p, 'PARTE 3');
  cam.cut(V3.door, 0).cut(V3.pair, A('door') + 2.6);
  cuts(cam, sc, PRE1, [['z1', V3.ze], ['v1', V3.val], ['n1', V3.nei], ['z2', V3.ze], ['n2', V3.nei]]);
  sfx(sc, .3, 'creak', .7); sfx(sc, 1.2, 'clop', .5); sfx(sc, 3.0, 'sting', .35);
  const zx = q => 1640 - (1640 - EX3) * span(q, 1.0, 2.8);
  const bz = blinks(2, D), bv = blinks(6, D), bn = blinks(11, D), bh = blinks(15, D), bzz = blinks(19, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); tag(q);
    door.pose(span(q, .3, 1.1), f);
    const walking = between(q, 1.0, 2.8);
    zeb.pose({ x: zx(q), y: FLOORY, s: 1, flip: -1, hold: 'paper', lids: .45, neck: 6, head: 4 + 3 * Math.sin(q * .6), shut: blinking(q, bzz),
               tail: 10 * Math.sin(q * 2.4), ...(walking ? trot(q) : {}) }, f);
    tro.pose({ ...TRO3(q), lids: q > 3 ? .3 : 0, eyeX: .8, shut: blinking(q, bh) }, f);
    const zl = lips(q, sc, PRE1, 'z1', 'z2');
    ze.pose({ x: ZX3, y: FLOORY, s: ZE.s, ...alive(q, 1), look: -.6, eyeX: -.7, mouth: zl === 'X' ? 'O' : zl, brow: .8, shut: blinking(q, bz),
              armL: speaking(q, sc, PRE1, 'z2') ? 120 : 15, armR: speaking(q, sc, PRE1, 'z2') ? 120 : 15 }, f);
    const vl = lips(q, sc, PRE1, 'v1');
    val.pose({ x: VX3, y: FLOORY, s: VAL.s, ...alive(q, 4), look: -.5, eyeX: -.6, lids: .4, mouth: vl === 'X' ? 'smile' : vl, shut: blinking(q, bv), armL: 10 }, f);
    const nl = lips(q, sc, PRE1, 'n1', 'n2');
    nei.pose({ x: NX3, y: FLOORY, s: NEI.s, ...alive(q, 7), look: .6, eyeX: .7, mouth: nl === 'X' ? 'flat' : nl, lids: .5, shut: blinking(q, bn), holdL: 'bag' }, f);
  });
}
