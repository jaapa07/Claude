/* ep5 scene3 — Pinguinho has proof: the recording from episode 1. "Taken out of context!" */
'use strict';
const PRE3 = .8;
function scene3(p, D, m) {
  const sc = 'scene3', A = c => clipAt(sc, PRE3, c), { cam, judge, cla, ton, ping } = court(p);
  const rec = mk('g', {}, p); rec.innerHTML = `<rect x="${SW / 2 - 300}" y="300" width="600" height="380" rx="30" fill="#2b2f36" stroke="#111" stroke-width="10"/><rect x="${SW / 2 - 270}" y="330" width="540" height="320" fill="#1c3a5a"/>
    <circle cx="${SW / 2 - 220}" cy="370" r="14" fill="#ff3b30"/>${svgText('REC · EP 1', SW / 2 - 190, 382, 34, '#fff', { anchor: 'start' })}${svgText('▶ PROVA Nº 1', SW / 2, 520, 64, '#f6c443')}`;
  cam.cut(VT.ping, 0).cut({ x: 650, y: 1000, z: 1.3 }, A('x1') - .1).cut(VT.ton, A('t2') - .1);
  sfx(sc, A('x1') - .1, 'beep', .5);
  const bj = blinks(3, D), bt = blinks(7, D), bc = blinks(11, D), bp = blinks(15, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    vis(rec, between(q, A('x1') - .1, A('t2') - .1));
    judge.pose({ ...JU, look: .2, eyeX: .3, eyeY: .7, lids: .3, mouth: 'flat', holdR: 'gavel', armR: 120, shut: blinking(q, bj) }, f);
    const pl = lips(q, sc, PRE3, 'p1');
    ping.pose({ ...PG, ...alive(q, 1), look: .2, eyes: 1.3, mouth: pl === 'X' ? 'smile' : pl, brow: -.5, holdR: 'tablet', armR: 160, reachR: .9, armL: 20, shut: blinking(q, bp) }, f);
    const tl = lips(q, sc, PRE3, 't2'), sweat = q > A('x1');
    ton.pose({ ...DOCK, look: sweat ? -.3 : -.5, eyeX: -.7, eyes: sweat ? 1.3 : 1, mouth: tl === 'X' ? (sweat ? 'wobble' : 'frown') : tl, brow: .9, shake: sweat ? 2 : 0, armL: 120, armR: 120, shut: blinking(q, bt) }, f);
    cla.pose({ ...WIT, look: .5, eyeX: .7, lids: .55, mouth: sweat ? 'smile' : 'flat', shut: blinking(q, bc) }, f);
  });
}
