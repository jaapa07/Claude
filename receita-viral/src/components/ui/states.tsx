import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

export function EmptyState({
  emoji = "🍽️",
  title,
  description,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center", className)}>
      <div className="mb-3 text-5xl" aria-hidden>{emoji}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-label="Carregando" />;
}
