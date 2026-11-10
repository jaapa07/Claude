import { prisma } from "@/lib/db";
import { PageHeader } from "../_components/page-header";
import { CategoryManager } from "../_components/category-manager";

export const metadata = { title: "Categorias" };

export default async function AdminCategoriesPage() {
  const rows = await prisma.category.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { recipes: true } } },
  });
  const categories = rows.map(({ _count, ...c }) => ({ ...c, recipeCount: _count.recipes }));
  return (
    <div>
      <PageHeader title="Categorias" description="Organize as receitas por cozinha e por tipo de prato." />
      <CategoryManager categories={categories} />
    </div>
  );
}
