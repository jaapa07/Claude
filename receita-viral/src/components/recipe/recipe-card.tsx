import Link from "next/link";
import { Clock, Flame, ChefHat } from "lucide-react";
import type { RecipeCardData } from "@/lib/recipes";
import { cn, DIFFICULTY_LABEL, formatMinutes, PLATFORM_LABEL } from "@/lib/utils";
import { RecipeCover } from "./recipe-cover";
import { FavoriteButton } from "./favorite-button";
import { Stars } from "./stars";
import { Badge } from "@/components/ui/badge";

export function RecipeCard({
  recipe,
  size = "md",
  rank,
  className,
  showMatch,
}: {
  recipe: RecipeCardData;
  size?: "sm" | "md" | "lg";
  rank?: number;
  className?: string;
  showMatch?: boolean;
}) {
  return (
    <Link
      href={`/receitas/${recipe.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
    >
      <div className="relative">
        <RecipeCover
          imageUrl={recipe.imageUrl}
          emoji={recipe.emoji}
          title={recipe.title}
          color={recipe.color}
          className={cn(size === "lg" ? "aspect-[4/3]" : size === "sm" ? "aspect-[5/4]" : "aspect-[4/3]")}
          emojiClass={size === "sm" ? "text-6xl" : "text-7xl"}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            {rank != null && <Badge variant="solid" className="text-sm">#{rank}</Badge>}
            {recipe.viralPlatform && <Badge variant="glass">🔥 {PLATFORM_LABEL[recipe.viralPlatform]}</Badge>}
            {recipe.cuisine && size !== "sm" && <Badge variant="glass">{recipe.cuisine.name}</Badge>}
          </div>
          <FavoriteButton recipeId={recipe.id} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className={cn("line-clamp-2 font-bold leading-snug", size === "lg" ? "text-lg" : "text-base")}>{recipe.title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {recipe.ratingCount > 0 ? (
            <>
              <Stars value={recipe.ratingAvg} />
              <span className="font-semibold text-foreground">{recipe.ratingAvg.toFixed(1)}</span>
              <span>({recipe.ratingCount})</span>
            </>
          ) : (
            <span>Seja o primeiro a avaliar</span>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{formatMinutes(recipe.totalMinutes)}</span>
          <span className="inline-flex items-center gap-1"><ChefHat className="size-3.5" />{DIFFICULTY_LABEL[recipe.difficulty]}</span>
          {recipe.caloriesPerServing != null && (
            <span className="inline-flex items-center gap-1"><Flame className="size-3.5" />{recipe.caloriesPerServing} kcal</span>
          )}
        </div>
        {showMatch && recipe.match && (
          <div className="mt-1 space-y-1 rounded-2xl bg-muted p-2.5 text-xs">
            <p><span className="font-semibold text-accent">✓ Você tem:</span> {recipe.match.matched.join(", ")}</p>
            <p>
              <span className="font-semibold text-primary">+ Falta:</span>{" "}
              {recipe.match.missing.length ? recipe.match.missing.join(", ") : "nada além do básico da despensa 🎉"}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export function RecipeGrid({ recipes, showMatch, className }: { recipes: RecipeCardData[]; showMatch?: boolean; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {recipes.map((r, i) => (
        <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
          <RecipeCard recipe={r} showMatch={showMatch} className="h-full" />
        </div>
      ))}
    </div>
  );
}
