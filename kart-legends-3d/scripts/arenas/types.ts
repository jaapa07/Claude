import type { ArenaId } from '../../src/data/battle';
import type { Model } from '../lib/geo';
import type { Rand } from '../props/kit-eclipse';

export type XZ = [number, number];
export type Side = 'n' | 's' | 'e' | 'w';

/** Arena de batalha autorada à mão (área aberta, sem traçado). */
export interface ArenaDef {
  id: ArenaId;
  seed: number;
  center: XZ;
  /** Raio da área jogável (a IA evita passar dele). */
  radius: number;
  killY: number;
  ground: {
    min: number; max: number; cell: number;
    height: (x: number, z: number) => number;
    material: string;
    /** Metros por repetição da textura. */
    tile: number;
    /** [baixo, médio, alto, encosta]. */
    colors: [string, string, string, string];
  };
  /** Pinturas no chão (grama, anéis de pedra), coladas no relevo. */
  decals: (
    | { kind: 'disc'; x: number; z: number; r: number; mat: string; tile: number; color?: string }
    | { kind: 'ring'; x: number; z: number; r0: number; r1: number; mat: string; tile: number; color?: string }
  )[];
  /** Muros: polilinhas com colisor (caixas) e visual opcional. */
  walls: { pts: XZ[]; closed: boolean; height: number; thick: number; style: 'balustrade' | 'none'; y?: number }[];
  /** Plataformas (canteiros, mesa) com rampas nos lados indicados (lado do eixo local: n = +z, s = -z, e = +x, w = -x). */
  platforms: { x: number; z: number; hx: number; hz: number; rotY: number; height: number; top: string; side: string; tile: number; ramps: Side[]; rampWidth: number; rampLength: number }[];
  /** Objetos das bibliotecas (props) — `rotY: 'center'` vira a frente (+Z) para o centro. */
  props: { id: string; x: number; z: number; rotY?: number | 'center'; scale?: number; dy?: number; collide?: boolean }[];
  /** Modelos próprios (props das arenas), com colisores cilíndricos relativos [dx, dz, raio, altura]. */
  custom: { name: string; build: (rand: Rand) => Model; x: number; z: number; rotY?: number; scale?: number; dy?: number; colliders?: [number, number, number, number][] }[];
  boostPads: [number, number, number][];
  itemBoxes: XZ[];
  spawnRadius: number;
  crownSpawns: XZ[];
  /** Área para sortear pontos de cristal (anel em volta do centro) e passo da grade. */
  crystals: { r0: number; r1: number; step: number };
  intro: { pos: [number, number, number]; target: [number, number, number] }[];
  /** Contorno do minimapa. */
  outline: XZ[];
}
