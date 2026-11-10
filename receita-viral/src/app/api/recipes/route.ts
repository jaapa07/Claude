import { prisma } from "@/lib/db";
import { json, parseBody, requireUser, route } from "@/lib/api";
import { filtersFromParams, listRecipes, recordSearch } from "@/lib/recipes";
import { recipeInputSchema } from "@/lib/validation";
import { createRecipe } from "@/lib/recipe-write";

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  const filters = filtersFromParams(sp);
  const result = await listRecipes(filters);
  if (filters.q && filters.page === undefined) await recordSearch(filters.q).catch(() => {});
  return json(result);
});

/** Usuário publica receita própria: entra como "Em revisão" até um admin aprovar. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const input = await parseBody(req, recipeInputSchema);
  const validCats = await prisma.category.findMany({ where: { id: { in: input.categoryIds } }, select: { id: true } });
  const recipe = await createRecipe({ ...input, categoryIds: validCats.map((c) => c.id) }, { status: "PENDING", authorId: user.id });
  return json({ recipe: { id: recipe.id, slug: recipe.slug, status: recipe.status } }, 201);
});
