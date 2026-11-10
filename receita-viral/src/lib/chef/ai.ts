/**
 * Chef IA com provedor externo (Anthropic Claude). Executa SOMENTE no servidor;
 * a chave vem de ANTHROPIC_API_KEY e nunca é enviada ao navegador.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { prisma } from "@/lib/db";
import { chefResponseSchema, type ChefMessage, type ChefResponse } from "./types";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 90_000, maxRetries: 1 });
  return client;
}

async function catalogSummary(): Promise<string> {
  const rows = await prisma.recipe.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, title: true, prepMinutes: true, cookMinutes: true, difficulty: true, costLevel: true, servings: true, categories: { select: { slug: true } } },
    orderBy: { slug: "asc" },
    take: 400,
  });
  return rows
    .map((r) => `${r.slug} | ${r.title} | ${r.prepMinutes + r.cookMinutes} min | ${r.difficulty} | custo ${r.costLevel} | serve ${r.servings} | ${r.categories.map((c) => c.slug).join(",")}`)
    .join("\n");
}

const SYSTEM = `Você é o Chef IA do app Receita Viral, um assistente gastronômico brasileiro, caloroso e objetivo.
Responda SEMPRE em português do Brasil.
Regras:
- Quando uma receita do catálogo abaixo atender ao pedido, prefira-a e preencha "slug" com o slug exato. Para receitas criadas por você, use slug null.
- Toda receita deve trazer ingredientes com quantidades e unidades, e modo de preparo em etapas claras.
- Ao adaptar porções, recalcule todas as quantidades.
- Em "missing", liste ingredientes que o usuário provavelmente precisa comprar (com base no que ele disse ter); caso contrário, lista vazia.
- Para cardápios semanais, preencha "menu" com os 7 dias (Segunda a Domingo); caso contrário, menu = null.
- Não invente números de visualizações, tendências ou dados de redes sociais.
- Respeite alergias e restrições mencionadas. Em dúvidas de segurança alimentar, seja conservador.
- Limite-se a culinária; recuse educadamente outros assuntos.`;

export async function aiChef(messages: ChefMessage[]): Promise<ChefResponse> {
  const catalog = await catalogSummary();
  const response = await getClient().beta.messages.parse({
    model: process.env.CHEF_AI_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(chefResponseSchema) },
    system: [
      { type: "text", text: SYSTEM },
      { type: "text", text: `Catálogo (slug | título | tempo | dificuldade | custo | porções | categorias):\n${catalog}`, cache_control: { type: "ephemeral" } },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  if (response.stop_reason === "refusal") {
    return { mode: "ai", reply: "Desculpe, não posso ajudar com esse pedido. Posso sugerir receitas, cardápios ou adaptações?", recipes: [], menu: null };
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Resposta do provedor de IA fora do formato esperado");

  // Valida slugs: só mantém links para receitas que existem e estão publicadas
  const slugs = [...parsed.recipes.map((r) => r.slug), ...(parsed.menu ?? []).flatMap((d) => d.meals.map((m) => m.slug))].filter(
    (s): s is string => Boolean(s),
  );
  const valid = new Set(
    (await prisma.recipe.findMany({ where: { slug: { in: slugs }, status: "PUBLISHED" }, select: { slug: true } })).map((r) => r.slug),
  );
  return {
    mode: "ai",
    reply: parsed.reply,
    recipes: parsed.recipes.map((r) => ({ ...r, slug: r.slug && valid.has(r.slug) ? r.slug : null })),
    menu: parsed.menu?.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m, slug: m.slug && valid.has(m.slug) ? m.slug : null })) })) ?? null,
  };
}
