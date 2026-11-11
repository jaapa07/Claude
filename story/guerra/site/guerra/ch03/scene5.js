/* ep3 scene5 — dozens of little rolls chase him across the factory, shouting "Daddy!" */
'use strict';
const PRE5 = 1.0;
function scene5(p, D, m) {
  const sc = 'scene5', A = c => clipAt(sc, PRE5, c), cam = paperCam(p, 'fabrica', VF.wide), cla = claudio(cam.stage);
  const kids = Array.from({ length: 12 }, (_, i) => ({ t: claudio(cam.stage, { kid: true }), dx: (i % 6) * 120 + (i > 5 ? 60 : 0), dy: i > 5 ? 90 : 0, ph: i * .7 }));
  const CX = q => 900 - 330 * (q - .2);
  cam.cut({ x: 900, y: 1150, z: 1.6 }, 0).to({ x: q => CX(q) + 180 }, .01, .01).cut({ x: 1150, y: 1150, z: 2.4 }, A('k1') - .1).cut({ x: 450, y: 1000, z: 1.05 }, A('chase')).to({ x: q => Math.max(150, CX(q) + 260) }, A('chase') + .01, .01);
  sfx(sc, A('k1') + .2, 'patter', .6); sfx(sc, A('chase'), 'patter', .7); sfx(sc, A('chase') + 2, 'patter', .7);
  const bc = blinks(5, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const cx = CX(q);   // they all run right to left, Cláudio first
    cla.pose({ x: cx, y: FLOORY - Math.abs(Math.sin(q * 16)) * 26, s: .95, look: .6, eyeX: .8, eyes: 1.6, mouth: 'O', brow: 1, armL: 160 + 15 * Math.sin(q * 18), armR: 160 + 15 * Math.sin(q * 18 + 2),
               legL: 30 * Math.sin(q * 22), legR: -30 * Math.sin(q * 22), shut: blinking(q, bc) }, f);
    const kl = lips(q, sc, PRE5, 'k1');
    kids.forEach((k, i) => k.t.pose({ x: cx + 300 + k.dx, y: FLOORY + k.dy - 40 - Math.abs(Math.sin(q * 18 + k.ph)) * 30, s: .45, look: -.4, eyeX: -.7, eyes: 1.2,
      mouth: kl !== 'X' ? kl : 'D', brow: .6, armL: 150 + 20 * Math.sin(q * 20 + k.ph), armR: 150 + 20 * Math.sin(q * 20 + k.ph + 1), legL: 30 * Math.sin(q * 24 + k.ph), legR: -30 * Math.sin(q * 24 + k.ph) }, f));
  });
}
