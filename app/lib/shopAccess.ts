import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/app/lib/auth";
import { isShopEnabled } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

type ShopGuardResult = { session: SessionPayload; error?: never } | { session?: never; error: NextResponse<ApiResponse> };

/** API guard for buyer-facing shop routes: signed in, and the shop open to them. */
export async function requireShopUser(request: NextRequest): Promise<ShopGuardResult> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "برای خرید اول وارد حسابت شو.", data: null }, { status: 401 }) };
  }

  if (!(await isShopEnabled())) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "فروشگاه در حال حاضر در دسترس نیست.", data: null }, { status: 404 }) };
  }

  return { session };
}

/** Extra notification filter so a switched-off shop leaves no trace: every shop notification is SHOP_ORDER. */
export async function notificationVisibilityFilter(): Promise<Prisma.NotificationWhereInput> {
  return (await isShopEnabled()) ? {} : { type: { not: "SHOP_ORDER" } };
}
