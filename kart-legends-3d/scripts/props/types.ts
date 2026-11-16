import type { Model, V3 } from '../lib/geo';

/**
 * Definição de um objeto de cenário. Origem no chão, no centro; "frente" = +Z
 * (o construtor de pistas vira a frente para a estrada quando o objeto é de beira de pista).
 */
export interface PropDef {
  /** `span` = vão livre em metros para objetos que passam POR CIMA da pista (arcos, portais, túneis, pórticos). */
  build: (rand: () => number, span?: number) => Model;
  /** Raio de ocupação no chão (m): usado para espaçar objetos e afastá-los da pista. */
  radius: number;
  /** Colisor simplificado (cilindro vertical centrado na origem). Omitir = sem colisão (decoração/vegetação baixa). */
  collider?: { radius: number; height: number };
  /** Parte móvel exportada à parte e animada em tempo real (pás de moinho, bandeira, planta). */
  animated?: {
    build: (rand: () => number) => Model;
    /** Posição do pivô da parte móvel em relação à origem do objeto. */
    pivot: V3;
    motion: { kind: 'spin'; axis: 'x' | 'y' | 'z'; period: number } | { kind: 'sway'; axis: 'x' | 'z'; angle: number; period: number } | { kind: 'bob'; height: number; period: number };
  };
}

export type PropLibrary = Record<string, PropDef>;
