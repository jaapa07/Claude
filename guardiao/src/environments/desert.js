import * as THREE from 'three';
import { rng, fbm2, TAU } from '../timeline/util.js';
import { patchDissolve } from '../shaders/dissolve.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const NOISE = /* glsl */`float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.07 + 3.1; a *= 0.5; } return s; }`;
export const TEMPLE = new THREE.Vector3(0, 0, -150);
export const duneY = (x, z) => { const flat = Math.min(1, Math.hypot(x, z) / 26) * Math.min(1, Math.hypot(x - TEMPLE.x, z - TEMPLE.z) / 85); return (fbm2(x * 0.012, z * 0.012) * 16 + fbm2(x * 0.05 + 4, z * 0.05) * 2.5) * flat * flat; };

const sandFrag = /* glsl */`precision highp float; uniform float uTime; uniform vec3 uSun, uSunCol, uSky, uFog; uniform float uFogD; varying vec3 vW; varying vec3 vN; varying float vD; ${NOISE}
  void main(){ vec3 n = normalize(vN); float d = max(dot(n, normalize(uSun)), 0.0);
    vec3 base = mix(vec3(0.22, 0.12, 0.36), vec3(0.95, 0.62, 0.45), smoothstep(-6.0, 14.0, vW.y));
    vec3 col = base * (0.35 * uSky + uSunCol * d * 0.75);
    float rip = sin(vW.x * 1.7 + fbm(vW.xz * 0.05) * 9.0) * 0.5 + 0.5; col *= 0.86 + 0.14 * rip;
    float g = hash(floor(vW.xz * 9.0)); float tw = pow(0.5 + 0.5 * sin(uTime * (2.0 + g * 5.0) + g * 60.0), 8.0);
    col += vec3(1.0, 0.86, 0.6) * step(0.972, g) * tw * 2.4 + vec3(0.6, 0.5, 1.0) * step(0.99, hash(floor(vW.xz * 4.0) + 7.0)) * 0.8;   // grãos luminosos
    col += vec3(0.9, 0.5, 0.9) * pow(1.0 - max(dot(n, normalize(cameraPosition - vW)), 0.0), 3.0) * 0.25;
    float f = 1.0 - exp(-uFogD * uFogD * vD * vD); gl_FragColor = vec4(mix(col, uFog, f), 1.0); }`;
const heartFrag = /* glsl */`precision highp float; uniform float uTime, uPulse; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
  void main(){ float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
    float inner = fbm(vP.xy * 3.0 + uTime * 0.3) * fbm(vP.yz * 4.0 - uTime * 0.2);
    vec3 col = mix(vec3(0.5, 0.2, 0.9), vec3(1.0, 0.75, 0.4), inner * 2.2) * (0.22 + uPulse * 0.32) + vec3(0.7, 0.8, 1.0) * fres * (0.3 + uPulse * 0.3);
    gl_FragColor = vec4(col, 1.0); }`;
const tunnelFrag = /* glsl */`precision highp float; uniform float uTime, uScroll, uHue, uOpen; varying vec2 vUv; ${NOISE}
  vec3 pal(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.6))); }
  void main(){ float a = vUv.x * 6.28318, v = vUv.y * 40.0 + uScroll;
    float w = fbm(vec2(cos(a) * 2.0 + v * 0.15, sin(a) * 2.0 - v * 0.1));
    float arms = sin(a * 3.0 + v * 0.55 + w * 6.0) * 0.5 + 0.5; float neb = smoothstep(0.35, 0.9, fbm(vec2(a * 1.5 + w * 2.0, v * 0.4)));
    vec3 col = pal(uHue + w * 0.5 + v * 0.01) * (pow(arms, 3.0) * 0.9 + neb * 0.55 + 0.06) * 0.62;
    vec2 sp = vec2(a * 14.0, v * 3.0); vec2 id = floor(sp); float st = step(0.93, hash(id)) * smoothstep(0.35, 0.0, length(fract(sp) - 0.5)); col += vec3(1.0, 0.95, 0.85) * st * 2.5;
    col += pal(uHue + 0.5) * smoothstep(0.92, 1.0, sin(v * 0.35 - uTime * 2.0) * 0.5 + 0.5) * 0.5;                      // anéis de luz passando
    gl_FragColor = vec4(col * uOpen, 1.0); }`;
const PV = 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';

