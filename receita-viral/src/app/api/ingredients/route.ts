import { prisma } from "@/lib/db";
import { json, route } from "@/lib/api";

/** Autocompletar ingredientes (para a busca "o que tenho em casa"). */
export const GET = route(async (req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 40);
  const items = await prisma.ingredient.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    select: { name: true, group: true, _count: { select: { recipes: true } } },
    orderBy: { recipes: { _count: "desc" } },
    take: q ? 12 : 30,
  });
  return json({ items: items.map((i) => ({ name: i.name, group: i.group, recipes: i._count.recipes })) });
});
