import { cachedAvatarUrl } from "@/app/lib/cdnUrls";
import { warmImageCache } from "@/app/lib/imageCache";
import { getHeroLookup, getHeroStats, getItemLookup } from "@/app/lib/opendota";
import prisma from "@/app/lib/prisma";

const REWARM_INTERVAL_MS = 6 * 60 * 60 * 1000;

let started = false;

// Runs once on server start (see instrumentation.ts): primes the OpenDota
// lookups and downloads every hero/item image plus existing users' Steam
// avatars to disk, so the first visitor after a deploy already gets local
// copies. Re-runs periodically to pick up new heroes/items after a patch —
// already-cached files are skipped, so later runs cost almost nothing.
export async function warmStaticAssets() {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      const [heroes, heroStats, items] = await Promise.all([getHeroLookup(), getHeroStats(), getItemLookup()]);
      await warmImageCache([
        ...Object.values(heroes).flatMap((h) => [h.icon, h.img]),
        ...heroStats.flatMap((h) => [h.icon, h.img]),
        ...Object.values(items).map((i) => i.img),
      ]);

      const users = await prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } });
      await warmImageCache(users.map((u) => cachedAvatarUrl(u.avatarUrl) ?? ""));
    } catch (error) {
      console.error("[warmAssets] warm-up failed", error);
    }
  };

  await run();
  setInterval(() => void run(), REWARM_INTERVAL_MS).unref();
}
