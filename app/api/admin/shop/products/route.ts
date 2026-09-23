import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { getShopSettings, priceToman } from "@/app/lib/shopPricing";
import { parseProductBody } from "@/app/lib/shopProducts";
import { uniqueProductSlug } from "@/app/lib/shopSlug";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const [products, settings, stock, waiting] = await Promise.all([
    prisma.shopProduct.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { id: "asc" }] }),
    getShopSettings(),
    prisma.giftCode.groupBy({ by: ["productId"], where: { status: "AVAILABLE" }, _count: true }),
    prisma.shopOrder.groupBy({ by: ["productId"], where: { status: "AWAITING_CODE" }, _count: true }),
  ]);

  const stockBy = new Map(stock.map((s) => [s.productId, s._count]));
  const waitingBy = new Map(waiting.map((w) => [w.productId, w._count]));

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      lowStockThreshold: settings.lowStockThreshold,
      products: products.map((p) => ({
        ...p,
        priceToman: priceToman(p.priceUsdCents, p.type, settings),
        availableCodes: stockBy.get(p.id) ?? 0,
        waitingOrders: waitingBy.get(p.id) ?? 0,
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const parsed = parseProductBody(await request.json().catch(() => null));
  if (!parsed.data) {
    return NextResponse.json<ApiResponse>({ status: "error", message: parsed.error, data: null }, { status: 400 });
  }

  const { slugInput, ...fields } = parsed.data;
  const [maxOrder, slug] = await Promise.all([
    prisma.shopProduct.aggregate({ _max: { sortOrder: true } }),
    uniqueProductSlug(slugInput || fields.title),
  ]);
  const product = await prisma.shopProduct.create({
    data: { ...fields, slug, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  });

  await prisma.auditLog.create({
    data: { actorId: auth.session.id, action: "CREATE_SHOP_PRODUCT", targetType: "ShopProduct", targetId: product.id, detail: product.title },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "محصول اضافه شد.", data: { id: product.id, slug } });
}
