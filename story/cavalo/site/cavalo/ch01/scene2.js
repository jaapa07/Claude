/* scene2 — the plan: Zé wants the horse out before the health inspection; Valdir has a plan (his plans have a record);
   he tugs Trovão by the halter and the horse sticks in the door. */
'use strict';
const PRE2 = 1.3;
function scene2(p, D, m) {
  const sc = 'scene2', A = c => clipAt(sc, PRE2, c), { cam, ze, tro, val, rope } = barScene(p);
  cam.cut(V.door, 0);
  cuts(cam, sc, PRE2, [['z4', V.ze], ['v4', V.two], ['z5', V.ze], ['v5', V.val], ['tug', V.tug, 0], ['v6', V.valDoor, -.3]]);
  sfx(sc, .25, 'neigh', .45);
  const T0 = A('tug'), yanks = [T0 + .5, T0 + 1.25, T0 + 2.0];
  yanks.forEach((t, i) => { sfx(sc, t, 'thud', .5); if (i === 2) sfx(sc, t + .1, 'bonk', .6); });
  const bz = blinks(2, D), bv = blinks(6, D), bh = blinks(11, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const tugging = q >= T0 - .1;
    // each yank pulls the horse a little way out; the door frame holds his belly and he springs back
    const pull = yanks.reduce((a, t) => a + Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (q - t) / .5)))), 0);
    const ho = { x: TRO.x - 24 * pull - (tugging ? 30 : 0), y: FLOORY, s: TRO.s, flip: -1,
      neck: tugging ? -14 - 10 * pull : 6 + 4 * Math.sin(q * 1.1), head: tugging ? 22 : 6 * Math.sin(q * .7),
      fn: tugging ? -18 : 0, ff: tugging ? -12 : 0, hn: tugging ? -6 : 0, jaw: q < 1.1 && q > .25 ? .5 + .5 * Math.abs(Math.sin(q * 20)) : 0,
      lids: q > A('v6') - .3 ? .5 : 0, eyeX: tugging ? .7 : -.5, shut: blinking(q, bh), tail: 8 * Math.sin(q * 2) };
    tro.pose(ho, f);
    const zl = lips(q, sc, PRE2, 'z4', 'z5'), ang = speaking(q, sc, PRE2, 'z4');
    ze.pose({ x: ZE.x, y: ZE.y, s: ZE.s, ...alive(q, 2), look: .6, eyeX: .5, mouth: zl === 'X' ? (q > A('z5') ? 'flat' : 'frown') : zl,
              brow: ang ? -1 : -.3, lids: speaking(q, sc, PRE2, 'z5') ? .5 : 0, shut: blinking(q, bz),
              armR: ang ? 105 + 6 * Math.sin(q * 10) : 30, armL: speaking(q, sc, PRE2, 'z5') ? 0 : 20, hold: 'glass', lean: ang ? 5 : 0 }, f);
    const vl = lips(q, sc, PRE2, 'v4', 'v5', 'v6');
    if (!tugging) {
      val.pose({ x: VAL.x, y: FLOORY, s: VAL.s, ...alive(q, 5), look: -.5, eyeX: -.3, lids: .3, mouth: vl === 'X' ? 'smile' : vl,
                 shut: blinking(q, bv), armL: speaking(q, sc, PRE2, 'v4') ? 140 : 10, reachL: speaking(q, sc, PRE2, 'v4') ? .9 : 1,
                 armR: speaking(q, sc, PRE2, 'v5') ? 50 + 15 * Math.sin(q * 6) : 10, mouthOverride: 0 }, f);
      vis(rope, false);
    } else {
      // leaning back on the rope, heels dug in; then, stuck, he turns to us
      const stuck = q > A('v6') - .3, jerk = pull;
      const vo = { x: VD - 18 * jerk, y: FLOORY, s: VAL.s, look: stuck ? 0 : .7, eyeX: stuck ? 0 : .8, lids: stuck ? .55 : 0,
                   mouth: stuck ? (vl === 'X' ? 'flat' : vl) : 'grin', brow: stuck ? 0 : -.6, lean: stuck ? -4 : -14 + 6 * jerk,
                   legL: 14, legR: -6, shut: blinking(q, bv), hold: 'rope' };
      const muzzle = tro.at(ho, 'muzzle'), hand = [vo.x + 120 * VAL.s, FLOORY - 150 * VAL.s];
      Object.assign(vo, val.aim(vo, 'R', hand));
      val.pose(vo, f);
      const mx = (hand[0] + muzzle[0]) / 2, sag = 30 - 22 * Math.min(1, jerk);
      rope.setAttribute('d', `M${hand[0].toFixed(1)},${hand[1].toFixed(1)} Q${mx.toFixed(1)},${(Math.max(hand[1], muzzle[1]) + sag).toFixed(1)} ${muzzle[0].toFixed(1)},${muzzle[1].toFixed(1)}`);
      vis(rope, true);
    }
  });
}
