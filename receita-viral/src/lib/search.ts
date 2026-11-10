import { normalize } from "@/lib/utils";

/** Itens básicos de despensa: não contam como "faltando" na busca por ingredientes. */
export const PANTRY_STAPLES = ["sal", "agua", "pimenta-do-reino", "oleo", "azeite", "acucar"];

/** Mapa de restrições → termos de ingredientes a excluir. */
export const ALLERGEN_MAP: Record<string, string[]> = {
  lactose: ["leite", "queijo", "manteiga", "creme de leite", "iogurte", "requeijao", "cream cheese", "muçarela", "parmesao", "nata"],
  gluten: ["farinha de trigo", "pao", "macarrao", "trigo", "massa", "cerveja", "tortilha de trigo", "farinha de rosca", "lamen", "biscoito"],
  ovo: ["ovo", "gema", "clara", "maionese"],
  amendoim: ["amendoim"],
  "frutos do mar": ["camarao", "lula", "polvo", "marisco", "mexilhao", "siri", "caranguejo"],
  peixe: ["peixe", "salmao", "atum", "sardinha", "bacalhau", "tilapia"],
  soja: ["soja", "molho de soja", "tofu", "missô", "misso", "shoyu"],
  carne: ["carne", "frango", "porco", "bacon", "linguica", "presunto", "costela", "picanha", "calabresa", "peito", "coxa", "asa", "patinho", "acem", "file", "kafta", "carne seca", "salmao", "peixe", "camarao", "sardinha", "atum"],
  "carne vermelha": ["carne", "porco", "bacon", "linguica", "presunto", "costela", "picanha", "calabresa", "carne seca", "patinho", "acem"],
  nozes: ["nozes", "castanha", "amendoa", "avela", "pistache"],
};

export function allergenTerms(allergies: string[]): string[] {
  const terms = new Set<string>();
  for (const a of allergies) {
    const key = normalize(a);
    const mapped = ALLERGEN_MAP[key] ?? Object.entries(ALLERGEN_MAP).find(([k]) => normalize(k) === key)?.[1];
    if (mapped) mapped.forEach((t) => terms.add(normalize(t)));
    else if (key) terms.add(key);
  }
  return [...terms];
}

export function parseIngredientList(input: string | string[] | null | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : input.split(/[,;\n]|\se\s/);
  return [...new Set(raw.map((s) => normalize(s)).filter((s) => s.length >= 2))];
}

function matches(ingredientName: string, term: string): boolean {
  const n = normalize(ingredientName);
  if (n === term) return true;
  // "queijo" casa com "queijo muçarela"; "peito de frango" casa com "frango"
  const nWords = n.split(/[\s-]+/);
  const tWords = term.split(/[\s-]+/);
  if (tWords.every((w) => nWords.some((nw) => nw === w || (w.length >= 4 && nw.startsWith(w))))) return true;
  return n.includes(term) && term.length >= 4;
}

export function isStaple(name: string) {
  const n = normalize(name);
  return PANTRY_STAPLES.includes(n);
}

export interface IngredientMatch {
  matched: string[];
  missing: string[];
  staples: string[];
  /** fração de termos do usuário presentes na receita */
  coverage: number;
  /** fração dos ingredientes da receita que o usuário já tem */
  completeness: number;
  score: number;
}

/**
 * Compara os ingredientes que o usuário tem com os da receita.
 * Ingredientes opcionais e itens de despensa não entram em "faltando".
 */
export function matchIngredients(
  recipeIngredients: { name: string; optional?: boolean }[],
  have: string[],
): IngredientMatch {
  const terms = have.map(normalize).filter(Boolean);
  const matched: string[] = [];
  const missing: string[] = [];
  const staples: string[] = [];
  const usedTerms = new Set<string>();
  for (const ing of recipeIngredients) {
    const hit = terms.find((t) => matches(ing.name, t));
    if (hit) {
      matched.push(ing.name);
      usedTerms.add(hit);
    } else if (isStaple(ing.name)) staples.push(ing.name);
    else if (!ing.optional) missing.push(ing.name);
  }
  const relevant = matched.length + missing.length;
  const coverage = terms.length ? usedTerms.size / terms.length : 0;
  const completeness = relevant ? matched.length / relevant : 0;
  const score = coverage * 0.6 + completeness * 0.4;
  return { matched, missing, staples, coverage, completeness, score };
}

export function containsAllergen(ingredientNames: string[], terms: string[]): boolean {
  return ingredientNames.some((name) => {
    const n = normalize(name);
    return terms.some((t) => n === t || n.split(/[\s-]+/).includes(t) || (t.includes(" ") && n.includes(t)));
  });
}

export function buildSearchText(title: string, tags: string[], ingredientNames: string[], description = ""): string {
  return normalize([title, ...tags, ...ingredientNames, description].filter(Boolean).join(" | "));
}
