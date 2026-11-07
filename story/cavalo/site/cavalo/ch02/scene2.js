/* ch02 scene2 — Zé asks for his bar back; Trovão slides FIADO SÓ AMANHÃ across the counter; Valdir's next plan. */
'use strict';
const PRE2 = .4;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, ze, val } = barScene(p, { horse: false });
  cam.stage.appendChild(ze.g);   // Zé is a customer now: in front of the counter, with everyone else
  const horse = horsePuppet(cam.stageAt.floor), sign = trovaoSign(cam.stage), card = fiadoCard(cam.stage);
  cam.stage.prepend(card); cam.stage.prepend(sign);
  const S0 = A('sign');
  cam.cut(V2.ze, 0).cut({ x: 620, y: 930, z: 1.6 }, S0 - .1).to({ x: 660, y: 960, z: 1.9 }, S0 + .3, 1.8);
  cuts(cam, sc, PRE2, [['v3', V.val], ['z4', V2.ze], ['v4', V.val], ['z5', V2.ze], ['v5', V.val], ['z6', V2.ze], ['v6', V.val]]);
  sfx(sc, S0 + .5, 'scrape', .6); sfx(sc, S0 + 1.6, 'clack', .5);
  const bz = blinks(2, D), bv = blinks(7, D), bh = blinks(12, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    // the hoof comes up over the counter and pushes the card towards Zé
    const lift = span(q, S0 + .1, S0 + .5) * (1 - span(q, S0 + 1.8, S0 + 2.2)), push = span(q, S0 + .5, S0 + 1.6);
    const ho = { ...TB, fn: 78 * lift, neck: 2 + 3 * Math.sin(q), head: 4, lids: .5, eyeX: .7, shut: blinking(q, bh), tail: 8 * Math.sin(q * 2) };
    horse.pose(ho, f);
    const cx = 560 + 120 * push;
    tf(card, `translate(${cx.toFixed(1)},1040)`);
    const zl = lips(q, sc, PRE2, 'z3', 'z4', 'z5', 'z6'), angry = speaking(q, sc, PRE2, 'z3') || speaking(q, sc, PRE2, 'z4');
    const facepalm = speaking(q, sc, PRE2, 'z5');
    const zo = { x: ZF, y: FLOORY, s: ZE.s, ...alive(q, 2), look: -.6, eyeX: -.6, mouth: zl === 'X' ? 'frown' : zl, brow: angry ? -1 : -.3,
                 lids: facepalm ? .6 : 0, shut: blinking(q, bz), armR: angry ? 100 + 10 * Math.sin(q * 9) : 15, lean: angry ? -5 : 0 };
    if (facepalm) Object.assign(zo, ze.aim(zo, 'L', ze.point(zo, 'capL')), { armFrontL: true });
    ze.pose(zo, f);
    const vl = lips(q, sc, PRE2, 'v3', 'v4', 'v5', 'v6');
    val.pose({ x: VAL.x, y: FLOORY, s: VAL.s, ...alive(q, 5), look: .5, eyeX: .5, lids: .3, mouth: vl === 'X' ? 'smile' : vl, shut: blinking(q, bv),
               armL: speaking(q, sc, PRE2, 'v4') ? 140 : 10, reachL: speaking(q, sc, PRE2, 'v4') ? .9 : 1,
               armR: speaking(q, sc, PRE2, 'v5') || speaking(q, sc, PRE2, 'v6') ? 45 + 12 * Math.sin(q * 5) : 10 }, f);
  });
}
