// world.js: the Joseon world shared by the three parts. A mountain temple in 1592: the courtyard (main hall, stone
// pagoda, bell pavilion, gate), the hall inside (Buddha, candles), the woodblock hall (thousands of carved sutras),
// the mountain at night (the trail, the torches), the cave. Flat 2D stickmen: the young monk, the master, the woman
// in hanbok, soldiers with torches. Everything is a pure function of time.
import * as S from '../../engine/stage.js';
const { THREE, clamp, lerp, ease, rng, box, room, door, practical, wallWithHoles, Stickman, mat } = S;

export function softTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
}
export function canvasTex(wd, ht) { const cv = document.createElement('canvas'); cv.width = wd; cv.height = ht; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { cv, g: cv.getContext('2d'), tx }; }
function skyTex(top, mid, bottom) { const { g, tx } = canvasTex(16, 512); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 16, 512); return tx; }
const SOFT = softTex();
const FLAME = softTex('rgba(255,236,170,1)', 'rgba(255,90,20,0)');
function lightGroup(group, { hemi = '#5d7bb3', ground = '#1b1a22', hemiI = 0.55, dir = '#5d7bb3', dirI = 0.4, dirPos = [-4, 6, 5] } = {}) {
  const h = new THREE.HemisphereLight(hemi, ground, hemiI); group.add(h);
  const d = new THREE.DirectionalLight(dir, dirI); d.position.set(...dirPos); group.add(d); group.add(d.target); return { h, d };
}
// a flame: an additive sprite plus a point light, flickering by time
export function flame(group, size = 0.35, light = 2.5, dist = 6, castShadow = false) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLAME, color: '#ffb24a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size * 1.5, 1); group.add(s);
  const L = new THREE.PointLight('#ff9a3c', light, dist, 1.6); if (castShadow) { L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.003; } group.add(L);
  const seed = Math.random() * 0 + group.children.length * 1.7;
  return { s, L, set(p, t, on = 1) { s.visible = on > 0; L.visible = on > 0 && light > 0; L.intensity = on * light * (0.85 + 0.12 * Math.sin(t * 17 + seed) + 0.08 * Math.sin(t * 31 + seed * 2)); s.position.set(p[0], p[1], p[2]); L.position.set(p[0], p[1] + 0.1, p[2]); const k = 1 + 0.12 * Math.sin(t * 23 + seed); s.scale.set(size * k, size * 1.5 * k, 1); } };
}
// smoke: soft grey sprites rising from a source, seeded, sampled by time
export function smoke(group, n, src, dir, color = '#6d6a66', life = 3, spread = 0.35) {
  const R = rng(5 + n), m = [], sp = [];
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color, transparent: true, depthWrite: false, opacity: 0 })); group.add(s); m.push(s); sp.push({ off: R() * life, dx: R() * 2 - 1, dz: R() * 2 - 1, sz: 0.6 + R() * 0.9 }); }
  return (t, amount = 1, at = src) => m.forEach((s, i) => {
    const q = sp[i], age = ((t + q.off) % life + life) % life, k = age / life;
    s.visible = amount > 0.01;
    s.position.set(at[0] + dir[0] * age + q.dx * age * spread, at[1] + dir[1] * age, at[2] + dir[2] * age + q.dz * age * spread);
    const sc = q.sz * (0.4 + k * 1.8); s.scale.set(sc, sc, 1); s.material.opacity = amount * 0.5 * Math.sin(Math.PI * k);
  });
}
// a hip roof with upturned eaves (the Joseon silhouette): a ridge box, two sloped planes, four lifted corner tips
function roof(w, d, h, color = '#2c3036', under = '#2f6e64') {
  const g = new THREE.Group(), m = mat(color), slope = Math.atan2(h, d / 2);
  const len = Math.hypot(h, d / 2);
  for (const sgn of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, len + 0.5), m); p.position.set(0, h / 2, sgn * (d / 4 + 0.12)); p.rotation.x = sgn * slope; p.castShadow = true; p.receiveShadow = true; g.add(p); }
  for (const sx of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.9, d * 0.9), m); p.position.set(sx * (w / 2 - 0.05), h * 0.4, 0); p.castShadow = true; g.add(p); }
  g.add(box(w + 0.2, 0.16, 0.18, '#1d2025', 0, h - 0.06, 0));
  for (const sx of [1, -1]) for (const sz of [1, -1]) { const tip = box(0.7, 0.07, 0.3, color, 0, 0, 0); tip.position.set(sx * (w / 2 + 0.05), 0.12, sz * (d / 2 + 0.25)); tip.rotation.z = -sx * 0.35; tip.rotation.y = sx * sz * 0.6; g.add(tip); }
  g.add(box(w - 0.2, 0.12, d - 0.2, under, 0, -0.08, 0, { cast: false }));
  return g;
}
// a building: stone platform, red pillars, walls with lattice doors, a roof
function building({ w = 7, d = 4.5, h = 2.8, plat = 0.6, roofH = 1.9, wall = '#d7cdb4', lattice = '#8a5a34' } = {}) {
  const g = new THREE.Group();
  g.add(box(w + 1.2, plat, d + 1.2, '#8f8a80', 0, 0, 0));
  for (let i = 0; i < 6; i++) g.add(box(1.1, 0.12, 0.35, '#8f8a80', 0, 0.12 * i - 0.12 * 5 + plat - 0.12, d / 2 + 0.6 + 0.35 * (5 - i)));
  const cols = 5;
  for (let i = 0; i < cols; i++) { const x = -w / 2 + (i * w) / (cols - 1); g.add(box(0.22, h, 0.22, '#8b2a1f', x, plat, d / 2)); g.add(box(0.22, h, 0.22, '#8b2a1f', x, plat, -d / 2)); }
  g.add(box(w, h, 0.1, wall, 0, plat, -d / 2 + 0.1), box(0.1, h, d, wall, -w / 2, plat, 0), box(0.1, h, d, wall, w / 2, plat, 0));
  const lc = canvasTex(256, 256); const lg = lc.g; lg.fillStyle = '#e8dfc8'; lg.fillRect(0, 0, 256, 256); lg.strokeStyle = lattice; lg.lineWidth = 10; for (let k = 0; k <= 256; k += 32) { lg.beginPath(); lg.moveTo(k, 0); lg.lineTo(k, 256); lg.moveTo(0, k); lg.lineTo(256, k); lg.stroke(); }
  lc.tx.wrapS = lc.tx.wrapT = THREE.RepeatWrapping; lc.tx.repeat.set(4, 2);
  const front = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, h - 0.3, 0.06), new THREE.MeshStandardMaterial({ map: lc.tx, roughness: 1, emissive: '#ffb46b', emissiveIntensity: 0, emissiveMap: lc.tx }));
  front.position.set(0, plat + (h - 0.3) / 2, d / 2 - 0.05); front.castShadow = true; front.receiveShadow = true; g.add(front); g.userData.front = front;
  g.add(box(w + 0.6, 0.3, d + 0.6, '#2f6e64', 0, plat + h, 0, { cast: false }));
  const r = roof(w + 2.4, d + 2.2, roofH); r.position.y = plat + h + 0.3; g.add(r); g.userData.roof = r;
  return g;
}

