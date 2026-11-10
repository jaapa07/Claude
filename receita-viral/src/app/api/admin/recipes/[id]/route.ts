import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route } from "@/lib/api";
import { adminRecipeSchema } from "@/lib/validation";
import { updateRecipe } from "@/lib/recipe-write";
import { afterStatusChange, assertCategoriesExist, assertSourceExists } from "@/app/admin/_lib/recipe-status";

type Ctx = { params: Promise<{ id: string }> };

const beforeSelect = { status: true, publishedAt: true, authorId: true } as const;

async function loadBefore(id: string) {
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: beforeSelect });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  return recipe;
}

export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      categories: true,
      ingredients: { include: { ingredient: true }, orderBy: { position: "asc" } },
      steps: { orderBy: { position: "asc" } },
      author: { select: { id: true, name: true, email: true } },
      externalSource: { select: { id: true, name: true } },
    },
  });
  if (!recipe) throw new HttpError(404, "Receita não encontrada");
  return json({ recipe });
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const { id } = await params;
  const before = await loadBefore(id);
  const input = await parseBody(req, adminRecipeSchema);
  const categoryIds = await assertCategoriesExist(input.categoryIds);
  const externalSourceId = await assertSourceExists(input.externalSourceId);
  const updated = await updateRecipe(id, { ...input, categoryIds }, { status: input.status, featured: input.featured, externalSourceId });
  await afterStatusChange(before, updated, admin.id);
  return json({ recipe: { id: updated.id, slug: updated.slug, status: updated.status } });
});

const patchSchema = z
  .object({
    status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"]).optional(),
    featured: z.boolean().optional(),
  })
  .refine((v) => v.status !== undefined || v.featured !== undefined, "Informe status ou destaque");

/** Ações rápidas: aprovar/publicar, rejeitar, arquivar, destacar. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const { id } = await params;
  const before = await loadBefore(id);
  const body = await parseBody(req, patchSchema);
  const updated = await prisma.recipe.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.featured !== undefined ? { featured: body.featured } : {}),
      ...(body.status === "PUBLISHED" && !before.publishedAt ? { publishedAt: new Date() } : {}),
    },
    select: { id: true, slug: true, title: true, status: true, featured: true },
  });
  await afterStatusChange(before, updated, admin.id);
  return json({ recipe: updated });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await loadBefore(id);
  await prisma.recipe.delete({ where: { id } });
  return json({ ok: true });
});
