/* ep3 scene6 — he wakes on the bathroom floor: a nightmare? "A forecast of my retirement." A human hand comes down for
   the paper. "Ah, vai tomar no…" Cut. */
'use strict';
const PRE6 = 2.0;
function scene6(p, D, m) {
  const sc = 'scene6', A = c => clipAt(sc, PRE6, c), { cam, gen, ping, cla, front } = bathroom(p, { ton: false });
  const hand = humanHand(front), strip = mk('path', { fill: 'none', stroke: '#f4f1ea', 'stroke-width': 26, 'stroke-linejoin': 'round' }, front);
  const H0 = A('hand'), CUT = A('cut') + .05, card = cutCard(p, CUT, ['A GRANDE GUERRA', 'DO COCÔ'], { sub: 'EP 4: A INVASÃO DOS PUNS' });
  cam.cut(VB.cla, 0).shake(.3, .4, 10);
  cuts(cam, sc, PRE6, [['p1', VB.ping], ['c5', VB.cla]]);
  cam.cut({ x: 760, y: 900, z: 1.25 }, H0).cut({ x: 790, y: 1150, z: 3.4 }, A('c6') - .1);
  sfx(sc, .3, 'gulp', .5); sfx(sc, H0 + .3, 'whoosh', .5); sfx(sc, H0 + 1.0, 'rolling', .6);
  window.MUSIC_OFF = { scene6: t => t > H0 };
  const bp = blinks(9, D), bc = blinks(13, D), bg = blinks(5, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, lids: .4, mouth: 'flat', eyeX: .7, eyeY: .5, shut: blinking(q, bg) }, f);
    const pl = lips(q, sc, PRE6, 'p1');
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, look: .5, eyeX: .7, eyes: 1.2, mouth: pl === 'X' ? 'O' : pl, brow: .8, armL: 30, armR: 30, shut: blinking(q, bp) }, f);
    // the hand: down from above, takes the loose end, pulls up; the paper unrolls and Cláudio spins on the spot
    const down = span(q, H0, H0 + .8), pull = span(q, H0 + 1.0, H0 + 2.0) + span(q, A('c6'), A('c6') + 1.2);
    const hx = CLA.x + 70, hy = FLOORY - 120 - 900 * (1 - down) - 260 * pull;
    tf(hand, `translate(${hx},${hy})`); vis(hand, q > H0 - .1); vis(strip, q > H0 + 1.0);
    strip.setAttribute('d', `M${CLA.x + 60},${FLOORY - 110} Q${CLA.x + 90},${(FLOORY - 110 + hy) / 2} ${hx},${hy + 30}`);
    const wake = span(q, .2, .8), cl = lips(q, sc, PRE6, 'c5', 'c6'), spin = q > H0 + 1.0;
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, lean: spin ? 0 : -80 * (1 - wake), sq: spin ? .12 * Math.sin(q * 30) : 0, look: spin ? .3 : 0, eyeY: spin ? -.8 : 0, eyes: q < 1 ? 1.5 : 1,
                lids: q < .2 ? 1 : spin ? 0 : .5, mouth: cl === 'X' ? (spin ? 'O' : 'flat') : cl, brow: spin ? -1 : 0, shake: spin ? 3 : 0, armL: spin ? 140 : 10, armR: spin ? 140 : 10, shut: blinking(q, bc) }, f);
  });
}
