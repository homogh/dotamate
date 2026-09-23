import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

import { getMarketListings } from "@/app/lib/marketCatalog";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { getShopCategory } from "@/app/lib/shopCategories";
import { getShopSettings } from "@/app/lib/shopPricing";
import { Card } from "@/components/general/card";
import { CategoryShell, categoryHref, parsePageParam, parseSortParam } from "@/components/pages/shop/categoryShell";
import { MarketListingCard } from "@/components/pages/shop/marketListingCard";
import { ShopPagination } from "@/components/pages/shop/shopPagination";

const category = getShopCategory("market")!;

export async function generateMetadata({ searchParams }: PageProps<"/shop/market">): Promise<Metadata> {
  const page = parsePageParam((await searchParams).page);
  const canonical = page > 1 ? `/shop/market?page=${page}` : "/shop/market";
  return {
    title: category.metaTitle + (page > 1 ? ` — صفحه ${page.toLocaleString("fa-IR")}` : ""),
    description: category.metaDescription,
    alternates: { canonical },
    openGraph: { title: category.metaTitle, description: category.metaDescription, url: canonical, type: "website" },
  };
}

export default async function MarketPage({ searchParams }: PageProps<"/shop/market">) {
  await processMarketTimeouts();
  const query = await searchParams;
  const sort = parseSortParam(query.sort);
  const [market, settings] = await Promise.all([getMarketListings(parsePageParam(query.page), sort), getShopSettings()]);

  return (
    <CategoryShell
      category={category}
      sort={sort}
      showSort={market.total > 1}
      sortHref={(s) => categoryHref("market", 1, s)}
      showMarket
      action={
        <Link href="/dashboard/listings/new" className="flex items-center gap-1.5 rounded-[8px] bg-primary px-5 py-2.5 text-[14px] font-black text-white hover:bg-primary-hover">
          <Plus size={16} />
          آیتمت را بفروش
        </Link>
      }
    >
      <div className="flex w-full items-start gap-3 rounded-[10px] border border-success/30 bg-success/[0.07] px-4 py-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
        <p className="text-[13px] leading-[1.8] text-text-dim">
          پول تو تا وقتی آیتم را تحویل نگیری پیش دوتامیت امانت می‌ماند. اگر فروشنده ظرف {settings.sellerDeadlineHours.toLocaleString("fa-IR")} ساعت آیتم را ارسال نکند، کل مبلغ به میت کیف تو برمی‌گردد.
        </p>
      </div>

      {market.listings.length === 0 ? (
        <Card tone="surface-alt" noHover className="w-full items-center gap-3 p-12 text-center">
          <p className="text-[16px] font-black text-text">هنوز آگهی فعالی در بازار نیست</p>
          <p className="text-[13px] text-text-dim">اولین نفری باش که آیتم دوتایش را اینجا می‌فروشد.</p>
        </Card>
      ) : (
        <>
          <p className="text-[13px] text-text-dim">{market.total.toLocaleString("fa-IR")} آگهی فعال</p>
          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {market.listings.map((l) => (
              <MarketListingCard key={l.id} listing={l} />
            ))}
          </div>
          <ShopPagination page={market.page} totalPages={market.totalPages} hrefFor={(p) => categoryHref("market", p, sort)} />
        </>
      )}
    </CategoryShell>
  );
}
