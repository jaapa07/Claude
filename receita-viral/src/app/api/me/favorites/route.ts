import { prisma } from "@/lib/db";
import { json, requireUser, route } from "@/lib/api";
import { cardSelect, toCards } from "@/lib/recipes";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const idsOnly = new URL(req.url).searchParams.get("idsOnly") === "1";
  if (idsOnly) {
    const favs = await prisma.favorite.findMany({ where: { userId: user.id }, select: { recipeId: true } });
    return json({ ids: favs.map((f) => f.recipeId) });
  }
  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { recipe: { select: cardSelect } },
  });
  return json({ items: await toCards(favs.map((f) => f.recipe)) });
});
