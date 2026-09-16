import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getAdminSession, hasAccess } from "@/app/lib/permissions";
import type { ApiResponse } from "@/app/types/api";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json<ApiResponse>({ status: "error", message: "فایلی ارسال نشد.", data: null }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "فرمت تصویر مجاز نیست. فقط JPG، PNG، WEBP و GIF.", data: null },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json<ApiResponse>(
      { status: "error", message: "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.", data: null },
      { status: 400 },
    );
  }

  const yearMonth = new Date().toISOString().slice(0, 7);
  const dir = path.join(process.cwd(), "public", "uploads", "blog", yearMonth);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return NextResponse.json<ApiResponse>({
    status: "success",
    message: "آپلود شد.",
    data: { url: `/uploads/blog/${yearMonth}/${filename}` },
  });
}