function kaitoAtlas() {                                               // versões de Kaito (Canvas): 4 poses num atlas 2×2
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    const ox = (i % 2) * 128, oy = Math.floor(i / 2) * 256; g.save(); g.translate(ox + 64, oy + 128);
    const gr = g.createLinearGradient(0, -128, 0, 128); gr.addColorStop(0, ['#1a2a6a', '#3a1a6a', '#0a4a6a', '#6a3a1a'][i]); gr.addColorStop(1, '#05060f'); g.fillStyle = gr; g.fillRect(-64, -128, 128, 256);
    g.rotate([0, 0.12, -0.3, 0.5][i]);
    g.fillStyle = '#2a52c8'; g.beginPath(); g.moveTo(-14, -52); g.lineTo(i === 2 ? -58 : -40, 56); g.lineTo(i === 3 ? 44 : 20, 60); g.lineTo(14, -52); g.fill();          // capa
    g.fillStyle = '#1c2f7c'; g.fillRect(-17, -54, 34, 62); g.fillStyle = '#121c48'; g.fillRect(-15, 8, 12, 58); g.fillRect(3, 8, 12, 58);
    g.strokeStyle = '#1c2f7c'; g.lineWidth = 10; g.lineCap = 'round'; const arm = [[-30, 0, 30, 0], [-34, -30, 40, -66], [-48, -60, 48, -60], [-36, 10, 44, -40]][i];
    g.beginPath(); g.moveTo(-15, -46); g.lineTo(arm[0], arm[1]); g.moveTo(15, -46); g.lineTo(arm[2], arm[3]); g.stroke();
    g.fillStyle = '#f3cba4'; g.beginPath(); g.arc(0, -72, 17, 0, TAU); g.fill();
    g.fillStyle = '#0b0b10'; g.beginPath(); for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; g.lineTo(Math.cos(a) * 19, -76 + Math.sin(a) * 19); g.lineTo(Math.cos(a + 0.2) * 31, -76 + Math.sin(a + 0.2) * 31); } g.lineTo(19, -74); g.fill();
    g.fillStyle = '#e2b04a'; g.fillRect(-17, 4, 34, 6); g.fillStyle = '#9ff0ff'; g.beginPath(); g.arc(0, -34, 6, 0, TAU); g.fill();
    g.restore(); g.strokeStyle = 'rgba(190,230,255,0.9)'; g.lineWidth = 5; g.strokeRect(ox + 3, oy + 3, 122, 250);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Deserto de areia luminosa, milhares de pequenos planetas, o templo-mecanismo e o coração de cristal. */
