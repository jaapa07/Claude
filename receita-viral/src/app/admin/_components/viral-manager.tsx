"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, ExternalLink, Info, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/states";
import { api, ApiError, errorMessage } from "@/lib/client";
import { toEmbedUrl } from "@/lib/embed";
import { PLATFORM_LABEL } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";

type Platform = keyof typeof PLATFORM_LABEL;

export interface AdminViral {
  id: string;
  recipeId: string;
  platform: Platform;
  trendYear: number | null;
  trendPeriod: string | null;
  note: string | null;
  creatorName: string | null;
  creatorUrl: string | null;
  postUrl: string | null;
  embedUrl: string | null;
  referenceUrl: string | null;
  verified: boolean;
  highlighted: boolean;
  recipe: { id: string; title: string; slug: string; emoji: string | null };
}

type FormState = {
  recipeId: string;
  platform: Platform;
  trendYear: string;
  trendPeriod: string;
  note: string;
  creatorName: string;
  creatorUrl: string;
  postUrl: string;
  referenceUrl: string;
  verified: boolean;
  highlighted: boolean;
};

const toForm = (v?: AdminViral): FormState => ({
  recipeId: v?.recipeId ?? "",
  platform: v?.platform ?? "TIKTOK",
  trendYear: v?.trendYear ? String(v.trendYear) : "",
  trendPeriod: v?.trendPeriod ?? "",
  note: v?.note ?? "",
  creatorName: v?.creatorName ?? "",
  creatorUrl: v?.creatorUrl ?? "",
  postUrl: v?.postUrl ?? "",
  referenceUrl: v?.referenceUrl ?? "",
  verified: v?.verified ?? false,
  highlighted: v?.highlighted ?? false,
});

const urlOk = (s: string) => !s || /^https?:\/\//.test(s);

