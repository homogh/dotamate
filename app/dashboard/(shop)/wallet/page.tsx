import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Wallet, XCircle } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { getWalletBalance } from "@/app/lib/wallet";
import { Card } from "@/components/general/card";
import { TopUpForm } from "@/components/pages/shop/topUpForm";

const TYPE_LABELS: Record<string, string> = {
  TOPUP: "شارژ کیف",
  PURCHASE: "خرید",
  REFUND: "بازگشت وجه",
  ADJUSTMENT: "اصلاح توسط پشتیبانی",
};

export default async function WalletPage({ searchParams }: PageProps<"/dashboard/wallet">) {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");

  const { payment } = await searchParams;
  const [balance, transactions] = await Promise.all([
    getWalletBalance(viewer.id),
    prisma.walletTransaction.findMany({ where: { userId: viewer.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      {payment === "success" && (
        <div className="flex w-full items-center gap-3 rounded-[10px] border border-success/40 bg-success/10 px-4 py-3 text-success">
          <CheckCircle2 size={18} className="shrink-0" />
          <p className="text-[13px]">میت کیف با موفقیت شارژ شد.</p>
        </div>
      )}
      {payment === "failed" && (
        <div className="flex w-full items-center gap-3 rounded-[10px] border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
          <XCircle size={18} className="shrink-0" />
          <p className="text-[13px]">پرداخت انجام نشد. اگر مبلغی کسر شده، تا ۷۲ ساعت توسط بانک برمی‌گردد.</p>
        </div>
      )}

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <div className="flex w-full items-center justify-between">
            <Link href="/shop" className="text-[13px] font-bold text-primary hover:underline">
              خرید گیفت کارت
            </Link>
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-black text-text">میت کیف</p>
              <Wallet size={20} className="text-accent" />
            </div>
          </div>
          <p className="w-full text-right text-[36px] font-black text-text">
            {balance.total.toLocaleString("fa-IR")}
            <span className="mr-2 text-[15px] font-bold text-text-dim">تومان</span>
          </p>
          <p className="w-full text-right text-[12px] leading-[1.7] text-text-dim">
            موجودی میت کیف برای خرید گیفت کارت از فروشگاه است و قابل برداشت به حساب بانکی نیست. اگر سفارشی تحویل نشود، مبلغش به همین‌جا برمی‌گردد.
          </p>
        </Card>

        <Card tone="surface" noHover className="w-full gap-4 p-6">
          <p className="w-full text-right text-[16px] font-black text-text">شارژ میت کیف</p>
          <TopUpForm />
        </Card>
      </div>

      <Card tone="surface" noHover className="w-full gap-3 p-6">
        <p className="w-full text-right text-[16px] font-black text-text">تاریخچه تراکنش‌ها</p>
        {transactions.length === 0 ? (
          <p className="w-full py-6 text-center text-[13px] text-text-dim">هنوز تراکنشی ثبت نشده.</p>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[8px] bg-surface-alt p-3 text-[13px]">
              <p className={`font-black ${t.amountToman >= 0 ? "text-success" : "text-danger"}`} dir="ltr">
                {t.amountToman >= 0 ? "+" : "−"}
                {Math.abs(t.amountToman).toLocaleString("fa-IR")}
              </p>
              <div className="flex flex-col items-end gap-0.5">
                <p className="font-bold text-text" dir="auto">
                  {TYPE_LABELS[t.type] ?? "تراکنش"}
                  {t.orderId && (
                    <Link href={`/dashboard/orders/${t.orderId}`} className="mr-1.5 text-[12px] font-normal text-primary hover:underline">
                      سفارش #{t.orderId}
                    </Link>
                  )}
                </p>
                <p className="text-[11px] text-text-dim" dir="auto">
                  {t.createdAt.toLocaleString("fa-IR")}
                  {t.note && ` · ${t.note}`}
                </p>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
