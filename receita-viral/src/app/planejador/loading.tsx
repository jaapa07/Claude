import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Carregando planejador">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-3 h-5 w-48" />
      <div className="mt-6 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 4 }).map((__, j) => (
              <Skeleton key={j} className="h-16 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
