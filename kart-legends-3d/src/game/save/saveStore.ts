import { create } from 'zustand';
import { CHARACTERS } from '@/data/characters';
import { CHARACTER_IDS, CUP_IDS, KART_IDS, TRACK_IDS } from '@/data/ids';
import type { CharacterId, CupId, KartId, TrackId, TrophyTier } from '@/data/ids';
import { KARTS } from '@/data/karts';
import { CUPS, CUP_UNLOCK, TRACK_BY_ID } from '@/data/tracks';
import type { UnlockRule } from '@/data/unlocks';
import type { BattleResult } from '@/game/battle/battleSim';
import type { RaceResult } from '@/game/core/types';
import { COINS_TROPHY, COSMETIC_PRICES, SHOP_PRICES, START_COINS, TIRE_PRICES, coinsForBattle, coinsForRace, type ShopKind } from '@/data/shop';
import { readKey, removeKey, writeKey } from './storage';

export const SAVE_KEY = 'kl3d.save';
/** Cópia do conteúdo ilegível, guardada antes de recomeçar do zero. */
export const SAVE_CORRUPT_KEY = 'kl3d.save.corrupt';
export const SAVE_VERSION = 2;

export interface TrackRecord {
  /** Melhor tempo total em corrida (Corrida Rápida / Campeonato). */
  bestRaceMs: number | null;
  /** Melhor volta em corrida. */
  bestLapMs: number | null;
  /** Melhor tempo total no Contrarrelógio. */
  timeTrialMs: number | null;
  /** Melhor volta no Contrarrelógio. */
  timeTrialLapMs: number | null;
}

export interface SaveStats {
  /** Corridas concluídas contra adversários (Corrida Rápida + Campeonato). */
  races: number;
  wins: number;
  podiums: number;
  /** Miniturbos soltos, por nível (1, 2, 3). */
  turbos: [number, number, number];
  itemsUsed: number;
  /** Tentativas de Contrarrelógio concluídas. */
  timeTrials: number;
  championships: number;
  playTimeMs: number;
  /** Partidas de Batalha concluídas e vencidas. */
  battles: number;
  battleWins: number;
}

export interface SaveUnlocks { characters: CharacterId[]; karts: KartId[]; cups: CupId[] }

/** Itens comprados na loja (pilotos e karts comprados também entram em `unlocked`). */
export interface SaveOwned { characters: CharacterId[]; karts: KartId[]; tires: string[]; cosmetics: string[] }

export interface SaveData {
  version: number;
  unlocked: SaveUnlocks;
  /** Moedas para gastar na loja. */
  coins: number;
  owned: SaveOwned;
  trophies: Record<CupId, TrophyTier | null>;
  records: Record<TrackId, TrackRecord>;
  stats: SaveStats;
}

export interface UnlockNotice { kind: 'character' | 'kart' | 'cup'; id: string; name: string }

/** Resultado final de uma copa, passado junto com a última corrida. `position` é 1..8. */
export interface ChampionshipOutcome { cupId: CupId; position: number }

export interface ApplyReport {
  unlocks: UnlockNotice[];
  newRecords: { raceTime: boolean; bestLap: boolean };
  /** Troféu obtido nesta copa (mesmo que não supere o já guardado). */
  trophy: TrophyTier | null;
  /** Moedas ganhas nesta corrida (tela dividida: soma das colocações dos dois jogadores). */
  coins: number;
  /** Tela dividida: moedas de cada jogador (pela vaga), já incluídas em `coins`. */
  coinsBySlot?: number[];
}

export type SaveLoadStatus = 'fresh' | 'loaded' | 'migrated' | 'recovered';

export interface SaveState extends SaveData {
  /** Como o save foi obtido na última carga ('recovered' = dados corrompidos foram descartados). */
  loadStatus: SaveLoadStatus;
  lastReport: ApplyReport | null;
  /** Registra uma corrida; devolve os novos desbloqueios. */
  applyRaceResult: (result: RaceResult, championship?: ChampionshipOutcome) => UnlockNotice[];
  /** Registra uma partida de Batalha (moedas, partidas, vitórias, itens, turbos e tempo jogado). */
  applyBattleResult: (result: BattleResult) => UnlockNotice[];
  addPlayTime: (ms: number) => void;
  resetProgress: () => void;
  /** Relê o localStorage (usado na inicialização e nos testes). */
  reload: () => void;
  isCharacterUnlocked: (id: CharacterId) => boolean;
  isKartUnlocked: (id: KartId) => boolean;
  isCupUnlocked: (id: CupId) => boolean;
  isTrackUnlocked: (id: TrackId) => boolean;
  /** Compra um item da loja; devolve false se já tiver, se não houver preço ou se faltar moeda. */
  buy: (kind: ShopKind, id: string) => boolean;
  owns: (kind: ShopKind, id: string) => boolean;
}

