/* ep5 scene5 — the sentence: clean the whole bathroom for a year. "I'm the problem, not the solution!" Cláudio laughs. */
'use strict';
const PRE5 = .8;
function scene5(p, D, m) {
  const sc = 'scene5', A = c => clipAt(sc, PRE5, c), { cam, judge, cla, ton, ping } = court(p);
  cuts(cam, sc, PRE5, [['j3', VT.judge], ['t3', VT.ton], ['laugh', VT.cla, 0]]);
  cam.to({ x: 890, y: 1000, z: 4.2 }, A('t3') + 2.0, .25);
  sfx(sc, A('t3') + 2.0, 'boing', .5);
  const bj = blinks(3, D), bt = blinks(7, D), bp = blinks(15, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const jl = lips(q, sc, PRE5, 'j3');
    judge.pose({ ...JU, ...alive(q, 1), look: .3, eyeX: .5, lids: .35, mouth: jl === 'X' ? 'smile' : jl, holdR: 'gavel', armR: 60, armL: speaking(q, sc, PRE5, 'j3') ? 70 : 20, shut: blinking(q, bj) }, f);
    const tl = lips(q, sc, PRE5, 't3'), rant = speaking(q, sc, PRE5, 't3');
    ton.pose({ ...DOCK, sq: rant ? -.1 + .06 * Math.sin(q * 12) : 0, look: rant ? 0 : -.4, eyes: 1.4, mouth: tl === 'X' ? 'frown' : tl, brow: -1, shake: rant ? 3 : 0,
               armL: rant ? 150 + 20 * Math.sin(q * 9) : 60, armR: rant ? 150 + 20 * Math.sin(q * 9 + 2) : 60, shut: blinking(q, bt) }, f);
    const cl = lips(q, sc, PRE5, 'c2'), lol = q > A('laugh');
    cla.pose({ ...WIT, sq: lol ? .06 * Math.sin(q * 30) : 0, lean: lol ? 6 * Math.sin(q * 15) : 0, look: .2, shut: lol, lids: .5, mouth: cl === 'X' ? (lol ? 'grin' : 'flat') : cl, armL: lol ? 60 : 10, armR: lol ? 60 : 10 }, f);
    ping.pose({ ...PG, look: -.5, eyeX: -.7, mouth: 'smile', shut: blinking(q, bp) }, f);
  });
}
