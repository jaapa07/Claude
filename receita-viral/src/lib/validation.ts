import { z } from "zod";

export const UNITS = [
  "g", "kg", "ml", "l", "xícara", "colher de sopa", "colher de chá", "unidade", "dente",
  "fatia", "pitada", "maço", "lata", "pacote", "a gosto",
] as const;

export const INGREDIENT_GROUPS = [
  "HORTIFRUTI", "CARNES", "PEIXES", "LATICINIOS", "MERCEARIA", "PADARIA", "TEMPEROS", "BEBIDAS", "CONGELADOS", "OUTROS",
] as const;

const trimmed = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} precisa ter pelo menos ${min} caracteres`).max(max, `${label} pode ter no máximo ${max} caracteres`);

export const registerSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres")
    .max(128)
    .regex(/[A-Za-z]/, "A senha precisa conter letras")
    .regex(/[0-9]/, "A senha precisa conter números"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const profileSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  bio: z.string().trim().max(400).optional().nullable(),
  avatarUrl: z.string().trim().max(500).optional().nullable(),
  dietaryPrefs: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  allergies: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  notifyNewRecipes: z.boolean().default(true),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: registerSchema.shape.password,
});

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "URL inválida")
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const ingredientInputSchema = z.object({
  name: trimmed(1, 80, "Ingrediente").transform((s) => s.toLowerCase()),
  quantity: z.number().positive().max(100000).nullable(),
  unit: z.enum(UNITS),
  group: z.enum(INGREDIENT_GROUPS).default("OUTROS"),
  note: z.string().trim().max(120).optional().nullable(),
  optional: z.boolean().default(false),
});

export const stepInputSchema = z.object({
  text: trimmed(3, 1500, "Etapa"),
  timerMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
});

export const recipeInputSchema = z.object({
  title: trimmed(3, 120, "Título"),
  description: trimmed(10, 600, "Descrição"),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
  emoji: z.string().trim().max(8).optional().nullable(),
  prepMinutes: z.number().int().min(0).max(24 * 60),
  cookMinutes: z.number().int().min(0).max(72 * 60),
  servings: z.number().int().min(1).max(100),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  caloriesPerServing: z.number().int().min(0).max(5000).nullable().optional(),
  costLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  categoryIds: z.array(z.string()).max(12).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  tips: z.array(z.string().trim().min(1).max(400)).max(10).default([]),
  substitutions: z
    .array(z.object({ ingredient: trimmed(1, 80, "Ingrediente"), substitute: trimmed(1, 200, "Substituto") }))
    .max(10)
    .default([]),
  nutrition: z
    .object({
      protein: z.number().min(0).max(1000),
      carbs: z.number().min(0).max(1000),
      fat: z.number().min(0).max(1000),
      fiber: z.number().min(0).max(1000),
      sodium: z.number().min(0).max(100000),
    })
    .nullable()
    .optional(),
  ingredients: z.array(ingredientInputSchema).min(1, "Inclua pelo menos um ingrediente").max(60),
  steps: z.array(stepInputSchema).min(1, "Inclua pelo menos uma etapa").max(40),
  sourceUrl: optionalUrl,
  sourceName: z.string().trim().max(120).optional().nullable(),
  sourceAttribution: z.string().trim().max(300).optional().nullable(),
});

export const adminRecipeSchema = recipeInputSchema.extend({
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  externalSourceId: z.string().optional().nullable(),
});

export const ratingSchema = z.object({ stars: z.number().int().min(1).max(5) });
export const commentSchema = z.object({ text: trimmed(2, 1000, "Comentário") });

export const collectionSchema = z.object({
  name: trimmed(2, 60, "Nome"),
  description: z.string().trim().max(300).optional().nullable(),
});

export const mealEntrySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayIndex: z.number().int().min(0).max(6),
  mealType: z.enum(["BREAKFAST", "LUNCH", "SNACK", "DINNER"]),
  recipeId: z.string().min(1),
  servings: z.number().int().min(1).max(50).default(2),
});

export const shoppingListSchema = z.object({ name: trimmed(2, 60, "Nome") });
export const shoppingItemSchema = z.object({
  name: trimmed(1, 80, "Item"),
  quantity: z.number().positive().max(100000).nullable().optional(),
  unit: z.string().trim().max(30).nullable().optional(),
  group: z.enum(INGREDIENT_GROUPS).default("OUTROS"),
});

export const categorySchema = z.object({
  name: trimmed(2, 60, "Nome"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens").max(60).optional(),
  type: z.enum(["CUISINE", "DISH_TYPE"]),
  description: z.string().trim().max(300).optional().nullable(),
  emoji: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor hexadecimal").optional().nullable(),
  imageUrl: optionalUrl,
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const viralTrendSchema = z.object({
  recipeId: z.string().min(1),
  platform: z.enum(["TIKTOK", "INSTAGRAM", "YOUTUBE", "PINTEREST"]),
  trendYear: z.number().int().min(2000).max(2100).nullable().optional(),
  trendPeriod: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().max(600).nullable().optional(),
  creatorName: z.string().trim().max(80).nullable().optional(),
  creatorUrl: optionalUrl,
  postUrl: optionalUrl,
  referenceUrl: optionalUrl,
  verified: z.boolean().default(false),
  highlighted: z.boolean().default(false),
});

export const externalSourceSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  baseUrl: z.string().trim().url("URL inválida"),
  type: z.enum(["JSON_LD", "API", "MANUAL"]).default("JSON_LD"),
  license: z.string().trim().max(200).nullable().optional(),
  termsUrl: optionalUrl,
  allowImport: z.boolean().default(false),
  active: z.boolean().default(true),
  apiKeyEnv: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]*$/, "Use o NOME da variável de ambiente, não a chave")
    .max(60)
    .nullable()
    .optional(),
  notes: z.string().trim().max(600).nullable().optional(),
});

export const chefRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type AdminRecipeInput = z.infer<typeof adminRecipeSchema>;
