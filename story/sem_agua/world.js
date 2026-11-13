// world.js: "Sem Água". One boteco: the bar room (yellow metal tables, green tiles, the counter, a wall clock, a fan, a TV),
// the corridor at the back (beer crates, one bulb) and the tiny bathroom (the toilet with a lever, a dry tap, a bucket),
// all in one group 'bar' so one continuous walk works; and the street outside at night ('street').
import * as S from '../engine/stage.js';
import { Toon, FACE } from './toon.js';
const { THREE, clamp, lerp, ease, rng, box, door, mat } = S;

export function canvasTex(wd, ht) { const cv = document.createElement('canvas'); cv.width = wd; cv.height = ht; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { cv, g: cv.getContext('2d'), tx }; }
function softTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') { const { g, tx } = canvasTex(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tx; }
export const SOFT = softTex();
// a textured plane: draw(g, w, h) paints it
function panel(w, h, px, draw, o = {}) { const ct = canvasTex(px, Math.round(px * h / w)); draw(ct.g, px, Math.round(px * h / w)); if (o.repeat) { ct.tx.wrapS = ct.tx.wrapT = THREE.RepeatWrapping; ct.tx.repeat.set(...o.repeat); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.basic ? new THREE.MeshBasicMaterial({ map: ct.tx, transparent: !!o.transparent }) : new THREE.MeshStandardMaterial({ map: ct.tx, roughness: o.rough ?? 0.8, transparent: !!o.transparent, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? ct.tx : null, emissiveIntensity: o.glow || 0 }));
  m.receiveShadow = true; m.userData.ct = ct; return m; }
const tiles = (col, grout, n = 8, deco) => (g, w, h) => { g.fillStyle = grout; g.fillRect(0, 0, w, h); const s = w / n; for (let y = 0; y < h / s; y++) for (let x = 0; x < n; x++) { g.fillStyle = col; g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x * s + 4, y * s + 4, s - 8, 5); if (deco && (x + y) % 2 === 0) deco(g, x * s + s / 2, y * s + s / 2, s); } };
function wallTiles(w, h, col, grout, n, deco) { return panel(w, h, 512, tiles(col, grout, 8, deco), { repeat: [w / (8 * 0.15), h / (8 * 0.15)] }); }
function text(g, s, x, y, font, col, o = {}) { g.font = font; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeColor || '#111'; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y); }
// the unisex sign: a man and a woman pictogram
export function drawUnisex(g, x, y, s, col = '#1d2a3a') { g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
  const man = x - s * 0.55, wom = x + s * 0.55;
  g.beginPath(); g.arc(man, y - s * 0.95, s * 0.2, 0, 7); g.arc(wom, y - s * 0.95, s * 0.2, 0, 7); g.fill();
  g.fillRect(man - s * 0.25, y - s * 0.68, s * 0.5, s * 0.75); g.fillRect(man - s * 0.2, y + s * 0.05, s * 0.15, s * 0.75); g.fillRect(man + s * 0.05, y + s * 0.05, s * 0.15, s * 0.75);
  g.beginPath(); g.moveTo(wom - s * 0.16, y - s * 0.68); g.lineTo(wom + s * 0.16, y - s * 0.68); g.lineTo(wom + s * 0.36, y + s * 0.25); g.lineTo(wom - s * 0.36, y + s * 0.25); g.fill(); g.fillRect(wom - s * 0.15, y + s * 0.2, s * 0.12, s * 0.6); g.fillRect(wom + s * 0.03, y + s * 0.2, s * 0.12, s * 0.6);
  g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(x, y - s * 1.2); g.lineTo(x, y + s * 0.85); g.stroke(); }

