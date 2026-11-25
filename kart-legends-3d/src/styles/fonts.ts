import { assetUrl } from '@/game/core/assets';

/**
 * Fonte do logotipo e dos títulos: "Lilita One" (SIL OFL 1.1, via @fontsource, licença em assets/fonts).
 * Carregada sem bloquear: até chegar (~11 kB), os títulos usam a fonte de sistema de `--font-display`.
 */
export function loadBrandFont(): void {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return;
  const face = new FontFace('Lilita One', `url(${assetUrl('fonts/lilita-one-latin.woff2')}) format("woff2")`, {
    display: 'swap',
    unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  });
  document.fonts.add(face);
  face.load().catch((e: unknown) => console.warn('[fonte] Lilita One indisponível; usando a fonte do sistema', e));
}
