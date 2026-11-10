import { describe, expect, it } from "vitest";
import { registerSchema, recipeInputSchema, externalSourceSchema } from "@/lib/validation";
import { signSession, verifySession } from "@/lib/auth/token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { recipeInput } from "./helpers";
import { detectIntent } from "@/lib/chef/intent";

describe("validação", () => {
  it("exige senha forte no cadastro", () => {
    expect(registerSchema.safeParse({ name: "Ana", email: "ana@x.com", password: "curta" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ana", email: "ana@x.com", password: "somenteletras" }).success).toBe(false);
    const ok = registerSchema.parse({ name: " Ana ", email: "ANA@X.COM", password: "senha1234" });
    expect(ok.email).toBe("ana@x.com");
    expect(ok.name).toBe("Ana");
  });
  it("valida receita completa e rejeita sem ingredientes", () => {
    expect(recipeInputSchema.safeParse(recipeInput()).success).toBe(true);
    expect(recipeInputSchema.safeParse(recipeInput({ ingredients: [] })).success).toBe(false);
    expect(recipeInputSchema.safeParse(recipeInput({ imageUrl: "javascript:alert(1)" })).success).toBe(false);
  });
  it("fonte externa guarda só o NOME da variável da chave", () => {
    expect(externalSourceSchema.safeParse({ name: "Fonte", baseUrl: "https://x.com", apiKeyEnv: "sk-123abc" }).success).toBe(false);
    expect(externalSourceSchema.safeParse({ name: "Fonte", baseUrl: "https://x.com", apiKeyEnv: "FONTE_API_KEY" }).success).toBe(true);
  });
});

describe("autenticação", () => {
  it("assina e verifica sessão", async () => {
    const token = await signSession({ sub: "u1", role: "ADMIN", name: "A" });
    expect(await verifySession(token)).toEqual({ sub: "u1", role: "ADMIN", name: "A" });
  });
  it("rejeita token adulterado", async () => {
    const token = await signSession({ sub: "u1", role: "USER", name: "A" });
    const [h, p, s] = token.split(".");
    const forged = JSON.parse(Buffer.from(p, "base64url").toString());
    forged.role = "ADMIN";
    expect(await verifySession(`${h}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${s}`)).toBeNull();
    expect(await verifySession("lixo")).toBeNull();
  });
  it("faz hash de senha com bcrypt", async () => {
    const hash = await hashPassword("Senha1234");
    expect(hash).not.toContain("Senha1234");
    expect(await verifyPassword("Senha1234", hash)).toBe(true);
    expect(await verifyPassword("errada", hash)).toBe(false);
  });
});

describe("Chef IA — detecção de intenção", () => {
  it.each([
    ["Tenho arroz, ovo e bacon. O que posso fazer?", "ingredients"],
    ["Quero uma receita japonesa fácil.", "cuisine"],
    ["Monte um jantar romântico para duas pessoas.", "romantic"],
    ["Sugira cinco receitas econômicas.", "budget"],
    ["Adapte esta receita para quatro pessoas.", "scale"],
    ["Crie um cardápio semanal.", "weekly-menu"],
    ["quero uma sobremesa", "category"],
  ])("%s → %s", (text, kind) => {
    expect(detectIntent(text).kind).toBe(kind);
  });
  it("extrai números por extenso", () => {
    expect(detectIntent("Sugira cinco receitas econômicas").kind === "budget" && (detectIntent("Sugira cinco receitas econômicas") as { count: number }).count).toBe(5);
    expect((detectIntent("Adapte o bolo para quatro pessoas") as { servings: number }).servings).toBe(4);
    expect((detectIntent("Tenho arroz, ovo e bacon") as { items: string[] }).items).toEqual(["arroz", "ovo", "bacon"]);
  });
});
