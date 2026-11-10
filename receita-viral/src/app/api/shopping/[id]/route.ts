import { prisma } from "@/lib/db";
import { json, parseBody, requireUser, route } from "@/lib/api";
import { shoppingListSchema } from "@/lib/validation";
import { ownedList } from "../_lib";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await ownedList(id, user.id);
  const list = await prisma.shoppingList.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      items: { orderBy: [{ group: "asc" }, { name: "asc" }] },
    },
  });
  return json({ list });
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await ownedList(id, user.id);
  const { name } = await parseBody(req, shoppingListSchema);
  const list = await prisma.shoppingList.update({ where: { id }, data: { name }, select: { id: true, name: true } });
  return json({ list });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await ownedList(id, user.id);
  await prisma.shoppingList.delete({ where: { id } });
  return json({ ok: true });
});
