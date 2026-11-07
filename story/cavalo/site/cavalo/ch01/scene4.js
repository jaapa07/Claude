/* scene4 — the pastel oil: Valdir greases the doorframe, Trovão shoots out on his belly across the bar, through the
   bottles, and comes to rest on a stool with Zé's twenty-year-old cachaça in his teeth. */
'use strict';
const PRE4 = .5;
function scene4(p, D, m) {
  const sc = 'scene4', A = c => clipAt(sc, PRE4, c), { cam, ze, tro, val, nei, front, puddle } = barScene(p, { neide: true });
  const S0 = A('slide'), POP = S0 + 1.3, HIT = S0 + 2.55, AFTER = S0 + 3.0;
  const slideX = q => TRO.x - 60 - (TRO.x - 60 - 900) * Math.min(1, Math.pow(Math.max(0, q - POP) / (HIT - POP), .8));
  cam.cut(V.valDoor, 0);
  cuts(cam, sc, PRE4, [['z7', V.ze], ['slide', V.tug, 0], ['v9', V.valD], ['z8', V.zeTro], ['v10', V.valD], ['z9', V.zeTro]]);
  cam.to({ x: q => Math.max(560, slideX(q) + 180), y: 980, z: 1.2 }, POP + .1, .3);   // whip after him
  cam.cut(V.stool, AFTER).shake(HIT, .5, 16);
  sfx(sc, S0 + .2, 'sizzle', .6); sfx(sc, POP, 'bonk', .7); sfx(sc, POP + .05, 'whoosh', .7); sfx(sc, POP + .1, 'neigh', .6);
  sfx(sc, HIT, 'bang', .8); sfx(sc, HIT + .05, 'crash', .7); sfx(sc, AFTER + .5, 'slurp', .6); sfx(sc, A('z9') + 1.3, 'slurp', .5);
  // three bottles knocked off the shelf behind Zé
  const bottles = [[560, 640, '#3f7a3a', -1], [630, 650, '#c9a227', 1], [480, 660, '#7a4a1e', .6]].map(([x, y, c, dir]) => {
    const g = prop(front, `<g filter="url(#paper)"><rect x="-17" y="-60" width="34" height="70" rx="8" fill="${c}"/><rect x="-7" y="-90" width="14" height="36" rx="4" fill="${c}"/><rect x="-13" y="-36" width="26" height="30" rx="3" fill="#f3e9d2"/></g>`);
    return { g, x, y, dir };
  });
  const stream = mk('path', { stroke: '#e9c46a', 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round', visibility: 'hidden' }, front);
  const flash = mk('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: '#fff', opacity: 0 }, front);
  const bz = blinks(1, D), bv = blinks(7, D), bn = blinks(12, D), bh = blinks(19, D);
  stopClock(D, (q, f) => {
    cam.apply(q, f);
    const sliding = q >= POP && q < AFTER, out = q >= AFTER;
    vis(puddle, q > S0 + .6);
    // Trovão: stuck in the door, then the slide (legs splayed, belly on the oil), then on the stool with the bottle
    let ho;
    if (out) ho = seated(tro, { hold: 'bottle', lids: q > A('v9') ? .5 : 0, jaw: between(q, AFTER + .4, AFTER + 1.2) || between(q, A('z9') + 1.2, A('z9') + 2) ? .3 * Math.abs(Math.sin(q * 14)) : 0,
                               head: 4 + 4 * Math.sin(q * .8), eyeX: q > A('z8') ? .8 : 0, shut: blinking(q, bh) });
    else if (sliding) ho = { x: slideX(q), y: FLOORY, s: TRO.s, flip: -1, bob: 130, fn: 62, ff: 70, hn: -64, hf: -56, neck: 18, head: -10, jaw: 1, tail: 40,
                             shut: false, eyeX: -1 };
    else ho = { x: TRO.x - 60, y: FLOORY, s: TRO.s, flip: -1, neck: 4 + 3 * Math.sin(q), head: 10, eyeX: q > S0 ? .9 : -.5, lids: 0,
                shut: blinking(q, bh), tail: 8 * Math.sin(q * 2), jaw: q > S0 + .8 ? .4 : 0 };
    tro.pose(ho, f);
    // Zé: no, no, no; ducks when the horse hits; then grief
    const zl = lips(q, sc, PRE4, 'z7', 'z8', 'z9'), noo = speaking(q, sc, PRE4, 'z7'), duck = between(q, HIT - .1, AFTER + .3);
    ze.pose({ x: ZE.x, y: ZE.y + (duck ? 160 : 0), s: ZE.s, ...alive(q, 6), look: q > AFTER ? .7 : .6, eyeX: .6, mouth: duck ? 'O' : zl === 'X' ? (out ? 'wobble' : 'frown') : zl,
              brow: q > A('z8') ? .9 : -.6, shut: blinking(q, bz),
              armL: noo ? 110 + 35 * Math.sin(q * 14) : speaking(q, sc, PRE4, 'z8') ? 165 : 20, armR: noo ? 110 + 35 * Math.sin(q * 14 + 2) : speaking(q, sc, PRE4, 'z9') ? 100 : speaking(q, sc, PRE4, 'z8') ? 165 : 20,
              reachL: speaking(q, sc, PRE4, 'z8') ? .8 : 1, reachR: speaking(q, sc, PRE4, 'z8') ? .8 : 1 }, f);
    // Valdir: the idea, the pan, the pour, the satisfied look
    const vl = lips(q, sc, PRE4, 'v8', 'v9', 'v10'), idea = speaking(q, sc, PRE4, 'v8'), pour = between(q, S0, POP);
    const vo = { x: VD, y: FLOORY, s: VAL.s, ...alive(q, 10), look: idea ? 0 : q > AFTER ? -.6 : .6, eyeX: idea ? 0 : q > AFTER ? -.6 : .6,
                 mouth: vl === 'X' ? (q > A('v9') ? 'smile' : 'grin') : vl, lids: q > A('v9') ? .4 : 0, brow: idea ? .6 : 0, shut: blinking(q, bv),
                 armL: idea ? 150 : 10, reachL: idea ? .9 : 1, hold: q > S0 - .5 && q < A('v10') ? 'pan' : null,
                 armR: pour ? 70 + 20 * span(q, S0, S0 + .5) : q > A('v10') && speaking(q, sc, PRE4, 'v10') ? 60 : 25 };
    val.pose(vo, f);
    vis(stream, pour && q > S0 + .3);
    if (pour) { const [hx, hy] = val.aim(vo, 'R', [0, 0]).shoulder; const lip = [hx + 175, hy + 30]; stream.setAttribute('d', `M${lip[0]},${lip[1]} q30,60 50,${FLOORY - lip[1]}`); }
    // Dona Neide jumps as the horse goes by her feet
    const hop = sliding && Math.abs(slideX(q) - NEI.x) < 260;
    nei.pose({ x: NEI.x, y: FLOORY - (hop ? 70 : 0), s: NEI.s, ...alive(q, 11), look: q > POP ? .3 : .7, mouth: hop ? 'O' : 'smile', brow: hop ? .9 : 0,
               shut: blinking(q, bn), holdL: 'bag', armL: hop ? 120 : 18, armR: hop ? 120 : 6, legL: hop ? 20 : 0, legR: hop ? 20 : 0 }, f);
    // the bottles fly and fall
    for (const b of bottles) { const u = q - HIT; vis(b.g, u > 0 && q < AFTER + .4);
      tf(b.g, `translate(${(b.x + b.dir * 260 * u).toFixed(1)},${(b.y - 300 * u + 900 * u * u).toFixed(1)}) rotate(${(b.dir * 400 * u).toFixed(0)})`); }
    flash.setAttribute('opacity', between(q, HIT, HIT + 2 / FPS) ? .7 : 0);
  });
}
