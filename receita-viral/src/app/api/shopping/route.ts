import { prisma } from "@/lib/db";
import { json, parseBody, requireUser, route } from "@/lib/api";
import { shoppingListSchema } from "@/lib/validation";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const lists = await prisma.shoppingList.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true, items: { select: { checked: true } } },
  });
  return json({
    items: lists.map(({ items, ...l }) => ({ ...l, itemCount: items.length, checkedCount: items.filter((i) => i.checked).length })),
  });
});

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { name } = await parseBody(req, shoppingListSchema);
  const list = await prisma.shoppingList.create({ data: { userId: user.id, name }, select: { id: true, name: true } });
  return json({ list }, 201);
});
