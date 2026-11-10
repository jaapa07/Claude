import { normalize } from "@/lib/utils";

export type ChefIntent =
  | { kind: "ingredients"; items: string[] }
  | { kind: "weekly-menu" }
  | { kind: "romantic"; servings: number }
  | { kind: "budget"; count: number }
  | { kind: "scale"; servings: number; recipeHint: string }
  | { kind: "cuisine"; cuisine: string; easy: boolean; quick: boolean }
  | { kind: "category"; category: string; easy: boolean; quick: boolean }
  | { kind: "search"; text: string; easy: boolean; quick: boolean };

const NUMBER_WORDS: Record<string, number> = {
  uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12,
};

export const CUISINE_WORDS: Record<string, string> = {
  brasileir: "brasileira", japones: "japonesa", italian: "italiana", corean: "coreana", chines: "chinesa",
  mexican: "mexicana", american: "americana", frances: "francesa", arabe: "arabe",
};

export const CATEGORY_WORDS: Record<string, string> = {
  sobremesa: "sobremesas-e-doces", doce: "sobremesas-e-doces", bolo: "bolos-e-tortas", torta: "bolos-e-tortas",
  sopa: "sopas-e-caldos", caldo: "sopas-e-caldos", salada: "saladas", fitness: "fitness", saudave: "fitness", leve: "fitness",
  vegan: "vegetarianas-e-veganas", vegetarian: "vegetarianas-e-veganas", "air fryer": "air-fryer", airfryer: "air-fryer",
  massa: "massas-e-pizzas", pizza: "massas-e-pizzas", macarrao: "massas-e-pizzas", frango: "frangos", peixe: "peixes-e-frutos-do-mar",
  "frutos do mar": "peixes-e-frutos-do-mar", camarao: "peixes-e-frutos-do-mar", churrasco: "carnes-e-churrasco", carne: "carnes-e-churrasco",
  hamburguer: "hamburgueres-e-lanches", lanche: "hamburgueres-e-lanches", boteco: "comidas-de-boteco", petisco: "comidas-de-boteco",
  bebida: "cafes-e-bebidas", cafe: "cafes-e-bebidas", drink: "cafes-e-bebidas", suco: "cafes-e-bebidas",
};

export function parseNumber(text: string, fallback: number): number {
  const m = text.match(/\b(\d{1,2})\b/);
  if (m) return Number(m[1]);
  for (const [w, n] of Object.entries(NUMBER_WORDS)) if (new RegExp(`\\b${w}\\b`).test(text)) return n;
  return fallback;
}

export function detectIntent(raw: string): ChefIntent {
  const t = normalize(raw);
  const easy = /\b(facil|simples|rapid|pratic)/.test(t);
  const quick = /\b(rapid|minuto|pressa|15 min|20 min)/.test(t);

  if (/cardapio semanal|semana inteira|cardapio da semana|plano semanal|menu semanal/.test(t)) return { kind: "weekly-menu" };
  if (/romantic|a dois|para dois|para duas pessoas|namorad/.test(t)) return { kind: "romantic", servings: 2 };
  if (/(adapt|ajust|escal|aument|reduz|converta).*(pessoa|porc)/.test(t)) {
    const servings = parseNumber(t.replace(/.*?(para|pra)\s/, ""), 4);
    return { kind: "scale", servings, recipeHint: raw };
  }
  const have = t.match(/(?:tenho|sobrou|sobraram|na geladeira tem|com o que tenho:?|usando)\s+(.+?)(?:\.|\?|!|o que|que posso|$)/);
  if (have) {
    const items = have[1]
      .split(/,|\se\s|;/)
      .map((s) => s.replace(/\b(um|uma|uns|umas|pouco de|pouca|pouco|algum|alguma|de|da|do)\b/g, " ").trim())
      .filter((s) => s.length >= 2);
    if (items.length) return { kind: "ingredients", items };
  }
  if (/econom|barat|baixo custo|gastar pouco|orcamento/.test(t)) return { kind: "budget", count: parseNumber(t, 5) };
  for (const [w, slug] of Object.entries(CUISINE_WORDS)) if (t.includes(w)) return { kind: "cuisine", cuisine: slug, easy, quick };
  for (const [w, slug] of Object.entries(CATEGORY_WORDS)) if (t.includes(w)) return { kind: "category", category: slug, easy, quick };
  return { kind: "search", text: raw, easy, quick };
}
