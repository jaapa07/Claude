import "server-only";
import { aiChef, aiConfigured } from "./ai";
import { localChef } from "./local";
import type { ChefMessage, ChefResponse } from "./types";

export async function askChef(messages: ChefMessage[]): Promise<ChefResponse & { notice?: string }> {
  if (aiConfigured()) {
    try {
      return await aiChef(messages);
    } catch (err) {
      console.error("[chef-ia] falha no provedor, usando modo local:", err instanceof Error ? err.message : err);
      const local = await localChef(messages);
      return { ...local, notice: "O provedor de IA não respondeu agora; esta resposta veio do modo local (catálogo do app)." };
    }
  }
  return localChef(messages);
}

export { aiConfigured };
