"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Plus, Ban, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { IngredientInput } from "./ingredient-input";

type Cat = { slug: string; name: string; emoji: string | null; type: "CUISINE" | "DISH_TYPE" };

const TIMES = [
  ["", "Qualquer tempo"],
  ["15", "Até 15 min"],
  ["30", "Até 30 min"],
  ["60", "Até 1 hora"],
  ["120", "Até 2 horas"],
];
const CALORIES = [
  ["", "Qualquer"],
  ["300", "Até 300 kcal"],
  ["450", "Até 450 kcal"],
  ["600", "Até 600 kcal"],
];
const SORTS = [
  ["", "Mais relevantes"],
  ["popular", "Mais populares"],
  ["rating", "Mais bem avaliadas"],
  ["quick", "Mais rápidas"],
  ["calories", "Menos calóricas"],
  ["recent", "Mais recentes"],
];
export const ALLERGY_CHIPS = ["lactose", "glúten", "ovo", "amendoim", "frutos do mar", "peixe", "soja", "nozes", "carne"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
      )}
    >
      {children}
    </button>
  );
}

export function SearchFilters({
  categories,
  fixedCategory,
  showIngredients = true,
  defaultIngredientsOpen,
}: {
  categories: Cat[];
  fixedCategory?: string;
  showIngredients?: boolean;
  defaultIngredientsOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const getList = (k: string) => sp.getAll(k).flatMap((v) => v.split(",")).filter(Boolean);
  const have = getList("have");
  const exclude = getList("exclude");
  const difficulty = getList("difficulty");
  const cats = getList("category").filter((c) => c !== fixedCategory);

  const update = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mutate(p);
    p.delete("page");
    startTransition(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  const setParam = (k: string, v: string) => update((p) => (v ? p.set(k, v) : p.delete(k)));
  const toggleList = (k: string, v: string, current: string[]) =>
    update((p) => {
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      p.delete(k);
      if (next.length) p.set(k, next.join(","));
    });

  const activeCount = [sp.get("maxTime"), sp.get("maxCalories"), sp.get("cost"), difficulty.length, cats.length, exclude.length].filter(Boolean).length;

  const panel = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          Tempo de preparo
          <NativeSelect className="mt-1.5" value={sp.get("maxTime") ?? ""} onChange={(e) => setParam("maxTime", e.target.value)}>
            {TIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </label>
        <label className="text-sm font-semibold">
          Calorias por porção
          <NativeSelect className="mt-1.5" value={sp.get("maxCalories") ?? ""} onChange={(e) => setParam("maxCalories", e.target.value)}>
            {CALORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </label>
        <label className="text-sm font-semibold">
          Custo
          <NativeSelect className="mt-1.5" value={sp.get("cost") ?? ""} onChange={(e) => setParam("cost", e.target.value)}>
            <option value="">Qualquer</option>
            <option value="LOW">Econômica</option>
            <option value="MEDIUM">Custo médio</option>
            <option value="HIGH">Especial</option>
          </NativeSelect>
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Dificuldade</p>
        <div className="flex flex-wrap gap-2">
          {[["EASY", "Fácil"], ["MEDIUM", "Média"], ["HARD", "Difícil"]].map(([v, l]) => (
            <Chip key={v} active={difficulty.includes(v)} onClick={() => toggleList("difficulty", v, difficulty)}>{l}</Chip>
          ))}
        </div>
      </div>
      {(["CUISINE", "DISH_TYPE"] as const).map((type) => (
        <div key={type}>
          <p className="mb-2 text-sm font-semibold">{type === "CUISINE" ? "Culinária" : "Categoria"}</p>
          <div className="flex flex-wrap gap-2">
            {categories.filter((c) => c.type === type && c.slug !== fixedCategory).map((c) => (
              <Chip key={c.slug} active={cats.includes(c.slug)} onClick={() => toggleList("category", c.slug, cats)}>
                {c.emoji} {c.name}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Ban className="size-4 text-danger" /> Excluir (alergias e preferências)</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_CHIPS.map((a) => (
            <Chip key={a} active={exclude.includes(a)} onClick={() => toggleList("exclude", a, exclude)}>Sem {a}</Chip>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {showIngredients && (
        <IngredientInput
          defaultOpen={defaultIngredientsOpen || have.length > 0}
          value={have}
          onChange={(list) => update((p) => (list.length ? p.set("have", list.join(",")) : p.delete("have")))}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <SlidersHorizontal /> Filtros {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{activeCount}</span>}
        </Button>
        <NativeSelect aria-label="Ordenar" className="h-10 w-auto rounded-full" value={sp.get("sort") ?? ""} onChange={(e) => setParam("sort", e.target.value)}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {[["15", "⚡ Até 15 min"], ["30", "⏱️ Até 30 min"]].map(([v, l]) => (
            <Chip key={v} active={sp.get("maxTime") === v} onClick={() => setParam("maxTime", sp.get("maxTime") === v ? "" : v)}>{l}</Chip>
          ))}
          <Chip active={difficulty.length === 1 && difficulty[0] === "EASY"} onClick={() => setParam("difficulty", difficulty.length === 1 && difficulty[0] === "EASY" ? "" : "EASY")}>
            <ChefHat className="mr-1 inline size-3.5" />Fáceis
          </Chip>
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update((p) => ["maxTime", "maxCalories", "cost", "difficulty", "category", "exclude"].forEach((k) => p.delete(k)))}
          >
            <X /> Limpar filtros
          </Button>
        )}
      </div>
      {(cats.length > 0 || exclude.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {cats.map((c) => (
            <button key={c} onClick={() => toggleList("category", c, cats)} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
              {categories.find((x) => x.slug === c)?.name ?? c} <X className="size-3" />
            </button>
          ))}
          {exclude.map((c) => (
            <button key={c} onClick={() => toggleList("exclude", c, exclude)} className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 font-semibold text-danger">
              sem {c} <X className="size-3" />
            </button>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Filtros</DialogTitle>
          <div className="mt-5">{panel}</div>
          <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
            <Plus className="rotate-45" /> Ver resultados
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
