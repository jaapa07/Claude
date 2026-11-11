/* ep2 scene4 — the badge: Operations Manager (Sanitary). A smattering of applause. */
'use strict';
const PRE4 = 1.4;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, vet, ton, rat } = sewer(p), TX = 330, RX = 640;
  const tonB = tonhao(cam.stage, { badge: true }), GIVE = A('r3') + 1.2;
  cam.cut(VS.two, 0).cut({ x: 330, y: 1150, z: 3.4 }, GIVE - .2).to({ x: 330, y: 1120, z: 2.6 }, A('clap'), 1.4);
  sfx(sc, GIVE, 'pop', .6); sfx(sc, A('clap'), 'cheer', .35);
  const bt = blinks(4, D), br = blinks(9, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const rl = lips(q, sc, PRE4, 'r3'), given = q >= GIVE;
    rat.pose({ x: RX - (q > .4 && !given ? 80 : 0), y: LEDGE, s: .95, look: -.6, eyeX: -.7, mouth: rl === 'X' ? 'smile' : rl, armR: q > .4 && !given ? 100 : 20, holdR: given ? null : 'badge', armL: 10, shut: blinking(q, br) }, f);
    const proud = given ? { look: 0, eyeX: 0, lids: .35, mouth: 'grin', brow: -.3, sq: -.06 + .03 * Math.sin(q * 6) } : { look: .5, eyeX: .7, mouth: 'smile', eyes: 1.2 };
    vis(ton.g, !given); vis(tonB.g, given);
    ton.pose({ x: TX, y: LEDGE, s: .9, ...alive(q, 1), ...proud, armL: 30, armR: 30, shut: blinking(q, bt) }, f);
    tonB.pose({ x: TX, y: LEDGE, s: .9, ...alive(q, 1), ...proud, armL: 150, armR: 150, bendL: .6, bendR: .6, shut: blinking(q, bt) }, f);
    vet.pose({ x: -400, y: 1470, s: .9 }, f);
  });
}
