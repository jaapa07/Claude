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
  /** Distância máxima de desenho (m): a neblina fecha antes dela. */
  drawDistance: number;
  /** Raio (m) em que os pilotos ganham as camadas procedurais (inércia do corpo e acessórios com mola). */
  animDetail: number;
  /** Escala do tremor de câmera (impactos, aterrissagens, turbo). */
  shake: number;
  /** Resolução do cubo do mapa de ambiente (reflexos e luz ambiente do HDRI). */
  envResolution: number;
  /** Relevo (mapas de normal/rugosidade) nos pisos, rochas, madeira e metal das pistas e arenas. */
  surfaceDetail: boolean;
}

export const QUALITY: Record<'low' | 'medium' | 'high', QualityProfile> = {
  low: { dpr: [0.75, 1], antialias: false, shadows: false, shadowSize: 512, particles: 1200, weather: 0.35, post: false, drawDistance: 340, animDetail: 22, shake: 0.6, envResolution: 64, surfaceDetail: false },
  medium: { dpr: [1, 1.5], antialias: true, shadows: true, shadowSize: 1024, particles: 2600, weather: 0.7, post: true, drawDistance: 700, animDetail: 45, shake: 0.85, envResolution: 128, surfaceDetail: true },
  high: { dpr: [1, 2], antialias: true, shadows: true, shadowSize: 2048, particles: 4200, weather: 1, post: true, drawDistance: 1600, animDetail: 70, shake: 1, envResolution: 256, surfaceDetail: true },
};
