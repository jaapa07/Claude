import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE } from "@/lib/auth/token";
import { createRecipe } from "@/lib/recipe-write";
import type { RecipeInput } from "@/lib/validation";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function makeUser(opts: { email?: string; role?: "USER" | "ADMIN"; password?: string; allergies?: string[] } = {}) {
  const user = await prisma.user.create({
    data: {
      name: opts.role === "ADMIN" ? "Admin Teste" : "Usuário Teste",
      email: opts.email ?? `u${Math.random().toString(36).slice(2)}@teste.com`,
      role: opts.role ?? "USER",
      passwordHash: await hashPassword(opts.password ?? "Senha1234"),
      allergies: opts.allergies ?? [],
    },
  });
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  return { user, cookie: `${SESSION_COOKIE}=${token}` };
}

export function req(url: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  return new Request(`http://localhost${url}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(init.cookie ? { cookie: init.cookie } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

export async function makeCategory(slug: string, type: "CUISINE" | "DISH_TYPE" = "DISH_TYPE") {
  return prisma.category.create({ data: { slug, name: slug, type } });
}

export function recipeInput(over: Partial<RecipeInput> = {}): RecipeInput {
  return {
    title: "Frango com batata e queijo",
    description: "Uma receita de teste bem gostosa e simples.",
    imageUrl: null,
    videoUrl: null,
    emoji: "🍗",
    prepMinutes: 10,
    cookMinutes: 30,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 450,
    costLevel: "LOW",
    categoryIds: [],
    tags: ["jantar"],
    tips: ["Dica"],
    substitutions: [],
    nutrition: null,
    ingredients: [
      { name: "peito de frango", quantity: 500, unit: "g", group: "CARNES", note: null, optional: false },
      { name: "batata", quantity: 3, unit: "unidade", group: "HORTIFRUTI", note: null, optional: false },
      { name: "queijo muçarela", quantity: 200, unit: "g", group: "LATICINIOS", note: null, optional: false },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS", note: null, optional: false },
    ],
    steps: [{ text: "Asse tudo junto no forno.", timerMinutes: 30 }],
    sourceUrl: null,
    sourceName: null,
    sourceAttribution: null,
    ...over,
  };
}

export async function publishedRecipe(over: Partial<RecipeInput> = {}) {
  return createRecipe(recipeInput(over), { status: "PUBLISHED" });
}
