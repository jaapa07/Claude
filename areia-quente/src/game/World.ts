import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { assets, type Item } from '../core/Assets';
import { settings } from '../core/Save';
import ARENAS from '../data/arenas.json';

export type ArenaDef = (typeof ARENAS.arenas)[number];
export const arenaDefs = ARENAS.arenas;

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.35 }, warmth: { value: 0.0 }, sat: { value: 1.08 }, flash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float warmth; uniform float sat; uniform float flash; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(0.299,0.587,0.114)); c.rgb=mix(vec3(l),c.rgb,sat);
      c.rgb+=vec3(0.06,0.02,-0.04)*warmth; vec2 d=vUv-0.5; float v=1.0-dot(d,d)*amount*2.2; c.rgb*=v; c.rgb=mix(c.rgb,vec3(1.0),flash); gl_FragColor=c; }`,
};

/** Cena 3D compartilhada por todas as telas: arena, céu, luzes, torcida, água e pós-processamento. */
export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.3, 4000);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  after: AfterimagePass;
  grade: ShaderPass;
  sun = new THREE.DirectionalLight(0xffffff, 3);
  hemi = new THREE.HemisphereLight(0xffffff, 0xd9b98a, 1);
  arena?: THREE.Object3D;
  def?: ArenaDef;
  skyOn = true;
  spots: THREE.SpotLight[] = [];
  crowd: THREE.InstancedMesh[] = [];
  crowdUniforms = { uTime: { value: 0 }, uExcite: { value: 0.3 } };
  water?: THREE.Mesh;
  waterU = { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() } };
  nets: { mesh: THREE.Mesh; rest: Float32Array; disp: Float32Array; vel: Float32Array; side: number }[] = [];
  flags: { o: THREE.Object3D; base: number; ph: number }[] = [];
  time = 0;
  root = new THREE.Group(); // conteúdo dinâmico (jogadores, bola, efeitos)
  private envCache = new Map<string, THREE.Texture>();
  private pmrem: THREE.PMREMGenerator;
  excitement = 0.3;
  boardsMat?: THREE.MeshStandardMaterial;

  constructor(host: HTMLElement) {
    const q = settings.data.quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: q > 0, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 2 ? 2 : 1.25));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = q > 0;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.scene.add(this.sun, this.sun.target, this.hemi, this.root);
    this.sun.castShadow = q > 0;
    const sz = q === 2 ? 4096 : 2048;
    this.sun.shadow.mapSize.set(sz, sz);
    const sc = this.sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.55, 0.82);
    this.bloom.enabled = q > 0;
    this.composer.addPass(this.bloom);
    this.after = new AfterimagePass(0.6);
    this.after.enabled = false;
    this.composer.addPass(this.after);
    this.grade = new ShaderPass(VignetteShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  static arenaItems(id: string): Item[] {
    const d = arenaDefs.find((a) => a.id === id)!;
    return [
      { kind: 'gltf', url: `models/arenas/${id}.glb` },
      { kind: 'json', url: `models/arenas/${id}_seats.json` },
      { kind: 'tex', url: `textures/sky/${d.sky}.jpg` },
      { kind: 'gltf', url: 'models/props/crowd.glb' },
      { kind: 'tex', url: 'textures/sand/field_color.jpg', repeat: true },
      { kind: 'tex', url: 'textures/sand/field_normal.jpg', repeat: true, srgb: false },
      { kind: 'tex', url: 'textures/sand/field_rough.jpg', repeat: true, srgb: false },
      { kind: 'tex', url: 'textures/sand/beach_color.jpg', repeat: true },
      { kind: 'tex', url: 'textures/sand/beach_normal.jpg', repeat: true, srgb: false },
    ];
  }

  setArena(id: string) {
    if (this.def?.id === id && this.arena) return;
    if (this.arena) { this.scene.remove(this.arena); this.disposeTree(this.arena); }
    this.crowd.forEach((c) => { this.scene.remove(c); }); this.crowd = [];
    this.spots.forEach((s) => { this.scene.remove(s); this.scene.remove(s.target); }); this.spots = [];
    this.nets = []; this.flags = [];
    const def = arenaDefs.find((a) => a.id === id)!;
    this.def = def;
    const g = assets.gltf(`models/arenas/${id}.glb`);
    const arena = g.scene.clone(true);
    this.arena = arena;
    this.scene.add(arena);

    // ---- céu e ambiente
    const skyTex = assets.tex(`textures/sky/${def.sky}.jpg`);
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    if (!this.envCache.has(def.sky)) this.envCache.set(def.sky, this.pmrem.fromEquirectangular(skyTex).texture);
    this.scene.environment = this.envCache.get(def.sky)!;
    (this.scene as any).environmentIntensity = def.envIntensity;
    // céu: fundo equirretangular nativo (sem geometria)
    this.scene.background = skyTex;
    (this.scene as any).backgroundRotation?.set(0, def.skyRot, 0);
    (this.scene as any).backgroundIntensity = 1;
    this.scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);

    // ---- luzes
    this.sun.color.set(def.sun.color);
    this.sun.intensity = def.sun.intensity;
    const d = new THREE.Vector3(...(def.sun.dir as [number, number, number])).normalize();
    this.sun.position.copy(d.multiplyScalar(80));
    this.sun.target.position.set(0, 0, 0);
    this.hemi.color.set(def.hemi.sky); this.hemi.groundColor.set(def.hemi.ground); this.hemi.intensity = def.hemi.intensity;
    this.renderer.toneMappingExposure = def.exposure;
    this.bloom.strength = def.bloom;
    this.grade.uniforms.warmth.value = def.time === 'sunset' ? 0.45 : def.time === 'night' ? -0.6 : 0.2;
    this.grade.uniforms.sat.value = def.time === 'sunset' ? 0.95 : 1.08;

    // ---- materiais especiais
    const T = (u: string) => assets.tex(u);
    const fieldMat = new THREE.MeshStandardMaterial({ map: T('textures/sand/field_color.jpg'), normalMap: T('textures/sand/field_normal.jpg'),
      roughnessMap: T('textures/sand/field_rough.jpg'), roughness: 1, normalScale: new THREE.Vector2(1.4, 1.4), color: 0xfff1dc });
    const beachMat = new THREE.MeshStandardMaterial({ map: T('textures/sand/beach_color.jpg'), normalMap: T('textures/sand/beach_normal.jpg'), roughness: 1, color: 0xfff6e8 });
    const q = settings.data.quality;
    arena.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = q > 0 && !o.name.startsWith('FIELD') && !o.name.startsWith('BEACH') && !o.name.startsWith('WATER') && !o.name.startsWith('MOUNTAIN') && !o.name.startsWith('DUNE');
      m.receiveShadow = q > 0;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mt of mats as THREE.MeshStandardMaterial[]) {
        if (mt.name === 'boards' || mt.name === 'boards_neon') this.boardsMat = mt;
        if (mt.name === 'flood_panel') { mt.emissive.set(0xfff2d8); mt.emissiveIntensity = def.floodlights ? 6 : 0; }
        if (mt.name === 'net') { mt.transparent = false; mt.alphaTest = 0.5; mt.side = THREE.DoubleSide; }
        if (mt.name === 'goal_yellow') { mt.emissive.set(0x332200); }
        if (mt.name === 'window_lit') { mt.emissiveIntensity = 2.5; }
      }
      if (o.name === 'FIELD_SAND') m.material = fieldMat;
      if (o.name === 'BEACH_SAND' || o.name.startsWith('DUNE')) m.material = beachMat;
      if (o.name === 'WATER') this.setupWater(m);
      if (o.name.startsWith('NET_')) this.setupNet(m, o.name.endsWith('R') ? 1 : -1);
      if (o.name.startsWith('FLAG_')) this.flags.push({ o, base: o.rotation.y, ph: Math.random() * 6 });
    });

    // ---- holofotes (noite)
    if (def.floodlights) {
      arena.traverse((o) => {
        if (!o.name.startsWith('FLOODLIGHT_')) return;
        const s = new THREE.SpotLight(0xfff1dc, 900, 120, 0.55, 0.5, 1.6);
        s.position.copy(o.getWorldPosition(new THREE.Vector3()));
        s.target.position.set(0, 0, 0);
        s.castShadow = q === 2 && this.spots.length === 0;
        this.scene.add(s, s.target);
        this.spots.push(s);
      });
    }
    this.buildCrowd(id);
  }

  private setupWater(m: THREE.Mesh) {
    const def = this.def!;
    this.waterU.uColor.value.set(def.water);
    this.waterU.uSky.value.set(def.fog.color);
    this.waterU.uSun.value.copy(this.sun.position).normalize();
    m.material = new THREE.ShaderMaterial({
      uniforms: { ...this.waterU, fogColor: { value: new THREE.Color(def.fog.color) }, fogNear: { value: def.fog.near }, fogFar: { value: def.fog.far } },
      fog: true,
      vertexShader: `varying vec3 vW;
