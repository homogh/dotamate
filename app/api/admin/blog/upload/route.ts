import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import { saveUploadedImage } from "@/app/lib/imageUpload";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "وارد نشدی.", data: null }, { status: 401 });
  }

  const admin = await getAdminSession(session.id);
  if (!admin || !hasAccess(admin, "BLOG", "EDIT")) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "دسترسی نداری.", data: null }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const saved = await saveUploadedImage(form?.get("file"), "blog");
  if (saved.error) {
    return NextResponse.json<ApiResponse>({ status: "error", message: saved.error, data: null }, { status: 400 });
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "آپلود شد.", data: { url: saved.url } });
}
