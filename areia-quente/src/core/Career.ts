import TEAMS from '../data/teams.json';

/** Modo Carreira: temporadas com liga (pontos corridos, sem empate), playoffs, evolução do elenco,
 *  metas da diretoria, reputação e convites de outras seleções. Lógica pura + persistência no navegador. */
export type TeamData = (typeof TEAMS.teams)[number];
export const ALL_TEAMS = TEAMS.teams as TeamData[];
export const ATTRS = ['chute', 'passe', 'tecnica', 'velocidade', 'defesa', 'folego'] as const;
export type Attr = (typeof ATTRS)[number];
export const MAX_ATTR = 6;

export type Fixture = { a: string; b: string; ga?: number; gb?: number; extra?: boolean; pa?: number; pb?: number; played?: boolean };
export type Row = { id: string; j: number; v: number; vp: number; d: number; gp: number; gc: number; pts: number };
export type Season = {
  n: number; teams: string[]; rounds: Fixture[][]; round: number;
  phase: 'league' | 'semis' | 'final' | 'done';
  semis: Fixture[]; final: Fixture | null; champion?: string; leagueChampion?: string;
  objective: 'top4' | 'final' | 'champion' | 'top6'; scorers: Record<string, number>;
  strength: Record<string, number>; // força das seleções da CPU nesta temporada
};
export type CareerState = {
  team: string; kit: 'home' | 'away'; coach: string; season: Season;
  bonus: Record<string, Partial<Record<Attr, number>>>; // por id de jogador
  points: number; reputation: number;
  history: { n: number; team: string; pos: number; champion: boolean; leagueChampion: boolean; goals: number; objective: boolean }[];
  titles: { league: number; playoff: number };
  offers: string[];
};

const OBJ_LABEL: Record<Season['objective'], string> = { top6: 'Terminar a liga entre os 6', top4: 'Chegar aos playoffs (top 4)', final: 'Chegar à final', champion: 'Ser campeão' };
export const objectiveLabel = (o: Season['objective']) => OBJ_LABEL[o];
export const teamById = (id: string) => ALL_TEAMS.find((t) => t.id === id)!;

function rng(seed: number) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Tabela "todos contra todos" (método do círculo): 8 times -> 7 rodadas de 4 jogos. */
export function roundRobin(ids: string[]): Fixture[][] {
  const t = [...ids];
  if (t.length % 2) t.push('—');
  const n = t.length, rounds: Fixture[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const games: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a !== '—' && b !== '—') games.push(r % 2 ? { a: b, b: a } : { a, b });
    }
    rounds.push(games);
    t.splice(1, 0, t.pop()!);
  }
  return rounds;
}

export function teamPower(id: string, st?: CareerState) {
  const t = teamById(id);
  const s = t.stats;
  let p = s.ataque + s.defesa + s.tecnica + s.velocidade;
  if (st && id === st.team) {
    const ps = t.players.map((pl) => ATTRS.reduce((acc, a) => acc + (pl.stats as any)[a] + (st.bonus[pl.id]?.[a] ?? 0), 0) / ATTRS.length);
    p = (ps.reduce((a, b) => a + b, 0) / ps.length) * 4;
  } else if (st) p += st.season.strength[id] ?? 0;
  return p;
}

/** Simula uma partida da CPU (sem empate: prorrogação/pênaltis). */
export function simulate(f: Fixture, st: CareerState, r = Math.random) {
  const pa = teamPower(f.a, st), pb = teamPower(f.b, st);
  const goals = (atk: number, def: number) => Math.max(0, Math.round(2.6 + (atk - def) * 0.35 + (r() * 4 - 1.6)));
  f.ga = goals(pa, pb); f.gb = goals(pb, pa);
  if (f.ga === f.gb) { f.extra = true; if (r() < 0.4) { (r() < pa / (pa + pb) ? (f.ga += 1) : (f.gb += 1)); } else { f.pa = 3 + (r() < 0.4 ? 1 : 0); f.pb = f.pa - 1 - (r() < 0.3 ? 1 : 0); if (r() > pa / (pa + pb)) [f.pa, f.pb] = [f.pb, f.pa]; } }
  f.played = true;
  // artilheiros fictícios da CPU
  for (const [id, g] of [[f.a, f.ga], [f.b, f.gb]] as [string, number][]) {
    if (id === st.team) continue;
    const t = teamById(id);
    for (let i = 0; i < g; i++) { const p = t.players[[4, 3, 2, 1, 7, 8][Math.floor(r() * 6)]]; st.season.scorers[p.id] = (st.season.scorers[p.id] ?? 0) + 1; }
  }
}

