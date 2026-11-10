"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, ExternalLink, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/states";
import { api, ApiError, errorMessage } from "@/lib/client";
import { ConfirmDialog } from "./confirm-dialog";

type SourceType = "JSON_LD" | "API" | "MANUAL";
const TYPE_LABEL: Record<SourceType, string> = { JSON_LD: "Dados estruturados (JSON-LD)", API: "API oficial", MANUAL: "Cadastro manual" };

export interface AdminSource {
  id: string;
  name: string;
  baseUrl: string;
  type: SourceType;
  license: string | null;
  termsUrl: string | null;
  allowImport: boolean;
  active: boolean;
  apiKeyEnv: string | null;
  notes: string | null;
  apiKeyConfigured: boolean;
  recipeCount: number;
}

type FormState = Omit<AdminSource, "id" | "apiKeyConfigured" | "recipeCount" | "license" | "termsUrl" | "apiKeyEnv" | "notes"> & {
  license: string;
  termsUrl: string;
  apiKeyEnv: string;
  notes: string;
};

const toForm = (s?: AdminSource): FormState => ({
  name: s?.name ?? "",
  baseUrl: s?.baseUrl ?? "https://",
  type: s?.type ?? "JSON_LD",
  license: s?.license ?? "",
  termsUrl: s?.termsUrl ?? "",
  allowImport: s?.allowImport ?? false,
  active: s?.active ?? true,
  apiKeyEnv: s?.apiKeyEnv ?? "",
  notes: s?.notes ?? "",
});

function KeyBadge({ s }: { s: Pick<AdminSource, "apiKeyEnv" | "apiKeyConfigured"> }) {
  if (!s.apiKeyEnv) return null;
  return s.apiKeyConfigured ? (
    <Badge variant="accent"><KeyRound /> Chave configurada</Badge>
  ) : (
    <Badge variant="danger"><KeyRound /> Chave ausente</Badge>
  );
}

