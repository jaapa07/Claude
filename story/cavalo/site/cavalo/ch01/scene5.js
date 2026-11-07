/* scene5 — the twist: Dona Neide is the health inspector, undercover for twenty years. The horse is in order; the
   two men are not. */
'use strict';
const PRE5 = .6;
function scene5(p, D, m) {
  const sc = 'scene5', A = c => clipAt(sc, PRE5, c), W = (c, t) => A(c) + t, { cam, ze, tro, val, nei } = barScene(p, { neide: true, oil: true });
  cam.cut(V.nei, 0);
  cuts(cam, sc, PRE5, [['z10', V.ze], ['n5', V.nei], ['v11', V.valD], ['n6', V.nei], ['z11', V.ze], ['n7', V.nei], ['n8', V.nei], ['v12', V.valD], ['n9', V.nei]]);
  // her list, each item on screen as she says it (n6's word times: chão 12.54, cachaça 12.79, cavalo no balcão 13.84)
  const n6 = A('n6');
  cam.cut({ x: 1680, y: 1220, z: 2.4 }, n6 + .05).cut(V.stool, n6 + .85).cut({ x: 760, y: 950, z: 1.1 }, n6 + 1.9).cut(V.nei, n6 + 2.8);
  const PAG = A('n7') + 2.9;                                       // "pagou a conta no pix"
  cam.cut({ x: 740, y: 900, z: 1.9 }, PAG).cut(V.nei, A('n7') + 4.2);
  const FOI = A('n9') + 2.45;                                      // "foi o cavalo"
  cam.cut(V.stool, FOI).to({ x: 720, y: 780, z: 2.3 }, FOI + .2, 2.5);
  sfx(sc, .55, 'sting', .5); sfx(sc, PAG + .95, 'coin', .7); sfx(sc, PAG + 1.0, 'beep', .4); sfx(sc, A('flush') + .1, 'flush', .8);
  const bz = blinks(2, D), bv = blinks(9, D), bn = blinks(14, D), bh = blinks(20, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const nl = lips(q, sc, PRE5, 'n4', 'n5', 'n6', 'n7', 'n8', 'n9');
    const badge = q < A('z10') + 2.6, clip = q > A('n6') - .2 && q < A('n8');
    const point = speaking(q, sc, PRE5, 'n8') || speaking(q, sc, PRE5, 'n9');
    nei.pose({ x: NEI.x, y: FLOORY, s: NEI.s, ...alive(q, 12), look: point ? -.2 : -.4, eyeX: -.3, mouth: nl === 'X' ? 'flat' : nl,
               lids: .45, brow: -.3, shut: blinking(q, bn), holdL: 'bag', armL: 18,
               hold: badge ? 'badge' : clip ? 'clip' : null, armR: badge ? tween(q, .2, .4, 10, 80) : clip ? 55 : point ? 95 : 8, reachR: badge ? .85 : 1 }, f);
    const zl = lips(q, sc, PRE5, 'z10', 'z11');
    ze.pose({ x: ZE.x, y: ZE.y, s: ZE.s, ...alive(q, 4), look: .7, eyeX: .7, mouth: zl === 'X' ? (q < A('z11') ? 'O' : 'wobble') : zl, brow: .8,
              shut: blinking(q, bz), armL: speaking(q, sc, PRE5, 'z10') ? 130 : 15, armR: speaking(q, sc, PRE5, 'z10') ? 130 : 15 }, f);
    const vl = lips(q, sc, PRE5, 'v11', 'v12');
    val.pose({ x: VD, y: FLOORY, s: VAL.s, ...alive(q, 13), look: -.6, eyeX: -.6, mouth: vl === 'X' ? 'flat' : vl, brow: q > A('v12') ? -.7 : .4,
               shut: blinking(q, bv), lids: q > A('v11') && q < A('v12') ? .4 : 0,
               armL: speaking(q, sc, PRE5, 'v12') ? 60 : 10, armR: speaking(q, sc, PRE5, 'v12') ? 60 : 10, hold: 'pan', armRpan: 0 }, f);
    // Trovão: the bottle; the phone with the PIX; the smug look as the toilet flushes
    const pay = between(q, PAG, A('n7') + 4.2), proud = q > FOI;
    tro.pose(seated(tro, { hold: pay ? null : 'bottle', hoof: pay ? 'phone' : null, fn: pay ? 95 : SIT.fn, lids: .5, shut: blinking(q, bh),
                           eyeX: proud ? 0 : .3, head: proud ? -6 + 10 * Math.max(0, Math.sin((q - FOI) * 5)) : 4 + 4 * Math.sin(q * .8),
                           jaw: proud ? .15 : 0, neck: proud ? 14 : SIT.neck }), f);
  });
}
