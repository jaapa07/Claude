import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({ status: z.enum(["VISIBLE", "PENDING", "HIDDEN"]) });

async function ensure(id: string) {
  const found = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(404, "Comentário não encontrado");
}

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  const { status } = await parseBody(req, patchSchema);
  const comment = await prisma.comment.update({ where: { id }, data: { status } });
  return json({ comment });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  await ensure(id);
  await prisma.comment.delete({ where: { id } });
  return json({ ok: true });
});
