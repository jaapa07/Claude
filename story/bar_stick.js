// bar_stick.js: the two bar stories as stick-figure series (like O Jantar and O Homem Sem Sombra).
// The 3D bar sets come from the short films (sem_agua/world.js: Boteco do Tonho; meia/world.js: Bar da Univel, with the car);
// the people are the engine's flat 2D stickmen. A part page picks shots from SHOTS by name: at(time, 'name', {options}).
import * as S from './engine/stage.js';
import { buildWorld as worldSA } from './sem_agua/world.js';
import { buildWorld as worldME } from './meia/world.js';
const { THREE, clamp, lerp, ease, Stickman } = S;

export const POSE = {
  stand: { facing: 0 }, scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] },
  table: { facing: 0, armL: [0.9, -1.2], armR: [-0.9, 1.2] },
  talk: k => ({ facing: 0, armL: [0.9, -1.2], armR: [-1.6 - 0.4 * Math.sin(k * 6), 0.6] }),
  cheers: k => ({ facing: 0, armL: [0.9, -1.2], armR: [-2.6 - 0.15 * Math.sin(k * 8), 0.2] }),
  clench: { facing: 0, mood: 'scared', lean: 0.12, armL: [0.3, -2.3], armR: [-0.3, 2.3], legL: [0.04, 0.0], legR: [-0.04, 0.0] },
  belly: { facing: 0, mood: 'scared', armL: [0.25, -2.4], armR: [-0.9, 1.2] },
  stiff: { facing: 0, mood: 'scared', armL: [0.05, -0.05], armR: [-0.05, 0.05], legL: [0.03, 0], legR: [-0.03, 0] },
  laugh: k => ({ facing: 0, lean: -0.12 + 0.06 * Math.sin(k * 18), headTilt: -0.25, armL: [0.6, -2.0], armR: [-0.6, 2.0] }),
  hide: k => ({ facing: 0, mood: 'scared', lean: 0.15 + 0.03 * Math.sin(k * 3), headTilt: 0.25, armL: [2.5, 0.9], armR: [-2.5, -0.9] }),
  whisper: { facing: 0, lean: 0.25, armL: [0.9, -1.2], armR: [-2.2, -0.6] },
  shock: { facing: 0, mood: 'scared', lean: -0.15, armL: [2.4, 0.3], armR: [-2.4, -0.3] },
  point: s => ({ facing: s, armR: [-1.6 * s, 0.1 * s], armL: [0.2, -0.2] }),
  wave: k => ({ facing: 0, mood: 'scared', armR: [-2.7 + 0.3 * Math.sin(k * 14), 0.6], armL: [0.2, -0.2] }),
  sit: { facing: 1, lean: -0.05, legL: [1.45, -1.4], legR: [1.35, -1.3], armL: [0.6, -0.9], armR: [0.4, -0.5] },
  sitHold: { facing: 1, mood: 'scared', lean: 0.1, legL: [1.45, -1.4], legR: [1.35, -1.3], armL: [0.5, -0.9], armR: [1.55, -0.05] },
  sitScared: { facing: 0, mood: 'scared', legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.5, -1.9], armR: [-0.5, 1.9] },
  sitRelief: { facing: 0, lean: -0.12, headTilt: -0.2, legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.9, -0.4], armR: [-0.9, 0.4] },
  sitPhone: { facing: 0, headTilt: 0.25, legL: [1.0, -1.4], legR: [-1.0, 1.4], armL: [0.4, -2.3], armR: [-0.4, 2.3] },
  bucket: { facing: 0, armL: [0.5, -1.4], armR: [-0.5, 1.4] },
  pocket: { facing: 1, headTilt: 0.35, armR: [0.2, -0.9], armL: [0.3, -0.4] },
  breath: k => ({ facing: 0, lean: -0.1 * Math.sin(k * Math.PI), headTilt: -0.2 * Math.sin(k * Math.PI), armL: [0.4, -0.2], armR: [-0.4, 0.2] }),
  throwArm: k => ({ facing: -1, armR: [lerp(-0.5, -2.2, k), lerp(0.4, 0.1, k)], armL: [0.3, -0.4] }),
  push: { facing: 0, mood: 'scared', lean: -0.3, armL: [1.8, 0.2], armR: [-1.8, -0.2] },
};

