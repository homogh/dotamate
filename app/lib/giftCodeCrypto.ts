import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

/**
 * Gift-card codes are money, so they're stored encrypted (AES-256-GCM) and
 * de-duplicated by HMAC — a DB dump alone never exposes a usable code.
 * The key comes from GIFT_CODE_SECRET; changing it makes existing codes unreadable.
 */
function getKey() {
  const secret = process.env.GIFT_CODE_SECRET;
  if (!secret) throw new Error("GIFT_CODE_SECRET is not set");
  return createHash("sha256").update(secret).digest();
}

export function normalizeGiftCode(code: string) {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function encryptGiftCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptGiftCode(payload: string) {
  const [iv, tag, encrypted] = payload.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function hashGiftCode(normalizedCode: string) {
  return createHmac("sha256", getKey()).update(normalizedCode).digest("hex");
}
