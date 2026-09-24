import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Repeat, Undo2, XCircle } from "lucide-react";

import prisma from "@/app/lib/prisma";
import { getViewerSession } from "@/app/lib/shopCatalog";
import { getShopSettings, isWithinWorkHours } from "@/app/lib/shopPricing";
import { decryptGiftCode } from "@/app/lib/giftCodeCrypto";
import { productHref } from "@/app/lib/shopCategories";
import { Card } from "@/components/general/card";
import { OrderStatusBadge } from "@/components/pages/shop/orderStatusBadge";
import { GiftCodeReveal } from "@/components/pages/shop/giftCodeReveal";

export default async function OrderDetailPage({ params, searchParams }: PageProps<"/dashboard/orders/[id]">) {
  const viewer = await getViewerSession();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const { payment } = await searchParams;

  const order = await prisma.shopOrder.findUnique({
    where: { id: Number(id) },
    include: {
      product: { select: { id: true, slug: true, title: true, type: true } },
      giftCode: { select: { codeEncrypted: true } },
      payments: { where: { status: "SUCCESS" }, select: { refId: true, cardPan: true }, take: 1 },
    },
  });
  // Someone else's order looks exactly like a missing one.
  if (!order || order.userId !== viewer.id) notFound();

  const settings = await getShopSettings();
  const code = order.status === "DELIVERED" && order.giftCode ? decryptGiftCode(order.giftCode.codeEncrypted) : null;
  const paidRef = order.payments[0];
  const start = settings.workStartHour.toLocaleString("fa-IR");
  const end = settings.workEndHour.toLocaleString("fa-IR");

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      {payment === "success" && order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" && (
        <Banner tone="success" icon={CheckCircle2} text="پرداخت با موفقیت انجام شد." />
      )}
      {(order.status === "CANCELLED" || order.status === "PENDING_PAYMENT") && (
        <Banner tone="danger" icon={XCircle} text="پرداخت انجام نشد و مبلغی از حسابت کم نشده است. اگر پولی کسر شده، تا ۷۲ ساعت توسط بانک برمی‌گردد." />
      )}

      <Card tone="surface" noHover className="w-full gap-5 p-6">
        <div className="flex w-full items-center justify-between border-b border-border pb-4">
          <OrderStatusBadge status={order.status} />
          <div className="flex flex-col items-end gap-1">
            <p className="text-[18px] font-black text-text" dir="auto">
              {order.product.title}
            </p>
            <p className="text-[12px] text-text-dim">سفارش #{order.id}</p>
          </div>
        </div>

        {code && <GiftCodeReveal code={code} />}

        {order.status === "AWAITING_CODE" && (
          <Banner
            tone="warning"
            icon={Clock}
            text={`پرداختت انجام شد. کد این گیفت کارت در ساعات کاری (${start} تا ${end}) توسط ادمین فعال می‌شود و همین‌جا نمایش داده می‌شود؛ به‌محض آماده شدن، اعلان هم می‌گیری.${
              isWithinWorkHours(settings) ? "" : ` الان خارج از ساعت کاری است؛ کد از ساعت ${start} فعال می‌شود.`
            }`}
          />
        )}

        {order.status === "AWAITING_DELIVERY" && (
          <Banner
            tone="warning"
            icon={Repeat}
            text="پرداختت انجام شد. آیتم به‌زودی با ترید استیم به Trade URL زیر ارسال می‌شود؛ پیشنهاد ترید را در استیم قبول کن."
          />
        )}

        {order.status === "DELIVERED" && order.product.type === "ITEM" && (
          <Banner tone="success" icon={CheckCircle2} text="آیتم برایت ترید شد. اگر هنوز در اینونتوری‌ات نیست، پیشنهادهای ترید استیم را چک کن." />
        )}

        {order.status === "REFUNDED" && (
          <Banner tone="neutral" icon={Undo2} text="این سفارش لغو شد و کل مبلغ به میت کیف تو برگشت." />
        )}

        <dl className="grid w-full gap-3 text-[13px] sm:grid-cols-2">
          <Row label="مبلغ" value={`${order.totalToman.toLocaleString("fa-IR")} تومان`} />
          <Row label="روش پرداخت" value={order.paymentMethod === "WALLET" ? "میت کیف" : "درگاه بانکی"} />
          <Row label="تاریخ ثبت" value={order.createdAt.toLocaleString("fa-IR")} />
          {order.paidAt && <Row label="تاریخ پرداخت" value={order.paidAt.toLocaleString("fa-IR")} />}
          {order.deliveredAt && <Row label="تاریخ تحویل" value={order.deliveredAt.toLocaleString("fa-IR")} />}
          {paidRef?.refId && <Row label="کد پیگیری بانک" value={paidRef.refId} ltr />}
          {order.tradeUrl && <Row label="Trade URL" value={order.tradeUrl} ltr />}
        </dl>

        <div className="flex w-full items-center justify-between border-t border-border pt-4">
          <Link href={productHref(order.product)} className="text-[13px] font-bold text-primary hover:underline">
            {order.status === "CANCELLED" ? "تلاش دوباره" : "خرید دوباره"}
          </Link>
          <Link href="/dashboard/orders" className="text-[13px] text-text-dim hover:text-text">
            همه سفارش‌ها
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
      <p className="text-[13px] leading-[1.8]" dir="auto">
        {text}
      </p>
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
