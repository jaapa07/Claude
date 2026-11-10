"use client";
import { Heart } from "lucide-react";
import { useFavorites } from "@/components/providers";
import { cn } from "@/lib/utils";

export function FavoriteButton({ recipeId, className, withLabel }: { recipeId: string; className?: string; withLabel?: boolean }) {
  const { ids, toggle } = useFavorites();
  const active = ids.has(recipeId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(recipeId);
      }}
      aria-pressed={active}
      aria-label={active ? "Remover dos favoritos" : "Salvar nos favoritos"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full transition active:scale-90",
        withLabel ? "h-10 border border-border bg-card px-4 text-sm font-semibold hover:bg-muted" : "size-9 bg-white/90 text-foreground shadow-soft backdrop-blur hover:bg-white dark:bg-black/50 dark:text-white",
        className,
      )}
    >
      <Heart key={String(active)} className={cn("size-[18px] animate-pop", active && "fill-primary text-primary")} />
      {withLabel && (active ? "Salva" : "Salvar")}
    </button>
  );
}
