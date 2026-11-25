import { beforeAll, describe, expect, it } from 'vitest';
import { flowSteps } from '@/app/flow';
import { BATTLE_RULES } from '@/data/battle';
import { coinsForBattle, coinsForRace } from '@/data/shop';
import type { BattleEvent } from '@/game/battle/battleSim';
import { placeKart } from '@/game/vehicles/kartPhysics';
import { PHYS } from '@/game/vehicles/kartTuning';
import { createBattleHarness, type BattleHarness, type BattleHarnessOptions } from './battleHarness';
import { initPhysics } from './simHarness';

beforeAll(initPhysics);

const of = <T extends BattleEvent['type']>(events: BattleEvent[], type: T): Extract<BattleEvent, { type: T }>[] =>
  events.filter((e) => e.type === type) as Extract<BattleEvent, { type: T }>[];

/** Partida só com karts parados (sem IA), para testar as regras isoladamente. */
function still(o: BattleHarnessOptions, count = 4): BattleHarness {
  const h = createBattleHarness({ ...o, count });
  for (const k of h.sim.karts) k.ai = false;
  h.start();
  return h;
}

describe('Estoura-Balão', () => {
  it('golpe estoura um balão e quem acertou rouba um (até 5)', () => {
    const h = still({ game: 'estoura-balao' });
    const s = h.sim;
    expect(s.battlers.every((b) => b.balloons === BATTLE_RULES.balloons.start)).toBe(true);
    s.damage(1, 0);
    expect(s.battlers[1]!.balloons).toBe(2);
    expect(s.battlers[0]!.balloons).toBe(4);
    s.damage(2, 0); s.damage(3, 0);
    expect(s.battlers[0]!.balloons).toBe(BATTLE_RULES.balloons.max);
    const ev = s.drainEvents();
    expect(of(ev, 'balloon_steal').length).toBe(2);
    expect(of(ev, 'balloon_pop').every((e) => e.by === 0)).toBe(true);
  });

  it('sem balões o kart sai da arena; o último de pé vence', () => {
    const h = still({ game: 'estoura-balao' }, 3);
    const s = h.sim;
    for (let i = 0; i < 3; i++) s.damage(1, 0);
    expect(s.battlers[1]!.out).toBe(true);
    expect(s.karts[1]!.y).toBeLessThan(-100);
    expect(s.order().at(-1)).toBe(1);
    for (let i = 0; i < 3; i++) s.damage(2, -1);
    h.run(0.1);
    expect(s.phase).toBe('finished');
    expect(s.result().standings[0]!.racerIndex).toBe(0);
    expect(s.result().standings.map((r) => r.eliminated)).toEqual([false, true, true]);
  });

  it('batida forte (rápido contra parado) estoura o balão de quem apanha', () => {
    const h = still({ game: 'estoura-balao' }, 2);
    const [a, b] = h.sim.karts as [typeof h.sim.karts[0], typeof h.sim.karts[0]];
    const sp = h.sim.arena.spawns[0]!;
    // B parado no chão livre; A vem de 14 m atrás, a toda.
    placeKart(b, sp.pos[0], sp.pos[1] + PHYS.rideHeight, sp.pos[2], sp.heading);
    const back = 14;
    placeKart(a, sp.pos[0] - Math.sin(sp.heading) * back, sp.pos[1] + PHYS.rideHeight, sp.pos[2] - Math.cos(sp.heading) * back, sp.heading);
    a.input.throttle = 1;
    a.boostTime = 3; a.boostTotal = 3; a.boostKind = 4;
    h.run(2);
    expect(h.sim.battlers[1]!.balloons).toBe(2);
    expect(h.sim.battlers[0]!.balloons).toBe(4);
    expect(of(h.events, 'balloon_pop')[0]!.by).toBe(0);
  });

  it('item atinge pela API genérica e o acerto é atribuído ao dono (faísca)', () => {
    const h = still({ game: 'estoura-balao' }, 2);
    const [a, b] = h.sim.karts as [typeof h.sim.karts[0], typeof h.sim.karts[0]];
    const sp = h.sim.arena.spawns[0]!;
    placeKart(b, sp.pos[0] + Math.sin(sp.heading) * 22, sp.pos[1] + PHYS.rideHeight, sp.pos[2] + Math.cos(sp.heading) * 22, sp.heading);
    placeKart(a, sp.pos[0], sp.pos[1] + PHYS.rideHeight, sp.pos[2], sp.heading);
    h.run(2.5); // passa a proteção de largada
    h.sim.giveItem(0, 'faisca-rastreadora');
    a.input.item = true;
    h.run(0.1);
    a.input.item = false;
    h.run(3);
    const pops = of(h.events, 'balloon_pop');
    expect(pops.length).toBe(1);
    expect(pops[0]!.kart).toBe(1);
    expect(pops[0]!.by).toBe(0);
  });

  it('cair da arena custa um balão e o kart volta num ponto de largada', () => {
    const h = still({ game: 'estoura-balao' }, 2);
    const k = h.sim.karts[0]!;
    placeKart(k, 0, h.sim.arena.killY - 5, 0, 0);
    h.run(0.1);
    expect(of(h.events, 'respawn').some((e) => e.kart === 0 && e.reason === 'fall')).toBe(true);
    expect(h.sim.battlers[0]!.balloons).toBe(2);
    expect(k.y).toBeGreaterThan(h.sim.arena.killY + 5);
  });

  it('no fim do tempo vence quem tem mais balões', () => {
    const h = still({ game: 'estoura-balao' }, 3);
    h.sim.damage(1, 2);
    h.sim.matchTime = BATTLE_RULES.balloons.duration - 0.5;
    h.run(1);
    expect(h.sim.phase).toBe('finished');
    expect(h.sim.result().standings.map((s) => s.racerIndex)).toEqual([2, 0, 1]);
  });
});

