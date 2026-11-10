import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { getUserFromRequest } from "@/lib/auth/session";
import { recipeInputSchema } from "@/lib/validation";
import { updateRecipe } from "@/lib/recipe-write";

type Ctx = { params: Promise<{ id: string }> };

const detailInclude = {
  categories: true,
  ingredients: { include: { ingredient: true }, orderBy: { position: "asc" as const } },
  steps: { orderBy: { position: "asc" as const } },
  viralTrends: true,
};

export const GET = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({ where: { OR: [{ id }, { slug: id }] }, include: detailInclude });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  if (recipe.status !== "PUBLISHED") {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "ADMIN" && user.id !== recipe.authorId)) throw new HttpError(404, "Receita não encontrada");
  }
  return json({ recipe });
});

/** Autor edita a própria receita (volta para revisão). Admin usa /api/admin/recipes/[id]. */
export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { authorId: true } });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  if (recipe.authorId !== user.id) throw new HttpError(403, "Você só pode editar suas próprias receitas");
  const input = await parseBody(req, recipeInputSchema);
  const updated = await updateRecipe(id, input, { status: "PENDING" });
  return json({ recipe: { id: updated.id, slug: updated.slug, status: updated.status } });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { authorId: true } });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  if (recipe.authorId !== user.id && user.role !== "ADMIN") throw new HttpError(403, "Sem permissão para excluir esta receita");
  await prisma.recipe.delete({ where: { id } });
  return json({ ok: true });
});
