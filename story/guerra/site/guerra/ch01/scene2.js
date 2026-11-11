/* ep1 scene2 — the General starts the flush and gives him five seconds; Tonhão wants his lawyer. */
'use strict';
const PRE2 = 1.4;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, gen, ton, ping, cla } = bathroom(p);
  cam.cut(VB.bowl, 0).cut(VB.gen, A('g1') - .1).shake(A('g1'), 2.4, 14).cut(VB.ton, A('t2') - .1).cut({ x: 430, y: 960, z: 2.4 }, A('stare'));
  sfx(sc, .1, 'bigflush', .45); sfx(sc, A('g1') + .1, 'thud', .5);
  const bt = blinks(4, D), bp = blinks(9, D), bg = blinks(6, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const gl = lips(q, sc, PRE2, 'g1'), yell = speaking(q, sc, PRE2, 'g1');
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, swirl: q * 9, shake: yell ? 3 : 1, eyes: yell ? 1.15 : 1, brow: -1, lids: .2, mouth: gl === 'X' ? 'frown' : gl, eyeY: .6, eyeX: -.4,
               armR: yell ? 120 : 20, armL: yell ? 120 : 20, shut: blinking(q, bg) }, f);
    const sw = q * 9;
    ping.pose({ x: PING.x - 60 + 70 * Math.cos(sw * 1.2), y: PING.y - 8 * Math.sin(sw * 1.2), s: PING.s, lean: sw * 40, eyes: 1.4, mouth: 'O', armL: 150, armR: 150, shut: blinking(q, bp) }, f);
    const tl = lips(q, sc, PRE2, 't2'), talk = speaking(q, sc, PRE2, 't2'), stare = q > A('stare');
    // he speaks to us, not to the General; then a side-eye up at him
    ton.pose({ x: TON.x, y: TON.y, s: TON.s, ...alive(q, 1), look: stare ? .5 : 0, eyeX: stare ? .8 : 0, eyeY: stare ? -.8 : 0, lids: .35, mouth: tl === 'X' ? 'flat' : tl,
               brow: stare ? -.5 : .2, armR: talk ? 150 : 150, bendR: talk ? .4 : -.9, armL: 150, bendL: -.9, shut: blinking(q, bt) }, f);
    cla.pose({ x: -400, y: FLOORY, s: CLA.s }, f);
  });
}
