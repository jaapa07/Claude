import * as THREE from 'three';
import { Actor, mesh } from './humanoid.js';
import { rng, TAU } from '../core/util.js';

// Elenco. As cores e proporções ficam centralizadas aqui: é a "ficha de modelo" da série.
export const COLORS = {
  akioArmor: 0x21409a, akioTrim: 0xc9a24a, sash: 0xd0202e, steel: 0xd9e2ee, rune: 0x3fb4ff,
  yunaWhite: 0xf6f2ea, yunaRed: 0xc8222e, yunaHair: 0x6e452a,
  lordArmor: 0x0a0a10, lordGold: 0xe0b040, lordEye: 0x48c8ff,
};

const S = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const C = (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

function runeTexture(seed = 3) {                                 // inscrições azuis da lâmina
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 32); g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const x = 14 + i * 25; g.beginPath();
    for (let k = 0; k < 4; k++) { const x0 = x + (r() - 0.5) * 16, y0 = 5 + r() * 22; g.moveTo(x0, y0); g.lineTo(x0 + (r() - 0.5) * 14, y0 + (r() - 0.5) * 16); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Katana: lâmina prateada com inscrições luminosas. A lâmina aponta para +Y local. */
export function makeKatana({ blade = COLORS.steel, rune = COLORS.rune, dark = false } = {}) {
  const k = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: blade, metalness: 0.9, roughness: 0.22, emissive: dark ? 0x0a1830 : 0x223344, emissiveIntensity: 0.5 });
  const geo = new THREE.BoxGeometry(0.042, 0.9, 0.012, 1, 12, 1); geo.translate(0, 0.45, 0);
  const p = geo.attributes.position;                              // curvatura suave (sori) e ponta afilada
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.9; p.setX(i, p.getX(i) * (y > 0.97 ? 0.3 : 1) - 0.07 * y * y); }
  geo.computeVertexNormals();
  const bl = mesh(geo, steel, 0, 0.13, 0); k.add(bl);
  const runeMat = new THREE.MeshBasicMaterial({ map: runeTexture(dark ? 9 : 3), color: rune, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (const sz of [1, -1]) {
    const rg = new THREE.PlaneGeometry(0.03, 0.8, 1, 12); rg.translate(0, 0.42, 0);
    const rp = rg.attributes.position; for (let i = 0; i < rp.count; i++) { const y = rp.getY(i) / 0.9; rp.setX(i, rp.getX(i) - 0.07 * y * y); }
    const uv = rg.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v, u); }
    const m = new THREE.Mesh(rg, runeMat); m.position.set(0, 0.13, 0.0075 * sz); k.add(m);
  }
  k.add(mesh(C(0.055, 0.055, 0.014, 12), new THREE.MeshStandardMaterial({ color: dark ? 0x30343c : 0xb8923c, metalness: 0.8, roughness: 0.35 }), 0, 0.125, 0));   // tsuba
  k.add(mesh(C(0.019, 0.021, 0.27, 8), new THREE.MeshStandardMaterial({ color: dark ? 0x111118 : 0x1a2148, roughness: 0.8 }), 0, -0.015, 0));                       // tsuka
  const glow = new THREE.PointLight(rune, 0, 4, 2); glow.position.set(0, 0.6, 0); k.add(glow);
  k.userData = { runeMat, glow, steel, setGlow(v) { runeMat.color.set(rune).multiplyScalar(v); glow.intensity = v * 0.7; steel.emissiveIntensity = 0.5 + v * 0.25; } };
  k.userData.setGlow(1);
  return k;
}

