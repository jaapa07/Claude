import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRecipeBySlug } from "@/lib/recipes";
import { CookingMode } from "./cooking-mode";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRecipeBySlug(slug);
  return { title: r ? `Modo Cozinha · ${r.title}` : "Modo Cozinha", robots: { index: false } };
}

export default async function CookingPage({ params }: Props) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();
  return (
    <CookingMode
      recipe={{
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        emoji: recipe.emoji,
        servings: recipe.servings,
        steps: recipe.steps.map((s) => ({ id: s.id, text: s.text, timerMinutes: s.timerMinutes })),
        ingredients: recipe.ingredients.map((i) => ({ id: i.id, name: i.ingredient.name, quantity: i.quantity, unit: i.unit, note: i.note })),
      }}
    />
  );
}
