/* ep5 scene1 — the sanitary court: a toilet brush in a wig reads the charges; "political persecution!" */
'use strict';
const PRE1 = 2.8;
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, judge, cla, ton, ping } = court(p);
  const card = titleCard(p, 5, 'O JULGAMENTO', 'DO COCÔ', 2.4);
  cam.cut(VT.wide, 0).to({ x: 450, y: 900, z: 1.2 }, .4, 2.2);
  cuts(cam, sc, PRE1, [['j1', VT.judge], ['t1', VT.ton], ['stare', VT.ton, 0]]);
  sfx(sc, .7, 'gavel', .8); sfx(sc, A('t1') + .1, 'sting', .3);
  const bj = blinks(3, D), bt = blinks(7, D), bc = blinks(11, D), bp = blinks(15, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    const jl = lips(q, sc, PRE1, 'j1'), bang = between(q, .55, .85);
    judge.pose({ ...JU, ...alive(q, 1), look: .2, eyeX: .5, mouth: jl === 'X' ? 'flat' : jl, holdR: 'gavel', armR: bang ? 60 : 130, armL: speaking(q, sc, PRE1, 'j1') ? 60 : 20, shut: blinking(q, bj) }, f);
    const tl = lips(q, sc, PRE1, 't1'), stare = q > A('stare');
    ton.pose({ ...DOCK, ...alive(q, 2), look: stare ? 0 : -.5, eyeX: stare ? 0 : -.7, lids: stare ? .4 : 0, mouth: tl === 'X' ? (stare ? 'flat' : 'frown') : tl, brow: speaking(q, sc, PRE1, 't1') ? -1 : -.3,
               armL: speaking(q, sc, PRE1, 't1') ? 160 : 40, armR: speaking(q, sc, PRE1, 't1') ? 160 : 40, shut: blinking(q, bt) }, f);
    cla.pose({ ...WIT, look: .5, eyeX: .7, lids: .55, mouth: 'flat', shut: blinking(q, bc) }, f);
    ping.pose({ ...PG, look: .3, eyeX: .5, eyes: 1.2, mouth: 'flat', armL: 20, armR: 20, shut: blinking(q, bp) }, f);
  });
}