export class CelestialDesert {
  constructor() {
    const g = (this.group = new THREE.Group()), r = rng(909), d = new THREE.Object3D();
    const sg = new THREE.PlaneGeometry(1600, 1600, 180, 180); sg.rotateX(-Math.PI / 2); const sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setY(i, duneY(sp.getX(i), sp.getZ(i)));
    sg.computeVertexNormals();
    this.sandU = { uTime: { value: 0 }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.002 } };
    this.sand = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: this.sandU, fragmentShader: sandFrag,
      vertexShader: 'varying vec3 vW; varying vec3 vN; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; vD = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }' })); g.add(this.sand);
    // milhares de pequenos planetas
    this.planets = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), std(0xffffff, { roughness: 0.7 }), 1500); const pc = [0xff9a6a, 0x7ab8ff, 0xc890ff, 0xffd27a, 0x7ae0c8, 0xff7aa8].map((c) => new THREE.Color(c));
    this.pd = [...Array(1500)].map((_, i) => { const a = r() * TAU, rr = 9 + Math.pow(r(), 1.6) * 520, y = 2.5 + Math.pow(r(), 1.8) * 190; this.planets.setColorAt(i, pc[i % 6].clone().multiplyScalar(0.7 + r() * 0.6)); return { a, rr, y, s: (0.25 + Math.pow(r(), 3) * 3.0) * (0.6 + rr / 260), ph: r() * TAU, sp: (r() - 0.5) * 0.06 }; });
    this.planets.frustumCulled = false; this.planets.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); g.add(this.planets); this.d = d;
    // templo: plataforma, colunas-mecanismo, anéis armilares e o coração de cristal
    const T = (this.temple = new THREE.Group()); T.position.copy(TEMPLE); g.add(T);
    this.floorDis = { uDissolve: { value: 0 }, uDisColor: { value: new THREE.Color(0xffd27a) }, uDisScale: { value: 0.12 } };
    const stone = std(0x6a5a8a, { flatShading: true, roughness: 0.8 }), gold = std(0xe2b04a, { metalness: 0.85, roughness: 0.3, emissive: 0x7a5010, emissiveIntensity: 0.5 }), floorM = patchDissolve(std(0x4a3f6a, { roughness: 0.6, metalness: 0.2 }), this.floorDis);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(78, 84, 5, 48), floorM); fl.position.y = -1.5; fl.receiveShadow = true; T.add(fl); this.floor = fl;
    for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(24 + i * 20, 0.5, 6, 64), gold); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1; T.add(ring); }
    this.drums = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, x = Math.sin(a) * 66, z = Math.cos(a) * 66;
      for (let k = 0; k < 4; k++) { const dr = new THREE.Mesh(new THREE.CylinderGeometry(5.2 - k * 0.3, 5.6 - k * 0.3, 30, 8), stone); dr.position.set(x, 15 + k * 31, z); dr.castShadow = true; T.add(dr); this.drums.push([dr, (k % 2 ? 1 : -1) * (0.25 + i % 3 * 0.12)]);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(5.9 - k * 0.3, 5.9 - k * 0.3, 1.2, 8), gold); band.position.set(x, 30.5 + k * 31, z); T.add(band); }
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(5), gold); cap.position.set(x, 132, z); T.add(cap); this.drums.push([cap, 0.8]); }
    this.arm = [];
    for (let i = 0; i < 5; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(26 + i * 8.5, 0.9 - i * 0.08, 8, 72), gold); ring.position.y = 48; T.add(ring); this.arm.push(ring);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(2.2 - i * 0.2, 12, 8), std([0xff9a6a, 0x7ab8ff, 0xc890ff, 0x7ae0c8, 0xffd27a][i], { emissive: [0xff9a6a, 0x7ab8ff, 0xc890ff, 0x7ae0c8, 0xffd27a][i], emissiveIntensity: 0.6 })); orb.position.x = 26 + i * 8.5; ring.add(orb); }
    this.heartU = { uTime: { value: 0 }, uPulse: { value: 0 } };
    this.heart = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: this.heartU, vertexShader: PV, fragmentShader: heartFrag })); this.heart.scale.set(11, 17, 11); this.heart.position.y = 48; T.add(this.heart);
    this.heartLight = new THREE.PointLight(0xffb070, 0, 400, 1.3); this.heartLight.position.y = 48; T.add(this.heartLight);
    for (let i = 0; i < 14; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 5), stone); st.position.set(0, -1 + i * 0.02, 84 + i * 4.5); st.position.y = -2.2 - i * 0.0; T.add(st); }
    this.heartPos = new THREE.Vector3(TEMPLE.x, 48, TEMPLE.z);
  }
  update(t, atmo, pulse = 0, floorGone = 0, heartY = 48, hs = 1) {
    const u = this.sandU; u.uTime.value = t; u.uSun.value.copy(atmo.sunDir); u.uSunCol.value.copy(atmo.sun.color).multiplyScalar(atmo.sun.intensity / 2.4); u.uSky.value.copy(atmo.hemi.color); u.uFog.value.copy(atmo.scene.fog.color); u.uFogD.value = atmo.scene.fog.density;
    const d = this.d; this.pd.forEach((p, i) => { const a = p.a + t * p.sp; d.position.set(Math.cos(a) * p.rr, p.y + Math.sin(t * 0.5 + p.ph) * 0.8, Math.sin(a) * p.rr); d.rotation.set(0.3, t * 0.2 + p.ph, 0); d.scale.setScalar(p.s); d.updateMatrix(); this.planets.setMatrixAt(i, d.matrix); }); this.planets.instanceMatrix.needsUpdate = true;
    for (const [m, sp] of this.drums) m.rotation.y = t * sp;
    this.arm.forEach((r, i) => r.rotation.set(t * (0.3 + i * 0.11) + i, t * (0.2 + i * 0.07) * (i % 2 ? -1 : 1), i * 0.6));
    const beat = 0.5 + 0.5 * Math.pow(Math.sin(t * 2.1) * 0.5 + 0.5, 3); this.heartU.uTime.value = t; this.heartU.uPulse.value = beat * 0.6 + pulse; this.heart.rotation.y = t * 0.25; this.heart.position.y = this.heartLight.position.y = heartY; this.heartPos.y = heartY; this.heart.scale.set(11 * hs * (1 + beat * 0.05), 17 * hs * (1 + beat * 0.05), 11 * hs * (1 + beat * 0.05));
    this.heartLight.intensity = 260 * (0.5 + beat * 0.5 + pulse * 1.5);
    this.floorDis.uDissolve.value = floorGone * 1.05; this.floor.visible = floorGone < 0.99;
  }
}

