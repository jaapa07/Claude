"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { cn } from "@/lib/utils";
import { RecipeCover } from "@/components/recipe/recipe-cover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { EmptyState, Spinner } from "@/components/ui/states";

type Cover = { id: string; title: string; imageUrl: string | null; emoji: string | null };

/** Mosaico com até 4 capas das receitas da coleção. */
export function CollectionCover({ covers, className }: { covers: Cover[]; className?: string }) {
  if (!covers.length) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-muted text-5xl", className)} aria-hidden>
        📚
      </div>
    );
  }
  const four = covers.slice(0, 4);
  return (
    <div className={cn("grid overflow-hidden rounded-2xl bg-muted", four.length > 1 ? "grid-cols-2 grid-rows-2 gap-0.5" : "", className)}>
      {four.map((c, i) => (
        <RecipeCover
          key={c.id}
          imageUrl={c.imageUrl}
          emoji={c.emoji}
          title={c.title}
          sizes="200px"
          emojiClass={four.length > 1 ? "text-3xl" : "text-6xl"}
          className={cn("h-full w-full", four.length === 2 && "row-span-2", four.length === 3 && i === 0 && "row-span-2")}
        />
      ))}
    </div>
  );
}

type CollectionForm = { id?: string; name: string; description: string };

/** Diálogo de criar/editar coleção. */
export function CollectionDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CollectionForm;
  onSaved?: (c: { id: string; name: string }) => void;
}) {
  const [form, setForm] = React.useState<CollectionForm>(initial ?? { name: "", description: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(initial ?? { name: "", description: "" });
      setError(null);
    }
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("O nome precisa ter pelo menos 2 caracteres");
    setBusy(true);
    try {
      const body = { name: form.name, description: form.description || null };
      const res = initial?.id
        ? await api<{ collection: { id: string; name: string } }>(`/api/collections/${initial.id}`, { method: "PUT", body })
        : await api<{ collection: { id: string; name: string } }>("/api/collections", { body });
      toast.success(initial?.id ? "Coleção atualizada" : "Coleção criada");
      onOpenChange(false);
      onSaved?.(res.collection);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{initial?.id ? "Editar coleção" : "Nova coleção"}</DialogTitle>
        <DialogDescription>Agrupe receitas por ocasião, dieta ou o que você quiser.</DialogDescription>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="col-name">Nome</Label>
            <Input id="col-name" autoFocus maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Jantar rápido" />
          </div>
          <div>
            <Label htmlFor="col-desc">Descrição (opcional)</Label>
            <Textarea id="col-desc" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy && <Spinner />} Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type CollectionSummary = { id: string; name: string; description: string | null; count: number; covers: Cover[] };

export function CollectionsManager({ collections }: { collections: CollectionSummary[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CollectionForm | undefined>();

  const remove = async (c: CollectionSummary) => {
    if (!confirm(`Excluir a coleção “${c.name}”? As receitas não serão apagadas.`)) return;
    try {
      await api(`/api/collections/${c.id}`, { method: "DELETE" });
      toast.success("Coleção excluída");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Coleções</h1>
          <p className="text-sm text-muted-foreground">{collections.length} coleç{collections.length === 1 ? "ão" : "ões"}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus /> Nova coleção</Button>
      </div>

      {collections.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collections.map((c) => (
            <div key={c.id} className="group relative rounded-3xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <Link href={`/conta/colecoes/${c.id}`} className="block">
                <CollectionCover covers={c.covers} className="aspect-[4/3]" />
                <div className="px-1 pb-1 pt-3 pr-10">
                  <h2 className="line-clamp-1 font-bold group-hover:text-primary">{c.name}</h2>
                  <p className="text-xs text-muted-foreground">{c.count} receita{c.count === 1 ? "" : "s"}</p>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="absolute bottom-3 right-3" aria-label={`Opções de ${c.name}`}>
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing({ id: c.id, name: c.name, description: c.description ?? "" })}>
                    <Pencil /> Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => remove(c)} className="text-danger">
                    <Trash2 className="!text-danger" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="📚"
          title="Você ainda não tem coleções"
          description="Crie uma coleção e adicione receitas a ela pela página de cada receita."
          action={<Button onClick={() => setCreateOpen(true)}><Plus /> Criar primeira coleção</Button>}
        />
      )}

      <CollectionDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => router.refresh()} />
      <CollectionDialog open={!!editing} onOpenChange={(v) => !v && setEditing(undefined)} initial={editing} onSaved={() => router.refresh()} />
    </>
  );
}

/** Ações do cabeçalho da página de uma coleção. */
export function CollectionHeaderActions({ id, name, description }: { id: string; name: string; description: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const initial = React.useMemo(() => ({ id, name, description: description ?? "" }), [id, name, description]);
  const remove = async () => {
    if (!confirm(`Excluir a coleção “${name}”?`)) return;
    try {
      await api(`/api/collections/${id}`, { method: "DELETE" });
      toast.success("Coleção excluída");
      router.push("/conta/colecoes");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Pencil /> Editar</Button>
      <Button variant="ghost" size="sm" className="text-danger" onClick={remove}><Trash2 /> Excluir</Button>
      <CollectionDialog open={open} onOpenChange={setOpen} initial={initial} onSaved={() => router.refresh()} />
    </div>
  );
}

export function RemoveFromCollectionButton({ collectionId, recipeId, title }: { collectionId: string; recipeId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/collections/${collectionId}/items?recipeId=${encodeURIComponent(recipeId)}`, { method: "DELETE" });
      toast.success("Removida da coleção");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Remover ${title} da coleção`}
      title="Remover da coleção"
      className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-soft backdrop-blur transition hover:bg-danger hover:text-white disabled:opacity-50"
    >
      {busy ? <Spinner /> : <X className="size-4" />}
    </button>
  );
}