export function buildWorld(stage) {
  const { scene, sets } = stage;
  const SKY = { dusk: skyTex('#1b2140', '#7a3f4f', '#e8935a'), night: skyTex('#03050c', '#0b1430', '#1b2442'), dawn: skyTex('#3b5a8c', '#c9a0a0', '#f2c58a'), fire: skyTex('#05050a', '#2a0f0c', '#6a2410') };
  const W = { SKY, sets, FLAME, SOFT };

  // ---------- characters ----------
  W.monk = new Stickman({ height: 1.6, mark: { type: 'robe', color: '#7d776c', color2: '#c4862e' } });
  W.master = new Stickman({ height: 1.75, mark: { type: 'robe', color: '#6f6a61', color2: '#a3342a' } });
  W.woman = new Stickman({ height: 1.6, mark: { type: 'hanbok', color: '#3b4f8c', color2: '#e7ddc6' } });
  W.soldiers = Array.from({ length: 3 }, () => new Stickman({ height: 1.75, body: '#2a2a2e', outline: '#08080a', glow: 0.02, eyes: false }));
  W.POSE = {
    stand: { facing: 0 }, scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] },
    sit: { facing: 0, legL: [1.25, -2.4], legR: [-1.25, 2.4], armL: [0.6, -1.6], armR: [-0.6, 1.6] },      // cross-legged, hands in the lap
    bow: { facing: 1, lean: 0.7, headTilt: 0.2, armL: [0.9, -0.4], armR: [0.7, -0.3] },
    look: { facing: 1, mood: 'scared', lean: 0.05, armL: [0.3, -0.4], armR: [0.15, -0.2] },
    reach: { facing: 1, lean: 0.12, armL: [1.35, -0.1], armR: [0.4, -0.5], legL: [0.2, -0.05], legR: [-0.12, 0.1] },
    carry: { facing: 1, lean: 0.1, armL: [0.9, -1.4], armR: [0.7, -1.2] },
    point: { facing: -1, armR: [-2.0, 0.1], armL: [0.2, -0.2] },
    strike: k => ({ facing: 1, lean: 0.25 - 0.35 * k, armL: [1.5 - 0.6 * k, -0.4], armR: [1.4 - 0.6 * k, -0.3], legL: [0.35, -0.2], legR: [-0.25, 0.1] }),
    torch: { facing: -1, armR: [-1.5, -0.6], armL: [0.2, -0.2] },
    kneel: { facing: 1, lean: 0.3, legL: [1.4, -2.6], legR: [0.3, -2.4], armL: [1.0, -0.8], armR: [0.6, -1.2] },
  };
  W.heroAt = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(p); who.mesh.visible = true; };
  const allPeople = [W.monk, W.master, W.woman, ...W.soldiers];
  W.place = (setName, ...people) => { for (const p of allPeople) { if (people.includes(p)) { if (p.mesh.parent !== sets[setName]) sets[setName].add(p.mesh); p.mesh.visible = true; } else p.mesh.visible = false; } };

  // ---------- set: the courtyard ----------
  const court = new THREE.Group(); sets.court = court; scene.add(court);
  court.add(box(26, 0.1, 26, '#a8977c', 0, -0.1, 0));
  const hall = building({}); hall.position.set(0, 0, -6); court.add(hall);
  const side = building({ w: 5, d: 3.5, h: 2.4, roofH: 1.5 }); side.position.set(-7, 0, -1.5); side.rotation.y = Math.PI / 2; court.add(side);
  // the stone pagoda
  const pag = new THREE.Group(); [[1.6, 0.4], [1.2, 0.8], [1.5, 0.15], [0.9, 0.5], [1.3, 0.12], [0.7, 0.4], [1.0, 0.1], [0.4, 0.6]].reduce((y, [s, h]) => { pag.add(box(s, h, s, '#9a948a', 0, y, 0)); return y + h; }, 0);
  pag.position.set(0, 0, -0.5); court.add(pag);
  // stone lanterns
  for (const x of [-2.2, 2.2]) court.add(box(0.5, 0.9, 0.5, '#8f8a80', x, 0, 1.2), box(0.7, 0.12, 0.7, '#8f8a80', x, 0.9, 1.2), box(0.4, 0.35, 0.4, '#7d786f', x, 1.02, 1.2), box(0.8, 0.12, 0.8, '#8f8a80', x, 1.37, 1.2));
  // the bell pavilion, the bell, the striker log on ropes
  const bp = new THREE.Group(); bp.position.set(5.5, 0, 1.5); court.add(bp);
  bp.add(box(3.6, 0.4, 3.6, '#8f8a80', 0, 0, 0));
  for (const x of [-1.4, 1.4]) for (const z of [-1.4, 1.4]) bp.add(box(0.2, 3.0, 0.2, '#8b2a1f', x, 0.4, z));
  bp.add(box(3.2, 0.25, 3.2, '#2f6e64', 0, 3.4, 0, { cast: false })); const bpr = roof(4.6, 4.6, 1.4); bpr.position.y = 3.65; bp.add(bpr);
  const bellPts = []; for (let i = 0; i <= 10; i++) { const v = i / 10; bellPts.push(new THREE.Vector2(0.55 + 0.25 * v * v + (i === 10 ? 0.05 : 0), 1.6 * (1 - v))); }
  const bell = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 18), new THREE.MeshStandardMaterial({ color: '#5f7a5a', metalness: 0.7, roughness: 0.45, flatShading: true, side: THREE.DoubleSide }));
  bell.castShadow = true; const bellG = new THREE.Group(); bellG.add(bell); bell.position.y = -1.6; bellG.position.set(0, 3.25, 0); bp.add(bellG);
  bellG.add(box(0.25, 0.25, 0.25, '#4b5e47', 0, 0, 0));
  const striker = new THREE.Group(); const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 10), mat('#6b4a2c')); log.rotation.z = Math.PI / 2; log.castShadow = true; striker.add(log);
  striker.add(box(0.02, 1.1, 0.02, '#c9b48a', -0.6, 0, 0), box(0.02, 1.1, 0.02, '#c9b48a', 0.6, 0, 0)); striker.position.set(-1.65, 2.25, 0); bp.add(striker);
  W.bellG = bellG; W.striker = striker; W.bp = bp;
  // the gate and the walls
  const gate = new THREE.Group(); gate.position.set(0, 0, 6); court.add(gate);
  for (const x of [-1.8, 1.8]) gate.add(box(0.3, 3.0, 0.3, '#8b2a1f', x, 0, 0));
  gate.add(box(4.2, 0.25, 0.6, '#2f6e64', 0, 3.0, 0, { cast: false })); const gr = roof(5.2, 2.2, 1.0); gr.position.y = 3.25; gate.add(gr);
  const leafL = new THREE.Group(), leafR = new THREE.Group(); leafL.position.set(-1.65, 0, 0); leafR.position.set(1.65, 0, 0);
  leafL.add(box(1.62, 2.8, 0.1, '#5a2d1f', 0.81, 0, 0)); leafR.add(box(1.62, 2.8, 0.1, '#5a2d1f', -0.81, 0, 0));
  for (const [lf, sx] of [[leafL, 1], [leafR, -1]]) { lf.add(box(0.06, 0.3, 0.14, '#1d1d1d', sx * 1.35, 1.25, 0)); for (let y = 0.5; y < 2.8; y += 0.7) lf.add(box(1.5, 0.05, 0.13, '#2e1c14', sx * 0.81, y, 0)); }
  gate.add(leafL, leafR);
  W.openGate = a => { leafL.rotation.y = -a; leafR.rotation.y = a; };
  for (const sx of [-1, 1]) { court.add(box(9, 1.6, 0.4, '#8a8478', sx * 6.5, 0, 6)); court.add(box(9, 0.2, 0.7, '#2c3036', sx * 6.5, 1.6, 6)); }
  court.add(box(0.4, 1.6, 13, '#8a8478', 11, 0, -0.5), box(0.4, 1.6, 13, '#8a8478', -11, 0, -0.5));
  // outside the gate: the trail going down, pines, the torches
  const outside = new THREE.Group(); court.add(outside);
  outside.add(box(30, 0.1, 30, '#4e5a44', 0, -1.2, 22));
  const R = rng(9);
  const pine = (x, z, s, y = 0) => { const p = new THREE.Group(); p.add(box(0.2 * s, 1.0 * s, 0.2 * s, '#3a2a20', 0, 0, 0)); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.2 - 0.3 * k) * s, 1.4 * s, 7), mat(k % 2 ? '#22382c' : '#1d3226')); c.position.y = (1.2 + k * 0.8) * s; c.castShadow = true; p.add(c); } p.position.set(x, y, z); return p; };
  W.pine = pine;
  for (let i = 0; i < 26; i++) { const x = (R() * 2 - 1) * 14, z = -12 + R() * 4; court.add(pine(x, z, 1.4 + R())); }
  for (let i = 0; i < 18; i++) { const x = (R() < 0.5 ? -1 : 1) * (3 + R() * 10), z = 8 + R() * 14; outside.add(pine(x, z, 1.2 + R(), -1.2)); }
  // light: moon fill + a warm lantern by the hall
  W.gateFill = new THREE.PointLight('#9fb4ff', 9, 10, 1.3); W.gateFill.position.set(0, 3.2, 3.2); court.add(W.gateFill);
  W.courtL = lightGroup(court, { hemi: '#6e86c4', hemiI: 0.75, dir: '#9fb4ff', dirI: 0.7, dirPos: [-8, 12, 6] });
  const moonSpot = new THREE.DirectionalLight('#a9bcff', 0.0); moonSpot.position.set(-6, 14, 10); moonSpot.castShadow = true; moonSpot.shadow.mapSize.set(1024, 1024);
  Object.assign(moonSpot.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); court.add(moonSpot, moonSpot.target); W.moonSpot = moonSpot;
  W.hallLamp = practical('#ffb46b', 0, 9); W.hallLamp.userData.light.castShadow = false; W.hallLamp.position.set(0, 1.6, -3.4); court.add(W.hallLamp); W.hallMesh = hall;
  // the torch line on the trail (outside the gate) and the torches at the gate
  W.gateTorches = Array.from({ length: 6 }, () => flame(court, 0.45, 3.5, 8));
  W.trailTorches = Array.from({ length: 10 }, () => flame(court, 0.5, 0, 1));
  W.courtFires = Array.from({ length: 5 }, () => flame(court, 1.6, 9, 14));
  W.courtSmoke = smoke(court, 30, [3, 2, -6], [0.2, 2.2, 0.1], '#3c3734', 4, 0.6);
  W.court = court;

  // ---------- set: inside the main hall ----------
  const inner = new THREE.Group(); sets.inner = inner; scene.add(inner);
  inner.add(room({ w: 8, d: 7, h: 4, wall: '#c9b99a', floor: '#6b4a32', ceiling: '#2f6e64' }));
  for (const x of [-2.6, 2.6]) for (const z of [-1.5, 1.5]) inner.add(box(0.28, 4, 0.28, '#8b2a1f', x, 0, z));
  inner.add(box(3.2, 0.9, 1.6, '#6b2d22', 0, 0, -2.6));                                                   // the altar
  const gold = { metal: 0.6, rough: 0.35, emissive: '#2a1a00', glow: 0.25 };
  const buddha = new THREE.Group(); buddha.position.set(0, 0.9, -2.8); inner.add(buddha);
  buddha.add(box(1.5, 0.45, 1.0, '#b8902f', 0, 0, 0, gold), box(0.95, 1.0, 0.7, '#c99a32', 0, 0.45, 0, gold));
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat('#d4a73a', gold)); hd.position.set(0, 1.78, 0); hd.castShadow = true; buddha.add(hd);
  const us = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat('#a5801f', gold)); us.position.set(0, 2.12, 0); buddha.add(us);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: '#7a5a1a' })); halo.position.set(0, 1.8, -0.4); buddha.add(halo);
  W.candles = [-1.2, -0.6, 0.6, 1.2].map(x => { inner.add(box(0.06, 0.25, 0.06, '#efe6d0', x, 0.9, -2.0)); return { f: flame(inner, 0.12, 1.4, 6, x === 0.6), x }; });
  W.innerL = lightGroup(inner, { hemiI: 0.35, dirI: 0.2 });
  W.incense = smoke(inner, 10, [0, 1.0, -2.0], [0.05, 0.4, 0], '#6d675e', 4, 0.12);
  W.inner = inner;

  // ---------- set: the woodblock hall ----------
  const blocks = new THREE.Group(); sets.blocks = blocks; scene.add(blocks);
  blocks.add(room({ w: 4.4, d: 14, h: 3.4, wall: '#bfae8c', floor: '#5d4430', ceiling: '#4a3a2c' }));
  const shelfM = mat('#5b3f27'), blockGeo = new THREE.BoxGeometry(0.06, 0.24, 0.5);
  const NB = 2 * 6 * 70, inst = new THREE.InstancedMesh(blockGeo, new THREE.MeshStandardMaterial({ color: '#9c6e43', roughness: 0.9, flatShading: true }), NB);
  inst.castShadow = true; inst.receiveShadow = true; const M = new THREE.Matrix4(), RB = rng(4); let ni = 0; const colr = new THREE.Color();
  for (const sx of [-1, 1]) {
    for (let lv = 0; lv < 6; lv++) { blocks.add(box(0.6, 0.04, 13, '#5b3f27', sx * 1.8, 0.25 + lv * 0.5, 0)); }
    for (const z of [-6.4, -3.2, 0, 3.2, 6.4]) blocks.add(box(0.6, 3.2, 0.06, '#5b3f27', sx * 1.8, 0, z));
    for (let lv = 0; lv < 6; lv++) for (let k = 0; k < 70; k++) { const z = -6.3 + k * 0.181; M.makeTranslation(sx * 1.8, 0.4 + lv * 0.5, z); M.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); inst.setMatrixAt(ni, M); colr.setHSL(0.07, 0.4, 0.28 + 0.12 * RB()); inst.setColorAt(ni, colr); ni++; }
  }
  blocks.add(inst);
  // slatted windows high on the walls: moonlight beams
  W.blockMoon = new THREE.SpotLight('#a9bcff', 18, 16, 0.5, 0.5, 1.2); W.blockMoon.position.set(-3, 3.4, 4); W.blockMoon.target.position.set(0.6, 0, -1); W.blockMoon.castShadow = true; W.blockMoon.shadow.mapSize.set(1024, 1024); blocks.add(W.blockMoon, W.blockMoon.target);
  W.blocksL = lightGroup(blocks, { hemi: '#7f93c9', hemiI: 1.1, dirI: 0.3 });
  W.aisle = [-5, -1.5, 2, 5.5].map(z => { const L = new THREE.PointLight('#8fa6e8', 5, 6, 1.3); L.position.set(0, 3.0, z); blocks.add(L); return L; });
  W.blockFires = Array.from({ length: 6 }, () => flame(blocks, 1.4, 0, 1));
  W.blockSmoke = smoke(blocks, 34, [0, 0.3, 5], [0, 0.55, -0.8], '#4a4440', 4, 0.5);
  W.records = new THREE.Group(); for (let k = 0; k < 4; k++) W.records.add(box(0.07, 0.3, 0.42, '#e2d6b6', 0, 0, k * 0.09 - 0.14, { emissive: '#e2d6b6', glow: 0.25 })); blocks.add(W.records);
  W.blockDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: '#16120e' })); W.blockDoor.position.set(0, 1.2, 6.94); W.blockDoor.rotation.y = Math.PI; blocks.add(W.blockDoor);
  W.blocks = blocks;

  // ---------- set: the mountain ----------
  const mount = new THREE.Group(); sets.mount = mount; scene.add(mount);
  const peaks = [[0, -40, 34, 26], [-38, -70, 30, 30], [40, -80, 36, 34], [-70, -110, 28, 40], [80, -120, 30, 44], [10, -140, 44, 50]];
  peaks.forEach(([x, z, h, r], i) => { const c = new THREE.Mesh(i === 0 ? new THREE.CylinderGeometry(5, r, h, 7) : new THREE.ConeGeometry(r, h, 7), mat(['#1c2a24', '#1a2422', '#17201f', '#151c1e', '#141a1d', '#12171b'][i])); c.position.set(x, h / 2 - 2, z); c.receiveShadow = true; mount.add(c); });
  mount.add(box(400, 0.1, 400, '#1a2420', 0, -2, 0));
  // the temple at the top of the first peak: small roofs, a warm window
  const mini = new THREE.Group(); mini.position.set(0, 31.2, -40); mount.add(mini);
  const mb = building({ w: 3, d: 2, h: 1.2, plat: 0.3, roofH: 0.8 }); mini.add(mb); W.miniFront = mb.userData.front;
  const mb2 = building({ w: 2, d: 1.5, h: 1, plat: 0.3, roofH: 0.6 }); mb2.position.set(3, -0.6, 1); mb2.rotation.y = -0.5; mini.add(mb2);
  W.miniBell = new THREE.PointLight('#ffd9a0', 0, 30, 1.2); W.miniBell.position.set(0, 3, 2); mini.add(W.miniBell);
  // the trail: a zigzag up the slope (torches walk it)
  W.trail = []; for (let i = 0; i <= 40; i++) { const v = i / 40, y = -1.5 + v * 31.5, rr = 26 - 21 * (y + 2) / 34 + 0.7; const a = 0.9 + Math.sin(v * 18) * 0.5; W.trail.push(new THREE.Vector3(Math.sin(a) * rr, y, -40 + Math.cos(a) * rr)); }
  W.trailCurve = new THREE.CatmullRomCurve3(W.trail);
  const NT = 36; const tg = new THREE.BufferGeometry(); const tp = new Float32Array(NT * 3), tc = new Float32Array(NT * 3); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const tpts = new THREE.Points(tg, new THREE.PointsMaterial({ size: 2.4, map: FLAME, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); tpts.frustumCulled = false; mount.add(tpts);
  W.setTrail = (t, head, n = NT, spread = 0.012) => { for (let i = 0; i < NT; i++) { const on = i < n, u = clamp(head - i * spread, 0, 1), p = W.trailCurve.getPoint(u); tp.set([p.x + Math.sin(i * 7.3) * 0.6, p.y + 0.8, p.z + Math.cos(i * 5.1) * 0.6], i * 3); const k = on && head - i * spread > 0 ? 0.8 + 0.2 * Math.sin(t * 20 + i) : 0; tc.set([1.0 * k, 0.55 * k, 0.2 * k], i * 3); } tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true; };
  // the village at the foot: a few roofs, lights that go out
  const vil = new THREE.Group(); vil.position.set(30, -2, 20); mount.add(vil);
  W.vilWins = []; for (let i = 0; i < 9; i++) { const h = building({ w: 2.2, d: 1.6, h: 1, plat: 0.2, roofH: 0.6 }); h.position.set((i % 3) * 5 - 5, 0, Math.floor(i / 3) * 5 - 5); h.rotation.y = 0.3 * i; vil.add(h); W.vilWins.push(h.userData.front); }
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = 8 + R() * 30; mount.add(pine(Math.cos(a) * d, -40 + Math.sin(a) * d * 0.8, 1.6 + R() * 1.2, 0 + clamp(30 - d, 0, 30) * 0.9)); }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex('rgba(255,250,235,1)', 'rgba(255,250,235,0)'), color: '#f6efd8', depthWrite: false })); moon.scale.set(16, 16, 1); moon.position.set(-60, 70, -200); mount.add(moon);
  W.mountL = lightGroup(mount, { hemi: '#5b74b0', hemiI: 0.9, dir: '#9fb4ff', dirI: 0.9, dirPos: [-40, 60, 30] });
  W.mount = mount;

  // ---------- set: the cave ----------
  const cave = new THREE.Group(); sets.cave = cave; scene.add(cave);
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), new THREE.MeshStandardMaterial({ color: '#3d3833', roughness: 1, flatShading: true, side: THREE.BackSide }));
  rock.scale.set(1.0, 0.7, 1.6); rock.position.set(0, 1.0, -3); rock.receiveShadow = true; cave.add(rock);
  cave.add(box(8, 0.1, 12, '#2e2a26', 0, -0.1, -2));
  W.caveMouth = new THREE.Mesh(new THREE.CircleGeometry(1.7, 9), new THREE.MeshBasicMaterial({ color: '#1b2647' })); W.caveMouth.position.set(0, 1.4, 3.3); W.caveMouth.rotation.y = Math.PI; cave.add(W.caveMouth);
  W.caveL = lightGroup(cave, { hemi: '#4a5d8c', hemiI: 0.45, dir: '#8fa6e8', dirI: 0.6, dirPos: [0, 3, 10] });
  W.caveTorch = flame(cave, 0.5, 6, 9, true);
  W.cave = cave;

  // ---------- per-frame helpers ----------
  W.use = (name, sky = 'night') => { stage.use(name); scene.background = SKY[sky]; };
  return W;
}