const TIER_RANK: Record<TrophyTier, number> = { bronze: 1, silver: 2, gold: 3 };

export function trophyRank(tier: TrophyTier | null | undefined): number {
  return tier ? TIER_RANK[tier] : 0;
}

export function trophyForPosition(position: number): TrophyTier | null {
  return position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : null;
}

function emptyRecord(): TrackRecord {
  return { bestRaceMs: null, bestLapMs: null, timeTrialMs: null, timeTrialLapMs: null };
}

export function createDefaultSave(): SaveData {
  const data: SaveData = {
    version: SAVE_VERSION,
    unlocked: { characters: [], karts: [], cups: [] },
    coins: START_COINS,
    owned: { characters: [], karts: [], tires: [], cosmetics: [] },
    trophies: Object.fromEntries(CUP_IDS.map((c) => [c, null])) as Record<CupId, TrophyTier | null>,
    records: Object.fromEntries(TRACK_IDS.map((t) => [t, emptyRecord()])) as Record<TrackId, TrackRecord>,
    stats: { races: 0, wins: 0, podiums: 0, turbos: [0, 0, 0], itemsUsed: 0, timeTrials: 0, championships: 0, playTimeMs: 0, battles: 0, battleWins: 0 },
  };
  data.unlocked = computeUnlocks(data);
  return data;
}

export function isRuleMet(rule: UnlockRule, data: Pick<SaveData, 'trophies' | 'records' | 'stats'>): boolean {
  switch (rule.type) {
    case 'initial': return true;
    case 'races': return data.stats.races >= rule.count;
    case 'wins': return data.stats.wins >= rule.count;
    case 'trophy': return trophyRank(data.trophies[rule.cup]) >= TIER_RANK[rule.min];
    case 'timeTrials': return TRACK_IDS.filter((t) => data.records[t].timeTrialMs !== null).length >= rule.count;
    case 'turbo3': return data.stats.turbos[2] >= rule.count;
    case 'shop': return false;
  }
}

/** Desbloqueios = o que já estava salvo ∪ tudo cujas regras estão satisfeitas (nunca se perde um desbloqueio). */
export function computeUnlocks(data: Pick<SaveData, 'unlocked' | 'owned' | 'trophies' | 'records' | 'stats'>): SaveUnlocks {
  return {
    characters: CHARACTERS.filter((c) => data.unlocked.characters.includes(c.id) || data.owned.characters.includes(c.id) || isRuleMet(c.unlock, data)).map((c) => c.id),
    karts: KARTS.filter((k) => data.unlocked.karts.includes(k.id) || data.owned.karts.includes(k.id) || isRuleMet(k.unlock, data)).map((k) => k.id),
    cups: CUPS.filter((c) => data.unlocked.cups.includes(c.id) || isRuleMet(CUP_UNLOCK[c.id], data)).map((c) => c.id),
  };
}

// ---------- leitura tolerante ----------

type Raw = Record<string, unknown>;

function isObject(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}
function timeOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}
function idList<T extends string>(v: unknown, valid: readonly T[]): T[] {
  if (!Array.isArray(v)) return [];
  return valid.filter((id) => v.includes(id));
}

/** Migrações encadeadas: a entrada N transforma um save da versão N na versão N+1. */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  // 0 → 1: saves de pré-lançamento não tinham `version` e guardavam os tempos em `bestTimes`.
  0: (raw) => {
    const next: Raw = { ...raw, version: 1 };
    if (!isObject(raw.records) && isObject(raw.bestTimes)) {
      const records: Raw = {};
      for (const [track, ms] of Object.entries(raw.bestTimes)) records[track] = { bestRaceMs: ms };
      next.records = records;
    }
    delete next.bestTimes;
    return next;
  },
  // 1 → 2: loja e moedas. Quem já jogava recebe moedas pelo progresso que tinha.
  1: (raw) => {
    const stats = isObject(raw.stats) ? raw.stats : {};
    const trophies = isObject(raw.trophies) ? Object.values(raw.trophies) : [];
    const bonus = count(stats.races) * 60 + count(stats.wins) * 80
      + trophies.reduce<number>((sum, t) => sum + (t === 'gold' || t === 'silver' || t === 'bronze' ? COINS_TROPHY[t] : 0), 0);
    return { ...raw, version: 2, coins: START_COINS + bonus, owned: { characters: [], karts: [], tires: [], cosmetics: [] } };
  },
};

