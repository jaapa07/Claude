"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Save, Timer, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/states";
import { api, ApiError } from "@/lib/client";
import { isDirectVideo, toEmbedUrl } from "@/lib/embed";
import { INGREDIENT_GROUPS, UNITS } from "@/lib/validation";
import { cn, COST_LABEL, DIFFICULTY_LABEL, GROUP_LABEL, STATUS_LABEL } from "@/lib/utils";
import { ImageField, UploadButton } from "./media-upload";
import {
  emptyFormValues,
  emptyIngredient,
  emptyStep,
  rowKey,
  type IngredientRow,
  type RecipeFormValues,
  type StepRow,
} from "./form-values";

// Reexportado por conveniência em componentes cliente. Em Server Components importe de "./form-values".
export { recipeToFormInitial, emptyFormValues, type RecipeFormValues } from "./form-values";

export interface RecipeFormCategory {
  id: string;
  name: string;
  type: "CUISINE" | "DISH_TYPE";
  emoji: string | null;
}

export interface RecipeFormProps {
  mode: "admin" | "user";
  categories: RecipeFormCategory[];
  sources?: { id: string; name: string }[];
  initial?: Partial<RecipeFormValues>;
  recipeId?: string;
  onSavedHref?: string;
}

type Errors = Record<string, string>;

