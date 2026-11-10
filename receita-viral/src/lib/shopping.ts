import { normalize } from "@/lib/utils";
import { convert, unitKind } from "@/lib/units";

export type Group =
  | "HORTIFRUTI" | "CARNES" | "PEIXES" | "LATICINIOS" | "MERCEARIA" | "PADARIA" | "TEMPEROS" | "BEBIDAS" | "CONGELADOS" | "OUTROS";

export interface RawItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  group: Group;
  recipeTitle?: string | null;
}

export interface ConsolidatedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  group: Group;
  recipes: string[];
}

/**
 * Consolida itens iguais somando quantidades (convertendo g↔kg e ml↔l quando possível).
 * Itens "a gosto" viram uma única linha sem quantidade.
 */
export function consolidate(items: RawItem[]): ConsolidatedItem[] {
  const map = new Map<string, ConsolidatedItem>();
  for (const it of items) {
    const unit = it.unit === "a gosto" ? null : it.unit;
    const kind = unit ? unitKind(unit) : null;
    const baseUnit = kind === "mass" ? "g" : kind === "volume" && (unit === "ml" || unit === "l") ? "ml" : unit;
    const key = `${normalize(it.name)}|${baseUnit ?? ""}`;
    let qty = it.quantity;
    if (qty != null && unit && baseUnit && unit !== baseUnit) qty = convert(qty, unit, baseUnit) ?? qty;
    const existing = map.get(key);
    if (existing) {
      if (qty != null) existing.quantity = (existing.quantity ?? 0) + qty;
      if (it.recipeTitle && !existing.recipes.includes(it.recipeTitle)) existing.recipes.push(it.recipeTitle);
    } else {
      map.set(key, {
        name: it.name,
        quantity: unit ? qty : null,
        unit: baseUnit ?? null,
        group: it.group,
        recipes: it.recipeTitle ? [it.recipeTitle] : [],
      });
    }
  }
  // Promove para kg/l quando passa de 1000
  for (const item of map.values()) {
    if (item.quantity != null && item.quantity >= 1000) {
      if (item.unit === "g") {
        item.quantity = item.quantity / 1000;
        item.unit = "kg";
      } else if (item.unit === "ml") {
        item.quantity = item.quantity / 1000;
        item.unit = "l";
      }
    }
  }
  return [...map.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name, "pt-BR"));
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, it) => {
      const k = key(it);
      (acc[k] ||= []).push(it);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
