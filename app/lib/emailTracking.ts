import { createHmac, timingSafeEqual } from "crypto";

import { siteUrl } from "@/app/lib/emailLayout";

// Open/click tracking for EmailLog rows. Links are signed so nobody can forge
// opens for other rows or turn /api/email/click into an open redirect.
function sign(payload: string) {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(`email-track:${payload}`).digest("hex").slice(0, 24);
}

function matches(payload: string, signature: string) {
  const expected = sign(payload);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function emailOpenPixelUrl(logId: number) {
  return siteUrl(`/api/email/open?id=${logId}&s=${sign(`open:${logId}`)}`);
}

// `path` is a site-relative path ("/signup/steam?…"); the click endpoint
// records the click and redirects there.
export function emailClickUrl(logId: number, path: string) {
  return siteUrl(`/api/email/click?id=${logId}&to=${encodeURIComponent(path)}&s=${sign(`click:${logId}:${path}`)}`);
}

export function verifyOpenSignature(logId: number, signature: string) {
  return matches(`open:${logId}`, signature);
}

export function verifyClickSignature(logId: number, path: string, signature: string) {
  // Only same-site paths; "//host" would be protocol-relative.
  return path.startsWith("/") && !path.startsWith("//") && matches(`click:${logId}:${path}`, signature);
}