/** Arco tradicional (yumi) com corda; draw 0..1 puxa a corda. */
export function makeBow() {
  const b = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.014, 6, 24, 1.9), wood); arc.rotation.z = -0.95; arc.position.x = -0.62; arc.castShadow = true; b.add(arc);
  b.add(mesh(C(0.02, 0.02, 0.16, 6), new THREE.MeshStandardMaterial({ color: COLORS.yunaRed, roughness: 0.7 }), 0.16, 0, 0));
  const strMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
  const top = new THREE.Vector3(-0.165, 0.635, 0), bot = new THREE.Vector3(-0.165, -0.635, 0);
  const s1 = new THREE.Mesh(C(0.003, 0.003, 1, 4), strMat), s2 = new THREE.Mesh(C(0.003, 0.003, 1, 4), strMat); b.add(s1, s2);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  b.userData.setDraw = (k) => {
    const mid = new THREE.Vector3(-0.165 - k * 0.5, 0, 0);
    for (const [s, a] of [[s1, top], [s2, bot]]) { d.subVectors(a, mid); const len = d.length(); s.scale.y = len; s.position.copy(mid).addScaledVector(d, 0.5); s.quaternion.setFromUnitVectors(up, d.normalize()); }
  };
  b.userData.setDraw(0);
  return b;
}

function hairCap(a, color, y = 0.185) {
  const M = a.M('hair', color, { roughness: 0.55 });
  const cap = mesh(new THREE.SphereGeometry(0.2, 18, 12, 0, TAU, 0, 1.5), M, 0, y, -0.014); cap.rotation.x = -0.55; cap.scale.set(0.99, 1.02, 1.02); a.j.head.add(cap);
  return M;
}

