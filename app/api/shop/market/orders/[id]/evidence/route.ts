import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireMarketUser } from "@/app/lib/shopAccess";
import { EVIDENCE_MAX_FILES, EVIDENCE_VIDEO_TYPES } from "@/app/lib/behavior";
import { saveMarketEvidence, validateMarketEvidence, type SavedMarketEvidence } from "@/app/lib/marketOrderEvidence";
import type { ApiResponse } from "@/app/types/api";

/**
 * Dispute evidence upload — buyer or seller attach screenshots/short clips of
 * the Steam trade offer so admins can rule on a DISPUTED market order. Open
 * only while the order is actually disputed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMarketUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const order = await prisma.marketOrder.findUnique({ where: { id: Number(id) }, select: { id: true, buyerId: true, sellerId: true, status: true } });
  if (!order || (order.buyerId !== auth.session.id && order.sellerId !== auth.session.id)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "سفارش پیدا نشد.", data: null }, { status: 404 });
  }
  if (order.status !== "DISPUTED") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط برای سفارش‌های در حال اختلاف می‌توان مدرک پیوست کرد.", data: null }, { status: 409 });
  }

  const form = await request.formData().catch(() => null);
  const files = form ? form.getAll("files").filter((f): f is File => f instanceof File) : [];
  if (files.length === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فایلی انتخاب نشده.", data: null }, { status: 400 });
  }
  const existing = await prisma.marketOrderAttachment.count({ where: { marketOrderId: order.id, uploaderId: auth.session.id } });
  if (existing + files.length > EVIDENCE_MAX_FILES) {
    return NextResponse.json<ApiResponse>({ status: "error", message: `حداکثر ${EVIDENCE_MAX_FILES.toLocaleString("fa-IR")} فایل می‌تونی بفرستی.`, data: null }, { status: 400 });
  }
  if (files.filter((f) => f.type in EVIDENCE_VIDEO_TYPES).length > 1) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فقط یک ویدیو می‌تونی بفرستی.", data: null }, { status: 400 });
  }
  for (const file of files) {
    const err = validateMarketEvidence(file);
    if (err) return NextResponse.json<ApiResponse>({ status: "error", message: err, data: null }, { status: 400 });
  }

  const saved: SavedMarketEvidence[] = [];
  for (const file of files) {
    const result = await saveMarketEvidence(file);
    if ("error" in result) return NextResponse.json<ApiResponse>({ status: "error", message: result.error, data: null }, { status: 400 });
    saved.push(result);
  }

  await prisma.marketOrderAttachment.createMany({
    data: saved.map((s) => ({ marketOrderId: order.id, uploaderId: auth.session.id, kind: s.kind, path: s.path, mimeType: s.mimeType, size: s.size })),
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "مدرک ثبت شد.", data: null });
}
