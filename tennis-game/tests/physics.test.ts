import { describe, it, expect } from 'vitest';
import { solveShot, simulateFlight, stepBall, isInside, type BallState } from '../src/game/physics';

describe('physics', () => {
  it('solver lands within 5 cm of target', () => {
    for (const [tx, tz, spd, spin] of [[2, -9, 30, 0.6], [-3, -6, 24, -0.4], [0, -10, 40, 0.2], [3.5, -11, 34, 1]]) {
      const r = solveShot({ from: { x: 0, y: 1, z: 11 }, target: { x: tx, y: 0, z: tz }, speed: spd, spin, minNetClear: 0.2 });
      const l = r.info.landing!;
      expect(Math.hypot(l.x - tx, l.z - tz)).toBeLessThan(0.05);
      expect(r.info.netClear).toBeGreaterThan(0.15);
    }
  });
  it('lob goes high', () => {
    const r = solveShot({ from: { x: 0, y: 1, z: 8 }, target: { x: 0, y: 0, z: -10 }, speed: 17, spin: 0.3, minNetClear: 2, lob: true });
    expect(r.info.apex).toBeGreaterThan(5);
    expect(Math.abs(r.info.landing!.z + 10)).toBeLessThan(0.08);
  });
  it('topspin dips faster than flat', () => {
    const flat = simulateFlight({ x: 0, y: 1, z: 11 }, { x: 0, y: 4, z: -28 }, 0);
    const top = simulateFlight({ x: 0, y: 1, z: 11 }, { x: 0, y: 4, z: -28 }, 1);
    expect(top.landing!.z).toBeGreaterThan(flat.landing!.z);
  });
  it('bounce restitution matches surface', () => {
    const s: BallState = { p: { x: 0, y: 0.05, z: 0 }, v: { x: 0, y: -10, z: 0 }, spin: 0 };
    const e = stepBall(s, 0.01, { restitution: 0.75, friction: 0.7, spinKick: 0 });
    expect(e?.type).toBe('bounce');
    expect(s.v.y).toBeCloseTo(10.0981 * 0.75, 1);
  });
  it('service box geometry', () => {
    expect(isInside({ x: 2, y: 0, z: -4 }, 'far', 'serviceDeuce')).toBe(false);
    expect(isInside({ x: -2, y: 0, z: -4 }, 'far', 'serviceDeuce')).toBe(true);
    expect(isInside({ x: 2, y: 0, z: 4 }, 'near', 'serviceDeuce')).toBe(true);
    expect(isInside({ x: 0, y: 0, z: -12.5 }, 'far', 'singles')).toBe(false);
  });
});