describe('Caça-Cristais', () => {
  it('pega cristais, larga metade ao ser atingido e não pega os próprios de volta na hora', () => {
    const h = still({ game: 'caca-cristais' }, 2);
    const s = h.sim;
    expect(s.crystals.length).toBeGreaterThanOrEqual(6);
    const k = s.karts[0]!;
    const take = (): void => {
      const c = s.crystals.find((q) => q.lock <= 0)!;
      placeKart(k, c.x, c.y - 0.9 + PHYS.rideHeight + 0.1, c.z, 0);
      h.run(0.1);
    };
    for (let i = 0; i < 5; i++) take();
    expect(s.battlers[0]!.crystals).toBe(5);
    const field = s.crystals.length;
    s.damage(0, 1);
    expect(s.battlers[0]!.crystals).toBe(2);
    expect(s.crystals.length).toBe(field + 3);
    h.run(0.8); // voo e trava curtos
    expect(s.battlers[0]!.crystals).toBe(2);
    expect(of(h.events, 'crystal_pickup').length).toBe(5);
  });

  it('frenesi nos últimos 30 s e fim de partida no tempo', () => {
    const h = still({ game: 'caca-cristais' }, 2);
    h.sim.matchTime = BATTLE_RULES.crystals.duration - 31;
    h.run(2);
    expect(h.sim.frenzy).toBe(true);
    expect(of(h.events, 'frenzy').length).toBe(1);
    const before = h.sim.crystals.length;
    h.run(10);
    expect(h.sim.crystals.length).toBeGreaterThan(before + 8);
    h.run(25);
    expect(h.sim.phase).toBe('finished');
  });
});

describe('Rei da Coroa', () => {
  it('pegar, pontuar, ficar mais lento, ser roubado e derrubar a coroa', () => {
    const h = still({ game: 'rei-da-coroa' }, 3);
    const s = h.sim;
    expect(s.crown.active).toBe(true);
    const k = s.karts[0]!;
    const top = k.tuning.topSpeed;
    placeKart(k, s.crown.x, s.crown.y - 1.2 + PHYS.rideHeight + 0.1, s.crown.z, 0);
    h.run(0.1);
    expect(s.crown.holder).toBe(0);
    expect(k.tuning.topSpeed).toBeCloseTo(top * BATTLE_RULES.crown.holderSpeed);
    h.run(5);
    expect(s.scoreOf(0)).toBe(5);
    s.damage(0, 1);
    expect(s.crown.holder).toBe(1);
    expect(k.tuning.topSpeed).toBe(top);
    s.damage(1, -1);
    expect(s.crown.holder).toBe(-1);
    expect(of(s.drainEvents(), 'crown_drop').length).toBe(1);
  });

  it('chegar a 60 pontos encerra a partida', () => {
    const h = still({ game: 'rei-da-coroa' }, 2);
    const s = h.sim;
    const k = s.karts[1]!;
    placeKart(k, s.crown.x, s.crown.y - 1.2 + PHYS.rideHeight + 0.1, s.crown.z, 0);
    h.run(0.1);
    s.battlers[1]!.crownTime = BATTLE_RULES.crown.target - 0.5;
    h.run(1);
    expect(s.phase).toBe('finished');
    expect(s.result().standings[0]!.racerIndex).toBe(1);
    expect(s.result().standings[0]!.score).toBe(BATTLE_RULES.crown.target);
  });
});

describe('determinismo e integração', () => {
  it('mesma semente, mesma partida (IA, itens, física)', () => {
    const run = (): string => {
      const h = createBattleHarness({ game: 'estoura-balao', arena: 'cratera-lunar', seed: 42 });
      h.start();
      h.run(40);
      return JSON.stringify([h.sim.karts.map((k) => [k.x.toFixed(4), k.z.toFixed(4), k.item]), h.sim.battlers, h.events.length]);
    };
    expect(run()).toBe(run());
  });

  it('fluxo de telas, moedas da batalha (menores que as da corrida)', () => {
    expect(flowSteps('battle')).toEqual(['menu', 'mode', 'battleGame', 'arena', 'difficulty', 'character', 'kart']);
    const first = coinsForBattle({ difficulty: 'normal', position: 1, racers: 8 });
    expect(first).toBeGreaterThan(coinsForBattle({ difficulty: 'normal', position: 8, racers: 8 }));
    expect(first).toBeLessThan(coinsForRace({ mode: 'quick', difficulty: 'normal', position: 1, finished: true, trophy: null, timeTrialRecord: false }));
    expect(coinsForBattle({ difficulty: 'hard', position: 1, racers: 8 })).toBeGreaterThan(first);
    expect(coinsForRace({ mode: 'battle', difficulty: 'normal', position: 1, finished: true, trophy: null, timeTrialRecord: false })).toBe(0);
  });
});
