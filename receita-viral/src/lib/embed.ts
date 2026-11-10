/**
 * Converte URLs públicas de vídeos em URLs oficiais de incorporação.
 * Só gera embeds para provedores com player oficial; outros retornam null (exibe link).
 */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname.startsWith("/embed/")) return `https://www.youtube-nocookie.com${u.pathname}`;
    const shorts = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
    if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{6,}$/.test(v)) return `https://www.youtube-nocookie.com/embed/${v}`;
    return null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "tiktok.com") {
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(p|reel)\/([\w-]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : null;
  }
  if (host === "vimeo.com") {
    const m = u.pathname.match(/^\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  }
  if (/\.(mp4|webm)$/i.test(u.pathname)) return url;
  return null;
}

export function isDirectVideo(url: string) {
  return /\.(mp4|webm)(\?|$)/i.test(url) || url.startsWith("/api/uploads/");
}
