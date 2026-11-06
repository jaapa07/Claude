// mundo.js: QUARTO 313. Room 313 of the Hotel Aurora (green damask, mustard bed, red phone, the clock, the gilded mirror
// with a mirror-chamber behind the glass, the rainy window, the fire escape, the pharmacy across the street), the
// corridor of identical doors, the reception, the street in the rain, Lia's workshop with the same mirror, a dark
// bathroom. Flat 2D stickmen and a 2D cat. The "mirror rule" (flipping whole shots) is done by the film page.
import * as S from '../../../engine/stage.js';
const { THREE, clamp, lerp, ease, rng, box, room, door, practical, wallWithHoles, Stickman, mat } = S;

export function canvasTex(wd, ht) { const cv = document.createElement('canvas'); cv.width = wd; cv.height = ht; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { cv, g: cv.getContext('2d'), tx }; }
function softTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); }
function lightGroup(group, { hemi = '#5d7bb3', ground = '#1b1a22', hemiI = 0.6, dir = '#7fe0a8', dirI = 0.35, dirPos = [3, 4, -6] } = {}) {
  const h = new THREE.HemisphereLight(hemi, ground, hemiI); group.add(h); const d = new THREE.DirectionalLight(dir, dirI); d.position.set(...dirPos); group.add(d); group.add(d.target); return { h, d };
}
function label(text, w, h, { bg = '#000', fg = '#fff', font = '700 60px Oswald', glow = false } = {}) {
  const t = canvasTex(512, Math.round(512 * h / w)); const g = t.g; g.fillStyle = bg; g.fillRect(0, 0, t.cv.width, t.cv.height); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (glow) { g.shadowColor = fg; g.shadowBlur = 24; } g.fillText(text, 256, t.cv.height / 2 + 4);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow ? new THREE.MeshBasicMaterial({ map: t.tx }) : new THREE.MeshStandardMaterial({ map: t.tx, roughness: 0.8 }));
}
function damask() { const t = canvasTex(256, 256), g = t.g; g.fillStyle = '#23402f'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#2d5038'; for (const [x, y] of [[64, 64], [192, 192], [192, 64], [64, 192]]) { g.beginPath(); g.ellipse(x, y, 26, 44, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, y, 44, 14, 0, 0, 7); g.fill(); } t.tx.wrapS = t.tx.wrapT = THREE.RepeatWrapping; t.tx.repeat.set(5, 3); return t.tx; }

export function buildWorld(stage) {
  const { scene, sets } = stage;
  const W = { sets, SOFT: softTex() };
  // ---------- characters ----------
  W.lia = new Stickman({ height: 1.68, mark: { type: 'lia', color: '#7a1f35' } });                  // the Lia we follow
  W.refl = new Stickman({ height: 1.68, mark: { type: 'lia', color: '#7a1f35' }, glow: 0.05 });      // the other Lia (behind the glass)
  W.refl.mesh.material.transparent = true; W.refl.mesh.material.opacity = 0.92;
  W.recep = new Stickman({ height: 1.8, mark: { type: 'stache', color: '#6b1f2a', color2: '#bfbfbf' } });
  W.ghosts = Array.from({ length: 3 }, () => new Stickman({ height: 1.68, mark: { type: 'lia', color: '#4a4a52' }, glow: 0.02 }));
  W.viewer = new Stickman({ height: 1.75, body: '#16161c', outline: '#000', eyeColor: '#d8d8d8', glow: 0 });
  const people = [W.lia, W.refl, W.recep, W.viewer, ...W.ghosts];
  W.place = (setName, ...on) => { const chambers = [W.chamber, W.wchamber, W.bchamber]; for (const p of people) { if (chambers.includes(p.mesh.parent)) continue; if (on.includes(p)) { if (p.mesh.parent !== sets[setName] && p.mesh.parent !== W.chamber) sets[setName].add(p.mesh); p.mesh.visible = true; } else p.mesh.visible = false; } };
  W.at = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(p); who.mesh.visible = true; };
  W.POSE = {
    slump: { facing: 1, lean: 0.3, headTilt: 0.55, legL: [1.5, -0.05], legR: [1.42, 0.02], armL: [0.5, -0.15], armR: [0.3, -0.1] },
    curl: { facing: 1, lean: 0.15, headTilt: 0.25, legL: [1.7, -2.5], legR: [1.55, -2.4], armL: [1.3, -2.0], armR: [1.1, -1.8] },
    stand: { facing: 0 }, scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] },
    lying: { facing: 1, lean: -1.55, armL: [0.3, -0.2], armR: [0.2, -0.1], legL: [0.02, 0], legR: [-0.02, 0] },
    sitUp: { facing: 1, lean: -0.15, legL: [1.5, -0.05], legR: [1.45, 0.0], armL: [-0.6, 0.3], armR: [0.3, -1.6] },
    hand: { facing: 1, armL: [1.5, -0.1], armR: [0.2, -0.2] },
    look: { facing: 1, mood: 'scared', lean: 0.05, armL: [0.3, -0.4], armR: [0.15, -0.2] },
    phone: { facing: 1, mood: 'scared', armL: [-2.5, 2.3], armR: [0.25, -0.2] },
    reach: { facing: 1, lean: 0.12, armL: [1.35, -0.1], armR: [0.4, -0.5] },
    climb: { facing: 1, lean: 0.3, armL: [-2.6, 0.4], armR: [-2.2, 0.2], legL: [0.9, -1.2], legR: [-0.1, 0.1] },
    pound: k => ({ facing: 0, mood: 'scared', armL: [-2.2 + 0.5 * Math.sin(k * 14), 0.5], armR: [2.2 - 0.5 * Math.sin(k * 14 + 1), -0.5] }),
    still: { facing: 0, armL: [0.15, -0.05], armR: [-0.15, 0.05] },
    write: { facing: 1, lean: 0.35, legL: [1.45, -1.4], legR: [1.35, -1.3], armL: [1.2, -0.7], armR: [0.9, -0.5] },
    cover: { facing: 1, armL: [-2.4, 0.2], armR: [-2.2, 0.0] },
  };

  // ---------- set: ROOM 313 ----------
  const R = new THREE.Group(); sets.room = R; scene.add(R);
  const RW = 5, RD = 5, RH = 2.8;
  const rm = room({ w: RW, d: RD, h: RH, wall: '#2b4a37', floor: '#4a3328', ceiling: '#3a3a34', holes: [{ x: 1.4, y: 0.9, w: 1.3, h: 1.4 }] });
  R.add(rm); const wallMat = new THREE.MeshStandardMaterial({ map: damask(), roughness: 0.9 });
  rm.children.forEach(m => { if (m.isMesh && m.geometry.type !== 'BoxGeometry') m.material = wallMat; });
  rm.children[2].material = wallMat; rm.remove(rm.children[3]);                // the right wall gets a real hole behind the mirror
  const rwall = wallWithHoles(RD, RH, [{ x: -0.6, y: 0.0, w: 1.14, h: 2.2 }], '#2b4a37'); rwall.material = wallMat; rwall.rotation.y = -Math.PI / 2; rwall.position.x = RW / 2; R.add(rwall);
  R.add(box(1.0, 0.45, 2.0, '#5a3a2a', -1.6, 0, -1.3), box(1.05, 0.12, 2.05, '#c9a23a', -1.6, 0.45, -1.3), box(1.0, 0.18, 0.4, '#efe6d0', -1.6, 0.57, -2.1));
  R.add(box(0.5, 0.55, 0.45, '#4a2e22', -0.7, 0, -2.2));
  W.phone = new THREE.Group(); W.phone.add(box(0.26, 0.1, 0.2, '#b3221c', 0, 0, 0), box(0.28, 0.06, 0.07, '#b3221c', 0, 0.12, 0)); W.phone.position.set(-0.75, 0.55, -2.15); R.add(W.phone);
  W.noteM = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshStandardMaterial({ color: '#f2ecdc', emissive: '#f2ecdc', emissiveIntensity: 0.25 })); W.noteM.rotation.x = -Math.PI / 2; W.noteM.position.set(-0.55, 0.552, -2.05); R.add(W.noteM);
  // the wall clock (a canvas face; the film flips the shot, so its hand runs backwards on screen)
  W.clockC = canvasTex(256, 256); const clock = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ map: W.clockC.tx, emissive: '#ffffff', emissiveMap: W.clockC.tx, emissiveIntensity: 0.25 })); clock.position.set(0.0, 2.15, -RD / 2 + 0.07); R.add(clock);
  W.drawClock = (sec, hh = 3, mm = 13) => { const g = W.clockC.g; g.fillStyle = '#efe6d0'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = '#2b2522'; g.lineWidth = 10; g.stroke();
    g.fillStyle = '#2b2522'; g.font = '700 30px Oswald'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; g.fillText(String(k), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
    const hand = (a, len, wd, col) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); };
    hand((hh + mm / 60) / 12 * Math.PI * 2, 55, 10, '#2b2522'); hand(mm / 60 * Math.PI * 2, 85, 7, '#2b2522'); hand(sec / 60 * Math.PI * 2, 95, 3, '#c8372d'); W.clockC.tx.needsUpdate = true; };
  W.drawClock(0);
  // the door (number 313 and a NÃO PERTURBE card)
  W.door = door({ w: 0.9, h: 2.05, color: '#4a2e22' }); W.door.rotation.y = Math.PI / 2; W.door.position.set(-RW / 2 + 0.07, 0.02, 0.9); R.add(W.door);
  const num = label('313', 0.3, 0.12, { bg: '#c9a23a', fg: '#2b2522', font: '700 80px Oswald' }); num.position.set(0.45, 1.75, 0.04); W.door.children[3].add(num);
  const dnd = label('NÃO PERTURBE', 0.16, 0.3, { bg: '#c8372d', fg: '#ffffff', font: '700 70px Oswald' }); dnd.position.set(0.8, 1.0, 0.06); W.door.children[3].add(dnd); W.dnd = dnd;
  W.doorGap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.035), new THREE.MeshBasicMaterial({ color: '#ffd38a' })); W.doorGap.rotation.y = Math.PI / 2; W.doorGap.position.set(-RW / 2 + 0.05, 0.018, 0.9); R.add(W.doorGap);
  W.doorLight = new THREE.PointLight('#ffc77a', 0, 4, 1.5); W.doorLight.position.set(-RW / 2 + 0.4, 0.2, 0.9); R.add(W.doorLight);
  // the mirror: a gilded frame around real glass, with a mirror-chamber behind it (the other side)
  const M = new THREE.Group(); M.position.set(2.42, 0, -0.6); M.rotation.y = -Math.PI / 2; R.add(M); W.mirror = M;
  const gold = { metal: 0.8, rough: 0.35, emissive: '#3a2a00', glow: 0.35 };
  M.add(box(1.25, 0.12, 0.14, '#c9a23a', 0, 2.15, 0, gold), box(1.25, 0.12, 0.14, '#c9a23a', 0, 0.05, 0, gold), box(0.12, 2.2, 0.14, '#c9a23a', -0.62, 0.05, 0, gold), box(0.12, 2.2, 0.14, '#c9a23a', 0.62, 0.05, 0, gold));
  M.add(box(0.5, 0.18, 0.16, '#c9a23a', 0, 2.27, 0, gold));
  W.glass = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.08), new THREE.MeshStandardMaterial({ color: '#9fd8c0', transparent: true, opacity: 0.18, metalness: 0.9, roughness: 0.05, depthWrite: false })); W.glass.position.set(0, 1.16, 0.0); M.add(W.glass);
  const ch = new THREE.Group(); ch.position.set(0, 0, -0.05); M.add(ch); W.chamber = ch;      // behind the glass: a shallow copy of the room
  ch.add(box(1.1, 0.02, 1.6, '#4a3328', 0, 0, -0.8), box(1.1, 2.2, 0.05, '#23402f', 0, 0, -1.6)); const cw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), wallMat); cw.position.set(0, 1.1, -1.57); ch.add(cw);
  W.chLight = new THREE.PointLight('#b8f0d8', 6, 3.5, 1.3); W.chLight.position.set(0, 1.9, -0.6); ch.add(W.chLight);
  // the window: rain, the fire escape, the cat, the pharmacy across the street
  const out = new THREE.Group(); R.add(out); W.outside = out;
  out.add(box(2.4, 0.06, 1.0, '#141414', 1.4, 0.75, -3.1), box(2.4, 0.9, 0.04, '#141414', 1.4, 0.8, -3.6));
  for (let i = 0; i < 6; i++) out.add(box(0.04, 0.9, 0.04, '#141414', 0.3 + i * 0.44, 0.8, -3.58));
  const pharm = new THREE.Group(); pharm.position.set(1.0, -2.5, -14); out.add(pharm);
  pharm.add(box(8, 7, 1, '#2a2f38', 0, 0, 0));
  const sign = label('FARMÁCIA 24H', 3.2, 0.7, { bg: '#0a1a10', fg: '#3dff8c', font: '700 92px Oswald', glow: true }); sign.position.set(0, 5.0, 0.52); pharm.add(sign); W.pharmSign = sign;
  const cross = new THREE.Group(); cross.add(box(0.25, 0.8, 0.1, '#3dff8c', 0, -0.4, 0, { emissive: '#3dff8c', glow: 1.5 }), box(0.8, 0.25, 0.1, '#3dff8c', 0, -0.12, 0, { emissive: '#3dff8c', glow: 1.5 })); cross.position.set(2.6, 5.0, 0.55); pharm.add(cross);
  W.neon = new THREE.PointLight('#3dff8c', 14, 30, 1.2); W.neon.position.set(1.0, 3.2, -9); out.add(W.neon);
  // rain: streaks on the outside of the window, sampled by time
  const NR = 160, rg = new THREE.BufferGeometry(), rp = new Float32Array(NR * 6), RR = rng(13), rs = [];
  for (let i = 0; i < NR; i++) rs.push([0.2 + RR() * 2.6, RR() * 3.2, -2.75 - RR() * 6, 0.6 + RR() * 0.6]);
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#9fd8c0', transparent: true, opacity: 0.45 })); rain.frustumCulled = false; out.add(rain);
  W.rain = t => { rs.forEach(([x, y0, z, v], i) => { const y = 3.4 - ((y0 + t * 6 * v) % 3.6); rp.set([x, y, z, x - 0.02, y - 0.25, z], i * 6); }); rg.attributes.position.needsUpdate = true; };
  // the cat: a flat drawing that faces the camera
  const catC = canvasTex(256, 256); const cat = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: catC.tx, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: catC.tx, emissiveIntensity: 0.25 }));
  cat.geometry.translate(0, 0.21, 0); cat.userData.billboard = cam => { const p = new THREE.Vector3(); cam.getWorldPosition(p); const q = new THREE.Vector3(); cat.getWorldPosition(q); cat.rotation.y = Math.atan2(p.x - q.x, p.z - q.z); };
  W.cat = cat; W.drawCat = (paw = 0) => { const g = catC.g; g.clearRect(0, 0, 256, 256); g.fillStyle = '#0b0b0e'; g.beginPath(); g.ellipse(128, 180, 62, 58, 0, 0, 7); g.fill(); g.beginPath(); g.arc(128, 98, 48, 0, 7); g.fill();
    g.beginPath(); g.moveTo(88, 70); g.lineTo(96, 24); g.lineTo(120, 58); g.fill(); g.beginPath(); g.moveTo(168, 70); g.lineTo(160, 24); g.lineTo(136, 58); g.fill();
    g.fillStyle = '#f1ede4'; g.beginPath(); g.moveTo(152, 62); g.lineTo(160, 34); g.lineTo(140, 56); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.ellipse(110, 98, 9, 12, 0, 0, 7); g.ellipse(146, 98, 9, 12, 0, 0, 7); g.fill(); g.fillStyle = '#000'; g.fillRect(108, 88, 4, 20); g.fillRect(144, 88, 4, 20);
    g.strokeStyle = '#0b0b0e'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(186, 210); g.quadraticCurveTo(240, 200, 226, 140); g.stroke();
    if (paw) { g.beginPath(); g.moveTo(150, 170); g.lineTo(170 + 20 * paw, 120 - 30 * paw); g.stroke(); } catC.tx.needsUpdate = true; };
  W.drawCat(0);
  const lamp = practical('#ffb46b', 4, 7); lamp.position.set(-0.7, 0.95, -2.2); lamp.userData.light.shadow.mapSize.set(512, 512); R.add(lamp); W.roomLamp = lamp; R.add(cat); cat.position.set(1.7, 0.78, -3.05);
  R.add(box(0.26, 0.2, 0.26, '#e3c99a', -0.7, 0.85, -2.2, { emissive: '#5a3a14', glow: 0.4 }));
  W.roomL = lightGroup(R, { hemi: '#4a7a62', hemiI: 0.55, dir: '#3dff8c', dirI: 0.6, dirPos: [1.4, 2.2, -6] });
  W.room = R;

  // ---------- set: the corridor (doors 313 forever) ----------
  const C = new THREE.Group(); sets.corr = C; scene.add(C);
  C.add(box(2.4, 0.05, 60, '#5a2a24', 0, -0.05, -28), box(2.4, 0.05, 60, '#2a241e', 0, 2.6, -28));
  const cw2 = new THREE.MeshStandardMaterial({ map: damask(), roughness: 0.9 }); cw2.map.repeat.set(30, 2);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 60), cw2); w.position.set(sx * 1.2, 1.3, -28); w.receiveShadow = true; C.add(w); }
  W.corrDoors = [];
  for (let i = 0; i < 16; i++) for (const sx of [-1, 1]) { const g = new THREE.Group(); g.add(box(0.05, 2.0, 0.85, '#4a2e22', 0, 0, 0)); const n = label('313', 0.24, 0.1, { bg: '#c9a23a', fg: '#2b2522', font: '700 80px Oswald' }); n.position.set(-sx * 0.035, 1.7, 0); n.rotation.y = -sx * Math.PI / 2; g.add(n); g.position.set(sx * 1.14, 0, -2 - i * 3.4); C.add(g); W.corrDoors.push(g); }
  for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffc77a', 3.5, 6, 1.5); l.position.set(0, 2.3, -1 - i * 6.5); C.add(l); C.add(box(0.2, 0.25, 0.1, '#e3c99a', -1.12, 1.9, -1 - i * 6.5, { emissive: '#ffb46b', glow: 1 })); }
  W.desk = new THREE.Group(); W.desk.add(box(1.8, 1.05, 0.6, '#3a241a', 0, 0, 0), box(1.9, 0.06, 0.7, '#5a3a2a', 0, 1.05, 0)); const y74 = label('1974', 0.3, 0.12, { bg: '#c9a23a', fg: '#2b2522', font: '700 80px Oswald' }); y74.position.set(0.5, 0.75, 0.31); W.desk.add(y74); W.desk.position.set(0, 0, -50); C.add(W.desk);
  W.corrL = lightGroup(C, { hemi: '#7a5a3a', hemiI: 0.5, dirI: 0 });
  W.corr = C;

  // ---------- set: the reception ----------
  const L = new THREE.Group(); sets.lobby = L; scene.add(L);
  L.add(room({ w: 6, d: 5, h: 3, wall: '#3a2a22', floor: '#2a1c16', ceiling: '#1a1410' }));
  L.add(box(2.6, 1.05, 0.7, '#3a241a', 0, 0, -0.9), box(2.7, 0.06, 0.8, '#5a3a2a', 0, 1.05, -0.9));
  const kw = new THREE.Group(); kw.position.set(0, 1.2, -2.45); L.add(kw);
  for (let r2 = 0; r2 < 4; r2++) for (let k = 0; k < 8; k++) { const empty = r2 === 1 && k === 5; kw.add(box(0.03, 0.03, 0.06, '#c9a23a', -1.4 + k * 0.4, r2 * 0.32, 0, { metal: 0.6 })); if (!empty) kw.add(box(0.06, 0.16, 0.02, '#c9a23a', -1.4 + k * 0.4, r2 * 0.32 - 0.18, 0.02, { metal: 0.6, emissive: '#3a2a00', glow: 0.3 })); }
  const tag313 = label('313', 0.22, 0.09, { bg: '#2b2522', fg: '#c9a23a', font: '700 80px Oswald' }); tag313.position.set(-1.4 + 5 * 0.4, 1.2 + 0.32 - 0.04, -2.43); L.add(tag313);
  W.lobbyPhone = box(0.24, 0.1, 0.18, '#151515', -0.5, 1.11, -0.9); L.add(W.lobbyPhone);
  const ll = practical('#ffb46b', 4, 7); ll.position.set(0.8, 1.6, -0.6); ll.userData.light.castShadow = false; L.add(ll);
  W.lobbyL = lightGroup(L, { hemi: '#7a5a3a', hemiI: 0.45, dirI: 0 });
  W.lobby = L;

  // ---------- set: the street in the rain (the hotel facade, the fire escape, the pharmacy) ----------
  const St = new THREE.Group(); sets.street = St; scene.add(St);
  St.add(box(60, 0.1, 20, '#1a1d22', 0, -0.1, 0), box(60, 0.15, 3, '#2a2d33', 0, -0.05, -6.5), box(60, 0.15, 3, '#2a2d33', 0, -0.05, 6.5));
  const hotel = new THREE.Group(); hotel.position.set(0, 0, -9); St.add(hotel);
  hotel.add(box(12, 13, 2, '#5a4a3e', 0, 0, 0));
  const hs = label('HOTEL AURORA', 4, 0.8, { bg: '#1a0a0a', fg: '#ff6a4a', font: '700 90px Oswald', glow: true }); hs.position.set(0, 12, 1.02); hotel.add(hs);
  W.hotelWins = []; for (let f = 0; f < 4; f++) for (let k = 0; k < 5; k++) { const lit = (f === 3 && k === 2); const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshBasicMaterial({ color: lit ? '#3dff8c' : '#11151b' })); wm.position.set(-4.8 + k * 2.4, 2 + f * 2.8, 1.02); hotel.add(wm); W.hotelWins.push(wm); }
  for (let f = 0; f < 4; f++) { hotel.add(box(2.4, 0.06, 0.9, '#0b0b0e', 0, 1.3 + f * 2.8, 1.45)); hotel.add(box(2.4, 0.7, 0.04, '#0b0b0e', 0, 1.3 + f * 2.8, 1.9)); const st = box(0.5, 0.04, 2.9, '#0b0b0e', 0.9, 0, 0); st.rotation.x = -1.0; st.position.set(0.9 * (f % 2 ? -1 : 1), 2.7 + f * 2.8 - 1.4, 1.45); hotel.add(st); }
  W.hotel = hotel;
  const ph2 = new THREE.Group(); ph2.position.set(0, 0, 9); ph2.rotation.y = Math.PI; St.add(ph2); ph2.add(box(10, 6, 2, '#2a2f38', 0, 0, 0)); const s2 = label('FARMÁCIA 24H', 3.6, 0.8, { bg: '#0a1a10', fg: '#3dff8c', font: '700 92px Oswald', glow: true }); s2.position.set(0, 4.6, 1.02); ph2.add(s2);
  const neon2 = new THREE.PointLight('#3dff8c', 25, 30, 1.2); neon2.position.set(0, 4, 6); St.add(neon2);
  const NR2 = 300, rg2 = new THREE.BufferGeometry(), rp2 = new Float32Array(NR2 * 6), RR2 = rng(29), rs2 = []; for (let i = 0; i < NR2; i++) rs2.push([(RR2() - 0.5) * 16, RR2() * 10, (RR2() - 0.5) * 14, 0.7 + RR2() * 0.5]);
  rg2.setAttribute('position', new THREE.BufferAttribute(rp2, 3)); const rain2 = new THREE.LineSegments(rg2, new THREE.LineBasicMaterial({ color: '#9fd8c0', transparent: true, opacity: 0.4 })); rain2.frustumCulled = false; St.add(rain2);
  W.rain2 = t => { rs2.forEach(([x, y0, z, v], i) => { const y = 10 - ((y0 + t * 8 * v) % 10); rp2.set([x, y, z, x - 0.03, y - 0.4, z], i * 6); }); rg2.attributes.position.needsUpdate = true; };
  W.streetL = lightGroup(St, { hemi: '#3a5a7a', hemiI: 0.6, dir: '#3dff8c', dirI: 0.5, dirPos: [0, 6, 10] });
  W.street = St;

  // ---------- set: Lia's workshop (the same mirror, with a brass plaque) ----------
  const Wk = new THREE.Group(); sets.work = Wk; scene.add(Wk);
  const brick = canvasTex(256, 256); { const g = brick.g; g.fillStyle = '#6b3a2a'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#4a2a1e'; for (let y = 0; y < 256; y += 32) { g.fillRect(0, y, 256, 4); for (let x = (y / 32) % 2 ? 0 : 32; x < 256; x += 64) g.fillRect(x, y, 4, 32); } brick.tx.wrapS = brick.tx.wrapT = THREE.RepeatWrapping; brick.tx.repeat.set(4, 3); }
  const wr = room({ w: 6, d: 5, h: 3, wall: '#6b3a2a', floor: '#3a2a20', ceiling: '#2a1e18' }); Wk.add(wr); const bm = new THREE.MeshStandardMaterial({ map: brick.tx, roughness: 1 }); wr.children.forEach((m, i) => { if (i >= 1 && i <= 3) m.material = bm; });
  Wk.add(box(2.2, 0.85, 0.8, '#5a3a24', -1.6, 0, -1.6), box(2.3, 0.06, 0.9, '#7a5234', -1.6, 0.85, -1.6));
  for (let i = 0; i < 4; i++) { const f = box(0.7, 1.2, 0.05, '#c9a23a', -2.6 + i * 0.25, 0, -2.3 + i * 0.05, { metal: 0.7, rough: 0.4 }); f.rotation.z = 0.12; Wk.add(f); }
  const WM = new THREE.Group(); WM.position.set(1.0, 0, -1.6); Wk.add(WM); W.wmirror = WM;
  WM.add(box(1.25, 0.12, 0.14, '#c9a23a', 0, 2.15, 0, gold), box(1.25, 0.12, 0.14, '#c9a23a', 0, 0.05, 0, gold), box(0.12, 2.2, 0.14, '#c9a23a', -0.62, 0.05, 0, gold), box(0.12, 2.2, 0.14, '#c9a23a', 0.62, 0.05, 0, gold), box(0.5, 0.18, 0.16, '#c9a23a', 0, 2.27, 0, gold));
  const plaque = label('HOTEL AURORA · QUARTO 313', 0.6, 0.08, { bg: '#b08d3a', fg: '#2b2522', font: '700 40px Oswald' }); plaque.position.set(0, 0.16, 0.08); WM.add(plaque); W.plaque = plaque;
  W.wglass = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.08), new THREE.MeshStandardMaterial({ color: '#9fd8c0', transparent: true, opacity: 0.2, metalness: 0.9, roughness: 0.05, depthWrite: false })); W.wglass.position.set(0, 1.16, 0.0); WM.add(W.wglass);
  const wch = new THREE.Group(); wch.position.set(0, 0, -0.05); WM.add(wch); W.wchamber = wch;
  wch.add(box(1.1, 0.02, 1.6, '#4a3328', 0, 0, -0.8)); const wcw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), wallMat); wcw.position.set(0, 1.1, -1.57); wch.add(wcw);
  const wcl = new THREE.PointLight('#9fe0c0', 2.5, 3, 1.4); wcl.position.set(0, 1.9, -0.6); wch.add(wcl);
  W.cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.5), new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 1, side: THREE.DoubleSide })); W.cloth.position.set(0, 1.2, 0.12); WM.add(W.cloth);
  const wl = practical('#ffcf8a', 6, 8); wl.position.set(-1.0, 2.2, -0.6); wl.userData.light.shadow.mapSize.set(512, 512); Wk.add(wl); W.workLamp = wl;
  W.workL = lightGroup(Wk, { hemi: '#a07a5a', hemiI: 0.55, dirI: 0 });
  W.notepad = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), new THREE.MeshStandardMaterial({ color: '#f2ecdc', emissive: '#f2ecdc', emissiveIntensity: 0.2 })); W.notepad.rotation.x = -Math.PI / 2; W.notepad.position.set(-1.3, 0.89, -1.5); Wk.add(W.notepad);
  W.work = Wk;

  // ---------- set: a dark bathroom (the last frame) ----------
  const B = new THREE.Group(); sets.bath = B; scene.add(B);
  B.add(room({ w: 3, d: 3, h: 2.6, wall: '#1c2226', floor: '#14181b', ceiling: '#101315' }));
  const BM = new THREE.Group(); BM.position.set(0, 1.05, -0.2); B.add(BM); BM.add(box(1.0, 0.04, 0.04, '#9aa0a6', 0, 1.0, 0), box(1.0, 0.04, 0.04, '#9aa0a6', 0, 0, 0), box(0.04, 1.0, 0.04, '#9aa0a6', -0.5, 0, 0), box(0.04, 1.0, 0.04, '#9aa0a6', 0.5, 0, 0));
  W.bglass = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshStandardMaterial({ color: '#8aa0aa', transparent: true, opacity: 0.25, metalness: 0.9, roughness: 0.05, depthWrite: false })); W.bglass.position.set(0, 0.5, 0.0); BM.add(W.bglass);
  const bch = new THREE.Group(); bch.position.set(0, -1.05, -0.05); BM.add(bch); W.bchamber = bch; bch.add(box(1.0, 2.5, 0.05, '#1c2226', 0, 0, -1.1)); const bcl = new THREE.PointLight('#a8c0d0', 3, 2.5, 1.4); bcl.position.set(0, 2.3, -0.3); bch.add(bcl);
  W.bathL = lightGroup(B, { hemi: '#5a6a7a', hemiI: 0.35, dirI: 0 });
  const bl = new THREE.PointLight('#a8c0d0', 2.5, 5, 1.4); bl.position.set(0, 2.2, 0.5); B.add(bl);
  W.bath = B;

  W.use = (name, exp = 1.35) => { stage.use(name); scene.background = new THREE.Color(name === 'street' ? '#05070d' : '#000000'); stage.renderer.toneMappingExposure = exp; };
  return W;
}
