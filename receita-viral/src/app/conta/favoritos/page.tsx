import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cardSelect, toCards } from "@/lib/recipes";
import { RecipeGrid } from "@/components/recipe/recipe-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Favoritos" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/conta/favoritos");
  const favs = await prisma.favorite.findMany({
    where: { userId: user.id, recipe: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: { recipe: { select: cardSelect } },
  });
  const recipes = await toCards(favs.map((f) => f.recipe));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/conta" className="hover:text-primary">Minha conta</Link> / <span className="text-foreground">Favoritos</span>
      </nav>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Favoritos</h1>
        <p className="text-sm text-muted-foreground">{recipes.length} receita{recipes.length === 1 ? "" : "s"} salva{recipes.length === 1 ? "" : "s"}</p>
      </div>
      {recipes.length ? (
        <RecipeGrid recipes={recipes} />
      ) : (
        <EmptyState
          emoji="💛"
          title="Nenhuma receita favorita"
          description="Toque no coração de qualquer receita para guardá-la aqui."
          action={<Button asChild><Link href="/receitas">Descobrir receitas</Link></Button>}
        />
      )}
    </div>
  );
}
