/* ep4 scene3 — Tonhão bursts back up the pipe, in uniform, to negotiate peace. "I'm a gas, idiot!" */
'use strict';
const PRE3 = 3.2;
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, gen, ton, ping, cla, thr, front } = bathroom(p, { tonOpts: { hat: 'helmet' } });
  const met = metano(front), UP = 1.4, sp = drops(front, UP, TON.x, BOWL - 10, 16, 300);
  cam.cut(VB.bowl, 0).shake(.4, 1.0, 10).cut({ x: 420, y: 930, z: 2.6 }, UP - .1).to(VB.ton, UP + .3, .4);
  cuts(cam, sc, PRE3, [['t1', VB.ton], ['m3', { x: 470, y: 700, z: 2.8 }], ['slap', { x: 430, y: 880, z: 1.6 }, 0]]);
  sfx(sc, .4, 'gulp', .6); sfx(sc, UP, 'splash', .8); sfx(sc, UP + .1, 'boing', .5); sfx(sc, UP + .4, 'marcha', .0); sfx(sc, A('slap') + .05, 'fart', .7);
  const bt = blinks(3, D), bp = blinks(9, D), bc = blinks(13, D), bg = blinks(5, D), bm = blinks(17, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); sp(q);
    const out = span(q, UP - .1, UP + .3), tl = lips(q, sc, PRE3, 't1'), salute = between(q, UP + .4, A('t1'));
    vis(ton.g, q > UP - .1); vis(thr, false);
    ton.pose({ x: TON.x + 10, y: TON.y + 120 * (1 - out) - 60 * Math.max(0, Math.sin(Math.PI * out)), s: TON.s, sq: q < UP + .5 ? -.15 : 0, look: tl !== 'X' ? .1 : .2, eyeY: -.4, mouth: tl === 'X' ? 'flat' : tl, brow: -.6, lids: .2,
               armR: salute ? 150 : speaking(q, sc, PRE3, 't1') ? 110 : 20, reachR: salute ? .7 : 1, bendR: salute ? -.8 : .3, armL: 20, shut: blinking(q, bt) }, f);
    const ml = lips(q, sc, PRE3, 'm3'), slap = q > A('slap');
    met.pose({ x: MET.x, y: MET.y + 10 * Math.sin(q * 2), s: MET.s, sq: slap ? .15 * Math.sin(q * 20) : 0, look: -.3, eyeX: -.4, eyeY: .6, mouth: ml === 'X' ? 'grin' : ml, brow: -1,
              armL: speaking(q, sc, PRE3, 'm3') ? 140 : 80, armR: 80, shut: blinking(q, bm) }, f);
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, lids: .4, mouth: 'flat', brow: -.4, eyeY: .6, armR: salute ? 150 : 20, shut: blinking(q, bg) }, f);
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, look: -.5, eyeX: -.7, eyes: 1.2, mouth: slap ? 'O' : 'smile', armL: 20, armR: 20, shut: blinking(q, bp) }, f);
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, look: -.5, eyeX: -.6, lids: .55, mouth: 'flat', shut: blinking(q, bc) }, f);
  });
}
