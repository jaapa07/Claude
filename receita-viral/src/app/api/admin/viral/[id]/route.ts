import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route } from "@/lib/api";
import { viralTrendSchema } from "@/lib/validation";
import { viralData, viralInclude } from "@/app/admin/_lib/viral-source";

type Ctx = { params: Promise<{ id: string }> };

async function ensure(id: string) {
  const found = await prisma.viralTrend.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(404, "Registro viral não encontrado");
}

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  const input = await parseBody(req, viralTrendSchema);
  const trend = await prisma.viralTrend.update({ where: { id }, data: await viralData(input), include: viralInclude });
  return json({ trend });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  await prisma.viralTrend.delete({ where: { id } });
  return json({ ok: true });
});
