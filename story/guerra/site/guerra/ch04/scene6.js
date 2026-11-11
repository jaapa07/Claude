/* ep4 scene6 — the clouds pour through the house; the living room is full of them. Cláudio to camera:
   "congratulations: you turned a fart into a national problem." */
'use strict';
const PRE6 = 3.2;
function scene6(p, D, m) {
  const sc = 'scene6', A = c => clipAt(sc, PRE6, c), cam = paperCam(p, 'sala', { x: 450, y: 900, z: .95 }, { after: 'sofa' });
  const cla = claudio(cam.stage), minis = Array.from({ length: 16 }, (_, i) => ({ t: metano(cam.stage, { mini: true }), x: -150 + (i % 8) * 170, y: 500 + Math.floor(i / 8) * 380, ph: i * .9 }));
  const CUT = A('cut') + .1, card = cutCard(p, CUT, ['A GRANDE GUERRA', 'DO COCÔ'], { sub: 'EP 5: O JULGAMENTO DO COCÔ' });
  cam.cut({ x: 450, y: 900, z: .95 }, 0).shake(.2, A('c1'), 6).cut({ x: 600, y: 1190, z: 2.9 }, A('c1') - .15);
  sfx(sc, .1, 'whoosh', .8); for (let i = 0; i < 7; i++) sfx(sc, .4 + i * .45, ['fart', 'fartsqueak', 'pop'][i % 3], .4); sfx(sc, 1.2, 'crash', .5); sfx(sc, A('chaos') + .3, 'siren', .25);
  window.MUSIC_OFF = { scene6: t => t > A('c1') - .3 };
  const bc = blinks(13, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    minis.forEach((c, i) => { const k = Math.min(1, Math.max(0, (q - i * .12) / .5));
      c.t.pose({ x: c.x + 60 * Math.sin(q * 1.3 + c.ph) - 900 * (1 - k), y: c.y + 40 * Math.cos(q * 1.1 + c.ph), s: .4, lean: 10 * Math.sin(q * 2 + c.ph), look: Math.sin(q + c.ph), mouth: i % 3 ? 'grin' : 'D', brow: -1,
        armL: 120 + 30 * Math.sin(q * 5 + c.ph), armR: 120 + 30 * Math.sin(q * 5 + c.ph + 1) }, f); });
    const cl = lips(q, sc, PRE6, 'c1'), talk = q > A('c1') - .2;
    cla.pose({ x: 600, y: FLOORY, s: 1.0, ...alive(q, 3), look: talk ? 0 : .4, lids: talk ? .55 : 0, eyes: talk ? 1 : 1.3, mouth: cl === 'X' ? 'flat' : cl, brow: talk ? 0 : .8, shake: talk ? 0 : 2,
                armL: talk ? 10 : 150, armR: talk ? 10 : 150, shut: blinking(q, bc) }, f);
  });
}
