import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { filtersFromParams, listRecipes } from "@/lib/recipes";
import { RecipeGrid } from "@/components/recipe/recipe-card";
import { SearchFilters } from "@/components/search/filters";
import { Pagination } from "@/components/search/pagination";
import { EmptyState } from "@/components/ui/states";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) return { title: "Categoria não encontrada" };
  return {
    title: cat.type === "CUISINE" ? `Culinária ${cat.name}` : cat.name,
    description: cat.description ?? `Receitas de ${cat.name.toLowerCase()} com fotos, tempo de preparo, dificuldade e avaliações.`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();
  const filters = filtersFromParams(sp);
  filters.categories = [slug, ...(filters.categories ?? []).filter((c) => c !== slug)];
  const [result, categories, siblings] = await Promise.all([
    listRecipes({ ...filters, sort: filters.sort ?? "popular" }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], select: { slug: true, name: true, emoji: true, type: true } }),
    prisma.category.findMany({ where: { type: category.type, slug: { not: slug } }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, emoji: true } }),
  ]);
  const color = category.color ?? "#f2600c";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Trilha">
        <Link href="/" className="hover:text-primary">Início</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/explorar" className="hover:text-primary">Explorar</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{category.name}</span>
      </nav>
      <header
        className="relative overflow-hidden rounded-[2rem] p-6 sm:p-10"
        style={{ background: `linear-gradient(135deg, ${color}26 0%, ${color}0d 60%), var(--card)` }}
      >
        <span className="absolute -right-4 -top-6 text-[9rem] opacity-90 sm:text-[12rem]" aria-hidden>{category.emoji}</span>
        <div className="relative max-w-xl space-y-2">
          <p className="text-sm font-semibold" style={{ color }}>{category.type === "CUISINE" ? "Culinária internacional" : "Tipo de prato"}</p>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{category.name}</h1>
          {category.description && <p className="text-muted-foreground">{category.description}</p>}
          <p className="text-sm font-semibold">{result.total} receitas</p>
        </div>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {siblings.map((s) => (
          <Link key={s.slug} href={`/categorias/${s.slug}`} className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover:border-primary">
            {s.emoji} {s.name}
          </Link>
        ))}
      </div>
      <Suspense>
        <SearchFilters categories={categories} fixedCategory={slug} showIngredients={false} />
      </Suspense>
      {result.items.length ? (
        <RecipeGrid recipes={result.items} />
      ) : (
        <EmptyState emoji={category.emoji ?? "🍽️"} title="Nenhuma receita com esses filtros" description="Remova alguns filtros para ver mais receitas desta categoria." />
      )}
      <Pagination page={result.page} pages={result.pages} basePath={`/categorias/${slug}`} params={sp} />
    </div>
  );
}
