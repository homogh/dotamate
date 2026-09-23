import { NextResponse } from "next/server";

import { isShopEnabled } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

/** Public flag the navbar reads to decide whether to show the shop link. */
export async function GET() {
  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: { enabled: await isShopEnabled() },
  });
}
