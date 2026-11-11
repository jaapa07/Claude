/* ep2 scene6 — the giant pipe opens: today is cleaning day. "Cancel the planning and run!" The flood. */
'use strict';
const PRE6 = .8;
function scene6(p, D, m) {
  const sc = 'scene6', A = c => clipAt(sc, PRE6, c), { cam, vet, ton, rat, front } = sewer(p, { badge: true }), TX = 330, RX = 640;
  const F0 = A('flood'), wv = wave(p, F0 + .4, 2.6), CUT = A('cut') + .1, card = cutCard(p, CUT, ['A GRANDE GUERRA', 'DO COCÔ'], { sub: 'EP 3: O PAPEL HIGIÊNICO PEDE DEMISSÃO' });
  const torrent = mk('path', { fill: '#7fc4ef', stroke: '#3f8fd0', 'stroke-width': 8, opacity: .95 }, front);
  cam.cut(VS.pipe, 0).shake(0, 1.4, 8).cut(VS.rat, A('r4') - .1).cut(VS.ton, A('t5') - .1).cut({ x: 600, y: 900, z: 1.0 }, F0).shake(F0, 3, 18);
  sfx(sc, .1, 'creak', .6); sfx(sc, .5, 'bigflush', .5); sfx(sc, F0, 'bigflush', .9); sfx(sc, F0 + .3, 'splash', .8);
  const bt = blinks(4, D), br = blinks(9, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f); wv(q); card(q);
    const u = span(q, F0 - .2, F0 + 1.2); vis(torrent, u > 0);
    if (u > 0) torrent.setAttribute('d', `M940,420 Q${1000 - 200 * u},${600 + 300 * u} ${700 - 700 * u},${1300} L${1300},${1300} Q1240,${700} 1240,420 Z`);
    const rl = lips(q, sc, PRE6, 'r4'), run = q > A('t5') + 1.2;
    rat.pose({ x: run ? RX - 600 * (q - A('t5') - 1.2) : RX, y: LEDGE, s: .95, look: run ? -.8 : -.4, eyeX: -.6, eyes: 1.4, mouth: rl === 'X' ? 'O' : rl, brow: 1, armL: 150, armR: 150, shake: 2,
               legL: run ? 30 * Math.sin(q * 24) : 0, legR: run ? -30 * Math.sin(q * 24) : 0, shut: blinking(q, br) }, f);
    const tl = lips(q, sc, PRE6, 't5'), yell = speaking(q, sc, PRE6, 't5');
    ton.pose({ x: run ? TX - 500 * (q - A('t5') - 1.2) : TX, y: LEDGE - (run ? Math.abs(Math.sin(q * 14)) * 40 : 0), s: .9, look: yell ? 0 : .6, eyes: 1.5, mouth: tl === 'X' ? 'O' : tl, brow: 1,
               armL: 160 + 10 * Math.sin(q * 15), armR: 160 + 10 * Math.sin(q * 15 + 2), shake: yell ? 3 : 1, shut: blinking(q, bt) }, f);
    vet.pose({ x: -400, y: 1470, s: .9 }, f);
  });
}
