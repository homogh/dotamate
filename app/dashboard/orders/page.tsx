import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { canUseMarket } from "@/app/lib/shopAccess";
import { Card } from "@/components/general/card";
import { OrderStatusBadge } from "@/components/pages/shop/orderStatusBadge";
import { MarketStatusBadge } from "@/components/pages/shop/marketStatusBadge";

interface Row {
  key: string;
  href: string;
  title: string;
  meta: string;
  amount: number;
  date: Date;
  badge: ReactNode;
}

export default async function OrdersPage() {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");
  await processMarketTimeouts();
  const showMarket = await canUseMarket(viewer.id);

  // Abandoned gateway checkouts stay out of the list — they never took money.
  const [shopOrders, marketOrders] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { userId: viewer.id, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
      include: { product: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    showMarket
      ? prisma.marketOrder.findMany({
          where: { buyerId: viewer.id, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
          include: { listing: { select: { itemName: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [],
  ]);

  const rows: Row[] = [
    ...shopOrders.map((o) => ({
      key: `s${o.id}`,
      href: `/dashboard/orders/${o.id}`,
      title: o.product.title,
      meta: `فروشگاه · #${o.id}`,
      amount: o.totalToman,
      date: o.createdAt,
      badge: <OrderStatusBadge status={o.status} />,
    })),
    ...marketOrders.map((o) => ({
      key: `m${o.id}`,
      href: `/dashboard/market-orders/${o.id}`,
      title: o.listing.itemName,
      meta: `بازار کاربران · #${o.id}`,
      amount: o.priceToman,
      date: o.createdAt,
      badge: <MarketStatusBadge status={o.status} />,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full items-center justify-between border-b border-border pb-3">
          <Link href="/shop" className="rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white">
            رفتن به فروشگاه
          </Link>
          <p className="text-[16px] font-black text-text">سفارش‌های من</p>
        </div>

        {rows.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim">هنوز خریدی انجام نداده‌ای.</p>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {rows.map((row) => (
              <Link
                key={row.key}
                href={row.href}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border bg-surface-alt p-4 transition-colors hover:border-white/20"
              >
                {row.badge}
                <div className="flex items-center gap-5">
                  <p className="text-[13px] font-bold text-text">{row.amount.toLocaleString("fa-IR")} تومان</p>
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-[14px] font-black text-text" dir="auto">
                      {row.title}
                    </p>
                    <p className="text-[11px] text-text-dim">
                      {row.meta} · {row.date.toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
