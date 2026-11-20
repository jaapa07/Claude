import type { GameMode } from '@/data/ids';
import type { Screen } from './gameTypes';

/**
 * Ordem das telas antes da corrida:
 * menu → modo → (copa no Campeonato | pista nos demais) → dificuldade (pulada no Contrarrelógio e no
 * Treino, que não têm adversários) → personagem → kart → corrida.
 */
export function flowSteps(mode: GameMode): Screen[] {
  const steps: Screen[] = ['menu', 'mode', mode === 'championship' ? 'cup' : 'track'];
  if (mode === 'quick' || mode === 'championship') steps.push('difficulty');
  steps.push('character', 'kart');
  return steps;
}

/** Próxima tela do fluxo; `null` depois do kart (hora de chamar `startRace`). */
export function nextScreen(current: Screen, mode: GameMode): Screen | null {
  const steps = flowSteps(mode);
  const i = steps.indexOf(current);
  if (i < 0) return 'menu';
  return steps[i + 1] ?? null;
}

/** Tela anterior do fluxo (ou 'menu'). */
export function prevScreen(current: Screen, mode: GameMode): Screen {
  const steps = flowSteps(mode);
  const i = steps.indexOf(current);
  return i > 0 ? steps[i - 1] : 'menu';
}

export const MODE_INFO: ReadonlyArray<{ id: GameMode; name: string; description: string; detail: string }> = [
  { id: 'quick', name: 'Corrida Rápida', description: 'Escolha uma pista e dispute contra sete adversários.', detail: '8 pilotos · 3 voltas' },
  { id: 'championship', name: 'Campeonato', description: 'Quatro corridas de uma copa valendo pontos e troféu.', detail: '4 corridas · troféu' },
  { id: 'timetrial', name: 'Contrarrelógio', description: 'Só você e o cronômetro: busque o melhor tempo.', detail: 'Sem adversários · 3 voltas' },
  { id: 'training', name: 'Treino', description: 'Explore a pista livremente, sem adversários nem limite de voltas.', detail: 'Livre · saia pelo menu de pausa' },
];

export const DIFFICULTY_INFO = [
  { id: 'easy', name: 'Fácil', description: 'Adversários mais lentos e que erram mais. Bom para aprender as pistas.' },
  { id: 'normal', name: 'Normal', description: 'Disputa equilibrada: os rivais usam drift e itens com critério.' },
  { id: 'hard', name: 'Difícil', description: 'Rivais rápidos, agressivos e que quase não erram.' },
] as const;
