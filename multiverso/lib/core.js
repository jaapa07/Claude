// core.js: the deterministic heart of the series.
// Every picture is a pure function of the absolute episode time t (seconds). No clocks, no Math.random,
// no requestAnimationFrame state: ask for t = 41.3 twice and you get the same pixels twice.
export const W = 1080, H = 1920, FPS = 30;

// ---------- math ----------
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / (b - a));          // 0..1 progress of t through [a, b]
export const between = (t, a, b) => t >= a && t < b;
export const TAU = Math.PI * 2;
export const ease = {
  lin: k => k,
  inQ: k => k * k, outQ: k => 1 - (1 - k) * (1 - k),
  io: k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2,
  inC: k => k * k * k, outC: k => 1 - Math.pow(1 - k, 3),
  ioC: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
  outElastic: k => k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * TAU / 3) + 1,
  outBounce: k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; },
};

// ---------- deterministic randomness ----------
export function rng(seed) {                         // xorshift32, seeded
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function hash(i, j = 0) {                    // stateless 0..1 hash of two integers
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
export function noise(x, seed = 0) {                // smooth 1D value noise, -1..1
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}
// camera shake that dies out: amplitude a at time t0, decaying over d seconds
export function shake(t, t0, a = 30, d = .6, seed = 1) {
  const k = prog(t, t0, t0 + d); if (t < t0 || k >= 1) return [0, 0];
  const amp = a * Math.pow(1 - k, 2);
  return [noise(t * 38, seed) * amp, noise(t * 41, seed + 7) * amp];
}
export function shakes(t, list) {                   // sum of several [t0, a, d] shakes
  let x = 0, y = 0;
  for (const [t0, a, d] of list) { const [u, v] = shake(t, t0, a, d, t0 * 10 | 0); x += u; y += v; }
  return [x, y];
}

// ---------- GSAP keyframe tracks ----------
// K(defaults, {prop: [[time, value, ease?], ...]}) builds a *paused* GSAP timeline that tweens a plain state object.
// Every segment is a fromTo, so seeking to any time (forwards, backwards, or cold in a parallel renderer) gives
// the same values. Call .at(t) to get the state at local time t.
export function K(defaults, tracks) {
  const gsap = window.gsap, st = { ...defaults }, tl = gsap.timeline({ paused: true });
  for (const [p, keys] of Object.entries(tracks)) {
    if (!keys.length) continue;
    st[p] = keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [ta, va] = keys[i - 1], [tb, vb, e] = keys[i];
      if (tb <= ta) continue;
      tl.fromTo(st, { [p]: va }, { [p]: vb, duration: tb - ta, ease: e || 'power2.inOut', immediateRender: false }, ta);
    }
  }
  tl.seek(0, true);
  return { st, tl, at(t) { tl.seek(Math.max(0, t), true); return st; } };
}

// ---------- tiny fixed-step physics (re-simulated deterministically, cached for sequential frames) ----------
// bodies: [{x,y,vx,vy,r,bounce}] ; world: {g, box:[x0,y0,x1,y1], drag, step(b, t)}
export function physics(init, world) {
  const dt = 1 / 120; let cacheT = -1, bodies = null;
  const reset = () => { bodies = init().map(b => ({ bounce: .6, ...b })); cacheT = 0; };
  function stepAll(t) {
    const g = typeof world.g === 'function' ? world.g(t) : (world.g ?? 2600);
    const drag = world.drag ?? 0;
    for (const b of bodies) {
      if (b.frozen) continue;
      if (b.born !== undefined) {                      // not born yet: ride along with the parent, then get a kick
        if (t < b.born) { if (b.parent !== undefined) { const p = bodies[b.parent]; b.x = p.x; b.y = p.y; } continue; }
        if (!b.kicked) { b.kicked = true; b.vx = b.kick[0]; b.vy = b.kick[1]; b.hit = 1; }
      }
      b.vy += g * dt; b.vx *= 1 - drag * dt; b.vy *= 1 - drag * dt;
      if (world.force) world.force(b, t, dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.hit = Math.max(0, (b.hit || 0) - dt * 4);
      const [x0, y0, x1, y1] = world.box;
      if (b.x < x0 + b.r) { b.x = x0 + b.r; b.vx = Math.abs(b.vx) * b.bounce; b.hit = 1; }
      if (b.x > x1 - b.r) { b.x = x1 - b.r; b.vx = -Math.abs(b.vx) * b.bounce; b.hit = 1; }
      if (b.y < y0 + b.r) { b.y = y0 + b.r; b.vy = Math.abs(b.vy) * b.bounce; b.hit = Math.min(1, Math.abs(b.vy) / 900); }
      if (b.y > y1 - b.r) { b.y = y1 - b.r; b.vy = -Math.abs(b.vy) * b.bounce; b.vx *= .96; b.hit = Math.min(1, Math.abs(b.vy) / 900); }
    }
    if (world.collide) for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d > 0 && d < m) { const nx = dx / d, ny = dy / d, o = (m - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const k = -rv * .9; a.vx -= nx * k / 2; a.vy -= ny * k / 2; b.vx += nx * k / 2; b.vy += ny * k / 2; } }
    }
  }
  return function at(t) {                     // t = local seconds since the simulation started
    if (bodies === null || t < cacheT - 1e-6) reset();
    while (cacheT + dt <= t + 1e-9) { stepAll(cacheT); cacheT += dt; }
    return bodies;
  };
}

// ---------- shots ----------
// A shot: {t0, t1, draw(g, lt, t, ctx)} ; the film picks the shot whose [t0, t1) holds t.
export function findShot(shots, t) {
  for (let i = shots.length - 1; i >= 0; i--) if (t >= shots[i].t0) return shots[i];
  return shots[0];
}
