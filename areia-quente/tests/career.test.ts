import { describe, it, expect } from 'vitest';
import { roundRobin, newCareer, myFixture, recordMyResult, advance, table, upgrade, boostedTeam, nextSeason, ALL_TEAMS, MAX_ATTR } from '../src/core/Career';

describe('modo carreira', () => {
  it('16 seleções disponíveis', () => {
    expect(ALL_TEAMS).toHaveLength(16);
    expect(new Set(ALL_TEAMS.map((t) => t.id)).size).toBe(16);
  });
  it('liga todos contra todos: 7 rodadas, cada time joga 1 vez por rodada e enfrenta todos', () => {
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rounds = roundRobin(ids);
    expect(rounds).toHaveLength(7);
    const pairs = new Set<string>();
    for (const r of rounds) {
      expect(r).toHaveLength(4);
      const seen = r.flatMap((f) => [f.a, f.b]);
      expect(new Set(seen).size).toBe(8);
      for (const f of r) pairs.add([f.a, f.b].sort().join('-'));
    }
    expect(pairs.size).toBe(28);
  });
  it('temporada completa: liga -> semis -> final -> fim, sem empates', () => {
    const st = newCareer('BRA', 'home');
    let guard = 0;
    while (st.season.phase !== 'done' && guard++ < 20) {
      const f = myFixture(st);
      if (f) recordMyResult(st, { myGoals: 3, oppGoals: 2, extra: false, scorers: { BRA4: 2, BRA7: 1 }, style: 300 });
      else advance(st);
    }
    expect(st.season.phase).toBe('done');
    const t = table(st.season);
    expect(t.reduce((a, r) => a + r.j, 0)).toBe(56);
    expect(t[0].id).toBe('BRA');
    expect(st.season.champion).toBe('BRA');
    expect(st.history[0].champion).toBe(true);
    expect(st.titles.league + st.titles.playoff).toBe(2);
    for (const r of st.season.rounds.flat()) expect(r.ga === r.gb ? r.pa !== r.pb : true).toBe(true);
  });
  it('evolução do elenco respeita pontos e o teto', () => {
    const st = newCareer('JPN', 'home');
    st.points = 50;
    const p = ALL_TEAMS.find((t) => t.id === 'JPN')!.players[4];
    let n = 0;
    while (upgrade(st, p.id, 'chute')) n++;
    expect((p.stats.chute as number) + n).toBe(MAX_ATTR);
    expect(boostedTeam(st).players[4].stats.chute).toBe(MAX_ATTR);
    st.points = 0;
    expect(upgrade(st, p.id, 'passe')).toBe(false);
  });
  it('nova temporada e troca de seleção', () => {
    const st = newCareer('SEN', 'home');
    st.bonus.SEN4 = { chute: 1 };
    nextSeason(st, 'POR');
    expect(st.team).toBe('POR');
    expect(st.season.n).toBe(2);
    expect(st.season.teams).toContain('POR');
    expect(st.bonus).toEqual({});
  });
});
