import Link from "next/link";
import type { Prisma, RecipeStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight, Eye, Heart, MessageSquare, Plus, Search, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { cn, STATUS_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { PageHeader } from "../_components/page-header";
import { RecipeActions } from "../_components/recipe-actions";

export const metadata = { title: "Receitas" };

const PAGE_SIZE = 20;
const STATUSES = Object.keys(STATUS_LABEL) as RecipeStatus[];
const STATUS_BADGE: Record<RecipeStatus, "default" | "accent" | "muted" | "danger" | "outline"> = {
  DRAFT: "muted",
  PENDING: "default",
  PUBLISHED: "accent",
  REJECTED: "danger",
  ARCHIVED: "outline",
};
const df = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminRecipesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const status = STATUSES.includes(sp.status as RecipeStatus) ? (sp.status as RecipeStatus) : undefined;
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Prisma.RecipeWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } : {}),
  };
  const [total, recipes, grouped] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        categories: { select: { id: true, name: true, emoji: true, color: true } },
        author: { select: { id: true, name: true } },
        _count: { select: { favorites: true, ratings: true, comments: true } },
      },
    }),
    prisma.recipe.groupBy({ by: ["status"], _count: { _all: true }, where: q ? { OR: where.OR } : {} }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<RecipeStatus, number>>;
  const all = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, status, page: undefined as number | undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return `/admin/receitas${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Receitas"
        description="Crie, revise e publique receitas. Receitas enviadas por usuários chegam como “Em revisão”."
        actions={
          <Button asChild>
            <Link href="/admin/receitas/nova"><Plus /> Nova receita</Link>
          </Button>
        }
      />

      <form action="/admin/receitas" className="mb-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Buscar por título ou slug…" className="pl-10" aria-label="Buscar receitas" />
        </div>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full bg-muted p-1">
          {[{ key: undefined, label: "Todas", n: all }, ...STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], n: counts[s] ?? 0 }))].map((tab) => (
            <Link
              key={tab.label}
              href={href({ status: tab.key, page: 1 })}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                status === tab.key ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label} <span className="tabular-nums opacity-70">{tab.n}</span>
            </Link>
          ))}
        </div>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          emoji="🔎"
          title={q || status ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}
          description={q || status ? "Tente outra busca ou outro filtro." : "Comece criando a primeira receita."}
          action={
            <Button asChild>
              <Link href={q || status ? "/admin/receitas" : "/admin/receitas/nova"}>{q || status ? "Limpar filtros" : "Nova receita"}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {recipes.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <RecipeCover imageUrl={r.imageUrl} emoji={r.emoji} title={r.title} color={r.categories[0]?.color} className="size-14 shrink-0 rounded-xl" emojiClass="text-2xl" sizes="56px" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/admin/receitas/${r.id}`} className="truncate font-semibold hover:text-primary">{r.title}</Link>
                    {r.featured && <Star className="size-4 fill-star text-star" aria-label="Em destaque" />}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    {r.categories.slice(0, 3).map((c) => (
                      <span key={c.id}>{c.emoji} {c.name}</span>
                    ))}
                    <span>· {r.author ? r.author.name : "Equipe"}</span>
                    <span>· {df.format(r.updatedAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="flex gap-3 text-xs tabular-nums text-muted-foreground">
                  <span className="inline-flex items-center gap-1" title="Visualizações"><Eye className="size-3.5" />{r.viewCount}</span>
                  <span className="inline-flex items-center gap-1" title="Favoritos"><Heart className="size-3.5" />{r._count.favorites}</span>
                  <span className="inline-flex items-center gap-1" title="Avaliações"><Star className="size-3.5" />{r._count.ratings}</span>
                  <span className="inline-flex items-center gap-1" title="Comentários"><MessageSquare className="size-3.5" />{r._count.comments}</span>
                </div>
                <RecipeActions recipe={{ id: r.id, slug: r.slug, title: r.title, status: r.status, featured: r.featured }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-between gap-2 text-sm" aria-label="Paginação">
          <Button asChild variant="outline" size="sm" className={cn(page <= 1 && "pointer-events-none opacity-50")}>
            <Link href={href({ page: page - 1 })} aria-disabled={page <= 1}><ChevronLeft /> Anterior</Link>
          </Button>
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} receita(s)
          </span>
          <Button asChild variant="outline" size="sm" className={cn(page >= totalPages && "pointer-events-none opacity-50")}>
            <Link href={href({ page: page + 1 })} aria-disabled={page >= totalPages}>Próxima <ChevronRight /></Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
