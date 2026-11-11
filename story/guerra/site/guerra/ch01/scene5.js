/* ep1 scene5 — alarms; the bowl shakes; the unblocking protocol; Tonhão has rights. */
'use strict';
const PRE5 = 1.6;
function scene5(p, D, m) {
  const sc = 'scene5', A = c => clipAt(sc, PRE5, c), { cam, gen, ton, ping, cla } = bathroom(p);
  const red = alarm(p, 0, D + 1);
  cam.cut(VB.wide, 0).shake(0, D + 1, 9).cut(VB.gen, A('g2') - .1).cut(VB.bowl, A('t4') - .1).to({ x: 395, y: 960, z: 4.2 }, A('t4') + .2, 1.2);
  sfx(sc, 0, 'siren', .5); sfx(sc, 3.0, 'siren', .5); sfx(sc, 6.0, 'siren', .5);
  const bt = blinks(4, D), bp = blinks(9, D), bc = blinks(11, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); red(q);
    const gl = lips(q, sc, PRE5, 'g2'), lever = q > A('g2') + 1.2;
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, swirl: q * 14, shake: 4, brow: -1, lids: .15, eyes: 1.15, mouth: gl === 'X' ? 'grin' : gl, armR: lever ? 170 : 60, reachR: 1.1, armL: 30 }, f);
    const tl = lips(q, sc, PRE5, 't4');
    ton.pose({ x: TON.x, y: TON.y, s: TON.s, shake: 3, look: .2, eyeY: -.6, eyes: 1.35, mouth: tl === 'X' ? 'O' : tl, brow: 1, armL: 100 + 10 * Math.sin(q * 11), armR: 100 + 10 * Math.sin(q * 11 + 2), bendL: -.5, bendR: -.5, shut: blinking(q, bt) }, f);
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, shake: 6, eyes: 1.6, mouth: 'O', brow: 1, armL: 160, armR: 160, shut: blinking(q, bp) }, f);
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, shake: 2, look: -.5, eyeX: -.6, lids: .3, eyes: 1.2, mouth: 'O', armL: 40, armR: 40, shut: blinking(q, bc) }, f);
  });
}
