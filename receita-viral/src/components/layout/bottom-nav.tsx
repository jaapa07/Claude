"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Flame, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive } from "./site-header";

const ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/virais", label: "Virais", icon: Flame },
  { href: "/chef", label: "Chef IA", icon: Sparkles },
  { href: "/conta", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.includes("/cozinhar")) return null;
  return (
    <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden" aria-label="Navegação inferior">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition", active ? "text-primary" : "text-muted-foreground")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-primary-soft")}>
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
