/* scene6 — the tag: Valdir knows who is paying now. Trovão agrees. The title card. */
'use strict';
const PRE6 = .8;
function scene6(p, D, m) {
  const sc = 'scene6', A = c => clipAt(sc, PRE6, c), { cam, ze, tro, val, nei, front } = barScene(p, { neide: true, oil: true });
  cam.cut(V.ze, 0).cut(V.valD, A('v13') - .12).cut(V.stool, A('tail') + .2).cut(V.wide, A('tail') + 1.6);
  sfx(sc, A('tail') + .35, 'neigh', .7);
  const card = endCardUp(p, A('tail') + 1.9, 'Põe na conta do cavalo', 60);   // on the panel, outside the camera: it stays put
  const bz = blinks(3, D), bv = blinks(5, D), bn = blinks(15, D), bh = blinks(22, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    card(q);
    const vl = lips(q, sc, PRE6, 'v13');
    val.pose({ x: VD, y: FLOORY, s: VAL.s, ...alive(q, 14), look: -.7, eyeX: -.7, mouth: vl === 'X' ? 'smile' : vl, lids: .45,
               shut: blinking(q, bv), armL: speaking(q, sc, PRE6, 'v13') ? 70 : 10, hold: 'pan', armR: 10 }, f);
    ze.pose({ x: ZE.x, y: ZE.y, s: ZE.s, ...alive(q, 5), look: .7, eyeX: .7, mouth: 'wobble', brow: .9, lids: .3, shut: blinking(q, bz) }, f);
    nei.pose({ x: NEI.x, y: FLOORY, s: NEI.s, ...alive(q, 15), look: -.4, mouth: q > A('tail') + 1 ? 'smile' : 'flat', lids: .45, shut: blinking(q, bn), holdL: 'bag', hold: 'clip', armR: 55 }, f);
    const nb = between(q, A('tail') + .35, A('tail') + 1.6);
    tro.pose(seated(tro, { hold: nb ? null : 'bottle', lids: nb ? 0 : .5, jaw: nb ? .6 + .4 * Math.abs(Math.sin(q * 22)) : 0, neck: nb ? 30 : SIT.neck,
                           head: nb ? -20 : 4, shut: blinking(q, bh), fn: nb ? 100 : SIT.fn }), f);
  });
}
