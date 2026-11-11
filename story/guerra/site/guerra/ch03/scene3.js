/* ep3 scene3 — hired: manager of the factory. What does it make? Toilet paper. A slow, horrified push. */
'use strict';
const PRE3 = 1.4;
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), cam = paperCam(p, 'escritorio', VO.two), cla = claudio(cam.stage), mug = caneca(cam.stage);
  cam.cut(VO.two, 0);
  cuts(cam, sc, PRE3, [['e3', VO.mug], ['c3', VO.cla], ['e4', VO.mug], ['dread', VO.cla, 0]]);
  cam.to({ x: 250, y: 1120, z: 4.6 }, A('dread') + .1, 1.5);
  sfx(sc, .4, 'clack', .4); sfx(sc, A('dread') + .05, 'sting', .7);
  const bc = blinks(4, D), bm = blinks(9, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const ml = lips(q, sc, PRE3, 'e3', 'e4'), stamp = between(q, .3, 1.0);
    mug.pose({ x: 800, y: DESK, s: .95, ...alive(q, 2), look: -.5, eyeX: -.6, mouth: ml === 'X' ? 'grin' : ml, armR: stamp ? 150 - 80 * span(q, .3, .5) : 60, armL: 60, shut: blinking(q, bm) }, f);
    const cl = lips(q, sc, PRE3, 'c3'), dread = q > A('dread');
    cla.pose({ x: 250, y: FLOORY, s: .95, ...alive(q, 1), look: dread ? 0 : .5, eyeX: dread ? 0 : .6, eyes: dread ? 1 + .6 * span(q, A('dread'), A('dread') + 1.2) : 1, mouth: cl === 'X' ? (dread ? 'wobble' : 'smile') : cl,
               lids: dread ? 0 : .3, brow: dread ? 1 : 0, shake: dread ? 2.5 : 0, armR: 10, armL: 10, shut: blinking(q, bc) }, f);
  });
}
