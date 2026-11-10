import type { Prisma, PrismaClient, RecipeStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { buildSearchText } from "@/lib/search";
import type { RecipeInput } from "@/lib/validation";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function uniqueSlug(tx: Tx, title: string, ignoreId?: string): Promise<string> {
  const base = slugify(title) || "receita";
  let slug = base;
  for (let i = 2; ; i++) {
    const found = await tx.recipe.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === ignoreId) return slug;
    slug = `${base}-${i}`;
  }
}

async function ingredientIds(tx: Tx, items: RecipeInput["ingredients"]) {
  const ids: string[] = [];
  for (const it of items) {
    const name = it.name.trim().toLowerCase();
    const ing = await tx.ingredient.upsert({
      where: { name },
      create: { name, group: it.group },
      update: {},
      select: { id: true },
    });
    ids.push(ing.id);
  }
  return ids;
}

export interface SaveOptions {
  status: RecipeStatus;
  featured?: boolean;
  authorId?: string | null;
  externalSourceId?: string | null;
  slug?: string;
}

function baseData(input: RecipeInput) {
  return {
    title: input.title,
    description: input.description,
    imageUrl: input.imageUrl ?? null,
    videoUrl: input.videoUrl ?? null,
    emoji: input.emoji || null,
    prepMinutes: input.prepMinutes,
    cookMinutes: input.cookMinutes,
    servings: input.servings,
    difficulty: input.difficulty,
    caloriesPerServing: input.caloriesPerServing ?? null,
    costLevel: input.costLevel,
    tags: input.tags,
    tips: input.tips,
    substitutions: input.substitutions as Prisma.InputJsonValue,
    nutrition: (input.nutrition ?? undefined) as Prisma.InputJsonValue | undefined,
    sourceUrl: input.sourceUrl ?? null,
    sourceName: input.sourceName ?? null,
    sourceAttribution: input.sourceAttribution ?? null,
    searchText: buildSearchText(input.title, input.tags, input.ingredients.map((i) => i.name), input.description),
  };
}

function nested(input: RecipeInput, ids: string[]) {
  return {
    ingredients: {
      create: input.ingredients.map((it, i) => ({
        ingredientId: ids[i],
        quantity: it.unit === "a gosto" ? null : it.quantity,
        unit: it.unit,
        note: it.note ?? null,
        optional: it.optional,
        position: i,
      })),
    },
    steps: {
      create: input.steps.map((s, i) => ({ position: i, text: s.text, timerMinutes: s.timerMinutes ?? null })),
    },
  };
}

export async function createRecipe(input: RecipeInput, opts: SaveOptions, db: PrismaClient = defaultPrisma) {
  return db.$transaction(async (tx) => {
    const ids = await ingredientIds(tx, input.ingredients);
    const slug = opts.slug ?? (await uniqueSlug(tx, input.title));
    return tx.recipe.create({
      data: {
        ...baseData(input),
        slug,
        status: opts.status,
        featured: opts.featured ?? false,
        authorId: opts.authorId ?? null,
        externalSourceId: opts.externalSourceId ?? null,
        publishedAt: opts.status === "PUBLISHED" ? new Date() : null,
        categories: { connect: input.categoryIds.map((id) => ({ id })) },
        ...nested(input, ids),
      },
    });
  });
}

export async function updateRecipe(id: string, input: RecipeInput, opts: SaveOptions, db: PrismaClient = defaultPrisma) {
  return db.$transaction(async (tx) => {
    const current = await tx.recipe.findUniqueOrThrow({ where: { id }, select: { publishedAt: true, title: true, slug: true } });
    const ids = await ingredientIds(tx, input.ingredients);
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await tx.step.deleteMany({ where: { recipeId: id } });
    const slug = current.title === input.title ? current.slug : await uniqueSlug(tx, input.title, id);
    return tx.recipe.update({
      where: { id },
      data: {
        ...baseData(input),
        slug,
        status: opts.status,
        featured: opts.featured ?? false,
        externalSourceId: opts.externalSourceId ?? null,
        publishedAt: opts.status === "PUBLISHED" ? (current.publishedAt ?? new Date()) : current.publishedAt,
        categories: { set: input.categoryIds.map((cid) => ({ id: cid })) },
        ...nested(input, ids),
      },
    });
  });
}

/** Notifica usuários (que aceitaram) sobre uma nova receita publicada. */
export async function notifyNewRecipe(recipe: { title: string; slug: string }, exceptUserId?: string, db: PrismaClient = defaultPrisma) {
  const users = await db.user.findMany({
    where: { notifyNewRecipes: true, status: "ACTIVE", ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
    select: { id: true },
  });
  if (!users.length) return 0;
  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title: "Nova receita no ar 🍽️",
      body: `${recipe.title} acabou de ser publicada.`,
      link: `/receitas/${recipe.slug}`,
    })),
  });
  return users.length;
}
