import { prisma } from "@/lib/db";
import { json, parseBody, requireAdmin, route } from "@/lib/api";
import { externalSourceSchema } from "@/lib/validation";
import { sourceData, withKeyStatus } from "@/app/admin/_lib/viral-source";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const sources = await prisma.externalSource.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { recipes: true } } },
  });
  return json({ sources: sources.map(withKeyStatus) });
});

export const POST = route(async (req) => {
  await requireAdmin(req);
  const input = await parseBody(req, externalSourceSchema);
  const source = await prisma.externalSource.create({ data: sourceData(input) });
  return json({ source: withKeyStatus(source) }, 201);
});
