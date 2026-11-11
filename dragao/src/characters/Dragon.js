import * as THREE from 'three';
import { toon, wingGeometry } from './materials.js';
import { clamp, lerp } from '../core/util.js';

// One parametric dragon rig for the whole cast: PIPO, BRASA, the academy
// dragons and the director. All proportions/colours live in the presets below,
// so every episode builds exactly the same characters.
export const PRESETS = {
  pipo: { height: 0.5, color: 0x2ec4b6, belly: 0xffd84a, horn: 0xfff2c8, wing: 0x1fa89b, spikes: 0xffc93a, head: 1.25, eye: 1.45, body: [1, 1, 1], arm: 1, wingSize: 0.55, brow: 'none', fangs: false, blush: 0.7, snout: 0.9 },
  brasa: { height: 2.0, color: 0xd8322a, belly: 0xffa03a, horn: 0x3a2a26, wing: 0x9e1c1c, spikes: 0x3a2a26, head: 0.8, eye: 0.62, body: [1.12, 1.3, 1.0], arm: 2.3, muscle: true, wingSize: 2.0, brow: 'thick', fangs: true, blush: 0, snout: 1.15, chin: true },
  green: { height: 4.2, color: 0x3fae3f, belly: 0xd8ef7a, horn: 0xf0e6c0, wing: 0x2c7d2c, spikes: 0xf0b030, head: 0.85, eye: 0.6, body: [1.15, 1.05, 1.1], arm: 1.5, wingSize: 2.2, brow: 'thin', fangs: true, blush: 0, snout: 1.15 },
  violet: { height: 4.8, color: 0x7a4fd6, belly: 0xf3c0ff, horn: 0xffe9a8, wing: 0x5a32a8, spikes: 0xffd040, head: 0.8, eye: 0.6, body: [1.2, 1.05, 1.1], arm: 1.5, wingSize: 2.3, brow: 'thin', fangs: true, blush: 0, snout: 1.2 },
  orange: { height: 3.8, color: 0xf07d22, belly: 0xffe08a, horn: 0x5a3a20, wing: 0xb8541a, spikes: 0x5a3a20, head: 0.85, eye: 0.62, body: [1.15, 1.05, 1.1], arm: 1.5, wingSize: 2.1, brow: 'thick', fangs: true, blush: 0, snout: 1.1 },
  director: { height: 1.7, color: 0x8a86b8, belly: 0xe6ddf5, horn: 0xe8e2d0, wing: 0x66628f, spikes: 0xb8b0d8, head: 0.95, eye: 0.7, body: [1.1, 1.0, 1.05], arm: 1.3, wingSize: 1.2, brow: 'bushy', fangs: false, blush: 0, snout: 1.0, beard: true, glasses: true },
};

