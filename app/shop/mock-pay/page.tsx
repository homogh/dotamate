import { notFound } from "next/navigation";

import { Card } from "@/components/general/card";
import { isMockGateway } from "@/app/lib/paymentGateway";

/** Local stand-in for the bank page — only exists while PAYMENT_MOCK=true and no ZarinPal merchant is set. */
export default async function MockPayPage({ searchParams }: PageProps<"/shop/mock-pay">) {
  if (!isMockGateway()) notFound();

  const { authority, amount } = await searchParams;
  if (typeof authority !== "string" || !authority.startsWith("MOCK")) notFound();

  const callback = (status: string) => `/api/shop/payment/callback?Authority=${authority}&Status=${status}`;

  return (
    <div className="flex w-full justify-center px-6 py-20">
      <Card tone="surface" noHover className="w-full max-w-[420px] items-center gap-5 p-8 text-center">
        <span className="rounded-[20px] border border-[#f59e0b] bg-[#f59e0b]/[0.13] px-3 py-1 text-[11px] font-bold text-[#f59e0b]">
          درگاه آزمایشی — فقط محیط توسعه
        </span>
        <p className="text-[20px] font-black text-text">پرداخت آزمایشی</p>
        <p className="text-[28px] font-black text-text">{Number(amount ?? 0).toLocaleString("fa-IR")} تومان</p>
        <p className="text-[13px] leading-[1.7] text-text-dim">
          این صفحه جای درگاه بانکی واقعی است تا روند خرید بدون پول واقعی تست شود. بعد از وارد کردن مرچنت زرین‌پال، این صفحه دیگر استفاده نمی‌شود.
        </p>
        <div className="flex w-full gap-3">
          <a href={callback("OK")} className="flex-1 rounded-[8px] bg-success px-4 py-3 text-[14px] font-bold text-white">
            پرداخت موفق
          </a>
          <a href={callback("NOK")} className="flex-1 rounded-[8px] border border-border px-4 py-3 text-[14px] font-bold text-text-dim">
            انصراف
          </a>
        </div>
      </Card>
    </div>
  );
}
