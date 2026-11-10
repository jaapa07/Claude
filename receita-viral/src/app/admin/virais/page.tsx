import { prisma } from "@/lib/db";
import { PageHeader } from "../_components/page-header";
import { ViralManager } from "../_components/viral-manager";

export const metadata = { title: "Virais" };

export default async function AdminViralPage() {
  const [trends, recipes] = await Promise.all([
    prisma.viralTrend.findMany({
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
      include: { recipe: { select: { id: true, title: true, slug: true, emoji: true } } },
    }),
    prisma.recipe.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true }, take: 1000 }),
  ]);
  return (
    <div>
      <PageHeader title="Receitas virais" description="Documente as tendências das redes com crédito ao criador e link para o post original." />
      <ViralManager trends={trends} recipes={recipes} />
    </div>
  );
}
