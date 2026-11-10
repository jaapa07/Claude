import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, SocialPlatform } from "@prisma/client";
import { BadgeCheck, ExternalLink, Info, Flame } from "lucide-react";
import { prisma } from "@/lib/db";
import { cardSelect, popularityScore, toCards } from "@/lib/recipes";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { FavoriteButton } from "@/components/recipe/favorite-button";
import { DIFFICULTY_LABEL, formatMinutes } from "@/lib/utils";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { cn, PLATFORM_LABEL } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Receitas virais",
  description: "Receitas que viraram tendência no TikTok, Instagram, YouTube e Pinterest — com origem identificada e links para os criadores quando verificados.",
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const PLATFORMS: { key: SocialPlatform; emoji: string }[] = [
  { key: "TIKTOK", emoji: "🎵" },
  { key: "INSTAGRAM", emoji: "📸" },
  { key: "YOUTUBE", emoji: "▶️" },
  { key: "PINTEREST", emoji: "📌" },
];

const SORTS = [
  ["popular", "Popularidade no app"],
  ["recent", "Tendência mais recente"],
  ["oldest", "Tendência mais antiga"],
] as const;

export default async function ViralPage({ searchParams }: Props) {
  const sp = await searchParams;
  const platform = PLATFORMS.find((p) => p.key === sp.platform)?.key;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined;
  const type = sp.type;
  const sort = SORTS.find(([k]) => k === sp.sort)?.[0] ?? "popular";

  const trendWhere: Prisma.ViralTrendWhereInput = { ...(platform ? { platform } : {}), ...(year ? { trendYear: year } : {}) };
  const [trends, years, types, platformCounts] = await Promise.all([
    prisma.viralTrend.findMany({
      where: { ...trendWhere, recipe: { status: "PUBLISHED", ...(type ? { categories: { some: { slug: type } } } : {}) } },
      include: { recipe: { select: cardSelect } },
    }),
    prisma.viralTrend.findMany({ where: { trendYear: { not: null } }, distinct: ["trendYear"], select: { trendYear: true }, orderBy: { trendYear: "desc" } }),
    prisma.category.findMany({ where: { type: "DISH_TYPE", recipes: { some: { viralTrends: { some: {} }, status: "PUBLISHED" } } }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, emoji: true } }),
    prisma.viralTrend.groupBy({ by: ["platform"], _count: true, where: { recipe: { status: "PUBLISHED" } } }),
  ]);

  const cards = await toCards(trends.map((t) => t.recipe));
  const rows = trends.map((t, i) => ({ trend: t, card: cards[i] }));
  // Uma receita pode ter tendências em várias plataformas: mantém uma linha por receita
  const unique = rows.filter((r, i) => rows.findIndex((x) => x.card.id === r.card.id) === i);
  unique.sort((a, b) => {
    if (sort === "recent") return (b.trend.trendYear ?? 0) - (a.trend.trendYear ?? 0) || +b.trend.createdAt - +a.trend.createdAt;
    if (sort === "oldest") return (a.trend.trendYear ?? 9999) - (b.trend.trendYear ?? 9999);
    return popularityScore(b.card) - popularityScore(a.card) || (b.trend.highlighted ? 1 : 0) - (a.trend.highlighted ? 1 : 0);
  });
  const withVideo = unique.filter((r) => r.trend.embedUrl);
  const highlighted = unique.filter((r) => r.trend.highlighted).slice(0, 3);

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { platform, year: year ? String(year) : undefined, type, sort: sort === "popular" ? undefined : sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/virais${qs ? `?${qs}` : ""}`;
  };
  const countFor = (p: SocialPlatform) => platformCounts.find((c) => c.platform === p)?._count ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1f1a16] via-[#3a1d0d] to-[#f2600c] p-6 text-white sm:p-10">
        <div className="absolute -right-6 -top-10 text-[10rem] opacity-30 sm:text-[14rem]" aria-hidden>🔥</div>
        <div className="relative max-w-2xl space-y-3">
          <Badge variant="glass"><Flame /> Receitas Virais</Badge>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">O que bombou nas redes</h1>
          <p className="text-white/80">Receitas que viraram tendência em plataformas como TikTok, Instagram, YouTube e Pinterest, adaptadas e testadas para a cozinha brasileira.</p>
        </div>
      </header>

      <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          <strong className="text-foreground">Transparência:</strong> não exibimos números de visualizações das redes sociais. A origem de cada tendência é
          descrita com base em informações públicas; o selo <BadgeCheck className="inline size-4 text-accent" /> aparece só quando nossa equipe confere o link
          original e o criador. O ranking abaixo usa apenas dados reais do Receita Viral (visualizações, favoritos e avaliações no app).
        </p>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Link href={link({ platform: undefined })} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", !platform ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
            Todas as plataformas
          </Link>
          {PLATFORMS.map((p) => (
            <Link key={p.key} href={link({ platform: p.key })} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", platform === p.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
              {p.emoji} {PLATFORM_LABEL[p.key]} <span className="ml-1 opacity-70">{countFor(p.key)}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center font-semibold text-muted-foreground">Período:</span>
          <Link href={link({ year: undefined })} className={cn("rounded-full px-3 py-1 font-semibold", !year ? "bg-foreground text-background" : "bg-muted")}>Todos</Link>
          {years.map((y) => (
            <Link key={y.trendYear} href={link({ year: String(y.trendYear) })} className={cn("rounded-full px-3 py-1 font-semibold", year === y.trendYear ? "bg-foreground text-background" : "bg-muted")}>
              {y.trendYear}
            </Link>
          ))}
          <span className="ml-2 self-center font-semibold text-muted-foreground">Ordenar:</span>
          {SORTS.map(([k, l]) => (
            <Link key={k} href={link({ sort: k === "popular" ? undefined : k })} className={cn("rounded-full px-3 py-1 font-semibold", sort === k ? "bg-foreground text-background" : "bg-muted")}>
              {l}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center font-semibold text-muted-foreground">Tipo de prato:</span>
          <Link href={link({ type: undefined })} className={cn("rounded-full px-3 py-1 font-semibold", !type ? "bg-foreground text-background" : "bg-muted")}>Todos</Link>
          {types.map((t) => (
            <Link key={t.slug} href={link({ type: t.slug })} className={cn("rounded-full px-3 py-1 font-semibold", type === t.slug ? "bg-foreground text-background" : "bg-muted")}>
              {t.emoji} {t.name}
            </Link>
          ))}
        </div>
      </div>

      {unique.length === 0 ? (
        <EmptyState
          emoji="📭"
          title={platform ? `Nenhuma tendência cadastrada para ${PLATFORM_LABEL[platform]}` : "Nenhuma tendência com esses filtros"}
          description="Só listamos tendências com origem identificável. Administradores podem cadastrar novas em Painel → Virais."
        />
      ) : (
        <>
          {!platform && !year && !type && sort === "popular" && highlighted.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold">⭐ Em destaque</h2>
              <div className="grid gap-5 md:grid-cols-3">
                {highlighted.map(({ card }) => <RecipeCard key={card.id} recipe={card} size="lg" />)}
              </div>
            </section>
          )}

          {withVideo.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold">🎬 Vídeos dos criadores</h2>
              <div className="flex snap-x gap-4 overflow-x-auto pb-2 scrollbar-none">
                {withVideo.map(({ trend, card }) => (
                  <div key={trend.id} className="w-[300px] shrink-0 snap-start space-y-2">
                    <iframe
                      src={trend.embedUrl!}
                      title={`Vídeo de ${trend.creatorName ?? "criador"}: ${card.title}`}
                      className="aspect-[9/16] w-full rounded-3xl border border-border bg-black"
                      allow="encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                    <p className="text-sm font-semibold">{card.title}</p>
                    {trend.creatorUrl && (
                      <a href={trend.creatorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        {trend.creatorName ?? "Criador original"} <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold">🏆 Ranking das virais</h2>
            <ol className="space-y-4">
              {unique.map(({ trend, card }, i) => (
                <li key={card.id} className="grid gap-4 rounded-3xl border border-border bg-card p-3 shadow-soft sm:grid-cols-[48px_220px_1fr] sm:items-center sm:p-4">
                  <span className="hidden text-center font-display text-4xl font-extrabold text-primary sm:block">{i + 1}</span>
                  <Link href={`/receitas/${card.slug}`} className="group relative block">
                    <RecipeCover imageUrl={card.imageUrl} emoji={card.emoji} title={card.title} color={card.color} className="aspect-[16/10] w-full rounded-2xl" emojiClass="text-6xl" sizes="(max-width: 640px) 100vw, 220px" />
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground sm:hidden">#{i + 1}</span>
                    <span className="absolute right-2 top-2"><FavoriteButton recipeId={card.id} /></span>
                  </Link>
                  <div className="space-y-2 px-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{PLATFORM_LABEL[trend.platform]}</Badge>
                      {trend.trendPeriod && <Badge variant="muted">{trend.trendPeriod}</Badge>}
                      {trend.verified ? <Badge variant="accent"><BadgeCheck /> Origem verificada</Badge> : <Badge variant="outline">Criador não verificado</Badge>}
                    </div>
                    <Link href={`/receitas/${card.slug}`} className="block text-lg font-bold hover:text-primary">{card.title}</Link>
                    <p className="text-xs text-muted-foreground">{formatMinutes(card.totalMinutes)} · {DIFFICULTY_LABEL[card.difficulty]}{card.ratingCount > 0 && ` · ★ ${card.ratingAvg.toFixed(1)} (${card.ratingCount})`}</p>
                    {trend.note && <p className="text-muted-foreground">{trend.note}</p>}
                    <div className="flex flex-wrap gap-3">
                      {trend.creatorUrl && (
                        <a href={trend.creatorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                          {trend.creatorName ?? "Criador original"} <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      {trend.postUrl && (
                        <a href={trend.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                          Publicação original <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      {trend.referenceUrl && (
                        <a href={trend.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:underline">
                          Fonte da informação <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
