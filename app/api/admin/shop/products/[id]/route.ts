import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import prisma from "@/app/lib/prisma";
import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { parseProductBody } from "@/app/lib/shopProducts";
import { uniqueProductSlug } from "@/app/lib/shopSlug";
import type { ApiResponse } from "@/app/types/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const product = await prisma.shopProduct.findUnique({ where: { id: Number(id) } });
  if (!product) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "محصول پیدا نشد.", data: null }, { status: 404 });
  }
  return NextResponse.json<ApiResponse>({ status: "success", message: "ok", data: product });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  // A bare { active } toggles visibility; anything else is a full edit.
  let data: Prisma.ShopProductUpdateInput;
  if (body && Object.keys(body).length === 1 && typeof body.active === "boolean") {
    data = { active: body.active };
  } else {
    const parsed = parseProductBody(body);
    if (!parsed.data) {
      return NextResponse.json<ApiResponse>({ status: "error", message: parsed.error, data: null }, { status: 400 });
    }
    const { slugInput, ...fields } = parsed.data;
    data = { ...fields, slug: await uniqueProductSlug(slugInput || fields.title, Number(id)) };
  }

  await prisma.shopProduct.update({ where: { id: Number(id) }, data });
  await prisma.auditLog.create({
    data: { actorId: auth.session.id, action: "UPDATE_SHOP_PRODUCT", targetType: "ShopProduct", targetId: Number(id), detail: JSON.stringify(data) },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "ذخیره شد.", data: null });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const productId = Number(id);

  const [codes, orders] = await Promise.all([
    prisma.giftCode.count({ where: { productId } }),
    prisma.shopOrder.count({ where: { productId } }),
  ]);
  if (codes > 0 || orders > 0) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "این محصول کد یا سفارش ثبت‌شده دارد و قابل حذف نیست؛ به‌جای حذف، غیرفعالش کن.", data: null },
      { status: 409 },
    );
  }

  const product = await prisma.shopProduct.delete({ where: { id: productId } });
  await prisma.auditLog.create({
    data: { actorId: auth.session.id, action: "DELETE_SHOP_PRODUCT", targetType: "ShopProduct", targetId: productId, detail: product.title },
  });

  return NextResponse.json<ApiResponse>({ status: "success", message: "محصول حذف شد.", data: null });
}
