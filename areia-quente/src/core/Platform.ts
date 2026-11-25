/**
 * Plataforma do jogo: versão PC (teclado/controle, gráficos altos) ou versão Celular (iPhone/Android: toque, gráficos leves).
 * Ordem de decisão: página (pc.html / celular.html) → ?plataforma=pc|celular → escolha salva → detecção automática.
 */
export type PlatformId = 'pc' | 'mobile';

function detect(): PlatformId {
  const forced = (window as any).__PLATFORM as PlatformId | undefined;
  if (forced === 'pc' || forced === 'mobile') return forced;
  const q = new URLSearchParams(location.search).get('plataforma');
  if (q === 'pc') return 'pc';
  if (q === 'celular' || q === 'mobile') return 'mobile';
  try { const s = localStorage.getItem('aq.platform'); if (s === 'pc' || s === 'mobile') return s; } catch { /* sem armazenamento */ }
  const touch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;
  return touch ? 'mobile' : 'pc';
}

export const platform = {
  id: detect(),
  get mobile() { return this.id === 'mobile'; },
  get label() { return this.id === 'mobile' ? 'VERSÃO CELULAR' : 'VERSÃO PC'; },
  /** troca de versão: guarda a escolha e recarrega na página certa */
  switchTo(id: PlatformId) {
    try { localStorage.setItem('aq.platform', id); } catch { /* sem armazenamento */ }
    location.href = id === 'mobile' ? './celular.html' : './pc.html';
  },
};
document.documentElement.classList.add(platform.mobile ? 'mobile' : 'pc');
