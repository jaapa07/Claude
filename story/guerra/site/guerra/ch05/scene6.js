/* ep5 scene6 — the door bursts open: a giant golden poo in sunglasses. "Who locked up my son?" Everyone freezes.
   CONTINUA NA SEGUNDA TEMPORADA… */
'use strict';
const PRE6 = .8;
function scene6(p, D, m) {
  const sc = 'scene6', A = c => clipAt(sc, PRE6, c), { cam, judge, cla, ton, ping, dad, glow } = court(p, { gold: true });
  const FZ = A('freeze'), END = A('end'), card = cutCard(p, END, ['CONTINUA NA', 'SEGUNDA TEMPORADA…'], { sub: 'A GRANDE GUERRA DO COCÔ' });
  cam.cut(VT.door, 0).shake(.3, .6, 14).cut(VT.gold, A('d1') - .15).to({ x: 930, y: 1080, z: 2.8 }, A('d1') + .2, 2.4).cut(VT.wide, FZ).to({ x: 680, y: 940, z: 1.05 }, FZ + .1, 2.0);
  sfx(sc, .3, 'creak', .7); sfx(sc, .35, 'bang', .6); sfx(sc, .5, 'sting', .7); sfx(sc, .9, 'step1', .7); sfx(sc, 1.5, 'step1', .7); sfx(sc, 2.1, 'step1', .7);
  window.MUSIC_OFF = { scene6: t => t > .3 };
  stopClock(D, (q, f) => {
    cam.apply(q, f); card(q);
    glow.setAttribute('opacity', (span(q, .3, .7) * .9).toFixed(2));
    const walk = span(q, .8, 2.6), dl = lips(q, sc, PRE6, 'd1'), fq = Math.min(q, FZ);   // after FZ, everybody is frozen in place
    const ff = q >= FZ ? Math.floor(FZ * FPS) : f;
    dad.pose({ x: 1170 - 290 * walk, y: FLOORY, s: 1.75, bob: walk < 1 ? -10 * Math.abs(Math.sin(fq * 7)) : 0, look: -.4, mouth: dl === 'X' ? 'frown' : dl, brow: -1, armL: walk < 1 ? 20 + 10 * Math.sin(fq * 7) : 60, armR: 30 }, ff);
    judge.pose({ ...JU, look: .5, eyeX: .8, eyes: 1.5, mouth: 'O', brow: 1, holdR: 'gavel', armR: 160 }, ff);
    ton.pose({ ...DOCK, look: .3, eyeX: .8, eyes: 1.3, mouth: q > A('d1') + 1 ? 'grin' : 'O', brow: .4, armL: 60, armR: 60 }, ff);
    cla.pose({ ...WIT, look: .5, eyeX: .8, eyes: 1.6, lids: 0, mouth: 'O', brow: 1, armL: 150, armR: 150 }, ff);
    ping.pose({ ...PG, look: .5, eyeX: .8, eyes: 1.8, mouth: 'O', brow: 1, shake: q < FZ ? 4 : 0, armL: 160, armR: 160 }, ff);
  });
}