/** Constrói um SaveData válido a partir de qualquer objeto, campo a campo. */
export function sanitizeSave(raw: Raw): SaveData {
  const data = createDefaultSave();
  const stats = isObject(raw.stats) ? raw.stats : {};
  const turbos = Array.isArray(stats.turbos) ? stats.turbos : [];
  data.stats = {
    races: count(stats.races), wins: count(stats.wins), podiums: count(stats.podiums),
    turbos: [count(turbos[0]), count(turbos[1]), count(turbos[2])],
    itemsUsed: count(stats.itemsUsed), timeTrials: count(stats.timeTrials),
    championships: count(stats.championships), playTimeMs: count(stats.playTimeMs),
    battles: count(stats.battles), battleWins: count(stats.battleWins),
  };
  const trophies = isObject(raw.trophies) ? raw.trophies : {};
  for (const cup of CUP_IDS) {
    const t = trophies[cup];
    data.trophies[cup] = t === 'bronze' || t === 'silver' || t === 'gold' ? t : null;
  }
  const records = isObject(raw.records) ? raw.records : {};
  for (const track of TRACK_IDS) {
    const r = records[track];
    if (!isObject(r)) continue;
    data.records[track] = {
      bestRaceMs: timeOrNull(r.bestRaceMs), bestLapMs: timeOrNull(r.bestLapMs),
      timeTrialMs: timeOrNull(r.timeTrialMs), timeTrialLapMs: timeOrNull(r.timeTrialLapMs),
    };
  }
  data.coins = typeof raw.coins === 'number' ? count(raw.coins) : START_COINS;
  const owned = isObject(raw.owned) ? raw.owned : {};
  data.owned = {
    characters: idList(owned.characters, CHARACTER_IDS),
    karts: idList(owned.karts, KART_IDS),
    tires: Array.isArray(owned.tires) ? owned.tires.filter((t): t is string => typeof t === 'string' && t in TIRE_PRICES) : [],
    cosmetics: Array.isArray(owned.cosmetics) ? owned.cosmetics.filter((t): t is string => typeof t === 'string' && t in COSMETIC_PRICES) : [],
  };
  const unlocked = isObject(raw.unlocked) ? raw.unlocked : {};
  data.unlocked = {
    characters: idList(unlocked.characters, CHARACTER_IDS),
    karts: idList(unlocked.karts, KART_IDS),
    cups: idList(unlocked.cups, CUP_IDS),
  };
  data.unlocked = computeUnlocks(data);
  return data;
}

export function parseSave(text: string | null): { data: SaveData; status: SaveLoadStatus } {
  if (text === null) return { data: createDefaultSave(), status: 'fresh' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { data: createDefaultSave(), status: 'recovered' };
  }
  if (!isObject(raw)) return { data: createDefaultSave(), status: 'recovered' };
  let version = typeof raw.version === 'number' && Number.isInteger(raw.version) && raw.version >= 0 ? raw.version : 0;
  let current: Raw = raw;
  let status: SaveLoadStatus = 'loaded';
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (step) current = step(current);
    version += 1;
    status = 'migrated';
  }
  // Versão mais nova que a conhecida (downgrade do jogo): aproveita os campos que ainda entendemos.
  if (version > SAVE_VERSION) status = 'migrated';
  return { data: sanitizeSave(current), status };
}

function loadFromStorage(): { data: SaveData; status: SaveLoadStatus } {
  const text = readKey(SAVE_KEY);
  const parsed = parseSave(text);
  if (parsed.status === 'recovered' && text !== null) writeKey(SAVE_CORRUPT_KEY, text);
  if (parsed.status === 'recovered' || parsed.status === 'migrated') persist(parsed.data);
  return parsed;
}

function persist(data: SaveData): void {
  const { version, unlocked, coins, owned, trophies, records, stats } = data;
  writeKey(SAVE_KEY, JSON.stringify({ version, unlocked, coins, owned, trophies, records, stats }));
}

function better(prev: number | null, next: number | null): number | null {
  if (next === null || !(next > 0)) return prev;
  return prev === null || next < prev ? next : prev;
}

