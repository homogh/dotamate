import Link from "next/link";
import { redirect } from "next/navigation";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { Card } from "@/components/general/card";
import { MarketStatusBadge } from "@/components/pages/shop/marketStatusBadge";

export default async function SalesPage() {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");
  await processMarketTimeouts();

  const sales = await prisma.marketOrder.findMany({
    where: { sellerId: viewer.id, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } },
    include: { listing: { select: { itemName: true } }, buyer: { select: { displayName: true } } },
    orderBy: { paidAt: "desc" },
    take: 100,
  });
  const toSend = sales.filter((s) => s.status === "AWAITING_SELLER").length;

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      {toSend > 0 && (
        <div className="w-full rounded-[10px] border border-[#f59e0b]/60 bg-[#f59e0b]/[0.13] px-4 py-3 text-right text-[13px] font-bold text-[#f59e0b]">
          {toSend.toLocaleString("fa-IR")} آیتم فروخته‌شده منتظر ارسال توست.
        </div>
      )}
      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full items-center justify-between border-b border-border pb-3">
          <Link href="/dashboard/listings" className="rounded-[6px] border border-border px-3 py-1.5 text-[12px] font-bold text-text">
            آگهی‌های من
          </Link>
          <p className="text-[16px] font-black text-text">فروش‌های من</p>
        </div>

        {sales.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim">هنوز فروشی نداشته‌ای.</p>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {sales.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/market-orders/${s.id}`}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border bg-surface-alt p-4 transition-colors hover:border-white/20"
              >
                <MarketStatusBadge status={s.status} />
                <div className="flex items-center gap-5">
                  <p className="text-[13px] font-bold text-success">{s.sellerPayoutToman.toLocaleString("fa-IR")} تومان</p>
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-[14px] font-black text-text" dir="auto">
                      {s.listing.itemName}
                    </p>
                    <p className="text-[11px] text-text-dim">
                      #{s.id} · خریدار: {s.buyer.displayName}
                      {s.paidAt && ` · ${s.paidAt.toLocaleDateString("fa-IR")}`}
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
