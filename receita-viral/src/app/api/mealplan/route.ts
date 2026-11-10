import { prisma } from "@/lib/db";
import { json, requireUser, route } from "@/lib/api";
import { isoDate, parseWeekStart } from "@/lib/week";
import { entrySelect, sortEntries } from "./_lib";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const weekStart = parseWeekStart(new URL(req.url).searchParams.get("week"));
  const plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    select: { entries: { select: entrySelect } },
  });
  return json({ weekStart: isoDate(weekStart), entries: sortEntries(plan?.entries ?? []) });
});
