import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { ApiResponse } from "@/app/types/api";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const { userId } = await params;
  const friendId = Number(userId);

  await prisma.friendship.deleteMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: session.id, addresseeId: friendId },
        { requesterId: friendId, addresseeId: session.id },
      ],
    },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "از لیست دوستان حذف شد.", data: { state: "NONE" } });
}
