"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [show, setShow] = React.useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "register" && form.name.trim().length < 2) e.name = "Informe seu nome";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "E-mail inválido";
    if (mode === "register") {
      if (form.password.length < 8) e.password = "Mínimo de 8 caracteres";
      else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = "Use letras e números";
    } else if (!form.password) e.password = "Informe a senha";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        body: mode === "login" ? { email: form.email, password: form.password } : form,
      });
      router.push(mode === "register" && safeNext === "/" ? "/conta/preferencias?bemvindo=1" : safeNext);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      }
      setError(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}
      {mode === "register" && (
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} />
          <FieldError>{errors.name}</FieldError>
        </div>
      )}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
        <FieldError>{errors.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={set("password")}
            aria-invalid={!!errors.password}
            className="pr-11"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError>{errors.password}</FieldError>
        {mode === "register" && !errors.password && <p className="mt-1 text-xs text-muted-foreground">Mínimo de 8 caracteres, com letras e números.</p>}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>Ainda não tem conta? <Link href={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary">Cadastre-se grátis</Link></>
        ) : (
          <>Já tem conta? <Link href={`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary">Entrar</Link></>
        )}
      </p>
    </form>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative aspect-square overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-[#ff8a3c] to-[#ffc078] p-10 text-white shadow-lift">
          <div className="absolute -bottom-8 -right-8 text-[16rem] leading-none opacity-90" aria-hidden>🍲</div>
          <div className="absolute left-10 top-40 text-7xl" aria-hidden>🥑</div>
          <div className="absolute right-16 top-16 text-6xl" aria-hidden>🍜</div>
          <p className="relative max-w-xs font-display text-4xl font-bold leading-tight">Salve, planeje e cozinhe o que está bombando.</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md space-y-6">
        <div>
          <h1 className="font-display text-4xl font-extrabold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
