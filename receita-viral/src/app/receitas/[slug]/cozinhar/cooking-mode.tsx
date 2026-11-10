"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ListChecks, TimerIcon, X, Sun, Minus, Plus, PartyPopper } from "lucide-react";
import { useTimers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { formatIngredientLine, scaleQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

type Props = {
  recipe: {
    id: string;
    slug: string;
    title: string;
    emoji: string | null;
    servings: number;
    steps: { id: string; text: string; timerMinutes: number | null }[];
    ingredients: { id: string; name: string; quantity: number | null; unit: string; note: string | null }[];
  };
};

export function CookingMode({ recipe }: Props) {
  const [index, setIndex] = React.useState(-1); // -1 = tela de ingredientes
  const [showIngredients, setShowIngredients] = React.useState(false);
  const [servings, setServings] = React.useState(recipe.servings);
  const [fontScale, setFontScale] = React.useState(1);
  const [wakeLock, setWakeLock] = React.useState<"on" | "off" | "unsupported">("off");
  const { start } = useTimers();
  const total = recipe.steps.length;
  const done = index >= total;

  React.useEffect(() => {
    try {
      const saved = Number(sessionStorage.getItem(`rv-servings-${recipe.id}`));
      if (saved) setServings(saved);
    } catch {}
  }, [recipe.id]);

  // Mantém a tela ligada durante o preparo (Screen Wake Lock API)
  React.useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      if (!("wakeLock" in navigator)) return setWakeLock("unsupported");
      try {
        lock = await navigator.wakeLock.request("screen");
        setWakeLock("on");
        lock.addEventListener("release", () => setWakeLock("off"));
      } catch {
        setWakeLock("off");
      }
    };
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  const next = React.useCallback(() => setIndex((i) => Math.min(total, i + 1)), [total]);
  const prev = React.useCallback(() => setIndex((i) => Math.max(-1, i - 1)), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Gestos de deslizar no celular
  const touch = React.useRef<number | null>(null);

  const step = index >= 0 && index < total ? recipe.steps[index] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
        touch.current = null;
      }}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Link href={`/receitas/${recipe.slug}`} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Sair do modo cozinha">
          <X className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{recipe.emoji} {recipe.title}</p>
          <p className="text-xs text-muted-foreground">
            {index < 0 ? "Separe os ingredientes" : done ? "Concluído" : `Etapa ${index + 1} de ${total}`}
            {wakeLock === "on" && <span className="ml-2 inline-flex items-center gap-1 text-accent"><Sun className="size-3" /> tela sempre ligada</span>}
          </p>
        </div>
        <button onClick={() => setFontScale((f) => Math.max(0.8, f - 0.15))} className="inline-flex size-10 items-center justify-center rounded-full text-sm font-bold hover:bg-muted" aria-label="Diminuir texto">A-</button>
        <button onClick={() => setFontScale((f) => Math.min(1.6, f + 0.15))} className="inline-flex size-10 items-center justify-center rounded-full text-lg font-bold hover:bg-muted" aria-label="Aumentar texto">A+</button>
        <Button variant="outline" size="sm" onClick={() => setShowIngredients((s) => !s)}>
          <ListChecks /> <span className="hidden sm:inline">Ingredientes</span>
        </Button>
      </header>

      <div className="h-1.5 bg-muted">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(Math.max(0, Math.min(index + 1, total)) / total) * 100}%` }} />
      </div>

      <main className="relative flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center" style={{ fontSize: `${fontScale}rem` }}>
          {index < 0 && (
            <div className="w-full max-w-2xl space-y-6 text-left animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-[2em] font-bold">Antes de começar</h1>
                <div className="inline-flex items-center gap-1 rounded-full border border-border p-1 text-[0.9rem]">
                  <button className="rounded-full p-2 hover:bg-muted" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Menos porções"><Minus className="size-4" /></button>
                  <span className="px-2 font-bold">{servings} porções</span>
                  <button className="rounded-full p-2 hover:bg-muted" onClick={() => setServings((s) => Math.min(50, s + 1))} aria-label="Mais porções"><Plus className="size-4" /></button>
                </div>
              </div>
              <IngredientChecklist recipe={recipe} servings={servings} large />
            </div>
          )}
          {step && (
            <div key={step.id} className="max-w-3xl space-y-8 animate-fade-up">
              <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-[1.8em] font-extrabold text-primary-foreground shadow-lift">{index + 1}</span>
              <p className="text-[1.75em] font-medium leading-snug sm:text-[2.1em]">{step.text}</p>
              {step.timerMinutes ? (
                <Button size="lg" variant="secondary" onClick={() => start(`${recipe.title} — etapa ${index + 1}`, step.timerMinutes!)}>
                  <TimerIcon /> Iniciar temporizador · {step.timerMinutes} min
                </Button>
              ) : null}
            </div>
          )}
          {done && (
            <div className="max-w-xl space-y-5 animate-fade-up">
              <PartyPopper className="mx-auto size-16 text-primary" />
              <h2 className="font-display text-[2.2em] font-bold">Prontinho! Bom apetite 😋</h2>
              <p className="text-muted-foreground">Que tal avaliar a receita e contar como ficou?</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="lg"><Link href={`/receitas/${recipe.slug}#avaliacoes`}>Avaliar receita</Link></Button>
                <Button variant="outline" size="lg" onClick={() => setIndex(-1)}>Recomeçar</Button>
              </div>
            </div>
          )}
        </section>

        <aside
          className={cn(
            "absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-border bg-card p-5 shadow-lift transition-transform duration-300",
            showIngredients ? "translate-x-0" : "translate-x-full",
          )}
          aria-hidden={!showIngredients}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Ingredientes ({servings} porções)</h2>
            <button onClick={() => setShowIngredients(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Fechar ingredientes"><X className="size-4" /></button>
          </div>
          <IngredientChecklist recipe={recipe} servings={servings} />
        </aside>
      </main>

      <footer className="safe-bottom grid grid-cols-2 gap-3 border-t border-border p-4">
        <Button variant="outline" size="lg" onClick={prev} disabled={index < 0} className="h-14 text-base">
          <ArrowLeft /> Anterior
        </Button>
        <Button size="lg" onClick={next} disabled={done} className="h-14 text-base">
          {index < 0 ? "Começar" : index === total - 1 ? "Finalizar" : "Próxima"} <ArrowRight />
        </Button>
      </footer>
    </div>
  );
}

function IngredientChecklist({ recipe, servings, large }: { recipe: Props["recipe"]; servings: number; large?: boolean }) {
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  return (
    <ul className={cn("space-y-2", large && "text-[1.15em]")}>
      {recipe.ingredients.map((i) => {
        const on = checked.has(i.id);
        return (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => setChecked((p) => { const n = new Set(p); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; })}
              className={cn("flex w-full items-start gap-3 rounded-2xl border border-border p-3 text-left transition", on ? "bg-accent-soft" : "bg-card hover:bg-muted")}
            >
              <span className={cn("mt-1 size-5 shrink-0 rounded-md border-2", on ? "border-accent bg-accent" : "border-input")} />
              <span className={cn(on && "text-muted-foreground line-through")}>
                {formatIngredientLine(scaleQuantity(i.quantity, recipe.servings, servings), i.unit, i.name)}
                {i.note && <span className="text-muted-foreground"> — {i.note}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
