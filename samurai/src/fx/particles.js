import * as THREE from 'three';
import { rng, TAU } from '../core/util.js';

// Física procedural em forma fechada: a posição de cada partícula é função pura de (semente, tempo do mundo).
// Isso permite congelar, retroceder e saltar no tempo sem simulação acumulada — e renderizar frames fora de ordem.

export const PX = { value: 960 };                               // meia altura do render em pixels (tamanho dos pontos)

function seeds(n, seed, size = 4) { const r = rng(seed), a = new Float32Array(n * size); for (let i = 0; i < a.length; i++) a[i] = r(); return a; }
const WRAP = /* glsl */`vec3 wrapBox(vec3 p, vec3 c, vec3 b){ return mod(p - c + b * 0.5, b) - b * 0.5 + c; }`;

/** Pétalas: quads instanciados que caem, giram e são levados pelo vento dentro de uma caixa que acompanha a câmera. */
export class Petals {
  constructor(count = 900, seed = 7) {
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(0.11, 0.075, 2, 1);
    const p = q.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * 0.25);     // leve curvatura
    g.index = q.index; g.setAttribute('position', p); g.setAttribute('uv', q.attributes.uv);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds(count, seed), 4)); g.instanceCount = count;
    this.u = { uTau: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(30, 16, 30) }, uWind: { value: new THREE.Vector3(0.9, 0, 0.5) }, uFall: { value: 0.75 },
      uColA: { value: new THREE.Color(0xffc2d6) }, uColB: { value: new THREE.Color(0xfff0f4) }, uAmount: { value: 1 }, uSize: { value: 1 }, uGlow: { value: 0 }, uSun: { value: new THREE.Color(0xffffff) } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.u, side: THREE.DoubleSide, transparent: false,
      vertexShader: /* glsl */`
        attribute vec4 aSeed; uniform float uTau, uFall, uAmount, uSize; uniform vec3 uCenter, uBox, uWind; varying float vShade; varying float vMix; varying float vHide;
        ${WRAP}
        mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }
        mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0,s, 0,1,0, -s,0,c); }
        void main(){
          float sp = 0.6 + 0.8 * aSeed.w;
          vec3 c = aSeed.xyz * uBox + (uWind + vec3(0.0, -uFall * sp, 0.0)) * uTau;
          c += vec3(sin(uTau * 1.3 * sp + aSeed.x * 40.0) * 0.5, sin(uTau * 0.9 + aSeed.y * 30.0) * 0.18, cos(uTau * 1.1 * sp + aSeed.z * 50.0) * 0.5);
          c = wrapBox(c, uCenter, uBox);
          float a = uTau * (1.5 + 3.0 * aSeed.w) + aSeed.x * 6.28;
          mat3 R = rotY(a * 0.7 + aSeed.z * 6.28) * rotX(a);
          vec3 n = R * vec3(0.0, 0.0, 1.0);
          vShade = 0.62 + 0.38 * abs(n.y + n.x * 0.4); vMix = aSeed.y; vHide = step(uAmount, fract(aSeed.w * 7.13));
          vec3 edge = abs(c - uCenter) / (uBox * 0.5); float fade = 1.0 - smoothstep(0.8, 1.0, max(edge.x, max(edge.y, edge.z)));
          vec4 mv = viewMatrix * vec4(c + R * (position * uSize * (0.7 + 0.6 * aSeed.z) * fade), 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColA, uColB, uSun; uniform float uGlow; varying float vShade, vMix, vHide;
        void main(){ if (vHide > 0.5) discard; vec3 c = mix(uColA, uColB, vMix) * vShade * (0.55 + 0.5 * uSun) ; gl_FragColor = vec4(c * (1.0 + uGlow * 3.0), 1.0); }`,
    }));
    this.mesh.frustumCulled = false;
  }
  /** tau: tempo do mundo; center: onde a caixa fica (em geral à frente da câmera). */
  update(tau, center, amount = 1, sun) { this.u.uTau.value = tau; this.u.uCenter.value.copy(center); this.u.uAmount.value = amount; if (sun) this.u.uSun.value.copy(sun); this.mesh.visible = amount > 0.001; }
}

