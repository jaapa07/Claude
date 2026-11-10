"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/ui/states";

type ListSummary = { id: string; name: string; updatedAt: string; itemCount: number; checkedCount: number };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function ListsManager({ lists }: { lists: ListSummary[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Dê um nome com pelo menos 2 caracteres");
    setCreating(true);
    try {
      const res = await api<{ list: { id: string } }>("/api/shopping", { body: { name } });
      toast.success("Lista criada");
      router.push(`/compras/${res.list.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setCreating(false);
    }
  };

  const remove = async (l: ListSummary) => {
    if (!confirm(`Excluir a lista “${l.name}”?`)) return;
    setDeleting(l.id);
    try {
      await api(`/api/shopping/${l.id}`, { method: "DELETE" });
      toast.success("Lista excluída");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Listas de compras</h1>
          <p className="text-sm text-muted-foreground">Gere listas pelo planejador, pelas receitas ou crie a sua.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/planejador"><CalendarDays /> Gerar pelo planejador</Link>
        </Button>
      </div>

      <form onSubmit={create} className="mb-8 flex max-w-xl gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova lista (ex.: Feira de sábado)" maxLength={60} aria-label="Nome da nova lista" />
        <Button type="submit" disabled={creating}>{creating ? <Spinner /> : <Plus />} Criar</Button>
      </form>

      {lists.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => {
            const pct = l.itemCount ? Math.round((l.checkedCount / l.itemCount) * 100) : 0;
            const done = l.itemCount > 0 && l.checkedCount === l.itemCount;
            return (
              <li key={l.id} className="group relative rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40">
                <Link href={`/compras/${l.id}`} className="block pr-10">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <ShoppingCart className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="line-clamp-1 font-bold group-hover:text-primary">{l.name}</h2>
                      <p className="text-xs text-muted-foreground">Atualizada em {fmt.format(new Date(l.updatedAt))}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>{l.itemCount ? `${l.checkedCount} de ${l.itemCount} itens` : "Lista vazia"}</span>
                    {done && <span className="font-semibold text-accent">Concluída ✓</span>}
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-danger"
                  onClick={() => remove(l)}
                  disabled={deleting === l.id}
                  aria-label={`Excluir ${l.name}`}
                >
                  {deleting === l.id ? <Spinner /> : <Trash2 />}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          emoji="🛒"
          title="Nenhuma lista ainda"
          description="Planeje as refeições da semana e gere uma lista consolidada automaticamente, ou crie uma lista acima."
          action={<Button asChild><Link href="/planejador"><CalendarDays /> Ir para o planejador</Link></Button>}
        />
      )}
    </>
  );
}
