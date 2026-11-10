import type { Platform } from './types';

export interface ParsedLink {
  platform: Platform;
  /** URL normalizada (sem query string). */
  url: string;
  /** ID numérico do vídeo no TikTok, ou shortcode do post/reel no Instagram. */
  id?: string;
  /** Tipo do post no Instagram (p, reel, tv). */
  igKind?: 'p' | 'reel' | 'tv';
}

const TIKTOK_VIDEO = /tiktok\.com\/@[^/]+\/(?:video|photo)\/(\d+)/i;
const TIKTOK_SHORT = /^(?:vm|vt)\.tiktok\.com$|^(?:www\.)?tiktok\.com$/i;
const INSTAGRAM_POST = /instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

/** Reconhece links do TikTok e do Instagram. Retorna null para qualquer outra coisa. */
export function parseVideoLink(input: string): ParsedLink | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const clean = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, '');

  if (host.endsWith('tiktok.com')) {
    const m = clean.match(TIKTOK_VIDEO);
    if (m) return { platform: 'tiktok', url: clean, id: m[1] };
    // Links curtos (vm.tiktok.com/XXXX) só têm o ID depois do redirecionamento;
    // o oEmbed resolve isso para nós.
    if (TIKTOK_SHORT.test(host) && url.pathname.length > 1) {
      return { platform: 'tiktok', url: clean };
    }
    return null;
  }

  if (host.endsWith('instagram.com')) {
    const m = clean.match(INSTAGRAM_POST);
    if (!m) return null;
    const kind = m[1].toLowerCase() === 'reels' ? 'reel' : (m[1].toLowerCase() as 'p' | 'reel' | 'tv');
    return {
      platform: 'instagram',
      url: `https://www.instagram.com/${kind}/${m[2]}/`,
      id: m[2],
      igKind: kind,
    };
  }

  return null;
}

/**
 * URL do player oficial embutível. Usamos sempre o player da própria rede:
 * o vídeo continua hospedado lá, com crédito ao criador.
 */
export function embedUrl(link: ParsedLink): string | null {
  if (!link.id) return null;
  if (link.platform === 'tiktok') {
    return `https://www.tiktok.com/player/v1/${link.id}?music_info=1&description=1&rel=0`;
  }
  return `https://www.instagram.com/${link.igKind ?? 'p'}/${link.id}/embed/captioned/`;
}

export interface OEmbedInfo {
  title?: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  /** ID do vídeo resolvido (útil para links curtos do TikTok). */
  videoId?: string;
}

/**
 * Busca título (legenda), autor e miniatura via oEmbed oficial.
 * - TikTok: endpoint público, sem chave.
 * - Instagram: exige um token de app da Meta (EXPO_PUBLIC_META_OEMBED_TOKEN).
 *   Sem token, retorna null e o usuário preenche os dados à mão.
 */
export async function fetchOEmbed(
  link: ParsedLink,
  fetchImpl: typeof fetch = fetch,
): Promise<OEmbedInfo | null> {
  let endpoint: string;
  if (link.platform === 'tiktok') {
    endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(link.url)}`;
  } else {
    const token = process.env.EXPO_PUBLIC_META_OEMBED_TOKEN;
    if (!token) return null;
    endpoint =
      `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(link.url)}` +
      `&omitscript=true&access_token=${encodeURIComponent(token)}`;
  }

  try {
    const res = await fetchImpl(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const str = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : undefined);
    return {
      title: str('title'),
      authorName: str('author_name'),
      authorUrl: str('author_url'),
      thumbnailUrl: str('thumbnail_url'),
      videoId: str('embed_product_id'),
    };
  } catch {
    return null;
  }
}

export function platformLabel(p?: Platform): string {
  if (p === 'tiktok') return 'TikTok';
  if (p === 'instagram') return 'Instagram';
  return 'Receita';
}
