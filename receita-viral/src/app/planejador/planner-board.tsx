"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Copy, Heart, Minus, Plus, Search, ShoppingCart, Users, X } from "lucide-react";
import type { RecipeCardData } from "@/lib/recipes";
import { api, errorMessage } from "@/lib/client";
import { addDays, formatDayMonth, isoDate } from "@/lib/week";
import { cn, formatMinutes, MEAL_LABEL, MEAL_ORDER, WEEKDAYS } from "@/lib/utils";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton, Spinner } from "@/components/ui/states";

type MealType = (typeof MEAL_ORDER)[number];

export type PlannerEntry = {
  id: string;
  dayIndex: number;
  mealType: MealType;
  servings: number;
  recipe: {
    id: string;
    slug: string;
    title: string;
    emoji: string | null;
    imageUrl: string | null;
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
  };
};

const MEAL_EMOJI: Record<MealType, string> = { BREAKFAST: "☕", LUNCH: "🍛", SNACK: "🥪", DINNER: "🌙" };
const MEAL_RANK: Record<MealType, number> = { BREAKFAST: 0, LUNCH: 1, SNACK: 2, DINNER: 3 };

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function sortEntries(xs: PlannerEntry[]) {
  return [...xs].sort((a, b) => a.dayIndex - b.dayIndex || MEAL_RANK[a.mealType] - MEAL_RANK[b.mealType]);
}

