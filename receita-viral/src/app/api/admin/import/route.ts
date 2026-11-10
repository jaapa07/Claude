import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route } from "@/lib/api";
import { extractJsonLdRecipe, hostMatches, isPublicHttpUrl } from "@/lib/importer";
import { recipeInputSchema } from "@/lib/validation";
import { createRecipe } from "@/lib/recipe-write";

const bodySchema = z.object({
  sourceId: z.string().min(1, "Escolha a fonte"),
  url: z.string().trim().url("Cole uma URL válida"),
});

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function assertAllowedUrl(url: string, baseUrl: string) {
  if (!isPublicHttpUrl(url)) {
    throw new HttpError(422, "Dados inválidos", [{ path: "url", message: "A URL precisa ser um endereço público http(s)" }]);
  }
  if (!hostMatches(url, baseUrl)) {
    throw new HttpError(422, "Dados inválidos", [{ path: "url", message: "A URL não pertence ao domínio cadastrado para esta fonte" }]);
  }
}

/** Baixa a página seguindo redirecionamentos apenas dentro do domínio autorizado, com limite de tamanho. */
async function fetchPage(url: string, baseUrl: string): Promise<string> {
  const signal = AbortSignal.timeout(10_000);
  let current = url;
  let res: Response | null = null;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      assertAllowedUrl(current, baseUrl);
      res = await fetch(current, {
        signal,
        redirect: "manual",
        headers: { "User-Agent": "ReceitaViralImporter/1.0", Accept: "text/html,application/xhtml+xml" },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        res = null;
        continue;
      }
      break;
    }
    if (!res) throw new HttpError(502, "A página redirecionou vezes demais. Tente o link final da receita.");
    if (!res.ok) throw new HttpError(502, `A fonte respondeu com erro (HTTP ${res.status}). Confira o link e tente novamente.`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) throw new HttpError(502, "A página é grande demais para importar (máx. 2 MB).");
    if (!res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        throw new HttpError(502, "A página é grande demais para importar (máx. 2 MB).");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const name = (err as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new HttpError(502, "A fonte demorou demais para responder (mais de 10 s). Tente novamente mais tarde.");
    }
    throw new HttpError(502, "Não foi possível acessar a página da fonte. Verifique o link e sua conexão.");
  }
}

/**
 * Importação autorizada: somente dados factuais + link e crédito.
 * O modo de preparo original NÃO é copiado; a receita entra como rascunho para reescrita editorial.
 */
export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  const { sourceId, url } = await parseBody(req, bodySchema);

  const source = await prisma.externalSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new HttpError(404, "Fonte não encontrada");
  if (!source.active || !source.allowImport) {
    throw new HttpError(403, "Esta fonte não está ativa ou não autoriza importação. Revise o cadastro e os termos de uso.");
  }
  assertAllowedUrl(url, source.baseUrl);

  const html = await fetchPage(url, source.baseUrl);
  const imported = extractJsonLdRecipe(html, url);
  if (!imported) {
    throw new HttpError(422, "Não encontramos dados estruturados de receita (schema.org/Recipe) nesta página.");
  }

  const stepNote = `Modo de preparo disponível na fonte original (${imported.stepCount} etapas). Reescreva as etapas com suas palavras antes de publicar e mantenha o link de crédito.`;
  const parsed = recipeInputSchema.safeParse({
    title: imported.title,
    description: imported.description.length >= 10 ? imported.description : `Receita importada de ${source.name}.`,
    imageUrl: imported.imageUrl,
    videoUrl: null,
    emoji: null,
    prepMinutes: Math.min(imported.prepMinutes, 24 * 60),
    cookMinutes: Math.min(imported.cookMinutes, 72 * 60),
    servings: imported.servings,
    difficulty: "MEDIUM",
    caloriesPerServing: null,
    costLevel: "MEDIUM",
    categoryIds: [],
    tags: [],
    tips: [],
    substitutions: [],
    nutrition: null,
    ingredients: imported.ingredients.slice(0, 60).map((i) => ({
      name: i.name.slice(0, 80),
      quantity: i.quantity != null && i.quantity > 0 && i.quantity <= 100000 ? i.quantity : null,
      unit: i.unit,
      group: "OUTROS",
      note: i.note ? i.note.slice(0, 120) : null,
      optional: false,
    })),
    steps: [{ text: stepNote, timerMinutes: null }],
    sourceUrl: url,
    sourceName: source.name.slice(0, 120),
    sourceAttribution: (imported.author ? `Receita de ${imported.author} — ${source.name}` : source.name).slice(0, 300),
  });
  if (!parsed.success) {
    throw new HttpError(
      422,
      "Os dados encontrados na página estão incompletos para criar um rascunho",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }

  const recipe = await createRecipe(parsed.data, { status: "DRAFT", authorId: admin.id, externalSourceId: source.id });
  return json({ recipe: { id: recipe.id, slug: recipe.slug } }, 201);
});
