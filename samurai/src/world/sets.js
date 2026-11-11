import * as THREE from 'three';
import { rng, TAU } from '../core/util.js';
import { Clock } from './clock.js';
import { makeBeam } from '../shaders/portal.js';
import { makeHouse, roofGeo } from './village.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const add = (parent, geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };

/** Templo subterrâneo: câmara circular, pilares com veios de energia, pedestal e poço de luz no teto. */
export class Temple {
  constructor() {
    const g = (this.group = new THREE.Group());
    const stone = std(0x2a3352, { roughness: 0.8 }), dark = std(0x161c30, { roughness: 0.9, side: THREE.DoubleSide });
    this.glow = new THREE.MeshBasicMaterial({ color: 0x3aa8ff, toneMapped: false });
    const floor = add(g, new THREE.CircleGeometry(12.5, 48), std(0x222a44, { roughness: 0.65, metalness: 0.2 }), 0, 0, 0, false); floor.rotation.x = -Math.PI / 2;
    this.seal = new Clock({ color: 0x38a8ff, color2: 0xc8f4ff }); this.seal.group.rotation.x = -Math.PI / 2; this.seal.group.position.y = 0.03; this.seal.group.scale.setScalar(9.5); g.add(this.seal.group);
    add(g, new THREE.CylinderGeometry(12.5, 12.5, 14, 48, 1, true), dark, 0, 7, 0, false);
    const ceil = add(g, new THREE.RingGeometry(4.2, 12.6, 40), dark, 0, 13.5, 0, true); ceil.rotation.x = Math.PI / 2;
    add(g, new THREE.CylinderGeometry(4.2, 4.2, 30, 24, 1, true), dark, 0, 28.5, 0, false);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.31, x = Math.sin(a) * 10.4, z = Math.cos(a) * 10.4;
      add(g, new THREE.CylinderGeometry(0.75, 0.9, 13.5, 8), stone, x, 6.75, z); add(g, new THREE.BoxGeometry(2.3, 0.6, 2.3), stone, x, 0.3, z); add(g, new THREE.BoxGeometry(2.3, 0.6, 2.3), stone, x, 13.2, z);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 12, 0.14), this.glow); s.position.set(Math.sin(a) * 9.62, 6.6, Math.cos(a) * 9.62); g.add(s);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.07, 5, 16, Math.PI), this.glow); arch.position.set(Math.sin(a + 0.314) * 12.3, 3.2, Math.cos(a + 0.314) * 12.3); arch.rotation.y = a + 0.314; g.add(arch);
    }
    // pedestal em degraus
    add(g, new THREE.CylinderGeometry(2.6, 2.9, 0.3, 24), stone, 0, 0.15, 0); add(g, new THREE.CylinderGeometry(1.8, 2.0, 0.3, 24), stone, 0, 0.45, 0);
    add(g, new THREE.CylinderGeometry(0.42, 0.62, 1.0, 8), stone, 0, 1.1, 0); add(g, new THREE.CylinderGeometry(0.7, 0.5, 0.16, 8), stone, 0, 1.66, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 6, 32), this.glow); ring.rotation.x = Math.PI / 2; ring.position.y = 1.76; g.add(ring);
    this.light = new THREE.PointLight(0x48b0ff, 45, 40, 1.7); this.light.position.set(0, 3.2, 0); g.add(this.light);
    this.light2 = new THREE.PointLight(0x2a70ff, 25, 30, 1.7); this.light2.position.set(0, 9, 0); g.add(this.light2);
    this.beam = makeBeam(0x9fd4ff, 5.5, 30); g.add(this.beam);
    this.pedestalTop = new THREE.Vector3(0, 1.75, 0);
  }
  update(t, energy = 1) {
    this.seal.set(-t * 0.04, 0.9, t); this.light.intensity = 45 * energy * (0.9 + 0.1 * Math.sin(t * 5)); this.beam.userData.set(0.16, t);
    this.glow.color.setHex(0x3aa8ff).multiplyScalar(0.6 + 0.6 * energy);
  }
}

