/* ch03 scene4 — it's a girl, and she's striped: "deu zebra". Who pays the child support? The father tiptoes back into the
   ladies' toilet and locks it. "Zé. Põe na conta do cavalo." */
'use strict';
const PRE4 = 2.2;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true, wall: true });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const door = ladiesDoor(cam.stageAt.wall), zeb = zebraIn(cam.stage, nei.g);
  const foal = horsePuppet(cam.stage, FOAL); cam.stage.insertBefore(foal.g, nei.g);
  const H0 = A('hide'), T0 = A('tail');
  cam.cut({ x: 420, y: 1090, z: 1.8 }, 0);
  cuts(cam, sc, PRE4, [['z5', V3.ze], ['v4', V3.val], ['z6', V3.ze], ['hide', V3.door, 0], ['v5', V3.val], ['tail', { x: 560, y: 1080, z: 1.5 }, .1]]);
  cam.cut(V3.wide, T0 + 1.4);
  const card = endCardUp(p, T0 + 1.7, 'FIM', 72);
  sfx(sc, .5, 'boing', .3); sfx(sc, H0 + .2, 'clop', .5); sfx(sc, H0 + 1.7, 'bang', .7); sfx(sc, H0 + 1.75, 'latch', .6);
  sfx(sc, T0 + .2, 'neigh', .7); sfx(sc, T0 + .8, 'yip', .5);
  const bz = blinks(2, D), bv = blinks(6, D), bn = blinks(11, D), bzz = blinks(19, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    // the foal gets up on wobbly legs
    const up = span(q, .4, 1.8), wob = (1 - span(q, 2, 5)) * 8;
    foal.pose({ x: FX, y: FLOORY, s: .5, flip: 1, bob: LIE.bob * (1 - up), fn: LIE.fn * (1 - up) + wob * Math.sin(q * 17), ff: LIE.ff * (1 - up) - wob * Math.sin(q * 13),
                hn: LIE.hn * (1 - up) + wob * Math.sin(q * 15), hf: LIE.hf * (1 - up), neck: 6, head: 6 * Math.sin(q), eyeX: q > A('z6') ? .9 : .3, tail: 20 * Math.sin(q * 3),
                jaw: between(q, T0 + .8, T0 + 1.2) ? .7 : 0, shut: blinking(q, [3.1, 7.9, 12.4]) }, f);
    tro.pose({ ...lying(q, 1), neck: between(q, T0 + .2, T0 + 1.3) ? 26 : LIE.neck, head: between(q, T0 + .2, T0 + 1.3) ? -10 : LIE.head,
               jaw: between(q, T0 + .2, T0 + 1.3) ? .6 + .4 * Math.abs(Math.sin(q * 20)) : 0, lids: .4 }, f);
    // the father: caught, he turns and trots back to the toilet; the door shuts behind him
    const back = q >= H0, x = back ? EX3 + (1660 - EX3) * span(q, H0 + .2, H0 + 1.5) : EX3;
    vis(zeb.g, q < H0 + 1.6);
    zeb.pose({ x, y: FLOORY, s: 1, flip: back ? 1 : -1, neck: 8, head: back ? 10 : 16, eyeX: back ? .9 : .6, lids: back ? 0 : .2, tail: 10 * Math.sin(q * 2.4),
               shut: blinking(q, bzz), ...(between(q, H0 + .2, H0 + 1.5) ? trot(q, 1.3) : {}) }, f);
    door.pose(1 - span(q, H0 + 1.35, H0 + 1.7), f, between(q, H0 + 1.7, H0 + 2.2) ? 1 : 0);
    const nl = lips(q, sc, PRE4, 'n6');
    nei.pose({ x: NX3, y: FLOORY, s: NEI.s, ...alive(q, 7), look: q < A('z5') ? -.4 : .6, eyeX: q < A('z5') ? -.6 : .7, mouth: nl === 'X' ? 'smile' : nl, lids: .3,
               shut: blinking(q, bn), holdL: 'bag', armR: 20 }, f);
    const zl = lips(q, sc, PRE4, 'z5', 'z6'), yell = speaking(q, sc, PRE4, 'z5') || speaking(q, sc, PRE4, 'z6');
    ze.pose({ x: ZX3, y: FLOORY, s: ZE.s, ...alive(q, 1), look: q > H0 ? -.4 : -.6, eyeX: q > H0 ? .9 : -.7, mouth: zl === 'X' ? (q > H0 ? 'wobble' : 'O') : zl,
              brow: .9, shut: blinking(q, bz), armL: yell ? 125 : 15, armR: yell ? 125 : 15 }, f);
    const vl = lips(q, sc, PRE4, 'v4', 'v5');
    val.pose({ x: VX3, y: FLOORY, s: VAL.s, ...alive(q, 4), look: q > A('v5') - .3 ? .6 : -.5, eyeX: q > A('v5') - .3 ? .7 : -.6, lids: .45,
               mouth: vl === 'X' ? 'smile' : vl, shut: blinking(q, bv), hold: 'pan', armR: 20, armL: speaking(q, sc, PRE4, 'v4') ? 60 : 10 }, f);
  });
}
