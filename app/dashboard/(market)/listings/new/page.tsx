import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getShopSettings } from "@/app/lib/shopPricing";
import { MIN_LISTING_PRICE } from "@/app/lib/marketOrders";
import { ListingCreator } from "@/components/pages/shop/listingCreator";

export default async function NewListingPage() {
  const settings = await getShopSettings();

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <Link href="/dashboard/listings" className="flex items-center gap-1 text-[13px] text-text-dim hover:text-text">
        <ChevronLeft size={14} />
        بازگشت به آگهی‌های من
      </Link>
      <p className="w-full text-right text-[20px] font-black text-text">فروش آیتم در بازار کاربران</p>
      <ListingCreator
        commissionPercent={settings.marketCommissionPercent}
        minPrice={MIN_LISTING_PRICE}
        payoutHoldHours={settings.payoutHoldHours}
        sellerDeadlineHours={settings.sellerDeadlineHours}
      />
    </div>
  );
}
