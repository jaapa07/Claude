import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, route } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/token";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const POST = route(async (req) => {
  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000)) throw new HttpError(429, "Muitas tentativas. Tente novamente mais tarde.");
  const data = await parseBody(req, registerSchema);
  const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) throw new HttpError(409, "Já existe uma conta com este e-mail");
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) },
    select: { id: true, name: true, email: true, role: true },
  });
  await prisma.notification.create({
    data: { userId: user.id, title: "Boas-vindas ao Receita Viral! 🎉", body: "Salve favoritos, monte seu cardápio da semana e converse com o Chef IA.", link: "/chef" },
  });
  const res = json({ user }, 201);
  res.cookies.set(SESSION_COOKIE, await signSession({ sub: user.id, role: user.role, name: user.name }), sessionCookieOptions());
  return res;
});
