import { HttpError, json, parseBody, route } from "@/lib/api";
import { chefRequestSchema } from "@/lib/validation";
import { askChef, aiConfigured } from "@/lib/chef";
import { getUserFromRequest } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

/** Status do assistente (sem expor nenhuma credencial). */
export const GET = route(async () => json({ aiConfigured: aiConfigured() }));

export const POST = route(async (req) => {
  const user = await getUserFromRequest(req);
  const key = user ? `chef:u:${user.id}` : `chef:ip:${clientIp(req)}`;
  if (!rateLimit(key, user ? 40 : 15, 60 * 60 * 1000)) {
    throw new HttpError(429, user ? "Você atingiu o limite de mensagens por hora." : "Limite de mensagens atingido. Entre na sua conta para continuar.");
  }
  const { messages } = await parseBody(req, chefRequestSchema);
  if (messages.at(-1)?.role !== "user") throw new HttpError(422, "A última mensagem deve ser do usuário");
  // Contexto do usuário (alergias) vai como observação no último pedido
  const allergies = user?.allergies?.length ? `\n\n(Observação do sistema: o usuário evita ${user.allergies.join(", ")}.)` : "";
  const withContext = messages.map((m, i) => (i === messages.length - 1 && allergies ? { ...m, content: m.content + allergies } : m));
  return json(await askChef(withContext));
});
