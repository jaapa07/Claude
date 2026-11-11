// Bridges between episodes (a shared clock: the last frame of one episode is the first frame of the next) and episodes 2–5.
import { clamp, seg, ss, eo, ei, eio, back, lerp, shake, TAU, hash } from './lib.js';
import { INK, blob, ink, lw, word, sweat } from './toon.js';
import { puff, stars, speedLines, punch, holo, pixelate, foam, ia } from './sets.js';
import { E0, show, arc, walkPh, land, plunger, phone, money } from './common.js';

// —— B12: black, then the lift opens by itself in the foam-flooded corridor (joint at J = 3.0) ——
function b12(side) {
  const J = 3.0;
  return { name: side === 'out' ? 'elevador abre' : 'sai da espuma', scene: 'corridor', bridge: [J, side], dur: side === 'out' ? 3.0 : 0, mood: side === 'out' ? 'eerie' : 'eerie',
    lines: side === 'in' ? [['J7', 1.7]] : null, tail: .4,
    set: b => ({ foam: .32, foamSeed: 3, lift: ss(seg(b, 1.0, 2.6)), liftGlow: seg(b, 1.0, 1.6) }),
    cast(b, D, S, t) { if (b < J + .2) return; const up = eo(seg(b, J + .2, J + 1.2)), x = b < J + 3.8 ? 700 : lerp(700, 1250, ss(seg(b, J + 3.8, J + 5.6)));
      show(S.jun, { x, y: lerp(-0, 0, up), face: 1, walk: b > J + 3.8 && b < J + 5.6 ? .6 : 0, ph: walkPh(x), aB: .1, aF: .1, E: { lid: .6, mouth: 'flat', look: b > J + 3.4 ? [1, 0] : [0, 0] }, sq: lerp(.3, 1, up), goo: 1 }); },
    front(c, b, D, t, S) {
      if (b < J + .2 || (S.jun.vis && b < J + 1.2)) { // a pair of eyes in the foam
        const k = b < J + .2 ? 1 : 1 - seg(b, J + .2, J + .4); if (k > 0 && b > 1.6) { for (const s of [-1, 1]) { blob(c, '#fff', () => c.ellipse(700 + s * 34, -500, 30, 36, 0, 0, TAU)); c.fillStyle = INK; c.beginPath(); c.arc(700 + s * 34 + 10, -495, 7, 0, TAU); c.fill(); } } }
      if (S.jun.vis) { const P = S.jun; c.save(); c.translate(P.x, P.y); c.scale(1, P.sq); for (const [dx, dy, r] of [[-40, -620, 50], [30, -650, 44], [60, -420, 40], [-50, -300, 46], [10, -180, 36], [-20, -560, 30]]) blob(c, '#8a5a2a', () => c.arc(dx, dy, r, 0, TAU), { line: 5 }); c.restore(); }
    },
    cam: (b, D) => b < J + 3.6 ? [lerp(1050, 950, seg(b, 0, J + 3.6)), -620, lerp(.82, .9, seg(b, J, J + 3.6))] : [lerp(950, 1200, ss(seg(b, J + 3.6, J + 5.6))), -620, .9],
    ui(c, b) { if (b < .8) { c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1920); } },
    sfx: side === 'out' ? [[(D) => D - 2.0 + .0, 'ding', -2], [(D) => D - 1.9, 'lift_open', -6]] : [[.2, 'goo', -6], [3.8, 'squelch', -8]] };
}
export const BR = { b12 };
export const EP2 = [], EP3 = [], EP4 = [], EP5 = [];
