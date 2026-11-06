// world.js: "O Homem Sem Sombra". The street (day or night, a shop window with a reflection, a plaza with a tree and a
// bus), your bedroom (the dog that barks at you), the office, the nightclub. Your shadow is its own character: a dark
// translucent stickman with white eyes. Everything is a pure function of time.
import * as S from '../../engine/stage.js';
import { softTex, canvasTex } from '../joseon/world.js';
const { THREE, clamp, lerp, ease, rng, box, room, practical, wallWithHoles, Stickman, mat } = S;
export { canvasTex };

function lightGroup(group, { hemi = '#e8e4da', ground = '#3a352e', hemiI = 0.6, dir = '#fff1d6', dirI = 0.4, dirPos = [3, 5, 4] } = {}) {
  const h = new THREE.HemisphereLight(hemi, ground, hemiI); group.add(h);
  const d = new THREE.DirectionalLight(dir, dirI); d.position.set(...dirPos); group.add(d); group.add(d.target); return { h, d };
}
function facadeTex(base, win, seed) { const t = canvasTex(256, 512), g = t.g, R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 256, 512); for (let y = 30; y < 500; y += 80) for (let x = 24; x < 240; x += 60) { g.fillStyle = R() < 0.4 ? win : '#2a3140'; g.fillRect(x, y, 36, 50); } return t; }

