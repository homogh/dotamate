import type { ShopProductType, ShopSetting } from "@prisma/client";

import prisma from "@/app/lib/prisma";

/** Singleton shop settings row (id always 1) — created on first read if missing. */
export async function getShopSettings() {
  const existing = await prisma.shopSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.shopSetting.create({ data: { id: 1 } });
}

type PricingSettings = Pick<ShopSetting, "usdCostToman" | "giftCardMarginPercent" | "itemMarginPercent">;

/**
 * Cost-plus Toman price: dollars × what a Steam dollar costs us × (1 + margin),
 * rounded up to the next 1,000 Toman. Returns null while the dollar cost
 * hasn't been set yet, so nothing can be sold at a price of zero.
 */
export function priceToman(priceUsdCents: number, type: ShopProductType, settings: PricingSettings) {
  if (settings.usdCostToman <= 0) return null;

  const margin = type === "GIFT_CARD" ? settings.giftCardMarginPercent : settings.itemMarginPercent;
  const raw = (priceUsdCents / 100) * settings.usdCostToman * (1 + margin / 100);
  return Math.ceil(raw / 1000) * 1000;
}

/** Current hour in Tehran (0–23), independent of the server's own timezone. */
export function tehranHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Tehran" }).format(date));
}

export function isWithinWorkHours(settings: Pick<ShopSetting, "workStartHour" | "workEndHour">, date = new Date()) {
  const hour = tehranHour(date);
  return hour >= settings.workStartHour && hour < settings.workEndHour;
}
