/* ch02 scene3 — the horse goes into a fridge box; Dona Neide comes in and asks about the tail and the four legs; the box
   walks off on its own. */
'use strict';
const PRE3 = 1.8;
const BX = 1000, NX2 = 480, VX2 = 1380, ZX2 = 1080;   // the box, Neide, Valdir and Zé
const V3 = { nei: { x: NX2 + 20, y: 990, z: 2.2 }, val: { x: VX2 + 10, y: 950, z: 2.4 }, ze: { x: ZX2 - 30, y: 950, z: 2.2 }, wide: { x: 980, y: 960, z: .95 },
             box: { x: 860, y: 1000, z: 1.6 }, tail: { x: 720, y: 1050, z: 2.4 } };
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const box = fridgeBox(cam.stage), W0 = A('walk');
  cam.stage.insertBefore(box.g, nei.g);
  cam.cut(V3.wide, 0);
  cuts(cam, sc, PRE3, [['n1', V3.nei], ['v7', V3.val], ['n2', V3.tail], ['z7', V3.ze], ['n3', V3.box], ['v8', V3.val], ['walk', V3.wide, 0]]);
  sfx(sc, .1, 'bell', .5); sfx(sc, W0 + .3, 'clop', .5); sfx(sc, W0 + 2.1, 'bonk', .6);
  const bx = q => BX - 180 * span(q, W0 + .2, W0 + 2.1);
  const bz = blinks(5, D), bv = blinks(8, D), bn = blinks(13, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const walking = between(q, W0 + .2, W0 + 2.1), x = bx(q);
    // the horse inside: only its legs show under the box
    tro.pose({ x, y: FLOORY, s: TRO.s, flip: -1, neck: -24, head: 30, ...(walking ? trot(q) : {}) }, f);
    box.pose(x, FLOORY - 130, 1, f, { tail: q > A('n2') - .2 && q < A('z7') + 1.4 ? 30 * Math.sin(q * 9) : 6 * Math.sin(q * 2), rock: walking ? 2 * Math.sin(q * 20) : 0 });
    const u = Math.min(1, Math.max(0, (q - .2) / 1.5)), w = spWalk(q), nin = u > 0 && u < 1;
    const bumped = between(q, W0 + 2.05, W0 + 2.6);
    const nl = lips(q, sc, PRE3, 'n1', 'n2', 'n3');
    nei.pose({ x: 120 + (NX2 - 120) * u, y: FLOORY - (bumped ? 50 : 0), s: NEI.s, ...(nin ? { legL: w.legL, legR: w.legR, bob: w.bob } : alive(q, 7)),
               look: .5, eyeX: .6, mouth: bumped ? 'O' : nl === 'X' ? 'flat' : nl, lids: bumped ? 0 : .4, brow: bumped ? .9 : -.2, shut: blinking(q, bn),
               holdL: 'bag', armL: bumped ? 120 : 18, armR: bumped ? 120 : speaking(q, sc, PRE3, 'n2') || speaking(q, sc, PRE3, 'n3') ? 70 : 6 }, f);
    const vl = lips(q, sc, PRE3, 'v7', 'v8');
    val.pose({ x: VX2, y: FLOORY, s: VAL.s, ...alive(q, 9), look: -.5, eyeX: -.5, mouth: vl === 'X' ? 'smile' : vl, lids: .2, shut: blinking(q, bv),
               armL: speaking(q, sc, PRE3, 'v8') ? 60 : 30, armR: 10 }, f);
    const zl = lips(q, sc, PRE3, 'z7');
    ze.pose({ x: ZX2, y: FLOORY, s: ZE.s, ...alive(q, 3), look: -.5, eyeX: -.5, mouth: zl === 'X' ? 'flat' : zl, lids: .5, shut: blinking(q, bz) }, f);
  });
}