export const winnerOf = (f: Fixture) => (f.ga! > f.gb! ? f.a : f.gb! > f.ga! ? f.b : (f.pa ?? 0) >= (f.pb ?? 0) ? f.a : f.b);

export function table(s: Season): Row[] {
  const rows = new Map<string, Row>(s.teams.map((id) => [id, { id, j: 0, v: 0, vp: 0, d: 0, gp: 0, gc: 0, pts: 0 }]));
  for (const round of s.rounds) for (const f of round) {
    if (!f.played) continue;
    const A = rows.get(f.a)!, B = rows.get(f.b)!;
    A.j++; B.j++; A.gp += f.ga!; A.gc += f.gb!; B.gp += f.gb!; B.gc += f.ga!;
    const w = winnerOf(f), W = w === f.a ? A : B, L = w === f.a ? B : A;
    if (f.extra) { W.vp++; W.pts += 2; } else { W.v++; W.pts += 3; }
    L.d++;
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.gp - y.gc) - (x.gp - x.gc) || y.gp - x.gp || x.id.localeCompare(y.id));
}

export function newSeason(n: number, myTeam: string, reputation: number, seed = Date.now()): Season {
  const r = rng(seed);
  const others = ALL_TEAMS.map((t) => t.id).filter((id) => id !== myTeam).sort(() => r() - 0.5).slice(0, 7);
  const teams = [myTeam, ...others].sort(() => r() - 0.5);
  const strength: Record<string, number> = {};
  for (const id of teams) strength[id] = Math.round((r() * 2 - 1) * 10) / 10 + (n - 1) * 0.15; // a CPU evolui a cada temporada
  const objective: Season['objective'] = reputation >= 75 ? 'champion' : reputation >= 55 ? 'final' : reputation >= 35 ? 'top4' : 'top6';
  return { n, teams, rounds: roundRobin(teams), round: 0, phase: 'league', semis: [], final: null, objective, scorers: {}, strength };
}

export function newCareer(team: string, kit: 'home' | 'away', coach = 'Técnico'): CareerState {
  return { team, kit, coach, season: newSeason(1, team, 30), bonus: {}, points: 3, reputation: 30, history: [], titles: { league: 0, playoff: 0 }, offers: [] };
}

/** Partida do jogador nesta etapa (ou null se já jogou / foi eliminado). */
export function myFixture(st: CareerState): Fixture | null {
  const s = st.season;
  if (s.phase === 'league') return s.rounds[s.round]?.find((f) => (f.a === st.team || f.b === st.team) && !f.played) ?? null;
  if (s.phase === 'semis') return s.semis.find((f) => (f.a === st.team || f.b === st.team) && !f.played) ?? null;
  if (s.phase === 'final') return s.final && (s.final.a === st.team || s.final.b === st.team) && !s.final.played ? s.final : null;
  return null;
}

/** Registra o resultado do jogador, simula os demais jogos da etapa e avança a fase. Devolve os pontos de evolução ganhos. */
export function recordMyResult(st: CareerState, res: { myGoals: number; oppGoals: number; myPens?: number; oppPens?: number; extra: boolean; scorers: Record<string, number>; style: number }) {
  const f = myFixture(st);
  if (!f) return 0;
  const meA = f.a === st.team;
  f.ga = meA ? res.myGoals : res.oppGoals; f.gb = meA ? res.oppGoals : res.myGoals;
  if (res.extra) { f.extra = true; if (res.myPens !== undefined) { f.pa = meA ? res.myPens : res.oppPens; f.pb = meA ? res.oppPens : res.myPens; } }
  f.played = true;
  for (const [id, g] of Object.entries(res.scorers)) st.season.scorers[id] = (st.season.scorers[id] ?? 0) + g;
  const won = winnerOf(f) === st.team;
  const pts = (won ? 3 : 1) + Math.min(3, res.myGoals) + Math.min(2, Math.floor(res.style / 250));
  st.points += pts;
  advance(st);
  return pts;
}

