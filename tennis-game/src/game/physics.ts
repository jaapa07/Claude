// Deterministic tennis-ball physics: gravity, air drag, Magnus effect, surface-dependent bounce and the net.
// Units: metres, seconds.  Court centred at origin, net on z = 0, x across, y up.
export interface Vec3 { x: number; y: number; z: number }
export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const COURT = {
  halfLength: 23.77 / 2,
  halfWidthSingles: 8.23 / 2,
  halfWidthDoubles: 10.97 / 2,
  serviceLine: 6.4,
  netHeightCentre: 0.914,
  netHeightPost: 1.07,
  netHalfSpan: 6.4,
  ballRadius: 0.0335,
};

export interface SurfaceParams {
  restitution: number; // vertical coefficient
  friction: number; // horizontal speed kept after bounce
  spinKick: number; // how much topspin adds forward speed after bounce / slice skids
}

export const GRAVITY = 9.81;
export const DRAG = 0.0185; // k in a = -k|v|v
export const MAGNUS = 0.075; // lift per (spin * speed)

export interface BallState {
  p: Vec3;
  v: Vec3;
  spin: number; // + topspin, - backspin (dimensionless 0..1.5)
}

export function netHeightAt(x: number): number {
  const t = Math.min(1, Math.abs(x) / COURT.netHalfSpan);
  return COURT.netHeightCentre + (COURT.netHeightPost - COURT.netHeightCentre) * Math.pow(t, 1.6);
}

export type StepEvent =
  | { type: 'bounce'; p: Vec3; speed: number }
  | { type: 'net'; p: Vec3; cord: boolean }
  | null;

/** Advance the ball by dt. Mutates state. Returns an event if the ball bounced or touched the net. */
export function stepBall(s: BallState, dt: number, surf: SurfaceParams, rng: () => number = Math.random): StepEvent {
  const { p, v } = s;
  const speed = Math.hypot(v.x, v.y, v.z);
  // drag
  let ax = -DRAG * speed * v.x;
  let ay = -GRAVITY - DRAG * speed * v.y;
  let az = -DRAG * speed * v.z;
  // Magnus: omega = spin * normalize(up x vHoriz); a = k * omega x v
  const hl = Math.hypot(v.x, v.z);
  if (hl > 0.01 && s.spin !== 0) {
    const wx = (v.z / hl) * s.spin, wz = (-v.x / hl) * s.spin; // up x vh = (vz, 0, -vx)
    // omega x v with omega = (wx, 0, wz)
    ax += MAGNUS * (0 * v.z - wz * v.y);
    ay += MAGNUS * (wz * v.x - wx * v.z);
    az += MAGNUS * (wx * v.y - 0 * v.x);
  }
  const prevZ = p.z, prevY = p.y;
  v.x += ax * dt; v.y += ay * dt; v.z += az * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;

  // net plane crossing
  if ((prevZ > 0) !== (p.z > 0) && Math.abs(p.x) < COURT.netHalfSpan + 0.1) {
    const t = prevZ / (prevZ - p.z);
    const yAt = prevY + (p.y - prevY) * t;
    const top = netHeightAt(p.x);
    if (yAt - COURT.ballRadius < top) {
      const cord = yAt > top - 0.06;
      if (cord && rng() < 0.55) {
        // clips the tape and trickles over
        v.x *= 0.45; v.z *= 0.35; v.y = Math.abs(v.y) * 0.3 + 1.2;
        return { type: 'net', p: { x: p.x, y: yAt, z: 0 }, cord: true };
      }
      // into the net: stop and drop on the hitter's side
      const side = Math.sign(prevZ) || 1;
      p.z = side * 0.06;
      v.z = side * Math.abs(v.z) * 0.12; v.x *= 0.2; v.y = Math.min(v.y, 0) * 0.2;
      return { type: 'net', p: { x: p.x, y: yAt, z: 0 }, cord: false };
    }
  }

  // ground
  if (p.y < COURT.ballRadius && v.y < 0) {
    p.y = COURT.ballRadius;
    const impact = -v.y;
    const kick = 1 + surf.spinKick * s.spin;
    v.y = impact * surf.restitution * (s.spin < 0 ? 0.85 : 1);
    v.x *= surf.friction * kick;
    v.z *= surf.friction * kick;
    s.spin *= 0.45;
    if (v.y < 0.4) v.y = 0; // rolling
    return { type: 'bounce', p: { ...p }, speed: impact };
  }
  return null;
}

export interface TrajectoryInfo {
  landing: Vec3 | null; // first ground contact
  landTime: number;
  netClear: number; // margin over the net (negative = hits net); Infinity if never crosses
  apex: number;
}