export function ViralManager({ trends, recipes }: { trends: AdminViral[]; recipes: { id: string; title: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminViral | null | undefined>(undefined);
  const [form, setForm] = React.useState<FormState>(toForm());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminViral | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function open(v: AdminViral | null) {
    setEditing(v);
    setForm(toForm(v ?? undefined));
    setErrors({});
  }

  const canVerify = !!form.creatorUrl.trim() && !!form.postUrl.trim();
  const embed = toEmbedUrl(form.postUrl.trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.recipeId) errs.recipeId = "Escolha a receita";
    const year = form.trendYear.trim() ? Number(form.trendYear) : null;
    if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) errs.trendYear = "Ano entre 2000 e 2100";
    for (const k of ["creatorUrl", "postUrl", "referenceUrl"] as const) if (!urlOk(form[k].trim())) errs[k] = "URL inválida (use http:// ou https://)";
    if (form.verified && !canVerify) errs.verified = "Preencha o link do criador e do post para marcar como verificado";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = {
        recipeId: form.recipeId,
        platform: form.platform,
        trendYear: year,
        trendPeriod: form.trendPeriod.trim() || null,
        note: form.note.trim() || null,
        creatorName: form.creatorName.trim() || null,
        creatorUrl: form.creatorUrl.trim() || null,
        postUrl: form.postUrl.trim() || null,
        referenceUrl: form.referenceUrl.trim() || null,
        verified: form.verified,
        highlighted: form.highlighted,
      };
      if (editing) await api(`/api/admin/viral/${editing.id}`, { method: "PUT", body });
      else await api("/api/admin/viral", { method: "POST", body });
      toast.success(editing ? "Registro atualizado" : "Registro viral criado");
      setEditing(undefined);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/api/admin/viral/${deleting.id}`, { method: "DELETE" });
      toast.success("Registro removido");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }

  return (
    <>
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          <strong>Não cadastre números de visualizações.</strong> Marque como verificado apenas após conferir o link original e o criador.
          Prefira incorporações oficiais (embed) e sempre dê crédito ao criador.
        </p>
      </div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open(null)} disabled={!recipes.length}><Plus /> Novo registro viral</Button>
      </div>

      {trends.length === 0 ? (
        <EmptyState emoji="🔥" title="Nenhuma receita viral cadastrada" description="Associe uma receita a uma tendência documentada nas redes, com crédito ao criador." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {trends.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden>{t.recipe.emoji ?? "🍽️"}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/receitas/${t.recipe.id}`} className="block truncate font-semibold hover:text-primary">{t.recipe.title}</Link>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{PLATFORM_LABEL[t.platform]}</Badge>
                    {(t.trendPeriod || t.trendYear) && <Badge variant="muted">{t.trendPeriod ?? t.trendYear}</Badge>}
                    {t.verified ? <Badge variant="accent"><BadgeCheck /> Verificado</Badge> : <Badge variant="outline">Não verificado</Badge>}
                    {t.highlighted && <Badge variant="solid"><Sparkles /> Destaque</Badge>}
                    {t.embedUrl && <Badge variant="muted">Embed</Badge>}
                  </div>
                </div>
                <Button size="icon-sm" variant="ghost" aria-label="Editar" onClick={() => open(t)}><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" className="text-danger" aria-label="Excluir" onClick={() => setDeleting(t)}><Trash2 /></Button>
              </div>
              {t.note && <p className="line-clamp-2 text-sm text-muted-foreground">{t.note}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {t.creatorName && <span>Criador: {t.creatorUrl ? <a href={t.creatorUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{t.creatorName}</a> : t.creatorName}</span>}
                {t.postUrl && <a href={t.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3" /> Post original</a>}
                {t.referenceUrl && <a href={t.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3" /> Referência</a>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(o) => !o && !saving && setEditing(undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>{editing ? "Editar registro viral" : "Novo registro viral"}</DialogTitle>
          <DialogDescription>Não cadastre números de visualizações. Marque como verificado apenas após conferir o link original e o criador.</DialogDescription>
          <form onSubmit={save} noValidate className="mt-5 space-y-4 [&_[aria-invalid=true]]:border-danger">
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <div>
                <Label htmlFor="vt-recipe">Receita *</Label>
                <NativeSelect id="vt-recipe" value={form.recipeId} aria-invalid={!!errors.recipeId || undefined} onChange={(e) => set("recipeId", e.target.value)}>
                  <option value="">Selecione…</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </NativeSelect>
                <FieldError>{errors.recipeId}</FieldError>
              </div>
              <div>
                <Label htmlFor="vt-platform">Plataforma</Label>
                <NativeSelect id="vt-platform" value={form.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
                  {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="vt-year">Ano</Label>
                <Input id="vt-year" inputMode="numeric" value={form.trendYear} placeholder="2021" aria-invalid={!!errors.trendYear || undefined} onChange={(e) => set("trendYear", e.target.value)} />
                <FieldError>{errors.trendYear}</FieldError>
              </div>
              <div>
                <Label htmlFor="vt-period">Período</Label>
                <Input id="vt-period" value={form.trendPeriod} maxLength={40} placeholder="Verão de 2021" onChange={(e) => set("trendPeriod", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="vt-note">Nota</Label>
              <Textarea id="vt-note" value={form.note} maxLength={600} className="min-h-20" placeholder="Contexto da tendência, sem números de visualização." onChange={(e) => set("note", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="vt-cname">Nome do criador</Label>
                <Input id="vt-cname" value={form.creatorName} maxLength={80} onChange={(e) => set("creatorName", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="vt-curl">Link do criador</Label>
                <Input id="vt-curl" value={form.creatorUrl} placeholder="https://" aria-invalid={!!errors.creatorUrl || undefined} onChange={(e) => set("creatorUrl", e.target.value)} />
                <FieldError>{errors.creatorUrl}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="vt-post">Link do post original</Label>
              <Input id="vt-post" value={form.postUrl} placeholder="https://www.tiktok.com/@criador/video/…" aria-invalid={!!errors.postUrl || undefined} onChange={(e) => set("postUrl", e.target.value)} />
              <FieldError>{errors.postUrl}</FieldError>
              {form.postUrl.trim() && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-muted">
                  {embed ? (
                    <iframe src={embed} title="Pré-visualização do post" className="mx-auto aspect-[9/12] w-full max-w-sm" loading="lazy" allow="encrypted-media" allowFullScreen />
                  ) : (
                    <p className="p-3 text-xs text-muted-foreground">Sem incorporação oficial para este link — será exibido apenas como link.</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="vt-ref">Link de referência (matéria, reportagem)</Label>
              <Input id="vt-ref" value={form.referenceUrl} placeholder="https://" aria-invalid={!!errors.referenceUrl || undefined} onChange={(e) => set("referenceUrl", e.target.value)} />
              <FieldError>{errors.referenceUrl}</FieldError>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-sm">
                  <span className="block font-semibold">Verificado</span>
                  <span className="text-xs text-muted-foreground">{canVerify ? "Conferi link e criador" : "Requer link do criador e do post"}</span>
                </span>
                <Switch checked={form.verified} disabled={!canVerify && !form.verified} onCheckedChange={(c) => set("verified", c)} aria-label="Verificado" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-sm font-semibold">Destaque</span>
                <Switch checked={form.highlighted} onCheckedChange={(c) => set("highlighted", c)} aria-label="Destaque" />
              </label>
            </div>
            <FieldError>{errors.verified}</FieldError>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(undefined)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner />}{editing ? "Salvar" : "Criar registro"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Excluir registro viral?" description={deleting ? `A receita “${deleting.recipe.title}” continua existindo; apenas a marcação viral é removida.` : undefined} confirmLabel="Excluir" onConfirm={remove} />
    </>
  );
}
