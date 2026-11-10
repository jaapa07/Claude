import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rv_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export interface SessionPayload {
  sub: string;
  role: "USER" | "ADMIN";
  name: string;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja .env.example.");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuer("receita-viral")
    .sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "receita-viral", algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const role = payload.role === "ADMIN" ? "ADMIN" : "USER";
    return { sub: payload.sub, role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
