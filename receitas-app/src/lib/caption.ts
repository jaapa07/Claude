import type { Category } from './types';

export interface ParsedCaption {
  title?: string;
  ingredients: string[];
  steps: string[];
  hashtags: string[];
  category?: Category;
}

const QTY =
  /^(\d+[\d.,/]*\s*|meia\s|meio\s|uma?\s|duas\s|dois\s|três\s|tres\s|pitada|a gosto|½|¼|¾)/i;
const UNIT =
  /\b(g|kg|ml|l|xícaras?|xic|colher(?:es)?|col\.?|cs|cc|copos?|latas?|caixinhas?|pacotes?|dentes?|ovos?|fatias?|unidades?|pitada|a gosto|cup|cups|tbsp|tsp)\b/i;
const INGREDIENTS_HEADER = /^(ingredientes?|ingredients?|você vai precisar|vai precisar)\b/i;
const STEPS_HEADER = /^(modo de preparo|preparo|passo a passo|como fazer|instruções|method|directions|steps)\b/i;
const BULLET = /^\s*(?:[-•*·▪︎▫️✅✔️➡️👉🔸🔹]|\d+[.)-]|\d+️⃣)\s*/u;

const CATEGORY_HINTS: [Category, RegExp][] = [
  ['Airfryer', /air\s?fryer/i],
  ['Bebidas', /\b(drink|suco|smoothie|café|cafe|coquetel|bebida|limonada)\b/i],
  ['Doces', /\b(bolo|brigadeiro|doce|sobremesa|chocolate|pudim|torta doce|cookie|mousse|brownie)\b/i],
  ['Massas', /\b(macarrão|massa|lasanha|nhoque|espaguete|pasta|talharim)\b/i],
  ['Carnes', /\b(carne|frango|picanha|costela|bife|porco|peixe|camarão)\b/i],
  ['Saudável', /\b(fit|low ?carb|saudável|saudavel|proteic|vegano|vegana|salada)\b/i],
];

function stripBullet(line: string): string {
  return line.replace(BULLET, '').trim();
}

/** Remove emojis e símbolos decorativos que costumam poluir legendas. */
function stripDecoration(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

export function guessCategory(text: string): Category | undefined {
  for (const [cat, re] of CATEGORY_HINTS) if (re.test(text)) return cat;
  return undefined;
}

/**
 * Transforma a legenda de um vídeo de receita em título, ingredientes e passos.
 * É uma heurística: o usuário sempre revisa o resultado antes de salvar.
 */
export function parseCaption(caption: string): ParsedCaption {
  const hashtags = Array.from(caption.matchAll(/#([\p{L}\p{N}_]+)/gu), (m) => m[1].toLowerCase());
  const lines = caption
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const ingredients: string[] = [];
  const steps: string[] = [];
  let title: string | undefined;
  let section: 'none' | 'ingredients' | 'steps' = 'none';

  for (const rawLine of lines) {
    const plain = stripDecoration(rawLine);
    if (!plain) continue;
    const headerText = plain.replace(/[:：\-–]+$/, '').trim();

    if (INGREDIENTS_HEADER.test(headerText)) {
      section = 'ingredients';
      const rest = plain.split(/[:：]/).slice(1).join(':').trim();
      if (rest) ingredients.push(...rest.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
      continue;
    }
    if (STEPS_HEADER.test(headerText)) {
      section = 'steps';
      const rest = plain.split(/[:：]/).slice(1).join(':').trim();
      if (rest) steps.push(rest);
      continue;
    }

    const item = stripBullet(stripDecoration(rawLine));
    if (!item) continue;

    if (section === 'ingredients') {
      // Uma frase longa depois da lista geralmente já é o preparo.
      if (!QTY.test(item) && !UNIT.test(item) && item.length > 60) {
        section = 'steps';
        steps.push(item);
      } else {
        ingredients.push(item);
      }
    } else if (section === 'steps') {
      steps.push(item);
    } else if (!title) {
      title = item.replace(/[.!]+$/, '');
    } else if (QTY.test(item) && UNIT.test(item) && item.length <= 60) {
      ingredients.push(item);
    } else {
      steps.push(item);
    }
  }

  return {
    title: title && title.length > 80 ? `${title.slice(0, 77).trimEnd()}…` : title,
    ingredients,
    steps,
    hashtags,
    category: guessCategory(caption),
  };
}
