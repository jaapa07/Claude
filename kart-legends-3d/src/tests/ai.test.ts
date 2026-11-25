import { beforeAll, describe, expect, it } from 'vitest';
import { TRACK_IDS, type Difficulty, type TrackId } from '@/data/ids';
import { AI_PROFILES } from '@/game/ai/aiDriver';
import type { SimEvent } from '@/game/racing/events';
import { PHYS } from '@/game/vehicles/kartTuning';
import { createHarness, initPhysics } from './simHarness';

beforeAll(initPhysics);

interface RaceReport { finished: number; times: number[]; events: SimEvent[]; maxStep: number; maxSpeedRatio: number; shortcutSteps: number; raceTime: number }

/** Corrida completa só com IA (8 pilotos, 3 voltas), medindo o que os testes precisam. */
async function aiRace(track: TrackId, difficulty: Difficulty, seed = 11): Promise<RaceReport> {
  const h = createHarness({ track, opponents: 8, player: false, difficulty, seed });
  h.start();
  let maxStep = 0, maxSpeedRatio = 0, shortcutSteps = 0;
  const sim = h.sim;
  let steps = 0;
  while (sim.karts.some((k) => !k.finished) && sim.raceTime < 330) {
    // cede o controle de tempos em tempos para o executor de testes não acusar tempo esgotado
    if (++steps % 1500 === 0) await new Promise((r) => setTimeout(r, 0));
    sim.step();
    const ev = sim.drainEvents();
    h.events.push(...ev);
    const respawned = new Set(ev.filter((e) => e.type === 'respawn').map((e) => (e.type === 'respawn' ? e.kart : -1)));
    for (const k of sim.karts) {
      if (k.pathId >= 0) shortcutSteps++;
      if (respawned.has(k.index)) continue;
      maxStep = Math.max(maxStep, Math.hypot(k.x - k.px, k.y - k.py, k.z - k.pz));
      maxSpeedRatio = Math.max(maxSpeedRatio, k.speed / (k.tuning.topSpeed * PHYS.boostSpeed));
    }
  }
  const res = sim.result();
  return {
    finished: res.results.filter((r) => r.totalTimeMs !== null && !r.estimated).length,
    times: res.results.map((r) => r.estimated ? Infinity : r.totalTimeMs ?? Infinity), events: h.events, maxStep, maxSpeedRatio, shortcutSteps, raceTime: sim.raceTime,
  };
}

const reports = new Map<TrackId, Promise<RaceReport>>();
const normal = (t: TrackId): Promise<RaceReport> => {
  let r = reports.get(t);
  if (!r) { r = aiRace(t, 'normal'); reports.set(t, r); }
  return r;
};

describe('adversários: completam corridas em todas as pistas', () => {
  it.each([...TRACK_IDS])('%s — os 8 pilotos de IA completam 3 voltas', async (track) => {
    const r = await normal(track);
    expect(r.finished).toBe(8);
    expect(Math.max(...r.times)).toBeLessThan(5 * 60 * 1000);
    expect(r.events.filter((e) => e.type === 'lap')).toHaveLength(24);
  });

  it.each([...TRACK_IDS])('%s — ninguém fica preso em obstáculos (poucas recuperações forçadas)', async (track) => {
    const stuck = (await normal(track)).events.filter((e) => e.type === 'respawn' && e.reason === 'stuck').length;
    expect(stuck).toBeLessThanOrEqual(6);
  });
});

describe('adversários: usam os mesmos sistemas que o jogador', () => {
  it('não se teletransportam: o deslocamento por passo é compatível com a física', async () => {
    for (const t of ['porto-lanternas', 'cidade-neon', 'jardim-celeste'] as const) {
      // velocidade máxima plausível (turbo + queda) em 1/60 s
      expect((await normal(t)).maxStep).toBeLessThan(1.1);
    }
  });

  it('não ultrapassam a velocidade máxima com turbo do próprio kart (salvo o ganho de ladeiras)', async () => {
    for (const t of TRACK_IDS) expect((await normal(t)).maxSpeedRatio).toBeLessThan(1.2);
  });

  it('derrapam, soltam miniturbos, usam itens e pegam atalhos', async () => {
    const all: RaceReport[] = [];
    for (const t of TRACK_IDS) all.push(await aiRace(t, 'hard', 5));
    const count = (type: SimEvent['type']): number => all.reduce((s, r) => s + r.events.filter((e) => e.type === type).length, 0);
    expect(count('drift_start')).toBeGreaterThan(80);
    expect(count('turbo')).toBeGreaterThan(60);
    expect(count('item_use')).toBeGreaterThan(150);
    expect(count('boost_pad')).toBeGreaterThan(100);
    expect(all.reduce((s, r) => s + r.shortcutSteps, 0)).toBeGreaterThan(2000);
    const items = new Set(all.flatMap((r) => r.events.filter((e) => e.type === 'item_use').map((e) => (e.type === 'item_use' ? e.item : ''))));
    expect(items.size).toBe(8);
  });

  it('desviam de obstáculos móveis na maior parte das vezes', async () => {
    const r = await normal('fortaleza-tempestade');
    const hits = r.events.filter((e) => e.type === 'hit' && e.cause === 'obstaculo').length;
    // 8 pilotos × 3 voltas × 4 obstáculos = 96 passagens
    expect(hits).toBeLessThan(40);
  });
});

describe('níveis de dificuldade', () => {
  it('os perfis são progressivos e não dão vantagens físicas', () => {
    const { easy, normal: n, hard } = AI_PROFILES;
    expect(easy.speed).toBeLessThan(n.speed);
    expect(n.speed).toBeLessThan(hard.speed);
    expect(hard.speed).toBeLessThanOrEqual(1);
    expect(easy.drift).toBeLessThan(hard.drift);
    expect(easy.reaction).toBeGreaterThan(hard.reaction);
  });

  it.each(['vale-moinhos', 'canion-solar', 'porto-lanternas'] as const)('%s — o ritmo do piloto (sozinho, sem itens) cresce de Fácil para Normal para Difícil', async (track) => {
    // Medido sem tráfego: num pelotão, a troca de itens entre os próprios adversários mascara o ritmo.
    const pace = async (d: Difficulty): Promise<number> => {
      const h = createHarness({ track, opponents: 1, player: false, difficulty: d, mode: 'timetrial', seed: 3 });
      h.start();
      let steps = 0;
      while (!h.sim.karts[0]!.finished && h.sim.raceTime < 330) {
        if (++steps % 1500 === 0) await new Promise((r) => setTimeout(r, 0));
        h.sim.step();
        h.sim.drainEvents();
      }
      expect(h.sim.karts[0]!.finished).toBe(true);
      return h.sim.karts[0]!.finishTime;
    };
    const easy = await pace('easy'), mid = await pace('normal'), hard = await pace('hard');
    expect(easy).toBeGreaterThan(mid + 3000);
    expect(mid).toBeGreaterThan(hard + 1000);
  });
});
