"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";
import { OrderStatusBadge } from "@/components/pages/shop/orderStatusBadge";

interface AdminOrder {
  id: number;
  status: string;
  productTitle: string;
  productType: "GIFT_CARD" | "ITEM";
  userId: number;
  userName: string;
  totalToman: number;
  paymentMethod: "WALLET" | "GATEWAY";
  tradeUrl: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
}

interface OrdersData {
  needsAction: number;
  deliveredCount: number;
  deliveredTotal: number;
  orders: AdminOrder[];
}

const FILTERS = [
  { value: "action", label: "نیازمند اقدام" },
  { value: "delivered", label: "تحویل شده" },
  { value: "refunded", label: "بازگشت وجه" },
  { value: "all", label: "همه" },
];

export default function AdminShopOrdersPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [filter, setFilter] = useState("action");
  const [data, setData] = useState<OrdersData | null>(null);

  const load = useCallback(() => {
    return fetch(`/api/admin/shop/orders?filter=${filter}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      });
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(order: AdminOrder, action: "deliver" | "refund") {
    let reason: string | null = null;
    if (action === "deliver") {
      if (!(await confirmAction({ message: `آیتم «${order.productTitle}» برای ${order.userName} ترید شد؟`, confirmLabel: "بله، تحویل شد" }))) return;
    } else {
      reason = prompt("دلیل بازگشت وجه (به کاربر نمایش داده می‌شود):", "موجودی این محصول تمام شد.");
      if (reason === null) return;
    }

    const res = await fetch(`/api/admin/shop/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const json = await res.json();
    if (json.status === "success") toast.success(json.message);
    else toast.error(json.message);
    load();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text).catch(() => null);
    toast.success("کپی شد.");
  }

  if (!data) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="grid w-full gap-3 sm:grid-cols-3">
        <Stat label="سفارش‌های نیازمند اقدام" value={data.needsAction.toLocaleString("fa-IR")} highlight={data.needsAction > 0} />
        <Stat label="سفارش‌های تحویل‌شده" value={data.deliveredCount.toLocaleString("fa-IR")} />
        <Stat label="مجموع فروش تحویل‌شده" value={`${data.deliveredTotal.toLocaleString("fa-IR")} تومان`} />
      </div>

      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="flex w-full gap-2 rounded-[10px] bg-surface-alt p-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 rounded-[8px] py-2 text-[13px] transition-colors ${
                filter === f.value ? "bg-primary font-bold text-white" : "text-text-dim hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {data.orders.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim">سفارشی در این بخش نیست.</p>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {data.orders.map((order) => (
              <div key={order.id} className="flex w-full flex-col gap-3 rounded-[8px] border border-border bg-surface-alt p-4">
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12px]">
                    {(order.status === "AWAITING_CODE" || order.status === "AWAITING_DELIVERY") && (
                      <button
                        onClick={() => act(order, "refund")}
                        className="whitespace-nowrap rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger"
                      >
                        بازگشت وجه
                      </button>
                    )}
                    {order.status === "AWAITING_DELIVERY" && (
                      <button onClick={() => act(order, "deliver")} className="whitespace-nowrap rounded-[6px] bg-success px-2.5 py-1.5 font-bold text-white">
                        ترید شد ✓
                      </button>
                    )}
                    {order.status === "AWAITING_CODE" && (
                      <Link href="/admin/shop/gift-codes" className="whitespace-nowrap rounded-[6px] bg-primary px-2.5 py-1.5 font-bold text-white">
                        افزودن کد
                      </Link>
                    )}
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center gap-5">
                    <p className="text-[13px] font-bold text-text">{order.totalToman.toLocaleString("fa-IR")} تومان</p>
                    <div className="flex flex-col items-end gap-0.5">
                      <p className="text-[14px] font-black text-text" dir="auto">
                        {order.productTitle}
                      </p>
                      <p className="text-[11px] text-text-dim" dir="auto">
                        #{order.id} ·{" "}
                        <Link href={`/admin/users/${order.userId}`} className="text-accent hover:underline">
                          {order.userName}
                        </Link>{" "}
                        · {order.paymentMethod === "WALLET" ? "میت کیف" : "درگاه"}
                        {order.paidAt && ` · ${new Date(order.paidAt).toLocaleString("fa-IR")}`}
                      </p>
                    </div>
                  </div>
                </div>

                {order.tradeUrl && order.status === "AWAITING_DELIVERY" && (
                  <div className="flex w-full items-center gap-2 rounded-[6px] bg-bg px-3 py-2">
                    <button onClick={() => copy(order.tradeUrl!)} className="shrink-0 text-text-dim hover:text-text" aria-label="کپی Trade URL">
                      <Copy size={14} />
                    </button>
                    <a href={order.tradeUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-left font-mono text-[12px] text-accent hover:underline" dir="ltr">
                      {order.tradeUrl}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-end gap-1 rounded-[12px] border p-4 ${highlight ? "border-[#f59e0b]/60 bg-[#f59e0b]/[0.08]" : "border-border bg-surface"}`}>
      <p className={`text-[22px] font-black ${highlight ? "text-[#f59e0b]" : "text-text"}`}>{value}</p>
      <p className="text-[12px] text-text-dim">{label}</p>
    </div>
  );
}
