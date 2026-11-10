import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isoDate, parseWeekStart, weekStartOf } from "@/lib/week";
import { PlannerBoard, type PlannerEntry } from "./planner-board";

export const metadata: Metadata = { title: "Planejador semanal" };
export const dynamic = "force-dynamic";

const MEAL_RANK = { BREAKFAST: 0, LUNCH: 1, SNACK: 2, DINNER: 3 } as const;

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ week?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/planejador");
  const sp = await searchParams;
  const weekStart = parseWeekStart(Array.isArray(sp.week) ? sp.week[0] : sp.week);
  const plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    select: {
      entries: {
        select: {
          id: true,
          dayIndex: true,
          mealType: true,
          servings: true,
          recipe: { select: { id: true, slug: true, title: true, emoji: true, imageUrl: true, prepMinutes: true, cookMinutes: true, servings: true } },
        },
      },
    },
  });
  const entries: PlannerEntry[] = (plan?.entries ?? []).sort(
    (a, b) => a.dayIndex - b.dayIndex || MEAL_RANK[a.mealType] - MEAL_RANK[b.mealType],
  );
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PlannerBoard weekStart={isoDate(weekStart)} thisWeek={isoDate(weekStartOf(new Date()))} today={isoDate(new Date())} entries={entries} />
    </div>
  );
}
