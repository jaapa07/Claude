import { beforeAll, describe, expect, it } from 'vitest';
import { SECOND_PLAYER_GRACE } from '@/game/racing/raceSim';
import { createBattleHarness } from './battleHarness';
import { createHarness, initPhysics, ringTrack } from './simHarness';

beforeAll(initPhysics);

/** Tela dividida: dois humanos na mesma simulação (Jogador 1 e Jogador 2). */
describe('corrida com dois jogadores', () => {
  it('cada humano recebe os próprios comandos pela vaga', () => {
    const h = createHarness({ data: ringTrack(40, 12), humans: 2, opponents: 2 });
    const [p1, p2] = h.sim.players;
    expect(h.sim.players).toHaveLength(2);
    expect([p1!.slot, p2!.slot]).toEqual([0, 1]);
    expect(h.sim.player).toBe(p1);
    h.start();
    h.inputs[1]!.throttle = 1;
    h.run(2);
    expect(Math.abs(p1!.speed)).toBeLessThan(1);
    expect(p2!.speed).toBeGreaterThan(8);
  });

  it('a corrida só termina quando os dois chegam; HUD, alertas e resultado são por jogador', () => {
    const h = createHarness({ data: ringTrack(30, 10), humans: 2, opponents: 2, laps: 2, seed: 11 });
    const [p1, p2] = h.sim.players as [typeof h.sim.players[0], typeof h.sim.players[0]];
    h.start();
    p1.ai = true; // Jogador 1 no piloto automático desde a largada
    h.run(4);
    p2.ai = true; // Jogador 2 só depois: chega atrás
    for (let i = 0; i < 60 * 120 && !p1.finished; i++) h.run(1 / 60);
    expect(p1.finished).toBe(true);
    expect(p2.finished).toBe(false);
    expect(h.sim.phase).toBe('racing');
    const hud1 = h.sim.hud(0), hud2 = h.sim.hud(1);
    expect(hud1.finished).toBe(true);
    expect(hud2.finished).toBe(false);
    expect(hud1.slot).toBe(0);
    expect(hud2.slot).toBe(1);
    expect(hud1.alerts.some((a) => a.text === 'CHEGADA!')).toBe(true);
    expect(hud2.alerts.some((a) => a.text === 'CHEGADA!')).toBe(false);
    expect(hud1.minimap.filter((d) => d.me).map((d) => d.characterId)).toEqual([p1.characterId]);
    expect(hud2.minimap.filter((d) => d.me).map((d) => d.characterId)).toEqual([p2.characterId]);
    expect(hud1.minimap.filter((d) => d.isPlayer)).toHaveLength(2);

    for (let i = 0; i < 60 * 120 && h.sim.phase !== 'finished'; i++) h.run(1 / 60);
    expect(h.sim.phase).toBe('finished');
    const r = h.sim.result();
    expect(r.players).toHaveLength(2);
    const [o1, o2] = r.players!;
    expect(o1!.slot).toBe(0);
    expect(o2!.slot).toBe(1);
    expect(o1!.position).toBeLessThan(o2!.position);
    expect(o1!.timeMs).not.toBeNull();
    expect(o2!.timeMs).not.toBeNull();
    expect(o2!.timeMs!).toBeGreaterThan(o1!.timeMs!);
    // compatibilidade: os campos "player" continuam sendo os do Jogador 1
    expect(r.playerPosition).toBe(o1!.position);
    expect(r.playerTimeMs).toBe(o1!.timeMs);
    const humans = r.results.filter((x) => x.isPlayer);
    expect(humans.map((x) => x.slot).sort()).toEqual([0, 1]);
    expect(r.results.filter((x) => !x.isPlayer).every((x) => x.slot === undefined)).toBe(true);
    expect(new Set(r.results.map((x) => x.position)).size).toBe(r.results.length);
  });

  it('quem não chega até o prazo depois do primeiro é classificado pelo progresso', () => {
    const h = createHarness({ data: ringTrack(30, 10), humans: 2, laps: 1, seed: 3 });
    const [p1, p2] = h.sim.players as [typeof h.sim.players[0], typeof h.sim.players[0]];
    h.start();
    p1.ai = true;
    for (let i = 0; i < 60 * 60 && !p1.finished; i++) h.run(1 / 60);
    expect(p1.finished).toBe(true);
    h.run(SECOND_PLAYER_GRACE - 1);
    expect(h.sim.phase).toBe('racing');
    h.run(2);
    expect(h.sim.phase).toBe('finished');
    const r = h.sim.result();
    expect(r.players![0]!.position).toBe(1);
    expect(r.players![1]!.timeMs).toBeNull();
    expect(p2.finished).toBe(false);
  });

  it('a recuperação manual de um jogador não bloqueia a do outro', () => {
    const h = createHarness({ data: ringTrack(40, 12), humans: 2 });
    h.start();
    h.inputs[0]!.reset = true;
    h.inputs[1]!.reset = true;
    h.run(0.1);
    expect(h.events.filter((e) => e.type === 'respawn' && e.reason === 'manual').map((e) => ('kart' in e ? e.kart : -1)).sort()).toEqual([0, 1]);
  });
});

