import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/conta");
  return (
    <AuthShell title="Crie sua conta grátis" subtitle="Guarde receitas, monte o cardápio da semana e receba sugestões feitas para você.">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
