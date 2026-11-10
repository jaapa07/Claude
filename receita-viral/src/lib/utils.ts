import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Remove acentos e normaliza para comparação/busca. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export const DIFFICULTY_LABEL = { EASY: "Fácil", MEDIUM: "Média", HARD: "Difícil" } as const;
export const COST_LABEL = { LOW: "Econômica", MEDIUM: "Custo médio", HIGH: "Especial" } as const;
export const MEAL_LABEL = {
  BREAKFAST: "Café da manhã",
  LUNCH: "Almoço",
  SNACK: "Lanche",
  DINNER: "Jantar",
} as const;
export const MEAL_ORDER = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const;
export const PLATFORM_LABEL = {
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  PINTEREST: "Pinterest",
} as const;
export const GROUP_LABEL = {
  HORTIFRUTI: "Hortifrúti",
  CARNES: "Carnes e aves",
  PEIXES: "Peixes e frutos do mar",
  LATICINIOS: "Laticínios e ovos",
  MERCEARIA: "Mercearia",
  PADARIA: "Padaria",
  TEMPEROS: "Temperos e condimentos",
  BEBIDAS: "Bebidas",
  CONGELADOS: "Congelados",
  OUTROS: "Outros",
} as const;
export const STATUS_LABEL = {
  DRAFT: "Rascunho",
  PENDING: "Em revisão",
  PUBLISHED: "Publicada",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
} as const;

export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** Escolha determinística baseada em uma semente (ex.: data do dia). */
export function seededPick<T>(items: T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Embaralhamento determinístico (mesma ordem para a mesma semente, ex.: o dia). */
export function seededShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
  const hash = (s: string) => {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  return [...items].sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
}
