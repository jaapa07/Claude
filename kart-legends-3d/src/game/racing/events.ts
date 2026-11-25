import type { ItemId } from '@/data/ids';

/** Eventos emitidos pela simulação para áudio, efeitos visuais e HUD. */
export type SimEvent =
  | { type: 'countdown'; value: number }
  | { type: 'go' }
  | { type: 'drift_start'; kart: number }
  | { type: 'drift_level'; kart: number; level: number }
  | { type: 'turbo'; kart: number; level: number }
  | { type: 'boost_pad'; kart: number }
  | { type: 'jump'; kart: number }
  | { type: 'land'; kart: number; impact: number }
  | { type: 'collision'; kart: number; strength: number; x: number; y: number; z: number }
  | { type: 'hit'; kart: number; cause: 'faisca' | 'nevoa' | 'obstaculo' }
  | { type: 'shield_break'; kart: number }
  | { type: 'pushed'; kart: number }
  /** Raio Corrente atingiu `kart` no elo `link` (0 = primeiro, o mais forte), vindo de `from`. */
  | { type: 'zapped'; kart: number; from: number; link: number }
  /** O Cometa Guia de `by` tirou `kart` do caminho. */
  | { type: 'rammed'; kart: number; by: number }
  | { type: 'comet_end'; kart: number }
  | { type: 'item_pickup'; kart: number }
  | { type: 'item_ready'; kart: number; item: ItemId }
  | { type: 'item_use'; kart: number; item: ItemId; x: number; y: number; z: number }
  | { type: 'lap'; kart: number; lap: number; timeMs: number; final: boolean }
  | { type: 'finish'; kart: number; position: number }
  | { type: 'respawn'; kart: number; reason: 'fall' | 'water' | 'offtrack' | 'manual' | 'stuck' }
  | { type: 'wrong_way'; kart: number };
