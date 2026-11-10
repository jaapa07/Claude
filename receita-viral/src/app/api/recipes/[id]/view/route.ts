import { prisma } from "@/lib/db";
import { json, route } from "@/lib/api";
import { getUserFromRequest } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** Registra visualização real (1 por IP/receita a cada 30 min) e histórico do usuário. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!recipe || recipe.status !== "PUBLISHED") return json({ ok: false }, 404);
  const user = await getUserFromRequest(req);
  if (rateLimit(`view:${id}:${user?.id ?? clientIp(req)}`, 1, 30 * 60 * 1000)) {
    await prisma.recipe.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }
  if (user) {
    await prisma.viewHistory.upsert({
      where: { userId_recipeId: { userId: user.id, recipeId: id } },
      create: { userId: user.id, recipeId: id },
      update: { viewedAt: new Date() },
    });
  }
  return json({ ok: true });
});
