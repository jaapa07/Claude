/* ep3 scene4 — the factory floor: rolls everywhere. "No! Not again!" He makes for the door. */
'use strict';
const PRE4 = 2.0;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), cam = paperCam(p, 'fabrica', VF.wide), cla = claudio(cam.stage);
  const belt = Array.from({ length: 6 }, (_, i) => claudio(cam.stage, { kid: true }));
  cam.cut({ x: 450, y: 700, z: .95 }, 0).to(VF.wide, .2, 1.6).cut(VF.cla, A('c4') - .1).to({ x: 450, y: 1150, z: 4.0 }, A('c4') + .1, .3).cut(VF.wide, A('flee'));
  sfx(sc, .2, 'marcha', .0); sfx(sc, A('c4') + .1, 'sting', .5);
  const bc = blinks(3, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    belt.forEach((k, i) => { const x = ((i * 260 + q * 140) % 1560) - 300; k.pose({ x, y: 1140, s: .42, look: 0, eyes: 1, mouth: 'smile', shut: blinking(q, [1 + i * .7, 3.5 + i * .5]) }, f); });
    const cl = lips(q, sc, PRE4, 'c4'), flee = q > A('flee');
    cla.pose({ x: flee ? 450 - 600 * span(q, A('flee'), A('flee') + 2) : 450, y: FLOORY - (flee ? Math.abs(Math.sin(q * 14)) * 20 : 0), s: .95, look: flee ? -.6 : 0, eyes: 1.5, mouth: cl === 'X' ? 'O' : cl, brow: 1, shake: 2,
               armL: 160, armR: 160, legL: flee ? 30 * Math.sin(q * 22) : 0, legR: flee ? -30 * Math.sin(q * 22) : 0, shut: blinking(q, bc) }, f);
  });
}
