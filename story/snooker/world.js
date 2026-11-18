// snooker/world.js: "O Chupa-Cu do Snooker Bar". Two sets: 'snk' (the bar inside: the green pool table under its lamp,
// the counter, the snoring freezer, the red sign in the window, the wall clock, the TV, the crates at the back, the old
// hatch in the right wall and, behind it, Jorge's laundry) and 'rua' (the facade on the street, day or night).
import * as S from '../engine/stage.js';
const { THREE, rng, box, mat, door } = S;

function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); if (draw) draw(g, w, h); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.userData = { cv, g }; return tx; }
function panel(w, h, px, draw, o = {}) { const tx = canvasTex(px, Math.round(px * h / w), draw); if (o.repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...o.repeat); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.basic ? new THREE.MeshBasicMaterial({ map: tx, transparent: !!o.transparent, side: o.double ? THREE.DoubleSide : THREE.FrontSide }) : new THREE.MeshStandardMaterial({ map: tx, roughness: o.rough ?? 0.8, transparent: !!o.transparent, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? tx : null, emissiveIntensity: o.glow || 0 }));
  m.receiveShadow = true; m.userData.tx = tx; return m; }
export function text(g, s, x, y, font, col, o = {}) { g.font = font; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeColor || '#111'; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y); }
const cyl = (r1, r2, h, col, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, o.seg || 18), o.mat || mat(col, o)); m.position.set(x, y + h / 2, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; return m; };
const planks = (base, line) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const R = rng(5); for (let y = 0; y < h; y += 32) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.08 * R()})`; g.fillRect(0, y, w, 30); g.fillStyle = line; g.fillRect(0, y + 30, w, 2); g.fillRect(R() * w, y, 2, 30); } };
const neonSign = (g, w, h, on = true) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(20,6,6,0.85)'; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 26); g.fill(); text(g, 'SNOOKER BAR', w / 2, h / 2 + 6, '700 150px Oswald', on ? '#ff3a3a' : '#5a1a1a', { stroke: on ? 14 : 0, strokeColor: '#ffb0b0' }); };

export function buildSnooker(stage) {
  const { scene, sets } = stage, W = { sets };
  const add = n => { const g = new THREE.Group(); sets[n] = g; scene.add(g); g.visible = false; return g; };
  W.lights = [];                                                  // [light, normal intensity]
  const L = (l, g) => { g.add(l); W.lights.push([l, l.intensity]); return l; };

  // ================= the bar inside =================
  const b = add('snk'); W.bar = b;
  const BW = 8, BD = 9, BH = 3.0;
  { const fl = panel(BW, BD, 512, (g, w, h) => { const n = 8, s = w / n; for (let y = 0; y < 9; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#2a2a2e' : '#d8d2c4'; g.fillRect(x * s, y * s, s, s); } }, { repeat: [2, 2.25], rough: 0.5 }); fl.rotation.x = -Math.PI / 2; b.add(fl);
    const c = box(BW, 0.05, BD, '#2a1e18', 0, BH, 0); c.castShadow = false; b.add(c);
    const WALL = '#7a2e2a', LOW = '#3a2a22';
    const wall = (w, x, z, ry, holes = []) => { const g = new THREE.Group(); const up = S.wallWithHoles(w, BH, holes, WALL, 0.1); g.add(up); g.position.set(x, 0, z); g.rotation.y = ry; b.add(g); const lo = panel(w, 1.0, 512, planks('#5a3a24', '#3a2414'), { repeat: [w / 2, 1] }); lo.position.set(0, 0.5, 0.06); g.add(lo); return g; };
    wall(BW, 0, -BD / 2, 0, [{ x: -1.5, y: 0, w: 0.9, h: 2.05 }]);                                    // back: the service door
    wall(BD, -BW / 2, 0, Math.PI / 2);                                                               // left
    wall(BD, BW / 2, 0, -Math.PI / 2, [{ x: 3.3, y: 0.05, w: 0.7, h: 0.75 }]);                      // right: the old hatch (z = -3.3)
    wall(BW, 0, BD / 2, Math.PI, [{ x: 0.8, y: 0.9, w: 2.6, h: 1.5 }, { x: -2.4, y: 0, w: 1.0, h: 2.1 }]);   // front: the window and the door
  }
  // the pool table: long axis along z
  const PT = W.PT = [0.6, 0.3]; const TY = 0.8;
  { const felt = new THREE.MeshStandardMaterial({ color: '#1f7a3a', roughness: 0.95 }); const wood = mat('#5a2e14', { rough: 0.5 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 2.5), felt); top.position.set(PT[0], TY - 0.03, PT[1]); top.receiveShadow = true; b.add(top);
    for (const [w, d, x, z] of [[0.12, 2.74, -0.71, 0], [0.12, 2.74, 0.71, 0], [1.54, 0.12, 0, -1.31], [1.54, 0.12, 0, 1.31]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), wood); r.position.set(PT[0] + x, TY + 0.0, PT[1] + z); r.castShadow = true; b.add(r); }
    b.add(box(1.2, 0.18, 2.3, '#4a2410', PT[0], 0.57, PT[1])); for (const [x, z] of [[-0.55, -1.1], [0.55, -1.1], [-0.55, 1.1], [0.55, 1.1]]) b.add(box(0.14, 0.6, 0.14, '#3a1a08', PT[0] + x, 0, PT[1] + z));
    W.pockets = []; for (const [x, z] of [[-0.62, -1.22], [0.62, -1.22], [-0.66, 0], [0.66, 0], [-0.62, 1.22], [0.62, 1.22]]) { const p = cyl(0.06, 0.06, 0.02, '#050505', PT[0] + x, TY - 0.005, PT[1] + z); b.add(p); W.pockets.push([PT[0] + x, PT[1] + z]); }
    const cols = ['#f2c230', '#2c5fae', '#c8372d', '#6a2a8a', '#e05a2b', '#1f7a3a', '#7a1a1a', '#f4f2ec'], R = rng(3);
    cols.forEach((c, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), mat(c, { rough: 0.2 })); s.position.set(PT[0] + (R() - 0.5) * 1.0, TY + 0.03, PT[1] + (R() - 0.5) * 2.0); s.castShadow = true; b.add(s); });
    W.ball8 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 14, 0, 7); g.fill(); text(g, '8', 32, 33, '700 22px Oswald', '#111'); }), roughness: 0.2 })); W.ball8.castShadow = true; b.add(W.ball8);
    W.ball8Home = [PT[0] + 0.56, TY + 0.03, PT[1] + 1.16]; W.ball8.position.set(...W.ball8Home);
    W.ball8At = k => { const [px, pz] = W.pockets[5]; W.ball8.position.set(px - 0.06 * (1 - k), TY + 0.03 - 0.06 * k, pz - 0.06 * (1 - k)); };
    W.cue = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 1.45, 8), mat('#c9a06a', { rough: 0.4 })); W.cue.castShadow = true; b.add(W.cue); W.cue.visible = false;
    // the lamp over the table: a long green shade, a warm spot
    const shade = box(0.5, 0.18, 1.6, '#1f4a2e', PT[0], 1.95, PT[1], { rough: 0.5 }); b.add(shade); const under = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.5), new THREE.MeshBasicMaterial({ color: '#fff2c8' })); under.rotation.x = Math.PI / 2; under.position.set(PT[0], 1.94, PT[1]); b.add(under); W.lampUnder = under;
    for (const dz of [-0.6, 0.6]) b.add(box(0.01, 0.9, 0.01, '#111', PT[0], 2.12, PT[1] + dz));
    W.tableSpot = L(new THREE.SpotLight('#ffe2a8', 14, 6, 0.95, 0.5, 1.2), b); W.tableSpot.position.set(PT[0], 1.9, PT[1]); W.tableSpot.target.position.set(PT[0], 0, PT[1]); b.add(W.tableSpot.target); W.tableSpot.castShadow = true; W.tableSpot.shadow.mapSize.set(1024, 1024); W.tableSpot.shadow.bias = -0.0015; }
  // the counter on the left, bottles behind, stools in front
  { b.add(box(0.7, 1.05, 4.0, '#4a2a18', -3.1, 0, 0.2), box(0.85, 0.06, 4.1, '#2a1a10', -3.1, 1.05, 0.2));
    for (let k = 0; k < 3; k++) b.add(box(0.3, 0.04, 3.6, '#3a2414', -3.85, 1.45 + k * 0.42, 0.2));
    const R = rng(11), cols = ['#6b3a12', '#2f5a2a', '#8a6a2a', '#c9c4b0', '#7a1f1f'];
    for (let k = 0; k < 3; k++) for (let i = 0; i < 12; i++) { const h = 0.22 + R() * 0.1; b.add(cyl(0.04, 0.045, h, cols[Math.floor(R() * 5)], -3.85, 1.47 + k * 0.42, -1.3 + i * 0.27, { rough: 0.2 })); }
    W.stools = []; for (let i = 0; i < 4; i++) { const st = new THREE.Group(); st.add(box(0.06, 0.72, 0.06, '#555', 0, 0, 0, { metal: 0.6 })); st.add(cyl(0.19, 0.19, 0.07, '#b8322a', 0, 0.72, 0)); st.position.set(-2.45, 0, -1.1 + i * 0.85); b.add(st); W.stools.push(st); }
    W.counterLight = L(new THREE.PointLight('#ffb766', 3.5, 5, 1.5), b); W.counterLight.position.set(-2.8, 2.6, 0.2); }
  // the freezer: a tall beer fridge, glowing, at the back left
  { b.add(box(0.85, 1.95, 0.7, '#e8e8e8', -3.4, 0, -3.9)); W.freezerGlass = panel(0.7, 1.6, 256, (g, w, h) => { g.fillStyle = '#cfe8ff'; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#6b3a12' : '#7a4a1a'; g.fillRect(14 + i * 40, 30 + r * 150, 26, 110); } }, { glow: 0.55 }); W.freezerGlass.position.set(-3.4, 1.0, -3.54); b.add(W.freezerGlass);
    const lg = panel(0.7, 0.18, 256, (g, w, h) => { g.fillStyle = '#c8302c'; g.fillRect(0, 0, w, h); text(g, 'CERVEJA GELADA', w / 2, h / 2 + 2, '700 34px Oswald', '#fff'); }); lg.position.set(-3.4, 1.86, -3.54); b.add(lg);
    W.freezerLight = L(new THREE.PointLight('#bfe0ff', 0.8, 3, 1.5), b); W.freezerLight.position.set(-2.9, 1.5, -2.4); }
  // the red sign inside the front window, the window glow from the street, the front door with its blind
  { W.signTx = canvasTex(1024, 256, (g, w, h) => neonSign(g, w, h)); W.sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: W.signTx, transparent: true })); W.sign.position.set(0.8, 2.1, 4.38); W.sign.rotation.y = Math.PI; b.add(W.sign);
    W.signLight = L(new THREE.PointLight('#ff3030', 5, 6, 1.4), b); W.signLight.position.set(0.8, 2.0, 3.9);
    W.signOn = on => { neonSign(W.signTx.userData.g, 1024, 256, on); W.signTx.needsUpdate = true; W.signLight.intensity = on ? 5 : 0; };
    const out = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ color: '#2a3a5a' })); out.position.set(0.8, 1.65, 4.62); out.rotation.y = Math.PI; b.add(out); W.windowOut = out;
    W.frontDoor = door({ w: 1.0, h: 2.08, color: '#3a2414', frame: '#1a1008' }); W.frontDoor.position.set(-2.4, 0, 4.5); W.frontDoor.rotation.y = Math.PI; b.add(W.frontDoor);
    W.blind = new THREE.Group(); for (let i = 0; i < 12; i++) W.blind.add(box(0.8, 0.04, 0.02, '#d8d2c4', 0, i * 0.07, 0)); W.blind.position.set(-2.4, 1.0, 4.4); b.add(W.blind); W.blindAt = k => { W.blind.scale.y = Math.max(0.02, k); W.blind.position.y = 1.0 + 0.84 * (1 - k); }; }
  // the service door at the back, its key; the wall clock; the TV; the cue rack
  { W.serviceDoor = door({ w: 0.9, h: 2.05, color: '#5a3a24', frame: '#2a1a10' }); W.serviceDoor.position.set(-1.5, 0, -4.5); b.add(W.serviceDoor);
    W.clockTx = canvasTex(256, 256); W.clock = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshBasicMaterial({ map: W.clockTx })); W.clock.position.set(1.2, 2.35, -4.43); b.add(W.clock);
    W.setClock = (hh, mm) => { const g = W.clockTx.userData.g; g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, 256, 256); g.lineWidth = 16; g.strokeStyle = '#7a1a1a'; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke(); g.fillStyle = '#222'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 96 - 3, 128 - Math.cos(a) * 96 - 8, 6, 16); }
      const hand = (a, l, w, c) => { g.save(); g.translate(128, 128); g.rotate(a); g.fillStyle = c; g.fillRect(-w / 2, -l, w, l); g.restore(); }; hand(((hh % 12) + mm / 60) / 12 * Math.PI * 2, 60, 10, '#111'); hand(mm / 60 * Math.PI * 2, 92, 6, '#111'); W.clockTx.needsUpdate = true; };
    W.setClock(23, 40);
    b.add(box(1.0, 0.62, 0.08, '#111', -3.95, 2.05, 1.6)); W.tvTx = canvasTex(512, 300); W.tv = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.54), new THREE.MeshBasicMaterial({ map: W.tvTx })); W.tv.rotation.y = Math.PI / 2; W.tv.position.set(-3.9, 2.36, 1.6); b.add(W.tv); W.tv.rotation.y = Math.PI / 2;
    b.children[b.children.length - 2].rotation.y = Math.PI / 2;
    W.tvShow = (mode, t = 0) => { const g = W.tvTx.userData.g, w = 512, h = 300; if (mode === 'off') { g.fillStyle = '#0a0b0e'; g.fillRect(0, 0, w, h); W.tvTx.needsUpdate = true; return; }
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1d3a6a'); gr.addColorStop(1, '#0d1a34'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f1ede4'; g.strokeStyle = '#15171c'; g.lineWidth = 8; g.beginPath(); g.arc(180, 120, 34, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#121014'; g.beginPath(); g.arc(180, 112, 38, Math.PI, 0); g.fill(); g.fillStyle = '#3a5a8a'; g.fillRect(150, 160, 60, 90); g.fillStyle = '#15171c'; g.beginPath(); g.arc(168, 122, 4, 0, 7); g.arc(192, 122, 4, 0, 7); g.fill();
      g.fillStyle = '#c8302c'; g.fillRect(300, 70, 180, 120); text(g, '3 ANOS', 390, 115, '700 44px Oswald', '#fff'); text(g, 'DE PRISÃO', 390, 160, '700 30px Oswald', '#fff');
      g.fillStyle = '#c8302c'; g.fillRect(0, 232, w, 24); text(g, 'AO VIVO', 50, 244, '700 18px Oswald', '#fff'); g.fillStyle = '#f4f2ec'; g.fillRect(0, 256, w, 44); const tk = 'CASO SNOOKER BAR CHEGA AO FIM  •  CASO SNOOKER BAR CHEGA AO FIM  •  '; g.save(); g.beginPath(); g.rect(0, 256, w, 44); g.clip(); text(g, tk, 300 - (t * 90) % 700, 279, '700 28px Oswald', '#111', { align: 'left' }); g.restore(); W.tvTx.needsUpdate = true; };
    W.tvShow('off');
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 1.45, 8), mat('#c9a06a')); c.position.set(3.93, 1.35, 1.5 + i * 0.12); c.rotation.z = 0.06; b.add(c); } b.add(box(0.06, 0.06, 0.9, '#3a2414', 3.95, 2.05, 1.8));
    for (const [x, z] of [[-1.2, -1.5], [2.0, 2.4]]) { W.lights.push([L(new THREE.PointLight('#ffb766', 2.5, 5, 1.5), b), 2.5]); W.lights[W.lights.length - 1][0].position.set(x, 2.7, z); const bb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); bb.position.set(x, 2.7, z); b.add(bb); }
    W.doorLight = L(new THREE.PointLight('#ffb766', 3.5, 5, 1.5), b); W.doorLight.position.set(-1.8, 2.6, 3.4);
    W.backLight = L(new THREE.PointLight('#ffb766', 3.0, 5, 1.5), b); W.backLight.position.set(2.6, 2.6, -2.8);
    W.hemi = L(new THREE.HemisphereLight('#ffd6b0', '#3a2018', 0.55), b); }
  // the crates at the back right, the old wooden hatch in the right wall (to the laundry)
  { const crate = (x, y, z, col) => { b.add(box(0.42, 0.29, 0.34, col, x, y, z, { rough: 0.6 })); for (let i = 0; i < 6; i++) b.add(cyl(0.03, 0.03, 0.08, '#4a2208', x - 0.13 + (i % 3) * 0.13, y + 0.3, z - 0.08 + Math.floor(i / 3) * 0.16, { rough: 0.2 })); };
    for (let k = 0; k < 4; k++) crate(3.2, k * 0.3, -4.1, k % 2 ? '#d9a91f' : '#c8372d'); for (let k = 0; k < 3; k++) crate(2.7, k * 0.3, -4.15, k % 2 ? '#c8372d' : '#d9a91f'); for (let k = 0; k < 2; k++) crate(3.65, k * 0.3, -0.6, '#2c5fae'); crate(2.2, 0, -3.9, '#2c5fae');
    W.hatch = new THREE.Group(); const leaf = box(0.7, 0.75, 0.04, '#8a6a3a', 0.35, 0, 0, { rough: 0.7 }); W.hatch.add(leaf); for (const y of [0.15, 0.6]) W.hatch.add(box(0.7, 0.05, 0.05, '#5a3a1a', 0.35, y, 0.02));
    const nail = box(0.015, 0.015, 0.06, '#9a9a9a', 0, 0, 0, { metal: 0.8 }); nail.position.set(-0.04, 0.55, -3.0); W.nail = nail;
    W.hatch.position.set(3.97, 0.05, -2.95); W.hatch.rotation.y = -Math.PI / 2; b.add(W.hatch); W.hatchOpen = a => { W.hatch.rotation.y = -Math.PI / 2 + a; };
    W.apron = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.35), new THREE.MeshStandardMaterial({ color: '#2a2a30', side: THREE.DoubleSide, roughness: 0.9 })); W.apron.visible = false; b.add(W.apron); }
  // Jorge's laundry, through the hatch (x 4..7)
  { const lw = new THREE.Group(); b.add(lw); W.laundry = lw;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.4), mat('#8a9aa8')); fl.rotation.x = -Math.PI / 2; fl.position.set(5.5, 0.002, -3.2); lw.add(fl);
    for (const [w, x, z, ry] of [[3, 5.5, -4.9, 0], [3, 5.5, -1.5, Math.PI], [3.4, 7, -3.2, -Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, BH), mat('#b8c8c0')); p.position.set(x, BH / 2, z); p.rotation.y = ry; lw.add(p); }
    lw.add(box(0.6, 0.85, 0.6, '#f2f2f0', 6.5, 0, -4.4)); const port = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), mat('#3a4a5a', { rough: 0.1, metal: 0.4 })); port.position.set(6.5, 0.5, -4.09); lw.add(port);
    W.calendar = panel(0.5, 0.6, 256, (g, w, h) => { g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302c'; g.fillRect(0, 0, w, 50); text(g, 'CALENDÁRIO', w / 2, 26, '700 28px Oswald', '#fff'); for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) text(g, String(r * 7 + c + 1), 22 + c * 34, 80 + r * 46, '700 20px Oswald', '#333'); g.strokeStyle = '#d01818'; g.lineWidth = 5; for (const r of [0, 1, 2]) { g.beginPath(); g.arc(22 + 5 * 34, 80 + r * 46, 17, 0, 7); g.stroke(); } });
    W.calendar.position.set(5.2, 1.6, -4.88); lw.add(W.calendar);
    W.keyCopy = new THREE.Group(); W.keyCopy.add(box(0.012, 0.07, 0.004, '#e2bc4a', 0, 0, 0, { metal: 0.8 })); const kr = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), mat('#e2bc4a', { metal: 0.8 })); kr.position.y = 0.085; W.keyCopy.add(kr); W.keyCopy.position.set(5.75, 1.45, -4.87); lw.add(W.keyCopy);
    const tag = panel(0.16, 0.06, 128, (g, w, h) => { g.fillStyle = '#fff4c8'; g.fillRect(0, 0, w, h); text(g, 'LUZ DO BAR', w / 2, h / 2 + 2, '700 18px Oswald', '#c8302c'); }); tag.position.set(5.75, 1.36, -4.865); lw.add(tag);
    lw.add(box(0.6, 0.03, 0.25, '#6a4426', 4.8, 1.1, -4.75)); W.notebook = box(0.18, 0.025, 0.24, '#2c5fae', 4.8, 1.13, -4.72); lw.add(W.notebook);
    const rope = box(2.6, 0.01, 0.01, '#ddd', 5.6, 2.2, -3.0); lw.add(rope); for (const [x, c] of [[4.8, '#e0a326'], [5.4, '#4a6b8a'], [6.1, '#f4f2ec']]) { const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide })); cl.position.set(x, 1.92, -3.0); lw.add(cl); }
    W.pudim = []; for (const x of [6.2, 6.42]) { const f = cyl(0.1, 0.09, 0.08, '#c9ccd1', x, 0.85, -4.4, { metal: 0.8, rough: 0.3 }); lw.add(f); W.pudim.push(f); }
    W.laundryLight = L(new THREE.PointLight('#cfe0ff', 3, 5, 1.5), lw); W.laundryLight.position.set(5.5, 2.6, -3.2); }
  // the blackout: every light down to a breath of moonlight
  W.power = on => { W.lights.forEach(([l, i]) => { l.intensity = on ? i : 0; }); W.hemi.intensity = on ? 0.55 : 0.04; W.lampUnder.material.color.set(on ? '#fff2c8' : '#111111'); W.freezerGlass.material.emissiveIntensity = on ? 0.55 : 0; W.signOn(on); };
  W.headlamp = new THREE.SpotLight('#fff8e0', 0, 6, 0.4, 0.4, 1.2); b.add(W.headlamp, W.headlamp.target);
  W.lantern = new THREE.PointLight('#ffd08a', 0, 7, 1.4); b.add(W.lantern); W.lanternMesh = new THREE.Group(); W.lanternMesh.add(cyl(0.06, 0.07, 0.18, '#3a5a3a', 0, 0, 0), cyl(0.045, 0.045, 0.1, null, 0, 0.05, 0, { mat: new THREE.MeshBasicMaterial({ color: '#ffe0a0' }) })); b.add(W.lanternMesh); W.lanternMesh.visible = false;

  // ================= the street outside =================
  const r = add('rua'); W.street = r;
  { r.add(box(40, 0.02, 12, '#2a2b30', 0, -0.02, 8)); const walk = panel(40, 3, 512, (g, w, h) => { g.fillStyle = '#8a857a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6a655a'; g.lineWidth = 3; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, { repeat: [12, 1] }); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 0.5); r.add(walk);
    r.add(box(40, 0.14, 0.2, '#9a958a', 0, -0.02, 2.0));
    const fac = S.wallWithHoles(9, 3.6, [{ x: 0.8, y: 0.9, w: 2.6, h: 1.5 }, { x: -2.4, y: 0, w: 1.0, h: 2.1 }], '#7a2e2a', 0.2); fac.position.set(0, 0, -1); r.add(fac);
    r.add(box(5, 3.2, 0.2, '#d8cdb8', -7, 0, -1.2), box(5, 3.6, 0.2, '#b8c4c8', 7, 0, -1.2));   // the neighbours: Jorge's house on the right
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ color: '#c88a4a' })); inside.position.set(0.8, 1.65, -1.2); r.add(inside); W.streetWindow = inside;
    W.streetDoor = box(1.0, 2.08, 0.06, '#3a2414', -2.4, 0, -1.15); r.add(W.streetDoor);
    W.streetSign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: W.signTx, transparent: true })); W.streetSign.position.set(0.8, 2.15, -0.86); r.add(W.streetSign);
    W.sky = new THREE.Mesh(new THREE.PlaneGeometry(90, 30), new THREE.MeshBasicMaterial({ color: '#0c1430' })); W.sky.position.set(0, 10, -12); r.add(W.sky);
    W.streetHemi = new THREE.HemisphereLight('#5a6fa8', '#1a1a22', 0.8); r.add(W.streetHemi); W.sun = new THREE.DirectionalLight('#fff2d8', 0); W.sun.position.set(-6, 10, 8); W.sun.castShadow = true; W.sun.shadow.mapSize.set(1024, 1024); r.add(W.sun);
    W.streetRed = new THREE.PointLight('#ff3030', 4, 6, 1.4); W.streetRed.position.set(0.8, 2.0, 0.4); r.add(W.streetRed);
    W.streetGlow = new THREE.PointLight('#ffb35a', 6, 7, 1.4); W.streetGlow.position.set(0.8, 1.6, 1.2); r.add(W.streetGlow);
    W.streetLamp = new THREE.PointLight('#ffd9a0', 8, 10, 1.5); W.streetLamp.position.set(-5, 4.0, 1.6); r.add(W.streetLamp); r.add(box(0.1, 4.2, 0.1, '#333', -5.4, 0, 1.6));
    // the police car (part 5): white with a blue and red bar
    W.police = new THREE.Group(); W.police.add(box(3.8, 0.6, 1.7, '#f2f2f2', 0, 0.25, 0, { rough: 0.3, metal: 0.3 }), box(2.1, 0.55, 1.5, '#2a2a30', -0.2, 0.85, 0)); W.police.add(box(3.82, 0.12, 1.72, '#1a3a8a', 0, 0.5, 0));
    for (const [x, z] of [[-1.3, 0.85], [1.3, 0.85], [-1.3, -0.85], [1.3, -0.85]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 14), mat('#111')); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.32, z); W.police.add(wh); }
    W.siren = [new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.6), new THREE.MeshBasicMaterial({ color: '#2050ff' })), new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.6), new THREE.MeshBasicMaterial({ color: '#ff2020' }))]; W.siren[0].position.set(-0.2, 1.18, -0.32); W.siren[1].position.set(-0.2, 1.18, 0.32); W.police.add(...W.siren);
    W.sirenL = [new THREE.PointLight('#2050ff', 0, 9, 1.4), new THREE.PointLight('#ff2020', 0, 9, 1.4)]; W.sirenL[0].position.set(-0.2, 1.6, -0.6); W.sirenL[1].position.set(-0.2, 1.6, 0.6); W.police.add(...W.sirenL);
    W.police.position.set(3.5, 0, 3.6); r.add(W.police);
    W.streetAt = (t, { day = false, police = false } = {}) => { W.sky.material.color.set(day ? '#9fcfff' : '#0c1430'); W.sun.intensity = day ? 2.6 : 0; W.streetHemi.intensity = day ? 1.6 : 0.8; W.streetLamp.intensity = day ? 0 : 8; W.streetWindow.material.color.set(day ? '#6a4a3a' : '#ffb35a'); W.streetGlow.intensity = day ? 0 : 6;
      const blink = day || Math.sin(t * 7) > -0.3; neonSign(W.signTx.userData.g, 1024, 256, blink); W.signTx.needsUpdate = true; W.streetRed.intensity = blink && !day ? 4 : 0;
      W.police.visible = police; const a = Math.sin(t * 12) > 0; W.sirenL[0].intensity = police && a ? 14 : 0; W.sirenL[1].intensity = police && !a ? 14 : 0; W.siren[0].material.color.set(a ? '#4070ff' : '#101a40'); W.siren[1].material.color.set(a ? '#401010' : '#ff3030'); }; }
  return W;
}
