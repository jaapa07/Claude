import type { CupId, TrophyTier } from './ids';
import { CUP_BY_ID } from './tracks';

/** Regra declarativa de desbloqueio avaliada pelo sistema de progressão. */
export type UnlockRule =
  | { type: 'initial' }
  | { type: 'races'; count: number }
  | { type: 'wins'; count: number }
  | { type: 'trophy'; cup: CupId; min: TrophyTier }
  | { type: 'timeTrials'; count: number }
  | { type: 'turbo3'; count: number }
  /** Só comprando na loja. */
  | { type: 'shop' };

export function describeUnlock(rule: UnlockRule): string {
  switch (rule.type) {
    case 'initial': return 'Disponível desde o início';
    case 'races': return `Complete ${rule.count} corridas`;
    case 'wins': return `Vença ${rule.count} ${rule.count === 1 ? 'corrida' : 'corridas'}`;
    case 'trophy': {
      const tier = { bronze: 'bronze', silver: 'prata', gold: 'ouro' }[rule.min];
      const cup = CUP_BY_ID[rule.cup].name;
      return `Conquiste o troféu de ${tier} ou melhor na ${cup}`;
    }
    case 'timeTrials': return `Registre tempos no Contrarrelógio em ${rule.count} pistas`;
    case 'turbo3': return `Solte ${rule.count} miniturbos de nível 3`;
    case 'shop': return 'Disponível na loja';
  }
}
