"use client";
import * as React from "react";
import { Minus, Plus, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api, errorMessage } from "@/lib/client";
import { formatIngredientLine, scaleQuantity, toMetric } from "@/lib/units";

export type PanelIngredient = { id: string; name: string; quantity: number | null; unit: string; note: string | null; optional: boolean };

export function ServingsStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <button type="button" className="flex size-8 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Diminuir porções">
        <Minus className="size-4" />
      </button>
      <span className="min-w-20 text-center text-sm font-bold tabular-nums" aria-live="polite">
        <Users className="mr-1 inline size-4 text-muted-foreground" />
        {value} {value === 1 ? "porção" : "porções"}
      </span>
      <button type="button" className="flex size-8 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40" onClick={() => onChange(Math.min(50, value + 1))} disabled={value >= 50} aria-label="Aumentar porções">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function IngredientsPanel({ recipeId, baseServings, ingredients }: { recipeId: string; baseServings: number; ingredients: PanelIngredient[] }) {
  const [servings, setServings] = React.useState(baseServings);
  const [metric, setMetric] = React.useState(false);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const user = useSession();
  const router = useRouter();

  React.useEffect(() => {
    const onServings = (e: Event) => setServings((e as CustomEvent<number>).detail);
    window.addEventListener("rv:servings", onServings);
    return () => window.removeEventListener("rv:servings", onServings);
  }, []);
  React.useEffect(() => {
    try {
      sessionStorage.setItem(`rv-servings-${recipeId}`, String(servings));
    } catch {}
  }, [servings, recipeId]);

  const addToList = async () => {
    if (!user) {
      toast("Entre na sua conta para usar listas de compras", { action: { label: "Entrar", onClick: () => router.push("/entrar") } });
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ list: { id: string; name: string }; added: number }>("/api/shopping/from-recipe", { body: { recipeId, servings } });
      toast.success(`${res.added} itens adicionados à lista “${res.list.name}”`, {
        action: { label: "Abrir lista", onClick: () => router.push(`/compras/${res.list.id}`) },
      });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Ingredientes</h2>
        <ServingsStepper value={servings} onChange={setServings} />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Medidas:</span>
        <div className="inline-flex rounded-full bg-muted p-0.5">
          {[
            [false, "Caseiras"],
            [true, "Métricas (g/ml)"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setMetric(v as boolean)}
              className={`rounded-full px-3 py-1 font-semibold transition ${metric === v ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {ingredients.map((ing) => {
          const scaled = scaleQuantity(ing.quantity, baseServings, servings);
          const shown = metric ? toMetric(scaled, ing.unit, ing.name) : { quantity: scaled, unit: ing.unit };
          const isChecked = checked.has(ing.id);
          return (
            <li key={ing.id}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() =>
                    setChecked((prev) => {
                      const n = new Set(prev);
                      if (n.has(ing.id)) n.delete(ing.id);
                      else n.add(ing.id);
                      return n;
                    })
                  }
                  className="mt-0.5"
                />
                <span className={`text-sm leading-relaxed transition ${isChecked ? "text-muted-foreground line-through" : ""}`}>
                  {formatIngredientLine(shown.quantity, shown.unit, ing.name)}
                  {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
                  {ing.optional && <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">opcional</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button onClick={addToList} disabled={busy} variant="accent" className="w-full">
        <ShoppingCart /> {busy ? "Adicionando…" : "Adicionar à lista de compras"}
      </Button>
      {metric && <p className="text-xs text-muted-foreground">Conversões aproximadas: 1 xícara = 240 ml; densidades médias por ingrediente.</p>}
    </div>
  );
}