/** Simula o que falta da etapa atual e avança (liga -> semis -> final -> fim). */
export function advance(st: CareerState) {
  const s = st.season;
  if (s.phase === 'league') {
    const round = s.rounds[s.round];
    if (round.some((f) => (f.a === st.team || f.b === st.team) && !f.played)) return;
    for (const f of round) if (!f.played) simulate(f, st);
    s.round++;
    if (s.round >= s.rounds.length) {
      const t = table(s);
      s.leagueChampion = t[0].id;
      s.semis = [{ a: t[0].id, b: t[3].id }, { a: t[1].id, b: t[2].id }];
      s.phase = 'semis';
      if (!myFixture(st)) advance(st);
    }
  } else if (s.phase === 'semis') {
    if (myFixture(st)) return;
    for (const f of s.semis) if (!f.played) simulate(f, st);
    s.final = { a: winnerOf(s.semis[0]), b: winnerOf(s.semis[1]) };
    s.phase = 'final';
    if (!myFixture(st)) advance(st);
  } else if (s.phase === 'final') {
    if (myFixture(st)) return;
    if (!s.final!.played) simulate(s.final!, st);
    s.champion = winnerOf(s.final!);
    s.phase = 'done';
    endSeason(st);
  }
}

function endSeason(st: CareerState) {
  const s = st.season;
  const pos = table(s).findIndex((r) => r.id === st.team) + 1;
  const reachedFinal = !!s.final && (s.final.a === st.team || s.final.b === st.team);
  const champion = s.champion === st.team, leagueChampion = s.leagueChampion === st.team;
  const ok = s.objective === 'top6' ? pos <= 6 : s.objective === 'top4' ? pos <= 4 : s.objective === 'final' ? reachedFinal : champion;
  const goals = Object.entries(s.scorers).filter(([id]) => id.startsWith(st.team)).reduce((a, [, g]) => a + g, 0);
  st.history.push({ n: s.n, team: st.team, pos, champion, leagueChampion, goals, objective: ok });
  if (champion) st.titles.playoff++;
  if (leagueChampion) st.titles.league++;
  st.reputation = Math.max(0, Math.min(100, st.reputation + (ok ? 12 : -8) + (champion ? 10 : 0) + (leagueChampion ? 5 : 0)));
  st.points += ok ? 4 : 1;
  // convites: seleções mais fortes se a reputação permite
  const mine = teamPower(st.team);
  st.offers = ok ? ALL_TEAMS.filter((t) => t.id !== st.team && teamPower(t.id) >= mine - 1 + st.reputation / 40).sort(() => Math.random() - 0.5).slice(0, 2).map((t) => t.id) : [];
}

export function nextSeason(st: CareerState, moveTo?: string) {
  if (moveTo && moveTo !== st.team) { st.team = moveTo; st.bonus = {}; st.kit = 'home'; }
  st.season = newSeason(st.season.n + 1, st.team, st.reputation);
  st.offers = [];
}

/** Gasta 1 ponto de evolução num atributo de um jogador. */
export function upgrade(st: CareerState, playerId: string, a: Attr) {
  const p = teamById(st.team).players.find((x) => x.id === playerId);
  if (!p || st.points <= 0) return false;
  const cur = (p.stats as any)[a] + (st.bonus[playerId]?.[a] ?? 0);
  if (cur >= MAX_ATTR) return false;
  st.bonus[playerId] = { ...st.bonus[playerId], [a]: (st.bonus[playerId]?.[a] ?? 0) + 1 };
  st.points--;
  return true;
}

/** Dados da seleção do jogador com os atributos evoluídos (usados na partida). */
export function boostedTeam(st: CareerState): TeamData {
  const t = structuredClone(teamById(st.team));
  for (const p of t.players) for (const a of ATTRS) (p.stats as any)[a] = Math.min(MAX_ATTR, (p.stats as any)[a] + (st.bonus[p.id]?.[a] ?? 0));
  return t;
}

export const careerStore = {
  load(): CareerState | null { try { const s = localStorage.getItem('aq.career'); return s ? JSON.parse(s) : null; } catch { return null; } },
  save(c: CareerState | null) { try { c ? localStorage.setItem('aq.career', JSON.stringify(c)) : localStorage.removeItem('aq.career'); } catch { /* sem armazenamento */ } },
};
