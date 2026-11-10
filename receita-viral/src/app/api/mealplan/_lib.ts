import type { Prisma } from "@prisma/client";

export const entrySelect = {
  id: true,
  dayIndex: true,
  mealType: true,
  servings: true,
  recipe: {
    select: { id: true, slug: true, title: true, emoji: true, imageUrl: true, prepMinutes: true, cookMinutes: true, servings: true },
  },
} satisfies Prisma.MealPlanEntrySelect;

export type PlanEntry = Prisma.MealPlanEntryGetPayload<{ select: typeof entrySelect }>;

const MEAL_RANK = { BREAKFAST: 0, LUNCH: 1, SNACK: 2, DINNER: 3 } as const;

export function sortEntries<T extends { dayIndex: number; mealType: keyof typeof MEAL_RANK }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.dayIndex - b.dayIndex || MEAL_RANK[a.mealType] - MEAL_RANK[b.mealType]);
}
