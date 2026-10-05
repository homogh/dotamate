import Link from "next/link";
import { ArrowLeft, CreditCard, Gift, KeyRound, Wallet, Zap } from "lucide-react";

import type { ShopListProduct } from "@/app/lib/shopCatalog";
import { Card } from "@/components/general/card";
import { ProductCard } from "@/components/pages/shop/productCard";

interface ShopContentProps {
  giftCards: ShopListProduct[];
  /** All active gift cards — the «مشاهده همه» link only shows when some didn't fit on this page. */
  giftCount: number;
  walletBalance: number | null;
  workStartHour: number;
  workEndHour: number;
}

export function ShopContent({ giftCards, giftCount, walletBalance, workStartHour, workEndHour }: ShopContentProps) {
  const start = workStartHour.toLocaleString("fa-IR");
  const end = workEndHour.toLocaleString("fa-IR");
  const steps = [
    { icon: CreditCard, title: "پرداخت", text: "مبلغ گیفت کارت را از میت کیف یا با درگاه بانکی بپرداز." },
    { icon: Zap, title: "دریافت کد", text: `کد همان لحظه در صفحه سفارش نمایش داده می‌شود؛ اگر کد آماده نباشد در ساعات کاری (${start} تا ${end}) فعال می‌شود.` },
    { icon: KeyRound, title: "شارژ کیف پول استیم", text: "کد را در استیم، بخش Redeem a Steam Gift Card or Wallet Code وارد کن." },
  ];

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

      <section className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-primary/[0.13] shadow-[0_0_22px_rgba(75,80,230,0.4)]">
                <Gift size={20} className="text-primary-hover" />
              </div>
              <h2 className="text-[22px] font-black text-text">گیفت کارت‌های استیم</h2>
            </div>
            <p className="text-[14px] leading-[1.7] text-text-dim">مبلغ دلخواهت را انتخاب کن؛ قیمت‌ها تومانی است.</p>
          </div>
          {giftCount > giftCards.length && (
            <Link
              href="/shop/gift-cards"
              className="flex items-center gap-1.5 rounded-[8px] border border-border px-4 py-2 text-[13px] font-bold text-text transition-colors hover:border-white/20 hover:bg-white/5"
            >
              مشاهده همه
              <ArrowLeft size={15} />
            </Link>
          )}
        </div>

        {giftCards.length === 0 ? (
          <Card tone="surface-alt" noHover className="w-full items-center p-8">
            <p className="text-[14px] text-text-dim">فعلاً گیفت کارتی برای فروش نیست؛ به‌زودی برمی‌گردیم.</p>
          </Card>
        ) : (
          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {giftCards.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="flex w-full flex-col gap-6">
        <h2 className="text-[22px] font-black text-text">خرید گیفت کارت در سه قدم</h2>
        <ol className="grid w-full gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-[12px] border border-border bg-surface-alt p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-black text-white">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <h3 className="text-[16px] font-black text-text">{step.title}</h3>
                <step.icon size={18} className="mr-auto text-accent" />
              </div>
              <p className="text-[13px] leading-[1.8] text-text-dim">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
