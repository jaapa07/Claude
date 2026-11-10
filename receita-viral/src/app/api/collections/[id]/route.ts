import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { collectionSchema } from "@/lib/validation";
import { cardSelect, toCards } from "@/lib/recipes";

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string, userId: string) {
  const c = await prisma.collection.findFirst({ where: { id, userId }, select: { id: true } });
  if (!c) throw new HttpError(404, "Coleção não encontrada");
  return c;
}

export const GET = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const collection = await prisma.collection.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      items: { where: { recipe: { status: "PUBLISHED" } }, orderBy: { addedAt: "desc" }, select: { recipe: { select: cardSelect } } },
    },
  });
  if (!collection) throw new HttpError(404, "Coleção não encontrada");
  const { items, ...rest } = collection;
  return json({ collection: { ...rest, recipes: await toCards(items.map((i) => i.recipe)) } });
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await owned(id, user.id);
  const data = await parseBody(req, collectionSchema);
  const collection = await prisma.collection.update({
    where: { id },
    data: { name: data.name, description: data.description || null },
    select: { id: true, name: true, description: true },
  });
  return json({ collection });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await owned(id, user.id);
  await prisma.collection.delete({ where: { id } });
  return json({ ok: true });
});
