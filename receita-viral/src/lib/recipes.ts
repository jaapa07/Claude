import type { Prisma, Difficulty, CostLevel, SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalize, seededPick, todayKey } from "@/lib/utils";
import { allergenTerms, containsAllergen, matchIngredients, parseIngredientList, type IngredientMatch } from "@/lib/search";

export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  imageUrl: true,
  emoji: true,
  prepMinutes: true,
  cookMinutes: true,
  difficulty: true,
  caloriesPerServing: true,
  costLevel: true,
  viewCount: true,
  featured: true,
  publishedAt: true,
  categories: { select: { slug: true, name: true, type: true, color: true } },
  viralTrends: { select: { platform: true }, take: 1 },
  _count: { select: { favorites: true, ratings: true } },
} satisfies Prisma.RecipeSelect;

type CardRow = Prisma.RecipeGetPayload<{ select: typeof cardSelect }>;

export interface RecipeCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  emoji: string | null;
  totalMinutes: number;
  difficulty: Difficulty;
  caloriesPerServing: number | null;
  costLevel: CostLevel;
  ratingAvg: number;
  ratingCount: number;
  favoriteCount: number;
  viewCount: number;
  cuisine: { slug: string; name: string } | null;
  color: string | null;
  viralPlatform: SocialPlatform | null;
  match?: Pick<IngredientMatch, "matched" | "missing" | "score">;
}

export const publishedWhere: Prisma.RecipeWhereInput = { status: "PUBLISHED" };

async function ratingMap(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await prisma.rating.groupBy({ by: ["recipeId"], where: { recipeId: { in: ids } }, _avg: { stars: true } });
  return new Map(rows.map((r) => [r.recipeId, r._avg.stars ?? 0]));
}

export async function toCards(rows: CardRow[]): Promise<RecipeCardData[]> {
  const ratings = await ratingMap(rows.map((r) => r.id));
  return rows.map((r) => {
    const cuisine = r.categories.find((c) => c.type === "CUISINE") ?? null;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      emoji: r.emoji,
      totalMinutes: r.prepMinutes + r.cookMinutes,
      difficulty: r.difficulty,
      caloriesPerServing: r.caloriesPerServing,
      costLevel: r.costLevel,
      ratingAvg: Math.round((ratings.get(r.id) ?? 0) * 10) / 10,
      ratingCount: r._count.ratings,
      favoriteCount: r._count.favorites,
      viewCount: r.viewCount,
      cuisine: cuisine ? { slug: cuisine.slug, name: cuisine.name } : null,
      color: cuisine?.color ?? r.categories[0]?.color ?? null,
      viralPlatform: r.viralTrends[0]?.platform ?? null,
    };
  });
}

/** Pontuação de popularidade baseada SOMENTE em métricas reais do próprio app. */
export function popularityScore(c: Pick<RecipeCardData, "viewCount" | "favoriteCount" | "ratingCount" | "ratingAvg">) {
  return c.viewCount + c.favoriteCount * 8 + c.ratingCount * 4 + c.ratingAvg * c.ratingCount * 2;
}

/* -------------------------------------------------------------- listagem */

export const SORTS = ["relevance", "popular", "recent", "rating", "quick", "calories"] as const;
export type SortKey = (typeof SORTS)[number];

