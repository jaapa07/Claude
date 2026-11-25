import * as THREE from 'three';

/**
 * Índices das células: 0–15 no atlas próprio (assets/vfx/particles.webp, 4×4) e 16–31 no atlas de sprites CC0
 * do Particle Pack da Kenney (assets/kits/kenney-particles.webp, mesma grade; ordem em scripts/kits/sprites.ts).
 */
export const SPRITE = {
  smoke: 0, spark: 1, dust: 2, flame: 3, snow: 4, leaf: 5, confetti: 6, drop: 7, ring: 8, petal: 9, glow: 10, star: 11,
  rain: 12, grain: 13, bolt: 14, mist: 15,
  kSmoke: 16, kPuff: 17, kGravel: 18, kFire: 19, kFlame: 20, kMuzzle: 21, kSpark: 22, kCross: 23,
  kFlare: 24, kRing: 25, kLight: 26, kElectric: 27, kScorch: 28, kTrace: 29, kTwirl: 30, kMagic: 31,
} as const;

export interface EmitOptions {
  x: number; y: number; z: number;
  vx?: number; vy?: number; vz?: number;
  /** Espalhamento aleatório da velocidade. */
  spread?: number;
  life: number;
  size: number;
  /** Tamanho final relativo ao inicial. */
  grow?: number;
  sprite: number;
  r: number; g: number; b: number;
  alpha?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
  /** Balanço lateral (m/s) de quem cai flutuando: folhas, pétalas, neve. */
  flutter?: number;
}

/**
 * Junta o atlas próprio (4×4) e o dos sprites da Kenney (4×4) lado a lado numa só textura 8×4, em tempo de
 * execução (os arquivos continuam separados, cada um com a sua licença): o shader faz uma única leitura.
 */
