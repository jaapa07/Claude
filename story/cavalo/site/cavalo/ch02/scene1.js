/* ch02 scene1 — the next morning: Trovão is behind the counter; the sign says BAR DO TROVÃO; the licence is in his name. */
'use strict';
const PRE1 = 2.2;
const ZF = 1080;                                    // Zé's mark, in front of the counter now: a customer in his own bar
const TB = { x: 380, y: 1185, s: 1.12, flip: 1 };   // Trovão behind the counter, facing the customers
const V2 = { ze: { x: ZF + 20, y: 950, z: 2.2 }, tro: { x: 600, y: 840, z: 1.9 }, three: { x: 720, y: 960, z: 1.2 } };
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, ze, tro, val } = barScene(p, { horse: false });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const horse = horsePuppet(cam.stageAt.floor), sign = trovaoSign(cam.stage), tag = partTag(p, 'PARTE 2');
  cam.stage.prepend(sign);
  cam.cut(V2.three, 0).to({ x: 600, y: 900, z: 1.5 }, .2, 1.8);
  cuts(cam, sc, PRE1, [['z1', V2.ze], ['v1', V.val], ['z2', V2.ze], ['v2', V2.tro]]);
  sfx(sc, .4, 'neigh', .35);
  const bz = blinks(3, D), bv = blinks(6, D), bh = blinks(10, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); tag(q);
    horse.pose({ ...TB, neck: 4 + 3 * Math.sin(q * 1.1), head: 4 * Math.sin(q * .7), lids: .5, eyeX: .6, shut: blinking(q, bh), tail: 8 * Math.sin(q * 2),
                 jaw: between(q, .4, 1.3) ? .4 + .4 * Math.abs(Math.sin(q * 20)) : 0 }, f);
    const zl = lips(q, sc, PRE1, 'z1', 'z2');
    ze.pose({ x: ZF, y: FLOORY, s: ZE.s, ...alive(q, 1), look: -.6, eyeX: -.6, mouth: zl === 'X' ? 'O' : zl, brow: q > A('z2') ? -.9 : .6,
              shut: blinking(q, bz), armL: speaking(q, sc, PRE1, 'z2') ? 120 : 15, armR: speaking(q, sc, PRE1, 'z2') ? 120 : 15 }, f);
    const vl = lips(q, sc, PRE1, 'v1', 'v2');
    val.pose({ x: VAL.x, y: FLOORY, s: VAL.s, ...alive(q, 4), look: .5, eyeX: .5, lids: .35, mouth: vl === 'X' ? 'smile' : vl,
               shut: blinking(q, bv), armR: speaking(q, sc, PRE1, 'v1') ? 50 : 10 }, f);
  });
}
