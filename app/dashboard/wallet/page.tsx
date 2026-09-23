import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Wallet, XCircle } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { getWalletBalance } from "@/app/lib/wallet";
import { getShopSettings } from "@/app/lib/shopPricing";
import { canUseMarket, canUseShop } from "@/app/lib/shopAccess";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { Card } from "@/components/general/card";
import { TopUpForm } from "@/components/pages/shop/topUpForm";
import { WithdrawForm } from "@/components/pages/shop/withdrawForm";

const WITHDRAWAL_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "در انتظار واریز", className: "text-[#f59e0b]" },
  PAID: { label: "واریز شد", className: "text-success" },
  REJECTED: { label: "رد شد", className: "text-danger" },
};

const TYPE_LABELS: Record<string, string> = {
  TOPUP: "شارژ کیف",
  PURCHASE: "خرید",
  SALE_INCOME: "درآمد فروش",
  WITHDRAWAL: "برداشت",
  REFUND: "بازگشت وجه",
  ADJUSTMENT: "اصلاح توسط پشتیبانی",
};

export default async function WalletPage({ searchParams }: PageProps<"/dashboard/wallet">) {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");

  await processMarketTimeouts();
  const { payment } = await searchParams;
  const [balance, transactions, withdrawals, settings, user, shopOpen] = await Promise.all([
    getWalletBalance(viewer.id),
    prisma.walletTransaction.findMany({ where: { userId: viewer.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.withdrawalRequest.findMany({ where: { userId: viewer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    getShopSettings(),
    prisma.user.findUnique({ where: { id: viewer.id }, select: { payoutSheba: true, payoutHolderName: true } }),
    // Top-ups are part of buying, so they follow the shop switch; the wallet itself (and withdrawals) never do.
    canUseShop(viewer.id),
  ]);
  const marketOpen = await canUseMarket(viewer.id);

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
              رفتن به فروشگاه
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
          <div className="flex w-full items-center justify-between rounded-[8px] bg-surface-alt px-4 py-3 text-[13px]">
            <span className="font-bold text-text">{balance.withdrawable.toLocaleString("fa-IR")} تومان</span>
            <span className="text-text-dim">قابل برداشت (درآمد فروش)</span>
          </div>
          {balance.pending > 0 && (
            <div className="flex w-full items-center justify-between rounded-[8px] bg-surface-alt px-4 py-3 text-[13px]">
              <span className="font-bold text-[#f59e0b]">{balance.pending.toLocaleString("fa-IR")} تومان</span>
              <span className="text-text-dim">در انتظار آزادسازی ({settings.payoutHoldHours.toLocaleString("fa-IR")} ساعت بعد از فروش)</span>
            </div>
          )}
          <p className="w-full text-right text-[12px] leading-[1.7] text-text-dim">
            مبلغ شارژشده فقط برای خرید داخل سایت است. درآمد فروش، بعد از گذشت زمان نگهداری، قابل برداشت به حساب بانکی است.
          </p>
        </Card>

        <div className="flex w-full flex-col gap-6">
          <Card tone="surface" noHover className="w-full items-stretch gap-4 p-6">
            <p className="w-full text-right text-[16px] font-black text-text">برداشت به حساب بانکی</p>
            <WithdrawForm
              withdrawable={balance.withdrawable}
              minAmount={settings.minWithdrawalToman}
              savedSheba={user?.payoutSheba ?? null}
              savedHolder={user?.payoutHolderName ?? null}
            />
          </Card>
          {shopOpen && (
            <Card tone="surface" noHover className="w-full gap-4 p-6">
              <p className="w-full text-right text-[16px] font-black text-text">شارژ میت کیف</p>
              <TopUpForm />
            </Card>
          )}
        </div>
      </div>

      {withdrawals.length > 0 && (
        <Card tone="surface" noHover className="w-full gap-3 p-6">
          <p className="w-full text-right text-[16px] font-black text-text">درخواست‌های برداشت</p>
          {withdrawals.map((w) => (
            <div key={w.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[8px] bg-surface-alt p-3 text-[13px]">
              <span className={`font-bold ${WITHDRAWAL_STATUS[w.status].className}`}>
                {WITHDRAWAL_STATUS[w.status].label}
                {w.trackingRef && <span className="mr-2 font-normal text-text-dim">پیگیری: {w.trackingRef}</span>}
                {w.adminNote && w.status === "REJECTED" && <span className="mr-2 font-normal text-text-dim">{w.adminNote}</span>}
              </span>
              <div className="flex flex-col items-end gap-0.5">
                <p className="font-bold text-text">{w.amountToman.toLocaleString("fa-IR")} تومان</p>
                <p className="text-[11px] text-text-dim" dir="ltr">
                  {w.sheba} · {w.createdAt.toLocaleDateString("fa-IR")}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}

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
                  {TYPE_LABELS[t.type]}
                  {t.orderId && (
                    <Link href={`/dashboard/orders/${t.orderId}`} className="mr-1.5 text-[12px] font-normal text-primary hover:underline">
                      سفارش #{t.orderId}
                    </Link>
                  )}
                  {t.marketOrderId && marketOpen && (
                    <Link href={`/dashboard/market-orders/${t.marketOrderId}`} className="mr-1.5 text-[12px] font-normal text-primary hover:underline">
                      سفارش بازار #{t.marketOrderId}
                    </Link>
                  )}
                  {t.availableAt > new Date() && <span className="mr-1.5 text-[11px] font-normal text-[#f59e0b]">(در انتظار آزادسازی)</span>}
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
