import { NextRequest, NextResponse } from "next/server";
import type { Prisma, ShopOrderStatus } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import type { ApiResponse } from "@/app/types/api";

const FILTERS: Record<string, Prisma.ShopOrderWhereInput> = {
  action: { status: { in: ["AWAITING_CODE", "AWAITING_DELIVERY"] } },
  delivered: { status: "DELIVERED" },
  refunded: { status: "REFUNDED" },
  all: { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] as ShopOrderStatus[] } },
};

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const filter = FILTERS[request.nextUrl.searchParams.get("filter") ?? "action"] ?? FILTERS.action;

  const [orders, needsAction, revenue] = await Promise.all([
    prisma.shopOrder.findMany({
      where: filter,
      include: {
        product: { select: { title: true, type: true } },
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { paidAt: "asc" },
      take: 200,
    }),
    prisma.shopOrder.count({ where: FILTERS.action }),
    prisma.shopOrder.aggregate({ where: { status: "DELIVERED" }, _sum: { totalToman: true }, _count: true }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      needsAction,
      deliveredCount: revenue._count,
      deliveredTotal: revenue._sum.totalToman ?? 0,
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        productTitle: o.product.title,
        productType: o.product.type,
        userId: o.user.id,
        userName: o.user.displayName,
        totalToman: o.totalToman,
        paymentMethod: o.paymentMethod,
        tradeUrl: o.tradeUrl,
        paidAt: o.paidAt,
        deliveredAt: o.deliveredAt,
      })),
    },
  });
}
