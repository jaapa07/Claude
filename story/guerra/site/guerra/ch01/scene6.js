/* ep1 scene6 — the flush goes off like a bomb; the wave; the bowl is empty; Cláudio to camera; then, from the pipe:
   "I want to speak to the manager!" Abrupt cut. */
'use strict';
const PRE6 = .4;
function scene6(p, D, m) {
  const sc = 'scene6', A = c => clipAt(sc, PRE6, c), { cam, gen, thr, ton, ping, cla } = bathroom(p);
  const W0 = .25, wv = wave(p, W0, 2.6), boom = kabum(p, .35, 'FLUSH!'), sp = drops(cam.stage, .3, GEN.x, BOWL - 20, 18, 340);
  const T5 = A('t5'), CUT = A('cut') + .1, card = cutCard(p, CUT, ['A GRANDE GUERRA', 'DO COCÔ'], { sub: 'EP 2: A REVOLTA DO ESGOTO' });
  cam.cut(VB.bowl, 0).shake(.2, 1.6, 24).cut(VB.wide, 2.9).cut(VB.cla, A('c2') - .15).cut({ x: 450, y: 840, z: 3.0 }, T5 - .2).shake(T5, 2, 5);
  sfx(sc, .1, 'bigflush', .9); sfx(sc, .3, 'bigboom', .7); sfx(sc, .7, 'splash', .7);
  window.MUSIC_OFF = { scene6: t => t > 2.6 };
  const bp = blinks(9, D), bc = blinks(13, D), bg = blinks(5, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); wv(q); boom(q); sp(q); card(q);
    const fromPipe = q > T5 - .2;
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, swirl: q < 2.4 ? q * 20 : 0, shake: q < 2.4 ? 5 : 0, brow: fromPipe ? .9 : -.2, lids: fromPipe ? 0 : .3, eyes: fromPipe ? 1.4 : 1,
               eyeY: fromPipe ? 1 : .5, mouth: fromPipe ? 'O' : 'smile', shut: blinking(q, bg) }, f);
    vis(ton.g, q < .45); ton.pose({ x: TON.x, y: TON.y, s: TON.s, shake: 4, eyes: 1.5, mouth: 'O', armL: 150, armR: 150 }, f);
    ping.pose({ x: PING.x + 20, y: PING.y + 6, s: PING.s, sq: q > 2.6 ? .3 : 0, eyes: q > 2.6 ? .8 : 1.5, lids: q > 2.6 ? .5 : 0, mouth: q > 2.6 ? 'wobble' : 'O', armL: q > 2.6 ? 0 : 160, armR: q > 2.6 ? 0 : 160,
                eyeX: fromPipe ? 0 : 0, eyeY: fromPipe ? 1 : 0, shut: blinking(q, bp) }, f);
    const cl = lips(q, sc, PRE6, 'c2'), cam2 = q > A('c2') - .2;
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, ...alive(q, 3), look: cam2 ? 0 : -.5, eyeX: 0, lids: .5, mouth: cl === 'X' ? 'flat' : cl, brow: 0, armL: 10, armR: 10, shut: blinking(q, bc),
                eyeY: fromPipe ? 1 : 0 }, f);
  });
}