export function buildWorld(stage) {
  const { scene, sets } = stage;
  const W = { sets };
  // ---------- characters ----------
  W.you = new Stickman({ height: 1.75, mark: { type: 'shirt', color: '#2f6fd6' } });
  W.shadow = new Stickman({ height: 1.75, body: '#16161c', outline: '#000000', eyeColor: '#ffffff', glow: 0 });
  W.shadow.mesh.material.transparent = true; W.shadow.mesh.material.opacity = 0.9; W.shadow.mesh.castShadow = false;
  W.suit = new Stickman({ height: 1.85, mark: { type: 'suit', color: '#1d1d22' } });
  W.boss = new Stickman({ height: 1.8, mark: { type: 'stache', color: '#6b6f78' } });
  W.crush = new Stickman({ height: 1.62, mark: { type: 'hanbok', color: '#d65aa0', color2: '#f1ede4' } });
  W.mom = new Stickman({ height: 1.58, mark: { type: 'hanbok', color: '#2e7d6a', color2: '#efe4c8' } });
  W.bartender = new Stickman({ height: 1.7, mark: { type: 'band', color: '#c8372d' } });
  W.reflex = new Stickman({ height: 1.75, mark: { type: 'shirt', color: '#2f6fd6' } });                 // your reflection
  W.reflex.mesh.material.transparent = true; W.reflex.mesh.material.opacity = 0.55; W.reflex.mesh.castShadow = false;
  const people = [W.you, W.shadow, W.suit, W.boss, W.crush, W.mom, W.bartender, W.reflex];
  W.place = (setName, ...on) => { for (const p of people) { if (on.includes(p)) { if (p.mesh.parent !== sets[setName]) sets[setName].add(p.mesh); p.mesh.visible = true; } else p.mesh.visible = false; } };
  W.at = (who, x, y, z, p) => { who.mesh.position.set(x, y, z); who.pose(p); who.mesh.visible = true; };
  W.POSE = {
    stand: { facing: 0 }, scared: { facing: 0, mood: 'scared', armL: [0.5, -1.9], armR: [-0.5, 1.9] },
    laugh: k => ({ facing: 0, lean: -0.12 + 0.05 * Math.sin(k * 18), headTilt: -0.2, armL: [0.6, -2.0], armR: [-0.6, 2.0] }),
    sign: { facing: 1, lean: 0.15, armL: [1.3, -0.6], armR: [0.6, -0.4] },
    look: { facing: 1, mood: 'scared', lean: 0.05, armL: [0.3, -0.4], armR: [0.15, -0.2] },
    reach: { facing: 1, lean: 0.12, armL: [1.35, -0.1], armR: [0.4, -0.5] },
    offer: { facing: -1, armR: [-1.4, 0.2], armL: [0.2, -0.2] },
    carry: { facing: 1, armL: [0.9, -1.4], armR: [0.7, -1.2] },
    wave: k => ({ facing: 0, armR: [-2.6 + 0.4 * Math.sin(k * 8), -0.3], armL: [0.2, -0.1] }),
    dance: k => ({ facing: Math.sin(k * 2) > 0 ? 1 : -1, lean: 0.15 * Math.sin(k * 6), armL: [-2.4 + 0.8 * Math.sin(k * 6), 0.3], armR: [2.4 - 0.8 * Math.cos(k * 6), -0.3], legL: [0.4 * Math.sin(k * 6), -0.3], legR: [-0.3 * Math.sin(k * 6), 0.3] }),
    sing: k => ({ facing: 1, lean: -0.1, headTilt: -0.25, armL: [-2.2, 0.3], armR: [1.4 + 0.3 * Math.sin(k * 8), -1.2] }),
    sleep: { facing: 1, lean: -1.5, armL: [0.2, -0.2], armR: [0.1, -0.1], legL: [0.0, 0.0], legR: [0.05, 0.0] },
    phone: { facing: 0, armL: [0.9, -1.6], armR: [-0.9, 1.6] },
    type: { facing: 1, lean: 0.1, legL: [1.45, -1.4], legR: [1.35, -1.3], armL: [1.3, -0.6], armR: [1.1, -0.4] },
    jump: { facing: 1, lean: 0.9, armL: [2.4, -0.2], armR: [2.2, -0.2], legL: [-0.9, 0.4], legR: [-1.2, 0.6] },
    tremble: k => ({ facing: 0, mood: 'scared', lean: 0.04 * Math.sin(k * 40), armL: [0.5, -1.9], armR: [-0.5, 1.9] }),
    shake: { facing: 1, armR: [1.4, -0.2], armL: [0.2, -0.2] },
    pack: k => ({ facing: 1, lean: 0.4, armL: [1.2 + 0.3 * Math.sin(k * 7), -0.6], armR: [1.0 + 0.3 * Math.cos(k * 7), -0.5] }),
  };

  // ---------- set: the street (day/night), the shop window, the plaza ----------
  const street = new THREE.Group(); sets.street = street; scene.add(street);
  street.add(box(80, 0.1, 8, '#4a4d52', 0, -0.12, 0));                                      // road
  street.add(box(80, 0.2, 4, '#9a958c', 0, -0.1, -6), box(80, 0.2, 4, '#9a958c', 0, -0.1, 6));   // sidewalks
  for (let i = -6; i <= 6; i++) street.add(box(1.4, 0.01, 0.15, '#e8e4d0', i * 4, -0.06, 0, { cast: false }));
  const fac = [];
  [['#c99a6b', 1], ['#8fa6b8', 2], ['#b88a8a', 3], ['#a6b88f', 4], ['#c9b48a', 5], ['#9a8fb8', 6]].forEach(([c, s], i) => {
    const t = facadeTex(c, '#ffe2a0', s); const h = 9 + (i % 3) * 3;
    const m = new THREE.Mesh(new THREE.BoxGeometry(7.6, h, 4), [mat(c), mat(c), mat(c), mat(c), new THREE.MeshStandardMaterial({ map: t.tx, roughness: 0.9, emissive: '#ffffff', emissiveMap: t.tx, emissiveIntensity: 0 }), mat(c)]);
    m.position.set(-19 + i * 8, h / 2, -10.2); m.castShadow = true; m.receiveShadow = true; street.add(m); fac.push(m.material[4]);
  });
  W.facades = fac;
  // the shop window (vitrine): a frame, glass, a lit interior, your reflection stands behind the glass
  const shop = new THREE.Group(); shop.position.set(4, 0, -7.7); street.add(shop);
  shop.add(box(3.4, 0.4, 0.3, '#2b2522', 0, 0, 0), box(3.4, 0.3, 0.3, '#2b2522', 0, 2.6, 0), box(0.2, 2.9, 0.3, '#2b2522', -1.6, 0, 0), box(0.2, 2.9, 0.3, '#2b2522', 1.6, 0, 0));
  const sign = canvasTex(256, 64); { const g = sign.g; g.fillStyle = '#c8372d'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#fff'; g.font = '700 40px Oswald'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LOJA DE ESPELHOS', 128, 34); }
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ map: sign.tx })); sg.position.set(0, 3.25, 0.16); shop.add(sg);
  W.glass = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), new THREE.MeshStandardMaterial({ color: '#9fc4d8', transparent: true, opacity: 0.22, metalness: 0.9, roughness: 0.05 })); W.glass.position.set(0, 1.5, 0.12); shop.add(W.glass);
  shop.add(box(3.0, 2.2, 0.05, '#1a2230', 0, 0.4, -1.2));
  W.shopIn = new THREE.PointLight('#cfe6ff', 3, 5, 1.4); W.shopIn.position.set(0, 2, -0.6); shop.add(W.shopIn);
  W.suitcase = box(0.5, 0.35, 0.15, '#7a4a2a', 0.3, 0.42, -0.5); shop.add(W.suitcase);
  W.shop = shop;
  // the plaza: a tree, a lamp post, a bench, a bus
  W.tree = new THREE.Group(); W.tree.add(box(0.35, 2.4, 0.35, '#5a3e28', 0, 0, 0)); const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 0), mat('#3f7a3a')); crown.position.y = 3.3; crown.castShadow = true; W.tree.add(crown); W.tree.position.set(-6, 0, -6.5); street.add(W.tree);
  W.post = new THREE.Group(); W.post.add(box(0.14, 4.2, 0.14, '#2c2f36', 0, 0, 0), box(0.9, 0.1, 0.14, '#2c2f36', 0.4, 4.1, 0)); W.post.position.set(-1.5, 0, -4.3); street.add(W.post);
  W.postLamp = practical('#ffd59a', 0, 12); W.postLamp.position.set(0.8, 4.0, -4.3 + 0); W.postLamp.position.x = -0.7; street.add(W.postLamp);
  street.add(box(1.6, 0.45, 0.5, '#6b4a32', -3.2, 0, -6.6), box(1.6, 0.5, 0.08, '#6b4a32', -3.2, 0.45, -6.85));
  W.bus = new THREE.Group(); W.bus.add(box(8, 2.6, 2.5, '#e2b13c', 0, 0.35, 0)); for (let i = 0; i < 6; i++) W.bus.add(box(0.9, 0.8, 0.02, '#2a3140', -3.2 + i * 1.25, 1.6, 1.26)); for (const x of [-2.8, 2.8]) for (const z of [-1.2, 1.2]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), mat('#1a1a1a')); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.45, z); W.bus.add(wh); } street.add(W.bus);
  W.sun = new THREE.DirectionalLight('#fff4dc', 2.2); W.sun.castShadow = true; W.sun.shadow.mapSize.set(2048, 2048); Object.assign(W.sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 }); W.sun.shadow.bias = -0.0008; street.add(W.sun, W.sun.target);
  W.streetL = lightGroup(street, { hemi: '#bcd4f0', ground: '#5a5040', hemiI: 0.9, dirI: 0 });
  W.setSun = (day, elev = 0.6, az = 0.9) => {          // elev: 0 = horizon, 1.57 = straight overhead (noon in the tropics)
    W.sun.visible = day; W.sun.intensity = day ? 2.4 : 0; const r = 40; W.sun.position.set(Math.cos(elev) * Math.cos(az) * r, Math.sin(elev) * r, Math.cos(elev) * Math.sin(az) * r); W.sun.target.position.set(0, 0, 0);
    W.streetL.h.intensity = day ? 0.9 : 0.35; W.streetL.h.color.set(day ? '#bcd4f0' : '#4a5a8c');
    fac.forEach(m => m.emissiveIntensity = day ? 0 : 0.55); W.postLamp.userData.light.intensity = day ? 0 : 10;
    scene.background = new THREE.Color(day ? '#8ec5ef' : '#0a0f22'); stage.renderer.toneMappingExposure = day ? 1.0 : 1.5;
  };
  W.street = street;

  // ---------- set: your bedroom (the dog) ----------
  const home = new THREE.Group(); sets.home = home; scene.add(home);
  home.add(room({ w: 5, d: 5, h: 2.7, wall: '#7f9aa8', floor: '#8a6a4a', ceiling: '#d9d4c8', holes: [{ x: 1.2, y: 1.0, w: 1.2, h: 1.1 }] }));
  home.add(box(1.6, 0.45, 2.1, '#3b4a6b', -1.3, 0, -1.2), box(1.6, 0.12, 0.5, '#efe9dc', -1.3, 0.45, -2.0), box(0.5, 0.5, 0.5, '#6b4a32', 0.0, 0, -2.1));
  const bedLamp = practical('#ffcf8a', 3, 6); bedLamp.position.set(0.0, 0.85, -2.1); bedLamp.userData.light.castShadow = false; home.add(bedLamp); W.bedLamp = bedLamp;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.3), new THREE.MeshBasicMaterial({ color: '#8ec5ef' })); sky.position.set(1.2, 1.55, -2.7); home.add(sky); W.homeSky = sky;
  W.homeSun = new THREE.DirectionalLight('#fff4dc', 1.6); W.homeSun.position.set(2.5, 4, -6); W.homeSun.target.position.set(0, 0, 1); W.homeSun.castShadow = true; W.homeSun.shadow.mapSize.set(1024, 1024); Object.assign(W.homeSun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); home.add(W.homeSun, W.homeSun.target);
  W.homeL = lightGroup(home, { hemiI: 0.75 });
  // the dog: a flat drawing on a camera-facing plane (mouth open when it barks)
  const dogC = canvasTex(256, 192); const dog = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ map: dogC.tx, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: dogC.tx, emissiveIntensity: 0.15 }));
  dog.geometry.translate(0, 0.3, 0); dog.castShadow = true; dog.userData.billboard = cam => { const p = new THREE.Vector3(); cam.getWorldPosition(p); dog.rotation.y = Math.atan2(p.x - dog.position.x, p.z - dog.position.z); }; home.add(dog); W.dog = dog;
  W.drawDog = (bark, facing = 1) => { const g = dogC.g; g.clearRect(0, 0, 256, 192); g.save(); if (facing < 0) { g.translate(256, 0); g.scale(-1, 1); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    const body = (lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(60, 100); g.lineTo(170, 100); g.moveTo(70, 100); g.lineTo(60, 170); g.moveTo(90, 100); g.lineTo(95, 170); g.moveTo(150, 100); g.lineTo(145, 170); g.moveTo(168, 100); g.lineTo(178, 170); g.moveTo(60, 100); g.lineTo(30, 70); g.stroke(); };
    body(30, '#15171c'); body(16, '#c98a4a');
    g.fillStyle = '#15171c'; g.beginPath(); g.arc(190, 80, 36, 0, 7); g.fill(); g.fillStyle = '#c98a4a'; g.beginPath(); g.arc(190, 80, 28, 0, 7); g.fill();
    g.fillStyle = '#7a4a22'; g.beginPath(); g.ellipse(170, 66, 10, 22, -0.4, 0, 7); g.fill();
    g.fillStyle = '#15171c'; g.beginPath(); g.arc(200, 72, 5, 0, 7); g.fill(); g.beginPath(); g.arc(218, 84, 6, 0, 7); g.fill();
    if (bark) { g.beginPath(); g.moveTo(205, 96); g.lineTo(226, 92); g.lineTo(214, 108); g.closePath(); g.fill(); }
    g.restore(); dogC.tx.needsUpdate = true; };
  W.drawDog(false);
  W.home = home;

  // ---------- set: the office ----------
  const office = new THREE.Group(); sets.office = office; scene.add(office);
  office.add(room({ w: 9, d: 7, h: 2.8, wall: '#d9d9d2', floor: '#6f7680', ceiling: '#eeeeea' }));
  W.desks = [];
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { const g = new THREE.Group(); g.add(box(1.4, 0.05, 0.75, '#c9b48a', 0, 0.72, 0), box(0.05, 0.72, 0.7, '#7a7d80', -0.65, 0, 0), box(0.05, 0.72, 0.7, '#7a7d80', 0.65, 0, 0));
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.04), [mat('#222'), mat('#222'), mat('#222'), mat('#222'), new THREE.MeshBasicMaterial({ color: '#7fb2ff' }), mat('#222')]); scr.position.set(0, 0.98, -0.2); g.add(scr); g.add(box(0.06, 0.18, 0.06, '#222', 0, 0.76, -0.2));
    g.add(box(0.5, 0.45, 0.5, '#2c3140', 0, 0, 0.6), box(0.5, 0.5, 0.06, '#2c3140', 0, 0.45, 0.85));
    g.position.set(-2.6 + k * 2.6, 0, -1.2 + r * 2.4); office.add(g); W.desks.push(g); }
  const ol = practical('#f4f6ff', 4, 10); ol.position.set(0, 2.6, 0); ol.userData.light.shadow.mapSize.set(512, 512); office.add(ol);
  const plaque = canvasTex(256, 64); { const g = plaque.g; g.fillStyle = '#2b2522'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#e2b13c'; g.font = '700 38px Oswald'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GERENTE', 128, 34); }
  W.plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshBasicMaterial({ map: plaque.tx })); W.plaque.position.set(0, 0.8, 0.0); W.desks[1].add(W.plaque); W.plaque.position.set(0, 0.8, 0.38); W.plaque.visible = false;
  W.officeL = lightGroup(office, { hemi: '#f2f4ff', hemiI: 0.95 });
  W.office = office;

  // ---------- set: the nightclub ----------
  const club = new THREE.Group(); sets.club = club; scene.add(club);
  club.add(room({ w: 10, d: 9, h: 3.4, wall: '#1b1428', floor: '#120e18', ceiling: '#0c0a10' }));
  const floorC = canvasTex(512, 512);
  W.drawFloor = t => { const g = floorC.g; const cols = ['#ff3fa4', '#3fd0ff', '#a45cff', '#ffcc4d']; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const k = (i * 3 + j * 5 + Math.floor(t * 4)) % 7; g.fillStyle = k < 4 ? cols[k] : '#1a1424'; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } floorC.tx.needsUpdate = true; };
  const df = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshStandardMaterial({ map: floorC.tx, emissive: '#ffffff', emissiveMap: floorC.tx, emissiveIntensity: 0.55, roughness: 0.5 })); df.rotation.x = -Math.PI / 2; df.position.set(0, 0.01, -0.5); df.receiveShadow = true; club.add(df);
  W.ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({ color: '#dfe6f0', metalness: 1, roughness: 0.15, flatShading: true, emissive: '#555566' })); W.ball.position.set(0, 2.9, -0.5); club.add(W.ball);
  W.spots = ['#ff3fa4', '#3fd0ff', '#a45cff'].map((col, i) => { const s = new THREE.SpotLight(col, 40, 12, 0.35, 0.5, 1.2); s.position.set(-3 + i * 3, 3.3, 2); club.add(s, s.target); return s; });
  club.add(box(4, 1.1, 0.7, '#3a2a40', 2.5, 0, -3.8), box(4.2, 0.08, 0.9, '#a45cff', 2.5, 1.1, -3.8, { emissive: '#a45cff', glow: 0.6 }));
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), new THREE.MeshStandardMaterial({ color: ['#3fd0ff', '#ffcc4d', '#ff3fa4'][i % 3], emissive: ['#3fd0ff', '#ffcc4d', '#ff3fa4'][i % 3], emissiveIntensity: 0.6, transparent: true, opacity: 0.8 })); b.position.set(1.2 + i * 0.5, 1.75, -4.15); club.add(b); }
  club.add(box(4, 0.06, 0.25, '#3a2a40', 2.5, 1.6, -4.15));
  const neonC = canvasTex(512, 256); { const g = neonC.g; const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#ff3fa4'); gr.addColorStop(0.5, '#a45cff'); gr.addColorStop(1, '#3fd0ff'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 512, 6); }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.6), new THREE.MeshBasicMaterial({ map: neonC.tx })); neon.position.set(0, 1.9, -4.43); club.add(neon);
  W.clubL = lightGroup(club, { hemi: '#5a3a8c', ground: '#140c1c', hemiI: 0.55, dirI: 0 });
  W.club = club;

  W.use = name => { stage.use(name); if (name !== 'street') { scene.background = new THREE.Color('#000000'); stage.renderer.toneMappingExposure = name === 'club' ? 1.4 : 1.05; } };
  return W;
}
