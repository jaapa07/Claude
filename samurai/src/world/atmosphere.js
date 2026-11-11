import * as THREE from 'three';
import { lerp } from '../core/util.js';

// Paletas de céu/luz. Cada episódio mistura duas delas em função do tempo.
const P = (o) => o;
export const MOODS = {
  dawn: P({ top: 0x24459a, mid: 0xf09a78, low: 0xffd3a0, sun: 0xffc488, sunI: 3.2, hemiSky: 0x9fb4e8, hemiGround: 0x6a5140, hemiI: 0.95, fog: 0xe6b9a2, fogD: 0.0038, az: 0.55, el: 0.2, stars: 0.0, cloud: 0.55, cloudCol: 0xffe2cf }),
  day: P({ top: 0x3d7fd6, mid: 0xa9d4f5, low: 0xe8f3fb, sun: 0xfff2dc, sunI: 3.6, hemiSky: 0xbfd8ff, hemiGround: 0x74684f, hemiI: 1.1, fog: 0xcfe2f2, fogD: 0.0025, az: 0.9, el: 0.75, stars: 0.0, cloud: 0.45, cloudCol: 0xffffff }),
  storm: P({ top: 0x18233f, mid: 0x4a5878, low: 0x8a93a8, sun: 0xa9c4ff, sunI: 1.5, hemiSky: 0x7f93c4, hemiGround: 0x3a3a48, hemiI: 1.0, fog: 0x6c7890, fogD: 0.0050, az: 0.55, el: 0.5, stars: 0.0, cloud: 0.95, cloudCol: 0x9aa6c0 }),
  dusk: P({ top: 0x2a1f52, mid: 0xc4567a, low: 0xffa56b, sun: 0xff9a5c, sunI: 2.8, hemiSky: 0x9a84c8, hemiGround: 0x5a3b3b, hemiI: 0.9, fog: 0xb86f7d, fogD: 0.0040, az: -0.7, el: 0.16, stars: 0.15, cloud: 0.6, cloudCol: 0xffb08f }),
  night: P({ top: 0x05081c, mid: 0x152456, low: 0x2c4a86, sun: 0x9ab8ff, sunI: 1.3, hemiSky: 0x4a66b8, hemiGround: 0x1a1f33, hemiI: 0.85, fog: 0x18264d, fogD: 0.0040, az: -0.4, el: 0.6, stars: 1.0, cloud: 0.25, cloudCol: 0x39508a }),
  winter: P({ top: 0x7f9cc4, mid: 0xcfdcec, low: 0xf4f8fc, sun: 0xeef4ff, sunI: 2.6, hemiSky: 0xe2ecff, hemiGround: 0xa8b4c8, hemiI: 1.35, fog: 0xe4ecf5, fogD: 0.0058, az: 0.3, el: 0.4, stars: 0.0, cloud: 0.8, cloudCol: 0xffffff }),
  spring: P({ top: 0x5a9ae0, mid: 0xf7c6d9, low: 0xffeef2, sun: 0xfff0e0, sunI: 3.4, hemiSky: 0xffd9ea, hemiGround: 0x7a8a55, hemiI: 1.15, fog: 0xf5d5e0, fogD: 0.0029, az: 0.8, el: 0.55, stars: 0.0, cloud: 0.4, cloudCol: 0xffffff }),
  void: P({ top: 0x060418, mid: 0x1c1a5a, low: 0x1f6f9a, sun: 0xe6e2ff, sunI: 2.6, hemiSky: 0x8a96e0, hemiGround: 0x3a2a5a, hemiI: 1.05, fog: 0x141a44, fogD: 0.0022, az: 0.4, el: 0.55, stars: 1.0, cloud: 0.5, cloudCol: 0x3f5fc0 }),
  sunrise: P({ top: 0x2a52b0, mid: 0xf5a070, low: 0xffd9a0, sun: 0xffc890, sunI: 3.4, hemiSky: 0xb0c0f0, hemiGround: 0x705848, hemiI: 1.0, fog: 0xf0c0a0, fogD: 0.0034, az: 0.02, el: 0.5, stars: 0.0, cloud: 0.42, cloudCol: 0xffe6d0 }),
  morning: P({ top: 0x3f86e0, mid: 0xbfe0fa, low: 0xfff2dc, sun: 0xfff2d8, sunI: 3.8, hemiSky: 0xcfe2ff, hemiGround: 0x7a7050, hemiI: 1.15, fog: 0xe8e4d8, fogD: 0.0026, az: 0.02, el: 0.74, stars: 0.0, cloud: 0.4, cloudCol: 0xffffff }),
  temple: P({ top: 0x0a1430, mid: 0x12305a, low: 0x1c4a7a, sun: 0xbfe0ff, sunI: 4.0, hemiSky: 0x3a6ac0, hemiGround: 0x182440, hemiI: 1.2, fog: 0x0c1a36, fogD: 0.0240, az: 0.0, el: 1.38, stars: 0.0, cloud: 0.9, cloudCol: 0x5a6f98 }),
  blue: P({ top: 0x6fb8ff, mid: 0xbfe6ff, low: 0xffffff, sun: 0xcfe8ff, sunI: 4.5, hemiSky: 0xcfe8ff, hemiGround: 0x9fc8ff, hemiI: 2.0, fog: 0xbfe2ff, fogD: 0.0072, az: 0.4, el: 0.6, stars: 0.0, cloud: 0.2, cloudCol: 0xffffff }),
};

