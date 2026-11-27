// Career mode ("Circuito"): your own player climbs the world ranking through Challengers, GOLD tour events and
// Grand Slams (singles and doubles), plays friendlies, trains and spends attribute points.
import { PLAYERS, VENUES, type PlayerDef, type VenueDef, type DifficultyId } from '../data/content';

export type Category = 'challenger' | 'gold250' | 'gold500' | 'gold1000' | 'slam';
export interface EventDef {
  id: string; name: string; category: Category; venue: VenueDef['id']; doubles: boolean;
  rounds: number; // 3 = QF/SF/F, 4 = R16..F, 5 = R32..F
  minRank: number; // entry requirement (ranking <= minRank)
}

export const CATEGORY: Record<Category, { label: string; points: number[]; prize: number[]; games: number; diff: DifficultyId[]; field: [number, number] }> = {
  // points/prize per round reached (index = rounds won); last = champion
  challenger: { label: 'CHALLENGER', points: [5, 12, 30, 60, 100], prize: [300, 800, 1600, 3000, 6000], games: 2, diff: ['easy', 'easy', 'normal', 'normal', 'normal'], field: [120, 320] },
  gold250: { label: 'GOLD 250', points: [10, 25, 50, 100, 250], prize: [1000, 2500, 5000, 9000, 18000], games: 3, diff: ['normal', 'normal', 'normal', 'hard', 'hard'], field: [40, 140] },
  gold500: { label: 'GOLD 500', points: [20, 45, 90, 200, 500], prize: [2000, 5000, 10000, 20000, 40000], games: 3, diff: ['normal', 'normal', 'hard', 'hard', 'hard'], field: [15, 70] },
  gold1000: { label: 'GOLD 1000', points: [45, 90, 180, 360, 600, 1000], prize: [5000, 10000, 20000, 40000, 80000, 160000], games: 3, diff: ['normal', 'hard', 'hard', 'hard', 'hard', 'boss'], field: [5, 40] },
  slam: { label: 'GRAND SLAM', points: [90, 180, 360, 720, 1200, 2000], prize: [20000, 40000, 80000, 160000, 320000, 800000], games: 4, diff: ['normal', 'hard', 'hard', 'hard', 'boss', 'boss'], field: [1, 32] },
};

export const SEASON: EventDef[] = [
  { id: 'c1', name: 'Challenger Porto Azul', category: 'challenger', venue: 'harbor', doubles: false, rounds: 3, minRank: 999 },
  { id: 'c2', name: 'Challenger Vale Rubro (Duplas)', category: 'challenger', venue: 'clay', doubles: true, rounds: 3, minRank: 999 },
  { id: 'g1', name: 'Harbor Open', category: 'gold250', venue: 'harbor', doubles: false, rounds: 4, minRank: 180 },
  { id: 'c3', name: 'Challenger Bramblewood', category: 'challenger', venue: 'lawn', doubles: false, rounds: 3, minRank: 999 },
  { id: 's1', name: 'Grand Slam do Porto', category: 'slam', venue: 'harbor', doubles: false, rounds: 5, minRank: 90 },
  { id: 'g2', name: 'Terre Rouge Cup', category: 'gold500', venue: 'clay', doubles: false, rounds: 4, minRank: 110 },
  { id: 'g3', name: 'Terre Rouge Duplas', category: 'gold250', venue: 'clay', doubles: true, rounds: 4, minRank: 200 },
  { id: 'm1', name: 'Masters do Vale', category: 'gold1000', venue: 'clay', doubles: false, rounds: 5, minRank: 60 },
  { id: 's2', name: 'Grand Slam Terre Rouge', category: 'slam', venue: 'clay', doubles: false, rounds: 5, minRank: 90 },
  { id: 'c4', name: 'Challenger Cidade Néon', category: 'challenger', venue: 'neon', doubles: false, rounds: 3, minRank: 999 },
  { id: 'g4', name: 'Royal Lawn Classic', category: 'gold500', venue: 'lawn', doubles: false, rounds: 4, minRank: 110 },
  { id: 's3', name: 'Grand Slam Royal Lawn', category: 'slam', venue: 'lawn', doubles: false, rounds: 5, minRank: 90 },
  { id: 'd1', name: 'Royal Lawn Duplas', category: 'gold500', venue: 'lawn', doubles: true, rounds: 4, minRank: 150 },
  { id: 'm2', name: 'Masters Neon', category: 'gold1000', venue: 'neon', doubles: false, rounds: 5, minRank: 60 },
  { id: 's4', name: 'Grand Slam Neon', category: 'slam', venue: 'neon', doubles: false, rounds: 5, minRank: 90 },
  { id: 'f1', name: 'Finals do Circuito de Ouro', category: 'gold1000', venue: 'neon', doubles: false, rounds: 3, minRank: 8 },
];

