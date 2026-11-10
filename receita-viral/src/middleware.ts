import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

const PROTECTED = ["/conta", "/planejador", "/compras", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proteção CSRF: requisições que alteram estado na API precisam vir da mesma origem.
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (origin) {
      try {
        if (new URL(origin).host !== host) return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
      } catch {
        return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/conta/:path*", "/planejador/:path*", "/compras/:path*", "/admin/:path*"],
};
