/* ep2 scene3 — "experience with pressure?" "I was raised under pressure!" The rat takes notes. */
'use strict';
const PRE3 = .6;
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, vet, ton, rat } = sewer(p), TX = 330, RX = 640;
  const lines = speedLines(p, A('t3') + .3);
  cam.cut(VS.rat, 0).cut(VS.ton, A('t3') - .1).to({ x: 330, y: 1100, z: 4.2 }, A('t3') + .3, .25).cut(VS.two, A('notes'));
  sfx(sc, A('t3') + .3, 'boing', .5); sfx(sc, A('notes') + .2, 'squeak', .4);
  const bt = blinks(5, D), br = blinks(9, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); lines(q);
    const rl = lips(q, sc, PRE3, 'r2'), notes = q > A('notes');
    rat.pose({ x: RX, y: LEDGE, s: .95, ...alive(q, 2), look: -.5, eyeX: notes ? 0 : -.7, eyeY: notes ? .8 : 0, lids: .25, mouth: rl === 'X' ? 'flat' : rl, armR: notes ? 70 + 8 * Math.sin(q * 20) : 30, holdR: notes ? 'contract' : null, armL: notes ? 60 : 10, shut: blinking(q, br) }, f);
    const tl = lips(q, sc, PRE3, 't3'), brag = speaking(q, sc, PRE3, 't3');
    ton.pose({ x: TX, y: LEDGE, s: .9, ...alive(q, 1), look: brag ? 0 : .5, eyeX: brag ? 0 : .6, mouth: tl === 'X' ? 'grin' : tl, brow: brag ? -.5 : 0, lids: .3, sq: brag ? -.08 : 0,
               armL: brag ? 160 : 30, armR: brag ? 70 : 30, bendR: brag ? -.6 : .3, shut: blinking(q, bt) }, f);
    vet.pose({ x: -400, y: 1470, s: .9 }, f);
  });
}
