import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, CalendarDays, ChefHat, FolderHeart, Heart, Settings, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cardSelect, toCards } from "@/lib/recipes";
import { RecipeGrid } from "@/components/recipe/recipe-card";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { Avatar } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ClearHistoryButton, SectionHeader } from "./_components";
import { CollectionCover } from "./colecoes/_components";

export const metadata: Metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export default async function AccountPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?next=/conta");

  const [user, favorites, collections, cookedGroups, history, unread] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: current.id },
      select: {
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: { select: { favorites: true, collections: true, cookedLogs: true, recipes: true } },
      },
    }),
    prisma.favorite.findMany({
      where: { userId: current.id, recipe: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { recipe: { select: cardSelect } },
    }),
    prisma.collection.findMany({
      where: { userId: current.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        _count: { select: { items: true } },
        items: { orderBy: { addedAt: "desc" }, take: 4, select: { recipe: { select: { id: true, title: true, imageUrl: true, emoji: true } } } },
      },
    }),
    prisma.cookedLog.groupBy({
      by: ["recipeId"],
      where: { userId: current.id },
      _count: { _all: true },
      _max: { cookedAt: true },
      orderBy: { _max: { cookedAt: "desc" } },
      take: 8,
    }),
    prisma.viewHistory.findMany({
      where: { userId: current.id, recipe: { status: "PUBLISHED" } },
      orderBy: { viewedAt: "desc" },
      take: 8,
      select: { recipe: { select: cardSelect } },
    }),
    prisma.notification.count({ where: { userId: current.id, read: false } }),
  ]);

  const cookedRecipes = await prisma.recipe.findMany({
    where: { id: { in: cookedGroups.map((g) => g.recipeId) } },
    select: { id: true, slug: true, title: true, emoji: true, imageUrl: true },
  });
  const cooked = cookedGroups
    .map((g) => ({ recipe: cookedRecipes.find((r) => r.id === g.recipeId), count: g._count._all, last: g._max.cookedAt }))
    .filter((c): c is typeof c & { recipe: NonNullable<typeof c.recipe> } => Boolean(c.recipe));

  const [favCards, historyCards] = await Promise.all([toCards(favorites.map((f) => f.recipe)), toCards(history.map((h) => h.recipe))]);

  const stats = [
    { label: "Favoritas", value: user._count.favorites },
    { label: "Coleções", value: user._count.collections },
    { label: "Vezes que cozinhou", value: user._count.cookedLogs },
    { label: "Receitas enviadas", value: user._count.recipes },
  ];

  const links = [
    { href: "/conta/favoritos", label: "Favoritos", icon: Heart, desc: "Receitas que você amou" },
    { href: "/conta/colecoes", label: "Coleções", icon: FolderHeart, desc: "Organize por ocasião" },
    { href: "/conta/receitas", label: "Minhas receitas", icon: BookOpen, desc: "Envie e acompanhe" },
    { href: "/planejador", label: "Planejador", icon: CalendarDays, desc: "Cardápio da semana" },
    { href: "/compras", label: "Listas de compras", icon: ShoppingCart, desc: "Tudo para o mercado" },
    { href: "/conta/notificacoes", label: "Notificações", icon: Bell, desc: unread ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia" },
    { href: "/conta/preferencias", label: "Preferências", icon: Settings, desc: "Perfil, dieta e senha" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6">
      {/* Cabeçalho do perfil */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary-soft blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={user.name} url={user.avatarUrl} className="size-20 text-2xl sm:size-24" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Olá, {user.name.split(" ")[0]}!</h1>
            <p className="mt-1 text-sm text-muted-foreground">Membro desde {dateFmt.format(user.createdAt)}</p>
            {user.bio && <p className="mt-2 max-w-2xl text-sm">{user.bio}</p>}
          </div>
          <Button asChild variant="outline" className="self-start sm:self-center">
            <Link href="/conta/preferencias"><Settings /> Editar perfil</Link>
          </Button>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted px-4 py-3">
              <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
              <dd className="text-2xl font-bold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Atalhos */}
      <section aria-label="Atalhos">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {links.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:scale-110">
                <Icon className="size-5" />
              </span>
              <span className="font-semibold leading-tight">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Favoritas */}
      <section>
        <SectionHeader title="Favoritas" href={favCards.length ? "/conta/favoritos" : undefined} />
        {favCards.length ? (
          <RecipeGrid recipes={favCards} />
        ) : (
          <EmptyState
            emoji="💛"
            title="Nenhuma favorita ainda"
            description="Toque no coração das receitas que você gostar para encontrá-las aqui."
            action={<Button asChild><Link href="/receitas">Explorar receitas</Link></Button>}
          />
        )}
      </section>

      {/* Coleções */}
      <section>
        <SectionHeader title="Coleções" href="/conta/colecoes" linkLabel={collections.length ? "Ver todas" : "Criar coleção"} />
        {collections.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {collections.map((c) => (
              <Link key={c.id} href={`/conta/colecoes/${c.id}`} className="group block">
                <CollectionCover covers={c.items.map((i) => i.recipe)} className="aspect-square" />
                <p className="mt-2 line-clamp-1 font-semibold group-hover:text-primary">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c._count.items} receita{c._count.items === 1 ? "" : "s"}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState emoji="📚" title="Organize suas receitas" description="Crie coleções como “Jantar rápido” ou “Festa junina”." />
        )}
      </section>

      {/* Receitas preparadas */}
      <section>
        <SectionHeader title="Receitas preparadas" />
        {cooked.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cooked.map(({ recipe, count, last }) => (
              <li key={recipe.id}>
                <Link href={`/receitas/${recipe.slug}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft hover:border-primary/40">
                  <RecipeCover imageUrl={recipe.imageUrl} emoji={recipe.emoji} title={recipe.title} className="size-14 shrink-0 rounded-xl" emojiClass="text-3xl" sizes="56px" />
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-semibold group-hover:text-primary">{recipe.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ChefHat className="size-3.5" /> {count}× · última em {last ? dayFmt.format(last) : "—"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState emoji="👩‍🍳" title="Nada preparado ainda" description="Na página da receita, marque “Já preparei” para registrar o que você cozinhou." />
        )}
      </section>

      {/* Vistas recentemente */}
      <section>
        <SectionHeader title="Vistas recentemente">{historyCards.length > 0 && <ClearHistoryButton />}</SectionHeader>
        {historyCards.length ? (
          <RecipeGrid recipes={historyCards} />
        ) : (
          <EmptyState emoji="👀" title="Seu histórico está vazio" description="As receitas que você abrir aparecem aqui." />
        )}
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary-soft p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold">Minhas receitas</h2>
          <p className="text-sm text-muted-foreground">Compartilhe suas criações com a comunidade e acompanhe a aprovação.</p>
        </div>
        <Button asChild><Link href="/conta/receitas"><BookOpen /> Ver minhas receitas</Link></Button>
      </section>
    </div>
  );
}
