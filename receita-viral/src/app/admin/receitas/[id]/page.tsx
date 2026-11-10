import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { recipeToFormInitial } from "@/components/recipe-form/form-values";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/utils";
import { PageHeader } from "../../_components/page-header";
import { RecipeActions } from "../../_components/recipe-actions";
import { recipeFormOptions } from "../../_lib/form-data";

export const metadata = { title: "Editar receita" };

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, { categories, sources }] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        categories: { select: { id: true } },
        ingredients: { include: { ingredient: true }, orderBy: { position: "asc" } },
        steps: { orderBy: { position: "asc" } },
        author: { select: { name: true, email: true } },
        externalSource: { select: { name: true } },
      },
    }),
    recipeFormOptions(),
  ]);
  if (!recipe) notFound();

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/receitas"><ArrowLeft /> Receitas</Link>
      </Button>
      <PageHeader
        title={recipe.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={recipe.status === "PUBLISHED" ? "accent" : "muted"}>{STATUS_LABEL[recipe.status]}</Badge>
            <span>Autor: {recipe.author ? `${recipe.author.name} (${recipe.author.email})` : "Equipe"}</span>
            {recipe.externalSource && <span>· Importada de {recipe.externalSource.name}</span>}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/receitas/${recipe.slug}`} target="_blank"><ExternalLink /> Ver página</Link>
            </Button>
            <RecipeActions recipe={{ id: recipe.id, slug: recipe.slug, title: recipe.title, status: recipe.status, featured: recipe.featured }} />
          </>
        }
      />
      {recipe.externalSourceId && recipe.steps.length === 1 && recipe.steps[0].text.startsWith("Modo de preparo disponível na fonte original") && (
        <div className="mb-5 rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm">
          <p className="font-bold">Rascunho importado — reescreva o modo de preparo</p>
          <p className="mt-1 text-muted-foreground">
            Consulte a{" "}
            {recipe.sourceUrl ? <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">fonte original</a> : "fonte original"}
            , escreva as etapas com suas palavras e mantenha o crédito antes de publicar.
          </p>
        </div>
      )}
      <RecipeForm
        key={recipe.updatedAt.toISOString()}
        mode="admin"
        recipeId={recipe.id}
        categories={categories}
        sources={sources}
        initial={recipeToFormInitial(recipe)}
        onSavedHref="/admin/receitas"
      />
    </div>
  );
}
