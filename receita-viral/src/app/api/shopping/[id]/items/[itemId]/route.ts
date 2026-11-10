import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { INGREDIENT_GROUPS } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

const patchSchema = z
  .object({
    checked: z.boolean().optional(),
    name: z.string().trim().min(1, "Informe o item").max(80).optional(),
    quantity: z.number().positive().max(100000).nullable().optional(),
    unit: z.string().trim().max(30).nullable().optional(),
    group: z.enum(INGREDIENT_GROUPS).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

async function ownedItem(listId: string, itemId: string, userId: string) {
  const item = await prisma.shoppingItem.findFirst({ where: { id: itemId, listId, list: { userId } }, select: { id: true } });
  if (!item) throw new HttpError(404, "Item não encontrado");
}

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id, itemId } = await params;
  const user = await requireUser(req);
  await ownedItem(id, itemId, user.id);
  const data = await parseBody(req, patchSchema);
  const item = await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { ...data, ...(data.unit !== undefined ? { unit: data.unit || null } : {}) },
  });
  return json({ item });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id, itemId } = await params;
  const user = await requireUser(req);
  await ownedItem(id, itemId, user.id);
  await prisma.shoppingItem.delete({ where: { id: itemId } });
  return json({ ok: true });
});
