import prisma from "@/app/lib/prisma";

/** Singleton settings row (id always 1) — created on first read if missing. */
export async function getPlatformSettings() {
  const existing = await prisma.platformSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.platformSetting.create({ data: { id: 1 } });
}
