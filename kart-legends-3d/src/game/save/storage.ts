/** Acesso defensivo ao localStorage (ausente em testes Node, bloqueado em alguns navegadores). */
export function getStorage(): Storage | null {
  try {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    if (!s || typeof s.getItem !== 'function' || typeof s.setItem !== 'function') return null;
    return s;
  } catch {
    return null;
  }
}

export function readKey(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Devolve `false` se não foi possível gravar (cota cheia, modo privado etc.). */
export function writeKey(key: string, value: string): boolean {
  try {
    const s = getStorage();
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    /* sem armazenamento: nada a remover */
  }
}
