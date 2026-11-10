import { prisma } from "@/lib/db";
import { HttpError, json, parseBody, route } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/token";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Hash fictício para equalizar o tempo de resposta quando o e-mail não existe
let dummyHash: Promise<string> | null = null;

export const POST = route(async (req) => {
  const data = await parseBody(req, loginSchema);
  if (!rateLimit(`login:${clientIp(req)}:${data.email}`, 8, 15 * 60 * 1000)) {
    throw new HttpError(429, "Muitas tentativas de login. Aguarde alguns minutos.");
  }
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = await verifyPassword(data.password, user?.passwordHash ?? (await (dummyHash ??= hashPassword("senha-inexistente"))));
  if (!user || !ok) throw new HttpError(401, "E-mail ou senha incorretos");
  if (user.status !== "ACTIVE") throw new HttpError(403, "Esta conta está bloqueada. Fale com o suporte.");
  const res = json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  res.cookies.set(SESSION_COOKIE, await signSession({ sub: user.id, role: user.role, name: user.name }), sessionCookieOptions());
  return res;
});