export const COUNTRIES: { name: string; code: string; colors: [string, string, string] }[] = [
  { name: 'BRASIL', code: 'BRA', colors: ['#009c3b', '#ffdf00', '#002776'] },
  { name: 'PORTUGAL', code: 'POR', colors: ['#006600', '#ff0000', '#ff0000'] },
  { name: 'ARGENTINA', code: 'ARG', colors: ['#74acdf', '#ffffff', '#74acdf'] },
  { name: 'ESPANHA', code: 'ESP', colors: ['#aa151b', '#f1bf00', '#aa151b'] },
  { name: 'ITÁLIA', code: 'ITA', colors: ['#009246', '#ffffff', '#ce2b37'] },
  { name: 'FRANÇA', code: 'FRA', colors: ['#0055a4', '#ffffff', '#ef4135'] },
  { name: 'EUA', code: 'USA', colors: ['#b22234', '#ffffff', '#3c3b6e'] },
  { name: 'JAPÃO', code: 'JPN', colors: ['#ffffff', '#bc002d', '#ffffff'] },
  { name: 'MÉXICO', code: 'MEX', colors: ['#006847', '#ffffff', '#ce1126'] },
  { name: 'CHILE', code: 'CHI', colors: ['#0039a6', '#ffffff', '#d52b1e'] },
];

export interface CareerData {
  version: 1;
  me: PlayerDef;
  points: number;
  money: number;
  statPoints: number;
  week: number; // index into SEASON
  season: number;
  titles: { name: string; category: Category; season: number }[];
  results: { event: string; reached: string; season: number }[];
  partnerId: string | null;
  bestRank: number;
}

const FIRST = ['Luca', 'Theo', 'Nico', 'Ivan', 'Bruno', 'Hugo', 'Leo', 'Marco', 'Diego', 'Felix', 'Omar', 'Pablo', 'Tom', 'Yuri', 'Sami', 'Enzo', 'Rui', 'Jonas', 'Kai', 'Aldo'];
const LAST = ['Varga', 'Moreau', 'Silva', 'Kowal', 'Brandt', 'Rossi', 'Novak', 'Haas', 'Costa', 'Lind', 'Mares', 'Okoye', 'Duarte', 'Ferro', 'Sato', 'Bauer', 'Nunes', 'Petrov', 'Alves', 'Romero'];

/** World ranking: a fixed field of points by rank (rank 1 ~ 9000 pts). Your rank = 1 + players above you. */
export function fieldPoints(rank: number) { return Math.round(9000 * Math.pow(rank, -1.05)); }
export function rankOf(points: number) {
  let lo = 1, hi = 2000;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (fieldPoints(mid) > points) lo = mid + 1; else hi = mid; }
  return lo;
}

let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Opponent with a ranking: top-8 are the named stars; everyone else is a generated rival built on their looks. */
export function rival(rank: number, salt: number): PlayerDef {
  if (rank <= 8) return PLAYERS.filter((p) => !p.unlock)[(rank - 1) % 8];
  seed = (rank * 7919 + salt * 104729) % 2147483647 || 1;
  const base = PLAYERS[Math.floor(rnd() * 8)];
  const c = COUNTRIES[Math.floor(rnd() * COUNTRIES.length)];
  const lvl = Math.max(35, Math.min(84, 88 - Math.log2(rank) * 6.2));
  const st = () => Math.round(lvl + (rnd() - 0.5) * 16);
  const shirts = ['#e63946', '#1d3557', '#2a9d8f', '#f4a261', '#8338ec', '#ffffff', '#111111', '#3a86ff', '#ffb703'];
  const first = FIRST[Math.floor(rnd() * FIRST.length)], last = LAST[Math.floor(rnd() * LAST.length)];
  return {
    ...base, id: `r${rank}_${salt}`, name: `${first} ${last}`, short: last.toUpperCase(), country: c.name, flag: c.code, flagColors: c.colors,
    shirt: shirts[Math.floor(rnd() * shirts.length)], shirtAccent: '#ffffff', shorts: rnd() < 0.5 ? '#ffffff' : '#1c1c28',
    stats: { power: st(), speed: st(), serve: st(), volley: st(), technique: st() }, unlock: undefined, style: `Nº ${rank} do ranking`,
  };
}

export function newCareer(me: PlayerDef): CareerData {
  return { version: 1, me, points: fieldPoints(300), money: 2000, statPoints: 0, week: 0, season: 1, titles: [], results: [], partnerId: null, bestRank: 300 };
}

export const ROUND_NAMES = (rounds: number) => ['1ª RODADA', '2ª RODADA', 'OITAVAS', 'QUARTAS', 'SEMIFINAL', 'FINAL'].slice(6 - rounds);

/** Opponent for a round of an event: lower rounds draw weaker seeds, the final a top seed of the field. */
export function drawOpponent(ev: EventDef, round: number, salt: number): PlayerDef {
  const [best, worst] = CATEGORY[ev.category].field;
  const f = 1 - round / Math.max(1, ev.rounds - 1);
  const rank = Math.max(1, Math.round(best + (worst - best) * f * (0.6 + 0.4 * ((salt * 37) % 10) / 10)));
  return rival(rank, salt + round * 13);
}

export const CAREER_KEY = 'gsa_career_v1';
export function loadCareer(): CareerData | null {
  try { const r = localStorage.getItem(CAREER_KEY); return r ? (JSON.parse(r) as CareerData) : null; } catch { return null; }
}
export function saveCareer(c: CareerData) { try { localStorage.setItem(CAREER_KEY, JSON.stringify(c)); } catch { /* ignore */ } }
export function venueOf(id: VenueDef['id']) { return VENUES.find((v) => v.id === id)!; }
