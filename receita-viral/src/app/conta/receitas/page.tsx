import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, Eye } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { STATUS_LABEL, formatMinutes } from "@/lib/utils";
import { DeleteMyRecipe } from "./delete-button";

export const metadata: Metadata = { title: "Minhas receitas" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT = { PUBLISHED: "accent", PENDING: "default", DRAFT: "muted", REJECTED: "danger", ARCHIVED: "muted" } as const;

export default async function MyRecipesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/conta/receitas");
  const recipes = await prisma.recipe.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, emoji: true, imageUrl: true, status: true, prepMinutes: true, cookMinutes: true, updatedAt: true, _count: { select: { favorites: true, comments: true } } },
  });
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Minhas receitas</h1>
          <p className="text-muted-foreground">Publique suas criações. Elas passam por uma revisão rápida da equipe antes de aparecer para todos.</p>
        </div>
        <Button asChild><Link href="/conta/receitas/nova"><Plus /> Nova receita</Link></Button>
      </div>
      {recipes.length === 0 ? (
        <EmptyState emoji="📝" title="Você ainda não publicou receitas" description="Compartilhe aquela receita de família ou sua invenção favorita." action={<Button asChild><Link href="/conta/receitas/nova">Publicar minha primeira receita</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-3 shadow-soft">
              <RecipeCover imageUrl={r.imageUrl} emoji={r.emoji} title={r.title} className="size-20 shrink-0 rounded-2xl" emojiClass="text-4xl" sizes="80px" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  <span>{formatMinutes(r.prepMinutes + r.cookMinutes)}</span>
                  <span>❤ {r._count.favorites}</span>
                  <span>💬 {r._count.comments}</span>
                  <span>atualizada em {r.updatedAt.toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button asChild variant="ghost" size="icon" aria-label="Ver"><Link href={`/receitas/${r.slug}`}><Eye /></Link></Button>
                <Button asChild variant="ghost" size="icon" aria-label="Editar"><Link href={`/conta/receitas/${r.id}`}><Pencil /></Link></Button>
                <DeleteMyRecipe id={r.id} title={r.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
