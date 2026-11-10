import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Flame, Gauge, Lightbulb, Repeat, Timer, Users, Wallet, ExternalLink, BadgeCheck, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cardsWhere, getRecipeBySlug } from "@/lib/recipes";
import { appUrl, COST_LABEL, DIFFICULTY_LABEL, formatMinutes, PLATFORM_LABEL, STATUS_LABEL } from "@/lib/utils";
import { toEmbedUrl, isDirectVideo } from "@/lib/embed";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { RecipeRow } from "@/components/recipe/recipe-row";
import { Badge } from "@/components/ui/badge";
import { IngredientsPanel } from "./_components/ingredients-panel";
import { StepsList } from "./_components/steps-list";
import { ActionBar } from "./_components/action-bar";
import { Reviews } from "./_components/reviews";
import { ViewTracker } from "./_components/view-tracker";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Receita não encontrada" };
  const url = appUrl(`/receitas/${recipe.slug}`);
  return {
    title: recipe.title,
    description: recipe.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: recipe.title,
      description: recipe.description,
      url,
      images: recipe.imageUrl ? [{ url: recipe.imageUrl }] : [{ url: appUrl(`/receitas/${recipe.slug}/opengraph-image`) }],
    },
  };
}

function iso(minutes: number) {
  return `PT${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}H` : ""}${minutes % 60}M`;
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  let recipe = await getRecipeBySlug(slug);
  if (!recipe && user) {
    // Pré-visualização para admin ou autor de receita não publicada
    const draft = await getRecipeBySlug(slug, { includeUnpublished: true });
    if (draft && (user.role === "ADMIN" || draft.authorId === user.id)) recipe = draft;
  }
  if (!recipe) notFound();

  const cuisine = recipe.categories.find((c) => c.type === "CUISINE");
  const [comments, myRating, related] = await Promise.all([
    prisma.comment.findMany({
      where: { recipeId: recipe.id, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, text: true, createdAt: true, user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    user ? prisma.rating.findUnique({ where: { userId_recipeId: { userId: user.id, recipeId: recipe.id } }, select: { stars: true } }) : null,
    cardsWhere(
      { id: { not: recipe.id }, categories: { some: { slug: { in: recipe.categories.map((c) => c.slug) } } } },
      10,
    ),
  ]);

  const nutrition = recipe.nutrition as { protein: number; carbs: number; fat: number; fiber: number; sodium: number } | null;
  const substitutions = (recipe.substitutions as { ingredient: string; substitute: string }[]) ?? [];
  const embed = toEmbedUrl(recipe.videoUrl);
  const total = recipe.prepMinutes + recipe.cookMinutes;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.imageUrl ? [recipe.imageUrl] : undefined,
    author: { "@type": "Organization", name: recipe.author?.name ?? "Receita Viral" },
    datePublished: recipe.publishedAt?.toISOString(),
    prepTime: iso(recipe.prepMinutes),
    cookTime: iso(recipe.cookMinutes),
    totalTime: iso(total),
    recipeYield: `${recipe.servings} porções`,
    recipeCategory: recipe.categories.filter((c) => c.type === "DISH_TYPE").map((c) => c.name).join(", "),
    recipeCuisine: cuisine?.name,
    keywords: recipe.tags.join(", "),
    nutrition: recipe.caloriesPerServing ? { "@type": "NutritionInformation", calories: `${recipe.caloriesPerServing} kcal` } : undefined,
    recipeIngredient: recipe.ingredients.map((i) => `${i.quantity ?? ""} ${i.unit} ${i.ingredient.name}`.trim()),
    recipeInstructions: recipe.steps.map((s) => ({ "@type": "HowToStep", text: s.text })),
    aggregateRating: recipe._count.ratings ? { "@type": "AggregateRating", ratingValue: recipe.ratingAvg, ratingCount: recipe._count.ratings } : undefined,
  };

  const meta = [
    { icon: Clock, label: "Preparo", value: formatMinutes(recipe.prepMinutes) },
    { icon: Timer, label: "Cozimento", value: recipe.cookMinutes ? formatMinutes(recipe.cookMinutes) : "—" },
    { icon: Users, label: "Rende", value: `${recipe.servings} porç${recipe.servings > 1 ? "ões" : "ão"}` },
    { icon: Gauge, label: "Dificuldade", value: DIFFICULTY_LABEL[recipe.difficulty] },
    { icon: Flame, label: "Calorias", value: recipe.caloriesPerServing ? `${recipe.caloriesPerServing} kcal/porção` : "—" },
    { icon: Wallet, label: "Custo", value: COST_LABEL[recipe.costLevel] },
  ];

  return (
    <article className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {recipe.status === "PUBLISHED" && <ViewTracker recipeId={recipe.id} />}

      {recipe.status !== "PUBLISHED" && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft p-3 text-sm">
          <Info className="size-4 text-primary" /> Pré-visualização — status: <strong>{STATUS_LABEL[recipe.status]}</strong>. Só você e administradores veem esta página.
        </div>
      )}

      <nav aria-label="Trilha" className="no-print mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Início</Link>
        <ChevronRight className="size-3.5" />
        {cuisine ? <Link href={`/categorias/${cuisine.slug}`} className="hover:text-primary">{cuisine.name}</Link> : <Link href="/explorar">Receitas</Link>}
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{recipe.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="space-y-4">
          <RecipeCover
            imageUrl={recipe.imageUrl}
            emoji={recipe.emoji}
            title={recipe.title}
            color={cuisine?.color}
            className="aspect-[4/3] w-full rounded-[2rem] shadow-lift"
            emojiClass="text-[9rem] sm:text-[11rem]"
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
          {recipe.videoUrl && (
            <div className="overflow-hidden rounded-3xl border border-border bg-black">
              {embed && !isDirectVideo(embed) ? (
                <iframe
                  src={embed}
                  title={`Vídeo: ${recipe.title}`}
                  className="aspect-video w-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : isDirectVideo(recipe.videoUrl) ? (
                <video src={recipe.videoUrl} controls playsInline preload="metadata" className="aspect-video w-full" />
              ) : (
                <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-card p-4 text-sm font-semibold text-primary">
                  <ExternalLink className="size-4" /> Assistir ao vídeo demonstrativo na fonte original
                </a>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {recipe.categories.map((c) => (
              <Link key={c.id} href={`/categorias/${c.slug}`}>
                <Badge variant={c.type === "CUISINE" ? "accent" : "muted"} className="hover:brightness-95">{c.emoji} {c.name}</Badge>
              </Link>
            ))}
          </div>
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{recipe.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{recipe.description}</p>
            {recipe.author && (
              <p className="mt-2 text-sm text-muted-foreground">Por <span className="font-semibold text-foreground">{recipe.author.name}</span></p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</dt>
                <dd className="mt-0.5 text-sm font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <ActionBar recipe={{ id: recipe.id, slug: recipe.slug, title: recipe.title, description: recipe.description }} />

          {recipe.viralTrends.length > 0 && (
            <div className="space-y-2 rounded-3xl border border-primary/25 bg-primary-soft/60 p-5">
              {recipe.viralTrends.map((t) => (
                <div key={t.id} className="space-y-1.5 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    🔥 Tendência no {PLATFORM_LABEL[t.platform]} {t.trendPeriod && <span className="font-normal text-muted-foreground">· {t.trendPeriod}</span>}
                    {t.verified ? (
                      <Badge variant="accent"><BadgeCheck /> Origem verificada</Badge>
                    ) : (
                      <Badge variant="muted">Criador original não verificado</Badge>
                    )}
                  </p>
                  {t.note && <p className="text-muted-foreground">{t.note}</p>}
                  <div className="flex flex-wrap gap-3">
                    {t.creatorUrl && (
                      <a href={t.creatorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                        Criador: {t.creatorName ?? "perfil original"} <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    {t.postUrl && (
                      <a href={t.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                        Ver publicação original <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    {t.referenceUrl && (
                      <a href={t.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:underline">
                        Referência <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[380px_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <IngredientsPanel
            recipeId={recipe.id}
            baseServings={recipe.servings}
            ingredients={recipe.ingredients.map((i) => ({ id: i.id, name: i.ingredient.name, quantity: i.quantity, unit: i.unit, note: i.note, optional: i.optional }))}
          />
        </aside>

        <div className="space-y-12">
          <section>
            <h2 className="mb-6 font-display text-2xl font-bold">Modo de preparo</h2>
            <StepsList recipeTitle={recipe.title} steps={recipe.steps} />
          </section>

          {recipe.tips.length > 0 && (
            <section className="print-break rounded-3xl bg-accent-soft p-6">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Lightbulb className="size-5 text-accent" /> Dicas do chef</h2>
              <ul className="space-y-2">
                {recipe.tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed"><span className="text-accent">●</span>{t}</li>
                ))}
              </ul>
            </section>
          )}

          {substitutions.length > 0 && (
            <section className="print-break">
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Repeat className="size-5 text-primary" /> Substituições</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {substitutions.map((s, i) => (
                  <li key={i} className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <p className="font-semibold">Sem {s.ingredient}?</p>
                    <p className="mt-1 text-muted-foreground">{s.substitute}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nutrition && (
            <section className="print-break">
              <h2 className="mb-3 text-xl font-bold">Informação nutricional estimada <span className="text-sm font-normal text-muted-foreground">(por porção)</span></h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[
                  ["Calorias", recipe.caloriesPerServing ?? "—", "kcal"],
                  ["Proteínas", nutrition.protein, "g"],
                  ["Carboidratos", nutrition.carbs, "g"],
                  ["Gorduras", nutrition.fat, "g"],
                  ["Fibras", nutrition.fiber, "g"],
                  ["Sódio", nutrition.sodium, "mg"],
                ].map(([label, value, unit]) => (
                  <div key={label as string} className="rounded-2xl bg-muted p-3 text-center">
                    <p className="text-lg font-extrabold">{value}<span className="text-xs font-semibold text-muted-foreground"> {unit}</span></p>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Valores aproximados, calculados para fins informativos. Podem variar conforme marcas e quantidades.</p>
            </section>
          )}

          {(recipe.sourceUrl || recipe.sourceAttribution) && (
            <section className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Fonte e créditos</p>
              {recipe.sourceAttribution && <p>{recipe.sourceAttribution}</p>}
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Ver receita original <ExternalLink className="size-3.5" />
                </a>
              )}
              {recipe.externalSource?.license && <p className="mt-1 text-xs">Licença/termos: {recipe.externalSource.license}</p>}
            </section>
          )}

          <Reviews
            recipeId={recipe.id}
            initialAverage={recipe.ratingAvg}
            initialCount={recipe._count.ratings}
            myRating={myRating?.stars ?? null}
            initialComments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
          />
        </div>
      </div>

      <div className="no-print mt-16 -mx-4 sm:mx-0">
        <RecipeRow title="Você também pode gostar" emoji="🍴" recipes={related} />
      </div>
    </article>
  );
}
