import Link from "next/link";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Receita Viral — início">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#ff9a3c] text-lg shadow-soft">🔥</span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-tight">
          Receita<span className="text-primary">Viral</span>
        </span>
      )}
    </Link>
  );
}
