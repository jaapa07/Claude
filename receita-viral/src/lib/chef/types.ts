import { z } from "zod";

export const chefRecipeSchema = z.object({
  title: z.string(),
  slug: z.string().nullable().describe("slug de uma receita do catálogo, ou null se for receita criada agora"),
  servings: z.number().int(),
  totalMinutes: z.number().int(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  ingredients: z.array(z.string()).describe("cada item com quantidade e unidade, ex.: '200 g de arroz branco'"),
  steps: z.array(z.string()),
  missing: z.array(z.string()).describe("ingredientes que o usuário provavelmente precisa comprar"),
  note: z.string().nullable(),
});

export const chefMenuDaySchema = z.object({
  day: z.string(),
  meals: z.array(z.object({ meal: z.string(), title: z.string(), slug: z.string().nullable() })),
});

export const chefResponseSchema = z.object({
  reply: z.string().describe("resposta curta e simpática em português do Brasil"),
  recipes: z.array(chefRecipeSchema),
  menu: z.array(chefMenuDaySchema).nullable(),
});

export type ChefRecipe = z.infer<typeof chefRecipeSchema>;
export type ChefResponse = z.infer<typeof chefResponseSchema> & { mode: "ai" | "local" };
export type ChefMessage = { role: "user" | "assistant"; content: string };
