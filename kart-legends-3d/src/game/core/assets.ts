/** Resolve um caminho dentro de `public/assets` respeitando o `base` do Vite. */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? './';
  return `${base}assets/${path.replace(/^\/+/, '')}`;
}
