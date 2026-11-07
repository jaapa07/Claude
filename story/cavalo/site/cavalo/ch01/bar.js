/* bar.js — what every scene of ch01 shares: the bar set with its camera, the cast at their marks, the shots and the
   small acting helpers. Zé stands behind the counter (cam.stageAt.floor); Valdir, Dona Neide and Trovão stand on
   cam.stage, in front of it; the gents' door frame (layer 'jamb') hides the horse's rump while it is in the doorway. */
'use strict';
const FLOORY = 1300;
const ZE = { x: 330, y: 1185, s: 1.36 }, VAL = { x: 760, s: 1.3 }, NEI = { x: 1230, s: 1.2 }, TRO = { x: 1985, s: 1.12 };
const VD = 1525;   // Valdir's mark by the gents' door, from the tug on
// Trovão at the counter's end after the slide, like a customer: up on his hind legs, front hooves on the counter
const SIT = { s: TRO.s, flip: -1, r: -42, fn: 8, ff: 18, hn: -42, hf: -36, neck: -22, head: 6, tail: -20 };
function seated(tro, o) { const [x, y] = tro.at({ ...SIT, ...o, x: 0, y: 0 }, 'hip'); return { ...SIT, ...o, x: 960 - x, y: FLOORY - 205 * TRO.s - y }; }
// The shots, as camera views of the upright frame (900/z world px wide, 1600/z tall).
const V = {
  door: { x: 1800, y: 1010, z: 1.55 },        // the gents' door, the horse's head out of it
  ze: { x: 345, y: 930, z: 2.3 },              // Zé close, behind the counter
  zeWide: { x: 380, y: 960, z: 1.8 },
  val: { x: 760, y: 950, z: 2.25 },            // Valdir close, at the counter
  valD: { x: 1590, y: 960, z: 2.2 },           // Valdir close at the door
  nei: { x: 1195, y: 990, z: 2.3 },            // Dona Neide close
  stool: { x: 790, y: 880, z: 1.7 },           // Trovão on his stool, close
  zeTro: { x: 590, y: 920, z: 1.35 },          // Zé and Trovão at the counter
  wide: { x: 820, y: 960, z: .95 },            // the bar from the counter to the doors
  two: { x: 560, y: 1000, z: 1.3 },            // Zé and Valdir
  bar: { x: 640, y: 960, z: 1.05 },            // the counter end of the bar
  tug: { x: 1640, y: 980, z: 1.2 },            // Valdir pulling the horse at the door
  valDoor: { x: 1610, y: 960, z: 2.0 },        // Valdir close at the door, the horse's head beside him
};
// Blink times for one puppet: every 2.6-4.4 s, from its own seed, so no two blink together.
const blinks = (seed, D) => { const out = []; for (let t = .8 + (seed % 7) * .3, i = 0; t < D + 1; i++) { out.push(t); t += 2.6 + 1.8 * (.5 + .5 * jit(i, seed)); } return out; };
// Breathing and the small weight shifts that keep a held figure alive.
const alive = (q, k) => ({ bob: 2.2 * Math.sin(q * 2.1 + k), headR: 1.6 * Math.sin(q * .9 + k * 2) });

function barScene(p, { neide = false, horse = true, oil = false } = {}) {
  const cam = paperCam(p, 'bar', V.bar, { after: 'counter', stages: ['floor'] });
  const puddle = mk('g', { visibility: oil ? 'inherit' : 'hidden' }, cam.stage);
  puddle.innerHTML = '<path d="M1500,1296 q90,-22 200,-6 q120,8 180,0 q40,12 -10,22 q-160,18 -330,8 q-70,-6 -40,-24 Z" fill="#e9c46a" opacity=".85"/><path d="M1560,1300 q80,-8 160,-2" stroke="#fff6c8" stroke-width="5" fill="none" opacity=".8"/>';
  const ze = zePuppet(cam.stageAt.floor);
  const tro = horse ? horsePuppet(cam.stage) : null;
  const nei = neide ? neidePuppet(cam.stage) : null;
  const val = valdirPuppet(cam.stage);
  const rope = mk('path', { fill: 'none', stroke: '#c8a26a', 'stroke-width': 7, 'stroke-linecap': 'round', visibility: 'hidden' }, cam.stage);
  const front = mk('g', {}, cam.stage);   // props in front of everyone (oil, flying bottles)
  return { cam, ze, tro, nei, val, rope, front, puddle };
}
// Cut to a view a moment before a line starts, so the speaker is on screen as the first word lands.
function cuts(cam, scene, pre, list) { for (const [clip, view, dt = -.12] of list) cam.cut(view, Math.max(0, clipAt(scene, pre, clip) + dt)); }
const speaking = (q, scene, pre, ...clips) => clips.some(c => { const a = clipAt(scene, pre, c); return q >= a && q < a + TIMINGS[c].dur; });
