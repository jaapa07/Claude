import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { ratingSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const { stars } = await parseBody(req, ratingSchema);
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { status: true } });
  if (!recipe || recipe.status !== "PUBLISHED") throw new HttpError(404, "Receita não encontrada");
  await prisma.rating.upsert({
    where: { userId_recipeId: { userId: user.id, recipeId: id } },
    create: { userId: user.id, recipeId: id, stars },
    update: { stars },
  });
  const agg = await prisma.rating.aggregate({ where: { recipeId: id }, _avg: { stars: true }, _count: true });
  return json({ stars, average: Math.round((agg._avg.stars ?? 0) * 10) / 10, count: agg._count });
});
