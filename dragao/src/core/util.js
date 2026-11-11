// Shared deterministic helpers. Nothing here reads the wall clock or Math.random:
// every frame is a pure function of the episode time t, so a frame can be rendered
// out of order (export) and still match playback exactly.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (a, b, x) => { const t = range(x, a, b); return t * t * (3 - 2 * t); };
export const smoother = (a, b, x) => { const t = range(x, a, b); return t * t * t * (t * (t * 6 - 15) + 10); };
export const pulse = (t, a, b, fade = 0.3) => smooth(a, a + fade, t) * (1 - smooth(b - fade, b, t));
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeInCubic = (x) => Math.pow(clamp(x), 3);
export const easeOutBack = (x, s = 1.7) => { x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s); };
export const easeOutElastic = (x) => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };

// mulberry32 — seeded PRNG
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap smooth 1D value noise (deterministic), used for camera shake & flicker
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
export function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}
export function shake(t, freq = 18, seed = 0) {
  return [noise1(t * freq + seed), noise1(t * freq + seed + 31.7), noise1(t * freq + seed + 77.3)];
}

// Piecewise keyframe interpolation: keys = [[t, value], ...] (numbers or arrays)
export function keys(t, ks, ease = (x) => x * x * (3 - 2 * x)) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, v0] = ks[i], [t1, v1] = ks[i + 1];
    if (t <= t1) {
      const e = ease((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], e)) : lerp(v0, v1, e);
    }
  }
  return ks[ks.length - 1][1];
}
