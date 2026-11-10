import { Skeleton } from "@/components/ui/states";

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
