import * as THREE from 'three';
// Portal temporal: espiral de energia com lente no centro e borda de fogo azul.
const vert = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const frag = /* glsl */`
  precision highp float; uniform float uTime, uOpen; uniform vec3 uColA, uColB; varying vec2 vUv;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p = p*2.1 + 3.7; a *= 0.5; } return s; }
  void main(){
    vec2 p = vUv * 2.0 - 1.0; float r = length(p) / max(uOpen, 0.001); float a = atan(p.y, p.x);
    if (r > 1.25) discard;
    float sw = a + 3.5 / (r + 0.25) + uTime * 1.6;                                   // espiral que aperta rumo ao centro
    float arms = fbm(vec2(sw * 1.6, r * 5.0 - uTime * 1.2));
    float arms2 = fbm(vec2(sw * 3.0 + 4.0, r * 9.0 - uTime * 2.0));
    float core = smoothstep(0.55, 0.0, r);
    float rim = smoothstep(0.16, 0.0, abs(r - 0.95 - 0.05 * fbm(vec2(a * 3.0, uTime * 2.0))));
    float body = smoothstep(1.0, 0.75, r);
    vec3 col = mix(uColA, uColB, arms) * (0.35 + 1.6 * arms * arms2) * body;
    col = mix(col, vec3(0.0, 0.0, 0.02), core * 0.92);                               // abismo no centro
    col += vec3(0.6, 0.9, 1.0) * rim * 3.0 + uColB * pow(arms2, 3.0) * body * 2.0;
    float tick = (1.0 - smoothstep(0.0, 0.08, abs(fract(a / 6.2831853 * 12.0 + 0.5) - 0.5))) * smoothstep(0.1, 0.0, abs(r - 0.8));
    col += vec3(1.0, 0.9, 0.6) * tick * 2.0;
    float alpha = clamp(body * (0.75 + arms) + rim, 0.0, 1.0) * smoothstep(0.0, 0.15, uOpen);
    gl_FragColor = vec4(col, alpha);
  }`;
export function makePortal(radius = 1) {
  const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uColA: { value: new THREE.Color(0x1a2a90) }, uColB: { value: new THREE.Color(0x58d0ff) } },
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.5, radius * 2.5), mat);
  m.userData.set = (open, t) => { mat.uniforms.uOpen.value = open; mat.uniforms.uTime.value = t; m.visible = open > 0.002; };
  return m;
}

// Energia: arco de corte, anel de onda de choque e feixe (aditivos, com ruído animado).
const eFrag = /* glsl */`
  precision highp float; uniform float uTime, uK, uMode; uniform vec3 uCol; varying vec2 vUv;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  void main(){
    float a;
    if (uMode < 0.5) {            // arco de corte: u ao longo do arco, v do interior à borda
      float head = smoothstep(uK - 0.55, uK, vUv.x) * step(vUv.x, uK);
      a = head * pow(vUv.y, 2.5) * (0.6 + 0.6 * noise(vec2(vUv.x * 30.0, uTime * 9.0))) * (1.0 - smoothstep(0.75, 1.0, uK));
    } else if (uMode < 1.5) {     // anel de choque
      vec2 p = vUv * 2.0 - 1.0; float r = length(p); float an = atan(p.y, p.x);
      a = smoothstep(0.12, 0.0, abs(r - uK * 0.95)) * (0.6 + 0.8 * noise(vec2(an * 6.0, uTime * 6.0))) * (1.0 - uK);
      a += smoothstep(0.3, 0.0, abs(r - uK * 0.95)) * 0.06 * (1.0 - uK);
    } else {                      // feixe / pilar de luz
      float w = abs(vUv.x - 0.5) * 2.0;
      a = (smoothstep(1.0, 0.0, w) * 0.35 + smoothstep(0.35, 0.0, w)) * uK * (0.7 + 0.5 * noise(vec2(vUv.x * 8.0, vUv.y * 14.0 - uTime * 5.0))) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
    }
    gl_FragColor = vec4(uCol * a * (uMode > 0.5 && uMode < 1.5 ? 1.1 : 2.2), a);
  }`;
export function energyMaterial(mode, color = 0x66c8ff) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uMode: { value: mode }, uCol: { value: new THREE.Color(color) } },
    vertexShader: vert, fragmentShader: eFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
}
/** Arco de corte: faixa em setor de anel, no plano XY local. */
export function makeSlashArc(color = 0x7fd4ff, r0 = 0.5, r1 = 1.5, arc = 3.4) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40, 1, 0, arc), energyMaterial(0, color));
  const uv = m.geometry.attributes.uv, p = m.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) { const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y); let a = Math.atan2(y, x); if (a < -0.001) a += Math.PI * 2; uv.setXY(i, a / arc, (r - r0) / (r1 - r0)); }
  m.userData.set = (k, t) => { m.material.uniforms.uK.value = k * 1.6; m.material.uniforms.uTime.value = t; m.visible = k > 0.001 && k < 0.999; };
  m.visible = false; return m;
}
export function makeShockRing(color = 0x8fdcff) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), energyMaterial(1, color));
  m.userData.set = (k, t) => { m.material.uniforms.uK.value = k; m.material.uniforms.uTime.value = t; m.visible = k > 0.001 && k < 0.999; };
  m.visible = false; return m;
}
export function makeBeam(color = 0x6fc8ff, w = 1, h = 10) {
  const g = new THREE.Group();
  for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), energyMaterial(2, color)); m.position.y = h / 2; m.rotation.y = i * Math.PI / 2; g.add(m); }
  g.userData.set = (k, t) => { for (const m of g.children) { m.material.uniforms.uK.value = k; m.material.uniforms.uTime.value = t; } g.visible = k > 0.002; };
  g.visible = false; return g;
}
