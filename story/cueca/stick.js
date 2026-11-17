// cueca/stick.js: the cast and the set-ups of "A Noite em que Minha Cueca Virou História" (stick figures, like the bar series).
// setup(stage) builds the car from ../meia/world.js and every other set from ./world.js, makes one stickman per set
// (a mesh has one parent) and returns X: the people, and one function per set that shows it and places them.
import * as S from '../engine/stage.js';
import { buildWorld as worldME } from '../meia/world.js';
import { buildCueca } from './world.js';
const { THREE, clamp, lerp, ease, Stickman } = S;

export const YOU = { type: 'guy', color: '#34343c', hair: '#0c0c0e', shoes: '#f2f2f2' };   // black t-shirt, short black hair
export const HER = { type: 'lia', color: '#c2416b' };
export const P = {
  table: { facing: 0, armL: [0.9, -1.2], armR: [-0.9, 1.2] },
  eat: k => { const b = 0.5 + 0.5 * Math.sin(k * 7); return { facing: 0, armL: [0.9, -1.2], armR: [lerp(-0.9, -2.7, b), lerp(1.2, -0.3, b)] }; },
  stiff: { facing: 0, mood: 'scared', armL: [0.05, -0.05], armR: [-0.05, 0.05], legL: [0.03, 0], legR: [-0.03, 0] },
  drive: { facing: 0, armL: [1.2, -0.6], armR: [-1.2, 0.6] },
  grip: { facing: 0, mood: 'scared', lean: 0.08, armL: [1.5, -0.9], armR: [-1.5, 0.9] },
  scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] },
  shock: { facing: 0, mood: 'scared', lean: -0.15, armL: [2.4, 0.3], armR: [-2.4, -0.3] },
  pray: k => ({ facing: 0, mood: 'scared', headTilt: -0.25, armL: [0.9, -2.6 + 0.05 * Math.sin(k * 20)], armR: [-0.9, 2.6] }),
  shout: k => ({ facing: 0, mood: 'scared', lean: -0.1, headTilt: -0.2, armL: [2.6 + 0.2 * Math.sin(k * 14), 0.3], armR: [-2.6 - 0.2 * Math.sin(k * 14), -0.3] }),
  belly: { facing: 0, mood: 'scared', armL: [0.25, -2.4], armR: [-0.25, 2.4] },
  penguin: k => ({ facing: 0, mood: 'scared', lean: 0.1 * Math.sin(k * 11), armL: [0.75, 0.1], armR: [-0.75, -0.1], legL: [0.05, 0], legR: [-0.05, 0] }),
  crouch: { facing: 1, mood: 'scared', lean: 0.55, legL: [0.95, -1.75], legR: [0.75, -1.5], armR: [1.2, 0.2], armL: [0.6, -0.2] },
  run: k => ({ facing: 0, mood: 'scared', lean: 0.15, armL: [0.8 * Math.sin(k * 14), -0.6], armR: [-0.8 * Math.sin(k * 14), 0.6], legL: [0.45 * Math.sin(k * 14), -0.3], legR: [-0.45 * Math.sin(k * 14), -0.3] }),
  belt: { facing: 0, mood: 'scared', armL: [0.35, -1.6], armR: [-0.35, 1.6] },
  sit: { facing: 0, legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.5, -0.6], armR: [-0.5, 0.6] },
  sitHope: { facing: 0, headTilt: -0.15, legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [2.4, 0.4], armR: [-2.4, -0.4] },
  sitTerror: { facing: 0, mood: 'scared', legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.5, -1.9], armR: [-0.5, 1.9] },
  sitDown: { facing: 0, mood: 'scared', headTilt: 0.45, lean: 0.12, legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.3, -0.4], armR: [-0.3, 0.4] },
  mourn: { facing: 0, headTilt: 0.3, armL: [0.3, -0.3], armR: [-1.2, 1.6] },
  stand: { facing: 0 },
};

