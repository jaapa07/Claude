import type { CommentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { json, requireAdmin, route, searchParams } from "@/lib/api";

const STATUSES: CommentStatus[] = ["PENDING", "VISIBLE", "HIDDEN"];

export const GET = route(async (req) => {
  await requireAdmin(req);
  const raw = searchParams(req).get("status") as CommentStatus | null;
  const status = raw && STATUSES.includes(raw) ? raw : undefined;
  const [comments, grouped] = await Promise.all([
    prisma.comment.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        recipe: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.comment.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts: Record<CommentStatus, number> = { PENDING: 0, VISIBLE: 0, HIDDEN: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;
  return json({ comments, counts });
});
