// world.js: the girlfriend's parents' house. The dining room (the table, the feijoada, the chandelier), the hallway
// downstairs (the locked bathroom, the stairs), the landing upstairs (the forbidden door), the forbidden bathroom
// (the father's judo photos and medals, the toilet, the note, the lavender spray) and the house from outside.
import * as S from '../../engine/stage.js';
import { softTex, canvasTex, smoke } from '../joseon/world.js';
const { THREE, clamp, lerp, ease, rng, box, room, door, practical, wallWithHoles, Stickman, mat } = S;
export { canvasTex };

function lightGroup(group, { hemi = '#e8d9c0', ground = '#3a2e26', hemiI = 0.6, dir = '#fff1d6', dirI = 0.4, dirPos = [3, 5, 4] } = {}) {
  const h = new THREE.HemisphereLight(hemi, ground, hemiI); group.add(h);
  const d = new THREE.DirectionalLight(dir, dirI); d.position.set(...dirPos); group.add(d); group.add(d.target); return { h, d };
}
function frame(w, h, draw, color = '#5a3a24') { const g = new THREE.Group(); g.add(box(w + 0.08, h + 0.08, 0.03, color, 0, -(h + 0.08) / 2, 0)); const ct = canvasTex(256, Math.round(256 * h / w)); draw(ct.g, 256, Math.round(256 * h / w)); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: ct.tx, roughness: 0.9 })); p.position.z = 0.02; g.add(p); return g; }
// a little stick portrait for the frames: the father, with or without a medal
function portrait(g, w, h, { medal = false, bg = '#9ab2c8', judo = false } = {}) {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); const cx = w / 2, s = h / 256;
  g.strokeStyle = '#15171c'; g.lineCap = 'round'; g.lineWidth = 16 * s; g.fillStyle = judo ? '#f4f1ea' : '#f1ede4';
  g.beginPath(); g.moveTo(cx, 120 * s); g.lineTo(cx, 200 * s); g.moveTo(cx, 200 * s); g.lineTo(cx - 30 * s, 250 * s); g.moveTo(cx, 200 * s); g.lineTo(cx + 30 * s, 250 * s);
  g.moveTo(cx, 135 * s); g.lineTo(cx - 50 * s, judo ? 90 * s : 170 * s); g.moveTo(cx, 135 * s); g.lineTo(cx + 50 * s, judo ? 90 * s : 170 * s); g.stroke();
  if (judo) { g.strokeStyle = '#f4f1ea'; g.lineWidth = 26 * s; g.beginPath(); g.moveTo(cx, 125 * s); g.lineTo(cx, 195 * s); g.stroke(); g.strokeStyle = '#111'; g.lineWidth = 8 * s; g.beginPath(); g.moveTo(cx - 18 * s, 175 * s); g.lineTo(cx + 18 * s, 175 * s); g.stroke(); }
  g.beginPath(); g.arc(cx, 95 * s, 26 * s, 0, 7); g.fillStyle = '#15171c'; g.fill(); g.beginPath(); g.arc(cx, 95 * s, 19 * s, 0, 7); g.fillStyle = '#f1ede4'; g.fill();
  g.strokeStyle = '#2a1f18'; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(cx - 12 * s, 104 * s); g.lineTo(cx + 12 * s, 104 * s); g.stroke();
  if (medal) { g.fillStyle = '#e2b13c'; g.beginPath(); g.arc(cx, 160 * s, 13 * s, 0, 7); g.fill(); g.strokeStyle = '#c8372d'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(cx - 10 * s, 135 * s); g.lineTo(cx, 150 * s); g.lineTo(cx + 10 * s, 135 * s); g.stroke(); }
}