// ------------------------------------------------------------------ AKIO
export function makeAkio(opts = {}) {
  const old = !!opts.old;
  const a = new Actor({ seed: old ? 5 : 1, skin: old ? 0xd9b592 : 0xf2caa2, hair: old ? 0x9a9aa2 : 0x0d0d12, under: old ? 0x08080c : 0x161f48, scale: old ? 1.16 : 1.0, disColor: old ? 0xffc860 : 0x66c8ff, shoe: 0x18120e, ...opts.style });
  const j = a.j, M = a.M;
  const armorC = old ? COLORS.lordArmor : COLORS.akioArmor;
  const armor = M('armor', armorC, { roughness: old ? 0.28 : 0.42, metalness: old ? 0.75 : 0.45 });
  const trim = M('trim', old ? 0x25252c : COLORS.akioTrim, { roughness: 0.35, metalness: 0.8 });
  const sash = M('sash', old ? 0x5a1218 : COLORS.sash, { roughness: 0.8 });
  // peitoral (dō) com lâminas
  const chest = mesh(C(0.25, 0.2, 0.4, 12), armor, 0, 0.2, 0.0); chest.scale.z = 0.78; j.chest.add(chest);
  for (let i = 0; i < 3; i++) { const l = mesh(C(0.252 - i * 0.012, 0.25 - i * 0.012, 0.014, 12), trim, 0, 0.33 - i * 0.11, 0); l.scale.z = 0.79; j.chest.add(l); }
  j.chest.add(mesh(B(0.3, 0.07, 0.24), armor, 0, 0.385, 0));                                           // gola
  // ombreiras (sode)
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = grp(j['arm' + s], 0.045 * sx, 0.05, 0); sh.rotation.z = 0.25 * sx;
    const big = old ? 1.35 : 1;
    for (let i = 0; i < 3; i++) { sh.add(mesh(B(0.05 * big, 0.085, (0.22 - i * 0.012) * big), armor, 0.015 * i * sx, -i * 0.078, 0)); sh.add(mesh(B(0.054 * big, 0.012, (0.224 - i * 0.012) * big), trim, 0.015 * i * sx, -i * 0.078 - 0.04, 0)); }
    if (old) { const spike = mesh(new THREE.ConeGeometry(0.035, 0.2, 5), armor, 0.03 * sx, 0.1, 0); spike.rotation.z = -0.5 * sx; sh.add(spike); }
    j['fore' + s].add(mesh(C(0.066, 0.056, 0.2, 8), armor, 0, -0.13, 0));                              // kote
    j['shin' + s].add(mesh(C(0.085, 0.066, 0.3, 8), armor, 0, -0.2, 0.008));                           // suneate
    j['shin' + s].add(mesh(C(0.087, 0.087, 0.014, 8), trim, 0, -0.06, 0.008));
    j['leg' + s].add(mesh(C(0.112, 0.1, 0.34, 10), M('hakama', old ? 0x0c0c12 : 0x1a2556), 0, -0.19, 0));
  }
  // saiote (kusazuri): placas que pendem do quadril e balançam
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU + 0.45, pl = grp(j.hips, Math.sin(ang) * 0.2, 0.0, Math.cos(ang) * 0.17); pl.rotation.y = ang;
    const tilt = grp(pl); tilt.add(mesh(B(0.15, 0.25, 0.028), armor, 0, -0.13, 0)); tilt.add(mesh(B(0.154, 0.012, 0.032), trim, 0, -0.25, 0));
    a.sway(tilt, 0.07, 1.1, i * 1.7, -0.16);
  }
  // faixa vermelha na cintura, com nó e pontas
  const obi = mesh(C(0.215, 0.215, 0.095, 14), sash, 0, 0.1, 0); obi.scale.z = 0.8; j.hips.add(obi);
  const knot = grp(j.hips, 0.13, 0.1, 0.14); knot.add(mesh(S(0.045, 8, 6), sash));
  for (let i = 0; i < 2; i++) { const t1 = grp(knot, 0.02 * (i ? 1 : -1), -0.02, 0); t1.add(mesh(B(0.05, 0.3, 0.012), sash, 0, -0.15, 0)); const t2 = grp(t1, 0, -0.3, 0); t2.add(mesh(B(0.045, 0.22, 0.012), sash, 0, -0.11, 0)); a.sway(t1, 0.22, 1.5, i * 2.1, 0.12); a.sway(t2, 0.3, 1.9, i * 2.1 + 1, 0.1); }
  // cabeça: cabelo preso em rabo alto + faixa
  const hairM = hairCap(a, a.style.hair);
  if (!old) for (let i = 0; i < 5; i++) { const f = mesh(new THREE.ConeGeometry(0.04, 0.13, 5), hairM, (i - 2) * 0.062, 0.3 - Math.abs(i - 2) * 0.012, 0.15); f.rotation.set(2.75, 0, (i - 2) * -0.22); j.head.add(f); }
  const tie = grp(j.head, 0, 0.36, -0.1); tie.add(mesh(C(0.035, 0.045, 0.07, 8), sash)); tie.rotation.x = -0.7;
  let prev = grp(tie, 0, 0.04, 0);
  for (let i = 0; i < 3; i++) { prev.add(mesh(C(0.045 - i * 0.012, 0.03 - i * 0.008, 0.15, 7), hairM, 0, 0.075, 0)); a.sway(prev, 0.16, 1.4, i * 0.9, i === 0 ? -0.25 : -0.55); prev = grp(prev, 0, 0.15, 0); }
  const band = mesh(new THREE.TorusGeometry(0.19, 0.02, 6, 20), sash, 0, 0.245, 0); band.rotation.x = Math.PI / 2 - 0.12; band.scale.set(0.97, 1.0, 1); j.head.add(band);
  for (let i = 0; i < 2; i++) { const t1 = grp(j.head, 0.03 * (i ? 1 : -1), 0.25, -0.19); t1.add(mesh(B(0.04, 0.26, 0.01), sash, 0, -0.13, 0)); const t2 = grp(t1, 0, -0.26, 0); t2.add(mesh(B(0.036, 0.2, 0.01), sash, 0, -0.1, 0)); a.sway(t1, 0.25, 1.6, 3 + i * 1.3, 0.35); a.sway(t2, 0.3, 2.1, 4 + i, 0.2); }
  // bainha na cintura
  const saya = mesh(C(0.022, 0.018, 0.85, 6), M('saya', 0x0b0d18, { roughness: 0.3, metalness: 0.4 }), 0.24, 0.03, -0.12); saya.rotation.set(1.15, 0, 0.12); j.hips.add(saya);
  // espada na mão direita
  a.katana = makeKatana(old ? { blade: 0x2a2f3a, rune: 0x3fb4ff, dark: true } : {});
  a.katana.rotation.x = Math.PI / 2; j.handR.add(a.katana);
  if (old) dressLord(a);
  return a;
}

