import { prisma } from "@/lib/db";
import { json, parseBody, requireUser, route } from "@/lib/api";
import { collectionSchema } from "@/lib/validation";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const rows = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: { select: { items: true } },
      items: {
        orderBy: { addedAt: "desc" },
        take: 4,
        select: { recipe: { select: { id: true, title: true, imageUrl: true, emoji: true } } },
      },
    },
  });
  const collections = rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt,
    count: c._count.items,
    covers: c.items.map((i) => i.recipe),
  }));
  return json({ collections });
});

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const data = await parseBody(req, collectionSchema);
  const collection = await prisma.collection.create({
    data: { userId: user.id, name: data.name, description: data.description || null },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  return json({ collection }, 201);
});
