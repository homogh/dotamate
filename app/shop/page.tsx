import type { Metadata } from "next";

import { PageBanner } from "@/components/general/pageBanner";
import { ShopContent } from "@/components/pages/shop/shopContent";
import { getShopLanding, getViewerSession } from "@/app/lib/shopCatalog";
import { getWalletBalance } from "@/app/lib/wallet";

export const metadata: Metadata = {
  title: "فروشگاه دوتامیت | خرید گیفت کارت استیم با تحویل آنی",
  description: "خرید گیفت کارت و کد شارژ کیف پول استیم (Steam Wallet) با قیمت تومانی، پرداخت آنلاین یا از میت کیف و تحویل آنی کد در فروشگاه دوتامیت.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const viewer = await getViewerSession();
  const [landing, wallet] = await Promise.all([getShopLanding(), viewer ? getWalletBalance(viewer.id) : null]);

  return (
    <div className="content-page flex w-full flex-col items-center">
      <PageBanner
        eyebrow="فروشگاه دوتامیت"
        title="گیفت کارت استیم"
        subtitle="کیف پول استیمت را با قیمت تومانی شارژ کن؛ کد گیفت کارت همان لحظه بعد از پرداخت تحویلت داده می‌شود."
        imageSrc="/images/shop/shop-banner.png"
      />

      <div className="w-full px-6 py-14 md:px-[100px]">
        <div className="mx-auto w-full max-w-[1200px]">
          <ShopContent
            giftCards={landing.giftCards}
            giftCount={landing.giftCount}
            walletBalance={wallet?.total ?? null}
            workStartHour={landing.settings.workStartHour}
            workEndHour={landing.settings.workEndHour}
          />
        </div>
      </div>
    </div>
  );
}
