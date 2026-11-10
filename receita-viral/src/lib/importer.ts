/**
 * Importação de receitas de FONTES AUTORIZADAS via schema.org/Recipe (JSON-LD).
 *
 * Princípios (direitos autorais e termos de uso):
 * - Só importa de fontes cadastradas pelo admin com `allowImport = true` e domínio correspondente.
 * - Importa dados factuais (título, tempos, porções, lista de ingredientes) + URL original e créditos.
 * - NÃO reproduz o modo de preparo integral: guarda apenas um resumo das etapas com link para o original,
 *   e a receita entra como RASCUNHO para revisão/reescrita editorial.
 */
import { UNITS } from "@/lib/validation";

export interface ImportedRecipe {
  title: string;
  description: string;
  imageUrl: string | null;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: { name: string; quantity: number | null; unit: (typeof UNITS)[number]; note: string | null }[];
  stepCount: number;
  author: string | null;
  sourceUrl: string;
}

/** Converte duração ISO 8601 (PT1H30M) em minutos. */
export function isoDurationToMinutes(value: unknown): number {
  if (typeof value !== "string") return 0;
  const m = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0);
}

const UNIT_ALIASES: [RegExp, (typeof UNITS)[number]][] = [
  [/^(kg|quilos?)\b/i, "kg"],
  [/^(g|gramas?)\b/i, "g"],
  [/^(ml|mililitros?)\b/i, "ml"],
  [/^(l|litros?)\b/i, "l"],
  [/^(x[ií]caras?( \(ch[aá]\))?|xic\.?|cups?)\b/i, "xícara"],
  [/^(colher(es)? de sopa|c\. ?sopa|tbsp|tablespoons?)\b/i, "colher de sopa"],
  [/^(colher(es)? de ch[aá]|c\. ?ch[aá]|tsp|teaspoons?)\b/i, "colher de chá"],
  [/^(dentes?)\b/i, "dente"],
  [/^(fatias?)\b/i, "fatia"],
  [/^(pitadas?)\b/i, "pitada"],
  [/^(ma[çc]os?)\b/i, "maço"],
  [/^(latas?)\b/i, "lata"],
  [/^(pacotes?)\b/i, "pacote"],
  [/^(unidades?)\b/i, "unidade"],
];

const FRACTION_CHARS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

function parseAmount(s: string): { qty: number | null; rest: string } {
  const str = s.trim();
  let m = str.match(/^(\d+)\s+(\d+)\/(\d+)\s*/); // "1 1/2"
  if (m && Number(m[3])) return { qty: Number(m[1]) + Number(m[2]) / Number(m[3]), rest: str.slice(m[0].length).trim() };
  m = str.match(/^(\d+)\/(\d+)\s*/); // "1/2"
  if (m && Number(m[2])) return { qty: Number(m[1]) / Number(m[2]), rest: str.slice(m[0].length).trim() };
  m = str.match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔⅛])?\s*/); // "2", "1,5", "1 ½", "½"
  if (!m || (!m[1] && !m[2])) return { qty: null, rest: str };
  const qty = (m[1] ? Number(m[1].replace(",", ".")) : 0) + (m[2] ? FRACTION_CHARS[m[2]] : 0);
  return { qty: qty || null, rest: str.slice(m[0].length).trim() };
}

export function parseIngredientText(line: string): ImportedRecipe["ingredients"][number] {
  const clean = line.replace(/\s+/g, " ").trim();
  if (/a gosto/i.test(clean)) {
    return { name: clean.replace(/\s*a gosto\s*/i, "").replace(/^(sal e|e)\s+/i, (x) => x).trim().toLowerCase() || clean.toLowerCase(), quantity: null, unit: "a gosto", note: null };
  }
  const { qty, rest } = parseAmount(clean);
  let unit: (typeof UNITS)[number] = "unidade";
  let name = rest;
  for (const [re, u] of UNIT_ALIASES) {
    const m = rest.match(re);
    if (m) {
      unit = u;
      name = rest.slice(m[0].length).trim().replace(/^de\s+/i, "");
      break;
    }
  }
  const noteMatch = name.match(/\(([^)]+)\)|,\s*(.+)$/);
  const note = noteMatch ? (noteMatch[1] ?? noteMatch[2] ?? null) : null;
  name = name.replace(/\([^)]*\)/g, "").replace(/,.*$/, "").trim().toLowerCase();
  return { name: name || clean.toLowerCase(), quantity: qty, unit: qty == null && unit === "unidade" ? "a gosto" : unit, note };
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function findRecipeNode(data: unknown): Record<string, unknown> | null {
  for (const node of asArray(data as unknown)) {
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    const type = asArray(obj["@type"] as string | string[]);
    if (type.includes("Recipe")) return obj;
    if (obj["@graph"]) {
      const found = findRecipeNode(obj["@graph"]);
      if (found) return found;
    }
  }
  return null;
}

export function extractJsonLdRecipe(html: string, sourceUrl: string): ImportedRecipe | null {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(s[1].trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(data);
    if (!node) continue;
    const image = asArray(node.image as unknown)[0];
    const imageUrl = typeof image === "string" ? image : (image as { url?: string } | undefined)?.url ?? null;
    const yieldRaw = asArray(node.recipeYield as unknown)[0];
    const servings = Math.max(1, Math.min(100, parseInt(String(yieldRaw ?? "4"), 10) || 4));
    const author = asArray(node.author as unknown)[0];
    const authorName = typeof author === "string" ? author : (author as { name?: string } | undefined)?.name ?? null;
    const instructions = asArray(node.recipeInstructions as unknown);
    return {
      title: String(node.name ?? "").trim().slice(0, 120),
      description: String(node.description ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 600),
      imageUrl: imageUrl && /^https:\/\//.test(imageUrl) ? imageUrl : null,
      prepMinutes: isoDurationToMinutes(node.prepTime),
      cookMinutes: isoDurationToMinutes(node.cookTime) || Math.max(0, isoDurationToMinutes(node.totalTime) - isoDurationToMinutes(node.prepTime)),
      servings,
      ingredients: asArray(node.recipeIngredient as string[]).map((l) => parseIngredientText(String(l))).filter((i) => i.name),
      stepCount: instructions.length,
      author: authorName,
      sourceUrl,
    };
  }
  return null;
}

export function hostMatches(url: string, baseUrl: string): boolean {
  try {
    const a = new URL(url).hostname.replace(/^www\./, "");
    const b = new URL(baseUrl).hostname.replace(/^www\./, "");
    return a === b || a.endsWith(`.${b}`);
  } catch {
    return false;
  }
}

/** Bloqueia URLs para hosts internos (mitigação simples de SSRF). */
export function isPublicHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname;
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "[::1]") return false;
    return true;
  } catch {
    return false;
  }
}
