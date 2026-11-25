import type { GameMode } from '@/data/ids';
import { isTouchDevice } from './settingsStore';
import type { Screen, Selection } from './gameTypes';

/** Modos que aceitam dois jogadores na tela dividida (Contrarrelógio e Treino são só para um). */
export const TWO_PLAYER_MODES: ReadonlySet<GameMode> = new Set<GameMode>(['quick', 'championship', 'battle']);

export function supportsTwoPlayers(mode: GameMode): boolean {
  return TWO_PLAYER_MODES.has(mode);
}

/** A escolha "1 ou 2 jogadores" só existe no computador/TV (no celular o jogo é sempre de um jogador). */
export function canChoosePlayers(): boolean {
  return !isTouchDevice();
}

/** Quantos humanos correm com esta seleção (2 só nos modos que aceitam). */
export function humanCount(sel: Pick<Selection, 'players' | 'mode'>): 1 | 2 {
  return sel.players === 2 && supportsTwoPlayers(sel.mode) ? 2 : 1;
}

export interface FlowOptions {
  /** Jogadores humanos (2 = tela dividida: cada um escolhe piloto e kart, na vez dele). */
  players?: number;
  /** Mostrar a tela "1 ou 2 jogadores" depois do menu. */
  choosePlayers?: boolean;
}

/**
 * Ordem das telas antes da corrida:
 * menu → (jogadores, fora do celular) → modo → (copa no Campeonato | pista nos demais) → dificuldade (pulada no
 * Contrarrelógio e no Treino, que não têm adversários) → personagem → kart → [personagem e kart do Jogador 2] →
 * corrida. Batalha: modo → minijogo → arena → dificuldade → personagem → kart → [Jogador 2] → partida.
 */
export function flowSteps(mode: GameMode, o: FlowOptions = {}): Screen[] {
  const steps: Screen[] = o.choosePlayers ? ['menu', 'players', 'mode'] : ['menu', 'mode'];
  if (mode === 'battle') steps.push('battleGame', 'arena', 'difficulty');
  else {
    steps.push(mode === 'championship' ? 'cup' : 'track');
    if (mode === 'quick' || mode === 'championship') steps.push('difficulty');
  }
  steps.push('character', 'kart');
  if ((o.players ?? 1) >= 2 && supportsTwoPlayers(mode)) steps.push('character2', 'kart2');
  return steps;
}

/** Próxima tela do fluxo; `null` depois do último kart (hora de chamar `startRace`). */
export function nextScreen(current: Screen, mode: GameMode, o: FlowOptions = {}): Screen | null {
  const steps = flowSteps(mode, o);
  const i = steps.indexOf(current);
  if (i < 0) return 'menu';
  return steps[i + 1] ?? null;
}

/** Tela anterior do fluxo (ou 'menu'). */
export function prevScreen(current: Screen, mode: GameMode, o: FlowOptions = {}): Screen {
  const steps = flowSteps(mode, o);
  const i = steps.indexOf(current);
  return i > 0 ? steps[i - 1] : 'menu';
}

/** Opções de fluxo da seleção atual (para as telas). */
export function flowOptionsOf(sel: Pick<Selection, 'players' | 'mode'>): FlowOptions {
  return { players: humanCount(sel), choosePlayers: canChoosePlayers() };
}

export const nextOf = (current: Screen, sel: Pick<Selection, 'players' | 'mode'>): Screen | null => nextScreen(current, sel.mode, flowOptionsOf(sel));
export const prevOf = (current: Screen, sel: Pick<Selection, 'players' | 'mode'>): Screen => prevScreen(current, sel.mode, flowOptionsOf(sel));

export const MODE_INFO: ReadonlyArray<{ id: GameMode; name: string; description: string; detail: string }> = [
  { id: 'quick', name: 'Corrida Rápida', description: 'Escolha uma pista e dispute contra sete adversários.', detail: '8 pilotos · 3 voltas' },
  { id: 'championship', name: 'Campeonato', description: 'Quatro corridas de uma copa valendo pontos e troféu.', detail: '4 corridas · troféu' },
  { id: 'timetrial', name: 'Contrarrelógio', description: 'Só você e o cronômetro: busque o melhor tempo.', detail: 'Sem adversários · 3 voltas' },
  { id: 'battle', name: 'Batalha', description: 'Minijogos numa arena aberta: balões, cristais e a coroa.', detail: '8 pilotos · 3 minijogos' },
  { id: 'training', name: 'Treino', description: 'Explore a pista livremente, sem adversários nem limite de voltas.', detail: 'Livre · saia pelo menu de pausa' },
];

export const DIFFICULTY_INFO = [
  { id: 'easy', name: 'Fácil', description: 'Adversários mais lentos e que erram mais. Bom para aprender as pistas.' },
  { id: 'normal', name: 'Normal', description: 'Disputa equilibrada: os rivais usam drift e itens com critério.' },
  { id: 'hard', name: 'Difícil', description: 'Rivais rápidos, agressivos e que quase não erram.' },
] as const;
