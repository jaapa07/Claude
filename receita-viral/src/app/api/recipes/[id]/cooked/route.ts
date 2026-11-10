import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const { notes } = await parseBody(req, z.object({ notes: z.string().trim().max(500).optional().nullable() }));
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true } });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  const log = await prisma.cookedLog.create({ data: { userId: user.id, recipeId: id, notes: notes ?? null } });
  const count = await prisma.cookedLog.count({ where: { userId: user.id, recipeId: id } });
  return json({ log, count }, 201);
});
