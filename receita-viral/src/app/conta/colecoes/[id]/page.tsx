import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cardSelect, toCards } from "@/lib/recipes";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { CollectionHeaderActions, RemoveFromCollectionButton } from "../_components";

export const metadata: Metadata = { title: "Coleção" };
export const dynamic = "force-dynamic";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=/conta/colecoes/${id}`);
  const collection = await prisma.collection.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      description: true,
      items: { where: { recipe: { status: "PUBLISHED" } }, orderBy: { addedAt: "desc" }, select: { recipe: { select: cardSelect } } },
    },
  });
  if (!collection) notFound();
  const recipes = await toCards(collection.items.map((i) => i.recipe));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/conta" className="hover:text-primary">Minha conta</Link> /{" "}
        <Link href="/conta/colecoes" className="hover:text-primary">Coleções</Link> / <span className="text-foreground">{collection.name}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{collection.name}</h1>
          {collection.description && <p className="mt-1 max-w-2xl text-muted-foreground">{collection.description}</p>}
          <p className="mt-1 text-sm text-muted-foreground">{recipes.length} receita{recipes.length === 1 ? "" : "s"}</p>
        </div>
        <CollectionHeaderActions id={collection.id} name={collection.name} description={collection.description} />
      </div>
      {recipes.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((r) => (
            <div key={r.id} className="relative">
              <RecipeCard recipe={r} className="h-full" />
              <RemoveFromCollectionButton collectionId={collection.id} recipeId={r.id} title={r.title} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="🍳"
          title="Coleção vazia"
          description="Abra uma receita e use “Salvar em coleção” para adicioná-la aqui."
          action={<Button asChild><Link href="/receitas">Explorar receitas</Link></Button>}
        />
      )}
    </div>
  );
}
