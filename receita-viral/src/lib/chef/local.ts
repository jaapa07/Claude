/**
 * "Modo local" do Chef IA: responde com base no catálogo real do banco, sem provedor externo.
 * Usado quando ANTHROPIC_API_KEY não está configurada ou o provedor falha.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalize, WEEKDAYS, DIFFICULTY_LABEL } from "@/lib/utils";
import { formatIngredientLine, scaleQuantity } from "@/lib/units";
import { listRecipes } from "@/lib/recipes";
import { detectIntent } from "./intent";
import type { ChefMessage, ChefRecipe, ChefResponse } from "./types";

const fullInclude = {
  ingredients: { include: { ingredient: true }, orderBy: { position: "asc" } },
  steps: { orderBy: { position: "asc" } },
  categories: { select: { slug: true, name: true, type: true } },
} satisfies Prisma.RecipeInclude;

type FullRecipe = Prisma.RecipeGetPayload<{ include: typeof fullInclude }>;

function toChefRecipe(r: FullRecipe, servings = r.servings, missing: string[] = [], note: string | null = null): ChefRecipe {
  return {
    title: r.title,
    slug: r.slug,
    servings,
    totalMinutes: r.prepMinutes + r.cookMinutes,
    difficulty: r.difficulty,
    ingredients: r.ingredients.map((i) =>
      formatIngredientLine(scaleQuantity(i.quantity, r.servings, servings), i.unit, i.ingredient.name) + (i.optional ? " (opcional)" : ""),
    ),
    steps: r.steps.map((s) => s.text),
    missing,
    note,
  };
}

async function loadFull(slugs: string[]) {
  const rows = await prisma.recipe.findMany({ where: { slug: { in: slugs }, status: "PUBLISHED" }, include: fullInclude });
  return slugs.map((s) => rows.find((r) => r.slug === s)).filter((r): r is FullRecipe => Boolean(r));
}

async function findRecipeMentioned(messages: ChefMessage[]): Promise<FullRecipe | null> {
  const all = await prisma.recipe.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } });
  // procura do mais recente para o mais antigo (inclui respostas do assistente)
  for (const m of [...messages].reverse()) {
    const text = normalize(m.content);
    const hit = all
      .filter((r) => text.includes(normalize(r.title)) || text.includes(r.slug))
      .sort((a, b) => b.title.length - a.title.length)[0];
    if (hit) return (await loadFull([hit.slug]))[0] ?? null;
  }
  return null;
}

function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function localChef(messages: ChefMessage[]): Promise<ChefResponse> {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const intent = detectIntent(last);
  const base = { mode: "local" as const, menu: null };

  switch (intent.kind) {
    case "ingredients": {
      const res = await listRecipes({ have: intent.items, sort: "relevance", pageSize: 3 });
      if (!res.items.length) {
        return { ...base, reply: `Não encontrei receitas no catálogo com ${intent.items.join(", ")}. Tente citar outros ingredientes ou use a busca por ingredientes.`, recipes: [] };
      }
      const full = await loadFull(res.items.map((i) => i.slug));
      const recipes = full.map((r) => toChefRecipe(r, r.servings, res.items.find((i) => i.slug === r.slug)?.match?.missing ?? []));
      return {
        ...base,
        reply: `Com ${intent.items.join(", ")} você consegue fazer estas receitas. Indiquei o que falta comprar em cada uma (sal, água e óleo considero que você já tem).`,
        recipes,
      };
    }
    case "romantic": {
      const [starter, main, dessert] = await Promise.all([
        listRecipes({ categories: ["saladas"], sort: "rating", pageSize: 1 }),
        listRecipes({ categories: ["peixes-e-frutos-do-mar"], sort: "rating", pageSize: 1 }),
        listRecipes({ categories: ["sobremesas-e-doces"], sort: "rating", pageSize: 1 }),
      ]);
      const slugs = [starter.items[0], main.items[0], dessert.items[0]].filter(Boolean).map((i) => i!.slug);
      const full = await loadFull(slugs);
      const labels = ["Entrada", "Prato principal", "Sobremesa"];
      return {
        ...base,
        reply: "Montei um jantar a dois em três tempos, com as quantidades já ajustadas para 2 pessoas. Dica: prepare a sobremesa antes, para ficar livre na hora do jantar. 🕯️",
        recipes: full.map((r, i) => toChefRecipe(r, intent.servings, [], labels[i] ?? null)),
      };
    }
    case "budget": {
      const res = await listRecipes({ cost: "LOW", sort: "popular", pageSize: Math.min(Math.max(intent.count, 1), 10) });
      const full = await loadFull(res.items.map((i) => i.slug));
      return {
        ...base,
        reply: `Aqui estão ${full.length} receitas econômicas do nosso acervo, feitas com ingredientes baratos e fáceis de achar.`,
        recipes: full.map((r) => toChefRecipe(r)),
      };
    }
    case "scale": {
      const recipe = await findRecipeMentioned(messages);
      if (!recipe) {
        return { ...base, reply: "Qual receita você quer adaptar? Escreva o nome dela (por exemplo: “adapte o strogonoff de frango para 4 pessoas”).", recipes: [] };
      }
      return {
        ...base,
        reply: `Pronto! Ajustei “${recipe.title}” de ${recipe.servings} para ${intent.servings} porções. Tempos de forno costumam ser os mesmos; panelas maiores podem precisar de alguns minutos a mais.`,
        recipes: [toChefRecipe(recipe, intent.servings)],
      };
    }
    case "weekly-menu": {
      const pool = await prisma.recipe.findMany({
        where: { status: "PUBLISHED", categories: { none: { slug: { in: ["sobremesas-e-doces", "cafes-e-bebidas", "bolos-e-tortas"] } } } },
        select: { slug: true, title: true },
      });
      const breakfast = await prisma.recipe.findMany({
        where: { status: "PUBLISHED", categories: { some: { slug: "cafes-e-bebidas" } } },
        select: { slug: true, title: true },
      });
      const week = Math.floor(Date.now() / (7 * 864e5));
      const mains = shuffleDeterministic(pool, week);
      const bf = shuffleDeterministic(breakfast, week + 1);
      const menu = WEEKDAYS.map((day, i) => ({
        day,
        meals: [
          ...(bf.length ? [{ meal: "Café da manhã", ...bf[i % bf.length] }] : []),
          { meal: "Almoço", ...mains[(i * 2) % mains.length] },
          { meal: "Jantar", ...mains[(i * 2 + 1) % mains.length] },
        ],
      }));
      return {
        mode: "local",
        reply: "Aqui vai um cardápio semanal variado com receitas do acervo. Você pode levá-lo para o Planejador de Refeições e gerar a lista de compras automaticamente.",
        recipes: [],
        menu,
      };
    }
    case "cuisine":
    case "category":
    case "search": {
      const res = await listRecipes({
        q: intent.kind === "search" ? intent.text : undefined,
        categories: intent.kind === "cuisine" ? [intent.cuisine] : intent.kind === "category" ? [intent.category] : undefined,
        difficulty: intent.easy ? ["EASY"] : undefined,
        maxTime: intent.quick ? 30 : undefined,
        sort: "popular",
        pageSize: 3,
      });
      let items = res.items;
      if (!items.length && intent.kind !== "search") {
        items = (await listRecipes({ categories: intent.kind === "cuisine" ? [intent.cuisine] : [intent.category], pageSize: 3, sort: "quick" })).items;
      }
      if (!items.length) {
        return {
          ...base,
          reply:
            "Não encontrei nada no acervo para esse pedido. Experimente: “tenho arroz, ovo e bacon”, “receita japonesa fácil”, “jantar romântico para dois”, “5 receitas econômicas” ou “cardápio semanal”.",
          recipes: [],
        };
      }
      const full = await loadFull(items.map((i) => i.slug));
      return {
        ...base,
        reply: `Separei ${full.length} sugest${full.length > 1 ? "ões" : "ão"} para você — ${full.map((r) => `${r.title} (${DIFFICULTY_LABEL[r.difficulty].toLowerCase()})`).join(", ")}.`,
        recipes: full.map((r) => toChefRecipe(r)),
      };
    }
  }
}
