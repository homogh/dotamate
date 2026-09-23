import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Validates and stores an admin-uploaded image under public/uploads/<folder>/<YYYY-MM>/.
 * Returns the public URL, or a Persian error message for the client.
 */
export async function saveUploadedImage(file: unknown, folder: string): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  if (!file || !(file instanceof File)) return { error: "فایلی ارسال نشد." };

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "فرمت تصویر مجاز نیست. فقط JPG، PNG، WEBP و GIF." };
  if (file.size > MAX_SIZE_BYTES) return { error: "حجم تصویر نباید بیشتر از ۵ مگابایت باشد." };

  const yearMonth = new Date().toISOString().slice(0, 7);
  const dir = path.join(process.cwd(), "public", "uploads", folder, yearMonth);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return { url: `/uploads/${folder}/${yearMonth}/${filename}` };
}
