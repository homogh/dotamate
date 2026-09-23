import { NextRequest, NextResponse } from "next/server";

import { requireSuperAdmin } from "@/app/lib/superAdmin";
import { saveUploadedImage } from "@/app/lib/imageUpload";
import type { ApiResponse } from "@/app/types/api";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const form = await request.formData().catch(() => null);
  const saved = await saveUploadedImage(form?.get("file"), "shop");
  if (saved.error) {
    return NextResponse.json<ApiResponse>({ status: "error", message: saved.error, data: null }, { status: 400 });
  }

  return NextResponse.json<ApiResponse>({ status: "success", message: "آپلود شد.", data: { url: saved.url } });
}
