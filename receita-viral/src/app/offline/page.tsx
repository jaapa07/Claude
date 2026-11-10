import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        emoji="📶"
        title="Você está offline"
        description="Sem internet agora. As receitas que você já abriu continuam disponíveis — volte quando a conexão retornar para ver novidades."
      />
    </div>
  );
}
