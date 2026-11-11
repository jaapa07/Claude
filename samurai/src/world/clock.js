import * as THREE from 'three';
import { TAU } from '../core/util.js';

// Mostrador de relógio místico desenhado inteiramente em GLSL (anéis, 60 marcas, engrenagens, rachaduras).
const vert = /* glsl */`varying vec2 vUv; varying vec3 vW;
  #include <fog_pars_vertex>
  void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
  }`;
const frag = /* glsl */`
  precision highp float;
  uniform vec3 uColor, uColor2, uBase; uniform float uOpacity, uTime, uSolid, uCrack, uSpin, uFogK;
  varying vec2 vUv; varying vec3 vW;
  #include <fog_pars_fragment>
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float ring(float r, float r0, float w){ return smoothstep(w, 0.0, abs(r - r0)); }
  float vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 9.0, d2 = 9.0;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g = vec2(float(x), float(y)); vec2 o = vec2(hash(i+g), hash(i+g+7.7)); float dd = length(g + o - f); if(dd<d){ d2=d; d=dd; } else if(dd<d2) d2=dd; }
    return d2 - d; }
  void main(){
    vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
    float a = atan(p.x, p.y);
    float line = ring(r, 0.97, 0.018) + ring(r, 0.9, 0.008) + ring(r, 0.62, 0.006) + ring(r, 0.3, 0.008) + ring(r, 0.06, 0.03);
    float t60 = smoothstep(0.35, 0.5, abs(fract(a / 6.2831853 * 60.0) - 0.5)) ; t60 = (1.0 - t60) * step(0.86, r) * step(r, 0.9) * 0.0 + (1.0 - smoothstep(0.0, 0.12, abs(fract(a / 6.2831853 * 60.0 + 0.5) - 0.5))) * step(0.84, r) * step(r, 0.895);
    float t12 = (1.0 - smoothstep(0.0, 0.05, abs(fract(a / 6.2831853 * 12.0 + 0.5) - 0.5))) * step(0.72, r) * step(r, 0.895);
    // losangos nas doze horas
    float aa = (fract(a / 6.2831853 * 12.0 + 0.5) - 0.5) * 6.2831853 / 12.0; vec2 q = vec2(sin(aa) * r, cos(aa) * r - 0.66);
    float dia = 1.0 - smoothstep(0.022, 0.03, abs(q.x) * 1.4 + abs(q.y));
    // engrenagens internas girando em sentidos opostos
    float g1 = smoothstep(0.02, 0.0, abs(r - (0.46 + 0.02 * step(0.5, fract((a + uSpin) / 6.2831853 * 24.0))))) ;
    float g2 = smoothstep(0.015, 0.0, abs(r - (0.2 + 0.015 * step(0.5, fract((a - uSpin * 1.7) / 6.2831853 * 14.0)))));
    float rays = (1.0 - smoothstep(0.0, 0.02, abs(fract((a + uSpin * 0.3) / 6.2831853 * 8.0 + 0.5) - 0.5))) * step(0.3, r) * step(r, 0.62) * 0.5;
    float glow = line + t60 * 0.8 + t12 + dia + g1 * 0.8 + g2 * 0.8 + rays;
    float cr = smoothstep(0.06, 0.0, vor(p * 3.2 + 4.0)) * uCrack;
    vec3 col = mix(uColor, uColor2, clamp(r * 1.1 - 0.2 + 0.2 * sin(uTime + r * 9.0), 0.0, 1.0)) * (glow * 1.8 + 0.08) + vec3(0.7, 0.95, 1.0) * cr * 4.0;
    float alpha = clamp(glow + 0.06 + cr, 0.0, 1.0) * uOpacity;
    // modo sólido: pedra escura com as marcas incrustadas (plataformas de batalha)
    vec3 stone = uBase * (0.75 + 0.35 * hash(floor(p * 40.0))) * (0.6 + 0.4 * smoothstep(1.0, 0.2, r));
    col = mix(col, stone + col * 1.4, uSolid); alpha = mix(alpha, uOpacity, uSolid);
    gl_FragColor = vec4(col, alpha);
    #ifdef USE_FOG
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * uFogK * uSolid); gl_FragColor.a *= 1.0 - fogFactor * uFogK * (1.0 - uSolid);
    #endif
  }`;

export function clockMaterial({ color = 0x8fd8ff, color2 = 0xfff0c0, base = 0x20263c, solid = 0, opacity = 1, additive = true, fogK = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uBase: { value: new THREE.Color(base) },
      uOpacity: { value: opacity }, uTime: { value: 0 }, uSolid: { value: solid }, uCrack: { value: 0 }, uSpin: { value: 0 }, uFogK: { value: fogK } }]),
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: solid > 0.5, side: THREE.DoubleSide, fog: true,
    blending: additive && solid < 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: solid > 0.5,
  });
}

function handGeo(len, w) {                                       // ponteiro ornamentado, base na origem apontando para +Y
  const s = new THREE.Shape();
  s.moveTo(-w * 0.5, -len * 0.14); s.lineTo(w * 0.5, -len * 0.14); s.lineTo(w * 0.42, len * 0.55); s.lineTo(w * 1.3, len * 0.7); s.lineTo(0, len); s.lineTo(-w * 1.3, len * 0.7); s.lineTo(-w * 0.42, len * 0.55); s.closePath();
  return new THREE.ShapeGeometry(s);
}

/** Relógio com mostrador em shader e ponteiros em malha. Raio 1; escale o grupo. */
export class Clock {
  constructor(opts = {}) {
    this.group = new THREE.Group();
    this.mat = clockMaterial(opts);
    this.face = new THREE.Mesh(new THREE.CircleGeometry(1, 64), this.mat); this.group.add(this.face);
    this.handMat = new THREE.MeshBasicMaterial({ color: opts.hand ?? 0xfff2c8, transparent: true, opacity: 1, side: THREE.DoubleSide, blending: opts.solid ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    this.hour = new THREE.Mesh(handGeo(0.5, 0.05), this.handMat); this.minute = new THREE.Mesh(handGeo(0.8, 0.035), this.handMat);
    this.hour.position.z = 0.01; this.minute.position.z = 0.02; this.group.add(this.hour, this.minute);
    this.baseOpacity = opts.opacity ?? 1;
  }
  /** minutes: posição contínua do ponteiro dos minutos em voltas (negativo = para trás). */
  set(turns, opacity = 1, t = 0) {
    this.minute.rotation.z = -turns * TAU; this.hour.rotation.z = -turns * TAU / 12 - 1.1;
    this.mat.uniforms.uOpacity.value = opacity * this.baseOpacity; this.mat.uniforms.uTime.value = t; this.mat.uniforms.uSpin.value = turns * 0.6;
    this.handMat.opacity = opacity; this.group.visible = opacity > 0.003;
  }
}
