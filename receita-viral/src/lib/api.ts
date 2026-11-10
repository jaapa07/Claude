import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getUserFromRequest, type CurrentUser } from "@/lib/auth/session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}

/** Envolve um handler com tratamento de erro padronizado. */
export function route<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Corpo da requisição precisa ser JSON válido");
  }
  return schema.parse(body);
}

export async function requireUser(req: Request): Promise<CurrentUser> {
  const user = await getUserFromRequest(req);
  if (!user) throw new HttpError(401, "Faça login para continuar");
  return user;
}

export async function requireAdmin(req: Request): Promise<CurrentUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") throw new HttpError(403, "Acesso restrito a administradores");
  return user;
}

export function searchParams(req: Request) {
  return new URL(req.url).searchParams;
}
