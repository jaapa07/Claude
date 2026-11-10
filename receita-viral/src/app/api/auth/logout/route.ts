import { json } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/token";

export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
