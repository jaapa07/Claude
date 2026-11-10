export type Platform = 'tiktok' | 'instagram';

export type Category =
  | 'Doces'
  | 'Salgados'
  | 'Massas'
  | 'Carnes'
  | 'Saudável'
  | 'Bebidas'
  | 'Airfryer';

export const CATEGORIES: Category[] = [
  'Doces',
  'Salgados',
  'Massas',
  'Carnes',
  'Saudável',
  'Bebidas',
  'Airfryer',
];

export interface Recipe {
  id: string;
  title: string;
  category: Category;
  /** Minutos de preparo (aproximado). */
  minutes?: number;
  ingredients: string[];
  steps: string[];
  /** Link original do vídeo no TikTok ou Instagram. */
  videoUrl?: string;
  platform?: Platform;
  /** Dados do autor/criador, vindos do oEmbed ou informados à mão. */
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  /** Visualizações informadas manualmente, usadas no ranking "Em alta". */
  views?: number;
  /** Receitas de exemplo vêm sem vídeo e podem ser apagadas. */
  isSample?: boolean;
  createdAt: number;
}
