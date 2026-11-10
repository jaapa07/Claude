/**
 * Valores do formulário de receita (sem "use client": pode ser importado em Server Components).
 * Campos numéricos ficam como string para permitir campo vazio durante a edição.
 */
import { INGREDIENT_GROUPS, UNITS } from "@/lib/validation";

export type Unit = (typeof UNITS)[number];
export type Group = (typeof INGREDIENT_GROUPS)[number];
export type RecipeStatusValue = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED" | "ARCHIVED";

export interface IngredientRow {
  key: string;
  name: string;
  quantity: string;
  unit: Unit;
  group: Group;
  note: string;
  optional: boolean;
}
export interface StepRow {
  key: string;
  text: string;
  timerMinutes: string;
}
export interface SubstitutionRow {
  key: string;
  ingredient: string;
  substitute: string;
}

export interface RecipeFormValues {
  title: string;
  description: string;
  emoji: string;
  imageUrl: string;
  videoUrl: string;
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  caloriesPerServing: string;
  costLevel: "LOW" | "MEDIUM" | "HIGH";
  categoryIds: string[];
  tags: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tips: { key: string; text: string }[];
  substitutions: SubstitutionRow[];
  nutrition: { protein: string; carbs: string; fat: string; fiber: string; sodium: string };
  sourceUrl: string;
  sourceName: string;
  sourceAttribution: string;
  status: RecipeStatusValue;
  featured: boolean;
  externalSourceId: string;
}

let counter = 0;
export function rowKey() {
  counter += 1;
  return `r${Date.now().toString(36)}${counter}`;
}

export const emptyIngredient = (): IngredientRow => ({ key: rowKey(), name: "", quantity: "", unit: "g", group: "OUTROS", note: "", optional: false });
export const emptyStep = (): StepRow => ({ key: rowKey(), text: "", timerMinutes: "" });

export function emptyFormValues(): RecipeFormValues {
  return {
    title: "",
    description: "",
    emoji: "",
    imageUrl: "",
    videoUrl: "",
    prepMinutes: "10",
    cookMinutes: "20",
    servings: "4",
    difficulty: "EASY",
    caloriesPerServing: "",
    costLevel: "MEDIUM",
    categoryIds: [],
    tags: "",
    ingredients: [emptyIngredient()],
    steps: [emptyStep()],
    tips: [],
    substitutions: [],
    nutrition: { protein: "", carbs: "", fat: "", fiber: "", sodium: "" },
    sourceUrl: "",
    sourceName: "",
    sourceAttribution: "",
    status: "DRAFT",
    featured: false,
    externalSourceId: "",
  };
}

/** Formato mínimo de receita do Prisma aceito por recipeToFormInitial (include categories, ingredients.ingredient, steps). */
export interface RecipeLike {
  title: string;
  description: string;
  emoji: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  caloriesPerServing: number | null;
  costLevel: "LOW" | "MEDIUM" | "HIGH";
  tags: string[];
  tips: string[];
  substitutions: unknown;
  nutrition: unknown;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceAttribution: string | null;
  status?: RecipeStatusValue;
  featured?: boolean;
  externalSourceId?: string | null;
  categories: { id: string }[];
  ingredients: {
    quantity: number | null;
    unit: string;
    note: string | null;
    optional: boolean;
    position?: number;
    ingredient: { name: string; group: string };
  }[];
  steps: { text: string; timerMinutes: number | null; position?: number }[];
}

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

/** Converte uma receita do Prisma no valor inicial do formulário. Função pura — segura em Server Components. */
export function recipeToFormInitial(recipe: RecipeLike): RecipeFormValues {
  const subs = Array.isArray(recipe.substitutions) ? (recipe.substitutions as { ingredient?: unknown; substitute?: unknown }[]) : [];
  const n = (recipe.nutrition && typeof recipe.nutrition === "object" ? recipe.nutrition : null) as Record<string, number> | null;
  const ingredients = [...recipe.ingredients].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const steps = [...recipe.steps].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    title: recipe.title,
    description: recipe.description,
    emoji: recipe.emoji ?? "",
    imageUrl: recipe.imageUrl ?? "",
    videoUrl: recipe.videoUrl ?? "",
    prepMinutes: String(recipe.prepMinutes),
    cookMinutes: String(recipe.cookMinutes),
    servings: String(recipe.servings),
    difficulty: recipe.difficulty,
    caloriesPerServing: num(recipe.caloriesPerServing),
    costLevel: recipe.costLevel,
    categoryIds: recipe.categories.map((c) => c.id),
    tags: recipe.tags.join(", "),
    ingredients: ingredients.length
      ? ingredients.map((i) => ({
          key: rowKey(),
          name: i.ingredient.name,
          quantity: num(i.quantity),
          unit: ((UNITS as readonly string[]).includes(i.unit) ? i.unit : "unidade") as Unit,
          group: ((INGREDIENT_GROUPS as readonly string[]).includes(i.ingredient.group) ? i.ingredient.group : "OUTROS") as Group,
          note: i.note ?? "",
          optional: i.optional,
        }))
      : [emptyIngredient()],
    steps: steps.length ? steps.map((s) => ({ key: rowKey(), text: s.text, timerMinutes: num(s.timerMinutes) })) : [emptyStep()],
    tips: recipe.tips.map((t) => ({ key: rowKey(), text: t })),
    substitutions: subs.map((s) => ({ key: rowKey(), ingredient: String(s.ingredient ?? ""), substitute: String(s.substitute ?? "") })),
    nutrition: {
      protein: num(n?.protein),
      carbs: num(n?.carbs),
      fat: num(n?.fat),
      fiber: num(n?.fiber),
      sodium: num(n?.sodium),
    },
    sourceUrl: recipe.sourceUrl ?? "",
    sourceName: recipe.sourceName ?? "",
    sourceAttribution: recipe.sourceAttribution ?? "",
    status: recipe.status ?? "DRAFT",
    featured: recipe.featured ?? false,
    externalSourceId: recipe.externalSourceId ?? "",
  };
}