function parseNum(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

/** Valida no cliente (espelhando o zod do servidor) e monta o corpo exato da API. */
type IndexMap = Record<"ingredients" | "steps" | "substitutions", number[]>;

function buildPayload(v: RecipeFormValues, mode: "admin" | "user"): { errors: Errors; payload: Record<string, unknown>; indexMap: IndexMap } {
  const e: Errors = {};
  // Linhas em branco são ignoradas; guardamos o índice original para apontar o erro na linha certa.
  const indexMap: IndexMap = { ingredients: [], steps: [], substitutions: [] };
  const title = v.title.trim();
  const description = v.description.trim();
  if (title.length < 3) e.title = "O título precisa ter pelo menos 3 caracteres";
  else if (title.length > 120) e.title = "O título pode ter no máximo 120 caracteres";
  if (description.length < 10) e.description = "A descrição precisa ter pelo menos 10 caracteres";
  else if (description.length > 600) e.description = "A descrição pode ter no máximo 600 caracteres";
  if (v.emoji.trim().length > 8) e.emoji = "Use apenas um emoji";

  const urlOk = (s: string) => !s || s.startsWith("/") || /^https?:\/\//.test(s);
  if (!urlOk(v.imageUrl.trim())) e.imageUrl = "URL de imagem inválida";
  if (!urlOk(v.videoUrl.trim())) e.videoUrl = "URL de vídeo inválida";
  if (!urlOk(v.sourceUrl.trim())) e.sourceUrl = "URL inválida";

  const intField = (key: "prepMinutes" | "cookMinutes" | "servings", min: number, max: number, label: string) => {
    const n = parseNum(v[key]);
    if (n == null || Number.isNaN(n) || !Number.isInteger(n)) e[key] = `${label}: informe um número inteiro`;
    else if (n < min || n > max) e[key] = `${label}: entre ${min} e ${max}`;
    return n ?? 0;
  };
  const prepMinutes = intField("prepMinutes", 0, 24 * 60, "Preparo");
  const cookMinutes = intField("cookMinutes", 0, 72 * 60, "Cozimento");
  const servings = intField("servings", 1, 100, "Porções");
  const calories = parseNum(v.caloriesPerServing);
  if (calories != null && (Number.isNaN(calories) || !Number.isInteger(calories) || calories < 0 || calories > 5000)) {
    e.caloriesPerServing = "Calorias: número inteiro entre 0 e 5000";
  }

  const tags = [...new Set(v.tags.split(",").map((t) => t.trim()).filter(Boolean))];
  if (tags.length > 12) e.tags = "No máximo 12 tags";
  if (tags.some((t) => t.length > 30)) e.tags = "Cada tag pode ter no máximo 30 caracteres";
  if (v.categoryIds.length > 12) e.categoryIds = "Selecione no máximo 12 categorias";

  const ingredients = v.ingredients
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => i.name.trim() || i.quantity.trim())
    .map(({ i, idx }) => {
      indexMap.ingredients.push(idx);
      const q = i.unit === "a gosto" ? null : parseNum(i.quantity);
      if (!i.name.trim()) e[`ingredients.${idx}.name`] = "Informe o ingrediente";
      if (i.name.trim().length > 80) e[`ingredients.${idx}.name`] = "Máximo de 80 caracteres";
      if (q != null && (Number.isNaN(q) || q <= 0 || q > 100000)) e[`ingredients.${idx}.quantity`] = "Quantidade inválida";
      if (i.note.trim().length > 120) e[`ingredients.${idx}.note`] = "Observação muito longa";
      return { name: i.name.trim(), quantity: q, unit: i.unit, group: i.group, note: i.note.trim() || null, optional: i.optional };
    });
  if (!ingredients.length) e.ingredients = "Inclua pelo menos um ingrediente";
  if (ingredients.length > 60) e.ingredients = "No máximo 60 ingredientes";

  const steps = v.steps
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.text.trim() || s.timerMinutes.trim())
    .map(({ s, idx }) => {
      indexMap.steps.push(idx);
      const t = parseNum(s.timerMinutes);
      if (s.text.trim().length < 3) e[`steps.${idx}.text`] = "Descreva a etapa (mínimo 3 caracteres)";
      if (s.text.trim().length > 1500) e[`steps.${idx}.text`] = "Etapa muito longa (máx. 1500)";
      if (t != null && (Number.isNaN(t) || !Number.isInteger(t) || t < 1 || t > 1440)) e[`steps.${idx}.timerMinutes`] = "Timer: 1 a 1440 min";
      return { text: s.text.trim(), timerMinutes: t };
    });
  if (!steps.length) e.steps = "Inclua pelo menos uma etapa";
  if (steps.length > 40) e.steps = "No máximo 40 etapas";

  const tips = v.tips.map((t) => t.text.trim()).filter(Boolean);
  if (tips.length > 10) e.tips = "No máximo 10 dicas";
  if (tips.some((t) => t.length > 400)) e.tips = "Cada dica pode ter no máximo 400 caracteres";

  const substitutions = v.substitutions
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.ingredient.trim() || s.substitute.trim())
    .map(({ s, idx }) => {
      indexMap.substitutions.push(idx);
      if (!s.ingredient.trim() || !s.substitute.trim()) e[`substitutions.${idx}`] = "Preencha o ingrediente e o substituto";
      return { ingredient: s.ingredient.trim(), substitute: s.substitute.trim() };
    });
  if (substitutions.length > 10) e.substitutions = "No máximo 10 substituições";

  const nKeys = ["protein", "carbs", "fat", "fiber", "sodium"] as const;
  const anyNutrition = nKeys.some((k) => v.nutrition[k].trim());
  let nutrition: Record<string, number> | null = null;
  if (anyNutrition) {
    nutrition = {};
    for (const k of nKeys) {
      const n = parseNum(v.nutrition[k]) ?? 0;
      const max = k === "sodium" ? 100000 : 1000;
      if (Number.isNaN(n) || n < 0 || n > max) e[`nutrition.${k}`] = `Valor entre 0 e ${max}`;
      nutrition[k] = Number.isNaN(n) ? 0 : n;
    }
  }

  const payload: Record<string, unknown> = {
    title,
    description,
    imageUrl: v.imageUrl.trim() || null,
    videoUrl: v.videoUrl.trim() || null,
    emoji: v.emoji.trim() || null,
    prepMinutes,
    cookMinutes,
    servings,
    difficulty: v.difficulty,
    caloriesPerServing: calories,
    costLevel: v.costLevel,
    categoryIds: v.categoryIds,
    tags,
    tips,
    substitutions,
    nutrition,
    ingredients,
    steps,
    sourceUrl: v.sourceUrl.trim() || null,
    sourceName: v.sourceName.trim() || null,
    sourceAttribution: v.sourceAttribution.trim() || null,
  };
  if (mode === "admin") {
    payload.status = v.status;
    payload.featured = v.featured;
    payload.externalSourceId = v.externalSourceId || null;
  }
  return { errors: e, payload, indexMap };
}

/** Converte "ingredients.2.name" (índice do payload) para o índice da linha exibida. */
function remapPath(path: string, map: IndexMap) {
  const m = path.match(/^(ingredients|steps|substitutions)\.(\d+)(.*)$/);
  if (!m) return path;
  const original = map[m[1] as keyof IndexMap][Number(m[2])];
  return original === undefined ? path : `${m[1]}.${original}${m[3]}`;
}

