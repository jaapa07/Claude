/* ch03 scene3 — Zé on the phone to the ambulance (it's the owner of the bar giving birth); Neide coaches; Valdir pushes
   too; the foal arrives. */
'use strict';
const PRE3 = .4;
const FX = 290;   // where the foal lands
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, ze, tro, val, nei } = barScene(p, { neide: true });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const zeb = horsePuppet(cam.stage, ZEBRA); cam.stage.insertBefore(zeb.g, nei.g);
  const foal = horsePuppet(cam.stage, FOAL); cam.stage.insertBefore(foal.g, nei.g);
  const P0 = A('push'), BORN = P0 + 1.9;
  cam.cut(V3.ze, 0);
  cuts(cam, sc, PRE3, [['n4', V3.nei], ['n5', V3.val], ['push', { x: 640, y: 1060, z: 1.3 }, 0]]);
  cam.to({ x: 520, y: 1080, z: 1.6 }, P0 + .2, 1.6);
  sfx(sc, P0 + .3, 'neigh', .5); sfx(sc, BORN, 'pop', .8); sfx(sc, BORN + .1, 'boing', .5);
  const bz = blinks(4, D), bv = blinks(8, D), bn = blinks(12, D), bzz = blinks(18, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const heave = Math.max(0, Math.sin(q * 6)) * (q > P0 && q < BORN ? 1 : .3);
    tro.pose({ ...lying(q, 1), head: LIE.head - 14 * heave, jaw: q > P0 && q < BORN ? .5 * heave : 0, shut: q > P0 && q < BORN }, f);
    vis(foal.g, q >= BORN);
    foal.pose({ x: FX, y: FLOORY, s: .5, flip: 1, ...LIE, neck: 0, head: 10, shut: q < BORN + .6, tail: 20 }, f);
    zeb.pose({ x: EX3, y: FLOORY, s: 1, flip: -1, neck: 10, head: 16, eyeX: .8, lids: .2, tail: 10 * Math.sin(q * 2.4), shut: blinking(q, bzz) }, f);
    const zl = lips(q, sc, PRE3, 'z4', 'z4b'), oZ = { x: ZX3, y: FLOORY, s: ZE.s, ...alive(q, 1), look: -.3, eyeX: -.6, mouth: zl === 'X' ? 'O' : zl, brow: .9,
               shut: blinking(q, bz), hold: 'phone' };
    { const [ex, ey] = ze.point(oZ, 'capR'); Object.assign(oZ, ze.aim(oZ, 'R', [ex + 10 * ZE.s, ey + 46 * ZE.s]), { armFrontR: true }); }
    ze.pose(oZ, f);
    const nl = lips(q, sc, PRE3, 'n4', 'n5'), coach = speaking(q, sc, PRE3, 'n4') || q > P0;
    nei.pose({ x: NX3, y: FLOORY, s: NEI.s, ...alive(q, 7), look: speaking(q, sc, PRE3, 'n5') ? -.0 : .7, eyeX: .8, mouth: nl === 'X' ? (q > BORN ? 'smile' : 'flat') : nl,
               brow: coach ? .5 : 0, lean: coach ? 10 : 0, shut: blinking(q, bn), holdL: 'bag', armR: coach ? 80 + 25 * Math.sin(q * 6) : 20, armL: q > BORN ? 100 : 18 }, f);
    // Valdir pushes along with her, red-faced and squashed
    const strain = between(q, A('n4') + .4, A('n5') + 1.4);
    val.pose({ x: VX3, y: FLOORY, s: VAL.s, ...alive(q, 4), look: -.5, eyeX: -.6, mouth: strain ? 'grin' : 'O', brow: strain ? -1 : .6, lids: strain ? .7 : 0,
               squash: strain ? .05 + .03 * Math.sin(q * 14) : 0, shut: blinking(q, bv), hold: 'pan', armL: strain ? 70 : 10, armR: strain ? 70 : 20 }, f);
  });
}
