import type { Category, Platform, Recipe } from './types';

export interface Filters {
  query: string;
  platform: Platform | 'all';
  category: Category | 'all';
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function matches(recipe: Recipe, f: Filters): boolean {
  if (f.platform !== 'all' && recipe.platform !== f.platform) return false;
  if (f.category !== 'all' && recipe.category !== f.category) return false;
  const q = normalize(f.query.trim());
  if (!q) return true;
  const haystack = normalize(
    [recipe.title, recipe.authorName ?? '', recipe.category, ...recipe.ingredients].join(' '),
  );
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/**
 * Ordem do feed "Em alta": receitas com vídeo primeiro, depois as com mais
 * visualizações, depois as mais recentes.
 */
export function rankRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => {
    const va = a.videoUrl ? 1 : 0;
    const vb = b.videoUrl ? 1 : 0;
    if (va !== vb) return vb - va;
    const viewsDiff = (b.views ?? 0) - (a.views ?? 0);
    if (viewsDiff !== 0) return viewsDiff;
    return b.createdAt - a.createdAt;
  });
}

export function formatViews(n?: number): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace('.', ',')} mil`;
  return String(n);
}

/** Aceita "1,2 mi", "350 mil", "1.2M", "15k", "12000". */
export function parseViews(input: string): number | undefined {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return undefined;
  const m = s.match(/^([\d.,]+)(mi|m|mil|k)?$/);
  if (!m) return undefined;
  const mult = m[2] === 'mi' || m[2] === 'm' ? 1_000_000 : m[2] === 'mil' || m[2] === 'k' ? 1_000 : 1;
  let num = m[1];
  if (mult === 1) num = num.replace(/[.,]/g, '');
  else num = num.replace(',', '.');
  const value = Number(num) * mult;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}
