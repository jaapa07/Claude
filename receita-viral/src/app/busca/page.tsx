import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { filtersFromParams, listRecipes, recordSearch } from "@/lib/recipes";
import { RecipeGrid } from "@/components/recipe/recipe-card";
import { SearchFilters } from "@/components/search/filters";
import { Pagination } from "@/components/search/pagination";
import { SearchBox } from "@/components/layout/search-box";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return { title: q ? `Busca: ${q}` : "Busca de receitas", robots: { index: !q } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = filtersFromParams(sp);
  const [result, categories] = await Promise.all([
    listRecipes(filters),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], select: { slug: true, name: true, emoji: true, type: true } }),
  ]);
  if (filters.q && !filters.page) await recordSearch(filters.q).catch(() => {});
  const ingredientMode = Boolean(filters.have?.length);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          {filters.q ? <>Resultados para “{filters.q}”</> : ingredientMode ? "Receitas com o que você tem" : "Busca inteligente"}
        </h1>
        <SearchBox defaultValue={filters.q ?? ""} large key={filters.q ?? ""} />
      </div>
      <Suspense>
        <SearchFilters categories={categories} defaultIngredientsOpen={sp.modo === "ingredientes"} />
      </Suspense>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {result.total} {result.total === 1 ? "receita encontrada" : "receitas encontradas"}
        {ingredientMode && " — ordenadas pelo que você já tem (sal, água, açúcar e óleo contam como despensa)"}
      </p>
      {result.items.length ? (
        <RecipeGrid recipes={result.items} showMatch={ingredientMode} />
      ) : (
        <EmptyState
          emoji="🔍"
          title="Nenhuma receita encontrada"
          description={ingredientMode ? "Tente remover algum ingrediente ou filtro. Você também pode pedir uma ideia ao Chef IA." : "Experimente outros termos, remova filtros ou busque por ingredientes."}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline"><Link href="/busca">Limpar busca</Link></Button>
              <Button asChild><Link href={`/chef${filters.have?.length ? `?q=${encodeURIComponent(`Tenho ${filters.have.join(", ")}. O que posso fazer?`)}` : ""}`}>Perguntar ao Chef IA</Link></Button>
            </div>
          }
        />
      )}
      <Pagination page={result.page} pages={result.pages} basePath="/busca" params={sp} />
    </div>
  );
}
