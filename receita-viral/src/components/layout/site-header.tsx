"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Início" },
  { href: "/explorar", label: "Explorar" },
  { href: "/virais", label: "Virais" },
  { href: "/chef", label: "Chef IA" },
  { href: "/planejador", label: "Planejador" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.includes("/cozinhar")) return null;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-semibold transition hover:bg-muted",
                isActive(pathname, n.href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <SearchBox className="ml-auto hidden w-full max-w-xs md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <ThemeToggle />
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
