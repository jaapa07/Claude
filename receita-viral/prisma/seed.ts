/**
 * Popula o banco com dados de demonstração.
 * Executar: npm run db:seed   (idempotente: atualiza receitas existentes pelo slug)
 */
import { PrismaClient } from "@prisma/client";
import { CATEGORIES } from "./seed-data/categories";
import type { SeedRecipe } from "./seed-data/types";
import { recipesA } from "./seed-data/recipes-a";
import { recipesB } from "./seed-data/recipes-b";
import { recipesC } from "./seed-data/recipes-c";
import { recipesD } from "./seed-data/recipes-d";
import { hashPassword } from "../src/lib/auth/password";
import { createRecipe, updateRecipe } from "../src/lib/recipe-write";

const prisma = new PrismaClient();
export const ALL_RECIPES: SeedRecipe[] = [...recipesA, ...recipesB, ...recipesC, ...recipesD];

async function main() {
  console.log("🌱 Categorias…");
  const catIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { ...c, sortOrder: i, description: "description" in c ? c.description : null },
      update: { name: c.name, emoji: c.emoji, color: c.color, type: c.type, sortOrder: i },
    });
    catIds.set(c.slug, cat.id);
  }

  console.log("👤 Usuários…");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@receitaviral.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "Equipe Receita Viral", role: "ADMIN", passwordHash: await hashPassword(adminPassword) },
    update: { role: "ADMIN" },
  });
  const demo = await prisma.user.upsert({
    where: { email: "demo@receitaviral.local" },
    create: {
      email: "demo@receitaviral.local",
      name: "Conta Demo",
      passwordHash: await hashPassword("Demo@12345"),
      dietaryPrefs: ["mais vegetais"],
      allergies: [],
    },
    update: {},
  });

  console.log("📚 Fontes externas…");
  const ownSource = await prisma.externalSource.findFirst({ where: { name: "Acervo Receita Viral" } });
  if (!ownSource) {
    await prisma.externalSource.create({
      data: {
        name: "Acervo Receita Viral",
        baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        type: "MANUAL",
        license: "Conteúdo próprio de demonstração",
        allowImport: false,
        notes: "Receitas de demonstração escritas para o projeto.",
      },
    });
  }

  const slugs = new Set<string>();
  console.log(`🍳 Receitas (${ALL_RECIPES.length})…`);
  for (const [index, r] of ALL_RECIPES.entries()) {
    if (slugs.has(r.slug)) throw new Error(`Slug duplicado: ${r.slug}`);
    slugs.add(r.slug);
    const categoryIds = [r.cuisine, ...r.categories].map((s) => {
      const id = catIds.get(s);
      if (!id) throw new Error(`Categoria desconhecida "${s}" em ${r.slug}`);
      return id;
    });
    const input = {
      title: r.title,
      description: r.description,
      imageUrl: null,
      videoUrl: null,
      emoji: r.emoji,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      servings: r.servings,
      difficulty: r.difficulty,
      caloriesPerServing: r.caloriesPerServing,
      costLevel: r.costLevel,
      categoryIds: [...new Set(categoryIds)],
      tags: r.tags,
      tips: r.tips,
      substitutions: r.substitutions,
      nutrition: r.nutrition,
      ingredients: r.ingredients.map((i) => ({
        name: i.name.toLowerCase(),
        quantity: i.unit === "a gosto" ? null : i.quantity,
        unit: i.unit,
        group: i.group,
        note: i.note ?? null,
        optional: i.optional ?? false,
      })),
      steps: r.steps.map((s) => ({ text: s.text, timerMinutes: s.timerMinutes ?? null })),
      sourceUrl: null,
      sourceName: "Receita Viral",
      sourceAttribution: "Receita de demonstração do acervo Receita Viral",
    };
    const existing = await prisma.recipe.findUnique({ where: { slug: r.slug }, select: { id: true } });
    const opts = { status: "PUBLISHED" as const, featured: index % 9 === 0, authorId: admin.id, slug: r.slug };
    const recipe = existing ? await updateRecipe(existing.id, input, opts, prisma) : await createRecipe(input, opts, prisma);
    // Datas de publicação escalonadas para que "recentes" tenha ordem estável
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { publishedAt: new Date(Date.UTC(2026, 0, 1) + index * 36e5 * 24) },
    });

    await prisma.viralTrend.deleteMany({ where: { recipeId: recipe.id, verified: false } });
    if (r.viral) {
      await prisma.viralTrend.create({
        data: {
          recipeId: recipe.id,
          platform: r.viral.platform,
          trendYear: r.viral.trendYear,
          trendPeriod: String(r.viral.trendYear),
          note: r.viral.note,
          verified: false,
          highlighted: true,
        },
      });
    }
  }

  // Dados de demonstração para a conta demo (claramente identificada como "Conta Demo").
  const someRecipes = await prisma.recipe.findMany({ where: { slug: { in: ["pao-de-queijo", "brigadeiro", "smash-burger", "frango-teriyaki", "homus"] } }, select: { id: true } });
  for (const [i, r] of someRecipes.entries()) {
    await prisma.favorite.upsert({ where: { userId_recipeId: { userId: demo.id, recipeId: r.id } }, create: { userId: demo.id, recipeId: r.id }, update: {} });
    await prisma.rating.upsert({
      where: { userId_recipeId: { userId: demo.id, recipeId: r.id } },
      create: { userId: demo.id, recipeId: r.id, stars: i % 2 ? 4 : 5 },
      update: {},
    });
  }

  const total = await prisma.recipe.count({ where: { status: "PUBLISHED" } });
  console.log(`✅ Seed concluído: ${total} receitas publicadas.`);
  console.log(`   Admin: ${adminEmail} / ${process.env.SEED_ADMIN_PASSWORD ? "(senha do .env)" : adminPassword}`);
  console.log("   Demo:  demo@receitaviral.local / Demo@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
