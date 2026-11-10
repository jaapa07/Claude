"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, User, CalendarDays, ShoppingCart, BookOpen, Settings } from "lucide-react";
import { useSession } from "@/components/providers";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Avatar({ name, url, className = "size-9" }: { name: string; url?: string | null; className?: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${className} rounded-full object-cover`} />;
  }
  return (
    <span className={`${className} inline-flex items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-700 text-sm font-bold text-white`}>
      {initials || "?"}
    </span>
  );
}

export function UserMenu() {
  const user = useSession();
  const router = useRouter();
  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/entrar">Entrar</Link>
      </Button>
    );
  }
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Menu da conta">
        <Avatar name={user.name} url={user.avatarUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block font-semibold text-foreground">{user.name}</span>
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/conta"><User /> Minha conta</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/conta/favoritos"><Heart /> Favoritos</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/conta/receitas"><BookOpen /> Minhas receitas</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/planejador"><CalendarDays /> Planejador</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/compras"><ShoppingCart /> Listas de compras</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/conta/preferencias"><Settings /> Preferências</Link></DropdownMenuItem>
        {user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/admin"><LayoutDashboard /> Painel admin</Link></DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-danger"><LogOut className="!text-danger" /> Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
