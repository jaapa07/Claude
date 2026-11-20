/** Riscos de velocidade radiais sobrepostos à câmera (intensificam com turbo). */
export const speedLinesVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const speedLinesFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uIntensity; uniform float uTime; uniform vec3 uColor;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float a = atan(p.y, p.x);
  float seg = floor(a * 28.0 / 6.2831853 + 0.5);
  float rnd = hash(seg * 12.9898);
  float w = abs(fract(a * 28.0 / 6.2831853 + 0.5) - 0.5);
  float streak = smoothstep(0.16 * rnd + 0.02, 0.0, w);
  float flow = fract(r * (0.7 + rnd) - uTime * (2.2 + rnd * 2.0) + rnd * 7.0);
  float alpha = streak * smoothstep(0.0, 0.25, flow) * smoothstep(1.0, 0.5, flow) * smoothstep(0.55, 1.15, r) * step(0.45, rnd);
  gl_FragColor = vec4(uColor, alpha * uIntensity);
}`;
