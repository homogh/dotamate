import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/signup/"];
const GUEST_ONLY_PATHS = ["/login", "/signup"];

// While maintenance mode is on, these stay reachable so admins can still sign in
// and the maintenance page / its own data endpoint can render.
const MAINTENANCE_OPEN_PREFIXES = ["/maintenance", "/login", "/api/auth", "/api/settings/maintenance", "/api/shop/payment/callback", "/cdn"];

// The middleware runs on the edge and can't reach the database, so the switch is
// read over HTTP from our own API and remembered briefly.
const MAINTENANCE_CACHE_MS = 10_000;
let maintenanceCache: { active: boolean; fetchedAt: number } | null = null;

async function isMaintenanceOn(request: NextRequest) {
  if (maintenanceCache && Date.now() - maintenanceCache.fetchedAt < MAINTENANCE_CACHE_MS) return maintenanceCache.active;

  try {
    const res = await fetch(new URL("/api/settings/maintenance", request.url), { cache: "no-store" });
    const json = await res.json();
    maintenanceCache = { active: json.status === "success" && Boolean(json.data?.active), fetchedAt: Date.now() };
  } catch {
    // Can't tell — fail open rather than lock everyone out.
    return false;
  }
  return maintenanceCache.active;
}

async function hasAdminRole(request: NextRequest) {
  try {
    const res = await fetch(new URL("/api/auth/role", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    const json = await res.json();
    return json.status === "success" && Boolean(json.data);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!MAINTENANCE_OPEN_PREFIXES.some((p) => pathname.startsWith(p)) && (await isMaintenanceOn(request))) {
    if (!session || !(await hasAdminRole(request))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ status: "error", message: "سایت در دست تعمیره.", data: null }, { status: 503 });
      }
      return NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503 });
    }
  }

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
  // Everything except Next internals and anything with a file extension (images, sounds, uploads), so maintenance mode covers the whole site.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