export function setup(stage, which) {
  const meia = which === 'meia';
  const Wd = (meia ? worldME : worldSA)(stage);
  const bar = Wd.sets.bar, X = { Wd, stage, meia };
  const stick = (mark, o = {}) => { const s = new Stickman(Object.assign({ height: 1.75, mark, glow: 0.06 }, o)); bar.add(s.mesh); s.mesh.visible = false; return s; };
  // the cast (one look each, for every part)
  if (meia) {
    X.you = stick({ type: 'guy', color: '#1f9a8a', hair: '#15100c', shoes: '#d23b2f', socks: '#f6f4ee', stripe: '#c8372d' });
    X.f1 = stick({ type: 'guy', color: '#f2c230', cap: '#e05a2b', shoes: '#f0f0f0' }, { height: 1.8 });                 // Dudu
    X.f2 = stick({ type: 'guy', color: '#3d6fb0', hair: '#3a2414', curly: true, glasses: true, shoes: '#2a2a2a' }, { height: 1.78 });   // Léo
    X.f3 = null;
  } else {
    X.you = stick({ type: 'guy', color: '#e0a326', hair: '#3a2618', glasses: true, shoes: '#f2f0ea' });
    X.f1 = stick({ type: 'stache', color: '#b8322a' }, { height: 1.86 });                                                  // Beto
    X.f2 = stick({ type: 'lia', color: '#2e8a5a' }, { height: 1.64 });                                                     // Carla
    X.f3 = stick({ type: 'guy', color: '#eae6dc', cap: '#2c5fae' }, { height: 1.72 });                                     // Zé
  }
  X.lady = stick({ type: 'hanbok', color: '#7c4fb0', color2: '#efe4f6' }, { height: 1.66 });
  X.waiter = stick({ type: 'guy', color: '#f4f2ee', hair: '#111', beard: '#333' }, { height: 1.78 });
  X.q1 = stick({ type: 'guy', color: '#8a4a8a', hair: '#5a3b22' }); X.q2 = stick({ type: 'guy', color: '#e3d36b', cap: '#2c5fae' }, { height: 1.8 });
  X.patrons = [stick({ type: 'guy', color: '#4a6b8a', hair: '#5a3b22' }), stick({ type: 'hanbok', color: '#d4567a', color2: '#f4e0e8' }, { height: 1.6 }), stick({ type: 'stache', color: '#e3d36b' }, { height: 1.8 }), stick({ type: 'guy', color: '#2e2e2e', cap: '#e05a2b' })];
  X.friends = [X.f1, X.f2, X.f3].filter(Boolean);
  X.people = [X.you, ...X.friends, X.lady, X.waiter, X.q1, X.q2, ...X.patrons];
  // the car copies (meia): a mesh has one parent
  if (meia) { X.youCar = new Stickman({ height: 1.75, mark: X.you.o.mark }); X.leoCar = new Stickman({ height: 1.78, mark: X.f2.o.mark }); Wd.carBody.add(X.youCar.mesh, X.leoCar.mesh); X.walker = new Stickman({ height: 1.75, mark: X.you.o.mark }); Wd.sets.street.add(X.walker.mesh); }
  else { X.walker = new Stickman({ height: 1.75, mark: X.you.o.mark }); Wd.sets.street.add(X.walker.mesh); }
  const canvasPlane = (w, h, px, draw) => { const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w); draw(cv.getContext('2d'), cv.width, cv.height); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); };
  const write = (g, s, x, y, font, col) => { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); };
  // the notice taped on the bathroom wall (Sem Água)
  X.notice = canvasPlane(0.42, 0.3, 256, (g, w, h) => { g.fillStyle = '#fbfaf2'; g.fillRect(0, 0, w, h); write(g, 'AVISO', w / 2, 40, '700 40px Oswald', '#c8372d'); write(g, 'FALTA ÁGUA', w / 2, 100, '700 44px Oswald', '#222'); write(g, 'DESDE TERÇA', w / 2, 150, '700 36px Oswald', '#222'); g.fillStyle = 'rgba(230,220,170,0.85)'; g.fillRect(w * 0.35, 0, w * 0.3, 14); });
  X.notice.rotation.y = Math.PI / 2; X.notice.position.set(1.06, 1.45, -10.65); Wd.bath.add(X.notice);
  // the inside of the bathroom door (A Meia): an empty lock plate, two screw holes, no latch
  if (meia) { const plate = canvasPlane(0.06, 0.12, 128, (g, w, h) => { g.fillStyle = '#b9bcc2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; for (const y of [50, 206]) { g.beginPath(); g.arc(64, y, 12, 0, 7); g.fill(); } g.fillStyle = '#6a5a4a'; g.fillRect(44, 100, 40, 56); }); plate.rotation.y = Math.PI; plate.position.set(0.3, 0.12, -0.03); Wd.bdoor.userData.leaf.add(plate);
    X.gari = new Stickman({ height: 1.75, mark: { type: 'guy', color: '#f07a1a', cap: '#f07a1a', shoes: '#222' } }); Wd.carSet.add(X.gari.mesh); X.gari.mesh.visible = false;
    X.skyMats = []; Wd.carSet.traverse(o => { if (o.isMesh && o.geometry.parameters && o.geometry.parameters.width === 400 && o.geometry.parameters.height === 60) X.skyMats.push(o.material); }); X.sun = new THREE.DirectionalLight('#fff4dc', 0); X.sun.position.set(-8, 14, 6); Wd.carSet.add(X.sun); }
  // the car (A Meia): Léo drives (x +0.4), you ride (x -0.4); windows 0..1 down; day = the morning after
  X.car = (t, { winL = 0, winR = 0, speed = 11, body = true, people = true, you = { facing: 0, armL: [0.6, -1.5], armR: [-0.6, 1.5] }, leo = { facing: 0, armL: [1.2, -0.6], armR: [-1.2, 0.6] }, day = false } = {}) => {
    stage.use('car'); X.hideSticks(); Wd.renyCar.root.visible = false; Wd.leoCar.root.visible = false; Wd.roadAt(t, speed); Wd.carWindows(winL, winR); Wd.carBody.visible = body; Wd.sockFly.visible = false; Wd.stinkAt(t, 0, new THREE.Vector3()); X.gari.mesh.visible = false;
    Wd.carHemi.intensity = day ? 2.2 : 1.5; X.sun.intensity = day ? 2.6 : 0; for (const m of X.skyMats) m.color.set(day ? '#9fcfff' : '#0b1128'); Wd.sweep.intensity = day ? 0 : Wd.sweep.intensity; Wd.headlight.visible = !day;
    if (people) { X.youCar.mesh.position.set(-0.4, 0.15, -0.02); X.youCar.pose(typeof you === 'function' ? you(t) : you); X.youCar.mesh.visible = true; X.leoCar.mesh.position.set(0.4, 0.13, -0.02); X.leoCar.pose(typeof leo === 'function' ? leo(t) : leo); X.leoCar.mesh.visible = true; } };
  X.put = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(p); who.mesh.visible = true; return who; };
  X.hideSticks = () => { if (Wd.walker) Wd.walker.root.visible = false; if (X.gari) X.gari.mesh.visible = false; for (const p of X.people) p.mesh.visible = false; if (X.youCar) { X.youCar.mesh.visible = false; X.leoCar.mesh.visible = false; } X.walker.mesh.visible = false; };
  const TB = Wd.T, SEAT = -0.08;
  X.SEAT = SEAT; X.TB = TB;
  X.seat = { you: [TB[0], TB[1] - 0.55], f1: [TB[0] - 0.62, TB[1]], f2: [TB[0] + 0.62, TB[1]], f3: [TB[0], TB[1] + 0.6] };
  // ---------- set-ups ----------
  X.bar = t => { stage.use('bar'); Wd.hideAll(); X.hideSticks(); Wd.fanBlades.rotation.y = t * 4.2; Wd.setClock(10 + t / 60); Wd.holyOn(t, 0); Wd.puffAt(-1); Wd.bdoor.userData.open(0); Wd.interditado.visible = false;
    Wd.bucket.position.set(...Wd.bucketHome); Wd.bucket.rotation.set(0, 0, 0); Wd.tapHandle.rotation.y = 0; Wd.lever.rotation.x = 0; if (meia) { Wd.sockBar.visible = false; Wd.sockBall.visible = false; Wd.phone.visible = false; } };
  X.patronsAt = t => { const tb = Wd.bgTables; X.patrons.forEach((p, k) => { const [x, z] = tb[k]; X.put(p, x + (k % 2 ? 0.6 : -0.6), SEAT, z, POSE.talk(t + k)); }); };
  // the table: mood per friend ('chat' 'laugh' 'stare' 'shock' 'cheers' 'blank'), you: a pose; push 0..1 = chairs scraped back
  X.table = (t, { you = POSE.table, mood = 'chat', push = 0, youOn = true } = {}) => {
    X.bar(t); X.patronsAt(t);
    const fp = (k, s) => mood === 'laugh' ? POSE.laugh(t + k) : mood === 'stare' ? { facing: s, armL: [0.9, -1.2], armR: [-0.9, 1.2] } : mood === 'shock' ? POSE.shock : mood === 'cheers' ? POSE.cheers(t + k) : mood === 'blank' ? Object.assign({}, POSE.table, { facing: s }) : (k % 2 ? POSE.talk(t + k) : POSE.table);
    X.put(X.f1, X.seat.f1[0] - 0.5 * push, SEAT, X.seat.f1[1], fp(0, 1)); X.put(X.f2, X.seat.f2[0] + 0.5 * push, SEAT, X.seat.f2[1], fp(1, -1)); if (X.f3) X.put(X.f3, X.seat.f3[0], SEAT, X.seat.f3[1] + 0.4 * push, fp(2, 0));
    if (youOn) X.put(X.you, X.seat.you[0], SEAT, X.seat.you[1], typeof you === 'function' ? you(t) : you);
  };
  const toilet = () => { const p = Wd.toilet.position; return [p.x + 0.06, p.z]; };
  X.toiletAt = toilet;
  // the bathroom: you on the toilet (pose), the door ajar, a queue of n outside
  X.bath = (t, { pose = POSE.sit, door = 0, queue = 0, you = true } = {}) => { X.bar(t); Wd.bdoor.userData.open(-door); const [x, z] = toilet(); if (you) X.put(X.you, x, -0.15, z, typeof pose === 'function' ? pose(t) : pose); X.queue(t, queue); };
  X.queue = (t, n) => { const spots = [[3.5, -9.25], [3.75, -8.45], [3.6, -7.65]]; [X.lady, X.q1, X.q2].forEach((p, i) => { if (i >= n) return; const tap = i === 0 ? Math.max(0, Math.sin(t * 9)) * 0.2 : 0; X.put(p, ...[spots[i][0], 0, spots[i][1]], { facing: -1, legR: [-0.12 - tap, 0.05], armL: [0.6, -1.6], armR: [-0.6, 1.6] }); }); };
  // the walls of the bathroom are lifted when the camera stands behind them
  X.wild = () => { const cp = stage.camera.position; if (Wd.wallN) { Wd.wallN.visible = cp.z < -9.0; Wd.wallS.visible = cp.z > -11.0; Wd.wallW.visible = cp.x > 1.0; } };
  // ---------- cameras ----------
  X.head = who => who.headWorld();
  X.face = (who, dist = 0.9, dx = 0.15, up = 0.03, fov = 44, look = [0, 0, 0]) => { const h = X.head(who); const cp = stage.camera; stage.aim([h.x + dx, h.y + up, h.z + dist], [h.x + look[0], h.y + look[1], h.z + look[2]], fov); };
  X.aimFrom = (from, who, fov = 44, dy = 0) => { const h = X.head(who); stage.aim(from, [h.x, h.y + dy, h.z], fov); };
  return X;
}
