import { describe, expect, it } from "vitest";
import { allergenTerms, buildSearchText, containsAllergen, matchIngredients, parseIngredientList } from "@/lib/search";

const recipe = [
  { name: "peito de frango" },
  { name: "batata" },
  { name: "queijo muçarela" },
  { name: "creme de leite" },
  { name: "sal" },
  { name: "salsinha", optional: true },
];

describe("busca por ingredientes", () => {
  it("interpreta 'frango, batata e queijo'", () => {
    expect(parseIngredientList("frango, batata e queijo")).toEqual(["frango", "batata", "queijo"]);
  });

  it("casa termos genéricos com ingredientes específicos e indica o que falta", () => {
    const m = matchIngredients(recipe, ["frango", "batata", "queijo"]);
    expect(m.matched).toEqual(["peito de frango", "batata", "queijo muçarela"]);
    expect(m.missing).toEqual(["creme de leite"]);
    expect(m.staples).toEqual(["sal"]);
    expect(m.coverage).toBe(1);
    expect(m.completeness).toBeCloseTo(0.75);
  });

  it("ignora acentos", () => {
    const m = matchIngredients([{ name: "limão" }, { name: "açúcar" }], ["limao"]);
    expect(m.matched).toEqual(["limão"]);
  });

  it("não confunde termos curtos com partes de palavras", () => {
    const m = matchIngredients([{ name: "ovo" }, { name: "trigo" }], ["ov"]);
    expect(m.matched).toEqual([]);
  });
});

describe("exclusão por alergias", () => {
  it("expande 'lactose' para laticínios", () => {
    const terms = allergenTerms(["lactose"]);
    expect(containsAllergen(["creme de leite"], terms)).toBe(true);
    expect(containsAllergen(["queijo muçarela"], terms)).toBe(true);
    expect(containsAllergen(["batata", "frango"], terms)).toBe(false);
  });
  it("aceita acentos e termos livres", () => {
    expect(containsAllergen(["farinha de trigo"], allergenTerms(["glúten"]))).toBe(true);
    expect(containsAllergen(["coentro"], allergenTerms(["coentro"]))).toBe(true);
  });
  it("frutos do mar não bloqueia peixe branco", () => {
    const t = allergenTerms(["frutos do mar"]);
    expect(containsAllergen(["camarão"], t)).toBe(true);
    expect(containsAllergen(["peixe branco"], t)).toBe(false);
  });
});

describe("texto de busca", () => {
  it("normaliza título, tags e ingredientes", () => {
    expect(buildSearchText("Pão de Queijo", ["Lanche"], ["polvilho azedo"])).toBe("pao de queijo | lanche | polvilho azedo");
  });
});
