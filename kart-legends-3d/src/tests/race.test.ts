import { beforeAll, describe, expect, it } from 'vitest';
import { POINTS_BY_POSITION } from '@/data/tracks';
import { rankKarts } from '@/game/racing/progress';
import { PHYS } from '@/game/vehicles/kartTuning';
import { createHarness, initPhysics, ringTrack } from './simHarness';

beforeAll(initPhysics);

/** Teletransporta um kart para uma amostra da pista (só em testes). */
function warp(h: ReturnType<typeof createHarness>, kart: number, index: number, track = true): void {
  const k = h.sim.karts[kart]!;
  const m = h.sim.track.main;
  const i = m.wrap(index);
  k.body.setTranslation({ x: m.pos[i * 3]!, y: m.pos[i * 3 + 1]! + PHYS.rideHeight, z: m.pos[i * 3 + 2]! }, true);
  k.heading = m.heading[i]!;
  if (track) k.pathIndex = k.mainIndex = i;
}

describe('checkpoints e voltas', () => {
  it('valida os checkpoints em ordem e conta a volta ao cruzar a linha', () => {
    const h = createHarness({ data: ringTrack(40, 12), laps: 2 });
    h.follow = true;
    h.start();
    h.input.throttle = 1;
    const k = h.sim.player!;
    const seen: number[] = [];
    let last = 0;
    for (let i = 0; i < 60 * 40 && k.lap < 1; i++) {
      h.run(1 / 60);
      if (k.checkpointsPassed !== last) { last = k.checkpointsPassed; if (last > 0) seen.push(last); }
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(k.lap).toBe(1);
    expect(k.lapTimes).toHaveLength(1);
    expect(h.events.filter((e) => e.type === 'lap')).toHaveLength(1);
  });

  it('cruzar a linha de largada vindo do grid não conta volta', () => {
    const h = createHarness({ data: ringTrack(40, 12) });
    h.follow = true;
    h.start();
    h.input.throttle = 1;
    h.run(3);
    expect(h.sim.player!.mainIndex).toBeLessThan(60);
    expect(h.sim.player!.lap).toBe(0);
  });

  it('cortar caminho (pular checkpoints) não conta volta nem avança na classificação', () => {
    const h = createHarness({ data: ringTrack(40, 12), opponents: 1 });
    h.start();
    const n = h.sim.track.n;
    const cheater = h.sim.player!;
    h.sim.karts[1]!.ai = false;
    // atravessa o miolo do anel direto para perto da chegada, sem validar a busca incremental
    warp(h, 0, n - 6, false);
    h.input.throttle = 1;
    h.follow = false;
    h.run(1.5);
    expect(cheater.lap).toBe(0);
    expect(cheater.checkpointsPassed).toBe(0);
    // mesmo forçando o índice para depois da linha, a volta não vale sem os checkpoints
    warp(h, 0, n - 3, true);
    h.run(1.5);
    expect(cheater.lap).toBe(0);
    expect(cheater.progress).toBeLessThan(n / 2);
  });

  it('andar na contramão não rende progresso e dispara o alerta', () => {
    const h = createHarness({ data: ringTrack(40, 12) });
    h.start();
    const k = h.sim.player!;
    warp(h, 0, 30);
    k.heading += Math.PI;
    h.run(1 / 60);
    h.input.throttle = 1;
    const before = k.progress;
    h.run(3);
    expect(k.progress).toBeLessThanOrEqual(before);
    expect(h.sim.hud().wrongWay).toBe(true);
    expect(h.events.some((e) => e.type === 'wrong_way')).toBe(true);
  });

  it('termina a corrida ao completar as voltas e passa para a fase "finished"', () => {
    const h = createHarness({ data: ringTrack(30, 10), laps: 3 });
    h.follow = true;
    h.start();
    h.input.throttle = 1;
    for (let i = 0; i < 60 * 90 && h.sim.phase !== 'finished'; i++) h.run(1 / 60);
    expect(h.sim.phase).toBe('finished');
    const r = h.sim.result();
    expect(r.playerPosition).toBe(1);
    expect(r.results[0]!.lapTimesMs).toHaveLength(3);
    expect(r.playerTimeMs).toBeCloseTo(r.results[0]!.lapTimesMs.reduce((a, b) => a + b, 0), -1);
    expect(r.playerBestLapMs).toBe(Math.min(...r.results[0]!.lapTimesMs));
    expect(h.events.some((e) => e.type === 'lap' && e.final)).toBe(true);
  });
});

describe('classificação e resultados', () => {
  it('ordena por volta, checkpoints e progresso — não pela distância até a chegada', () => {
    const h = createHarness({ data: ringTrack(40, 12), opponents: 2 });
    h.start();
    const [a, b, c] = h.sim.karts;
    const n = h.sim.track.n;
    // "a" está fisicamente quase na linha de chegada, mas sem ter percorrido a pista; "b" fez meia volta válida
    a!.mainIndex = n - 5; a!.progress = -5; a!.lap = 0;
    b!.progress = n * 0.5; b!.lap = 0;
    c!.progress = n * 1.2; c!.lap = 1;
    rankKarts(h.sim.karts);
    expect([c!.position, b!.position, a!.position]).toEqual([1, 2, 3]);
  });

  it('quem já terminou fica à frente e é ordenado pelo tempo de chegada', () => {
    const h = createHarness({ data: ringTrack(40, 12), opponents: 2 });
    const [a, b, c] = h.sim.karts;
    a!.finished = true; a!.finishTime = 90000;
    b!.finished = true; b!.finishTime = 80000;
    c!.progress = 99999;
    rankKarts(h.sim.karts);
    expect([b!.position, a!.position, c!.position]).toEqual([1, 2, 3]);
  });

  it('uma corrida de 8 pilotos gera 8 posições distintas com a pontuação oficial', () => {
    const h = createHarness({ data: ringTrack(40, 12), opponents: 8, laps: 2, player: false });
    h.start();
    for (let i = 0; i < 60 * 120 && h.sim.karts.some((k) => !k.finished); i++) h.run(1 / 60);
    const r = h.sim.result();
    expect(r.results.map((x) => x.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.results.map((x) => x.points)).toEqual([...POINTS_BY_POSITION]);
    expect(r.results.every((x) => x.totalTimeMs !== null)).toBe(true);
    const times = r.results.map((x) => x.totalTimeMs!);
    expect([...times].sort((x, y) => x - y)).toEqual(times);
  });

  it('quem não cruzou a chegada recebe tempo estimado, depois de quem está à frente', () => {
    const h = createHarness({ data: ringTrack(40, 12), opponents: 8, laps: 2, player: false });
    h.start();
    for (let i = 0; i < 60 * 120 && !h.sim.karts.some((k) => k.finished); i++) h.run(1 / 60);
    const r = h.sim.result();
    const real = r.results.filter((x) => !x.estimated);
    const est = r.results.filter((x) => x.estimated);
    expect(real.length).toBeGreaterThan(0);
    expect(est.length).toBeGreaterThan(0);
    expect(est.every((x) => x.totalTimeMs !== null && x.totalTimeMs > h.sim.raceTime * 1000)).toBe(true);
    const times = r.results.map((x) => x.totalTimeMs!);
    expect([...times].sort((x, y) => x - y)).toEqual(times);
  });

  it('o HUD publica posição, volta, tempo, velocidade e minimapa', () => {
    const h = createHarness({ opponents: 7 });
    h.follow = true;
    h.start();
    h.input.throttle = 1;
    h.run(3);
    const hud = h.sim.hud();
    expect(hud.phase).toBe('racing');
    expect(hud.totalRacers).toBe(8);
    expect(hud.position).toBeGreaterThanOrEqual(1);
    expect(hud.lap).toBe(1);
    expect(hud.totalLaps).toBe(3);
    expect(hud.timeMs).toBeGreaterThan(2900);
    expect(hud.speedKmh).toBeGreaterThan(40);
    expect(hud.minimap).toHaveLength(8);
    expect(hud.minimap.filter((d) => d.isPlayer)).toHaveLength(1);
  });

  it('contrarrelógio corre sozinho e sem itens; treino não termina', () => {
    const tt = createHarness({ mode: 'timetrial' });
    expect(tt.sim.karts).toHaveLength(1);
    expect(tt.sim.items.boxes).toHaveLength(0);
    const tr = createHarness({ data: ringTrack(30, 10), mode: 'training', laps: 99 });
    tr.follow = true;
    tr.start();
    tr.input.throttle = 1;
    tr.run(40);
    expect(tr.sim.player!.lap).toBeGreaterThanOrEqual(3);
    expect(tr.sim.phase).toBe('racing');
  });
});
