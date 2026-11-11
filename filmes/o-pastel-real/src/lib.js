// Small deterministic helpers
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eo = t => 1 - Math.pow(1 - clamp(t), 3);
export const ei = t => Math.pow(clamp(t), 3);
export const back = (t, s = 1.8) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
export const elastic = t => { t = clamp(t); return t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * 2.1) + 1; };
export const TAU = Math.PI * 2;
export const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
export function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// keyframes [[t, value or [..]], ...] with smooth easing between keys
export function K(keys, ease = eio) {
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a] = keys[i], [t1, b] = keys[i + 1];
      if (t <= t1) { const u = ease((t - t0) / (t1 - t0 || 1)); return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], u)) : lerp(a, b, u); }
    }
    return keys[keys.length - 1][1];
  };
}
// a pop: 0 before t0, overshoot to 1 after
export const pop = (t, t0, d = .35) => t < t0 ? 0 : back(seg(t, t0, t0 + d), 2.2);
// a shake that decays from t0
export const shake = (t, t0, amp = 20, d = .5, f = 31) => t < t0 ? 0 : amp * Math.exp(-(t - t0) / d * 3) * Math.sin((t - t0) * f);
