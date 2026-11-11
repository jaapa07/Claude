import * as THREE from 'three';
import { lerp, clamp, noise1, TAU } from '../core/util.js';
import { patchDissolve } from '../shaders/dissolve.js';

// Rig humanoide estilizado, montado só com primitivas. Todos os personagens saem daqui,
// então proporções, cores e articulações ficam idênticas nos cinco episódios.

const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const sphere = (r, ws = 16, hs = 12) => G(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
const box = (x, y, z) => G(`b${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));
const cyl = (rt, rb, h, seg = 10, open = false) => G(`c${rt}_${rb}_${h}_${seg}_${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));

export function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = false; return m;
}
const joint = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
/** Membro: cilindro afunilado que desce a partir da articulação, com esfera na ponta. */
function limb(parent, len, r0, r1, mat) {
  const m = mesh(cyl(r0, r1, len), mat, 0, -len / 2, 0); parent.add(m);
  parent.add(mesh(sphere(r0), mat)); return m;
}

export class Actor {
  /** style: { skin, hair, cloth, scale, ... } ; build(actor, M) adiciona o figurino. */
  constructor(style) {
    this.style = style;
    this.dis = { uDissolve: { value: 0 }, uDisColor: { value: new THREE.Color(style.disColor ?? 0xffc860) }, uDisScale: { value: style.disScale ?? 7 } };
    this.mats = {};
    this.sways = [];
    this.root = new THREE.Group();
    this.body = joint(this.root, 0, 0, 0);
    this.body.scale.setScalar(style.scale ?? 1);
    const M = (name, color, o = {}) => (this.mats[name] ??= patchDissolve(new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.0, ...o }), this.dis));
    this.M = M;
    const skin = M('skin', style.skin ?? 0xf0c8a0, { roughness: 0.6 });
    const under = M('under', style.under ?? 0x151a30);
    const j = (this.j = {});
    j.hips = joint(this.body, 0, 0.92, 0);
    j.spine = joint(j.hips, 0, 0.08, 0);
    j.chest = joint(j.spine, 0, 0.16, 0);
    j.neck = joint(j.chest, 0, 0.38, 0);
    j.head = joint(j.neck, 0, 0.07, 0);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      j['arm' + s] = joint(j.chest, 0.25 * sx, 0.3, 0);
      j['fore' + s] = joint(j['arm' + s], 0, -0.29, 0);
      j['hand' + s] = joint(j['fore' + s], 0, -0.27, 0);
      j['leg' + s] = joint(j.hips, 0.11 * sx, -0.02, 0);
      j['shin' + s] = joint(j['leg' + s], 0, -0.43, 0);
      j['foot' + s] = joint(j['shin' + s], 0, -0.42, 0);
      limb(j['arm' + s], 0.29, 0.068, 0.058, under);
      limb(j['fore' + s], 0.27, 0.056, 0.046, under);
      j['hand' + s].add(mesh(sphere(0.058, 10, 8), skin));
      limb(j['leg' + s], 0.43, 0.095, 0.075, under);
      limb(j['shin' + s], 0.42, 0.072, 0.055, under);
      j['foot' + s].add(mesh(box(0.11, 0.07, 0.24), M('shoe', style.shoe ?? 0x20160f), 0, -0.02, 0.05));
    }
    // tronco
    j.hips.add(mesh(cyl(0.19, 0.2, 0.2, 12), under, 0, 0.02, 0));
    const torso = mesh(cyl(0.235, 0.185, 0.42, 12), under, 0, 0.2, 0); torso.scale.z = 0.72; j.chest.add(torso);
    j.neck.add(mesh(cyl(0.055, 0.065, 0.1, 8), skin, 0, 0.0, 0));
    this._buildHead(skin);
    this.rest = {};
    for (const k in j) this.rest[k] = j[k].position.clone();
    this.expr = { blink: 0, brow: 0, mouth: 0, smile: 0 };
  }

  _buildHead(skin) {
    const st = this.style, M = this.M, head = this.j.head;
    const skull = mesh(sphere(0.19, 20, 16), skin, 0, 0.17, 0); skull.scale.set(0.93, 1.0, 0.96); head.add(skull);
    const jaw = mesh(sphere(0.13, 14, 10), skin, 0, 0.075, 0.035); jaw.scale.set(0.95, 0.8, 0.95); head.add(jaw);
    head.add(mesh(sphere(0.015, 8, 6), skin, 0, 0.135, 0.186));                                    // nariz
    for (const sx of [1, -1]) head.add(mesh(sphere(0.035, 8, 6), skin, 0.185 * sx, 0.16, 0));       // orelhas
    const white = M('eyeWhite', 0xffffff, { roughness: 0.3 }), iris = M('iris', st.iris ?? 0x2a1a12, { roughness: 0.3 });
    const browM = M('brow', st.brow ?? st.hair ?? 0x111111), mouthM = M('mouth', 0x6e3a30);
    this.eyes = []; this.brows = [];
    for (const sx of [1, -1]) {
      const eye = joint(head, 0.078 * sx, 0.176, 0.158); eye.rotation.y = 0.3 * sx; eye.scale.setScalar(1.1);
      const w = mesh(sphere(0.03, 12, 10), white, 0, 0, 0, false); w.scale.set(1.12, 1.18, 0.4); eye.add(w);
      const ir = mesh(sphere(0.024, 12, 10), iris, -0.003 * sx, -0.002, 0.008, false); ir.scale.set(1, 1.12, 0.4); eye.add(ir);
      const pu = mesh(sphere(0.012, 8, 6), M('pupil', 0x050505, { roughness: 0.2 }), -0.003 * sx, -0.002, 0.016, false); pu.scale.z = 0.4; eye.add(pu);
      const hl = mesh(sphere(0.007, 6, 4), M('hl', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.0 }), 0.007, 0.012, 0.02, false); eye.add(hl);
      const lash = mesh(box(0.07, 0.008, 0.012), M('lash', 0x15100e), 0, 0.034, 0.008, false); lash.rotation.z = -0.1 * sx; eye.add(lash);
      this.eyes.push(eye);
      const brow = joint(head, 0.078 * sx, 0.25, 0.166); brow.add(mesh(box(0.075, 0.013, 0.016), browM, 0, 0, 0, false));
      brow.userData.sx = sx; this.brows.push(brow);
    }
    this.mouth = mesh(sphere(0.03, 10, 8), mouthM, 0, 0.08, 0.166, false); this.mouth.scale.set(0.9, 0.12, 0.25); head.add(this.mouth);
  }

  /** Elemento que balança (rabo de cavalo, faixas, capa): rotação procedural em função do tempo e do movimento. */
  sway(obj, amp = 0.2, freq = 1.3, phase = 0, base = 0, axis = 'x') { this.sways.push({ obj, amp, freq, phase, base, axis }); return obj; }

  // ---------- poses (camadas com peso) ----------
  reset() {
    const j = this.j;
    for (const k in j) { j[k].rotation.set(0, 0, 0); j[k].position.copy(this.rest[k]); }
    j.armL.rotation.z = 0.12; j.armR.rotation.z = -0.12;
    this.body.position.set(0, 0, 0); this.body.rotation.set(0, 0, 0);
    this.expr.blink = 0; this.expr.brow = 0; this.expr.mouth = 0; this.expr.smile = 0;
    this.wind = 0;
    return this;
  }
  set(name, x, y, z, w = 1) {
    const r = this.j[name].rotation;
    r.x = lerp(r.x, x, w); r.y = lerp(r.y, y, w); r.z = lerp(r.z, z, w);
    return this;
  }
  place(x, y, z, ry = 0) { this.root.position.set(x, y, z); this.root.rotation.set(0, ry, 0); return this; }
  idle(t, w = 1) {
    const b = Math.sin(t * 1.7 + (this.style.seed ?? 0));
    this.j.chest.rotation.x += 0.025 * b * w; this.j.armL.rotation.z += 0.02 * b * w; this.j.armR.rotation.z -= 0.02 * b * w;
    this.j.head.rotation.y += 0.06 * noise1(t * 0.5 + (this.style.seed ?? 0) * 7) * w;
    this.body.position.y += 0.006 * b * w;
    return this;
  }
  /** ciclo de caminhada/corrida; phase em voltas (1 = dois passos). run 0..1 mistura para corrida. */
  walk(phase, w = 1, run = 0) {
    const a = phase * TAU, s = Math.sin(a), c = Math.cos(a), amp = lerp(0.5, 1.0, run);
    const j = this.j;
    this.set('legL', -s * amp, 0, 0, w); this.set('legR', s * amp, 0, 0, w);
    this.set('shinL', Math.max(0, c) * lerp(0.9, 1.7, run) + 0.1, 0, 0, w); this.set('shinR', Math.max(0, -c) * lerp(0.9, 1.7, run) + 0.1, 0, 0, w);
    this.set('armL', s * amp * 0.8 - run * 0.2, 0, 0.14, w); this.set('armR', -s * amp * 0.8 - run * 0.2, 0, -0.14, w);
    this.set('foreL', -0.25 - run * 1.1 - Math.max(0, s) * 0.3, 0, 0, w); this.set('foreR', -0.25 - run * 1.1 - Math.max(0, -s) * 0.3, 0, 0, w);
    this.set('spine', 0.06 + run * 0.28, 0, 0, w); this.set('chest', 0, s * 0.12 * amp, 0, w);
    j.hips.rotation.y += -s * 0.1 * amp * w;
    this.body.position.y += (Math.abs(Math.cos(a)) * lerp(0.035, 0.09, run) - 0.03) * w;
    this.wind = Math.max(this.wind, w * lerp(0.35, 1, run));
    return this;
  }
  /** guarda com a espada na mão direita, pés afastados. */
  guard(w = 1) {
    this.set('legL', -0.35, 0, 0.12, w); this.set('legR', 0.3, 0, -0.14, w); this.set('shinL', 0.4, 0, 0, w); this.set('shinR', 0.35, 0, 0, w);
    this.set('spine', 0.12, -0.35, 0, w); this.set('chest', 0, -0.2, 0, w); this.set('head', -0.05, 0.5, 0, w);
    this.set('armR', -0.95, 0, -0.25, w); this.set('foreR', -0.75, 0, 0, w); this.set('handR', 0.35, 0, 0, w);
    this.set('armL', -0.8, 0, -0.55, w); this.set('foreL', -1.0, 0.0, -0.5, w);
    this.body.position.y -= 0.07 * w;
    return this;
  }
  /** golpe vertical: k 0..1 (0–.4 arma, .4–.6 corta, .6–1 termina). */
  slash(k, w = 1) {
    const up = clamp(k / 0.4), cut = clamp((k - 0.4) / 0.18), cs = cut * cut * (3 - 2 * cut), us = up * up * (3 - 2 * up);
    const ax = lerp(lerp(-0.95, -3.0, us), -0.35, cs);
    this.set('armR', ax, 0, lerp(-0.25, 0.25, cs), w); this.set('foreR', lerp(lerp(-0.75, -1.3, us), -0.15, cs), 0, 0, w);
    this.set('handR', lerp(0.35, 0.7, cs), 0, 0, w);
    this.set('armL', lerp(lerp(-0.8, -2.6, us), -0.4, cs), 0, lerp(-0.55, -0.1, cs), w); this.set('foreL', lerp(-1.0, -0.4, cs), 0, -0.3, w);
    this.set('spine', lerp(lerp(0.12, -0.18, us), 0.5, cs), lerp(lerp(-0.35, -0.6, us), 0.45, cs), 0, w);
    this.set('chest', 0, lerp(-0.2, 0.3, cs), 0, w); this.set('head', -0.1 + 0.2 * cs, lerp(0.5, -0.2, cs), 0, w);
    this.set('legL', lerp(-0.35, -0.75, cs), 0, 0.12, w); this.set('shinL', lerp(0.4, 0.9, cs), 0, 0, w);
    this.set('legR', lerp(0.3, 0.55, cs), 0, -0.14, w); this.set('shinR', lerp(0.35, 0.25, cs), 0, 0, w);
    this.body.position.y -= lerp(0.07, 0.17, cs) * w; this.body.position.z += 0.25 * cs * w;
    return this;
  }
  /** golpe horizontal (da direita para a esquerda). */
  sweep(k, w = 1) {
    const up = clamp(k / 0.4), cut = clamp((k - 0.4) / 0.2), cs = cut * cut * (3 - 2 * cut), us = up * up * (3 - 2 * up);
    this.set('armR', -1.45, 0, lerp(lerp(-0.25, -1.5, us), 0.9, cs), w); this.set('foreR', lerp(-0.9, -0.2, cs), 0, 0, w);
    this.set('handR', 0.2, 0, lerp(-0.6, 0.6, cs), w);
    this.set('armL', -0.5, 0, lerp(0.2, 0.9, cs), w); this.set('foreL', -0.7, 0, 0, w);
    this.set('spine', 0.2, lerp(lerp(-0.3, -0.95, us), 0.9, cs), 0, w); this.set('chest', 0, lerp(-0.3, 0.4, cs), 0, w);
    this.set('head', 0, lerp(0.6, -0.5, cs), 0, w);
    this.set('legL', -0.5, 0, 0.2, w); this.set('shinL', 0.6, 0, 0, w); this.set('legR', 0.4, 0, -0.2, w); this.set('shinR', 0.5, 0, 0, w);
    this.body.position.y -= 0.12 * w;
    return this;
  }
  /** bloqueio: espada atravessada na frente do rosto. */
  block(w = 1) {
    this.guard(w);
    this.set('armR', -1.7, 0, 0.2, w); this.set('foreR', -0.6, 0, 0.9, w); this.set('handR', 0, 0, 1.0, w);
    this.set('armL', -1.6, 0, -0.4, w); this.set('foreL', -0.7, 0, -0.6, w);
    this.set('spine', -0.12, -0.2, 0, w);
    return this;
  }
  reach(k, side = 'R') {                                       // estende o braço para frente
    const s = side === 'R' ? -1 : 1;
    this.set('arm' + side, -1.45, 0, 0.1 * s, k); this.set('fore' + side, -0.12, 0, 0, k); this.set('spine', 0.14, 0.18 * s, 0, k);
    return this;
  }
  point(k, side = 'L', up = 0.15) {                             // aponta para o horizonte
    const s = side === 'R' ? -1 : 1;
    this.set('arm' + side, -1.5 - up, 0, 0.35 * s, k); this.set('fore' + side, -0.05, 0, 0, k);
    this.set('chest', 0, -0.25 * s, 0, k);
    return this;
  }
  /** arco armado: braço esquerdo estica segurando o arco, direito puxa a corda. draw 0..1 */
  aim(k, draw = 1, pitch = 0) {
    this.set('spine', -0.05, -1.2, 0, k); this.set('chest', 0, -0.3, 0, k); this.set('head', -pitch * 0.6, 1.35, 0, k);
    this.set('armL', -0.15, 0, 1.5 + pitch, k); this.set('foreL', 0, 0, 0.05, k);
    this.set('armR', -0.2, 0, -1.45 - pitch, k); this.set('foreR', 0, 0, -lerp(0.3, 2.3, draw), k);
    this.set('legL', -0.25, 0, 0.2, k); this.set('legR', 0.2, 0, -0.2, k);
    return this;
  }
  hug(k) {
    this.set('armL', -1.25, 0, -0.5, k); this.set('foreL', -0.8, 0, -0.9, k);
    this.set('armR', -1.25, 0, 0.5, k); this.set('foreR', -0.8, 0, 0.9, k);
    this.set('spine', 0.18, 0, 0, k); this.set('head', 0.2, 0.25, 0.1, k);
    return this;
  }
  kneel(k) {
    this.set('legL', -1.5, 0, 0.1, k); this.set('shinL', 1.6, 0, 0, k); this.set('legR', 0.1, 0, -0.1, k); this.set('shinR', 1.6, 0, 0, k);
    this.set('spine', 0.35, 0, 0, k); this.set('head', 0.3, 0, 0, k);
    this.body.position.y -= 0.42 * k;
    return this;
  }
  look(yaw, pitch = 0, w = 1) { this.j.head.rotation.y = lerp(this.j.head.rotation.y, yaw, w); this.j.head.rotation.x = lerp(this.j.head.rotation.x, pitch, w); this.j.neck.rotation.y += yaw * 0.25 * w; return this; }
  face(o) { Object.assign(this.expr, o); return this; }
  talk(t, w = 1) { this.expr.mouth = Math.max(this.expr.mouth, w * (0.25 + 0.75 * Math.abs(Math.sin(t * 13.0) * Math.sin(t * 7.3 + 1.0)))); return this; }
  dissolve(k) { this.dis.uDissolve.value = k; this.root.traverse((o) => { if (o.isMesh && o.userData.sh !== false) o.castShadow = k < 0.5; }); return this; }

  /** aplica expressão facial e balanços; chamar por último, a cada frame. */
  update(t) {
    const e = this.expr, seed = this.style.seed ?? 0;
    const cyc = (t * 0.31 + seed * 0.37) % 1, auto = cyc > 0.955 ? Math.sin(((cyc - 0.955) / 0.045) * Math.PI) : 0;   // piscada automática
    const blink = clamp(Math.max(e.blink, auto));
    for (const eye of this.eyes) eye.scale.y = 1.1 * lerp(1, 0.12, blink);
    for (const b of this.brows) { b.rotation.z = -e.brow * 0.42 * b.userData.sx; b.position.y = 0.25 - (e.brow > 0 ? e.brow * 0.014 : e.brow * 0.016); }
    this.mouth.scale.set(lerp(0.9, 1.35, e.smile) - e.mouth * 0.15, 0.12 + e.mouth * 0.6 + e.smile * 0.06, 0.25);
    this.mouth.position.y = 0.08 - e.mouth * 0.012;
    for (const s of this.sways) {
      const n = noise1(t * s.freq + s.phase + seed * 3.1);
      const v = s.base + s.amp * n + this.wind * s.amp * 2.4;
      s.obj.rotation[s.axis] = v;
    }
  }
}
