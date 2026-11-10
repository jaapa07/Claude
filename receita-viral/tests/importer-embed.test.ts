import { describe, expect, it } from "vitest";
import { extractJsonLdRecipe, hostMatches, isoDurationToMinutes, isPublicHttpUrl, parseIngredientText } from "@/lib/importer";
import { toEmbedUrl } from "@/lib/embed";

describe("importador JSON-LD", () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: "x" },
      {
        "@type": "Recipe",
        name: "Bolo de fubá",
        description: "<p>Bolo fofinho</p>",
        image: ["https://exemplo.com/bolo.jpg"],
        prepTime: "PT15M",
        cookTime: "PT40M",
        recipeYield: "12 porções",
        author: { "@type": "Person", name: "Maria" },
        recipeIngredient: ["2 xícaras de fubá", "1/2 xícara de óleo", "3 ovos", "Sal a gosto", "1 colher (sopa) de fermento"],
        recipeInstructions: [{ "@type": "HowToStep", text: "Bata tudo." }, { "@type": "HowToStep", text: "Asse." }],
      },
    ],
  })}</script></head></html>`;

  it("extrai dados factuais sem copiar o modo de preparo", () => {
    const r = extractJsonLdRecipe(html, "https://exemplo.com/bolo")!;
    expect(r.title).toBe("Bolo de fubá");
    expect(r.description).toBe("Bolo fofinho");
    expect(r.prepMinutes).toBe(15);
    expect(r.cookMinutes).toBe(40);
    expect(r.servings).toBe(12);
    expect(r.author).toBe("Maria");
    expect(r.stepCount).toBe(2);
    expect(r).not.toHaveProperty("steps");
    expect(r.ingredients[0]).toMatchObject({ name: "fubá", quantity: 2, unit: "xícara" });
    expect(r.ingredients[1]).toMatchObject({ name: "óleo", quantity: 0.5, unit: "xícara" });
    expect(r.ingredients[3]).toMatchObject({ unit: "a gosto", quantity: null });
  });

  it("retorna null sem Recipe", () => {
    expect(extractJsonLdRecipe("<html></html>", "https://x.com")).toBeNull();
  });

  it("converte durações ISO 8601", () => {
    expect(isoDurationToMinutes("PT1H30M")).toBe(90);
    expect(isoDurationToMinutes("P1DT2H")).toBe(1560);
    expect(isoDurationToMinutes(undefined)).toBe(0);
  });

  it("interpreta linhas de ingrediente", () => {
    expect(parseIngredientText("500 g de carne moída")).toMatchObject({ name: "carne moída", quantity: 500, unit: "g" });
    expect(parseIngredientText("1 ½ colher de sopa de açúcar")).toMatchObject({ quantity: 1.5, unit: "colher de sopa", name: "açúcar" });
  });

  it("valida domínio da fonte e bloqueia hosts internos (SSRF)", () => {
    expect(hostMatches("https://www.site.com/receita", "https://site.com")).toBe(true);
    expect(hostMatches("https://blog.site.com/r", "https://site.com")).toBe(true);
    expect(hostMatches("https://outro.com/r", "https://site.com")).toBe(false);
    expect(isPublicHttpUrl("http://localhost:3000/x")).toBe(false);
    expect(isPublicHttpUrl("http://192.168.0.1/")).toBe(false);
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicHttpUrl("https://site.com/receita")).toBe(true);
  });
});

describe("incorporação de vídeos", () => {
  it("gera URLs oficiais de embed", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(toEmbedUrl("https://www.youtube.com/shorts/abcdefghijk")).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");
    expect(toEmbedUrl("https://www.tiktok.com/@chef/video/7234567890123456789")).toBe("https://www.tiktok.com/embed/v2/7234567890123456789");
    expect(toEmbedUrl("https://www.instagram.com/reel/Cabc123/")).toBe("https://www.instagram.com/reel/Cabc123/embed");
  });
  it("ignora URLs desconhecidas ou inválidas", () => {
    expect(toEmbedUrl("https://exemplo.com/video")).toBeNull();
    expect(toEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(toEmbedUrl(null)).toBeNull();
  });
});
