import type { Metadata } from "next";
import Link from "next/link";
import { categoriesByType } from "@/lib/recipes";

export const metadata: Metadata = { title: "Explorar categorias", description: "Culinárias internacionais e tipos de pratos: escolha por onde começar." };
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { cuisines, dishTypes } = await categoriesByType();
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Explorar</h1>
        <p className="text-muted-foreground">Viaje por culinárias do mundo ou vá direto ao tipo de prato que está com vontade.</p>
      </header>
      {[
        { title: "Culinárias internacionais", items: cuisines },
        { title: "Tipos de comida", items: dishTypes },
      ].map((group) => (
        <section key={group.title} className="space-y-4">
          <h2 className="font-display text-2xl font-bold">{group.title}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {group.items.map((c) => (
              <Link
                key={c.id}
                href={`/categorias/${c.slug}`}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-3xl border border-border p-4 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
                style={{ background: `linear-gradient(160deg, ${c.color ?? "#f2600c"}33 0%, var(--card) 70%)` }}
              >
                <span className="absolute right-3 top-2 text-6xl transition duration-300 group-hover:scale-110 group-hover:-rotate-6" aria-hidden>{c.emoji}</span>
                <span className="relative font-bold leading-tight">{c.name}</span>
                <span className="relative text-xs text-muted-foreground">{c._count.recipes} receitas</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
