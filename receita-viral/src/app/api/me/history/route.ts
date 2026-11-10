import { prisma } from "@/lib/db";
import { json, requireUser, route } from "@/lib/api";
import { cardSelect, toCards } from "@/lib/recipes";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const take = Math.min(Number(new URL(req.url).searchParams.get("take")) || 24, 60);
  const rows = await prisma.viewHistory.findMany({
    where: { userId: user.id, recipe: { status: "PUBLISHED" } },
    orderBy: { viewedAt: "desc" },
    take,
    select: { viewedAt: true, recipe: { select: cardSelect } },
  });
  const cards = await toCards(rows.map((r) => r.recipe));
  return json({ items: cards.map((c, i) => ({ ...c, viewedAt: rows[i].viewedAt })) });
});

export const DELETE = route(async (req) => {
  const user = await requireUser(req);
  const { count } = await prisma.viewHistory.deleteMany({ where: { userId: user.id } });
  return json({ ok: true, removed: count });
});
