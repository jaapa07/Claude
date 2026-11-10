import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { entrySelect } from "../../_lib";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    servings: z.number().int().min(1).max(50).optional(),
    dayIndex: z.number().int().min(0).max(6).optional(),
    mealType: z.enum(["BREAKFAST", "LUNCH", "SNACK", "DINNER"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nada para atualizar");

async function owned(id: string, userId: string) {
  const entry = await prisma.mealPlanEntry.findFirst({ where: { id, mealPlan: { userId } }, select: { id: true } });
  if (!entry) throw new HttpError(404, "Refeição não encontrada");
}

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await owned(id, user.id);
  const data = await parseBody(req, patchSchema);
  const entry = await prisma.mealPlanEntry.update({ where: { id }, data, select: entrySelect });
  return json({ entry });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser(req);
  await owned(id, user.id);
  await prisma.mealPlanEntry.delete({ where: { id } });
  return json({ ok: true });
});
