import { createHmac, timingSafeEqual } from "crypto";

import { siteUrl } from "@/app/lib/emailLayout";

// Stateless signed link: the token is an HMAC of the user id, so unsubscribing
// works straight from the inbox without signing in (and without a DB table).
function sign(userId: number) {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: number, token: string) {
  const expected = sign(userId);
  return token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Landing page with a confirm button — a plain GET must not unsubscribe,
// since mail scanners open every link in the message.
export function unsubscribePageUrl(userId: number) {
  return siteUrl(`/unsubscribe?u=${userId}&t=${sign(userId)}`);
}

// RFC 8058 one-click endpoint (List-Unsubscribe header) and the page's form target.
export function unsubscribeActionUrl(userId: number) {
  return siteUrl(`/api/email/unsubscribe?u=${userId}&t=${sign(userId)}`);
}
