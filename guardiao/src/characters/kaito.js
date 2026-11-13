import * as THREE from 'three';
import { Actor, mesh } from './humanoid.js';
import { rng, TAU, noise1 } from '../timeline/util.js';

// KAITO — explorador de 19 anos: cabelo preto bagunçado, olhos castanhos, roupa azul-escura com dourado,
// capa azul esvoaçante e o cristal luminoso no peito. Ficha de cores única para todas as sequências.
export const KAITO = { blue: 0x1c2f7c, deep: 0x121c48, gold: 0xe2b04a, cape: 0x2a52c8, capeIn: 0x16307a, hair: 0x0b0b10, skin: 0xf3cba4, iris: 0x6a3c1a, crystal: 0x7fe8ff };
const S = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h), B = (x, y, z) => new THREE.BoxGeometry(x, y, z), C = (a, b, h, s = 10, o = false) => new THREE.CylinderGeometry(a, b, h, s, 1, o);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

function glyphTexture() {                                           // faixa de símbolos astronômicos (Canvas)
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 64); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
  const r = rng(5);
  for (let i = 0; i < 16; i++) {
    const x = 32 + i * 64, y = 32, k = i % 4; g.beginPath();
    if (k === 0) { g.arc(x, y, 14, 0, TAU); g.moveTo(x - 22, y); g.lineTo(x + 22, y); }
    else if (k === 1) { for (let j = 0; j < 5; j++) { const a = j / 5 * TAU * 2 - 1.57; g[j ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 16, y + Math.sin(a) * 16); } g.closePath(); }
    else if (k === 2) { g.arc(x, y, 15, 0.6, TAU - 0.6); g.moveTo(x + 4, y - 14); g.arc(x + 6, y, 12, -1.4, 1.4); }
    else { let px = x - 18, py = y + (r() - 0.5) * 20; g.moveTo(px, py); for (let j = 0; j < 3; j++) { px += 12; py = y + (r() - 0.5) * 26; g.lineTo(px, py); } }
    g.stroke(); if (k === 3 || k === 0) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
}

