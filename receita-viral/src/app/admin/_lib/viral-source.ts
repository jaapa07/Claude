import "server-only";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { toEmbedUrl } from "@/lib/embed";
import type { externalSourceSchema, viralTrendSchema } from "@/lib/validation";
import type { z } from "zod";

type ViralInput = z.infer<typeof viralTrendSchema>;
type SourceInput = z.infer<typeof externalSourceSchema>;

export async function viralData(input: ViralInput) {
  const recipe = await prisma.recipe.findUnique({ where: { id: input.recipeId }, select: { id: true } });
  if (!recipe) throw new HttpError(422, "Dados inválidos", [{ path: "recipeId", message: "Receita não encontrada" }]);
  if (input.verified && (!input.creatorUrl || !input.postUrl)) {
    throw new HttpError(422, "Dados inválidos", [
      { path: "verified", message: "Só marque como verificado com o link do criador e o link do post original preenchidos" },
    ]);
  }
  return {
    recipeId: input.recipeId,
    platform: input.platform,
    trendYear: input.trendYear ?? null,
    trendPeriod: input.trendPeriod || null,
    note: input.note || null,
    creatorName: input.creatorName || null,
    creatorUrl: input.creatorUrl ?? null,
    postUrl: input.postUrl ?? null,
    embedUrl: toEmbedUrl(input.postUrl),
    referenceUrl: input.referenceUrl ?? null,
    verified: input.verified,
    highlighted: input.highlighted,
  };
}

export const viralInclude = { recipe: { select: { id: true, title: true, slug: true, emoji: true, imageUrl: true } } } as const;

export function sourceData(input: SourceInput) {
  return {
    name: input.name,
    baseUrl: input.baseUrl,
    type: input.type,
    license: input.license || null,
    termsUrl: input.termsUrl ?? null,
    allowImport: input.allowImport,
    active: input.active,
    apiKeyEnv: input.apiKeyEnv || null,
    notes: input.notes || null,
  };
}

/** Nunca devolve o valor da chave — apenas se a variável de ambiente está definida. */
export function withKeyStatus<T extends { apiKeyEnv: string | null }>(source: T) {
  return { ...source, apiKeyConfigured: !!(source.apiKeyEnv && process.env[source.apiKeyEnv]) };
}
