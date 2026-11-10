/**
 * Escalonamento de porções, formatação de quantidades e conversão de medidas.
 */

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

/** Unidades contáveis/caseiras exibidas com frações; métricas com decimais. */
const HOUSEHOLD_UNITS = new Set([
  "xícara",
  "colher de sopa",
  "colher de chá",
  "unidade",
  "dente",
  "fatia",
  "maço",
  "lata",
  "pacote",
  "pitada",
]);

export function scaleQuantity(quantity: number | null, fromServings: number, toServings: number): number | null {
  if (quantity == null) return null;
  if (fromServings <= 0) return quantity;
  return (quantity * toServings) / fromServings;
}

export function formatQuantity(quantity: number | null, unit: string): string {
  if (quantity == null) return "";
  if (!HOUSEHOLD_UNITS.has(unit)) {
    if (quantity >= 100) return String(Math.round(quantity / 5) * 5);
    if (quantity >= 10) return String(Math.round(quantity));
    return String(Math.round(quantity * 10) / 10).replace(".", ",");
  }
  const whole = Math.floor(quantity + 1e-9);
  const frac = quantity - whole;
  if (frac < 0.06) return String(whole || (quantity > 0 ? "⅛" : "0"));
  if (frac > 0.94) return String(whole + 1);
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  return whole ? `${whole} ${best[1]}` : best[1];
}

const PLURALS: Record<string, string> = {
  xícara: "xícaras",
  "colher de sopa": "colheres de sopa",
  "colher de chá": "colheres de chá",
  unidade: "unidades",
  dente: "dentes",
  fatia: "fatias",
  pitada: "pitadas",
  maço: "maços",
  lata: "latas",
  pacote: "pacotes",
};

export function formatUnit(unit: string, quantity: number | null): string {
  if (quantity != null && quantity > 1 && PLURALS[unit]) return PLURALS[unit];
  return unit;
}

export function formatIngredientLine(quantity: number | null, unit: string, name: string): string {
  if (unit === "a gosto" || quantity == null) return `${name} a gosto`;
  const q = formatQuantity(quantity, unit);
  if (unit === "unidade") return `${q} ${name}`;
  const u = formatUnit(unit, quantity);
  return `${q} ${u} de ${name}`.replace(/\s+/g, " ");
}

/* ---------------------------------------------------------------- conversão */

export type MeasureKind = "volume" | "mass";

/** Fatores para a unidade base (ml para volume, g para massa). */
export const VOLUME_UNITS: Record<string, number> = {
  ml: 1,
  l: 1000,
  xícara: 240,
  "colher de sopa": 15,
  "colher de chá": 5,
  "fl oz": 29.5735,
  "cup (EUA)": 236.588,
};

export const MASS_UNITS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

/** Densidade aproximada (g por xícara de 240 ml) para converter volume ↔ massa. */
export const DENSITIES: Record<string, number> = {
  "farinha de trigo": 120,
  açúcar: 180,
  "açúcar mascavo": 160,
  "arroz branco": 200,
  "aveia em flocos": 90,
  "chocolate em pó": 90,
  "cacau em pó": 90,
  manteiga: 227,
  leite: 245,
  água: 240,
  óleo: 216,
  azeite: 216,
  "polvilho azedo": 150,
  "fubá": 140,
  "creme de leite": 240,
  mel: 340,
};

export function unitKind(unit: string): MeasureKind | null {
  if (unit in VOLUME_UNITS) return "volume";
  if (unit in MASS_UNITS) return "mass";
  return null;
}

/**
 * Converte valor entre unidades. Para volume↔massa exige o nome do ingrediente
 * com densidade conhecida; retorna null quando a conversão não é possível.
 */
export function convert(value: number, from: string, to: string, ingredient?: string): number | null {
  const kf = unitKind(from);
  const kt = unitKind(to);
  if (!kf || !kt) return null;
  if (kf === kt) {
    const table = kf === "volume" ? VOLUME_UNITS : MASS_UNITS;
    return (value * table[from]) / table[to];
  }
  const density = ingredient ? DENSITIES[ingredient.toLowerCase()] : undefined;
  if (!density) return null;
  const gPerMl = density / 240;
  if (kf === "volume") {
    const ml = value * VOLUME_UNITS[from];
    return (ml * gPerMl) / MASS_UNITS[to];
  }
  const g = value * MASS_UNITS[from];
  return g / gPerMl / VOLUME_UNITS[to];
}

/** Sugere a forma métrica de uma medida caseira (para o modo "métrico"). */
export function toMetric(quantity: number | null, unit: string, ingredient: string): { quantity: number | null; unit: string } {
  if (quantity == null) return { quantity, unit };
  if (unit in VOLUME_UNITS && unit !== "ml" && unit !== "l") {
    const grams = convert(quantity, unit, "g", ingredient);
    if (grams != null && !["leite", "água", "óleo", "azeite", "creme de leite"].includes(ingredient.toLowerCase())) {
      return { quantity: grams, unit: "g" };
    }
    const ml = convert(quantity, unit, "ml");
    return { quantity: ml, unit: "ml" };
  }
  return { quantity, unit };
}

export function celsiusToFahrenheit(c: number) {
  return Math.round((c * 9) / 5 + 32);
}
export function fahrenheitToCelsius(f: number) {
  return Math.round(((f - 32) * 5) / 9);
}
