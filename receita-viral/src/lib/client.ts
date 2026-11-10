"use client";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

/** Fetch JSON com tratamento de erro padronizado (mensagens em pt-BR vindas da API). */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? "Algo deu errado. Tente novamente.";
    throw new ApiError(res.status, msg, (data as { details?: { path: string; message: string }[] }).details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.details?.length) return `${err.message}: ${err.details[0].message}`;
  if (err instanceof Error) return err.message;
  return "Algo deu errado. Tente novamente.";
}
