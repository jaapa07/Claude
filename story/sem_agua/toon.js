// toon.js: stylized 3D cartoon people for "Sem Água". Real 3D bodies (capsules, spheres) that take the set's light and
// shadows, and a painted face (eyes, brows, mouth, blush, sweat) on a curved patch of the head, redrawn per expression.
// Every pose and every expression is a plain object, so a shot is a pure function of time.
import * as S from '../engine/stage.js';
const { THREE, clamp, lerp } = S;

const mats = {};
function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, emissive: o.emissive || '#000000', emissiveIntensity: o.glow ?? 1 });
  return mats[k];
}
function cap(r, len, color, o) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), M(color, o)); m.castShadow = true; m.receiveShadow = true; return m; }
function ball(r, color, o, ws = 20, hs = 16) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), M(color, o)); m.castShadow = true; m.receiveShadow = true; return m; }
// a limb segment hanging down from its joint: a group at the joint, the capsule below it
function seg(r, len, color, o) { const g = new THREE.Group(); const c = cap(r, len, color, o); c.position.y = -len / 2; g.add(c); g.userData.len = len; return g; }

// the face patch covers phi in [PH0, PH0 + PHL] around the head and theta in [TH0, TH0 + THL] from the top
const PHL = 2.3, PH0 = Math.PI / 2 - PHL / 2, TH0 = 0.55, THL = 1.75;
// the head-local direction of a point on the face texture (u: 0 left .. 1 right as seen from the front, v: 0 top .. 1 bottom)
export function faceDir(u, v) { const phi = PH0 + (1 - u) * PHL, th = TH0 + v * THL; return new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)); }

export const FACE = {
  neutral: { brow: 0, browY: 0, eye: 1, mouth: 'smile', smile: 0.3 },
  smile: { brow: 0.1, eye: 0.9, mouth: 'smile', smile: 1, blush: 0.3 },
  happy: { brow: 0.25, eye: 0.15, mouth: 'grin', smile: 1, blush: 0.4 },          // eyes squeezed shut into arcs
  worried: { brow: -0.8, browY: 0.04, eye: 1.1, mouth: 'flat', smile: -0.3 },
  forced: { brow: -0.6, browY: 0.03, eye: 1.15, mouth: 'teeth', smile: 0.9, sweat: 2 },  // the frozen smile
  panic: { brow: -1, browY: 0.07, eye: 1.35, pupil: 0.6, mouth: 'wobble', smile: -0.6, sweat: 3 },
  relief: { brow: 0.6, browY: 0.02, eye: 0.0, mouth: 'o', open: 0.55, blush: 0.5 },     // the sigh: eyes closed, mouth round
  bliss: { brow: 0.5, eye: 0.0, mouth: 'smile', smile: 1.2, blush: 0.6 },
  dead: { brow: 0, browY: -0.01, eye: 0.55, pupil: 0.55, mouth: 'flat', smile: 0 },     // the thousand-yard stare
  shock: { brow: -0.2, browY: 0.09, eye: 1.45, pupil: 0.45, mouth: 'o', open: 0.9 },
  hope: { brow: 0.7, browY: 0.08, eye: 1.3, pupil: 1.2, shine: 1, mouth: 'o', open: 0.35, blush: 0.3 },
  awkward: { brow: -0.5, browY: 0.02, eye: 0.9, mouth: 'teeth', smile: 0.45, sweat: 1, blush: 0.9 },
  laugh: { brow: 0.4, eye: 0.1, mouth: 'laugh', open: 1, blush: 0.5 },
  polite: { brow: 0.15, eye: 0.85, mouth: 'smile', smile: 0.55 },
  calm: { brow: 0.05, eye: 0.75, mouth: 'smile', smile: 0.2 },
  whisper: { brow: -0.5, browY: 0.03, eye: 1.0, pupil: 0.9, mouth: 'o', open: 0.25, blush: 0.7, sweat: 1 },
  determined: { brow: -0.9, browY: -0.03, eye: 0.7, mouth: 'flat', smile: -0.1, sweat: 2 },
};
const mixFace = (a, b, k) => { const o = Object.assign({}, k < 0.5 ? a : b); for (const key of ['brow', 'browY', 'eye', 'pupil', 'smile', 'open', 'blush', 'sweat', 'shine']) o[key] = lerp(a[key] ?? (key === 'pupil' ? 1 : 0), b[key] ?? (key === 'pupil' ? 1 : 0), k); if (a.mouth !== b.mouth && Math.abs(k - 0.5) < 0.2) o.mouth = 'flat'; return o; };
export { mixFace };