export function makeKaito() {
  const a = new Actor({ seed: 1, skin: KAITO.skin, hair: KAITO.hair, under: KAITO.deep, iris: KAITO.iris, scale: 0.97, disColor: 0xffd27a, shoe: 0x4a2c18 });
  const j = a.j, M = a.M;
  const blue = M('tunic', KAITO.blue, { roughness: 0.6 }), gold = M('gold', KAITO.gold, { metalness: 0.85, roughness: 0.3 }), leather = M('leather', 0x5a3620, { roughness: 0.8 });
  // túnica com barra dourada
  const top = mesh(C(0.245, 0.2, 0.42, 12), blue, 0, 0.2, 0); top.scale.z = 0.76; j.chest.add(top);
  const skirt = mesh(C(0.205, 0.27, 0.3, 12), blue, 0, -0.07, 0); skirt.scale.z = 0.82; j.hips.add(skirt);
  const hem = mesh(C(0.272, 0.276, 0.03, 12), gold, 0, -0.215, 0); hem.scale.z = 0.82; j.hips.add(hem);
  const belt = mesh(C(0.215, 0.215, 0.07, 12), leather, 0, 0.1, 0); belt.scale.z = 0.8; j.hips.add(belt); j.hips.add(mesh(B(0.07, 0.08, 0.03), gold, 0, 0.1, 0.175));
  j.chest.add(mesh(C(0.13, 0.17, 0.08, 10), gold, 0, 0.4, 0));                                       // gola
  for (const sx of [1, -1]) { const lap = mesh(B(0.035, 0.34, 0.02), gold, 0.075 * sx, 0.22, 0.176); lap.rotation.z = 0.2 * sx; j.chest.add(lap); }
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    j['arm' + s].add(mesh(S(0.085, 10, 8), blue, 0.01 * sx, 0, 0)); j['arm' + s].add(mesh(C(0.075, 0.066, 0.2, 8), blue, 0, -0.12, 0));
    j['fore' + s].add(mesh(C(0.06, 0.052, 0.16, 8), leather, 0, -0.15, 0)); j['fore' + s].add(mesh(C(0.062, 0.062, 0.018, 8), gold, 0, -0.07, 0));
    j['shin' + s].add(mesh(C(0.082, 0.066, 0.26, 8), leather, 0, -0.26, 0.005)); j['shin' + s].add(mesh(C(0.086, 0.086, 0.02, 8), gold, 0, -0.13, 0.005));
  }
  // cabelo preto bagunçado
  const hair = M('hair', KAITO.hair, { roughness: 0.5 });
  const cap = mesh(new THREE.SphereGeometry(0.2, 18, 12, 0, TAU, 0, 1.5), hair, 0, 0.185, -0.014); cap.rotation.x = -0.5; j.head.add(cap);
  const r = rng(77);
  for (let i = 0; i < 20; i++) {
    const th = r() * TAU, ph = 0.15 + r() * 1.05, back = Math.cos(th) < -0.2;
    const sp = grp(j.head, Math.sin(ph) * Math.sin(th) * 0.17, 0.2 + Math.cos(ph) * 0.17, Math.sin(ph) * Math.cos(th) * 0.16 - 0.01);
    const cone = mesh(new THREE.ConeGeometry(0.045 + r() * 0.02, 0.13 + r() * 0.1, 5), hair, 0, 0.05, 0); sp.add(cone);
    sp.rotation.set(Math.cos(th) * ph * 0.9 + (back ? -0.3 : 0.25), 0, -Math.sin(th) * ph * 0.9);
    a.sway(sp, 0.05, 1.6 + r(), i * 1.3, sp.rotation.x);
  }
  for (let i = 0; i < 5; i++) { const f = mesh(new THREE.ConeGeometry(0.04, 0.14, 5), hair, (i - 2) * 0.06, 0.295 - Math.abs(i - 2) * 0.014, 0.15); f.rotation.set(2.7, 0, (i - 2) * -0.28 + (i % 2 ? 0.2 : -0.15)); j.head.add(f); }
  // cristal no peito
  const cg = grp(j.chest, 0, 0.26, 0.2); a.crystalGroup = cg;
  cg.add(mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 16), gold));
  a.crystalMat = new THREE.MeshBasicMaterial({ color: KAITO.crystal, toneMapped: false });
  a.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), a.crystalMat); a.crystal.scale.set(0.8, 1.25, 0.6); cg.add(a.crystal);
  a.crystalLight = new THREE.PointLight(KAITO.crystal, 0.1, 1.6, 2); cg.add(a.crystalLight);
  a.setCrystal = (k) => { a.crystalMat.color.setHex(KAITO.crystal).multiplyScalar(0.5 + k * 1.6); a.crystalLight.intensity = 0.06 + k * 0.22; a.crystal.rotation.y += 0; };
  // capa: tecido em malha, ondulado em função do tempo e do vento
  const cw = 9, ch = 12, cgeo = new THREE.PlaneGeometry(0.66, 1.05, cw, ch), cp = cgeo.attributes.position, base = cp.array.slice(), cols = new Float32Array(cp.count * 3), cA = new THREE.Color(KAITO.cape), cB = new THREE.Color(KAITO.gold);
  for (let i = 0; i < cp.count; i++) { const v = 0.5 - base[i * 3 + 1] / 1.05, edge = v > 0.93 || Math.abs(base[i * 3]) > 0.3; const c = edge ? cB : cA; cols.set([c.r, c.g, c.b], i * 3); }
  cgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const capeM = M('cape', 0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 });
  cgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.5, -0.3), 1.2); const cape = new THREE.Mesh(cgeo, capeM); cape.castShadow = true; cape.position.set(0, 0.36, -0.17); j.chest.add(cape); a.cape = cape; a.capeWind = 0.3;
  for (const sx of [1, -1]) j.chest.add(mesh(S(0.035, 8, 6), gold, 0.16 * sx, 0.37, -0.1));
  a.hooks.push((t) => {
    const wnd = Math.max(a.capeWind, a.wind);
    for (let i = 0; i < cp.count; i++) {
      const x = base[i * 3], v = 0.5 - base[i * 3 + 1] / 1.05;                                         // v: 0 no ombro, 1 na barra
      const wave = Math.sin(t * (3.2 + wnd * 3) - v * 6.5 + x * 4) * 0.07 + Math.sin(t * 5.1 + v * 11 + x * 9) * 0.025 + noise1(t * 0.9 + v * 2) * 0.05;
      cp.setXYZ(i, x * (1 + v * 0.35 * wnd), -v * 1.05 * (1 - wnd * 0.32), -(0.03 + v * v * 0.18 + v * wnd * 0.75) - wave * v * (0.5 + wnd));
    }
    cp.needsUpdate = true; cgeo.computeVertexNormals();
  });
  // símbolos celestiais que orbitam o corpo quando ele desperta
  const gt = glyphTexture(); a.rings = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42 + i * 0.16, 0.42 + i * 0.16, 0.1 + i * 0.02, 40, 1, true), new THREE.MeshBasicMaterial({ map: gt, color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.y = 0.75 + i * 0.4; m.rotation.set(0.25 * (i - 1), 0, 0.2 * (1 - i)); a.body.add(m); a.rings.push(m);
  }
  const gold3 = new THREE.Color(0xffc060);
  /** k 0..1: o corpo passa a emitir luz dourada e os símbolos aparecem. */
  a.awaken = (k, t = 0) => {
    for (const n in a.mats) { const m = a.mats[n]; if (n === 'hl') continue; m.emissive.copy(gold3); m.emissiveIntensity = k * (n === 'iris' ? 2.2 : n === 'skin' ? 0.07 : n === 'eyeWhite' ? 0.05 : n === 'pupil' || n === 'lash' || n === 'brow' || n === 'mouth' ? 0 : n === 'hair' ? 0.1 : n === 'gold' ? 0.6 : 0.16); }
    a.rings.forEach((r, i) => { r.visible = k > 0.01; r.material.color.setHex(0xffd27a).multiplyScalar(k * 1.6); r.rotation.y = t * (0.8 + i * 0.5) * (i % 2 ? -1 : 1); r.material.map.offset.x = 0; });
  };
  a.awaken(0);
  return a;
}

export function makeChild(i) {                                      // crianças da vila
  const cols = [0xe86a5a, 0x4a9ad8, 0xf0b840, 0x6cc070];
  const a = new Actor({ seed: 30 + i, skin: 0xf6d2b4, hair: i % 2 ? 0x3a2214 : 0x15151a, under: cols[i % 4], scale: 0.55 + (i % 3) * 0.04, shoe: 0x5a3a20 });
  const j = a.j, cl = a.mats.under;
  const top = mesh(C(0.245, 0.23, 0.44, 10), cl, 0, 0.2, 0); top.scale.z = 0.8; j.chest.add(top); j.hips.add(mesh(C(0.22, 0.27, 0.34, 10), cl, 0, -0.1, 0)); j.hips.add(mesh(C(0.225, 0.225, 0.07, 10), a.M('belt', 0xfff0d8), 0, 0.1, 0));
  const hm = a.M('hair', a.style.hair); const cap = mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, TAU, 0, 1.5), hm, 0, 0.185, -0.014); cap.rotation.x = -0.5; j.head.add(cap); j.head.scale.setScalar(1.25);
  if (i % 2) j.head.add(mesh(S(0.07, 8, 6), hm, 0, 0.4, -0.05));
  return a;
}