/** Chuva: riscos orientados pela velocidade. Com o tempo congelado viram gotas paradas que cintilam. */
export class Rain {
  constructor(count = 2600, seed = 11) {
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds(count, seed), 4)); g.instanceCount = count;
    this.u = { uTau: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(22, 18, 22) }, uVel: { value: new THREE.Vector3(1.2, -17, 0.6) },
      uStreak: { value: 0.9 }, uWidth: { value: 0.014 }, uAmount: { value: 1 }, uAlpha: { value: 0.4 }, uGlint: { value: 0 }, uTime: { value: 0 }, uCol: { value: new THREE.Color(0xcfe4ff) } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        attribute vec4 aSeed; uniform float uTau, uStreak, uWidth, uAmount, uTime, uGlint; uniform vec3 uCenter, uBox, uVel; varying vec2 vUv; varying float vA;
        ${WRAP}
        void main(){
          vec3 vel = uVel * (0.8 + 0.4 * aSeed.w);
          vec3 c = wrapBox(aSeed.xyz * uBox + vel * uTau, uCenter, uBox);
          vec3 axis = normalize(vel) * uStreak * (0.6 + 0.8 * aSeed.x);
          vec3 side = normalize(cross(axis, cameraPosition - c)) * uWidth;
          vec3 edge = abs(c - uCenter) / (uBox * 0.5); float fade = 1.0 - smoothstep(0.75, 1.0, max(edge.x, max(edge.y, edge.z)));
          vUv = uv; vA = fade * step(fract(aSeed.w * 5.31), uAmount) * (1.0 + uGlint * (0.5 + 2.5 * pow(0.5 + 0.5 * sin(uTime * 3.0 + aSeed.y * 60.0), 6.0)));
          gl_Position = projectionMatrix * viewMatrix * vec4(c + axis * (position.y) + side * position.x * 2.0, 1.0);
        }`,
      fragmentShader: /* glsl */`uniform vec3 uCol; uniform float uAlpha; varying vec2 vUv; varying float vA;
        void main(){ float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159); gl_FragColor = vec4(uCol * a * uAlpha * vA, 1.0); }`,
    }));
    this.mesh.frustumCulled = false;
  }
  /** frozen 0..1 encurta o risco em gota e liga o brilho. */
  update(tau, t, center, amount, frozen = 0) {
    const u = this.u; u.uTau.value = tau; u.uTime.value = t; u.uCenter.value.copy(center); u.uAmount.value = amount;
    u.uStreak.value = 0.9 - 0.78 * frozen; u.uWidth.value = 0.014 + 0.016 * frozen; u.uGlint.value = frozen; u.uAlpha.value = 0.4 + 0.5 * frozen;
    this.mesh.visible = amount > 0.001;
  }
}

const POINT_FRAG = /* glsl */`uniform vec3 uCol, uCol2; varying float vA; varying float vMix;
  void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); a = a * a + smoothstep(0.12, 0.0, d);
    gl_FragColor = vec4(mix(uCol, uCol2, vMix) * a * vA, 1.0); }`;

/** Explosão/emissão de partículas luminosas: posição analítica com arrasto, gravidade e redemoinho. */
export class Burst {
  constructor(count = 600, o = {}, seed = 21) {
    const r = rng(seed), g = new THREE.BufferGeometry(), dir = new Float32Array(count * 3), sd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); dir.set([s * Math.cos(a), z, s * Math.sin(a)], i * 3); sd.set([r(), r(), r(), r()], i * 4); }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
    this.u = { uAge: { value: -1 }, uOrigin: { value: new THREE.Vector3() }, uShape: { value: new THREE.Vector3(0.2, 0.2, 0.2) }, uSpeed: { value: o.speed ?? 3 }, uDrag: { value: o.drag ?? 1.5 }, uGrav: { value: new THREE.Vector3(0, o.gravity ?? 0.6, 0) },
      uLife: { value: o.life ?? 2.5 }, uSize: { value: o.size ?? 0.09 }, uSwirl: { value: o.swirl ?? 0.6 }, uStagger: { value: o.stagger ?? 0 }, uPx: PX, uCol: { value: new THREE.Color(o.color ?? 0xffd070) }, uCol2: { value: new THREE.Color(o.color2 ?? 0xfff2c0) }, uGain: { value: o.gain ?? 1.6 }, uDirBias: { value: new THREE.Vector3(0, 0, 0) } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aDir; attribute vec4 aSeed; uniform float uAge, uSpeed, uDrag, uLife, uSize, uSwirl, uStagger, uPx, uGain; uniform vec3 uOrigin, uShape, uGrav, uDirBias; varying float vA; varying float vMix;
        void main(){
          float age = uAge - aSeed.w * uStagger; float life = uLife * (0.55 + 0.45 * aSeed.x); float k = clamp(age / life, 0.0, 1.0);
          vec3 p = uOrigin + (aSeed.xyz - 0.5) * 2.0 * uShape;
          float trav = (1.0 - exp(-uDrag * max(age, 0.0))) / uDrag;
          p += normalize(aDir + uDirBias) * uSpeed * (0.35 + 0.65 * aSeed.y) * trav + uGrav * age * age * 0.5;
          float sa = age * (1.0 + aSeed.z * 2.0) + aSeed.x * 6.28; p += vec3(cos(sa), sin(sa * 0.7), sin(sa)) * uSwirl * k;
          vA = step(0.0, age) * step(age, life) * smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.55, 1.0, k)) * uGain * (0.6 + 0.4 * sin(age * 9.0 + aSeed.z * 30.0));
          vMix = aSeed.z;
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = max(1.0, uSize * (0.5 + aSeed.y) * uPx * 2.4 / -mv.z) * step(0.0001, vA);
        }`, fragmentShader: POINT_FRAG }));
    this.points.frustumCulled = false; this.points.visible = false;
  }
  /** origin: centro; age: segundos desde a emissão (negativo = invisível); shape: semi-eixos do volume de origem. */
  set(origin, age, shape) { this.u.uOrigin.value.copy(origin); this.u.uAge.value = age; if (shape) this.u.uShape.value.set(shape[0], shape[1], shape[2]); this.points.visible = age >= 0 && age < this.u.uLife.value + this.u.uStagger.value; return this; }
}

