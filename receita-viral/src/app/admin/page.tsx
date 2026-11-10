import Link from "next/link";
import { AlertCircle, BookOpen, Eye, Heart, MessageSquare, Plus, Search, Star, Users } from "lucide-react";
import { getAdminStats } from "./_lib/stats";
import { PageHeader } from "./_components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { STATUS_LABEL } from "@/lib/utils";

export const metadata = { title: "Visão geral" };

const nf = new Intl.NumberFormat("pt-BR");
const df = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums sm:text-3xl">{nf.format(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function TopTable({ title, rows, metric }: { title: string; rows: { id: string; title: string; emoji: string | null; status: keyof typeof STATUS_LABEL; viewCount: number; favoriteCount: number }[]; metric: "views" | "favorites" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <ol className="divide-y divide-border">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-5 text-right font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                <span aria-hidden>{r.emoji ?? "🍽️"}</span>
                <Link href={`/admin/receitas/${r.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                  {r.title}
                </Link>
                {r.status !== "PUBLISHED" && <Badge variant="muted">{STATUS_LABEL[r.status]}</Badge>}
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                  {metric === "views" ? <Eye className="size-3.5 text-muted-foreground" /> : <Heart className="size-3.5 text-primary" />}
                  {nf.format(metric === "views" ? r.viewCount : r.favoriteCount)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboard() {
  const s = await getAdminStats();
  const t = s.totals;
  const maxCat = Math.max(1, ...s.recipesPerCategory.map((c) => c.count));
  const maxTerm = Math.max(1, ...s.topSearchTerms.map((c) => c.count));

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Acompanhe o conteúdo, a moderação e o engajamento do Receita Viral."
        actions={
          <Button asChild>
            <Link href="/admin/receitas/nova"><Plus /> Nova receita</Link>
          </Button>
        }
      />

      {(t.recipesByStatus.PENDING > 0 || t.pendingComments > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {t.recipesByStatus.PENDING > 0 && (
            <Link href="/admin/receitas?status=PENDING" className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-4 transition hover:brightness-95">
              <AlertCircle className="size-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-bold">{t.recipesByStatus.PENDING} receita(s) aguardando revisão</p>
                <p className="text-muted-foreground">Aprove ou rejeite as receitas enviadas pelos usuários.</p>
              </div>
            </Link>
          )}
          {t.pendingComments > 0 && (
            <Link href="/admin/comentarios" className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-4 transition hover:brightness-95">
              <MessageSquare className="size-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-bold">{t.pendingComments} comentário(s) pendente(s)</p>
                <p className="text-muted-foreground">Modere os comentários antes que fiquem visíveis.</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={BookOpen} label="Publicadas" value={t.recipesByStatus.PUBLISHED} hint={`${nf.format(t.recipes)} no total`} />
        <StatCard icon={AlertCircle} label="Em revisão" value={t.recipesByStatus.PENDING} hint={`${t.recipesByStatus.DRAFT} rascunho(s)`} />
        <StatCard icon={Users} label="Usuários" value={t.users} hint={`${t.admins} admin(s) · ${t.blockedUsers} bloqueado(s)`} />
        <StatCard icon={Eye} label="Visualizações" value={t.views} />
        <StatCard icon={Heart} label="Favoritos" value={t.favorites} />
        <StatCard icon={Star} label="Avaliações" value={t.ratings} hint={`${t.pendingComments} comentário(s) pendente(s)`} />
      </div>

      <Card className="mt-4 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receitas por status</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((st) => (
            <Link key={st} href={`/admin/receitas?status=${st}`} className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted">
              {STATUS_LABEL[st]} <span className="font-bold tabular-nums">{t.recipesByStatus[st]}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TopTable title="Mais vistas" rows={s.topByViews} metric="views" />
        <TopTable title="Mais favoritadas" rows={s.topByFavorites} metric="favorites" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {s.recipesPerCategory.length === 0 ? (
              <EmptyState emoji="🏷️" title="Nenhuma categoria" className="py-8" />
            ) : (
              <ul className="space-y-2" aria-label="Gráfico de barras: receitas por categoria">
                {s.recipesPerCategory.map((c) => (
                  <li key={c.id} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="truncate">{c.emoji} {c.name}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full" style={{ width: `${(c.count / maxCat) * 100}%`, background: c.color ?? "var(--primary)" }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Search className="size-4" /> Termos mais buscados</CardTitle>
            </CardHeader>
            <CardContent>
              {s.topSearchTerms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma busca registrada ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {s.topSearchTerms.map((q) => (
                    <li key={q.term} className="relative overflow-hidden rounded-lg px-2.5 py-1 text-sm">
                      <span className="absolute inset-y-0 left-0 bg-accent-soft" style={{ width: `${(q.count / maxTerm) * 100}%` }} aria-hidden />
                      <span className="relative flex justify-between gap-2">
                        <span className="truncate">{q.term}</span>
                        <span className="font-semibold tabular-nums">{nf.format(q.count)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastros recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {s.recentSignups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {s.recentSignups.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      {u.role === "ADMIN" && <Badge variant="accent">Admin</Badge>}
                      <span className="text-xs text-muted-foreground">{df.format(u.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="link" size="sm" className="mt-2 px-0">
                <Link href="/admin/usuarios">Ver todos os usuários</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
