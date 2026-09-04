import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/signup/"];
const GUEST_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (GUEST_ONLY_PATHS.includes(pathname) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/signup/:path*", "/login", "/signup"],
};
