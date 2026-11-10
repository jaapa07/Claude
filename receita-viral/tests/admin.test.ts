import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createRecipe } from "@/lib/recipe-write";
import { ctx, makeUser, publishedRecipe, recipeInput, req, resetDb } from "./helpers";
import * as stats from "@/app/api/admin/stats/route";
import * as adminRecipe from "@/app/api/admin/recipes/[id]/route";
import * as adminUsers from "@/app/api/admin/users/[id]/route";
import * as viral from "@/app/api/admin/viral/route";
import * as sources from "@/app/api/admin/sources/route";
import * as importer from "@/app/api/admin/import/route";
import * as comments from "@/app/api/admin/comments/[id]/route";

beforeEach(async () => {
  await resetDb();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("permissões do painel", () => {
  it("visitante recebe 401 e usuário comum 403", async () => {
    expect((await stats.GET(req("/api/admin/stats"), {} as never)).status).toBe(401);
    const { cookie } = await makeUser();
    expect((await stats.GET(req("/api/admin/stats", { cookie }), {} as never)).status).toBe(403);
    const admin = await makeUser({ role: "ADMIN" });
    expect((await stats.GET(req("/api/admin/stats", { cookie: admin.cookie }), {} as never)).status).toBe(200);
  });

  it("papel é revalidado no banco (rebaixar invalida o acesso imediatamente)", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    await prisma.user.update({ where: { id: admin.user.id }, data: { role: "USER" } });
    expect((await stats.GET(req("/api/admin/stats", { cookie: admin.cookie }), {} as never)).status).toBe(403);
  });

  it("admin não pode se rebaixar nem se bloquear", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const res = await adminUsers.PATCH(req(`/api/admin/users/${admin.user.id}`, { method: "PATCH", body: { role: "USER" }, cookie: admin.cookie }), ctx({ id: admin.user.id }));
    expect(res.status).toBe(400);
  });
});

describe("moderação", () => {
  it("aprovar receita enviada publica e notifica o autor", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const author = await makeUser();
    const r = await createRecipe(recipeInput({ title: "Receita da comunidade" }), { status: "PENDING", authorId: author.user.id });
    const res = await adminRecipe.PATCH(req(`/api/admin/recipes/${r.id}`, { method: "PATCH", body: { status: "PUBLISHED" }, cookie: admin.cookie }), ctx({ id: r.id }));
    expect(res.status).toBe(200);
    const updated = await prisma.recipe.findUniqueOrThrow({ where: { id: r.id } });
    expect(updated.status).toBe("PUBLISHED");
    expect(updated.publishedAt).not.toBeNull();
    expect(await prisma.notification.count({ where: { userId: author.user.id } })).toBeGreaterThan(0);
  });

  it("oculta comentário", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const u = await makeUser();
    const r = await publishedRecipe();
    const c = await prisma.comment.create({ data: { userId: u.user.id, recipeId: r.id, text: "spam" } });
    await comments.PATCH(req(`/api/admin/comments/${c.id}`, { method: "PATCH", body: { status: "HIDDEN" }, cookie: admin.cookie }), ctx({ id: c.id }));
    expect((await prisma.comment.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("HIDDEN");
  });
});

describe("tendências virais", () => {
  it("só marca como verificada com link do criador e da publicação", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const r = await publishedRecipe();
    const bad = await viral.POST(req("/api/admin/viral", { body: { recipeId: r.id, platform: "TIKTOK", verified: true }, cookie: admin.cookie }), {} as never);
    expect(bad.status).toBe(422);
    const ok = await viral.POST(
      req("/api/admin/viral", {
        body: { recipeId: r.id, platform: "YOUTUBE", verified: true, creatorName: "Canal", creatorUrl: "https://youtube.com/@canal", postUrl: "https://youtu.be/dQw4w9WgXcQ" },
        cookie: admin.cookie,
      }),
      {} as never,
    );
    expect(ok.status).toBeLessThan(300);
    const t = await prisma.viralTrend.findFirstOrThrow({ where: { recipeId: r.id } });
    expect(t.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});

describe("importação de fontes autorizadas", () => {
  async function source(allowImport: boolean) {
    const admin = await makeUser({ role: "ADMIN" });
    const res = await sources.POST(req("/api/admin/sources", { body: { name: "Fonte Parceira", baseUrl: "https://parceiro.com.br", allowImport }, cookie: admin.cookie }), {} as never);
    const body = await res.json();
    const id = body.source?.id ?? body.id;
    return { admin, id };
  }

  it("bloqueia fonte sem autorização (403) e domínio diferente (422)", async () => {
    const { admin, id } = await source(false);
    expect((await importer.POST(req("/api/admin/import", { body: { sourceId: id, url: "https://parceiro.com.br/r/1" }, cookie: admin.cookie }), {} as never)).status).toBe(403);
    await prisma.externalSource.update({ where: { id }, data: { allowImport: true } });
    expect((await importer.POST(req("/api/admin/import", { body: { sourceId: id, url: "https://outro.com/r/1" }, cookie: admin.cookie }), {} as never)).status).toBe(422);
  });

  it("cria rascunho com créditos e sem copiar o modo de preparo", async () => {
    const { admin, id } = await source(true);
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe",
      name: "Cuscuz nordestino",
      prepTime: "PT10M",
      cookTime: "PT15M",
      recipeYield: "4",
      author: { name: "Chef Parceira" },
      recipeIngredient: ["2 xícaras de flocão de milho", "1 colher de chá de sal"],
      recipeInstructions: [{ text: "TEXTO ORIGINAL PROTEGIDO 1" }, { text: "TEXTO ORIGINAL PROTEGIDO 2" }],
    })}</script>`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } })));
    const res = await importer.POST(req("/api/admin/import", { body: { sourceId: id, url: "https://parceiro.com.br/cuscuz" }, cookie: admin.cookie }), {} as never);
    expect(res.status).toBeLessThan(300);
    const recipe = await prisma.recipe.findFirstOrThrow({ where: { title: "Cuscuz nordestino" }, include: { steps: true } });
    expect(recipe.status).toBe("DRAFT");
    expect(recipe.sourceUrl).toBe("https://parceiro.com.br/cuscuz");
    expect(recipe.sourceAttribution).toContain("Chef Parceira");
    expect(recipe.steps.map((s) => s.text).join(" ")).not.toContain("PROTEGIDO");
  });
});
