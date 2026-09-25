import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getSharedMatchList } from "@/app/lib/sharedMatches";
import type { ApiResponse } from "@/app/types/api";

// The reported player's recent matches, each marked with whether the
// reporter was in it too — only those can be reported (either team).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { id } = await params;
  const data = await getSharedMatchList(session.id, Number(id));

  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data });
}
