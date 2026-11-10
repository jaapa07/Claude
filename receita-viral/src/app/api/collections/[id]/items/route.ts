import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string, userId: string) {
  const c = await prisma.collection.findFirst({ where: { id, userId }, select: { id: true, name: true } });
  if (!c) throw new HttpError(404, "Coleção não encontrada");
  return c;
}

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const collection = await owned(id, user.id);
  const { recipeId } = await parseBody(req, z.object({ recipeId: z.string().min(1) }));
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, status: "PUBLISHED" }, select: { id: true } });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  await prisma.collectionItem.upsert({
    where: { collectionId_recipeId: { collectionId: id, recipeId } },
    create: { collectionId: id, recipeId },
    update: {},
  });
  const count = await prisma.collectionItem.count({ where: { collectionId: id } });
  return json({ ok: true, collection: { id: collection.id, name: collection.name, count } }, 201);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await owned(id, user.id);
  const recipeId = new URL(req.url).searchParams.get("recipeId");
  if (!recipeId) throw new HttpError(400, "Informe a receita (recipeId)");
  await prisma.collectionItem.deleteMany({ where: { collectionId: id, recipeId } });
  return json({ ok: true });
});
