import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, BadgeCheck, ChevronLeft, Clock, ShieldCheck, Undo2 } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getMarketListingPage } from "@/app/lib/marketCatalog";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { RARITY_META } from "@/app/lib/shopCategories";
import { getShopSettings } from "@/app/lib/shopPricing";
import { getWalletBalance } from "@/app/lib/wallet";
import { cachedAvatarUrl } from "@/app/lib/cdnUrls";
import { Card } from "@/components/general/card";
import { BuyBox } from "@/components/pages/shop/buyBox";
import { MarketItemImage, MarketListingCard } from "@/components/pages/shop/marketListingCard";

const SITE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const load = cache((id: number) => getMarketListingPage(id));

export async function generateMetadata({ params }: PageProps<"/shop/market/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await load(Number(id));
  if (!data) return {};
  const { listing, card } = data;
  const title = `خرید ${listing.itemName} | بازار کاربران دوتامیت`;
  const description = `${listing.itemName}${listing.heroName ? ` برای ${listing.heroName}` : ""} به قیمت ${listing.priceToman.toLocaleString("fa-IR")} تومان در بازار امن خرید و فروش آیتم دوتا ۲.`;
  return {
    title,
    description,
    alternates: { canonical: `/shop/market/${listing.id}` },
    // Sold/withdrawn listings stay reachable for the people in the deal but shouldn't be indexed.
    robots: listing.status === "ACTIVE" ? undefined : { index: false },
    openGraph: { title, description, url: `/shop/market/${listing.id}`, images: card.imageUrl ? [{ url: card.imageUrl }] : undefined },
  };
}

