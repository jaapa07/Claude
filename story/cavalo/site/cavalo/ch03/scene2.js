/* ch03 scene2 — Trovão goes into labour; Neide calls for hot water; Valdir runs for the frying oil, as before. */
'use strict';
const PRE2 = 1.8;
const LIE = { bob: 128, fn: 62, ff: 70, hn: -64, hf: -56, neck: -6, head: 22, tail: 30 };   // lying on her belly, legs out
function lying(q, k) { return { x: TX3, y: FLOORY, s: TRO.s, flip: 1, ...LIE, bob: LIE.bob * k, fn: LIE.fn * k, ff: LIE.ff * k, hn: LIE.hn * k, hf: LIE.hf * k,
  neck: 4 + (LIE.neck - 4) * k, head: LIE.head * k + 3 * Math.sin(q * 1.3), tail: 8 * Math.sin(q * 2) + LIE.tail * k }; }
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const zeb = horsePuppet(cam.stage, ZEBRA); cam.stage.insertBefore(zeb.g, nei.g);
  const R0 = A('run');
  cam.cut(V3.wide, 0);
  cuts(cam, sc, PRE2, [['n3', V3.nei], ['v2', V3.val], ['run', V3.ze, 0], ['z3', V3.ze], ['v3', V3.val]]);
  sfx(sc, .2, 'neigh', .7); sfx(sc, 1.1, 'thud', .6); sfx(sc, R0 + .2, 'whoosh', .4);
  const bz = blinks(4, D), bv = blinks(8, D), bn = blinks(12, D), bzz = blinks(18, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const k = span(q, .3, 1.2);
    tro.pose({ ...lying(q, k), jaw: between(q, .2, 1.2) ? .6 + .4 * Math.abs(Math.sin(q * 20)) : 0, shut: q > 1.2 && Math.floor(q) % 3 === 0 }, f);
    zeb.pose({ x: EX3, y: FLOORY, s: 1, flip: -1, hold: q < 1 ? 'paper' : null, neck: 4, head: 20, lids: 0, eyeX: .8, tail: 10 * Math.sin(q * 2.4), shut: blinking(q, bzz) }, f);
    const nl = lips(q, sc, PRE2, 'n3');
    nei.pose({ x: NX3, y: FLOORY, s: NEI.s, ...alive(q, 7), look: .7, eyeX: .8, mouth: nl === 'X' ? 'O' : nl, brow: .7, shut: blinking(q, bn), holdL: 'bag',
               armR: speaking(q, sc, PRE2, 'n3') ? 120 + 10 * Math.sin(q * 9) : 20 }, f);
    const vl = lips(q, sc, PRE2, 'v2', 'v3'), gone = between(q, R0 + .2, A('v3') - .2), w = spWalk(q);
    val.pose({ x: gone ? VX3 - 700 : VX3, y: FLOORY, s: VAL.s, ...(gone ? w : alive(q, 4)), look: q > A('v3') - .2 ? .5 : -.6, eyeX: -.6, mouth: vl === 'X' ? 'grin' : vl,
               brow: .4, shut: blinking(q, bv), hold: q > A('v3') - .2 ? 'pan' : null, armR: q > A('v3') - .2 ? 50 : 10, armL: speaking(q, sc, PRE2, 'v2') ? 140 : 10 }, f);
    const zl = lips(q, sc, PRE2, 'z3'), yell = speaking(q, sc, PRE2, 'z3');
    ze.pose({ x: ZX3, y: FLOORY, s: ZE.s, ...alive(q, 1), look: -.7, eyeX: -.8, mouth: zl === 'X' ? 'O' : zl, brow: yell ? -1 : .8, shut: blinking(q, bz),
              armL: yell ? 130 + 15 * Math.sin(q * 12) : 15, armR: yell ? 130 + 15 * Math.sin(q * 12 + 2) : 15 }, f);
  });
}
