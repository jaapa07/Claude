import type { TrackId } from '../../src/data/ids';
import type { ObstacleKind, SurfaceType } from '../../src/game/tracks/trackTypes';

/** Ponto de controle do traçado (autorado à mão). Atributos valem até o próximo ponto que os redefinir. */
export interface CP {
  x: number;
  z: number;
  y?: number;
  /** Meia largura da pista (m). */
  w?: number;
  surface?: SurfaceType;
  /** Inclinação lateral em graus (+ = lado esquerdo mais alto). */
  bank?: number;
  wall?: 'both' | 'left' | 'right' | 'none';
  /** Ponte/viaduto: o terreno não acompanha a pista; recebe laterais e pilares. */
  bridge?: boolean;
  /** Vão de salto: não há pista até o próximo ponto. */
  gap?: boolean;
  /** Estilo visual do piso neste trecho (ex.: 'wood'); '' volta ao padrão da superfície. */
  style?: string;
  /** Largura da faixa plana de terreno ao lado da pista neste trecho (abre clareiras/praças). */
  flat?: number;
  /** Nome para referenciar este ponto em itens, rampas, cenário etc. */
  tag?: string;
}

/** Posição ao longo da pista: nome de um ponto (`tag`), opcionalmente com deslocamento em metros ("ponte+30"). */
export type At = string;

export interface SceneryRule {
  prop: string | string[];
  from: At;
  to: At;
  side: 'left' | 'right' | 'both';
  /** Espaçamento médio (m). */
  every: number;
  /** Distância da borda da pista (mín, máx). */
  dist: [number, number];
  scale?: [number, number];
  /** Orientação: de frente para a pista, ao longo dela ou aleatória. */
  face?: 'road' | 'along' | 'random';
  /** Não coloca colisor mesmo que o objeto tenha. */
  noCollide?: boolean;
}

export interface SinglePlacement {
  prop: string;
  at: At;
  /** Deslocamento lateral em relação ao centro (m, + = esquerda). Ignorado se `over`. */
  offset?: number;
  /** Objeto que passa por cima da pista (usa `span`). */
  over?: boolean;
  rotY?: number;
  scale?: number;
  dy?: number;
  /** Plataforma: o topo do objeto (y=0 local) é chão dirigível (ilhas suspensas). */
  platform?: boolean;
}

export interface ScatterRule {
  prop: string | string[];
  count: number;
  /** Faixa de distância (m) até a pista mais próxima. */
  dist: [number, number];
  scale?: [number, number];
  /** Altura fixa (para ilhas/nuvens); omitido = segue o terreno. */
  y?: [number, number];
}

export interface TrackDef {
  id: TrackId;
  seed: number;
  points: CP[];
  offroad: SurfaceType;
  /** Estilo visual do piso por superfície e dos muros. */
  roadStyle: Partial<Record<SurfaceType, string>>;
  wallStyle: string;
  wallHeight?: number;
  /** Terreno: null = sem chão fora da pista (ilhas suspensas). */
  terrain: null | {
    /** Altura base longe da pista e amplitude/escala do relevo. */
    base: number;
    amp: number;
    scale: number;
    /** Faixa plana ao lado da pista e distância de transição até o relevo. */
    flat: number;
    rise: number;
    /** Relevo distante extra (montanhas ao fundo): altura adicional a partir de `farFrom` metros da pista. */
    far?: { from: number; height: number };
    /** Ilha: terra dentro do raio, fundo do mar (`sea`) fora. */
    island?: { x: number; z: number; r: number; sea: number };
    /** Canais escavados no relevo (rios, fossos, fendas). */
    rivers?: { pts: [number, number][]; width: number; depth: number }[];
    /** Paleta: [baixo, médio, alto, encosta]. */
    colors: [string, string, string, string];
    material: string;
  };
  waterY?: number;
  shortcuts?: { id: string; from: At; to: At; fromOffset?: number; toOffset?: number; points: CP[]; risky?: boolean }[];
  items: At[];
  boostPads?: { at: At; offset?: number }[];
  ramps?: { at: At; offset?: number; width?: number; length?: number; height?: number }[];
  obstacles?: { id: string; kind: ObstacleKind; model: string; at: At; from: number; to: number; period: number; phase?: number; radius: number; y?: number }[];
  scenery: SceneryRule[];
  singles: SinglePlacement[];
  scatter?: ScatterRule[];
  /** Pontos de câmera de apresentação: posição relativa a um ponto da pista. */
  intro: { at: At; offset: [number, number, number]; lookAt: At }[];
}
