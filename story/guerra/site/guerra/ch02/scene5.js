/* ep2 scene5 — the first meeting: a crowd of poos; Tonhão on a soap bar: "nobody else will be thrown away!" Cheers. */
'use strict';
const PRE5 = 2.6;
function scene5(p, D, m) {
  const sc = 'scene5', A = c => clipAt(sc, PRE5, c), cam = paperCam(p, 'esgoto', VS.crowd);
  const back = [0, 1, 2, 3, 0, 1].map((h, i) => ({ t: crowdPoo(cam.stage, h), x: 40 + i * 165, y: LEDGE - 6, s: .55 }));
  const box = soapbox(cam.stage), ton = tonhao(cam.stage, { badge: true }), rat = rato(cam.stage);
  const frontRow = [2, 3, 0, 1, 2].map((h, i) => ({ t: crowdPoo(cam.stage, h), x: 80 + i * 190, y: 1530, s: .95 }));
  tf(box, `translate(450,${LEDGE})`);
  cam.cut(VS.crowd, 0).to({ x: 450, y: 1120, z: 1.35 }, .3, 2.2).cut({ x: 450, y: 1050, z: 2.6 }, A('t4') - .1).cut(VS.crowd, A('cheer')).shake(A('cheer'), 1.6, 8);
  sfx(sc, .2, 'cheer', .25); sfx(sc, A('cheer'), 'cheer', .7); sfx(sc, A('cheer') + .2, 'applause', .5);
  const bt = blinks(4, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const cheer = q > A('cheer');
    [...back, ...frontRow].forEach((c, i) => c.t.pose({ x: c.x, y: c.y - (cheer ? Math.abs(Math.sin(q * 8 + i)) * 30 : 0), s: c.s, look: (450 - c.x) / 600, eyeY: -.6,
      mouth: cheer ? 'D' : 'flat', armL: cheer ? 160 : 10, armR: cheer ? 160 : 10, eyes: cheer ? 1.2 : 1, shut: blinking(q, [1.3 + i * .4, 4 + i * .3]) }, f));
    const tl = lips(q, sc, PRE5, 't4'), talk = speaking(q, sc, PRE5, 't4');
    ton.pose({ x: 450, y: LEDGE - 70, s: .85, ...alive(q, 1), look: 0, mouth: tl === 'X' ? 'grin' : tl, brow: talk ? -.7 : 0, lids: .2, armR: talk ? 165 + 8 * Math.sin(q * 7) : 140, armL: talk ? 60 : 140, shut: blinking(q, bt) }, f);
    rat.pose({ x: 720, y: LEDGE, s: .8, look: -.5, eyeX: -.6, mouth: 'smile', armL: cheer ? 120 : 10, armR: cheer ? 120 : 10 }, f);
  });
}
