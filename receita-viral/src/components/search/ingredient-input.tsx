"use client";
import * as React from "react";
import { X, Refrigerator } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR = ["frango", "ovo", "arroz", "batata", "queijo", "tomate", "cebola", "carne moída", "bacon", "banana", "leite", "macarrão"];

/** Seleção de "ingredientes que tenho em casa" com autocompletar. */
export function IngredientInput({ value, onChange, defaultOpen }: { value: string[]; onChange: (v: string[]) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const [text, setText] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<{ name: string; recipes: number }[]>([]);
  const [highlight, setHighlight] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/ingredients?q=${encodeURIComponent(text.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setSuggestions((d.items ?? []).filter((i: { name: string }) => !value.includes(i.name)).slice(0, 8)))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, open, value]);

  const add = (name: string) => {
    const n = name.trim().toLowerCase();
    if (n.length < 2 || value.includes(n)) return;
    onChange([...value, n]);
    setText("");
    setHighlight(0);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-accent/50 bg-accent-soft/60 p-4 text-left transition hover:bg-accent-soft">
        <Refrigerator className="size-6 text-accent" />
        <span>
          <span className="block font-bold">O que você tem em casa?</span>
          <span className="text-sm text-muted-foreground">Escolha ingredientes e veja receitas compatíveis — mostramos o que falta comprar.</span>
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-accent/30 bg-accent-soft/50 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold"><Refrigerator className="size-5 text-accent" /> Ingredientes que tenho</p>
        {value.length > 0 && (
          <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => onChange([])}>Limpar</button>
        )}
      </div>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-input bg-card p-2 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remover ${v}`}><X className="size-3.5" /></button>
            </span>
          ))}
          <input
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              if (/[,;]$/.test(v)) add(v.slice(0, -1));
              else setText(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(suggestions[highlight]?.name && text ? suggestions[highlight].name : text);
              } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
              else if (e.key === "ArrowDown") setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
              else if (e.key === "ArrowUp") setHighlight((h) => Math.max(0, h - 1));
            }}
            placeholder={value.length ? "Adicionar mais…" : "Ex.: frango, batata, queijo"}
            aria-label="Adicionar ingrediente"
            className="min-w-40 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
          />
        </div>
        {text && suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-lift" role="listbox">
            {suggestions.map((s, i) => (
              <li key={s.name}>
                <button type="button" onMouseDown={(e) => (e.preventDefault(), add(s.name))} className={cn("flex w-full justify-between px-4 py-2 text-left text-sm", i === highlight ? "bg-muted" : "")}>
                  {s.name} <span className="text-xs text-muted-foreground">{s.recipes} receitas</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {POPULAR.filter((p) => !value.includes(p)).map((p) => (
          <button key={p} type="button" onClick={() => add(p)} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:border-accent">
            + {p}
          </button>
        ))}
      </div>
    </div>
  );
}
