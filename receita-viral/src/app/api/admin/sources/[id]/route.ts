import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route } from "@/lib/api";
import { externalSourceSchema } from "@/lib/validation";
import { sourceData, withKeyStatus } from "@/app/admin/_lib/viral-source";

type Ctx = { params: Promise<{ id: string }> };

async function ensure(id: string) {
  const found = await prisma.externalSource.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(404, "Fonte não encontrada");
}

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  const input = await parseBody(req, externalSourceSchema);
  const source = await prisma.externalSource.update({ where: { id }, data: sourceData(input) });
  return json({ source: withKeyStatus(source) });
});

/** Receitas vinculadas mantêm o crédito textual (sourceName/sourceUrl); só o vínculo é removido. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  await prisma.externalSource.delete({ where: { id } });
  return json({ ok: true });
});
