// mundo.js: "A criação de um carro do zero". One car model (a coupé from a single side profile) shown in every state
// (wireframe, clay, bare metal, primer, midnight-blue paint), and the places it goes through: the city at night,
// the office, the design studio, the wind tunnel, the factory (laser, press, welding robots, conveyor), the engine
// bay (a cut-away engine with moving pistons and crankshaft), the paint booth, the dyno and a coastal road at sunset.
import * as S from '../../../engine/stage.js';
const { THREE, clamp, lerp, ease, rng, box, practical, Stickman, mat, tower } = S;

export function canvasTex(wd, ht) { const cv = document.createElement('canvas'); cv.width = wd; cv.height = ht; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { cv, g: cv.getContext('2d'), tx }; }
function softTex() { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); }
function lights(group, { hemi = '#dfe6f2', ground = '#3a3a40', hemiI = 0.9, dir = '#ffffff', dirI = 1.2, dirPos = [6, 10, 6], shadow = true } = {}) {
  const h = new THREE.HemisphereLight(hemi, ground, hemiI); group.add(h);
  const d = new THREE.DirectionalLight(dir, dirI); d.position.set(...dirPos); if (shadow) { d.castShadow = true; d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 }); d.shadow.bias = -0.0005; }
  group.add(d, d.target); return { h, d };
}
// the car's side profile (x: front +, y: up), metres
export const PROFILE = [[2.28, 0.32], [2.34, 0.5], [2.27, 0.68], [1.95, 0.76], [1.2, 0.86], [0.5, 0.98], [-0.2, 1.24], [-0.85, 1.25], [-1.55, 1.08], [-2.05, 0.92], [-2.3, 0.82], [-2.36, 0.58], [-2.25, 0.32]];
const GLASS = [[0.45, 0.97], [-0.18, 1.2], [-0.83, 1.21], [-1.55, 1.03]];

export function buildCar() {
  const car = new THREE.Group();
  const shape = new THREE.Shape(); PROFILE.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.72, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 6 }); geo.translate(0, 0, -0.86);
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: '#1d4fb0', metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
    bare: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.75, roughness: 0.3 }),
    primer: new THREE.MeshStandardMaterial({ color: '#8b8f96', metalness: 0.1, roughness: 0.8 }),
    clay: new THREE.MeshStandardMaterial({ color: '#c79a6a', metalness: 0, roughness: 0.9 }),
    wire: new THREE.MeshBasicMaterial({ color: '#5fd0ff', wireframe: true, transparent: true, opacity: 0.85 }),
  };
  const body = new THREE.Mesh(geo, M.paint); body.castShadow = true; body.receiveShadow = true; car.add(body);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: '#5fd0ff' })); car.add(edges);
  const gs = new THREE.Shape(); GLASS.forEach(([x, y], i) => i ? gs.lineTo(x, y) : gs.moveTo(x, y)); gs.lineTo(-1.55, 0.95); gs.lineTo(0.45, 0.95); gs.closePath();
  const gg = new THREE.ExtrudeGeometry(gs, { depth: 1.86, bevelEnabled: false }); gg.translate(0, 0.02, -0.93);
  const glass = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#0d1117', metalness: 0.9, roughness: 0.08 })); car.add(glass);
  const front = box(0.04, 0.05, 1.7, '#e8f6ff', 2.32, 0.6, 0, { emissive: '#bfe8ff', glow: 2.5 }); front.castShadow = false; car.add(front);
  const rear = box(0.04, 0.05, 1.7, '#ff2a2a', -2.37, 0.72, 0, { emissive: '#ff1a1a', glow: 2.5 }); rear.castShadow = false; car.add(rear);
  car.add(box(0.06, 0.18, 1.2, '#0b0b0e', 2.33, 0.36, 0));                                                  // the air intake
  const wheels = new THREE.Group(); car.add(wheels); const spin = [];
  for (const x of [1.42, -1.38]) for (const z of [0.86, -0.86]) {
    const w = new THREE.Group(); w.position.set(x, 0.36, z);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 28), mat('#141416', { rough: 0.9 })); tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; w.add(tyre);
    const rim = new THREE.Group(); rim.position.z = Math.sign(z) * 0.145; w.add(rim); spin.push(rim);
    rim.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 24), mat('#3a3d44', { metal: 0.6, rough: 0.4 }))); rim.children[0].rotation.x = Math.PI / 2;
    for (let k = 0; k < 5; k++) { const sp = box(0.05, 0.24, 0.03, '#5a5e66', 0, 0, 0, { metal: 0.7 }); sp.position.set(0, 0, 0.01); sp.geometry.translate(0, 0.0, 0); sp.rotation.z = k * Math.PI * 2 / 5; rim.add(sp); }
    const cal = box(0.12, 0.16, 0.06, '#d01e1e', 0.17, 0.05, Math.sign(z) * 0.1, { metal: 0.3 }); w.add(cal);
    wheels.add(w);
  }
  car.userData = { body, edges, glass, front, rear, wheels, spin, M };
  // set the car's state: 'wire' | 'clay' | 'bare' | 'primer' | 'paint'; parts on/off; wheels turning
  car.userData.state = (st, { glassOn = true, wheelsOn = true, lightsOn = true, edgesOn = false, roll = 0 } = {}) => {
    body.material = M[st]; edges.visible = edgesOn || st === 'wire'; glass.visible = glassOn && st !== 'wire'; wheels.visible = wheelsOn;
    front.visible = rear.visible = lightsOn && st === 'paint'; spin.forEach(r => r.rotation.z = -roll / 0.36);
  };
  return car;
}

