/* guerra.js — what every episode shares: marks, the bathroom with its cast, timing and acting helpers. */
'use strict';
const FLOORY = 1350;
const GEN = { x: 450, s: 1.45 };
const BOWL = FLOORY - 250 * GEN.s;                        // the water line in the General's bowl (y 987)
const TON = { x: 392, y: BOWL + 26, s: .66 }, PING = { x: 545, y: BOWL + 22, s: .5 }, CLA = { x: 790, y: FLOORY, s: .9 };
const VB = {                                              // the bathroom's shots (900/z by 1600/z world px)
  wide: { x: 450, y: 930, z: .95 }, bowl: { x: 460, y: 980, z: 2.0 }, ton: { x: 395, y: 960, z: 4.4 }, ping: { x: 545, y: 975, z: 5.4 },
  gen: { x: 450, y: 830, z: 2.6 }, genLow: { x: 450, y: 900, z: 1.7 }, cla: { x: 790, y: 1190, z: 2.8 }, two: { x: 600, y: 1080, z: 1.5 },
};
const blinks = (seed, D) => { const out = []; for (let t = .7 + (seed % 7) * .31, i = 0; t < D + 1; i++) { out.push(t); t += 2.4 + 1.9 * (.5 + .5 * jit(i, seed)); } return out; };
const alive = (q, k) => ({ bob: 2.5 * Math.sin(q * 2.2 + k), lean: 1.5 * Math.sin(q * .9 + k * 2) });
const speaking = (q, scene, pre, ...clips) => clips.some(c => { const a = clipAt(scene, pre, c); return q >= a && q < a + TIMINGS[c].dur; });
function cuts(cam, scene, pre, list) { for (const [clip, view, dt = -.1] of list) cam.cut(view, Math.max(0, clipAt(scene, pre, clip) + dt)); }
// the bathroom: the General (his bowl's front over whoever sits in it), Tonhão's throne, Tonhão, Pinguinho, Cláudio
function bathroom(p, { view = VB.wide, ton = true, ping = true, cla = true, tonOpts = {} } = {}) {
  const cam = paperCam(p, 'banheiro', view);
  const fp = mk('g', {}, cam.stage), gen = general(cam.stage, fp);
  const thr = throne(cam.stage); tf(thr, `translate(${TON.x - 8},${TON.y - 10}) scale(.62)`);
  const tonhaoT = ton ? tonhao(cam.stage, tonOpts) : null, pingT = ping ? pinguinho(cam.stage) : null;
  cam.stage.appendChild(fp);
  const claT = cla ? claudio(cam.stage) : null, front = mk('g', {}, cam.stage);
  return { cam, gen, thr, ton: tonhaoT, ping: pingT, cla: claT, front };
}
// a roll that rolls: the body turns about its middle, not its feet (Cláudio's middle is 95 units up)
const rolling = (x, s, deg, mid = 95) => { const r = deg * Math.PI / 180; return { x: x - mid * s * Math.sin(r), y: FLOORY - mid * s + mid * s * Math.cos(r), lean: deg }; };

// the sewer: everyone stands on the ledge (y 1300); the river runs below it; the crowd of poos floats in front
const LEDGE = 1300;
const VS = { wide: { x: 450, y: 880, z: .95 }, ton: { x: 330, y: 1120, z: 2.8 }, rat: { x: 640, y: 1110, z: 2.9 }, two: { x: 470, y: 1120, z: 1.6 },
  pipe: { x: 1050, y: 520, z: 1.4 }, crowd: { x: 450, y: 1180, z: 1.15 }, river: { x: 520, y: 1330, z: 1.9 } };
function sewer(p, { view = VS.wide, badge = false } = {}) {
  const cam = paperCam(p, 'esgoto', view);
  const vet = veteranPoo(cam.stage), ton = tonhao(cam.stage, { badge }), rat = rato(cam.stage), front = mk('g', {}, cam.stage);
  return { cam, vet, ton, rat, front };
}
// a soap bar the boss speaks from
const soapbox = p => prop(p, `<g filter="url(#paper)"><rect x="-110" y="-70" width="220" height="70" rx="24" fill="#f3a6c8"/><text x="0" y="-24" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" fill="#fff">SABONETE</text></g>`);

// the HR office: the mug sits on the desk (its top is y 1000); Cláudio stands across from her
const DESK = 1000;
const VO = { wide: { x: 520, y: 980, z: 1.05 }, cla: { x: 250, y: 1205, z: 3.4 }, mug: { x: 800, y: 870, z: 2.9 }, two: { x: 520, y: 1060, z: 1.55 } };
const VF = { wide: { x: 450, y: 900, z: .95 }, cla: { x: 450, y: 1170, z: 2.7 } };

// the courtroom: the judge stands on a platform behind the bench; Cláudio in the witness box (left), Tonhão in the
// dock (right), both behind their boxes; Pinguinho in front; the door is on the right
const VT = { wide: { x: 450, y: 860, z: .95 }, judge: { x: 450, y: 720, z: 2.4 }, ton: { x: 890, y: 1010, z: 3.0 }, cla: { x: -110, y: 1090, z: 2.8 },
  ping: { x: 600, y: 1220, z: 2.6 }, door: { x: 1060, y: 960, z: 1.25 }, gold: { x: 930, y: 1110, z: 2.1 } };
function court(p, { gold = false } = {}) {
  const cam = paperCam(p, 'tribunal', VT.wide, { after: 'front', stages: ['floor'] });
  const judge = juiz(cam.stageAt.floor), cla = claudio(cam.stageAt.floor), ton = tonhao(cam.stageAt.floor);
  const glow = mk('rect', { x: 1070, y: 580, width: 190, height: 770, fill: '#fff3b0', opacity: 0 }, cam.stageAt.floor);
  const ping = pinguinho(cam.stage), dad = gold ? goldPoo(cam.stage) : null, front = mk('g', {}, cam.stage);
  return { cam, judge, cla, ton, ping, dad, glow, front };
}
const JU = { x: 450, y: 955, s: 1.2 }, WIT = { x: -110, y: 1250, s: .85 }, DOCK = { x: 890, y: 1130, s: .8 }, PG = { x: 600, y: FLOORY, s: .68 };
