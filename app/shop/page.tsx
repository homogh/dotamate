import type { Metadata } from "next";

import { isMarketEnabled } from "@/app/lib/platformSettings";
import { PageBanner } from "@/components/general/pageBanner";
import { ShopContent } from "@/components/pages/shop/shopContent";
import { getShopLanding, getViewerSession } from "@/app/lib/shopCatalog";
import { getWalletBalance } from "@/app/lib/wallet";

export const metadata: Metadata = {
  title: "فروشگاه دوتامیت | خرید گیفت کارت استیم و آیتم دوتا ۲",
  description: "خرید گیفت کارت استیم با تحویل آنی، آیتم‌های دوتا ۲ و بازار امن خرید و فروش آیتم بین بازیکنان؛ با قیمت تومانی و پرداخت آنلاین.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const viewer = await getViewerSession();
  const showMarket = await isMarketEnabled();
  const [landing, wallet] = await Promise.all([getShopLanding(showMarket), viewer ? getWalletBalance(viewer.id) : null]);

  return (
    <div className="content-page flex w-full flex-col items-center">
      <PageBanner
        eyebrow="فروشگاه دوتامیت"
        title="فروشگاه"
        subtitle="گیفت کارت استیم، آیتم‌های دوتا ۲ و بازار امن خرید و فروش آیتم بین بازیکنان"
        imageSrc="/images/shop/shop-banner.png"
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="mx-auto w-full max-w-[1200px]">
          <ShopContent
            giftCards={landing.giftCards}
            latestItems={landing.latestItems}
            latestListings={landing.latestListings}
            showMarket={showMarket}
            counts={landing.counts}
            walletBalance={wallet?.total ?? null}
            workStartHour={landing.settings.workStartHour}
            workEndHour={landing.settings.workEndHour}
          />
        </div>
      </div>
    </div>
  );
}