/** Poeira dourada ambiente (partículas que flutuam numa caixa em torno da câmera). */
export class Motes {
  constructor(count = 500, seed = 31, color = 0xffd88a) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seeds(count, seed), 4));
    this.u = { uTau: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(20, 12, 20) }, uDrift: { value: new THREE.Vector3(0.15, 0.12, 0.08) }, uSize: { value: 0.02 }, uPx: PX, uCol: { value: new THREE.Color(color) }, uCol2: { value: new THREE.Color(0xffffff) }, uAmount: { value: 1 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec4 aSeed; uniform float uTau, uSize, uPx, uAmount; uniform vec3 uCenter, uBox, uDrift; varying float vA; varying float vMix;
        ${WRAP}
        void main(){
          vec3 p = aSeed.xyz * uBox + uDrift * uTau * (0.5 + aSeed.w) + vec3(sin(uTau * 0.6 + aSeed.x * 30.0), sin(uTau * 0.4 + aSeed.y * 30.0), cos(uTau * 0.5 + aSeed.z * 30.0)) * 0.6;
          p = wrapBox(p, uCenter, uBox);
          vec3 edge = abs(p - uCenter) / (uBox * 0.5); float fade = 1.0 - smoothstep(0.7, 1.0, max(edge.x, max(edge.y, edge.z)));
          vA = fade * uAmount * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTau * 2.0 + aSeed.w * 40.0), 2.0)); vMix = aSeed.z * 0.4;
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, uSize * (0.4 + aSeed.w) * uPx * 2.4 / -mv.z);
        }`, fragmentShader: POINT_FRAG }));
    this.points.frustumCulled = false;
  }
  update(tau, center, amount = 1) { this.u.uTau.value = tau; this.u.uCenter.value.copy(center); this.u.uAmount.value = amount; this.points.visible = amount > 0.001; }
}

/** Fragmentos instanciados com sementes por instância. O episódio fornece a função fechada de movimento. */
export class Shards {
  constructor(count, geo, mat, seed = 41) {
    this.count = count; this.seed = seeds(count, seed, 8); this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.d = new THREE.Object3D(); this.mesh.visible = false;
  }
  /** fn(i, s, d): s = 8 sementes (0..1) da instância, d = Object3D para posicionar (scale 0 esconde). */
  update(fn, visible = true) {
    this.mesh.visible = visible; if (!visible) return;
    const d = this.d, s = this.seed;
    for (let i = 0; i < this.count; i++) { d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.setScalar(1); fn(i, s.subarray(i * 8, i * 8 + 8), d); d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
export const shardGeo = () => { const g = new THREE.TetrahedronGeometry(1, 0); g.scale(1, 2.2, 0.35); return g; };
export const shardMat = (color = 0x7fbcf0, emissive = 0x2a7cff, ei = 0.9) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, metalness: 0.6, roughness: 0.25, flatShading: true });

/** Voo balístico com pouso: retorna a posição no instante age (para em repouso ao tocar o chão). */
export function ballistic(d, p0x, p0y, p0z, vx, vy, vz, age, g = 9.8, ground = 0) {
  const a = Math.max(0, age), disc = vy * vy + 2 * g * (p0y - ground), tl = disc > 0 ? (vy + Math.sqrt(disc)) / g : 0, tt = Math.min(a, tl);
  d.position.set(p0x + vx * tt, Math.max(ground, p0y + vy * tt - 0.5 * g * tt * tt), p0z + vz * tt);
  return tt >= tl ? 1 : 0;                                       // 1 = já pousou
}

/** Pássaros: corpo + duas asas que batem; trajetória circular analítica. */
export class Birds {
  constructor(n = 7, seed = 51) {
    this.group = new THREE.Group(); this.birds = []; const r = rng(seed);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2f3c, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
    const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.09, 0, 0, -0.08, 0.42, 0, -0.03]), 3)); wingG.computeVertexNormals();
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), mat); body.rotation.x = Math.PI / 2; b.add(body);
      const wl = new THREE.Mesh(wingG, mat), wr = new THREE.Mesh(wingG, mat); wr.scale.x = -1; b.add(wl, wr);
      b.userData = { wl, wr, R: 3 + r() * 6, h: r() * 3, sp: (0.5 + r() * 0.5) * (r() > 0.5 ? 1 : -1), ph: r() * TAU, fl: 9 + r() * 5 };
      b.castShadow = true; this.group.add(b); this.birds.push(b);
    }
  }
  /** tau: tempo do mundo (congela junto com ele); center: centro do bando. */
  update(tau, center, spread = 1) {
    for (const b of this.birds) {
      const u = b.userData, a = tau * u.sp * 0.6 + u.ph;
      b.position.set(center.x + Math.cos(a) * u.R * spread, center.y + u.h + Math.sin(tau * 0.8 + u.ph) * 0.5, center.z + Math.sin(a) * u.R * spread);
      b.rotation.y = -a - (u.sp > 0 ? 0 : Math.PI); const f = Math.sin(tau * u.fl + u.ph) * 0.8;
      u.wl.rotation.z = f; u.wr.rotation.z = -f;
    }
  }
}
