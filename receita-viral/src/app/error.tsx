"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function Error({ reset, error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        emoji="🥘"
        title="Ops! Algo queimou por aqui"
        description={`Não conseguimos carregar esta página. ${error.digest ? `(código ${error.digest})` : ""}`}
        action={<Button onClick={reset}>Tentar novamente</Button>}
      />
    </div>
  );
}
