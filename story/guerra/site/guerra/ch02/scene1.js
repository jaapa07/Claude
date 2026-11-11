/* ep2 scene1 — Tonhão falls out of a pipe into the sewer: "Curitiba after the rain?" */
'use strict';
const PRE1 = 4.0;
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, vet, ton, rat, front } = sewer(p);
  const card = titleCard(p, 2, 'A REVOLTA', 'DO ESGOTO', 2.2), LAND = 3.0, TX = 330, sp = drops(front, LAND, TX, LEDGE - 20, 16, 300, '#9bd06a');
  cam.cut(VS.wide, 0).cut({ x: 380, y: 1080, z: 1.6 }, LAND - .4).shake(LAND, .5, 16).cut(VS.ton, A('t1') - .1).cut({ x: 420, y: 980, z: 1.3 }, A('look'));
  sfx(sc, 2.2, 'whoosh', .6); sfx(sc, LAND, 'splash', .8); sfx(sc, LAND + .05, 'thud', .6);
  const bt = blinks(3, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q); sp(q);
    const fall = span(q, 2.2, LAND), landed = q >= LAND, squash = landed ? Math.max(0, .45 * (1 - (q - LAND) / .35)) * Math.cos((q - LAND) * 18) : 0;
    const tl = lips(q, sc, PRE1, 't1'), look = q > A('look');
    ton.pose({ x: TX, y: landed ? LEDGE : -300 + (LEDGE + 300) * fall * fall, s: .9, sq: landed ? squash : -.15, lean: landed ? 0 : q * 200,
               look: look ? .6 : 0, eyeX: look ? .8 : 0, eyes: landed && q < A('t1') ? 1.5 : 1.1, mouth: tl === 'X' ? (landed ? 'O' : 'O') : tl, brow: .5, lids: q > A('t1') + 1 ? .25 : 0,
               armL: landed ? 40 : 170, armR: landed ? (speaking(q, sc, PRE1, 't1') ? 120 : 40) : 170, shut: blinking(q, bt) }, f);
    vet.pose({ x: 1500, y: 1430, s: .8 }, f); rat.pose({ x: 1500, y: LEDGE, s: .95 }, f);
  });
}
