import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AdminNav } from "./_components/admin-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administração", template: "%s · Admin · Receita Viral" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");
  const [pendingRecipes, pendingComments] = await Promise.all([
    prisma.recipe.count({ where: { status: "PENDING" } }),
    prisma.comment.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 hidden items-center gap-2 px-1 lg:flex">
            <ShieldCheck className="size-5 text-primary" />
            <div>
              <p className="text-sm font-bold leading-tight">Painel admin</p>
              <p className="text-xs text-muted-foreground">{user.name}</p>
            </div>
          </div>
          <AdminNav badges={{ "/admin/receitas": pendingRecipes, "/admin/comentarios": pendingComments }} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
