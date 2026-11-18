// snooker/stick.js: the cast of "O Chupa-Cu do Snooker Bar" (stick figures, one look each for the five parts) and the
// set-ups. setup(stage) returns X: the people of the bar (set 'snk'), their twins on the street (set 'rua'), helpers.
import * as S from '../engine/stage.js';
import { buildSnooker } from './world.js';
const { THREE, clamp, lerp, ease, Stickman } = S;

export const LOOK = {
  you: { type: 'guy', color: '#6b1e2e', hair: '#2a1a12', keys: true, shoes: '#222' },          // Murilo: wine shirt, keys on the belt
  zuba: { type: 'guy', color: '#1d1d22', hair: '#111', shoes: '#f2f2f2' },
  serjo: { type: 'stache', color: '#3d6fb0' },
  alex: { type: 'guy', color: '#e05a2b', hair: '#5a3b22', curly: true, shoes: '#4a2a14' },
  didi: { type: 'guy', color: '#2e9e57', cap: '#f2c230', shoes: '#3a7bd5' },
  rocha: { type: 'guy', color: '#7a5a3a', beard: '#333', shoes: '#222' },
  reny: { type: 'guy', color: '#1f9a8a', hair: '#15100c', shoes: '#d23b2f', socks: '#f6f4ee', stripe: '#c8372d' },
  edu: { type: 'guy', color: '#f2c230', hair: '#3a2414', glasses: true, shoes: '#f0f0f0' },
  jorge: { type: 'robe', color: '#8a7aa8', color2: '#2a2a30' },
  cli: { type: 'guy', color: '#4a6b8a', cap: '#c8372d', shoes: '#222' }, ami: { type: 'guy', color: '#8a4a8a', hair: '#5a3b22', shoes: '#222' },
  mae: { type: 'hanbok', color: '#b04a7a', color2: '#f0e0e8' }, padeiro: { type: 'guy', color: '#f4f4f4', cap: '#f4f4f4' }, cabel: { type: 'lia', color: '#d4567a' },
  turista: { type: 'guy', color: '#f2c230', cap: '#2c5fae' }, rapaz: { type: 'guy', color: '#4a8a6a', hair: '#3a2414' }, pol: { type: 'guy', color: '#1d2c4a', cap: '#1d2c4a' },
};
export const P = {
  stand: { facing: 0 }, talk: k => ({ facing: 0, armR: [-1.6 - 0.4 * Math.sin(k * 6), 0.6], armL: [0.2, -0.2] }),
  scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] }, shock: { facing: 0, mood: 'scared', lean: -0.15, armL: [2.4, 0.3], armR: [-2.4, -0.3] },
  clutch: { facing: 0, mood: 'scared', lean: 0.15, armL: [0.9, 0.6], armR: [-0.9, -0.6], legL: [0.25, 0], legR: [-0.25, 0] },
  point: s => ({ facing: s, armR: [-1.6 * s, 0.1 * s], armL: [0.2, -0.2] }), pointUp: { facing: 0, headTilt: -0.3, armR: [-2.9, 0.1], armL: [0.2, -0.2] },
  cue: { facing: 1, lean: 0.55, armL: [1.4, -0.3], armR: [0.9, -1.2], legL: [0.25, 0], legR: [-0.15, 0] },
  cheers: k => ({ facing: 0, armL: [0.3, -0.3], armR: [-2.6 - 0.15 * Math.sin(k * 8), 0.2] }), laugh: k => ({ facing: 0, lean: -0.12 + 0.06 * Math.sin(k * 18), headTilt: -0.25, armL: [0.6, -2.0], armR: [-0.6, 2.0] }),
  phone: { facing: 0, headTilt: 0.25, armL: [0.4, -2.3], armR: [-0.4, 2.3] }, write: { facing: 0, headTilt: 0.35, armL: [0.6, -1.6], armR: [-0.4, 1.9] },
  lamp: { facing: 0, armR: [-2.6, 0.3], armL: [0.2, -0.2] }, feetUp: { facing: 0, mood: 'scared', lean: -0.25, legL: [1.3, -0.2], legR: [-1.3, 0.2], armL: [0.6, -0.4], armR: [-0.6, 0.4] },
  hide: k => ({ facing: 0, mood: 'scared', lean: 0.15 + 0.03 * Math.sin(k * 3), headTilt: 0.25, armL: [2.5, 0.9], armR: [-2.5, -0.9] }),
  crouch: { facing: 0, mood: 'scared', lean: 0.3, legL: [1.2, -2.2], legR: [-1.2, 2.2], armL: [1.4, -1.4], armR: [-1.4, 1.4] },
  pull: { facing: 1, mood: 'scared', lean: -0.35, armL: [1.4, 0.2], armR: [1.6, 0.1], legL: [0.4, 0], legR: [-0.3, 0] },
  sit: { facing: 0, legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.5, -0.6], armR: [-0.5, 0.6] },
  crossed: { facing: 0, armL: [0.9, -2.0], armR: [-0.9, 2.0] }, whisper: { facing: 0, lean: 0.12, armR: [-2.2, -0.6], armL: [0.2, -0.2] }, chew: k => ({ facing: 0, armR: [-2.4 - 0.2 * Math.sin(k * 9), -0.4], armL: [0.2, -0.2] }),
};

