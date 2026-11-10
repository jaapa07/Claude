import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route, searchParams } from "@/lib/api";
import { categorySchema } from "@/lib/validation";
import { resolveCategorySlug } from "@/app/admin/_lib/category";

type Ctx = { params: Promise<{ id: string }> };

async function ensure(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { recipes: true } } } });
  if (!category) throw new HttpError(404, "Categoria não encontrada");
  return category;
}

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  const input = await parseBody(req, categorySchema);
  const slug = await resolveCategorySlug(input.name, input.slug, id);
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...input,
      slug,
      description: input.description || null,
      emoji: input.emoji || null,
      color: input.color || null,
    },
  });
  return json({ category });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const category = await ensure(id);
  const force = searchParams(req).get("force") === "1";
  if (category._count.recipes > 0 && !force) {
    throw new HttpError(
      409,
      `A categoria tem ${category._count.recipes} receita(s) vinculada(s). Confirme a exclusão forçada para desvinculá-las.`,
      { recipes: category._count.recipes },
    );
  }
  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { recipes: { set: [] } } }),
    prisma.category.delete({ where: { id } }),
  ]);
  return json({ ok: true });
});
