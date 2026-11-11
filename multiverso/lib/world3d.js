// world3d.js: one shared three.js renderer + GLSL pieces used across the season:
// a reality-distortion post pass (wobble, glitch, swirl, chroma), a nebula sky, a procedural Earth, the family house,
// the Rubik's-cube house, and helpers to draw a 3D render under 2D characters.
import * as THREE from '../vendor/three.module.js';
import { W, H, hash, TAU, clamp, ease, prog } from './core.js';
export { THREE };

let R = null;
export function renderer() {
  if (R) return R;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  R = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true, alpha: true });
  R.setPixelRatio(1); R.setSize(W, H, false); R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.1;
  return R;
}
export function draw3d(g, scene, camera) { const r = renderer(); r.setClearColor(0x000000, 0); r.render(scene, camera); g.drawImage(r.domElement, 0, 0); }
export function camera(fov = 40) { return new THREE.PerspectiveCamera(fov, W / H, .1, 5000); }

// ---------- post pass: the 2D frame as a texture through a distortion shader ----------
let P = null;
export function post(srcCanvas, u, t, outCtx) {
  const r = renderer();
  if (!P) {
    const tex = new THREE.CanvasTexture(srcCanvas); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: tex }, time: { value: 0 }, wobble: { value: 0 }, glitch: { value: 0 }, swirl: { value: 0 }, center: { value: new THREE.Vector2(.5, .5) }, chroma: { value: 0 }, invert: { value: 0 }, pixel: { value: 0 }, cubes: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: /* glsl */`
        uniform sampler2D tex; uniform float time, wobble, glitch, swirl, chroma, invert, pixel, cubes; uniform vec2 center; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec2 uv = vUv;
          // gravity-off wobble: the whole picture breathes like jelly
          uv += wobble * 0.018 * vec2(sin(uv.y * 9. + time * 3.), cos(uv.x * 7. + time * 2.6));
          // swirl around a centre (portals, black holes, reality reset)
          vec2 d = (uv - center) * vec2(1., 1.7778); float r = length(d);
          float a = swirl * exp(-r * 3.2) * 6.;
          d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d; uv = center + d / vec2(1., 1.7778);
          // reality breaking into cubes: blocky offsets
          if (cubes > 0.) { vec2 cell = floor(uv * vec2(9., 16.)); float k = h(cell + floor(time * 4.)); uv += (vec2(h(cell), h(cell + 3.1)) - .5) * cubes * .08 * step(.5, k); }
          // glitch: horizontal slices jump
          float sl = floor(uv.y * 48.); float gk = step(1. - glitch * .5, h(vec2(sl, floor(time * 18.))));
          uv.x += gk * (h(vec2(sl, time)) - .5) * .3 * glitch;
          if (pixel > 0.) { vec2 ps = vec2(1080., 1920.) / (pixel * 40. + 1.); uv = (floor(uv * ps) + .5) / ps; }
          float ca = chroma * .012 + glitch * .01;
          vec3 c = vec3(texture2D(tex, uv + vec2(ca, 0.)).r, texture2D(tex, uv).g, texture2D(tex, uv - vec2(ca, 0.)).b);
          c = mix(c, 1. - c, invert);
          if (glitch > 0.) c += (h(uv * 900. + time) - .5) * .12 * glitch;
          gl_FragColor = vec4(c, 1.);
        }`,
      depthTest: false,
    });
    const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    P = { sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat, tex };
  }
  const un = P.mat.uniforms; un.time.value = t;
  for (const k of ['wobble', 'glitch', 'swirl', 'chroma', 'invert', 'pixel', 'cubes']) un[k].value = u[k] || 0;
  if (u.center) un.center.value.set(u.center[0], 1 - u.center[1]);
  P.tex.needsUpdate = true;
  const tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
  r.render(P.sc, P.cam); r.toneMapping = tm;
  outCtx.drawImage(r.domElement, 0, 0);
}

