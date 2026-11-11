// The five episodes as beats. A beat: { scene, line | lines, lead, tail, dur, fill, tr, bridge:[J,'out'|'in'], cam(u,D,S)→[x,y,zoom], cast(u,D,S,t), set(u,D), back/front(c,u,D,t,S), ui(c,u,D,t,S), sfx:[[at,name,dB,pan]] }
import { K, clamp, seg, ss, eo, ei, eio, back, lerp, pop, shake, TAU, hash } from './lib.js';
import { INK, blob, ink, lw, word, sweat } from './toon.js';
import { puff, stars, speedLines, punch, holo, pixelate, foam, roof, ia } from './sets.js';
import { osvaldo, juninho } from './cast.js';
import { EP2, EP3, EP4, EP5, BR, cover } from './eps2.js';
import { E0, show, arc, walkPh, land, plunger, phone, money } from './common.js';

// ———————————————————— EPISÓDIO 1 · O VASO POSSUÍDO ————————————————————
const EP1 = [
  cover(1),
  { name: 'chinelo', scene: 'lobby', dur: 2.4, tr: 'flash', mood: 'deadpan',
    cast(u, D, S) { const x = lerp(-700, -150, Math.min(1, u / 1.4));
      show(S.jun, { x, face: 1, walk: u < 1.4 ? .8 : 0, ph: walkPh(x), aB: .1, aF: .1, legs: u > 1.4 ? [0, 0, -.3, .9] : null, E: { lid: .55, look: u > 1.5 ? [0, 1] : [1, 0], mouth: 'flat' } }); },
    front(c, u, D, t, S) { if (u > 1.4) { c.save(); c.translate(-120, -10); blob(c, '#2d8a5a', () => c.ellipse(60, 0, 46, 12, 0, 0, TAU)); c.restore(); word(c, 'PLEC', 30, -140, 60, back(seg(u, 1.4, 1.55)) * (1 - seg(u, 2.1, 2.4)), '#fff'); } },
    cam: (u, D) => u < 1.4 ? [lerp(-500, -150, u / 1.4), -360, 1.2] : [-110, -120, 2.6],
    sfx: [[.1, 'flipflop', -6], [.45, 'flipflop', -6], [.8, 'flipflop', -6], [1.15, 'flipflop', -6], [1.4, 'snap', -2]] },

  { name: 'osvaldo surge', scene: 'lobby', line: 'O1', lead: .25, tail: .3, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const pop0 = back(seg(u, 0, .25), 2.5);
      show(S.osv, { x: lerp(500, 120, pop0), face: -1, aB: .2, aF: lerp(.2, 1.5, eo(seg(u, 1.6, 2.1))), bF: .1, E: { lid: .1, brow: -.5, mouth: 'smile', stache: .3 }, hold: (c, x, y, a) => { if (u > 1.6) plunger(c, x, y, a, t); } });
      show(S.jun, { x: -150, face: 1, aB: .1, aF: lerp(.1, 1.3, eo(seg(u, 2.4, 2.8))), bF: .1, sq: u < .3 ? 1.15 : 1, E: { eye: u < .6 ? 'wide' : 'open', lid: u < .6 ? 0 : .5, mouth: 'flat' } }); S.order = ['jun', 'osv']; },
    cam: (u, D) => [lerp(0, -20, u / D), -480, lerp(1.25, 1.35, u / D)],
    sfx: [[0, 'pop', -2], [.05, 'boing', -6], [1.7, 'whoosh', -8]] },

  { name: 'a regra', scene: 'lobby', line: 'O2', lead: .2, tail: .5, tr: 'cut', mood: 'ominous',
    cast(u, D, S, t) { const k = seg(u, 0, D);
      show(S.osv, { x: 120, face: -1, lean: -.08 * k, aB: .2, aF: u > 3.3 ? 2.7 : .4, bF: .1, E: { lid: .1, brow: -1, mouth: 'flat', stache: u > 3.8 ? 1 : .2 } }); },
    front(c, u, D, t) { if (u > 3.8) { c.save(); c.globalAlpha = .55 * (Math.sin(u * 40) > 0 ? 1 : .3) * (1 - seg(u, 4.4, 4.9)); c.fillStyle = '#e8f0ff'; c.fillRect(-3000, -3000, 6000, 6000); c.restore(); } },
    cam: (u, D) => [lerp(120, 170, eo(seg(u, 0, D))), lerp(-560, -600, u / D), lerp(1.6, 3.0, eio(seg(u, .2, D - .3)))],
    sfx: [[3.85, 'thunder', -2]] },

  { name: 'volta armado', scene: 'lobby', line: 'J1', lead: .35, tail: .4, tr: 'cut', mood: 'deadpan',
    cast(u, D, S, t) { show(S.jun, { x: -150, face: 1, aB: .1, aF: 1.2, bF: .1, E: { lid: .6, mouth: 'flat', look: [.6, 0] }, hold: (c, x, y, a) => plunger(c, x, y, a, t) }); },
    cam: (u, D) => [-120, -560, lerp(2.2, 2.35, u / D)] },

  { name: 'advogado', scene: 'lobby', line: 'O3', lead: .3, tail: 1.6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const popT = 2.3, k = seg(u, popT, popT + .5);
      show(S.osv, { x: 120, face: -1, aB: .2, aF: .3, E: { lid: .1, brow: -.9, mouth: 'flat', stache: .4, eye: u > popT && u < popT + .6 ? 'wide' : 'open' }, sq: u > popT && u < popT + .3 ? .92 : 1 });
      show(S.jun, { x: -150, face: 1, aB: .1, aF: 1.2, bF: .1, rot: u > popT + .45 ? -.05 : 0, E: { eye: u > popT + .45 ? 'x' : 'open', lid: .55, mouth: u > popT + .45 ? 'o' : 'flat', open: .3 }, hold: (c, x, y, a) => plunger(c, x, y, a, t) }); S.order = ['jun', 'osv']; },
    front(c, u, D, t) { const popT = 2.3; if (u > popT) { const k = seg(u, popT, popT + .45), [x, y] = arc(k, 120 - 30, -310, -120, -600, 120); if (k < 1) blob(c, '#d8d0c0', () => c.arc(x, y, 9, 0, TAU), { line: 3 }); word(c, 'TOINK!', -100, -760, 80, back(seg(u, popT + .45, popT + .6)) * (1 - seg(u, popT + 1.1, popT + 1.3))); } },
    cam: (u, D) => [lerp(0, -20, u / D), -480, 1.25],
    sfx: [[2.3, 'pop', 0], [2.75, 'bonk', -2]] },

  { name: 'porta 404', scene: 'bathroom', dur: 4.2, tr: 'whip', mood: 'creepy', set: () => ({}),
    cast(u, D, S, t) { const x = lerp(-900, -380, Math.min(1, u / 1.6));
      show(S.jun, { x, face: 1, walk: u < 1.6 ? .5 : 0, ph: walkPh(x), aB: .1, aF: 1.1, bF: .2, E: { lid: .3, mouth: 'flat', look: [1, 0], sweat: seg(u, 2, 3) }, hold: (c, x, y, a) => plunger(c, x, y, a, t) });
      show(S.vaso, { x: 260, face: -1, shake: u > 1.8 ? seg(u, 1.8, 3.2) : 0, E: { eye: 'closed', mouth: 'flat' } }); },
    cam: (u, D) => [lerp(-200, 0, u / D), -520, lerp(.95, 1.05, u / D)],
    shake: u => u > 2.2 ? 4 : 0,
    sfx: [[.05, 'creak', -4], [1.8, 'rattle', -4]] },

  { name: 'acorda vaso', scene: 'bathroom', line: 'V1', lead: .4, tail: .2, tr: 'cut', mood: 'shock',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, E: { eye: u < .35 ? 'closed' : 'open', brow: -1, mouth: 'flat', lidUp: u < .4 ? 0 : .2, red: u > .4 } });
      const jump = seg(u, .45, .75);
      show(S.jun, { x: -380, y: lerp(0, -1180, eo(jump)), face: 1, sq: u > .45 && u < .75 ? 1.5 : 1, rot: u > .75 ? Math.PI : 0, aB: 2.6, aF: 2.8, legs: u > .75 ? [.3, 1, -.3, 1] : null, E: { eye: 'wide', mouth: 'scream', open: .6, brow: 1 }, hold: () => {} }); S.order = ['vaso', 'jun']; },
    cam: (u, D) => u < .45 ? [200, -470, 2.3] : [0, -900, .78],
    sfx: [[.35, 'eyes_open', -4], [.45, 'boing', -2], [.75, 'splat', -4]] },

  { name: 'caralho fala', scene: 'bathroom', line: 'J2', lead: .1, tail: .2, tr: 'cut', mood: 'shock',
    cast(u, D, S, t) { show(S.jun, { x: -380, y: -1180, face: 1, rot: Math.PI, aB: 2.6, aF: 2.8, legs: [.3, 1, -.3, 1], E: { eye: 'wide', mouth: 'scream', open: .4, brow: 1, shake: 1 } }); },
    cam: (u, D) => [-400, -1460, 1.6] },

  { name: 'empatados', scene: 'bathroom', line: 'V2', lead: .2, tail: .8, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, E: { eye: 'open', lid: .45, brow: -.6, mouth: 'grin', curl: .8, look: [1, -.6] } });
      const fall = seg(u, D - 1.1, D - .7);
      show(S.jun, { x: -380, y: lerp(-1180, 0, ei(fall)), face: 1, rot: lerp(Math.PI, Math.PI * 2, fall), sq: u > D - .7 ? .35 + .65 * seg(u, D - .4, D) : 1, aB: 2.6, aF: 2.8, E: { eye: u > D - .7 ? 'spiral' : 'wide', mouth: 'flat', brow: 1 } }); S.order = ['vaso', 'jun']; },
    cam: (u, D) => u < D - 1.1 ? [220, -500, 1.9] : [-80, -520, 1.0],
    sfx: [[(D) => D - .7, 'splat', 0]] },

  { name: 'fofoca do vaso', scene: 'bathroom', line: 'V3', lead: .3, tail: .3, tr: 'cut', mood: 'gossip',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, E: { eye: 'open', lid: .2, brow: .2, mouth: 'flat', look: [-1, 0] } });
      show(S.jun, { x: -360, sit: 1, face: 1, aB: .4, aF: 2.2, bF: 1.8, E: { lid: .6, look: [1, 0], mouth: 'flat' } }); },
    front(c, u, D, t) {
      holo(c, -150, -1300, 420, 300, back(seg(u, .9, 1.2)) * (1 - seg(u, 3.2, 3.4)), t, c => { c.fillStyle = '#6a3a1a'; c.fillRect(-300, -200, 600, 400); blob(c, '#3a1a0a', () => c.ellipse(0, 40, 140, 60, 0, 0, TAU)); word(c, 'FEIJOADA', 0, -90, 50, 1, '#fff', 0); word(c, 'SEGUNDA', 0, 120, 40, 1, '#ffe23a', 0); });
      holo(c, -150, -1300, 420, 300, back(seg(u, 3.5, 3.8)) * (1 - seg(u, D - .2, D)), t, c => { c.fillStyle = '#7fc4d8'; c.fillRect(-300, -200, 600, 400); for (let k = 0; k < 12; k++) { c.strokeStyle = '#4a8ae8'; c.lineWidth = 6; c.beginPath(); c.moveTo(-180 + k * 33, -150 + (t * 300 + k * 40) % 250); c.lineTo(-185 + k * 33, -120 + (t * 300 + k * 40) % 250); c.stroke(); } word(c, '202', 0, -100, 60, 1, '#fff', 0); word(c, 'BUÁÁÁ', 0, 90, 60, 1, '#9fd8ff', .05); });
    },
    cam: (u, D) => [lerp(-20, 40, u / D), -760, .95],
    sfx: [[.9, 'holo', -6], [3.5, 'holo', -6], [3.8, 'sob', -10]] },

  { name: 'descarga', scene: 'bathroom', line: 'V4', lead: .9, tail: .4, tr: 'cut', mood: 'reveal',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, shake: u < .9 ? .5 : 0, E: { eye: 'open', brow: -.8, mouth: 'grin', curl: .9, brown: 0 } });
      show(S.jun, { x: -360, sit: 1, face: 1, aB: .4, aF: .4, E: { eye: 'wide', look: [.8, -.8], mouth: 'o', open: .3 } }); },
    front(c, u, D, t) {
      if (u < 1.2) { c.save(); c.translate(260, -260); c.rotate(t * 12); for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.beginPath(); c.arc(40, 0, 50, 0, 2); c.lineWidth = lw(c, 10); c.strokeStyle = '#4a8ae8'; c.stroke(); } c.restore(); }
      holo(c, -40, -1230, 700, 640, back(seg(u, .9, 1.3)), t, c => { c.save(); c.scale(.42, .42); c.translate(0, 500); roof(c, t); const k = (t * 1.5) % 1;
        const P = { x: -330, y: 0, s: 1, face: 1, rot: 0, sq: 1, lean: .25, vis: 1, aB: 1.6, aF: 2.4 + .3 * Math.sin(t * 8), bB: .2, bF: .2, walk: 0, ph: 0, legs: null, sit: 0, E: { eye: 'open', lid: .3, look: [1, -.5], brow: -.5, mouth: 'grin', open: .2, curl: .8 } };
        osvaldo(c, P, t); money(c, lerp(-60, 100, k), lerp(-700, -560, k) - 200 * 4 * k * (1 - k), k * 6, t); c.restore(); });
    },
    cam: (u, D) => [lerp(0, -20, u / D), lerp(-700, -900, eo(seg(u, .9, 1.6))), lerp(1.0, .9, seg(u, .9, 1.6))],
    sfx: [[0, 'flush', 0], [.9, 'holo', -4], [1.2, 'cash', -6]] },

  { name: 'safado', scene: 'bathroom', line: 'J3', lead: .25, tail: .5, tr: 'cut', mood: 'reveal',
    cast(u, D, S, t) { show(S.jun, { x: -360, sit: 1, face: 1, aB: .4, aF: 2.0, bF: 1.9, E: { eye: 'open', lid: .55, look: [1, 0], mouth: 'smile', curl: .5, smirk: 1 } }); },
    cam: (u, D) => [-330, -470, lerp(2.4, 2.6, u / D)] },

  { name: 'tentação', scene: 'bathroom', line: 'V11', lead: 1.5, tail: .6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const reach = eo(seg(u, .1, 1.3)), back0 = seg(u, 1.6, 1.9);
      show(S.jun, { x: lerp(-360, 60, eo(seg(u, 0, .6))), face: 1, aB: .2, aF: lerp(.3, 2.0, reach) - back0 * 1.6, bF: .2, lean: .1 * reach, E: { lid: .4, look: [1, -.5], mouth: 'smile', curl: .5, smirk: 1, eye: u > 1.6 ? 'wide' : 'open' } });
      show(S.vaso, { x: 260, face: -1, E: { eye: u > 1.4 ? 'angry' : 'closed', brow: -1, mouth: 'flat', red: u > 1.4 } }); },
    cam: (u, D) => [lerp(100, 180, u / D), -560, lerp(1.4, 1.6, u / D)],
    sfx: [[.2, 'tiptoe', -8], [.6, 'tiptoe', -8], [1.0, 'tiptoe', -8], [1.45, 'sting_short', -4]] },
  { name: 'cleide invade', scene: 'bathroom', line: 'C1', lead: .55, tail: .2, tr: 'cut', mood: 'chaos',
    cast(u, D, S, t) { const inn = eo(seg(u, 0, .45));
      show(S.cle, { x: lerp(-1200, -620, inn), face: 1, aB: .6, aF: 1.6, bF: .4, lean: .1, E: { eye: 'wide', brow: -1, mouth: 'scream', open: .3 }, hold: (c, x, y, a) => phone(c, x, y, a, t, u > .5 && u < .8 ? 1 : 0) });
      show(S.jun, { x: -360, sit: 1, face: 1, aB: 2.6, aF: 2.7, E: { eye: 'wide', mouth: 'o', open: .4, look: [-1, 0] } });
      show(S.vaso, { x: 260, face: -1, E: { eye: 'wide', mouth: 'flat' } }); S.order = ['vaso', 'jun', 'cle']; },
    front(c, u, D, t) { if (u > .5 && u < .9) { c.fillStyle = `rgba(255,255,255,${1 - seg(u, .5, .9)})`; c.fillRect(-3000, -3000, 6000, 6000); } word(c, 'CLIC!', -500, -1100, 90, back(seg(u, .5, .65)) * (1 - seg(u, 1.4, 1.6))); },
    cam: (u, D) => [lerp(-500, -380, u / D), -560, 1.15],
    shake: u => Math.abs(shake(u, .05, 25, .3)),
    sfx: [[0, 'door_slam', 0], [.5, 'camera', -2]] },

  { name: 'histórico', scene: 'bathroom', line: 'V5', lead: .3, tail: .5, tr: 'cut', mood: 'burn',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, E: { eye: 'open', lid: .5, brow: -.4, mouth: 'smile', curl: .6, smirk: 1, look: [-1, 0] } }); },
    front(c, u, D, t) { },
    cam: (u, D) => [230, -520, lerp(1.9, 2.1, u / D)] },

  { name: 'desmaio', scene: 'bathroom', line: 'C2', lead: .2, tail: 2.0, tr: 'cut', mood: 'burn',
    cast(u, D, S, t) { const f = seg(u, 1.2, 2.3);
      show(S.cle, { x: -560, face: 1, rot: -1.55 * ei(f), aB: .3, aF: 2.6, bF: .5, E: { eye: u > 1.2 ? 'x' : 'wide', brow: 1, mouth: u < 1.2 ? 'scream' : 'o', open: .4 } });
      show(S.jun, { x: -360, sit: 1, face: 1, aB: .4, aF: .4, E: { lid: .6, look: [-1, 0], mouth: 'flat' } }); S.order = ['jun', 'cle']; },
    front(c, u, D, t) { // her glasses crack
      if (u > .1) { c.save(); c.strokeStyle = INK; c.lineWidth = lw(c, 4); c.translate(-560 + 26, -500 + 2); for (const s of [-1, 1]) { const gx = s * 28 + 15; c.beginPath(); c.moveTo(gx - 20, -10); c.lineTo(gx, 5); c.lineTo(gx + 10, -20); c.moveTo(gx, 5); c.lineTo(gx + 5, 25); c.stroke(); } c.restore(); }
      if (u > 2.3) stars(c, -900, -100, 90, t, 5); },
    cam: (u, D) => u < 1.2 ? [-530, -520, 2.3] : [lerp(-600, -650, seg(u, 1.2, D)), -360, lerp(1.4, 1.2, seg(u, 1.2, 2.3))],
    shake: u => Math.abs(shake(u, 2.3, 20, .3)),
    sfx: [[.1, 'glass_crack', -2], [1.2, 'faint_whistle', -6], [2.3, 'thud', 0]] },

  { name: 'desligar', scene: 'bathroom', line: 'J4', lead: .3, tail: .6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const x = lerp(-360, 520, eo(seg(u, .1, 1.0)));
      show(S.jun, { x, face: 1, walk: u < 1 ? .7 : 0, ph: walkPh(x), aB: .2, aF: u > 1.2 ? 1.4 : .2, bF: .1, lean: u > 1.2 ? .15 : 0, E: { lid: .5, mouth: 'flat', brow: -.4 } });
      show(S.vaso, { x: 260, face: -1, E: { eye: 'open', brow: .6, mouth: 'flat', look: [1, 0], sweat: u > 1.2 ? 1 : 0 } }); },
    back(c, u, D, t) { blob(c, '#f4f4f0', () => c.roundRect(680, -330, 70, 100, 10)); c.beginPath(); c.moveTo(380, -250); c.quadraticCurveTo(560, -120, 700, -280); c.lineWidth = lw(c, 9); c.strokeStyle = INK; c.stroke(); blob(c, '#ffe23a', () => c.rect(600, -420, 180, 60), { line: 4 }); word(c, 'NÃO TIRE', 690, -390, 30, 1, INK, 0, 'Fredoka'); },
    cam: (u, D) => [lerp(-100, 400, eo(seg(u, 0, 1.1))), -520, 1.15] },

  { name: 'tomada', scene: 'bathroom', lines: [['V10', .5], ['J27', '+.4']], tail: .6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const yank = seg(u, 0, .25);
      show(S.jun, { x: 520, face: 1, aB: .2, aF: lerp(1.4, .9, yank), bF: .1, lean: -.15 * yank, E: { lid: u > 2.4 ? .5 : 0, eye: u > 2.4 ? 'open' : 'wide', mouth: 'flat', look: [-1, 0] } });
      show(S.vaso, { x: 260, face: -1, sq: u < .5 ? 1.15 : 1, E: { eye: 'wide', brow: 1, mouth: 'scream', open: .4, red: 0 } }); },
    back(c, u, D, t) { c.beginPath(); c.moveTo(380, -250); c.quadraticCurveTo(560, -120, 650, -260); c.lineWidth = lw(c, 9); c.strokeStyle = INK; c.stroke(); blob(c, '#f4f4f0', () => c.roundRect(630, -300, 60, 80, 10)); if (u > .1) { for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(700, -280); c.lineTo(740 + i * 20, -330 + i * 20); c.lineWidth = lw(c, 6); c.strokeStyle = '#ffe23a'; c.stroke(); } } },
    cam: (u, D) => u < 2.4 ? [330, -560, 1.35] : [520, -560, 2.1],
    sfx: [[0, 'unplug', -2], [.05, 'zap', -4]] },
  { name: 'caramelo', scene: 'bathroom', line: 'K1', lead: 1.2, tail: .3, tr: 'cut', mood: 'dog',
    cast(u, D, S, t) { const x = lerp(-1200, -560, eo(seg(u, 0, 1.2)));
      show(S.car, { x, face: 1, walk: u < 1.2 ? .8 : 0, ph: walkPh(x, 120), aB: .3, aF: u > 2.4 ? 1.6 : .3, bF: .1, E: { lid: .55, brow: -1, mouth: 'flat', smoke: 1 } });
      show(S.jun, { x: 520, face: -1, aB: .2, aF: 1.4, bF: .1, E: { eye: 'wide', look: [1, 0], mouth: 'o', open: .2 } }); },
    cam: (u, D) => u < 1.2 ? [lerp(-1000, -560, eo(u / 1.2)), -420, 1.4] : [-480, -480, lerp(1.6, 1.75, seg(u, 1.2, D))],
    sfx: [[.1, 'creak', -6], [.2, 'paws', -8], [.6, 'paws', -8], [1.0, 'paws', -8], [1.2, 'steam', -10]] },

  { name: 'cachorro fala', scene: 'bathroom', line: 'J5', lead: .1, tail: .3, tr: 'cut', mood: 'dog',
    cast(u, D, S, t) { show(S.jun, { x: 520, face: -1, aB: 2.4, aF: 2.6, bB: .4, bF: .4, E: { eye: 'wide', brow: 1, mouth: 'scream', open: .3 } }); },
    cam: (u, D) => [500, -560, 2.2] },

  { name: 'boleto', scene: 'bathroom', line: 'K2', lead: .3, tail: .6, tr: 'cut', mood: 'dog',
    cast(u, D, S, t) { show(S.car, { x: -560, face: 1, aB: .3, aF: .3, E: { lid: .65, brow: -.3, mouth: 'flat', look: [0, 0] } }); },
    front(c, u, D, t) { const fx = -460 + Math.sin(t * 9) * 80, fy = -560 + Math.cos(t * 13) * 40; blob(c, '#2a2a30', () => c.arc(fx, fy, 8, 0, TAU), { line: 2 }); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(fx - 6, fy - 8, 8, 4, .5, 0, TAU); c.fill(); },
    cam: (u, D) => [-520, -440, lerp(1.9, 2.0, u / D)],
    sfx: [[.1, 'fly', -14]] },

  { name: 'olhar câmera', scene: 'bathroom', dur: 1.6, tr: 'cut', mood: 'pause',
    cast(u, D, S, t) { show(S.jun, { x: 520, face: -1, aB: .2, aF: .2, E: { lid: .6, look: [-.3, .2], mouth: 'flat' } }); },
    cam: (u, D) => [500, -540, 2.6], sfx: [[.1, 'cricket', -12]] },
  { name: 'protocolo', scene: 'bathroom', line: 'V6', lead: .3, tail: .2, tr: 'zoom', mood: 'alarm',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, shake: .8, E: { eye: 'angry', brow: -1, mouth: 'grin', curl: .5, red: 1 } });
      show(S.jun, { x: 560, face: -1, aB: 2.4, aF: 2.6, E: { eye: 'wide', mouth: 'o', open: .3 } }); show(S.car, { x: -560, face: 1, E: { lid: .6, mouth: 'flat' } }); },
    front(c, u, D, t) { c.fillStyle = `rgba(255,30,30,${.25 + .2 * Math.sin(t * 14)})`; c.fillRect(-3000, -3000, 6000, 6000); },
    cam: (u, D) => [0, -560, .95],
    shake: u => 10,
    ui(c, u, D, t) { punch(c, 'PROTOCOLO\nNº 2', (u > D - .9 ? 1 - seg(u, D - .2, D) : 0) * 1, t, ['#3a0a08', '#8a2a14'], '#ffb02a'); },
    sfx: [[0, 'alarm', -4], [.2, 'rumble', -4]] },

  { name: 'número dois', scene: 'bathroom', line: 'J6', lead: .1, tail: .35, tr: 'cut', mood: 'alarm',
    cast(u, D, S, t) { show(S.jun, { x: 560, face: -1, aB: 2.4, aF: 2.6, bB: 1.5, bF: 1.5, E: { eye: 'wide', brow: 1, mouth: 'scream', open: .6, shake: 2, pupil: .7 } }); },
    front(c, u, D, t) { c.fillStyle = `rgba(255,30,30,${.25 + .2 * Math.sin(t * 14)})`; c.fillRect(-3000, -3000, 6000, 6000); },
    ui(c, u, D, t) { speedLines(c, 540, 700, .8, t); },
    cam: (u, D) => [560, -560, lerp(2.4, 3.0, eo(u / .4))] },

  { name: 'contagem', scene: 'bathroom', line: 'V7', lead: .2, tail: .5, tr: 'cut', mood: 'alarm',
    cast(u, D, S, t) { show(S.vaso, { x: 260, face: -1, shake: 1, E: { eye: 'angry', brow: -1, mouth: 'grin', red: 1, brown: seg(u, .5, D) } });
      show(S.car, { x: -420, face: 1, aF: 2.8, aB: .3, bF: .2, E: { lid: .4, mouth: 'smile', curl: .4 } });
      show(S.jun, { x: 560, face: -1, aB: 2.4, aF: 2.6, E: { eye: 'wide', mouth: 'scream', open: .4, sweat: 1 } }); },
    front(c, u, D, t) { c.fillStyle = `rgba(255,30,30,${.25 + .2 * Math.sin(t * 14)})`; c.fillRect(-3000, -3000, 6000, 6000);
      // Caramelo has an umbrella and sunglasses
      c.save(); c.translate(-420 + 140, -900); blob(c, '#3a7ae8', () => { c.moveTo(-160, 0); c.quadraticCurveTo(0, -180, 160, 0); for (let k = 3; k >= 0; k--) c.quadraticCurveTo(-160 + (k + .5) * 80, -30, -160 + k * 80, 0); }); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 300); ink(c, 7); c.restore();
      blob(c, '#151018', () => { c.roundRect(-420 - 30, -470, 140, 34, 10); }, { line: 3 });
      ['3', '2', '1'].forEach((n, i) => word(c, n, 260, -900, 260, back(seg(u, .2 + i * .45, .35 + i * .45)) * (1 - seg(u, .55 + i * .45, .62 + i * .45)), '#ff3a2a', 0)); },
    cam: (u, D) => [0, -600, lerp(.95, 1.1, u / D)],
    shake: u => 10 + u * 12,
    sfx: [[.2, 'beep', -4], [.65, 'beep', -4], [1.1, 'beep', -4], [1.5, 'rumble', 0]] },

  { name: 'explosão', scene: 'corridor', dur: 2.2, fill: true, tr: 'flash', mood: 'boom',
    set: (u, D) => ({ foam: clamp(eo(seg(u, .2, D - .9)) * 1.0), foamSeed: 3 }),
    back(c, u, D, t) { if (u < 1) puff(c, 210, -400, 200 * eo(seg(u, 0, .6)), 1, '#8a5a2a'); },
    front(c, u, D, t) { word(c, 'PLOFT!', 0, -1300, 220, back(seg(u, .15, .4)) * (1 - seg(u, 1.6, 2)), '#c8965a'); for (let i = 0; i < 10; i++) { const k = seg(u, .1 + i * .05, 1.6 + i * .05), [x, y] = arc(k, 210, -400, -1400 + i * 300, -200, 900); if (k > 0 && k < 1) blob(c, '#8a5a2a', () => c.arc(x, y, 40, 0, TAU), { line: 5 }); } },
    cam: (u, D) => [lerp(200, 400, u / D), lerp(-700, -900, u / D), lerp(.7, .6, u / D)],
    shake: (u, D) => u < D - .7 ? 30 * Math.exp(-u) + 6 : 0,
    ui(c, u, D, t) { if (u > D - .7) { c.fillStyle = '#000'; c.fillRect(0, 0, 1080, 1920); } },
    sfx: [[0, 'kaboom', 0], [.3, 'goo', -4], [1.0, 'goo', -6]] },

  BR.b12('out'),
];

export const EPS = { 1: EP1, 2: EP2, 3: EP3, 4: EP4, 5: EP5 };
