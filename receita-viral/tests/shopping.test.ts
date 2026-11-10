import { describe, expect, it } from "vitest";
import { consolidate } from "@/lib/shopping";

describe("lista de compras consolidada", () => {
  it("soma itens iguais e converte g → kg", () => {
    const out = consolidate([
      { name: "peito de frango", quantity: 600, unit: "g", group: "CARNES", recipeTitle: "A" },
      { name: "Peito de Frango", quantity: 0.5, unit: "kg", group: "CARNES", recipeTitle: "B" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ quantity: 1.1, unit: "kg", recipes: ["A", "B"] });
  });
  it("mantém unidades incompatíveis separadas", () => {
    const out = consolidate([
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI" },
      { name: "cebola", quantity: 100, unit: "g", group: "HORTIFRUTI" },
    ]);
    expect(out).toHaveLength(2);
  });
  it("une itens 'a gosto' sem quantidade", () => {
    const out = consolidate([
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ]);
    expect(out).toEqual([{ name: "sal", quantity: null, unit: null, group: "TEMPEROS", recipes: [] }]);
  });
  it("ordena por grupo e nome", () => {
    const out = consolidate([
      { name: "tomate", quantity: 2, unit: "unidade", group: "HORTIFRUTI" },
      { name: "arroz", quantity: 1, unit: "kg", group: "MERCEARIA" },
      { name: "alface", quantity: 1, unit: "unidade", group: "HORTIFRUTI" },
    ]);
    expect(out.map((i) => i.name)).toEqual(["alface", "tomate", "arroz"]);
  });
});
