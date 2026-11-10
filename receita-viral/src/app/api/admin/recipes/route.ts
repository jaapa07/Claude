import type { Prisma, RecipeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { json, parseBody, requireAdmin, route, searchParams } from "@/lib/api";
import { adminRecipeSchema } from "@/lib/validation";
import { createRecipe, notifyNewRecipe } from "@/lib/recipe-write";
import { assertCategoriesExist, assertSourceExists } from "@/app/admin/_lib/recipe-status";

const STATUSES: RecipeStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"];
const PAGE_SIZE = 20;

export const GET = route(async (req) => {
  await requireAdmin(req);
  const sp = searchParams(req);
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status") as RecipeStatus | null;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const where: Prisma.RecipeWhereInput = {
    ...(status && STATUSES.includes(status) ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } : {}),
  };
  const [total, recipes] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        categories: { select: { id: true, name: true, emoji: true } },
        author: { select: { id: true, name: true } },
        _count: { select: { favorites: true, ratings: true, comments: true } },
      },
    }),
  ]);
  return json({ recipes, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
});

export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  const input = await parseBody(req, adminRecipeSchema);
  const categoryIds = await assertCategoriesExist(input.categoryIds);
  const externalSourceId = await assertSourceExists(input.externalSourceId);
  const recipe = await createRecipe(
    { ...input, categoryIds },
    { status: input.status, featured: input.featured, externalSourceId, authorId: admin.id },
  );
  if (recipe.status === "PUBLISHED") await notifyNewRecipe(recipe, admin.id).catch(() => 0);
  return json({ recipe: { id: recipe.id, slug: recipe.slug, status: recipe.status } }, 201);
});
