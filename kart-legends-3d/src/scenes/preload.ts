import { assetUrl } from '@/game/core/assets';

interface ManifestEntry { id: string; path: string; type: string }

/**
 * Baixa todos os recursos visuais listados em assets/manifest.json para o cache do navegador
 * antes do menu. Rejeita listando os arquivos que faltarem: nada é ignorado em silêncio.
 * O áudio é carregado pelo gerenciador de áudio.
 */
export async function preloadCoreAssets(onProgress: (p: number) => void): Promise<void> {
  const res = await fetch(assetUrl('manifest.json'));
  if (!res.ok) throw new Error(`Manifesto de assets ausente (assets/manifest.json: ${res.status})`);
  const manifest = (await res.json()) as { assets: ManifestEntry[] };
  const list = manifest.assets.filter((a) => a.type !== 'audio');
  const missing: string[] = [];
  let done = 0;
  onProgress(0);
  const queue = [...list];
  const worker = async (): Promise<void> => {
    for (let a = queue.shift(); a; a = queue.shift()) {
      try {
        const r = await fetch(assetUrl(a.path));
        if (!r.ok) missing.push(`${a.path} (${r.status})`);
        else await r.arrayBuffer();
      } catch {
        missing.push(`${a.path} (falha de rede)`);
      }
      onProgress(++done / list.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (missing.length) throw new Error(`Recursos ausentes: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ` e mais ${missing.length - 8}` : ''}`);
}
