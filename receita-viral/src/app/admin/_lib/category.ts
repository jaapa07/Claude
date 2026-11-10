import "server-only";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { slugify } from "@/lib/utils";

/** Slug informado ou gerado a partir do nome; 409 se já estiver em uso por outra categoria. */
export async function resolveCategorySlug(name: string, slug: string | undefined, ignoreId?: string) {
  const final = (slug && slug.trim()) || slugify(name);
  if (!final) throw new HttpError(422, "Dados inválidos", [{ path: "slug", message: "Não foi possível gerar o slug a partir do nome" }]);
  const existing = await prisma.category.findUnique({ where: { slug: final }, select: { id: true } });
  if (existing && existing.id !== ignoreId) throw new HttpError(409, `Já existe uma categoria com o slug "${final}"`);
  return final;
}
