import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { buildSteamLoginUrl } from "@/app/lib/steam";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const origin = process.env.NEXT_PUBLIC_API_URL!;
  if (!session) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const loginUrl = buildSteamLoginUrl(`${origin}/api/auth/steam/callback`, origin);

  return NextResponse.redirect(loginUrl);
}