export function SourceManager({ sources }: { sources: AdminSource[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminSource | null | undefined>(undefined);
  const [form, setForm] = React.useState<FormState>(toForm());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminSource | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function open(s: AdminSource | null) {
    setEditing(s);
    setForm(toForm(s ?? undefined));
    setErrors({});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Nome precisa ter pelo menos 2 caracteres";
    try {
      const u = new URL(form.baseUrl.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      errs.baseUrl = "Informe a URL do site (https://…)";
    }
    if (form.termsUrl.trim() && !/^https?:\/\//.test(form.termsUrl.trim())) errs.termsUrl = "URL inválida";
    if (form.apiKeyEnv && !/^[A-Z0-9_]+$/.test(form.apiKeyEnv)) errs.apiKeyEnv = "Use o NOME da variável de ambiente (ex.: SPOONACULAR_API_KEY), nunca a chave";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        type: form.type,
        license: form.license.trim() || null,
        termsUrl: form.termsUrl.trim() || null,
        allowImport: form.allowImport,
        active: form.active,
        apiKeyEnv: form.apiKeyEnv.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) await api(`/api/admin/sources/${editing.id}`, { method: "PUT", body });
      else await api("/api/admin/sources", { method: "POST", body });
      toast.success(editing ? "Fonte atualizada" : "Fonte cadastrada");
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
      await api(`/api/admin/sources/${deleting.id}`, { method: "DELETE" });
      toast.success("Fonte removida");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Fontes cadastradas</h2>
        <Button onClick={() => open(null)}><Plus /> Nova fonte</Button>
      </div>
      {sources.length === 0 ? (
        <EmptyState emoji="🔌" title="Nenhuma fonte cadastrada" description="Cadastre apenas sites e APIs cujos termos de uso permitam reutilizar dados de receitas." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <a href={s.baseUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">{s.baseUrl}</a>
                </div>
                <Button size="icon-sm" variant="ghost" aria-label={`Editar ${s.name}`} onClick={() => open(s)}><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" className="text-danger" aria-label={`Excluir ${s.name}`} onClick={() => setDeleting(s)}><Trash2 /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={s.active ? "accent" : "muted"}>{s.active ? "Ativa" : "Inativa"}</Badge>
                <Badge variant="outline">{TYPE_LABEL[s.type]}</Badge>
                <Badge variant={s.allowImport ? "default" : "muted"}>{s.allowImport ? "Importação autorizada" : "Sem importação"}</Badge>
                <KeyBadge s={s} />
              </div>
              <div className="text-xs text-muted-foreground">
                {s.license && <p>Licença: {s.license}</p>}
                {s.termsUrl && <a href={s.termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3" /> Termos de uso</a>}
                {s.apiKeyEnv && <p>Variável: <code>{s.apiKeyEnv}</code></p>}
                <p>{s.recipeCount} receita(s) vinculada(s)</p>
                {s.notes && <p className="mt-1 line-clamp-2">{s.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(o) => !o && !saving && setEditing(undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>{editing ? "Editar fonte" : "Nova fonte"}</DialogTitle>
          <DialogDescription>Confira os termos de uso da fonte antes de autorizar importações.</DialogDescription>
          <form onSubmit={save} noValidate className="mt-5 space-y-4 [&_[aria-invalid=true]]:border-danger">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="src-name">Nome *</Label>
                <Input id="src-name" value={form.name} maxLength={80} aria-invalid={!!errors.name || undefined} onChange={(e) => set("name", e.target.value)} />
                <FieldError>{errors.name}</FieldError>
              </div>
              <div>
                <Label htmlFor="src-url">URL base *</Label>
                <Input id="src-url" value={form.baseUrl} aria-invalid={!!errors.baseUrl || undefined} onChange={(e) => set("baseUrl", e.target.value)} />
                <FieldError>{errors.baseUrl}</FieldError>
              </div>
              <div>
                <Label htmlFor="src-type">Tipo</Label>
                <NativeSelect id="src-type" value={form.type} onChange={(e) => set("type", e.target.value as SourceType)}>
                  {(Object.keys(TYPE_LABEL) as SourceType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="src-license">Licença</Label>
                <Input id="src-license" value={form.license} maxLength={200} placeholder="Ex.: CC BY 4.0 / contrato de parceria" onChange={(e) => set("license", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="src-terms">URL dos termos de uso</Label>
                <Input id="src-terms" value={form.termsUrl} placeholder="https://" aria-invalid={!!errors.termsUrl || undefined} onChange={(e) => set("termsUrl", e.target.value)} />
                <FieldError>{errors.termsUrl}</FieldError>
              </div>
              <div>
                <Label htmlFor="src-env">Variável de ambiente da chave de API</Label>
                <Input id="src-env" value={form.apiKeyEnv} maxLength={60} placeholder="EX_API_KEY" aria-invalid={!!errors.apiKeyEnv || undefined} onChange={(e) => set("apiKeyEnv", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} />
                <p className="mt-1 text-xs text-muted-foreground">Guarde a chave no servidor (.env). Aqui vai só o nome da variável.</p>
                <FieldError>{errors.apiKeyEnv}</FieldError>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-sm font-semibold">Ativa</span>
                <Switch checked={form.active} onCheckedChange={(c) => set("active", c)} aria-label="Ativa" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-sm">
                  <span className="block font-semibold">Permite importação</span>
                  <span className="text-xs text-muted-foreground">Somente com autorização da fonte</span>
                </span>
                <Switch checked={form.allowImport} onCheckedChange={(c) => set("allowImport", c)} aria-label="Permite importação" />
              </label>
            </div>
            <div>
              <Label htmlFor="src-notes">Notas</Label>
              <Textarea id="src-notes" value={form.notes} maxLength={600} className="min-h-20" placeholder="Contato, escopo da autorização, data do acordo…" onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(undefined)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner />}{editing ? "Salvar" : "Cadastrar fonte"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Excluir “${deleting?.name ?? ""}”?`}
        description={deleting && deleting.recipeCount > 0 ? `${deleting.recipeCount} receita(s) perderão o vínculo com a fonte, mas mantêm o link e o crédito.` : "Esta ação não pode ser desfeita."}
        confirmLabel="Excluir"
        onConfirm={remove}
      />
    </>
  );
}

export function ImportPanel({ sources }: { sources: Pick<AdminSource, "id" | "name" | "baseUrl" | "allowImport" | "active">[] }) {
  const router = useRouter();
  const eligible = sources.filter((s) => s.allowImport && s.active);
  const [sourceId, setSourceId] = React.useState(eligible[0]?.id ?? "");
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ id: string; slug: string } | null>(null);
  const selected = eligible.find((s) => s.id === sourceId);

  React.useEffect(() => {
    if (!eligible.some((s) => s.id === sourceId)) setSourceId(eligible[0]?.id ?? "");
  }, [eligible, sourceId]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (!sourceId) return setError("Escolha uma fonte autorizada");
    if (!/^https?:\/\//.test(url.trim())) return setError("Cole o link completo da receita (https://…)");
    setBusy(true);
    try {
      const res = await api<{ recipe: { id: string; slug: string } }>("/api/admin/import", { body: { sourceId, url: url.trim() } });
      setCreated(res.recipe);
      setUrl("");
      toast.success("Rascunho criado a partir da fonte");
      router.refresh();
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Download className="size-5 text-primary" /> Importar receita</CardTitle>
        <CardDescription>Cria um rascunho com título, tempos, porções e ingredientes de uma fonte autorizada.</CardDescription>
      </CardHeader>
      <CardContent>
        {eligible.length === 0 ? (
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Nenhuma fonte ativa com importação autorizada. Cadastre ou edite uma fonte e ative “Permite importação”.</p>
        ) : (
          <form onSubmit={run} className="space-y-3">
            <div>
              <Label htmlFor="imp-source">Fonte</Label>
              <NativeSelect id="imp-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                {eligible.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="imp-url">Link da receita</Label>
              <Input id="imp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={selected ? `${selected.baseUrl.replace(/\/$/, "")}/…` : "https://"} />
              {selected && <p className="mt-1 text-xs text-muted-foreground">O link precisa ser do domínio {new URL(selected.baseUrl).hostname}.</p>}
            </div>
            {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}
            {created && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm">
                <CheckCircle2 className="size-4 text-accent" />
                <span className="font-semibold">Rascunho criado.</span>
                <Link href={`/admin/receitas/${created.id}`} className="font-semibold text-primary underline">Revisar e reescrever o preparo</Link>
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? <Spinner /> : <Download />} {busy ? "Importando…" : "Importar como rascunho"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
