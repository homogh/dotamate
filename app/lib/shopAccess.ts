import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/app/lib/auth";
import { isMarketEnabled, isShopEnabled } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

type ShopGuardResult = { session: SessionPayload; error?: never } | { session?: never; error: NextResponse<ApiResponse> };

/**
 * API guard for every /api/shop/market route (listing, buying, and acting on
 * an order). While the market is off it answers 404 exactly like a route that
 * doesn't exist.
 */
export async function requireMarketUser(request: NextRequest): Promise<ShopGuardResult> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "اول وارد حسابت شو.", data: null }, { status: 401 }) };
  }
  if (!(await isMarketEnabled())) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "یافت نشد.", data: null }, { status: 404 }) };
  }
  return { session };
}

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

const MARKET_LINK_PREFIXES = ["/shop/market", "/dashboard/market-orders", "/dashboard/listings", "/dashboard/sales", "/admin/shop/market"];

/**
 * Extra notification filter so a switched-off shop or market leaves no trace:
 * with the shop off every shop notification (all are SHOP_ORDER) is hidden;
 * with only the market off, just the ones pointing at market pages. Rows
 * without a link are kept explicitly — `NOT (link LIKE ...)` is NULL in SQL.
 */
export async function notificationVisibilityFilter(): Promise<Prisma.NotificationWhereInput> {
  if (!(await isShopEnabled())) return { type: { not: "SHOP_ORDER" } };
  if (await isMarketEnabled()) return {};
  return { OR: [{ link: null }, { NOT: { OR: MARKET_LINK_PREFIXES.map((prefix) => ({ link: { startsWith: prefix } })) } }] };
}
