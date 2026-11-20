import { beforeAll, describe, expect, it } from 'vitest';
import { KARTS } from '@/data/karts';
import { PHYS, tuningFor } from '@/game/vehicles/kartTuning';
import { createHarness, initPhysics } from './simHarness';

beforeAll(initPhysics);

describe('inicialização da corrida', () => {
  it('posiciona os 8 competidores no grid, parados, e só libera os controles depois da contagem', () => {
    const h = createHarness({ opponents: 7 });
    expect(h.sim.karts).toHaveLength(8);
    expect(h.sim.phase).toBe('intro');
    h.input.throttle = 1;
    h.run(1);
    expect(h.sim.player!.speed).toBe(0);
    h.sim.startCountdown();
    h.run(1);
    expect(h.sim.phase).toBe('countdown');
    expect(Math.abs(h.sim.player!.speed)).toBeLessThan(0.01);
    h.run(2.1);
    expect(h.sim.phase).toBe('racing');
    expect(h.events.filter((e) => e.type === 'countdown').map((e) => (e.type === 'countdown' ? e.value : 0))).toEqual([3, 2, 1]);
    expect(h.events.some((e) => e.type === 'go')).toBe(true);
  });
});

describe('aceleração, velocidade máxima, frenagem e ré', () => {
  it('acelera de forma progressiva até a velocidade máxima do kart', () => {
    const h = createHarness({ kart: 'flecha' });
    h.follow = true;
    h.start();
    h.input.throttle = 1;
    h.run(0.5);
    const early = h.sim.player!.speed;
    h.run(0.5);
    const mid = h.sim.player!.speed;
    h.run(4);
    const top = tuningFor('flecha').topSpeed;
    expect(early).toBeGreaterThan(2);
    expect(mid).toBeGreaterThan(early);
    expect(h.sim.player!.speed).toBeGreaterThan(top * 0.93);
    expect(h.sim.player!.speed).toBeLessThanOrEqual(top + 0.01);
  });

  it('os atributos do kart mudam de fato a aceleração e a velocidade final', () => {
    const reach = (kart: 'faisca' | 'cometa', seconds: number): number => {
      const h = createHarness({ kart });
      h.follow = true;
      h.start();
      h.input.throttle = 1;
      h.run(seconds);
      return h.sim.player!.speed;
    };
    expect(reach('faisca', 1)).toBeGreaterThan(reach('cometa', 1) + 1);
    expect(reach('cometa', 6)).toBeGreaterThan(reach('faisca', 6) + 0.5);
  });

  it('todos os karts somam o mesmo total de pontos de atributo (equilíbrio)', () => {
    const totals = KARTS.map((k) => Object.values(k.stats).reduce((s, v) => s + v, 0));
    expect(new Set(totals).size).toBe(1);
  });

  it('freia até parar e depois dá marcha à ré', () => {
    const h = createHarness();
    h.start();
    h.input.throttle = 1;
    h.run(3);
    const before = h.sim.player!.speed;
    h.input.throttle = 0; h.input.brake = 1;
    h.run(0.4);
    expect(h.sim.player!.speed).toBeLessThan(before - 6);
    h.run(2.5);
    expect(h.sim.player!.speed).toBeLessThan(-3);
    expect(h.sim.player!.speed).toBeGreaterThanOrEqual(-PHYS.reverseSpeed - 0.01);
  });

  it('a direção responde: virar à direita reduz o rumo, à esquerda aumenta', () => {
    const turn = (steer: number): number => {
      const h = createHarness();
      h.start();
      h.input.throttle = 1;
      h.run(1.5);
      const h0 = h.sim.player!.heading;
      h.input.steer = steer;
      h.run(0.5);
      return h.sim.player!.heading - h0;
    };
    expect(turn(1)).toBeLessThan(-0.3);
    expect(turn(-1)).toBeGreaterThan(0.3);
  });
});

