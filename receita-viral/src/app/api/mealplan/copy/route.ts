import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { isoDate, parseWeekStart } from "@/lib/week";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)");

/** Copia as refeições de uma semana para outra (sem duplicar refeições idênticas já existentes). */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, z.object({ from: day, to: day }));
  const from = parseWeekStart(body.from);
  const to = parseWeekStart(body.to);
  if (from.getTime() === to.getTime()) throw new HttpError(422, "Escolha uma semana diferente da original");

  const source = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: from } },
    select: { entries: { select: { dayIndex: true, mealType: true, recipeId: true, servings: true } } },
  });
  if (!source?.entries.length) throw new HttpError(422, "A semana de origem não tem refeições para copiar");

  const target = await prisma.mealPlan.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart: to } },
    create: { userId: user.id, weekStart: to },
    update: {},
    select: { id: true, entries: { select: { dayIndex: true, mealType: true, recipeId: true } } },
  });
  const existing = new Set(target.entries.map((e) => `${e.dayIndex}|${e.mealType}|${e.recipeId}`));
  const toCreate = source.entries.filter((e) => !existing.has(`${e.dayIndex}|${e.mealType}|${e.recipeId}`));
  if (toCreate.length) {
    await prisma.mealPlanEntry.createMany({ data: toCreate.map((e) => ({ ...e, mealPlanId: target.id })) });
  }
  return json({ copied: toCreate.length, skipped: source.entries.length - toCreate.length, weekStart: isoDate(to) });
});