export default async function MarketListingPage({ params }: PageProps<"/shop/market/[id]">) {
  await processMarketTimeouts();
  const { id } = await params;
  const data = await load(Number(id));
  if (!data) notFound();

  const { listing, card, seller, similar } = data;
  const [viewer, settings] = await Promise.all([getViewerSession(), getShopSettings()]);
  const [wallet, user] = viewer
    ? await Promise.all([getWalletBalance(viewer.id), prisma.user.findUnique({ where: { id: viewer.id }, select: { steamTradeUrl: true } })])
    : [null, null];

  const rarity = listing.rarity ? RARITY_META[listing.rarity] : null;
  const isOwn = viewer?.id === listing.sellerId;
  const available = listing.status === "ACTIVE";
  const statusText = listing.status === "RESERVED" ? "این آیتم همین حالا توسط خریدار دیگری رزرو شده است." : listing.status === "SOLD" ? "این آیتم فروخته شده است." : "این آگهی دیگر فعال نیست.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.itemName,
    image: card.imageUrl ? [`${SITE_URL}${card.imageUrl}`] : undefined,
    brand: { "@type": "Brand", name: "Dota 2" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/shop/market/${listing.id}`,
      priceCurrency: "IRR",
      price: listing.priceToman * 10,
      availability: available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": "Person", name: listing.seller.displayName },
    },
  };

  return (
    <div className="flex w-full justify-center px-6 py-12 md:px-[100px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex w-full max-w-[1200px] flex-col gap-10">
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-text-dim" aria-label="مسیر">
          <Link href="/shop" className="hover:text-text">
            فروشگاه
          </Link>
          <ChevronLeft size={14} />
          <Link href="/shop/market" className="hover:text-text">
            بازار کاربران
          </Link>
          <ChevronLeft size={14} />
          <span className="text-text" dir="auto">
            {listing.itemName}
          </span>
        </nav>

        <div className="grid w-full gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <MarketItemImage listing={card} large />
            <Card tone="surface" noHover className="w-full flex-row items-center gap-4 p-5">
              {listing.seller.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cachedAvatarUrl(listing.seller.avatarUrl) ?? listing.seller.avatarUrl} alt="" className="size-12 rounded-full" />
              ) : (
                <div className="size-12 rounded-full bg-surface-alt" />
              )}
              <div className="flex flex-1 flex-col gap-1">
                <p className="text-[15px] font-black text-text">{listing.seller.displayName}</p>
                <p className="text-[12px] text-text-dim">
                  {seller.completedSales.toLocaleString("fa-IR")} فروش موفق · {seller.activeListings.toLocaleString("fa-IR")} آگهی فعال
                  {seller.memberSince && ` · عضو از ${seller.memberSince.toLocaleDateString("fa-IR", { year: "numeric", month: "long" })}`}
                </p>
              </div>
              {seller.completedSales > 0 && <BadgeCheck size={22} className="shrink-0 text-success" />}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-[28px] font-black leading-[1.5] text-text" dir="auto">
                {listing.itemName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                {rarity && (
                  <span className="rounded-[4px] px-2.5 py-1 font-bold" style={{ color: rarity.color, backgroundColor: `${rarity.color}1f` }} dir="ltr">
                    {rarity.label}
                  </span>
                )}
                {listing.heroName && <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-text-dim">هیرو: {listing.heroName}</span>}
                {listing.itemType && (
                  <span className="rounded-[4px] bg-surface-alt px-2.5 py-1 text-text-dim" dir="ltr">
                    {listing.itemType}
                  </span>
                )}
              </div>
              {listing.description && <p className="whitespace-pre-line text-[14px] leading-[1.9] text-text-dim">{listing.description}</p>}
            </div>

            <p className="text-[32px] font-black text-text">
              {listing.priceToman.toLocaleString("fa-IR")}
              <span className="mr-2 text-[15px] font-bold text-text-dim">تومان</span>
            </p>

            <BuyBox
              checkoutEndpoint="/api/shop/market/orders"
              checkoutPayload={{ listingId: listing.id }}
              productPath={`/shop/market/${listing.id}`}
              priceToman={listing.priceToman}
              isLoggedIn={Boolean(viewer)}
              walletBalance={wallet?.total ?? 0}
              needsTradeUrl={!user?.steamTradeUrl}
              soldOut={false}
              blockedReason={isOwn ? "این آگهی خودت است. از بخش «آگهی‌های من» می‌توانی قیمتش را تغییر بدهی یا حذفش کنی." : available ? null : statusText}
            />

            <div className="flex flex-col gap-2">
              <Guarantee icon={ShieldCheck} text="پول تو پیش دوتامیت امانت می‌ماند و فقط بعد از تحویل آیتم به فروشنده پرداخت می‌شود." />
              <Guarantee icon={Clock} text={`فروشنده ${settings.sellerDeadlineHours.toLocaleString("fa-IR")} ساعت فرصت دارد آیتم را برایت ترید کند.`} />
              <Guarantee icon={Undo2} text="اگر آیتم به دستت نرسد، کل مبلغ به میت کیف تو برمی‌گردد." />
            </div>
          </div>
        </div>

        <Card tone="surface" noHover className="w-full gap-4 p-6 md:p-8">
          <h2 className="text-[20px] font-black text-text">خرید در بازار کاربران چطور کار می‌کند؟</h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {[
              "مبلغ را از میت کیف یا درگاه بانکی می‌پردازی و پول پیش دوتامیت می‌ماند.",
              `فروشنده حداکثر ظرف ${settings.sellerDeadlineHours.toLocaleString("fa-IR")} ساعت آیتم را به Trade URL تو ترید می‌کند.`,
              "پیشنهاد ترید را در استیم قبول می‌کنی و دریافت را در سایت تأیید می‌کنی.",
              "پول به فروشنده پرداخت می‌شود. اگر مشکلی بود، اعتراض ثبت کن تا پشتیبانی بررسی کند.",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[13px] leading-[1.8] text-text-dim">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-black text-white">{(i + 1).toLocaleString("fa-IR")}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        {similar.length > 0 && (
          <section className="flex w-full flex-col gap-6">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-[22px] font-black text-text">آگهی‌های مشابه</h2>
              <Link href="/shop/market" className="flex items-center gap-1.5 text-[13px] font-bold text-accent hover:underline">
                مشاهده همه آگهی‌ها
                <ArrowLeft size={15} />
              </Link>
            </div>
            <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((l) => (
                <MarketListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Guarantee({ icon: Icon, text }: { icon: typeof Clock; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px] leading-[1.8] text-text-dim">
      <Icon size={16} className="mt-1 shrink-0 text-success" />
      {text}
    </div>
  );
}