/** Simulate a trajectory (no net interaction) until first bounce. */
export function simulateFlight(p0: Vec3, v0: Vec3, spin: number, maxT = 4, dt = 1 / 240): TrajectoryInfo {
  const s: BallState = { p: { ...p0 }, v: { ...v0 }, spin };
  let t = 0, netClear = Infinity, apex = p0.y;
  const noBounce: SurfaceParams = { restitution: 0, friction: 0, spinKick: 0 };
  void noBounce;
  while (t < maxT) {
    const pz = s.p.z, py = s.p.y;
    const { v } = s;
    const speed = Math.hypot(v.x, v.y, v.z);
    let ax = -DRAG * speed * v.x, ay = -GRAVITY - DRAG * speed * v.y, az = -DRAG * speed * v.z;
    const hl = Math.hypot(v.x, v.z);
    if (hl > 0.01 && spin !== 0) {
      const wx = (v.z / hl) * spin, wz = (-v.x / hl) * spin;
      ax += MAGNUS * (-wz * v.y); ay += MAGNUS * (wz * v.x - wx * v.z); az += MAGNUS * (wx * v.y);
    }
    v.x += ax * dt; v.y += ay * dt; v.z += az * dt;
    s.p.x += v.x * dt; s.p.y += v.y * dt; s.p.z += v.z * dt;
    t += dt;
    apex = Math.max(apex, s.p.y);
    if ((pz > 0) !== (s.p.z > 0)) {
      const k = pz / (pz - s.p.z);
      const y = py + (s.p.y - py) * k;
      netClear = y - COURT.ballRadius - netHeightAt(s.p.x);
    }
    if (s.p.y <= COURT.ballRadius) {
      const k = (py - COURT.ballRadius) / (py - s.p.y);
      const lx = s.p.x - v.x * dt * (1 - k), lz = s.p.z - v.z * dt * (1 - k);
      return { landing: { x: lx, y: 0, z: lz }, landTime: t - dt * (1 - k), netClear, apex };
    }
  }
  return { landing: null, landTime: maxT, netClear, apex };
}

export interface ShotRequest {
  from: Vec3;
  target: Vec3; // ground point
  speed: number; // desired launch speed (m/s), solver may lower it to clear the net
  spin: number;
  minNetClear: number; // metres above the tape
  lob?: boolean;
}

/**
 * Inverse solver: find a launch velocity from `from` that lands on `target` with the requested pace and spin,
 * clearing the net by at least minNetClear.  Deterministic, ~1ms.
 */
export function solveShot(req: ShotRequest): { v: Vec3; info: TrajectoryInfo } {
  const dx = req.target.x - req.from.x, dz = req.target.z - req.from.z;
  const dist = Math.hypot(dx, dz);
  const ux = dx / dist, uz = dz / dist;
  let speed = req.speed;
  let best: { v: Vec3; info: TrajectoryInfo } | null = null;
  for (let attempt = 0; attempt < 14; attempt++) {
    // bisection on elevation angle so the landing distance matches
    let lo = req.lob ? 0.35 : -0.35, hi = req.lob ? 1.25 : 0.9;
    let sol: { v: Vec3; info: TrajectoryInfo } | null = null;
    for (let i = 0; i < 26; i++) {
      const a = (lo + hi) / 2;
      const v = { x: ux * Math.cos(a) * speed, y: Math.sin(a) * speed, z: uz * Math.cos(a) * speed };
      const info = simulateFlight(req.from, v, req.spin);
      const d = info.landing ? Math.hypot(info.landing.x - req.from.x, info.landing.z - req.from.z) : 1e9;
      sol = { v, info };
      // for normal shots distance grows with angle (below ~40deg); for lobs (above 45deg) it shrinks
      if (req.lob ? d < dist : d > dist) hi = a; else lo = a;
    }
    if (!sol) break;
    best = sol;
    if (sol.info.netClear >= req.minNetClear || Math.abs(req.from.z) < 0.5) break;
    speed *= 0.93; // too flat: slow down so it can clear the net
  }
  return best!;
}

/** Predict where the ball will be over the next seconds, including bounces (no net). */
export function predictPath(state: BallState, surf: SurfaceParams, seconds: number, dt = 1 / 120): { t: number; p: Vec3; bounces: number }[] {
  const s: BallState = { p: { ...state.p }, v: { ...state.v }, spin: state.spin };
  const out: { t: number; p: Vec3; bounces: number }[] = [];
  let b = 0;
  const rng = () => 0;
  for (let t = 0; t < seconds; t += dt) {
    const e = stepBall(s, dt, surf, rng);
    if (e && e.type === 'bounce') b++;
    out.push({ t: t + dt, p: { ...s.p }, bounces: b });
    if (b >= 3) break;
  }
  return out;
}

export function isInside(p: Vec3, half: 'near' | 'far', zone: 'singles' | 'serviceDeuce' | 'serviceAd', margin = 0): boolean {
  const r = COURT.ballRadius + margin;
  const zSign = half === 'near' ? 1 : -1;
  const z = p.z * zSign; // positive into the target half
  if (zone === 'singles') return z >= -r && z <= COURT.halfLength + r && Math.abs(p.x) <= COURT.halfWidthSingles + r;
  // service boxes: deuce box is to the receiver's right.
  if (z < -r || z > COURT.serviceLine + r) return false;
  // receiver on the near half faces -z, so their right is +x; on the far half their right is -x
  const rightX = half === 'near' ? p.x : -p.x;
  if (zone === 'serviceDeuce') return rightX >= -r && rightX <= COURT.halfWidthSingles + r;
  return rightX <= r && rightX >= -COURT.halfWidthSingles - r;
}