export function buildWorld(stage) {
  const { scene, sets } = stage;
  const W = { sets };
  // ---------- characters ----------
  W.you = new Stickman({ height: 1.75, mark: { type: 'shirt', color: '#2f6fd6' } });
  W.gf = new Stickman({ height: 1.62, mark: { type: 'hanbok', color: '#c8372d', color2: '#f1ede4' } });
  W.mom = new Stickman({ height: 1.6, mark: { type: 'hanbok', color: '#2e7d6a', color2: '#efe4c8' } });
  W.dad = new Stickman({ height: 1.9, mark: { type: 'stache', color: '#6b6f78' } });
  W.grandpa = new Stickman({ height: 1.6, mark: { type: 'stache', color: '#8a6a4a', color2: '#d9d9d9' } });
  const people = [W.you, W.gf, W.mom, W.dad, W.grandpa];
  W.place = (setName, ...on) => { for (const p of people) { if (on.includes(p)) { if (p.mesh.parent !== sets[setName]) sets[setName].add(p.mesh); p.mesh.visible = true; } else p.mesh.visible = false; } };
  W.at = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(p); who.mesh.visible = true; };
  W.POSE = {
    stand: { facing: 0 }, scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] },
    table: { facing: 0, armL: [0.9, -1.2], armR: [-0.9, 1.2] },                          // seated: arms on the table (legs hidden by it)
    tableTalk: k => ({ facing: 0, armL: [0.9, -1.2], armR: [-1.6 - 0.4 * Math.sin(k * 6), 0.6] }),
    clench: { facing: 0, mood: 'scared', lean: 0.12, armL: [0.3, -2.3], armR: [-0.3, 2.3], legL: [0.04, 0.0], legR: [-0.04, 0.0] },   // hands on the belly, knees together
    hold: { facing: 1, mood: 'scared', lean: 0.25, armL: [0.4, -2.2], armR: [0.2, -2.0], legL: [0.08, 0.0], legR: [-0.02, 0.05] },
    reach: { facing: 1, lean: 0.12, armL: [1.35, -0.1], armR: [0.4, -0.5] },
    sitSide: { facing: 1, lean: -0.05, legL: [1.45, -1.4], legR: [1.35, -1.3], armL: [0.6, -0.9], armR: [0.4, -0.5] },
    read: { facing: 0, legL: [1.2, -1.2], legR: [-1.2, 1.2], armL: [1.1, -1.6], armR: [-1.1, 1.6] },
    spray: { facing: 1, armL: [-2.2, -0.3], armR: [0.3, -0.2] },
    laugh: k => ({ facing: -1, lean: -0.15 + 0.05 * Math.sin(k * 18), headTilt: -0.2, armL: [0.6, -2.0], armR: [-0.6, 2.0] }),
    point: { facing: -1, armR: [-1.6, 0.1], armL: [0.2, -0.2] },
    hug: { facing: -1, armL: [-1.2, -0.6], armR: [-1.0, -0.5] },
  };

  // ---------- set: the dining room ----------
  const dining = new THREE.Group(); sets.dining = dining; scene.add(dining);
  dining.add(room({ w: 6, d: 6, h: 2.8, wall: '#c8a77c', floor: '#6b4a32', ceiling: '#d9cdb8', holes: [{ x: 1.6, y: 0.95, w: 1.4, h: 1.2 }] }));
  dining.add(box(6, 0.9, 0.04, '#7a5638', 0, 0, -2.93));                                   // wainscot
  dining.add(box(2.6, 0.06, 1.3, '#f1e9da', 0, 0.74, 0), box(2.5, 0.72, 1.2, '#5b3c26', 0, 0.02, 0));   // table + cloth
  const chair = (x, z, ry) => { const g = new THREE.Group(); g.add(box(0.45, 0.45, 0.45, '#5b3c26', 0, 0, 0), box(0.45, 0.6, 0.06, '#5b3c26', 0, 0.45, -0.2)); g.position.set(x, 0, z); g.rotation.y = ry; dining.add(g); };
  chair(-1.6, 0, Math.PI / 2); chair(1.6, 0, -Math.PI / 2); chair(-0.6, 0.9, Math.PI); chair(0.3, 0.9, Math.PI); chair(-0.4, -0.9, 0); chair(0.5, -0.9, 0);
  const plate = (x, z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.03, 16), mat('#f7f4ee', { rough: 0.4 })); p.position.set(x, 0.79, z); dining.add(p); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), mat('#3b2216')); f.position.set(x, 0.81, z); dining.add(f); return f; };
  W.plates = [plate(-0.6, 0.4), plate(0.3, 0.4), plate(-0.4, -0.4), plate(0.5, -0.4), plate(-1.05, 0)];
  W.pot = new THREE.Group(); W.pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.25, 16), mat('#2b2522', { metal: 0.4 }))); W.pot.children[0].position.y = 0.125; const stew = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), mat('#3a1d12')); stew.position.y = 0.24; W.pot.add(stew); W.pot.position.set(0.0, 0.77, 0); dining.add(W.pot);
  dining.add(box(0.3, 0.08, 0.3, '#f4f1ea', -0.5, 0.77, 0.0), box(0.25, 0.07, 0.25, '#e2c27a', 0.55, 0.77, 0.05));   // rice, farofa
  W.potSteam = smoke(dining, 10, [0, 1.05, 0], [0.02, 0.25, 0], '#ffffff', 3, 0.08);
  const lampD = practical('#ffcf8a', 6, 8); lampD.position.set(0, 2.15, 0); lampD.userData.light.shadow.mapSize.set(512, 512); dining.add(lampD); W.lampD = lampD;
  dining.add(box(0.02, 0.5, 0.02, '#333', 0, 2.25, 0), box(0.6, 0.16, 0.6, '#d8b46a', 0, 2.15, 0, { emissive: '#ffcf8a', glow: 0.3 }));
  const fam = frame(0.8, 0.55, (g, w, h) => portrait(g, w, h, { bg: '#c9b48a' })); fam.position.set(-1.2, 2.0, -2.9); dining.add(fam);
  dining.add(box(1.4, 1.6, 0.45, '#4e3322', -2.2, 0, -2.6), box(1.3, 0.04, 0.4, '#e9e2d0', -2.2, 1.1, -2.55));
  W.diningL = lightGroup(dining, { hemiI: 0.55 });
  const night = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ color: '#0f1630' })); night.position.set(1.6, 1.55, -3.3); dining.add(night);
  W.dining = dining;

  // ---------- set: the hallway downstairs (the locked bathroom, the stairs) ----------
  const hall = new THREE.Group(); sets.hall = hall; scene.add(hall);
  hall.add(box(2.4, 0.05, 8, '#6b4a32', 0, -0.05, -3), box(2.4, 0.05, 8, '#d9cdb8', 0, 2.7, -3));
  hall.add(box(0.1, 2.7, 8, '#c8a77c', -1.2, 0, -3));
  const rw = wallWithHoles(8, 2.7, [{ x: 0.5, y: 0, w: 0.9, h: 2.05 }], '#c8a77c'); rw.rotation.y = -Math.PI / 2; rw.position.x = 1.2; rw.position.z = -3; hall.add(rw);
  W.bathDoor = door({ w: 0.86, h: 2.02, color: '#efe7d8', frame: '#bfb39c' }); W.bathDoor.rotation.y = -Math.PI / 2; W.bathDoor.position.set(1.18, 0.03, -3.5); hall.add(W.bathDoor);
  W.bathGap = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.03), new THREE.MeshBasicMaterial({ color: '#fff3c9' })); W.bathGap.rotation.y = -Math.PI / 2; W.bathGap.position.set(1.17, 0.015, -3.5); hall.add(W.bathGap);
  for (let i = 0; i < 12; i++) hall.add(box(1.0, 0.18, 0.28, '#7a5638', -0.55, 0.18 * i, -6.2 - 0.28 * i));   // stairs going up, away
  hall.add(box(0.05, 0.9, 3.4, '#5b3c26', -0.03, 1.0 + 0.9, -7.8));
  const hp = frame(0.5, 0.4, (g, w, h) => portrait(g, w, h, { bg: '#a8c0a0' })); hp.rotation.y = Math.PI / 2; hp.position.set(-1.14, 1.8, -2); hall.add(hp);
  const hallLamp = practical('#ffd59a', 4, 7); hallLamp.position.set(0, 2.5, -1.5); hallLamp.userData.light.castShadow = false; hall.add(hallLamp);
  W.hallL = lightGroup(hall, { hemiI: 0.6 });
  W.hall = hall;

  // ---------- set: the landing upstairs (the forbidden door) ----------
  const up = new THREE.Group(); sets.up = up; scene.add(up);
  up.add(box(3.2, 0.05, 4, '#5e4130', 0, -0.05, 0), box(3.2, 0.05, 4, '#d0c4ae', 0, 2.6, 0));
  const bw = wallWithHoles(3.2, 2.6, [{ x: 0.3, y: 0, w: 0.9, h: 2.05 }], '#b89b74'); bw.position.z = -2; up.add(bw);
  up.add(box(0.1, 2.6, 4, '#b89b74', -1.6, 0, 0), box(0.1, 2.6, 4, '#b89b74', 1.6, 0, 0));
  W.forbidden = door({ w: 0.86, h: 2.02, color: '#3b2a20', frame: '#2a1f18' }); W.forbidden.position.set(0.3, 0.02, -2); up.add(W.forbidden);
  const sign = canvasTex(256, 96); { const g = sign.g; g.fillStyle = '#c8372d'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#fff'; g.font = '700 40px Oswald'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PARTICULAR', 128, 50); }
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), new THREE.MeshBasicMaterial({ map: sign.tx })); sg.position.set(0.3, 1.65, 0.03); W.forbidden.children[3].add(sg); sg.position.set(0.45, 1.6, 0.04);
  W.forbLight = new THREE.PointLight('#fff2cc', 0, 5, 1.4); W.forbLight.position.set(0.3, 1.0, -2.6); up.add(W.forbLight);
  W.forbGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.05), new THREE.MeshBasicMaterial({ color: '#fff2cc' })); W.forbGlow.position.set(0.3, 1.03, -2.3); up.add(W.forbGlow);
  const upLamp = practical('#ffd59a', 3, 6); upLamp.position.set(-0.6, 2.35, 0.4); upLamp.userData.light.castShadow = false; up.add(upLamp);
  W.upL = lightGroup(up, { hemiI: 0.5 });
  W.up = up;

  // ---------- set: the forbidden bathroom ----------
  const bath = new THREE.Group(); sets.bath = bath; scene.add(bath);
  const tile = canvasTex(256, 256); { const g = tile.g; g.fillStyle = '#d7e3e6'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#aebfc4'; g.lineWidth = 4; for (let k = 0; k <= 256; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); } }
  tile.tx.wrapS = tile.tx.wrapT = THREE.RepeatWrapping; tile.tx.repeat.set(4, 3);
  const tm = new THREE.MeshStandardMaterial({ map: tile.tx, roughness: 0.6 });
  const wallP = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tm); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; bath.add(m); };
  wallP(3, 2.6, 0, 1.3, -1.5, 0); wallP(3, 2.6, -1.5, 1.3, 0, Math.PI / 2); wallP(3, 2.6, 1.5, 1.3, 0, -Math.PI / 2);
  bath.add(box(3, 0.05, 3, '#9aa7aa', 0, -0.05, 0), box(3, 0.05, 3, '#e9eef0', 0, 2.6, 0));
  const fw = wallWithHoles(3, 2.6, [{ x: 0.6, y: 0, w: 0.9, h: 2.05 }], '#d7e3e6'); fw.position.z = 1.5; fw.rotation.y = Math.PI; bath.add(fw);
  W.bathInDoor = door({ w: 0.86, h: 2.02, color: '#3b2a20', frame: '#2a1f18' }); W.bathInDoor.position.set(-0.6, 0.02, 1.5); W.bathInDoor.rotation.y = Math.PI; bath.add(W.bathInDoor);
  // the toilet: base, bowl, seat, tank, lever
  const toilet = new THREE.Group(); toilet.position.set(-0.3, 0, -1.1); bath.add(toilet);
  toilet.add(box(0.3, 0.25, 0.4, '#f4f6f6', 0, 0, 0.05, { rough: 0.3 }));
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.2, 16), mat('#f4f6f6', { rough: 0.3 })); bowl.position.set(0, 0.33, 0.12); bowl.castShadow = true; toilet.add(bowl);
  const seat = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 16), mat('#e9ecec', { rough: 0.3 })); seat.rotation.x = Math.PI / 2; seat.position.set(0, 0.44, 0.12); toilet.add(seat);
  toilet.add(box(0.48, 0.42, 0.2, '#f4f6f6', 0, 0.43, -0.2, { rough: 0.3 }), box(0.5, 0.04, 0.22, '#e9ecec', 0, 0.85, -0.2));
  W.lever = box(0.1, 0.025, 0.025, '#c0c6c8', 0.17, 0.75, -0.08, { metal: 0.7 }); toilet.add(W.lever);
  W.note = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), new THREE.MeshStandardMaterial({ color: '#fff8c9', emissive: '#fff8c9', emissiveIntensity: 0.2 })); W.note.position.set(0, 0.68, -0.09); toilet.add(W.note);
  W.toilet = toilet;
  // the sink, the mirror, the spray can
  bath.add(box(0.55, 0.85, 0.4, '#e9ecec', 0.9, 0, -1.25), box(0.6, 0.75, 0.03, '#a9c4cf', 0.9, 1.15, -1.47, { metal: 0.6, rough: 0.1 }));
  W.can = new THREE.Group(); W.can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), mat('#8e5bd6', { metal: 0.4 }))); W.can.children[0].position.y = 0.09; W.can.add(box(0.03, 0.03, 0.03, '#eee', 0, 0.18, 0)); W.can.position.set(0.75, 0.85, -1.2); bath.add(W.can);
  W.mist = smoke(bath, 18, [0.4, 1.4, -0.6], [-0.3, 0.1, 0.25], '#c9b3ff', 2.2, 0.4);
  // the father's photos and the nine medals
  const fr = [[-1.0, 1.75, -1.47, 0, true], [-0.35, 1.85, -1.47, 0, false], [0.35, 1.9, -1.47, 0, true], [-1.47, 1.7, -0.6, Math.PI / 2, true], [-1.47, 1.75, 0.3, Math.PI / 2, false], [1.47, 1.8, 0.0, -Math.PI / 2, true], [1.47, 1.75, 0.8, -Math.PI / 2, true]];
  fr.forEach(([x, y, z, ry, medal], i) => { const f = frame(0.42, 0.52, (g, w, h) => portrait(g, w, h, { medal, judo: true, bg: ['#9ab2c8', '#c9b48a', '#b0c49a', '#c8a0a0'][i % 4] })); f.position.set(x, y + 0.26, z); f.rotation.y = ry; bath.add(f); });
  W.medals = []; for (let i = 0; i < 9; i++) { const m = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14), mat(i % 3 === 2 ? '#b87333' : (i % 3 === 1 ? '#c9ccd1' : '#e2b13c'), { metal: 0.8, rough: 0.3, emissive: '#3a2a00', glow: 0.3 })); disc.rotation.x = Math.PI / 2; m.add(disc); m.add(box(0.03, 0.16, 0.005, '#c8372d', -0.02, 0.04, 0, { cast: false }), box(0.03, 0.16, 0.005, '#2f6fd6', 0.02, 0.04, 0, { cast: false })); m.position.set(1.46, 1.05 + Math.floor(i / 3) * 0.25, -0.9 + (i % 3) * 0.28); m.rotation.y = -Math.PI / 2; bath.add(m); W.medals.push(m); }
  const bulb = practical('#fff3dc', 6, 6); bulb.position.set(0, 2.4, -0.2); bulb.userData.light.shadow.mapSize.set(512, 512); bath.add(bulb); W.bathBulb = bulb;
  W.bathL = lightGroup(bath, { hemi: '#eef4f6', hemiI: 0.6 });
  W.bath = bath;

  // ---------- set: the house from outside ----------
  const ext = new THREE.Group(); sets.ext = ext; scene.add(ext);
  ext.add(box(60, 0.1, 60, '#2a3a2a', 0, -0.1, 0));
  const house = new THREE.Group(); ext.add(house);
  house.add(box(8, 5.4, 6, '#d9c7a4', 0, 0, 0));
  const roofG = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.6, 4), mat('#7a3a2a')); roofG.rotation.y = Math.PI / 4; roofG.scale.set(1, 1, 0.75); roofG.position.y = 6.7; roofG.castShadow = true; house.add(roofG);
  W.houseWins = [];
  [[-2.3, 1.2], [2.3, 1.2], [-2.3, 3.8], [2.3, 3.8], [0, 3.8]].forEach(([x, y], i) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), new THREE.MeshBasicMaterial({ color: i === 4 ? '#ffe9b8' : '#ffcf8a' })); w.position.set(x, y + 0.55, 3.01); house.add(w); W.houseWins.push(w); house.add(box(1.36, 0.08, 0.06, '#5b3c26', x, y, 3.04)); });
  house.add(box(1.0, 2.1, 0.06, '#5b3c26', 0, 0, 3.02));
  for (let i = 0; i < 6; i++) { const tr = new THREE.Group(); tr.add(box(0.3, 1.6, 0.3, '#3a2a20', 0, 0, 0)); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), mat('#1f3a26')); c.position.y = 2.4; c.castShadow = true; tr.add(c); tr.position.set((i < 3 ? -1 : 1) * (6.5 + (i % 3) * 2.5), 0, 1 - (i % 3) * 3); ext.add(tr); }
  // the stars: a clear sky
  const NS = 400, sg2 = new THREE.BufferGeometry(), sp = new Float32Array(NS * 3), R = rng(3);
  for (let i = 0; i < NS; i++) { const a = R() * Math.PI * 2, e = 0.15 + R() * 1.2, r = 120; sp.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
  sg2.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  ext.add(new THREE.Points(sg2, new THREE.PointsMaterial({ color: '#ffffff', size: 0.9, sizeAttenuation: true })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex('rgba(255,250,235,1)', 'rgba(255,250,235,0)'), color: '#f6efd8', depthWrite: false })); moon.scale.set(12, 12, 1); moon.position.set(-40, 50, -80); ext.add(moon);
  W.extL = lightGroup(ext, { hemi: '#6e86c4', ground: '#1a2018', hemiI: 0.9, dir: '#9fb4ff', dirI: 0.8, dirPos: [-10, 20, 20] });
  const porch = new THREE.PointLight('#ffcf8a', 12, 12, 1.4); porch.position.set(0, 2.6, 4); ext.add(porch);
  W.ext = ext;

  W.use = name => { stage.use(name); scene.background = new THREE.Color(name === 'ext' ? '#070b1c' : '#000000'); };
  return W;
}
