/* ep2 scene2 — a rat in a suit: "everyone here is important"; a veteran poo floats by: "since 2009". */
'use strict';
const PRE2 = 1.0;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, vet, ton, rat } = sewer(p), TX = 330, RX = 640;
  cam.cut(VS.two, 0).cut(VS.rat, A('r1') - .1).cut({ x: 640, y: 1110, z: 3.6 }, A('creepy')).cut(VS.ton, A('t2') - .1).cut(VS.river, A('v1') - .3);
  sfx(sc, .3, 'squeak', .6); sfx(sc, A('creepy') + .1, 'sting', .3);
  const bt = blinks(4, D), br = blinks(8, D), bv = blinks(12, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const rl = lips(q, sc, PRE2, 'r1'), creepy = between(q, A('creepy'), A('t2'));
    const enter = span(q, 0, .8);
    rat.pose({ x: RX + 260 * (1 - enter), y: LEDGE, s: .95, look: -.5, eyeX: -.7, lids: creepy ? .4 : 0, mouth: rl === 'X' ? (creepy ? 'grin' : 'smile') : rl, legL: enter < 1 ? 20 * Math.sin(q * 16) : 0, legR: enter < 1 ? -20 * Math.sin(q * 16) : 0,
               armR: speaking(q, sc, PRE2, 'r1') ? 80 : 20, armL: creepy ? 60 : 10, shut: blinking(q, br) }, f);
    const tl = lips(q, sc, PRE2, 't2'), proud = speaking(q, sc, PRE2, 't2');
    ton.pose({ x: TX, y: LEDGE, s: .9, ...alive(q, 1), look: .5, eyeX: .6, mouth: tl === 'X' ? 'smile' : tl, brow: proud ? -.3 : .2, lids: proud ? .3 : 0,
               armL: proud ? 140 : 30, armR: proud ? 140 : 30, bendL: proud ? .5 : .3, shut: blinking(q, bt) }, f);
    // the veteran drifts past in the river, very slowly, on his back
    const vl = lips(q, sc, PRE2, 'v1'), drift = span(q, A('v1') - .6, A('v1') + 4);
    vet.pose({ x: 760 - 520 * drift, y: 1445 + 6 * Math.sin(q * 2), s: 1.15, lean: -14, look: -.3, mouth: vl === 'X' ? 'flat' : vl, lids: .6, armR: 20, holdR: 'cane', shut: blinking(q, bv) }, f);
  });
}
