/**
 * Formato dos dados de demonstração. Cada arquivo recipes-*.ts exporta `SeedRecipe[]`.
 *
 * Regras de consistência:
 * - Nomes de ingredientes em minúsculas, no singular quando possível, sem quantidade
 *   (ex.: "frango", "peito de frango", "batata", "queijo muçarela", "ovo", "arroz branco").
 *   Use sempre o mesmo nome para o mesmo ingrediente em todos os arquivos (veja CANONICAL_INGREDIENTS).
 * - Unidades permitidas: ver `Unit`.
 * - Quantidade `null` apenas com unit "a gosto".
 */

export type CuisineSlug =
  | "brasileira"
  | "japonesa"
  | "italiana"
  | "coreana"
  | "chinesa"
  | "mexicana"
  | "americana"
  | "francesa"
  | "arabe";

export type DishTypeSlug =
  | "massas-e-pizzas"
  | "carnes-e-churrasco"
  | "frangos"
  | "peixes-e-frutos-do-mar"
  | "hamburgueres-e-lanches"
  | "comidas-de-boteco"
  | "sopas-e-caldos"
  | "saladas"
  | "fitness"
  | "vegetarianas-e-veganas"
  | "sobremesas-e-doces"
  | "bolos-e-tortas"
  | "cafes-e-bebidas"
  | "air-fryer"
  | "economicas";

export type Unit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "xícara"
  | "colher de sopa"
  | "colher de chá"
  | "unidade"
  | "dente"
  | "fatia"
  | "pitada"
  | "maço"
  | "lata"
  | "pacote"
  | "a gosto";

export type IngredientGroup =
  | "HORTIFRUTI"
  | "CARNES"
  | "PEIXES"
  | "LATICINIOS"
  | "MERCEARIA"
  | "PADARIA"
  | "TEMPEROS"
  | "BEBIDAS"
  | "CONGELADOS"
  | "OUTROS";

export interface SeedIngredient {
  name: string;
  quantity: number | null;
  unit: Unit;
  group: IngredientGroup;
  note?: string;
  optional?: boolean;
}

export interface SeedStep {
  text: string;
  /** Minutos para o temporizador da etapa, quando houver cozimento/descanso. */
  timerMinutes?: number;
}

export interface SeedViral {
  platform: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "PINTEREST";
  trendYear: number;
  /** Texto factual e cauteloso, sem números de visualizações. */
  note: string;
}

export interface SeedRecipe {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  cuisine: CuisineSlug;
  categories: DishTypeSlug[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  caloriesPerServing: number;
  costLevel: "LOW" | "MEDIUM" | "HIGH";
  tags: string[];
  ingredients: SeedIngredient[];
  steps: SeedStep[];
  tips: string[];
  substitutions: { ingredient: string; substitute: string }[];
  nutrition: { protein: number; carbs: number; fat: number; fiber: number; sodium: number };
  viral?: SeedViral;
}

/** Nomes canônicos — reutilize-os quando o ingrediente aparecer. */
export const CANONICAL_INGREDIENTS = [
  "sal", "pimenta-do-reino", "azeite", "óleo", "manteiga", "alho", "cebola", "tomate",
  "ovo", "leite", "creme de leite", "leite condensado", "farinha de trigo", "açúcar",
  "fermento químico", "arroz branco", "feijão preto", "frango", "peito de frango",
  "coxa de frango", "carne moída", "batata", "cenoura", "queijo muçarela",
  "queijo parmesão", "presunto", "bacon", "limão", "salsinha", "cebolinha",
  "coentro", "molho de soja", "gengibre", "óleo de gergelim", "gergelim", "pimenta vermelha",
  "páprica", "cominho", "orégano", "manjericão", "chocolate em pó", "cacau em pó",
  "água", "caldo de legumes", "caldo de galinha", "macarrão", "pão", "aveia em flocos",
  "banana", "abacate", "pepino", "alface", "salmão", "peixe branco", "camarão",
] as const;
