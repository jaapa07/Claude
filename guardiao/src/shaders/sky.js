import * as THREE from 'three';
import { lerp } from '../timeline/util.js';

// Céu cósmico procedural: nebulosas (fbm 3D com dobra de domínio), três camadas de estrelas que podem
// "morrer" e "renascer" (uStars), brilho de horizonte e sol. Tudo função da direção do raio e do tempo.
const vert = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.0); gl_Position = p.xyww; }`;
const frag = /* glsl */`
  precision highp float;
  uniform vec3 uTop, uLow, uNebA, uNebB, uSunDir, uSunCol, uWaveDir; uniform float uStars, uNebula, uTime, uSun, uWave, uSeed;
  varying vec3 vDir;
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*n3(p); p = p*2.07 + 3.1; a *= 0.5; } return s; }
  float stars(vec3 d, float scale, float density, float life){
    vec3 p = d * scale; vec3 id = floor(p); vec3 f = fract(p) - 0.5; float h = h3(id + uSeed);
    float alive = step(h3(id * 1.7 + 4.0), life);                       // cada estrela tem o seu limiar de vida
    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
    return step(1.0 - density, h) * smoothstep(0.22, 0.0, length(f)) * tw * alive;
  }
  void main(){
    vec3 d = normalize(vDir); float h = d.y;
    vec3 col = mix(uLow, uTop, smoothstep(-0.15, 0.7, h));
    // nebulosas
    vec3 q = d * 1.6 + vec3(uSeed, 0.0, uTime * 0.004); float w = fbm(q * 1.3 + 7.0);
    float n = fbm(q * 2.2 + w * 1.8), n2 = fbm(q * 4.1 - w * 1.2 + 11.0);
    float neb = smoothstep(0.42, 0.85, n) ; float fil = smoothstep(0.5, 0.9, n2) * neb;
    col += (mix(uNebA, uNebB, smoothstep(0.3, 0.75, w)) * neb * 0.75 + (uNebA + uNebB) * 0.5 * fil * 0.9) * uNebula;
    // estrelas: a onda de renascimento varre o céu a partir de uWaveDir
    float front = smoothstep(0.0, 0.25, uWave * 2.2 - (1.0 - dot(d, normalize(uWaveDir))) * 0.5 - 0.1);
    float life = clamp(uStars + front, 0.0, 1.0);
    float st = stars(d, 46.0, 0.09, life) * 1.4 + stars(d, 95.0, 0.07, life) * 0.9 + stars(d, 190.0, 0.06, life) * 0.6;
    vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.88, 0.65), h3(floor(d * 46.0)));
    col += tint * st * 2.6;
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunCol * (pow(sd, 8.0) * 0.3 + pow(sd, 90.0) * 0.8 + smoothstep(0.9993, 0.9997, sd) * 7.0) * uSun;
    gl_FragColor = vec4(col, 1.0);
  }`;

const M = (o) => o;
// Paletas: céu, nebulosa, luzes e névoa. As sequências misturam duas delas ao longo do tempo.
export const MOODS = {
  gold: M({ top: 0x0a1030, low: 0x3a2a55, nebA: 0xffb060, nebB: 0x7a5cff, neb: 1.2, stars: 1, sun: 0xffe2b0, sunI: 2.2, sunK: 0, hemiSky: 0x9aa8e8, hemiGround: 0x4a3a50, hemiI: 1.0, fog: 0x2a2848, fogD: 0.0016, az: 0.5, el: 0.5 }),
  dark: M({ top: 0x010207, low: 0x0c1230, nebA: 0x16224a, nebB: 0x24143c, neb: 0.5, stars: 0, sun: 0x9ab0f0, sunI: 1.9, sunK: 0, hemiSky: 0x7088d8, hemiGround: 0x2a2a44, hemiI: 1.7, fog: 0x070a18, fogD: 0.0022, az: 0.5, el: 0.55 }),
  hope: M({ top: 0x050a22, low: 0x1c2a5c, nebA: 0x3a8cff, nebB: 0x9a5cff, neb: 0.8, stars: 0.12, sun: 0xbfd0ff, sunI: 1.9, sunK: 0, hemiSky: 0x7f96e8, hemiGround: 0x2a2a44, hemiI: 1.05, fog: 0x121a3c, fogD: 0.0012, az: 0.4, el: 0.5 }),
  ocean: M({ top: 0x071a4a, low: 0x2f7fb8, nebA: 0x40d0e0, nebB: 0x7a6cff, neb: 0.7, stars: 0.3, sun: 0xdff0ff, sunI: 2.6, sunK: 0, hemiSky: 0x9fd0ff, hemiGround: 0x2a5a80, hemiI: 1.15, fog: 0x2a6a9c, fogD: 0.0011, az: 0.6, el: 0.7 }),
  deep: M({ top: 0x02101e, low: 0x0a3a50, nebA: 0x20a0b0, nebB: 0x2a50a0, neb: 0.3, stars: 0.0, sun: 0x9ff0ff, sunI: 1.8, sunK: 0, hemiSky: 0x50c0d0, hemiGround: 0x0a2a40, hemiI: 1.1, fog: 0x0a3448, fogD: 0.0030, az: 0.2, el: 1.1 }),
  desert: M({ top: 0x0c0626, low: 0x5a2a70, nebA: 0xff9a50, nebB: 0xc050ff, neb: 1.0, stars: 0.35, sun: 0xffd9a0, sunI: 2.4, sunK: 0, hemiSky: 0xb090f0, hemiGround: 0x6a4a40, hemiI: 1.05, fog: 0x3a1c54, fogD: 0.0022, az: -0.5, el: 0.45 }),
  void: M({ top: 0x010106, low: 0x04040e, nebA: 0x0c1028, nebB: 0x140a22, neb: 0.2, stars: 0.0, sun: 0xffe0a8, sunI: 1.6, sunK: 0, hemiSky: 0x6a70b0, hemiGround: 0x2a2030, hemiI: 0.8, fog: 0x030308, fogD: 0.0006, az: 0.3, el: 0.4 }),
  bloom: M({ top: 0x080a30, low: 0x3a2070, nebA: 0xffb050, nebB: 0x50b0ff, neb: 1.9, stars: 0.5, sun: 0xfff0c8, sunI: 2.4, sunK: 0, hemiSky: 0xb0b8ff, hemiGround: 0x5a4060, hemiI: 1.1, fog: 0x1a1440, fogD: 0.0006, az: 0.3, el: 0.4 }),
  dawn: M({ top: 0x1a3a8a, low: 0xffb07a, nebA: 0xffc078, nebB: 0xc070ff, neb: 0.75, stars: 0.6, sun: 0xffd9a0, sunI: 3.3, sunK: 1, hemiSky: 0xc0d0ff, hemiGround: 0x7a6050, hemiI: 1.15, fog: 0xf0b890, fogD: 0.0011, az: 0.25, el: 0.2 }),
  morning: M({ top: 0x1f56c8, low: 0xbfe0ff, nebA: 0xffd090, nebB: 0xa080ff, neb: 0.5, stars: 0.75, sun: 0xfff2d8, sunI: 3.6, sunK: 1, hemiSky: 0xd0e2ff, hemiGround: 0x80705a, hemiI: 1.2, fog: 0xcfe0f5, fogD: 0.0008, az: 0.25, el: 0.42 }),
  space: M({ top: 0x010208, low: 0x02040e, nebA: 0xffa860, nebB: 0x6a70ff, neb: 1.0, stars: 1, sun: 0xfff4e0, sunI: 2.6, sunK: 1, hemiSky: 0x8090d0, hemiGround: 0x202030, hemiI: 0.7, fog: 0x02040e, fogD: 0.00002, az: 0.25, el: 0.3 }),
};

export class Atmosphere {
  constructor(scene) {
    this.scene = scene; const C = () => ({ value: new THREE.Color() });
    this.u = { uTop: C(), uLow: C(), uNebA: C(), uNebB: C(), uSunCol: C(), uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uWaveDir: { value: new THREE.Vector3(0, 0, -1) }, uStars: { value: 1 }, uNebula: { value: 1 }, uTime: { value: 0 }, uSun: { value: 0 }, uWave: { value: 0 }, uSeed: { value: 3.7 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.sky.renderOrder = -10; this.sky.frustumCulled = false; scene.add(this.sky);
    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 260; this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.06;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(this.sun, this.sun.target, this.hemi);
    scene.fog = new THREE.FogExp2(0x000000, 0.001);
    this.sunDir = new THREE.Vector3(); this.focus = new THREE.Vector3(); this._c = new THREE.Color();
  }
  /** mistura duas paletas; stars (opcional) sobrepõe a vida das estrelas. */
  apply(a, b, k, t, focus, stars) {
    const A = MOODS[a], B = MOODS[b || a]; k = b ? k : 0;
    const col = (key, target) => target.setHex(A[key]).lerp(this._c.setHex(B[key]), k), num = (key) => lerp(A[key], B[key], k);
    col('top', this.u.uTop.value); col('low', this.u.uLow.value); col('nebA', this.u.uNebA.value); col('nebB', this.u.uNebB.value); col('sun', this.u.uSunCol.value);
    this.u.uStars.value = stars ?? num('stars'); this.u.uNebula.value = num('neb'); this.u.uTime.value = t; this.u.uSun.value = num('sunK'); this.u.uWave.value = 0;
    const az = num('az'), el = num('el'); this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize(); this.u.uSunDir.value.copy(this.sunDir);
    col('sun', this.sun.color); this.sun.intensity = num('sunI'); if (focus) this.focus.copy(focus);
    this.sun.target.position.copy(this.focus); this.sun.position.copy(this.focus).addScaledVector(this.sunDir, 110);
    col('hemiSky', this.hemi.color); col('hemiGround', this.hemi.groundColor); this.hemi.intensity = num('hemiI');
    col('fog', this.scene.fog.color); this.scene.fog.density = num('fogD');
  }
}
