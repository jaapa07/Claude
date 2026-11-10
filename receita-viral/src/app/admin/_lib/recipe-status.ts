import "server-only";
import type { RecipeStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { notifyNewRecipe } from "@/lib/recipe-write";

/** Remove ids de categorias inexistentes (422 se algum não existir). */
export async function assertCategoriesExist(ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return unique;
  const found = await prisma.category.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (found.length !== unique.length) {
    throw new HttpError(422, "Dados inválidos", [{ path: "categoryIds", message: "Uma ou mais categorias não existem mais" }]);
  }
  return unique;
}

export async function assertSourceExists(id: string | null | undefined) {
  if (!id) return null;
  const found = await prisma.externalSource.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(422, "Dados inválidos", [{ path: "externalSourceId", message: "Fonte externa não encontrada" }]);
  return id;
}

/**
 * Efeitos colaterais de uma mudança de status feita pelo admin:
 * - primeira publicação → avisa os usuários inscritos (notifyNewRecipe);
 * - receita de usuário que estava "Em revisão" e foi aprovada/rejeitada → avisa o autor.
 */
export async function afterStatusChange(
  before: { status: RecipeStatus; publishedAt: Date | null; authorId: string | null },
  after: { status: RecipeStatus; title: string; slug: string },
  adminId: string,
) {
  const tasks: Promise<unknown>[] = [];
  if (after.status === "PUBLISHED" && before.status !== "PUBLISHED" && !before.publishedAt) {
    tasks.push(notifyNewRecipe(after, before.authorId ?? adminId));
  }
  if (before.status === "PENDING" && before.authorId && before.authorId !== adminId) {
    if (after.status === "PUBLISHED") {
      tasks.push(
        prisma.notification.create({
          data: {
            userId: before.authorId,
            title: "Sua receita foi aprovada! 🎉",
            body: `${after.title} já está publicada no Receita Viral.`,
            link: `/receitas/${after.slug}`,
          },
        }),
      );
    } else if (after.status === "REJECTED") {
      tasks.push(
        prisma.notification.create({
          data: {
            userId: before.authorId,
            title: "Sua receita não foi aprovada",
            body: `${after.title} precisa de ajustes antes de ser publicada. Revise e envie novamente.`,
            link: `/conta`,
          },
        }),
      );
    }
  }
  await Promise.all(tasks).catch((err) => console.error("Falha ao notificar", err));
}
