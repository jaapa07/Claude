import * as THREE from 'three';
import { Stage } from './stage.js';
import { noise1 } from './util.js';
import { Atmosphere } from '../world/atmosphere.js';
import { Village } from '../world/village.js';
import { Temple, Arena } from '../world/sets.js';
import { Clock } from '../world/clock.js';
import { makeAkio, makeYuna, makeLord, makeWarrior, makeChild, makeKatana } from '../characters/cast.js';
import { Petals, Rain, Burst, Motes, Shards, Birds, shardGeo, shardMat, PX } from '../fx/particles.js';
import { makePortal, makeSlashArc, makeShockRing, makeBeam } from '../shaders/portal.js';

/** A produção: um único mundo compartilhado pelos cinco episódios (mesmos personagens, cenários e luz). */
export class Production {
  constructor(canvas, scale = 1) {
    const st = (this.stage = new Stage(canvas, scale)); const sc = st.scene;
    this.atmo = new Atmosphere(sc);
    this.village = new Village(); this.temple = new Temple(); this.arena = new Arena();
    sc.add(this.village.group, this.temple.group, this.arena.group);
    // relógio gigante translúcido no céu
    this.skyClock = new Clock({ color: 0x9fdcff, color2: 0xfff0c8, hand: 0xfff4d0, fogK: 0 });
    this.skyClock.group.position.set(0, 300, -400); this.skyClock.group.lookAt(0, 0, 40); sc.add(this.skyClock.group);
    // elenco
    this.akio = makeAkio(); this.yuna = makeYuna(); this.lord = makeLord();
    this.warriors = [0, 1, 2, 3, 4, 5].map(makeWarrior); this.children = [0, 1, 2, 3].map(makeChild);
    this.actors = [this.akio, this.yuna, this.lord, ...this.warriors, ...this.children];
    for (const a of this.actors) sc.add(a.root);
    this.relic = makeKatana(); sc.add(this.relic);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3f9cff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.scale.set(0.6, 1.5, 0.6); halo.position.y = 0.45; this.relic.add(halo);
    // partículas e efeitos
    this.petals = new Petals(1100); this.rain = new Rain(2600); this.motes = new Motes(520); this.birds = new Birds(8);
    this.gold = [0, 1, 2].map((i) => new Burst(1400, { color: 0xffc050, color2: 0xfff0b8, speed: 2.4, life: 3, size: 0.034, gravity: 0.5 }, 21 + i));
    this.blue = [0, 1, 2].map((i) => new Burst(900, { color: 0x4fb8ff, color2: 0xd8f4ff, speed: 6, life: 1.6, size: 0.032, gravity: 0, drag: 2.4 }, 61 + i));
    this.dust = [0, 1].map((i) => new Burst(500, { color: 0xb89a70, color2: 0xe8d8b8, speed: 3.5, life: 2.2, size: 0.1, gravity: 0.4, drag: 2.5, swirl: 0.3, gain: 0.35 }, 81 + i));
    this.big = new Burst(5000, { color: 0x7fc8ff, color2: 0xfff0c0, speed: 26, life: 6, size: 0.9, gravity: 1.5, drag: 0.8, swirl: 6, stagger: 2.5 }, 91);
    this.shards = new Shards(900, shardGeo(), shardMat(), 41);
    this.shards2 = new Shards(500, shardGeo(), shardMat(0xffe2a0, 0xffb040, 1.4), 43);
    this.discs = new Shards(1300, new THREE.CylinderGeometry(1, 1, 0.12, 14), [new THREE.MeshStandardMaterial({ color: 0xb08a48, metalness: 0.8, roughness: 0.35 }), discFace(), discFace()], 47);
    this.portal = makePortal(7);
    this.arcs = [makeSlashArc(0x7fd4ff), makeSlashArc(0x9fe0ff), makeSlashArc(0x5a8cff)];
    this.rings = [makeShockRing(), makeShockRing(0xffe0a0), makeShockRing()];
    this.beam = makeBeam(0x7fd0ff, 2.4, 60);
    this.arrow = makeArrow();
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false, fog: false })); this.sunDisc.visible = false;
    sc.add(this.petals.mesh, this.rain.mesh, this.motes.points, this.birds.group, this.big.points, this.shards.mesh, this.shards2.mesh, this.discs.mesh, this.portal, this.beam, this.arrow, this.sunDisc, ...this.arcs, ...this.rings);
    for (const b of [...this.gold, ...this.blue, ...this.dust]) sc.add(b.points);
    this.fill = new THREE.DirectionalLight(0xffe6cc, 0); sc.add(this.fill, this.fill.target);   // luz de preenchimento presa à câmera (rostos)
    this.cam = { p: new THREE.Vector3(0, 2, 10), l: new THREE.Vector3(0, 1, 0), fov: 40, roll: 0, shake: 0 };
    this.focus = new THREE.Vector3(); this.v = new THREE.Vector3(); this.v2 = new THREE.Vector3();
  }
  setScale(s) { this.stage.setScale(s); PX.value = 960 * s; }
  /** Início do frame: tudo volta ao estado neutro; o episódio liga só o que usa. */
  begin(t) {
    this.t = t; this.stage.resetFx(t);
    this.village.group.visible = false; this.temple.group.visible = false; this.arena.group.visible = false;
    for (const a of this.actors) { a.root.visible = false; a.reset(); a.root.scale.setScalar(1); a.dissolve(0); a.katana?.userData.setGlow(a === this.akio ? 1 : a === this.lord ? 1 : 0); if (a.katana) a.katana.visible = true; }
    this.lord.breakMask(0);
    this.relic.visible = false; this.skyClock.group.visible = false; this.skyClock.hour.visible = this.skyClock.minute.visible = true; this.skyClock.mat.uniforms.uCrack.value = 0; this.skyClock.group.scale.setScalar(120);
    this.petals.mesh.visible = false; this.rain.mesh.visible = false; this.motes.points.visible = false; this.birds.group.visible = false;
    for (const b of this.birds.birds) { b.visible = true; b.scale.setScalar(1); }
    for (const b of [...this.gold, ...this.blue, ...this.dust, this.big]) b.points.visible = false;
    this.shards.mesh.visible = false; this.shards2.mesh.visible = false; this.discs.mesh.visible = false; this.portal.visible = false; this.beam.visible = false; this.arrow.visible = false; this.sunDisc.visible = false;
    for (const a of [...this.arcs, ...this.rings]) a.visible = false;
    this.village.setChasm(0); this.village.setSeason(0); this.village.vanishDis.uDissolve.value = 0; this.village.bigDis.uDissolve.value = 0; this.village.vanishHouse.visible = true; this.village.bigMountain.visible = true;
    this.petals.u.uBox.value.set(30, 16, 30); this.petals.u.uColA.value.setHex(0xffc2d6); this.petals.u.uColB.value.setHex(0xfff0f4); this.petals.u.uFall.value = 0.75; this.petals.u.uGlow.value = 0; this.big.u.uCol.value.setHex(0x7fc8ff); this.arena.setSeason(0); this.yuna.bow.userData.setDraw(0); this.yuna.bow.visible = true; this.beam.scale.set(1, 1, 1); this.rain.u.uBox.value.set(22, 18, 22); for (const b of this.blue) { b.u.uDirBias.value.set(0, 0, 0); b.u.uGain.value = 1.0; } for (const b of this.gold) { b.u.uStagger.value = 0; b.u.uDirBias.value.set(0, 0, 0); b.u.uGain.value = 1.6; }
    this.cam.roll = 0; this.cam.shake = 0; this.fill.intensity = 0.4;
  }
  show(...actors) { for (const a of actors) a.root.visible = true; }
  /** Fim do frame: aplica rostos/balanços, câmera (com tremor determinístico) e renderiza. */
  end(t) {
    for (const a of this.actors) if (a.root.visible) a.update(t);
    this.applyCam();
    this.stage.render();
  }
  /** posiciona a câmera real a partir do estado da direção (chamado antes de qualquer projeção para a tela). */
  applyCam() {
    const t = this.t;
    const c = this.cam, cam = this.stage.camera, s = c.shake;
    cam.position.set(c.p.x + noise1(t * 23.0) * 0.05 * s + noise1(t * 0.7 + 5) * 0.03, c.p.y + noise1(t * 27.0 + 9) * 0.05 * s + noise1(t * 0.6 + 2) * 0.03, c.p.z + noise1(t * 19.0 + 3) * 0.04 * s);
    cam.up.set(Math.sin(c.roll + noise1(t * 21 + 7) * 0.012 * s), Math.cos(c.roll), 0);
    cam.lookAt(c.l.x + noise1(t * 25.0 + 1) * 0.06 * s, c.l.y + noise1(t * 22.0 + 4) * 0.06 * s, c.l.z);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this.fill.position.copy(cam.position); this.fill.position.y += 1.5; this.fill.target.position.copy(c.l);
  }
  wave(slot, worldPos, radius, amp) { this.applyCam(); this.stage.wave(slot, worldPos, radius, amp); }
  /** raios de luz a partir do sol (ou de um ponto de energia) em espaço de tela. */
  rays(strength, worldPos, color) {
    this.applyCam(); const u = this.stage.fx; const p = worldPos ?? this.v.copy(this.stage.camera.position).addScaledVector(this.atmo.sunDir, 1000);
    this.v2.copy(p).project(this.stage.camera); const front = this.v2.z < 1;
    u.uSun.value[0] = this.v2.x * 0.5 + 0.5; u.uSun.value[1] = this.v2.y * 0.5 + 0.5; u.uRays.value = front ? strength : 0;
    if (color) { u.uRayColor.value[0] = color[0]; u.uRayColor.value[1] = color[1]; u.uRayColor.value[2] = color[2]; } else { const sc = this.atmo.sun.color; u.uRayColor.value[0] = sc.r; u.uRayColor.value[1] = sc.g; u.uRayColor.value[2] = sc.b; }
  }
  /** ponto alguns metros à frente da câmera (centro das caixas de partículas). */
  ahead(d = 8, out = this.focus) { const c = this.cam; return out.copy(c.l).sub(c.p).normalize().multiplyScalar(d).add(c.p); }
}

function discFace() {                                             // mostrador dos pequenos relógios flutuantes
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f6ecd0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#3a2a14'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 3 : 6; g.beginPath(); g.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); g.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); g.stroke(); }
  g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(90, 76); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffe6b0, emissiveMap: t, emissiveIntensity: 0.55, roughness: 0.5 });
}
function makeArrow() {                                            // flecha de energia (aponta para +Z)
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x8fd0ff })); core.rotation.x = Math.PI / 2; g.add(core);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff })); tip.rotation.x = Math.PI / 2; tip.position.z = 0.95; g.add(tip);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4fb8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.position.z = 0.8; halo.scale.set(1, 1, 3); g.add(halo);
  const l = new THREE.PointLight(0x6fc8ff, 5, 14, 2); g.add(l); g.userData = { light: l, halo };
  return g;
}
