// cueca/world.js: "A Noite em que Minha Cueca Virou História". The sets of the series, each a group the stage shows alone:
// 'pizza' (a cosy pizzeria, the table full of pizzas), 'room' (her bedroom at midnight), 'altar' (the holy flashback:
// the favourite underwear on a golden pedestal), 'gate' (his house at night, the gate, the key), 'home' (the hallway and
// the bathroom with the heavenly toilet), 'funeral' (rain, a tombstone). The car comes from ../meia/world.js.
import * as S from '../engine/stage.js';
const { THREE, rng, box, mat, door } = S;

const SOFT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.userData = { cv, g }; return tx; }
function panel(w, h, px, draw, o = {}) { const tx = canvasTex(px, Math.round(px * h / w), draw); if (o.repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...o.repeat); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.basic ? new THREE.MeshBasicMaterial({ map: tx, transparent: !!o.transparent }) : new THREE.MeshStandardMaterial({ map: tx, roughness: o.rough ?? 0.8, transparent: !!o.transparent, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? tx : null, emissiveIntensity: o.glow || 0 }));
  m.receiveShadow = true; m.userData.tx = tx; return m; }
function text(g, s, x, y, font, col, o = {}) { g.font = font; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeColor || '#111'; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y); }
const plane = (w, d, col, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), o.mat || mat(col)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m; };
const cyl = (r1, r2, h, col, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, o.seg || 20), o.mat || mat(col, o)); m.position.set(x, y + h / 2, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; return m; };
const planks = (base, line) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const R = rng(5); for (let y = 0; y < h; y += 32) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.08 * R()})`; g.fillRect(0, y, w, 30); g.fillStyle = line; g.fillRect(0, y + 30, w, 2); const off = R() * w; g.fillRect(off, y, 2, 30); } };
const bricks = (g, w, h) => { g.fillStyle = '#d9cbb4'; g.fillRect(0, 0, w, h); const R = rng(9), bw = 64, bh = 28; for (let r = 0; r * bh < h; r++) for (let x = -(r % 2) * bw / 2; x < w; x += bw) { const c = 120 + R() * 40; g.fillStyle = `rgb(${c + 40},${c * 0.55},${c * 0.4})`; g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); } };

// the favourite underwear: a red boxer brief with a white waistband (drawn flat, for the frame and the tombstone photo)
export function drawCueca(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-100, -60); g.lineTo(100, -60); g.lineTo(110, 70); g.lineTo(28, 80); g.lineTo(0, 22); g.lineTo(-28, 80); g.lineTo(-110, 70); g.closePath();
  g.fillStyle = '#c8302c'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#3a0c0c'; g.stroke();
  g.fillStyle = '#f4f2ec'; g.fillRect(-100, -60, 200, 30); g.strokeRect(-100, -60, 200, 30); g.fillStyle = '#c8302c'; g.font = '700 22px Oswald'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★ GUERREIRA ★', 0, -44);
  g.restore(); }

export function buildCueca(stage) {
  const { scene, sets } = stage, W = { sets };
  const add = (name) => { const g = new THREE.Group(); sets[name] = g; scene.add(g); g.visible = false; return g; };

  // ================= the pizzeria =================
  const pz = add('pizza'); W.pizzaSet = pz;
  { const fl = panel(8, 8, 512, planks('#8a5a34', '#5a3a20'), { repeat: [3, 3], rough: 0.6 }); fl.rotation.x = -Math.PI / 2; pz.add(fl);
    const wall = (w, x, z, ry) => { const p = panel(w, 3.2, 512, bricks, { repeat: [w / 2.2, 1.4] }); p.position.set(x, 1.6, z); p.rotation.y = ry; pz.add(p); };
    wall(8, 0, -3, 0); wall(8, -3.6, 1, Math.PI / 2); wall(8, 3.6, 1, -Math.PI / 2); wall(8, 0, 4.5, Math.PI);
    const ceil = box(8, 0.05, 8, '#3a2618', 0, 3.2, 0.5); ceil.castShadow = false; pz.add(ceil);
    for (let k = -3; k <= 3; k++) pz.add(box(0.12, 0.14, 8, '#4a2e1a', k * 1.1, 3.05, 0.5));
    // the wood oven: a brick dome, a glowing mouth
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b0603a')); dome.position.set(2.2, 1.0, -2.6); dome.scale.set(1, 0.8, 0.6); pz.add(dome); pz.add(box(2.2, 1.0, 1.3, '#9a7a5a', 2.2, 0, -2.6));
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff7a1a' })); mouth.position.set(2.2, 1.02, -1.98); pz.add(mouth);
    W.ovenLight = new THREE.PointLight('#ff8a3a', 5, 5, 1.5); W.ovenLight.position.set(2.2, 1.2, -1.6); pz.add(W.ovenLight);
    // the neon sign and the Italian flag stripes
    const neon = panel(2.6, 0.7, 1024, (g, w, h) => { text(g, 'PIZZARIA', w / 2, h / 2 + 6, '700 200px Oswald', '#ff4a5a', { stroke: 18, strokeColor: '#ffd0d6' }); }, { transparent: true, glow: 1.6 }); neon.position.set(-0.8, 2.5, -2.97); pz.add(neon);
    const flag = panel(1.2, 0.5, 256, (g, w, h) => { for (const [i, c] of ['#1f8a4a', '#f4f2ec', '#c8302c'].entries()) { g.fillStyle = c; g.fillRect(i * w / 3, 0, w / 3, h); } }); flag.position.set(-3.57, 2.3, -0.6); flag.rotation.y = Math.PI / 2; pz.add(flag);
    const menu = panel(0.7, 0.9, 256, (g, w, h) => { g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h); text(g, 'MENU', w / 2, 50, '700 46px Oswald', '#ffd34d'); ['CALABRESA', '4 QUEIJOS', 'BACON', 'FRANGO C/ CATUPIRY', 'CHOCOLATE'].forEach((s, i) => text(g, s, w / 2, 120 + i * 50, '700 24px Oswald', '#f4f2ec')); }); menu.position.set(3.57, 1.8, -0.8); menu.rotation.y = -Math.PI / 2; pz.add(menu);
    W.pzHemi = new THREE.HemisphereLight('#ffd6a0', '#4a2a1a', 0.75); pz.add(W.pzHemi); }
  // the table: round, a red and white checked cloth; five pizzas of eight slices; a candle
  const T = W.T = [0, 0], TY = 0.75;
  { pz.add(cyl(0.06, 0.08, TY - 0.03, '#3a2618', T[0], 0, T[1]), cyl(0.3, 0.3, 0.03, '#3a2618', T[0], 0, T[1]));
    const cloth = canvasTex(512, 512, (g, w, h) => { const n = 12, s = w / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#c8302c' : '#f6f1e6'; g.fillRect(x * s, y * s, s, s); } });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.03, 40), [mat('#c8302c'), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9 }), mat('#c8302c')]); top.position.set(T[0], TY - 0.015, T[1]); top.receiveShadow = true; top.castShadow = true; pz.add(top);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.72, 0.25, 40, 1, true), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9, side: THREE.DoubleSide })); skirt.position.set(T[0], TY - 0.15, T[1]); pz.add(skirt); }
  const flavour = (base, draw) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d99a4a'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill(); g.fillStyle = base; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); const R = rng(base.length * 7 + 3); draw(g, R); });
  const dots = (col, n, r0, r1) => (g, R) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const a = R() * 7, d = Math.sqrt(R()) * 96; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r0 + R() * (r1 - r0), 0, 7); g.fill(); } };
  const FLAV = [
    flavour('#d8462a', (g, R) => { dots('#9a2a1a', 14, 13, 16)(g, R); dots('#f2e2a0', 10, 4, 7)(g, R); }),                 // calabresa
    flavour('#f2cc5a', (g, R) => { dots('#fff2c0', 24, 8, 14)(g, R); dots('#e8a83a', 14, 5, 9)(g, R); }),                   // quatro queijos
    flavour('#f0c060', (g, R) => { dots('#8a3a1a', 30, 5, 9)(g, R); dots('#c05a2a', 16, 4, 7)(g, R); }),                    // bacon
    flavour('#f4e8c8', (g, R) => { dots('#e8c088', 26, 6, 10)(g, R); dots('#ffffff', 18, 10, 15)(g, R); }),                 // frango com catupiry
    flavour('#4a2414', (g, R) => { dots('#f4ead8', 22, 5, 8)(g, R); dots('#2a1208', 10, 8, 12)(g, R); }),                   // chocolate
  ];
  W.slices = [];
  FLAV.forEach((tx, i) => { const a = i / 5 * Math.PI * 2 + 0.3, x = T[0] + Math.cos(a) * 0.4, z = T[1] + Math.sin(a) * 0.4, r = 0.17;
    pz.add(cyl(r + 0.03, r + 0.03, 0.012, '#9a6a3a', x, TY, z, { seg: 24 }));
    const topM = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }), crust = mat('#c98a3a', { rough: 0.7 });
    for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.018, 4, 1, false, k / 8 * Math.PI * 2, Math.PI * 2 / 8), [crust, topM, crust]); s.position.set(x, TY + 0.021, z); s.castShadow = true; pz.add(s); W.slices.push(s); } });
  W.slices.sort(() => 0); W.eat = k => { const n = Math.round(W.slices.length * Math.min(1, k)); W.slices.forEach((s, i) => s.visible = ((i * 17) % W.slices.length) >= n); };
  { pz.add(cyl(0.025, 0.025, 0.1, '#f4ecd8', T[0], TY, T[1])); const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: '#ffc060', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fl.scale.setScalar(0.08); fl.position.set(T[0], TY + 0.13, T[1]); pz.add(fl); W.flame = fl;
    W.candle = new THREE.PointLight('#ffb050', 0.6, 1.6, 1.5); W.candle.position.set(T[0], TY + 0.2, T[1]); pz.add(W.candle);
    W.pzKey = new THREE.SpotLight('#ffcf8a', 3.5, 7, 0.9, 0.6, 1.3); W.pzKey.position.set(T[0], 2.6, T[1] + 0.3); W.pzKey.target.position.set(T[0], 0, T[1]); W.pzKey.castShadow = true; W.pzKey.shadow.mapSize.set(1024, 1024); W.pzKey.shadow.bias = -0.0015; pz.add(W.pzKey, W.pzKey.target);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 18, 1, true), mat('#1f4a33', { rough: 0.5 })); shade.position.set(T[0], 2.65, T[1] + 0.3); pz.add(shade); pz.add(box(0.01, 0.45, 0.01, '#111', T[0], 2.75, T[1] + 0.3)); }
  // chairs: you on the far side (z -), she on the right (x +); two background tables
  const chair = (x, z, ry, g = pz) => { const c = new THREE.Group(); c.add(box(0.44, 0.04, 0.42, '#6a3a1e', 0, 0.44, 0), box(0.44, 0.5, 0.04, '#6a3a1e', 0, 0.46, -0.2)); for (const [dx, dz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) c.add(box(0.035, 0.44, 0.035, '#4a2a14', dx, 0, dz)); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); return c; };
  chair(T[0], T[1] - 0.98, 0); chair(T[0] + 0.98, T[1], -Math.PI / 2);
  W.seat = { you: [T[0], T[1] - 0.86], her: [T[0] + 0.86, T[1]] };
  W.bgTables = [[-2.2, -1.6], [-2.0, 2.0], [2.4, 1.8]];
  W.bgTables.forEach(([x, z]) => { pz.add(cyl(0.45, 0.45, 0.03, '#f6f1e6', x, TY - 0.03, z), cyl(0.05, 0.05, TY - 0.03, '#3a2618', x, 0, z)); chair(x - 0.6, z, Math.PI / 2); chair(x + 0.6, z, -Math.PI / 2); const L = new THREE.PointLight('#ffb766', 2.2, 3.5, 1.5); L.position.set(x, 2.3, z); pz.add(L); });

  // ================= her bedroom at night =================
  const rm = add('room'); W.roomSet = rm;
  { const fl = panel(6, 6, 512, planks('#a87a52', '#6a4a2a'), { repeat: [2, 2], rough: 0.7 }); fl.rotation.x = -Math.PI / 2; rm.add(fl);
    const wallM = mat('#8a8fc0'); for (const [w, x, z, ry] of [[6, 0, -2, 0], [6, -2.6, 1, Math.PI / 2], [6, 2.6, 1, -Math.PI / 2], [6, 0, 3.5, Math.PI]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.8), wallM); p.position.set(x, 1.4, z); p.rotation.y = ry; p.receiveShadow = true; rm.add(p); }
    const c = box(6, 0.05, 6, '#6a6f9a', 0, 2.8, 0.75); c.castShadow = false; rm.add(c);
    // the bed: frame, mattress, a pink blanket with hearts, two pillows; headboard against the back wall
    rm.add(box(1.7, 0.3, 2.1, '#5a3a24', 0, 0, -0.95), box(1.7, 1.0, 0.08, '#5a3a24', 0, 0, -2.0));
    rm.add(box(1.6, 0.18, 2.0, '#f4f2ec', 0, 0.3, -0.95));
    const blanket = panel(1.66, 1.35, 512, (g, w, h) => { g.fillStyle = '#e07a9a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4b0c4'; const R = rng(3); for (let i = 0; i < 26; i++) { const x = R() * w, y = R() * h, s = 10 + R() * 8; g.beginPath(); g.moveTo(x, y + s); g.bezierCurveTo(x - s * 2, y - s * 0.4, x - s * 0.6, y - s * 1.6, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.6, x + s * 2, y - s * 0.4, x, y + s); g.fill(); } }); blanket.rotation.x = -Math.PI / 2; blanket.position.set(0, 0.5, -0.55); rm.add(blanket);
    for (const x of [-0.42, 0.42]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), mat('#f8f6f0')); p.scale.set(1, 0.3, 0.6); p.position.set(x, 0.55, -1.7); rm.add(p); }
    // the nightstand and the digital clock (red digits); the lamp is off
    rm.add(box(0.45, 0.5, 0.4, '#5a3a24', 1.15, 0, -1.6));
    const ck = panel(0.26, 0.11, 256, () => {}, { basic: true }); ck.position.set(1.15, 0.58, -1.43); rm.add(ck); rm.add(box(0.28, 0.13, 0.08, '#111', 1.15, 0.5, -1.48)); W.roomClockTx = ck.userData.tx;
    W.roomClock = s => { const { g } = W.roomClockTx.userData, w = 256, h = 108; g.fillStyle = '#0a0606'; g.fillRect(0, 0, w, h); text(g, s, w / 2, h / 2 + 4, '700 84px "JetBrains Mono"', '#ff2a2a'); W.roomClockTx.needsUpdate = true; };
    W.roomClock('23:59'); W.clockGlow = new THREE.PointLight('#ff3020', 0.8, 1.6, 1.5); W.clockGlow.position.set(1.15, 0.65, -1.2); rm.add(W.clockGlow);
    // the window on the left wall, the moon, cold moonlight across the bed
    const win = panel(1.1, 1.2, 256, (g, w, h) => { g.fillStyle = '#0d1838'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f0d8'; g.beginPath(); g.arc(w * 0.65, h * 0.3, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; const R = rng(8); for (let i = 0; i < 20; i++) g.fillRect(R() * w, R() * h, 2, 2); g.strokeStyle = '#3a3048'; g.lineWidth = 14; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); }, { glow: 0.7 }); win.position.set(-2.58, 1.6, -0.5); win.rotation.y = Math.PI / 2; rm.add(win);
    const moon = new THREE.DirectionalLight('#9ab0ff', 1.6); moon.position.set(-4, 4, 0.5); moon.target.position.set(0, 0, -0.8); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); rm.add(moon, moon.target);
    W.roomHemi = new THREE.HemisphereLight('#6a78c0', '#2a2030', 0.9); rm.add(W.roomHemi);
    W.roomDoor = door({ w: 0.85, h: 2.05, color: '#f2efe6', frame: '#b8b0a0' }); W.roomDoor.position.set(1.9, 0, 3.45); W.roomDoor.rotation.y = Math.PI; rm.add(W.roomDoor);
    W.hallGlow = new THREE.PointLight('#ffc070', 0, 3, 1.5); W.hallGlow.position.set(1.9, 1.6, 3.9); rm.add(W.hallGlow);
    const frame = panel(0.6, 0.45, 256, (g, w, h) => { g.fillStyle = '#e8d8c0'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302c'; g.beginPath(); g.moveTo(w / 2, h * 0.8); g.bezierCurveTo(w * 0.1, h * 0.45, w * 0.3, h * 0.05, w / 2, h * 0.3); g.bezierCurveTo(w * 0.7, h * 0.05, w * 0.9, h * 0.45, w / 2, h * 0.8); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 14; g.strokeRect(0, 0, w, h); }); frame.position.set(-0.9, 1.75, -1.98); rm.add(frame); }

  // ================= the holy flashback: the underwear on a golden pedestal =================
  const al = add('altar'); W.altarSet = al;
  { al.add(plane(30, 30, '#120a1e', 0, 0, 0)); const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ color: '#160c26' })); back.position.set(0, 6, -6); al.add(back);
    const gold = mat('#e8b84a', { metal: 0.85, rough: 0.25 });
    al.add(cyl(0.5, 0.6, 0.15, null, 0, 0, 0, { mat: gold }), cyl(0.28, 0.32, 0.9, null, 0, 0.15, 0, { mat: gold }), cyl(0.45, 0.4, 0.1, null, 0, 1.05, 0, { mat: gold }));
    const cush = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.5), mat('#8a1a3a', { rough: 0.6 })); cush.position.set(0, 1.19, 0); al.add(cush);
    // the folded underwear: a red block, a white waistband, the star on it
    W.cueca = new THREE.Group(); const ctx_ = canvasTex(512, 400, (g, w, h) => drawCueca(g, w / 2, h / 2 + 10, 2.0));
    const cu = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.36), new THREE.MeshStandardMaterial({ map: ctx_, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, emissive: '#ffffff', emissiveMap: ctx_, emissiveIntensity: 0.25 })); cu.castShadow = true; cu.position.y = 0.18; W.cueca.add(cu); W.cueca.position.set(0, 1.24, 0); al.add(W.cueca);
    W.altarFill = new THREE.PointLight('#ffd9a0', 3.5, 6, 1.5); W.altarFill.position.set(0.4, 1.6, 2.2); al.add(W.altarFill);
    W.altarHoly = new THREE.SpotLight('#fff2c8', 22, 8, 0.32, 0.5, 1.0); W.altarHoly.position.set(0, 5, 0.6); W.altarHoly.target.position.set(0, 1.2, 0); W.altarHoly.castShadow = true; al.add(W.altarHoly, W.altarHoly.target);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.9, 5, 28, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.set(0, 3.7, 0); al.add(beam);
    // rays behind: thin gold wedges turning
    W.rays = new THREE.Group(); for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 7), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffd76a' : '#ffefb0', transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); r.position.y = 3.5; const p = new THREE.Group(); p.rotation.z = i / 16 * Math.PI * 2; p.add(r); W.rays.add(p); } W.rays.position.set(0, 1.3, -2.5); al.add(W.rays);
    W.altarSparks = []; const R = rng(41); for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: '#fff2a8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.userData.q = [R(), R(), R()]; al.add(s); W.altarSparks.push(s); }
    al.add(new THREE.HemisphereLight('#7a5ab0', '#1a0a20', 0.6));
    W.altarAt = t => { W.cueca.rotation.y = 0.45 * Math.sin(t * 0.9); W.cueca.position.y = 1.24 + 0.03 * Math.sin(t * 2); W.rays.rotation.z = t * 0.15; W.altarSparks.forEach(s => { const [a, b, c] = s.userData.q; const r = 0.3 + 0.6 * b; s.position.set(Math.cos(c * 7 + t * 0.5) * r, 0.4 + ((a * 2.6 + t * 0.4) % 2.6), Math.sin(c * 7 + t * 0.5) * r); s.scale.setScalar(0.04 + 0.05 * a); s.material.opacity = 0.5 + 0.5 * Math.sin(t * 5 + a * 9); }); }; }

  // ================= his house at night: the wall, the gate, the key =================
  const gt = add('gate'); W.gateSet = gt;
  { gt.add(box(40, 0.02, 12, '#26272c', 0, -0.02, 8)); const walk = panel(40, 3, 512, (g, w, h) => { g.fillStyle = '#7d776c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5d584f'; g.lineWidth = 3; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, { repeat: [12, 1] }); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 0.5); gt.add(walk);
    gt.add(box(40, 0.14, 0.2, '#9a958a', 0, -0.02, 2.0));
    // the front wall: left part, the car gate (bars), the small gate (bars, on a hinge), right part
    const WALL = '#e6dccb'; gt.add(box(3.4, 2.2, 0.2, WALL, -3.7, 0, -1), box(4.0, 2.2, 0.2, WALL, 4.6, 0, -1), box(0.3, 2.3, 0.3, '#cfc4b0', -1.85, 0, -1), box(0.3, 2.3, 0.3, '#cfc4b0', 1.85, 0, -1), box(0.3, 2.3, 0.3, '#cfc4b0', 2.75, 0, -1));
    const bars = (w, h) => { const g = new THREE.Group(); g.add(box(w, 0.06, 0.05, '#2a2c30', 0, 0.1, 0, { metal: 0.5 }), box(w, 0.06, 0.05, '#2a2c30', 0, h - 0.08, 0, { metal: 0.5 })); for (let x = -w / 2 + 0.06; x < w / 2; x += 0.12) g.add(box(0.025, h - 0.1, 0.025, '#2a2c30', x, 0.08, 0, { metal: 0.5 })); return g; };
    const big = bars(3.4, 2.1); big.position.set(0, 0, -1); gt.add(big);
    W.gateHinge = new THREE.Group(); W.gateHinge.position.set(2.0, 0, -1); const small = bars(0.75, 2.0); small.position.x = 0.375; W.gateHinge.add(small); const lock = box(0.08, 0.14, 0.08, '#c9a35a', 0.68, 0.95, 0.02, { metal: 0.6 }); W.gateHinge.add(lock); gt.add(W.gateHinge);
    W.gateOpen = a => { W.gateHinge.rotation.y = a; };
    // behind: the little house, its front door lit, a window glowing; the sky
    gt.add(box(9, 3.0, 5, '#d8cdb8', 0.5, 0, -5)); gt.add(box(9.6, 0.2, 5.6, '#7a3a2a', 0.5, 3.0, -5)); gt.add(box(5, 0.02, 4, '#4a5a3a', 0.5, 0.0, -2.5));
    const fd = box(0.9, 2.1, 0.06, '#6a4026', 2.4, 0, -2.47); gt.add(fd); const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshBasicMaterial({ color: '#ffc77a' })); w1.position.set(-1.4, 1.5, -2.48); gt.add(w1);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(90, 30), new THREE.MeshBasicMaterial({ color: '#0c1430' })); sky.position.set(0, 10, -14); gt.add(sky);
    W.porch = new THREE.PointLight('#ffc070', 6, 6, 1.6); W.porch.position.set(2.4, 2.4, -0.7); W.porch.castShadow = true; W.porch.shadow.mapSize.set(1024, 1024); gt.add(W.porch); const pb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); pb.position.set(2.4, 2.4, -0.88); gt.add(pb);
    const pole = box(0.1, 4.2, 0.1, '#333', -6, 0, 1.6); gt.add(pole); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe7b8' })); lamp.position.set(-5.6, 4.1, 1.6); gt.add(lamp); gt.add(box(0.6, 0.08, 0.1, '#333', -5.75, 4.15, 1.6)); const sl = new THREE.PointLight('#ffd9a0', 10, 11, 1.5); sl.position.set(-5.6, 4.0, 1.6); gt.add(sl);
    gt.add(new THREE.HemisphereLight('#5a6fa8', '#1a1a22', 0.8));
    // the car, parked crooked, one wheel up on the kerb
    const car = new THREE.Group(); const red = '#a3262a'; car.add(box(3.8, 0.6, 1.7, red, 0, 0.25, 0, { rough: 0.35, metal: 0.3 }), box(2.1, 0.55, 1.5, '#2a2a30', -0.2, 0.85, 0, { rough: 0.2, metal: 0.4 }));
    for (const [x, z] of [[-1.3, 0.85], [1.3, 0.85], [-1.3, -0.85], [1.3, -0.85]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 14), mat('#111')); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.32, z); car.add(wh); }
    for (const z of [-0.55, 0.55]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff4d0' })); hl.position.set(1.92, 0.6, z); car.add(hl); }
    car.position.set(-3.6, 0.08, 3.2); car.rotation.set(0.05, 0.32, -0.04); gt.add(car); W.parked = car;
    // the key: a ring and a blade, gold
    W.key = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 14), mat('#e2bc4a', { metal: 0.8, rough: 0.3 })); W.key.add(ring); const blade = box(0.012, 0.06, 0.004, '#e2bc4a', 0, -0.085, 0, { metal: 0.8, rough: 0.3 }); W.key.add(blade); W.key.traverse(o => o.castShadow = true); gt.add(W.key); }

  // ================= the hallway of his house and the bathroom at its end =================
  const hm = add('home'); W.homeSet = hm;
  { const fl = panel(1.6, 7, 256, planks('#9a6a40', '#6a4426'), { repeat: [1, 4], rough: 0.5 }); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -2.5); hm.add(fl);
    const wallM = mat('#e9dcc2'); for (const [x, ry] of [[-0.8, Math.PI / 2], [0.8, -Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), wallM); p.position.set(x, 1.3, -2.5); p.rotation.y = ry; p.receiveShadow = true; hm.add(p); }
    const c = box(1.6, 0.05, 7, '#f4ecdc', 0, 2.6, -2.5); c.castShadow = false; hm.add(c); const back = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), wallM); back.position.set(0, 1.3, 1.0); back.rotation.y = Math.PI; hm.add(back);
    // the end wall with the bathroom door (z = -6)
    const end = S.wallWithHoles(1.6, 2.6, [{ x: 0, y: 0, w: 0.8, h: 2.05 }], '#e9dcc2', 0.1); end.position.set(0, 0, -6); hm.add(end);
    W.bathDoor = door({ w: 0.8, h: 2.03, color: '#f4f2ec', frame: '#c9bea8' }); W.bathDoor.position.set(0, 0, -6); hm.add(W.bathDoor);
    // frames on the walls, a little console with a plant
    const pic = (x, z, ry, col) => { const p = panel(0.4, 0.5, 128, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(w / 2, h * 0.4, 22, 0, 7); g.fill(); g.fillRect(w * 0.25, h * 0.58, w * 0.5, h * 0.3); g.strokeStyle = '#3a2a1a'; g.lineWidth = 12; g.strokeRect(0, 0, w, h); }); p.position.set(x, 1.6, z); p.rotation.y = ry; hm.add(p); };
    pic(-0.79, -1.2, Math.PI / 2, '#5a8ac0'); pic(0.79, -2.6, -Math.PI / 2, '#c08a5a'); pic(-0.79, -4.0, Math.PI / 2, '#6aa070');
    hm.add(box(0.3, 0.8, 0.8, '#6a4426', 0.62, 0, -3.8)); hm.add(cyl(0.08, 0.06, 0.15, '#c86a3a', 0.62, 0.8, -3.8)); const plant = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat('#3a8a4a')); plant.position.set(0.62, 1.05, -3.8); hm.add(plant);
    for (const z of [-1.2, -4.2]) { const L = new THREE.PointLight('#ffd6a0', 3.2, 4, 1.5); L.position.set(0, 2.4, z); hm.add(L); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0d0' })); b.position.copy(L.position); hm.add(b); }
    hm.add(new THREE.HemisphereLight('#ffe8c8', '#5a4a3a', 0.6));
    // the bathroom: x -1.1..1.1, z -6..-8.4, blue and white tiles, the toilet facing the door
    const tiles = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9ab0c0'; g.fillRect(0, 0, w, h); const s = w / 4; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#e8f0f4' : '#bcd4e4'; g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4); } }); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(4, 4);
    const tm = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.4 });
    const bf = plane(2.2, 2.4, null, 0, 0.003, -7.2, { mat: tm }); hm.add(bf);
    for (const [w, x, z, ry] of [[2.4, -1.1, -7.2, Math.PI / 2], [2.4, 1.1, -7.2, -Math.PI / 2], [2.2, 0, -8.4, 0]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), tm); p.position.set(x, 1.3, z); p.rotation.y = ry; p.receiveShadow = true; hm.add(p); }
    const bc = box(2.2, 0.05, 2.4, '#f4f6f8', 0, 2.6, -7.2); bc.castShadow = false; hm.add(bc);
    W.toilet = new THREE.Group(); const por = mat('#f8f8f4', { rough: 0.2 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.38, 18), por); base.position.y = 0.19; base.scale.x = 1.25; W.toilet.add(base);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.16, 0.08, 20), por); bowl.position.set(0, 0.4, 0.04); bowl.scale.set(1, 1, 1.25); W.toilet.add(bowl);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 22), mat('#ffffff', { rough: 0.3 })); seat.rotation.x = Math.PI / 2; seat.position.set(0, 0.45, 0.05); seat.scale.set(1, 1.2, 1); W.toilet.add(seat);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.2), por); tank.position.set(0, 0.62, -0.17); W.toilet.add(tank); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.035, 0.23), por); lid.position.set(0, 0.815, -0.17); W.toilet.add(lid);
    W.toilet.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); W.toilet.position.set(0, 0, -8.05); hm.add(W.toilet);
    hm.add(cyl(0.2, 0.13, 0.16, '#f8f8f4', 0.8, 0.8, -7.0), box(0.08, 0.8, 0.08, '#e8e8e4', 0.85, 0, -7.0)); const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 14), mat('#ffffff')); roll.rotation.x = Math.PI / 2; roll.position.set(-1.02, 0.7, -7.8); roll.rotation.set(0, 0, Math.PI / 2); hm.add(roll);
    W.bathLight = new THREE.PointLight('#f4f8ff', 4, 4, 1.5); W.bathLight.position.set(0, 2.4, -7.2); hm.add(W.bathLight);
    // the heavenly light on the toilet
    W.tHoly = new THREE.SpotLight('#fff2c8', 0, 4, 0.35, 0.4, 1.0); W.tHoly.position.set(0, 2.55, -7.9); W.tHoly.target.position.set(0, 0, -8.05); hm.add(W.tHoly, W.tHoly.target);
    W.tBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.45, 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); W.tBeam.position.set(0, 1.3, -8.05); hm.add(W.tBeam);
    W.tSparks = []; const R = rng(29); for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: '#fff7c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.userData.q = [R(), R(), R(), R()]; hm.add(s); W.tSparks.push(s); }
    W.holyOn = (t, k) => { W.tHoly.intensity = 9 * k; W.tBeam.material.opacity = 0.18 * k; W.tSparks.forEach(s => { const [a, b, c, d] = s.userData.q; s.material.opacity = k * (0.5 + 0.5 * Math.sin(t * 6 + a * 9)); const r = 0.08 + 0.3 * b; s.position.set(Math.cos(c * 7 + t * 0.8) * r, 0.3 + ((d * 2.0 + t * 0.35) % 2.0), -8.05 + Math.sin(c * 7 + t * 0.8) * r); s.scale.setScalar(0.04 + 0.04 * a); }); }; }

  // ================= the funeral: grey morning rain, a tombstone, a framed photo =================
  const fu = add('funeral'); W.funSet = fu;
  { const grass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4a6a3a'; g.fillRect(0, 0, w, h); const R = rng(12); for (let i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? '#3a5a2e' : '#5a7a46'; g.fillRect(R() * w, R() * h, 2, 6); } }); grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(10, 10);
    fu.add(plane(40, 40, null, 0, 0, 0, { mat: new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }) }));
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ color: '#7d8794' })); sky.position.set(0, 12, -20); fu.add(sky);
    // other graves far away, a cypress or two
    const R = rng(17); for (let i = 0; i < 14; i++) { const x = -10 + R() * 20, z = -4 - R() * 10; fu.add(box(0.5, 0.7 + R() * 0.4, 0.15, '#8a8a8a', x, 0, z)); }
    for (const [x, z] of [[-5, -6], [6, -8], [-8, -12]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4, 10), mat('#2a4a2a')); c.position.set(x, 2, z); fu.add(c); }
    // the tombstone and the mound
    const stoneTx = canvasTex(512, 640, (g, w, h) => { g.fillStyle = '#9a9ca2'; g.fillRect(0, 0, w, h); const R2 = rng(4); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${R2() < 0.5 ? '0,0,0' : '255,255,255'},0.06)`; g.fillRect(R2() * w, R2() * h, 3, 3); }
      text(g, '✝', w / 2, 90, '700 80px Oswald', '#2a2c30'); text(g, 'AQUI JAZ', w / 2, 190, '700 70px Oswald', '#1c1e22'); text(g, 'UMA GUERREIRA', w / 2, 275, '700 62px Oswald', '#1c1e22'); text(g, '2022 – 2026', w / 2, 375, '700 56px "JetBrains Mono"', '#2a2c30'); text(g, 'MORREU EM SERVIÇO', w / 2, 470, '700 48px Oswald', '#7a1a1a'); });
    const stoneM = new THREE.MeshStandardMaterial({ map: stoneTx, roughness: 0.8 }), grey = mat('#9a9ca2', { rough: 0.8 });
    W.stone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.15), [grey, grey, grey, grey, stoneM, grey]); W.stone.position.set(0, 0.5, -1); W.stone.castShadow = true; fu.add(W.stone);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 24, 1, false, -Math.PI / 2, Math.PI), grey); arch.rotation.x = Math.PI / 2; arch.position.set(0, 1.0, -1); fu.add(arch);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8), mat('#5a3e26')); mound.scale.set(0.8, 0.22, 1.3); mound.position.set(0, 0, -0.1); fu.add(mound);
    // the framed photo of the deceased on a little easel, a black ribbon on its corner
    const photo = panel(0.5, 0.42, 256, (g, w, h) => { g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h); drawCueca(g, w / 2, h / 2 + 4, 0.75); g.strokeStyle = '#2a1a0e'; g.lineWidth = 16; g.strokeRect(0, 0, w, h); g.fillStyle = '#111'; g.beginPath(); g.moveTo(w - 70, 0); g.lineTo(w, 0); g.lineTo(w, 70); g.closePath(); g.fill(); });
    photo.position.set(0.7, 0.95, -0.7); photo.rotation.set(-0.12, -0.3, 0); fu.add(photo); W.photo = photo;
    for (const dx of [-0.15, 0.15]) { const l = box(0.025, 0.9, 0.025, '#4a2e1a', 0.7 + dx, 0, -0.74); l.rotation.x = -0.12; fu.add(l); }
    // the wreath leaning on the stone
    const wr = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 20), mat('#2e6a3a')); wr.position.set(-0.45, 0.3, -0.85); wr.rotation.y = 0.3; fu.add(wr); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(i % 2 ? '#e8e8e0' : '#c8302c')); f.position.set(-0.45 + Math.cos(a) * 0.22 * Math.cos(0.3), 0.3 + Math.sin(a) * 0.22, -0.85 - Math.cos(a) * 0.22 * Math.sin(0.3)); fu.add(f); }
    // rain: streaks falling, and the grey light
    const N = 900, pos = new Float32Array(N * 6); W.rainSeed = []; const R3 = rng(55); for (let i = 0; i < N; i++) W.rainSeed.push([R3() * 12 - 6, R3() * 8, R3() * 10 - 6]);
    W.rainGeo = new THREE.BufferGeometry(); W.rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); W.rain = new THREE.LineSegments(W.rainGeo, new THREE.LineBasicMaterial({ color: '#c8d4e4', transparent: true, opacity: 0.55 })); W.rain.frustumCulled = false; fu.add(W.rain);
    W.rainAt = t => { const p = W.rainGeo.attributes.position.array; W.rainSeed.forEach(([x, y, z], i) => { const yy = ((y - t * 9) % 8 + 8) % 8; p.set([x + 0.05, yy, z, x, yy - 0.28, z], i * 6); }); W.rainGeo.attributes.position.needsUpdate = true; };
    fu.add(new THREE.HemisphereLight('#a8b4c4', '#3a4030', 1.2)); const d = new THREE.DirectionalLight('#c4ccd8', 1.0); d.position.set(-3, 8, 5); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); fu.add(d);
    // umbrellas (black cones), placed per shot over a head
    W.umbrellas = []; for (let i = 0; i < 5; i++) { const u = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.5, side: THREE.DoubleSide })); c.position.y = 0.14; u.add(c); u.add(box(0.015, 0.75, 0.015, '#111', 0, -0.6, 0)); fu.add(u); u.visible = false; W.umbrellas.push(u); } }

  // a drop of sweat (used in the car and on the gate)
  W.drop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: '#9fd8ff', emissive: '#4aa8ff', emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.9 })); W.drop.scale.set(1, 1.5, 0.6); W.drop.visible = false;
  return W;
}
