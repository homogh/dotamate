import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import type { ApiResponse } from "@/app/types/api";

/** Voids an unsold code (e.g. stocked by mistake). Codes already given to a buyer can't be voided. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { count } = await prisma.giftCode.updateMany({
    where: { id: Number(id), status: "AVAILABLE" },
    data: { status: "VOID" },
  });

  if (count === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط کدهای فروخته‌نشده قابل ابطال هستند.", data: null }, { status: 409 });
  }

  await prisma.auditLog.create({
    data: { actorId: auth.session.id, action: "VOID_GIFT_CODE", targetType: "GiftCode", targetId: Number(id) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "کد باطل شد.", data: null });
}
