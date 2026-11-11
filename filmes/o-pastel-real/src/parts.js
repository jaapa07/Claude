// The three parts as beats. A beat: { scene, line | lines, lead, tail, dur, tr, cam(u,D)→[x,y,zoom], cast(u,D,S,t), set(u,D), back/front(ctx,u,D,t,S), ui(ctx,u,D,t,S), sfx:[[at,name,dB,pan]] }
import { K, clamp, seg, ss, eo, ei, eio, back, lerp, pop, shake, TAU, hash } from './lib.js';
import { pose, INK, seolhwa } from './chars.js';
import { mandu, tray, bowl, dough, puff, boom, speedLines, sparkles, word, fire } from './scenes.js';

export function defaults(scene) {
  const S = { dol: pose({ vis: 0 }), seol: pose({ vis: 0 }), rei: pose({ vis: 0 }), cat: pose({ vis: 0, s: .9 }) };
  return S;
}
const show = (P, o) => { Object.assign(P, { vis: 1 }, o); if (o && o.E) P.E = Object.assign({ eye: 'open', brow: 0, browY: 0, mouth: 'smile', open: 0, blush: 0, sweat: 0, tears: 0, red: 0, soot: 0, pupil: 1, steam: 0 }, o.E); return P; };
const walkPh = (x, stride = 140) => x / stride * Math.PI;
const arc = (u, x0, y0, x1, y1, h) => [lerp(x0, x1, u), lerp(y0, y1, u) - h * 4 * u * (1 - u)];
const TRAYH = (P) => [P.x + P.face * 150 * P.s, P.y - 330 * P.s];        // tray held in front of the belly
const bounce = (u, a, h = 30, f = 9) => u < a ? 0 : -Math.abs(Math.sin((u - a) * f)) * h * Math.exp(-(u - a) * 4);
const BURNT = Array(8).fill('burnt'), RAW = Array(8).fill('raw'), CRAZY = ['kimchi', 'burnt', 'mel', 'batata', 'burnt', 'kimchi', 'mel', 'batata'];

