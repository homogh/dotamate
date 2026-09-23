import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/app/lib/auth";
import { getAdminSession } from "@/app/lib/permissions";
import { isMarketEnabled, isShopEnabled } from "@/app/lib/platformSettings";
import type { ApiResponse } from "@/app/types/api";

type ShopGuardResult = { session: SessionPayload; error?: never } | { session?: never; error: NextResponse<ApiResponse> };

/** Whether this user may use the shop right now: it's switched on, or they're the «مدیر کل» previewing it. */
export async function canUseShop(userId: number | null) {
  if (await isShopEnabled()) return true;
  if (!userId) return false;
  const admin = await getAdminSession(userId);
  return Boolean(admin?.isSuperAdmin);
}

/** Same idea for the user market: open to everyone while its switch is on, otherwise only to the «مدیر کل». */
export async function canUseMarket(userId: number | null) {
  if (await isMarketEnabled()) return true;
  if (!userId) return false;
  const admin = await getAdminSession(userId);
  return Boolean(admin?.isSuperAdmin);
}

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
  if (!(await canUseMarket(session.id))) {
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

  if (!(await canUseShop(session.id))) {
    return { error: NextResponse.json<ApiResponse>({ status: "error", message: "فروشگاه در حال حاضر در دسترس نیست.", data: null }, { status: 404 }) };
  }

  return { session };
}

/**
 * Anyone who ever bought, sold or holds a balance keeps their orders/wallet
 * pages even while the shop is switched off — that's their money.
 */
export async function hasShopHistory(userId: number) {
  const [wallet, orders, market] = await Promise.all([
    prisma.walletTransaction.findFirst({ where: { userId }, select: { id: true } }),
    prisma.shopOrder.findFirst({ where: { userId }, select: { id: true } }),
    prisma.marketOrder.findFirst({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, select: { id: true } }),
  ]);
  return Boolean(wallet || orders || market);
}

const MARKET_LINK_PREFIXES = ["/shop/market", "/dashboard/market-orders", "/dashboard/listings", "/dashboard/sales", "/admin/shop/market"];

/**
 * Extra notification filter: while the market is closed to this user, its
 * notifications disappear too (their links would only 404). Rows without a
 * link are kept explicitly — `NOT (link LIKE ...)` is NULL for them in SQL.
 */
export async function notificationVisibilityFilter(userId: number): Promise<Prisma.NotificationWhereInput> {
  if (await canUseMarket(userId)) return {};
  return { OR: [{ link: null }, { NOT: { OR: MARKET_LINK_PREFIXES.map((prefix) => ({ link: { startsWith: prefix } })) } }] };
}
