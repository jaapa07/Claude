"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/states";
import { ImageField } from "@/components/recipe-form/media-upload";
import { api, ApiError, errorMessage } from "@/lib/client";
import { slugify } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  type: "CUISINE" | "DISH_TYPE";
  description: string | null;
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
  sortOrder: number;
  recipeCount: number;
}

const TYPE_LABEL = { CUISINE: "Cozinha", DISH_TYPE: "Tipo de prato" } as const;

type FormState = { name: string; slug: string; type: "CUISINE" | "DISH_TYPE"; emoji: string; color: string; useColor: boolean; description: string; imageUrl: string; sortOrder: string };

const toForm = (c?: AdminCategory): FormState => ({
  name: c?.name ?? "",
  slug: c?.slug ?? "",
  type: c?.type ?? "DISH_TYPE",
  emoji: c?.emoji ?? "",
  color: c?.color ?? "#f2600c",
  useColor: !!c?.color || !c,
  description: c?.description ?? "",
  imageUrl: c?.imageUrl ?? "",
  sortOrder: String(c?.sortOrder ?? 0),
});

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminCategory | null | undefined>(undefined); // undefined = fechado, null = nova
  const [form, setForm] = React.useState<FormState>(toForm());
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminCategory | null>(null);

  function open(c: AdminCategory | null) {
    setEditing(c);
    setForm(toForm(c ?? undefined));
    setSlugTouched(!!c);
    setErrors({});
  }
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Nome precisa ter pelo menos 2 caracteres";
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) errs.slug = "Use apenas letras minúsculas, números e hífens";
    const order = Number(form.sortOrder || 0);
    if (!Number.isInteger(order) || order < 0 || order > 999) errs.sortOrder = "Ordem entre 0 e 999";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        type: form.type,
        emoji: form.emoji.trim() || null,
        color: form.useColor ? form.color : null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        sortOrder: order,
      };
      if (editing) await api(`/api/admin/categories/${editing.id}`, { method: "PUT", body });
      else await api("/api/admin/categories", { method: "POST", body });
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      setEditing(undefined);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      if (err instanceof ApiError && err.status === 409) setErrors({ slug: err.message });
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/api/admin/categories/${deleting.id}${deleting.recipeCount > 0 ? "?force=1" : ""}`, { method: "DELETE" });
      toast.success("Categoria excluída");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }

  const groups = (["CUISINE", "DISH_TYPE"] as const).map((t) => ({ type: t, items: categories.filter((c) => c.type === t) }));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open(null)}><Plus /> Nova categoria</Button>
      </div>
      {categories.length === 0 ? (
        <EmptyState emoji="🏷️" title="Nenhuma categoria" description="Crie cozinhas (ex.: Italiana) e tipos de prato (ex.: Sobremesas)." />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.type}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{g.type === "CUISINE" ? "Cozinhas" : "Tipos de prato"} ({g.items.length})</h2>
              {g.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma categoria deste tipo.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: c.color ? `${c.color}26` : "var(--muted)" }}>
                        {c.emoji ?? "🏷️"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">/{c.slug} · ordem {c.sortOrder}</p>
                        <Badge variant="muted" className="mt-1">{c.recipeCount} receita(s)</Badge>
                      </div>
                      <Button size="icon-sm" variant="ghost" aria-label={`Editar ${c.name}`} onClick={() => open(c)}><Pencil /></Button>
                      <Button size="icon-sm" variant="ghost" className="text-danger" aria-label={`Excluir ${c.name}`} onClick={() => setDeleting(c)}><Trash2 /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(o) => !o && !saving && setEditing(undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Cozinhas agrupam por origem; tipos de prato, por ocasião ou formato.</DialogDescription>
          <form onSubmit={save} noValidate className="mt-5 space-y-4 [&_[aria-invalid=true]]:border-danger">
            <div className="grid gap-4 sm:grid-cols-[1fr_5rem]">
              <div>
                <Label htmlFor="cat-name">Nome *</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  aria-invalid={!!errors.name || undefined}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value));
                  }}
                />
                <FieldError>{errors.name}</FieldError>
              </div>
              <div>
                <Label htmlFor="cat-emoji">Emoji</Label>
                <Input id="cat-emoji" value={form.emoji} maxLength={8} className="text-center text-lg" onChange={(e) => set("emoji", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="cat-slug">Slug</Label>
                <Input id="cat-slug" value={form.slug} aria-invalid={!!errors.slug || undefined} placeholder="gerado do nome" onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} />
                <FieldError>{errors.slug}</FieldError>
              </div>
              <div>
                <Label htmlFor="cat-type">Tipo</Label>
                <NativeSelect id="cat-type" value={form.type} onChange={(e) => set("type", e.target.value as FormState["type"])}>
                  <option value="CUISINE">{TYPE_LABEL.CUISINE}</option>
                  <option value="DISH_TYPE">{TYPE_LABEL.DISH_TYPE}</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="cat-order">Ordem</Label>
                <Input id="cat-order" inputMode="numeric" value={form.sortOrder} aria-invalid={!!errors.sortOrder || undefined} onChange={(e) => set("sortOrder", e.target.value)} />
                <FieldError>{errors.sortOrder}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="cat-color">Cor</Label>
              <div className="flex items-center gap-3">
                <input id="cat-color" type="color" value={form.color} disabled={!form.useColor} onChange={(e) => set("color", e.target.value)} className="h-11 w-16 cursor-pointer rounded-xl border border-input bg-card p-1 disabled:opacity-40" />
                <code className="text-sm text-muted-foreground">{form.useColor ? form.color : "sem cor"}</code>
                <label className="ml-auto flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.useColor} onChange={(e) => set("useColor", e.target.checked)} className="size-4 accent-[var(--primary)]" />
                  Usar cor
                </label>
              </div>
              <FieldError>{errors.color}</FieldError>
            </div>
            <div>
              <Label htmlFor="cat-desc">Descrição</Label>
              <Textarea id="cat-desc" value={form.description} maxLength={300} onChange={(e) => set("description", e.target.value)} className="min-h-20" />
              <FieldError>{errors.description}</FieldError>
            </div>
            <div>
              <Label htmlFor="cat-img">Imagem</Label>
              <ImageField id="cat-img" value={form.imageUrl} onChange={(url) => set("imageUrl", url)} invalid={!!errors.imageUrl} />
              <FieldError>{errors.imageUrl}</FieldError>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(undefined)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner />}{editing ? "Salvar" : "Criar categoria"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Excluir “${deleting?.name ?? ""}”?`}
        description={
          deleting && deleting.recipeCount > 0
            ? `Esta categoria tem ${deleting.recipeCount} receita(s). Elas serão desvinculadas (não serão excluídas).`
            : "Esta ação não pode ser desfeita."
        }
        confirmLabel={deleting && deleting.recipeCount > 0 ? "Desvincular e excluir" : "Excluir"}
        onConfirm={remove}
      />
    </>
  );
}