function crackTexture() {                                        // máscara dourada rachada
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = rng(77);
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    let x = 128 + (r() - 0.5) * 60, y = 110 + (r() - 0.5) * 60, ang = r() * TAU; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 9; i++) { ang += (r() - 0.5) * 1.3; x += Math.cos(ang) * 16; y += Math.sin(ang) * 16; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); return t;
}

// Figurino do Senhor das Horas sobre o MESMO rig e rosto de Akio (envelhecido).
function dressLord(a) {
  const j = a.j, M = a.M, armor = a.mats.armor;
  const gold = M('gold', COLORS.lordGold, { metalness: 0.95, roughness: 0.25, emissive: 0x3a2400, emissiveIntensity: 0.6 });
  // rosto envelhecido: barba grisalha, rugas, cicatriz
  const grey = a.mats.hair;
  const beard = mesh(S(0.1, 10, 8), grey, 0, 0.03, 0.07); beard.scale.set(1.1, 0.9, 0.8); j.head.add(beard);
  const must = mesh(B(0.11, 0.02, 0.03), grey, 0, 0.105, 0.172); j.head.add(must);
  const wr = M('wrinkle', 0x8a6a52);
  for (const sx of [1, -1]) { const w1 = mesh(B(0.05, 0.006, 0.006), wr, 0.08 * sx, 0.13, 0.168, false); w1.rotation.z = -0.5 * sx; j.head.add(w1); const w2 = mesh(B(0.04, 0.005, 0.006), wr, 0.12 * sx, 0.17, 0.14, false); w2.rotation.set(0, 0.6 * sx, 0.3 * sx); j.head.add(w2); }
  for (let i = 0; i < 2; i++) j.head.add(mesh(B(0.11 - i * 0.02, 0.005, 0.006), wr, 0, 0.3 + i * 0.022, 0.172 - i * 0.012, false));
  const scar = mesh(B(0.012, 0.13, 0.006), M('scar', 0xb86a5a), -0.085, 0.2, 0.172, false); scar.rotation.z = 0.25; j.head.add(scar);
  // elmo (kabuto) com crista dourada e protetor de nuca
  const helm = grp(j.head, 0, 0.19, 0); a.helm = helm;
  const dome = mesh(new THREE.SphereGeometry(0.225, 18, 10, 0, TAU, 0, 1.45), armor, 0, 0, -0.01); dome.rotation.x = -0.25; helm.add(dome);
  const neck = mesh(new THREE.CylinderGeometry(0.22, 0.36, 0.2, 14, 1, true, 1.9, 2.5), armor, 0, -0.08, 0.0); neck.material.side = THREE.DoubleSide; helm.add(neck);
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 6, 20, 2.2), gold); crest.position.set(0, 0.17, 0.17); crest.rotation.z = Math.PI / 2 - 1.1; crest.castShadow = true; helm.add(crest);
  helm.add(mesh(B(0.2, 0.05, 0.03), gold, 0, 0.1, 0.2));
  // máscara: 6 estilhaços que formam uma casca dourada sobre o rosto
  a.maskPieces = []; const crack = crackTexture();
  const maskMat = M('mask', COLORS.lordGold, { metalness: 0.95, roughness: 0.22, emissive: COLORS.lordEye, emissiveMap: crack, emissiveIntensity: 2.5, side: THREE.DoubleSide });
  const rr = rng(21);
  for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 2; iy++) {
    const phi0 = Math.PI / 2 - 0.95 + ix * (1.9 / 3), th0 = 0.95 + iy * 0.72;
    const g = new THREE.SphereGeometry(0.212, 6, 5, phi0, 1.9 / 3, th0, 0.72);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.1) * 2.6 % 1, uv.getY(i) * 2.0 % 1);
    const piece = new THREE.Mesh(g, maskMat); piece.castShadow = true; piece.position.set(0, 0.155, 0.012); piece.scale.set(0.98, 1.08, 1.0);
    const mid = phi0 + 1.9 / 6;
    piece.userData = { home: piece.position.clone(), dir: new THREE.Vector3(-Math.cos(mid) * 1.2 + (rr() - 0.5), 0.6 - iy * 1.2 + rr() * 0.6, 1.5 + rr()).normalize(), spin: new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).multiplyScalar(9), delay: rr() * 0.25 };
    j.head.add(piece); a.maskPieces.push(piece);
  }
  // olhos luminosos sobre a máscara
  a.glowEyes = [];
  const eyeMat = new THREE.MeshBasicMaterial({ color: COLORS.lordEye, toneMapped: false });
  for (const sx of [1, -1]) { const e = new THREE.Mesh(S(0.026, 8, 6), eyeMat); e.position.set(0.078 * sx, 0.188, 0.2); e.scale.set(1.5, 0.75, 0.5); e.rotation.z = 0.25 * sx; j.head.add(e); a.glowEyes.push(e); }
  a.eyeMat = eyeMat; a.eyeLight = new THREE.PointLight(COLORS.lordEye, 1.5, 3, 2); a.eyeLight.position.set(0, 0.19, 0.35); j.head.add(a.eyeLight);
  // capa rasgada
  const capeM = M('cape', 0x08080e, { roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    let p = grp(j.chest, (i - 2) * 0.1, 0.34, -0.16); p.rotation.z = (i - 2) * -0.07;
    for (let s = 0; s < 3; s++) { p.add(mesh(B(0.115 - s * 0.012, 0.36, 0.012), capeM, 0, -0.18, 0)); a.sway(p, 0.12 + s * 0.05, 1.0 + s * 0.3, i * 1.9 + s, s === 0 ? 0.3 : 0.12); p = grp(p, 0, -0.36, 0); }
  }
  /** k 0..1: a máscara se parte e os estilhaços voam; os olhos azuis se apagam. */
  a.breakMask = (k) => {
    for (const p of a.maskPieces) {
      const u = p.userData, q = Math.max(0, (k - u.delay) / (1 - u.delay)) * 1.6;
      p.position.copy(u.home).addScaledVector(u.dir, q * 1.3); p.position.y -= q * q * 1.1;
      p.rotation.set(u.spin.x * q, u.spin.y * q, u.spin.z * q); p.visible = q < 1.55;
    }
    const e = Math.max(0, 1 - k * 2.5); for (const g of a.glowEyes) { g.visible = e > 0.02; g.scale.set(1.5 * e, 0.75 * e, 0.5); }
    a.eyeLight.intensity = 1.5 * e;
  };
  a.breakMask(0);
}
export const makeLord = () => makeAkio({ old: true });

