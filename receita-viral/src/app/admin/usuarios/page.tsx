import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "../_components/page-header";
import { UserActions } from "../_components/user-actions";

export const metadata = { title: "Usuários" };
const df = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const [me, users] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, _count: { select: { recipes: true, favorites: true, comments: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Usuários" description="Promova administradores e bloqueie contas que violem as regras da comunidade." />
      <form action="/admin/usuarios" className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail…" className="pl-10" aria-label="Buscar usuários" />
        </div>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>
      {users.length === 0 ? (
        <EmptyState emoji="👤" title="Nenhum usuário encontrado" description={q ? "Tente outro termo de busca." : undefined} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {users.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                    <span className="truncate">{u.name}</span>
                    {u.role === "ADMIN" && <Badge variant="accent">Admin</Badge>}
                    {u.status === "BLOCKED" && <Badge variant="danger">Bloqueado</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email} · desde {df.format(u.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {u._count.recipes} receita(s) · {u._count.favorites} favorito(s) · {u._count.comments} comentário(s)
                  </p>
                </div>
              </div>
              <UserActions user={{ id: u.id, name: u.name, role: u.role, status: u.status }} isSelf={u.id === me?.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