export function buildWorld(stage) {
  const { scene, sets } = stage;
  const W = { sets, SOFT: softTex() };
  W.rafael = new Stickman({ height: 1.8, mark: { type: 'stache', color: '#1f2f5a' } });
  W.workers = Array.from({ length: 3 }, () => new Stickman({ height: 1.75, mark: { type: 'shirt', color: '#4a4f58' } }));
  const people = [W.rafael, ...W.workers];
  W.place = (setName, ...on) => { for (const p of people) { if (on.includes(p)) { if (p.mesh.parent !== sets[setName]) sets[setName].add(p.mesh); p.mesh.visible = true; } else p.mesh.visible = false; } };
  W.at = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(p); who.mesh.visible = true; };
  W.car = buildCar();
  W.carIn = (setName, x = 0, y = 0, z = 0, ry = 0) => { if (W.car.parent !== sets[setName]) sets[setName].add(W.car); W.car.position.set(x, y, z); W.car.rotation.set(0, ry, 0); W.car.visible = true; };

  // ---------- the city at night ----------
  const city = new THREE.Group(); sets.city = city; scene.add(city);
  city.add(box(200, 0.1, 200, '#15171c', 0, -0.1, 0));
  const R = rng(5);
  for (let i = 0; i < 26; i++) { const t = tower({ floors: 8 + Math.floor(R() * 18), cols: 4 + Math.floor(R() * 3), w: 7 + R() * 5, d: 7, floorH: 3, seed: 10 + i, litShare: 0.45, lit: R() < 0.5 ? '#ffd08a' : '#cfe6ff' }); const a = (i % 2 ? 1 : -1); t.position.set(a * (9 + R() * 20), 0, -i * 9 + 30); city.add(t); }
  city.add(box(10, 0.02, 260, '#24262c', 0, -0.04, -80));
  W.trails = []; for (let i = 0; i < 40; i++) { const red = i % 2; const m = box(0.25, 0.06, 1.6, red ? '#ff3a2a' : '#fff2d0', 0, 0.3, 0, { emissive: red ? '#ff2a1a' : '#fff2d0', glow: 3 }); m.castShadow = false; city.add(m); W.trails.push({ m, lane: (red ? 1.3 : -1.3) + (R() - 0.5) * 0.8, off: R() * 260, v: 18 + R() * 10, dir: red ? -1 : 1 }); }
  W.cityTraffic = t => W.trails.forEach(o => { const z = ((o.off + t * o.v * o.dir) % 260 + 260) % 260; o.m.position.set(o.lane, 0.3, 30 - z); });
  for (let i = 0; i < 20; i++) { const l = new THREE.PointLight('#ffb46b', 6, 18, 1.6); l.position.set((i % 2 ? 1 : -1) * 5.5, 5, 30 - i * 13); city.add(l); city.add(box(0.15, 5, 0.15, '#2a2c33', (i % 2 ? 1 : -1) * 5.5, 0, 30 - i * 13)); }
  W.cityL = lights(city, { hemi: '#3a4a7a', ground: '#0a0b10', hemiI: 0.7, dirI: 0.3, shadow: false });

  // ---------- the office (night window) and the design studio ----------
  const office = new THREE.Group(); sets.office = office; scene.add(office);
  office.add(box(8, 0.05, 6, '#3a3430', 0, -0.05, 0), box(8, 3, 0.1, '#2a2e36', 0, 0, -3));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), new THREE.MeshBasicMaterial({ color: '#0b1430' })); win.position.set(0, 1.6, -2.94); office.add(win);
  W.officeCity = canvasTex(1024, 410); { const g = W.officeCity.g, Rr = rng(3); g.fillStyle = '#070b1c'; g.fillRect(0, 0, 1024, 410); for (let i = 0; i < 60; i++) { const x = Rr() * 1024, w2 = 30 + Rr() * 60, h2 = 80 + Rr() * 300; g.fillStyle = '#10162a'; g.fillRect(x, 410 - h2, w2, h2); for (let y = 410 - h2 + 8; y < 400; y += 14) for (let xx = x + 5; xx < x + w2 - 6; xx += 10) if (Rr() < 0.4) { g.fillStyle = Rr() < 0.5 ? '#ffd08a' : '#bfe0ff'; g.fillRect(xx, y, 5, 6); } } }
  win.material = new THREE.MeshBasicMaterial({ map: W.officeCity.tx });
  office.add(box(1.8, 0.75, 0.9, '#5a3a2a', 0.8, 0, -1.4), box(1.9, 0.05, 1.0, '#7a5234', 0.8, 0.75, -1.4));
  const lamp = practical('#ffcf8a', 3, 6); lamp.position.set(1.4, 1.2, -1.6); lamp.userData.light.shadow.mapSize.set(512, 512); office.add(lamp);
  W.notebook = box(0.45, 0.02, 0.32, '#f2ecdc', 0.6, 0.8, -1.3, { emissive: '#f2ecdc', glow: 0.25 }); office.add(W.notebook);
  lights(office, { hemi: '#4a5a8a', hemiI: 0.6, dirI: 0.3, shadow: false });

  const studio = new THREE.Group(); sets.studio = studio; scene.add(studio);
  studio.add(box(14, 0.05, 12, '#3a3f48', 0, -0.05, 0), box(14, 4, 0.1, '#d9dce2', 0, 0, -6));
  W.sketches = canvasTex(1024, 256); { const g = W.sketches.g; g.fillStyle = '#eef0f4'; g.fillRect(0, 0, 1024, 256); for (let k = 0; k < 4; k++) { g.save(); g.translate(130 + k * 250, 150); g.scale(40, -40); g.strokeStyle = '#2a2e36'; g.lineWidth = 0.06; g.beginPath(); PROFILE.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke(); g.beginPath(); g.arc(1.42, 0.36, 0.36, 0, 7); g.moveTo(-1.02, 0.36); g.arc(-1.38, 0.36, 0.36, 0, 7); g.stroke(); g.restore(); } }
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshStandardMaterial({ map: W.sketches.tx })); sk.position.set(0, 2.2, -5.94); studio.add(sk);
  W.turntable = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.12, 48), mat('#2a2e36', { metal: 0.4, rough: 0.4 })); W.turntable.position.y = 0.06; W.turntable.receiveShadow = true; studio.add(W.turntable);
  W.desksS = []; for (let k = 0; k < 3; k++) { const desk = box(1.6, 0.75, 0.8, '#ffffff', -5 + k * 2.2, 0, 3.5); const mon = box(0.8, 0.5, 0.05, '#111', -5 + k * 2.2, 1.0, 3.3, { emissive: '#5fd0ff', glow: 0.6 }); studio.add(desk, mon); W.desksS.push(desk, mon); }
  W.studioL = lights(studio, { hemiI: 0.7, dirI: 1.0 });

  // ---------- the wind tunnel ----------
  const tunnel = new THREE.Group(); sets.tunnel = tunnel; scene.add(tunnel);
  tunnel.add(box(20, 0.05, 8, '#2a2d33', 0, -0.05, 0), box(20, 0.1, 8, '#1f2228', 0, 5, 0), box(20, 5, 0.1, '#1f2228', 0, 0, -4));
  const NS = 18, sg = new THREE.BufferGeometry(), segs = 60, sp = new Float32Array(NS * segs * 6); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  W.streams = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.85 })); W.streams.frustumCulled = false; tunnel.add(W.streams);
  const topAt = x => { let best = 0.3; for (let i = 0; i < PROFILE.length - 1; i++) { const [x1, y1] = PROFILE[i], [x2, y2] = PROFILE[i + 1]; if ((x - x1) * (x - x2) <= 0 && x1 !== x2) best = Math.max(best, y1 + (y2 - y1) * (x - x1) / (x2 - x1)); } return best; };
  W.flow = t => { let o = 0; for (let k = 0; k < NS; k++) { const z = -0.8 + (k % 6) * 0.32, lift = 0.05 + Math.floor(k / 6) * 0.22; for (let j = 0; j < segs; j++) { const ph = ((j / segs + t * 0.35 + k * 0.07) % 1); if (ph > 0.55) { sp.fill(0, o, o + 6); o += 6; continue; }
    const x1 = 6 - j * 0.2, x2 = x1 - 0.18; const y1 = Math.abs(x1) < 2.4 ? topAt(-x1) + lift : 0.35 + lift + Math.max(0, 1.3 - Math.abs(x1) * 0.25) * 0.1, y2 = Math.abs(x2) < 2.4 ? topAt(-x2) + lift : 0.35 + lift;
    sp.set([x1, y1, z, x2, y2, z], o); o += 6; } } sg.attributes.position.needsUpdate = true; };
  W.tunnelL = lights(tunnel, { hemi: '#9fb4d8', hemiI: 0.6, dirI: 0.8 });

  // ---------- the factory ----------
  const fac = new THREE.Group(); sets.fac = fac; scene.add(fac);
  fac.add(box(40, 0.05, 30, '#8e939b', 0, -0.05, 0)); const fw = box(40, 9, 0.2, '#c9ccd2', 0, 0, -12); fac.add(fw);
  for (const x of [-6, 6]) fac.add(box(0.12, 0.01, 30, '#e2b13c', x, 0.005, 0, { cast: false }));
  for (let i = 0; i < 8; i++) fac.add(box(1.2, 0.08, 6, '#ffffff', -10 + i * 3, 8.5, -2, { emissive: '#ffffff', glow: 1.2, cast: false }));
  W.conveyor = box(5.2, 0.35, 2.2, '#3a3d44', 0, 0, 0, { metal: 0.5 }); fac.add(W.conveyor);
  // robot arms: base, shoulder, upper arm, forearm, a torch at the tip
  W.robots = [];
  const mkRobot = (x, z, ry) => { const r = new THREE.Group(); r.position.set(x, 0, z); r.rotation.y = ry; fac.add(r);
    r.add(box(0.7, 0.4, 0.7, '#3a3d44', 0, 0, 0)); const yaw = new THREE.Group(); yaw.position.y = 0.4; r.add(yaw); yaw.add(box(0.5, 0.5, 0.5, '#ff7a1a', 0, 0, 0));
    const sh = new THREE.Group(); sh.position.y = 0.5; yaw.add(sh); sh.add(box(0.28, 1.5, 0.28, '#ff7a1a', 0, 0, 0));
    const el = new THREE.Group(); el.position.y = 1.5; sh.add(el); el.add(box(0.22, 1.2, 0.22, '#ff7a1a', 0, 0, 0));
    const tip = new THREE.Group(); tip.position.y = 1.2; el.add(tip); tip.add(box(0.12, 0.25, 0.12, '#2a2c33', 0, 0, 0));
    const o = { r, yaw, sh, el, tip }; W.robots.push(o); return o; };
  mkRobot(-1.6, -2.0, 0); mkRobot(1.6, -2.0, 0); mkRobot(-1.6, 2.0, Math.PI); mkRobot(1.6, 2.0, Math.PI);
  W.poseRobots = (t, amp = 1) => W.robots.forEach((o, i) => { const k = t * 1.6 + i * 1.3; o.yaw.rotation.y = 0.5 * Math.sin(k * 0.7) * amp; o.sh.rotation.x = (0.7 + 0.25 * Math.sin(k)) * (i < 2 ? 1 : 1); o.el.rotation.x = (0.9 + 0.3 * Math.sin(k * 1.3)) ; });
  // sparks (points), sampled by time
  const NP = 260, pg = new THREE.BufferGeometry(), pp = new Float32Array(NP * 3); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  W.sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffd27a', size: 0.06, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); W.sparks.frustumCulled = false; fac.add(W.sparks);
  const SR = rng(9), sd = Array.from({ length: NP }, () => [SR() * 2 - 1, SR(), SR() * 2 - 1, SR()]);
  W.spark = (t, at, on = 1) => { const src = Array.isArray(at[0]) ? at : [at]; for (let i = 0; i < NP; i++) { const s = sd[i], a = src[i % src.length], age = ((t * 2.5 + s[3]) % 1); const v = 1.2 + s[1] * 1.5;
    pp.set(on ? [a[0] + s[0] * v * age, a[1] + 1.4 * age * s[1] - 3 * age * age, a[2] + s[2] * v * age] : [0, -50, 0], i * 3); } pg.attributes.position.needsUpdate = true; };
  // the laser cutter and the press
  W.sheet = box(2.4, 0.03, 1.6, '#c9ced6', 0, 0.9, 0, { metal: 0.85, rough: 0.3 }); fac.add(W.sheet);
  W.laserTable = box(2.6, 0.9, 1.8, '#2a2c33', 0, 0, 0); fac.add(W.laserTable);
  W.laserHead = new THREE.Group(); W.laserHead.add(box(0.18, 0.3, 0.18, '#ff7a1a', 0, 0, 0)); const beam = box(0.02, 0.3, 0.02, '#ff3030', 0, -0.3, 0, { emissive: '#ff2020', glow: 3, cast: false }); W.laserHead.add(beam); fac.add(W.laserHead);
  W.cutLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffb060' })); fac.add(W.cutLine);
  W.press = new THREE.Group(); fac.add(W.press); W.press.add(box(3, 0.5, 2, '#3a3d44', 0, 0, 0), box(0.4, 4.5, 0.4, '#2a2c33', -1.3, 0, 0), box(0.4, 4.5, 0.4, '#2a2c33', 1.3, 0, 0), box(3, 0.6, 2, '#2a2c33', 0, 4.3, 0));
  W.ram = box(2.4, 0.6, 1.6, '#ff7a1a', 0, 0, 0); W.press.add(W.ram); W.panel = box(1.6, 0.05, 1.0, '#c9ced6', 0, 0.55, 0, { metal: 0.85, rough: 0.3 }); W.press.add(W.panel);
  W.probe = new THREE.Group(); W.probe.add(box(0.06, 0.8, 0.06, '#2a2c33', 0, 0, 0)); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff3030' })); W.probe.add(ball); fac.add(W.probe);
  W.screen = canvasTex(512, 288); W.screenM = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshBasicMaterial({ map: W.screen.tx })); fac.add(W.screenM);
  W.facL = lights(fac, { hemiI: 0.9, dirI: 1.3, dirPos: [5, 12, 6] });

  // ---------- the engine (cut-away) ----------
  const eng = new THREE.Group(); sets.eng = eng; scene.add(eng);
  eng.add(box(16, 0.05, 12, '#4a4f58', 0, -0.05, 0), box(16, 6, 0.1, '#2a2d33', 0, 0, -6));
  const E = new THREE.Group(); E.position.y = 1.2; eng.add(E); W.engine = E;
  const glassBlock = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.9), new THREE.MeshStandardMaterial({ color: '#b9c0c8', metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.35, depthWrite: false })); glassBlock.position.y = 0.2; E.add(glassBlock); W.blockSkin = glassBlock;
  E.add(box(2.1, 0.08, 1.0, '#8a9098', 0, -0.32, 0, { metal: 0.7 }));
  W.pistons = []; W.rods = [];
  for (let i = 0; i < 4; i++) { const x = -0.72 + i * 0.48; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.24, 20), mat('#d9dde3', { metal: 0.85, rough: 0.25 })); p.castShadow = true; E.add(p); W.pistons.push(p);
    const rod = box(0.06, 0.5, 0.06, '#9aa0a8', 0, 0, 0, { metal: 0.8 }); rod.geometry.translate(0, -0.25, 0); E.add(rod); W.rods.push(rod); }
  W.crank = new THREE.Group(); W.crank.position.set(0, -0.55, 0); E.add(W.crank);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 12), mat('#c9ced6', { metal: 0.9, rough: 0.2 })); shaft.rotation.z = Math.PI / 2; W.crank.add(shaft);
  for (let i = 0; i < 4; i++) { const th = box(0.12, 0.26, 0.12, '#b0b6be', -0.72 + i * 0.48, 0, 0, { metal: 0.9 }); th.geometry.translate(0, 0.13, 0); th.rotation.x = (i === 0 || i === 3) ? 0 : Math.PI; W.crank.add(th); }
  W.head = new THREE.Group(); W.head.add(box(2.1, 0.3, 1.0, '#7a8088', 0, 0, 0, { metal: 0.7 })); for (let i = 0; i < 2; i++) { const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 10), mat('#c9ced6', { metal: 0.9 })); cam.rotation.z = Math.PI / 2; cam.position.set(0, 0.36, i ? 0.22 : -0.22); W.head.add(cam); } E.add(W.head);
  W.turbo = new THREE.Group(); const tb = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.1, 10, 20), mat('#b88a4a', { metal: 0.8, rough: 0.3 })); W.turbo.add(tb); W.turbo.position.set(1.35, 0.3, 0.3); E.add(W.turbo);
  W.radiator = box(1.8, 1.2, 0.08, '#3a3d44', 0, -0.4, 1.1, { metal: 0.5 }); E.add(W.radiator);
  W.runEngine = (t, rpm = 1, headY = 0) => { const a = t * 8 * rpm; W.crank.rotation.x = a;
    W.pistons.forEach((p, i) => { const ph = a + ((i === 0 || i === 3) ? 0 : Math.PI); const y = 0.12 + Math.cos(ph) * 0.13; p.position.set(-0.72 + i * 0.48, y, 0); const r = W.rods[i]; r.position.set(-0.72 + i * 0.48, y - 0.1, 0); r.rotation.x = 0.25 * Math.sin(ph); });
    W.head.position.y = 0.85 + headY; W.turbo.rotation.z = t * 12 * rpm; };
  W.wrench = new THREE.Group(); W.wrench.add(box(0.05, 0.05, 0.6, '#c9ced6', 0, 0, 0.3, { metal: 0.9 }), box(0.07, 0.07, 0.12, '#d01e1e', 0, 0, 0.62)); eng.add(W.wrench);
  W.engL = lights(eng, { hemi: '#e8eef6', hemiI: 0.9, dirI: 1.4, dirPos: [3, 8, 5] });

  // ---------- the paint booth ----------
  const booth = new THREE.Group(); sets.booth = booth; scene.add(booth);
  booth.add(box(14, 0.05, 10, '#9aa0a8', 0, -0.05, 0), box(14, 6, 0.1, '#f4f6f8', 0, 0, -5), box(0.1, 6, 10, '#f4f6f8', -7, 0, 0));
  for (let i = 0; i < 6; i++) booth.add(box(6, 0.06, 0.6, '#ffffff', 0, 5.6, -4 + i * 1.6, { emissive: '#ffffff', glow: 1.5, cast: false }));
  const NM = 160, mg = new THREE.BufferGeometry(), mp = new Float32Array(NM * 3); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  W.mist = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#7f9ad8', size: 0.09, map: W.SOFT, transparent: true, opacity: 0.6, depthWrite: false })); W.mist.frustumCulled = false; booth.add(W.mist);
  const MR = rng(4), md = Array.from({ length: NM }, () => [MR(), MR(), MR()]);
  W.spray = (t, col, srcs, on = 1) => { W.mist.material.color.set(col); for (let i = 0; i < NM; i++) { const d = md[i], s = srcs[i % srcs.length], age = (t * 1.2 + d[0]) % 1; mp.set(on ? [s[0] + (d[1] - 0.5) * age * 1.2, s[1] - age * 0.9, s[2] + (d[2] - 0.5) * age * 1.2] : [0, -50, 0], i * 3); } mg.attributes.position.needsUpdate = true; };
  W.boothL = lights(booth, { hemiI: 0.7, dirI: 1.0 });

  // ---------- the dyno and the test cell ----------
  const dyno = new THREE.Group(); sets.dyno = dyno; scene.add(dyno);
  dyno.add(box(16, 0.05, 12, '#5a5f68', 0, -0.05, 0), box(16, 6, 0.1, '#3a3d44', 0, 0, -6));
  W.rollers = []; for (const x of [1.42, -1.38]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.4, 20), mat('#9aa0a8', { metal: 0.8, rough: 0.3 })); r.rotation.x = Math.PI / 2; r.position.set(x, -0.05, 0); dyno.add(r); W.rollers.push(r); }
  W.dynoScreen = canvasTex(512, 288); const ds = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: W.dynoScreen.tx })); ds.position.set(-3.2, 2.2, -5.9); dyno.add(ds);
  const NE = 60, eg = new THREE.BufferGeometry(), ep = new Float32Array(NE * 3); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  W.exhaust = new THREE.Points(eg, new THREE.PointsMaterial({ color: '#c9ccd2', size: 0.14, map: W.SOFT, transparent: true, opacity: 0.35, depthWrite: false })); W.exhaust.frustumCulled = false; dyno.add(W.exhaust);
  W.puff = (t, on = 1) => { for (let i = 0; i < NE; i++) { const age = (t * 0.8 + i / NE) % 1; ep.set(on ? [-2.5 - age * 1.6, 0.35 + age * 0.6, (i % 2 ? 0.5 : -0.5) + Math.sin(i * 3.1) * age * 0.4] : [0, -50, 0], i * 3); } eg.attributes.position.needsUpdate = true; };
  W.dynoL = lights(dyno, { hemi: '#e8eef6', hemiI: 0.8, dirI: 1.2 });

  // ---------- the road at sunset ----------
  const road = new THREE.Group(); sets.road = road; scene.add(road);
  road.add(box(400, 0.1, 400, '#4a6a3a', 0, -0.2, 0)); road.add(box(7, 0.05, 400, '#2a2c30', 0, -0.12, 0));
  for (let i = 0; i < 60; i++) road.add(box(0.15, 0.01, 2, '#f2ecdc', 0, -0.07, 180 - i * 6, { cast: false }));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#2a5a8a', metalness: 0.6, roughness: 0.2 })); sea.rotation.x = -Math.PI / 2; sea.position.set(-205, -0.6, 0); road.add(sea);
  for (let i = 0; i < 8; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(20 + i * 3, 25 + i * 4, 7), mat(['#3a5a3a', '#4a6a40', '#5a7048'][i % 3])); h.position.set(40 + i * 15, 0, -60 - i * 30); road.add(h); }
  W.sun = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffb35a' })); W.sun.position.set(-150, 14, -160); road.add(W.sun);
  W.factoryDoor = new THREE.Group(); W.factoryDoor.position.set(0, 0, -14); road.add(W.factoryDoor); W.factoryDoor.add(box(16, 8, 4, '#c9ccd2', 0, 0, -2)); const door = box(5, 3.6, 0.1, '#1a1c20', 0, 0, 0.02, { emissive: '#ffe6b0', glow: 0.6 }); W.factoryDoor.add(door);
  W.roadL = lights(road, { hemi: '#ffcfa0', ground: '#3a2a20', hemiI: 0.9, dir: '#ffb066', dirI: 2.2, dirPos: [-20, 8, -10] });
  W.SKY = { night: new THREE.Color('#05070f'), studio: new THREE.Color('#e9ebef'), fac: new THREE.Color('#c9ccd2'), sunset: (() => { const t = canvasTex(16, 256), g = t.g, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2a3a6a'); gr.addColorStop(0.55, '#d8785a'); gr.addColorStop(1, '#ffc27a'); g.fillStyle = gr; g.fillRect(0, 0, 16, 256); return t.tx; })() };
  // a reflection environment (a soft studio: bright ceiling panels, a grey horizon) so metal and paint read as metal and paint
  { const pm = new THREE.PMREMGenerator(stage.renderer), es = new THREE.Scene(); const sky = canvasTex(16, 256), g = sky.g, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#b9c2d0'); gr.addColorStop(0.55, '#5a606a'); gr.addColorStop(1, '#2a2d33'); g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
    const sph = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: sky.tx, side: THREE.BackSide })); es.add(sph);
    for (let i = 0; i < 4; i++) { const pnl = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })); pnl.position.set(-15 + i * 10, 30, 0); pnl.rotation.x = Math.PI / 2; es.add(pnl); }
    W.ENV = pm.fromScene(es, 0.02).texture; scene.environment = W.ENV; }
  W.use = (name, sky, exp = 1.0) => { stage.use(name); scene.background = W.SKY[sky] || new THREE.Color('#000000'); stage.renderer.toneMappingExposure = exp; };
  return W;
}
