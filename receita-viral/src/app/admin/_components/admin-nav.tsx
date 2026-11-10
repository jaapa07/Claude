"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Flame, LayoutDashboard, MessageSquare, Plug, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/receitas", label: "Receitas", icon: BookOpen },
  { href: "/admin/categorias", label: "Categorias", icon: Tags },
  { href: "/admin/comentarios", label: "Comentários", icon: MessageSquare },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/virais", label: "Virais", icon: Flame },
  { href: "/admin/fontes", label: "Fontes e integrações", icon: Plug },
];

export function AdminNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <nav aria-label="Administração" className="-mx-4 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1.5 lg:flex-col">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition lg:rounded-xl",
                active(href) ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:text-foreground lg:bg-transparent lg:hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
              {badges[href] ? (
                <span className={cn("ml-auto rounded-full px-1.5 text-xs", active(href) ? "bg-white/25" : "bg-primary text-primary-foreground")}>{badges[href]}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
