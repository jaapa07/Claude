import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [recipes, categories] = await Promise.all([
    prisma.recipe.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: appUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: appUrl("/explorar"), changeFrequency: "weekly", priority: 0.8 },
    { url: appUrl("/virais"), changeFrequency: "daily", priority: 0.9 },
    { url: appUrl("/chef"), changeFrequency: "monthly", priority: 0.6 },
    { url: appUrl("/conversor"), changeFrequency: "yearly", priority: 0.4 },
    { url: appUrl("/sobre"), changeFrequency: "yearly", priority: 0.3 },
    ...categories.map((c) => ({ url: appUrl(`/categorias/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...recipes.map((r) => ({ url: appUrl(`/receitas/${r.slug}`), lastModified: r.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
