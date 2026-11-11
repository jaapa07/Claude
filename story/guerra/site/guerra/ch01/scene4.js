/* ep1 scene4 — the briefcase, the Federal Constitution of Waste, article two; Pinguinho knows what article two is. */
'use strict';
const PRE4 = 1.5;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, gen, ton, ping, cla } = bathroom(p);
  const lines = speedLines(p, A('p2') - .05);
  cam.cut(VB.bowl, 0).cut(VB.ton, A('t3') - .1).to({ x: 395, y: 950, z: 5.2 }, A('t3') + .3, 4).cut(VB.ping, A('p2') - .1).to({ x: 545, y: 965, z: 7 }, A('p2') + .1, .25);
  sfx(sc, .5, 'pop', .4); sfx(sc, .9, 'door', .4); sfx(sc, A('p2') + .1, 'sting', .5);
  const bt = blinks(4, D), bp = blinks(9, D), bg = blinks(6, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); lines(q);
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, swirl: q * 2, brow: -.4, lids: .35, mouth: 'flat', eyeY: .7, shut: blinking(q, bg) }, f);
    const tl = lips(q, sc, PRE4, 't3'), out = q > .5, reading = q > 1.0;
    ton.pose({ x: TON.x, y: TON.y, s: TON.s, ...alive(q, 1), look: 0, lids: reading ? .3 : .1, mouth: tl === 'X' ? 'flat' : tl, brow: reading ? .3 : 0,
               armR: out ? (reading ? 125 : 70) : 150, reachR: reading ? .8 : 1, bendR: reading ? .5 : -.9, holdR: reading ? 'contract' : out ? 'briefcase' : null, armL: 150, bendL: -.9, shut: blinking(q, bt) }, f);
    const pl = lips(q, sc, PRE4, 'p2'), panic = q > A('p2');
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, look: -.4, eyeX: -.5, eyes: panic ? 1.75 : 1.1, sq: panic ? -.12 : 0, mouth: pl === 'X' ? (panic ? 'O' : 'flat') : pl, brow: panic ? 1 : .5,
                armL: panic ? 160 : 30, armR: panic ? 160 : 30, shake: panic ? 4 : 1.2, shut: blinking(q, bp) }, f);
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, look: -.5, eyeX: -.6, lids: .55, mouth: 'flat' }, f);
  });
}
