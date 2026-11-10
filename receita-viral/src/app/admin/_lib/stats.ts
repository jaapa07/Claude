import "server-only";
import type { RecipeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Números do painel administrativo (usado pela página /admin e por GET /api/admin/stats). */
export async function getAdminStats() {
  const [byStatus, users, blockedUsers, admins, pendingComments, favorites, ratings, views, topViewed, topFavorited, recentSignups, searchTerms, categories] =
    await Promise.all([
      prisma.recipe.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { status: "BLOCKED" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.comment.count({ where: { status: "PENDING" } }),
      prisma.favorite.count(),
      prisma.rating.count(),
      prisma.recipe.aggregate({ _sum: { viewCount: true } }),
      prisma.recipe.findMany({
        orderBy: { viewCount: "desc" },
        take: 10,
        select: { id: true, slug: true, title: true, emoji: true, status: true, viewCount: true, _count: { select: { favorites: true } } },
      }),
      prisma.recipe.findMany({
        orderBy: { favorites: { _count: "desc" } },
        take: 10,
        select: { id: true, slug: true, title: true, emoji: true, status: true, viewCount: true, _count: { select: { favorites: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.searchQuery.findMany({ orderBy: [{ count: "desc" }, { lastAt: "desc" }], take: 10, select: { term: true, count: true } }),
      prisma.category.findMany({
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, emoji: true, color: true, type: true, _count: { select: { recipes: true } } },
      }),
    ]);

  const recipesByStatus: Record<RecipeStatus, number> = { DRAFT: 0, PENDING: 0, PUBLISHED: 0, REJECTED: 0, ARCHIVED: 0 };
  for (const row of byStatus) recipesByStatus[row.status] = row._count._all;
  const totalRecipes = Object.values(recipesByStatus).reduce((a, b) => a + b, 0);

  const mapTop = (r: (typeof topViewed)[number]) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    emoji: r.emoji,
    status: r.status,
    viewCount: r.viewCount,
    favoriteCount: r._count.favorites,
  });

  return {
    totals: {
      recipes: totalRecipes,
      recipesByStatus,
      users,
      blockedUsers,
      admins,
      pendingComments,
      favorites,
      ratings,
      views: views._sum.viewCount ?? 0,
    },
    topByViews: topViewed.map(mapTop),
    topByFavorites: topFavorited.map(mapTop),
    recentSignups,
    topSearchTerms: searchTerms,
    recipesPerCategory: categories
      .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color, type: c.type, count: c._count.recipes }))
      .sort((a, b) => b.count - a.count),
  };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
