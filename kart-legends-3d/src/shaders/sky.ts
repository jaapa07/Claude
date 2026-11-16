/** Céu procedural: degradê, sol, estrelas, nuvens e aurora boreal. */
export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 0.0);
  gl_Position = projectionMatrix * vec4(p.xyz, 1.0);
  gl_Position.z = gl_Position.w;
}`;

export const skyFragment = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform float uStars; uniform float uAurora; uniform float uClouds; uniform float uTime; uniform float uFlash;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h * 3.0, 0.0, 1.0), 0.7));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 900.0) * 6.0 + pow(sd, 24.0) * 0.32 + pow(sd, 4.0) * 0.12);
  if (uStars > 0.0 && h > 0.0) {
    vec2 sp = d.xz / (h + 0.25) * 60.0;
    float st = step(0.995, hash(floor(sp))) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(floor(sp) + 3.0) * 30.0));
    col += vec3(st) * uStars * smoothstep(0.0, 0.3, h);
  }
  if (uAurora > 0.0 && h > 0.02) {
    vec2 ap = d.xz / (h + 0.35);
    float band = fbm(vec2(ap.x * 1.6 + uTime * 0.03, ap.y * 0.5));
    float curtain = smoothstep(0.42, 0.75, band) * smoothstep(0.02, 0.35, h) * (1.0 - smoothstep(0.55, 0.95, h));
    float rays = 0.6 + 0.4 * sin(ap.x * 26.0 + uTime * 0.7 + band * 9.0);
    col += mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.3, 1.0), smoothstep(0.1, 0.6, h)) * curtain * rays * uAurora * 0.9;
  }
  if (uClouds > 0.0 && h > 0.0) {
    vec2 cp = d.xz / (h + 0.18) * 1.4 + vec2(uTime * 0.006, 0.0);
    float c = smoothstep(0.52, 0.86, fbm(cp)) * smoothstep(0.0, 0.25, h) * uClouds;
    vec3 cc = mix(uHorizon, vec3(1.0), 0.55) + uSunColor * pow(sd, 6.0) * 0.4;
    col = mix(col, cc, c * 0.7);
  }
  col += vec3(0.75, 0.8, 1.0) * uFlash;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
