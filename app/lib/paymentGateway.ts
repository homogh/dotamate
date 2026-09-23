/**
 * Payment gateway adapter. Real payments go through ZarinPal v4 (amounts sent
 * in Toman via currency "IRT"). For local testing, PAYMENT_MOCK=true swaps in
 * a fake bank page — it's ignored whenever ZARINPAL_MERCHANT_ID is set, and
 * must never be set on the live server.
 */

const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function zarinpalBase() {
  return process.env.ZARINPAL_SANDBOX === "true" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
}

export function gatewayName() {
  if (process.env.ZARINPAL_MERCHANT_ID) return "zarinpal";
  if (process.env.PAYMENT_MOCK === "true") return "mock";
  throw new Error("No payment gateway configured (set ZARINPAL_MERCHANT_ID)");
}

export function isMockGateway() {
  return !process.env.ZARINPAL_MERCHANT_ID && process.env.PAYMENT_MOCK === "true";
}

export const PAYMENT_CALLBACK_URL = `${SITE_URL}/api/shop/payment/callback`;

interface PaymentRequest {
  amountToman: number;
  description: string;
  email?: string | null;
  mobile?: string | null;
}

/** Starts a payment; returns the gateway's authority token and where to send the user. */
export async function requestPayment(input: PaymentRequest): Promise<{ authority: string; redirectUrl: string }> {
  if (gatewayName() === "mock") {
    const authority = `MOCK${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    return { authority, redirectUrl: `/shop/mock-pay?authority=${authority}&amount=${input.amountToman}` };
  }

  const res = await fetch(`${zarinpalBase()}/pg/v4/payment/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      merchant_id: process.env.ZARINPAL_MERCHANT_ID,
      amount: input.amountToman,
      currency: "IRT",
      callback_url: PAYMENT_CALLBACK_URL,
      description: input.description,
      metadata: { email: input.email ?? undefined, mobile: input.mobile ?? undefined },
    }),
  });
  const json = await res.json().catch(() => null);

  if (json?.data?.code !== 100 || !json.data.authority) {
    throw new Error(`ZarinPal request failed: ${JSON.stringify(json?.errors ?? json)}`);
  }

  return { authority: json.data.authority, redirectUrl: `${zarinpalBase()}/pg/StartPay/${json.data.authority}` };
}

/** Confirms with the gateway that the money actually arrived. Never trust the callback's Status alone. */
export async function verifyPayment(authority: string, amountToman: number): Promise<{ ok: boolean; refId?: string; cardPan?: string }> {
  if (authority.startsWith("MOCK")) {
    if (!isMockGateway()) return { ok: false };
    return { ok: true, refId: `MOCK-${authority.slice(-6)}` };
  }

  const res = await fetch(`${zarinpalBase()}/pg/v4/payment/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ merchant_id: process.env.ZARINPAL_MERCHANT_ID, amount: amountToman, currency: "IRT", authority }),
  });
  const json = await res.json().catch(() => null);
  const code = json?.data?.code;

  // 100 = verified now, 101 = already verified earlier (e.g. user refreshed the callback).
  if (code !== 100 && code !== 101) return { ok: false };
  return { ok: true, refId: String(json.data.ref_id), cardPan: json.data.card_pan };
}
