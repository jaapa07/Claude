import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Capa da receita: usa a foto cadastrada quando existe; caso contrário,
 * uma arte demonstrativa (gradiente + emoji do prato) gerada sem requisições externas.
 */
export function RecipeCover({
  imageUrl,
  emoji,
  title,
  color,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority,
  emojiClass = "text-7xl",
}: {
  imageUrl: string | null;
  emoji: string | null;
  title: string;
  color?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  emojiClass?: string;
}) {
  if (imageUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image src={imageUrl} alt={title} fill sizes={sizes} priority={priority} className="object-cover" unoptimized={imageUrl.startsWith("/api/")} />
      </div>
    );
  }
  const c = color ?? "#f2600c";
  return (
    <div
      role="img"
      aria-label={`Ilustração de ${title}`}
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at 20% 10%, ${c}55 0%, transparent 55%), radial-gradient(110% 80% at 90% 100%, #f2600c55 0%, transparent 60%), linear-gradient(135deg, #fff3e2 0%, ${c}33 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
        style={{ backgroundImage: "radial-gradient(currentColor 1.2px, transparent 1.2px)", backgroundSize: "18px 18px", color: c }}
      />
      <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-white/40 blur-2xl dark:bg-white/10" />
      <span className={cn("relative drop-shadow-[0_12px_18px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6", emojiClass)} aria-hidden>
        {emoji ?? "🍽️"}
      </span>
    </div>
  );
}
