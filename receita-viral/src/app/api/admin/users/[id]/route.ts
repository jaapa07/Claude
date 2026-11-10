import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireAdmin, route } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({ role: z.enum(["USER", "ADMIN"]).optional(), status: z.enum(["ACTIVE", "BLOCKED"]).optional() })
  .refine((v) => v.role !== undefined || v.status !== undefined, "Informe o papel ou o status");

export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const { id } = await params;
  const body = await parseBody(req, patchSchema);
  if (id === admin.id && (body.role === "USER" || body.status === "BLOCKED")) {
    throw new HttpError(400, "Você não pode remover seu próprio acesso de administrador nem bloquear a si mesmo");
  }
  const found = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(404, "Usuário não encontrado");
  const user = await prisma.user.update({
    where: { id },
    data: body,
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  return json({ user });
});
