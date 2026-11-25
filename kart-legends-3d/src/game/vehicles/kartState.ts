import type RAPIER from '@dimforge/rapier3d-compat';
import type { CharacterId, ItemId, KartId } from '@/data/ids';
import { NEUTRAL_INPUT, type InputState } from '@/game/core/types';
import type { KartTuning } from './kartTuning';

/** Estado completo de um competidor na simulação. */
export interface KartState {
  index: number;
  characterId: CharacterId;
  kartId: KartId;
  isPlayer: boolean;
  /** Vaga do jogador humano (0 = Jogador 1, 1 = Jogador 2); -1 = IA. */
  slot: number;
  /** true = controlado pela IA (inclui o jogador depois de cruzar a chegada). */
  ai: boolean;
  tuning: KartTuning;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  input: InputState;

  // transformação (centro do corpo) e anterior, para interpolação
  x: number; y: number; z: number;
  px: number; py: number; pz: number;
  heading: number; pHeading: number;
  vx: number; vy: number; vz: number;
  /** Velocidade para a frente (m/s, negativa em ré) e lateral. */
  speed: number;
  lateralSpeed: number;
  steer: number;
  grounded: boolean;
  airTime: number;
  /** Normal do chão. */
  nx: number; ny: number; nz: number;
  surface: number;
  onRoad: boolean;

  // drift e turbo
  drifting: boolean;
  /** +1 = derrapando para a direita, -1 = esquerda. */
  driftDir: number;
  driftCharge: number;
  driftLevel: 0 | 1 | 2 | 3;
  driftHeld: boolean;
  boostTime: number;
  boostTotal: number;
  /** Nível do último turbo (para efeitos): 1..3 drift, 4 item/placa. */
  boostKind: number;
  hopTime: number;
  jumpGrace: number;

  // danos
  spinTime: number;
  invuln: number;
  stun: number;
  shield: number;
  freeze: number;
  /** Raio Corrente: segundos restantes de lentidão e fração da velocidade máxima permitida. */
  slowTime: number;
  slowFactor: number;
  /** Cometa Guia: segundos restantes de piloto automático (imune a giros, empurra rivais). */
  comet: number;

  // itens
  item: ItemId | null;
  itemRoll: number;
  itemCooldown: number;
  itemHeld: boolean;

  // progresso
  /** -1 = pista principal; >= 0 = índice do atalho em que está. */
  pathId: number;
  pathIndex: number;
  /** Índice equivalente na pista principal. */
  mainIndex: number;
  lateral: number;
  lap: number;
  nextCheckpoint: number;
  checkpointsPassed: number;
  /** Progresso total (voltas * n + posição), usado na classificação. */
  progress: number;
  position: number;
  finished: boolean;
  finishTime: number;
  lapStart: number;
  lapTimes: number[];
  wrongWayTime: number;
  offTrackTime: number;
  lastSafeIndex: number;
  resetHeld: boolean;
  padCooldown: number;

  // estatísticas
  turbos: [number, number, number];
  itemsUsed: number;
  hitsTaken: number;
  topSpeed: number;
}

export function createKartState(base: Pick<KartState, 'index' | 'characterId' | 'kartId' | 'isPlayer' | 'ai' | 'tuning' | 'body' | 'collider'> & { slot?: number }): KartState {
  return {
    ...base,
    slot: base.isPlayer ? (base.slot ?? 0) : -1,
    input: { ...NEUTRAL_INPUT },
    x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, heading: 0, pHeading: 0, vx: 0, vy: 0, vz: 0,
    speed: 0, lateralSpeed: 0, steer: 0, grounded: true, airTime: 0, nx: 0, ny: 1, nz: 0, surface: 0, onRoad: true,
    drifting: false, driftDir: 0, driftCharge: 0, driftLevel: 0, driftHeld: false, boostTime: 0, boostTotal: 1, boostKind: 0,
    hopTime: 0, jumpGrace: 0, spinTime: 0, invuln: 0, stun: 0, shield: 0, freeze: 0, slowTime: 0, slowFactor: 1, comet: 0,
    item: null, itemRoll: 0, itemCooldown: 0, itemHeld: false,
    pathId: -1, pathIndex: 0, mainIndex: 0, lateral: 0, lap: 0, nextCheckpoint: 1, checkpointsPassed: 0, progress: 0,
    position: 1, finished: false, finishTime: 0, lapStart: 0, lapTimes: [], wrongWayTime: 0, offTrackTime: 0,
    lastSafeIndex: 0, resetHeld: false, padCooldown: 0,
    turbos: [0, 0, 0], itemsUsed: 0, hitsTaken: 0, topSpeed: 0,
  };
}
