import prisma from "@/app/lib/prisma";

/** Singleton settings row (id always 1) — created on first read if missing. */
export async function getPlatformSettings() {
  const existing = await prisma.platformSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.platformSetting.create({ data: { id: 1 } });
}

/** Shop is owner-gated: every /shop page and /api/shop route must check this before serving anything. */
export async function isShopEnabled() {
  const settings = await getPlatformSettings();
  return settings.shopEnabled;
}

/** The user market is a part of the shop: it's open only while both switches are on. */
export async function isMarketEnabled() {
  const settings = await getPlatformSettings();
  return settings.shopEnabled && settings.marketEnabled;
}
