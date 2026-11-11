/* ep5 scene2 — the witness: "he turned a bathroom into a company without HR". */
'use strict';
const PRE2 = 1.4;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, judge, cla, ton, ping } = court(p);
  cam.cut({ x: 100, y: 1000, z: 1.6 }, 0).cut(VT.cla, A('c1') - .1).cut(VT.ton, A('ouch')).to({ x: 890, y: 1010, z: 4.0 }, A('ouch') + .1, .3);
  sfx(sc, .3, 'step1', .5); sfx(sc, .7, 'step1', .5); sfx(sc, A('ouch') + .1, 'boing', .4);
  const bj = blinks(3, D), bt = blinks(7, D), bc = blinks(11, D), bp = blinks(15, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    judge.pose({ ...JU, look: -.4, eyeX: -.6, lids: .4, mouth: 'flat', holdR: 'gavel', armR: 120, shut: blinking(q, bj) }, f);
    const cl = lips(q, sc, PRE2, 'c1'), talk = speaking(q, sc, PRE2, 'c1');
    cla.pose({ ...WIT, ...alive(q, 3), look: talk ? .3 : .5, eyeX: .5, lids: .45, mouth: cl === 'X' ? 'flat' : cl, brow: talk ? -.3 : 0, armR: talk ? 100 + 20 * Math.sin(q * 4) : 10, shut: blinking(q, bc) }, f);
    const ouch = q > A('ouch');
    ton.pose({ ...DOCK, look: -.5, eyeX: -.7, eyes: ouch ? 1.6 : 1, mouth: ouch ? 'O' : 'frown', brow: ouch ? 1 : -.6, armL: ouch ? 150 : 40, armR: ouch ? 150 : 40, shut: blinking(q, bt) }, f);
    ping.pose({ ...PG, look: -.6, eyeX: -.8, mouth: 'flat', shut: blinking(q, bp) }, f);
  });
}
