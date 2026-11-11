import * as THREE from 'three';

// Closed-form projectile with ground bounces (restitution e, horizontal damping k).
// Evaluated directly at any time τ → deterministic, no integration state.
export function bounce(p0, v0, tau, { groundY = 0, radius = 0, g = 9.8, e = 0.45, k = 0.75, maxB = 7 } = {}) {
  const out = new THREE.Vector3(); if (tau <= 0) return { p: out.copy(p0), rolled: 0, rest: false };
  let x = p0.x, y = p0.y, z = p0.z, vx = v0.x, vy = v0.y, vz = v0.z, t = tau, gy = groundY + radius, rolled = 0;
  for (let b = 0; b <= maxB; b++) {
    // time until ground: y + vy*s - g/2 s^2 = gy
    const A = -0.5 * g, B = vy, C = y - gy; const disc = B * B - 4 * A * C;
    const s = disc < 0 ? Infinity : (-B - Math.sqrt(disc)) / (2 * A);
    if (t <= s || b === maxB) {
      const tt = b === maxB ? 0 : t;
      x += vx * tt; z += vz * tt; y = b === maxB ? gy : y + vy * tt + A * tt * tt; rolled += Math.hypot(vx, vz) * tt;
      if (b === maxB) { const slide = Math.min(t, 1.2); x += vx * slide * (1 - slide / 2.4); z += vz * slide * (1 - slide / 2.4); rolled += Math.hypot(vx, vz) * slide * 0.5; }
      return { p: out.set(x, Math.max(y, gy), z), rolled, rest: b === maxB };
    }
    x += vx * s; z += vz * s; y = gy; rolled += Math.hypot(vx, vz) * s; t -= s;
    const vyHit = vy - g * s; vy = -vyHit * e; vx *= k; vz *= k;
    if (Math.abs(vy) < 0.4) { vy = 0; const slide = Math.min(t, 1.2); x += vx * slide * (1 - slide / 2.4); z += vz * slide * (1 - slide / 2.4); rolled += Math.hypot(vx, vz) * slide; return { p: out.set(x, gy, z), rolled, rest: true }; }
  }
  return { p: out.set(x, gy, z), rolled, rest: true };
}

// time of the first ground hit (for SFX scheduling)
export function bounceTimes(p0, v0, { groundY = 0, radius = 0, g = 9.8, e = 0.45, n = 3 } = {}) {
  const times = []; let y = p0.y, vy = v0.y, T = 0; const gy = groundY + radius;
  for (let i = 0; i < n; i++) { const A = -0.5 * g, B = vy, C = y - gy, d = B * B - 4 * A * C; if (d < 0) break; const s = (-B - Math.sqrt(d)) / (2 * A); T += s; times.push(T); vy = -(vy - g * s) * e; y = gy; if (Math.abs(vy) < 0.4) break; }
  return times;
}