export interface RecipeFilters {
  q?: string;
  have?: string[];
  exclude?: string[];
  maxTime?: number;
  difficulty?: Difficulty[];
  maxCalories?: number;
  categories?: string[]; // slugs (culinária ou tipo) — todas devem casar
  cost?: CostLevel;
  platform?: SocialPlatform;
  viralOnly?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export function filtersFromParams(sp: URLSearchParams | Record<string, string | string[] | undefined>): RecipeFilters {
  const get = (k: string): string | undefined => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const getAll = (k: string): string[] => {
    if (sp instanceof URLSearchParams) return sp.getAll(k).flatMap((v) => v.split(",")).filter(Boolean);
    const v = sp[k];
    return (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).filter(Boolean);
  };
  const num = (k: string) => {
    const v = Number(get(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const difficulty = getAll("difficulty").filter((d): d is Difficulty => ["EASY", "MEDIUM", "HARD"].includes(d));
  const cost = get("cost");
  const platform = get("platform");
  const sort = get("sort");
  return {
    q: get("q")?.slice(0, 120),
    have: parseIngredientList(getAll("have")),
    exclude: getAll("exclude").map((s) => s.trim()).filter(Boolean).slice(0, 20),
    maxTime: num("maxTime"),
    maxCalories: num("maxCalories"),
    difficulty: difficulty.length ? difficulty : undefined,
    categories: getAll("category").slice(0, 5),
    cost: cost === "LOW" || cost === "MEDIUM" || cost === "HIGH" ? cost : undefined,
    platform: platform && ["TIKTOK", "INSTAGRAM", "YOUTUBE", "PINTEREST"].includes(platform) ? (platform as SocialPlatform) : undefined,
    viralOnly: get("viral") === "1",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : undefined,
    page: num("page"),
    pageSize: num("pageSize"),
  };
}

export interface ListResult {
  items: RecipeCardData[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export async function listRecipes(f: RecipeFilters): Promise<ListResult> {
  const pageSize = Math.min(f.pageSize ?? 24, 60);
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const and: Prisma.RecipeWhereInput[] = [publishedWhere];

  if (f.q) {
    const words = normalize(f.q).split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) and.push({ searchText: { contains: w } });
  }
  if (f.maxTime) {
    // prep + cook <= maxTime: aproximação no banco e corte exato em memória
    and.push({ prepMinutes: { lte: f.maxTime } }, { cookMinutes: { lte: f.maxTime } });
  }
  if (f.difficulty?.length) and.push({ difficulty: { in: f.difficulty } });
  if (f.maxCalories) and.push({ caloriesPerServing: { lte: f.maxCalories } });
  if (f.cost) and.push({ costLevel: f.cost });
  for (const slug of f.categories ?? []) and.push({ categories: { some: { slug } } });
  if (f.platform) and.push({ viralTrends: { some: { platform: f.platform } } });
  else if (f.viralOnly) and.push({ viralTrends: { some: {} } });

  const needsMemory = Boolean(f.have?.length || f.exclude?.length || f.maxTime || ["popular", "rating", "quick"].includes(f.sort ?? ""));
  const where: Prisma.RecipeWhereInput = { AND: and };

  if (!needsMemory) {
    const orderBy: Prisma.RecipeOrderByWithRelationInput[] =
      f.sort === "calories" ? [{ caloriesPerServing: "asc" }] : [{ publishedAt: "desc" }, { title: "asc" }];
    const [rows, total] = await Promise.all([
      prisma.recipe.findMany({ where, select: cardSelect, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.recipe.count({ where }),
    ]);
    return { items: await toCards(rows), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  // Caminho com pontuação em memória (busca por ingredientes, exclusões, ordenação por popularidade)
  const rows = await prisma.recipe.findMany({
    where,
    select: { ...cardSelect, ingredients: { select: { optional: true, ingredient: { select: { name: true } } } } },
    take: 1000,
  });
  const exclusionTerms = allergenTerms(f.exclude ?? []);
  let filtered = rows.filter((r) => {
    if (f.maxTime && r.prepMinutes + r.cookMinutes > f.maxTime) return false;
    if (exclusionTerms.length && containsAllergen(r.ingredients.map((i) => i.ingredient.name), exclusionTerms)) return false;
    return true;
  });
  const matchById = new Map<string, IngredientMatch>();
  if (f.have?.length) {
    for (const r of filtered) {
      matchById.set(r.id, matchIngredients(r.ingredients.map((i) => ({ name: i.ingredient.name, optional: i.optional })), f.have));
    }
    filtered = filtered.filter((r) => (matchById.get(r.id)?.matched.length ?? 0) > 0);
  }
  let cards = await toCards(filtered);
  cards = cards.map((c) => {
    const m = matchById.get(c.id);
    return m ? { ...c, match: { matched: m.matched, missing: m.missing, score: m.score } } : c;
  });
  const sort = f.sort ?? (f.have?.length ? "relevance" : "popular");
  cards.sort((a, b) => {
    switch (sort) {
      case "relevance":
        return (b.match?.score ?? 0) - (a.match?.score ?? 0) || (a.match?.missing.length ?? 0) - (b.match?.missing.length ?? 0);
      case "rating":
        return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
      case "quick":
        return a.totalMinutes - b.totalMinutes;
      case "calories":
        return (a.caloriesPerServing ?? 9999) - (b.caloriesPerServing ?? 9999);
      case "recent":
        return 0;
      default:
        return popularityScore(b) - popularityScore(a) || a.title.localeCompare(b.title);
    }
  });
  const total = cards.length;
  return {
    items: cards.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* -------------------------------------------------------------- detalhe */

export async function getRecipeBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const recipe = await prisma.recipe.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
      ingredients: { include: { ingredient: true }, orderBy: { position: "asc" } },
      steps: { orderBy: { position: "asc" } },
      author: { select: { id: true, name: true, avatarUrl: true } },
      viralTrends: true,
      externalSource: { select: { name: true, baseUrl: true, license: true } },
      _count: { select: { favorites: true, ratings: true } },
    },
  });
  if (!recipe) return null;
  if (recipe.status !== "PUBLISHED" && !opts.includeUnpublished) return null;
  const agg = await prisma.rating.aggregate({ where: { recipeId: recipe.id }, _avg: { stars: true } });
  return { ...recipe, ratingAvg: Math.round((agg._avg.stars ?? 0) * 10) / 10 };
}

export type RecipeDetail = NonNullable<Awaited<ReturnType<typeof getRecipeBySlug>>>;

/* -------------------------------------------------------------- seções da home */

export async function cardsWhere(where: Prisma.RecipeWhereInput, take = 12, orderBy?: Prisma.RecipeOrderByWithRelationInput[]) {
  const rows = await prisma.recipe.findMany({
    where: { AND: [publishedWhere, where] },
    select: cardSelect,
    take,
    orderBy: orderBy ?? [{ publishedAt: "desc" }],
  });
  return toCards(rows);
}

export async function popularRecipes(take = 10, where: Prisma.RecipeWhereInput = {}) {
  const rows = await prisma.recipe.findMany({ where: { AND: [publishedWhere, where] }, select: cardSelect, take: 500 });
  const cards = await toCards(rows);
  return cards.sort((a, b) => popularityScore(b) - popularityScore(a) || a.title.localeCompare(b.title)).slice(0, take);
}

/** Receita viral do dia: escolha determinística diária entre destaques/virais publicados. */
export async function viralOfTheDay() {
  const candidates = await prisma.recipe.findMany({
    where: { AND: [publishedWhere, { OR: [{ featured: true }, { viralTrends: { some: {} } }] }] },
    select: cardSelect,
    orderBy: { slug: "asc" },
  });
  const cards = await toCards(candidates);
  return seededPick(cards, todayKey()) ?? null;
}

export async function topSearchTerms(take = 8) {
  return prisma.searchQuery.findMany({ orderBy: [{ count: "desc" }, { lastAt: "desc" }], take });
}

export async function recordSearch(term: string) {
  const t = normalize(term).slice(0, 60);
  if (t.length < 3) return;
  await prisma.searchQuery.upsert({
    where: { term: t },
    create: { term: t },
    update: { count: { increment: 1 }, lastAt: new Date() },
  });
}

/** Sugestões personalizadas: categorias dos favoritos/histórico do usuário, sem alergênicos. */
export async function personalizedFor(userId: string | null, take = 8) {
  if (!userId) return [];
  const [favs, history, user] = await Promise.all([
    prisma.favorite.findMany({ where: { userId }, select: { recipe: { select: { id: true, categories: { select: { slug: true } } } } }, take: 30 }),
    prisma.viewHistory.findMany({ where: { userId }, select: { recipe: { select: { id: true, categories: { select: { slug: true } } } } }, orderBy: { viewedAt: "desc" }, take: 30 }),
    prisma.user.findUnique({ where: { id: userId }, select: { allergies: true } }),
  ]);
  const seen = new Set([...favs, ...history].map((x) => x.recipe.id));
  const weights = new Map<string, number>();
  for (const x of [...favs, ...favs, ...history]) for (const c of x.recipe.categories) weights.set(c.slug, (weights.get(c.slug) ?? 0) + 1);
  const top = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s);
  if (!top.length) return [];
  const rows = await prisma.recipe.findMany({
    where: { AND: [publishedWhere, { id: { notIn: [...seen] } }, { categories: { some: { slug: { in: top } } } }] },
    select: { ...cardSelect, ingredients: { select: { ingredient: { select: { name: true } } } } },
    take: 60,
  });
  const terms = allergenTerms(user?.allergies ?? []);
  const safe = rows.filter((r) => !terms.length || !containsAllergen(r.ingredients.map((i) => i.ingredient.name), terms));
  const cards = await toCards(safe);
  const score = (c: RecipeCardData) => {
    const row = safe.find((r) => r.id === c.id);
    return (row?.categories ?? []).reduce((s, cat) => s + (weights.get(cat.slug) ?? 0), 0);
  };
  return cards.sort((a, b) => score(b) - score(a)).slice(0, take);
}

export async function categoriesByType() {
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { recipes: { where: publishedWhere } } } },
  });
  return {
    cuisines: cats.filter((c) => c.type === "CUISINE"),
    dishTypes: cats.filter((c) => c.type === "DISH_TYPE"),
  };
}
