import { prisma } from "@/lib/db";
import { HttpError, json, requireUser, route } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

async function ensureRecipe(id: string) {
  const r = await prisma.recipe.findUnique({ where: { id }, select: { id: true } });
  if (!r) throw new HttpError(404, "Receita não encontrada");
}

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await ensureRecipe(id);
  await prisma.favorite.upsert({ where: { userId_recipeId: { userId: user.id, recipeId: id } }, create: { userId: user.id, recipeId: id }, update: {} });
  return json({ favorite: true });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await prisma.favorite.deleteMany({ where: { userId: user.id, recipeId: id } });
  return json({ favorite: false });
});