// —— shared UI: title cards and "to be continued" ——
function titleCard(c, u, part, sub, t) {
  const k = back(seg(u, .1, .55), 2), k2 = back(seg(u, .45, .9), 2);
  c.save(); c.translate(540, 600); c.rotate(-.04 + .02 * Math.sin(t * 2));
  if (k > 0) { c.save(); c.scale(k, k); c.fillStyle = '#c8303a'; c.strokeStyle = INK; c.lineWidth = 10; c.beginPath(); c.roundRect(-440, -150, 880, 300, 40); c.fill(); c.stroke();
    c.fillStyle = '#f3d24a'; c.beginPath(); c.roundRect(-420, -130, 860, 18, 9); c.fill(); c.beginPath(); c.roundRect(-420, 112, 860, 18, 9); c.fill();
    c.font = '150px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 24; c.strokeStyle = INK; c.strokeText('O PASTEL REAL', 0, -5); c.fillStyle = '#fff6dc'; c.fillText('O PASTEL REAL', 0, -5); c.restore(); }
  if (k2 > 0) { c.save(); c.translate(0, 230); c.scale(k2, k2); c.fillStyle = '#2f7a62'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.roundRect(-360, -55, 720, 110, 55); c.fill(); c.stroke();
    c.font = '700 54px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(`Parte ${part} · ${sub}`, 0, 2); c.restore(); }
  c.restore();
}
function continua(c, u, a, label, t) {
  if (u < a) return; const k = back(seg(u, a, a + .5), 2);
  c.fillStyle = `rgba(20,8,0,${.55 * clamp((u - a) / .3)})`; c.fillRect(0, 0, 1080, 1920);
  c.save(); c.translate(540, 820); c.rotate(-.05); c.scale(k, k);
  c.font = '120px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 22; c.strokeStyle = INK;
  c.strokeText('CONTINUA...', 0, 0); c.fillStyle = '#ffe23a'; c.fillText('CONTINUA...', 0, 0);
  c.font = '700 56px Fredoka'; c.lineWidth = 14; c.strokeText(label, 0, 120); c.fillStyle = '#fff'; c.fillText(label, 0, 120);
  c.restore(); mandu(c, 540, 1120 + Math.sin(t * 4) * 12, 1.6, 'burnt', t);
}

// ———————————————————— PARTE 1 · O Mandu Queimado ————————————————————
const P1 = [
  { name: 'hook', scene: 'kitchen', dur: 2.6, mood: 'boom',
    set: u => ({ fire: u > .15 ? 1.2 * Math.exp(-(u - .15) * 2) : 0, lid: u > .15 ? Math.min(2600, (u - .15) * 4000) : 0 }),
    cast(u, D, S, t) {
      const fly = seg(u, .15, 1.05), [x, y] = u < .15 ? [-380, 0] : arc(eo(fly), -380, 0, 260, 0, 520);
      show(S.dol, { x, y: y + bounce(u, 1.05, 40), face: 1, rot: u < .15 ? -.15 : u < 1.05 ? lerp(-.2, -7.73, eo(fly)) : -7.73 + .12 * Math.exp(-(u - 1.05) * 6) * Math.sin((u - 1.05) * 30), aB: u < .15 ? 1.4 : 2.8, aF: u < .15 ? 1.6 : 2.6, bB: .2, bF: .3, sq: u > 1.05 ? 1 - .25 * Math.exp(-(u - 1.05) * 8) : 1,
        legs: u > .15 && u < 1.05 ? [.6, .8, -.4, 1] : null, E: { eye: u < .15 ? 'open' : u < 1.3 ? 'wide' : 'spiral', mouth: u < .15 ? 'smile' : 'scream', open: u < .15 ? 0 : .8, soot: u < .15 ? 0 : 1, brow: 1 } });
      if (u > 1.05) S.dol.y = 0;
    },
    cam: (u, D) => u < .15 ? [-520, -480, 1.5] : u < 1.2 ? [lerp(-420, 100, eo(seg(u, .15, 1.1))), lerp(-560, -350, seg(u, .15, 1.1)), lerp(1.35, 1.0, seg(u, .15, 1.1))] : [100, -330, lerp(1.0, 1.08, seg(u, 1.2, 2.6))],
    shake: u => Math.abs(shake(u, .15, 60, .5)) + Math.abs(shake(u, 1.05, 40, .4)),
    front(c, u, D, t) { const k = u > .15 ? back(seg(u, .15, .35)) * (1 - seg(u, .6, .9)) : 0; boom(c, -620, -440, k * 1.4, t); puff(c, -620, -500 - u * 120, 120 + u * 90, clamp(1 - seg(u, .8, 2.4)) * (u > .2 ? 1 : 0), '#4a4440'); word(c, 'BUM!', -350, -900, 190, back(seg(u, .17, .4)) * (1 - seg(u, 1.4, 1.7)));
      if (u > 1.05) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + u * 3; sparkles(c, 220 + Math.cos(a) * 120, -260 + Math.sin(a) * 40, 0, t, 1, '#ffe46a'); } } },
    sfx: [[.15, 'boom', 0], [.2, 'whistle_down', -4], [1.05, 'crash', -2], [1.35, 'birds', -10]] },

  { name: 'controle', scene: 'kitchen', line: 'D1', lead: .25, tail: .55, tr: 'cut', mood: 'comic',
    set: u => ({ fire: .2 }),
    cast(u, D, S) { show(S.dol, { x: 260, kneel: lerp(1, .6, seg(u, 0, .4)), face: -1, aB: .3, aF: lerp(.3, 1.3, back(seg(u, .2, .5))), bF: lerp(.3, 1.55, back(seg(u, .2, .5))), head: .08, E: { eye: 'open', mouth: 'grin', soot: 1, brow: -.2, sweat: .6 } }); },
    cam: (u, D) => [210, lerp(-420, -440, u), lerp(1.75, 1.95, u)],
    front(c, u, D, t, S) { puff(c, 160, -720 - u * 40, 46, .6, '#4a4440'); sparkles(c, 105, -520, 40, t, 3, '#fff'); } },

  { name: 'titulo', scene: 'kitchen', dur: 2.8, tr: 'zoom', mood: 'title',
    set: u => ({ fire: .2 }),
    cast(u, D, S) { show(S.dol, { x: 160, face: -1, aF: 2.1 + .35 * Math.sin(u * 14), bF: 1.2, aB: .3, E: { eye: 'closed', mouth: 'flat', soot: lerp(1, .15, seg(u, .4, 2.6)) } }); },
    cam: (u, D) => [60, lerp(-520, -560, u), .95],
    ui(c, u, D, t) { titleCard(c, u, 1, 'O Mandu Queimado', t); },
    sfx: [[.1, 'title', -2]] },

  { name: 'seolhwa', scene: 'kitchen', line: 'S1', lead: 1.0, tail: .5, tr: 'whip', mood: 'comic',
    set: u => ({ fire: .2 }),
    cast(u, D, S) {
      const x = lerp(1100, 380, eo(seg(u, 0, 1.0)));
      show(S.seol, { x, face: -1, walk: u < 1 ? 1 : 0, ph: walkPh(x, 90), aB: u < 1 ? .3 : .75, aF: u < 1 ? .3 : .75, bB: u < 1 ? .3 : -2.0, bF: u < 1 ? .3 : -2.0, lean: u < 1 ? .08 : 0,
        E: { eye: 'open', brow: -1, mouth: 'flat' }, head: .04 * Math.sin(u * 5) });
      show(S.dol, { x: -60, face: 1, aB: .2, aF: .2, E: { eye: 'wide', mouth: 'flat', soot: .15, brow: .8, sweat: seg(u, 1.2, 2) } });
    },
    cam: (u, D) => u < 1.1 ? [lerp(500, 220, eo(seg(u, 0, 1))), -320, 1.0] : [lerp(320, 360, seg(u, 1.1, 4)), -440, lerp(1.45, 1.6, seg(u, 1.1, 4))],
    sfx: [[.05, 'door', -6], [.3, 'steps', -10]] },

  { name: 'pergaminho', scene: 'kitchen', dur: 3.2, tr: 'cut', mood: 'comic',
    set: u => ({ fire: .2 }),
    cast(u, D, S) { show(S.seol, { x: 380, face: -1, aB: .6, aF: 1.5, bF: .2, E: { eye: 'open', brow: -.6, mouth: 'flat' } });
      show(S.dol, { x: -60, face: 1, aB: .2, aF: .2, E: { eye: 'open', mouth: u < 2 ? 'flat' : 'o', open: .3, soot: .15, brow: .7, sweat: .8 }, look: [0, lerp(-.5, 1, seg(u, .3, 2.2))] }); },
    front(c, u, D, t) {   // the royal schedule unrolls all the way to the floor and keeps rolling
      const L = 1300 * eo(seg(u, .2, 1.6)) + 260 * seg(u, 1.6, 3);
      c.save(); c.translate(140, -500); c.fillStyle = '#f6ecd0'; c.strokeStyle = INK; c.lineWidth = 6;
      c.beginPath(); c.rect(-90, 0, 180, Math.min(L, 500)); c.fill(); c.stroke();
      if (L > 500) { c.beginPath(); c.rect(-90, 500, 180 + (L - 500) * .0, 0); c.moveTo(-90, 500); c.lineTo(-90 - (L - 500), 500); c.lineTo(-90 - (L - 500), 470); c.lineTo(-90, 470); c.fill(); c.stroke(); }
      c.fillStyle = '#2a1712'; for (let y = 30; y < Math.min(L, 480); y += 32) c.fillRect(-60, y, 120 * (0.5 + .5 * hash(y)), 8);
      const ex = L > 500 ? -90 - (L - 500) : 0, ey = L > 500 ? 485 : Math.min(L, 500);
      c.fillStyle = '#b8823a'; c.beginPath(); c.ellipse(ex, ey, L > 500 ? 30 : 100, L > 500 ? 30 : 20, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
      word(c, 'Lista do banquete', 140, -560, 52, back(seg(u, .15, .45)) * (1 - seg(u, 2.7, 3)), '#fff6dc', -.04);
    },
    cam: (u, D) => [lerp(160, 60, seg(u, 0, 3.2)), lerp(-480, -360, seg(u, .3, 2.5)), lerp(1.2, 1.0, seg(u, 0, 3))],
    sfx: [[.2, 'unroll', -4], [1.7, 'boing', -8]] },

  { name: 'relaxa', scene: 'kitchen', line: 'D2', lead: .3, tail: .7, tr: 'cut', mood: 'proud',
    set: u => ({ fire: .2 }),
    cast(u, D, S) { show(S.dol, { x: 0, face: 1, aB: .3, aF: lerp(.3, 2.9, back(seg(u, 1.2, 1.6))), bF: lerp(1.8, .1, back(seg(u, 1.2, 1.6))), lean: -.05, head: -.05, E: { eye: u > 3.2 ? 'happy' : 'open', mouth: 'grin', brow: -.4, soot: .1 } }); },
    cam: (u, D) => [lerp(20, 40, u / 4), lerp(-480, -540, seg(u, 1, 2)), lerp(2.0, 1.45, eo(seg(u, 1.1, 1.8)))],
    front(c, u, D, t) { if (u > 1.4) sparkles(c, 140, -820, 130, t, 6); },
    ui(c, u) { speedLines(c, 540, 700, .5 * seg(u, 1.3, 1.6) * (1 - seg(u, 2.6, 3)), u); },
    sfx: [[1.35, 'sparkle', -6]] },

  { name: 'cético', scene: 'kitchen', dur: 1.7, tr: 'cut', mood: 'comic',
    cast(u, D, S) { show(S.seol, { x: 380, face: -1, aB: .75, aF: .75, bB: -2, bF: -2, head: .12, E: { eye: 'open', brow: .2, browY: .4 * (u > .5 ? 1 : 0), mouth: 'flat', pupil: .8 }, look: [-1, -.6] }); },
    cam: (u, D) => [400, -480, 2.3], sfx: [[.5, 'tick', -10]] },

  { name: 'montagem', scene: 'kitchen', dur: 9.4, tr: 'whip', mood: 'cook',
    set: u => ({ fire: .3 }),
    cast(u, D, S, t) {
      const knead = u < 2.6, fold = u >= 2.6 && u < 5.6;
      show(S.dol, { x: 60, face: 1, lean: .1, aB: knead ? 1.1 + .45 * Math.sin(u * 14) : 1.2, aF: knead ? 1.1 - .45 * Math.sin(u * 14) : fold ? 1.4 + .2 * Math.sin(u * 20) : 1.3, bB: 1, bF: fold ? .8 : 1,
        E: { eye: u > 5.6 && u < 6.6 ? 'wide' : u > 6.6 ? 'happy' : 'open', brow: -.6, mouth: u > 5.6 ? 'grin' : 'flat', open: u > 5.6 && u < 6.6 ? .3 : 0 }, look: [.6, .8] });
      if (u > 5.6 && u < 6.8) Object.assign(S.dol, { E: { ...S.dol.E, eye: 'wide', mouth: 'o', open: .6, brow: .9 } });   // the dough lands on his head
    },
    back(c, u, D, t) {},
    front(c, u, D, t) {
      if (u < 2.6) dough(c, 260, -330, 1.3, 1 + .25 * Math.sin(u * 28));
      if (u >= 2.6) { const n = Math.min(8, Math.floor((u - 2.6) / .35) + 1); tray(c, 280, -340, 1, RAW.slice(0, n), t); }
      if (u > 4.8 && u < 6.8) { const k = seg(u, 4.8, 5.6), [x, y] = arc(k, 330, -400, 70, -620, 380); dough(c, u < 5.6 ? x : 70, u < 5.6 ? y : -560, .9, u < 5.6 ? 1 : .55); }
      if (u > 6.8) sparkles(c, 280, -420, 150, t, 7);
      word(c, 'PLOFT!', -150, -800, 110, back(seg(u, 5.6, 5.8)) * (1 - seg(u, 6.5, 6.8)), '#fff6dc');
      if (u < 2.6) puff(c, 260, -400, 40 + 20 * Math.sin(u * 9), .5, '#fff');
    },
    cam: (u, D) => u < 2.6 ? [220, -380, lerp(2.2, 2.4, u / 2.6)] : u < 4.8 ? [lerp(240, 200, seg(u, 2.6, 4.8)), -400, 1.9] : u < 6.8 ? [80, -520, lerp(1.7, 1.9, seg(u, 4.8, 6.8))] : [200, -420, lerp(1.5, 1.3, seg(u, 6.8, 9.4))],
    sfx: [[.2, 'knead', -6], [.7, 'knead', -6], [1.2, 'knead', -6], [1.7, 'knead', -6], [2.2, 'knead', -6], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [2.6 + i * .35, 'pop', -8]), [4.8, 'whistle_up', -8], [5.6, 'splat', -3], [6.9, 'sparkle', -6]] },

  { name: 'gato', scene: 'kitchen', line: 'S2', lead: 1.3, tail: .5, tr: 'cut', mood: 'sneaky',
    cast(u, D, S, t) { show(S.cat, { x: 300, y: -700, face: 1, s: .9, look: [lerp(-1, 1, seg(u, .2, 1)), 0], E: { eye: 'open', pupil: .6 } });
      show(S.seol, { x: 420, face: -1, aB: .75, aF: .75, bB: -2, bF: -2, head: -.1, E: { eye: 'open', brow: .6, mouth: 'flat' }, look: [-.2, -1] }); },
    cam: (u, D) => u < 1.3 ? [330, -790, 2.4] : [lerp(330, 400, ss(seg(u, 1.3, 1.9))), lerp(-790, -500, ss(seg(u, 1.3, 1.9))), lerp(2.4, 1.6, ss(seg(u, 1.3, 1.9)))],
    front(c, u, D, t) { if (u > .7 && u < 1.2) sparkles(c, 390, -820, 30, t, 2, '#fff'); },
    sfx: [[.2, 'meow', -6], [.8, 'glint', -8]] },

  { name: 'roubo', scene: 'kitchen', lines: [['D3', 1.5]], tail: .3, tr: 'cut', mood: 'chase',
    cast(u, D, S, t) {
      const j = seg(u, 0, .7), j2 = seg(u, .9, 1.4);
      let [x, y] = u < .7 ? arc(eo(j), 300, -700, 300, -330, 140) : u < .9 ? [300, -330] : arc(j2, 300, -330, -100, 0, 160);
      if (u > 1.4) x = -100 - (u - 1.4) * 700;
      show(S.cat, { x, y, face: u < .9 ? 1 : -1, s: .9, walk: u > 1.4 ? 1 : 0, ph: u * 18, rot: u < .7 ? lerp(-.6, .2, j) : 0, E: { eye: 'happy' } });
      show(S.dol, { x: 60, face: u < 1.3 ? 1 : -1, aB: .4, aF: u > 1.5 ? 1.7 : .3, bF: 0, lean: u > 1.5 ? -.1 : 0, E: { eye: u < 1.3 ? 'wide' : 'open', brow: u < 1.3 ? .9 : -1, mouth: u < 1.3 ? 'o' : 'flat', open: .5 } });
    },
    front(c, u, D, t, S) { if (u < .7) bowl(c, 280, -330, .7, '#c87a5a'); else { const P = S.cat; bowl(c, P.x + P.face * 80, P.y - 60, .45, '#c87a5a'); }
      tray(c, 300, -340, 1, RAW, t); word(c, 'ZUP!', 120, -720, 110, back(seg(u, .9, 1.05)) * (1 - seg(u, 1.4, 1.6))); },
    cam: (u, D) => u < 1.3 ? [lerp(300, 150, seg(u, 0, 1.3)), lerp(-650, -420, seg(u, 0, 1.3)), lerp(1.5, 1.2, seg(u, 0, 1.3))] : [lerp(40, 0, seg(u, 1.3, D)), -480, 1.55],
    sfx: [[.05, 'jump', -6], [.7, 'land_soft', -8], [.8, 'clink', -8], [.9, 'jump', -6], [1.4, 'scurry', -6]] },

  { name: 'perseguição', scene: 'kitchen', dur: 8.4, tr: 'whip', mood: 'chase',
    set: u => ({ fire: u > 4.3 ? 1.6 * Math.exp(-(u - 4.3) * 1.2) + .3 : .3 }),
    cast(u, D, S, t) {
      // cat runs left then circles back right past the flour spill; Dol-soe follows with the tray held high
      const cx = u < 2 ? lerp(900, -500, u / 2) : lerp(-500, 650, seg(u, 2, 3.4));
      show(S.cat, { x: cx, face: u < 2 ? -1 : 1, s: .9, walk: u < 3.4 ? 1 : 0, ph: u * 20, E: { eye: u > 4 ? 'happy' : 'open' } });
      if (u > 3.4) Object.assign(S.cat, { x: 700, y: -380, walk: 0 });                                  // on top of the flour jar, licking a paw
      const slip = seg(u, 2.9, 3.3), air = seg(u, 3.3, 4.6);
      const dx = u < 2.9 ? lerp(1100, -200, u / 2.9) : -200 + 160 * eo(seg(u, 2.9, 4.6));
      const dy = u < 3.3 ? 0 : u < 4.6 ? -280 * 4 * air * (1 - air) : bounce(u, 4.6, 30);
      show(S.dol, { x: dx, y: dy, face: u < 2.9 ? -1 : -1, walk: u < 2.9 ? 1.2 : 0, ph: u * 16, aB: 2.9, aF: 2.9, bB: .1, bF: .1,
        rot: u < 2.9 ? 0 : u < 4.6 ? lerp(0, 1.6, eo(slip)) + .2 * air : lerp(1.55, 1.5, seg(u, 4.6, 6)), legs: u > 2.9 && u < 4.6 ? [1.6, 0, 1.3, .3] : null,
        E: { eye: u < 2.9 ? 'open' : u < 4.6 ? 'wide' : 'spiral', brow: u < 2.9 ? -1 : 1, mouth: u < 2.9 ? 'grin' : 'scream', open: u < 2.9 ? .2 : .8 } });
      if (u > 2.9) Object.assign(S.dol, { aB: lerp(2.9, 3.6, slip), aF: lerp(2.9, 3.8, slip) });
      S.order = ['dol', 'cat'];
    },
    front(c, u, D, t, S) {
      // the flour spill and its puff
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-220, 6, 170, 22, 0, 0, TAU); c.fill();
      if (u > 2.9) puff(c, -220, -60, 90 * eo(seg(u, 2.9, 3.4)), 1 - seg(u, 3.3, 4.2), '#fff');
      // the tray: carried, then launched; the mandus fly in slow arcs into the pot
      if (u < 3.0) { tray(c, S.dol.x - 10, S.dol.y - 650, 1, RAW, t, Math.sin(u * 12) * .08); }
      else {
        const k = seg(u, 3.0, 4.3), tx = lerp(-200, -500, k), ty = lerp(-650, -300, k) - 500 * 4 * k * (1 - k);
        if (u < 4.6) tray(c, tx + 260, ty + 40 + 400 * seg(u, 3.6, 4.6), 1, [], t, u * 6);
        for (let i = 0; i < 8; i++) { const ki = seg(u, 3.0 + i * .06, 4.25 + i * .05), sx = -260 + (i - 3.5) * 50, [x, y] = arc(eo(ki), sx, -680, -620 + (i - 3.5) * 30, -420, 420 + i * 30);
          if (ki < 1) mandu(c, x, y, .8, ki > .8 ? 'burnt' : 'raw', t, u * (4 + i)); }
      }
      if (u > 4.3) { fire(c, -620, -400, 1.6 * Math.exp(-(u - 4.3) * 1.5), t); word(c, 'FUUUSH!', -540, -980, 120, back(seg(u, 4.3, 4.5)) * (1 - seg(u, 5.6, 6))); }
      word(c, 'OPA!', 50, -900, 120, back(seg(u, 2.9, 3.05)) * (1 - seg(u, 3.5, 3.7)), '#9ff07a');
      if (u > 4.6) { word(c, 'TUM!', -60, -260, 100, back(seg(u, 4.6, 4.75)) * (1 - seg(u, 5.2, 5.4)), '#ffb24a'); }
      if (u > 5.6) puff(c, -620, -560 - (u - 5.6) * 140, 110 + (u - 5.6) * 50, .85, '#3a3430');
    },
    cam: (u, D) => u < 2.9 ? [lerp(500, -150, u / 2.9), -380, 1.0] : u < 3.4 ? [-220, -560, lerp(1.0, 1.9, eo(seg(u, 2.9, 3.3)))] : u < 4.6 ? [lerp(-260, -560, seg(u, 3.4, 4.4)), lerp(-700, -520, seg(u, 3.4, 4.4)), lerp(1.7, 1.35, seg(u, 3.4, 4.4))] : [lerp(-300, -200, seg(u, 4.6, 7.6)), -420, lerp(1.0, .95, seg(u, 4.6, 7.6))],
    shake: u => Math.abs(shake(u, 4.3, 35, .5)) + Math.abs(shake(u, 4.6, 45, .4)),
    ui(c, u) { speedLines(c, 540, 760, .6 * seg(u, 3.0, 3.3) * (1 - seg(u, 4.0, 4.3)), u); },
    sfx: [[0, 'scurry', -6], [.2, 'run', -6], [2.9, 'slip', -2], [3.0, 'whistle_up', -6], [3.3, 'whoosh', -6], [4.3, 'fwoosh', -1], [4.6, 'thud', -2], [5.0, 'birds', -10]] },

  { name: 'queimou', scene: 'kitchen', line: 'S3', lead: 1.2, tail: .5, tr: 'cut', mood: 'shock',
    set: u => ({ fire: .3 }),
    cast(u, D, S, t) { show(S.dol, { x: -150, face: 1, aB: 1.35, aF: 1.35, bB: .3, bF: .3, E: { eye: 'open', mouth: 'flat', brow: .9, sweat: 1, soot: .5 } });
      show(S.seol, { x: 260, face: -1, aB: .3, aF: lerp(.3, 2.9, back(seg(u, 1.1, 1.4))), bF: .2, E: { eye: 'wide', brow: -1, mouth: 'scream', open: .4, pupil: .6 } }); },
    front(c, u, D, t, S) { tray(c, -10, -340, 1, BURNT, t); },
    cam: (u, D) => u < 1.2 ? [-20, -380, 2.2] : [lerp(240, 260, seg(u, 1.2, D)), -500, lerp(2.0, 2.3, seg(u, 1.2, D))],
    shake: u => Math.abs(shake(u, 1.2, 25, .4)),
    sfx: [[.2, 'sizzle', -10], [1.15, 'shock', -4]] },

  { name: 'dourei', scene: 'kitchen', line: 'D4', lead: .4, tail: .9, tr: 'cut', mood: 'sheepish',
    cast(u, D, S, t) { show(S.dol, { x: -150, face: 1, aB: .3, aF: 2.2, bF: .9, head: .1 * Math.sin(u * 3), E: { eye: 'open', mouth: 'grin', brow: .9, sweat: 1, blush: .6, soot: .5 }, look: [-.6, -.3] }); },
    front(c, u, D, t) { mandu(c, 15, -560, 1.2, 'burnt', t); if (u > 1.6) sparkles(c, 15, -580, 90, t, 4, '#fff'); },
    cam: (u, D) => [-80, -510, lerp(2.4, 2.6, u / 3)],
    sfx: [[1.7, 'ding', -8]] },

  { name: 'facepalm', scene: 'kitchen', dur: 2.6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const k = eo(seg(u, .2, .6)), drag = seg(u, .6, 2.2);
      show(S.seol, { x: 300, face: -1, aB: .4, aF: lerp(.3, 2.75, k), bF: lerp(.3, 1.9, k) - .25 * drag, head: .05, E: { eye: 'closed', brow: .8, mouth: 'frown' } });
      show(S.dol, { x: -120, face: 1, aB: .3, aF: lerp(.3, 1.5, seg(u, 1.2, 1.6)), bF: .3, E: { eye: 'open', mouth: 'grin', brow: .5, sweat: .7, soot: .5 }, look: [1, 0] }); S.order = ['dol', 'seol']; },
    front(c, u, D, t, S) { if (u > 1.4) mandu(c, 60, -560, 1, 'burnt', t); if (u > 1.7) word(c, 'quer provar?', 0, -760, 60, back(seg(u, 1.7, 1.9)), '#fff6dc', .05); },
    cam: (u, D) => [lerp(140, 100, u / D), -500, lerp(1.45, 1.5, u / D)],
    sfx: [[.55, 'slap', -4], [1.7, 'boing', -10]] },

  { name: 'faca', scene: 'kitchen', dur: 2.6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { show(S.dol, { x: 40, face: 1, lean: .1, aB: 1.2, aF: 1.3 + (u > .5 && u < 1.2 ? .25 * Math.sin(u * 30) : 0), bF: .6, E: { eye: u < 1.2 ? 'open' : 'wide', brow: -.7, mouth: u < 1.2 ? 'flat' : 'o', open: .5, soot: .5 }, look: [.8, .8] }); },
    front(c, u, D, t) { mandu(c, 280, -340, 1.1, 'burnt', t); c.save(); c.translate(250, -380); c.rotate(-.6 + (u < 1.2 ? .1 * Math.sin(u * 30) : 0)); c.fillStyle = '#c8ccd4'; c.strokeStyle = INK; c.lineWidth = 5;
      const L = u < 1.2 ? 120 : 40; c.beginPath(); c.rect(-10, -L, 20, L); c.fill(); c.stroke(); c.fillStyle = '#6a3a24'; c.beginPath(); c.rect(-12, 0, 24, 60); c.fill(); c.stroke(); c.restore();
      if (u > 1.2) { const k = seg(u, 1.2, 2.2), [x, y] = arc(k, 250, -480, 520, -1000, 200); c.save(); c.translate(x, y); c.rotate(u * 18); c.fillStyle = '#c8ccd4'; c.fillRect(-10, -40, 20, 80); c.restore(); }
      word(c, 'CRAC!', 300, -620, 120, back(seg(u, 1.2, 1.35)) * (1 - seg(u, 2.1, 2.4))); },
    cam: (u, D) => [180, -440, lerp(2.0, 2.2, u / 2.6)],
    sfx: [[.5, 'scrape', -6], [1.2, 'crack', -2], [1.5, 'boing', -8]] },

  { name: 'tambores', scene: 'kitchen', line: 'S4', lead: 1.0, tail: .4, tr: 'cut', mood: 'drums',
    cast(u, D, S, t) { const jump = (k) => -Math.abs(Math.sin(u * 11)) * k * (u < 1 ? 1 : .4);
      show(S.seol, { x: 330, y: jump(10), face: -1, aB: 2.4, aF: 2.6, bB: .6, bF: .6, E: { eye: 'wide', brow: 1, mouth: 'o', open: .4 } });
      show(S.dol, { x: -80, y: jump(30), face: 1, aB: 2.7, aF: 2.8, E: { eye: 'wide', brow: 1, mouth: 'o', open: .7, sweat: 1, soot: .5 } }); },
    front(c, u, D, t) { tray(c, 280, -340 - Math.abs(Math.sin(u * 11)) * 20, 1, BURNT, t); word(c, 'DUM! DUM!', 560, -1050, 100, back(seg(u, .1, .3)) * (1 - seg(u, 2.6, 2.9)), '#ffb24a', .06); },
    cam: (u, D) => [150, -520, lerp(1.05, 1.15, u / 3)],
    shake: u => 8 * Math.abs(Math.sin(u * 11)),
    sfx: [[.05, 'drums', 0]] },

  { name: 'esconder', scene: 'kitchen', dur: 3.4, tr: 'cut', mood: 'drums',
    cast(u, D, S, t) { const dive = seg(u, .2, .8);
      show(S.dol, { x: lerp(-80, 320, eo(dive)), y: u < .8 ? -260 * 4 * dive * (1 - dive) : -60, face: 1, rot: lerp(0, 1.45, eo(dive)), legs: u > .8 ? [-.4 + .3 * Math.sin(u * 20), .3, .4 - .3 * Math.sin(u * 20), .3] : null, aB: 2.8, aF: 2.8, E: { eye: 'closed', brow: 1, mouth: 'scream', open: .4 } });
      show(S.seol, { x: -260, face: 1, aB: .75, aF: .75, bB: -2, bF: -2, E: { eye: 'open', brow: -.4, mouth: 'flat' }, look: [1, .3] }); S.order = ['seol', 'dol']; },
    front(c, u, D, t, S) { // the table cloth hides his top half: only his round bottom and kicking legs stick out
      if (u > .8) { c.save(); c.fillStyle = '#9a6438'; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.rect(-180, -330, 640, 40); c.fill(); c.stroke(); c.fillStyle = '#e8d8b0'; c.beginPath(); c.moveTo(-170, -300); c.lineTo(450, -300); c.lineTo(470, -20); c.lineTo(-190, -20); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      word(c, 'tremi... tremi...', 460, -520, 56, u > 1.4 ? 1 : 0, '#fff6dc', .1); },
    cam: (u, D) => [lerp(60, 120, u / D), -480, 1.15],
    shake: u => 6 * Math.abs(Math.sin(u * 11)),
    sfx: [[.2, 'whoosh', -6], [.8, 'thud', -6], [1.4, 'shiver', -8]] },

  { name: 'grito', scene: 'kitchen', line: 'D5', lead: .2, tail: 3.8, tr: 'zoom', mood: 'cliff',
    cast(u, D, S, t) { show(S.dol, { x: -80, face: 1, aB: 2.4, aF: 2.5, bB: 1.6, bF: 1.6, E: { eye: 'wide', brow: 1, mouth: 'scream', open: 1, sweat: 1, soot: .5, pupil: .5 } }); },
    cam: (u, D) => [-70, -480, lerp(1.6, 3.2, eo(seg(u, 0, 1)))],
    shake: u => u < 1.1 ? 18 : 0,
    ui(c, u, D, t) { speedLines(c, 540, 860, .8 * (u < 1.1 ? 1 : 0), u); continua(c, u, 1.2, 'na Parte 2: O Plano Maluco', t); },
    sfx: [[1.2, 'sting', -2]] },
];