function Section({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function RowButtons({ index, length, onMove, onRemove, removeLabel }: { index: number; length: number; onMove: (dir: -1 | 1) => void; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Mover para cima">
        <ArrowUp />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" disabled={index === length - 1} onClick={() => onMove(1)} aria-label="Mover para baixo">
        <ArrowDown />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" className="text-danger" onClick={onRemove} aria-label={removeLabel}>
        <Trash2 />
      </Button>
    </div>
  );
}

export function RecipeForm({ mode, categories, sources = [], initial, recipeId, onSavedHref }: RecipeFormProps) {
  const router = useRouter();
  const [values, setValues] = React.useState<RecipeFormValues>(() => ({ ...emptyFormValues(), ...initial }));
  const [errors, setErrors] = React.useState<Errors>({});
  const [serverErrors, setServerErrors] = React.useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const err = (path: string) => errors[path];

  const setIngredient = (i: number, patch: Partial<IngredientRow>) =>
    setValues((v) => ({ ...v, ingredients: v.ingredients.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));
  const setStep = (i: number, patch: Partial<StepRow>) =>
    setValues((v) => ({ ...v, steps: v.steps.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));

  const cuisines = categories.filter((c) => c.type === "CUISINE");
  const dishTypes = categories.filter((c) => c.type === "DISH_TYPE");
  const toggleCategory = (id: string) =>
    set("categoryIds", values.categoryIds.includes(id) ? values.categoryIds.filter((c) => c !== id) : [...values.categoryIds, id]);

  const videoUrl = values.videoUrl.trim();
  const embed = videoUrl ? toEmbedUrl(videoUrl) : null;
  const direct = videoUrl ? isDirectVideo(videoUrl) : false;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const { errors: found, payload, indexMap } = buildPayload(values, mode);
    setErrors(found);
    setServerErrors([]);
    if (Object.keys(found).length) {
      toast.error("Revise os campos destacados");
      requestAnimationFrame(() => document.querySelector("[aria-invalid='true'], [role='alert']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setSaving(true);
    try {
      const base = mode === "admin" ? "/api/admin/recipes" : "/api/recipes";
      const res = await api<{ recipe: { id: string; slug: string; status: string } }>(recipeId ? `${base}/${recipeId}` : base, {
        method: recipeId ? "PUT" : "POST",
        body: payload,
      });
      toast.success(
        recipeId ? "Receita atualizada!" : mode === "user" ? "Receita enviada para revisão!" : "Receita criada!",
      );
      router.push(onSavedHref ?? (mode === "admin" ? `/admin/receitas/${res.recipe.id}` : `/receitas/${res.recipe.slug}`));
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.details?.length) {
        const mapped: Errors = {};
        for (const d of e.details) mapped[remapPath(d.path || "_", indexMap)] = d.message;
        setErrors(mapped);
        setServerErrors(e.details);
      }
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  const invalid = (path: string) => (errors[path] ? { "aria-invalid": true as const } : {});

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-24 [&_[aria-invalid=true]]:border-danger">
      {serverErrors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm">
          <p className="font-semibold text-danger">O servidor recusou alguns dados:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {serverErrors.map((d, i) => (
              <li key={i}>
                {d.path && <code className="mr-1 text-xs text-muted-foreground">{d.path}</code>}
                {d.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "admin" && (
        <Section title="Publicação" description="Status, destaque e origem da receita.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="rf-status">Status</Label>
              <NativeSelect id="rf-status" value={values.status} onChange={(e) => set("status", e.target.value as RecipeFormValues["status"])}>
                {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="rf-source">Fonte externa</Label>
              <NativeSelect id="rf-source" value={values.externalSourceId} onChange={(e) => set("externalSourceId", e.target.value)}>
                <option value="">Nenhuma (conteúdo próprio)</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
              <FieldError>{err("externalSourceId")}</FieldError>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 sm:mt-6">
              <span className="text-sm font-semibold">Destaque na home</span>
              <Switch checked={values.featured} onCheckedChange={(c) => set("featured", c)} aria-label="Receita em destaque" />
            </label>
          </div>
        </Section>
      )}

      <Section title="Informações básicas">
        <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
          <div>
            <Label htmlFor="rf-title">Título *</Label>
            <Input id="rf-title" value={values.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Bolo de cenoura com cobertura de chocolate" {...invalid("title")} />
            <FieldError>{err("title")}</FieldError>
          </div>
          <div>
            <Label htmlFor="rf-emoji">Emoji</Label>
            <Input id="rf-emoji" value={values.emoji} maxLength={8} onChange={(e) => set("emoji", e.target.value)} placeholder="🍰" className="text-center text-lg" />
            <FieldError>{err("emoji")}</FieldError>
          </div>
        </div>
        <div>
          <Label htmlFor="rf-desc">Descrição *</Label>
          <Textarea id="rf-desc" value={values.description} maxLength={600} onChange={(e) => set("description", e.target.value)} placeholder="Conte em poucas linhas o que torna essa receita especial." {...invalid("description")} />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <FieldError>{err("description")}</FieldError>
            <span className="ml-auto">{values.description.trim().length}/600</span>
          </div>
        </div>
        <div>
          <Label htmlFor="rf-image">Imagem de capa</Label>
          <ImageField id="rf-image" value={values.imageUrl} onChange={(url) => set("imageUrl", url)} invalid={!!err("imageUrl")} />
          <FieldError>{err("imageUrl")}</FieldError>
        </div>
        <div>
          <Label htmlFor="rf-video">Vídeo</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="rf-video" value={values.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="Link do YouTube, TikTok, Instagram, Vimeo ou .mp4" {...invalid("videoUrl")} />
            {mode === "admin" && <UploadButton accept="video/mp4" label="Enviar MP4" onUploaded={(url) => set("videoUrl", url)} />}
          </div>
          <FieldError>{err("videoUrl")}</FieldError>
          {videoUrl && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted">
              {direct ? (
                <video src={videoUrl} controls className="aspect-video w-full bg-black" preload="metadata" />
              ) : embed ? (
                <iframe src={embed} title="Pré-visualização do vídeo" className="aspect-video w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
              ) : (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Video className="size-4" /> Pré-visualização indisponível para este link — ele será exibido como link externo.
                </p>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Tempo, rendimento e custo">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label htmlFor="rf-prep">Preparo (min) *</Label>
            <Input id="rf-prep" inputMode="numeric" value={values.prepMinutes} onChange={(e) => set("prepMinutes", e.target.value)} {...invalid("prepMinutes")} />
            <FieldError>{err("prepMinutes")}</FieldError>
          </div>
          <div>
            <Label htmlFor="rf-cook">Cozimento (min) *</Label>
            <Input id="rf-cook" inputMode="numeric" value={values.cookMinutes} onChange={(e) => set("cookMinutes", e.target.value)} {...invalid("cookMinutes")} />
            <FieldError>{err("cookMinutes")}</FieldError>
          </div>
          <div>
            <Label htmlFor="rf-serv">Porções *</Label>
            <Input id="rf-serv" inputMode="numeric" value={values.servings} onChange={(e) => set("servings", e.target.value)} {...invalid("servings")} />
            <FieldError>{err("servings")}</FieldError>
          </div>
          <div>
            <Label htmlFor="rf-diff">Dificuldade</Label>
            <NativeSelect id="rf-diff" value={values.difficulty} onChange={(e) => set("difficulty", e.target.value as RecipeFormValues["difficulty"])}>
              {(Object.keys(DIFFICULTY_LABEL) as (keyof typeof DIFFICULTY_LABEL)[]).map((d) => (
                <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="rf-kcal">Kcal/porção</Label>
            <Input id="rf-kcal" inputMode="numeric" value={values.caloriesPerServing} onChange={(e) => set("caloriesPerServing", e.target.value)} placeholder="—" {...invalid("caloriesPerServing")} />
            <FieldError>{err("caloriesPerServing")}</FieldError>
          </div>
          <div>
            <Label htmlFor="rf-cost">Custo</Label>
            <NativeSelect id="rf-cost" value={values.costLevel} onChange={(e) => set("costLevel", e.target.value as RecipeFormValues["costLevel"])}>
              {(Object.keys(COST_LABEL) as (keyof typeof COST_LABEL)[]).map((c) => (
                <option key={c} value={c}>{COST_LABEL[c]}</option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </Section>

      <Section title="Categorias e tags" description="Toque para selecionar. Até 12 categorias.">
        {[
          { label: "Cozinhas", items: cuisines },
          { label: "Tipos de prato", items: dishTypes },
        ].map((group) =>
          group.items.length ? (
            <div key={group.label}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((c) => {
                  const active = values.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      {c.emoji && <span aria-hidden>{c.emoji}</span>}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null,
        )}
        {!categories.length && <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>}
        <FieldError>{err("categoryIds")}</FieldError>
        <div>
          <Label htmlFor="rf-tags">Tags</Label>
          <Input id="rf-tags" value={values.tags} onChange={(e) => set("tags", e.target.value)} placeholder="air fryer, sem glúten, rápida" {...invalid("tags")} />
          <p className="mt-1 text-xs text-muted-foreground">Separe por vírgulas.</p>
          <FieldError>{err("tags")}</FieldError>
        </div>
      </Section>

      <Section title="Ingredientes *" description="Unidade “a gosto” dispensa quantidade.">
        <FieldError>{err("ingredients")}</FieldError>
        <ol className="space-y-3">
          {values.ingredients.map((row, i) => (
            <li key={row.key} className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Ingrediente {i + 1}</span>
                <RowButtons
                  index={i}
                  length={values.ingredients.length}
                  removeLabel="Remover ingrediente"
                  onMove={(d) => set("ingredients", move(values.ingredients, i, d))}
                  onRemove={() => set("ingredients", values.ingredients.length > 1 ? values.ingredients.filter((_, idx) => idx !== i) : [emptyIngredient()])}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                <div className="col-span-2 sm:col-span-4">
                  <Input aria-label="Nome do ingrediente" value={row.name} onChange={(e) => setIngredient(i, { name: e.target.value })} placeholder="farinha de trigo" {...invalid(`ingredients.${i}.name`)} />
                  <FieldError>{err(`ingredients.${i}.name`)}</FieldError>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    aria-label="Quantidade"
                    inputMode="decimal"
                    value={row.unit === "a gosto" ? "" : row.quantity}
                    disabled={row.unit === "a gosto"}
                    onChange={(e) => setIngredient(i, { quantity: e.target.value })}
                    placeholder="Qtd."
                    {...invalid(`ingredients.${i}.quantity`)}
                  />
                  <FieldError>{err(`ingredients.${i}.quantity`)}</FieldError>
                </div>
                <div className="sm:col-span-3">
                  <NativeSelect aria-label="Unidade" value={row.unit} onChange={(e) => setIngredient(i, { unit: e.target.value as IngredientRow["unit"] })}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <NativeSelect aria-label="Grupo no mercado" value={row.group} onChange={(e) => setIngredient(i, { group: e.target.value as IngredientRow["group"] })}>
                    {INGREDIENT_GROUPS.map((g) => (
                      <option key={g} value={g}>{GROUP_LABEL[g]}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="col-span-2 sm:col-span-9">
                  <Input aria-label="Observação" value={row.note} onChange={(e) => setIngredient(i, { note: e.target.value })} placeholder="Observação (ex.: peneirada)" {...invalid(`ingredients.${i}.note`)} />
                  <FieldError>{err(`ingredients.${i}.note`)}</FieldError>
                </div>
                <label className="col-span-2 flex h-11 items-center gap-2 text-sm sm:col-span-3">
                  <Checkbox checked={row.optional} onCheckedChange={(c) => setIngredient(i, { optional: c === true })} />
                  Opcional
                </label>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" onClick={() => set("ingredients", [...values.ingredients, emptyIngredient()])} disabled={values.ingredients.length >= 60}>
          <Plus /> Adicionar ingrediente
        </Button>
      </Section>

      <Section title="Modo de preparo *" description="Escreva com suas palavras. Adicione um timer quando a etapa tiver tempo definido.">
        <FieldError>{err("steps")}</FieldError>
        <ol className="space-y-3">
          {values.steps.map((row, i) => (
            <li key={row.key} className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <RowButtons
                  index={i}
                  length={values.steps.length}
                  removeLabel="Remover etapa"
                  onMove={(d) => set("steps", move(values.steps, i, d))}
                  onRemove={() => set("steps", values.steps.length > 1 ? values.steps.filter((_, idx) => idx !== i) : [emptyStep()])}
                />
              </div>
              <Textarea aria-label={`Etapa ${i + 1}`} value={row.text} maxLength={1500} onChange={(e) => setStep(i, { text: e.target.value })} placeholder="Descreva a etapa…" className="min-h-20" {...invalid(`steps.${i}.text`)} />
              <FieldError>{err(`steps.${i}.text`)}</FieldError>
              <div className="mt-2 flex items-center gap-2">
                <Timer className="size-4 text-muted-foreground" />
                <Input aria-label="Timer em minutos" inputMode="numeric" value={row.timerMinutes} onChange={(e) => setStep(i, { timerMinutes: e.target.value })} placeholder="Timer (min)" className="h-9 w-32" {...invalid(`steps.${i}.timerMinutes`)} />
                <FieldError>{err(`steps.${i}.timerMinutes`)}</FieldError>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" onClick={() => set("steps", [...values.steps, emptyStep()])} disabled={values.steps.length >= 40}>
          <Plus /> Adicionar etapa
        </Button>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Dicas">
          <FieldError>{err("tips")}</FieldError>
          {values.tips.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma dica ainda.</p>}
          {values.tips.map((tip, i) => (
            <div key={tip.key} className="flex items-start gap-2">
              <Textarea aria-label={`Dica ${i + 1}`} value={tip.text} maxLength={400} className="min-h-16" onChange={(e) => set("tips", values.tips.map((t, idx) => (idx === i ? { ...t, text: e.target.value } : t)))} />
              <Button type="button" size="icon-sm" variant="ghost" className="mt-1 text-danger" aria-label="Remover dica" onClick={() => set("tips", values.tips.filter((_, idx) => idx !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={values.tips.length >= 10} onClick={() => set("tips", [...values.tips, { key: rowKey(), text: "" }])}>
            <Plus /> Adicionar dica
          </Button>
        </Section>

        <Section title="Substituições">
          <FieldError>{err("substitutions")}</FieldError>
          {values.substitutions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma substituição ainda.</p>}
          {values.substitutions.map((s, i) => (
            <div key={s.key}>
              <div className="flex items-start gap-2">
                <Input aria-label="Ingrediente" value={s.ingredient} placeholder="Ingrediente" onChange={(e) => set("substitutions", values.substitutions.map((x, idx) => (idx === i ? { ...x, ingredient: e.target.value } : x)))} />
                <Input aria-label="Substituto" value={s.substitute} placeholder="Pode trocar por…" onChange={(e) => set("substitutions", values.substitutions.map((x, idx) => (idx === i ? { ...x, substitute: e.target.value } : x)))} />
                <Button type="button" size="icon-sm" variant="ghost" className="mt-1.5 text-danger" aria-label="Remover substituição" onClick={() => set("substitutions", values.substitutions.filter((_, idx) => idx !== i))}>
                  <Trash2 />
                </Button>
              </div>
              <FieldError>{err(`substitutions.${i}`) ?? err(`substitutions.${i}.ingredient`) ?? err(`substitutions.${i}.substitute`)}</FieldError>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={values.substitutions.length >= 10} onClick={() => set("substitutions", [...values.substitutions, { key: rowKey(), ingredient: "", substitute: "" }])}>
            <Plus /> Adicionar substituição
          </Button>
        </Section>
      </div>

      <Section title="Informação nutricional (por porção)" description="Opcional. Deixe tudo em branco se não souber.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {([
            ["protein", "Proteínas (g)"],
            ["carbs", "Carboidratos (g)"],
            ["fat", "Gorduras (g)"],
            ["fiber", "Fibras (g)"],
            ["sodium", "Sódio (mg)"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label htmlFor={`rf-n-${k}`}>{label}</Label>
              <Input id={`rf-n-${k}`} inputMode="decimal" value={values.nutrition[k]} onChange={(e) => set("nutrition", { ...values.nutrition, [k]: e.target.value })} {...invalid(`nutrition.${k}`)} />
              <FieldError>{err(`nutrition.${k}`)}</FieldError>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Fonte e créditos" description="Se a receita foi inspirada em outra fonte, informe o link e dê o crédito.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rf-surl">Link da fonte</Label>
            <Input id="rf-surl" value={values.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://" {...invalid("sourceUrl")} />
            <FieldError>{err("sourceUrl")}</FieldError>
          </div>
          <div>
            <Label htmlFor="rf-sname">Nome da fonte</Label>
            <Input id="rf-sname" value={values.sourceName} maxLength={120} onChange={(e) => set("sourceName", e.target.value)} />
            <FieldError>{err("sourceName")}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="rf-sattr">Crédito / atribuição</Label>
            <Input id="rf-sattr" value={values.sourceAttribution} maxLength={300} onChange={(e) => set("sourceAttribution", e.target.value)} placeholder="Receita de Fulana — Blog da Fulana" />
            <FieldError>{err("sourceAttribution")}</FieldError>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-20 z-30 flex items-center justify-end gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur lg:bottom-4">
        {mode === "user" && <p className="mr-auto hidden text-xs text-muted-foreground sm:block">Sua receita passa por revisão antes de ser publicada.</p>}
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner /> : <Save />}
          {saving ? "Salvando…" : recipeId ? "Salvar alterações" : mode === "user" ? "Enviar receita" : "Criar receita"}
        </Button>
      </div>
    </form>
  );
}

export default RecipeForm;
