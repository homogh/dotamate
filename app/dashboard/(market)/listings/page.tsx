import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { steamEconomyImageUrl } from "@/app/lib/cdnUrls";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { Card } from "@/components/general/card";
import { ListingActions } from "@/components/pages/shop/listingActions";
import { MarketItemImage } from "@/components/pages/shop/marketListingCard";

const STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "فعال در بازار", className: "border-success/40 text-success" },
  RESERVED: { label: "فروخته شد؛ منتظر ارسال", className: "border-[#f59e0b]/60 text-[#f59e0b]" },
  SOLD: { label: "فروخته شده", className: "border-primary/40 text-accent" },
  CANCELLED: { label: "حذف شده", className: "border-border text-text-dim" },
  REMOVED: { label: "حذف توسط پشتیبانی", className: "border-danger/40 text-danger" },
};

export default async function MyListingsPage() {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");
  await processMarketTimeouts();

  const listings = await prisma.marketListing.findMany({
    where: { sellerId: viewer.id },
    include: { orders: { where: { status: { in: ["AWAITING_SELLER", "SELLER_SENT", "DISPUTED"] } }, select: { id: true }, take: 1 } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <Link href="/dashboard/listings/new" className="flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white">
            <Plus size={14} />
            ثبت آگهی جدید
          </Link>
          <p className="text-[16px] font-black text-text">آگهی‌های من در بازار کاربران</p>
        </div>

        {listings.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 py-10 text-center">
            <p className="text-[14px] font-bold text-text">هنوز آیتمی برای فروش نگذاشته‌ای.</p>
            <p className="text-[13px] text-text-dim">آیتم را از اینونتوری استیمت انتخاب کن، قیمت بگذار و بعد از فروش پولش را در میت کیف بگیر.</p>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {listings.map((l) => {
              const status = STATUS[l.status];
              const openOrder = l.orders[0];
              return (
                <div key={l.id} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border bg-surface-alt p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {l.status === "ACTIVE" && <ListingActions listingId={l.id} priceToman={l.priceToman} />}
                    {openOrder && (
                      <Link href={`/dashboard/market-orders/${openOrder.id}`} className="rounded-[6px] bg-primary px-2.5 py-1.5 text-[12px] font-bold text-white">
                        مشاهده سفارش
                      </Link>
                    )}
                    <span className={`whitespace-nowrap rounded-[6px] border px-2.5 py-1 text-[12px] font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-[13px] font-bold text-text">{l.priceToman.toLocaleString("fa-IR")} تومان</p>
                    <Link href={`/shop/market/${l.id}`} className="flex flex-col items-end gap-0.5 hover:underline">
                      <p className="max-w-[260px] truncate text-[14px] font-black text-text" dir="auto">
                        {l.itemName}
                      </p>
                      <p className="text-[11px] text-text-dim">{l.createdAt.toLocaleDateString("fa-IR")}</p>
                    </Link>
                    <div className="w-[80px] shrink-0">
                      <MarketItemImage listing={{ imageUrl: steamEconomyImageUrl(l.iconUrl, 128), itemName: l.itemName, rarity: l.rarity }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
