"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { RecipeCardData } from "@/lib/recipes";
import { RecipeCard } from "./recipe-card";

/** Carrossel horizontal com rolagem por toque e setas no desktop. */
export function RecipeRow({
  title,
  subtitle,
  emoji,
  recipes,
  href,
  ranked,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  recipes: RecipeCardData[];
  href?: string;
  ranked?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  if (!recipes.length) return null;
  return (
    <section className="space-y-4">
      <div className={title ? "flex items-end justify-between gap-4 px-4 sm:px-0" : "hidden md:flex md:justify-end md:gap-2"}>
        <div className={title ? "" : "hidden"}>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {emoji && <span className="mr-2" aria-hidden>{emoji}</span>}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {href && (
            <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Ver tudo <ArrowRight className="size-4" />
            </Link>
          )}
          <button onClick={() => scroll(-1)} className="hidden size-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted md:inline-flex" aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => scroll(1)} className="hidden size-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted md:inline-flex" aria-label="Próximo">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:px-0">
        {recipes.map((r, i) => (
          <div key={r.id} className="w-[72%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[23.5%]">
            <RecipeCard recipe={r} size="sm" rank={ranked ? i + 1 : undefined} className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
