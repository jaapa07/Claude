import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ctx, makeCategory, makeUser, publishedRecipe, recipeInput, req, resetDb } from "./helpers";
import * as register from "@/app/api/auth/register/route";
import * as login from "@/app/api/auth/login/route";
import * as recipes from "@/app/api/recipes/route";
import * as recipeById from "@/app/api/recipes/[id]/route";
import * as favorite from "@/app/api/recipes/[id]/favorite/route";
import * as rating from "@/app/api/recipes/[id]/rating/route";
import * as comments from "@/app/api/recipes/[id]/comments/route";
import * as view from "@/app/api/recipes/[id]/view/route";
import * as myFavorites from "@/app/api/me/favorites/route";
import * as entries from "@/app/api/mealplan/entries/route";
import * as planShopping from "@/app/api/mealplan/shopping-list/route";
import * as fromRecipe from "@/app/api/shopping/from-recipe/route";
import * as shoppingList from "@/app/api/shopping/[id]/route";
import * as collections from "@/app/api/collections/route";
import * as collectionItems from "@/app/api/collections/[id]/items/route";
import * as collectionById from "@/app/api/collections/[id]/route";
import { localChef } from "@/lib/chef/local";

beforeAll(async () => {
  await prisma.$connect();
});
beforeEach(async () => {
  await resetDb();
});

describe("autenticação", () => {
  it("cadastra, define cookie httpOnly e impede e-mail duplicado", async () => {
    const res = await register.POST(req("/api/auth/register", { body: { name: "Ana", email: "ana@teste.com", password: "Senha1234" } }), {} as never);
    expect(res.status).toBe(201);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/rv_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    const dup = await register.POST(req("/api/auth/register", { body: { name: "Ana", email: "ANA@teste.com", password: "Senha1234" } }), {} as never);
    expect(dup.status).toBe(409);
  });

  it("login com senha errada retorna 401 e conta bloqueada 403", async () => {
    await makeUser({ email: "bia@teste.com", password: "Senha1234" });
    expect((await login.POST(req("/api/auth/login", { body: { email: "bia@teste.com", password: "errada123" } }), {} as never)).status).toBe(401);
    expect((await login.POST(req("/api/auth/login", { body: { email: "bia@teste.com", password: "Senha1234" } }), {} as never)).status).toBe(200);
    await prisma.user.update({ where: { email: "bia@teste.com" }, data: { status: "BLOCKED" } });
    expect((await login.POST(req("/api/auth/login", { body: { email: "bia@teste.com", password: "Senha1234" } }), {} as never)).status).toBe(403);
  });

  it("valida dados do cadastro (422)", async () => {
    const res = await register.POST(req("/api/auth/register", { body: { name: "A", email: "x", password: "1" } }), {} as never);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.length).toBeGreaterThan(0);
  });
});

describe("receitas: busca e filtros", () => {
  it("busca por ingredientes e indica o que falta", async () => {
    await publishedRecipe();
    await publishedRecipe({
      title: "Bolo simples",
      ingredients: [
        { name: "farinha de trigo", quantity: 2, unit: "xícara", group: "MERCEARIA", note: null, optional: false },
        { name: "ovo", quantity: 3, unit: "unidade", group: "LATICINIOS", note: null, optional: false },
      ],
    });
    const res = await recipes.GET(req("/api/recipes?have=frango,batata,queijo"), {} as never);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.items[0].title).toBe("Frango com batata e queijo");
    expect(data.items[0].match.matched).toHaveLength(3);
    expect(data.items[0].match.missing).toEqual([]);
  });

  it("filtra por tempo, dificuldade, calorias, categoria e exclusões", async () => {
    const cat = await makeCategory("japonesa", "CUISINE");
    await publishedRecipe({ title: "Rápida leve", prepMinutes: 5, cookMinutes: 5, caloriesPerServing: 200, categoryIds: [cat.id] });
    await publishedRecipe({ title: "Demorada", prepMinutes: 60, cookMinutes: 60, difficulty: "HARD", caloriesPerServing: 900 });
    const get = async (qs: string) => (await (await recipes.GET(req(`/api/recipes?${qs}`), {} as never)).json()).items.map((i: { title: string }) => i.title);
    expect(await get("maxTime=15")).toEqual(["Rápida leve"]);
    expect(await get("difficulty=HARD")).toEqual(["Demorada"]);
    expect(await get("maxCalories=300")).toEqual(["Rápida leve"]);
    expect(await get("category=japonesa")).toEqual(["Rápida leve"]);
    expect(await get("exclude=lactose")).toEqual([]); // ambas têm queijo muçarela
  });

  it("busca textual ignora acentos e não lista rascunhos", async () => {
    await publishedRecipe({ title: "Pão de queijo" });
    const { createRecipe } = await import("@/lib/recipe-write");
    await createRecipe(recipeInput({ title: "Pão rascunho" }), { status: "DRAFT" });
    const data = await (await recipes.GET(req("/api/recipes?q=pao"), {} as never)).json();
    expect(data.items.map((i: { title: string }) => i.title)).toEqual(["Pão de queijo"]);
    expect(await prisma.searchQuery.count()).toBe(1);
  });
});

