import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { mealEntrySchema } from "@/lib/validation";
import { parseWeekStart } from "@/lib/week";
import { entrySelect } from "../_lib";

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const data = await parseBody(req, mealEntrySchema);
  const recipe = await prisma.recipe.findFirst({ where: { id: data.recipeId, status: "PUBLISHED" }, select: { id: true } });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  const weekStart = parseWeekStart(data.weekStart);
  const plan = await prisma.mealPlan.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    create: { userId: user.id, weekStart },
    update: {},
    select: { id: true },
  });
  const count = await prisma.mealPlanEntry.count({ where: { mealPlanId: plan.id } });
  if (count >= 100) throw new HttpError(422, "Limite de 100 refeições por semana atingido");
  const entry = await prisma.mealPlanEntry.create({
    data: { mealPlanId: plan.id, dayIndex: data.dayIndex, mealType: data.mealType, recipeId: recipe.id, servings: data.servings },
    select: entrySelect,
  });
  return json({ entry }, 201);
});
