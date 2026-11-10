import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | string[] | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v == null) continue;
      (Array.isArray(v) ? v : [v]).forEach((x) => sp.append(k, x));
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Paginação">
      <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn("flex size-10 items-center justify-center rounded-full border border-border bg-card", page <= 1 && "pointer-events-none opacity-40")} aria-label="Página anterior">
        <ChevronLeft className="size-4" />
      </Link>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={cn("flex size-10 items-center justify-center rounded-full text-sm font-semibold", n === page ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {n}
          </Link>
        </span>
      ))}
      <Link aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))} className={cn("flex size-10 items-center justify-center rounded-full border border-border bg-card", page >= pages && "pointer-events-none opacity-40")} aria-label="Próxima página">
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
