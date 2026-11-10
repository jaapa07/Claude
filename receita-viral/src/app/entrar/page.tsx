import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthForm, AuthShell } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/conta");
  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre para acessar favoritos, coleções, planejador e listas de compras.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
