"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";

type Role = "buyer" | "seller";

/** The buttons each side of a market order can press at its current stage. */
export function MarketOrderActions({ orderId, role, status }: { orderId: number; role: Role; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [busy, setBusy] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: string, extra?: object) {
    setBusy(true);
    const res = await fetch(`/api/shop/market/orders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (json?.status === "success") {
      toast.success(json.message);
      setDisputing(false);
      router.refresh();
    } else {
      toast.error(json?.message ?? "خطایی رخ داد.");
    }
  }

  if (role === "seller" && status === "AWAITING_SELLER") {
    return (
      <div className="flex w-full flex-wrap gap-3">
        <button
          disabled={busy}
          onClick={async () => {
            if (await confirmAction({ message: "آیتم را برای خریدار ترید کرده‌ای؟ بعد از تأیید خریدار پول به میت کیف تو واریز می‌شود.", confirmLabel: "بله، ارسال کردم" })) act("sent");
          }}
          className="flex-1 rounded-[8px] bg-success px-5 py-3 text-[14px] font-black text-white disabled:opacity-50"
        >
          آیتم را ارسال کردم
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            if (await confirmAction({ message: "سفارش لغو شود؟ کل مبلغ به خریدار برمی‌گردد و آگهی حذف می‌شود.", danger: true, confirmLabel: "لغو سفارش" })) act("cancel");
          }}
          className="rounded-[8px] border border-danger/40 px-5 py-3 text-[13px] font-bold text-danger disabled:opacity-50"
        >
          نمی‌توانم ارسال کنم
        </button>
      </div>
    );
  }

  if (role === "buyer" && (status === "AWAITING_SELLER" || status === "SELLER_SENT")) {
    if (disputing) {
      return (
        <div className="flex w-full flex-col gap-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="مشکل را توضیح بده: آیتم نرسید؟ آیتم دیگری ارسال شد؟ ..."
            className="w-full resize-none rounded-[8px] border border-border bg-surface-alt p-3 text-[13px] text-text focus:border-primary focus:outline-none"
          />
          <div className="flex gap-3">
            <button disabled={busy || reason.trim().length < 10} onClick={() => act("dispute", { reason })} className="flex-1 rounded-[8px] bg-danger px-5 py-3 text-[14px] font-black text-white disabled:opacity-50">
              ثبت اعتراض
            </button>
            <button onClick={() => setDisputing(false)} className="rounded-[8px] border border-border px-5 py-3 text-[13px] text-text-dim">
              انصراف
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex w-full flex-wrap gap-3">
        <button
          disabled={busy}
          onClick={async () => {
            if (await confirmAction({ message: "آیتم را در اینونتوری استیمت دریافت کردی؟ بعد از تأیید، پول به فروشنده پرداخت می‌شود و قابل برگشت نیست.", confirmLabel: "بله، دریافت کردم" })) act("confirm");
          }}
          className="flex-1 rounded-[8px] bg-success px-5 py-3 text-[14px] font-black text-white disabled:opacity-50"
        >
          آیتم را دریافت کردم
        </button>
        <button disabled={busy} onClick={() => setDisputing(true)} className="rounded-[8px] border border-danger/40 px-5 py-3 text-[13px] font-bold text-danger disabled:opacity-50">
          مشکل دارم
        </button>
      </div>
    );
  }

  return null;
}