// ------------------------------------------------------------------ YUNA
export function makeYuna() {
  const a = new Actor({ seed: 2, skin: 0xf6d2b4, hair: COLORS.yunaHair, under: COLORS.yunaWhite, scale: 0.95, iris: 0x4a2c14, disColor: 0xffc860, shoe: 0xe8e0d0 });
  const j = a.j, M = a.M;
  const white = a.mats.under, red = M('red', COLORS.yunaRed, { roughness: 0.75 }), dark = M('dark', 0x6a1018, { roughness: 0.5 });
  const top = mesh(C(0.235, 0.2, 0.42, 12), white, 0, 0.2, 0); top.scale.z = 0.76; j.chest.add(top);
  const collar = mesh(B(0.05, 0.36, 0.02), red, 0.045, 0.25, 0.17); collar.rotation.z = 0.32; j.chest.add(collar);
  const collar2 = mesh(B(0.05, 0.36, 0.02), red, -0.045, 0.25, 0.168); collar2.rotation.z = -0.32; j.chest.add(collar2);
  const guard = mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI, 0.5, 1.2), dark, 0.03, 0.2, 0.04); guard.rotation.y = -Math.PI / 2 + 0.25; guard.scale.set(0.7, 0.95, 1.05); j.chest.add(guard);   // muneate
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    j['arm' + s].add(mesh(C(0.075, 0.115, 0.3, 10), white, 0, -0.14, 0));                                   // manga larga
    const sl = grp(j['fore' + s], 0, 0, 0); sl.add(mesh(C(0.085, 0.13, 0.2, 10), white, 0, -0.08, -0.01)); sl.add(mesh(C(0.131, 0.131, 0.012, 10), red, 0, -0.18, -0.01));
    j['leg' + s].add(mesh(C(0.125, 0.165, 0.44, 10), red, 0, -0.21, 0));                                     // hakama
    j['shin' + s].add(mesh(C(0.15, 0.185, 0.36, 10), red, 0, -0.17, 0));
  }
  const skirt = mesh(C(0.2, 0.27, 0.2, 14), red, 0, -0.04, 0); skirt.scale.z = 0.85; j.hips.add(skirt);
  const obi = mesh(C(0.212, 0.212, 0.1, 14), red, 0, 0.1, 0); obi.scale.z = 0.8; j.hips.add(obi);
  const bowk = grp(j.hips, 0, 0.1, -0.17); for (const sx of [1, -1]) { const l = mesh(B(0.14, 0.07, 0.02), red, 0.07 * sx, 0, 0); l.rotation.z = 0.3 * sx; bowk.add(l); }
  // cabelo castanho preso em rabo de cavalo longo, franja e fita
  const hairM = hairCap(a, COLORS.yunaHair);
  for (let i = 0; i < 6; i++) { const f = mesh(S(0.06, 8, 6), hairM, (i - 2.5) * 0.055, 0.285 - Math.abs(i - 2.5) * 0.01, 0.145); f.scale.set(0.9, 1.25, 0.6); j.head.add(f); }
  for (const sx of [1, -1]) { const lock = grp(j.head, 0.17 * sx, 0.2, 0.07); lock.add(mesh(C(0.03, 0.014, 0.26, 6), hairM, 0, -0.13, 0)); a.sway(lock, 0.12, 1.3, sx, 0.05); }
  const tie = grp(j.head, 0, 0.33, -0.15); tie.rotation.x = -1.0; tie.add(mesh(C(0.04, 0.05, 0.06, 8), red));
  for (const sx of [1, -1]) { const rb = mesh(B(0.12, 0.05, 0.012), red, 0.06 * sx, 0, 0); rb.rotation.z = 0.4 * sx; tie.add(rb); }
  let prev = grp(tie, 0, 0.03, 0);
  for (let i = 0; i < 5; i++) { prev.add(mesh(C(0.05 - i * 0.008, 0.042 - i * 0.008, 0.15, 7), hairM, 0, 0.075, 0)); a.sway(prev, 0.13, 1.2, i * 0.8, i === 0 ? -0.5 : -0.38); prev = grp(prev, 0, 0.15, 0); }
  // aljava nas costas
  const quiver = grp(j.chest, -0.1, 0.2, -0.2); quiver.rotation.z = 0.45; quiver.add(mesh(C(0.05, 0.045, 0.45, 8), M('leather', 0x4a2a18), 0, 0, 0));
  for (let i = 0; i < 4; i++) { quiver.add(mesh(C(0.005, 0.005, 0.2, 4), M('shaft', 0xd8c8a0), (i - 1.5) * 0.02, 0.3, (i % 2) * 0.02 - 0.01)); quiver.add(mesh(B(0.03, 0.06, 0.004), white, (i - 1.5) * 0.02, 0.38, (i % 2) * 0.02 - 0.01)); }
  // arco na mão esquerda
  a.bow = makeBow(); a.bow.rotation.set(0, Math.PI / 2, 0); a.bow.position.set(0, -0.02, 0.0); j.handL.add(a.bow);
  return a;
}