export class Toon {
  // o: {height, skin, hair, hairStyle: 'short'|'curly'|'pony'|'bald'|'cap', shirt, sleeve, pants, shoes, glasses, beard, apron, lips}
  constructor(o = {}) {
    this.o = o = Object.assign({ height: 1.75, skin: '#e0ac86', hair: '#3a2618', hairStyle: 'short', shirt: '#d9a12b', pants: '#2c3d5c', shoes: '#f2f0ea', glasses: false, beard: null }, o);
    const s = o.height / 1.75; this.s = s;
    const root = new THREE.Group(); this.root = root;
    const legL = 0.78 * s, thigh = legL * 0.5, shin = legL * 0.5;
    this.hipY = legL + 0.05 * s;
    const hips = new THREE.Group(); hips.position.y = this.hipY; root.add(hips); this.hips = hips;
    const pelvis = ball(0.16 * s, o.pants); pelvis.scale.set(1.05, 0.7, 0.75); hips.add(pelvis);
    const spine = new THREE.Group(); hips.add(spine); this.spine = spine;
    const torso = cap(0.17 * s, 0.3 * s, o.shirt); torso.position.y = 0.26 * s; torso.scale.set(1.0, 1, 0.72); spine.add(torso); this.torso = torso;
    if (o.apron) { const ap = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.55 * s, 0.02 * s), M(o.apron)); ap.position.set(0, 0.08 * s, 0.135 * s); ap.castShadow = true; spine.add(ap); }
    if (o.collar) { const cl = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.022 * s, 8, 18), M(o.collar)); cl.rotation.x = Math.PI / 2; cl.position.y = 0.5 * s; spine.add(cl); }
    const neck = cap(0.055 * s, 0.06 * s, o.skin); neck.position.y = 0.53 * s; spine.add(neck);
    // the head
    const head = new THREE.Group(); head.position.y = 0.6 * s; spine.add(head); this.head = head;
    const R = 0.155 * s; this.R = R;
    const skull = ball(R, o.skin, {}, 32, 24); skull.position.y = R * 0.95; skull.scale.set(1, 1.08, 1); head.add(skull); this.skull = skull;
    const earL = ball(R * 0.22, o.skin), earR = ball(R * 0.22, o.skin); earL.position.set(-R * 0.98, R * 0.92, 0); earR.position.set(R * 0.98, R * 0.92, 0); earL.scale.z = earR.scale.z = 0.6; head.add(earL, earR);
    const nose = ball(R * 0.15, o.skin); nose.position.copy(faceDir(0.5, 0.58).multiplyScalar(R * 1.0)); nose.position.y = nose.position.y * 1.08 + R * 0.95; nose.scale.set(1, 0.9, 0.9); head.add(nose);
    // the painted face
    this.fc = document.createElement('canvas'); this.fc.width = 1024; this.fc.height = 800;
    this.ftex = new THREE.CanvasTexture(this.fc); this.ftex.colorSpace = THREE.SRGBColorSpace; this.ftex.anisotropy = 4;
    const fg = new THREE.SphereGeometry(R * 1.006, 48, 32, PH0, PHL, TH0, THL);
    const face = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: this.ftex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.position.y = R * 0.95; face.scale.set(1, 1.08, 1); face.renderOrder = 2; head.add(face); this.face = face;
    // hair
    const hairM = M(o.hair, { rough: 0.9 });
    const hairCap = (r, y, z, sx, sy, sz, th = 1.25) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, th), hairM); h.position.set(0, y, z); h.scale.set(sx, sy, sz); h.castShadow = true; head.add(h); return h; };
    if (o.hairStyle === 'short') { hairCap(R * 1.06, R * 1.0, -R * 0.06, 1, 1.1, 1.02, 0.95); const back = ball(R * 0.98, o.hair, { rough: 0.9 }); back.position.set(0, R * 0.95, -R * 0.12); back.scale.set(1.03, 1.02, 0.95); head.add(back);
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(R * 0.16, R * 0.42, 8), hairM); tuft.position.set(R * 0.15, R * 2.12, R * 0.05); tuft.rotation.set(0.5, 0, -0.5); head.add(tuft);
      const fringe = ball(R * 0.42, o.hair, { rough: 0.9 }); fringe.position.set(-R * 0.3, R * 1.78, R * 0.55); fringe.scale.set(1.3, 0.5, 0.7); head.add(fringe); }
    if (o.hairStyle === 'curly') { for (const [x, y, z, r] of [[0, 1.85, -0.1, 0.55], [-0.6, 1.6, -0.2, 0.5], [0.6, 1.6, -0.2, 0.5], [-0.75, 1.1, -0.35, 0.45], [0.75, 1.1, -0.35, 0.45], [0, 1.35, -0.7, 0.6], [-0.4, 0.7, -0.6, 0.45], [0.4, 0.7, -0.6, 0.45], [-0.35, 1.9, 0.35, 0.38], [0.35, 1.9, 0.35, 0.38], [-0.82, 0.6, -0.15, 0.36], [0.82, 0.6, -0.15, 0.36]]) { const b = ball(R * r, o.hair, { rough: 0.95 }, 14, 10); b.position.set(R * x, R * y, R * z); head.add(b); } }
    if (o.hairStyle === 'pony') { hairCap(R * 1.05, R * 0.98, -R * 0.04, 1, 1.12, 1.03, 1.0); const back = ball(R * 1.0, o.hair, { rough: 0.9 }); back.position.set(0, R * 0.9, -R * 0.15); back.scale.set(1.04, 1.05, 0.95); head.add(back);
      const tail = cap(R * 0.26, R * 1.2, o.hair, { rough: 0.9 }); tail.position.set(0, R * 0.9, -R * 1.25); tail.rotation.x = 0.5; head.add(tail); const tie = ball(R * 0.2, '#c8372d'); tie.position.set(0, R * 1.55, -R * 0.98); head.add(tie); }
    if (o.hairStyle === 'cap') { const c = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 24, 14, 0, Math.PI * 2, 0, 1.45), M(o.capColor || '#c8372d')); c.position.y = R * 0.98; c.castShadow = true; head.add(c);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.75, R * 0.75, R * 0.06, 20, 1, false, -Math.PI / 2 - 0.9, 1.8), M(o.capColor || '#c8372d')); brim.position.set(0, R * 1.42, R * 0.55); brim.scale.z = 1.3; head.add(brim); }
    if (o.hairStyle === 'bald') { const h = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 24, 12, 0, Math.PI * 2, 1.2, 0.9), hairM); h.position.y = R * 0.95; h.scale.set(1, 1.08, 1); head.add(h); }
    if (o.beard) { const b = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 28, 14, PH0 - 0.35, PHL + 0.7, 2.02, 0.85), M(o.beard, { rough: 0.95 })); b.position.y = R * 0.95; b.scale.set(1, 1.08, 1.02); b.castShadow = true; head.add(b); this.beard = b; }
    if (o.glasses) {                                                          // round black frames in front of the eyes
      const gm = M('#121212', { rough: 0.4 }); const g = new THREE.Group();
      for (const u of [0.375, 0.625]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.25, R * 0.034, 8, 24), gm); const p = faceDir(u, 0.43).multiplyScalar(R * 1.12); ring.position.set(p.x, p.y * 1.08 + R * 0.95, p.z); ring.lookAt(ring.position.clone().multiplyScalar(2).setY(ring.position.y)); g.add(ring); }
      const br = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.025, R * 0.025, R * 0.18, 6), gm); const pb = faceDir(0.5, 0.41).multiplyScalar(R * 1.14); br.position.set(pb.x, pb.y * 1.08 + R * 0.95, pb.z); br.rotation.z = Math.PI / 2; g.add(br);
      head.add(g); this.glasses = g; }
    // arms: shoulder -> elbow -> hand
    const mkArm = side => {
      const sh = new THREE.Group(); sh.position.set(side * 0.215 * s, 0.43 * s, 0); spine.add(sh);
      const up = seg(0.058 * s, 0.2 * s, o.skin); sh.add(up);
      const sleeve = cap(0.075 * s, 0.1 * s, o.sleeve || o.shirt); sleeve.position.y = -0.06 * s; up.add(sleeve);
      const el = new THREE.Group(); el.position.y = -0.27 * s; up.add(el);
      const fo = seg(0.05 * s, 0.2 * s, o.skin); el.add(fo);
      const hand = new THREE.Group(); hand.position.y = -0.27 * s; fo.add(hand);
      const palm = ball(0.06 * s, o.skin); palm.scale.set(0.85, 1.1, 0.6); hand.add(palm);
      const thumb = cap(0.022 * s, 0.04 * s, o.skin); thumb.position.set(-side * 0.05 * s, 0.0, 0.02 * s); thumb.rotation.z = side * 0.6; hand.add(thumb);
      return { sh, el, hand, palm };
    };
    this.armL = mkArm(-1); this.armR = mkArm(1);
    const mkLeg = side => {
      const hp = new THREE.Group(); hp.position.set(side * 0.09 * s, 0, 0); hips.add(hp);
      const th = seg(0.082 * s, thigh - 0.08 * s, o.pants); hp.add(th);
      const kn = new THREE.Group(); kn.position.y = -thigh; hp.add(kn);
      const sh = seg(0.07 * s, shin - 0.08 * s, o.pants); kn.add(sh);
      const ft = new THREE.Group(); ft.position.y = -shin + 0.02 * s; kn.add(ft);
      const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.055 * s, 0.11 * s, 4, 10), M(o.shoes)); shoe.rotation.x = Math.PI / 2; shoe.position.set(0, -0.015 * s, 0.05 * s); shoe.scale.set(1.05, 1, 0.75); shoe.castShadow = true; ft.add(shoe);
      if (o.sole !== false) { const so = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.025 * s, 0.24 * s), M(o.soleColor || '#ffffff')); so.position.set(0, -0.055 * s, 0.05 * s); ft.add(so); }
      return { hp, kn, ft };
    };
    this.legL = mkLeg(-1); this.legR = mkLeg(1);
    this.lastFace = '';
    this.pose({}); this.expr(FACE.neutral);
  }
  // p: {lean (x, forward +), side (z), twist (y), head: [x, y, z], armL/armR: [forward, out, elbow, twist], legL/legR: [forward, out, knee], sit: 0..1, squat, hipY}
  pose(p) {
    const s = this.s;
    this.hips.position.y = this.hipY + (p.hipY || 0) - (p.sit ? p.sit * (this.hipY - 0.47 * s) : 0);
    this.hips.rotation.set(0, p.hipTwist || 0, p.hipSide || 0);
    this.spine.rotation.set(p.lean || 0, p.twist || 0, p.side || 0);
    const h = p.head || [0, 0, 0]; this.head.rotation.set(h[0], h[1], h[2]);
    const arm = (A, v, side) => { v = v || [0.05, 0.12, 0.15, 0]; A.sh.rotation.set(-v[0], v[3] || 0, side * (v[1] ?? 0.12)); A.el.rotation.set(-(v[2] ?? 0.15), 0, 0); A.hand.rotation.set(v[4] || 0, 0, 0); };
    arm(this.armL, p.armL, -1); arm(this.armR, p.armR, 1);
    const sit = p.sit || 0;
    const leg = (Lg, v, side) => { v = v || [0, 0.03, 0]; Lg.hp.rotation.set(-(v[0] + sit * 1.5), v[3] || 0, side * (v[1] ?? 0.03)); Lg.kn.rotation.set(v[2] + sit * 1.5, 0, 0); Lg.ft.rotation.set(-(v[2] + sit * 1.5) + (v[0] + sit * 1.5) * 0.9 + (v[4] || 0), 0, 0); };
    leg(this.legL, p.legL, -1); leg(this.legR, p.legR, 1);
    return this;
  }
  // the face: f = an expression object (see FACE); look = [x, y] pupils (-1..1); blink 0..1
  expr(f, look = [0, 0], blink = 0, extra = {}) {
    const key = JSON.stringify([f, look.map(x => x.toFixed(2)), blink.toFixed(2), extra]);
    if (key === this.lastFace) return this; this.lastFace = key;
    const c = this.fc.getContext('2d'), W = 1024, H = 800; c.clearRect(0, 0, W, H);
    const ink = '#1b1410', u = x => x * W, v = y => y * H;
    const eyeOpen = Math.max(0, (f.eye ?? 1) * (1 - blink)), EY = 0.43, EX = [0.375, 0.625];
    // blush
    if (f.blush) { c.fillStyle = `rgba(232,96,86,${0.4 * f.blush})`; for (const x of [0.27, 0.73]) { c.beginPath(); c.ellipse(u(x), v(0.62), 62, 34, 0, 0, 7); c.fill(); } }
    // eyes: white ovals with pupils; closed = an arc
    for (const [x, sd] of [[EX[0], -1], [EX[1], 1]]) {
      const cx = u(x), cy = v(EY), rx = 58, ry = 70 * Math.min(1.4, eyeOpen);
      if (eyeOpen < 0.18) { c.strokeStyle = ink; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); if ((f.smile ?? 0) > 0.4 || f.mouth === 'laugh' || f.mouth === 'grin') c.arc(cx, cy + 22, 40, Math.PI * 1.12, Math.PI * 1.88); else c.arc(cx, cy - 18, 40, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); continue; }
      c.fillStyle = '#fbfaf6'; c.strokeStyle = ink; c.lineWidth = 11; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill(); c.stroke();
      c.save(); c.beginPath(); c.ellipse(cx, cy, rx - 5, ry - 5, 0, 0, 7); c.clip();
      const pr = 30 * (f.pupil ?? 1), px = cx + look[0] * 22, py = cy + look[1] * 24 + 8;
      c.fillStyle = this.o.iris || '#4a2c18'; c.beginPath(); c.arc(px, py, pr + 9, 0, 7); c.fill(); c.fillStyle = '#0d0a08'; c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(px - pr * 0.35, py - pr * 0.42, Math.max(6, pr * 0.34), 0, 7); c.fill();
      if (f.shine) { c.beginPath(); c.arc(px + pr * 0.35, py + pr * 0.3, pr * 0.2, 0, 7); c.fill(); }
      if (eyeOpen < 0.95) { c.fillStyle = this.o.skin; const lid = (1 - eyeOpen / 0.95) * 2 * ry; c.fillRect(cx - rx - 12, cy - ry - 12, rx * 2 + 24, lid + 12); c.strokeStyle = ink; c.lineWidth = 12; c.beginPath(); c.moveTo(cx - rx, cy - ry + lid); c.lineTo(cx + rx, cy - ry + lid); c.stroke(); }
      c.restore();
    }
    // brows: brow > 0 relaxed and high, brow < 0 worried (inner ends up)
    const b = f.brow ?? 0, by = v(0.24) - (f.browY ?? 0) * H;
    c.strokeStyle = this.o.browColor || this.o.hair; c.lineWidth = 24; c.lineCap = 'round';
    for (const [x, sd] of [[EX[0], -1], [EX[1], 1]]) { const inner = u(x) - sd * 50, outer = u(x) + sd * 56; const yi = by + (b < 0 ? b * 34 : b * 6), yo = by + (b < 0 ? -b * 10 : -b * 16); c.beginPath(); c.moveTo(inner, yi); c.quadraticCurveTo(u(x), Math.min(yi, yo) - 16, outer, yo); c.stroke(); }
    // mouth
    const sm = f.smile ?? 0; c.save(); c.translate(u(0.5), v(0.735)); c.scale(1.45, 1.35); const mx = 0, my = 0;
    c.strokeStyle = ink; c.lineWidth = 15; c.lineCap = 'round'; c.lineJoin = 'round';
    if (f.mouth === 'smile' || f.mouth === 'flat') { const w = f.mouth === 'flat' ? 62 : 92; c.beginPath(); c.moveTo(mx - w, my - sm * 26); c.quadraticCurveTo(mx, my + sm * 60, mx + w, my - sm * 26); c.stroke(); }
    else if (f.mouth === 'grin' || f.mouth === 'laugh') {
      const w = 100, o = f.mouth === 'laugh' ? 100 * (f.open ?? 1) : 60; c.fillStyle = '#5a1f1c'; c.beginPath(); c.moveTo(mx - w, my - 26); c.quadraticCurveTo(mx, my - 8, mx + w, my - 26); c.quadraticCurveTo(mx, my + o + 12, mx - w, my - 26); c.fill(); c.stroke();
      c.save(); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(mx - w, my - 36, w * 2, 32); c.fillStyle = '#e06a6a'; c.beginPath(); c.ellipse(mx, my + o, 50, 28, 0, 0, 7); c.fill(); c.restore(); }
    else if (f.mouth === 'teeth') {                                           // the frozen smile: wide, clenched teeth
      const w = 86 + 26 * sm, h = 44; c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(mx - w, my - 18 * sm); c.quadraticCurveTo(mx, my - 8, mx + w, my - 18 * sm); c.quadraticCurveTo(mx, my + h + 12 * sm, mx - w, my - 18 * sm); c.closePath(); c.fill(); c.stroke();
      c.save(); c.clip(); c.lineWidth = 7; c.beginPath(); c.moveTo(mx - w, my + 6); c.lineTo(mx + w, my + 6); for (let k = -3; k <= 3; k++) { c.moveTo(mx + k * w * 0.26, my - 20); c.lineTo(mx + k * w * 0.26, my + 40); } c.stroke(); c.restore(); }
    else if (f.mouth === 'o') { const r = 18 + 42 * (f.open ?? 0.5); c.fillStyle = '#4a1a18'; c.beginPath(); c.ellipse(mx, my + 8, r * 0.8, r, 0, 0, 7); c.fill(); c.stroke(); }
    else if (f.mouth === 'wobble') { c.beginPath(); for (let k = 0; k <= 12; k++) { const x = mx - 84 + k * 14, y = my + 12 + Math.sin(k * 1.9) * 14; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.restore();
    // sweat drops at the temples
    const n = Math.round(f.sweat || 0);
    for (let k = 0; k < n; k++) { const [x, y] = [[0.86, 0.2], [0.13, 0.3], [0.9, 0.5]][k]; const dy = ((extra.sweatT || 0) * 50 + k * 23) % 70; c.fillStyle = '#a8dcff'; c.strokeStyle = '#2a6f9e'; c.lineWidth = 6; c.beginPath(); c.moveTo(u(x), v(y) + dy - 38); c.quadraticCurveTo(u(x) + 28, v(y) + dy + 16, u(x), v(y) + dy + 28); c.quadraticCurveTo(u(x) - 28, v(y) + dy + 16, u(x), v(y) + dy - 38); c.fill(); c.stroke(); }
    if (this.o.lips) { /* drawn by mouth already */ }
    this.ftex.needsUpdate = true; return this;
  }
  // world position of the head centre (for aiming the camera)
  headPos() { this.root.updateMatrixWorld(true); return this.skull.getWorldPosition(new THREE.Vector3()); }
  handPos(side = 'R') { this.root.updateMatrixWorld(true); return (side === 'R' ? this.armR : this.armL).hand.getWorldPosition(new THREE.Vector3()); }
}
