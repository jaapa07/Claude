/* ep4 scene2 — Captain Methane, terror of lifts and first dates. Everybody gags. */
'use strict';
const PRE2 = 1.8;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, gen, ping, cla, front } = bathroom(p, { ton: false });
  const met = metano(front), st = stink(front, 790, FLOORY - 200, 3), lines = speedLines(p, A('m2') - .05);
  cam.cut({ x: 470, y: 760, z: 1.9 }, 0).to({ x: 470, y: 720, z: 2.6 }, .2, 1.4).cut({ x: 470, y: 700, z: 3.0 }, A('m2') - .1).cut(VB.wide, A('stink'));
  sfx(sc, .3, 'fartsqueak', .6); sfx(sc, A('m2') + .05, 'sting', .5); sfx(sc, A('stink') + .1, 'fart', .5);
  const bp = blinks(9, D), bc = blinks(13, D), bg = blinks(5, D), bm = blinks(17, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); lines(q);
    const ml = lips(q, sc, PRE2, 'm2'), brag = speaking(q, sc, PRE2, 'm2');
    met.pose({ x: MET.x, y: MET.y + 10 * Math.sin(q * 2), s: MET.s * (1 + .05 * Math.sin(q * 3)), sq: -.05, look: 0, mouth: ml === 'X' ? 'grin' : ml, brow: -1,
              armL: brag ? 160 : 90, armR: brag ? 160 : 90, bendL: -.4, bendR: -.4, shut: blinking(q, bm) }, f);
    const gag = q > A('stink') - .2;
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, lids: .6, mouth: 'wobble', brow: .8, eyeY: -.6, armL: gag ? 150 : 30, reachL: .8, shut: blinking(q, bg) }, f);
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, sq: gag ? .3 : 0, eyes: 1.3, lids: gag ? .5 : 0, mouth: gag ? 'wobble' : 'O', armL: 150, armR: 150, shake: 3, shut: blinking(q, bp) }, f);
    st(q, gag);
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, lean: gag ? -20 : 0, look: -.5, lids: gag ? .8 : .5, mouth: gag ? 'wobble' : 'flat', armL: gag ? 160 : 10, armR: 10, shut: blinking(q, bc) }, f);
  });
}
