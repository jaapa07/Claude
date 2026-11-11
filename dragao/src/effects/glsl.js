// Shared GLSL snippets (noise, hashing) used by the scene shaders.
export const NOISE = /* glsl */`
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash12(i.xy + i.z * 17.0), n100 = hash12(i.xy + vec2(1,0) + i.z * 17.0);
  float n010 = hash12(i.xy + vec2(0,1) + i.z * 17.0), n110 = hash12(i.xy + vec2(1,1) + i.z * 17.0);
  float n001 = hash12(i.xy + (i.z + 1.0) * 17.0), n101 = hash12(i.xy + vec2(1,0) + (i.z + 1.0) * 17.0);
  float n011 = hash12(i.xy + vec2(0,1) + (i.z + 1.0) * 17.0), n111 = hash12(i.xy + vec2(1,1) + (i.z + 1.0) * 17.0);
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

// Uniforms shared by every point-sprite material, so particle size stays
// consistent between the half-res preview and the full-res export.
export const GLOBAL = { uScale: { value: 1 } };
