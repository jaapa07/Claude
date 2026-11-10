import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { RecipeForm } from "@/components/recipe-form/recipe-form";

export const metadata: Metadata = { title: "Publicar receita" };

export default async function NewMyRecipePage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, type: true, emoji: true } });
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Publicar receita</h1>
        <p className="text-muted-foreground">Depois de enviada, sua receita fica “Em revisão” até ser aprovada pela equipe. Você recebe uma notificação.</p>
      </header>
      <RecipeForm mode="user" categories={categories} onSavedHref="/conta/receitas" />
    </div>
  );
}