function gear(r, teeth, mat) {
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 6, 28), mat); g.add(body);
  for (let i = 0; i < teeth; i++) { const a = (i / teeth) * TAU, t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.2, r * 0.26, r * 0.2), mat); t.position.set(Math.cos(a) * r * 1.14, Math.sin(a) * r * 1.14, 0); t.rotation.z = a + Math.PI / 2; g.add(t); }
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 0.1, r * 0.1), mat); sp.rotation.z = (i / 4) * Math.PI; g.add(sp); }
  return g;
}

/** Arena temporal: plataforma-relógio central, ilhas flutuantes, relógios gigantes e engrenagens. */
export class Arena {
  constructor() {
    const g = (this.group = new THREE.Group()); const r = rng(99);
    const rock = std(0x39405e, { flatShading: true, roughness: 0.95 }), bronze = std(0x8a6a3a, { metalness: 0.85, roughness: 0.35 });
    this.grass = std(0x5f8f4a, { roughness: 1 }); this.blossomMat = std(0xffb3cd, { flatShading: true, emissive: 0xff7fa8, emissiveIntensity: 0.2 });
    // plataforma central: mostrador sólido sobre rocha invertida
    this.floor = new Clock({ solid: 1, color: 0x5fc8ff, color2: 0xffe6a8, base: 0x232a44, hand: 0x9fe0ff, fogK: 1 });
    this.floor.group.rotation.x = -Math.PI / 2; this.floor.group.scale.setScalar(14); this.floor.face.receiveShadow = true; g.add(this.floor.group);
    this.floor.hour.position.z = 0.002; this.floor.minute.position.z = 0.003;
    add(g, new THREE.CylinderGeometry(14, 13.2, 1.2, 40), rock, 0, -0.62, 0, false);
    const under = add(g, new THREE.ConeGeometry(13.2, 16, 9, 3), rock, 0, -9.2, 0, false); under.rotation.x = Math.PI;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(14, 0.22, 6, 48), bronze); rim.rotation.x = Math.PI / 2; g.add(rim);
    // ilhas flutuantes com pedaços da vila
    this.islands = []; const M = { plaster: std(0xeee3cf), wood: std(0x4a2c1c), roof: std(0x2b3648, { flatShading: true, side: THREE.DoubleSide }), paper: std(0xffe2b0, { emissive: 0xffb860, emissiveIntensity: 0.9 }), stone: std(0x8a8a90), red: std(0xb8262c) };
    const spots = [[-17, 2.5, 6, 4.6], [24, 6, -14, 7], [-28, -3, -20, 8], [16, -5, 20, 5], [-9, 9, -34, 6], [38, 13, -40, 9], [-44, 10, -8, 8], [30, -8, 8, 5], [-20, 16, -58, 7], [10, 20, -70, 6], [52, 2, -20, 7], [-36, 22, -44, 6]];
    spots.forEach(([x, y, z, rad], i) => {
      const is = new THREE.Group(); is.position.set(x, y, z); g.add(is);
      add(is, new THREE.CylinderGeometry(rad, rad * 0.85, 0.7, 9), this.grass, 0, -0.35, 0);
      const c = add(is, new THREE.ConeGeometry(rad * 0.86, rad * 1.5, 7, 2), rock, 0, -0.7 - rad * 0.75, 0); c.rotation.x = Math.PI;
      const kind = i === 0 ? 3 : i % 3;
      if (kind === 0) { const h = makeHouse(rad * 0.6, rad * 0.5, rad * 0.32, M); h.scale.setScalar(0.8); h.rotation.y = r() * TAU; is.add(h); }
      else if (kind === 1) { add(is, new THREE.CylinderGeometry(0.16, 0.3, 2.8, 6), M.wood, 0, 1.4, 0); for (let k = 0; k < 6; k++) { const b = add(is, new THREE.IcosahedronGeometry(1.2 + r() * 0.6, 1), this.blossomMat, (r() - 0.5) * 3, 3.4 + r() * 1.4, (r() - 0.5) * 3); b.scale.y = 0.75; } }
      else if (kind === 2) { for (const sx of [1, -1]) add(is, new THREE.CylinderGeometry(0.18, 0.2, 4, 8), M.red, sx * 1.7, 2, 0); add(is, new THREE.BoxGeometry(4.6, 0.3, 0.34), M.red, 0, 3.4, 0); add(is, roofGeo(5.6, 0.7, 0, 0.35, 5), M.roof, 0, 4.1, 0); }
      is.userData = { y, ph: r() * TAU }; this.islands.push(is);
    });
    this.yunaIsland = this.islands[0];
    // relógios gigantes ao fundo
    this.clocks = [];
    for (let i = 0; i < 9; i++) {
      const c = new Clock({ color: i % 2 ? 0x6fc8ff : 0xffd890, color2: 0xffffff, fogK: 0.5 }); const a = (i / 9) * TAU + 0.5, d = 46 + r() * 60;
      c.group.position.set(Math.sin(a) * d, -14 + r() * 60, Math.cos(a) * d - 20); c.group.scale.setScalar(6 + r() * 15); c.group.lookAt(0, 4, 0); c.group.rotateX((r() - 0.5) * 0.9); c.group.rotateY((r() - 0.5) * 0.9);
      c.speed = (r() - 0.5) * 0.8; g.add(c.group); this.clocks.push(c);
    }
    // relógio central
    this.central = new Clock({ color: 0xffd27a, color2: 0xfff6dc, hand: 0xfff2c8, fogK: 0.25 });
    this.central.group.position.set(0, 26, -58); this.central.group.scale.setScalar(22); g.add(this.central.group);
    this.centralRim = new THREE.Mesh(new THREE.TorusGeometry(22.4, 0.7, 8, 64), bronze); this.centralRim.position.copy(this.central.group.position); g.add(this.centralRim);
    this.gears = [];
    for (const [x, y, z, rr, tt, sp] of [[-27, 12, -60, 7, 14, 0.5], [28, 40, -62, 9, 16, -0.4], [26, 8, -64, 5, 10, 0.8], [-30, 46, -66, 6, 12, -0.6], [-60, 30, -30, 8, 14, 0.3], [64, 28, -50, 10, 18, -0.25]]) {
      const ge = gear(rr, tt, bronze); ge.position.set(x, y, z); ge.userData.sp = sp; g.add(ge); this.gears.push(ge);
    }
    this.centralPos = this.central.group.position.clone();
    this._c = new THREE.Color();
  }
  setSeason(snow) {
    this.blossomMat.color.setHex(0xffb3cd).lerp(this._c.setHex(0xf4f8ff), snow); this.blossomMat.emissiveIntensity = 0.2 * (1 - snow);
    this.grass.color.setHex(0x5f8f4a).lerp(this._c.setHex(0xeef4fc), snow);
  }
  /** t: tempo do mundo; turns: voltas do relógio central; crack/collapse: destruição do relógio central. */
  update(t, turns = t * 0.05, crack = 0, collapse = 0) {
    this.floor.set(turns * 0.5, 1, t); this.floor.mat.uniforms.uCrack.value = crack * 0.6;
    for (const is of this.islands) is.position.y = is.userData.y + Math.sin(t * 0.5 + is.userData.ph) * 0.6;
    for (const c of this.clocks) c.set(t * c.speed, 0.75, t);
    this.central.set(turns, 1 - collapse, t); this.central.mat.uniforms.uCrack.value = crack;
    this.centralRim.visible = collapse < 0.6; this.centralRim.rotation.z = collapse * 0.8; this.centralRim.position.y = this.centralPos.y - collapse * collapse * 30;
    for (const ge of this.gears) ge.rotation.z = t * ge.userData.sp + collapse * ge.userData.sp * 6;
  }
}
