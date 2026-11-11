/* ep4 scene4 — Methane splits into little clouds: "losers, losers!"; "it's multiplying!"; "great, now it's a franchise". */
'use strict';
const PRE4 = 1.4;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, gen, ton, ping, cla, thr, front } = bathroom(p, { tonOpts: { hat: 'helmet' } });
  const met = metano(front), minis = Array.from({ length: 9 }, (_, i) => ({ t: metano(front, { mini: true }), a: i / 9 * Math.PI * 2, r: 170 + 70 * (i % 3), ph: i * .8 }));
  const SPLIT = .6;
  cam.cut({ x: 470, y: 760, z: 1.6 }, 0).to({ x: 470, y: 820, z: 1.15 }, SPLIT + .3, 1.6);
  cuts(cam, sc, PRE4, [['n1', { x: 470, y: 780, z: 1.25 }], ['p2', VB.ping], ['c0', VB.cla]]);
  for (let i = 0; i < 6; i++) sfx(sc, SPLIT + i * .25, i % 2 ? 'pop' : 'fartsqueak', .45);
  const bt = blinks(3, D), bp = blinks(9, D), bc = blinks(13, D), bg = blinks(5, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const sp = span(q, SPLIT, SPLIT + 1.6), nl = lips(q, sc, PRE4, 'n1');
    met.pose({ x: MET.x, y: MET.y + 10 * Math.sin(q * 2), s: MET.s * (1 - .45 * sp), look: 0, mouth: 'grin', brow: -1, armL: 120, armR: 120 }, f);
    minis.forEach((c, i) => { const k = Math.min(1, Math.max(0, (q - SPLIT - i * .18) / .5)); vis(c.t.g, k > 0);
      c.t.pose({ x: MET.x + Math.cos(c.a + q * .8) * c.r * k, y: MET.y + 40 + Math.sin(c.a + q * .8) * c.r * .7 * k, s: .38 * k, look: Math.cos(c.a), mouth: nl !== 'X' ? nl : 'grin', brow: -1,
        armL: 120 + 30 * Math.sin(q * 6 + c.ph), armR: 120 + 30 * Math.sin(q * 6 + c.ph + 1) }, f); });
    const pl = lips(q, sc, PRE4, 'p2');
    ping.pose({ x: PING.x, y: PING.y, s: PING.s, eyes: 1.7, mouth: pl === 'X' ? 'O' : pl, brow: 1, shake: 5, armL: 160, armR: 160, eyeY: -.8, shut: blinking(q, bp) }, f);
    ton.pose({ x: TON.x + 10, y: TON.y, s: TON.s, look: .2, eyeY: -.8, eyes: 1.3, mouth: 'O', brow: .8, armL: 60, armR: 60, shut: blinking(q, bt) }, f); vis(thr, false);
    gen.pose({ x: GEN.x, y: FLOORY, s: GEN.s, lids: .2, eyes: 1.2, mouth: 'O', brow: .5, eyeY: -.9, shut: blinking(q, bg) }, f);
    const cl = lips(q, sc, PRE4, 'c0');
    cla.pose({ x: CLA.x, y: FLOORY, s: CLA.s, ...alive(q, 3), look: speaking(q, sc, PRE4, 'c0') ? 0 : -.5, lids: .6, mouth: cl === 'X' ? 'flat' : cl, shut: blinking(q, bc) }, f);
  });
}
