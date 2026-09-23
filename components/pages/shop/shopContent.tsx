import Link from "next/link";
import { ArrowLeft, Gift, Swords, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import type { ShopListProduct } from "@/app/lib/shopCatalog";
import { SHOP_CATEGORIES, type ShopCategory } from "@/app/lib/shopCategories";
import { Card } from "@/components/general/card";
import { ProductCard } from "@/components/pages/shop/productCard";
import { MarketListingCard } from "@/components/pages/shop/marketListingCard";
import type { MarketListingCard as ListingCard } from "@/app/lib/marketCatalog";

const CATEGORY_ICONS: Record<ShopCategory["key"], typeof Gift> = {
  "gift-cards": Gift,
  "dota-items": Swords,
  market: Users,
};

const CATEGORY_GLOW: Record<ShopCategory["key"], string> = {
  "gift-cards": "from-[#1b9ad6]/25",
  "dota-items": "from-[#d32ce6]/20",
  market: "from-[#22c55e]/15",
};

interface ShopContentProps {
  giftCards: ShopListProduct[];
  latestItems: ShopListProduct[];
  latestListings: ListingCard[];
  /** False while the user market is switched off — then it leaves no trace here at all. */
  showMarket: boolean;
  counts: Record<string, number>;
  walletBalance: number | null;
  workStartHour: number;
  workEndHour: number;
}

export function ShopContent({ giftCards, latestItems, latestListings, showMarket, counts, walletBalance, workStartHour, workEndHour }: ShopContentProps) {
  return (
    <div className="flex w-full flex-col gap-14">
      {walletBalance !== null && (
        <Link
          href="/dashboard/wallet"
          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[12px] border border-primary/30 bg-primary/[0.08] px-5 py-4 transition-colors hover:border-primary/60"
        >
          <span className="rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white">شارژ میت کیف</span>
          <div className="flex items-center gap-3">
            <p className="text-[14px] text-text" dir="auto">
              موجودی میت کیف: <span className="font-black">{walletBalance.toLocaleString("fa-IR")} تومان</span>
            </p>
            <Wallet size={20} className="text-accent" />
          </div>
        </Link>
      )}

      <nav aria-label="دسته‌بندی‌های فروشگاه" className={`grid w-full gap-5 ${showMarket ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {SHOP_CATEGORIES.filter((c) => showMarket || c.key !== "market").map((category) => (
          <CategoryTile key={category.key} category={category} count={counts[category.key] ?? 0} />
        ))}
      </nav>

      <Section
        icon={Gift}
        title="گیفت کارت استیم"
        subtitle={`اگر کد آماده باشد همان لحظه تحویل می‌گیری، وگرنه در ساعات کاری (${workStartHour.toLocaleString("fa-IR")} تا ${workEndHour.toLocaleString("fa-IR")}) توسط ادمین فعال می‌شود.`}
        href="/shop/gift-cards"
      >
        {giftCards.length === 0 ? <EmptyState text="فعلاً گیفت کارتی برای فروش نیست." /> : <Grid products={giftCards} columns={3} />}
      </Section>

      <Section icon={Swords} title="جدیدترین آیتم‌های دوتا ۲" subtitle="آیتم‌ها بعد از خرید با ترید استیم به Trade URL تو ارسال می‌شوند." href="/shop/dota-items">
        {latestItems.length === 0 ? <EmptyState text="آیتم‌های دوتا به‌زودی به فروشگاه اضافه می‌شوند." /> : <Grid products={latestItems} columns={4} />}
      </Section>

      {showMarket && (
        <Section icon={Users} title="جدیدترین آگهی‌های بازار کاربران" subtitle="آیتم‌های دوتای خودت را بفروش و پولش را در میت کیف بگیر." href="/shop/market">
          {latestListings.length === 0 ? (
            <EmptyState text="هنوز آگهی فعالی در بازار نیست. اولین نفری باش که آیتمش را می‌فروشد." />
          ) : (
            <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {latestListings.map((l) => (
                <MarketListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function CategoryTile({ category, count }: { category: ShopCategory; count: number }) {
  const Icon = CATEGORY_ICONS[category.key];

  return (
    <Link
      href={`/shop/${category.key}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-[14px] border border-border bg-surface-alt p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/20"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${CATEGORY_GLOW[category.key]} via-transparent to-transparent`} />
      <div className="relative flex w-full items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded-[12px] bg-primary/[0.13] shadow-[0_0_22px_rgba(75,80,230,0.4)]">
          <Icon size={24} className="text-primary-hover" />
        </div>
        <span className="rounded-[20px] border border-border bg-bg/40 px-3 py-1 text-[11px] font-bold text-text-dim">
          {`${count.toLocaleString("fa-IR")} ${category.type ? "محصول" : "آگهی"}`}
        </span>
      </div>
      <div className="relative flex flex-col gap-1.5">
        <h2 className="text-[20px] font-black text-text">{category.title}</h2>
        <p className="text-[13px] leading-[1.7] text-text-dim">{category.description}</p>
      </div>
      <span className="relative mt-auto flex items-center gap-1.5 text-[13px] font-bold text-accent transition-[gap] group-hover:gap-2.5">
        ورود به دسته
        <ArrowLeft size={15} />
      </span>
    </Link>
  );
}

function Grid({ products, columns }: { products: ShopListProduct[]; columns: 3 | 4 }) {
  return (
    <div className={`grid w-full gap-5 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, href, children }: { icon: typeof Gift; title: string; subtitle: string; href: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[10px] bg-primary/[0.13] shadow-[0_0_22px_rgba(75,80,230,0.4)]">
              <Icon size={20} className="text-primary-hover" />
            </div>
            <h2 className="text-[22px] font-black text-text">{title}</h2>
          </div>
          <p className="text-[14px] leading-[1.7] text-text-dim">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1.5 rounded-[8px] border border-border px-4 py-2 text-[13px] font-bold text-text transition-colors hover:border-white/20 hover:bg-white/5"
        >
          مشاهده همه
          <ArrowLeft size={15} />
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card tone="surface-alt" noHover className="w-full items-center p-8">
      <p className="text-[14px] text-text-dim">{text}</p>
    </Card>
  );
}