export function setup(stage) {
  const Wd = worldME(stage);               // the car (and the bar we never show)
  const C = buildCueca(stage), X = { Wd, C, stage, P };
  stage.scene.add(C.drop);
  const all = [];
  const mk = (set, mark, o = {}) => { const s = new Stickman(Object.assign({ height: 1.75, mark: Object.assign({}, mark), glow: 0.06 }, o)); set.add(s.mesh); s.mesh.visible = false; all.push(s); return s; };
  const flat = s => { s.mesh.userData.billboard = null; return s; };
  // the pizzeria
  X.you = mk(C.pizzaSet, YOU); X.her = mk(C.pizzaSet, HER, { height: 1.64 }); X.waiter = mk(C.pizzaSet, { type: 'guy', color: '#f4f2ee', hair: '#111', beard: '#333' }, { height: 1.8 });
  X.patrons = [mk(C.pizzaSet, { type: 'guy', color: '#4a6b8a', hair: '#5a3b22' }), mk(C.pizzaSet, { type: 'hanbok', color: '#d4567a', color2: '#f4e0e8' }, { height: 1.6 }), mk(C.pizzaSet, { type: 'stache', color: '#e3d36b' }, { height: 1.8 }), mk(C.pizzaSet, { type: 'lia', color: '#3a7a5a' }, { height: 1.62 }), mk(C.pizzaSet, { type: 'guy', color: '#8a4a8a', cap: '#2c5fae' }), mk(C.pizzaSet, { type: 'hanbok', color: '#e0a326', color2: '#fff4d8' }, { height: 1.6 })];
  // her room: the two lying on the bed (flat, seen from above) and him standing
  X.youBed = flat(mk(C.roomSet, YOU)); X.herBed = flat(mk(C.roomSet, HER, { height: 1.64 })); X.youRoom = mk(C.roomSet, YOU);
  // the car (he drives: the left-hand seat of the model, x +0.4, where the wheel is)
  X.youCar = new Stickman({ height: 1.75, mark: Object.assign({}, YOU), glow: 0.06 }); Wd.carBody.add(X.youCar.mesh); all.push(X.youCar);
  { const tx = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData.g = cv.getContext('2d'); return t; })();
    X.dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ map: tx })); X.dash.position.set(0.12, 0.93, 0.77); X.dash.rotation.set(-0.9, Math.PI, 0); X.dash.rotation.order = 'YXZ'; X.dash.rotation.set(0.9, Math.PI, 0); Wd.carBody.add(X.dash);
    X.dashClock = s => { const g = tx.userData.g; g.fillStyle = '#04121a'; g.fillRect(0, 0, 256, 96); g.font = '700 70px "JetBrains Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5fd8ff'; g.fillText(s, 128, 52); tx.needsUpdate = true; }; X.dashClock('00:02'); }
  // the gate, the hallway, the funeral
  X.youGate = mk(C.gateSet, YOU); X.youHome = mk(C.homeSet, YOU);
  X.youFun = mk(C.funSet, Object.assign({}, YOU)); X.herFun = mk(C.funSet, HER, { height: 1.64 });
  X.mourners = [mk(C.funSet, { type: 'guy', color: '#222226', hair: '#5a3b22' }), mk(C.funSet, { type: 'hanbok', color: '#202024', color2: '#3a3a40' }, { height: 1.6 }), mk(C.funSet, { type: 'stache', color: '#26262a', color2: '#bbbbbb' }, { height: 1.7 }), mk(C.funSet, { type: 'guy', color: '#2a2a2e', cap: '#1a1a1a' })];
  X.all = all;
  X.put = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(typeof p === 'function' ? p(0) : p); who.mesh.visible = true; return who; };
  X.hideAll = () => { stage.camera.up.set(0, 1, 0); for (const s of all) s.mesh.visible = false; C.drop.visible = false; C.umbrellas.forEach(u => u.visible = false); Wd.carBody.position.y = 0; Wd.carBody.rotation.set(0, 0, 0); };
  X.wild = () => {};
  X.belly = (b) => { for (const s of [X.you, X.youBed, X.youRoom, X.youCar, X.youGate, X.youHome]) s.o.mark.belly = b; };
  X.head = who => who.headWorld();
  X.face = (who, dist = 0.8, dx = 0.04, up = 0.1, fov = 42, look = [0, -0.05, 0]) => { const h = who.headWorld(); stage.aim([h.x + dx, h.y + up, h.z + dist], [h.x + look[0], h.y + look[1], h.z + look[2]], fov); };
  X.sweat = (who, k, side = 1) => { const h = who.headWorld(); C.drop.visible = k > 0 && k < 1; C.drop.position.set(h.x + side * 0.07, h.y + 0.04 - 0.16 * ease(k), h.z + 0.06); C.drop.scale.set(1, 1.5, 0.6); };
  X.tears = (who, t) => { const h = who.headWorld(); C.drop.visible = true; const k = (t * 0.7) % 1; C.drop.position.set(h.x - 0.035, h.y - 0.02 - 0.12 * k, h.z + 0.07); C.drop.scale.set(0.8, 1.3, 0.6); };

  // ---------- set-ups ----------
  X.pizza = (t, { you = P.table, her = { facing: -1, armL: [0.9, -1.2], armR: [-0.9, 1.2] }, eat = 0, belly = 0.15 } = {}) => {
    stage.use('pizza'); X.hideAll(); X.belly(belly); C.eat(eat); C.flame.scale.setScalar(0.07 + 0.012 * Math.sin(t * 23)); C.candle.intensity = 0.55 + 0.1 * Math.sin(t * 17);
    X.put(X.you, C.seat.you[0], -0.08, C.seat.you[1], typeof you === 'function' ? you(t) : you);
    X.put(X.her, C.seat.her[0], -0.08, C.seat.her[1], typeof her === 'function' ? her(t) : her);
    C.bgTables.forEach(([x, z], i) => { X.put(X.patrons[i * 2], x - 0.6, -0.08, z, { facing: 1, armL: [0.9, -1.2], armR: [-1.4 - 0.3 * Math.sin(t * 5 + i), 0.6] }); X.put(X.patrons[i * 2 + 1], x + 0.6, -0.08, z, { facing: -1, armL: [0.9, -1.2], armR: [-0.9, 1.2] }); });
  };
  // the bed seen from above: both flat on it; you: a pose, up = he jumps (sits up); he can be off the bed (kiss)
  X.room = (t, { clock = '23:59', you = { facing: 0, armL: [0.9, -0.3], armR: [-0.9, 0.3], legL: [0.25, 0], legR: [-0.25, 0] }, her = { facing: 0, armL: [0.3, -0.3], armR: [-0.4, 0.6] }, belly = 0.95, youOn = true, standing = null } = {}) => {
    stage.use('room'); X.hideAll(); X.belly(belly); C.roomClock(clock); C.roomDoor.userData.open(0); C.hallGlow.intensity = 0;
    if (youOn) { X.put(X.youBed, -0.38, 0.53, -0.08, typeof you === 'function' ? you(t) : you); X.youBed.mesh.rotation.set(-Math.PI / 2, 0, 0.06); }
    X.put(X.herBed, 0.4, 0.52, -0.12, her); X.herBed.mesh.rotation.set(-Math.PI / 2, 0, -0.05);
    if (standing) { const [x, z, p] = standing; X.put(X.youRoom, x, 0, z, typeof p === 'function' ? p(t) : p); }
  };
  X.top = (fov = 70, h = 2.65) => { stage.camera.up.set(0, 0, -1); stage.aim([0.02, h, -0.95 + 0.001], [0, 0.5, -0.95], fov); };
  // the car at night, him alone at the wheel; bump: the body jumps; speed: the road
  X.drive = (t, { pose = P.drive, bump = 0, speed = 11, belly = 0.95, clock = null } = {}) => {
    stage.use('car'); X.hideAll(); X.belly(belly); Wd.renyCar.root.visible = false; Wd.leoCar.root.visible = false; Wd.roadAt(t, speed); Wd.carWindows(0, 0); Wd.carBody.visible = true; Wd.sockFly.visible = false; Wd.stinkAt(t, 0, new THREE.Vector3());
    Wd.carHemi.intensity = 1.5; Wd.headlight.visible = true; Wd.pine.visible = true; Wd.mirror.visible = true;
    Wd.carBody.position.y = bump; Wd.carBody.rotation.x = -bump * 0.6;
    X.youCar.mesh.position.set(0.4, 0.13, -0.02); X.youCar.pose(typeof pose === 'function' ? pose(t) : pose); X.youCar.mesh.visible = true;
    if (clock) X.dashClock(clock);
  };
  X.carFace = (o = {}) => (t, u) => { X.drive(t, o); const h = X.youCar.headWorld(); const sh = o.shake ? o.shake * Math.sin(t * 60) : 0; const k = ease(clamp(u / (o.dur || 2))); stage.aim([h.x - 0.28 + sh, h.y + 0.03, lerp(o.d0 || 0.95, o.d1 || 0.85, k)], [h.x, h.y - 0.02, h.z], o.fov || 46); };
  X.altar = t => { stage.use('altar'); X.hideAll(); C.altarAt(t); };
  X.gate = (t, { open = 0 } = {}) => { stage.use('gate'); X.hideAll(); C.gateOpen(-open); C.key.visible = false; };
  X.home = (t, { door = 0, holy = 0 } = {}) => { stage.use('home'); X.hideAll(); C.bathDoor.userData.open(door); C.holyOn(t, holy); };
  X.funeral = t => { stage.use('funeral'); X.hideAll(); C.rainAt(t); };
  X.umbrella = (i, who) => { const h = who.headWorld(); const u = C.umbrellas[i]; u.visible = true; u.position.set(h.x, h.y + 0.32, h.z); };
  return X;
}