describe('superfícies e passo fixo', () => {
  it('fora da pista (grama) o kart perde velocidade', () => {
    const h = createHarness({ track: 'vale-moinhos' });
    h.start();
    const k = h.sim.player!;
    h.input.throttle = 1;
    h.run(4);
    const onRoad = k.speed;
    // leva o kart para a grama ao lado da pista
    const m = h.sim.track.main;
    const i = k.mainIndex;
    const lat = m.halfWidth[i]! + 6;
    k.body.setTranslation({ x: m.pos[i * 3]! + m.side[i * 3]! * lat, y: k.y + 0.3, z: m.pos[i * 3 + 2]! + m.side[i * 3 + 2]! * lat }, true);
    h.run(2.5);
    expect(k.onRoad).toBe(false);
    expect(k.speed).toBeLessThan(onRoad * 0.8);
  });

  it('no gelo o kart continua escorregando de lado depois de soltar a direção', () => {
    const slide = (track: 'pico-boreal' | 'porto-lanternas', index: number | null): number => {
      const h = createHarness({ track });
      h.start();
      const k = h.sim.player!;
      if (index !== null) {
        const m = h.sim.track.main;
        k.body.setTranslation({ x: m.pos[index * 3]!, y: m.pos[index * 3 + 1]! + PHYS.rideHeight, z: m.pos[index * 3 + 2]! }, true);
        k.heading = m.heading[index]!;
        k.pathIndex = k.mainIndex = index;
      }
      h.input.throttle = 1;
      h.run(2);
      h.input.steer = 1;
      h.run(0.4);
      h.input.steer = 0;
      h.run(0.3);
      return Math.abs(k.lateralSpeed);
    };
    const boreal = createHarness({ track: 'pico-boreal' }).sim.track.main;
    let ice = -1;
    for (let i = 0; i < boreal.n; i++) if (boreal.surface[i] === 4 && boreal.surface[(i + 30) % boreal.n] === 4) { ice = i; break; }
    expect(ice).toBeGreaterThan(0);
    expect(slide('pico-boreal', ice)).toBeGreaterThan(slide('porto-lanternas', null) * 3 + 0.5);
  });

  it('a simulação é determinística (mesma semente, mesmos comandos → mesmo resultado)', () => {
    const play = (): number[] => {
      const h = createHarness({ opponents: 7, seed: 42 });
      h.start();
      h.input.throttle = 1;
      h.run(6);
      return h.sim.karts.flatMap((k) => [k.x, k.y, k.z, k.heading]);
    };
    expect(play()).toEqual(play());
  });

  it('usa passo fixo de 1/60 s', () => {
    const h = createHarness();
    h.sim.step();
    expect(h.sim.time).toBeCloseTo(1 / 60, 6);
    expect(h.sim.world.timestep).toBeCloseTo(PHYS.dt, 6);
  });
});

describe('colisões, saltos e recuperação', () => {
  it('karts colidem entre si e trocam impulso', () => {
    const h = createHarness({ opponents: 1 });
    h.start();
    const [a, b] = h.sim.karts as [typeof h.sim.karts[0], typeof h.sim.karts[0]];
    // coloca o adversário parado logo à frente do jogador
    const fx = Math.sin(a.heading), fz = Math.cos(a.heading);
    h.sim.karts[1]!.ai = false;
    b.body.setTranslation({ x: a.x + fx * 14, y: a.y, z: a.z + fz * 14 }, true);
    b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    h.input.throttle = 1;
    h.run(2.2);
    expect(h.events.some((e) => e.type === 'collision')).toBe(true);
    expect(Math.hypot(b.vx, b.vz)).toBeGreaterThan(1);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(PHYS.ballRadius * 2 - 0.2);
  });

  it('muros param o kart (não são atravessados)', () => {
    const h = createHarness({ track: 'cidade-neon' });
    h.start();
    const k = h.sim.player!;
    h.input.throttle = 1; h.input.steer = -1;
    h.run(4);
    const hw = h.sim.track.main.halfWidth[k.mainIndex]!;
    expect(Math.abs(k.lateral)).toBeLessThan(hw + 1.2);
    expect(h.events.some((e) => e.type === 'collision')).toBe(true);
  });

  it('rampas lançam o kart ao ar e ele aterrissa', () => {
    const h = createHarness({ track: 'vale-moinhos' });
    h.start();
    const k = h.sim.player!;
    const ramp = h.sim.track.data.ramps[0]!;
    const sin = Math.sin(ramp.heading), cos = Math.cos(ramp.heading);
    k.body.setTranslation({ x: ramp.pos[0] - sin * 30, y: ramp.pos[1] + PHYS.rideHeight, z: ramp.pos[2] - cos * 30 }, true);
    k.heading = ramp.heading;
    k.pathIndex = k.mainIndex = (ramp.index - 15 + h.sim.track.n) % h.sim.track.n;
    h.input.throttle = 1;
    let maxAir = 0;
    for (let i = 0; i < 240; i++) { h.run(1 / 60); maxAir = Math.max(maxAir, k.airTime); }
    expect(maxAir).toBeGreaterThan(0.3);
    expect(h.events.some((e) => e.type === 'land')).toBe(true);
    expect(k.grounded).toBe(true);
  });

  it('recuperação manual recoloca o kart parado, sem avançar na pista', () => {
    const h = createHarness();
    h.start();
    const k = h.sim.player!;
    h.input.throttle = 1;
    h.run(4);
    const before = k.progress;
    h.input.reset = true;
    h.run(0.1);
    h.input.reset = false;
    expect(h.events.some((e) => e.type === 'respawn' && e.reason === 'manual')).toBe(true);
    expect(k.progress).toBeLessThanOrEqual(before);
    expect(Math.abs(k.speed)).toBeLessThan(0.5);
  });

  it('cair na água ou no vazio reposiciona o kart na pista', () => {
    const h = createHarness({ track: 'jardim-celeste' });
    h.start();
    const k = h.sim.player!;
    k.body.setTranslation({ x: k.x + 200, y: k.y, z: k.z }, true);
    h.run(3);
    expect(h.events.some((e) => e.type === 'respawn' && e.reason === 'fall')).toBe(true);
    expect(k.grounded).toBe(true);
    expect(Math.abs(k.lateral)).toBeLessThan(2);
  });
});
