/* ep5 scene4 — the gavel rises; GUILTY; a gasp. */
'use strict';
const PRE4 = .6;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, judge, cla, ton, ping } = court(p);
  const HIT = A('gavel') + 1.0, boom = kabum(p, HIT, 'CULPADO!', SW / 2, SH * .7, 1.6), lines = speedLines(p, HIT);
  cam.cut(VT.judge, 0).to({ x: 450, y: 690, z: 3.4 }, .1, 1.0).cut(VT.judge, HIT).shake(HIT, .6, 20).cut(VT.wide, A('gasp'));
  sfx(sc, HIT, 'gavel', 1.0); sfx(sc, HIT + .05, 'bigboom', .4); sfx(sc, A('gasp'), 'gulp', .5);
  const bt = blinks(7, D), bc = blinks(11, D), bp = blinks(15, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); boom(q); lines(q);
    const jl = lips(q, sc, PRE4, 'j2'), up = span(q, .1, HIT - .15), hit = q >= HIT;
    judge.pose({ ...JU, look: 0, lids: .2, eyes: hit ? 1.2 : 1, mouth: jl === 'X' ? 'frown' : jl, brow: -1, holdR: 'gavel', armR: hit ? 60 : 60 + 120 * up, shut: false }, f);
    const gasp = q > A('gasp');
    ton.pose({ ...DOCK, look: -.4, eyes: gasp ? 1.7 : 1.2, mouth: 'O', brow: 1, shake: hit ? 3 : 0, armL: gasp ? 160 : 80, armR: gasp ? 160 : 80, shut: blinking(q, bt) }, f);
    cla.pose({ ...WIT, look: .5, eyeX: .7, lids: gasp ? 0 : .5, eyes: gasp ? 1.3 : 1, mouth: gasp ? 'O' : 'flat', shut: blinking(q, bc) }, f);
    ping.pose({ ...PG, eyes: gasp ? 1.8 : 1.2, mouth: 'O', brow: 1, shake: gasp ? 4 : 1, armL: gasp ? 160 : 20, armR: gasp ? 160 : 20, shut: blinking(q, bp) }, f);
  });
}
