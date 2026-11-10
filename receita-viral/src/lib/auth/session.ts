import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "./token";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  allergies: string[];
  dietaryPrefs: string[];
};

async function loadUser(userId: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true, avatarUrl: true, allergies: true, dietaryPrefs: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, allergies: user.allergies, dietaryPrefs: user.dietaryPrefs };
}

/** Usuário atual em Server Components (lê o cookie via next/headers). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return loadUser(session.sub);
});

/** Usuário atual em Route Handlers (lê o cookie do próprio Request — testável). */
export async function getUserFromRequest(req: Request): Promise<CurrentUser | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const token = match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
  const session = await verifySession(token);
  if (!session) return null;
  return loadUser(session.sub);
}