describe('batalha com dois jogadores', () => {
  it('alertas do ponto de vista de cada um, espectador segue o outro jogador e resultado com os dois', () => {
    const h = createBattleHarness({ game: 'estoura-balao', player: true, humans: 2, count: 4 });
    for (const k of h.sim.karts) k.ai = false;
    h.start();
    const s = h.sim;
    expect(s.players.map((k) => k.slot)).toEqual([0, 1]);
    s.damage(1, 0);
    h.run(0.05);
    expect(s.hud(0).alerts.map((a) => a.text)).toContain(`Você estourou o balão de ${s.nameOf(1)}!`);
    expect(s.hud(1).alerts.map((a) => a.text)).toContain(`${s.nameOf(0)} estourou seu balão!`);
    expect(s.hud(0).balloons).toBe(4);
    expect(s.hud(1).balloons).toBe(2);
    expect(s.hud(1).board.find((r) => r.me)!.index).toBe(1);
    expect(s.hud(0).board.filter((r) => r.isPlayer).map((r) => r.slot).sort()).toEqual([0, 1]);

    s.damage(1, 2); s.damage(1, 2);
    expect(s.battlers[1]!.out).toBe(true);
    expect(s.focusIndex(1)).toBe(0); // o Jogador 2 eliminado assiste ao Jogador 1
    expect(s.hud(1).out).toBe(true);
    expect(s.hud(1).spectating).toBe(s.karts[0]!.characterId);
    expect(s.hud(0).out).toBe(false);
    expect(s.allHumansOut()).toBe(false);
    expect(s.hud(0).alerts.map((a) => a.text)).toContain(`${s.nameOf(1)} está fora!`);
    expect(s.hud(1).alerts.map((a) => a.text)).toContain('Você está fora!');

    for (let i = 0; i < 3; i++) s.damage(3, 0);
    for (let i = 0; i < 5; i++) s.damage(2, -1);
    h.run(0.1);
    expect(s.phase).toBe('finished');
    const r = s.result();
    expect(r.players).toHaveLength(2);
    expect(r.players![0]!.position).toBe(1);
    expect(r.players![1]!.position).toBeGreaterThan(1);
    expect(r.standings.find((x) => x.racerIndex === 1)!.slot).toBe(1);
    expect(r.playerPosition).toBe(1);
    expect(s.hud(0).alerts.map((a) => a.text)).toContain('VOCÊ VENCEU!');
    expect(s.hud(1).alerts.map((a) => a.text)).toContain(`${s.nameOf(0).toUpperCase()} VENCEU!`);
  });

  it('cada humano dirige o próprio kart na arena', () => {
    const h = createBattleHarness({ game: 'caca-cristais', player: true, humans: 2, count: 4 });
    h.start();
    h.inputs[0]!.throttle = 1;
    h.run(1.5);
    expect(h.sim.players[0]!.speed).toBeGreaterThan(5);
    expect(Math.abs(h.sim.players[1]!.speed)).toBeLessThan(1);
  });
});
