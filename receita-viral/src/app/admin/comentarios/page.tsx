import Link from "next/link";
import type { CommentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "../_components/page-header";
import { LinkTabs } from "../_components/link-tabs";
import { CommentActions } from "../_components/comment-actions";

export const metadata = { title: "Comentários" };

const TABS: { key: CommentStatus; label: string }[] = [
  { key: "PENDING", label: "Pendentes" },
  { key: "VISIBLE", label: "Visíveis" },
  { key: "HIDDEN", label: "Ocultos" },
];
const dtf = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? (sp.status as CommentStatus) : "PENDING";
  const [comments, grouped] = await Promise.all([
    prisma.comment.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } }, recipe: { select: { id: true, title: true, slug: true } } },
    }),
    prisma.comment.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<CommentStatus, number>>;

  return (
    <div>
      <PageHeader title="Comentários" description="Aprove, oculte ou exclua comentários. Comentários ocultos não aparecem para o público." />
      <LinkTabs active={status} tabs={TABS.map((t) => ({ ...t, href: `/admin/comentarios?status=${t.key}`, count: counts[t.key] ?? 0 }))} />
      {comments.length === 0 ? (
        <EmptyState emoji={status === "PENDING" ? "✅" : "💬"} title={status === "PENDING" ? "Nada para moderar" : "Nenhum comentário aqui"} description={status === "PENDING" ? "Todos os comentários já foram revisados." : undefined} />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{c.user.name}</span>
                <span>{c.user.email}</span>
                <span>·</span>
                <span>{dtf.format(c.createdAt)}</span>
                <span>· em</span>
                <Link href={`/receitas/${c.recipe.slug}`} target="_blank" className="font-semibold text-primary hover:underline">{c.recipe.title}</Link>
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-sm">{c.text}</p>
              <div className="mt-3">
                <CommentActions id={c.id} status={c.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