// ------------------------------------------------------------------ coadjuvantes
export function makeWarrior(i) {                                 // guerreiro mascarado (ep. 2)
  const a = new Actor({ seed: 10 + i, skin: 0xcaa888, hair: 0x101010, under: 0x24242c, scale: 1.02 + (i % 3) * 0.03, disColor: 0x66c8ff, shoe: 0x101010 });
  const j = a.j, M = a.M, cloth = M('cloth', 0x3a1418, { roughness: 0.8 }), plate = M('plate', 0x2c2c34, { metalness: 0.5, roughness: 0.4 });
  const top = mesh(C(0.245, 0.2, 0.42, 10), plate, 0, 0.2, 0); top.scale.z = 0.78; j.chest.add(top);
  for (const s of ['L', 'R']) { j['arm' + s].add(mesh(B(0.07, 0.2, 0.2), plate, s === 'L' ? 0.05 : -0.05, -0.05, 0)); j['leg' + s].add(mesh(C(0.115, 0.13, 0.4, 8), cloth, 0, -0.2, 0)); }
  const skirt = mesh(C(0.21, 0.27, 0.24, 10), cloth, 0, -0.04, 0); j.hips.add(skirt);
  const hood = mesh(S(0.205, 14, 10), cloth, 0, 0.18, -0.02); j.head.add(hood);
  const maskM = M('omask', 0xe8e2d4, { roughness: 0.4 });
  const mk = mesh(new THREE.SphereGeometry(0.2, 12, 8, Math.PI / 2 - 0.85, 1.7, 0.85, 1.5), maskM, 0, 0.16, 0.02); mk.scale.set(1, 1.05, 1.02); j.head.add(mk);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false });
  for (const sx of [1, -1]) { const e = new THREE.Mesh(B(0.06, 0.012, 0.01), eyeM); e.position.set(0.075 * sx, 0.19, 0.212); e.rotation.z = 0.3 * sx; j.head.add(e); const h = mesh(new THREE.ConeGeometry(0.022, 0.09, 5), maskM, 0.09 * sx, 0.33, 0.14); h.rotation.x = 0.3; j.head.add(h); }
  a.katana = makeKatana({ blade: 0x9aa0aa, rune: 0xff4030 }); a.katana.userData.setGlow(0.0); a.katana.rotation.x = Math.PI / 2; j.handR.add(a.katana);
  return a;
}
export function makeChild(i) {                                   // criança da vila (ep. 5)
  const cols = [0xe86a5a, 0x4a9ad8, 0xf0b840, 0x6cc070];
  const a = new Actor({ seed: 30 + i, skin: 0xf6d2b4, hair: i % 2 ? 0x3a2214 : 0x15151a, under: cols[i % 4], scale: 0.56 + (i % 3) * 0.04, shoe: 0x5a3a20 });
  const j = a.j, M = a.M, cl = a.mats.under;
  const top = mesh(C(0.245, 0.23, 0.44, 10), cl, 0, 0.2, 0); top.scale.z = 0.8; j.chest.add(top);
  j.hips.add(mesh(C(0.22, 0.27, 0.34, 10), cl, 0, -0.1, 0));
  j.hips.add(mesh(C(0.225, 0.225, 0.07, 10), M('belt', 0xfff0d8), 0, 0.1, 0));
  hairCap(a, a.style.hair); j.head.scale.setScalar(1.25);
  if (i % 2) { const bun = mesh(S(0.07, 8, 6), a.mats.hair, 0, 0.4, -0.05); j.head.add(bun); }
  return a;
}