describe("interações do usuário", () => {
  it("favoritar, avaliar, comentar e registrar visualização", async () => {
    const r = await publishedRecipe();
    const { user, cookie } = await makeUser();
    const p = ctx({ id: r.id });

    expect((await favorite.POST(req(`/api/recipes/${r.id}/favorite`, { method: "POST", cookie }), p)).status).toBe(200);
    expect((await favorite.POST(req(`/api/recipes/${r.id}/favorite`, { method: "POST", cookie }), p)).status).toBe(200); // idempotente
    const favs = await (await myFavorites.GET(req("/api/me/favorites?idsOnly=1", { cookie }), {} as never)).json();
    expect(favs.ids).toEqual([r.id]);

    const rated = await (await rating.PUT(req(`/api/recipes/${r.id}/rating`, { method: "PUT", body: { stars: 4 }, cookie }), p)).json();
    expect(rated).toMatchObject({ average: 4, count: 1 });
    expect((await rating.PUT(req(`/api/recipes/${r.id}/rating`, { method: "PUT", body: { stars: 9 }, cookie }), p)).status).toBe(422);

    const c1 = await comments.POST(req(`/api/recipes/${r.id}/comments`, { body: { text: "Ficou ótimo!" }, cookie }), p);
    expect(c1.status).toBe(201);
    const c2 = await (await comments.POST(req(`/api/recipes/${r.id}/comments`, { body: { text: "Veja https://spam.com" }, cookie }), p)).json();
    expect(c2.comment.status).toBe("PENDING");
    const list = await (await comments.GET(req(`/api/recipes/${r.id}/comments`), p)).json();
    expect(list.comments).toHaveLength(1);

    await view.POST(req(`/api/recipes/${r.id}/view`, { method: "POST", cookie }), p);
    await view.POST(req(`/api/recipes/${r.id}/view`, { method: "POST", cookie }), p); // limitado
    expect((await prisma.recipe.findUniqueOrThrow({ where: { id: r.id } })).viewCount).toBe(1);
    expect(await prisma.viewHistory.count({ where: { userId: user.id } })).toBe(1);
  });

  it("exige login (401) para ações protegidas", async () => {
    const r = await publishedRecipe();
    expect((await favorite.POST(req(`/api/recipes/${r.id}/favorite`, { method: "POST" }), ctx({ id: r.id }))).status).toBe(401);
    expect((await collections.GET(req("/api/collections"), {} as never)).status).toBe(401);
  });

  it("usuário publica receita própria que entra em revisão e não aparece publicamente", async () => {
    const { cookie } = await makeUser();
    const res = await recipes.POST(req("/api/recipes", { body: recipeInput({ title: "Minha receita" }), cookie }), {} as never);
    expect(res.status).toBe(201);
    const { recipe } = await res.json();
    expect(recipe.status).toBe("PENDING");
    expect((await recipeById.GET(req(`/api/recipes/${recipe.slug}`), ctx({ id: recipe.slug }))).status).toBe(404);
    expect((await recipeById.GET(req(`/api/recipes/${recipe.slug}`, { cookie }), ctx({ id: recipe.slug }))).status).toBe(200);
    const other = await makeUser();
    expect((await recipeById.DELETE(req(`/api/recipes/${recipe.id}`, { method: "DELETE", cookie: other.cookie }), ctx({ id: recipe.id }))).status).toBe(403);
  });
});

