import { beforeAll, describe, expect, it } from 'vitest';
import { PHYS, tuningFor } from '@/game/vehicles/kartTuning';
import { createHarness, initPhysics, ringTrack, type Harness } from './simHarness';

beforeAll(initPhysics);

/** Mantém o kart em drift numa área aberta e devolve o harness no momento desejado. */
function drifting(seconds: number, kart: 'flecha' | 'geada' = 'flecha'): Harness {
  const h = createHarness({ data: ringTrack(), kart });
  h.start();
  h.input.throttle = 1;
  h.run(2.4);
  // o anel gira para a esquerda: derrapa para a esquerda
  h.input.steer = -1; h.input.drift = true;
  h.run(0.05);
  h.input.steer = -0.1;
  h.run(seconds);
  return h;
}

describe('drift e miniturbo', () => {
  it('entra em drift com Espaço + direção em velocidade, e trava o lado', () => {
    const h = drifting(0.3);
    const k = h.sim.player!;
    expect(k.drifting).toBe(true);
    expect(k.driftDir).toBe(-1);
    expect(h.events.some((e) => e.type === 'drift_start')).toBe(true);
  });

  it('não entra em drift parado nem sem direção', () => {
    const h = createHarness();
    h.start();
    h.input.drift = true; h.input.steer = 1;
    h.run(0.3);
    expect(h.sim.player!.drifting).toBe(false);
    h.input.drift = false; h.input.steer = 0; h.input.throttle = 1;
    h.run(2.5);
    h.input.drift = true;
    h.run(0.3);
    expect(h.sim.player!.drifting).toBe(false);
  });

  it('acumula carga e sobe os três níveis em ordem', () => {
    const h = drifting(4.9);
    const levels = h.events.filter((e) => e.type === 'drift_level').map((e) => (e.type === 'drift_level' ? e.level : 0));
    expect(levels).toEqual([1, 2, 3]);
    expect(h.sim.player!.driftLevel).toBe(3);
  });

  it('soltar cedo demais não dá turbo', () => {
    const h = drifting(0.4);
    h.input.drift = false;
    h.run(0.1);
    expect(h.sim.player!.boostTime).toBe(0);
    expect(h.events.some((e) => e.type === 'turbo')).toBe(false);
  });

  it('cada nível libera um miniturbo mais longo que o anterior', () => {
    const boostAfter = (seconds: number): { level: number; time: number } => {
      const h = drifting(seconds);
      h.input.drift = false;
      h.run(1 / 60);
      const e = h.events.find((x) => x.type === 'turbo');
      return { level: e && e.type === 'turbo' ? e.level : 0, time: h.sim.player!.boostTime };
    };
    const l1 = boostAfter(1.6), l2 = boostAfter(3.0), l3 = boostAfter(4.7);
    expect([l1.level, l2.level, l3.level]).toEqual([1, 2, 3]);
    expect(l2.time).toBeGreaterThan(l1.time + 0.3);
    expect(l3.time).toBeGreaterThan(l2.time + 0.5);
    expect(l1.time).toBeCloseTo(PHYS.driftBoostTime[0] * tuningFor('flecha').driftBoost, 1);
  });

  it('o turbo leva o kart acima da velocidade máxima normal e depois passa', () => {
    const h = createHarness({ kart: 'flecha' });
    h.follow = true;
    h.start();
    const k = h.sim.player!;
    h.input.throttle = 1;
    h.run(4);
    const top = tuningFor('flecha').topSpeed;
    k.boostTime = 1; k.boostTotal = 1;
    h.run(0.6);
    expect(k.speed).toBeGreaterThan(top * 1.15);
    h.run(2.5);
    expect(k.boostTime).toBe(0);
    expect(k.speed).toBeLessThanOrEqual(top + 0.3);
  });

  it('a eficiência de drift do kart acelera o acúmulo de carga', () => {
    const charge = (kart: 'flecha' | 'geada'): number => drifting(0.8, kart).sim.player!.driftCharge;
    expect(charge('geada')).toBeGreaterThan(charge('flecha') * 1.1);
  });

  it('placas de turbo aceleram o kart', () => {
    const h = createHarness();
    h.start();
    const k = h.sim.player!;
    const pad = h.sim.track.data.boostPads[0]!;
    k.body.setTranslation({ x: pad.pos[0], y: pad.pos[1] + PHYS.rideHeight, z: pad.pos[2] }, true);
    k.pathIndex = k.mainIndex = pad.index;
    h.run(0.1);
    expect(h.events.some((e) => e.type === 'boost_pad')).toBe(true);
    expect(k.boostTime).toBeGreaterThan(0.8);
  });
});
