import { prisma } from "@/lib/db";
import { json, requireAdmin, route, searchParams } from "@/lib/api";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const q = searchParams(req).get("q")?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { recipes: true, favorites: true, comments: true } },
    },
  });
  return json({ users });
});
