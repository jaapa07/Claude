import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        emoji="🍳"
        title="Página não encontrada"
        description="Essa receita pode ter sido removida ou o link está incorreto."
        action={
          <div className="flex gap-2">
            <Button asChild><Link href="/">Voltar ao início</Link></Button>
            <Button asChild variant="outline"><Link href="/busca">Buscar receitas</Link></Button>
          </div>
        }
      />
    </div>
  );
}
