import prisma from "@/app/lib/prisma";

export const POST_LIFETIME_MS = 24 * 60 * 60_000;
// The author is warned (notification + banner) this long before expiry and
// can only extend inside this window.
export const POST_WARNING_MS = 60 * 60_000;

interface ExpiryFields {
  createdAt: Date;
  expiresAt: Date | null;
}

// A scheduled lobby's clock starts at its session time, not at creation.
export function initialPostExpiry(startAt: Date | null) {
  const base = startAt && startAt.getTime() > Date.now() ? startAt.getTime() : Date.now();
  return new Date(base + POST_LIFETIME_MS);
}

export function effectivePostExpiry(post: ExpiryFields) {
  return post.expiresAt ?? new Date(post.createdAt.getTime() + POST_LIFETIME_MS);
}

export function isInExpiryWarning(post: ExpiryFields) {
  return effectivePostExpiry(post).getTime() - Date.now() <= POST_WARNING_MS;
}

// Warns authors an hour before expiry, then expires whatever is past its time.
// Expired posts move to the "expired" history tab (they can be republished).
export async function processPostExpiry() {
  const now = new Date();
  const candidates = await prisma.post.findMany({
    where: {
      status: { in: ["ACTIVE", "FULL"] },
      OR: [{ expiresAt: null }, { expiresAt: { lte: new Date(now.getTime() + POST_WARNING_MS) } }],
    },
    select: { id: true, authorId: true, createdAt: true, expiresAt: true, expiryWarnedAt: true },
  });

  for (const post of candidates) {
    const expiry = effectivePostExpiry(post);

    if (expiry <= now) {
      // Conditional on expiresAt so an extension that raced with the sweep wins.
      const { count } = await prisma.post.updateMany({
        where: { id: post.id, status: { in: ["ACTIVE", "FULL"] }, expiresAt: post.expiresAt },
        data: { status: "EXPIRED" },
      });
      if (count === 1) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: "SYSTEM",
            title: "پستت منقضی شد",
            body: "پست لابیت ۲۴ ساعت از انتشارش گذشته بود و به‌صورت خودکار از لابی برداشته شد. می‌تونی دوباره منتشرش کنی.",
            link: "/dashboard/my-posts",
          },
        });
      }
    } else if (!post.expiryWarnedAt && expiry.getTime() - now.getTime() <= POST_WARNING_MS) {
      const { count } = await prisma.post.updateMany({
        where: { id: post.id, status: { in: ["ACTIVE", "FULL"] }, expiryWarnedAt: null },
        data: { expiryWarnedAt: now },
      });
      if (count === 1) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: "SYSTEM",
            title: "پستت داره حذف می‌شه",
            body: "پست لابیت کمتر از یک ساعت دیگه به‌صورت خودکار حذف می‌شه. اگه می‌خوای ۲۴ ساعت دیگه بمونه، از صفحه پست‌هام نگهش دار.",
            link: "/dashboard/my-posts",
          },
        });
      }
    }
  }
}
