import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireMarketUser } from "@/app/lib/shopAccess";
import { MAX_LISTING_PRICE, MIN_LISTING_PRICE, parseListingPrice } from "@/app/lib/marketOrders";
import type { ApiResponse } from "@/app/types/api";

/** Seller edits price/description — only while the listing is still on sale. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const data: { priceToman?: number; description?: string | null } = {};

  if ("priceToman" in (body ?? {})) {
    const price = parseListingPrice(body.priceToman);
    if (price === null) {
      return NextResponse.json<ApiResponse>(
        { status: "error", message: `قیمت باید بین ${MIN_LISTING_PRICE.toLocaleString("fa-IR")} و ${MAX_LISTING_PRICE.toLocaleString("fa-IR")} تومان باشد.`, data: null },
        { status: 400 },
      );
    }
    data.priceToman = price;
  }
  if ("description" in (body ?? {})) data.description = String(body.description ?? "").trim().slice(0, 1000) || null;

  const { count } = await prisma.marketListing.updateMany({ where: { id: Number(id), sellerId: auth.session.id, status: "ACTIVE" }, data });
  if (count === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط آگهی‌های فعال خودت قابل ویرایش هستند.", data: null }, { status: 409 });
  }
  return NextResponse.json<ApiResponse>({ status: "success", message: "آگهی به‌روز شد.", data: null });
}

/** Seller takes the listing down. A listing someone has already paid for can't be pulled this way. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { count } = await prisma.marketListing.updateMany({
    where: { id: Number(id), sellerId: auth.session.id, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
  if (count === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "این آگهی فعال نیست یا خریدار دارد.", data: null }, { status: 409 });
  }
  return NextResponse.json<ApiResponse>({ status: "success", message: "آگهی حذف شد.", data: null });
}
