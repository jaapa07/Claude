/* ep1 scene3 — Cláudio rolls in, fed up: "you were born of a badly digested bean". An offended silence. */
'use strict';
const PRE3 = 3.0;
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, gen, ton, ping, cla } = bathroom(p);
  const X0 = -250, X1 = CLA.x, R0 = .3, R1 = 2.6;
  cam.cut({ x: 420, y: 1050, z: 1.25 }, 0).to({ x: 620, y: 1080, z: 1.4 }, .4, 2.2);
  cuts(cam, sc, PRE3, [['c1', VB.cla], ['pause', VB.ton, 0]]);
  cam.cut(VB.two, A('pause') + .8);
  sfx(sc, R0, 'rolling', .7); sfx(sc, R1, 'thud', .4); sfx(sc, A('pause') + .1, 'sting', .35);
  const bt = blinks(2, D), bp = blinks(7, D), bc = blinks(11, D), bg = blinks(5, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, swirl: q * 3, brow: -.5, lids: .3, mouth: 'flat', eyeX: .7, eyeY: .4, shut: blinking(q, bg) }, f);
    const u = span(q, R0, R1), x = X0 + (X1 - X0) * u, deg = (x - X0) / (95 * CLA.s) * 57.3, roll = u > 0 && u < 1;
    const cl = lips(q, sc, PRE3, 'c1'), talk = speaking(q, sc, PRE3, 'c1');
    cla.pose({ x: X1, y: FLOORY, s: CLA.s, ...(roll || u === 0 ? rolling(x, CLA.s, deg - (deg % 360 > 180 ? 0 : 0)) : alive(q, 3)), look: -.5, eyeX: -.6, mouth: cl === 'X' ? 'flat' : cl,
                lids: talk ? .3 : .55, brow: talk ? -.4 : 0, armL: talk ? 70 + 15 * Math.sin(q * 5) : 10, armR: 10, shut: blinking(q, bc) }, f);
    const off = q > A('pause') - .1;
    ton.pose({ x: TON.x, y: TON.y, s: TON.s, ...alive(q, 1), look: .5, eyeX: .8, eyes: off ? 1.45 : 1, mouth: off ? 'O' : 'flat', brow: off ? .8 : -.3, armL: 150, bendL: -.9, armR: off ? 100 : 150, bendR: off ? .2 : -.9, shut: blinking(q, bt) }, f);
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, look: off ? -.6 : .5, eyeX: off ? -.8 : .8, mouth: off ? 'O' : 'flat', eyes: off ? 1.3 : 1.1, armL: off ? 120 : 20, armR: off ? 120 : 20, shut: blinking(q, bp) }, f);
  });
}
