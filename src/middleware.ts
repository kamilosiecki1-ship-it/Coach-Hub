import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const CANONICAL_HOST = "sessionlab.app";

// Paths that require authentication (same as before)
const AUTH_PATHS = ["/pulpit", "/klienci", "/ustawienia"];

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

  // --- Redirect *.vercel.app → sessionlab.app ---
  if (host.endsWith(".vercel.app")) {
    const url = req.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.port = "";
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  // --- NextAuth protection for authenticated routes ---
  const isAuthPath = AUTH_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  if (isAuthPath) {
    const token = await getToken({ req });
    if (!token) {
      const loginUrl = new URL("/logowanie", req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
