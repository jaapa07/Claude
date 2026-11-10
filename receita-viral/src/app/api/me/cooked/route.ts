import { prisma } from "@/lib/db";
import { json, requireUser, route } from "@/lib/api";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const [logs, counts] = await Promise.all([
    prisma.cookedLog.findMany({
      where: { userId: user.id },
      orderBy: { cookedAt: "desc" },
      take: 100,
      select: {
        id: true,
        notes: true,
        cookedAt: true,
        recipe: { select: { id: true, title: true, slug: true, emoji: true, imageUrl: true } },
      },
    }),
    prisma.cookedLog.groupBy({ by: ["recipeId"], where: { userId: user.id }, _count: { _all: true } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.recipeId, c._count._all]));
  return json({
    items: logs.map((l) => ({ ...l, count: countMap.get(l.recipe.id) ?? 1 })),
    total: counts.reduce((s, c) => s + c._count._all, 0),
    recipes: counts.length,
  });
});
