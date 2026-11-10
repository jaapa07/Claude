import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { scaleQuantity } from "@/lib/units";
import type { Group, RawItem } from "@/lib/shopping";

/** Campos da receita necessários para gerar itens de compra. */
export const shoppingRecipeSelect = {
  id: true,
  title: true,
  servings: true,
  ingredients: {
    orderBy: { position: "asc" },
    select: { quantity: true, unit: true, optional: true, ingredient: { select: { name: true, group: true } } },
  },
} satisfies Prisma.RecipeSelect;

export type ShoppingRecipe = Prisma.RecipeGetPayload<{ select: typeof shoppingRecipeSelect }>;

const round = (n: number | null) => (n == null ? null : Math.round(n * 1000) / 1000);

/** Converte os ingredientes (não opcionais) da receita em itens brutos escalonados para `servings` porções. */
export function recipeRawItems(recipe: ShoppingRecipe, servings: number): RawItem[] {
  return recipe.ingredients
    .filter((i) => !i.optional)
    .map((i) => ({
      name: i.ingredient.name,
      quantity: round(scaleQuantity(i.quantity, recipe.servings, servings)),
      unit: i.unit,
      group: i.ingredient.group as Group,
      recipeTitle: recipe.title,
    }));
}

/** Junta nomes de receitas em um texto de no máximo 300 caracteres. */
export function joinRecipeTitles(titles: string[]): string | null {
  const unique = [...new Set(titles.filter(Boolean))];
  if (!unique.length) return null;
  const text = unique.join(", ");
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

/** Busca uma lista do usuário ou lança 404. */
export async function ownedList(listId: string, userId: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId }, select: { id: true, name: true } });
  if (!list) throw new HttpError(404, "Lista não encontrada");
  return list;
}

export { round as roundQuantity };
