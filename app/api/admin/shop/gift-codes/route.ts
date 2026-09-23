import { NextRequest, NextResponse } from "next/server";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { encryptGiftCode, hashGiftCode, normalizeGiftCode } from "@/app/lib/giftCodeCrypto";
import { fulfillWaitingGiftOrders } from "@/app/lib/giftCodes";
import type { ApiResponse } from "@/app/types/api";

const MAX_CODES_PER_BATCH = 500;

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const productId = Number(request.nextUrl.searchParams.get("productId"));
  if (!productId) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "محصول مشخص نشده.", data: null }, { status: 400 });
  }

  // Codes are listed by hint only — the plaintext never leaves the server here.
  const codes = await prisma.giftCode.findMany({
    where: { productId },
    orderBy: { id: "desc" },
    take: 200,
    select: {
      id: true,
      codeHint: true,
      status: true,
      orderId: true,
      assignedAt: true,
      createdAt: true,
      addedBy: { select: { displayName: true } },
    },
  });

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "ok",
    data: codes.map(({ addedBy, ...c }) => ({ ...c, addedByName: addedBy.displayName })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  const product = productId ? await prisma.shopProduct.findUnique({ where: { id: productId } }) : null;
  if (!product || product.type !== "GIFT_CARD") {
    return NextResponse.json<ApiResponse>({ status: "error", message: "محصول گیفت کارت نامعتبر است.", data: null }, { status: 400 });
  }

  const lines: string[] = String(body?.codes ?? "")
    .split(/\r?\n/)
    .map((line: string) => normalizeGiftCode(line))
    .filter((line: string) => line.length > 0);

  if (lines.length === 0) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "هیچ کدی وارد نشده.", data: null }, { status: 400 });
  }
  if (lines.length > MAX_CODES_PER_BATCH) {
    return NextResponse.json<ApiResponse>({ status: "error", message: `حداکثر ${MAX_CODES_PER_BATCH} کد در هر بار.`, data: null }, { status: 400 });
  }

  const invalid = lines.filter((code) => code.length < 5 || code.length > 100);
  const unique = [...new Set(lines.filter((code) => !invalid.includes(code)))];
  const hashes = new Map(unique.map((code) => [hashGiftCode(code), code]));

  const existing = await prisma.giftCode.findMany({ where: { codeHash: { in: [...hashes.keys()] } }, select: { codeHash: true } });
  for (const { codeHash } of existing) hashes.delete(codeHash);

  const toInsert = [...hashes.entries()].map(([codeHash, code]) => ({
    productId,
    codeHash,
    codeEncrypted: encryptGiftCode(code),
    codeHint: code.slice(-4),
    addedById: auth.session.id,
  }));

  if (toInsert.length > 0) {
    await prisma.$transaction([
      prisma.giftCode.createMany({ data: toInsert, skipDuplicates: true }),
      prisma.auditLog.create({
        data: {
          actorId: auth.session.id,
          action: "ADD_GIFT_CODES",
          targetType: "ShopProduct",
          targetId: productId,
          detail: `${toInsert.length} کد به «${product.title}» اضافه شد`,
        },
      }),
    ]);
  }

  const fulfilled = toInsert.length > 0 ? await fulfillWaitingGiftOrders(productId) : 0;
  const duplicates = lines.length - invalid.length - toInsert.length;

  const parts = [`${toInsert.length} کد اضافه شد`];
  if (duplicates > 0) parts.push(`${duplicates} کد تکراری رد شد`);
  if (invalid.length > 0) parts.push(`${invalid.length} کد نامعتبر رد شد`);
  if (fulfilled > 0) parts.push(`${fulfilled} سفارش منتظر تحویل داده شد`);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: parts.join("، ") + ".",
    data: { added: toInsert.length, duplicates, invalid: invalid.length, fulfilled },
  });
}
