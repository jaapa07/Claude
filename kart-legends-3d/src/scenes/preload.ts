import { assetUrl } from '@/game/core/assets';
import { STUDIO_ENVIRONMENT } from '@/game/tracks/environments';
import { ATTRACT_ENVIRONMENT } from './AttractScene';

/** Mapas de ambiente da abertura e do menu (os das pistas são baixados com a pista). */
const EARLY_ENV = new Set(['env/env.json', `env/${STUDIO_ENVIRONMENT.ibl.map}.webp`, `env/${ATTRACT_ENVIRONMENT.ibl.map}.webp`]);

/** Erros passageiros do servidor (GitHub Pages devolve 503/429 de vez em quando): vale tentar de novo. */
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1200, 2500, 5000];
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Baixa um arquivo, repetindo em falhas passageiras. Devolve o motivo da falha definitiva, ou `null` se deu certo. */
export async function fetchWithRetry(url: string, delays: readonly number[] = RETRY_DELAYS_MS): Promise<string | null> {
  let problem = 'falha de rede';
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    if (attempt > 0) await wait(delays[attempt - 1]!);
    try {
      const r = await fetch(url, attempt > 0 ? { cache: 'reload' } : undefined);
      if (r.ok) { await r.arrayBuffer(); return null; }
      problem = String(r.status);
      if (!TRANSIENT.has(r.status)) return problem;
    } catch {
      problem = 'falha de rede';
    }
  }
  return problem;
}

interface ManifestEntry { id: string; path: string; type: string }

/**
 * Baixa os recursos visuais listados em assets/manifest.json (menos as malhas das pistas) para o cache
 * do navegador antes do menu. Rejeita listando os arquivos que faltarem: nada é ignorado em silêncio.
 * O áudio é carregado pelo gerenciador de áudio.
 */
export async function preloadCoreAssets(onProgress: (p: number) => void): Promise<void> {
  let res = await fetch(assetUrl('manifest.json'));
  for (let i = 0; !res.ok && TRANSIENT.has(res.status) && i < RETRY_DELAYS_MS.length; i++) {
    await wait(RETRY_DELAYS_MS[i]!);
    res = await fetch(assetUrl('manifest.json'), { cache: 'reload' });
  }
  if (!res.ok) throw new Error(`Manifesto de assets ausente (assets/manifest.json: ${res.status})`);
  const manifest = (await res.json()) as { assets: ManifestEntry[] };
  // Áudio: carregado pelo gerenciador de áudio. Malhas das pistas (~100 MB): baixadas só quando a corrida
  // daquela pista começa — no celular baixar tudo no início é lento e pode estourar a memória do navegador.
  // Mapas de ambiente e de relevo também são por pista (baixados na hora da corrida; o relevo nem existe na
  // qualidade Baixa); só o ambiente do menu e os metadados entram aqui.
  const lazy = (p: string): boolean => (p.startsWith('tracks/') && p.endsWith('.glb')) || p.startsWith('detail/')
    || (p.startsWith('env/') && !EARLY_ENV.has(p)) || p.endsWith('sources.json') || p.endsWith('.txt');
  const list = manifest.assets.filter((a) => a.type !== 'audio' && !lazy(a.path));
  const missing: string[] = [];
  let done = 0;
  onProgress(0);
  const queue = [...list];
  const worker = async (): Promise<void> => {
    for (let a = queue.shift(); a; a = queue.shift()) {
      const problem = await fetchWithRetry(assetUrl(a.path));
      if (problem) missing.push(`${a.path} (${problem})`);
      onProgress(++done / list.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (missing.length) throw new Error(`Recursos ausentes: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ` e mais ${missing.length - 8}` : ''}`);
}
