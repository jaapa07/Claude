/** Registro de materiais PBR compartilhado por todos os scripts de assets. */
export interface MatDef {
  /** Fator de cor base (multiplica a cor de vértice e a textura). */
  color?: [number, number, number];
  roughness?: number;
  metalness?: number;
  emissive?: [number, number, number];
  emissiveStrength?: number;
  /** Nome de textura registrada em textures.ts (sem extensão). */
  map?: string;
  /** Textura que modula a emissão (ex.: rachaduras incandescentes da lava). */
  emissiveMap?: string;
  alpha?: number;
  doubleSided?: boolean;
  /** Ignora a cor de vértice (usa só textura/fator). */
  noVertexColor?: boolean;
}

export const MATERIALS: Record<string, MatDef> = {
  std: { roughness: 0.82 },
  matte: { roughness: 0.96 },
  glossy: { roughness: 0.32 },
  paint: { roughness: 0.22, metalness: 0.25 },
  metal: { roughness: 0.38, metalness: 0.9 },
  chrome: { roughness: 0.12, metalness: 1 },
  rubber: { roughness: 0.94 },
  skin: { roughness: 0.62 },
  fur: { roughness: 0.92 },
  cloth: { roughness: 0.88 },
  glass: { roughness: 0.08, alpha: 0.42, doubleSided: true },
  leaf: { roughness: 0.8, doubleSided: true },
  glow_warm: { roughness: 0.6, emissive: [1, 0.62, 0.22], emissiveStrength: 2.4 },
  glow_cyan: { roughness: 0.6, emissive: [0.25, 0.9, 1], emissiveStrength: 2.4 },
  glow_magenta: { roughness: 0.6, emissive: [1, 0.25, 0.75], emissiveStrength: 2.4 },
  glow_green: { roughness: 0.6, emissive: [0.4, 1, 0.5], emissiveStrength: 2.2 },
  glow_violet: { roughness: 0.6, emissive: [0.62, 0.42, 1], emissiveStrength: 2.4 },
  glow_white: { roughness: 0.6, emissive: [1, 0.96, 0.86], emissiveStrength: 2.2 },
  glow_red: { roughness: 0.6, emissive: [1, 0.2, 0.15], emissiveStrength: 2.2 },
};

export function defineMaterial(name: string, def: MatDef): string {
  const prev = MATERIALS[name];
  if (prev && JSON.stringify(prev) !== JSON.stringify(def)) throw new Error(`Material redefinido com valores diferentes: ${name}`);
  MATERIALS[name] = def;
  return name;
}
