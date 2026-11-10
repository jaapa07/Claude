"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, KeyRound, LogOut, Plus, Upload, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client";
import { cn, normalize } from "@/lib/utils";
import { Avatar } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";

const DIETS = ["vegetariano", "vegano", "sem glúten", "sem lactose", "low carb", "mais vegetais", "proteico"];
const ALLERGIES = ["lactose", "glúten", "ovo", "amendoim", "frutos do mar", "peixe", "soja", "nozes", "carne vermelha"];

type Profile = {
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  dietaryPrefs: string[];
  allergies: string[];
  notifyNewRecipes: boolean;
};

function ChipPicker({ options, value, onChange, placeholder, max }: { options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder: string; max: number }) {
  const [custom, setCustom] = React.useState("");
  const has = (o: string) => value.some((v) => normalize(v) === normalize(o));
  const toggle = (o: string) => onChange(has(o) ? value.filter((v) => normalize(v) !== normalize(o)) : [...value, o]);
  const extras = value.filter((v) => !options.some((o) => normalize(o) === normalize(v)));
  const add = () => {
    const t = custom.trim().toLowerCase().slice(0, 40);
    if (!t) return;
    if (value.length >= max) return toast.error(`Máximo de ${max} itens`);
    if (!has(t)) onChange([...value, t]);
    setCustom("");
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[...options, ...extras].map((o) => {
          const active = has(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(o)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              {active ? <Check className="size-3.5" /> : null}
              {o}
              {active && extras.includes(o) && <X className="size-3.5" />}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          maxLength={40}
        />
        <Button type="button" variant="outline" onClick={add}><Plus /> Adicionar</Button>
      </div>
    </div>
  );
}

export function PreferencesForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: profile.name,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    dietaryPrefs: profile.dietaryPrefs,
    allergies: profile.allergies,
    notifyNewRecipes: profile.notifyNewRecipes,
  });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api("/api/me/profile", {
        method: "PUT",
        body: { ...form, bio: form.bio || null, avatarUrl: form.avatarUrl || null },
      });
      toast.success("Preferências salvas");
      router.refresh();
    } catch (err) {
      const details = (err as { details?: { path: string; message: string }[] }).details;
      if (details) setErrors(Object.fromEntries(details.map((d) => [d.path, d.message])));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 5 MB)");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Falha no envio da imagem");
      setForm((f) => ({ ...f, avatarUrl: data.url! }));
      toast.success("Foto enviada — clique em Salvar perfil para confirmar");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* senha */
  const [pwd, setPwd] = React.useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = React.useState(false);
  const [pwdError, setPwdError] = React.useState<string | null>(null);
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (pwd.newPassword !== pwd.confirm) return setPwdError("As senhas não conferem");
    setPwdBusy(true);
    try {
      await api("/api/me/password", { method: "PUT", body: { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword } });
      toast.success("Senha alterada com sucesso");
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPwdError(errorMessage(err));
    } finally {
      setPwdBusy(false);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    toast.success("Você saiu da sua conta");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={form.name || profile.name} url={form.avatarUrl || null} className="size-20 text-2xl" />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Spinner /> : <Upload />} Enviar foto
                  </Button>
                  {form.avatarUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, avatarUrl: "" })}>
                      <X /> Remover
                    </Button>
                  )}
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </div>
                <Input
                  aria-label="URL da foto"
                  value={form.avatarUrl}
                  onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                  placeholder="ou cole a URL de uma imagem"
                  maxLength={500}
                />
                <FieldError>{errors.avatarUrl}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="pf-name">Nome</Label>
              <Input id="pf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-bio">Sobre você</Label>
              <Textarea id="pf-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={400} placeholder="Conte o que você mais gosta de cozinhar 🍲" />
              <p className="mt-1 text-right text-xs text-muted-foreground">{form.bio.length}/400</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências alimentares</CardTitle>
            <CardDescription>Usamos para personalizar sugestões.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChipPicker options={DIETS} value={form.dietaryPrefs} onChange={(v) => setForm({ ...form, dietaryPrefs: v })} placeholder="Outra preferência (ex.: cetogênica)" max={20} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alergias e restrições</CardTitle>
            <CardDescription>Receitas com esses ingredientes ficam fora das suas recomendações.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChipPicker options={ALLERGIES} value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} placeholder="Outro ingrediente a evitar (ex.: coentro)" max={30} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-5">
            <div>
              <Label htmlFor="pf-notify" className="mb-0">Avisar sobre novas receitas</Label>
              <p className="text-sm text-muted-foreground">Receba notificações quando houver receitas novas e virais.</p>
            </div>
            <Switch id="pf-notify" checked={form.notifyNewRecipes} onCheckedChange={(v) => setForm({ ...form, notifyNewRecipes: v })} />
          </CardContent>
        </Card>

        <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
          <Button type="submit" size="lg" disabled={saving || uploading}>
            {saving ? <Spinner /> : <Check />} Salvar perfil
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="size-5" /> Alterar senha</CardTitle>
          <CardDescription>Mínimo de 8 caracteres, com letras e números.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="pw-cur">Senha atual</Label>
              <Input id="pw-cur" type="password" autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="pw-new">Nova senha</Label>
              <Input id="pw-new" type="password" autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required minLength={8} />
            </div>
            <div>
              <Label htmlFor="pw-conf">Confirmar</Label>
              <Input id="pw-conf" type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} required />
            </div>
            <div className="sm:col-span-3">
              <FieldError>{pwdError}</FieldError>
              <Button type="submit" variant="outline" disabled={pwdBusy} className="mt-1">
                {pwdBusy && <Spinner />} Alterar senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="font-semibold">Sair da conta</p>
            <p className="text-sm text-muted-foreground">Encerra a sessão neste dispositivo.</p>
          </div>
          <Button variant="danger" onClick={logout}><LogOut /> Sair</Button>
        </CardContent>
      </Card>
    </div>
  );
}