export class Dragon {
  constructor(preset = 'pipo') {
    const P = typeof preset === 'string' ? PRESETS[preset] : preset; this.P = P;
    this.root = new THREE.Group(); this.group = new THREE.Group(); this.root.add(this.group);
    const k = P.height / 0.5; this.group.scale.setScalar(k); this.k = k;
    const M = { skin: toon(P.color, { rough: 0.55 }), belly: toon(P.belly, { rough: 0.6 }), horn: toon(P.horn, { rough: 0.4 }), dark: toon(0x1b0d16, { rough: 0.3, rim: 0 }),
      white: toon(0xffffff, { rough: 0.15, rim: 0.2 }), mouth: toon(0x6a1426, { rough: 0.5, rim: 0 }), tongue: toon(0xff6f8a, { rough: 0.4, rim: 0 }),
      wing: toon(P.wing, { rough: 0.5, side: THREE.DoubleSide }), spikes: toon(P.spikes, { rough: 0.45 }), blush: new THREE.MeshBasicMaterial({ color: 0xff7aa0, transparent: true, opacity: P.blush * 0.7, depthWrite: false }),
      glass: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 }), hair: toon(0xf4f1ea, { rough: 0.9 }) };
    this.M = M;
    const add = (g, m, parent, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.scale.set(...s); o.rotation.set(...r); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
    const sph = (r, w = 28, h = 20) => new THREE.SphereGeometry(r, w, h);
    const [bx, by, bz] = P.body;
    // hips / body
    this.hips = new THREE.Group(); this.hips.position.y = 0.13; this.group.add(this.hips);
    this.torso = new THREE.Group(); this.hips.add(this.torso);
    this.bodyMesh = add(sph(0.125), M.skin, this.torso, [0, 0.07, 0], [bx, by * 1.12, bz]);
    this.bellyMesh = add(sph(0.11), M.belly, this.torso, [0, 0.06, 0.0625 * bz], [bx * 0.86, by * 1.0, bz * 0.62]);
    for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.075 * bx, 0.004, 6, 24, Math.PI), M.belly, this.torso, [0, 0.0 + i * 0.04, 0.128 * bz], [1, 0.35, 1], [Math.PI / 2 + 0.25, 0, Math.PI]).material = toon(new THREE.Color(P.belly).multiplyScalar(0.85).getHex());
    // head
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.17 * by, 0.0); this.torso.add(this.neck);
    this.head = new THREE.Group(); this.head.position.set(0, 0.07, 0.01); this.neck.add(this.head);
    const H = P.head; this.headScale = H;
    this.skull = add(sph(0.1 * H), M.skin, this.head, [0, 0.05 * H, 0], [1.05, 0.95, 1]);
    const sn = P.snout;
    this.snout = add(sph(0.062 * H), M.skin, this.head, [0, 0.0, 0.085 * H], [1.15 * sn, 0.8, 1.1 * sn]);
    if (P.muscle) {
      for (const s of [-1, 1]) { add(sph(0.06), M.belly, this.torso, [s * 0.05, 0.15 * by, 0.07], [1.1, 0.75, 0.6]); add(sph(0.055), M.skin, this.torso, [s * 0.115 * bx, 0.17 * by, 0], [1, 0.9, 1]); }
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) add(sph(0.024), M.belly, this.torso, [s * 0.026, 0.07 * by - i * 0.045, 0.095], [1, 0.8, 0.5]);
    }
    if (P.chin) add(sph(0.05 * H), M.skin, this.head, [0, -0.03 * H, 0.06 * H], [1.4, 0.8, 1.2]);
    for (const s of [-1, 1]) add(sph(0.009 * H, 10, 8), M.dark, this.head, [s * 0.022 * H, 0.015 * H, 0.15 * H * sn], [1, 0.7, 1]);
    this.noseTip = new THREE.Object3D(); this.noseTip.position.set(0, 0.012 * H, 0.155 * H * sn); this.head.add(this.noseTip);
    this.mouthAnchor = new THREE.Object3D(); this.mouthAnchor.position.set(0, -0.022 * H, 0.15 * H * sn); this.head.add(this.mouthAnchor);
    // mouth: cavity that opens + smile line
    this.mouthG = new THREE.Group(); this.mouthG.position.set(0, -0.022 * H, 0.118 * H * sn); this.head.add(this.mouthG);
    this.cavity = add(sph(0.04 * H, 20, 14), M.mouth, this.mouthG, [0, 0, 0], [1.1, 0.1, 0.8]);
    this.tongue = add(sph(0.022 * H, 14, 10), M.tongue, this.mouthG, [0, -0.012 * H, 0.008 * H], [1.2, 0.4, 1]);
    this.smile = add(new THREE.TorusGeometry(0.03 * H, 0.0035 * H, 6, 20, Math.PI), M.dark, this.head, [0, -0.012 * H, 0.137 * H * sn], [1.1, 1, 1], [0, 0, Math.PI]);
    if (P.fangs) for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.008 * H, 0.022 * H, 8), M.white, this.mouthG, [s * 0.022 * H, 0.008 * H, 0.025 * H], [1, 1, 1], [Math.PI, 0, 0]);
    // eyes
    const E = P.eye; this.eyes = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(s * 0.045 * H, 0.06 * H, 0.072 * H); g.rotation.y = s * 0.28; this.head.add(g);
      const r = 0.036 * E;
      const ball = add(sph(r, 24, 18), M.white, g, [0, 0, 0], [0.9, 1.05, 0.75]);
      const pupil = add(sph(r * 0.55, 18, 14), M.dark, g, [0, 0, r * 0.62], [0.9, 1.1, 0.5]);
      const hl = add(sph(r * 0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), g, [r * 0.2, r * 0.32, r * 0.9]);
      const hl2 = add(sph(r * 0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), g, [-r * 0.18, -r * 0.2, r * 0.92]);
      const lidTop = add(new THREE.SphereGeometry(r * 1.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.skin, g, [0, 0, 0], [0.9, 1.05, 0.78]);
      const lidBot = add(new THREE.SphereGeometry(r * 1.06, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.skin, g, [0, 0, 0], [0.9, 1.05, 0.78]);
      let brow = null;
      if (P.brow !== 'none') {
        const bw = P.brow === 'thick' ? 0.016 : P.brow === 'bushy' ? 0.014 : 0.008;
        brow = add(new THREE.CapsuleGeometry(bw * H, r * 1.3, 4, 10), P.brow === 'bushy' ? M.hair : M.dark, g, [0, r * 1.25, r * 0.6], [1, 1, 0.6], [0, 0, Math.PI / 2]);
      } else {
        brow = add(new THREE.CapsuleGeometry(0.004 * H, r * 0.9, 4, 8), M.dark, g, [0, r * 1.3, r * 0.6], [1, 1, 0.6], [0, 0, Math.PI / 2]);
      }
      const blush = add(new THREE.CircleGeometry(r * 0.7, 20), M.blush, this.head, [s * 0.075 * H, 0.0, 0.088 * H], [1.3, 0.8, 1], [0, s * 0.6, 0]);
      this.eyes.push({ g, ball, pupil, hl, hl2, lidTop, lidBot, brow, s, r, blush });
    }
    if (P.glasses) for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.034 * E * 1.2, 0.003, 6, 24), M.glass, this.head, [s * 0.045 * H, 0.06 * H, 0.105 * H]);
    if (P.beard) { add(new THREE.ConeGeometry(0.05 * H, 0.12 * H, 12), M.hair, this.head, [0, -0.07 * H, 0.1 * H], [1, 1, 0.6], [Math.PI + 0.25, 0, 0]); }
    // horns
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.018 * H, 0.06 * H, 10), M.horn, this.head, [s * 0.05 * H, 0.13 * H, -0.03 * H], [1, 1, 1], [-0.45, 0, s * -0.35]);
    // spikes along the back
    for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.012, 0.03, 6), M.spikes, this.torso, [0, 0.2 * by - i * 0.045, -0.105 * bz - Math.sin(i * 0.5) * 0.01], [1, 1, 0.6], [-0.6 - i * 0.12, 0, 0]);
    // arms
    this.arms = [-1, 1].map((s) => {
      const sh = new THREE.Group(); sh.position.set(s * (P.muscle ? 0.135 : 0.1) * bx, (P.muscle ? 0.16 : 0.12) * by, 0.03); this.torso.add(sh);
      const A = P.arm;
      add(new THREE.CapsuleGeometry(0.018 * A, 0.05 * Math.sqrt(A), 4, 10), M.skin, sh, [0, -0.035 * Math.sqrt(A), 0]);
      const hand = add(sph(0.022 * A, 12, 10), M.skin, sh, [0, -0.075 * Math.sqrt(A), 0.005]);
      for (let c = -1; c <= 1; c++) add(new THREE.ConeGeometry(0.005 * A, 0.014 * A, 6), M.horn, hand, [c * 0.01, -0.012, 0.018], [1, 1, 1], [Math.PI / 2 + 0.6, 0, 0]);
      return { sh, s };
    });
    // legs
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group(); hip.position.set(s * 0.06 * bx, -0.02, 0); this.hips.add(hip);
      add(new THREE.CapsuleGeometry(0.032 * bx, 0.04, 4, 10), M.skin, hip, [0, -0.045, 0]);
      const foot = add(sph(0.034 * bx, 14, 10), M.skin, hip, [0, -0.1, 0.02], [1, 0.55, 1.4]);
      for (let c = -1; c <= 1; c++) add(new THREE.ConeGeometry(0.006 * bx, 0.016, 6), M.horn, foot, [c * 0.018, 0, 0.042], [1, 1, 1], [Math.PI / 2, 0, 0]);
      return { hip, s };
    });
    // tail: chain of segments
    this.tail = []; let parent = this.hips; const segs = 7;
    for (let i = 0; i < segs; i++) {
      const g = new THREE.Group(); g.position.set(0, i ? 0 : 0.0, i ? -0.045 : -0.1 * bz); parent.add(g);
      add(sph(0.034 * (1 - i / segs * 0.8) * bx, 14, 10), M.skin, g, [0, 0, -0.02], [1, 0.9, 1.4]);
      this.tail.push(g); parent = g;
    }
    add(new THREE.ConeGeometry(0.025, 0.05, 4), M.spikes, parent, [0, 0, -0.06], [1, 0.3, 1], [-Math.PI / 2, 0, 0]);
    // wings
    const W = P.wingSize; this.wings = [-1, 1].map((s) => {
      const piv = new THREE.Group(); piv.position.set(s * 0.05 * bx, 0.17 * by, -0.08 * bz); this.torso.add(piv);
      const geo = wingGeometry(0.16 * W, 0.11 * W); const m = add(geo, M.wing, piv, [0, 0, 0], [s, 1, 1]);
      m.castShadow = true; return { piv, s };
    });
    this.root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    this._v = new THREE.Vector3();
  }

  // expressive pose — every field optional
  pose(p = {}, t = 0) {
    const ph = (p.walk ?? 0) * Math.PI * 2, wa = p.walkAmt ?? 0;
    const sq = p.squash ?? 1;                                        // <1 squash, >1 stretch
    const puff = p.puff ?? 0, round = p.round ?? 0;                 // chest puff / balloon
    this.group.scale.set(this.k / Math.sqrt(sq) * (1 + round * 0.9), this.k * sq * (1 + round * 0.75), this.k / Math.sqrt(sq) * (1 + round * 0.9));
    const laugh = p.laugh ?? 0;
    const bounce = Math.abs(Math.sin(ph)) * 0.015 * wa + Math.abs(Math.sin(t * 22)) * 0.012 * laugh + (p.hop ?? 0) * 0.08;
    this.hips.position.y = 0.13 + bounce;
    const [bx, by, bz] = this.P.body;
    this.bodyMesh.scale.set(bx * (1 + puff * 0.28), by * 1.12 * (1 + puff * 0.12), bz * (1 + puff * 0.35));
    this.bellyMesh.scale.set(bx * 0.86 * (1 + puff * 0.3), by * (1 + puff * 0.12), bz * 0.62 * (1 + puff * 0.45));
    this.torso.rotation.set((p.lean ?? 0) + laugh * 0.25 * Math.sin(t * 11) * 0.3 - laugh * 0.15, Math.sin(ph) * 0.15 * wa + (p.twist ?? 0), Math.sin(ph) * 0.05 * wa + (p.tilt ?? 0) * 0.3);
    this.neck.rotation.set(-(p.lookUp ?? 0) * 0.5 - laugh * 0.35, (p.headYaw ?? 0) * 0.5, (p.tilt ?? 0) * 0.5);
    this.head.rotation.set(-(p.lookUp ?? 0) * 0.5 - laugh * 0.25 * (1 + Math.sin(t * 22) * 0.4), (p.headYaw ?? 0) * 0.5, (p.tilt ?? 0) * 0.5 + (p.shakeHead ?? 0) * Math.sin(t * 30) * 0.3);
    const hs = 1 + (p.headPop ?? 0) * 0.25; this.head.scale.setScalar(hs);
    // mouth
    const open = clamp(p.mouth ?? 0, 0, 1.4), wide = p.wide ?? 0;
    this.cavity.scale.set(1.1 + wide * 0.6 + (p.ooh ?? 0) * -0.4, 0.1 + open * 0.9, 0.8);
    this.tongue.visible = open > 0.25; this.cavity.visible = open > 0.03;
    this.mouthG.position.y = -0.022 * this.headScale - open * 0.012 * this.headScale;
    const smile = p.smile ?? 0.4;                                    // + smile, − frown
    this.smile.visible = open < 0.3; this.smile.scale.set(1.1 + Math.abs(smile) * 0.4, smile >= 0 ? 0.25 + smile * 0.9 : smile * 0.9, 1);
    // snout puff (blowing)
    const cheek = p.cheeks ?? 0; this.snout.scale.set(1.15 * this.P.snout * (1 + cheek * 0.35), 0.8 * (1 + cheek * 0.5), 1.1 * this.P.snout);
    // eyes
    const open_ = clamp(p.eyeOpen ?? 1, 0, 1.3), big = p.eyeBig ?? 1, brow = p.brow ?? 0, sad = p.sad ?? 0;
    const lx = p.lookX ?? 0, ly = p.lookY ?? 0;
    for (const e of this.eyes) {
      e.g.scale.setScalar(big);
      const cross = (p.cross ?? 0) * -e.s;                          // cross-eyed gag
      e.pupil.position.set((lx + cross) * e.r * 0.45, ly * e.r * 0.45, e.r * 0.62);
      e.pupil.scale.set(0.9 * (p.pupil ?? 1), 1.1 * (p.pupil ?? 1), 0.5);
      // lids close from top/bottom; angry brows also lower the top lid
      const topClose = clamp(1 - open_ + Math.max(0, brow) * 0.35, 0, 1), botClose = clamp((1 - open_) * 0.5 + (p.squint ?? 0) * 0.5, 0, 1);
      e.lidTop.rotation.x = -Math.PI / 2 + topClose * (Math.PI / 2) - 0.15; e.lidTop.visible = topClose > 0.02;
      e.lidBot.rotation.x = Math.PI / 2 - botClose * (Math.PI / 2) + 0.15; e.lidBot.visible = botClose > 0.02;
      e.lidTop.rotation.z = e.s * (brow * 0.4 - sad * 0.5);
      if (e.brow) { e.brow.rotation.z = Math.PI / 2 + e.s * (brow * 0.5 - sad * 0.45) * -1; e.brow.position.y = e.r * (1.25 - brow * 0.25 + sad * 0.15 + (p.browUp ?? 0) * 0.4); }
      e.blush.material.opacity = (this.P.blush * 0.6 + (p.blush ?? 0)) * 0.7;
      const tear = p.tears ?? 0; e.hl.scale.setScalar(1 + tear * 1.6); e.hl2.scale.setScalar(1 + tear * 2.5);
    }
    // arms
    this.arms.forEach((a, i) => {
      const sw = Math.sin(ph + i * Math.PI) * 0.5 * wa;
      let x = sw, z = a.s * (0.25 + (p.armsOut ?? 0) * 1.2), y = 0;
      const up = i ? (p.armR ?? 0) : (p.armL ?? 0);                    // raise
      x = lerp(x, -2.7, up); z = lerp(z, a.s * 0.5, up);
      if (p.cross) { }
      if (p.armsCrossed) { x = lerp(x, -1.3, p.armsCrossed); z = lerp(z, -a.s * 0.9, p.armsCrossed); }
      if (p.point && i === 0) { x = lerp(x, -1.45, p.point); z = lerp(z, -0.15, p.point); }
      if (p.belly) { x = lerp(x, -0.7, p.belly); z = lerp(z, -a.s * 0.6, p.belly); }
      if (p.cover) { x = lerp(x, -2.2, p.cover); z = lerp(z, -a.s * 0.85, p.cover); }
      a.sh.rotation.set(x, y, z);
    });
    this.legs.forEach((l, i) => { const s = Math.sin(ph + i * Math.PI); l.hip.rotation.set(-s * 0.6 * wa - (p.tuck ?? 0) * 1.0, 0, l.s * (p.spread ?? 0) * 0.4); });
    // tail sway
    const wag = p.wag ?? 0.3;
    this.tail.forEach((g, i) => { g.rotation.set(-0.15 + (p.tailUp ?? 0) * 0.25, Math.sin(t * (2 + wag * 6) - i * 0.6) * (0.12 + wag * 0.25), 0); });
    // wings flap
    const fl = p.flap ?? 0, fs = p.flapSpeed ?? 14;
    this.wings.forEach((w) => { const a = Math.sin(t * fs) * 0.9 * fl; w.piv.rotation.set(0.1, w.s * (0.5 - (p.wingOpen ?? 0) * 0.4 + a * 0.6), w.s * (0.25 + a)); });
  }
  world(obj, out = new THREE.Vector3()) { this.root.updateMatrixWorld(true); return obj.getWorldPosition(out); }
  static blink(t, off = 0) { const k = ((t + off) % 3.1) / 3.1; return Math.abs(k - 0.95) < 0.03 ? Math.abs(k - 0.95) / 0.03 : 1; }
}
