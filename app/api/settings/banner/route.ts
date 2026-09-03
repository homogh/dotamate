import { NextResponse } from "next/server";

import { getPlatformSettings } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

export async function GET() {
  const settings = await getPlatformSettings();
  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { text: settings.bannerText, active: settings.bannerActive },
  });
}