function diffUnlocks(before: SaveUnlocks, after: SaveUnlocks): UnlockNotice[] {
  const out: UnlockNotice[] = [];
  for (const c of CHARACTERS) if (after.characters.includes(c.id) && !before.characters.includes(c.id)) out.push({ kind: 'character', id: c.id, name: c.name });
  for (const k of KARTS) if (after.karts.includes(k.id) && !before.karts.includes(k.id)) out.push({ kind: 'kart', id: k.id, name: k.name });
  for (const c of CUPS) if (after.cups.includes(c.id) && !before.cups.includes(c.id)) out.push({ kind: 'cup', id: c.id, name: c.name });
  return out;
}

function snapshot(s: SaveData): SaveData {
  return {
    version: SAVE_VERSION,
    unlocked: { characters: [...s.unlocked.characters], karts: [...s.unlocked.karts], cups: [...s.unlocked.cups] },
    coins: s.coins,
    owned: { characters: [...s.owned.characters], karts: [...s.owned.karts], tires: [...s.owned.tires], cosmetics: [...s.owned.cosmetics] },
    trophies: { ...s.trophies },
    records: Object.fromEntries(TRACK_IDS.map((t) => [t, { ...s.records[t] }])) as Record<TrackId, TrackRecord>,
    stats: { ...s.stats, turbos: [...s.stats.turbos] as [number, number, number] },
  };
}

const initial = loadFromStorage();

