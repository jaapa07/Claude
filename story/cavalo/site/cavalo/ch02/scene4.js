/* ch02 scene4 — two hearts in the box: the horse is a mare, and expecting. "I said the ladies' was occupied." Who is the
   father? The ladies' toilet flushes; the door opens a crack; two eyes in the dark. To be continued. */
'use strict';
const PRE4 = .3;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true, wall: true });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const box = fridgeBox(cam.stage), door = ladiesDoor(cam.stageAt.wall);
  cam.stage.insertBefore(box.g, nei.g);
  const eyes = mk('g', { visibility: 'hidden' }, cam.stageAt.wall);
  eyes.innerHTML = '<ellipse cx="1641" cy="900" rx="10" ry="14" fill="#fff"/><ellipse cx="1669" cy="900" rx="10" ry="14" fill="#fff"/><circle cx="1638" cy="903" r="5" fill="#111"/><circle cx="1666" cy="903" r="5" fill="#111"/>';
  const F0 = A('flush'), BXE = BX - 180;
  cam.cut({ x: 640, y: 980, z: 1.7 }, 0);
  cuts(cam, sc, PRE4, [['z8', V3.ze], ['n5', V3.nei], ['z9', V3.ze], ['stare', { x: VX2, y: 960, z: 2.1 }, 0], ['v9', V3.val], ['z10', V3.ze]]);
  cam.to({ x: VX2 + 20, y: 930, z: 2.6 }, A('stare') + .1, 3);
  cam.cut({ x: 1500, y: 980, z: 1.3 }, F0).to({ x: 1530, y: 940, z: 1.8 }, F0 + 1.2, 2.2);
  const card = endCardUp(p, F0 + 2.4, 'Continua na parte 3', 52);
  sfx(sc, F0 + .15, 'flush', .8); sfx(sc, F0 + 1.6, 'creak', .6); sfx(sc, F0 + 2.3, 'sting', .5);
  const bz = blinks(2, D), bv = blinks(9, D), bn = blinks(14, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    const turned = q > F0 + .6, crack = .36 * span(q, F0 + 1.5, F0 + 2.2);
    door.pose(crack, f, between(q, F0 + .9, F0 + 1.5) ? 1 : 0);
    vis(eyes, q > F0 + 2.1 && !blinking(q, [F0 + 3.0]));
    tro.pose({ x: BXE, y: FLOORY, s: TRO.s, flip: -1, neck: -24, head: 30 }, f);
    box.pose(BXE, FLOORY - 130, 1, f, { tail: 6 * Math.sin(q * 2) });
    const nl = lips(q, sc, PRE4, 'n4', 'n5'), listen = q < A('z8') + 1;
    nei.pose({ x: NX2 + 30, y: FLOORY, s: NEI.s, ...alive(q, 7), look: turned ? .7 : listen ? .6 : .5, eyeX: turned ? .9 : .4, mouth: nl === 'X' ? 'flat' : nl,
               lids: listen ? .6 : .3, brow: q > A('n5') ? .5 : 0, shut: blinking(q, bn), holdL: 'bag', lean: listen ? 12 : 0, headR: listen ? 10 : 0, armR: listen ? 40 : 6 }, f);
    const vl = lips(q, sc, PRE4, 'v9'), staring = between(q, A('stare'), A('v9'));
    val.pose({ x: VX2, y: FLOORY, s: VAL.s, ...alive(q, 9), look: turned ? .6 : -.5, eyeX: turned ? .8 : staring ? (Math.floor(q * 3) % 2 ? .8 : -.8) : -.5,
               mouth: vl === 'X' ? (staring ? 'flat' : turned ? 'O' : 'smile') : vl, lids: q > A('v9') && !turned ? .45 : 0, brow: turned ? .8 : 0, shut: blinking(q, bv),
               armL: speaking(q, sc, PRE4, 'v9') ? 40 : 10 }, f);
    const zl = lips(q, sc, PRE4, 'z8', 'z9', 'z10'), shout = speaking(q, sc, PRE4, 'z9') || speaking(q, sc, PRE4, 'z10');
    ze.pose({ x: ZX2, y: FLOORY, s: ZE.s, ...alive(q, 3), look: turned ? -.7 : staring ? -.7 : -.5, eyeX: turned ? -.9 : -.5, mouth: zl === 'X' ? (turned ? 'O' : 'frown') : zl,
              brow: shout || turned ? .9 : -.3, shut: blinking(q, bz), armL: shout ? 130 : 15, armR: shout ? 130 : 15 }, f);
  });
}
