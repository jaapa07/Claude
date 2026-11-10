import { describe, expect, it } from "vitest";
import { convert, formatIngredientLine, formatQuantity, scaleQuantity, toMetric, celsiusToFahrenheit } from "@/lib/units";

describe("escalonamento de porções", () => {
  it("escala proporcionalmente", () => {
    expect(scaleQuantity(200, 4, 2)).toBe(100);
    expect(scaleQuantity(3, 4, 8)).toBe(6);
  });
  it("mantém null para 'a gosto'", () => {
    expect(scaleQuantity(null, 4, 8)).toBeNull();
  });
});

describe("formatação", () => {
  it("usa frações para medidas caseiras", () => {
    expect(formatQuantity(0.5, "xícara")).toBe("½");
    expect(formatQuantity(1.5, "colher de sopa")).toBe("1 ½");
    expect(formatQuantity(2 / 3, "xícara")).toBe("⅔");
  });
  it("arredonda medidas métricas", () => {
    expect(formatQuantity(333.33, "g")).toBe("335");
    expect(formatQuantity(12.4, "g")).toBe("12");
    expect(formatQuantity(1.25, "kg")).toBe("1,3");
  });
  it("monta a linha do ingrediente com plural", () => {
    expect(formatIngredientLine(2, "xícara", "farinha de trigo")).toBe("2 xícaras de farinha de trigo");
    expect(formatIngredientLine(500, "g", "peito de frango")).toBe("500 g de peito de frango");
    expect(formatIngredientLine(3, "unidade", "ovo")).toBe("3 ovo");
    expect(formatIngredientLine(null, "a gosto", "sal")).toBe("sal a gosto");
  });
});

describe("conversão de medidas", () => {
  it("converte volume ↔ volume e massa ↔ massa", () => {
    expect(convert(1, "xícara", "ml")).toBe(240);
    expect(convert(1, "l", "xícara")).toBeCloseTo(4.1667, 3);
    expect(convert(1, "kg", "g")).toBe(1000);
  });
  it("converte volume ↔ massa com densidade do ingrediente", () => {
    expect(convert(1, "xícara", "g", "farinha de trigo")).toBeCloseTo(120);
    expect(convert(180, "g", "xícara", "açúcar")).toBeCloseTo(1);
  });
  it("retorna null quando não há densidade", () => {
    expect(convert(1, "xícara", "g", "ingrediente desconhecido")).toBeNull();
    expect(convert(1, "unidade", "g")).toBeNull();
  });
  it("modo métrico converte xícara de farinha em gramas e leite em ml", () => {
    expect(toMetric(2, "xícara", "farinha de trigo")).toEqual({ quantity: 240, unit: "g" });
    expect(toMetric(1, "xícara", "leite")).toEqual({ quantity: 240, unit: "ml" });
  });
  it("converte temperatura", () => {
    expect(celsiusToFahrenheit(180)).toBe(356);
  });
});
