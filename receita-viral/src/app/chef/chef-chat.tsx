"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, Bot, CalendarPlus, ChevronDown, Clock, RotateCcw, ShoppingBasket, Sparkles, Users } from "lucide-react";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, errorMessage } from "@/lib/client";
import { cn, DIFFICULTY_LABEL, formatMinutes, MEAL_ORDER, WEEKDAYS } from "@/lib/utils";
import { isoDate, weekStartOf, addDays } from "@/lib/week";
import type { ChefRecipe, ChefResponse } from "@/lib/chef/types";

type Msg = { role: "user"; content: string } | { role: "assistant"; content: string; data?: ChefResponse & { notice?: string } };

const EXAMPLES = [
  "Tenho arroz, ovo e bacon. O que posso fazer?",
  "Quero uma receita japonesa fácil.",
  "Monte um jantar romântico para duas pessoas.",
  "Sugira cinco receitas econômicas.",
  "Adapte o strogonoff de frango para 8 pessoas.",
  "Crie um cardápio semanal.",
];

function RecipeResult({ r, index }: { r: ChefRecipe; index: number }) {
  const [open, setOpen] = React.useState(index === 0);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          {r.note && <p className="text-xs font-semibold uppercase tracking-wide text-primary">{r.note}</p>}
          <p className="font-bold">{r.title}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatMinutes(r.totalMinutes)}</span>
            <span className="inline-flex items-center gap-1"><Users className="size-3" />{r.servings} porções</span>
            <span>{DIFFICULTY_LABEL[r.difficulty]}</span>
          </p>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-border p-4 text-sm md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="mb-2 font-semibold">Ingredientes</p>
            <ul className="space-y-1">
              {r.ingredients.map((i, k) => <li key={k} className="flex gap-2"><span className="text-primary">•</span>{i}</li>)}
            </ul>
            {r.missing.length > 0 && (
              <p className="mt-3 rounded-xl bg-primary-soft p-2.5 text-xs">
                <ShoppingBasket className="mr-1 inline size-3.5 text-primary" /><strong>Para comprar:</strong> {r.missing.join(", ")}
              </p>
            )}
          </div>
          <div>
            <p className="mb-2 font-semibold">Modo de preparo</p>
            <ol className="space-y-2">
              {r.steps.map((s, k) => (
                <li key={k} className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{k + 1}</span>{s}</li>
              ))}
            </ol>
          </div>
          {r.slug && (
            <div className="md:col-span-2">
              <Button asChild size="sm" variant="secondary"><Link href={`/receitas/${r.slug}`}>Abrir receita completa (fotos, timers, modo cozinha)</Link></Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuResult({ menu }: { menu: NonNullable<ChefResponse["menu"]> }) {
  const user = useSession();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const toPlanner = async () => {
    if (!user) return toast("Entre na sua conta para usar o planejador", { action: { label: "Entrar", onClick: () => router.push("/entrar?next=/chef") } });
    setBusy(true);
    const week = isoDate(addDays(weekStartOf(new Date()), 7));
    const mealMap: Record<string, (typeof MEAL_ORDER)[number]> = { "café da manhã": "BREAKFAST", almoço: "LUNCH", lanche: "SNACK", jantar: "DINNER" };
    let added = 0;
    try {
      const ids = new Map<string, string>();
      for (const [dayIndex, d] of menu.entries()) {
        for (const m of d.meals) {
          if (!m.slug) continue;
          if (!ids.has(m.slug)) ids.set(m.slug, (await api<{ recipe: { id: string } }>(`/api/recipes/${m.slug}`)).recipe.id);
          const mealType = mealMap[m.meal.toLowerCase()] ?? "DINNER";
          await api("/api/mealplan/entries", { body: { weekStart: week, dayIndex: Math.min(dayIndex, 6), mealType, recipeId: ids.get(m.slug), servings: 2 } });
          added++;
        }
      }
      toast.success(`${added} refeições adicionadas à próxima semana`, { action: { label: "Abrir planejador", onClick: () => router.push(`/planejador?week=${week}`) } });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((d, i) => (
          <div key={d.day + i} className="rounded-2xl border border-border bg-background p-3 text-sm">
            <p className="mb-1.5 font-bold">{d.day || WEEKDAYS[i]}</p>
            <ul className="space-y-1">
              {d.meals.map((m, k) => (
                <li key={k}>
                  <span className="text-xs text-muted-foreground">{m.meal}: </span>
                  {m.slug ? <Link href={`/receitas/${m.slug}`} className="font-semibold text-primary hover:underline">{m.title}</Link> : <span className="font-semibold">{m.title}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Button size="sm" variant="accent" onClick={toPlanner} disabled={busy}>
        <CalendarPlus /> {busy ? "Adicionando…" : "Levar para o planejador (próxima semana)"}
      </Button>
    </div>
  );
}

export function ChefChat({ aiEnabled, initialQuestion }: { aiEnabled: boolean; initialQuestion?: string }) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const asked = React.useRef(false);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = React.useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      const history: Msg[] = [...messages, { role: "user", content }];
      setMessages(history);
      setInput("");
      setLoading(true);
      try {
        const payload = history.slice(-12).map((m) => ({
          role: m.role,
          content:
            m.role === "assistant" && m.data
              ? `${m.content}${m.data.recipes.length ? `\nReceitas sugeridas: ${m.data.recipes.map((r) => r.title).join("; ")}` : ""}`
              : m.content,
        }));
        const data = await api<ChefResponse & { notice?: string }>("/api/chef", { body: { messages: payload } });
        setMessages((m) => [...m, { role: "assistant", content: data.reply, data }]);
      } catch (e) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${errorMessage(e)}` }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading],
  );

  React.useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      void send(initialQuestion);
    }
  }, [initialQuestion, send]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-4xl flex-col px-4 pb-4 pt-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#ff9a3c] text-2xl shadow-soft">👩‍🍳</span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Chef IA</h1>
          <p className="text-sm text-muted-foreground">Seu assistente de cozinha: ideias, cardápios e adaptações.</p>
        </div>
        <Badge variant={aiEnabled ? "accent" : "muted"} title={aiEnabled ? "Respostas geradas por IA (provedor configurado no servidor)" : "Configure ANTHROPIC_API_KEY no servidor para ativar a IA generativa"}>
          {aiEnabled ? <><Sparkles /> IA ativa</> : <><Bot /> Modo local (catálogo do app)</>}
        </Badge>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}><RotateCcw /> Nova conversa</Button>
        )}
      </header>

      <div className="flex-1 space-y-5 pb-4">
        {messages.length === 0 && (
          <div className="rounded-3xl border border-border bg-gradient-to-br from-cream to-card p-6">
            <p className="mb-1 font-bold">Olá! O que vamos cozinhar? 👋</p>
            <p className="mb-4 text-sm text-muted-foreground">
              {aiEnabled
                ? "Peça qualquer coisa sobre receitas. Quando possível, indico receitas do nosso acervo com passo a passo completo."
                : "Estou no modo local: respondo com base nas receitas do acervo (sem IA generativa). Experimente um destes pedidos:"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => send(e)} className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:text-primary">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-sm text-primary-foreground">{m.content}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base">👩‍🍳</span>
              <div className="min-w-0 flex-1 space-y-3 rounded-3xl rounded-tl-lg bg-card p-4 shadow-soft">
                <p className="whitespace-pre-line text-sm leading-relaxed">{m.content}</p>
                {m.data?.notice && <p className="rounded-xl bg-muted p-2 text-xs text-muted-foreground">{m.data.notice}</p>}
                {m.data?.recipes.map((r, k) => <RecipeResult key={k} r={r} index={k} />)}
                {m.data?.menu && <MenuResult menu={m.data.menu} />}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft">👩‍🍳</span>
            <div className="flex items-center gap-1 rounded-3xl bg-card px-4 py-3 shadow-soft" aria-label="Chef pensando">
              {[0, 1, 2].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 120}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-20 flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-lift lg:bottom-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Ex.: tenho frango, batata e queijo…"
          aria-label="Mensagem para o Chef IA"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Enviar">
          <ArrowUp />
        </Button>
      </form>
    </div>
  );
}
