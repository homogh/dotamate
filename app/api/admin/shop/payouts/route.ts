import { NextRequest, NextResponse } from "next/server";
import type { WithdrawalStatus } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import type { ApiResponse } from "@/app/types/api";

const STATUSES: WithdrawalStatus[] = ["PENDING", "PAID", "REJECTED"];

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const requested = request.nextUrl.searchParams.get("status") as WithdrawalStatus | null;
  const status = requested && STATUSES.includes(requested) ? requested : "PENDING";

  const [requests, pending] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { status },
      include: { user: { select: { id: true, displayName: true } }, processedBy: { select: { displayName: true } } },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 200,
    }),
    prisma.withdrawalRequest.aggregate({ where: { status: "PENDING" }, _sum: { amountToman: true }, _count: true }),
  ]);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: {
      pendingCount: pending._count,
      pendingTotal: pending._sum.amountToman ?? 0,
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.user.id,
        userName: r.user.displayName,
        amountToman: r.amountToman,
        sheba: r.sheba,
        holderName: r.holderName,
        status: r.status,
        trackingRef: r.trackingRef,
        adminNote: r.adminNote,
        processedByName: r.processedBy?.displayName ?? null,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
    },
  });
}
