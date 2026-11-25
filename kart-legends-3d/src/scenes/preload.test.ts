import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from './preload';

const resp = (status: number): Response => ({ ok: status < 400, status, arrayBuffer: async () => new ArrayBuffer(0) }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe('fetchWithRetry', () => {
  it('repete em 503 e conclui quando o servidor volta', async () => {
    const f = vi.fn().mockResolvedValueOnce(resp(503)).mockResolvedValueOnce(resp(503)).mockResolvedValueOnce(resp(200));
    vi.stubGlobal('fetch', f);
    expect(await fetchWithRetry('x', [0, 0, 0])).toBeNull();
    expect(f).toHaveBeenCalledTimes(3);
  });
  it('não repete em 404', async () => {
    const f = vi.fn().mockResolvedValue(resp(404));
    vi.stubGlobal('fetch', f);
    expect(await fetchWithRetry('x', [0, 0])).toBe('404');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('desiste depois das tentativas em falha de rede', async () => {
    const f = vi.fn().mockRejectedValue(new Error('net'));
    vi.stubGlobal('fetch', f);
    expect(await fetchWithRetry('x', [0, 0])).toBe('falha de rede');
    expect(f).toHaveBeenCalledTimes(3);
  });
});
