/* ep1 scene1 — the hook: the man has flushed three times; Tonhão sits on his throne in the bowl and will not go down. */
'use strict';
const PRE1 = 2.4;
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, gen, ton, ping, cla } = bathroom(p);
  const card = titleCard(p, 1, 'O COCÔ QUE SE', 'RECUSOU A DESCER', 2.0), lines = speedLines(p, A('t1') - .1);
  cam.cut(VB.wide, 0).to({ x: 450, y: 960, z: 1.4 }, .3, 1.8);
  cuts(cam, sc, PRE1, [['p1', VB.ping], ['t1', VB.ton], ['smug', VB.bowl, 0]]);
  sfx(sc, .4, 'flush', .8);
  const bt = blinks(3, D), bp = blinks(8, D), bg = blinks(5, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q); lines(q);
    const swirl = between(q, .5, 2.3), sw = swirl ? (q - .5) * 7 : 0;
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, swirl: swirl ? sw : 0, shut: blinking(q, bg), lids: .45, brow: -.3, mouth: 'flat', eyeX: -.3, eyeY: .7 }, f);
    // the swirl spins Pinguinho round; Tonhão does not move an inch
    const orbit = swirl ? { x: PING.x - 60 + 70 * Math.cos(sw * 1.4), y: PING.y - 8 * Math.sin(sw * 1.4), lean: sw * 40 } : {};
    const pl = lips(q, sc, PRE1, 'p1');
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, ...orbit, look: -.5, eyeX: -.6, eyes: swirl ? 1.3 : 1.15, mouth: pl === 'X' ? 'O' : pl, shut: blinking(q, bp),
                armL: 130 + 20 * Math.sin(q * 9), armR: 130 + 20 * Math.sin(q * 9 + 1) }, f);
    const tl = lips(q, sc, PRE1, 't1'), smug = q > A('smug') - .1, talk = speaking(q, sc, PRE1, 't1');
    ton.pose({ x: TON.x, y: TON.y, s: TON.s, ...alive(q, 1), look: smug ? 0 : .3, eyeX: smug ? 0 : .5, lids: smug ? .45 : .2, mouth: tl === 'X' ? 'smile' : tl, brow: talk ? -.4 : 0,
               armL: talk ? 60 : 150, bendL: talk ? .3 : -.9, armR: talk ? 160 + 10 * Math.sin(q * 6) : 150, bendR: talk ? .2 : -.9, shut: blinking(q, bt) }, f);
    cla.pose({ x: -400, y: FLOORY, s: CLA.s }, f);
  });
}
