import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, requireUser, route } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const { currentPassword, newPassword } = await parseBody(req, passwordChangeSchema);
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, row.passwordHash))) throw new HttpError(400, "Senha atual incorreta");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return json({ ok: true });
});
