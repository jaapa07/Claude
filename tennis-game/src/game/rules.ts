// Tennis scoring: points, deuce/advantage, games, sets, tie-break, change of ends, service rotation.
export type Side = 0 | 1;

export interface MatchConfig {
  sets: 1 | 3 | 5; // best of
  gamesPerSet: number; // usually 6; arcade uses 2-3
  tiebreakAt: number | null; // games each to start a tie-break (6 normally)
  tiebreakPoints: number; // 7
  advantage: boolean; // false = deciding point at deuce
}

export interface ScoreState {
  points: [number, number];
  games: [number, number];
  sets: [number, number];
  setHistory: [number, number][];
  tiebreak: boolean;
  server: Side;
  tbFirstServer: Side;
  pointsPlayedInGame: number;
  totalGamesInSet: number;
  winner: Side | null;
}

export type PointOutcome = {
  gameWon: Side | null;
  setWon: Side | null;
  matchWon: Side | null;
  changeEnds: boolean;
  call: string; // human readable score call
};

export const defaultConfig = (): MatchConfig => ({ sets: 1, gamesPerSet: 6, tiebreakAt: 6, tiebreakPoints: 7, advantage: true });

export function newScore(firstServer: Side = 0): ScoreState {
  return { points: [0, 0], games: [0, 0], sets: [0, 0], setHistory: [], tiebreak: false, server: firstServer, tbFirstServer: firstServer, pointsPlayedInGame: 0, totalGamesInSet: 0, winner: null };
}

const NAMES = ['0', '15', '30', '40'];

/** Score display for each side, e.g. ["40","AD"] */
export function pointLabels(s: ScoreState): [string, string] {
  if (s.tiebreak) return [String(s.points[0]), String(s.points[1])];
  const [a, b] = s.points;
  if (a >= 3 && b >= 3) {
    if (a === b) return ['40', '40'];
    return a > b ? ['AD', '40'] : ['40', 'AD'];
  }
  return [NAMES[Math.min(a, 3)], NAMES[Math.min(b, 3)]];
}

export function isDeuce(s: ScoreState): boolean {
  return !s.tiebreak && s.points[0] >= 3 && s.points[0] === s.points[1];
}

/** Side that would win the game with the next point, or null. */
export function gamePointFor(s: ScoreState, cfg: MatchConfig): Side | null {
  for (const side of [0, 1] as Side[]) {
    const o = (1 - side) as Side;
    const p = s.points[side] + 1, q = s.points[o];
    if (s.tiebreak) { if (p >= cfg.tiebreakPoints && p - q >= 2) return side; continue; }
    if (!cfg.advantage && s.points[side] === 3 && q === 3) return side;
    if (p >= 4 && p - q >= 2) return side;
  }
  return null;
}

function setWonBy(games: [number, number], cfg: MatchConfig, tiebreakJustWon: boolean): Side | null {
  for (const side of [0, 1] as Side[]) {
    const g = games[side], o = games[1 - side];
    if (tiebreakJustWon && g > o) return side;
    if (cfg.gamesPerSet <= 1 && g >= 1) return side; // a one-game set is won by that game
    if (g >= cfg.gamesPerSet && g - o >= 2) return side;
  }
  return null;
}

export function setPointFor(s: ScoreState, cfg: MatchConfig): Side | null {
  const gp = gamePointFor(s, cfg);
  if (gp === null) return null;
  const games: [number, number] = [...s.games] as [number, number];
  games[gp]++;
  return setWonBy(games, cfg, s.tiebreak) === gp ? gp : null;
}

export function matchPointFor(s: ScoreState, cfg: MatchConfig): Side | null {
  const sp = setPointFor(s, cfg);
  if (sp === null) return null;
  return s.sets[sp] + 1 > cfg.sets / 2 ? sp : null;
}

export function breakPoint(s: ScoreState, cfg: MatchConfig): boolean {
  const gp = gamePointFor(s, cfg);
  return !s.tiebreak && gp !== null && gp !== s.server;
}

/** Which service court the next serve goes from: 'deuce' (right) or 'ad' (left). */
export function serviceCourt(s: ScoreState): 'deuce' | 'ad' {
  const n = s.tiebreak ? s.points[0] + s.points[1] : s.pointsPlayedInGame;
  return n % 2 === 0 ? 'deuce' : 'ad';
}

/** Award a point. Mutates the state and returns what happened. */
export function awardPoint(s: ScoreState, winner: Side, cfg: MatchConfig): PointOutcome {
  const out: PointOutcome = { gameWon: null, setWon: null, matchWon: null, changeEnds: false, call: '' };
  if (s.winner !== null) return out;
  s.points[winner]++;
  s.pointsPlayedInGame++;
  const [a, b] = s.points;
  const w = s.points[winner], l = s.points[1 - winner];
  let gameOver = false;
  if (s.tiebreak) {
    gameOver = w >= cfg.tiebreakPoints && w - l >= 2;
    // tie-break: serve changes after first point then every two points
    const total = a + b;
    if (!gameOver && total % 2 === 1) s.server = (1 - s.server) as Side;
    // change ends every 6 points
    if (!gameOver && total % 6 === 0) out.changeEnds = true;
  } else if (!cfg.advantage && a >= 3 && b >= 3 && a !== b) {
    gameOver = true;
  } else {
    gameOver = w >= 4 && w - l >= 2;
  }

  if (!gameOver) {
    out.call = callFor(s);
    return out;
  }

  // game over
  const wasTiebreak = s.tiebreak;
  s.games[winner]++;
  out.gameWon = winner;
  s.points = [0, 0];
  s.pointsPlayedInGame = 0;
  s.totalGamesInSet++;
  const setWinner = setWonBy(s.games, cfg, wasTiebreak);
  if (wasTiebreak) {
    s.tiebreak = false;
    s.server = (1 - s.tbFirstServer) as Side;
  } else {
    s.server = (1 - s.server) as Side;
  }
  const gamesTotalBefore = s.games[0] + s.games[1];
  if (setWinner !== null) {
    s.sets[setWinner]++;
    s.setHistory.push([...s.games] as [number, number]);
    out.setWon = setWinner;
    // ends change after a set if the number of games in it was odd
    out.changeEnds = gamesTotalBefore % 2 === 1;
    s.games = [0, 0];
    s.totalGamesInSet = 0;
    if (s.sets[setWinner] > cfg.sets / 2) {
      s.winner = setWinner;
      out.matchWon = setWinner;
    }
  } else {
    out.changeEnds = gamesTotalBefore % 2 === 1;
    if (cfg.tiebreakAt !== null && s.games[0] === cfg.tiebreakAt && s.games[1] === cfg.tiebreakAt) {
      s.tiebreak = true;
      s.tbFirstServer = s.server;
    }
  }
  out.call = out.matchWon !== null ? 'GAME, SET AND MATCH' : out.setWon !== null ? 'SET' : 'GAME';
  return out;
}

export function callFor(s: ScoreState): string {
  if (s.tiebreak) return `${s.points[s.server]} - ${s.points[1 - s.server]}`;
  const [a, b] = s.points;
  if (a >= 3 && b >= 3) {
    if (a === b) return 'DEUCE';
    const lead = a > b ? 0 : 1;
    return lead === s.server ? 'ADVANTAGE SERVER' : 'ADVANTAGE RECEIVER';
  }
  const sv = NAMES[s.points[s.server]], rc = NAMES[s.points[1 - s.server]];
  if (sv === rc) return `${sv === '0' ? 'LOVE' : sv} ALL`;
  return `${sv === '0' ? 'LOVE' : sv} - ${rc === '0' ? 'LOVE' : rc}`;
}
