import { prisma } from "@/lib/db";
import { json, parseBody, requireAdmin, route } from "@/lib/api";
import { viralTrendSchema } from "@/lib/validation";
import { viralData, viralInclude } from "@/app/admin/_lib/viral-source";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const trends = await prisma.viralTrend.findMany({ orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }], include: viralInclude });
  return json({ trends });
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const input = await parseBody(req, viralTrendSchema);
  const trend = await prisma.viralTrend.create({ data: await viralData(input), include: viralInclude });
  return json({ trend }, 201);
});
