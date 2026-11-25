import type { CharacterId, CupId, Difficulty, GameMode, KartId, TrackId } from '@/data/ids';
import type { ArenaId, BattleGameId } from '@/data/battle';
import type { BattleConfig, BattleResult } from '@/game/battle/battleSim';
import type { RaceConfig, RaceResult } from '@/game/core/types';

export type Screen =
  | 'loading' | 'menu' | 'character' | 'kart' | 'mode' | 'cup' | 'track' | 'difficulty'
  | 'race' | 'results' | 'podium' | 'progress' | 'settings' | 'shop'
  /** Batalha: escolha do minijogo e da arena. */
  | 'battleGame' | 'arena';

export interface Selection {
  characterId: CharacterId;
  kartId: KartId;
  mode: GameMode;
  cupId: CupId;
  trackId: TrackId;
  difficulty: Difficulty;
  /** Modo Batalha. */
  battleGame: BattleGameId;
  arenaId: ArenaId;
}

export interface StandingEntry { characterId: CharacterId; kartId: KartId; isPlayer: boolean; points: number }

export interface ChampionshipState {
  cupId: CupId;
  /** Índice (0..3) da corrida atual dentro da copa. */
  raceIndex: number;
  standings: StandingEntry[];
  finished: boolean;
}

/**
 * Contrato do store de fluxo do jogo (implementado em src/app/gameStore.ts).
 * A cena 3D (GameCanvas) apenas LÊ este estado e chama `finishRace`.
 */
export interface GameState {
  screen: Screen;
  /** Tela para a qual "Voltar" de Configurações/Progressão retorna. */
  previousScreen: Screen;
  selection: Selection;
  /** Corrida ativa (não nula nas telas race/results/podium). */
  race: RaceConfig | null;
  /** Incrementado a cada (re)início: a cena usa como chave para recriar a simulação. */
  raceNonce: number;
  paused: boolean;
  lastResult: RaceResult | null;
  championship: ChampionshipState | null;
  /** Partida de batalha ativa (no lugar de `race`, nas telas race/results). */
  battle: BattleConfig | null;
  lastBattle: BattleResult | null;

  goTo: (screen: Screen) => void;
  setSelection: (patch: Partial<Selection>) => void;
  /** Monta o RaceConfig a partir da seleção (ou da copa em andamento) e vai para 'race'. */
  startRace: () => void;
  restartRace: () => void;
  setPaused: (paused: boolean) => void;
  /** Chamado pela cena quando a corrida termina: registra progresso e abre 'results'. */
  finishRace: (result: RaceResult) => void;
  /** Chamado pela cena de batalha no apito final: registra moedas/estatísticas e abre 'results'. */
  finishBattle: (result: BattleResult) => void;
  /** Avança depois dos resultados/pódio (próxima corrida da copa, pódio ou menu). */
  continueAfterResults: () => void;
  quitToMenu: () => void;
}
