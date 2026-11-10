import { prisma } from "@/lib/db";
import { json, parseBody, requireAdmin, route } from "@/lib/api";
import { categorySchema } from "@/lib/validation";
import { resolveCategorySlug } from "@/app/admin/_lib/category";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const categories = await prisma.category.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { recipes: true } } },
  });
  return json({ categories });
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const input = await parseBody(req, categorySchema);
  const slug = await resolveCategorySlug(input.name, input.slug);
  const category = await prisma.category.create({
    data: {
      ...input,
      slug,
      description: input.description || null,
      emoji: input.emoji || null,
      color: input.color || null,
    },
  });
  return json({ category }, 201);
});
