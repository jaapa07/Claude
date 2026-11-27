import * as THREE from 'three';
import { Assets } from '../core/assets';
import type { VenueDef } from '../data/content';
import { Crowd, type Seat } from './crowd';
import { Athlete } from '../game/athlete';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SURF_L = 36.57, SURF_W = 18.29;
const BOARD_Z = SURF_L / 2 + 0.3, BOARD_X = SURF_W / 2 + 0.3;

function courtMaterial(v: VenueDef): THREE.MeshStandardMaterial {
  const s = v.surface;
  const color = Assets.t(`textures/${s.tex}_color.webp`, s.repeat);
  const normal = Assets.t(`textures/${s.tex}_normal.webp`, s.repeat);
  const rough = Assets.t(`textures/${s.tex}_rough.webp`, s.repeat);
  const mat = new THREE.MeshStandardMaterial({ map: color, normalMap: normal, roughnessMap: rough, roughness: s.rough, normalScale: new THREE.Vector2(0.6, 0.6) });
  const lines = Assets.t('textures/court_lines.png');
  const zone = Assets.t('textures/court_zone.png');
  const wear = Assets.t('textures/grass_wear.png');
  const stripes = Assets.t('textures/grass_stripes.png');
  const worn = Assets.t('textures/worn_color.webp', s.repeat * 0.5);
  const u = {
    uLines: { value: lines }, uZone: { value: zone }, uWear: { value: wear }, uStripes: { value: stripes }, uWorn: { value: worn },
    uTint: { value: new THREE.Color(s.tint) }, uOutTint: { value: new THREE.Color(s.outTint) }, uLineTint: { value: new THREE.Color(s.lineTint) },
    uKind: { value: { hard: 0, clay: 1, grass: 2, carpet: 3 }[s.tex] ?? 0 },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vCourtUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvCourtUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vCourtUv; uniform sampler2D uLines, uZone, uWear, uStripes, uWorn; uniform vec3 uTint, uOutTint, uLineTint; uniform int uKind;
        float vLine = 0.0;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec2 cu = vCourtUv;
          float inCourt = texture2D(uZone, cu).r;
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 col;
          if (uKind == 0 || uKind == 3) {
            // acrylic paint over asphalt / carpet weave
            vec3 tint = mix(uOutTint, uTint, inCourt);
            col = tint * (0.72 + 0.55 * lum);
          } else if (uKind == 1) {
            col = uTint * (0.55 + 0.75 * lum) * mix(vec3(1.0), vec3(1.05, 0.96, 0.92), inCourt);
          } else {
            float stripe = texture2D(uStripes, cu).r;
            float w = texture2D(uWear, cu).r;
            vec3 g = diffuseColor.rgb * mix(0.85, 1.12, stripe) * vec3(0.92, 1.02, 0.86);
            vec3 dirt = texture2D(uWorn, cu * 6.0).rgb * vec3(0.95, 0.88, 0.75);
            col = mix(g, dirt, smoothstep(0.15, 0.8, w));
          }
          float ln = texture2D(uLines, cu).a;
          vLine = ln;
          col = mix(col, uLineTint * (uKind == 1 ? 0.92 : 1.0), ln * (uKind == 1 ? 0.92 : 0.97));
          diffuseColor.rgb = col;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.55, vLine * 0.6);`);
  };
  return mat;
}

function boardMaterial(row: number, repeatX: number): THREE.MeshStandardMaterial {
  const t = Assets.t('textures/sponsor_atlas.webp').clone();
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(repeatX, 1 / 6);
  t.offset.set(0, 1 - (row + 1) / 6);
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.45, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.18 });
}

function standGeometry(width: number, rows: number, stepH: number, stepD: number): THREE.BufferGeometry {
  // stepped tiers along +z (depth), width along x, with the lower front edge at origin
  const geoms: THREE.BufferGeometry[] = [];
  for (let r = 0; r < rows; r++) {
    const g = new THREE.BoxGeometry(width, stepH * (r + 1), stepD);
    g.translate(0, (stepH * (r + 1)) / 2, r * stepD + stepD / 2);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width * 0.3, uv.getY(i) * 0.6 + r * 0.17);
    geoms.push(g);
  }
  // merge
  let total = 0;
  for (const g of geoms) total += g.getAttribute('position').count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uvs = new Float32Array(total * 2);
  const idx: number[] = [];
  let o = 0;
  for (const g of geoms) {
    pos.set(g.getAttribute('position').array as Float32Array, o * 3);
    nor.set(g.getAttribute('normal').array as Float32Array, o * 3);
    uvs.set(g.getAttribute('uv').array as Float32Array, o * 2);
    for (const i of g.index!.array) idx.push(i + o);
    o += g.getAttribute('position').count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(idx);
  return out;
}

export class Venue {
  static crowdDensity = 1;
  static shadowSize = 2048;
  group = new THREE.Group();
  crowd: Crowd;
  sun: THREE.DirectionalLight;
  umpire: Athlete;
  ballKids: Athlete[] = [];
  lineJudges: Athlete[] = [];
  photographers: Athlete[] = [];
  flags: THREE.Mesh[] = [];
  private flagUniform = { uTime: { value: 0 } };
  private neonLights: THREE.Mesh[] = [];

  constructor(public def: VenueDef, scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    // --- environment
    const hdr = Assets.hdr.get(`sky/${def.hdri}.jpg`)!;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(hdr).texture;
    pm.dispose();
    scene.environment = env;
    scene.environmentIntensity = def.envIntensity * 1.5;
    scene.background = hdr;
    scene.backgroundIntensity = def.bgIntensity;
    scene.backgroundBlurriness = def.indoor ? 0.6 : 0.0;
    scene.fog = def.fog ? new THREE.Fog(def.fog, 50, 140) : null;

    const sun = new THREE.DirectionalLight(def.sun.color, def.sun.intensity);
    sun.position.set(...(def.sun.dir.map((x) => x * 40) as [number, number, number]));
    sun.castShadow = true;
    sun.shadow.mapSize.set(Venue.shadowSize, Venue.shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.sun = sun;
    this.group.add(sun, sun.target);
    this.group.add(new THREE.HemisphereLight(def.indoor ? '#8a8cff' : '#cfe6ff', def.indoor ? '#1a1030' : '#5a6a40', def.indoor ? 0.5 : 0.35));

    // --- court surface
    const court = new THREE.Mesh(new THREE.PlaneGeometry(SURF_W, SURF_L), courtMaterial(def));
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    // flip uv so texture z runs with world z
    this.group.add(court);

    // apron beyond the playing surface
    const apronMat = new THREE.MeshStandardMaterial({ map: Assets.t('textures/concrete_color.webp', 20), normalMap: Assets.t('textures/concrete_normal.webp', 20), color: def.indoor ? '#2a2a3a' : '#8a8f94', roughness: 0.9 });
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 140), apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.01;
    apron.receiveShadow = true;
    this.group.add(apron);

    // --- net
    const net = Assets.g('models/props/net.glb').scene.clone(true);
    net.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.group.add(net);

    // --- sponsor boards around the court
    const boards = new THREE.Group();
    const bh = 1.0;
    const backW = SURF_W + 0.6;
    const addBoard = (w: number, x: number, z: number, ry: number, row: number) => {
      const g = new THREE.BoxGeometry(w, bh, 0.12);
      const uv = g.getAttribute('uv');
      // only front face gets the logo: keep uv; repeat across width
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i));
      const mesh = new THREE.Mesh(g, boardMaterial(row, Math.max(1, Math.round(w / 4))));
      mesh.position.set(x, bh / 2, z);
      mesh.rotation.y = ry;
      mesh.castShadow = true; mesh.receiveShadow = true;
      boards.add(mesh);
    };
    const segW = backW / 3;
    for (let i = 0; i < 3; i++) {
      addBoard(segW, -backW / 2 + segW * (i + 0.5), -BOARD_Z, 0, (i * 2) % 6);
      addBoard(segW, -backW / 2 + segW * (i + 0.5), BOARD_Z, Math.PI, (i * 2 + 1) % 6);
    }
    const sideL = SURF_L + 0.6, sideSeg = sideL / 4;
    for (let i = 0; i < 4; i++) {
      if (i === 1 || i === 2) continue; // leave gap near the net for chair & benches
      addBoard(sideSeg, BOARD_X, -sideL / 2 + sideSeg * (i + 0.5), -Math.PI / 2, (i + 3) % 6);
      addBoard(sideSeg, -BOARD_X, -sideL / 2 + sideSeg * (i + 0.5), Math.PI / 2, (i + 4) % 6);
    }
    this.group.add(boards);

    // --- stands
    const concreteMat = new THREE.MeshStandardMaterial({ map: Assets.t('textures/concrete_color.webp', 1), normalMap: Assets.t('textures/concrete_normal.webp', 1), color: def.standColor, roughness: 0.85 });
    const wallMat = new THREE.MeshStandardMaterial({ color: def.wall, roughness: 0.6 });
    const seats: Seat[] = [];
    const stepH = 0.42, stepD = 0.85;
    const seatXf: THREE.Matrix4[] = [];
    const stairMat = new THREE.MeshStandardMaterial({ map: Assets.t('textures/concrete_color.webp', 1), color: new THREE.Color(def.standColor).multiplyScalar(1.12), roughness: 0.8 });
    const railMat = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.85, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#9fd4ff', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#f2f4f7', roughness: 0.6, metalness: 0.1 });
    const trussMat = new THREE.MeshStandardMaterial({ map: Assets.t('textures/metal_color.webp', 2), color: '#d5dae0', metalness: 0.8, roughness: 0.35 });
    const addStand = (width: number, rows: number, pos: THREE.Vector3, ry: number, seatSpacing = 0.62, withRoof = false) => {
      const g = standGeometry(width, rows, stepH, stepD);
      const m = new THREE.Mesh(g, concreteMat);
      const holder = new THREE.Group();
      holder.position.copy(pos);
      holder.rotation.y = ry;
      m.receiveShadow = true;
      m.position.y = 1.6;
      holder.add(m);
      // front wall
      const fw = new THREE.Mesh(new THREE.BoxGeometry(width, 1.6, 0.3), wallMat);
      fw.position.set(0, 0.8, -0.15);
      fw.receiveShadow = true;
      holder.add(fw);
      // tournament banner on the front wall
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width - 1, 16), 0.9), new THREE.MeshStandardMaterial({ map: Assets.t(`textures/banner_${def.id}.webp`), roughness: 0.6, emissive: '#fff', emissiveMap: Assets.t(`textures/banner_${def.id}.webp`), emissiveIntensity: def.indoor ? 0.5 : 0.08 }));
      banner.position.set(0, 0.85, -0.31);
      banner.rotation.y = Math.PI;
      holder.add(banner);
      // side walls
      for (const sx of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.3, rows * stepH + 2.2, rows * stepD), wallMat);
        sw.position.set(sx * (width / 2 + 0.15), (rows * stepH + 2.2) / 2 + 0.4, (rows * stepD) / 2);
        holder.add(sw);
      }
      holder.updateMatrixWorld(true);
      const n = Math.floor((width - 1) / seatSpacing);
      const aisle = (i: number) => i % 14 === 7; // stair aisles every ~8.7 m
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < n; i++) {
          if (aisle(i)) continue;
          const lx = -width / 2 + 0.5 + i * seatSpacing;
          const local = new THREE.Vector3(lx, 1.6 + stepH * (r + 1) - 0.47, r * stepD + 0.42);
          seats.push({ pos: local.applyMatrix4(holder.matrixWorld), ry: ry + Math.PI });
          seatXf.push(new THREE.Matrix4().multiplyMatrices(holder.matrixWorld, new THREE.Matrix4().makeTranslation(lx, 1.6 + stepH * (r + 1), r * stepD + 0.5)));
        }
      }
      // aisle stairs: lighter half-steps between the tiers
      const stairGeoms: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        if (!aisle(i)) continue;
        const lx = -width / 2 + 0.5 + i * seatSpacing;
        for (let r = 0; r < rows; r++) {
          const b = new THREE.BoxGeometry(0.9, stepH / 2, stepD / 2);
          b.translate(lx, 1.6 + stepH * (r + 1) + stepH / 4, r * stepD + stepD * 0.75);
          stairGeoms.push(b);
        }
      }
      if (stairGeoms.length) { const st = new THREE.Mesh(mergeGeometries(stairGeoms), stairMat); st.receiveShadow = true; holder.add(st); }
      // front railing (posts + top rail + glass panel)
      const rail: THREE.BufferGeometry[] = [];
      const top = new THREE.CylinderGeometry(0.035, 0.035, width, 8); top.rotateZ(Math.PI / 2); top.translate(0, 2.55, 0.05); rail.push(top);
      for (let x = -width / 2 + 0.3; x <= width / 2; x += 2.2) { const post = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6); post.translate(x, 2.08, 0.05); rail.push(post); }
      const railMesh = new THREE.Mesh(mergeGeometries(rail), railMat); holder.add(railMesh);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.85), glassMat); glass.position.set(0, 2.05, 0.05); holder.add(glass);
      // cantilever roof over the upper rows (outdoor side stands)
      if (!def.indoor && withRoof) {
        const depth = rows * stepD;
        const roofY = 1.6 + rows * stepH + 3.6;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.18, depth * 0.85), roofMat);
        roof.position.set(0, roofY, depth * 0.62);
        roof.rotation.x = -0.08;
        roof.castShadow = true; roof.receiveShadow = true;
        holder.add(roof);
        const truss: THREE.BufferGeometry[] = [];
        for (let x = -width / 2; x <= width / 2 + 0.01; x += width / 6) {
          const col = new THREE.BoxGeometry(0.25, roofY - 1.6 - rows * stepH * 0.85, 0.25);
          col.translate(x, 1.6 + rows * stepH * 0.85 + (roofY - 1.6 - rows * stepH * 0.85) / 2, depth - 0.3);
          const beam = new THREE.BoxGeometry(0.18, 0.4, depth * 0.9);
          beam.translate(x, roofY - 0.25, depth * 0.6);
          const brace = new THREE.CylinderGeometry(0.05, 0.05, Math.hypot(depth * 0.5, 3), 6);
          brace.rotateX(Math.atan2(depth * 0.5, 3));
          brace.translate(x, roofY - 1.6, depth * 0.72);
          truss.push(col, beam, brace);
        }
        const tm = new THREE.Mesh(mergeGeometries(truss), trussMat); tm.castShadow = true; holder.add(tm);
      }
      this.group.add(holder);
    };
    const backDist = BOARD_Z + 3.2, sideDist = BOARD_X + 3.2;
    addStand(30, 11, new THREE.Vector3(0, 0, -backDist), Math.PI); // far end (visible behind opponent)
    addStand(30, 6, new THREE.Vector3(0, 0, backDist), 0);
    addStand(34, 9, new THREE.Vector3(-sideDist - 1.5, 0, 0), -Math.PI / 2, 0.62, true);
    addStand(34, 9, new THREE.Vector3(sideDist, 0, 0), Math.PI / 2, 0.62, true);
    // stadium seats (instanced): pan, backrest and legs, tinted with the venue's seat colours
    {
      const pan = new THREE.BoxGeometry(0.46, 0.05, 0.4); pan.translate(0, 0.02, -0.02);
      const back = new THREE.BoxGeometry(0.46, 0.38, 0.05); back.rotateX(-0.12); back.translate(0, 0.22, 0.2);
      const leg = new THREE.BoxGeometry(0.05, 0.02, 0.36); leg.translate(0, -0.01, 0);
      const geom = mergeGeometries([pan, back, leg]);
      const im = new THREE.InstancedMesh(geom, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), seatXf.length);
      const cols = def.seatColors.map((c) => new THREE.Color(c));
      seatXf.forEach((mx, k) => { im.setMatrixAt(k, mx); im.setColorAt(k, cols[(Math.floor(k / 40) + (k % 40 > 20 ? 1 : 0)) % cols.length]); });
      im.instanceMatrix.needsUpdate = true;
      im.receiveShadow = true;
      this.group.add(im);
    }
    // corner fill so the bowl reads as closed
    for (const [x, z, ry] of [[-17, -24, Math.PI * 0.75], [17, -24, -Math.PI * 0.75]] as [number, number, number][]) {
      const g = standGeometry(10, 8, stepH, stepD);
      const m = new THREE.Mesh(g, concreteMat);
      m.position.set(x, 1.6, z);
      m.rotation.y = ry;
      this.group.add(m);
    }
    this.crowd = new Crowd(seats, (def.indoor ? 0.92 : 0.8) * Venue.crowdDensity);
    this.group.add(this.crowd.group);

    // --- roof / light rig
    if (def.indoor) {
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), new THREE.MeshStandardMaterial({ color: '#05050f', roughness: 1 }));
      roof.rotation.x = Math.PI / 2;
      roof.position.y = 24;
      this.group.add(roof);
      const lampMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#e6f0ff', emissiveIntensity: 6 });
      for (let i = -2; i <= 2; i++) for (const sx of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.2), lampMat);
        lamp.position.set(sx * 7, 20, i * 7);
        this.group.add(lamp);
      }
      const neonMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4 });
      for (const [c, y] of [[def.wallAccent, 3.4], ['#3ff7ff', 8.2]] as [string, number][]) {
        for (const sz of [-1, 1]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(30, 0.12, 0.12), neonMat(c));
          strip.position.set(0, y, sz * (backDist - 0.32));
          this.group.add(strip);
          this.neonLights.push(strip);
        }
      }
      const spot1 = new THREE.SpotLight('#ff4fe0', 300, 60, 0.5, 0.6);
      spot1.position.set(-14, 18, -20);
      spot1.target.position.set(0, 0, 0);
      const spot2 = new THREE.SpotLight('#4ff7ff', 300, 60, 0.5, 0.6);
      spot2.position.set(14, 18, 20);
      this.group.add(spot1, spot1.target, spot2);
      // Big screen
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), new THREE.MeshStandardMaterial({ map: Assets.t('textures/banner_neon.webp'), emissive: '#fff', emissiveMap: Assets.t('textures/banner_neon.webp'), emissiveIntensity: 1.2 }));
      screen.position.set(0, 15, -backDist - 6);
      this.group.add(screen);
    } else {
      // stadium flood lights on poles at the corners
      const fl = Assets.g('models/props/flood_lights.glb').scene;
      const poleMat = new THREE.MeshStandardMaterial({ map: Assets.t('textures/metal_color.webp', 2), color: '#c9ced3', metalness: 0.8, roughness: 0.4 });
      for (const [x, z] of [[-21, -28], [21, -28], [-21, 28], [21, 28]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 22, 10), poleMat);
        pole.position.set(x, 11, z);
        pole.castShadow = true;
        this.group.add(pole);
        const f = fl.clone(true);
        const box = new THREE.Box3().setFromObject(f);
        const size = box.getSize(new THREE.Vector3());
        f.scale.setScalar(3.2 / Math.max(size.x, size.y, size.z));
        f.position.set(x, 22, z);
        f.lookAt(0, 0, 0);
        this.group.add(f);
      }
      // flags on the far stand roof line
      const flagMatColors = ['#c1121f', '#f5c542', '#0aa2c0', '#2f8f3a', '#ffffff', def.wallAccent];
      for (let i = 0; i < 8; i++) {
        const g = new THREE.PlaneGeometry(1.6, 1.0, 10, 4);
        g.translate(0.8, 0, 0);
        const mat = new THREE.MeshStandardMaterial({ color: flagMatColors[i % flagMatColors.length], side: THREE.DoubleSide, roughness: 0.8 });
        mat.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, this.flagUniform);
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
            float k = position.x / 1.6; transformed.z += sin(uTime * 5.0 + position.x * 3.0 + ${i}.0) * 0.18 * k; transformed.y -= k * k * 0.12;`);
        };
        const flag = new THREE.Mesh(g, mat);
        const x = -14 + i * 4;
        flag.position.set(x, 1.6 + 11 * stepH + 3.2, -backDist - 11 * stepD + 0.3);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 6), poleMat);
        pole.position.set(x, flag.position.y - 1.2, flag.position.z);
        this.group.add(flag, pole);
        this.flags.push(flag);
      }
    }

    // --- umpire chair, benches, plants, crates
    const chair = Assets.g('models/props/umpire_chair.glb').scene.clone(true);
    chair.position.set(-BOARD_X + 1.6, 0, 0);
    chair.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.group.add(chair);
    for (const z of [-2.2, 2.2]) {
      const b = Assets.g('models/props/bench.glb').scene.clone(true);
      b.position.set(-BOARD_X + 0.6, 0, z);
      b.rotation.y = Math.PI / 2;
      b.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; } });
      this.group.add(b);
    }
    const placeProp = (path: string, x: number, z: number, h: number, ry = 0) => {
      const p = Assets.g(path).scene.clone(true);
      const box = new THREE.Box3().setFromObject(p);
      const size = box.getSize(new THREE.Vector3());
      p.scale.setScalar(h / size.y);
      p.position.set(x, 0, z);
      p.rotation.y = ry;
      p.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      this.group.add(p);
    };
    if (!def.indoor) {
      const plant = def.id === 'harbor' ? 'models/props/potted_plant_01.glb' : 'models/props/potted_plant_04.glb';
      for (const sx of [-1, 1]) for (const z of [-6.5, 6.5]) placeProp(plant, sx * (BOARD_X + 0.9), z, 1.4, Math.random() * 6);
      if (def.id === 'lawn') for (const sx of [-1, 1]) for (const z of [-15, 15]) placeProp('models/props/shrub_01.glb', sx * (BOARD_X + 2.2), z, 1.1, Math.random() * 6);
      for (const sx of [-1, 1]) placeProp('models/props/planter_box_01.glb', sx * (BOARD_X + 0.8), sx * 12.5, 0.7, Math.PI / 2);
    }
    placeProp('models/props/plastic_crate_01.glb', BOARD_X - 0.4, -3.0, 0.35);

    // --- officials & ball kids (same character models, uniform outfits)
    const official = { body: 'm' as const, hair: 'hair_simpleparted', skinTint: '#e2b48c', hairColor: '#3a2a1a', shirt: '#f4f1ea', shirtAccent: def.wallAccent, shorts: '#1c2440', socks: '#1c2440', shoes: '#111111', headband: undefined, sponsor: 2, racket: '#000' };
    this.umpire = new Athlete(official, { racket: false });
    this.umpire.root.position.set(-BOARD_X + 1.6, 2.04, 0);
    this.umpire.root.rotation.y = Math.PI / 2;
    this.umpire.root.scale.setScalar(0.95);
    this.umpire.play('sit', { fade: 0 });
    this.group.add(this.umpire.root);

    const kid = (female: boolean) => ({ body: female ? ('f' as const) : ('m' as const), hair: female ? 'hair_buns' : 'hair_buzzed', skinTint: ['#e9c09a', '#a86b42', '#f2d0b5'][Math.floor(Math.random() * 3)], hairColor: '#2a1a10', shirt: def.wallAccent, shirtAccent: '#ffffff', shorts: '#1c1c28', socks: '#ffffff', shoes: '#ffffff', sponsor: 0, racket: '#000' });
    const kidSpots: [number, number, number][] = [[-6.9, 0.25, Math.PI / 2], [6.9, -0.25, -Math.PI / 2], [-4.5, -BOARD_Z + 0.6, 0], [4.5, BOARD_Z - 0.6, Math.PI]];
    kidSpots.forEach(([x, z, ry], i) => {
      const k = new Athlete(kid(i % 2 === 1), { racket: false });
      k.root.scale.setScalar(0.82);
      k.root.position.set(x, 0, z);
      k.root.rotation.y = ry;
      k.play('ready', { fade: 0 });
      k.actions.get('ready')!.time = Math.random() * 2;
      this.ballKids.push(k);
      this.group.add(k.root);
    });
    // line judges sitting near the baseline corners
    for (const [x, z, ry] of [[-BOARD_X + 0.5, -BOARD_Z + 0.9, Math.PI / 4], [BOARD_X - 0.5, BOARD_Z - 0.9, -Math.PI * 0.75]] as [number, number, number][]) {
      const j = new Athlete({ ...official, hair: 'hair_buzzed' }, { racket: false });
      j.root.position.set(x, 0.0, z);
      j.root.rotation.y = ry;
      j.play('arms_folded', { fade: 0 });
      this.lineJudges.push(j);
      this.group.add(j.root);
    }
    // photographers crouching behind the far baseline
    for (const x of [-7.5, 7.5]) {
      const p = new Athlete({ ...official, shirt: '#2b2d42', shorts: '#2b2d42', hair: 'hair_simpleparted' }, { racket: false });
      p.root.position.set(x, 0, -BOARD_Z - 0.9);
      p.root.rotation.y = 0;
      p.play('ready', { fade: 0 });
      this.photographers.push(p);
      this.group.add(p.root);
    }

    scene.add(this.group);
  }

  officials(): Athlete[] {
    return [this.umpire, ...this.ballKids, ...this.lineJudges, ...this.photographers];
  }

  update(dt: number, t: number) {
    this.crowd.update(dt, t);
    this.flagUniform.uTime.value = t;
    for (const o of this.officials()) o.update(dt);
    this.neonLights.forEach((n, i) => ((n.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 + Math.sin(t * 2 + i) * 1.2));
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
      }
    });
  }
}
