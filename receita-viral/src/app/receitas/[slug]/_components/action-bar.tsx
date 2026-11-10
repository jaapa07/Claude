"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, ChefHat, Check, Copy, FolderPlus, Printer, Share2 } from "lucide-react";
import { useSession } from "@/components/providers";
import { FavoriteButton } from "@/components/recipe/favorite-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/client";
import { MEAL_LABEL, MEAL_ORDER, WEEKDAYS } from "@/lib/utils";
import { isoDate, weekStartOf, addDays } from "@/lib/week";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
    </svg>
  );
}

export function ActionBar({ recipe }: { recipe: { id: string; slug: string; title: string; description: string } }) {
  const user = useSession();
  const router = useRouter();
  const [collectionsOpen, setCollectionsOpen] = React.useState(false);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [cooked, setCooked] = React.useState<number | null>(null);

  const url = typeof window !== "undefined" ? `${window.location.origin}/receitas/${recipe.slug}` : `/receitas/${recipe.slug}`;
  const shareText = `${recipe.title} — receita no Receita Viral 🔥`;

  const requireLogin = (what: string) => {
    toast(`Entre na sua conta para ${what}`, { action: { label: "Entrar", onClick: () => router.push(`/entrar?next=/receitas/${recipe.slug}`) } });
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, text: shareText, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  const markCooked = async () => {
    if (!user) return requireLogin("registrar receitas preparadas");
    try {
      const res = await api<{ count: number }>(`/api/recipes/${recipe.id}/cooked`, { body: {} });
      setCooked(res.count);
      toast.success(`Anotado! Você já preparou esta receita ${res.count}× 👩‍🍳`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button asChild size="lg" className="flex-1 sm:flex-none">
        <Link href={`/receitas/${recipe.slug}/cozinhar`}><ChefHat /> Modo Cozinha</Link>
      </Button>
      <FavoriteButton recipeId={recipe.id} withLabel />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline"><Share2 /> Compartilhar</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> WhatsApp</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">📘 Facebook</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">𝕏 X / Twitter</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(recipe.title)}`} target="_blank" rel="noopener noreferrer">📌 Pinterest</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">✈️ Telegram</a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={async () => {
              await navigator.clipboard.writeText(url);
              toast.success("Link copiado!");
            }}
          >
            <Copy /> Copiar link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={nativeShare}><Share2 /> Mais opções…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="Imprimir receita" title="Imprimir">
        <Printer />
      </Button>
      <Button variant="outline" size="icon" onClick={() => (user ? setCollectionsOpen(true) : requireLogin("criar coleções"))} aria-label="Adicionar à coleção" title="Adicionar à coleção">
        <FolderPlus />
      </Button>
      <Button variant="outline" size="icon" onClick={() => (user ? setPlanOpen(true) : requireLogin("planejar refeições"))} aria-label="Adicionar ao planejador" title="Adicionar ao planejador">
        <CalendarPlus />
      </Button>
      <Button variant="ghost" onClick={markCooked}>
        <Check /> {cooked ? `Preparei (${cooked}×)` : "Já preparei"}
      </Button>
      {collectionsOpen && <CollectionsDialog recipeId={recipe.id} onClose={() => setCollectionsOpen(false)} />}
      {planOpen && <PlanDialog recipeId={recipe.id} onClose={() => setPlanOpen(false)} />}
    </div>
  );
}

function CollectionsDialog({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const [collections, setCollections] = React.useState<{ id: string; name: string }[] | null>(null);
  const [name, setName] = React.useState("");
  React.useEffect(() => {
    api<{ collections: { id: string; name: string }[] }>("/api/collections")
      .then((d) => setCollections(d.collections))
      .catch((e) => {
        toast.error(errorMessage(e));
        setCollections([]);
      });
  }, []);
  const add = async (collectionId: string, label: string) => {
    try {
      await api(`/api/collections/${collectionId}/items`, { body: { recipeId } });
      toast.success(`Adicionada a “${label}”`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api<{ collection: { id: string; name: string } }>("/api/collections", { body: { name } });
      await add(res.collection.id, res.collection.name);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Salvar em uma coleção</DialogTitle>
        <DialogDescription>Organize receitas por ocasião, dieta ou como preferir.</DialogDescription>
        <div className="mt-4 space-y-2">
          {collections === null && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {collections?.map((c) => (
            <button key={c.id} onClick={() => add(c.id, c.name)} className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-sm font-semibold hover:bg-muted">
              {c.name} <FolderPlus className="size-4 text-muted-foreground" />
            </button>
          ))}
          {collections?.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não tem coleções. Crie a primeira:</p>}
        </div>
        <form onSubmit={create} className="mt-4 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova coleção (ex.: Jantares rápidos)" minLength={2} required />
          <Button type="submit">Criar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const router = useRouter();
  const thisWeek = weekStartOf(new Date());
  const [week, setWeek] = React.useState(isoDate(thisWeek));
  const [day, setDay] = React.useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });
  const [meal, setMeal] = React.useState<(typeof MEAL_ORDER)[number]>("DINNER");
  const [servings, setServings] = React.useState(() => {
    try {
      return Number(sessionStorage.getItem(`rv-servings-${recipeId}`)) || 2;
    } catch {
      return 2;
    }
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/mealplan/entries", { body: { weekStart: week, dayIndex: day, mealType: meal, recipeId, servings } });
      toast.success("Adicionada ao planejador", { action: { label: "Ver semana", onClick: () => router.push(`/planejador?week=${week}`) } });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Adicionar ao planejador</DialogTitle>
        <DialogDescription>Escolha a semana, o dia e a refeição.</DialogDescription>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pl-week">Semana</Label>
            <NativeSelect id="pl-week" value={week} onChange={(e) => setWeek(e.target.value)}>
              {[0, 1, 2].map((n) => {
                const w = addDays(thisWeek, n * 7);
                return <option key={n} value={isoDate(w)}>{n === 0 ? "Esta semana" : n === 1 ? "Próxima semana" : "Daqui a 2 semanas"}</option>;
              })}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="pl-day">Dia</Label>
            <NativeSelect id="pl-day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="pl-meal">Refeição</Label>
            <NativeSelect id="pl-meal" value={meal} onChange={(e) => setMeal(e.target.value as typeof meal)}>
              {MEAL_ORDER.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="pl-serv">Porções</Label>
            <Input id="pl-serv" type="number" min={1} max={50} value={servings} onChange={(e) => setServings(Number(e.target.value) || 1)} />
          </div>
          <Button type="submit" className="sm:col-span-2">Adicionar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