describe("coleções", () => {
  it("cria coleção, adiciona receita e isola entre usuários", async () => {
    const r = await publishedRecipe();
    const a = await makeUser();
    const b = await makeUser();
    const created = await (await collections.POST(req("/api/collections", { body: { name: "Jantares" }, cookie: a.cookie }), {} as never)).json();
    const id = created.collection.id;
    expect((await collectionItems.POST(req(`/api/collections/${id}/items`, { body: { recipeId: r.id }, cookie: a.cookie }), ctx({ id }))).ok).toBe(true);
    const list = await (await collections.GET(req("/api/collections", { cookie: a.cookie }), {} as never)).json();
    expect(list.collections[0]).toMatchObject({ name: "Jantares", count: 1 });
    expect((await collectionById.GET(req(`/api/collections/${id}`, { cookie: b.cookie }), ctx({ id }))).status).toBe(404);
  });
});

describe("planejador e lista de compras", () => {
  it("gera lista consolidada e escalonada a partir da semana", async () => {
    const r1 = await publishedRecipe();
    const r2 = await publishedRecipe({ title: "Frango grelhado" }); // também tem 500 g de peito de frango para 4
    const { cookie } = await makeUser();
    const week = "2026-11-09";
    await entries.POST(req("/api/mealplan/entries", { body: { weekStart: week, dayIndex: 0, mealType: "LUNCH", recipeId: r1.id, servings: 2 }, cookie }), {} as never);
    await entries.POST(req("/api/mealplan/entries", { body: { weekStart: week, dayIndex: 2, mealType: "DINNER", recipeId: r2.id, servings: 8 }, cookie }), {} as never);
    const res = await planShopping.POST(req("/api/mealplan/shopping-list", { body: { week }, cookie }), {} as never);
    expect(res.status).toBeLessThan(300);
    const { list } = await res.json();
    const items = await prisma.shoppingItem.findMany({ where: { listId: list.id } });
    const frango = items.find((i) => i.name === "peito de frango")!;
    // 250 g (2 porções) + 1000 g (8 porções) = 1,25 kg
    expect(frango.unit).toBe("kg");
    expect(frango.quantity).toBeCloseTo(1.25);
    expect(frango.group).toBe("CARNES");
    expect(items.filter((i) => i.name === "batata")).toHaveLength(1);
  });

  it("semana vazia retorna 422 e lista de outro usuário retorna 404", async () => {
    const a = await makeUser();
    const b = await makeUser();
    expect((await planShopping.POST(req("/api/mealplan/shopping-list", { body: { week: "2026-11-09" }, cookie: a.cookie }), {} as never)).status).toBe(422);
    const r = await publishedRecipe();
    const created = await (await fromRecipe.POST(req("/api/shopping/from-recipe", { body: { recipeId: r.id, servings: 4 }, cookie: a.cookie }), {} as never)).json();
    expect(created.added).toBeGreaterThan(0);
    expect((await shoppingList.GET(req(`/api/shopping/${created.list.id}`, { cookie: b.cookie }), ctx({ id: created.list.id }))).status).toBe(404);
  });
});

describe("Chef IA (modo local)", () => {
  it("sugere receitas a partir de ingredientes com itens faltantes", async () => {
    await publishedRecipe();
    const res = await localChef([{ role: "user", content: "Tenho frango e batata. O que posso fazer?" }]);
    expect(res.mode).toBe("local");
    expect(res.recipes[0].title).toBe("Frango com batata e queijo");
    expect(res.recipes[0].missing).toEqual(["queijo muçarela"]);
  });
  it("adapta porções de receita citada", async () => {
    await publishedRecipe();
    const res = await localChef([{ role: "user", content: "Adapte o frango com batata e queijo para 8 pessoas" }]);
    expect(res.recipes[0].servings).toBe(8);
    expect(res.recipes[0].ingredients[0]).toBe("1000 g de peito de frango");
  });
  it("monta cardápio semanal com 7 dias", async () => {
    await publishedRecipe();
    await publishedRecipe({ title: "Outra receita" });
    const res = await localChef([{ role: "user", content: "Crie um cardápio semanal" }]);
    expect(res.menu).toHaveLength(7);
  });
});