// ———————————————————— PARTE 2 · O Plano Maluco ————————————————————
const P2 = [
  { name: 'recap', scene: 'kitchen', line: 'D6', lead: .4, tail: .5, mood: 'comic',
    set: u => ({ fire: .3 }),
    cast(u, D, S, t) { show(S.dol, { x: -150, face: 1, aB: 1.35, aF: 1.35, bB: .3, bF: .3, E: { eye: 'open', mouth: 'flat', brow: .9, sweat: 1, soot: .5 }, look: [.4, .7] }); },
    front(c, u, D, t) { tray(c, -10, -340, 1, BURNT, t); word(c, 'PARTE 2', 540 - 0, -1050, 0, 0); },
    cam: (u, D) => u < .4 ? [-10, -360, 3.0] : [lerp(-40, -90, seg(u, .4, D)), lerp(-380, -470, eo(seg(u, .4, 1))), lerp(3.0, 1.9, eo(seg(u, .4, 1.1)))],
    ui(c, u, D, t) { if (u < 2.4) { const k = back(seg(u, .05, .35)) * (1 - seg(u, 2.1, 2.4)); c.save(); c.translate(540, 330); c.scale(k, k); c.fillStyle = '#c8303a'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.roundRect(-300, -60, 600, 120, 30); c.fill(); c.stroke(); c.font = '84px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff6dc'; c.fillText('PARTE 2', 0, 4); c.restore(); } },
    sfx: [[0, 'sizzle', -8], [.3, 'whoosh', -6]] },

  { name: 'colarinho', scene: 'kitchen', line: 'S5', lead: .5, tail: .8, tr: 'whip', mood: 'urgent',
    cast(u, D, S, t) { const pull = eo(seg(u, 0, .4));
      show(S.seol, { x: 230, face: -1, aB: .4, aF: 1.6, bF: .2, lean: -.06, E: { eye: 'open', brow: -1, mouth: 'flat' } });
      show(S.dol, { x: lerp(-150, 60, pull), y: -30 * pull, face: 1, aB: .2, aF: .2, legs: [.3, .2, -.3, .1], E: { eye: 'wide', brow: 1, mouth: 'wobble', sweat: 1, soot: .3 } }); S.order = ['dol', 'seol']; },
    cam: (u, D) => [lerp(120, 150, u / 3), -500, lerp(1.5, 1.65, u / 3)],
    sfx: [[.1, 'grab', -4]] },

  { name: 'relógio', scene: 'kitchen', dur: 2.4, tr: 'cut', mood: 'urgent',
    ui(c, u, D, t) { const k = back(seg(u, 0, .3)); c.save(); c.translate(540, 760); c.scale(k, k); c.fillStyle = '#fff6dc'; c.strokeStyle = INK; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 260, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#c8303a'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 240, -Math.PI / 2, -Math.PI / 2 + TAU * (1 / 6) * (1 - u / 2)); c.fill(); c.font = '110px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 16; c.strokeText('10 MIN', 0, 0); c.fillStyle = '#ffe23a'; c.fillText('10 MIN', 0, 0); c.restore(); },
    cam: (u, D) => [0, -600, 1], sfx: [[0, 'tick', -4], [.5, 'tick', -4], [1.0, 'tick', -4], [1.5, 'tick', -4]] },

  { name: 'farinha', scene: 'kitchen', lines: [['D7', 1.6]], tail: 1.6, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { show(S.dol, { x: 470, face: 1, aB: 2.0, aF: 2.0, bB: .5, bF: .5, lean: .15, E: { eye: u < 1.0 ? 'open' : 'wide', brow: u < 1 ? -.3 : 1, mouth: u < 1 ? 'smile' : 'o', open: .5, soot: .3 }, look: [.6, .8] });
      if (u > 1.0) show(S.cat, { x: 700, y: -400 - 60 * back(seg(u, 1.0, 1.3)), face: -1, s: .9, E: { eye: u > 2.6 && u < 3.0 ? 'closed' : 'open', flour: 1 } }); S.order = ['dol', 'cat']; },
    front(c, u, D, t, S) { if (u > 1) puff(c, 700, -560, 70 + 40 * seg(u, 1, 1.4), 1 - seg(u, 1.2, 2.5), '#fff'); if (u > 2.6) { puff(c, 700, -520, 120 * eo(seg(u, 2.6, 3)), 1 - seg(u, 2.8, 3.6), '#fff'); word(c, 'ATCHIM!', 720, -880, 100, back(seg(u, 2.6, 2.75)) * (1 - seg(u, 3.4, 3.6))); } },
    cam: (u, D) => u < 1 ? [560, -560, 1.6] : [lerp(600, 560, seg(u, 1, D)), -580, lerp(1.6, 1.45, seg(u, 1, D))],
    sfx: [[.3, 'lid', -6], [1.0, 'meow', -4], [2.6, 'sneeze', -2]] },

  { name: 'nuvem', scene: 'kitchen', dur: 2.8, tr: 'cut', mood: 'sad',
    cast(u, D, S, t) { show(S.dol, { x: 0, face: 1, kneel: 1, bow: .2, aB: .2, aF: .2, E: { eye: 'closed', brow: 1, mouth: 'wobble', tears: .8 } }); },
    front(c, u, D, t) { const k = back(seg(u, .1, .4)); c.save(); c.translate(20, -900); c.scale(k, k); puff(c, 0, 0, 90, 1, '#7a8090'); c.restore();
      if (u > .4) { c.strokeStyle = '#7ab0ff'; c.lineWidth = 6; for (let i = 0; i < 12; i++) { const yy = -820 + ((u * 900 + i * 97) % 400), xx = -100 + (i * 23) % 220; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - 6, yy + 30); c.stroke(); } } },
    cam: (u, D) => [10, -600, lerp(1.4, 1.5, u / D)],
    sfx: [[.2, 'sad_trombone', -4], [.4, 'rain', -12]] },

  { name: 'ideia', scene: 'kitchen', line: 'S6', lead: .9, tail: .5, tr: 'cut', mood: 'idea',
    cast(u, D, S, t) { show(S.seol, { x: 200, face: 1, aB: .7, aF: u < .9 ? 2.2 : 1.6, bB: -2, bF: u < .9 ? 2.2 : .1, head: u < .9 ? -.1 : 0, E: { eye: u < .9 ? 'open' : 'happy', brow: u < .9 ? .2 : -.5, mouth: u < .9 ? 'flat' : 'grin' }, look: [0, -1] }); },
    front(c, u, D, t) { if (u > .4 && u < 1.6) { const k = back(seg(u, .4, .6)); c.save(); c.translate(300, -830); c.scale(k, k); c.fillStyle = '#ffe23a'; c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill(); c.stroke(); sparkles(c, 0, 0, 80, t, 6); c.restore(); }
      if (u > 1.2) { const items = [['🌶', 'kimchi'], ['', 'mel'], ['', 'batata']]; [['kimchi', 1.6], ['mel', 2.3], ['batata', 2.9]].forEach(([k, a], i) => { const s = back(seg(u, a, a + .3)); if (s > 0) mandu(c, 430, -900 + i * 150, s * 1.0, k, t); }); } },
    cam: (u, D) => [280, -560, lerp(1.5, 1.6, u / 4)],
    sfx: [[.4, 'ding', -4], [1.6, 'pop', -6], [2.3, 'pop', -6], [2.9, 'pop', -6]] },

  { name: 'cozinha maluca', scene: 'kitchen', lines: [['D8', 5.4]], tail: 1.5, tr: 'whip', mood: 'cook',
    set: u => ({ fire: .4 }),
    cast(u, D, S, t) { show(S.dol, { x: 60, face: 1, lean: .1 * Math.sin(u * 6), aB: 1.5 + .9 * Math.sin(u * 13), aF: 1.5 - .9 * Math.sin(u * 13 + 1), bB: .6, bF: .6,
        E: { eye: u > 2.6 && u < 3.6 ? 'x' : u > 5 ? 'happy' : 'open', brow: -.8, mouth: u > 2.6 && u < 3.6 ? 'scream' : 'grin', open: .3, red: u > 2.6 && u < 4 ? 1 : 0, steam: 0 } }); },
    front(c, u, D, t, S) {
      bowl(c, 280, -330, 1.3, '#c87a5a');
      // ingredients flying into the bowl
      const things = [['#d4282a', .1], ['#f2c84a', .6], ['#f0a040', 1.1], ['#7a3a2a', 1.6], ['#3a9a5a', 2.1], ['#d4282a', 2.5], ['#f2c84a', 3.6], ['#f0a040', 4.0]];
      things.forEach(([col, a], i) => { const k = seg(u, a, a + .5); if (k > 0 && k < 1) { const [x, y] = arc(k, -100 + (i % 3) * 60, -620, 280, -400, 300); c.save(); c.translate(x, y); c.rotate(u * 9 + i); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, 34, 22, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); } });
      if (u > 2.6 && u < 3.6) { puff(c, 160, -470, 60, .9, '#ff8a6a'); word(c, 'ARDE!', 60, -820, 110, back(seg(u, 2.6, 2.75)) * (1 - seg(u, 3.4, 3.6)), '#ff6a3a'); }
      if (u > 4.3) { const n = Math.min(8, Math.floor((u - 4.3) / .12) + 1); tray(c, 280, -480 - 0, .0001 + 0, [], t); tray(c, 520, -340, 1, CRAZY.slice(0, n), t); }
      if (u > 5) sparkles(c, 520, -420, 160, t, 7);
      if (u > 3.6 && u < 4.4) { c.save(); c.strokeStyle = '#f2c84a'; c.lineWidth = 10; c.beginPath(); c.moveTo(300, -440); c.quadraticCurveTo(120, -700 + Math.sin(u * 10) * 30, -20, -640); c.stroke(); c.restore(); word(c, 'GRUDA!', 40, -900, 90, back(seg(u, 3.6, 3.75)) * (1 - seg(u, 4.2, 4.4)), '#f2c84a'); }
    },
    cam: (u, D) => u < 2.6 ? [lerp(100, 200, u / 2.6), -460, 1.5] : u < 3.6 ? [80, -500, 2.4] : u < 5 ? [200, -480, 1.6] : [320, -460, lerp(1.4, 1.5, seg(u, 5, D))],
    sfx: [...[.1, .6, 1.1, 1.6, 2.1, 2.5, 3.6, 4.0].map(a => [a + .45, 'plop', -8]), [2.6, 'sneeze', -2], [2.7, 'fire_breath', -6], [3.6, 'squish', -6], [4.3, 'pop', -6], [5.0, 'sparkle', -6]] },

  { name: 'gato bandeja', scene: 'kitchen', lines: [['S7', .9]], tail: .4, tr: 'cut', mood: 'chase',
    cast(u, D, S, t) { const k = seg(u, 0, .6), [x, y] = u < .6 ? arc(eo(k), 900, -400, 520, -400, 200) : [520 + (u > 1.1 ? (u - 1.1) * -900 : 0), u > 1.1 ? 0 : -400];
      show(S.cat, { x, y: u > 1.1 ? -20 : y - 20, face: -1, s: .9, E: { eye: 'happy' } });
      show(S.seol, { x: 170, face: 1, aB: .4, aF: 1.7, bF: 0, E: { eye: 'wide', brow: 1, mouth: 'o', open: .5 } });
      show(S.dol, { x: -120, face: 1, aB: 2.4, aF: 2.4, bB: 1.6, bF: 1.6, E: { eye: 'wide', brow: 1, mouth: 'scream', open: .7 } }); S.order = ['seol', 'dol', 'cat']; },
    back(c, u, D, t, S) { const P = S.cat; tray(c, u < 1.1 ? (u < .6 ? 520 : P.x) : P.x, u < 1.1 ? -340 : 10, 1, CRAZY, t, u > 1.1 ? .05 * Math.sin(u * 20) : 0); },
    cam: (u, D) => [lerp(300, 150, seg(u, .8, D)), -470, lerp(1.25, 1.05, seg(u, .8, D))],
    sfx: [[.05, 'jump', -6], [.6, 'land_soft', -6], [1.1, 'slide', -4]] },

  { name: 'pátio', scene: 'courtyard', dur: 9.6, tr: 'whip', mood: 'chase',
    cast(u, D, S, t) {
      const cx = lerp(-1500, 1500, u / 9.6), dx = cx - 700 + 120 * Math.sin(u * 2);
      show(S.cat, { x: cx, y: -20, face: 1, s: .9, E: { eye: 'happy' }, rot: .05 * Math.sin(u * 8) });
      show(S.dol, { x: dx, y: u > 3.0 && u < 4.2 ? -320 * 4 * seg(u, 3.0, 4.2) * (1 - seg(u, 3.0, 4.2)) : 0, face: 1, walk: 1.3, ph: u * 17, aB: 1.9, aF: 1.9, bB: .1, bF: .1, lean: .2,
        rot: u > 3.0 && u < 4.2 ? -TAU * eo(seg(u, 3.0, 4.2)) : 0, E: { eye: 'open', brow: -1, mouth: 'grin', open: .3 } });
      show(S.seol, { x: dx - 330, face: 1, walk: 1.1, ph: u * 15, aB: .6, aF: 1.2, bF: .3, lean: .15, E: { eye: 'open', brow: .8, mouth: 'o', open: .4 } });
      S.order = ['seol', 'dol', 'cat'];
    },
    back(c, u, D, t, S) {
      // two guards with spears, knocked over like dominoes when the chase passes
      for (const [gx, a] of [[-300, 2.2], [300, 3.0], [700, 4.4]]) { const k = seg(u, a, a + .4), r = eo(k) * 1.45;
        c.save(); c.translate(gx, 0); c.rotate(r); c.fillStyle = '#3a5a9a'; c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.roundRect(-55, -420, 110, 420, 30); c.fill(); c.stroke();
        c.fillStyle = '#f2c49a'; c.beginPath(); c.arc(0, -470, 60, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#1a1210'; c.beginPath(); c.ellipse(0, -520, 110, 22, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -530, 45, Math.PI, 0); c.fill();
        c.strokeStyle = '#7a4a2a'; c.lineWidth = 12; c.beginPath(); c.moveTo(70, -80); c.lineTo(70, -700); c.stroke(); c.fillStyle = '#c8ccd4'; c.beginPath(); c.moveTo(55, -700); c.lineTo(70, -780); c.lineTo(85, -700); c.fill();
        c.fillStyle = INK; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 20 + 10, -475, k > 0 ? 3 : 8, 0, TAU); c.fill(); } c.restore();
        if (k > 0) word(c, 'PLAFT!', gx + 250, -500, 90, back(seg(u, a + .3, a + .45)) * (1 - seg(u, a + .9, a + 1.1)), '#fff6dc'); }
    },
    front(c, u, D, t, S) { const P = S.cat; tray(c, P.x - 20, 14, 1.15, CRAZY, t, .04 * Math.sin(u * 20)); },
    cam: (u, D) => [lerp(-1250, 1250, u / 9.6) - 300, -600, lerp(.85, .9, Math.sin(u))],
    sfx: [[0, 'slide', -6], [.2, 'run', -6], [2.5, 'clang', -4], [3.0, 'whistle_up', -6], [3.3, 'clang', -4], [4.2, 'land', -6], [4.7, 'clang', -4], [6.0, 'slide', -6]] },

  { name: 'escada', scene: 'courtyard', dur: 3.6, tr: 'cut', mood: 'chase',
    cast(u, D, S, t) { const k = seg(u, 0, 1.0); const st = Math.min(5, Math.floor(seg(u, .2, 1.0) * 6));
      show(S.cat, { x: lerp(-260, 0, k), y: -43 * st - 20, face: 1, s: .9, E: { eye: 'happy' } }); if (u > 1.1) S.cat.vis = 0;
      const trip = seg(u, 1.4, 2.0);
      show(S.dol, { x: lerp(-600, -150, seg(u, 0, 1.4)), y: u < 1.4 ? 0 : -43 * Math.floor(trip * 4), face: 1, walk: u < 1.4 ? 1.2 : 0, ph: u * 16, rot: u > 1.4 ? lerp(0, 1.5, eo(trip)) : 0, aB: 2.5, aF: 2.5, E: { eye: u > 2.0 ? 'spiral' : 'open', brow: 1, mouth: u > 1.4 ? 'scream' : 'grin', open: .5 } });
      show(S.seol, { x: lerp(-900, -420, seg(u, .4, 2.4)), face: 1, walk: u < 2.4 ? 1 : 0, ph: u * 14, aB: .6, aF: u > 2.4 ? 1.7 : .8, E: { eye: 'open', brow: .8, mouth: 'o', open: .4 } }); S.order = ['seol', 'cat', 'dol']; },
    front(c, u, D, t, S) { tray(c, S.dol.x + 160, S.dol.y - 600 + (u > 1.4 ? 300 * seg(u, 1.4, 2) : 0), 1, CRAZY, t, u > 1.4 ? .3 * Math.sin(u * 9) : 0); [1.6, 1.8, 2.0].forEach((a, i) => word(c, 'BONK!', -80 + i * 90, -420 - i * 90, 70, back(seg(u, a, a + .12)) * (1 - seg(u, a + .5, a + .7)), '#ffb24a')); if (u > 2.2) { for (let i = 0; i < 3; i++) { const a = u * 4 + i * 2.1; c.fillStyle = '#ffe46a'; c.beginPath(); c.arc(S.dol.x + Math.cos(a) * 70 + 40, S.dol.y - 200 + Math.sin(a) * 25, 12, 0, TAU); c.fill(); } } },
    cam: (u, D) => [lerp(-300, -100, u / D), -520, lerp(.95, 1.05, u / D)],
    sfx: [[.2, 'scurry', -6], [1.6, 'bonk', -4], [1.8, 'bonk', -4], [2.0, 'bonk', -4], [2.3, 'birds', -10]] },

  { name: 'rei entediado', scene: 'hall', dur: 3.6, tr: 'whip', mood: 'court',
    cast(u, D, S, t) { kingSeat(S, { aF: 1.6, bF: 1.9, head: .12, E: { eye: 'open', brow: .3, mouth: 'flat', pupil: .8 }, look: [-.5, -.4] }); },
    front(c, u, D, t) { if (u > 1.8) { const k = seg(u, 1.8, 2.8); c.save(); c.globalAlpha = 1 - seg(u, 2.8, 3.4); c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(260 + i * 50 + k * 60, -900 - i * 60 - k * 80, 18 + i * 10, 0, TAU); c.fill(); c.stroke(); } c.restore(); word(c, 'suspiro...', 450, -1150, 60, back(seg(u, 1.9, 2.1)) * (1 - seg(u, 3.1, 3.4)), '#fff6dc'); } },
    cam: (u, D) => [lerp(0, 20, u / D), lerp(-900, -820, u / D), lerp(.75, 1.15, eo(u / D))],
    sfx: [[1.9, 'sigh', -6]] },

  { name: 'entrada salão', scene: 'hall', dur: 5.0, tr: 'whip', mood: 'freeze',
    cast(u, D, S, t) {
      show(S.rei, { x: 0, y: -340, face: 1, sit: 1, s: 1, aB: .9, aF: .9, bB: .9, bF: .9, E: { eye: u < 2.4 ? 'open' : 'open', brow: -.7, mouth: 'flat' }, look: [0, .8] });
      const k = eo(seg(u, 0, 1.6));
      show(S.dol, { x: lerp(-1500, -120, k), y: 0, face: 1, kneel: 1, aB: 1.6, aF: 1.6, bB: 0, bF: 0, lean: -.1, E: { eye: 'wide', brow: 1, mouth: u < 1.6 ? 'scream' : 'flat', open: u < 1.6 ? .8 : 0, sweat: u > 1.6 ? 1 : 0 } });
      S.order = ['rei', 'dol'];
    },
    front(c, u, D, t, S) { tray(c, S.dol.x + 230, -290, 1, CRAZY, t); if (u < 1.6) for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 8; c.beginPath(); c.moveTo(S.dol.x - 200 - i * 80, -100 - i * 40); c.lineTo(S.dol.x - 400 - i * 80, -100 - i * 40); c.stroke(); }
      word(c, 'SHHHHH...', 500, -1100, 0, 0); },
    cam: (u, D) => u < 1.6 ? [lerp(-900, -100, eo(seg(u, 0, 1.6))), -400, .9] : u < 2.6 ? [-50, -560, lerp(.9, 1.05, seg(u, 1.6, 2.6))] : [0, lerp(-560, -820, eo(seg(u, 2.6, 3.4))), lerp(1.05, 1.6, eo(seg(u, 2.6, 3.4)))],
    sfx: [[0, 'slide', -2], [1.6, 'screech', -4], [1.8, 'silence', 0], [2.6, 'gulp', -6]] },

  { name: 'o que é isto', scene: 'hall', lines: [['K1', .5], ['D9', '+.6']], tail: .6, tr: 'cut', mood: 'tense',
    cast(u, D, S, t) { const k2 = S._k2;
      show(S.rei, { x: 0, y: -340, face: 1, sit: 1, aB: .9, aF: .9, bB: .9, bF: .9, E: { eye: 'open', brow: -.8, mouth: 'flat' }, look: [-.6, .9] });
      show(S.dol, { x: -120, face: 1, kneel: 1, bow: u > 2.4 ? .35 : 0, aB: 1.6, aF: 1.6, bB: 0, bF: 0, E: { eye: 'open', brow: 1, mouth: 'wobble', sweat: 1 } }); S.order = ['rei', 'dol']; },
    front(c, u, D, t, S) { tray(c, 110, -290, 1, CRAZY, t); },
    cam: (u, D) => u < 2.2 ? [20, -820, lerp(1.9, 2.1, u / 2.2)] : [-80, -450, lerp(1.4, 1.5, seg(u, 2.2, D))],
    sfx: [] },

  { name: 'escolhe', scene: 'hall', lines: [['S8', 3.0]], tail: .5, tr: 'cut', mood: 'tense',
    cast(u, D, S, t) {
      const reach = eo(seg(u, .2, 1.0)) , hov = u < 2.4 ? Math.sin(u * 4) * .25 : 0;
      show(S.rei, { x: 0, y: -340 + 0, face: 1, sit: 1, aB: .9, aF: lerp(.9, 1.4, reach) + hov * .3, bB: .9, bF: lerp(.9, .4, reach), lean: .08 * reach, E: { eye: 'open', brow: -.3, mouth: 'flat' }, look: [-.2, 1] });
      show(S.dol, { x: -120, face: 1, kneel: 1, bow: .35, aB: 1.6, aF: 1.6, bB: 0, bF: 0, E: { eye: 'open', brow: 1, mouth: 'wobble', sweat: 1 } });
      S.order = ['rei', 'dol']; },
    front(c, u, D, t, S) { tray(c, 110, -290, 1, CRAZY.map((k, i) => i === 1 && u > 2.4 ? null : k).filter(Boolean), t); if (u > 2.4) mandu(c, 150, lerp(-340, -560, eo(seg(u, 2.4, 3))), 1, 'burnt', t);
      // Seol-hwa peeking from behind the pillar, at the side
      c.save(); c.translate(760, 0); c.scale(-1, 1); c.restore(); },
    back(c, u, D, t, S) {},
    cam: (u, D) => u < 2.6 ? [120, -420, lerp(1.6, 2.0, u / 2.6)] : [120, -420, 2.0],
    ui(c, u, D, t) { if (u > 2.8) { const k = back(seg(u, 2.8, 3.1)); c.save(); c.translate(860, 540); c.scale(k, k); c.fillStyle = '#fff6dc'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 170, 0, TAU); c.fill(); c.stroke(); c.save(); c.beginPath(); c.arc(0, 0, 160, 0, TAU); c.clip();
        // inset: Seol-hwa behind a pillar, covering her eyes and peeking
        c.fillStyle = '#c48850'; c.fillRect(-170, -170, 340, 340); c.fillStyle = '#c13a2e'; c.fillRect(30, -170, 130, 340);
        c.save(); c.translate(-30, 330); c.scale(.6, .6); seolhwa(c, show(pose(), { x: 0, face: 1, aB: 2.6, aF: 2.75, bB: 1.75, bF: 1.75, E: { eye: Math.sin(t * 3) > .3 ? 'open' : 'closed', brow: 1, mouth: 'wobble' } }), t); c.restore();
        c.restore(); c.lineWidth = 8; c.strokeStyle = INK; c.beginPath(); c.arc(0, 0, 160, 0, TAU); c.stroke(); c.restore(); } },
    sfx: [[.3, 'tension', -6]] },

  { name: 'mordida', scene: 'hall', dur: 5.2, tr: 'zoom', mood: 'cliff',
    cast(u, D, S, t) { show(S.rei, { x: 0, y: -340, face: 1, sit: 1, aB: .9, aF: 2.1, bF: 1.2, E: { eye: u < 1.0 ? 'open' : 'closed', brow: -.3, mouth: u < .7 ? 'o' : 'flat', open: u < .7 ? .8 : 0 } }); },
    front(c, u, D, t) { if (u < 1.0) mandu(c, 175, -900, 1.1, 'burnt', t); else mandu(c, 175, -900, 1.1, 'burnt', t, 0); },
    cam: (u, D) => [80, -860, lerp(2.2, 3.4, eo(seg(u, 0, 1.0)))],
    shake: u => Math.abs(shake(u, 1.0, 20, .3)),
    ui(c, u, D, t) { word(c, 'CROC!', 540, 600, 200, back(seg(u, 1.0, 1.15)) * (1 - seg(u, 1.8, 2.0))); continua(c, u, 1.6, 'na Parte 3: O Banquete', t); },
    sfx: [[1.0, 'crunch', 0], [1.05, 'freeze', -4], [1.6, 'sting', -2]] },
];

