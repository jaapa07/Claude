/** Perfis de qualidade gráfica (Baixa, Média, Alta). */
export interface QualityProfile {
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  shadowSize: number;
  particles: number;
  /** Densidade do clima (0..1). */
  weather: number;
  post: boolean;
}

export const QUALITY: Record<'low' | 'medium' | 'high', QualityProfile> = {
  low: { dpr: [0.75, 1], antialias: false, shadows: false, shadowSize: 512, particles: 1200, weather: 0.35, post: false },
  medium: { dpr: [1, 1.5], antialias: true, shadows: true, shadowSize: 1024, particles: 2600, weather: 0.7, post: true },
  high: { dpr: [1, 2], antialias: true, shadows: true, shadowSize: 2048, particles: 4200, weather: 1, post: true },
};
