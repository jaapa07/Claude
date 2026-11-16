import type { KartId } from './ids';
import type { UnlockRule } from './unlocks';

/** Atributos de 1 a 5. Todos os karts somam 24 pontos: são competitivamente equivalentes. */
export interface KartStats {
  topSpeed: number;
  acceleration: number;
  braking: number;
  handling: number;
  grip: number;
  mass: number;
  driftEfficiency: number;
  recovery: number;
}

export interface KartDef {
  id: KartId;
  name: string;
  description: string;
  stats: KartStats;
  primary: string;
  secondary: string;
  unlock: UnlockRule;
}

export const KART_STAT_LABELS: Record<keyof KartStats, string> = {
  topSpeed: 'Velocidade máxima',
  acceleration: 'Aceleração',
  braking: 'Frenagem',
  handling: 'Dirigibilidade',
  grip: 'Aderência',
  mass: 'Massa',
  driftEfficiency: 'Eficiência de drift',
  recovery: 'Recuperação',
};

export const KARTS: readonly KartDef[] = [
  { id: 'flecha', name: 'Flecha Rubra', description: 'Equilibrado e previsível: o kart de expedição do Nilo.', primary: '#e2542b', secondary: '#f6e2b8', unlock: { type: 'initial' },
    stats: { topSpeed: 3, acceleration: 3, braking: 3, handling: 3, grip: 3, mass: 3, driftEfficiency: 3, recovery: 3 } },
  { id: 'engrenagem', name: 'Vagão Engrenagem', description: 'Pesado, teimoso e difícil de empurrar para fora da pista.', primary: '#b9842f', secondary: '#3b4a54', unlock: { type: 'initial' },
    stats: { topSpeed: 3, acceleration: 2, braking: 4, handling: 2, grip: 4, mass: 5, driftEfficiency: 2, recovery: 2 } },
  { id: 'cometa', name: 'Cometa Prata', description: 'Demora a embalar, mas ninguém o alcança nas retas.', primary: '#c9d1e6', secondary: '#6c5ce7', unlock: { type: 'initial' },
    stats: { topSpeed: 5, acceleration: 2, braking: 2, handling: 3, grip: 3, mass: 3, driftEfficiency: 4, recovery: 2 } },
  { id: 'broto', name: 'Broto Verde', description: 'Leve e grudado no chão, perfeito para curvas fechadas.', primary: '#4caf50', secondary: '#8d5a2b', unlock: { type: 'initial' },
    stats: { topSpeed: 2, acceleration: 4, braking: 3, handling: 5, grip: 4, mass: 1, driftEfficiency: 2, recovery: 3 } },
  { id: 'faisca', name: 'Faísca Turbo', description: 'Arranca como um raio e vive de miniturbos.', primary: '#e23b4e', secondary: '#ffd23f', unlock: { type: 'wins', count: 1 },
    stats: { topSpeed: 3, acceleration: 5, braking: 2, handling: 3, grip: 2, mass: 2, driftEfficiency: 4, recovery: 3 } },
  { id: 'mare', name: 'Maré Alta', description: 'Um casco de barco sobre rodas que perdoa qualquer erro.', primary: '#1f8fc4', secondary: '#f3ead7', unlock: { type: 'timeTrials', count: 4 },
    stats: { topSpeed: 3, acceleration: 3, braking: 3, handling: 3, grip: 2, mass: 3, driftEfficiency: 2, recovery: 5 } },
  { id: 'duna', name: 'Rastro de Duna', description: 'Pneus largos: terra, areia e grama quase não o freiam.', primary: '#d9a441', secondary: '#7a3b1e', unlock: { type: 'turbo3', count: 25 },
    stats: { topSpeed: 3, acceleration: 3, braking: 2, handling: 2, grip: 5, mass: 4, driftEfficiency: 1, recovery: 4 } },
  { id: 'geada', name: 'Lâmina de Geada', description: 'Desliza de propósito: o rei do drift prolongado.', primary: '#58c7e8', secondary: '#27364a', unlock: { type: 'trophy', cup: 'eclipse', min: 'bronze' },
    stats: { topSpeed: 4, acceleration: 3, braking: 2, handling: 4, grip: 1, mass: 2, driftEfficiency: 5, recovery: 3 } },
];

export const KART_BY_ID = Object.fromEntries(KARTS.map((k) => [k.id, k])) as Record<KartId, KartDef>;
