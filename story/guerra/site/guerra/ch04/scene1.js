/* ep4 scene1 — a green cloud with eyes oozes out of the bowl with a fart: "good evening, losers". */
'use strict';
const PRE1 = 3.4;
const MET = { x: 470, y: 760, s: .95 };
function scene1(p, D, m) {
  const sc = 'scene1', A = c => clipAt(sc, PRE1, c), { cam, gen, ping, cla, front } = bathroom(p, { ton: false });
  const met = metano(front), card = titleCard(p, 4, 'A INVASÃO', 'DOS PUNS', 2.4), st = stink(front, 470, BOWL - 20, 4);
  cam.cut(VB.wide, 0).cut(VB.bowl, 2.4).to({ x: 470, y: 820, z: 1.6 }, 2.6, 1.0);
  cuts(cam, sc, PRE1, [['m1', { x: 470, y: 700, z: 2.6 }], ['p1', VB.ping], ['gasp', VB.wide, 0]]);
  sfx(sc, 2.3, 'fart', .9); sfx(sc, A('m1') + .1, 'sting', .4); sfx(sc, A('gasp'), 'gulp', .4);
  const bp = blinks(9, D), bc = blinks(13, D), bg = blinks(5, D), bm = blinks(17, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q); st(q, q > 2.3 && q < 3.6);
    const rise = span(q, 2.3, 3.4), ml = lips(q, sc, PRE1, 'm1');
    vis(met.g, q > 2.3);
    met.pose({ x: MET.x, y: BOWL - 40 - (BOWL - 40 - MET.y) * rise + 10 * Math.sin(q * 2), s: MET.s * (.3 + .7 * rise), sq: .05 * Math.sin(q * 5), look: 0, mouth: ml === 'X' ? 'grin' : ml,
              armL: 80 + 30 * Math.sin(q * 3), armR: 80 + 30 * Math.sin(q * 3 + 1), shut: blinking(q, bm) }, f);
    const gag = q > 2.6;
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, lids: gag ? .6 : .3, mouth: gag ? 'wobble' : 'flat', brow: gag ? .8 : -.4, eyeY: -.6, shut: blinking(q, bg) }, f);
    const pl = lips(q, sc, PRE1, 'p1');
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, look: -.3, eyeY: -.9, eyes: gag ? 1.6 : 1.1, mouth: pl === 'X' ? 'O' : pl, brow: 1, shake: gag ? 4 : 1, armL: gag ? 150 : 20, armR: gag ? 150 : 20, shut: blinking(q, bp) }, f);
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, look: -.5, eyeY: -.6, lids: gag ? 0 : .5, eyes: gag ? 1.3 : 1, mouth: gag ? 'O' : 'flat', armL: gag ? 150 : 10, armR: gag ? 150 : 10, shut: blinking(q, bc) }, f);
  });
}