// ---------- sky: nebula sphere + stars ----------
export function sky(seed = 1, tintA = [0.32, 0.12, 0.55], tintB = [0.05, 0.2, 0.45]) {
  const grp = new THREE.Group();
  const neb = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { a: { value: new THREE.Vector3(...tintA) }, b: { value: new THREE.Vector3(...tintB) }, seed: { value: seed } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      varying vec3 vP; uniform vec3 a, b; uniform float seed;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + seed) * 43758.5453); }
      float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float s = 0., m = .5; for (int i = 0; i < 5; i++){ s += n(p) * m; p *= 2.03; m *= .5; } return s; }
      void main(){ float k = fbm(vP * 3.); float k2 = fbm(vP * 6. + 4.);
        vec3 c = vec3(.01, .01, .04) + a * pow(k, 3.) * 1.6 + b * pow(k2, 4.) * 1.4; gl_FragColor = vec4(c, 1.); }`,
  }));
  grp.add(neb);
  const n = 3500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = hash(i, seed) * 2 - 1, th = hash(i, seed + 1) * TAU, r = 1500, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3);
    const w = .6 + hash(i, seed + 2) * .4; col.set([w, w * (.85 + hash(i, 7) * .15), w + hash(i, 9) * .2], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  grp.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, sizeAttenuation: false, transparent: true, depthWrite: false })));
  return grp;
}

// ---------- the Earth: procedural continents, clouds, atmosphere (all GLSL) ----------
const NOISE = /* glsl */`
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float s = 0., m = .5; for (int i = 0; i < 6; i++){ s += n3(p) * m; p *= 2.02; m *= .5; } return s; }`;
export function earth(radius = 100) {
  const grp = new THREE.Group();
  const sun = { value: new THREE.Vector3(.5, .8, .7).normalize() };
  const surf = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), new THREE.ShaderMaterial({
    uniforms: { sun, time: { value: 0 } },
    vertexShader: 'varying vec3 vN, vP, vW; void main(){ vP = position; vN = normalize(normalMatrix * normal); vW = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 sun; varying vec3 vN, vP, vW;
      void main(){
        vec3 p = normalize(vP); float e = fbm(p * 2.2 + vec3(1.7, 0., 3.1));
        float land = smoothstep(.5, .53, e);
        vec3 ocean = mix(vec3(.02, .12, .38), vec3(.05, .32, .62), smoothstep(.3, .5, e));
        vec3 ground = mix(vec3(.16, .48, .14), vec3(.55, .45, .22), smoothstep(.56, .7, e));
        float ice = smoothstep(.92, .97, abs(p.y));
        vec3 c = mix(ocean, ground, land); c = mix(c, vec3(.95), ice);
        vec3 n = normalize(vN); vec3 l = normalize((viewMatrix * vec4(sun, 0.)).xyz);
        float dif = max(dot(n, l), 0.); vec3 v = normalize(-(viewMatrix * vec4(vW, 1.)).xyz);
        float spec = pow(max(dot(reflect(-l, n), v), 0.), 40.) * (1. - land) * .6;
        vec3 night = vec3(1., .8, .4) * land * smoothstep(.62, .64, fbm(p * 18.)) * (1. - smoothstep(0., .2, dif));
        gl_FragColor = vec4(c * (dif * 1.1 + .06) + spec + night * .9, 1.);
      }`,
  }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.015, 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { sun, time: { value: 0 } },
    vertexShader: 'varying vec3 vN, vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 sun; uniform float time; varying vec3 vN, vP;
      void main(){ vec3 p = normalize(vP); float c = smoothstep(.56, .78, fbm(p * 3.5 + vec3(time * .02, 0., 0.)));
        vec3 l = normalize((viewMatrix * vec4(sun, 0.)).xyz); float d = max(dot(normalize(vN), l), 0.);
        gl_FragColor = vec4(vec3(1.) * (d + .05), c * .85); }`,
  }));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.12, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { sun },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ float k = pow(.72 - dot(vN, vec3(0., 0., 1.)), 3.); gl_FragColor = vec4(.3, .6, 1., 1.) * k * 1.6; }',
  }));
  grp.add(surf, clouds, atmo);
  grp.userData = { surf, clouds, sun, set(t) { clouds.material.uniforms.time.value = t; surf.rotation.y = t * .05; clouds.rotation.y = t * .062; } };
  return grp;
}

// ---------- the family house: canvas-textured walls, tiled roof, lit windows ----------
export function houseTexture(side = 'front', lit = 1) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = side === 'roof' ? '#c4462e' : '#f6d7a0'; g.fillRect(0, 0, 512, 512);
  if (side === 'roof') { for (let y = 0; y < 512; y += 40) for (let x = (y / 40 % 2) * 30; x < 512; x += 60) { g.fillStyle = '#a63622'; g.beginPath(); g.arc(x, y + 40, 30, Math.PI, 0); g.fill(); g.strokeStyle = '#7a2414'; g.lineWidth = 3; g.stroke(); } }
  else {
    g.fillStyle = 'rgba(160,110,60,.15)'; for (let i = 0; i < 300; i++) g.fillRect(hash(i, 1) * 512, hash(i, 2) * 512, 6, 3);
    g.fillStyle = '#d9b27a'; g.fillRect(0, 460, 512, 52);
    const win = (x, y, w, h) => { g.fillStyle = '#3d2410'; g.fillRect(x - 8, y - 8, w + 16, h + 16); g.fillStyle = lit ? '#ffe7a0' : '#6aa8d8'; g.fillRect(x, y, w, h); g.fillStyle = '#3d2410'; g.fillRect(x + w / 2 - 4, y, 8, h); g.fillRect(x, y + h / 2 - 4, w, 8); };
    if (side === 'front') { g.fillStyle = '#7a3e1a'; g.fillRect(206, 280, 100, 180); g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(290, 370, 8, 0, TAU); g.fill(); win(60, 120, 110, 110); win(342, 120, 110, 110); win(60, 300, 100, 100); win(352, 300, 100, 100); }
    else { win(90, 150, 130, 130); win(292, 150, 130, 130); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function house() {
  const grp = new THREE.Group();
  const wall = s => new THREE.MeshStandardMaterial({ map: houseTexture(s), roughness: .85 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 9), [wall('side'), wall('side'), wall('roof'), wall('roof'), wall('front'), wall('side')]);
  body.position.y = 4; grp.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 5, 4), new THREE.MeshStandardMaterial({ map: houseTexture('roof'), roughness: .7, flatShading: true }));
  roof.position.y = 10.5; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .92); grp.add(roof);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 1.4), new THREE.MeshStandardMaterial({ color: 0x9a4a30 })); chim.position.set(2.6, 11.5, 1); grp.add(chim);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 5, 3, 8), new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1, flatShading: true })); base.position.y = -1.4; grp.add(base);   // the chunk of ground it took with it
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(8.1, 8.1, .5, 8), new THREE.MeshStandardMaterial({ color: 0x3fa34d, flatShading: true })); grass.position.y = 0; grp.add(grass);
  return grp;
}
// the house as a 3x3x3 Rubik's cube: each cubelet carries its slice of the facade; layers turn in sequence
export function rubikHouse() {
  const grp = new THREE.Group(), cubes = [];
  const tx = { front: houseTexture('front'), side: houseTexture('side'), roof: houseTexture('roof') };
  const inner = new THREE.MeshStandardMaterial({ color: 0x1b1226, roughness: .6 });
  const sl = (tex, i, j) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3); t.offset.set(i / 3, j / 3); return new THREE.MeshStandardMaterial({ map: t, roughness: .8 }); };
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const m = [
      x === 1 ? sl(tx.side, 2 - (z + 1), y + 1) : inner, x === -1 ? sl(tx.side, z + 1, y + 1) : inner,
      y === 1 ? sl(tx.roof, x + 1, 1 - z) : inner, y === -1 ? inner : inner,
      z === 1 ? sl(tx.front, x + 1, y + 1) : inner, z === -1 ? sl(tx.side, 2 - (x + 1), y + 1) : inner,
    ];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.96, .96, .96), m);
    mesh.userData.home = new THREE.Vector3(x, y, z); grp.add(mesh); cubes.push(mesh);
  }
  // moves: [axis 'x'|'y'|'z', layer -1|0|1, quarter turns, start time, duration]
  grp.userData.set = (t, moves) => {
    const q = new THREE.Quaternion(), axisV = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
    for (const c of cubes) { c.position.copy(c.userData.home); c.quaternion.identity(); }
    for (const [ax, layer, turns, t0, d] of moves) {
      if (t < t0) break;
      const k = ease.ioC(clamp((t - t0) / d)), ang = turns * Math.PI / 2 * k;
      q.setFromAxisAngle(axisV[ax], ang);
      for (const c of cubes) {
        if (Math.round(c.position[ax]) !== layer) continue;
        c.position.applyQuaternion(q); c.quaternion.premultiply(q);
        if (k >= 1) c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
      }
    }
  };
  return grp;
}
export function lights(scene, { amb = .5, sun = 2.2, color = 0xfff1dd, dir = [5, 6, 8] } = {}) {
  scene.add(new THREE.AmbientLight(0x8a90ff, amb));
  const d = new THREE.DirectionalLight(color, sun); d.position.set(...dir); scene.add(d);
  return d;
}

// ---------- the fleet: thousands of saucers in three InstancedMeshes (hull, dome, light ring) ----------
export function saucerGeometry() {
  const pts = [[0, -.35], [.5, -.3], [1, -.05], [1.05, 0], [1, .07], [.55, .2], [0, .24]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 28);
}
// fleet(n, layout(i) -> {x,y,z,s}) ; call .userData.set(t, fn(i, t) -> [x,y,z,s, rotY]) to move them every frame
export function fleet(n, seed = 1) {
  const grp = new THREE.Group();
  const hull = new THREE.InstancedMesh(saucerGeometry(), new THREE.MeshStandardMaterial({ color: 0xaab0d0, metalness: .7, roughness: .3 }), n);
  const dome = new THREE.InstancedMesh(new THREE.SphereGeometry(.42, 16, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9be03a, emissive: 0x3a7a10, emissiveIntensity: .8, transparent: true, opacity: .9 }), n);
  const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(.9, .06, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff3bd1 }), n);
  grp.add(hull, dome, ring); for (const im of [hull, dome, ring]) im.frustumCulled = false;   // bounds are computed before the instances move
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, .22, 0);
  grp.userData.set = (t, fn) => {
    for (let i = 0; i < n; i++) {
      const [x, y, z, s, ry, rx = 0] = fn(i, t);
      e.set(rx, ry, 0); q.setFromEuler(e); p.set(x, y, z); sc.setScalar(s);
      m.compose(p, q, sc); hull.setMatrixAt(i, m);
      ring.setMatrixAt(i, m.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
      dome.setMatrixAt(i, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, .2, 0)));
    }
    hull.instanceMatrix.needsUpdate = dome.instanceMatrix.needsUpdate = ring.instanceMatrix.needsUpdate = true;
  };
  return grp;
}
// the mothership: a huge saucer with a glowing belly
export function motherShip() {
  const grp = new THREE.Group();
  const hull = new THREE.Mesh(saucerGeometry(), new THREE.MeshStandardMaterial({ color: 0x8a90b8, metalness: .8, roughness: .35 })); hull.scale.set(30, 22, 30); grp.add(hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9be03a, emissive: 0x4a9a10, emissiveIntensity: 1.2 })); dome.position.y = 4; grp.add(dome);
  const belly = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: 0xff3bd1 })); belly.rotation.x = Math.PI / 2; belly.position.y = -7.8; grp.add(belly);
  for (let i = 0; i < 24; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.9, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd21f : 0x5cf2ff })); const a = i / 24 * TAU; l.position.set(Math.cos(a) * 29, 0, Math.sin(a) * 29); grp.add(l); }
  return grp;
}
// a planet made of sausages: a meaty sphere covered in instanced capsules
export function sausagePlanet(radius = 60, n = 900) {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), new THREE.MeshStandardMaterial({ color: 0xa8402a, roughness: .5 })));
  const cap = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1.6, 9, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc4553a, roughness: .35, metalness: .05 }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const u = hash(i, 51) * 2 - 1, th = hash(i, 52) * TAU, r = Math.sqrt(1 - u * u); const nrm = new THREE.Vector3(Math.cos(th) * r, u, Math.sin(th) * r);
    p.copy(nrm).multiplyScalar(radius + .6);
    const tangent = new THREE.Vector3().crossVectors(nrm, new THREE.Vector3(hash(i, 53) - .5, hash(i, 54) - .5, hash(i, 55) - .5)).normalize();
    q.setFromUnitVectors(up, tangent); s.setScalar(.8 + hash(i, 56) * .6); m.compose(p, q, s); cap.setMatrixAt(i, m);
  }
  grp.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.6, 3, 8, 80), new THREE.MeshStandardMaterial({ color: 0xffd21f, metalness: .4, roughness: .4 })); ring.rotation.x = 1.2; grp.add(ring);   // a ring of mustard
  return grp;
}
// a soccer-ball texture for planets that turned into footballs
export function ballTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 512);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const cx = i * 128 + (j % 2) * 64 + 32, cy = 64 + j * 128; g.beginPath();
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - Math.PI / 2; g.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); }
    g.closePath(); g.fillStyle = '#141414'; g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a black hole: lensing-ish accretion disk shader on a billboard
export function blackHole(size = 80) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      uniform float time; varying vec2 vUv;
      void main(){ vec2 p = (vUv - .5) * 2.; float r = length(p); float a = atan(p.y, p.x);
        float disk = smoothstep(.95, .45, r) * smoothstep(.22, .32, r);
        float swirl = .5 + .5 * sin(a * 6. - r * 18. + time * 4.);
        vec3 c = mix(vec3(1., .35, .05), vec3(1., .9, .6), swirl) * disk * (1.4 - r);
        c += vec3(.6, .3, 1.) * smoothstep(.36, .3, abs(r - .33)) * .8;
        float hole = smoothstep(.27, .24, r);
        gl_FragColor = vec4(c * (1. - hole), max(disk, hole)); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  const core = new THREE.Mesh(new THREE.SphereGeometry(size * .13, 32, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const grp = new THREE.Group(); grp.add(m, core); grp.userData.set = t => { mat.uniforms.time.value = t; };
  return grp;
}
// a GLSL portal disc (for chinelos, aliens and anything else that should not be travelling between worlds)
export function portal(size = 40, color = [0.4, 0.95, 1.0]) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { time: { value: 0 }, open: { value: 1 }, col: { value: new THREE.Vector3(...color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      uniform float time, open; uniform vec3 col; varying vec2 vUv;
      void main(){ vec2 p = (vUv - .5) * 2.; float r = length(p) / max(open, .001); float a = atan(p.y, p.x);
        float s = .5 + .5 * sin(a * 5. + r * 14. - time * 7.);
        float ring = smoothstep(1., .8, r) * smoothstep(.0, .5, r);
        vec3 c = mix(col * .4, col + .3, s) * ring + vec3(1.) * smoothstep(.98, .9, r) * smoothstep(.84, .9, r);
        float alpha = smoothstep(1., .9, r);
        gl_FragColor = vec4(mix(vec3(.02, .0, .08), c, ring), alpha); }`,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 64), mat); m.userData.set = (t, open = 1) => { mat.uniforms.time.value = t; mat.uniforms.open.value = open; };
  return m;
}
