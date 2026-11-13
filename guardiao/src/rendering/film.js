import * as THREE from 'three';
import { Stage } from './stage.js';
import { noise1 } from '../timeline/util.js';
import { Atmosphere } from '../shaders/sky.js';
import { SkyIslands } from '../environments/islands.js';
import { SkyOcean } from '../environments/ocean.js';
import { CelestialDesert, GalaxyTunnel } from '../environments/desert.js';
import { Cosmos } from '../environments/cosmos.js';
import { makeKaito, makeChild } from '../characters/kaito.js';
import { Lumi } from '../characters/lumi.js';
import { Astra } from '../creatures/astra.js';
import { Burst, Motes, PX } from '../particles/particles.js';
import { StarMap } from '../particles/starmap.js';
import { makePortal, makeShockRing, makeBeam } from '../shaders/energy.js';

/** O filme: um único mundo compartilhado pelas cinco sequências (mesmos personagens, materiais e luz). */
export class Film {
  constructor(canvas, scale = 1) {
    const st = (this.stage = new Stage(canvas, scale)), sc = st.scene;
    this.atmo = new Atmosphere(sc);
    this.islands = new SkyIslands(); sc.add(this.islands.group);
    this.ocean = new SkyOcean(); sc.add(this.ocean.group, this.ocean.fish);
    this.desert = new CelestialDesert(); this.tunnel = new GalaxyTunnel(); sc.add(this.desert.group, this.tunnel.group);
    this.cosmos = new Cosmos(); sc.add(this.cosmos.group);
    this.kaito = makeKaito(); this.children = [0, 1, 2].map(makeChild); this.actors = [this.kaito, ...this.children];
    for (const a of this.actors) sc.add(a.root);
    this.lumi = new Lumi(); sc.add(this.lumi.group, this.lumi.tail.points);
    this.astra = new Astra(); sc.add(this.astra.group, this.astra.wake.points);
    this.gold = [0, 1, 2].map((i) => new Burst(1400, { color: 0xffc050, color2: 0xfff0b8, speed: 2.4, life: 3, size: 0.034, gravity: 0.3 }, 21 + i));
    this.big = new Burst(6000, { color: 0xffc860, color2: 0xfff4d0, speed: 420, life: 5, size: 7, gravity: 0, drag: 0.5, swirl: 20, gain: 1.4 }, 91);
    this.motes = new Motes(520, 31, 0xffe0a0); this.map = new StarMap();
    this.rings = [makeShockRing(0xffe0a0), makeShockRing(0x9fd8ff), makeShockRing(0xffd27a)]; this.portal = makePortal(1); this.beam = makeBeam(0xffe0a0, 2, 40);
    this.star = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.5, 1.6), toneMapped: false, fog: false }));
    sc.add(this.big.points, this.motes.points, this.map.group, this.portal, this.beam, this.star, ...this.rings); for (const b of this.gold) sc.add(b.points);
    this.fill = new THREE.DirectionalLight(0xffe6cc, 0); sc.add(this.fill, this.fill.target);
    this.cam = { p: new THREE.Vector3(0, 2, 10), l: new THREE.Vector3(0, 1, 0), fov: 40, roll: 0, shake: 0 };
    this.focus = new THREE.Vector3(); this.v = new THREE.Vector3(); this.v2 = new THREE.Vector3();
    this.sets = [this.islands.group, this.ocean.group, this.desert.group, this.tunnel.group, this.cosmos.group]; this.hideable = [];
    this.setScale(scale);
  }
  /** registra um cenário/efeito adicional (some no início de cada frame; a sequência liga o que usa). */
  addSet(group) { this.stage.scene.add(group); this.sets.push(group); return group; }
  setScale(s) { this.stage.setScale(s); PX.value = 960 * s; }
  begin(T) {
    this.T = T; this.stage.resetFx(T);
    for (const s of this.sets) s.visible = false; this.ocean.fish.visible = false; for (const h of this.hideable) h.visible = false;
    for (const a of this.actors) { a.root.visible = false; a.reset(); a.root.scale.setScalar(1); a.root.rotation.set(0, 0, 0); a.dissolve(0); }
    this.kaito.awaken(0); this.kaito.setCrystal(0.3); this.kaito.capeWind = 0.3;
    this.lumi.hide(); this.astra.hide(); this.map.group.visible = false; this.star.visible = false; this.portal.visible = false; this.beam.visible = false;
    for (const b of [...this.gold, this.big]) { b.points.visible = false; b.u.uDirBias.value.set(0, 0, 0); b.u.uStagger.value = 0; }
    for (const b of this.gold) { b.u.uLife.value = 3; b.u.uGain.value = 1.4; b.u.uSpeed.value = 2.4; }
    this.big.u.uSpeed.value = 420; this.big.u.uSize.value = 7; this.big.u.uLife.value = 5;
    this.motes.points.visible = false; for (const r of this.rings) r.visible = false;
    this.motes.u.uBox.value.set(20, 12, 20); this.motes.u.uSize.value = 0.02;
    this.cam.roll = 0; this.cam.shake = 0; this.fill.intensity = 0.35;
  }
  show(...actors) { for (const a of actors) a.root.visible = true; }
  applyCam() {
    const t = this.T, c = this.cam, cam = this.stage.camera, s = c.shake;
    cam.position.set(c.p.x + noise1(t * 23.0) * 0.05 * s + noise1(t * 0.7 + 5) * 0.02, c.p.y + noise1(t * 27.0 + 9) * 0.05 * s + noise1(t * 0.6 + 2) * 0.02, c.p.z + noise1(t * 19.0 + 3) * 0.04 * s);
    cam.up.set(Math.sin(c.roll + noise1(t * 21 + 7) * 0.012 * s), Math.cos(c.roll), 0);
    cam.lookAt(c.l.x + noise1(t * 25.0 + 1) * 0.06 * s, c.l.y + noise1(t * 22.0 + 4) * 0.06 * s, c.l.z);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.fill.position.copy(cam.position); this.fill.position.y += 1.5; this.fill.target.position.copy(c.l);
  }
  end(T) {
    for (const a of this.actors) if (a.root.visible) a.update(T);
    const fog = this.stage.scene.fog; this.astra.u.fogColor.value.copy(fog.color); this.astra.u.fogDensity.value = fog.density;   // névoa do quadro atual, não a do anterior
    this.applyCam(); this.stage.render();
  }
  wave(slot, worldPos, radius, amp) { this.applyCam(); this.stage.wave(slot, worldPos, radius, amp); }
  /** raios volumétricos em espaço de tela a partir de um ponto do mundo (ou do sol). */
  rays(strength, worldPos, color) {
    this.applyCam(); const u = this.stage.fx, p = worldPos ?? this.v.copy(this.stage.camera.position).addScaledVector(this.atmo.sunDir, 1000);
    this.v2.copy(p).project(this.stage.camera); u.uSun.value[0] = this.v2.x * 0.5 + 0.5; u.uSun.value[1] = this.v2.y * 0.5 + 0.5; u.uRays.value = this.v2.z < 1 ? strength : 0;
    const c = color ?? [this.atmo.sun.color.r, this.atmo.sun.color.g, this.atmo.sun.color.b]; u.uRayColor.value[0] = c[0]; u.uRayColor.value[1] = c[1]; u.uRayColor.value[2] = c[2];
  }
  ahead(d = 8, out = this.focus) { const c = this.cam; return out.copy(c.l).sub(c.p).normalize().multiplyScalar(d).add(c.p); }
}
