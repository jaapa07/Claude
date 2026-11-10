import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeForm } from "@/components/recipe-form/recipe-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../../_components/page-header";
import { recipeFormOptions } from "../../_lib/form-data";

export const metadata = { title: "Nova receita" };

export default async function NewRecipePage() {
  const { categories, sources } = await recipeFormOptions();
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/receitas"><ArrowLeft /> Receitas</Link>
      </Button>
      <PageHeader title="Nova receita" description="Preencha os dados. Salve como rascunho para revisar antes de publicar." />
      <RecipeForm mode="admin" categories={categories} sources={sources} />
    </div>
  );
}
