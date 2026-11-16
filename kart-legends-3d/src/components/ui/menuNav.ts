export type NavDirection = 'up' | 'down' | 'left' | 'right';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"]';

/** Escopo ativo = o último `[data-nav-scope]` do documento (sobreposições vêm depois da tela base). */
export function activeScope(doc: Document = document): HTMLElement | null {
  const scopes = doc.querySelectorAll<HTMLElement>('[data-nav-scope]');
  return scopes.length > 0 ? scopes[scopes.length - 1] : null;
}

export function focusables(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

/** Foca o item marcado com `data-autofocus` (ou o primeiro focável) do escopo ativo. */
export function focusInitial(doc: Document = document): void {
  const scope = activeScope(doc);
  if (!scope) return;
  const preferred = scope.querySelector<HTMLElement>('[data-autofocus="true"]:not([disabled])');
  (preferred ?? focusables(scope)[0])?.focus({ preventScroll: true });
}

/**
 * Navegação espacial: move o foco para o controle mais próximo na direção pedida.
 * Devolve `true` se o foco mudou.
 */
export function moveFocus(dir: NavDirection, doc: Document = document): boolean {
  const scope = activeScope(doc);
  if (!scope) return false;
  const items = focusables(scope);
  if (items.length === 0) return false;
  const current = doc.activeElement instanceof HTMLElement && scope.contains(doc.activeElement) ? doc.activeElement : null;
  if (!current) {
    focusInitial(doc);
    return true;
  }
  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - fx;
    const dy = r.top + r.height / 2 - fy;
    let primary: number;
    let cross: number;
    if (dir === 'left' || dir === 'right') {
      primary = dir === 'right' ? dx : -dx;
      // Sobreposição vertical conta como alinhado.
      cross = r.bottom > from.top + 2 && r.top < from.bottom - 2 ? Math.abs(dy) * 0.3 : Math.abs(dy);
    } else {
      primary = dir === 'down' ? dy : -dy;
      cross = r.right > from.left + 2 && r.left < from.right - 2 ? Math.abs(dx) * 0.3 : Math.abs(dx);
    }
    if (primary < 4) continue;
    const score = primary + cross * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (!best) return false;
  best.focus({ preventScroll: true });
  best.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  return true;
}
