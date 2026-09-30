import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Copy, Repeat, Undo2, XCircle } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { processMarketTimeouts } from "@/app/lib/marketOrders";
import { steamEconomyImageUrl } from "@/app/lib/cdnUrls";
import { Card } from "@/components/general/card";
import { MarketItemImage } from "@/components/pages/shop/marketListingCard";
import { MarketOrderActions } from "@/components/pages/shop/marketOrderActions";
import { MarketStatusBadge } from "@/components/pages/shop/marketStatusBadge";
import { MarketEvidenceUpload } from "@/components/pages/shop/marketEvidenceUpload";

function timeLeft(until: Date | null) {
  if (!until) return null;
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return "کمتر از یک دقیقه";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه` : `${minutes.toLocaleString("fa-IR")} دقیقه`;
}

export default async function MarketOrderPage({ params, searchParams }: PageProps<"/dashboard/market-orders/[id]">) {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");
  await processMarketTimeouts();

  const { id } = await params;
  const { payment } = await searchParams;
  const order = await prisma.marketOrder.findUnique({
    where: { id: Number(id) },
    include: {
      listing: true,
      buyer: { select: { displayName: true } },
      seller: { select: { displayName: true } },
      payments: { where: { status: "SUCCESS" }, select: { refId: true }, take: 1 },
    },
  });
  // Only the two parties can see an order; everyone else gets a plain 404.
  if (!order || (order.buyerId !== viewer.id && order.sellerId !== viewer.id)) notFound();

  const role = order.sellerId === viewer.id ? "seller" : "buyer";
  const other = role === "seller" ? order.buyer.displayName : order.seller.displayName;
  const deadline = timeLeft(order.sellerDeadlineAt);
  const mutualLeft = timeLeft(order.mutualConfirmDeadlineAt);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      {payment === "failed" && (
        <Banner tone="danger" icon={XCircle} text="پرداخت انجام نشد و مبلغی از حسابت کم نشده است. اگر پولی کسر شده، تا ۷۲ ساعت توسط بانک برمی‌گردد." />
      )}

      <Card tone="surface" noHover className="w-full items-stretch gap-5 p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <MarketStatusBadge status={order.status} />
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <p className="text-[18px] font-black text-text" dir="auto">
                {order.listing.itemName}
              </p>
              <p className="text-[12px] text-text-dim">
                سفارش بازار #{order.id} · {role === "seller" ? `خریدار: ${other}` : `فروشنده: ${other}`}
              </p>
            </div>
            <div className="w-[96px] shrink-0">
              <MarketItemImage listing={{ imageUrl: steamEconomyImageUrl(order.listing.iconUrl, 128), itemName: order.listing.itemName, rarity: order.listing.rarity }} />
            </div>
          </div>
        </div>

        {/* Stage guidance, written for whoever is looking. */}
        {order.tradeMode === "DIRECT" && order.status === "AWAITING_SELLER" && (
          <Banner
            tone="warning"
            icon={Clock}
            text={
              role === "seller"
                ? `این یک ترید مستقیم است: آیتم را خودت مستقیماً از طریق Trade URL خریدار در استیم برایش ترید کن، و وقتی ترید را انجام دادی «تأیید می‌کنم» را بزن. مهلت تأیید متقابل: ${mutualLeft}. اسکرین‌شات پیشنهاد ترید و تأییدیه استیم را قبل و بعد از ترید نگه‌دار — بدون مدرک، پشتیبانی دوتامیت نمی‌تواند در اختلاف به نفع تو رأی بدهد.`
                : `این یک ترید مستقیم است: باید مستقیماً با فروشنده در استیم ترید کنی. بعد از دریافت آیتم «تأیید می‌کنم» را بزن. مهلت تأیید متقابل: ${mutualLeft}. اسکرین‌شات پیشنهاد ترید و تأییدیه استیم را قبل و بعد از ترید نگه‌دار — بدون مدرک، پشتیبانی دوتامیت نمی‌تواند در اختلاف به نفع تو رأی بدهد.`
            }
          />
        )}
        {order.tradeMode === "DIRECT" && order.status === "AWAITING_SELLER" && (order.buyerConfirmedAt || order.sellerConfirmedAt) && (
          <Banner
            tone="neutral"
            icon={Repeat}
            text={
              role === "seller"
                ? order.sellerConfirmedAt
                  ? "تأیید تو ثبت شده؛ منتظر تأیید خریدار هستیم."
                  : "خریدار تأیید کرده؛ اگر ترید را انجام داده‌ای، تأییدش کن."
                : order.buyerConfirmedAt
                  ? "تأیید تو ثبت شده؛ منتظر تأیید فروشنده هستیم."
                  : "فروشنده تأیید کرده؛ اگر آیتم را دریافت کرده‌ای، تأییدش کن."
            }
          />
        )}
        {order.tradeMode === "ESCROW" && order.status === "AWAITING_ADMIN" && role === "seller" && (
          <Banner tone="neutral" icon={Clock} text="آیتمت فروخته شد، اما هنوز یک ادمین دوتامیت سفارش را نپذیرفته. صبر کن تا ادمین لینک ترید خودش را برایت بفرستد؛ قبل از آن چیزی ارسال نکن." />
        )}
        {order.tradeMode === "ESCROW" && order.status === "AWAITING_ADMIN" && role === "buyer" && (
          <Banner tone="neutral" icon={Clock} text="پرداختت انجام شد و پول پیش دوتامیت امانت است. یک ادمین دوتامیت به‌زودی سفارش را می‌پذیرد و فرآیند واسطه‌گری را شروع می‌کند." />
        )}
        {order.tradeMode === "ESCROW" && order.status === "AWAITING_SELLER" && role === "seller" && (
          <Banner
            tone="warning"
            icon={Clock}
            text={`ادمین دوتامیت سفارش را پذیرفت. آیتم را به Trade URL ادمین زیر ارسال کن و بعد دکمه «ارسال کردم» را بزن. زمان باقی‌مانده: ${deadline}. اگر در این مهلت ارسال نکنی، سفارش لغو و مبلغ به خریدار برگردانده می‌شود.`}
          />
        )}
        {order.tradeMode === "ESCROW" && order.status === "AWAITING_SELLER" && role === "buyer" && (
          <Banner tone="warning" icon={Clock} text={`پرداختت انجام شد و پول پیش دوتامیت امانت است. فروشنده تا ${deadline} دیگر فرصت دارد آیتم را به ادمین دوتامیت تحویل بدهد؛ بعد ادمین آن را برایت ترید می‌کند. به‌خاطر Trade Hold استیم، این روند تا حدود ۷ روز زمان‌بر است.`} />
        )}
        {order.tradeMode === "ESCROW" && order.status === "SELLER_SENT" && (
          <Banner tone="neutral" icon={Repeat} text="فروشنده اعلام کرده آیتم را برای ادمین دوتامیت ارسال کرده. منتظر تأیید دریافت توسط ادمین هستیم." />
        )}
        {order.tradeMode === "ESCROW" && order.status === "ADMIN_RECEIVED" && (
          <Banner tone="neutral" icon={Repeat} text="ادمین دوتامیت آیتم را از فروشنده تحویل گرفته و در حال ترید به خریدار است." />
        )}
        {order.status === "DISPUTED" && (
          <>
            <Banner tone="danger" icon={AlertTriangle} text={`اعتراض ثبت شده و پشتیبانی دوتامیت در حال بررسی است. دلیل: ${order.disputeReason ?? "—"}`} />
            <MarketEvidenceUpload orderId={order.id} />
          </>
        )}
        {order.status === "COMPLETED" && (
          <Banner
            tone="success"
            icon={CheckCircle2}
            text={role === "seller" ? `فروش تکمیل شد و ${order.sellerPayoutToman.toLocaleString("fa-IR")} تومان به میت کیف تو واریز شد.` : "خرید تکمیل شد."}
          />
        )}
        {order.status === "REFUNDED" && <Banner tone="neutral" icon={Undo2} text={`سفارش لغو شد و کل مبلغ به میت کیف خریدار برگشت. ${order.resolutionNote ?? ""}`} />}
        {(order.status === "CANCELLED" || order.status === "PENDING_PAYMENT") && (
          <Banner tone="danger" icon={XCircle} text="این سفارش پرداخت نشد یا مهلت پرداختش تمام شد." />
        )}

        {role === "seller" && order.status === "AWAITING_SELLER" && order.tradeMode === "DIRECT" && (
          <div className="flex w-full flex-col gap-2 rounded-[8px] border border-border bg-surface-alt p-4">
            <p className="text-right text-[13px] font-bold text-text">Trade URL خریدار</p>
            <a href={order.buyerTradeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-left font-mono text-[12px] text-accent hover:underline" dir="ltr">
              <Copy size={13} className="shrink-0" />
              {order.buyerTradeUrl}
            </a>
            <p className="text-right text-[11px] leading-[1.7] text-text-dim">روی لینک بزن تا صفحه ترید استیم باز شود، آیتم «{order.listing.itemName}» را اضافه کن و بدون درخواست چیزی در عوض، ترید را بفرست.</p>
          </div>
        )}
        {role === "seller" && order.status === "AWAITING_SELLER" && order.tradeMode === "ESCROW" && order.adminTradeUrl && (
          <div className="flex w-full flex-col gap-2 rounded-[8px] border border-border bg-surface-alt p-4">
            <p className="text-right text-[13px] font-bold text-text">Trade URL ادمین دوتامیت</p>
            <a href={order.adminTradeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-left font-mono text-[12px] text-accent hover:underline" dir="ltr">
              <Copy size={13} className="shrink-0" />
              {order.adminTradeUrl}
            </a>
            <p className="text-right text-[11px] leading-[1.7] text-text-dim">روی لینک بزن تا صفحه ترید استیم باز شود، آیتم «{order.listing.itemName}» را برای ادمین دوتامیت بفرست.</p>
          </div>
        )}

        <MarketOrderActions orderId={order.id} role={role} status={order.status} tradeMode={order.tradeMode} alreadyConfirmed={role === "seller" ? Boolean(order.sellerConfirmedAt) : Boolean(order.buyerConfirmedAt)} />

        <dl className="grid w-full gap-3 text-[13px] sm:grid-cols-2">
          <Row label="مبلغ خرید" value={`${order.priceToman.toLocaleString("fa-IR")} تومان`} />
          {role === "seller" && <Row label={`کمیسیون (${order.commissionPercent.toLocaleString("fa-IR")}٪)`} value={`${order.commissionToman.toLocaleString("fa-IR")} تومان`} />}
          {role === "seller" && <Row label="سهم تو" value={`${order.sellerPayoutToman.toLocaleString("fa-IR")} تومان`} />}
          {role === "buyer" && <Row label="روش پرداخت" value={order.paymentMethod === "WALLET" ? "میت کیف" : "درگاه بانکی"} />}
          {order.paidAt && <Row label="تاریخ پرداخت" value={order.paidAt.toLocaleString("fa-IR")} />}
          {order.sentAt && <Row label="تاریخ ارسال" value={order.sentAt.toLocaleString("fa-IR")} />}
          {order.completedAt && <Row label="تاریخ تکمیل" value={order.completedAt.toLocaleString("fa-IR")} />}
          {role === "buyer" && order.payments[0]?.refId && <Row label="کد پیگیری بانک" value={order.payments[0].refId} ltr />}
          {order.resolutionNote && order.status !== "REFUNDED" && <Row label="یادداشت" value={order.resolutionNote} />}
        </dl>

        <div className="flex w-full items-center justify-between border-t border-border pt-4">
          <Link href={`/shop/market/${order.listingId}`} className="text-[13px] font-bold text-primary hover:underline">
            مشاهده آگهی
          </Link>
          <Link href={role === "seller" ? "/dashboard/sales" : "/dashboard/orders"} className="text-[13px] text-text-dim hover:text-text">
            {role === "seller" ? "همه فروش‌ها" : "همه سفارش‌ها"}
          </Link>
        </div>
      </Card>
    </div>
  );
}

const TONES = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-[#f59e0b]/60 bg-[#f59e0b]/[0.13] text-[#f59e0b]",
  danger: "border-danger/40 bg-danger/10 text-danger",
  neutral: "border-primary/30 bg-primary/10 text-accent",
};

function Banner({ tone, icon: Icon, text }: { tone: keyof typeof TONES; icon: typeof Clock; text: string }) {
  return (
    <div className={`flex w-full items-start gap-3 rounded-[10px] border px-4 py-3 ${TONES[tone]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="text-[13px] leading-[1.8]">{text}</p>
    </div>
  );
}

function Row({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[8px] bg-surface-alt px-4 py-3">
      <dd className="min-w-0 truncate font-bold text-text" dir={ltr ? "ltr" : "auto"}>
        {value}
      </dd>
      <dt className="shrink-0 text-text-dim">{label}</dt>
    </div>
  );
}