#include <fog_pars_vertex>
        void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
 }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform vec3 uSky; uniform vec3 uSun; varying vec3 vW;
#include <fog_pars_fragment>
        void main(){ vec2 p=vW.xz*0.08; float t=uTime;
          vec3 n=normalize(vec3(sin(p.x*3.1+t*1.3)*0.2+sin(p.y*5.7-t*1.7)*0.12+sin((p.x+p.y)*11.0+t*2.3)*0.05, 1.0,
                                 cos(p.y*2.7+t*1.1)*0.2+cos(p.x*6.3+t*1.9)*0.1+cos((p.x-p.y)*13.0-t*2.7)*0.05));
          vec3 v=normalize(cameraPosition-vW); float fr=pow(1.0-max(dot(n,v),0.0),3.0);
          vec3 col=mix(uColor, uSky, 0.2+0.6*fr);
          vec3 h=normalize(uSun+v); float sp=pow(max(dot(n,h),0.0),180.0)*2.5; col+=vec3(1.0,0.95,0.8)*sp;
          gl_FragColor=vec4(col,1.0);
#include <fog_fragment>
 }`,
    });
    m.receiveShadow = false;
    this.water = m;
  }

  private setupNet(m: THREE.Mesh, side: number) {
    m.geometry = m.geometry.clone();
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    this.nets.push({ mesh: m, rest: Float32Array.from(pos.array as Float32Array), disp: new Float32Array(n * 3), vel: new Float32Array(n * 3), side });
  }

  /** Empurra a rede no ponto de impacto (coordenadas do mundo). */
  netHit(point: THREE.Vector3, vel: THREE.Vector3) {
    for (const net of this.nets) {
      if (Math.sign(point.x) !== net.side) continue;
      const inv = net.mesh.matrixWorld.clone().invert();
      const lp = point.clone().applyMatrix4(inv);
      const lv = vel.clone().transformDirection(inv).multiplyScalar(vel.length() * 0.05);
      const r = net.rest;
      for (let i = 0; i < r.length; i += 3) {
        const dx = r[i] - lp.x, dy = r[i + 1] - lp.y, dz = r[i + 2] - lp.z;
        const w = Math.exp(-(dx * dx + dy * dy + dz * dz) / 0.8);
        net.vel[i] += lv.x * w; net.vel[i + 1] += lv.y * w; net.vel[i + 2] += lv.z * w;
      }
    }
  }

  private buildCrowd(id: string) {
    const seats: number[][] = assets.json(`models/arenas/${id}_seats.json`).seats;
    const g = assets.gltf('models/props/crowd.glb');
    const nodes = g.scene.children.filter((o) => /_(sit|cheer)$/.test(o.name));
    const sit = nodes.filter((n) => n.name.endsWith('_sit'));
    const cheer = nodes.filter((n) => n.name.endsWith('_cheer'));
    const fill = [0.55, 0.85, 1][settings.data.quality];
    const groups: { node: THREE.Object3D; mats: THREE.Matrix4[] }[] = nodes.map((node) => ({ node, mats: [] }));
    const rnd = mulberry(7);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (const [x, y, z, r] of seats) {
      if (rnd() > fill) continue;
      const cheering = rnd() < 0.28;
      const pool = cheering ? cheer : sit;
      const node = pool[(rnd() * pool.length) | 0];
      const gr = groups.find((gg) => gg.node === node);
      if (!gr) continue;
      const sc = 1.25 + rnd() * 0.15;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r + (rnd() - 0.5) * 0.3);
      p.set(x + (rnd() - 0.5) * 0.1, y + (cheering ? 0.32 : 0.05), z);
      gr.mats.push(m4.compose(p, q, s.set(sc, sc, sc)).clone());
    }
    g.scene.updateMatrixWorld(true);
    for (const gr of groups) {
      if (!gr.mats.length) continue;
      const meshes: THREE.Mesh[] = [];
      gr.node.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
      const pp = new THREE.Vector3(), qq = new THREE.Quaternion(), ss = new THREE.Vector3();
      for (const mesh of meshes) {
        const mt = (mesh.material as THREE.MeshStandardMaterial).clone();
        mt.onBeforeCompile = (sh) => {
          sh.uniforms.uTime = this.crowdUniforms.uTime;
          sh.uniforms.uExcite = this.crowdUniforms.uExcite;
          sh.vertexShader = 'uniform float uTime; uniform float uExcite;\n' + sh.vertexShader.replace('#include <begin_vertex>',
            `#include <begin_vertex>
             float ph = instanceMatrix[3].x*1.7 + instanceMatrix[3].z*0.9;
             float jump = max(0.0, sin(uTime*(5.0+fract(ph)*3.0) + ph)) * uExcite * (0.25 + fract(ph*3.1)*0.25);
             transformed.y += jump / 1.3;`);
        };
        mesh.matrixWorld.decompose(pp, qq, ss);
        const geo = mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(), qq, ss));
        const im = new THREE.InstancedMesh(geo, mt, gr.mats.length);
        gr.mats.forEach((mm, i) => im.setMatrixAt(i, mm));
        im.frustumCulled = false;
        this.scene.add(im);
        this.crowd.push(im);
      }
    }
  }

  setFloodlightsBoost(b: number) {
    for (const s of this.spots) s.intensity = 900 * b;
  }

  update(dt: number) {
    this.time += dt;
    this.crowdUniforms.uTime.value = this.time;
    this.crowdUniforms.uExcite.value += (this.excitement - this.crowdUniforms.uExcite.value) * Math.min(1, dt * 2);
    this.waterU.uTime.value = this.time;
    if (this.water) (this.water.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;
    const wind = this.def?.id === 'dunas' ? 1.6 : 1;
    for (const f of this.flags) f.o.rotation.z = Math.sin(this.time * 3 * wind + f.ph) * 0.35 + Math.sin(this.time * 7.3 + f.ph) * 0.12;
    for (const net of this.nets) {
      const pos = net.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      let active = false;
      for (let i = 0; i < a.length; i++) {
        net.vel[i] += -net.disp[i] * 60 * dt;
        net.vel[i] *= Math.exp(-5 * dt);
        net.disp[i] += net.vel[i] * dt;
        a[i] = net.rest[i] + net.disp[i];
        if (Math.abs(net.disp[i]) > 1e-4) active = true;
      }
      if (active) { pos.needsUpdate = true; net.mesh.geometry.computeBoundingSphere(); }
    }
  }

  render() {
    this.composer.render();
  }

  private disposeTree(o: THREE.Object3D) {
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) m.geometry?.dispose();
    });
  }
}

export function mulberry(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
