/* scene1 — the hook: a horse's head comes out of the gents'; Zé asks why; Valdir won it at the jogo do bicho. */
'use strict';
const PRE1 = 1.6;
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, ze, tro, val } = barScene(p), tag = partTag(p, 'PARTE 1');
  cam.cut(V.door, 0);
  cuts(cam, sc, PRE1, [['z1', V.ze], ['v1', V.two], ['z2', V.ze], ['v2', V.val], ['z3', V.zeWide], ['v3', V.val]]);
  sfx(sc, .35, 'door', .5); sfx(sc, .55, 'neigh', .8);
  const bz = blinks(3, D), bv = blinks(5, D), bh = blinks(9, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); tag(q);
    // Trovão pokes his head out, neighs, then looks about the bar as if he owned it
    const out = tween(q, .1, .5, 0, 1), neigh = between(q, .55, 1.8);
    tro.pose({ x: TRO.x + 80 * (1 - out), y: FLOORY, s: TRO.s, flip: -1, neck: neigh ? 22 : 4 + 4 * Math.sin(q * 1.3),
               head: neigh ? -18 : 6 * Math.sin(q * .8), jaw: neigh ? .6 + .4 * Math.abs(Math.sin(q * 22)) : 0,
               eyeX: q > 2 ? -.6 : 0, shut: blinking(q, bh), tail: 10 * Math.sin(q * 2), lids: q > A('v3') ? .5 : 0 }, f);
    // Zé polishes a glass, stops dead on the question, then shouts
    const zl = lips(q, sc, PRE1, 'z1', 'z2', 'z3'), shout = q > A('z3') && q < A('v3');
    const polish = q < A('z1') - .3 || q > A('v3') + .4;
    ze.pose({ x: ZE.x, y: ZE.y, s: ZE.s, ...alive(q, 1), look: .55, eyeX: .4, mouth: zl === 'X' && q > A('z2') ? 'frown' : zl,
              brow: q > A('z2') ? -.8 : -.2, shut: blinking(q, bz), lids: q > A('z1') && q < A('z2') ? .3 : 0,
              armR: polish ? 70 + 8 * Math.sin(q * 7) : shout ? 120 : 40, reachR: .85, hold: 'glass',
              armL: polish ? 80 + 10 * Math.sin(q * 7 + 1) : shout ? 140 + 10 * Math.sin(q * 9) : 20, holdL: 'cloth', lean: shout ? 6 : 0 }, f);
    // Valdir: calm, half-lidded, a little proud of himself
    const vl = lips(q, sc, PRE1, 'v1', 'v2', 'v3');
    val.pose({ x: VAL.x, y: FLOORY, s: VAL.s, ...alive(q, 4), look: -.5, eyeX: -.3, lids: .35, mouth: vl === 'X' ? 'smile' : vl,
               shut: blinking(q, bv), armL: speaking(q, sc, PRE1, 'v2') ? 60 : 8, armR: speaking(q, sc, PRE1, 'v3') ? 35 : 10,
               headR: speaking(q, sc, PRE1, 'v3') ? -6 : 0 }, f);
  });
}
