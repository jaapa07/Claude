/* ep3 scene1 — the job interview: "why did you leave?" "Because I literally only ever got shit!" The mug sips. */
'use strict';
const PRE1 = 3.0;
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), cam = paperCam(p, 'escritorio', VO.wide), cla = claudio(cam.stage), mug = caneca(cam.stage);
  const card = titleCard(p, 3, 'O PAPEL HIGIÊNICO', 'PEDE DEMISSÃO', 2.4);
  cam.cut(VO.wide, 0).to(VO.two, .4, 2.4);
  cuts(cam, sc, PRE1, [['e1', VO.mug], ['c1', VO.cla], ['sip', VO.mug, 0]]);
  sfx(sc, A('sip') + .2, 'slurp', .5);
  const bc = blinks(3, D), bm = blinks(8, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    const ml = lips(q, sc, PRE1, 'e1'), sip = q > A('sip');
    mug.pose({ x: 800, y: DESK, s: .95, ...alive(q, 2), look: -.5, eyeX: -.6, mouth: ml === 'X' ? (sip ? 'O' : 'smile') : ml, lids: sip ? .5 : .1, armL: sip ? 150 : 60, reachL: sip ? .7 : 1, armR: 60, shut: blinking(q, bm) }, f);
    const cl = lips(q, sc, PRE1, 'c1'), rant = speaking(q, sc, PRE1, 'c1');
    cla.pose({ x: 250, y: FLOORY, s: .95, ...alive(q, 1), look: .5, eyeX: .6, mouth: cl === 'X' ? 'flat' : cl, lids: rant ? .2 : .5, brow: rant ? -.8 : 0,
               armR: rant ? 130 + 15 * Math.sin(q * 8) : 10, armL: rant ? 130 + 15 * Math.sin(q * 8 + 2) : 10, shut: blinking(q, bc) }, f);
  });
}