const skyVert = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.0); gl_Position = p.xyww; }`;
const skyFrag = /* glsl */`
  precision highp float;
  uniform vec3 uTop, uMid, uLow, uSunDir, uSunCol, uCloudCol; uniform float uStars, uCloud, uTime, uSunSize;
  varying vec3 vDir;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir); float h = d.y;
    vec3 col = mix(uLow, uMid, smoothstep(-0.02, 0.22, h)); col = mix(col, uTop, smoothstep(0.15, 0.85, h));
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunCol * (pow(sd, 6.0) * 0.25 + pow(sd, 60.0) * 0.6);
    col += uSunCol * smoothstep(1.0 - 0.0016 * uSunSize, 1.0 - 0.0008 * uSunSize, sd) * 6.0;
    // estrelas
    vec2 sp = d.xz / (abs(d.y) + 0.35) * 60.0; vec2 id = floor(sp);
    float st = step(0.985, hash(id)) * smoothstep(0.35, 0.0, length(fract(sp) - 0.5)) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(id) * 40.0));
    col += vec3(0.8, 0.9, 1.0) * st * uStars * smoothstep(0.0, 0.3, h) * 2.0;
    // nuvens em camadas
    vec2 cp = d.xz / (max(h, 0.0) + 0.18) * 1.3 + vec2(uTime * 0.012, uTime * 0.004);
    float c = fbm(cp * 1.4); float c2 = fbm(cp * 3.1 + 11.0);
    float n = c * 0.7 + c2 * 0.3;
    float cov = smoothstep(0.52, 0.8, n + (uCloud - 0.5) * 0.55);
    vec3 cc = mix(mix(col, uCloudCol, 0.55) * 0.8, uCloudCol + uSunCol * 0.6 * pow(sd, 3.0), smoothstep(0.35, 0.75, c2 + (n - 0.6)));
    col = mix(col, cc, cov * smoothstep(-0.02, 0.16, h) * 0.9);
    gl_FragColor = vec4(col, 1.0);
  }`;

/** Céu procedural + sol + luz ambiente + névoa. Tudo controlado por mix(moodA, moodB, k). */
export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.u = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uLow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color() }, uCloudCol: { value: new THREE.Color() }, uStars: { value: 0 }, uCloud: { value: 0.5 }, uTime: { value: 0 }, uSunSize: { value: 1 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false }));
    this.sky.renderOrder = -10; this.sky.frustumCulled = false; scene.add(this.sky);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 220;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.06;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0xffffff, 0.01);
    this.sunDir = new THREE.Vector3(); this.focus = new THREE.Vector3();
    this._c = new THREE.Color();
  }
  /** a, b: nomes de MOODS; k: mistura; t: tempo (nuvens); focus: ponto que a sombra do sol acompanha. */
  apply(a, b, k, t, focus) {
    const A = MOODS[a], B = MOODS[b || a]; k = b ? k : 0;
    const col = (key, target) => target.setHex(A[key]).lerp(this._c.setHex(B[key]), k);
    const num = (key) => lerp(A[key], B[key], k);
    col('top', this.u.uTop.value); col('mid', this.u.uMid.value); col('low', this.u.uLow.value);
    col('sun', this.u.uSunCol.value); col('cloudCol', this.u.uCloudCol.value);
    this.u.uStars.value = num('stars'); this.u.uCloud.value = num('cloud'); this.u.uTime.value = t; this.u.uSunSize.value = 1;
    const az = num('az'), el = num('el');
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.u.uSunDir.value.copy(this.sunDir);
    col('sun', this.sun.color); this.sun.intensity = num('sunI');
    if (focus) this.focus.copy(focus);
    this.sun.target.position.copy(this.focus);
    this.sun.position.copy(this.focus).addScaledVector(this.sunDir, 90);
    col('hemiSky', this.hemi.color); col('hemiGround', this.hemi.groundColor); this.hemi.intensity = num('hemiI');
    col('fog', this.scene.fog.color); this.scene.fog.density = num('fogD');
  }
}
