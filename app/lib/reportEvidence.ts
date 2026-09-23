import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  EVIDENCE_IMAGE_TYPES,
  EVIDENCE_MAX_IMAGE_BYTES,
  EVIDENCE_MAX_VIDEO_BYTES,
  EVIDENCE_MAX_VIDEO_SECONDS,
  EVIDENCE_VIDEO_TYPES,
} from "@/app/lib/behavior";

// Deliberately NOT under /public: report evidence is private and is only
// streamed back through /api/reports/attachments/[id] after an admin check.
// (Files dropped into /public after `next build` aren't served anyway.)
export const EVIDENCE_ROOT = path.join(process.cwd(), "storage", "reports");

export interface SavedEvidence {
  kind: "IMAGE" | "VIDEO";
  path: string;
  mimeType: string;
  size: number;
}

// Reads the duration straight out of an MP4/MOV `mvhd` box so the 10s video
// limit isn't only enforced by the browser. WebM has no cheap equivalent,
// so it returns null there and the client-side check is what applies.
function readMp4DurationSeconds(bytes: Buffer): number | null {
  const i = bytes.indexOf("mvhd");
  if (i < 0 || i + 36 > bytes.length) return null;

  const version = bytes[i + 4];
  const timescale = version === 1 ? bytes.readUInt32BE(i + 24) : bytes.readUInt32BE(i + 16);
  const duration = version === 1 ? Number(bytes.readBigUInt64BE(i + 28)) : bytes.readUInt32BE(i + 20);
  if (!timescale) return null;

  return duration / timescale;
}

export function validateEvidence(file: File): string | null {
  const isImage = file.type in EVIDENCE_IMAGE_TYPES;
  const isVideo = file.type in EVIDENCE_VIDEO_TYPES;

  if (!isImage && !isVideo) return "فرمت فایل مجاز نیست. فقط JPG، PNG، WEBP، MP4، WEBM و MOV.";
  if (isImage && file.size > EVIDENCE_MAX_IMAGE_BYTES) return "حجم هر عکس نباید بیشتر از ۵ مگابایت باشد.";
  if (isVideo && file.size > EVIDENCE_MAX_VIDEO_BYTES) return "حجم ویدیو نباید بیشتر از ۳۰ مگابایت باشد.";
  return null;
}

export async function saveEvidence(file: File): Promise<SavedEvidence | { error: string }> {
  const isVideo = file.type in EVIDENCE_VIDEO_TYPES;
  const ext = isVideo ? EVIDENCE_VIDEO_TYPES[file.type] : EVIDENCE_IMAGE_TYPES[file.type];
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isVideo) {
    const seconds = readMp4DurationSeconds(bytes);
    // Half a second of slack for encoder rounding on a clip trimmed to exactly 10s.
    if (seconds !== null && seconds > EVIDENCE_MAX_VIDEO_SECONDS + 0.5) {
      return { error: "ویدیو باید حداکثر ۱۰ ثانیه باشد." };
    }
  }

  const yearMonth = new Date().toISOString().slice(0, 7);
  const dir = path.join(EVIDENCE_ROOT, yearMonth);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);

  return { kind: isVideo ? "VIDEO" : "IMAGE", path: `${yearMonth}/${filename}`, mimeType: file.type, size: file.size };
}

// Resolves a stored relative path back to disk, refusing anything that
// would escape EVIDENCE_ROOT.
export function resolveEvidencePath(relPath: string) {
  const full = path.resolve(EVIDENCE_ROOT, relPath);
  return full.startsWith(EVIDENCE_ROOT + path.sep) ? full : null;
}
