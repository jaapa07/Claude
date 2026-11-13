// Utilidades determinísticas: nada aqui usa Math.random, Date ou performance.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));           // progresso 0..1 de t dentro de [a,b]
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const sseg = (t, a, b) => smooth(seg(t, a, b));
export const pulse = (t, a, b, fade = 0.3) => Math.min(sseg(t, a, a + fade), 1 - sseg(t, b - fade, b)); // sobe e desce
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const backOut = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const TAU = Math.PI * 2;

export function rng(seed) {                                           // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
export function noise1(x) {                                           // ruído de valor suave, -1..1
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash(a * 57.0 + b * 131.0);
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy) * 2 - 1;
}
export function fbm2(x, y, oct = 4) { let a = 0.5, s = 0; for (let i = 0; i < oct; i++) { s += a * noise2(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }

/** Relógio do mundo: integra uma taxa de tempo por trechos (1 = normal, 0 = congelado).
 *  keys: [[t, taxa], ...] interpolados linearmente. Retorna tau(t), função pura de t. */
export function makeTau(keys, duration = 90, step = 1 / 240) {
  const n = Math.ceil(duration / step) + 2, table = new Float32Array(n);
  const rate = (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, r0] = keys[i - 1], [t1, r1] = keys[i]; return lerp(r0, r1, (t - t0) / (t1 - t0 || 1)); }
    return keys[keys.length - 1][1];
  };
  for (let i = 1; i < n; i++) table[i] = table[i - 1] + rate((i - 0.5) * step) * step;
  const tau = (t) => { const x = clamp(t / step, 0, n - 2), i = Math.floor(x); return lerp(table[i], table[i + 1], x - i); };
  tau.rate = rate;
  return tau;
}
