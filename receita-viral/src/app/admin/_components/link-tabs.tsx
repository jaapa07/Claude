import Link from "next/link";
import { cn } from "@/lib/utils";

export function LinkTabs({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-full bg-muted p-1" role="tablist">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            role="tab"
            aria-selected={active === t.key}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition",
              active === t.key ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 tabular-nums opacity-70">{t.count}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
