/* ep4 scene5 — Operation Headwind: the General turns a fan on the clouds; they scatter everywhere. "Retreat!" */
'use strict';
const PRE5 = 2.6;
function scene5(p, D, m) {
  const sc = 'scene5', A = c => clipAt(sc, PRE5, c), { cam, gen, ton, ping, cla, thr, front } = bathroom(p, { tonOpts: { hat: 'helmet' } });
  const minis = Array.from({ length: 10 }, (_, i) => ({ t: metano(front, { mini: true }), a: i / 10 * Math.PI * 2, ph: i * .7 }));
  const F0 = A('fan');
  cam.cut({ x: 450, y: 880, z: 1.5 }, 0).cut(VB.gen, A('g1') - .1).cut({ x: 450, y: 820, z: 1.0 }, F0).shake(F0, 2.4, 12).cut(VB.gen, A('g2') - .1).shake(A('g2'), 1.2, 8);
  sfx(sc, .6, 'clack', .4); sfx(sc, F0, 'whoosh', .8); sfx(sc, F0 + .6, 'whoosh', .7); sfx(sc, F0 + 1.2, 'whoosh', .7); sfx(sc, A('g2') + .1, 'siren', .3);
  const bt = blinks(3, D), bp = blinks(9, D), bc = blinks(13, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const gl = lips(q, sc, PRE5, 'g1', 'g2'), grab = q > .6, on = q > F0;
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, lids: .1, eyes: 1.1, mouth: gl === 'X' ? (on ? 'grin' : 'frown') : gl, brow: -1, armR: grab ? 95 : 20, reachR: 1.1, holdR: grab ? 'fan' : null, fanSpin: on ? (q - F0) * 40 : 0,
               armL: speaking(q, sc, PRE5, 'g1') ? 170 : 30, shake: on ? 3 : 0, eyeX: .6 }, f);
    // the wind blows the little clouds off in every direction, out of the frame
    minis.forEach((c, i) => { const u = Math.max(0, q - F0 - i * .08), d = 170 + 1400 * u * u;
      c.t.pose({ x: 470 + Math.cos(c.a) * d, y: 760 + Math.sin(c.a) * d * .8, s: .38, lean: u * 400, look: Math.cos(c.a), mouth: u > 0 ? 'O' : 'grin', eyes: u > 0 ? 1.4 : 1, brow: u > 0 ? 1 : -1, armL: 150, armR: 150 }, f); });
    ton.pose({ x: TON.x + 10, y: TON.y, s: TON.s, shake: on ? 3 : 0, eyes: 1.3, mouth: on ? 'O' : 'flat', brow: .6, armL: 150, armR: 150, shut: blinking(q, bt) }, f); vis(thr, false);
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, shake: 5, sq: on ? -.2 : 0, eyes: 1.6, mouth: 'O', armL: 160, armR: 160, shut: blinking(q, bp) }, f);
    cla.pose({ x: CLA.x + (on ? 40 * Math.min(1, q - F0) : 0), y: FLOORY, s: CLA.s, lean: on ? 18 : 0, shake: on ? 2 : 0, look: -.5, lids: on ? 0 : .5, eyes: on ? 1.3 : 1, mouth: on ? 'O' : 'flat', armL: on ? 160 : 10, armR: on ? 160 : 10, shut: blinking(q, bc) }, f);
  });
}