// ———————————————————— PARTE 3 · O Banquete ————————————————————
const kingSeat = (S, o = {}) => show(S.rei, Object.assign({ x: 0, y: -340, face: 1, sit: 1, aB: .9, aF: .9, bB: .9, bF: .9, E: { eye: 'open', brow: 0, mouth: 'flat' } }, o));
const P3 = [
  { name: 'croc', scene: 'hall', dur: 2.4, mood: 'freeze',
    cast(u, D, S, t) { kingSeat(S, { aF: 2.1, bF: 1.2, E: { eye: 'closed', brow: -.2, mouth: 'flat', stache: .5 * Math.abs(Math.sin(u * 18)) * (1 - seg(u, .5, 1.4)) } }); },
    front(c, u, D, t) { mandu(c, 175, -900, 1.1, 'burnt', t); },
    cam: (u, D) => [80, -860, lerp(3.4, 3.0, u / 2.4)],
    shake: u => Math.abs(shake(u, .1, 14, .4)),
    ui(c, u, D, t) { word(c, 'CROC!', 540, 600, 200, back(seg(u, .05, .2)) * (1 - seg(u, .9, 1.1))); if (u < .5) { const k = back(seg(u, 0, .3)) * (1 - seg(u, .3, .5)); } const k = back(seg(u, .1, .4)) * (1 - seg(u, 2.0, 2.4)); c.save(); c.translate(540, 320); c.scale(k, k); c.fillStyle = '#c8303a'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.roundRect(-300, -60, 600, 120, 30); c.fill(); c.stroke(); c.font = '84px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff6dc'; c.fillText('PARTE 3', 0, 4); c.restore(); },
    sfx: [[.05, 'crunch', 0], [.6, 'crunch', -6], [1.2, 'crunch', -10]] },

  { name: 'silêncio', scene: 'hall', dur: 3.4, tr: 'cut', mood: 'freeze',
    cast(u, D, S, t) { kingSeat(S, { E: { eye: 'closed', brow: -.2, mouth: 'flat' } });
      show(S.dol, { x: -120, face: 1, kneel: 1, bow: .35, aB: 1.6, aF: 1.6, bB: 0, bF: 0, E: { eye: 'open', brow: 1, mouth: 'wobble', sweat: 1 + .5 * Math.sin(u * 8) }, look: [.6, -.8] });
      show(S.seol, { x: 720, face: -1, aB: 2.6, aF: 2.7, bB: 1.8, bF: 1.8, E: { eye: 'closed', brow: 1, mouth: 'wobble' } }); S.order = ['rei', 'dol', 'seol']; },
    front(c, u, D, t) { tray(c, 110, -290, 1, CRAZY.filter((k, i) => i !== 1), t); c.save(); c.fillStyle = '#c13a2e'; c.strokeStyle = INK; c.lineWidth = 6; c.fillRect(780, -1760, 120, 1760); c.restore(); },
    cam: (u, D) => [lerp(150, 260, u / 2.6), -560, lerp(.9, .95, u / 2.6)],
    sfx: [[.1, 'cricket', -12], [1.5, 'gulp', -6]] },

  { name: 'isso', scene: 'hall', line: 'K2', lead: .9, tail: .7, tr: 'cut', mood: 'freeze',
    cast(u, D, S, t) { kingSeat(S, { E: { eye: u < .6 ? 'closed' : 'wide', brow: .2, mouth: 'flat', pupil: .7 } }); },
    cam: (u, D) => [60, -820, lerp(2.5, 2.9, u / D)],
    sfx: [[.6, 'zoom_in', -6]] },

  { name: 'perdão', scene: 'hall', line: 'D10', lead: .2, tail: 1.8, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { show(S.dol, { x: -120, face: 1, kneel: 1, bow: lerp(.35, 1.0, eo(seg(u, 0, .3))), aB: 2.7, aF: 2.7, bB: 0, bF: 0, E: { eye: 'closed', brow: 1, mouth: 'scream', open: .3, tears: .6 } });
      show(S.cat, { x: 260, y: -10, face: -1, s: .9, E: { eye: u > 2.2 ? 'happy' : 'open' }, look: [1, 0] }); kingSeat(S, { E: { eye: 'wide', brow: .2, mouth: 'flat' } }); S.order = ['rei', 'dol', 'cat']; },
    front(c, u, D, t, S) { if (u > 2.2) word(c, 'miau?', 400, -380, 70, back(seg(u, 2.2, 2.4)), '#fff6dc'); },
    cam: (u, D) => u < 2.2 ? [-100, -360, 1.5] : [lerp(-100, 150, eo(seg(u, 2.2, 2.6))), -300, 1.6],
    sfx: [[.15, 'bonk', -4], [2.3, 'meow', -4]] },

  { name: 'melhor', scene: 'hall', line: 'K3', lead: .6, tail: .8, tr: 'zoom', mood: 'joy',
    cast(u, D, S, t) { const st = eo(seg(u, 0, .6));
      show(S.rei, { x: 0, y: lerp(-340, -340, st), face: 1, sit: 1 - st, aB: .5, aF: lerp(.9, 2.8, back(seg(u, .3, .7))), bF: .2, E: { eye: 'happy', brow: -.3, mouth: 'grin', open: .3, stache: .6 + .2 * Math.sin(u * 8) } }); },
    front(c, u, D, t, S) { if (u > .5) { mandu(c, 175, -1000 - 20 * Math.sin(u * 5), 1.2, 'burnt', t); sparkles(c, 175, -1000, 130, t, 6); } },
    cam: (u, D) => [lerp(60, 40, u / D), lerp(-760, -720, u / D), lerp(1.3, 1.45, u / D)],
    ui(c, u) { speedLines(c, 540, 600, .45 * seg(u, .4, .7) * (1 - seg(u, 2.5, 3)), u, 'rgba(255,230,120,.8)'); },
    sfx: [[.3, 'fanfare', -4]] },

  { name: 'dança', scene: 'hall', dur: 3.2, tr: 'cut', mood: 'joy',
    cast(u, D, S, t) { show(S.rei, { x: 0, y: -340 - Math.abs(Math.sin(u * 6)) * 40, face: Math.sin(u * 3) > 0 ? 1 : -1, aB: 2.5 + .3 * Math.sin(u * 12), aF: 2.5 - .3 * Math.sin(u * 12), bB: .4, bF: .4, legs: [.4 * Math.sin(u * 12), .3, -.4 * Math.sin(u * 12), .3], E: { eye: 'happy', mouth: 'grin', open: .4, stache: .5 } }); },
    front(c, u, D, t) { mandu(c, 0, -1080 - Math.abs(Math.sin(u * 6)) * 40, 1.1, 'burnt', t, u * 6); for (let i = 0; i < 4; i++) word(c, '♪', -300 + i * 200, -1150 + Math.sin(u * 4 + i) * 60, 90, 1, '#ffe23a', Math.sin(u * 3 + i) * .3); },
    cam: (u, D) => [0, -800, lerp(1.0, 1.08, u / D)],
    sfx: [[0, 'dance', -4]] },

  { name: 'nome', scene: 'hall', lines: [['K8', .5]], tail: 1.8, tr: 'cut', mood: 'joy',
    cast(u, D, S, t) { show(S.rei, { x: 0, y: -340, face: 1, aB: .5, aF: 2.7, bF: .2, E: { eye: 'happy', mouth: 'grin', brow: -.3 } }); },
    front(c, u, D, t) { const k = eo(seg(u, 2.6, 3.6)); if (k > 0) { c.save(); c.translate(0, -1450); c.fillStyle = '#c8303a'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.rect(-460, 0, 920, 200 * k + 10); c.fill(); c.stroke(); c.fillStyle = '#e7b93a'; c.beginPath(); c.rect(-480, -20, 960, 30); c.fill(); c.stroke();
      if (k > .6) { c.font = '86px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 16; c.strokeStyle = INK; c.strokeText('MANDU REAL DOURADO', 0, 110); c.fillStyle = '#ffe23a'; c.fillText('MANDU REAL DOURADO', 0, 110); } c.restore(); sparkles(c, 0, -1350, 520, t, 8); } },
    cam: (u, D) => u < 2.6 ? [0, -880, lerp(1.6, 1.7, u / 2.6)] : [0, lerp(-880, -1050, eo(seg(u, 2.6, 3.4))), lerp(1.7, .95, eo(seg(u, 2.6, 3.4)))],
    sfx: [[2.6, 'unroll', -4], [3.0, 'fanfare', -4]] },

  { name: 'queixo', scene: 'hall', dur: 2.8, tr: 'cut', mood: 'joy',
    cast(u, D, S, t) { show(S.dol, { x: -150, face: 1, kneel: 1, aB: .2, aF: .2, E: { eye: 'wide', brow: .9, mouth: 'scream', open: .2 + .2 * back(seg(u, .1, .4)), pupil: .5 } });
      show(S.seol, { x: 240, face: -1, aB: .2, aF: .2, E: { eye: 'wide', brow: .9, mouth: 'scream', open: .2 + .2 * back(seg(u, .3, .6)), pupil: .5 } }); S.order = ['dol', 'seol']; },
    cam: (u, D) => [50, -420, lerp(1.25, 1.35, u / 2.2)],
    sfx: [[.1, 'boing', -6], [.3, 'boing', -6]] },

  { name: 'picante', scene: 'hall', lines: [['K4', 3.2]], tail: .7, tr: 'cut', mood: 'comic',
    cast(u, D, S, t) { const hot = seg(u, .8, 1.3) * (1 - seg(u, 2.9, 3.3));
      show(S.rei, { x: 0, y: -340, face: 1, sit: 0, aB: .5, aF: u < .8 ? 2.0 : 1.0, bF: u < .8 ? 1.3 : .2, E: { eye: hot > .5 ? 'x' : u > 3.2 ? 'happy' : 'open', brow: hot > .5 ? 1 : -.2, mouth: hot > .5 ? 'scream' : u > 3.2 ? 'grin' : 'o', open: hot * .8 + (u < .8 ? .4 : 0), red: hot, steam: hot, stache: hot } }); },
    front(c, u, D, t) { if (u < .8) mandu(c, 175, -900, 1.1, 'kimchi', t); if (u > 1.3 && u < 2.9) { const k = seg(u, 1.3, 1.6); c.save(); c.translate(150, -850); c.scale(k, k); fire(c, 0, 0, 1.2, t); c.restore(); word(c, 'FUUUH!', 300, -1150, 130, back(seg(u, 1.3, 1.45)) * (1 - seg(u, 2.6, 2.9)), '#ff6a3a'); } },
    cam: (u, D) => [80, -820, lerp(1.9, 2.1, u / D)],
    shake: u => u > 1.3 && u < 2.9 ? 10 : 0,
    sfx: [[.4, 'crunch', -4], [1.0, 'sizzle', -4], [1.3, 'fire_breath', -2], [1.4, 'whistle_kettle', -6]] },

  { name: 'promoção', scene: 'hall', line: 'K5', lead: .4, tail: 1.6, tr: 'cut', mood: 'joy',
    cast(u, D, S, t) { show(S.rei, { x: 0, y: -340, face: 1, aB: .5, aF: lerp(.9, 1.7, eo(seg(u, .3, .8))), bF: 0, E: { eye: 'happy', brow: -.3, mouth: 'smile' } });
      const cry = u > 4.3;
      show(S.dol, { x: -150, face: 1, kneel: 1, aB: cry ? 2.6 : .4, aF: cry ? 2.6 : .4, bB: cry ? .5 : 0, bF: cry ? .5 : 0, E: { eye: cry ? 'closed' : 'wide', brow: .9, mouth: cry ? 'grin' : 'o', open: .4, tears: cry ? 1.5 : 0 } }); S.order = ['rei', 'dol']; },
    front(c, u, D, t, S) { if (u > 4.3) { for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const k = ((u * 2 + i / 6) % 1), x = -140 + s * (60 + k * 200), y = -560 - 160 * Math.sin(k * Math.PI); c.fillStyle = 'rgba(120,200,255,.9)'; c.beginPath(); c.arc(x, y + k * 200, 14, 0, TAU); c.fill(); } sparkles(c, -140, -520, 160, t, 6); } },
    cam: (u, D) => u < 4.3 ? [lerp(-20, -60, u / 4.3), -620, lerp(1.0, 1.15, u / 4.3)] : [-140, -500, lerp(1.9, 2.1, seg(u, 4.3, D))],
    sfx: [[4.3, 'cry', -4], [4.4, 'sparkle', -6]] },

  { name: 'ideia dela', scene: 'hall', lines: [['D11', .4], ['K6', '+.5']], tail: .8, tr: 'cut', mood: 'warm',
    cast(u, D, S, t) { show(S.dol, { x: -200, face: 1, aB: .3, aF: 1.4, bF: .6, E: { eye: 'open', brow: .4, mouth: 'smile', blush: .4 }, look: [1, 0] });
      show(S.seol, { x: 260, face: -1, aB: .3, aF: .3, E: { eye: u > 4 ? 'happy' : 'wide', brow: .3, mouth: u > 4 ? 'grin' : 'o', open: u > 4 ? .2 : .3, blush: seg(u, 3.6, 4.4) } });
      show(S.rei, { x: 30, y: -340, face: 1, aB: .5, aF: u > 3.6 ? 2.6 : .9, bF: .3, E: { eye: 'happy', brow: -.2, mouth: 'smile' } }); S.order = ['rei', 'dol', 'seol']; },
    front(c, u, D, t) { if (u > 4.6) { for (let i = 0; i < 5; i++) { const a = u * 1.5 + i * 1.3; c.save(); c.translate(30 + Math.cos(a) * 280, -700 + Math.sin(a * 1.3) * 120 - (u - 4.6) * 60); c.fillStyle = '#ff6a8a'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 18); c.bezierCurveTo(-30, -10, -16, -34, 0, -18); c.bezierCurveTo(16, -34, 30, -10, 0, 18); c.fill(); c.stroke(); c.restore(); } } },
    cam: (u, D) => u < 3.3 ? [lerp(-120, 40, seg(u, 0, 3.3)), -560, 1.25] : [40, -620, lerp(1.0, .95, seg(u, 3.3, D))],
    sfx: [[3.6, 'harp_up', -6]] },

  { name: 'gato provador', scene: 'hall', lines: [['K7', 1.8]], tail: 1.6, tr: 'cut', mood: 'warm',
    cast(u, D, S, t) { kingSeat(S, { aF: 1.5, bF: .3, E: { eye: 'happy', brow: -.3, mouth: 'grin', open: .2 } });
      const k = seg(u, 0, .8), [x, y] = arc(eo(k), 600, 0, 150, -480, 320);
      show(S.cat, { x, y, face: -1, s: .9, hat: u > 4.6, E: { eye: u > .8 ? 'happy' : 'open' } }); S.order = ['rei', 'cat']; },
    front(c, u, D, t, S) { if (u > .8 && u < 1.6) mandu(c, S.cat.x - 90, S.cat.y - 100, .8, 'mel', t); if (u > 4.6) sparkles(c, S.cat.x - 70, S.cat.y - 200, 70, t, 4); if (u > 1.0 && u < 1.8) word(c, 'NHAC!', 420, -900, 100, back(seg(u, 1.0, 1.15)) * (1 - seg(u, 1.6, 1.8))); },
    cam: (u, D) => [lerp(250, 120, seg(u, 0, 1)), -720, lerp(1.2, 1.45, seg(u, 0, 2))],
    sfx: [[.05, 'jump', -6], [.8, 'land_soft', -6], [1.0, 'nom', -4], [4.6, 'ding', -6], [5.0, 'purr', -8]] },

  { name: 'naquela noite', scene: 'night', dur: 3.4, tr: 'iris', mood: 'party',
    set: u => ({ fw: [[0, -1700, 1.6, '#ffd23a']] }),
    cast(u, D, S) {},
    cam: (u, D) => [0, lerp(-1500, -1200, u / D), lerp(.8, .85, u / D)],
    ui(c, u, D, t) { const k = back(seg(u, .3, .8), 2) * (1 - seg(u, 2.8, 3.3)); c.save(); c.translate(540, 900); c.scale(k, k); c.fillStyle = '#2f7a62'; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.roundRect(-380, -70, 760, 140, 70); c.fill(); c.stroke(); c.font = '700 70px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('Naquela noite...', 0, 4); c.restore(); },
    sfx: [[1.6, 'firework', -6], [.3, 'chime', -8]] },

  { name: 'festa', scene: 'night', lines: [['D12', 3.8], ['S9', '+.3']], tail: 3.6, tr: 'iris', mood: 'party',
    set: u => ({ fw: [[-300, -1700, .3, '#ffd23a'], [350, -1850, 1.2, '#ff6a8a'], [0, -1600, 2.4, '#9ff07a'], [-400, -1900, 3.6, '#7ad0ff'], [380, -1650, 4.6, '#ffd23a'], [-100, -1800, 5.6, '#ff6a8a'], [250, -1750, 6.4, '#ffe23a']].map(([x, y, a, col]) => [x, y, a + 0, col]) }),
    cast(u, D, S, t) { const hop = -Math.abs(Math.sin(u * 5)) * 20;
      show(S.dol, { x: -290, y: hop, face: 1, aB: 2.6, aF: u > 3.2 && u < 5.4 ? 1.6 : 2.7, bF: u > 3.2 && u < 5.4 ? .3 : .2, E: { eye: u > 5.6 ? 'closed' : 'happy', brow: -.2, mouth: 'grin', open: u > 5.6 ? .6 : 0 } });
      show(S.seol, { x: 120, y: u > 5.6 ? hop : 0, face: -1, aB: u > 4.8 ? .75 : 2.4, aF: u > 4.8 ? .75 : 2.6, bB: u > 4.8 ? -2 : .3, bF: u > 4.8 ? -2 : .3, E: { eye: u > 5.6 ? 'closed' : 'happy', brow: u > 4.8 && u < 5.6 ? -.6 : -.2, mouth: 'grin', open: u > 5.6 ? .5 : 0 } });
      show(S.cat, { x: -110, y: 60, face: 1, s: .8, hat: 1, E: { eye: 'happy' } });
      show(S.rei, { x: 360, y: 0, face: -1, s: .85, aB: 2.4, aF: 2.6, E: { eye: 'happy', mouth: 'grin', open: .2 } }); S.order = ['rei', 'dol', 'seol', 'cat']; },
    front(c, u, D, t, S) { tray(c, 120, 40, 1, ['raw', 'kimchi', 'burnt', 'mel', 'batata', 'raw'], t);
      for (let i = 0; i < 40; i++) { const k = (u * .3 + hash(i)) % 1, x = (hash(i * 3) - .5) * 1400, y = -1600 + k * 1800; c.fillStyle = ['#ffd23a', '#ff6a8a', '#9ff07a', '#7ad0ff'][i % 4]; c.save(); c.translate(x + Math.sin(u * 3 + i) * 30, y); c.rotate(u * 4 + i); c.fillRect(-10, -5, 20, 10); c.restore(); } },
    cam: (u, D) => u < 3 ? [lerp(0, 60, u / 3), lerp(-1100, -560, eo(seg(u, 0, 2.6))), lerp(.75, 1.0, eo(seg(u, 0, 2.6)))] : u < 6.2 ? [0, -560, lerp(1.0, 1.1, seg(u, 3, 6.2))] : [lerp(0, 60, seg(u, 6.2, D)), lerp(-560, -900, eo(seg(u, 6.2, D))), lerp(1.1, .8, eo(seg(u, 6.2, D)))],
    ui(c, u, D, t) { if (u > D - 2.0) { const k = back(seg(u, D - 2.0, D - 1.5), 2); c.save(); c.translate(540, 560); c.scale(k, k); c.font = '190px "Lilita One"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 30; c.strokeStyle = INK; c.strokeText('FIM', 0, 0); c.fillStyle = '#ffe23a'; c.fillText('FIM', 0, 0);
      c.font = '700 54px Fredoka'; c.lineWidth = 14; c.strokeText('O Pastel Real', 0, 140); c.fillStyle = '#fff'; c.fillText('O Pastel Real', 0, 140); c.restore(); } },
    sfx: [[.3, 'firework', -6], [1.2, 'firework', -6], [2.4, 'firework', -6], [3.6, 'firework', -6], [4.6, 'firework', -6], [5.6, 'firework', -6], [6.4, 'firework', -6], [5.7, 'laugh', -8]] },
];

export const PARTS = { 1: P1, 2: P2, 3: P3 };
