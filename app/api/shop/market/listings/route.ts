import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireMarketUser } from "@/app/lib/shopAccess";
import { fetchDotaInventory, INVENTORY_ERROR_STATUS, INVENTORY_ERRORS } from "@/app/lib/steamInventory";
import { MAX_ACTIVE_LISTINGS, MAX_LISTING_PRICE, MIN_LISTING_PRICE, parseListingPrice } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

/** Lists one item from the seller's own inventory. Ownership and tradability are checked against Steam, not the client. */
export async function POST(request: NextRequest) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;
  const sellerId = auth.session.id;

  const body = await request.json().catch(() => null);
  const assetId = String(body?.assetId ?? "").trim();
  const priceToman = parseListingPrice(body?.priceToman);
  const description = String(body?.description ?? "").trim().slice(0, 1000) || null;

  if (!/^\d{1,32}$/.test(assetId)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "آیتم انتخاب نشده.", data: null }, { status: 400 });
  }
  if (priceToman === null) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: `قیمت باید بین ${MIN_LISTING_PRICE.toLocaleString("fa-IR")} و ${MAX_LISTING_PRICE.toLocaleString("fa-IR")} تومان باشد.`, data: null },
      { status: 400 },
    );
  }

  const [user, activeCount, clash] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, select: { steamId: true, banned: true } }),
    prisma.marketListing.count({ where: { sellerId, status: { in: ["ACTIVE", "RESERVED"] } } }),
    prisma.marketListing.findFirst({ where: { assetId, status: { in: ["ACTIVE", "RESERVED"] } }, select: { id: true } }),
  ]);

  if (!user || user.banned) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "حساب شما مسدود است.", data: null }, { status: 403 });
  }
  if (!user.steamId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "برای فروش، اول اکانت استیمت را در تنظیمات وصل کن.", data: null }, { status: 409 });
  }
  if (clash) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این آیتم همین حالا در بازار آگهی شده است.", data: null }, { status: 409 });
  }
  if (activeCount >= MAX_ACTIVE_LISTINGS) {
    return NextResponse.json<ApiResponse>({ status: "error", message: `حداکثر ${MAX_ACTIVE_LISTINGS.toLocaleString("fa-IR")} آگهی فعال مجاز است.`, data: null }, { status: 409 });
  }

  const inventory = await fetchDotaInventory(user.steamId, { fresh: true });
  if (!inventory.ok) {
    return NextResponse.json<ApiResponse>({ status: "error", message: INVENTORY_ERRORS[inventory.reason], data: null }, { status: INVENTORY_ERROR_STATUS[inventory.reason] });
  }
  const item = inventory.items.find((i) => i.assetId === assetId);
  if (!item) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این آیتم در اینونتوری استیم شما پیدا نشد.", data: null }, { status: 404 });
  }
  if (!item.tradable) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این آیتم فعلاً در استیم قابل ترید نیست.", data: null }, { status: 409 });
  }

  const listing = await prisma.marketListing.create({
    data: {
      sellerId,
      assetId: item.assetId,
      classId: item.classId,
      instanceId: item.instanceId,
      itemName: item.name.slice(0, 190),
      itemType: item.type?.slice(0, 190) ?? null,
      iconUrl: item.iconUrl,
      rarity: item.rarity,
      heroName: item.heroName,
      priceToman,
      description,
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "آگهی ثبت شد و در بازار نمایش داده می‌شود.", data: { id: listing.id } });
}