export function PlannerBoard({ weekStart, thisWeek, today, entries: initial }: { weekStart: string; thisWeek: string; today: string; entries: PlannerEntry[] }) {
  const router = useRouter();
  const [entries, setEntries] = React.useState(initial);
  React.useEffect(() => setEntries(initial), [initial]);

  const [picker, setPicker] = React.useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [busy, setBusy] = React.useState<"copy" | "list" | null>(null);

  const start = parseIso(weekStart);
  const prevWeek = isoDate(addDays(start, -7));
  const nextWeek = isoDate(addDays(start, 7));
  const isThisWeek = weekStart === thisWeek;
  const days = WEEKDAYS.map((label, i) => {
    const date = addDays(start, i);
    return { index: i, label, date, iso: isoDate(date) };
  });

  const totalServings = entries.reduce((s, e) => s + e.servings, 0);

  const changeServings = async (entry: PlannerEntry, delta: number) => {
    const servings = Math.min(50, Math.max(1, entry.servings + delta));
    if (servings === entry.servings) return;
    setEntries((xs) => xs.map((x) => (x.id === entry.id ? { ...x, servings } : x)));
    try {
      await api(`/api/mealplan/entries/${entry.id}`, { method: "PATCH", body: { servings } });
    } catch (err) {
      setEntries((xs) => xs.map((x) => (x.id === entry.id ? { ...x, servings: entry.servings } : x)));
      toast.error(errorMessage(err));
    }
  };

  const remove = async (entry: PlannerEntry) => {
    setEntries((xs) => xs.filter((x) => x.id !== entry.id));
    try {
      await api(`/api/mealplan/entries/${entry.id}`, { method: "DELETE" });
      toast.success(`${entry.recipe.title} removida do planejamento`);
    } catch (err) {
      setEntries((xs) => sortEntries([...xs, entry]));
      toast.error(errorMessage(err));
    }
  };

  const added = (entry: PlannerEntry) => {
    setEntries((xs) => sortEntries([...xs, entry]));
    router.refresh();
  };

  const copyNext = async () => {
    setBusy("copy");
    try {
      const res = await api<{ copied: number; skipped: number }>("/api/mealplan/copy", { body: { from: weekStart, to: nextWeek } });
      toast.success(
        res.copied ? `${res.copied} refeiç${res.copied === 1 ? "ão copiada" : "ões copiadas"} para a próxima semana` : "A próxima semana já tinha essas refeições",
        { action: { label: "Ver semana", onClick: () => router.push(`/planejador?week=${nextWeek}`) } },
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const generateList = async () => {
    setBusy("list");
    try {
      const res = await api<{ list: { id: string; name: string }; count: number }>("/api/mealplan/shopping-list", { body: { week: weekStart } });
      toast.success(`Lista “${res.list.name}” criada com ${res.count} itens`);
      router.push(`/compras/${res.list.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Planejador semanal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana de {formatDayMonth(start)} a {formatDayMonth(addDays(start, 6))}
            {entries.length > 0 && ` · ${entries.length} refeiç${entries.length === 1 ? "ão" : "ões"} · ${totalServings} porções`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-card p-1 shadow-soft">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Semana anterior">
              <Link href={`/planejador?week=${prevWeek}`}><ChevronLeft /></Link>
            </Button>
            <Button asChild variant={isThisWeek ? "secondary" : "ghost"} size="sm">
              <Link href="/planejador"><CalendarDays /> Esta semana</Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm" aria-label="Próxima semana">
              <Link href={`/planejador?week=${nextWeek}`}><ChevronRight /></Link>
            </Button>
          </div>
          <Button variant="outline" onClick={copyNext} disabled={!entries.length || busy !== null}>
            {busy === "copy" ? <Spinner /> : <Copy />} Copiar para a próxima semana
          </Button>
          <Button onClick={generateList} disabled={!entries.length || busy !== null}>
            {busy === "list" ? <Spinner /> : <ShoppingCart />} Gerar lista de compras
          </Button>
        </div>
      </header>

      {!entries.length && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/60 p-4 text-sm">
          <span className="text-2xl" aria-hidden>🗓️</span>
          <div>
            <p className="font-semibold">Sua semana ainda está vazia</p>
            <p className="text-muted-foreground">
              Toque em <strong>+ Adicionar</strong> em qualquer refeição para escolher uma receita. Depois, gere a lista de compras da semana com um clique.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7 xl:gap-3">
        {days.map((day) => {
          const dayEntries = entries.filter((e) => e.dayIndex === day.index);
          const minutes = dayEntries.reduce((s, e) => s + e.recipe.prepMinutes + e.recipe.cookMinutes, 0);
          const isToday = day.iso === today;
          return (
            <section
              key={day.index}
              aria-label={`${day.label}, ${formatDayMonth(day.date)}`}
              className={cn("flex flex-col rounded-2xl border bg-card p-3 shadow-soft", isToday ? "border-primary ring-2 ring-primary/20" : "border-border")}
            >
              <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border pb-2">
                <div>
                  <h2 className="font-bold leading-tight">
                    {day.label}
                    {isToday && <span className="ml-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Hoje</span>}
                  </h2>
                  <p className="text-xs text-muted-foreground">{formatDayMonth(day.date)}</p>
                </div>
                {minutes > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground" title="Tempo total de preparo do dia">
                    <Clock className="size-3.5" /> {formatMinutes(minutes)}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {MEAL_ORDER.map((meal) => {
                  const slot = dayEntries.filter((e) => e.mealType === meal);
                  return (
                    <div key={meal}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span aria-hidden>{MEAL_EMOJI[meal]}</span> {MEAL_LABEL[meal]}
                      </p>
                      <div className="space-y-1.5">
                        {slot.map((e) => (
                          <EntryChip key={e.id} entry={e} onServings={(d) => changeServings(e, d)} onRemove={() => remove(e)} />
                        ))}
                        <button
                          type="button"
                          onClick={() => setPicker({ dayIndex: day.index, mealType: meal })}
                          className={cn(
                            "flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground transition hover:border-primary hover:bg-primary-soft hover:text-primary",
                            slot.length ? "py-1" : "py-2.5",
                          )}
                          aria-label={`Adicionar receita: ${MEAL_LABEL[meal]} de ${day.label}`}
                        >
                          <Plus className="size-3.5" /> Adicionar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <RecipePicker weekStart={weekStart} slot={picker} onClose={() => setPicker(null)} onAdded={added} />
    </>
  );
}

function EntryChip({ entry, onServings, onRemove }: { entry: PlannerEntry; onServings: (delta: number) => void; onRemove: () => void }) {
  const r = entry.recipe;
  return (
    <div className="group relative rounded-xl border border-border bg-background p-2">
      <div className="flex gap-2">
        <RecipeCover imageUrl={r.imageUrl} emoji={r.emoji} title={r.title} className="size-10 shrink-0 rounded-lg" emojiClass="text-xl" sizes="40px" />
        <div className="min-w-0 flex-1 pr-5">
          <Link href={`/receitas/${r.slug}`} className="line-clamp-2 text-xs font-semibold leading-snug hover:text-primary">
            {r.title}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" /> {formatMinutes(r.prepMinutes + r.cookMinutes)}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="size-3" /> porções
        </span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onServings(-1)} disabled={entry.servings <= 1} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40" aria-label="Diminuir porções">
            <Minus className="size-3" />
          </button>
          <span className="w-5 text-center text-xs font-bold tabular-nums" aria-live="polite">{entry.servings}</span>
          <button type="button" onClick={() => onServings(1)} disabled={entry.servings >= 50} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40" aria-label="Aumentar porções">
            <Plus className="size-3" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-danger hover:text-white"
        aria-label={`Remover ${r.title}`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function Stepper({ value, onChange, min = 1, max = 50 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos porções">
        <Minus />
      </Button>
      <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">{value}</span>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Mais porções">
        <Plus />
      </Button>
    </div>
  );
}

function RecipePicker({
  weekStart,
  slot,
  onClose,
  onAdded,
}: {
  weekStart: string;
  slot: { dayIndex: number; mealType: MealType } | null;
  onClose: () => void;
  onAdded: (e: PlannerEntry) => void;
}) {
  const open = slot !== null;
  const [dayIndex, setDayIndex] = React.useState(0);
  const [mealType, setMealType] = React.useState<MealType>("LUNCH");
  const [q, setQ] = React.useState("");
  const [source, setSource] = React.useState<"search" | "favorites">("search");
  const [results, setResults] = React.useState<RecipeCardData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<RecipeCardData | null>(null);
  const [servings, setServings] = React.useState(2);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (slot) {
      setDayIndex(slot.dayIndex);
      setMealType(slot.mealType);
      setSelected(null);
      setQ("");
      setSource("search");
    }
  }, [slot]);

  React.useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (source === "favorites") {
          const res = await api<{ items: RecipeCardData[] }>("/api/me/favorites", { signal: ctrl.signal });
          const term = q.trim().toLowerCase();
          setResults(term ? res.items.filter((r) => r.title.toLowerCase().includes(term)) : res.items);
        } else {
          const params = new URLSearchParams({ pageSize: "18" });
          if (q.trim()) params.set("q", q.trim());
          else params.set("sort", "popular");
          const res = await api<{ items: RecipeCardData[] }>(`/api/recipes?${params}`, { signal: ctrl.signal });
          setResults(res.items);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") toast.error(errorMessage(err));
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, q ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, source, open]);

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api<{ entry: PlannerEntry }>("/api/mealplan/entries", {
        body: { weekStart, dayIndex, mealType, recipeId: selected.id, servings },
      });
      toast.success(`${selected.title} adicionada a ${MEAL_LABEL[mealType].toLowerCase()} de ${WEEKDAYS[dayIndex].toLowerCase()}`);
      onAdded(res.entry);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>Adicionar receita</DialogTitle>
        <DialogDescription>Escolha o que vai para o cardápio.</DialogDescription>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pk-day">Dia</Label>
            <NativeSelect id="pk-day" value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="pk-meal">Refeição</Label>
            <NativeSelect id="pk-meal" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              {MEAL_ORDER.map((m) => (
                <option key={m} value={m}>{MEAL_LABEL[m]}</option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receita ou ingrediente…" className="pl-9" aria-label="Buscar receita" />
          </div>
          <Button
            type="button"
            variant={source === "favorites" ? "secondary" : "outline"}
            onClick={() => setSource((s) => (s === "favorites" ? "search" : "favorites"))}
            aria-pressed={source === "favorites"}
          >
            <Heart /> <span className="hidden sm:inline">Favoritas</span>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {source === "favorites" ? "Mostrando suas favoritas" : q.trim() ? "Resultados da busca" : "Populares no Receita Viral"}
        </p>

        <div className="mt-2 max-h-[40dvh] min-h-40 overflow-y-auto rounded-2xl border border-border p-1.5">
          {loading && !results.length ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : results.length ? (
            <ul className={cn("space-y-1", loading && "opacity-60")} role="listbox" aria-label="Receitas">
              {results.map((r) => {
                const active = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelected(r)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
                        active ? "bg-primary-soft ring-2 ring-primary" : "hover:bg-muted",
                      )}
                    >
                      <RecipeCover imageUrl={r.imageUrl} emoji={r.emoji} title={r.title} color={r.color} className="size-12 shrink-0 rounded-lg" emojiClass="text-2xl" sizes="48px" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-semibold">{r.title}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3" /> {formatMinutes(r.totalMinutes)}
                          {r.caloriesPerServing != null && <span>· {r.caloriesPerServing} kcal</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex h-36 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <span className="text-3xl" aria-hidden>🔎</span>
              {source === "favorites" ? "Nenhuma favorita encontrada." : "Nenhuma receita encontrada. Tente outro termo."}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Porções</span>
            <Stepper value={servings} onChange={setServings} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={submit} disabled={!selected || saving}>
              {saving ? <Spinner /> : <Plus />} {selected ? "Adicionar" : "Selecione uma receita"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
