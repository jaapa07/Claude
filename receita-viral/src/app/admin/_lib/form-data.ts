import "server-only";
import { prisma } from "@/lib/db";

/** Categorias e fontes usadas pelo formulário de receita do admin. */
export async function recipeFormOptions() {
  const [categories, sources] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, emoji: true },
    }),
    prisma.externalSource.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, sources };
}
