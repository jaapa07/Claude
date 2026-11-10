import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = "sm", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "lg" ? "size-6" : size === "md" ? "size-5" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block">
          <Star className={cn(px, "text-muted-foreground/30")} fill="currentColor" strokeWidth={0} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - i + 1)) * 100}%` }}>
            <Star className={cn(px, "text-star")} fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      ))}
    </span>
  );
}
