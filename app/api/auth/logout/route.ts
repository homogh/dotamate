import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function POST() {
  const response = NextResponse.json<ApiResponse>({
    status: "success",
    message: "خروج انجام شد.",
    data: null,
  });

  response.cookies.delete(SESSION_COOKIE);

  return response;
}
