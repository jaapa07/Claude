import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Carregando lista">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-72" />
      <Skeleton className="mt-4 h-3 w-full rounded-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}
      </div>
      <Skeleton className="mt-6 h-12 w-full" />
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="mt-6 space-y-2">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((__, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ))}
    </div>
  );
}
