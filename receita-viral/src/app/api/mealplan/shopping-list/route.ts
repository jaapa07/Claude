import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { consolidate } from "@/lib/shopping";
import { formatDayMonth, parseWeekStart } from "@/lib/week";
import { joinRecipeTitles, recipeRawItems, roundQuantity, shoppingRecipeSelect } from "../../shopping/_lib";

/** Gera uma lista de compras consolidada a partir de todas as refeições da semana. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { week } = await parseBody(req, z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Semana inválida") }));
  const weekStart = parseWeekStart(week);
  const plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    select: { entries: { select: { servings: true, recipe: { select: shoppingRecipeSelect } } } },
  });
  if (!plan?.entries.length) throw new HttpError(422, "Adicione receitas ao planejamento desta semana antes de gerar a lista");

  const raw = plan.entries.flatMap((e) => recipeRawItems(e.recipe, e.servings));
  const items = consolidate(raw);
  if (!items.length) throw new HttpError(422, "As receitas planejadas não têm ingredientes cadastrados");

  const list = await prisma.shoppingList.create({
    data: {
      userId: user.id,
      name: `Compras da semana ${formatDayMonth(weekStart)}`,
      items: {
        create: items.map((i) => ({
          name: i.name,
          quantity: roundQuantity(i.quantity),
          unit: i.unit,
          group: i.group,
          recipeTitle: joinRecipeTitles(i.recipes),
        })),
      },
    },
    select: { id: true, name: true },
  });
  return json({ list, count: items.length }, 201);
});