export function buildWorld(stage) {
  const { scene, sets } = stage;
  const W = { sets };
  // ---------- people ----------
  W.hero = new Toon({ height: 1.74, glasses: true, skin: '#e3ae88', hair: '#3a2618', shirt: '#e0a326', pants: '#2b3b5e', shoes: '#f2f0ea' });
  W.beto = new Toon({ height: 1.86, hairStyle: 'bald', hair: '#2b1d14', beard: '#2b1d14', skin: '#c98b62', shirt: '#b8322a', pants: '#3b3b40', shoes: '#3a2a20', soleColor: '#2a2a2a' });
  W.carla = new Toon({ height: 1.64, hairStyle: 'curly', hair: '#20140e', skin: '#8d5a3b', shirt: '#2e8a5a', pants: '#2a2a33', shoes: '#c94f6d', iris: '#2a1608' });
  W.ze = new Toon({ height: 1.72, hairStyle: 'cap', capColor: '#2c5fae', hair: '#1a1a1a', skin: '#f0c4a0', shirt: '#eae6dc', pants: '#5a4a3a', shoes: '#222', soleColor: '#ddd' });
  W.lady = new Toon({ height: 1.66, hairStyle: 'pony', hair: '#16100c', skin: '#d39a72', shirt: '#7c4fb0', pants: '#24242c', shoes: '#1d1d1d', soleColor: '#333', iris: '#3a2210' });
  W.waiter = new Toon({ height: 1.78, hairStyle: 'short', hair: '#111', skin: '#a8714d', shirt: '#f4f2ee', apron: '#1c1c1c', pants: '#1c1c1c', shoes: '#111', soleColor: '#222' });
  W.extras = [
    new Toon({ height: 1.7, hairStyle: 'short', hair: '#5a3b22', skin: '#e8b994', shirt: '#4a6b8a', pants: '#333' }),
    new Toon({ height: 1.6, hairStyle: 'pony', hair: '#8a4b20', skin: '#f2c8a8', shirt: '#d4567a', pants: '#333' }),
    new Toon({ height: 1.8, hairStyle: 'bald', hair: '#222', beard: '#444', skin: '#6e4630', shirt: '#e3d36b', pants: '#333' }),
    new Toon({ height: 1.7, hairStyle: 'cap', capColor: '#e05a2b', hair: '#111', skin: '#c7906a', shirt: '#2e2e2e', pants: '#555' }),
  ];
  W.people = [W.hero, W.beto, W.carla, W.ze, W.lady, W.waiter, ...W.extras];
  W.put = (who, x, z, ry, pose, face, look, blink = 0, extra) => { who.root.position.set(x, 0, z); who.root.rotation.y = ry; who.root.visible = true; who.pose(pose || {}); if (face) who.expr(face, look || [0, 0], blink, extra); return who; };
  W.hideAll = () => W.people.forEach(p => p.root.visible = false);

  // ================= the bar =================
  const bar = new THREE.Group(); sets.bar = bar; scene.add(bar);
  W.people.forEach(p => bar.add(p.root));
  const BW = 9, BD = 8, BH = 3.2;
  // floor: red and cream ceramic squares
  const floor = panel(BW, BD, 512, (g, w, h) => { const n = 8, s = w / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#9b3b2c' : '#d9c7a4'; g.fillRect(x * s, y * s, s, s); } g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, h); g.moveTo(0, k * s); g.lineTo(w, k * s); g.stroke(); } }, { repeat: [BW / 2.4, BD / 2.4], rough: 0.5 });
  floor.rotation.x = -Math.PI / 2; bar.add(floor);
  const ceil = box(BW, 0.05, BD, '#e9dfc8', 0, BH, 0); ceil.castShadow = false; bar.add(ceil);
  // walls: green tiles up to 1.3 m, warm cream paint above
  const WALL = '#e8c77a';
  const wallSeg = (w, x, z, ry) => { const g = new THREE.Group(); const up = new THREE.Mesh(new THREE.PlaneGeometry(w, BH - 1.3), mat(WALL)); up.position.y = 1.3 + (BH - 1.3) / 2; up.receiveShadow = true; g.add(up);
    const lo = wallTiles(w, 1.3, '#3f8f6b', '#e8e2d2'); lo.position.y = 0.65; g.add(lo); const trim = box(w, 0.05, 0.03, '#2a5c45', 0, 1.28, 0.01); g.add(trim); g.position.set(x, 0, z); g.rotation.y = ry; bar.add(g); return g; };
  // back wall (z = -4) with the corridor opening at x 2.8..4.0
  wallSeg(7.3, -0.85, -BD / 2, 0); wallSeg(0.5, 4.25, -BD / 2, 0);
  { const lintel = box(1.2, BH - 2.3, 0.1, WALL, 3.4, 2.3, -BD / 2); bar.add(lintel); }
  wallSeg(BD, -BW / 2, 0, Math.PI / 2); wallSeg(BD, BW / 2, 0, -Math.PI / 2); wallSeg(BW, 0, BD / 2, Math.PI);
  // the sign over the corridor: BANHEIRO ->
  const bsign = panel(0.9, 0.22, 512, (g, w, h) => { g.fillStyle = '#1d1d1d'; g.fillRect(0, 0, w, h); text(g, 'BANHEIRO →', w / 2, h / 2 + 4, '700 74px Oswald', '#ffd34d'); }, { glow: 0.6 }); bsign.position.set(3.4, 2.5, -BD / 2 + 0.07); bar.add(bsign);
  // the name painted on the wall above the counter
  const name = panel(3.6, 0.6, 1024, (g, w, h) => { text(g, 'BOTECO DO TONHO', w / 2, h / 2, '700 150px Oswald', '#b23a22'); }, { transparent: true }); name.position.set(-BW / 2 + 0.07, 2.55, -0.6); name.rotation.y = Math.PI / 2; bar.add(name);
  // the counter on the left, shelves of bottles behind it, stools
  const counter = new THREE.Group(); bar.add(counter);
  counter.add(box(0.7, 1.05, 4.4, '#7a4a2c', -3.55, 0, -0.6), box(0.82, 0.06, 4.5, '#3b2a20', -3.55, 1.05, -0.6));
  counter.add(box(0.05, 1.0, 4.3, '#3f8f6b', -3.19, 0.02, -0.6, { cast: false }));
  for (let k = 0; k < 3; k++) counter.add(box(0.3, 0.04, 4.0, '#5b3a24', -4.33, 1.45 + k * 0.42, -0.6));
  const R = rng(11), bottleCols = ['#6b3a12', '#2f5a2a', '#8a6a2a', '#c9c4b0', '#7a1f1f', '#3a2a12'];
  for (let k = 0; k < 3; k++) for (let i = 0; i < 14; i++) { const col = bottleCols[Math.floor(R() * 6)], hgt = 0.22 + R() * 0.12; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, hgt, 8), mat(col, { rough: 0.2, metal: 0.1 })); b.position.set(-4.33, 1.47 + k * 0.42 + hgt / 2, -2.4 + i * 0.27 + R() * 0.05); counter.add(b); }
  for (let i = 0; i < 4; i++) { const st = new THREE.Group(); st.add(box(0.06, 0.72, 0.06, '#666', 0, 0, 0, { metal: 0.6 })); const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 16), mat('#b8322a', { rough: 0.5 })); seat.position.y = 0.75; seat.castShadow = true; st.add(seat); st.position.set(-2.95, 0, -2.2 + i * 1.0); counter.add(st); }
  // the fridge with a glass door, glowing
  { const fr = box(0.8, 1.9, 0.7, '#d8d8d8', -3.4, 0, -3.5); bar.add(fr); const gl = panel(0.66, 1.6, 256, (g, w, h) => { g.fillStyle = '#cfe8ff'; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#6b3a12' : '#7a4a1a'; g.fillRect(14 + i * 40, 30 + r * 150, 26, 110); } }, { glow: 0.9 }); gl.position.set(-3.4, 1.0, -3.14); bar.add(gl); }
  // the TV high on the right wall: a green football pitch
  { const tv = box(1.0, 0.6, 0.08, '#111', BW / 2 - 0.1, 2.15, -1.8); tv.rotation.y = -Math.PI / 2; bar.add(tv); const scr = panel(0.92, 0.52, 256, (g, w, h) => { g.fillStyle = '#2f8a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e9f5e9'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20); g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 22, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.62, h * 0.4, 4, 0, 7); g.fill(); }, { glow: 1.2 }); scr.position.set(BW / 2 - 0.15, 2.45, -1.8); scr.rotation.y = -Math.PI / 2; bar.add(scr); }
  // the wall clock on the back wall (hands set per shot)
  W.clock = new THREE.Group(); { const face = panel(0.5, 0.5, 256, (g, w, h) => { g.fillStyle = '#f7f3e8'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = '#b8322a'; g.stroke(); g.fillStyle = '#222'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.save(); g.translate(w / 2 + Math.sin(a) * 100, h / 2 - Math.cos(a) * 100); g.rotate(a); g.fillRect(-3, -10, 6, k % 3 ? 14 : 24); g.restore(); } }, { transparent: true, rough: 0.5 }); W.clock.add(face);
    const hand = (len, wd, col, z) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.01), mat(col)); m.position.y = len / 2 - 0.02; p.add(m); p.position.z = z; W.clock.add(p); return p; };
    W.clockH = hand(0.13, 0.025, '#111', 0.01); W.clockM = hand(0.2, 0.016, '#111', 0.02); W.clockS = hand(0.21, 0.006, '#c8372d', 0.03);
    W.clock.position.set(-0.6, 2.35, -BD / 2 + 0.03); bar.add(W.clock); }
  W.setClock = mins => { const h = 21 + mins / 60; W.clockH.rotation.z = -(h % 12) / 12 * Math.PI * 2; W.clockM.rotation.z = -(mins % 60) / 60 * Math.PI * 2; W.clockS.rotation.z = -((mins * 60) % 60) / 60 * Math.PI * 2; };
  // posters on the walls
  for (const [x, z, ry, c1, s1] of [[-1.8, -BD / 2 + 0.02, 0, '#e2b13c', 'SAMBA\nSÁBADO'], [BW / 2 - 0.02, 1.2, -Math.PI / 2, '#3a7bd5', 'PORÇÃO\nR$ 29'], [1.2, -BD / 2 + 0.02, 0, '#d4567a', 'GELADA\nDE VERDADE']]) {
    const p = panel(0.6, 0.8, 256, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(10, 10, w - 20, h - 20); s1.split('\n').forEach((l, i) => text(g, l, w / 2, h * 0.38 + i * 80, '700 58px Oswald', '#fff', { stroke: 6 })); }); p.position.set(x, 1.95, z); p.rotation.y = ry; bar.add(p); }
  // tables: yellow metal, plastic chairs
  const table = (x, z) => { const g = new THREE.Group(); g.add(box(0.8, 0.04, 0.8, '#f2c230', 0, 0.72, 0, { rough: 0.45, metal: 0.3 })); for (const [dx, dz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) g.add(box(0.03, 0.72, 0.03, '#d9a91f', dx, 0, dz, { metal: 0.4 })); g.position.set(x, 0, z); bar.add(g); return g; };
  const chair = (x, z, ry, col = '#f4f4f0') => { const g = new THREE.Group(); g.add(box(0.44, 0.04, 0.42, col, 0, 0.44, 0, { rough: 0.4 }), box(0.44, 0.42, 0.04, col, 0, 0.46, -0.2, { rough: 0.4 })); for (const [dx, dz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) g.add(box(0.03, 0.44, 0.03, col, dx, 0, dz)); g.position.set(x, 0, z); g.rotation.y = ry; bar.add(g); return g; };
  // the friends' table: hero on the far side facing +z (towards the camera side), Beto on the left, Carla on the right, Zé with his back to us
  const T = W.T = [0.6, 0.3]; table(...T);
  W.seat = { hero: [T[0], T[1] - 0.58, 0], beto: [T[0] - 0.6, T[1], Math.PI / 2], carla: [T[0] + 0.6, T[1], -Math.PI / 2], ze: [T[0], T[1] + 0.6, Math.PI] };
  W.heroChair = chair(T[0], T[1] - 0.62, 0); chair(T[0] - 0.64, T[1], Math.PI / 2); chair(T[0] + 0.64, T[1], -Math.PI / 2); chair(T[0], T[1] + 0.64, Math.PI);
  // background tables with patrons
  W.bgTables = [[-1.6, -1.8], [2.6, 2.2], [-1.4, 2.4], [3.3, 0.6]];
  W.bgTables.forEach(([x, z], i) => { table(x, z); chair(x - 0.6, z, Math.PI / 2, i % 2 ? '#e8524a' : '#f4f4f0'); chair(x + 0.6, z, -Math.PI / 2, i % 2 ? '#e8524a' : '#f4f4f0'); });
  // beer: 600 ml amber bottles, copo americano (a ribbed glass) with beer and foam
  const glassM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 });
  const beerM = new THREE.MeshStandardMaterial({ color: '#f0a020', emissive: '#7a4a00', emissiveIntensity: 0.35, roughness: 0.2, transparent: true, opacity: 0.92 });
  const bottle = (x, y, z) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.2, 14), mat('#5a2a08', { rough: 0.15, metal: 0.2 })); b.position.y = 0.1; g.add(b);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.038, 0.06, 14), mat('#5a2a08', { rough: 0.15, metal: 0.2 })); sh.position.y = 0.23; g.add(sh); const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 10), mat('#5a2a08', { rough: 0.15 })); nk.position.y = 0.29; g.add(nk);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0405, 0.0405, 0.07, 14, 1, true), mat('#efe6cf')); lab.position.y = 0.1; g.add(lab); g.position.set(x, y, z); g.traverse(o => o.castShadow = true); return g; };
  const copo = (x, y, z, level = 0.8) => { const g = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.1, 12, 1, true), glassM); gl.position.y = 0.05; g.add(gl);
    const be = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.028, 0.09 * level, 12), beerM); be.position.y = 0.045 * level + 0.004; g.add(be); const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.033, 0.015, 12), mat('#fbf6e8')); fo.position.y = 0.09 * level + 0.01; g.add(fo); g.position.set(x, y, z); g.userData.beer = be; return g; };
  W.copo = copo; W.bottle = bottle;
  const TY = 0.74;
  bar.add(bottle(T[0] - 0.05, TY, T[1] + 0.05), bottle(T[0] + 0.12, TY, T[1] - 0.1));
  W.glasses = { hero: copo(T[0], TY, T[1] - 0.28), beto: copo(T[0] - 0.28, TY, T[1]), carla: copo(T[0] + 0.28, TY, T[1]), ze: copo(T[0], TY, T[1] + 0.28) };
  Object.values(W.glasses).forEach(g => bar.add(g));
  { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.025, 18), mat('#f7f4ee', { rough: 0.4 })); pl.position.set(T[0] - 0.15, TY + 0.012, T[1] + 0.15); bar.add(pl); const R2 = rng(4); for (let i = 0; i < 16; i++) { const f = box(0.012, 0.012, 0.07, '#e9b84a', T[0] - 0.15 + (R2() - 0.5) * 0.16, TY + 0.025 + R2() * 0.02, T[1] + 0.15 + (R2() - 0.5) * 0.16); f.rotation.y = R2() * 3; bar.add(f); } }
  W.bgTables.forEach(([x, z]) => { bar.add(bottle(x, TY, z), copo(x - 0.2, TY, z + 0.1), copo(x + 0.2, TY, z - 0.1)); });
  // ceiling fan
  W.fan = new THREE.Group(); { W.fan.add(box(0.03, 0.4, 0.03, '#444', 0, -0.4, 0)); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), mat('#666', { metal: 0.5 })); hub.position.y = -0.4; W.fan.add(hub); W.fanBlades = new THREE.Group(); W.fanBlades.position.y = -0.4; for (let k = 0; k < 3; k++) { const b = box(0.62, 0.012, 0.13, '#6b4a2a', 0.38, 0, 0); const p = new THREE.Group(); p.rotation.y = k * Math.PI * 2 / 3; p.add(b); W.fanBlades.add(p); } W.fan.add(W.fanBlades); W.fan.position.set(T[0], BH, T[1] - 0.2); bar.add(W.fan); }
  // lights: one warm pendant over the friends' table (the key, with shadows), warm bulbs around, a cold strip over the counter
  W.barHemi = new THREE.HemisphereLight('#ffe2b0', '#5a3a26', 0.85); bar.add(W.barHemi);
  const pend = new THREE.Group(); { const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 16, 1, true), mat('#2f6b4f', { rough: 0.5 })); shade.position.y = 0.05; pend.add(shade); pend.add(box(0.01, 0.9, 0.01, '#222', 0, 0.1, 0)); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe4b0' })); pend.add(bulb); pend.position.set(T[0], 2.05, T[1]); bar.add(pend); }
  W.key = new THREE.SpotLight('#ffc77a', 7, 7, 1.0, 0.7, 1.3); W.key.position.set(T[0], 2.0, T[1]); W.key.target.position.set(T[0], 0, T[1]); W.key.castShadow = true; W.key.shadow.mapSize.set(1024, 1024); W.key.shadow.bias = -0.0015; bar.add(W.key, W.key.target);
  for (const [x, z] of [[-1.6, -1.8], [2.6, 2.2], [-1.4, 2.4], [3.3, 0.6]]) { const L = new THREE.PointLight('#ffb766', 3.2, 4.5, 1.5); L.position.set(x, 2.3, z); bar.add(L); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); b.position.copy(L.position); bar.add(b); bar.add(box(0.01, BH - 2.36, 0.01, '#222', x, 2.36, z)); }
  { const strip = box(0.08, 0.04, 2.6, '#ffffff', -3.4, 2.9, -0.6, { emissive: '#e9fff6', glow: 2 }); bar.add(strip); const L = new THREE.RectAreaLight ? null : null; const fl = new THREE.PointLight('#d6fff0', 2.2, 5, 1.4); fl.position.set(-3.2, 2.7, -0.6); bar.add(fl); }
  // string of little bulbs across the ceiling
  for (let i = 0; i < 18; i++) { const x = -4 + i * 0.47, y = 2.95 - 0.18 * Math.sin(i / 17 * Math.PI); const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: ['#ffcf6b', '#ff8a5b', '#8fe0a0', '#ffe9a8'][i % 4] })); b.position.set(x, y, 1.6); bar.add(b); }

  // ================= the corridor (x 2.8..4.0, z -4..-11) =================
  const CX0 = 2.8, CX1 = 4.6, CZ0 = -4, CZ1 = -11.2, CH = 2.6;
  { const fl = panel(1.8, 7.2, 256, tiles('#b9b2a2', '#7d766a', 6), { repeat: [1.5, 6] }); fl.rotation.x = -Math.PI / 2; fl.position.set(3.7, 0.002, (CZ0 + CZ1) / 2); bar.add(fl);
    const c = box(1.9, 0.05, 7.2, '#cfc6b2', 3.7, CH, (CZ0 + CZ1) / 2); c.castShadow = false; bar.add(c);
    // right wall (x = 4.0), full length
    const rw = new THREE.Group(); const up = new THREE.Mesh(new THREE.PlaneGeometry(7.2, CH - 1.3), mat('#d9c08a')); up.position.y = 1.3 + (CH - 1.3) / 2; rw.add(up); const lo = wallTiles(7.2, 1.3, '#3f8f6b', '#e8e2d2'); lo.position.y = 0.65; rw.add(lo); rw.rotation.y = -Math.PI / 2; rw.position.set(CX1, 0, (CZ0 + CZ1) / 2); bar.add(rw);
    // left wall (x = 2.8) with the bathroom door hole at z -10 (w 0.8)
    const lw = S.wallWithHoles(7.2, CH, [{ x: -(-10 - (CZ0 + CZ1) / 2), y: 0, w: 0.82, h: 2.05 }], '#d9c08a', 0.1); lw.rotation.y = Math.PI / 2; lw.position.set(CX0, 0, (CZ0 + CZ1) / 2); bar.add(lw);
    const lt = wallTiles(7.2, 1.3, '#3f8f6b', '#e8e2d2'); lt.rotation.y = Math.PI / 2; lt.position.set(CX0 + 0.055, 0.65, (CZ0 + CZ1) / 2); lt.scale.x = 1; bar.add(lt);
    // the tiles on the left wall must not cover the door: a dark panel trick is avoided by splitting the tile strip
    lt.visible = false; { const a = wallTiles(5.3, 1.3, '#3f8f6b', '#e8e2d2'); a.rotation.y = Math.PI / 2; a.position.set(CX0 + 0.055, 0.65, -6.85); bar.add(a); }
    const endw = box(1.9, CH, 0.1, '#d9c08a', 3.7, 0, CZ1); bar.add(endw);
    // beer crates stacked against the right wall, a mop and its bucket
    const crate = (x, y, z, col) => { const g = box(0.4, 0.28, 0.32, col, x, y, z, { rough: 0.6 }); bar.add(g); for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), mat('#4a2208', { rough: 0.2 })); b.position.set(x - 0.13 + (i % 3) * 0.13, y + 0.32, z - 0.08 + Math.floor(i / 3) * 0.16); bar.add(b); } };
    for (let k = 0; k < 4; k++) crate(4.35, k * 0.29, -5.4, k % 2 ? '#d9a91f' : '#c8372d'); for (let k = 0; k < 3; k++) crate(4.35, k * 0.29, -5.85, k % 2 ? '#c8372d' : '#d9a91f');
    for (let k = 0; k < 2; k++) crate(4.35, k * 0.29, -7.4, '#2c5fae');
    const mopB = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 14), mat('#e2c23a', { rough: 0.5 })); mopB.position.set(4.35, 0.15, -7.9); mopB.castShadow = true; bar.add(mopB); const mop = box(0.025, 1.3, 0.025, '#8a6a3a', 4.35, 0.1, -7.9); mop.rotation.z = 0.25; bar.add(mop);
    // a poster on the corridor wall
    const pst = panel(0.5, 0.7, 256, (g, w, h) => { g.fillStyle = '#e05a2b'; g.fillRect(0, 0, w, h); text(g, 'PAGODE', w / 2, h * 0.35, '700 60px Oswald', '#fff', { stroke: 6 }); text(g, 'QUINTA', w / 2, h * 0.6, '700 50px Oswald', '#ffd34d', { stroke: 6 }); }); pst.rotation.y = -Math.PI / 2; pst.position.set(CX1 - 0.02, 1.75, -6.6); bar.add(pst);
    // one bulb in the corridor (it flickers), one by the door
    W.corBulb = new THREE.PointLight('#ffc77a', 4, 5, 1.6); W.corBulb.position.set(3.7, 2.4, -6.2); bar.add(W.corBulb); const cb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); cb.position.copy(W.corBulb.position); bar.add(cb); W.corBulbMesh = cb;
    W.doorLight = new THREE.PointLight('#ffd08a', 4, 4.5, 1.6); W.doorLight.position.set(3.7, 2.35, -9.4); bar.add(W.doorLight); const db = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); db.position.copy(W.doorLight.position); bar.add(db);
  }
  // the bathroom door (in the left corridor wall at z = -10, opening into the bathroom), the unisex sign on its corridor side
  W.bdoor = door({ w: 0.8, h: 2.03, color: '#5a7f9c', frame: '#3b4a56' }); W.bdoor.rotation.y = Math.PI / 2; W.bdoor.position.set(CX0, 0, -10); bar.add(W.bdoor);
  W.signOut = panel(0.34, 0.42, 256, (g, w, h) => { g.fillStyle = '#f4efe2'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1d2a3a'; g.stroke(); drawUnisex(g, w / 2, h * 0.5, 72); text(g, 'BANHEIRO', w / 2, h * 0.88, '700 34px Oswald', '#1d2a3a'); }, { rough: 0.5 });
  W.signOut.position.set(0, 0.5, 0.03);
  // and the same sign screwed to the wall beside the door, where you only see it on the way out
  W.signWall = panel(0.3, 0.37, 256, (g, w, h) => { g.fillStyle = '#f4efe2'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1d2a3a'; g.stroke(); drawUnisex(g, w / 2, h * 0.47, 70); text(g, 'UNISSEX', w / 2, h * 0.88, '700 36px Oswald', '#c8372d'); }, { rough: 0.5 });
  W.signWall.rotation.y = Math.PI / 2; W.signWall.position.set(2.86, 1.6, -9.3); bar.add(W.signWall); W.bdoor.userData.leaf.add(W.signOut);
  W.interditado = panel(0.42, 0.3, 256, (g, w, h) => { g.fillStyle = '#fbfbf6'; g.fillRect(0, 0, w, h); text(g, 'INTERDITADO', w / 2, h * 0.42, '700 44px Oswald', '#c8372d'); text(g, 'sem água', w / 2, h * 0.75, '700 30px Oswald', '#222'); g.fillStyle = 'rgba(230,220,170,0.8)'; g.fillRect(w * 0.35, 0, w * 0.3, 16); }, { rough: 0.9 });
  W.interditado.position.set(0.0, -0.4, 0.005); W.interditado.rotation.z = 0.06; W.signOut.add(W.interditado); W.interditado.visible = false;
  W.bdoor.userData.leaf.children.forEach(o => o.castShadow = true);

  // ================= the bathroom (x 1.0..2.8, z -11..-9) =================
  const bath = new THREE.Group(); bar.add(bath); W.bath = bath;
  { const fl = panel(1.8, 2.0, 256, tiles('#d8d4c8', '#8a8478', 6), { repeat: [1.5, 1.6] }); fl.rotation.x = -Math.PI / 2; fl.position.set(1.9, 0.003, -10); bath.add(fl);
        // three walls in their own groups: a wall the camera stands behind is lifted away (a film set's wild wall)
    W.wallW = new THREE.Group(); W.wallS = new THREE.Group(); W.wallN = new THREE.Group(); bath.add(W.wallW, W.wallS, W.wallN);
    const wallT = (grp, w, x, z, ry) => { const p = wallTiles(w, 2.6, '#cfe0d6', '#9aa59c'); p.position.set(x, 1.3, z); p.rotation.y = ry; grp.add(p); };
    wallT(W.wallW, 2.0, 1.0, -10, Math.PI / 2); wallT(W.wallS, 1.8, 1.9, -11.0, 0); wallT(W.wallN, 1.8, 1.9, -9.0, Math.PI);
    W.wallW.add(box(0.1, 2.6, 2.1, '#cfe0d6', 0.95, 0, -10)); W.wallS.add(box(1.9, 2.6, 0.1, '#cfe0d6', 1.9, 0, -11.05)); W.wallN.add(box(1.9, 2.6, 0.1, '#cfe0d6', 1.9, 0, -8.95));
    for (const [wd, z, y, hh] of [[0.59, -10.705, 1.3, 2.6], [0.59, -9.295, 1.3, 2.6], [0.84, -10, 2.33, 0.55]]) { const t2 = wallTiles(wd, hh, '#cfe0d6', '#9aa59c'); t2.rotation.y = -Math.PI / 2; t2.position.set(CX0 - 0.055, y, z); bath.add(t2); }
    const c = box(1.9, 0.05, 2.1, '#e8e4da', 1.9, 2.6, -10); c.castShadow = false; bath.add(c);
    // a stain and a crack: a cheap bathroom
    const st = panel(0.5, 0.35, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 40, 4, 64, 40, 60); gr.addColorStop(0, 'rgba(120,100,60,0.5)'); gr.addColorStop(1, 'rgba(120,100,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { transparent: true }); st.position.set(1.4, 2.3, -10.99); bath.add(st); }
  // the toilet against the inner wall (x = 1.0), facing +x; the tank with its lever on the front-left
  W.toilet = new THREE.Group(); { const por = mat('#f6f4ee', { rough: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.38, 18), por); base.position.y = 0.19; base.scale.z = 1.25; W.toilet.add(base);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.16, 0.08, 20), por); bowl.position.set(0.04, 0.4, 0); bowl.scale.set(1.25, 1, 1); W.toilet.add(bowl);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 22), mat('#ece8de', { rough: 0.35 })); seat.rotation.x = Math.PI / 2; seat.position.set(0.05, 0.45, 0); seat.scale.set(1.2, 1, 1); W.toilet.add(seat);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.44), por); tank.position.set(-0.17, 0.62, 0); W.toilet.add(tank);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.035, 0.47), por); lid.position.set(-0.17, 0.815, 0); W.toilet.add(lid);
    W.lever = new THREE.Group(); const lv = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.1), mat('#c9ccd1', { metal: 0.9, rough: 0.25 })); lv.position.z = 0.05; W.lever.add(lv); const lvb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), mat('#c9ccd1', { metal: 0.9, rough: 0.25 })); lvb.rotation.z = Math.PI / 2; W.lever.add(lvb);
    W.lever.position.set(-0.06, 0.74, -0.14); W.lever.rotation.y = Math.PI / 2; W.toilet.add(W.lever);
    W.toilet.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); W.toilet.position.set(1.32, 0, -10.35); bath.add(W.toilet); }
  // the sink on the back wall (z = -11) with a tap, a mirror above, the bucket on the floor next to it
  { const sink = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.16, 18), mat('#f6f4ee', { rough: 0.25 })); sink.position.set(2.15, 0.8, -10.82); sink.scale.z = 0.8; sink.castShadow = true; bath.add(sink);
    bath.add(box(0.08, 0.72, 0.08, '#e8e4da', 2.15, 0, -10.9));
    W.tap = new THREE.Group(); const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8), mat('#c9ccd1', { metal: 0.9, rough: 0.2 })); sp.rotation.x = Math.PI / 2; sp.position.set(0, 0.02, 0.06); W.tap.add(sp); const col = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8), mat('#c9ccd1', { metal: 0.9, rough: 0.2 })); col.position.y = -0.03; W.tap.add(col);
    W.tapHandle = new THREE.Group(); const hd = box(0.08, 0.02, 0.02, '#c9ccd1', 0, 0, 0, { metal: 0.9, rough: 0.2 }); hd.position.y = -0.01; W.tapHandle.add(hd); W.tapHandle.position.y = 0.03; W.tap.add(W.tapHandle);
    W.tap.position.set(2.15, 0.98, -10.93); bath.add(W.tap); W.spout = new THREE.Vector3(2.15, 0.99, -10.81);
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.55), new THREE.MeshStandardMaterial({ color: '#9fb4c0', roughness: 0.05, metalness: 0.9 })); mir.position.set(2.15, 1.55, -10.99); bath.add(mir); bath.add(box(0.5, 0.6, 0.01, '#3b4a56', 2.15, 1.27, -10.995, { cast: false }));
    // the bucket: a blue plastic bucket with a wire handle
    W.bucket = new THREE.Group(); const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#2f7fd0', roughness: 0.45, side: THREE.DoubleSide })); bk.position.y = 0.14; W.bucket.add(bk); const bot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), mat('#24609e')); bot.rotation.x = -Math.PI / 2; bot.position.y = 0.005; W.bucket.add(bot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24), mat('#3b8fe0')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.28; W.bucket.add(rim); const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.006, 6, 24, Math.PI), mat('#999', { metal: 0.7 })); hdl.position.y = 0.28; W.bucket.add(hdl); W.bucketHandle = hdl;
    W.bucket.traverse(o => { if (o.isMesh) o.castShadow = true; }); W.bucketHome = [2.55, 0, -10.7]; W.bucket.position.set(...W.bucketHome); bath.add(W.bucket);
    // a toilet paper roll on the wall (full: paper is not the problem)
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 14), mat('#fbfbf8')); tp.rotation.x = Math.PI / 2; tp.position.set(1.05, 0.75, -9.85); tp.rotation.z = Math.PI / 2; bath.add(tp); }
  // bathroom light: a bare bulb, slightly green; the heavenly spotlight for the bucket
  W.bathBulb = new THREE.PointLight('#f2f6d8', 5, 5, 1.5); W.bathBulb.position.set(1.9, 2.45, -10); W.bathBulb.castShadow = true; W.bathBulb.shadow.mapSize.set(512, 512); W.bathBulb.shadow.bias = -0.003; bath.add(W.bathBulb);
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: '#fbffe8' })); b.position.copy(W.bathBulb.position); bath.add(b); bath.add(box(0.01, 0.12, 0.01, '#222', 1.9, 2.48, -10)); }
  W.bathHemi = new THREE.HemisphereLight('#e8f2e0', '#6a6a5a', 0.55); bath.add(W.bathHemi);
  W.holy = new THREE.SpotLight('#fff6d8', 0, 4, 0.22, 0.4, 1.0); W.holy.position.set(2.55, 2.55, -10.7); W.holy.target.position.set(2.55, 0, -10.7); bath.add(W.holy, W.holy.target);
  W.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.32, 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); W.beam.position.set(2.55, 1.3, -10.7); bath.add(W.beam);
  W.sparkles = []; { const R3 = rng(23); for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: '#fff7c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.userData.q = [R3(), R3(), R3(), R3()]; bath.add(s); W.sparkles.push(s); } }
  W.holyOn = (t, k) => { W.holy.intensity = 7 * k; W.beam.material.opacity = 0.16 * k; W.sparkles.forEach(s => { const [a, b, c, d] = s.userData.q; s.material.opacity = k * (0.5 + 0.5 * Math.sin(t * 6 + a * 9)); const r = 0.05 + 0.25 * b; s.position.set(2.55 + Math.cos(c * 7 + t * 0.8) * r, 0.25 + ((d * 2.2 + t * 0.35) % 2.2), -10.7 + Math.sin(c * 7 + t * 0.8) * r); s.scale.setScalar(0.04 + 0.04 * a); }); };
  // the dry puff from the tap: a few grey sprites
  W.puff = []; { for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: '#d9d2c2', transparent: true, depthWrite: false, opacity: 0 })); bath.add(s); W.puff.push(s); } }
  W.puffAt = k => W.puff.forEach((s, i) => { const on = k > 0 && k < 1; s.visible = on; if (!on) return; const a = (i / 7 - 0.5) * 1.2; s.position.set(W.spout.x + Math.sin(a) * 0.05 * k * 2, W.spout.y - 0.02 - k * 0.06, W.spout.z + 0.03 + k * 0.12 + Math.cos(a) * 0.02); s.scale.setScalar(0.03 + 0.08 * k); s.material.opacity = 0.7 * (1 - k); });

  // ================= the street outside, at night =================
  const st = new THREE.Group(); sets.street = st; scene.add(st);
  { const road = box(30, 0.02, 10, '#26272c', 0, -0.02, 6); road.castShadow = false; st.add(road);
    const walk = panel(30, 3, 512, tiles('#8a8478', '#5d584f', 10), { repeat: [10, 1] }); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 0); st.add(walk);
    st.add(box(30, 0.12, 0.2, '#9a958a', 0, -0.02, 1.5));
    // the facade: the bar's front with a wide open roll-up door, warm light pouring out, the sign
    const fac = S.wallWithHoles(14, 4.2, [{ x: 0, y: 0, w: 3.0, h: 2.5 }, { x: 4.2, y: 1.0, w: 1.6, h: 1.2 }], '#e8c77a', 0.2); fac.position.set(0, 0, -1.5); st.add(fac);
    const tl = panel(14, 1.0, 512, tiles('#3f8f6b', '#e8e2d2', 8), { repeat: [14 / 1.2, 1] }); tl.position.set(0, 0.5, -1.38); st.add(tl);
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.5), new THREE.MeshBasicMaterial({ color: '#ffb35a' })); inside.position.set(0, 1.25, -2.4); st.add(inside);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: '#ffc77a' })); win.position.set(4.2, 1.6, -1.65); st.add(win);
    const roll = box(3.1, 0.3, 0.25, '#7a7f86', 0, 2.5, -1.42, { metal: 0.5 }); st.add(roll);
    const sign = panel(4.2, 0.8, 1024, (g, w, h) => { g.fillStyle = '#b23a22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2c230'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); text(g, 'BOTECO DO TONHO', w / 2, h / 2 + 6, '700 112px Oswald', '#fff3d0'); }, { glow: 0.8 }); sign.position.set(0, 3.25, -1.35); st.add(sign);
    W.streetDoorLight = new THREE.SpotLight('#ffb35a', 30, 9, 0.9, 0.6, 1.2); W.streetDoorLight.position.set(0, 2.2, -2.2); W.streetDoorLight.target.position.set(0, 0, 1.5); W.streetDoorLight.castShadow = true; W.streetDoorLight.shadow.mapSize.set(1024, 1024); st.add(W.streetDoorLight, W.streetDoorLight.target);
    // a street lamp, a parked car silhouette, a tree, the night sky
    const pole = box(0.1, 4.2, 0.1, '#333', 6.5, 0, 1.2); st.add(pole); st.add(box(0.8, 0.08, 0.1, '#333', 6.2, 4.15, 1.2)); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe7b8' })); lamp.position.set(5.85, 4.1, 1.2); st.add(lamp);
    const sl = new THREE.PointLight('#ffd9a0', 12, 10, 1.6); sl.position.set(5.85, 4.0, 1.2); st.add(sl);
    const car = new THREE.Group(); car.add(box(3.6, 0.7, 1.6, '#3a4a5c', 0, 0.25, 0, { rough: 0.3, metal: 0.4 }), box(2.0, 0.55, 1.45, '#2c3846', -0.2, 0.95, 0, { rough: 0.2, metal: 0.4 })); for (const [x, z] of [[-1.2, 0.8], [1.2, 0.8]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14), mat('#111')); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.3, z); car.add(wh); } car.position.set(-4.5, 0, 3.2); st.add(car);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ color: '#0d1530' })); sky.position.set(0, 10, -8); st.add(sky);
    const hemi = new THREE.HemisphereLight('#5a6fa8', '#1a1a22', 0.7); st.add(hemi);
    W.streetY = 0; }
  W.walker = new Toon({ height: 1.74, glasses: true, skin: '#e3ae88', hair: '#3a2618', shirt: '#e0a326', pants: '#2b3b5e', shoes: '#f2f0ea' }); st.add(W.walker.root);
  // the street needs its own copy of the hero (a mesh has one parent); same build, same clothes

  // ---------- helpers ----------
  W.blink = (t, seed = 0) => { const p = (t + seed * 1.7) % 3.7; return p < 0.12 ? Math.sin(p / 0.12 * Math.PI) : 0; };
  return W;
}