export function combineParticleAtlases(own: THREE.Texture, kenney: THREE.Texture): THREE.Texture {
  const a = own.image as CanvasImageSource & { width: number; height: number };
  const b = kenney.image as CanvasImageSource & { width: number; height: number };
  if (typeof document === 'undefined' || !a || !b) return own;
  const h = a.height;
  const canvas = document.createElement('canvas');
  canvas.width = h * 2;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return own;
  g.drawImage(a, 0, 0, h, h);
  g.drawImage(b, h, 0, h, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const vertex = /* glsl */ `
attribute vec4 aColor; attribute float aSize; attribute float aSprite; attribute float aRot;
varying vec4 vColor; varying float vSprite; varying float vRot;
uniform float uScale;
void main() {
  vColor = aColor; vSprite = aSprite; vRot = aRot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
}`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying vec4 vColor; varying float vSprite; varying float vRot;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
  // atlas combinado 8×4: células 0–15 à esquerda (próprio), 16–31 à direita (Kenney); uma única leitura de textura
  float second = step(15.5, vSprite);
  float sp = vSprite - 16.0 * second;
  vec2 cell = vec2(mod(sp, 4.0) + 4.0 * second, floor(sp / 4.0));
  // a textura é carregada com flipY: a linha 0 do atlas fica no topo da imagem
  vec4 t = texture2D(uMap, vec2((cell.x + p.x) * 0.125, 1.0 - (cell.y + p.y) * 0.25));
  float a = t.a * vColor.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb * t.rgb, a);
  #include <colorspace_fragment>
}`;

/**
 * Partículas em pool (sem alocação por quadro): um único draw call por sistema.
 * A simulação é feita na CPU; o shader desenha sprites do atlas com rotação.
 */
export class ParticleSystem extends THREE.Points {
  private readonly max: number;
  private count = 0;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly sprite: Float32Array;
  private readonly rot: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size0: Float32Array;
  private readonly grow: Float32Array;
  private readonly alpha0: Float32Array;
  private readonly gravity: Float32Array;
  private readonly drag: Float32Array;
  private readonly spin: Float32Array;
  private readonly flutter: Float32Array;
  /** Atributos escalares (cópia na remoção) e nomes dos atributos de GPU: listas fixas, sem alocação por quadro. */
  private readonly scalars: Float32Array[];
  private static readonly ATTRS = ['position', 'aColor', 'aSize', 'aSprite', 'aRot'] as const;

  /** `map`: atlas combinado 8×4 (ver `combineParticleAtlases`). */
  constructor(map: THREE.Texture, max: number, additive: boolean) {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: { value: 600 } },
      vertexShader: vertex, fragmentShader: fragment,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    super(geo, mat);
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.sprite = new Float32Array(max);
    this.rot = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.alpha0 = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.spin = new Float32Array(max);
    this.flutter = new Float32Array(max);
    this.scalars = [this.size, this.sprite, this.rot, this.life, this.maxLife, this.size0, this.grow, this.alpha0, this.gravity, this.drag, this.spin, this.flutter];
    const dyn = (arr: Float32Array, n: number): THREE.BufferAttribute => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', dyn(this.pos, 3));
    geo.setAttribute('aColor', dyn(this.col, 4));
    geo.setAttribute('aSize', dyn(this.size, 1));
    geo.setAttribute('aSprite', dyn(this.sprite, 1));
    geo.setAttribute('aRot', dyn(this.rot, 1));
    geo.setDrawRange(0, 0);
    this.frustumCulled = false;
    this.renderOrder = additive ? 11 : 10;
  }

  get alive(): number { return this.count; }

  setViewportHeight(h: number, fovDeg: number): void {
    (this.material as THREE.ShaderMaterial).uniforms.uScale!.value = h / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  emit(o: EmitOptions): void {
    if (this.count >= this.max) return;
    const i = this.count++;
    const s = o.spread ?? 0;
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = (o.vx ?? 0) + (Math.random() - 0.5) * s;
    this.vel[i * 3 + 1] = (o.vy ?? 0) + (Math.random() - 0.5) * s;
    this.vel[i * 3 + 2] = (o.vz ?? 0) + (Math.random() - 0.5) * s;
    this.life[i] = this.maxLife[i] = o.life * (0.8 + Math.random() * 0.4);
    this.size0[i] = o.size; this.grow[i] = o.grow ?? 1;
    this.alpha0[i] = o.alpha ?? 1;
    this.gravity[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 0;
    this.spin[i] = (o.spin ?? 0) * (Math.random() - 0.5) * 2;
    this.sprite[i] = o.sprite;
    this.rot[i] = o.spin || o.flutter ? Math.random() * 6.283 : 0;
    this.flutter[i] = o.flutter ?? 0;
    this.col[i * 4] = o.r; this.col[i * 4 + 1] = o.g; this.col[i * 4 + 2] = o.b; this.col[i * 4 + 3] = this.alpha0[i]!;
    this.size[i] = o.size;
  }

  private kill(i: number): void {
    const j = --this.count;
    if (i === j) return;
    for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[j * 3 + k]!; this.vel[i * 3 + k] = this.vel[j * 3 + k]!; }
    for (let k = 0; k < 4; k++) this.col[i * 4 + k] = this.col[j * 4 + k]!;
    for (const a of this.scalars) a[i] = a[j]!;
  }

  update(dt: number): void {
    for (let i = this.count - 1; i >= 0; i--) {
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) { this.kill(i); continue; }
      const t = 1 - this.life[i]! / this.maxLife[i]!;
      const d = Math.exp(-this.drag[i]! * dt);
      this.vel[i * 3] = this.vel[i * 3]! * d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1]! * d - this.gravity[i]! * dt;
      this.vel[i * 3 + 2] = this.vel[i * 3 + 2]! * d;
      this.pos[i * 3] = this.pos[i * 3]! + this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1] = this.pos[i * 3 + 1]! + this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2] = this.pos[i * 3 + 2]! + this.vel[i * 3 + 2]! * dt;
      const fl = this.flutter[i]!;
      if (fl !== 0) {
        // folha caindo: zigue-zague guiado pela própria rotação do sprite (fase diferente para cada uma)
        const r = this.rot[i]!;
        this.pos[i * 3] = this.pos[i * 3]! + Math.sin(r * 1.3) * fl * dt;
        this.pos[i * 3 + 2] = this.pos[i * 3 + 2]! + Math.cos(r * 0.9) * fl * dt;
        this.pos[i * 3 + 1] = this.pos[i * 3 + 1]! + Math.abs(Math.sin(r * 1.3)) * fl * 0.35 * dt;
      }
      this.size[i] = this.size0[i]! * (1 + (this.grow[i]! - 1) * t);
      this.rot[i] = this.rot[i]! + this.spin[i]! * dt;
      const fadeIn = Math.min(1, t * 8);
      this.col[i * 4 + 3] = this.alpha0[i]! * fadeIn * (1 - t * t);
    }
    const g = this.geometry;
    g.setDrawRange(0, this.count);
    for (const name of ParticleSystem.ATTRS) {
      const a = g.getAttribute(name) as THREE.BufferAttribute;
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
      a.needsUpdate = true;
    }
  }

  reset(): void { this.count = 0; this.geometry.setDrawRange(0, 0); }

  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
