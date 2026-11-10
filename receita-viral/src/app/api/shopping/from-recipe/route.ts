import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { consolidate, type Group, type RawItem } from "@/lib/shopping";
import { joinRecipeTitles, ownedList, recipeRawItems, roundQuantity, shoppingRecipeSelect } from "../_lib";

const bodySchema = z.object({
  recipeId: z.string().min(1),
  servings: z.number().int().min(1).max(100),
  listId: z.string().min(1).optional().nullable(),
});

/**
 * Adiciona os ingredientes (escalonados) de uma receita a uma lista existente ou a uma nova lista.
 * Itens não marcados com mesmo nome e unidade compatível são somados.
 */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { recipeId, servings, listId } = await parseBody(req, bodySchema);
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, status: "PUBLISHED" }, select: shoppingRecipeSelect });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");

  const incoming = consolidate(recipeRawItems(recipe, servings));
  if (!incoming.length) throw new HttpError(422, "Esta receita não tem ingredientes para adicionar");

  const list = listId
    ? await ownedList(listId, user.id)
    : await prisma.shoppingList.create({ data: { userId: user.id, name: recipe.title.slice(0, 60) }, select: { id: true, name: true } });

  const existing = await prisma.shoppingItem.findMany({
    where: { listId: list.id, checked: false },
    select: { id: true, name: true, quantity: true, unit: true, group: true, recipeTitle: true },
  });
  const used = new Set<string>();
  const updates: { id: string; quantity: number | null; unit: string | null; recipeTitle: string | null }[] = [];
  const creates: { name: string; quantity: number | null; unit: string | null; group: Group; recipeTitle: string | null }[] = [];

  for (const item of incoming) {
    const newRaw: RawItem = { name: item.name, quantity: item.quantity, unit: item.unit, group: item.group };
    const match = existing.find((e) => {
      if (used.has(e.id)) return false;
      const oldRaw: RawItem = { name: e.name, quantity: e.quantity, unit: e.unit, group: e.group as Group };
      return consolidate([oldRaw, newRaw]).length === 1;
    });
    if (match) {
      used.add(match.id);
      let quantity: number | null;
      let unit: string | null;
      if (match.unit == null && item.unit == null) {
        // Sem unidade: soma as quantidades avulsas (ex.: "3 limões" + "2 limões")
        quantity = match.quantity == null && item.quantity == null ? null : (match.quantity ?? 0) + (item.quantity ?? 0);
        unit = null;
      } else {
        const [merged] = consolidate([
          { name: match.name, quantity: match.quantity, unit: match.unit, group: match.group as Group },
          newRaw,
        ]);
        quantity = merged.quantity;
        unit = merged.unit;
      }
      const titles = [...(match.recipeTitle ? match.recipeTitle.split(", ") : []), recipe.title];
      updates.push({ id: match.id, quantity: roundQuantity(quantity), unit, recipeTitle: joinRecipeTitles(titles) });
    } else {
      creates.push({
        name: item.name,
        quantity: roundQuantity(item.quantity),
        unit: item.unit,
        group: item.group,
        recipeTitle: joinRecipeTitles([recipe.title]),
      });
    }
  }

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.shoppingItem.update({ where: { id: u.id }, data: { quantity: u.quantity, unit: u.unit, recipeTitle: u.recipeTitle } }),
    ),
    prisma.shoppingItem.createMany({ data: creates.map((c) => ({ ...c, listId: list.id })) }),
    prisma.shoppingList.update({ where: { id: list.id }, data: { updatedAt: new Date() } }),
  ]);

  return json({ list: { id: list.id, name: list.name }, added: incoming.length, merged: updates.length }, listId ? 200 : 201);
});
