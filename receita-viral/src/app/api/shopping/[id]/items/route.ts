import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { shoppingItemSchema } from "@/lib/validation";
import { ownedList } from "../../_lib";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await ownedList(id, user.id);
  const data = await parseBody(req, shoppingItemSchema);
  const count = await prisma.shoppingItem.count({ where: { listId: id } });
  if (count >= 300) throw new HttpError(422, "Limite de 300 itens por lista atingido");
  const [item] = await prisma.$transaction([
    prisma.shoppingItem.create({
      data: { listId: id, name: data.name, quantity: data.quantity ?? null, unit: data.unit || null, group: data.group },
    }),
    prisma.shoppingList.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);
  return json({ item }, 201);
});

/** DELETE ?checked=1 remove os itens marcados. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await ownedList(id, user.id);
  if (new URL(req.url).searchParams.get("checked") !== "1") throw new HttpError(400, "Use ?checked=1 para limpar os itens marcados");
  const { count } = await prisma.shoppingItem.deleteMany({ where: { listId: id, checked: true } });
  return json({ ok: true, removed: count });
});
