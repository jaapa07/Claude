import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { recipeToFormInitial } from "@/components/recipe-form/form-values";

export const metadata: Metadata = { title: "Editar receita" };

export default async function EditMyRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const [recipe, categories] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: { categories: true, ingredients: { include: { ingredient: true } }, steps: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, type: true, emoji: true } }),
  ]);
  if (!recipe || recipe.authorId !== user.id) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Editar receita</h1>
        <p className="text-muted-foreground">Ao salvar, a receita volta para revisão antes de ser publicada novamente.</p>
      </header>
      <RecipeForm mode="user" categories={categories} initial={recipeToFormInitial(recipe)} recipeId={recipe.id} onSavedHref="/conta/receitas" />
    </div>
  );
}