/** Túnel de galáxias (cilindro com shader), e os fragmentos de realidade com as versões de Kaito. */
export class GalaxyTunnel {
  constructor() {
    const g = (this.group = new THREE.Group()), r = rng(4242);
    this.u = { uTime: { value: 0 }, uScroll: { value: 0 }, uHue: { value: 0 }, uOpen: { value: 1 } };
    this.tube = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 1600, 48, 1, true), new THREE.ShaderMaterial({ uniforms: this.u, side: THREE.BackSide, fog: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: tunnelFrag })); g.add(this.tube);
    // riscos de estrelas passando
    const N = 900; this.streak = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false }), N); this.sd = [...Array(N)].map(() => ({ a: r() * TAU, rr: 4 + r() * 38, y: r(), sp: 0.6 + r() * 1.2, len: 2 + r() * 9 }));
    const cs = [new THREE.Color(2, 1.7, 1.2), new THREE.Color(1.2, 1.6, 2.2), new THREE.Color(2, 1.2, 2)]; for (let i = 0; i < N; i++) this.streak.setColorAt(i, cs[i % 3]); this.streak.frustumCulled = false; this.streak.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); g.add(this.streak);
    // fragmentos de realidade
    const M = 1300, geo = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 2); geo.index = q.index; geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
    const seed = new Float32Array(M * 4).map(() => r()); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4)); geo.instanceCount = M;
    this.fu = { uTime: { value: 0 }, uK: { value: 0 }, uGather: { value: 0 }, uMap: { value: kaitoAtlas() }, uScroll: { value: 0 } };
    this.frags = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: this.fu, transparent: true, side: THREE.DoubleSide, depthWrite: true, fog: false,
      vertexShader: /* glsl */`attribute vec4 aSeed; uniform float uTime, uK, uGather, uScroll; varying vec2 vUv; varying float vTint; varying float vShow; varying float vFace;
        mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0,s, 0,1,0, -s,0,c); } mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }
        void main(){ float a = aSeed.x * 6.28318 + uTime * (0.12 + aSeed.y * 0.2) * (aSeed.z > 0.5 ? 1.0 : -1.0); float rr = mix(7.0 + aSeed.y * 34.0, 2.5 + aSeed.y * 5.0, uGather);
          float y = mod(aSeed.z * 240.0 + uScroll * (0.4 + aSeed.w * 0.4), 240.0) - 120.0; y = mix(y, y * 0.12, uGather);
          vec3 c = vec3(cos(a) * rr, y, sin(a) * rr); float sc = (1.1 + aSeed.w * 2.6) * uK * mix(1.0, 0.45, uGather) * smoothstep(3.5, 7.0, distance(c, cameraPosition));
          mat3 R = rotY(-a + 1.5708 + sin(uTime * 0.7 + aSeed.x * 20.0) * 0.6) * rotX(sin(uTime * 0.9 + aSeed.y * 30.0) * 0.5);
          vec2 cell = vec2(floor(aSeed.w * 2.0), floor(aSeed.x * 2.0)); vUv = (uv + cell) * 0.5; vTint = aSeed.z; vShow = uK; vFace = abs((R * vec3(0.0, 0.0, 1.0)).z);
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(c + R * (position * sc), 1.0); }`,
      fragmentShader: /* glsl */`uniform sampler2D uMap; uniform float uTime; varying vec2 vUv; varying float vTint; varying float vShow; varying float vFace;
        void main(){ if (vShow < 0.01) discard; vec3 t = texture2D(uMap, vUv).rgb; vec3 tint = 0.6 + 0.4 * cos(6.28318 * (vTint + vec3(0.0, 0.33, 0.67)));
          vec3 col = t * mix(vec3(1.0), tint * 1.6, 0.45) * 1.25 + vec3(0.5, 0.8, 1.0) * pow(1.0 - vFace, 3.0) * 0.8; gl_FragColor = vec4(col, 1.0); }` }));
    this.frags.frustumCulled = false; g.add(this.frags); this.d = new THREE.Object3D();
  }
  /** fall: distância percorrida na queda (rola o túnel); frag 0..1: fragmentos aparecem; gather 0..1: convergem. */
  update(t, fall, hue, frag = 0, gather = 0, open = 1) {
    this.u.uTime.value = t; this.u.uScroll.value = fall * 0.05; this.u.uHue.value = hue; this.u.uOpen.value = open;
    const d = this.d; this.sd.forEach((s, i) => { const y = ((s.y * 300 + fall * s.sp) % 300) - 150; d.position.set(Math.cos(s.a) * s.rr, y, Math.sin(s.a) * s.rr); d.scale.set(1, s.len * (1 - gather * 0.7), 1); d.updateMatrix(); this.streak.setMatrixAt(i, d.matrix); }); this.streak.instanceMatrix.needsUpdate = true;
    this.fu.uTime.value = t; this.fu.uK.value = frag; this.fu.uGather.value = gather; this.fu.uScroll.value = fall; this.frags.visible = frag > 0.01;
  }
}
