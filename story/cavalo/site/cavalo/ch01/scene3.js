/* scene3 — Dona Neide trots in for the toilet; she knows Trovão, as she knows everyone who takes their time in there. */
'use strict';
const PRE3 = 2.6;
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true });
  cam.cut(V.wide, 0);
  cuts(cam, sc, PRE3, [['n1', V.nei], ['z6', V.ze], ['n2', V.nei], ['v7', V.valDoor], ['n3', V.nei]]);
  sfx(sc, .1, 'bell', .5);
  const bz = blinks(4, D), bv = blinks(8, D), bn = blinks(13, D), bh = blinks(17, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    // the quick little shuffle of a lady who knows exactly where she is going
    const u = Math.min(1, Math.max(0, (q - .2) / 2.1)), w = spWalk(q);
    const walking = u > 0 && u < 1, nx = 260 + (NEI.x - 260) * u;
    const nl = lips(q, sc, PRE3, 'n1', 'n2', 'n3'), knowing = q > A('n3');
    nei.pose({ x: nx, y: FLOORY, s: NEI.s, ...(walking ? { legL: w.legL, legR: w.legR, bob: w.bob } : alive(q, 7)),
               look: walking ? .4 : q > A('v7') - .2 && q < A('n3') ? .5 : -.5, eyeX: q > A('v7') - .2 && q < A('n3') ? .5 : -.4,
               mouth: nl === 'X' ? 'smile' : nl, lids: knowing ? .5 : 0, brow: knowing ? .4 : 0, shut: blinking(q, bn),
               holdL: 'bag', armL: 18, armR: speaking(q, sc, PRE3, 'n3') ? 60 + 10 * Math.sin(q * 5) : 6 }, f);
    const zl = lips(q, sc, PRE3, 'z6');
    ze.pose({ x: ZE.x, y: ZE.y, s: ZE.s, ...alive(q, 3), look: .6, eyeX: .6, mouth: zl === 'X' ? 'flat' : zl, lids: .4,
              shut: blinking(q, bz), armR: 70 + 8 * Math.sin(q * 7), armL: 80 + 8 * Math.sin(q * 7 + 1), reachR: .85, hold: 'glass', holdL: 'cloth' }, f);
    const vl = lips(q, sc, PRE3, 'v7');
    val.pose({ x: VD, y: FLOORY, s: VAL.s, ...alive(q, 9), look: -.6, eyeX: -.6, mouth: vl === 'X' ? 'O' : vl, brow: .5,
               shut: blinking(q, bv), lids: 0, hold: 'rope', armR: 40 }, f);
    tro.pose({ x: TRO.x - 60, y: FLOORY, s: TRO.s, flip: -1, neck: 4 + 3 * Math.sin(q), head: 8 + 5 * Math.sin(q * .7), eyeX: -.8,
               lids: knowing ? .5 : .2, shut: blinking(q, bh), tail: 8 * Math.sin(q * 2) }, f);
  });
}
