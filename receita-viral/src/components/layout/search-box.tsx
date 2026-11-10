"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBox({ className, defaultValue = "", autoFocus, large }: { className?: string; defaultValue?: string; autoFocus?: boolean; large?: boolean }) {
  const router = useRouter();
  const [q, setQ] = React.useState(defaultValue);
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/busca?q=${encodeURIComponent(v)}` : "/busca");
      }}
    >
      <Search className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground", large ? "size-5" : "size-4")} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        type="search"
        aria-label="Buscar receitas"
        placeholder="Buscar receitas, ingredientes…"
        className={cn(
          "w-full rounded-full border border-input bg-card pl-11 pr-4 text-sm shadow-soft transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
          large ? "h-14 text-base" : "h-10",
        )}
      />
    </form>
  );
}
