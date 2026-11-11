/* ep3 scene2 — his skills: under pressure, problem solving, direct contact with the client. A look at us. */
'use strict';
const PRE2 = 1.0;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), cam = paperCam(p, 'escritorio', VO.two), cla = claudio(cam.stage), mug = caneca(cam.stage);
  const lines = speedLines(p, A('wink') - .05);
  cam.cut(VO.two, 0);
  cuts(cam, sc, PRE2, [['e2', VO.mug], ['c2', VO.cla], ['wink', { x: 250, y: 1130, z: 4.2 }, -.05]]);
  sfx(sc, A('wink'), 'boing', .4);
  const bc = blinks(4, D), bm = blinks(9, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); lines(q);
    const ml = lips(q, sc, PRE2, 'e2');
    mug.pose({ x: 800, y: DESK, s: .95, ...alive(q, 2), look: -.5, eyeX: -.6, mouth: ml === 'X' ? 'smile' : ml, armR: 70, armL: 60, shut: blinking(q, bm) }, f);
    const cl = lips(q, sc, PRE2, 'c2'), list = speaking(q, sc, PRE2, 'c2'), wink = q > A('wink');
    const n = list ? Math.floor((q - A('c2')) / 1.6) : 0;
    cla.pose({ x: 250, y: FLOORY, s: .95, ...alive(q, 1), look: wink ? 0 : .5, eyeX: wink ? 0 : .6, mouth: cl === 'X' ? (wink ? 'smile' : 'flat') : cl, lids: wink ? .55 : .3, brow: wink ? .4 : 0,
               armR: list ? 120 + 20 * (n % 2) : 10, armL: list ? 40 + 60 * (n % 3 === 2) : 10, shut: blinking(q, bc) }, f);
  });
}
