import Link from "next/link";
import { ArrowRight, Clock, Flame, Sparkles, TrendingUp, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  cardsWhere,
  categoriesByType,
  listRecipes,
  personalizedFor,
  popularRecipes,
  topSearchTerms,
  viralOfTheDay,
  type RecipeCardData,
} from "@/lib/recipes";
import { RecipeRow } from "@/components/recipe/recipe-row";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { FavoriteButton } from "@/components/recipe/favorite-button";
import { Stars } from "@/components/recipe/stars";
import { SearchBox } from "@/components/layout/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { DIFFICULTY_LABEL, formatMinutes, PLATFORM_LABEL, seededShuffle, todayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function mostSearched(): Promise<{ terms: string[]; recipes: RecipeCardData[] }> {
  const terms = await topSearchTerms(8);
  const seen = new Set<string>();
  const recipes: RecipeCardData[] = [];
  for (const t of terms.slice(0, 4)) {
    const res = await listRecipes({ q: t.term, pageSize: 4 });
    for (const r of res.items) {
      if (seen.has(r.id) || recipes.length >= 12) continue;
      seen.add(r.id);
      recipes.push(r);
    }
  }
  return { terms: terms.map((t) => t.term), recipes };
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const [hero, trending, tiktok, searched, quick, personal, budget, intl, top10, mustTry, cats] = await Promise.all([
    viralOfTheDay(),
    popularRecipes(12),
    cardsWhere({ viralTrends: { some: { platform: "TIKTOK" } } }, 12),
    mostSearched(),
    listRecipes({ maxTime: 15, sort: "quick", pageSize: 12 }),
    personalizedFor(user?.id ?? null, 10),
    listRecipes({ cost: "LOW", sort: "popular", pageSize: 12 }),
    cardsWhere({ categories: { some: { type: "CUISINE", slug: { not: "brasileira" } } } }, 40),
    popularRecipes(10),
    cardsWhere({ featured: true }, 12),
    categoriesByType(),
  ]);

  // Sugestões do dia para visitantes (rotação diária determinística)
  const dailyPicks = personal.length
    ? personal
    : [...intl, ...budget.items].filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i);
  const dailyList = personal.length ? personal : seededShuffle(dailyPicks, todayKey()).slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl space-y-14 py-6 sm:px-6 sm:py-10">
      {/* ---------------- Hero: receita viral do dia ---------------- */}
      <section className="grid gap-6 px-4 sm:px-0 lg:grid-cols-[1.25fr_1fr] lg:items-stretch">
        {hero ? (
          <Link href={`/receitas/${hero.slug}`} className="group relative min-h-[360px] overflow-hidden rounded-[2rem] shadow-lift sm:min-h-[440px]">
            <RecipeCover imageUrl={hero.imageUrl} emoji={hero.emoji} title={hero.title} color={hero.color} className="absolute inset-0" emojiClass="text-[7rem] sm:text-[12rem] -translate-y-24 sm:-translate-y-10" priority sizes="(max-width: 1024px) 100vw, 60vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute right-4 top-4"><FavoriteButton recipeId={hero.id} /></div>
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 text-white sm:p-8">
              <div className="flex flex-wrap gap-2">
                <Badge variant="solid"><Flame /> Receita viral do dia</Badge>
                {hero.viralPlatform && <Badge variant="glass">Tendência no {PLATFORM_LABEL[hero.viralPlatform]}</Badge>}
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{hero.title}</h1>
              <p className="line-clamp-2 max-w-xl text-sm text-white/85 sm:text-base">{hero.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
                <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{formatMinutes(hero.totalMinutes)}</span>
                <span>{DIFFICULTY_LABEL[hero.difficulty]}</span>
                {hero.ratingCount > 0 && <span className="inline-flex items-center gap-1.5"><Stars value={hero.ratingAvg} /> {hero.ratingAvg.toFixed(1)}</span>}
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 font-semibold text-[#1f1a16] transition group-hover:gap-2">
                  Ver receita <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <EmptyState title="Nenhuma receita publicada ainda" description="Cadastre receitas no painel administrativo." />
        )}

        <div className="flex flex-col justify-between gap-5 rounded-[2rem] border border-border bg-gradient-to-br from-cream via-card to-primary-soft p-6 sm:p-8">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent"><Sparkles className="size-4" /> O que vamos cozinhar hoje?</p>
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Receitas que bombam, do Brasil e do mundo.</h2>
            <p className="text-muted-foreground">Busque pelo nome, pelo que tem na geladeira ou peça uma ideia ao Chef IA.</p>
          </div>
          <SearchBox large />
          <div className="flex flex-wrap gap-2">
            {["frango", "air fryer", "bolo", "fitness", "massa", "sobremesa"].map((t) => (
              <Link key={t} href={`/busca?q=${encodeURIComponent(t)}`} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium transition hover:border-primary hover:text-primary">
                {t}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/busca?modo=ingredientes" className="rounded-2xl bg-card p-4 shadow-soft transition hover:-translate-y-0.5">
              <span className="text-2xl">🧺</span>
              <p className="mt-1 text-sm font-bold">Tenho em casa…</p>
              <p className="text-xs text-muted-foreground">Busque por ingredientes</p>
            </Link>
            <Link href="/chef" className="rounded-2xl bg-card p-4 shadow-soft transition hover:-translate-y-0.5">
              <span className="text-2xl">👩‍🍳</span>
              <p className="mt-1 text-sm font-bold">Chef IA</p>
              <p className="text-xs text-muted-foreground">Ideias e cardápios</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Categorias ---------------- */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-4 sm:px-0">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Explore por categoria</h2>
          <Link href="/explorar" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Todas <ArrowRight className="size-4" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 pt-2 scrollbar-none sm:px-0">
          {cats.dishTypes.map((c) => (
            <Link
              key={c.id}
              href={`/categorias/${c.slug}`}
              className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center"
            >
              <span className="flex size-20 items-center justify-center rounded-3xl text-4xl shadow-soft transition group-hover:-translate-y-1 group-hover:shadow-lift" style={{ background: `${c.color ?? "#f2600c"}22` }}>
                {c.emoji}
              </span>
              <span className="line-clamp-2 text-xs font-semibold leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <RecipeRow title="Em alta" emoji="📈" subtitle="As mais vistas, salvas e bem avaliadas aqui no Receita Viral" recipes={trending} href="/busca?sort=popular" />

      <RecipeRow
        title="Bombando no TikTok"
        emoji="🔥"
        subtitle="Receitas que viraram tendência documentada na plataforma — sem números inventados"
        recipes={tiktok}
        href="/virais?platform=TIKTOK"
      />

      {/* ---------------- Mais pesquisadas ---------------- */}
      <section className="space-y-4 px-4 sm:px-0">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl"><span className="mr-2">🔎</span>Receitas mais pesquisadas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Termos que a comunidade mais buscou por aqui.</p>
        </div>
        {searched.terms.length ? (
          <div className="flex flex-wrap gap-2">
            {searched.terms.map((t, i) => (
              <Link key={t} href={`/busca?q=${encodeURIComponent(t)}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-soft transition hover:border-primary hover:text-primary">
                <span className="text-xs text-primary">#{i + 1}</span> {t}
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            <Search className="mr-1 inline size-4" /> Ainda não há buscas registradas. Faça a primeira pesquisa — o ranking é montado com as buscas reais do app.
          </p>
        )}
      </section>
      {searched.recipes.length > 0 && <RecipeRow title="Resultados das buscas populares" recipes={searched.recipes} />}

      <RecipeRow title="Prontas em até 15 minutos" emoji="⚡" subtitle="Para quando a fome não espera" recipes={quick.items} href="/busca?maxTime=15&sort=quick" />

      {/* ---------------- Sugestões personalizadas ---------------- */}
      <div className="space-y-4">
        <RecipeRow
          title={personal.length ? `Sugestões para você, ${user?.name.split(" ")[0]}` : "Sugestões do dia"}
          emoji="✨"
          subtitle={personal.length ? "Com base nos seus favoritos e no que você tem visto (respeitando suas restrições)" : "Uma seleção que muda todos os dias"}
          recipes={dailyList}
        />
        {!user && (
          <div className="mx-4 flex flex-col items-start gap-3 rounded-3xl border border-dashed border-primary/40 bg-primary-soft/50 p-5 sm:mx-0 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm"><strong>Quer sugestões feitas para você?</strong> Crie uma conta, salve favoritos e informe suas restrições alimentares.</p>
            <Button asChild size="sm"><Link href="/cadastro">Criar conta grátis</Link></Button>
          </div>
        )}
      </div>

      <RecipeRow title="Receitas econômicas" emoji="💰" subtitle="Gostosas e baratinhas" recipes={budget.items} href="/categorias/economicas" />

      {/* ---------------- Internacionais ---------------- */}
      <section className="space-y-4">
        <div className="px-4 sm:px-0">
          <h2 className="font-display text-2xl font-bold sm:text-3xl"><span className="mr-2">🌍</span>Pratos internacionais</h2>
          <p className="mt-1 text-sm text-muted-foreground">Uma volta ao mundo sem sair da cozinha.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none sm:px-0">
          {cats.cuisines.filter((c) => c.slug !== "brasileira").map((c) => (
            <Link key={c.id} href={`/categorias/${c.slug}`} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary">
              <span>{c.emoji}</span> {c.name} <span className="text-xs text-muted-foreground">{c._count.recipes}</span>
            </Link>
          ))}
        </div>
        <RecipeRow title="" recipes={intl.filter((r, i) => intl.findIndex((x) => x.cuisine?.slug === r.cuisine?.slug) === i || i % 3 === 0).slice(0, 12)} />
      </section>

      {/* ---------------- Top 10 ---------------- */}
      <section className="mx-4 rounded-[2rem] bg-gradient-to-br from-[#1f1a16] to-[#3a2214] p-6 text-white sm:mx-0 sm:p-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff9a5c]"><TrendingUp className="size-4" /> Ranking</p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Top 10 mais populares</h2>
            <p className="mt-1 text-sm text-white/70">Calculado com visualizações, favoritos e avaliações reais do app.</p>
          </div>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {top10.map((r, i) => (
            <li key={r.id}>
              <Link href={`/receitas/${r.slug}`} className="group flex items-center gap-4 rounded-2xl bg-white/5 p-3 transition hover:bg-white/10">
                <span className="w-8 text-center font-display text-3xl font-extrabold text-[#ff9a5c]">{i + 1}</span>
                <RecipeCover imageUrl={r.imageUrl} emoji={r.emoji} title={r.title} color={r.color} className="size-16 shrink-0 rounded-xl" emojiClass="text-3xl" sizes="64px" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="text-xs text-white/60">
                    {formatMinutes(r.totalMinutes)} · {DIFFICULTY_LABEL[r.difficulty]}
                    {r.ratingCount > 0 && ` · ★ ${r.ratingAvg.toFixed(1)}`}
                  </p>
                </div>
                <ArrowRight className="size-4 text-white/40 transition group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <RecipeRow title="Você precisa experimentar" emoji="😋" subtitle="Escolhas da nossa equipe" recipes={mustTry} />
    </div>
  );
}
