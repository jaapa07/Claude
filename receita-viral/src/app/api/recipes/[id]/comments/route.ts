import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { commentSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { recipeId: id, status: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, text: true, createdAt: true, user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return json({ comments });
});

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  if (!rateLimit(`comment:${user.id}:${clientIp(req)}`, 10, 10 * 60 * 1000)) throw new HttpError(429, "Você comentou muitas vezes seguidas. Aguarde um pouco.");
  const { text } = await parseBody(req, commentSchema);
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { status: true } });
  if (!recipe || recipe.status !== "PUBLISHED") throw new HttpError(404, "Receita não encontrada");
  // Comentários com links vão para moderação
  const status = /https?:\/\/|www\./i.test(text) ? "PENDING" : "VISIBLE";
  const comment = await prisma.comment.create({
    data: { userId: user.id, recipeId: id, text, status },
    select: { id: true, text: true, createdAt: true, status: true, user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return json({ comment }, 201);
});