export const useSaveStore = create<SaveState>()((set, get) => ({
  ...initial.data,
  loadStatus: initial.status,
  lastReport: null,

  applyRaceResult: (result, championship) => {
    const data = snapshot(get());
    const before = data.unlocked;
    const competitive = result.mode === 'quick' || result.mode === 'championship';
    const finished = result.playerTimeMs !== null;
    const record = data.records[result.trackId];
    const newRecords = { raceTime: false, bestLap: false };
    // Tela dividida: a corrida conta uma vez só no save compartilhado. Vitória/pódio pela melhor colocação dos
    // dois, recordes pelo melhor tempo dos dois, turbos e itens somados e moedas das DUAS colocações.
    const outs = result.players && result.players.length > 1 ? result.players : null;

    if (competitive) {
      const best = outs ? Math.min(...outs.map((o) => o.position)) : result.playerPosition;
      data.stats.races += 1;
      if (best === 1) data.stats.wins += 1;
      if (best >= 1 && best <= 3) data.stats.podiums += 1;
      const times = outs ? outs.map((o) => o.timeMs) : [finished ? result.playerTimeMs : null];
      const laps = outs ? outs.map((o) => o.bestLapMs) : [result.playerBestLapMs];
      const prevRace = record.bestRaceMs, prevLap = record.bestLapMs;
      for (const t of times) if (t !== null) record.bestRaceMs = better(record.bestRaceMs, t);
      for (const l of laps) record.bestLapMs = better(record.bestLapMs, l);
      newRecords.raceTime = record.bestRaceMs !== prevRace;
      newRecords.bestLap = record.bestLapMs !== prevLap;
    } else if (result.mode === 'timetrial') {
      if (finished) {
        data.stats.timeTrials += 1;
        const t = better(record.timeTrialMs, result.playerTimeMs);
        newRecords.raceTime = t !== record.timeTrialMs;
        record.timeTrialMs = t;
      }
      const lap = better(record.timeTrialLapMs, result.playerBestLapMs);
      newRecords.bestLap = lap !== record.timeTrialLapMs;
      record.timeTrialLapMs = lap;
    }
    // Treino: só conta turbos, itens e tempo jogado.
    for (const st of outs ? outs.map((o) => o.stats) : [result.stats]) {
      for (let i = 0; i < 3; i++) data.stats.turbos[i] += count(st.turbos[i]);
      data.stats.itemsUsed += count(st.itemsUsed);
    }
    // tempo jogado: a duração da sessão (a dos dois jogadores é a mesma), uma vez
    data.stats.playTimeMs += count(outs ? Math.max(0, ...outs.map((o) => o.timeMs ?? 0)) : result.playerTimeMs ?? 0);

    let trophy: TrophyTier | null = null;
    if (championship) {
      data.stats.championships += 1;
      trophy = trophyForPosition(championship.position);
      if (trophyRank(trophy) > trophyRank(data.trophies[championship.cupId])) data.trophies[championship.cupId] = trophy;
    }

    let coins: number;
    let coinsBySlot: number[] | undefined;
    if (outs) {
      // cada colocação paga na mesma carteira; o bônus do troféu entra uma vez (com o Jogador 1)
      coinsBySlot = outs.map((o, i) => coinsForRace({
        mode: result.mode, difficulty: result.difficulty, position: o.position, finished: o.timeMs !== null, trophy: i === 0 ? trophy : null, timeTrialRecord: false,
      }));
      coins = coinsBySlot.reduce((a, b) => a + b, 0);
    } else {
      coins = coinsForRace({
        mode: result.mode, difficulty: result.difficulty, position: result.playerPosition, finished,
        trophy, timeTrialRecord: result.mode === 'timetrial' && newRecords.raceTime,
      });
    }
    data.coins += coins;

    data.unlocked = computeUnlocks(data);
    const unlocks = diffUnlocks(before, data.unlocked);
    persist(data);
    set({ ...data, lastReport: { unlocks, newRecords, trophy, coins, ...(coinsBySlot ? { coinsBySlot } : {}) } });
    return unlocks;
  },

  applyBattleResult: (result) => {
    const data = snapshot(get());
    const before = data.unlocked;
    // Tela dividida: uma partida no save; vitória se um dos dois venceu; moedas das duas colocações.
    const outs = result.players && result.players.length > 1 ? result.players : null;
    data.stats.battles += 1;
    if ((outs ? Math.min(...outs.map((o) => o.position)) : result.playerPosition) === 1) data.stats.battleWins += 1;
    for (const st of outs ? outs.map((o) => o.stats) : [result.stats]) {
      for (let i = 0; i < 3; i++) data.stats.turbos[i] += count(st.turbos[i]);
      data.stats.itemsUsed += count(st.itemsUsed);
    }
    data.stats.playTimeMs += count(result.durationMs);
    const coinsBySlot = outs ? outs.map((o) => coinsForBattle({ difficulty: result.difficulty, position: o.position, racers: result.standings.length })) : undefined;
    const coins = coinsBySlot
      ? coinsBySlot.reduce((a, b) => a + b, 0)
      : coinsForBattle({ difficulty: result.difficulty, position: result.playerPosition, racers: result.standings.length });
    data.coins += coins;
    data.unlocked = computeUnlocks(data);
    const unlocks = diffUnlocks(before, data.unlocked);
    persist(data);
    set({ ...data, lastReport: { unlocks, newRecords: { raceTime: false, bestLap: false }, trophy: null, coins, ...(coinsBySlot ? { coinsBySlot } : {}) } });
    return unlocks;
  },

  addPlayTime: (ms) => {
    if (!(ms > 0)) return;
    const data = snapshot(get());
    data.stats.playTimeMs += Math.floor(ms);
    persist(data);
    set({ stats: data.stats });
  },

  resetProgress: () => {
    const data = createDefaultSave();
    removeKey(SAVE_CORRUPT_KEY);
    persist(data);
    set({ ...data, loadStatus: 'fresh', lastReport: null });
  },

  reload: () => {
    const loaded = loadFromStorage();
    set({ ...loaded.data, loadStatus: loaded.status, lastReport: null });
  },

  isCharacterUnlocked: (id) => get().unlocked.characters.includes(id),
  isKartUnlocked: (id) => get().unlocked.karts.includes(id),
  isCupUnlocked: (id) => get().unlocked.cups.includes(id),
  isTrackUnlocked: (id) => get().unlocked.cups.includes(TRACK_BY_ID[id].cup),

  owns: (kind, id) => {
    const s = get();
    if (kind === 'tire') return s.owned.tires.includes(id);
    if (kind === 'cosmetic') return s.owned.cosmetics.includes(id);
    return kind === 'character' ? s.unlocked.characters.includes(id as CharacterId) : s.unlocked.karts.includes(id as KartId);
  },

  buy: (kind, id) => {
    const price = SHOP_PRICES[kind][id];
    if (price === undefined || get().owns(kind, id) || get().coins < price) return false;
    const data = snapshot(get());
    if (kind === 'character') {
      if (!(CHARACTER_IDS as readonly string[]).includes(id)) return false;
      data.owned.characters.push(id as CharacterId);
    } else if (kind === 'kart') {
      if (!(KART_IDS as readonly string[]).includes(id)) return false;
      data.owned.karts.push(id as KartId);
    } else if (kind === 'tire') data.owned.tires.push(id);
    else data.owned.cosmetics.push(id);
    data.coins -= price;
    data.unlocked = computeUnlocks(data);
    persist(data);
    set({ ...data });
    return true;
  },
}));