export function setup(stage) {
  const W = buildSnooker(stage), X = { W, stage, P, LOOK };
  const all = [];
  const mk = (set, look, o = {}) => { const s = new Stickman(Object.assign({ height: 1.75, mark: Object.assign({}, look), glow: 0.06 }, o)); set.add(s.mesh); s.mesh.visible = false; all.push(s); return s; };
  const b = W.bar, r = W.street;
  for (const k of ['you', 'zuba', 'serjo', 'alex', 'didi', 'rocha', 'reny', 'edu', 'jorge', 'cli', 'ami']) X[k] = mk(b, LOOK[k], k === 'edu' ? { height: 1.8 } : k === 'jorge' ? { height: 1.7 } : {});
  X.maeIn = mk(b, LOOK.mae, { height: 1.6 });
  X.patrons = [mk(b, { type: 'guy', color: '#4a6b8a', hair: '#5a3b22' }), mk(b, { type: 'stache', color: '#e3d36b' }, { height: 1.8 }), mk(b, { type: 'guy', color: '#2e2e2e', cap: '#e05a2b' })];
  X.s = {}; for (const k of ['you', 'mae', 'padeiro', 'cabel', 'turista', 'rapaz', 'pol', 'jorge']) X.s[k] = mk(r, LOOK[k], k === 'mae' ? { height: 1.6 } : {});
  X.crowd = [mk(r, { type: 'guy', color: '#8a4a8a', hair: '#5a3b22' }), mk(r, { type: 'lia', color: '#3a7a5a' }, { height: 1.62 }), mk(r, { type: 'stache', color: '#e3d36b' }, { height: 1.8 }), mk(r, { type: 'guy', color: '#4a6b8a', cap: '#c8372d' }), mk(r, { type: 'hanbok', color: '#e0a326', color2: '#fff4d8' }, { height: 1.6 })];
  X.vulto = new Stickman({ height: 1.7, body: '#3a3a42', outline: '#0a0a0c', eyes: false, glow: 0 }); b.add(X.vulto.mesh); X.vulto.mesh.visible = false; all.push(X.vulto);
  X.all = all;
  X.EIGHT = ['you', 'zuba', 'serjo', 'alex', 'didi', 'rocha', 'reny', 'edu'];
  X.SPOT = { you: [-2.0, 1.7], zuba: [-2.3, -0.9], serjo: [1.75, -1.0], alex: [2.5, -2.6], didi: [-0.55, 2.3], rocha: [-1.9, 3.5], reny: [-0.45, -1.0], edu: [1.8, 1.6], cli: [1.8, 1.4], ami: [-0.4, 1.9] };
  X.put = (who, x, z, p, y = 0) => { who.mesh.position.set(x, y, z); who.pose(typeof p === 'function' ? p(0) : (p || P.stand)); who.mesh.visible = true; return who; };
  X.hideAll = () => { stage.camera.up.set(0, 1, 0); for (const s of all) s.mesh.visible = false; W.headlamp.intensity = 0; W.lantern.intensity = 0; W.lanternMesh.visible = false; W.cue.visible = false; W.apron.visible = false; };
  X.wild = () => {};
  // the bar: power on/off, the clock, the hatch, the sign blinking (sign: true = blinking normally)
  X.bar = (t, { power = true, clock = [23, 40], hatch = 0, tv = 'off', blind = 0, ball8 = 0, door = 0 } = {}) => {
    stage.use('snk'); X.hideAll(); W.power(power); if (power) W.signOn(Math.sin(t * 7) > -0.3); W.setClock(...clock); W.hatchOpen(hatch); W.tvShow(tv, t); W.blindAt(blind); W.ball8At(ball8); W.serviceDoor.userData.open(door); W.frontDoor.userData.open(0); };
  // the eight in their places (who: names to show; pose: name -> pose)
  X.group = (t, who = X.EIGHT, pose = {}) => { for (const k of who) { const [x, z] = X.SPOT[k]; const p = pose[k] || P.stand; X.put(X[k], x, z, typeof p === 'function' ? p(t) : p); } };
  X.street = (t, o = {}) => { stage.use('rua'); X.hideAll(); W.streetAt(t, o); };
  X.black = () => { stage.use('none'); X.hideAll(); };
  X.face = (who, dist = 0.85, dx = 0.05, up = 0.08, fov = 42) => { const h = who.headWorld(); stage.aim([h.x + dx, h.y + up, h.z + dist], [h.x, h.y - 0.04, h.z], fov); };
  X.faceFrom = (who, dir = [0, 0, 1], dist = 0.85, fov = 42) => { const h = who.headWorld(); stage.aim([h.x + dir[0] * dist, h.y + 0.08, h.z + dir[2] * dist], [h.x, h.y - 0.04, h.z], fov); };
  X.wide = (u, fov = 50) => { const k = ease(clamp(u / 4)); stage.aim([lerp(3.4, 3.0, k), lerp(2.5, 2.2, k), lerp(4.0, 3.4, k)], [-0.6, 0.9, -0.6], fov); };
  X.lanternAt = (x, y, z, k = 1) => { W.lanternMesh.visible = true; W.lanternMesh.position.set(x, y, z); W.lantern.position.set(x, y + 0.15, z); W.lantern.intensity = 6 * k; };
  return X;
}
